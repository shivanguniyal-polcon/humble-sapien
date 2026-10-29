#!/usr/bin/env node
// Tests for the State's Output dataset, 1947–2026.
//
//     node scripts/test-state-output.mjs
//
// The dataset backs the landing page's timeline: every instrument is one
// named record (a dot), and the aggregates must be derivable from those same
// records — never maintained twice. These checks hold the line on that, on
// the year range the timeline claims (1947–2026), and on the sourcing rule:
// every curated figure carries a scope and a source, because a number
// without a scope and a date is a rumour.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  KINDS,
  AMENDMENTS,
  RTI,
  STEPS,
  MILESTONES,
  GAZETTE_GAP,
  CATALOGUE_NOTE,
} from '../src/data/stateOutput.js';
import { INSTRUMENTS } from '../src/data/stateOutputInstruments.js';
import {
  buildStacks,
  dotAt,
  ordinal,
  amendmentTuples,
  columnLayout,
  yearBands,
  bandAt,
  yearTop,
  spanCount,
  tooltipFill,
  contrastVsWhite,
  YEAR_MIN,
  YEAR_MAX,
} from '../src/lib/outputChart.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RESEARCH = path.join(ROOT, 'public', 'research');

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

const readText = (file) => fs.readFileSync(file, 'utf8');

// One CSV line, quotes and embedded commas respected.
const parseCsvLine = (line) => {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') cells.push(cell), (cell = '');
    else cell += ch;
  }
  cells.push(cell);
  return cells;
};

// ------------------------------------------------------------- kind schema
console.log('kinds');
check('the dataset declares six instrument kinds', KINDS.length === 6, `${KINDS.length}`);
check('every kind id is unique', new Set(KINDS.map((k) => k.id)).size === KINDS.length);
check(
  'every kind carries a label, a terracotta shade and a description',
  KINDS.every((k) => k.label && /^clay-\d00$/.test(k.shade) && k.what),
);
check('every kind shade is unique', new Set(KINDS.map((k) => k.shade)).size === KINDS.length);

// --------------------------------------------------------------- amendments
console.log('constitutional amendments');
check('the amendment list carries all 106 amendments', AMENDMENTS.length === 106, `${AMENDMENTS.length}`);
check(
  'the amendments are numbered 1 to 106 in order',
  AMENDMENTS.every(([n], i) => n === i + 1),
);
const amendmentDates = AMENDMENTS.map(([, d]) => d);
check(
  'every amendment date is an ISO date',
  amendmentDates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))),
);
const amendmentYears = amendmentDates.map((d) => Number(d.slice(0, 4)));
check(
  'the amendments span 1951 to 2023 and none precede 1947',
  Math.min(...amendmentYears) === 1951 && Math.max(...amendmentYears) === 2023,
  `${Math.min(...amendmentYears)}–${Math.max(...amendmentYears)}`,
);

// ----------------------------------------------------------------------- rti
console.log('rti');
check('the RTI series carries at least eight years', RTI.length >= 8, `${RTI.length}`);
check(
  'every RTI row carries a financial year, a measure note, a scope and a source',
  RTI.every((r) => r.fy && r.scope && r.source && r.measure),
);
const fy2223 = RTI.find((r) => r.fy === '2022-23');
check('the RTI series carries the published 2022-23 figure', fy2223?.received === 1638784, String(fy2223?.received));
const fy2425 = RTI.find((r) => r.fy === '2024-25');
check(
  'the 2024-25 row says it counts replies, not receipts',
  Boolean(fy2425 && /repl/i.test(fy2425.scope + fy2425.measure)),
);
check(
  'RTI rows in the gap years are absent, not zero',
  !RTI.some((r) => r.fy === '2023-24') && !RTI.some((r) => r.fy === '2005-06'),
);

