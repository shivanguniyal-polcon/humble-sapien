// The collection plan for a true before/after diff.
//
// The pinned library has amendment directions but no base directions. The
// extractor can quote each operation and hash it, and it can name the address
// a DELETE removes, but it cannot print the dying clause without the base.
// This script reads every instrument, groups the amendment series by the base
// direction each one names, and records what has to be collected before the
// Version diff can claim to show both sides.
//
// The window is derived, not guessed: it opens on 1 January of the earliest
// base edition named in the corpus and closes on the newest instrument in the
// library. Collecting everything RBI published in that window is the
// conservative way to make the diff complete; the named bases are the
// minimum.
//
// Output: src/data/monitor/collection.json
//
// Run: node scripts/build-amendment-collection.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { extractAmendmentGraph } from '../src/lib/legal/amendments.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const INDEX = readJson('src/data/monitor/index.json');

const normalise = (value) =>
  String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const titleOf = (meta) => normalise(meta.title);

const docs = INDEX.instruments.map((meta) => ({
  meta,
  doc: readJson(`src/data/monitor/${meta.file}`),
}));

const graphs = [];
for (const { meta, doc } of docs) {
  graphs.push({ meta, graph: await extractAmendmentGraph(doc) });
}

// The pinned fifty are the amendment corpus. Base snapshots live beside them
// in `bases`; they answer whether a named base has been collected without
// joining the library's counts, families or predecessor chain.
const baseByTitle = new Map((INDEX.bases || []).map((meta) => [titleOf(meta), meta]));
const bases = new Map();
const unresolved = [];
let operations = 0;
let born = 0;
let removed = 0;
let unresolvedOperations = 0;

for (const { meta, graph } of graphs) {
  operations += graph.edges.length;
  born += graph.born.reduce((sum, entry) => sum + entry.rows.length, 0);
  removed += graph.died.reduce((sum, entry) => sum + entry.refs.length, 0);
  unresolvedOperations += graph.unresolved.length;

  if (graph.instrument.form !== 'AMENDMENT') continue;
  const title = graph.instrument.baseTitle;
  if (!title) {
    unresolved.push({
      id: meta.id,
      refNo: meta.refNo,
      dateISO: meta.dateISO,
      title: meta.title,
      reason: graph.instrument.reason || 'no base instrument reference found',
    });
    continue;
  }

  const key = normalise(title);
  const snapshot = baseByTitle.get(key) || null;
  const entry = bases.get(key) || {
    title,
    key,
    family: meta.family,
    amendments: [],
    inLibrary: Boolean(snapshot),
    baseId: snapshot?.id ?? null,
    versionDate: snapshot?.versionDate || snapshot?.date || null,
  };
  entry.amendments.push({
    id: meta.id,
    refNo: meta.refNo,
    dateISO: meta.dateISO,
    title: meta.title,
  });
  bases.set(key, entry);
}

const months = /(?:Directions|Regulations),?\s*(\d{4})/i;
const baseYears = [...bases.keys()]
  .map((key) => {
    const entry = bases.get(key);
    const match = months.exec(entry.title || '');
    return match ? Number(match[1]) : null;
  })
  .filter(Boolean);
const earliestBaseYear = baseYears.length ? Math.min(...baseYears) : null;
const dates = INDEX.instruments.map((entry) => entry.dateISO).filter(Boolean).sort();
const from = earliestBaseYear ? `${earliestBaseYear}-01-01` : dates[0] || null;
const to = dates[dates.length - 1] || null;

const rows = [...bases.values()]
  .map((entry) => {
    entry.amendments.sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
    return {
      ...entry,
      firstDate: entry.amendments[0]?.dateISO || null,
      lastDate: entry.amendments[entry.amendments.length - 1]?.dateISO || null,
    };
  })
  .sort((a, b) => String(a.firstDate).localeCompare(String(b.firstDate))
    || a.title.localeCompare(b.title));

const plan = {
  generatedAt: new Date().toISOString(),
  corpusHash: INDEX.corpusHash,
  regulator: INDEX.regulator,
  window: { from, to },
  totals: {
    instruments: INDEX.instruments.length,
    amendments: rows.reduce((sum, entry) => sum + entry.amendments.length, 0),
    baseDirections: rows.length,
    missingBases: rows.filter((entry) => !entry.inLibrary).length,
    unresolvedAmendments: unresolved.length,
    operations,
    born,
    removed,
    unresolvedOperations,
  },
  bases: rows,
  unresolved: unresolved.sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO))),
};

writeFileSync(
  join(root, 'src/data/monitor/collection.json'),
  `${JSON.stringify(plan, null, 2)}\n`,
);

console.log(
  `window ${from} → ${to} · ${rows.length} base directions `
  + `(${plan.totals.missingBases} missing) · ${plan.totals.amendments} amendments `
  + `· ${unresolved.length} unresolved forms`,
);
for (const entry of rows) {
  console.log(`  ${entry.inLibrary ? 'present' : 'COLLECT'} | ${entry.firstDate} | ${entry.amendments.length}× | ${entry.title.slice(0, 100)}`);
}
for (const entry of unresolved) {
  console.log(`  UNRESOLVED | ${entry.dateISO} | ${entry.refNo} | ${entry.reason}`);
}
console.log('wrote src/data/monitor/collection.json');
