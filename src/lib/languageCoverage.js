// Resolve the hand-checked language ledger against the catalogue rows.
//
// The ledger is deliberately strict: a coverage record must match exactly one
// current instrument by year, kind, jurisdiction and title. If a catalogue
// rebuild renames a record, the test fails instead of the lens lighting the
// wrong square. The returned maps are keyed by the row object for the raster
// (O(1) per square) and by the identity string for the hover chip.

import { COVERAGE } from '../data/languageCoverage.js';

export const coverageKey = (year, kind, juris, title) =>
  [year, kind, juris, title].join('\u0000');

export function resolveCoverage(rows, records = COVERAGE) {
  const wanted = new Map();
  for (const record of records) {
    wanted.set(coverageKey(record.year, record.kind, record.juris, record.title), record);
  }

  const hits = new Map();
  for (const row of rows) {
    const key = coverageKey(row[0], row[1], row[2], row[3]);
    if (!wanted.has(key)) continue;
    const list = hits.get(key);
    if (list) list.push(row);
    else hits.set(key, [row]);
  }

  const byRow = new Map();
  const byKey = new Map();
  const errors = [];

  for (const [key, record] of wanted) {
    const matches = hits.get(key) || [];
    if (matches.length !== 1) {
      errors.push({
        record,
        matches: matches.length,
        reason:
          matches.length === 0
            ? 'no catalogue row matches this record'
            : 'more than one catalogue row matches this record',
      });
      continue;
    }
    if (byRow.has(matches[0])) {
      errors.push({ record, matches: matches.length, reason: 'another record claims the same row' });
      continue;
    }
    byRow.set(matches[0], record);
    byKey.set(key, record);
  }

  return {
    byRow,
    byKey,
    list: [...byRow].map(([row, record]) => ({ row, record })),
    errors,
  };
}
