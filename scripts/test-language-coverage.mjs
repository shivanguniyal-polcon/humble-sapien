#!/usr/bin/env node
// Tests for the timeline's language lens.
//
//     node scripts/test-language-coverage.mjs
//
// The lens may only light a square it can prove. These checks hold the ledger
// to the catalogue: every record resolves to exactly one live instrument, every
// language has at least one verified record, and the stack carries the
// coverage mark the raster paints.

import {
  LANGUAGES,
  LANGUAGE_BY_CODE,
} from '../src/data/languages.js';
import {
  COVERAGE,
  COVERAGE_CHECKED,
  COVERAGE_NOTE,
  COVERAGE_SCOPE,
} from '../src/data/languageCoverage.js';
import { MOTTOS, SPEECH_TAGS } from '../src/data/mottos.js';
import { INSTRUMENTS } from '../src/data/stateOutputInstruments.js';
import { KINDS } from '../src/data/stateOutput.js';
import { buildStacks, dotAt } from '../src/lib/outputChart.js';
import { coverageKey, resolveCoverage } from '../src/lib/languageCoverage.js';

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

// ------------------------------------------------------------- the list
console.log('the Eighth Schedule');
check('the list names 22 languages', LANGUAGES.length === 22, `${LANGUAGES.length}`);
check(
  'every language has a unique code',
  new Set(LANGUAGES.map((entry) => entry.code)).size === LANGUAGES.length,
);
check(
  'every language has a name and an endonym',
  LANGUAGES.every((entry) => entry.name && entry.endonym),
);
check(
  'the three Perso-Arabic languages are marked right-to-left',
  LANGUAGES.filter((entry) => entry.rtl).map((entry) => entry.code).join(',') === 'ks,sd,ur',
);
check(
  'the lookup map covers the list',
  LANGUAGES.every((entry) => LANGUAGE_BY_CODE[entry.code] === entry),
);

// ------------------------------------------------------------- the motto deck
console.log('\nthe motto deck');
check(
  'every scheduled language has a motto',
  LANGUAGES.every((entry) => typeof MOTTOS[entry.code]?.text === 'string' && MOTTOS[entry.code].text.trim()),
);
check(
  'every motto opens with the house mark',
  LANGUAGES.every((entry) => MOTTOS[entry.code].text.startsWith('THS - ')),
);
check(
  'every motto is set in a non-Latin script',
  LANGUAGES.every((entry) => /[^\u0000-\u007F]/.test(MOTTOS[entry.code].text)),
);
check(
  'the motto direction follows the script used in this set',
  LANGUAGES.every(
    (entry) =>
      MOTTOS[entry.code].dir === (entry.code === 'ks' || entry.code === 'ur' ? 'rtl' : 'ltr'),
  ),
);
check(
  'no two languages share a motto',
  new Set(LANGUAGES.map((entry) => MOTTOS[entry.code].text)).size === LANGUAGES.length,
);
check(
  'every language has a region-tagged speech voice',
  LANGUAGES.every((entry) => SPEECH_TAGS[entry.code] === `${entry.code}-IN`),
);

// ------------------------------------------------------------- the ledger
console.log('\nthe ledger');
check('the ledger carries 23 records', COVERAGE.length === 23, `${COVERAGE.length}`);
check(
  'every language code in the ledger is scheduled',
  COVERAGE.every((record) =>
    record.languages.every((code) => Boolean(LANGUAGE_BY_CODE[code])),
  ),
);
check(
  'every record names at least one language',
  COVERAGE.every((record) => record.languages.length > 0),
);
check(
  'every record carries a source and an https URL',
  COVERAGE.every(
    (record) =>
      record.source &&
      /^https:\/\//.test(record.url) &&
      new URL(record.url).hostname.endsWith('legislative.gov.in'),
  ),
);
check(
  'every record points at a real kind and jurisdiction',
  COVERAGE.every(
    (record) =>
      KINDS[record.kind] &&
      (record.juris === 0 || record.juris === 1) &&
      record.year >= 1947 &&
      record.year <= 2026,
  ),
);
check('the checked date is an ISO day', /^\d{4}-\d{2}-\d{2}$/.test(COVERAGE_CHECKED));
check(
  'the note refuses to turn absence into a finding',
  /no language field/.test(COVERAGE_NOTE) && /not a finding/.test(COVERAGE_NOTE),
);
check('the scope says state legislation is out', /State legislation/.test(COVERAGE_SCOPE));

const keys = new Set(
  COVERAGE.map((record) => coverageKey(record.year, record.kind, record.juris, record.title)),
);
check('no two records claim the same instrument', keys.size === COVERAGE.length);

// ------------------------------------------------------------- resolution
console.log('\nresolution against the catalogue');
const resolved = resolveCoverage(INSTRUMENTS);
check(
  'every ledger record resolves to exactly one live row',
  resolved.errors.length === 0,
  resolved.errors.map((error) => `${error.record.title}: ${error.reason}`).join('; '),
);
check(
  'the resolved list has the ledger count',
  resolved.list.length === COVERAGE.length,
  `${resolved.list.length}`,
);
check(
  'the Constitution covers every scheduled language',
  LANGUAGES.every((entry) =>
    COVERAGE.find((record) => record.title === 'The Constitution of India')?.languages.includes(
      entry.code,
    ),
  ),
);

const coveredLanguages = new Set(COVERAGE.flatMap((record) => record.languages));
check(
  'every language has at least one verified record',
  LANGUAGES.every((entry) => coveredLanguages.has(entry.code)),
);

// ------------------------------------------------------------- the stack
console.log('\nthe lens on the stack');
const rows = [
  [2000, 0, 0, 'Covered Act'],
  [2000, 0, 0, 'Uncovered Act'],
  [2000, 0, 1, 'State Act'],
];
const lensRecord = {
  languages: ['ta'],
  source: 'test source',
  url: 'https://www.legislative.gov.in/',
};
const stacks = buildStacks(rows, new Set(['act']), undefined, {
  language: 'ta',
  coverage: new Map([[rows[0], lensRecord]]),
});
const centralSegments = stacks[0].get(2000);
const central = centralSegments[0];
check(
  'the segment carries a parallel coverage mark',
  central.covered?.length === 2 && central.covered[0] === true && central.covered[1] === false,
);
check(
  'the first square resolves as covered',
  dotAt(centralSegments, 2, 0, 0)?.covered === true &&
    dotAt(centralSegments, 2, 0, 0)?.name === 'Covered Act',
);
check(
  'the second square resolves as unrecorded',
  dotAt(centralSegments, 2, 0, 1)?.covered === false &&
    dotAt(centralSegments, 2, 0, 1)?.name === 'Uncovered Act',
);
const plain = buildStacks(rows, new Set(['act']));
check(
  'without the lens there is no coverage mark',
  plain[0].get(2000)[0].covered === null &&
    dotAt(plain[0].get(2000), 2, 0, 0)?.covered === false,
);

if (failures) {
  console.error(`\n${failures} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`\n${checks} checks passed.`);
