// The verification ledger behind Sampark.
//
// A date on a rung is a promise that somebody read the source. The tests
// below hold that promise to three things: every rung and contact has a
// record, a record cannot cover a claim that does not exist, and the four
// states behave the way the page says they do.
//
// Run directly (node scripts/test-sampark-verification.mjs) or through
// `npm test`.

import { SCHEMES } from '../src/data/schemes.js';
import { escalation } from '../src/data/escalation.js';
import {
  INITIAL_CONTACT_KEYS,
  INITIAL_RUNG_KEYS,
  INITIAL_SCHEME_KEYS,
  REVIEW_WINDOW_DAYS,
  contactKey,
  rungKey,
  verificationFor,
} from '../src/data/verification.js';
import { SCHEME_CONTACT_GAPS, SCHEME_HELPLINES } from '../src/data/contacts.js';
import { schemeContacts } from '../src/lib/contacts.js';
import { addDays, formatChecked, stateFor, verification } from '../src/lib/verification.js';
import { buildCaseNote, caseReference } from '../src/lib/case.js';
import { carryItems } from '../src/lib/documents.js';
import { SAMPARK_COPY, SAMPARK_LOCALES, copyFor, fill } from '../src/data/samparkCopy.js';
import { SAMPARK_UI } from '../src/data/samparkUiCopy.js';
import { SAMPARK_UI_EXTRA } from '../src/data/samparkUiExtra.js';
import { SAMPARK_UI_GUIDE } from '../src/data/samparkUiGuide.js';
import { SAMPARK_UI_FOLD } from '../src/data/samparkUiFold.js';

