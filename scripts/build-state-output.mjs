#!/usr/bin/env node
// Builds src/data/stateOutputInstruments.js from the India Code catalogue.
//
//     node scripts/build-state-output.mjs
//
// India Code (indiacode.gov.in) is the Government of India's own corpus of
// Acts, ordinances, rules and notifications. Its DSpace search API exposes
// every record with the metadata this dataset needs: collection (what kind
// of instrument), state_name (which jurisdiction), act/rule/notification id
// (for deduplication — the catalogue holds several uploads of the same
// instrument), and issue date.
//
// This script crawls the four collection queries, deduplicates, keeps every
// record's catalogue title (the dot label in the timeline), and writes one
// compact row per instrument: [year, kindIndex, jurisIndex, name].
// Kind indexes follow KINDS in src/data/stateOutput.js; juris indexes follow
// JURIS there (0 central, 1 state). Constitutional amendments are NOT
// crawled here — they live in stateOutput.js with their own source.
//
// The counts measure the digitised catalogue, not true output. The
// disclosure lives in CATALOGUE_NOTE and ships with every export.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'src', 'data', 'stateOutputInstruments.js');

const API = 'https://indiacode.gov.in/server/api/discover/search/objects';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Four queries cover the five collections: the field query is tokenised, so
// ACT also returns ACT_AMENDMENT rows and ORDINANCE returns CENTRAL_ORDINANCE
// rows; each record is classified by its exact collection value below.
const QUERIES = [
  'dc.identifier.collection:ACT',
  'dc.identifier.collection:ORDINANCE',
  'dc.identifier.collection:RULE',
  'dc.identifier.collection:NOTIFICATION',
];

const KIND_BY_COLLECTION = {
  ACT: 0,
  ACT_AMENDMENT: 1,
  CENTRAL_ORDINANCE: 2,
  ORDINANCE: 2,
  RULE: 3,
  NOTIFICATION: 4,
};

const YEAR_KEYS = ['dc.date.issued', 'dc.date.enact_date', 'dc.date.notification_year', 'dc.date'];

const val = (md, key) => (md[key]?.[0]?.value ?? null);

const norm = (title) => (title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const issueYear = (md) => {
  for (const key of YEAR_KEYS) {
    const match = /(?:19|20)\d{2}/.exec(String(val(md, key) ?? ''));
    if (match) return Number(match[0]);
  }
  return null;
};

const fetchPage = async (query, page) => {
  const url = `${API}?query=${encodeURIComponent(query)}&size=100&page=${page}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (attempt === 2) throw new Error(`page ${page} of ${query}: ${error.message}`);
    }
  }
  return null;
};

const crawl = async (query) => {
  const first = await fetchPage(query, 0);
  const total = first._embedded.searchResult.page.totalElements;
  const pages = Math.ceil(total / 100);
  console.log(`${query}: ${total} records, ${pages} pages`);

  const rows = [];
  const collect = (doc) => {
    for (const object of doc._embedded.searchResult._embedded.objects) {
      rows.push(object._embedded.indexableObject);
    }
  };
  collect(first);
  for (let start = 1; start < pages; start += 8) {
    const batch = [];
    for (let page = start; page < Math.min(start + 8, pages); page += 1) batch.push(fetchPage(query, page));
    for (const doc of await Promise.all(batch)) collect(doc);
    if ((start - 1) % 40 === 0) console.log(`  page ${start}/${pages}`);
  }
  return rows;
};

const main = async () => {
  const records = [];
  for (const query of QUERIES) records.push(...(await crawl(query)));

  const kept = new Map(); // dedupe key -> row
  let skipped = 0;
  for (const record of records) {
    const md = record.metadata || {};
    const kind = KIND_BY_COLLECTION[val(md, 'dc.identifier.collection')];
    if (kind === undefined) continue;

    const year = issueYear(md);
    if (year === null || year < 1947 || year > 2026) {
      skipped += 1;
      continue;
    }

    const stateName = val(md, 'dc.identifier.state_name');
    const central = val(md, 'dc.identifier.collection') === 'CENTRAL_ORDINANCE' || !stateName || /^central$/i.test(stateName);
    const juris = central ? 0 : 1;

    const name = String(record.name || '').replace(/\s+/g, ' ').trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    // Dedupe: ids are catalogue-unique; Acts key on their Act number within
    // the jurisdiction and year; everything else falls back to normalised title.
    const id = val(md, 'dc.identifier.rule_id') || val(md, 'dc.identifier.notification_id');
    const actNumber = kind === 0 ? val(md, 'dc.identifier.act_number') : null;
    const stateKey = stateName || 'central';
    const key =
      kind === 3 || kind === 4
        ? id || `${stateKey}|${year}|${norm(name)}`
        : kind === 0
          ? `${stateKey}|${year}|${actNumber || norm(name)}`
          : `${stateKey}|${year}|${norm(name)}`;

    if (!kept.has(key)) kept.set(key, [year, kind, juris, name]);
  }

  const rows = [...kept.values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3].localeCompare(b[3]),
  );

  const perKind = [0, 0, 0, 0, 0];
  for (const [, kind] of rows) perKind[kind] += 1;

  const lines = rows.map((row) => `  [${row[0]}, ${row[1]}, ${row[2]}, ${JSON.stringify(row[3])}],`);
  const file = `// GENERATED by scripts/build-state-output.mjs — do not edit by hand.
// Every named instrument the landing timeline plots as one dot:
// [year, kindIndex, jurisIndex, name].
// kindIndex follows KINDS in stateOutput.js (0 act, 1 amending-act,
// 2 ordinance, 3 rule, 4 notification — constitutional amendments live in
// stateOutput.js). jurisIndex follows JURIS there (0 central, 1 state).
// Source: India Code (indiacode.gov.in) catalogue crawl, October 2026.
// What these counts are — and are not — is in CATALOGUE_NOTE.

export const INSTRUMENTS = [
${lines.join('\n')}
];
`;
  fs.writeFileSync(OUT, file);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${rows.length} instruments`);
  console.log(`  acts ${perKind[0]}, amending acts ${perKind[1]}, ordinances ${perKind[2]}, rules ${perKind[3]}, notifications ${perKind[4]}`);
  console.log(`  skipped ${skipped} records (no usable year, outside 1947–2026, or unnamed)`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