// ------------------------------------------------------- steps and milestones
console.log('steps and milestones');
check('the open-data step series carries at least eight snapshots', STEPS.length >= 8, `${STEPS.length}`);
check(
  'every step carries a date, a value, a scope and a source',
  STEPS.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.value > 0 && s.scope && s.source),
);
check(
  'the step series includes the October 2024 MeitY count',
  STEPS.some((s) => s.date === '2024-10-09' && s.value === 503726),
);
check('the milestone list carries at least five dated findings', MILESTONES.length >= 5, `${MILESTONES.length}`);
check(
  'every milestone carries a year, a label, a scope and a source',
  MILESTONES.every((m) => m.year >= 1947 && m.year <= 2026 && m.label && m.scope && m.source),
);
check('the catalogue gap note exists and admits the undercount', /not the state|undercount|true output/i.test(CATALOGUE_NOTE));
check(
  'the Gazette gap is stated separately from the dated milestones',
  Boolean(GAZETTE_GAP.label && GAZETTE_GAP.scope && GAZETTE_GAP.source) && GAZETTE_GAP.year === undefined,
);

// --------------------------------------------------------------- instruments
console.log('instruments');
check('the instrument list is substantial', INSTRUMENTS.length >= 30000, `${INSTRUMENTS.length}`);
check(
  'every instrument is a well-formed record: year 1947–2026, known kind, known jurisdiction, named',
  INSTRUMENTS.every(
    ([year, kind, juris, name]) =>
      Number.isInteger(year) && year >= 1947 && year <= 2026 &&
      Number.isInteger(kind) && kind >= 0 && kind < KINDS.length - 1 &&
      (juris === 0 || juris === 1) &&
      typeof name === 'string' && name.trim().length > 0,
  ),
);

const counts = new Map();
for (const [year, kind, juris] of INSTRUMENTS) {
  const key = `${kind}:${juris}`;
  counts.set(key, (counts.get(key) || 0) + 1);
  void year;
}
const kindTotal = (kind) => (counts.get(`${kind}:0`) || 0) + (counts.get(`${kind}:1`) || 0);
check('acts are the largest law group', kindTotal(0) >= 5000, `${kindTotal(0)}`);
check('amending acts are present in strength', kindTotal(1) >= 500, `${kindTotal(1)}`);
check('ordinances are present', kindTotal(2) >= 400, `${kindTotal(2)}`);
check('rules are present in strength', kindTotal(3) >= 3000, `${kindTotal(3)}`);
check('notifications are the largest group', kindTotal(4) >= 10000, `${kindTotal(4)}`);
check('both jurisdictions are represented in every kind', [0, 1, 2, 3, 4].every((k) => (counts.get(`${k}:0`) || 0) > 0 && (counts.get(`${k}:1`) || 0) > 0));
check(
  'the series spans the full timeline',
  INSTRUMENTS.some(([y]) => y <= 1950) && INSTRUMENTS.some(([y]) => y >= 2025),
);

