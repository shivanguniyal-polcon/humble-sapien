#!/usr/bin/env node
// Rebuild the catalogue count from the committed India Code crawl.
//
//     node scripts/build-catalogue-snapshot.mjs
//
// The landing page's counter is not hand-typed. This script derives the three
// figures from the same rows the timeline draws — every instrument row plus
// the 106 Constitution amendment Acts, which live in stateOutput.js — and
// stamps the result with the time it was built. `npm run build` runs it first,
// so the date under the count is the date of the build, not a promise.
//
// The snapshot is committed so the dev server and a checkout without a build
// still show a count. scripts/test-state-output.mjs fails if it drifts from the
// catalogue.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { INSTRUMENTS } from '../src/data/stateOutputInstruments.js';
import { AMENDMENTS } from '../src/data/stateOutput.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'src', 'data', 'catalogueSnapshot.json');

const centralRows = INSTRUMENTS.filter(([, , juris]) => juris === 0).length;
const stateRows = INSTRUMENTS.filter(([, , juris]) => juris === 1).length;

// The amendments are central instruments and are not part of the crawl rows.
const central = centralRows + AMENDMENTS.length;
const state = stateRows;

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: 'India Code catalogue crawl, October 2026',
  counts: {
    central,
    state,
    all: central + state,
  },
  records: {
    instruments: INSTRUMENTS.length,
    amendments: AMENDMENTS.length,
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  `Catalogue snapshot: ${central.toLocaleString('en-IN')} central · ` +
    `${state.toLocaleString('en-IN')} state · ` +
    `${(central + state).toLocaleString('en-IN')} in all`,
);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} at ${snapshot.generatedAt}`);
