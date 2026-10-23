// Red team: the policy simplifier against new text, 2026-10-23.
//
// The bars are the reassessment's, not invented here:
//   1. Plainness — the simplified text must at least double its Flesch score
//      and reach the project's own declared target (in-bare-act readability:
//      ease 60, grade 8). Doubling alone is gameable: doubling a score of 9
//      still reads at graduate level.
//   2. Organisation — new text must come out as clean sentences: references
//      like DoR.AML.REC.250/14.06.001 survive verbatim, no doubled
//      punctuation, no sentences invented inside a token.
//   3. Change reporting — every removed or changed phrase is listed with
//      what it became, or marked removed. "term × count" is not that list.
//
// RED on 2026-10-23: all three bars fail on real corpus text. This suite is
// the target spec; it joins `npm test` when green.
//
// Attack corpus: real passages the built-in samples never see (provenance in
// each comment) plus one synthetic deletion fixture, clearly labelled.
// Run: node scripts/test-redteam.mjs

import { simplify } from '../src/lib/simplify.js';
import { flesch } from '../src/lib/flesch.js';
import { segment } from '../src/lib/legal/segments.js';
import {
  applyDictionary, getJurisdiction, DEFAULT_JURISDICTION,
} from '../src/lib/legal/glossary.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const EASE_TARGET = getJurisdiction(DEFAULT_JURISDICTION).readability.ease;

// Digital Personal Data Protection Act, 2023 — long title and enacting
// formula (articles/datapoint-ai-policy-readability/data/corpus.json).
const DPDP_LONG_TITLE = 'An Act to provide for the processing of digital personal data in a manner that recognises both the right of individuals to protect their personal data and the need to process such personal data for lawful purposes and for matters connected therewith or incidental thereto. BE it enacted by Parliament in the Seventy-fourth Year of the Republic of India as follows:––';

// Digital Personal Data Protection Act, 2023 — commencement provision
// (same corpus).
const DPDP_COMMENCEMENT = 'It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint and different dates may be appointed for different provisions of this Act and any reference in any such provision to the commencement of this Act shall be construed as a reference to the coming into force of that provision.';

// RBI/2026-27/296 (DoR.AML.REC.250/14.06.001/2026-27), UAPA 51A circular —
// letterhead, addressees and opening paragraph
// (private/verification/2026-10-22-rbi-precision-test/corpus.jsonl).
const RBI_LETTERHEAD = `RBI/2026-27/296
DoR.AML.REC.250/14.06.001/2026-27
October 19, 2026
The Chairpersons/ CEOs of the Commercial Banks,
Small Finance Banks, Payment Banks, Urban Co-operative Banks,
Rural Co-operative Banks, Regional Rural Banks, Local Area Banks,
Non-Banking Financial Companies, Asset Reconstruction Companies,
All India Financial Institutions
Madam/Dear Sir
Implementation of Section 51A of UAPA, 1967: Updates to UNSC's 1267/ 1989 ISIL (Da'esh) & Al-Qaida Sanctions List: Amendment of 03 Entries
Please refer to Chapter IX on "Requirements/obligations under International Agreements - Communications from International Agencies" of the Reserve Bank of India - Know Your Customer, Directions, 2025 dated November 28, 2025 (amended time to time) ("Directions"), as applicable, as per which, regulated entity shall ensure that in terms of section 51A of the Unlawful Activities (Prevention) (UAPA) Act, 1967 and amendments thereto, it does not have any account in the name of individuals / entities appearing in the lists of individuals and entities, suspected of having terrorist links, which are approved by and periodically circulated by the United Nations Security Council (UNSC).`;

// Synthetic fixture (labelled): a statutory sentence whose closing phrase the
// dictionary deletes outright ('as the case may be' -> '').
const DELETION_FIXTURE = 'The Board may pass such order as it thinks fit, including an order for costs, as the case may be.';

const CASES = [
  ['dpdp-long-title', DPDP_LONG_TITLE],
  ['dpdp-commencement', DPDP_COMMENCEMENT],
  ['rbi-letterhead', RBI_LETTERHEAD],
];

// The dictionary's own change list is the definition of "changed text".
const firedRules = (text) => {
  const phrases = getJurisdiction(DEFAULT_JURISDICTION).phrases;
  const out = [];
  for (const seg of segment(text)) {
    const { changes } = applyDictionary(seg.text, phrases, {});
    for (const change of changes) out.push([change.from, change.to]);
  }
  return out;
};

for (const [name, text] of CASES) {
  const r = simplify(text);
  const src = flesch(text);
  const out = flesch(r.simplifiedText);

  console.log(`\n== ${name}: flesch ${src.score} -> ${out.score} (bar: >= ${Math.max(2 * src.score, EASE_TARGET).toFixed(1)})`);
  console.log(`   out: ${r.simplifiedText.slice(0, 160)}…`);
  console.log(`   report: ${JSON.stringify(r.stats.replacements)}`);

  // Bar 1: plainness.
  if (src.score > 0) {
    ok(`the Flesch score at least doubles (${name})`, out.score >= 2 * src.score,
      `${src.score} -> ${out.score}`);
  }
  ok(`reaches the declared plain-English target (${name})`, out.score >= EASE_TARGET,
    `${out.score} < ${EASE_TARGET} (${out.band})`);

  // Bar 2: organisation.
  ok(`no doubled punctuation (${name})`,
    !/[,;:]\s*[.!?]|[.!?]\s*[,;:]|[,;:]{2,}/.test(r.simplifiedText),
    JSON.stringify((r.simplifiedText.match(/.{0,18}[,;:]\s*[.!?].{0,10}/g) || []).slice(0, 3)));
  const refs = text.match(/\b[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+(?:\/[A-Za-z0-9.]+)*\b/g) || [];
  const shredded = refs.filter((token) => !r.simplifiedText.includes(token));
  ok(`dotted references survive verbatim (${name})`, shredded.length === 0,
    `shredded: ${shredded.slice(0, 3).join(', ')}`);

  // Bar 3: change reporting — every fired rule is listed with what it became.
  const fired = firedRules(text);
  const listed = (from, to) => r.stats.replacements.some((e) =>
    (e.from ?? e.term) === from && 'to' in e && e.to === to);
  ok(`every fired rule is reported with its replacement (${name})`,
    fired.every(([from, to]) => listed(from, to)),
    `fired ${JSON.stringify(fired)} vs report ${JSON.stringify(r.stats.replacements)}`);
}

// A removal must read as a removal, not as a bare term count.
{
  const r = simplify(DELETION_FIXTURE);
  ok('the report names what each change became',
    r.stats.replacements.length > 0
      && r.stats.replacements.every((e) => typeof e.from === 'string' && 'to' in e),
    JSON.stringify(r.stats.replacements));
  ok('a deletion is marked removed',
    r.stats.replacements.some((e) => e.to === '' && e.removed === true),
    JSON.stringify(r.stats.replacements));
}

console.log(failures === 0 ? '\nAll red-team bars met.' : `\n${failures} red-team bar(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
