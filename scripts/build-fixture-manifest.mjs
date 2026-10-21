// Build the pinned manifest for the canonical legal fixtures.
//
// The fixtures are the regression net for the review engine. Every fixture is
// analysed once, and the counts and hashes it produces are written down. A
// later change to the dictionary, the segmenter, the risk rules or the
// confidence scorer changes one of those numbers, and the test suite fails
// loudly instead of quietly shipping a different rewrite.
//
// This script is run deliberately, when a change to the engine is intended:
//   node scripts/build-fixture-manifest.mjs
// The diff in the manifest is then reviewed like any other change.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse } from '../src/lib/legal/pipeline.js';
import { buildManifest } from '../src/lib/legal/exports.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dir = join(root, 'fixtures', 'legal');

// The fixture set: one instrument per jurisdiction dictionary, so a change to
// any one register of the engine is caught by a fixture rather than by a
// reviewer's eye.
const FIXTURES = [
  {
    file: '01-in-bare-act.txt',
    jurisdictionId: 'in-bare-act',
    title: 'Community Records Act, 2026 (fictional)',
    citation: 'Act No. 00 of 2026, section N (as amended to date)',
    date: '2026-01-15',
  },
  {
    file: '02-uk-si.txt',
    jurisdictionId: 'uk-si',
    title: 'Public Lending (Notification) Regulations 2026 (fictional)',
    citation: 'SI 2026/114, regulation N',
    date: '2026-02-04',
  },
  {
    file: '03-us-cfr.txt',
    jurisdictionId: 'us-cfr',
    title: 'Title 12 § 1026.35 (fictional)',
    citation: 'CFR title 12, section 1026.35',
    date: '2025-11-30',
  },
  {
    file: '04-eu-regulation.txt',
    jurisdictionId: 'eu-regulation',
    title: 'Regulation (EU) 2026/1140 (fictional)',
    citation: 'Regulation (EU) 2026/1140, Article N',
    date: '2026-02-12',
  },
  {
    file: '05-sg-statute.txt',
    jurisdictionId: 'sg-statute',
    title: 'Community Facilities (Maintenance) Act 2026 (fictional)',
    citation: '2026 Rev Ed Act N, section N',
    date: '2026-03-02',
  },
];

const entries = [];
for (const fixture of FIXTURES) {
  const text = readFileSync(join(dir, fixture.file), 'utf8');
  const result = analyse(text, {
    jurisdictionId: fixture.jurisdictionId,
    mode: 'legal-review',
    source: {
      title: fixture.title,
      citation: fixture.citation,
      date: fixture.date,
    },
  });
  const manifest = await buildManifest(result);
  entries.push({
    file: fixture.file,
    jurisdictionId: fixture.jurisdictionId,
    title: fixture.title,
    citation: fixture.citation,
    date: fixture.date,
    engine: manifest.engine,
    dictionary: manifest.dictionary,
    rows: manifest.rows,
    flags: { ...result.summary },
    confidence: { ...manifest.confidence },
    readability: {
      source: result.readability.original.grade,
      rewrite: result.readability.simplified.grade,
    },
    outputHash: manifest.outputHash,
    sourceHash: manifest.sourceHash,
  });
  console.log(
    `${fixture.file}: ${manifest.rows} rows, ${result.summary.green}g/${result.summary.amber}a/${result.summary.red}r, ` +
      `confidence ${manifest.confidence.high}h/${manifest.confidence.medium}m/${manifest.confidence.low}l`,
  );
}

const present = readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
const expected = FIXTURES.map((f) => f.file).sort();
if (present.join(',') !== expected.join(',')) {
  console.error('Fixture files and FIXTURES list disagree.');
  console.error(`  on disk: ${present.join(', ')}`);
  console.error(`  in code: ${expected.join(', ')}`);
  process.exit(1);
}

writeFileSync(
  join(dir, 'manifest.json'),
  `${JSON.stringify(
    {
      manifestVersion: 'ths-legal-fixtures-1.0.0',
      note: 'Pinned by scripts/build-fixture-manifest.mjs. A change here means the engine changed; review the diff before accepting it.',
      fixtures: entries,
    },
    null,
    2,
  )}\n`,
);
console.log(`\nwrote ${join(dir, 'manifest.json')}`);
