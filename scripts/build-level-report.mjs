// The reading-level corpus report: does each level generalise?
//
// The red-team bars measure three cases and the shadow report measures
// proposition agreement. Neither answers the question a level selector
// raises: on real instruments, how often does a level actually reach its
// band, and does it keep the numbers and negations it started with?
//
// Method: the pinned corpus is split into unique sentences by the same
// pipeline the engine uses. The draw is deterministic by sentence hash —
// nothing about the result picks the sample. Each level runs over the same
// drawn set, and the report gives, per level: sentences measured, share in
// band, median achieved ease, the sentences whose cap could not be reached,
// and conservation failures (a digit or a negation the level lost).
//
// This is a report, not a gate: it exits 0 even when the bars are missed.
// The bars it prints are the ones the level design has to earn — reach at
// least 60% in band and lose no number or negation — and the table says
// where each level stands today.
//
// Usage: node scripts/build-level-report.mjs [--limit N]

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { analyse } from '../src/lib/legal/pipeline.js';
import { simplify } from '../src/lib/simplify.js';
import { LEVELS } from '../src/lib/legal/levels.js';
import { hashText } from '../src/lib/legal/exports.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const corpusPath = join(root, 'private/verification/2026-10-22-rbi-precision-test/corpus.jsonl');
const outPath = join(root, 'private/level-report.md');

const argLimit = process.argv.indexOf('--limit');
const LIMIT = Number(
  (argLimit > 0 && process.argv[argLimit + 1]) || process.env.LEVEL_LIMIT || 800,
);

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const trim = (s, n = 140) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// ---- the corpus, split exactly as the engine splits it ---------------------

const docs = readFileSync(corpusPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));

const unique = new Map();
for (const doc of docs) {
  const { rows } = analyse(doc.text, { mode: 'citizen', jurisdictionId: 'in-bare-act' });
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.sourceId)) continue;
    seen.add(row.sourceId);
    const text = String(row.sourceText || '').trim();
    if (text.split(/\s+/).filter(Boolean).length < 8) continue;
    if (!unique.has(text)) unique.set(text, { text, ref: doc.refNo });
  }
}

// Deterministic draw: order by sentence hash, take the head. The result of a
// level never enters the draw, so the same corpus always draws the same set.
const hashed = [];
for (const entry of unique.values()) {
  hashed.push({ ...entry, key: (await hashText(entry.text)).hash });
}
hashed.sort((a, b) => a.key.localeCompare(b.key));
const sample = hashed.slice(0, LIMIT);

// ---- conservation ----------------------------------------------------------

const NUMBERS = /\b\d[\d,.]*[A-Za-z]?\b/g;
// A contraction is a negation: "do not" → "don't" is a rewording, not a
// loss. The apostrophe is not a word character, so "not" needs its own
// alternation and the contracted form needs a literal n't.
const NEGATION = /\b(?:not|no|never|none|nothing|nobody|without|unless|cannot)\b|n['’]t\b/i;

const numbersIn = (text) =>
  (String(text || '').match(NUMBERS) || []).map((n) => n.replace(/,/g, '').toLowerCase());

// A level that declares a removal is not a level that loses the number: the
// page lists the removal beside the source. Conservation is about silent
// loss, so a figure or negation inside a reported removal counts as carried,
// and the report shows those separately so they cannot be confused with a
// clean pass.
const reportedText = (changes) => (changes || [])
  .filter((c) => c.removed)
  .map((c) => `${c.from || ''} ${c.to || ''}`)
  .join(' ');

const lostNumbers = (source, out, changes) => {
  const have = new Set([...numbersIn(out), ...numbersIn(reportedText(changes))]);
  return [...new Set(numbersIn(source))].filter((n) => !have.has(n));
};

const reportedNumbers = (source, out, changes) => {
  const quiet = new Set(numbersIn(reportedText(changes)));
  const have = new Set(numbersIn(out));
  return [...new Set(numbersIn(source))].filter((n) => quiet.has(n) && !have.has(n));
};

const lostNegation = (source, out, changes) =>
  NEGATION.test(source) && !NEGATION.test(out) && !NEGATION.test(reportedText(changes))
    ? ['negation'] : [];

// ---- the run ---------------------------------------------------------------

const results = LEVELS.map((level) => {
  const scores = [];
  let inBand = 0;
  let floorSentences = 0;
  let floorTotal = 0;
  const numberFailures = [];
  const negationFailures = [];
  let reportedCount = 0;
  for (const s of sample) {
    const r = simplify(s.text, { level: level.id });
    const changes = r.stats.replacements;
    scores.push(r.level.achieved);
    if (r.level.reached) inBand += 1;
    if (r.level.floors.length) floorSentences += 1;
    floorTotal += r.level.floors.length;
    const lostNums = lostNumbers(s.text, r.simplifiedText, changes);
    reportedCount += reportedNumbers(s.text, r.simplifiedText, changes).length;
    if (lostNums.length) numberFailures.push({ source: trim(s.text), lost: lostNums.join(', ') });
    if (lostNegation(s.text, r.simplifiedText, changes).length) {
      negationFailures.push({ source: trim(s.text), out: trim(r.simplifiedText) });
    }
  }
  scores.sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)] ?? 0;
  const p10 = scores[Math.floor(scores.length * 0.1)] ?? 0;
  return {
    level,
    measured: sample.length,
    inBand,
    reach: sample.length ? inBand / sample.length : 0,
    median,
    p10,
    floorSentences,
    floorTotal,
    numberFailures,
    reportedCount,
    negationFailures,
  };
});

