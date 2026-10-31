// Verification for Sutra's distributional arithmetic and browser persistence.
//
// The two claims that matter: the verdict is weighted by magnitude, so a severe
// effect on a low-power group moves it more than a mild effect on a high-power
// group; and a mixed party is counted separately from both a neutral party and
// the directional averages. The storage checks make sure a reader's edits do
// not disappear on refresh and corrupt storage does not break the page.
//
// Run: node scripts/test-stakeholders.mjs

import {
  createBlankPolicy,
  serializeSharedMap,
  parseSharedMap,
  mergeSharedMap,
  weightedPower,
  summarizeRows,
  buildPitAnswers,
  formatPower,
  loadSavedMaps,
  saveMaps,
  clearSavedMaps,
} from '../src/lib/stakeholders.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const rows = [
  { name: 'A', effect: 'benefits', magnitude: 1, power: 5 },
  { name: 'B', effect: 'benefits', magnitude: 5, power: 1 },
  { name: 'C', effect: 'restricted', magnitude: 5, power: 3 },
  { name: 'D', effect: 'mixed', magnitude: 5, power: 5 },
  { name: 'E', effect: 'neutral', magnitude: 1, power: 1 },
];

// 1. The weighted average.
const ben = weightedPower(rows.filter((r) => r.effect === 'benefits'));
ok('weighted power uses magnitude, not headcount',
  Math.abs(ben - 10 / 6) < 1e-9, `${ben}`);
ok('an empty set has no average, not a zero', weightedPower([]) === null);
ok('a zero-magnitude set has no average',
  weightedPower([{ power: 5, magnitude: 0 }]) === null);
ok('formatting is one decimal', formatPower(ben) === '1.7', formatPower(ben));
ok('formatting handles no reading', formatPower(null) === 'n/a');

// 2. The summary keeps the four directions apart.
const summary = summarizeRows(rows);
ok('benefiting rows are counted', summary.benefited.length === 2);
ok('restricted rows are counted', summary.restricted.length === 1);
ok('mixed rows are counted as mixed, not neutral', summary.mixed.length === 1);
ok('neutral rows are counted as neutral', summary.neutral.length === 1);
ok('mixed is not folded into benefiting', summary.benefited.every((r) => r.effect !== 'mixed'));
ok('mixed is not folded into restricted', summary.restricted.every((r) => r.effect !== 'mixed'));
ok('the mixed weighted power is reported', summary.avgMixed === 5, `${summary.avgMixed}`);
ok('the verdict says it is weighted',
  /magnitude-weighted average power/.test(summary.verdict), summary.verdict);
ok('the verdict names the mixed party instead of dropping it',
  /1 mixed party is counted separately/.test(summary.verdict), summary.verdict);
ok('the verdict names the neutral party',
  /1 neutral party has no direction/.test(summary.verdict), summary.verdict);

// 3. Magnitude changes the verdict even when the raw average does not.
const sameRawAverage = [
  { name: 'low', effect: 'benefits', magnitude: 5, power: 1 },
  { name: 'high', effect: 'benefits', magnitude: 1, power: 5 },
  { name: 'pay', effect: 'restricted', magnitude: 5, power: 3 },
];
const weightedTowardPower = [
  { name: 'low', effect: 'benefits', magnitude: 1, power: 1 },
  { name: 'high', effect: 'benefits', magnitude: 5, power: 5 },
  { name: 'pay', effect: 'restricted', magnitude: 5, power: 3 },
];
const first = summarizeRows(sameRawAverage);
const second = summarizeRows(weightedTowardPower);
const rawPower = (list) => list.reduce((sum, row) => sum + row.power, 0) / list.length;
ok('the raw average is the same in both maps',
  rawPower(sameRawAverage) === rawPower(weightedTowardPower),
  `${rawPower(sameRawAverage)} vs ${rawPower(weightedTowardPower)}`);
ok('the first map puts the cost on the more powerful',
  /costs land on the more powerful/.test(first.verdict), first.verdict);
ok('the second map puts the benefit with the more powerful',
  /benefits flow to stakeholders with more power/.test(second.verdict), second.verdict);
ok('the two verdicts differ',
  first.verdict !== second.verdict);

// 4. One-sided and mixed-only maps.
const oneSided = summarizeRows([
  { name: 'only gain', effect: 'benefits', magnitude: 3, power: 2 },
]);
ok('a one-sided map says it is one-sided', /one-sided/.test(oneSided.verdict));
const mixedOnly = summarizeRows([
  { name: 'both ways', effect: 'mixed', magnitude: 4, power: 5 },
]);
ok('a mixed-only map still names the mixed party',
  /1 mixed party is counted separately/.test(mixedOnly.verdict), mixedOnly.verdict);
ok('a mixed-only map has no directional verdict',
  /no directional readings/.test(mixedOnly.verdict));

// 5. The public interest answers carry the weighting and the separate counts.
const pit = buildPitAnswers(rows, { extraCount: 1, summary });
ok('the benefits answer says weighted', /Magnitude-weighted power/.test(pit.whoBenefits));
ok('the costs answer says weighted', /Magnitude-weighted power/.test(pit.whoPays));
ok('the missing answer names the mixed and neutral counts',
  /1 mixed and 1 neutral/.test(pit.whoMissing), pit.whoMissing);
