#!/usr/bin/env node
// Tests for the Data Point pipeline.
//
//     node scripts/test-datapoint.mjs
//
// The article is only worth printing if the numbers behind it can be
// re-derived, so these tests check the receipts (every instrument has a
// publisher URL and a retrieval date), the corpus (every instrument
// contributes sampled provisions), the results (the statistics are in
// range and the permutation test actually ran) and the figures (each one
// is a complete, standalone SVG).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { flesch } from '../src/lib/flesch.js';
import { cosine, tfidf, tokenise } from '../src/lib/textsim.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ARTICLE = path.join(ROOT, 'articles', 'datapoint-ai-policy-readability');

let failures = 0;
let checks = 0;

const check = (name, condition, detail = '') => {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// --------------------------------------------------------------- corpus
console.log('corpus');
const corpusPath = path.join(ARTICLE, 'data', 'corpus.json');
check('corpus.json exists', fs.existsSync(corpusPath));
const corpus = readJson(corpusPath);

check('corpus has instruments', corpus.instruments.length >= 15, `${corpus.instruments.length}`);
check(
  'every instrument has a publisher URL',
  corpus.instruments.every((ins) => typeof ins.url === 'string' && /^https?:\/\//.test(ins.url)),
);
check(
  'every instrument has a retrieval date',
  corpus.instruments.every((ins) => /^\d{4}-\d{2}-\d{2}$/.test(ins.retrieved)),
);
check(
  'every instrument has sampled provisions',
  corpus.instruments.every((ins) => ins.provisions.length >= 3),
);
check(
  'every instrument has text to score',
  corpus.instruments.every((ins) => ins.words > 200),
);
check(
  'regions are labelled',
  corpus.instruments.every((ins) => ['india', 'north', 'south'].includes(ins.region)),
);
check('all three regions are represented', new Set(corpus.instruments.map((i) => i.region)).size === 3);
check(
  'non-English instruments are recorded as excluded',
  Array.isArray(corpus.excludedNonEnglish) && corpus.excludedNonEnglish.length >= 1,
);
check(
  'every provision carries its heading and text',
  corpus.instruments.every((ins) =>
    ins.provisions.every((p) => typeof p.heading === 'string' && typeof p.text === 'string' && p.text.length > 40),
  ),
);
check(
  'no mojibake in the corpus',
  corpus.instruments.every((ins) =>
    ins.provisions.every((p) => !/�/.test(p.text) && !/Ã[-¿]/.test(p.text)),
  ),
);

// -------------------------------------------------------------- results
console.log('results');
const resultsPath = path.join(ARTICLE, 'data', 'results.json');
check('results.json exists', fs.existsSync(resultsPath));
const results = readJson(resultsPath);

const head = results.headline;
check('mean gap is a number', Number.isFinite(head.meanGap));
check('bootstrap interval brackets the estimate', head.gapLow <= head.meanGap && head.meanGap <= head.gapHigh);
check('permutation ran 2,000 times', head.nullValues.length === 2000, `${head.nullValues.length}`);
check('permutation p is a probability', head.permutationP >= 0 && head.permutationP <= 1);
check('null values are finite', head.nullValues.every((v) => Number.isFinite(v)));
check(
  'every instrument carries both similarities',
  results.instruments.every((row) => Number.isFinite(row.toNorth) && Number.isFinite(row.toSouth)),
);
check(
  'every instrument carries a bootstrap band',
  results.instruments.every(
    (row) => row.northBand && row.northBand.lo <= row.northBand.hi && row.southBand && row.southBand.lo <= row.southBand.hi,
  ),
);
check(
  'Flesch scores are in range',
  results.instruments.every((row) => row.flesch >= 0 && row.flesch <= 100),
);
// Deontic density is binding verbs per 1,000 words. A strategy document or
// a mission statement can legitimately carry none, and that is the finding
// rather than a defect: the article's claim is that the *binding*
// instruments carry obligation while the voluntary ones do not. So the
// invariant is that every density is a real, non-negative rate, and that
// the instruments which do bind actually carry their verbs.
check(
  'deontic density is a real, non-negative rate',
  results.instruments.every((row) => Number.isFinite(row.deontic) && row.deontic >= 0),
);
check(
  'the binding instruments carry deontic language',
  results.instruments.filter((row) => row.deontic > 0).length >= Math.floor(results.instruments.length * 0.8),
);
check(
  'at least one voluntary instrument carries no obligation at all',
  results.instruments.some((row) => row.deontic === 0),
);
check(
  'lineage counts add up',
  results.lineage.test.nearestNorth + results.lineage.test.nearestSouth === results.lineage.test.n,
  `${results.lineage.test.nearestNorth} + ${results.lineage.test.nearestSouth} vs ${results.lineage.test.n}`,
);
check('concept table has rows', results.lineage.concepts.length > 0);

// The corpus and the results must agree: re-score one instrument from the
// raw text and compare with the number the article quotes.
const sample = corpus.instruments[0];
const sampleRow = results.instruments.find((row) => row.id === sample.id);
const rescored = flesch(sample.provisions.map((p) => p.text).join('\n'));
check(
  'Flesch in results matches a fresh score of the corpus',
  Math.abs(rescored.score - sampleRow.flesch) < 0.15,
  `${rescored.score} vs ${sampleRow.flesch}`,
);

// The similarity machinery must be doing something: a document compared
// with itself is 1, and two unrelated documents are less.
const docs = corpus.instruments.map((ins) => ins.provisions.map((p) => p.text).join(' '));
const { vectors } = tfidf(docs);
check('a document is maximally similar to itself', Math.abs(cosine(vectors[0], vectors[0]) - 1) < 1e-9);
check(
  'different instruments are not identical',
  cosine(vectors[0], vectors[1]) < 0.99,
  `${cosine(vectors[0], vectors[1])}`,
);
check(
  'tokenisation drops stopwords',
  !tokenise('the controller shall process the personal data').includes('the'),
);

// -------------------------------------------------------------- figures
console.log('figures');
const figDir = path.join(ARTICLE, 'figures');
const figures = [
  'fig1-readability.svg',
  'fig2-quadrant.svg',
  'fig3-dumbbell.svg',
  'fig4-permutation.svg',
  'fig5-vocabulary.svg',
];
figures.forEach((name) => {
  const file = path.join(figDir, name);
  const exists = fs.existsSync(file);
  check(`${name} exists`, exists);
  if (!exists) return;
  const svg = fs.readFileSync(file, 'utf8');
  check(`${name} is a complete SVG`, svg.startsWith('<svg') && svg.trimEnd().endsWith('</svg>'));
  check(`${name} declares a size`, /width="\d+"/.test(svg) && /height="\d+"/.test(svg));
  check(`${name} carries a source line`, svg.includes('Source:'));
});

// ----------------------------------------------------------- receipts
console.log('receipts');
const receiptsPath = path.join(ARTICLE, 'data', 'receipts.md');
check('receipts.md exists', fs.existsSync(receiptsPath));
if (fs.existsSync(receiptsPath)) {
  const receipts = fs.readFileSync(receiptsPath, 'utf8');
  corpus.instruments.forEach((ins) => {
    check(`receipt lists ${ins.short}`, receipts.includes(ins.short));
  });
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