const BAR_REACH = 0.6;

// ---- the report ------------------------------------------------------------

const lines = [];
lines.push('# Reading-level report — reach and conservation on the pinned corpus');
lines.push('');
lines.push(`Corpus: \`private/verification/2026-10-22-rbi-precision-test/corpus.jsonl\``);
lines.push('');
lines.push(`Unique sentences in the corpus (≥ 8 words): ${unique.size}. Drawn: ${sample.length}, ordered by sentence hash — no verdict in the draw.`);
lines.push('');
lines.push('| Level | Band | In band | Reach | Median ease | p10 | Floors (sentences) | Numbers lost | Numbers removed (reported) | Negations lost |');
lines.push('|---|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  lines.push(`| ${r.level.label} | ${r.level.band[0]}–${r.level.band[1]} | ${r.inBand}/${r.measured} | ${pct(r.reach)} | ${r.median} | ${r.p10} | ${r.floorSentences} (${r.floorTotal}) | ${r.numberFailures.length} | ${r.reportedCount} | ${r.negationFailures.length} |`);
}
lines.push('');
lines.push(`**Bars**: each level must reach at least ${pct(BAR_REACH)} of sentences in band and lose no number or negation silently. A figure inside a removal the level declares counts as carried by the report, and sits in the last column.`);
for (const r of results) {
  const reach = r.reach >= BAR_REACH ? 'met' : `missed (${pct(r.reach)})`;
  const cons = r.numberFailures.length === 0 && r.negationFailures.length === 0
    ? 'met' : 'missed';
  lines.push(`- ${r.level.label}: reach ${reach}; conservation ${cons}.`);
}
lines.push('');

for (const r of results) {
  if (r.numberFailures.length) {
    lines.push(`## ${r.level.label} — numbers lost (first 3)`);
    lines.push('');
    for (const f of r.numberFailures.slice(0, 3)) {
      lines.push(`- lost ${f.lost} — ${f.source}`);
    }
    lines.push('');
  }
  if (r.negationFailures.length) {
    lines.push(`## ${r.level.label} — negations lost (first 3)`);
    lines.push('');
    for (const f of r.negationFailures.slice(0, 3)) {
      lines.push(`- ${f.source} → ${f.out}`);
    }
    lines.push('');
  }
}

lines.push('## What this report does not measure');
lines.push('');
lines.push('Reach is Flesch ease against the band; it is not a meaning check. The conservation columns catch the two failures that matter most at a level boundary — a dropped number and a dropped negation — not every change a level makes. A loss is silent only: if the level declares the removal, the figure is counted in the reported column instead, because the page lists the removal and the source stays beside the rewrite. That column is not a pass; it is a size, and a level that reports dropping numbers has to say so on its face.');
lines.push('');

writeFileSync(outPath, lines.join('\n'));

console.log(`sentences drawn: ${sample.length} of ${unique.size} unique`);
for (const r of results) {
  console.log(
    `${r.level.label}: ${pct(r.reach)} in band (${r.inBand}/${r.measured}), median ${r.median}, `
    + `floors ${r.floorSentences} sentences, numbers lost ${r.numberFailures.length}, `
    + `numbers removed (reported) ${r.reportedCount}, negations lost ${r.negationFailures.length}`,
  );
}
console.log(`wrote ${outPath}`);
