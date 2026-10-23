// Build the Task 7 shadow-mode agreement report.
//
// Runs both engines over the pinned corpus, draws the stratified 20-sentence
// human-review sample, and writes private/proposition-shadow-report.md with
// the blended rate, the per-check breakdown, the critical classes and the
// threshold verdict. Deterministic end to end: the same checkout regenerates
// the same numbers (verified in scripts/test-proposition.mjs).
//
// Run: node scripts/build-shadow-report.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import {
  CHECKS, CRITICAL_CLASSES, SHADOW_VERSION, THRESHOLD,
  compareEngines, drawReviewSample, thresholdVerdict,
} from '../src/lib/legal/shadow.js';
import { PIPELINE_VERSION } from '../src/lib/legal/pipeline.js';
import { DICTIONARY_VERSION, DEFAULT_JURISDICTION } from '../src/lib/legal/glossary.js';
import { PROPOSITION_SCHEMA_VERSION } from '../src/lib/legal/propositions.js';
import { hashText } from '../src/lib/legal/exports.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const corpusPath = join(root, 'private/verification/2026-10-22-rbi-precision-test/corpus.jsonl');
const outPath = join(root, 'private/proposition-shadow-report.md');

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const trim = (s, n = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// ---- the corpus: pinned by manifest, not by target size --------------------
// The agreement corpus is the full sentence set of these documents — every
// sentence of the instrument family the design note names (Indian regulatory
// instruments issued under an Act), no filtering, no target count. Clean
// text only; the OCR-degradation variants are a separate axis.

const lines = readFileSync(corpusPath, 'utf8').trim().split('\n');
const docs = await Promise.all(lines.map(async (line) => {
  const doc = JSON.parse(line);
  return {
    id: doc.id,
    refNo: doc.refNo,
    date: doc.date,
    subject: doc.subject,
    text: doc.text,
    textHash: (await hashText(doc.text)).hash.slice(0, 16),
  };
}));

// ---- the run ---------------------------------------------------------------

const runs = docs.map((doc) => ({
  doc,
  ...compareEngines(doc.text, { jurisdiction: DEFAULT_JURISDICTION }),
}));

const all = runs.flatMap((r, i) => r.sentences.map((s) => ({
  ...s,
  id: `d${i + 1}s${s.sourceId}`,
  docRef: r.doc.refNo,
})));

const total = all.length;
const agreed = all.filter((s) => s.agree).length;
const perCheck = {};
for (const meta of CHECKS) {
  const engaged = all.filter((s) => s.checks.find((c) => c.id === meta.id).engaged).length;
  const passed = all.filter((s) => {
    const c = s.checks.find((x) => x.id === meta.id);
    return c.engaged && c.pass;
  }).length;
  perCheck[meta.id] = { label: meta.label, engaged, passed, failed: engaged - passed };
}
const byClass = Object.fromEntries(CRITICAL_CLASSES.map((cls) => [
  cls,
  all.filter((s) => s.critical.includes(cls)),
]));
const criticalTotal = Object.values(byClass).reduce((n, list) => n + list.length, 0);

const rate = {
  total,
  agreed,
  disagreed: total - agreed,
  agreement: total ? agreed / total : 1,
  perCheck,
  critical: {
    total: criticalTotal,
    byClass: Object.fromEntries(CRITICAL_CLASSES.map((c) => [c, byClass[c].length])),
  },
};

// The human-review draw is stratified and outcome-independent: a record
// qualifies by stratum alone and the pick is the lowest source-text hash.
// No verdict, check result or rate enters the selection.
const sample = drawReviewSample(all, THRESHOLD.humanReviewOf);

const manifest = {
  corpus: 'private/verification/2026-10-22-rbi-precision-test/corpus.jsonl',
  family: 'Indian regulatory instruments issued under an Act (RBI directions and circulars)',
  documents: docs.map((d) => ({ refNo: d.refNo, id: d.id, date: d.date, textHash: d.textHash })),
  segmentation: PIPELINE_VERSION,
  sentenceCount: total,
};
const manifestHash = await hashText(JSON.stringify(manifest));
const manifestHashLine = `${manifestHash.algorithm}:${manifestHash.hash}`;

const verdict = thresholdVerdict({ rate, humanReview: null, founderSignOff: false });

// ---- what drives the disagreements ----------------------------------------
// The blended rate is flat; the failures are not. Group them so the founder
// sees which axis to decide on before signing anything.

const typePairs = new Map();
const coverageHoles = new Map();
for (const s of all) {
  const t = s.checks.find((c) => c.id === 'type');
  if (t.engaged && !t.pass) {
    const key = `${t.detail.rowType} → ${t.detail.kind}`;
    if (!typePairs.has(key)) typePairs.set(key, { count: 0, examples: [] });
    const e = typePairs.get(key);
    e.count += 1;
    if (e.examples.length < 3) e.examples.push(s);
  }
  const cov = s.checks.find((c) => c.id === 'coverage');
  if (!cov.pass) {
    const key = Object.entries(cov.detail)
      .filter(([, v]) => v === false).map(([k]) => k).join('+') || 'unknown';
    if (!coverageHoles.has(key)) coverageHoles.set(key, { count: 0, examples: [] });
    const e = coverageHoles.get(key);
    e.count += 1;
    if (e.examples.length < 3) e.examples.push(s);
  }
}

// ---- the report ------------------------------------------------------------

const out = [];
out.push('# Proposition shadow report — Task 7 agreement measurement');
out.push('');
out.push('Both engines run on every sentence of the pinned corpus — today\'s');
out.push('substitution rewrite (`simplify()`) and the proposition extractor — and a');
out.push('sentence agrees when all six checks pass (force parity, type parity, number');
out.push('conservation, actor non-invention, condition/exception conservation,');
out.push('coverage). A check with nothing to test passes vacuously and is not counted');
out.push('as engaged. The verdict per sentence is all-or-nothing across the six.');
out.push('');
out.push(`- Measurement: \`compareEngines\` — ${SHADOW_VERSION}`);
out.push(`- Pipeline: ${PIPELINE_VERSION}`);
out.push(`- Dictionary: ${DICTIONARY_VERSION} (jurisdiction \`${DEFAULT_JURISDICTION}\`)`);
out.push(`- Proposition schema: v${PROPOSITION_SCHEMA_VERSION}`);
out.push(`- Corpus manifest hash: \`${manifestHashLine}\``);
out.push('');
out.push('## Corpus');
out.push('');
out.push(`Pinned by manifest, not by target size: the full sentence set of the documents below`);
out.push(`(${total} sentences — the exact count segmentation yields). Clean text only; the`);
out.push('OCR-degradation variants are a separate axis and never mix into this rate.');
out.push('');
out.push('| Document | Date | Text hash | Sentences |');
out.push('|---|---|---|---|');
for (const r of runs) {
  out.push(`| ${r.doc.refNo} | ${r.doc.date} | \`${r.doc.textHash}\` | ${r.sentences.length} |`);
}
out.push('');
out.push('## Result');
out.push('');
out.push(`**Blended agreement rate: ${pct(rate.agreement)}** — ${agreed} of ${total} sentences agree on all six checks.`);
out.push('');
out.push('Per-check breakdown (a rate driven by one weak check is a different decision from a flat one):');
out.push('');
out.push('| Check | Engaged | Passed | Failed | Pass rate of engaged |');
out.push('|---|---|---|---|---|');
for (const meta of CHECKS) {
  const c = perCheck[meta.id];
  const rateStr = c.engaged ? pct(c.passed / c.engaged) : '— (never engaged)';
  out.push(`| ${c.label} | ${c.engaged} | ${c.passed} | ${c.failed} | ${rateStr} |`);
}
out.push('');
out.push('### Critical violations');
out.push('');
out.push(`Total: **${criticalTotal}**. Any one of these fails the switch gate outright, whatever the rate.`);
out.push('');
for (const cls of CRITICAL_CLASSES) {
  const list = byClass[cls];
  out.push(`- **${cls}**: ${list.length}`);
  for (const s of list.slice(0, 3)) {
    out.push(`  - \`${s.docRef}\` ${s.id}: ${trim(s.source)}`);
  }
  if (list.length > 3) out.push(`  - … ${list.length - 3} more`);
}
out.push('');
out.push('## What drives the disagreements');
out.push('');
out.push(`The blended rate is flat; the failures are not. Type parity alone is ${perCheck.type.failed} of`);
out.push(`the ${rate.disagreed} disagreements, and coverage is ${perCheck.coverage.failed}. The dominant pairs:`);
out.push('');
out.push('| Driver | Count | Examples |');
out.push('|---|---|---|');
const drivers = [
  ...[...typePairs.entries()].map(([k, v]) => ({ driver: `type parity \`${k}\``, ...v })),
  ...[...coverageHoles.entries()].map(([k, v]) => ({ driver: `coverage, missing ${k}`, ...v })),
].sort((a, b) => b.count - a.count);
for (const d of drivers.slice(0, 8)) {
  out.push(`| ${d.driver} | ${d.count} | ${d.examples.map((s) => trim(s.source, 60).replace(/\|/g, '\\|')).join('; ')} |`);
}
out.push('');
out.push('Readings the founder should decide on — the note routes table and schema changes');
out.push('through the design note first, so neither of these is a code tweak:');
out.push('');
out.push('- **\`action → permission\` (the dominant pair).** The old classifier types these');
out.push('  rows as tasks (`action`); the proposition types the same sentence as a choice');
out.push('  (`permission`). The design table pairs `permission` only with `entitlement` —');
out.push('  so either the classifier over-calls \"may\" sentences tasks, or the table needs');
out.push('  a third row. Either way it is a typing disagreement between the engines, which');
out.push('  is precisely what this measurement exists to surface.');
out.push('- **Coverage, missing content.** Segments with no parseable action or predicate —');
out.push('  addressee lines, subject lines, reference numbers — carry no minimum subset.');
out.push('  Concentrated in non-sentence fragments that segmentation counts as sentences.');
out.push('  Either the extractor fills the predicate from the source\'s own words on those,');
out.push('  or the corpus\'s sentence definition excludes fragments.');
out.push('');
out.push('## Threshold');
out.push('');
out.push('The switch from substitution to proposition rendering needs **all** of:');
out.push('≥ 95% agreement, zero critical violations, ≥ 18 of 20 in the stratified');
out.push('human review drawn below, and founder sign-off. Below threshold is a valid');
out.push('finding: this report publishes and the panel stays on substitution.');
out.push('');
out.push('| Bar | Status |');
out.push('|---|---|');
for (const bar of verdict.bars) {
  const mark = bar.pass === true ? 'met' : bar.pass === false ? 'NOT MET' : 'outstanding';
  out.push(`| ${bar.text} | ${mark} |`);
}
out.push('');
out.push(`**Switch verdict: \`${verdict.switch}\`.** Below threshold on the mechanical bars is a`);
out.push('finding, not a failure — the agreement report is the artefact.');
out.push('');
out.push('## Human review — the stratified 20, drawn mechanically');
out.push('');
out.push('Selection is stratum membership plus the lowest FNV hash of the source text.');
out.push('No verdict, check result or rate enters the draw, so the sample is the same');
out.push('whether it is drawn before or after the run — "not chosen after the numbers');
out.push('are known" is mechanical here, not a promise. Strata: every obligation kind,');
out.push('plus the failure classes the old engine was bad at (fragments, hedges,');
out.push('illustrations, mixed sentences, long sentences).');
out.push('');
out.push('Review each row against its source: does the frame say what the sentence says?');
out.push('The row passes if the meaning survives — clunky wording is not a failure.');
out.push('');
out.push('| # | Stratum | Kind | Source | Frame | Engine | Human |');
out.push('|---|---|---|---|---|---|---|');
sample.forEach((s, i) => {
  const src = trim(s.source, 110).replace(/\|/g, '\\|');
  const frame = trim(s.frame, 110).replace(/\|/g, '\\|');
  out.push(`| h${String(i + 1).padStart(2, '0')} | ${s.reviewStratum} | ${s.proposition.obligationType} | ${src} | ${frame} | ${s.agree ? 'agree' : 'disagree'} | ☐ pass ☐ fail |`);
});
out.push('');
out.push('## Reproduce');
out.push('');
out.push('```');
out.push('node scripts/build-shadow-report.mjs');
out.push('```');
out.push('');
out.push('Deterministic end to end: the corpus, the sentence set, the draw and every');
out.push('number regenerate identically from a clean checkout. The run is verified in');
out.push('`scripts/test-proposition.mjs` (shadow section) and gated in `npm test`.');
out.push('');

writeFileSync(outPath, out.join('\n'));
console.log(`sentences: ${total}, agreed: ${agreed} (${pct(rate.agreement)}), criticals: ${criticalTotal}`);
for (const meta of CHECKS) {
  const c = perCheck[meta.id];
  console.log(`  ${meta.id}: engaged ${c.engaged}, passed ${c.passed}, failed ${c.failed}`);
}
console.log(`verdict: ${verdict.switch}`);
console.log(`wrote ${outPath}`);
