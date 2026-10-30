// Regression test for CSV formula injection.
//
// A cell beginning with =, +, @, tab or carriage return must be neutralised
// before a spreadsheet opens it. A numeric value, including a numeric string
// such as -6.6, must stay numeric. Every CSV exporter in the browser uses the
// same helper, so this tests the helper and each exporter's output.
//
// Run: node scripts/test-csv.mjs

import { csvCell, toCsv } from '../src/lib/csv.js';
import { buildRedlineCsv } from '../src/lib/legal/exports.js';
import { exportAuditCsv } from '../src/lib/legal/audit.js';
import { hierarchyCsv } from '../src/lib/india/hierarchy.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}
function eq(name, got, want) {
  const good = got === want;
  if (!good) failures += 1;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function section(title) {
  console.log(`\n--- ${title} ---`);
}

section('the shared cell encoder');

eq('an equals formula is neutralised', csvCell('=1+1'), "'=1+1");
eq('a plus formula is neutralised', csvCell('+1'), "'+1");
eq('a minus formula is neutralised', csvCell('-1+1'), "'-1+1");
eq('an at formula is neutralised', csvCell('@SUM(A1)'), "'@SUM(A1)");
eq('a leading tab is neutralised', csvCell('\t=1+1'), "'\t=1+1");
eq('a numeric string keeps its value', csvCell('-6.617619476065571'), '-6.617619476065571');
eq('a negative integer string keeps its value', csvCell('-5'), '-5');
eq('a negative number stays numeric', csvCell(-5), '-5');
eq('a positive number stays numeric', csvCell(42), '42');
eq('a comma is quoted', csvCell('Rampur, "East"'), '"Rampur, ""East"""');
eq('a null is empty', csvCell(null), '');

section('object rows');

eq(
  'the object exporter keeps numbers numeric and neutralises formulas',
  toCsv([{ value: -5 }, { value: '=1+1' }, { value: '-6.6' }]),
  "value\n-5\n'=1+1\n-6.6",
);

section('the redline pack');

const result = {
  rows: [
    {
      id: 's1',
      clause: '1',
      typeLabel: 'obligation',
      flag: 'green',
      confidence: { level: 'high' },
      start: -5,
      end: 5,
      sourceText: '=1+1',
      plain: '-6.6',
      changes: [],
    },
  ],
};
const redline = buildRedlineCsv(result, { review: null });
ok('the source formula is neutralised', redline.includes(",'=1+1,"), redline.split('\n')[1]);
ok('the numeric start stays numeric', redline.includes(',-5,5,'), redline.split('\n')[1]);
ok('the numeric rewrite stays numeric', redline.endsWith(',-6.6'), redline.split('\n')[1]);

section('the audit log');

const audit = exportAuditCsv([
  {
    id: 'run-1',
    at: '2026-10-30T00:00:00.000Z',
    action: 'copy-bundle',
    matter: { client: '=1+1', matterRef: 'MAT-1', instruction: '@SUM(A1)' },
    sentences: -5,
    words: 100,
    flags: { green: 1, amber: 0, red: 0 },
  },
]);
ok('the client formula is neutralised', audit.includes("'=1+1"), audit.split('\n')[1]);
ok('the instruction formula is neutralised', audit.includes("'@SUM(A1)"), audit.split('\n')[1]);
ok('the negative sentence count stays numeric', audit.includes(',-5,'), audit.split('\n')[1]);

section('the hierarchy download');

const hierarchy = hierarchyCsv([{ level: 'village', name: '=1+1', id: 7 }]);
ok('the place-name formula is neutralised', hierarchy.includes("'=1+1"), hierarchy.split('\n')[1]);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}  ${failures} failure${failures === 1 ? '' : 's'}`);
if (failures > 0) process.exit(1);