// ------------------------------------------------------------ chart mapping
console.log('chart mapping');
{
  const rows = [
    [2000, 0, 0, 'Act A'],
    [2000, 0, 0, 'Act B'],
    [2000, 3, 0, 'Rule R'],
    [2000, 4, 1, 'Notification N'],
    [1999, 2, 1, 'Ordinance O'],
  ];
  const all = new Set(KINDS.map((k) => k.id));
  const stacks = buildStacks(rows, all);
  const central2000 = stacks[0].get(2000);
  check('a year column stacks segments in kind order', central2000.map((s) => s.kindIndex).join(',') === '0,3');
  check('segments carry their names in draw order', central2000[0].names.join(',') === 'Act A,Act B');
  check('other jurisdictions land in their own panel', stacks[1].get(2000)[0].names[0] === 'Notification N');

  // Kinds are strata: each segment starts on a fresh row, so the acts
  // (2 dots) own row 0 and the rules begin row 1 even though row 0 has room.
  check('dotAt resolves the bottom-left dot', dotAt(central2000, 3, 0, 0).name === 'Act A');
  check('a stratum keeps its own rows', dotAt(central2000, 3, 0, 2) === null);
  check('the next stratum starts on its own row', dotAt(central2000, 3, 1, 0).name === 'Rule R');
  check('dotAt reports missing dots, not neighbours', dotAt(central2000, 3, 1, 2) === null);
  check('dotAt walks past the stack', dotAt(central2000, 3, 2, 0) === null);

  const withoutRules = buildStacks(rows, new Set(['act']));
  check('disabled kinds drop out of the stack', withoutRules[0].get(2000).length === 1);

  // The reader's order is the band's order. It is passed in full, so every
  // kind has a rank even when only some of them wrote that year.
  const rulesFirst = buildStacks(rows, all, [
    'rule', 'act', 'amending-act', 'ordinance', 'notification', 'constitutional-amendment',
  ]);
  check('the reader’s order decides the strata',
    rulesFirst[0].get(2000).map((s) => s.kindIndex).join(',') === '3,0');
  check('the hit test follows the reader’s order',
    dotAt(rulesFirst[0].get(2000), 3, 0, 0).name === 'Rule R');
  const partialOrder = buildStacks(rows, all, ['rule']);
  check('a kind absent from a partial order still stacks, after the rest',
    partialOrder[0].get(2000).map((s) => s.kindIndex).join(',') === '3,0');

  check('ordinals handle the teens', ordinal(11) === '11th' && ordinal(13) === '13th' && ordinal(42) === '42nd');
  const amend = amendmentTuples([[1, '1951-06-18'], [106, '2023-09-28']]);
  check('amendment dots carry their year and label', amend[0][0] === 1951 && /1st/.test(amend[0][3]) && /106th/.test(amend[1][3]));

  const wide = columnLayout(1040);
  const narrow = columnLayout(500);
  check('a layout keeps its gutter, plot and rail inside the width',
    [wide, narrow].every((l) => l.plotW > 0 && l.axis + l.plotW + l.rail <= l.width + 0.01));
  check('every layout fits whole squares across the plot',
    [wide, narrow].every((l) => l.perRow >= 8 && l.perRow * l.unit <= l.plotW));
  check('compact layouts shrink the squares', narrow.unit < wide.unit);

  // The fixture above: 1999 has one ordinance, 2000 has two acts and a rule.
  const column = yearBands(stacks, 0, 3, 2);
  const y1999 = column.bands.find((b) => b.year === 1999);
  const y2000 = column.bands.find((b) => b.year === 2000);
  check('every year gets a band, in order',
    column.bands.length === YEAR_MAX - YEAR_MIN + 1 && column.bands[0].year === YEAR_MIN);
  check('a band is as deep as its lines', y2000.lines === 2 && y2000.height === 4 && y1999.height === 2);
  check('a year with no records still owns a band',
    column.bands.find((b) => b.year === 1947).lines === 1);
  check('bands carry the running cumulative',
    y1999.cumulative === 0 &&
    y2000.cumulative === 0 &&
    column.bands.find((b) => b.year === 2001).cumulative === 3);
  check('the column is the sum of its bands',
    column.height === column.bands.reduce((n, b) => n + b.height, 0));
  check('the column counts only the shown jurisdiction', column.total === 3);
  check('bandAt finds the band, not its neighbour',
    bandAt(column.bands, y2000.top)?.year === 2000 &&
    bandAt(column.bands, y2000.top + 3)?.year === 2000 &&
    bandAt(column.bands, y2000.top - 0.1)?.year === 1999);
  check('bandAt reports the foot of the column, not a band',
    bandAt(column.bands, column.height + 1) === null);
  check('yearTop agrees with the band it names', yearTop(column.bands, 2000) === y2000.top);

  // The span readout: the same stacks the column draws, so the number can
  // never disagree with the picture, and a kind left out stops counting.
  check('the span over the whole catalogue counts every instrument',
    spanCount(stacks, 0, YEAR_MIN, YEAR_MAX) === column.total);
  check('a one-year span counts only that year',
    spanCount(stacks, 0, 2000, 2000) === 3 && spanCount(stacks, 0, 1999, 1999) === 0);
  check('a span past the records counts nothing', spanCount(stacks, 0, 2001, YEAR_MAX) === 0);
  check('a span handed over backwards counts the same',
    spanCount(stacks, 1, 2000, 1999) === spanCount(stacks, 1, 1999, 2000));
  check('a span beyond the catalogue is clamped, not widened',
    spanCount(stacks, 1, 1800, 3000) === spanCount(stacks, 1, YEAR_MIN, YEAR_MAX));
  check('a span counts the shown jurisdiction only',
    spanCount(stacks, 0, 1999, 2000) === 3 && spanCount(stacks, 1, 1999, 2000) === 2);
}

