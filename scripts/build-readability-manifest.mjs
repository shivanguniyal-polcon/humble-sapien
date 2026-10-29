#!/usr/bin/env node
// Builds the SHA-256 manifest for the readability study's public files.
//
//     node scripts/build-readability-manifest.mjs
//
// The page links these exact files. Hashing the bytes that ship means a reader
// can download a file, run `shasum -a 256`, and compare it with the table on
// the page. The test suite recomputes every hash and fails if this manifest is
// stale.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ARTICLE = path.join(ROOT, 'articles', 'datapoint-ai-policy-readability');

const FILES = [
  ['data/corpus.json', 'corpus'],
  ['data/results.json', 'results'],
  ['data/receipts.md', 'receipts'],
  ['figures/fig1-readability.svg', 'figure'],
  ['figures/fig2-quadrant.svg', 'figure'],
  ['figures/fig3-dumbbell.svg', 'figure'],
  ['figures/fig4-permutation.svg', 'figure'],
  ['figures/fig5-vocabulary.svg', 'figure'],
];

const files = FILES.map(([relative, role]) => {
  const absolute = path.join(ARTICLE, relative);
  const bytes = fs.readFileSync(absolute);
  return {
    path: relative,
    role,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
});

const manifest = {
  algorithm: 'sha256',
  note: 'Hashes cover the exact bytes offered for download on this page.',
  files,
};

fs.writeFileSync(
  path.join(ARTICLE, 'data', 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`wrote manifest.json with ${files.length} files`);
for (const file of files) console.log(`  ${file.sha256.slice(0, 16)}…  ${file.path}`);