ok('the missing answer names the browser additions',
  /1 was added in this browser/.test(pit.whoMissing), pit.whoMissing);
ok('the missing answer carries the verdict', pit.whoMissing.includes(summary.verdict));
const blankPit = buildPitAnswers([], { summary: summarizeRows([]), custom: true });
ok('a blank map is labelled reader-built',
  /reader-built map records 0 parties/.test(blankPit.whoMissing), blankPit.whoMissing);
ok('a blank map does not claim a published record',
  !/published record/.test(blankPit.whoMissing), blankPit.whoMissing);

// 6. Saved edits survive a round trip.
const store = new Map();
const fakeStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
const blank = createBlankPolicy({ name: 'Draft test bill', year: 2026 });
ok('a blank policy is created', Boolean(blank && blank.id), blank?.id);
ok('a blank policy has a reader-built id', /^custom-[a-z0-9-]{6,64}$/.test(blank?.id || ''), blank?.id);
ok('a blank policy starts with no parties', blank?.custom === true && blank?.stakeholders.length === 0);
ok('a blank policy has no published sources', blank?.sources.length === 0);
ok('a blank policy keeps its name and year', blank?.name === 'Draft test bill' && blank?.year === 2026);

const saved = {
  edits: { 'pmjay:0': { power: 5, magnitude: 4 } },
  policies: [blank],
  added: {
    pmjay: [
      {
        name: 'A reader-added party',
        effect: 'benefits',
        magnitude: 4,
        power: 1,
        added: true,
        mechanism: 'A mechanism.',
        evidence: 'An official record.',
        counter: 'A counter-argument.',
      },
    ],
  },
};
saveMaps(saved, fakeStorage);
const loaded = loadSavedMaps(fakeStorage);
ok('saved edits round-trip',
  loaded.edits['pmjay:0'].power === 5 && loaded.edits['pmjay:0'].magnitude === 4);
ok('a blank policy round-trips',
  loaded.policies.length === 1 && loaded.policies[0].id === blank.id);
ok('blank policy metadata round-trips',
  loaded.policies[0].name === 'Draft test bill' && loaded.policies[0].year === 2026);
ok('saved additions round-trip',
  loaded.added.pmjay.length === 1 && loaded.added.pmjay[0].added === true);
ok('the saved row keeps its editable notes',
  loaded.added.pmjay[0].mechanism === 'A mechanism.' &&
    loaded.added.pmjay[0].evidence === 'An official record.' &&
    loaded.added.pmjay[0].counter === 'A counter-argument.');
clearSavedMaps(fakeStorage);
ok('clearing storage removes the map',
  loadSavedMaps(fakeStorage).edits && Object.keys(loadSavedMaps(fakeStorage).edits).length === 0);

// 7. Bad storage falls back to the seeded record.
store.set('ths:sutra:v1', '{not json');
ok('invalid JSON falls back to empty', Object.keys(loadSavedMaps(fakeStorage).edits).length === 0);
store.set('ths:sutra:v1', JSON.stringify({ edits: 'wrong', added: { pmjay: 'wrong' } }));
const malformed = loadSavedMaps(fakeStorage);
ok('a malformed edits value is dropped', Object.keys(malformed.edits).length === 0);
ok('a malformed additions value is dropped', Object.keys(malformed.added).length === 0);
store.set('ths:sutra:v1', JSON.stringify({
  added: {
    pmjay: [{ name: '  ', effect: 'not-a-direction', magnitude: 99, power: -2 }],
  },
}));
const cleaned = loadSavedMaps(fakeStorage).added.pmjay[0];
ok('a nameless saved row gets a label', cleaned.name === 'Unnamed party', cleaned.name);
ok('an unknown saved direction becomes neutral', cleaned.effect === 'neutral', cleaned.effect);
ok('saved magnitude is clamped to 1-5', cleaned.magnitude === 5, `${cleaned.magnitude}`);
ok('saved power is clamped to 1-5', cleaned.power === 1, `${cleaned.power}`);
ok('a saved row is marked as reader-added', cleaned.added === true);
const throwing = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};
ok('blocked storage does not break loading', Object.keys(loadSavedMaps(throwing).edits).length === 0);
ok('blocked storage does not break saving', (() => {
  try { saveMaps(saved, throwing); return true; } catch { return false; }
})());
ok('blocked storage does not break clearing', (() => {
  try { clearSavedMaps(throwing); return true; } catch { return false; }
})());

// 8. Reader-built policies are sanitised like rows: only custom ids survive,
// duplicate ids are dropped, and bad metadata gets a usable fallback.
store.set('ths:sutra:v1', JSON.stringify({
  policies: [
    { id: 'pmjay', name: 'A seeded id must not become a custom policy' },
    { id: 'custom-short', name: 'Too short' },
    { id: 'custom-valid-id', name: '  ', year: 'nonsense', strap: 5, question: null },
    { id: 'custom-valid-id', name: 'Duplicate' },
    'not an object',
  ],
}));
const savedPolicies = loadSavedMaps(fakeStorage).policies;
ok('only reader-built ids are accepted', savedPolicies.length === 1, `${savedPolicies.length}`);
ok('a nameless saved policy gets a label',
  savedPolicies[0].name === 'Untitled policy', savedPolicies[0].name);