let passed = 0;
const failures = [];
const ok = (name, condition, detail = '') => {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? ` (${detail})` : ''}`);
};

const today = new Date();
const todayIso = today.toISOString().slice(0, 10);

// ------------------------------------------------------------- the corpus

const realRungs = SCHEMES.flatMap((scheme) =>
  scheme.situations.flatMap((situation) =>
    situation.rungs.map((rung) => rungKey(scheme.id, situation.id, rung.level)),
  ),
);

const realContacts = Object.entries(escalation).flatMap(([policyId, touchpoints]) =>
  touchpoints.flatMap((touchpoint, ti) =>
    touchpoint.steps.map((step, si) => contactKey(policyId, ti, si)),
  ),
);

ok('the corpus has 105 rungs', realRungs.length === 105, `${realRungs.length}`);
ok('the corpus has 21 contacts', realContacts.length === 21, `${realContacts.length}`);
ok('rung keys are unique', new Set(realRungs).size === realRungs.length);
ok('contact keys are unique', new Set(realContacts).size === realContacts.length);

// ------------------------------------------------------- the ledger covers

for (const key of realRungs) {
  ok(`rung ${key} has a verification record`, verificationFor('rungs', key) !== null);
}
for (const key of realContacts) {
  ok(`contact ${key} has a verification record`, verificationFor('contacts', key) !== null);
}

// The ledger must not claim to have checked something that no longer exists.
// An orphan key is a date with nothing behind it, which is worse than no date.
const realRungSet = new Set(realRungs);
const realContactSet = new Set(realContacts);
for (const key of INITIAL_RUNG_KEYS) {
  ok(`ledger rung ${key} exists in the corpus`, realRungSet.has(key));
}
for (const key of INITIAL_CONTACT_KEYS) {
  ok(`ledger contact ${key} exists in the corpus`, realContactSet.has(key));
}

ok('the rung ledger has no duplicates',
  new Set(INITIAL_RUNG_KEYS).size === INITIAL_RUNG_KEYS.length);
ok('the contact ledger has no duplicates',
  new Set(INITIAL_CONTACT_KEYS).size === INITIAL_CONTACT_KEYS.length);
ok('the scheme ledger has no duplicates',
  new Set(INITIAL_SCHEME_KEYS).size === INITIAL_SCHEME_KEYS.length);
ok('the ledger covers every rung, not fewer',
  INITIAL_RUNG_KEYS.length === realRungs.length, `${INITIAL_RUNG_KEYS.length}`);
ok('the ledger covers every contact, not fewer',
  INITIAL_CONTACT_KEYS.length === realContacts.length, `${INITIAL_CONTACT_KEYS.length}`);

ok('a rung that does not exist has no record', verificationFor('rungs', 'mgnrega/jobcard/tehsil') === null);
ok('an unknown kind has no record', verificationFor('offices', 'mgnrega') === null);
ok('a scheme that does not exist has no record', verificationFor('schemes', 'nope') === null);

// ------------------------------------------------------------ the records

for (const key of [...INITIAL_RUNG_KEYS, ...INITIAL_CONTACT_KEYS, ...INITIAL_SCHEME_KEYS]) {
  const kind = realRungSet.has(key) ? 'rungs' : realContactSet.has(key) ? 'contacts' : 'schemes';
  const record = verificationFor(kind, key);
  ok(`${key} records an ISO date`, /^\d{4}-\d{2}-\d{2}$/.test(record.checkedOn), record.checkedOn);
  ok(`${key} names who checked it`, Boolean(record.checkedBy && record.checkedBy.length > 2));
  ok(`${key} says how it was checked`, Boolean(record.how && record.how.length > 2));
  ok(`${key} is not dated in the future`, record.checkedOn <= todayIso, record.checkedOn);
}

// ------------------------------------------------------------- the windows

ok('a contact is reviewed more often than a statute', REVIEW_WINDOW_DAYS.contacts < REVIEW_WINDOW_DAYS.rungs);
ok('the rung window is six months', REVIEW_WINDOW_DAYS.rungs === 180, `${REVIEW_WINDOW_DAYS.rungs}`);
ok('the contact window is three months', REVIEW_WINDOW_DAYS.contacts === 90, `${REVIEW_WINDOW_DAYS.contacts}`);

ok('addDays counts forward across a year', addDays('2026-10-30', 180) === '2027-04-28', addDays('2026-10-30', 180));
ok('addDays handles a leap day', addDays('2028-02-28', 1) === '2028-02-29', addDays('2028-02-28', 1));

// --------------------------------------------------------------- the states

const record = { checkedOn: '2026-10-30', checkedBy: 'A. Reviewer', how: 'source read' };

const fresh = stateFor(record, 'rungs', new Date('2026-11-05T12:00:00Z'));
ok('a record inside its window is fresh', fresh.state === 'fresh', fresh.state);
ok('fresh names the check date', fresh.label.includes(formatChecked('2026-10-30')), fresh.label);
ok('fresh names the date the next check is due', fresh.label.includes(formatChecked('2027-04-28')), fresh.label);

const due = stateFor(record, 'rungs', new Date('2027-04-20T12:00:00Z'));
ok('a record inside the last fortnight is due', due.state === 'due', due.state);
ok('due counts the days left', due.daysLeft === 8, `${due.daysLeft}`);

const stale = stateFor(record, 'rungs', new Date('2027-04-29T12:00:00Z'));
ok('a record past its window is stale', stale.state === 'stale', stale.state);
ok('stale says the re-check is overdue', /overdue/.test(stale.label), stale.label);
ok('stale names the date it went overdue', stale.label.includes(formatChecked('2027-04-28')), stale.label);

const undated = stateFor(null, 'rungs', new Date('2026-11-05T12:00:00Z'));
ok('a missing record is undated', undated.state === 'undated', undated.state);
ok('undated says there is no date', /No check date recorded/.test(undated.label), undated.label);
ok('undated carries no date', undated.checkedOn === null);

ok('a malformed date is undated', stateFor({ checkedOn: '30-10-2026' }, 'rungs').state === 'undated');
ok('no verification label uses an em dash',
  ![fresh, due, stale, undated].some((v) => v.label.includes('\u2014')));

// The page reads through the ledger, so the two paths must agree.
const fromLedger = verification('rungs', 'mgnrega/jobcard/village', new Date('2026-11-05T12:00:00Z'));
ok('the ladder reads a dated rung through the ledger', fromLedger.state === 'fresh', fromLedger.state);
ok('the ladder reads the same date the ledger holds',
  fromLedger.checkedOn === verificationFor('rungs', 'mgnrega/jobcard/village').checkedOn);

const fromContacts = verification('contacts', 'pmjay/0/0', new Date('2026-11-05T12:00:00Z'));
ok('the delivery map reads a dated contact through the ledger', fromContacts.state === 'fresh', fromContacts.state);

// ------------------------------------------------------- 5. the contact layer
//
// Every scheme must offer at least two routes a citizen can use, and a scheme
// with no recorded phone number must say so. A blank where a helpline belongs
// reads as an omission; a gap note reads as a finding.

const schemeIds = SCHEMES.map((s) => s.id);
const contactNow = new Date('2026-11-05T12:00:00Z');

ok('the scheme ledger has fourteen schemes',
  INITIAL_SCHEME_KEYS.length === 14, `${INITIAL_SCHEME_KEYS.length}`);
ok('the scheme ledger covers every scheme',
  schemeIds.every((id) => INITIAL_SCHEME_KEYS.includes(id)));
ok('the scheme ledger has no orphans',
  INITIAL_SCHEME_KEYS.every((id) => schemeIds.includes(id)));

for (const id of schemeIds) {
  const scheme = SCHEMES.find((s) => s.id === id);
  const routes = schemeContacts(id, contactNow);

  ok(`${id} has a contact route set`, Boolean(routes));
  ok(`${id} offers at least two channels`, routes.channels.length >= 2, `${routes.channels.length}`);
  ok(`${id} names its portal first`, routes.channels[0].kind === 'portal', routes.channels[0].kind);
  ok(`${id} portal matches the scheme data`, routes.channels[0].href === scheme.portal);
  ok(`${id} portal is a government host`,
    /^https:\/\/(www\.)?[a-z0-9.-]+\.(gov|nic)\.in/.test(routes.channels[0].href),
    routes.channels[0].href);
  ok(`${id} carries the central grievance route`,
    routes.channels.some((c) => c.href === 'https://pgportal.gov.in'));
  ok(`${id} is never silent about contact coverage`,
    Boolean(routes.gap) || routes.directory || routes.helplines.length > 0,
    `gap=${Boolean(routes.gap)} directory=${routes.directory} phones=${routes.helplines.length}`);
  ok(`${id} does not carry a gap and a directory at once`,
    !(routes.gap && routes.directory),
    `gap=${Boolean(routes.gap)} directory=${routes.directory}`);
  ok(`${id} dates its contact check`, routes.check.checkedOn === '2026-10-30', `${routes.check.checkedOn}`);
  ok(`${id} contact check is fresh at the initial pass`, routes.check.state === 'fresh', routes.check.state);
  ok(`${id} contact check names its date`, routes.check.label.includes(formatChecked('2026-10-30')), routes.check.label);
}

ok('PM-JAY and SBM have curated directories among the schemes',
  SCHEMES.filter((s) => schemeContacts(s.id, contactNow).directory).map((s) => s.id).join(',') ===
    'pmjay,sbm',
  SCHEMES.filter((s) => schemeContacts(s.id, contactNow).directory).map((s) => s.id).join(','));

// Swachh Bharat joined the ladder with its two situations and its own rungs.
const sbm = SCHEMES.find((s) => s.id === 'sbm');
ok('SBM is in the ladder', Boolean(sbm));
ok('SBM carries two situations', sbm?.situations.length === 2, `${sbm?.situations.length}`);
ok('SBM rungs are all recorded',
  sbm.situations.every((situation) =>
    situation.rungs.every((rung) => verificationFor('rungs', `${sbm.id}/${situation.id}/${rung.level}`))));
ok('SBM says why it has no deadline',
  sbm.situations.every((situation) => Boolean(situation.clockGap) && !situation.clock));

ok('every gap note says what is missing',
  Object.entries(SCHEME_CONTACT_GAPS).every(([id, text]) =>
    schemeIds.includes(id) && text.length > 60 && !text.includes('\u2014')),
  Object.keys(SCHEME_CONTACT_GAPS).join(','));
ok('the gap notes do not claim a phone number',
  Object.values(SCHEME_CONTACT_GAPS).every((t) => !/\b1800\b|\b14555\b/.test(t)));

// ------------------------------------------------------- 6. the helplines
//
// A number enters this corpus only after its official page was read. The
// checks below hold that line: a government source, the digits as printed,
// and a dated record in the ledger separate from the portal check.

ok('exactly five schemes carry a verified number',
  Object.keys(SCHEME_HELPLINES).sort().join(',') === 'eshram,jjm,nsp,pmuy,ssy',
  Object.keys(SCHEME_HELPLINES).sort().join(','));

ok('no number is invented for a scheme whose page could not be read',
  ['mgnrega', 'pmkisan', 'pmayg', 'svanidhi', 'vishwakarma', 'saubhagya', 'poshan']
    .every((id) => !SCHEME_HELPLINES[id]));

for (const [id, line] of Object.entries(SCHEME_HELPLINES)) {
  const routes = schemeContacts(id, contactNow);
  const phone = routes.channels.find((c) => c.kind === 'phone');

  ok(`${id} offers its number as a callable channel`, Boolean(phone));
  ok(`${id} keeps the portal first`, routes.channels[0].kind === 'portal');
  ok(`${id} names the office the number reaches`, line.label.length > 5, line.label);
  ok(`${id} says what the line handles`, line.handles.length > 10, line.handles);
  ok(`${id} records the day the number was read`, line.checkedOn === '2026-11-05', line.checkedOn);
  ok(`${id} sources its number to a government page`,
    /^https:\/\/(www\.)?[a-z0-9.-]+\.(gov|nic)\.in\//.test(line.source), line.source);
  ok(`${id} prints every number it records`,
    line.numbers.length > 0 && line.numbers.every((n) => phone.text.includes(n)), phone.text);
  ok(`${id} dials the first number`,
    phone.href === `tel:${line.numbers[0].replace(/[^\d+]/g, '')}`, phone.href);
  ok(`${id} states whether the line is toll-free`, typeof line.tollFree === 'boolean');
  ok(`${id} has a dated helpline record in the ledger`,
    verificationFor('schemes', `helpline/${id}`)?.checkedOn === '2026-11-05');
  ok(`${id} helpline check is fresh at the initial pass`,
    routes.helplineCheck.state === 'fresh', routes.helplineCheck.state);
  ok(`${id} dates its number against the contact window`,
    routes.helplineCheck.label.includes(
      formatChecked(addDays(line.checkedOn, REVIEW_WINDOW_DAYS.contacts))
    ), routes.helplineCheck.label);
  ok(`${id} helpline check names its source`,
    routes.helplineCheck.source === line.source, routes.helplineCheck.source);
}

ok('the NSP desk is not claimed toll-free', SCHEME_HELPLINES.nsp.tollFree === false);
ok('the India Post line is marked as not SSY-specific',
  /not SSY-specific/.test(SCHEME_HELPLINES.ssy.handles));

// Silence must never read as "no number needed". Every scheme that has
// neither a number nor a directory must still carry its gap note.
const withoutPhone = SCHEMES.filter(
  (s) => !SCHEME_HELPLINES[s.id] && !schemeContacts(s.id, contactNow).directory
).map((s) => s.id);
ok('every scheme without a number or directory carries a gap note',
  withoutPhone.every((id) => Boolean(SCHEME_CONTACT_GAPS[id])), withoutPhone.join(','));

ok('no gap note repeats a number that has its own record',
  Object.entries(SCHEME_CONTACT_GAPS).every(([id, text]) =>
    (SCHEME_HELPLINES[id] ? [SCHEME_HELPLINES[id]] : []).every((line) =>
      line.numbers.every((n) => !text.includes(n)))));

// ------------------------------------------------- 7. documents and the case
//
// The documents step is only honest if every rung names what to carry and
// the source that says so. The case note must never look like a sent message,
// and the consent line must be the only thing that changes the ask.

ok('every rung names documents to carry',
  SCHEMES.every((s) =>
    s.situations.every((situation) =>
      situation.rungs.every((rung) => Boolean(rung.carry) && rung.carry.length > 5)
    )
  ));
ok('every rung names the source behind its documents',
  SCHEMES.every((s) =>
    s.situations.every((situation) =>
      situation.rungs.every((rung) => Boolean(rung.source) && rung.source.length > 3)
    )
  ));

const caseScheme = SCHEMES[0];
const caseSituation = caseScheme.situations[0];
const caseRung = caseSituation.rungs[0];
const caseBase = {
  scheme: caseScheme,
  situation: caseSituation,
  place: { label: 'Pune, Maharashtra' },
  rung: caseRung,
  clock: null,
  dates: {},
};
const caseRef = caseReference(caseBase);

ok('the case reference names THS', /^THS-[A-Z0-9]{6}$/.test(caseRef), caseRef);
ok('the case reference is stable for the same case', caseReference(caseBase) === caseRef);
ok('the case reference changes with the office',
  caseReference({ ...caseBase, rung: caseSituation.rungs[1] }) !== caseRef);

const adviceNote = buildCaseNote({ ...caseBase, reference: caseRef, consent: false });
ok('the case note carries its reference', adviceNote.includes(caseRef));
ok('the case note names the scheme and situation',
  adviceNote.includes(caseScheme.name) && adviceNote.includes(caseSituation.label));
ok('an unauthorised note asks for advice only', /advice only/i.test(adviceNote));
ok('an unauthorised note does not claim representation', !/take this case up on my behalf/i.test(adviceNote));

const authorisedNote = buildCaseNote({ ...caseBase, reference: caseRef, consent: true });
ok('an authorised note records consent', /take this case up on my behalf/i.test(authorisedNote));
ok('no case note prints an undefined value', !/undefined|null/.test(adviceNote));

ok('a comma list splits into its documents',
  carryItems('Aadhaar, bank passbook, the application number').length === 3,
  carryItems('Aadhaar, bank passbook, the application number').join(' | '));
ok('a reply-or-absence stays one instruction',
  carryItems('The district’s reply, or the absence of one').length === 1,
  carryItems('The district’s reply, or the absence of one').join(' | '));
ok('an and-clause is not cut in half',
  carryItems('The written application, and any written intimation of work').length === 1);
ok('“everything below” stays one instruction',
  carryItems('Everything below, in order').length === 1);
ok('a semicolon starts a new document', carryItems('Aadhaar; bank passbook').length === 2);
ok('an empty carry line has no documents', carryItems('').length === 0);

// --------------------------------------------------------- 8. the languages

ok('the page ships nine languages', SAMPARK_LOCALES.length === 9, `${SAMPARK_LOCALES.length}`);
const copyKeys = Object.keys(SAMPARK_COPY.en);
for (const locale of SAMPARK_LOCALES) {
  const copy = copyFor(locale.code);
  const missing = copyKeys.filter((key) => typeof copy[key] !== 'string' || !copy[key].trim());
  ok(`${locale.code} has every page label`, missing.length === 0, missing.join(','));
}
const uiEnglish = {
  ...SAMPARK_UI.en,
  ...SAMPARK_UI_EXTRA.en,
  ...SAMPARK_UI_GUIDE.en,
  ...SAMPARK_UI_FOLD.en,
};
const uiKeys = Object.keys(uiEnglish);
const placeholders = (value) =>
  [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
for (const locale of SAMPARK_LOCALES) {
  const copy = copyFor(locale.code);
  const missing = uiKeys.filter((key) => typeof copy[key] !== 'string' || !copy[key].trim());
  ok(`${locale.code} has every interface string`, missing.length === 0, missing.join(','));
  const broken = uiKeys.filter(
    (key) => placeholders(copy[key]) !== placeholders(uiEnglish[key])
  );
  ok(`${locale.code} keeps every interface placeholder`, broken.length === 0, broken.join(','));
  if (locale.code !== 'en') {
    const untranslated = uiKeys.filter((key) => copy[key] === uiEnglish[key]);
    ok(`${locale.code} translates every interface string`, untranslated.length === 0, untranslated.join(','));
  }
}
const contactTitles = {
  hi: 'संपर्क',
  bn: 'সম্পর্ক',
  gu: 'સંપર્ક',
  ta: 'தொடர்பு',
  te: 'సంపర్కం',
  kn: 'ಸಂಪರ್ಕ',
  ml: 'സമ്പർക്കം',
  ur: 'رابطہ',
};
ok('every named language carries its own page title',
  Object.entries(contactTitles).every(([code, title]) => copyFor(code).title === title),
  Object.entries(contactTitles).map(([code, title]) => `${code}:${copyFor(code).title}/${title}`).join(' '));
ok('every language has its own step labels',
  SAMPARK_LOCALES.filter((locale) => locale.code !== 'en').every(
    (locale) => copyFor(locale.code).step1 !== SAMPARK_COPY.en.step1
  ));
ok('every language has its own intro',
  SAMPARK_LOCALES.filter((locale) => locale.code !== 'en').every(
    (locale) => copyFor(locale.code).intro !== SAMPARK_COPY.en.intro
  ));
const caseChrome = [
  'situationCount',
  'documentsSource',
  'documentsEnclosure1',
  'documentsEnclosure2',
  'documentsEnclosure3',
  'csoName',
  'csoMobile',
  'csoReference'
];
for (const locale of SAMPARK_LOCALES.filter((entry) => entry.code !== 'en')) {
  const missing = caseChrome.filter(
    (key) => typeof SAMPARK_COPY[locale.code][key] !== 'string' || !SAMPARK_COPY[locale.code][key].trim()
  );
  ok(`${locale.code} translates the case chrome`, missing.length === 0, missing.join(','));
}
ok('Urdu is marked right-to-left', SAMPARK_LOCALES.find((locale) => locale.code === 'ur')?.rtl === true);
ok('an unknown language falls back to English', copyFor('zz').step1 === SAMPARK_COPY.en.step1);
ok('templates fill their placeholders', fill('{a} of {b}', { a: 3, b: 5 }) === '3 of 5');
ok('a missing placeholder is left alone', fill('{a}', {}) === '{a}');
ok('no translated step label uses an em dash',
  SAMPARK_LOCALES.every((locale) => !copyFor(locale.code).step1.includes('\u2014')));

// ------------------------------------------------------------------ report

if (failures.length) {
  console.error(`\n${failures.length} FAIL`);
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}

console.log(`\n${passed} PASS · Sampark verification ledger`);