// ----------------------------------------------------------------- the files
console.log('shipped files');
{
  const text = readText(path.join(RESEARCH, 'ths_state_output_series.csv'));
  const lines = text.trim().split('\n');
  check('the series CSV has the documented header', lines[0] === 'year,series,value,scope,source,date,provisional', lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  check('every series row has seven columns', rows.every((r) => r.length === 7));

  // every instrument aggregate in the CSV must be re-derivable from INSTRUMENTS
  const csvCounts = new Map();
  for (const r of rows) {
    const m = /^([a-z-]+):(central|state)$/.exec(r[1]);
    if (m) csvCounts.set(r[1], (csvCounts.get(r[1]) || 0) + Number(r[2]));
  }
  let match = true;
  for (const [key, n] of counts) {
    const [kind, juris] = key.split(':');
    const id = `${KINDS[kind].id}:${juris === '0' ? 'central' : 'state'}`;
    if (csvCounts.get(id) !== n) match = false;
  }
  check('the CSV aggregates match the instrument records', match, 'run npm run build:research to regenerate it');

  const amendTotal = rows.filter((r) => r[1] === 'constitutional-amendment:central').reduce((n, r) => n + Number(r[2]), 0);
  check('the CSV carries all 106 amendments', amendTotal === 106, `${amendTotal}`);
  check('no CSV row claims a year outside the timeline', rows.every((r) => Number(r[0]) >= 1947 && Number(r[0]) <= 2026));
  check('2026 rows are flagged provisional', rows.filter((r) => r[0] === '2026').every((r) => r[6] === 'true'));
}

{
  const text = readText(path.join(RESEARCH, 'ths_state_output_instruments.csv'));
  const lines = text.trim().split('\n');
  check('the instruments CSV has the documented header', lines[0] === 'year,jurisdiction,kind,name', lines[0]);
  check('the instruments CSV carries every record', lines.length === INSTRUMENTS.length + 1, `${lines.length} lines`);
}

{
  const text = readText(path.join(RESEARCH, 'ths_state_output_sources.txt'));
  check('the source list names India Code', text.includes('indiacode.gov.in'));
  check('the source list names the RTI source family', /Central Information Commission|CIC/i.test(text));
  check('the source list carries the MeitY annual reports', text.includes('MeitY'));
  check('the source list admits the missing Gazette total', /no (national|official)/i.test(text) && /gazette/i.test(text));
}

// -------------------------------------------------------------- hover chip
console.log('hover chip fill');
{
  const rgb = (colour) => {
    const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(colour);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    const n = Number.parseInt(colour.replace('#', ''), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  check('a colour white already reads on is left alone',
    tooltipFill('#7a1f2b') === '#7a1f2b', tooltipFill('#7a1f2b'));
  check('black is never lightened', tooltipFill('#000') === '#000');
  const pale = tooltipFill('#e2c5c9');
  check('a pale colour is darkened past the 4.5:1 floor',
    pale.startsWith('rgb(') && contrastVsWhite(rgb(pale)) >= 4.5,
    `${pale} at ${contrastVsWhite(rgb(pale)).toFixed(2)}:1`);
  check('the darkening stops as soon as it clears the floor',
    contrastVsWhite(rgb(pale)) < 5.6, `${contrastVsWhite(rgb(pale)).toFixed(2)}:1`);
  check('the hue survives the correction',
    rgb(pale)[0] > rgb(pale)[1] && rgb(pale)[0] > rgb(pale)[2], pale);
  const strict = tooltipFill('#8f4451', 7);
  check('a higher floor is honoured',
    contrastVsWhite(rgb(strict)) >= 7, `${strict} at ${contrastVsWhite(rgb(strict)).toFixed(2)}:1`);
  check('an unreadable token is not turned into a colour',
    tooltipFill('nonsense') === 'nonsense');
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} failed`);
  process.exit(1);
}