ok('a bad saved year falls inside 1900-2100',
  savedPolicies[0].year >= 1900 && savedPolicies[0].year <= 2100, `${savedPolicies[0].year}`);
ok('saved policy notes are strings',
  savedPolicies[0].strap === '5' && savedPolicies[0].question === '',
  `${savedPolicies[0].strap}/${savedPolicies[0].question}`);
ok('a saved custom policy has an empty ledger and no sources',
  savedPolicies[0].stakeholders.length === 0 && savedPolicies[0].sources.length === 0);

// 9. Shared links are self-contained, URL-safe and idempotent on import.
const sharedRows = [
  {
    name: 'App developers',
    role: 'Challengers',
    effect: 'benefits',
    magnitude: 4,
    power: 2,
    mechanism: 'Interoperability lowers distribution cost.',
    evidence: 'Draft clause 6.',
    counter: 'Compliance costs may favour incumbents.',
  },
  {
    name: 'नागरिक समूह',
    role: 'Public',
    effect: 'restricted',
    magnitude: 5,
    power: 1,
    mechanism: 'Data access narrows.',
    evidence: 'Draft clause 9.',
    counter: 'A sunset review could restore access.',
  },
];
const shareToken = serializeSharedMap(blank, sharedRows);
ok('a reader-built map serialises to a share token',
  typeof shareToken === 'string' && shareToken.length > 20, `${shareToken?.length}`);
ok('the share token is URL-safe', /^[A-Za-z0-9_-]+$/.test(shareToken || ''));
const fromLink = parseSharedMap(shareToken);
ok('a shared link round-trips its policy',
  fromLink?.policy.id === blank.id && fromLink?.policy.name === 'Draft test bill');
ok('a shared link carries rows and notes',
  fromLink?.rows.length === 2 &&
    fromLink?.rows[0].mechanism === 'Interoperability lowers distribution cost.' &&
    fromLink?.rows[1].counter === 'A sunset review could restore access.');
ok('a shared link keeps unicode text', fromLink?.rows[1].name === 'नागरिक समूह');
ok('shared rows are treated as reader-added',
  fromLink?.rows.every((row) => row.added === true));
ok('a seeded map cannot be serialised',
  serializeSharedMap({ id: 'pmjay', custom: false }, []) === null);
ok('the row cap is enforced on serialising',
  serializeSharedMap(blank, Array.from({ length: 201 }, () => ({}))) === null);

const beforeMerge = {
  edits: { [`${blank.id}:0`]: { power: 5 } },
  added: {},
  policies: [],
};
const merged = mergeSharedMap(beforeMerge, fromLink);
ok('importing a link adds the shared map',
  merged.policies.length === 1 && merged.policies[0].id === blank.id);
ok('importing replaces the map rows with the shared snapshot',
  merged.added[blank.id].length === 2);
ok('importing clears edits for that map id',
  Object.keys(merged.edits).length === 0);
ok('importing the same link again does not duplicate the map',
  mergeSharedMap(merged, fromLink).policies.length === 1);

const encode = (object) => Buffer.from(JSON.stringify(object)).toString('base64url');
ok('a malformed share token is rejected', parseSharedMap('not-a-token') === null);
ok('a wrong share version is rejected',
  parseSharedMap(encode({ v: 2, policy: { id: blank.id, name: 'X' }, rows: [] })) === null);
ok('a seeded id in a share token is rejected',
  parseSharedMap(encode({ v: 1, policy: { id: 'pmjay', name: 'X' }, rows: [] })) === null);
const tampered = parseSharedMap(encode({
  v: 1,
  policy: { id: blank.id, name: '  ', year: 3000 },
  rows: [{ name: '  ', effect: 'nope', magnitude: 99, power: -3, mechanism: 5 }],
}));
ok('a shared link cleans policy metadata',
  tampered?.policy.name === 'Untitled policy' &&
    tampered?.policy.year === new Date().getFullYear(),
  `${tampered?.policy.name}/${tampered?.policy.year}`);
ok('a shared link cleans row fields',
  tampered?.rows[0].name === 'Unnamed party' &&
    tampered?.rows[0].effect === 'neutral' &&
    tampered?.rows[0].magnitude === 5 &&
    tampered?.rows[0].power === 1 &&
    tampered?.rows[0].mechanism === '5',
  JSON.stringify(tampered?.rows[0]));
ok('the row cap is enforced when reading',
  parseSharedMap(encode({
    v: 1,
    policy: { id: blank.id, name: 'Too many' },
    rows: Array.from({ length: 201 }, () => ({ name: 'x' })),
  })) === null);

if (failures) {
  console.log(`\n${failures} stakeholder check(s) FAILED.`);
  process.exit(1);
}
console.log('\nAll stakeholder checks passed.');
