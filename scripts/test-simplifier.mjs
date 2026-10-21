// Verification for the legal review engine: provenance, defined terms,
// clause typing, risk flags, determinism, jurisdiction dictionaries, the
// comparative mode and the exports.
// Run: node scripts/test-simplifier.mjs

import {
  analyse, compare, JURISDICTIONS,
} from '../src/lib/legal/pipeline.js';
import { extractDefinitions, termsInSentence } from '../src/lib/legal/definedTerms.js';
import { classifyClause } from '../src/lib/legal/clauses.js';
import { fidelityChecks } from '../src/lib/legal/risk.js';
import { segment, splitLong } from '../src/lib/legal/segments.js';
import { diffWords, buildDocx } from '../src/lib/legal/docx.js';
import {
  buildBundle, buildMarkdown, buildHtml, buildRedlineCsv, buildManifest,
  checkLegalGate, LEGAL_GATE_QUESTIONS, methodologyCard,
} from '../src/lib/legal/exports.js';
import { simplify, SAMPLE_TEXT, LEGAL_SAMPLE_TEXT } from '../src/lib/simplify.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}
function approx(name, got, want, tol = 1e-6) {
  const good = got != null && Math.abs(got - want) <= tol;
  if (!good) failures += 1;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}: got ${got}, want ${want}`);
}

// 1. Provenance: every row points back at the exact characters of the source.
{
  const text = 'The Centre may make rules. Every beneficiary shall be entitled to the benefits.';
  const r = analyse(text);
  ok('one row per sentence', r.rows.length === 2, `${r.rows.length}`);
  for (const row of r.rows) {
    ok(`row ${row.id} slice matches the source`, text.slice(row.start, row.end) === row.sourceText);
  }
  ok('row ids are sequential', r.rows[0].id === 'r1' && r.rows[1].id === 'r2');
}

// 2. A clause head is not a sentence: "Section 4." must not become its own row.
{
  const text = 'Section 4. The Central Government may make rules for this Act.';
  const r = analyse(text);
  ok('clause head is not split off', r.rows.length === 1, `${r.rows.length} rows`);
  ok('clause is numbered', r.rows[0].clause === 's. 4', r.rows[0].clause);
  ok('the head is part of the sentence', r.rows[0].sourceText.startsWith('Section 4.'));
}

// 3. Defined terms are read, and left alone.
{
  const text = LEGAL_SAMPLE_TEXT;
  const { definitions } = extractDefinitions(text);
  ok('definitions are extracted', definitions.length >= 2, `${definitions.length} found`);
  const terms = definitions.map((d) => d.term);
  ok('"authorised officer" is a defined term', terms.includes('authorised officer'), terms.join(', '));
  ok('"scheme" is a defined term', terms.includes('scheme'), terms.join(', '));
  const r = analyse(text);
  const row = r.rows.find((x) => x.sourceText.includes('authorised officer'));
  ok('a row using a defined term is flagged', !!row && row.flag !== 'green', row && row.flag);
  ok('the defined term is named in the reason', !!row && row.reasons.some((x) => x.text.includes('authorised officer')));
  const plainAll = r.rows.map((x) => x.plain).join(' ');
  ok('the defined term is not rewritten away', plainAll.includes('authorised officer'));
  ok('termsInSentence finds the plural form', termsInSentence('the schemes notified', [{ term: 'scheme' }]).includes('scheme'));
}

// 4. Clause typing: the types that change what a sentence does.
{
  ok('shall not is a prohibition', classifyClause('No person shall do this.').id === 'prohibition');
  ok('shall be entitled is an entitlement', classifyClause('Every person shall be entitled to it.').id === 'entitlement');
  ok('punishment is a penalty', classifyClause('Such person shall be punished with imprisonment.').id === 'penalty');
  ok('deemed is a deeming provision', classifyClause('X shall be deemed to be a company.').id === 'deeming');
  ok('provided that is a proviso', classifyClause('He may do it, provided that he pays.').id === 'proviso');
  ok('shall make rules is an obligation', classifyClause('The Centre shall make rules.').id === 'obligation');
}

// 5. Risk flags: green, amber, red, and the mechanical fidelity checks.
{
  const green = analyse('The Centre shall make rules.');
  ok('a plain duty sentence is green', green.rows[0].flag === 'green', green.rows[0].flag);
  const red = analyse('A payment shall be deemed to be a loan for the purposes of this Act.');
  ok('a deeming provision is red', red.rows[0].flag === 'red', red.rows[0].flag);
  ok('the red reason names the rule', red.rows[0].reasons.some((x) => /deem/i.test(x.text)));
  const amber = analyse('He may do it, provided that he pays the fee.');
  ok('a proviso is amber', amber.rows[0].flag === 'amber', amber.rows[0].flag);
  ok('the amber reason names the clause type', amber.rows[0].reasons.some((x) => /Proviso/.test(x.text)));
}

// 6. Fidelity checks: a lost figure or a lost negation is caught.
{
  const lostFigure = fidelityChecks('The fine shall be 5,000 rupees.', 'The fine shall be rupees.');
  ok('a lost figure is red', lostFigure.some((x) => x.level === 'red'), JSON.stringify(lostFigure));
  ok('the lost figure is named', lostFigure.some((x) => /5,?000/.test(x.text)), JSON.stringify(lostFigure));
  const keptFigure = analyse('The fine shall be 5,000 rupees for every contravention.');
  ok('a kept figure is not red', keptFigure.rows[0].flag !== 'red', keptFigure.rows[0].flag);
  const neg = analyse('The Centre shall not make any rule without consultation.');
  ok('a kept negation is not red', neg.rows[0].flag !== 'red', neg.rows[0].flag);
  const lostNegation = fidelityChecks('No person shall make a rule.', 'A person shall make a rule.');
  ok('a lost negation is red', lostNegation.some((x) => x.level === 'red'), JSON.stringify(lostNegation));
}

// 7. Determinism: the same input gives the same hashes, every time.
{
  const a = await buildManifest(analyse(LEGAL_SAMPLE_TEXT));
  const b = await buildManifest(analyse(LEGAL_SAMPLE_TEXT));
  ok('the output hash is stable', a.outputHash === b.outputHash);
  ok('the input hash is stable', a.inputHash === b.inputHash);
  ok('the source hash names its algorithm', /^sha256:/.test(a.sourceHash), a.sourceHash);
  const c = await buildManifest(analyse(`${LEGAL_SAMPLE_TEXT} `));
  ok('a different input gives a different hash', c.inputHash !== a.inputHash);
  ok('the manifest records the dictionary', c.dictionary.startsWith('in-bare-act@'), c.dictionary);
}

// 8. Jurisdiction modes: each dictionary is its own register.
{
  ok('six jurisdictions are registered', JURISDICTIONS.length === 6, `${JURISDICTIONS.length}`);
  const uk = analyse('The Secretary of State shall make rules in pursuance of this Act.', { jurisdictionId: 'uk-si' });
  ok('the UK dictionary rewrites its own phrases', /can|under/.test(uk.rows[0].plain) && !/pursuance/.test(uk.rows[0].plain), uk.rows[0].plain);
  const us = analyse('The Agency shall comply with this part.', { jurisdictionId: 'us-cfr' });
  ok('the US dictionary uses the agency register', /agency must/.test(us.rows[0].plain), us.rows[0].plain);
  const eu = analyse('Member States shall adopt the measures laid down in this Regulation.', { jurisdictionId: 'eu-regulation' });
  ok('the EU dictionary rewrites its own phrases', /member countries/i.test(eu.rows[0].plain) && /set out/.test(eu.rows[0].plain), eu.rows[0].plain);
  const inr = analyse('The Central Government may make rules.', { jurisdictionId: 'in-bare-act' });
  ok('the India dictionary is the default register', inr.rows[0].plain.includes('Centre'), inr.rows[0].plain);
  ok('the clause prefix follows the jurisdiction', uk.rows[0].clause === null || uk.rows[0].clause.startsWith('reg.'), uk.rows[0].clause);
}

// 9. The comparative mode finds what changed between two versions.
{
  const before = 'Section 4. The Centre shall make rules after consultation with the States.';
  const after = 'Section 4. The Centre shall make rules after consultation with the States and the Parliament.';
  const delta = compare(before, after, { jurisdictionId: 'in-bare-act' });
  ok('the comparison aligns on the clause number', delta.method === 'clause number', delta.method);
  ok('the change is found', delta.counts.changed === 1, JSON.stringify(delta.counts));
  ok('the changed row names the clause', delta.changes[0].clause === 's. 4', delta.changes[0].clause);
  const added = compare('Section 4. The Centre shall make rules.', 'Section 4. The Centre shall make rules. Section 5. The States shall be notified.', { jurisdictionId: 'in-bare-act' });
  ok('an added section is found', added.counts.added === 1, JSON.stringify(added.counts));
}

// 10. The split keeps the connective: dropping "and" changes the sentence.
{
  const parts = splitLong('The Centre may frame a scheme for the grant of assistance to the beneficiaries, and the scheme shall provide for the manner in which the assistance is disbursed to every person who is eligible under the Act');
  ok('a long sentence is split', parts.length >= 2, `${parts.length} parts`);
  ok('the connective survives the split', /(^|\W)and(\W|$)/i.test(parts[1]), parts[1]);
}

// 11. The exports carry the methodology and the gate.
{
  const r = analyse(LEGAL_SAMPLE_TEXT, { source: { title: 'Sample Act', citation: 'Act No. 1 of 2026' } });
  const manifest = await buildManifest(r);
  const bundle = buildBundle(r, { gate: { currency: 'Yes', definitions: 'Yes', reviewer: 'A. Lawyer', circulation: 'Yes' }, manifest });
  ok('the bundle carries the source', bundle.includes(LEGAL_SAMPLE_TEXT.slice(0, 60)));
  ok('the bundle carries the methodology card', bundle.includes('METHODOLOGY CARD'));
  ok('the bundle carries the hashes', bundle.includes(manifest.outputHash));
  ok('the bundle carries the gate answers', bundle.includes('A. Lawyer'));
  const md = buildMarkdown(r, { manifest });
  ok('the markdown has a table', md.includes('| # | Clause | Type | Flag |'));
  const html = buildHtml(r, { manifest });
  ok('the html is a document', html.startsWith('<!doctype html>') && html.includes('</html>'));
  ok('the html carries the source', html.includes('authorised officer'));
  const csv = buildRedlineCsv(r);
  const csvLines = csv.split('\n');
  ok('the csv has a header', csvLines[0].startsWith('sentence,clause,clause_type,flag'), csvLines[0]);
  ok('the csv has a row per sentence at least', csvLines.length >= r.rows.length);
  ok('the methodology card says what it cannot prove', methodologyCard(r, manifest).includes('WHAT IT CANNOT PROVE'));
}

// 12. The gate blocks the export until all four questions are answered.
{
  const empty = checkLegalGate({});
  ok('an empty gate is not complete', empty.complete === false);
  ok('the gate names what is missing', empty.missing.length === LEGAL_GATE_QUESTIONS.length, empty.missing.join('; '));
  const full = checkLegalGate({ currency: 'a', definitions: 'b', reviewer: 'c', circulation: 'd' });
  ok('a full gate is complete', full.complete === true);
}

// 13. The docx is a real container with real tracked changes.
{
  const r = analyse(LEGAL_SAMPLE_TEXT);
  const bytes = buildDocx(r, { date: '2026-01-01T00:00:00Z' });
  ok('the docx is a zip', bytes[0] === 0x50 && bytes[1] === 0x4b, `${bytes[0]},${bytes[1]}`);
  ok('the docx is not empty', bytes.length > 2000, `${bytes.length} bytes`);
  const text = Buffer.from(bytes).toString('latin1');
  ok('the docx carries tracked insertions', text.includes('<w:ins '));
  ok('the docx carries tracked deletions', text.includes('<w:del '));
  ok('the docx carries the document part', text.includes('word/document.xml'));
}

// 14. The word diff marks the change, not the whole sentence.
{
  const parts = diffWords('the Centre shall make rules', 'the Centre must set rules');
  ok('the diff has unchanged words', parts.some((p) => p.type === 'same' && /Centre/.test(p.text)), JSON.stringify(parts));
  ok('the diff marks a deletion', parts.some((p) => p.type === 'del' && /shall/.test(p.text)));
  ok('the diff marks an insertion', parts.some((p) => p.type === 'ins' && /must/.test(p.text)));
}

// 15. The citizen mode still works, and reads better than the source.
{
  const r = simplify(SAMPLE_TEXT);
  ok('the citizen rewrite is produced', r.simplifiedText.length > 0);
  ok('the rewrite is easier to read', r.readability.simplified.score > r.readability.original.score,
    `${r.readability.original.score} -> ${r.readability.simplified.score}`);
  ok('obligations are still found', r.obligations.length >= 1, r.obligations.join(' | '));
  ok('the replacements are still counted', r.stats.replacements.length > 0, `${r.stats.replacements.length}`);
  ok('the hindi layer still renders', r.hindi.sentences.length === r.sentences.length);
}

// 16. The segmenter keeps offsets on a messy text.
{
  const text = 'Rs. 4 shall be paid. Section 5 applies. No more.';
  const segs = segment(text);
  ok('the abbreviation did not split the sentence', segs.length === 3, `${segs.length}: ${segs.map((s) => s.text).join(' / ')}`);
  for (const s of segs) ok('the slice matches', text.slice(s.start, s.end) === s.text, s.text);
}

console.log(failures === 0 ? '\nAll simplifier checks passed.' : `\n${failures} simplifier check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
