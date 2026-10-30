// Verification for the Sankalp promise scorecards: the full health and
// child-development inventory, the combined sector/verdict filters, the
// visible zero, the queued state, the citation block and the RTI application.
//
// The page's claim is that a reader can take a card away. These checks make
// sure the two take-away texts carry the verdict, the page, the checks, the
// links and the legal period, rather than a paraphrase that drifts from the
// card.
//
// Run: node scripts/test-scorecards.mjs

import {
  promises,
  STATUS_LABELS,
  STATUS_ORDER,
  AUDITED_STATUSES,
  AUDIT_CHECKS,
  CHECK_STATES,
  SECTORS,
  SECTOR_LABELS,
  MANIFESTO,
  manifestoPageUrl,
  corpusFacts,
  promiseSources,
} from '../src/data/promises.js';
import {
  countByStatus,
  countBySector,
  filterPromises,
  buildScorecardText,
  buildPromiseRti,
} from '../src/lib/scorecards.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const audited = promises.filter((promise) => promise.status !== 'queued');
const queued = promises.filter((promise) => promise.status === 'queued');

// 1. The inventory. The health chapter has 29 commitments once the geriatric
//    promise is included; the women-and-children pages add 9.
ok('the set holds 38 promises', promises.length === 38, `${promises.length}`);
ok('the health sector holds 29', promises.filter((p) => p.sector === 'health').length === 29);
ok('the child sector holds 9', promises.filter((p) => p.sector === 'child').length === 9);
ok('seven promises are checked', audited.length === 7, `${audited.length}`);
ok('thirty-one promises are queued', queued.length === 31, `${queued.length}`);
ok('promise ids are unique', new Set(promises.map((p) => p.id)).size === promises.length);
ok('promise texts are unique', new Set(promises.map((p) => p.promise)).size === promises.length);
ok('every promise is in a known sector',
  promises.every((p) => Object.hasOwn(SECTOR_LABELS, p.sector)),
  promises.filter((p) => !Object.hasOwn(SECTOR_LABELS, p.sector)).map((p) => p.id).join(' '));
ok('every promise has a printed page and a PDF page',
  promises.every((p) => Number.isInteger(p.page) && p.page > 0 && Number.isInteger(p.pdfPage) && p.pdfPage > 0),
  promises.filter((p) => !p.page || !p.pdfPage).map((p) => p.id).join(' '));
ok('every promise names its chapter and the department that holds the file',
  promises.every((p) => p.sourceChapter && p.sourceChapter.length > 10 && p.department && p.department.length > 20),
  promises.filter((p) => !p.sourceChapter || !p.department).map((p) => p.id).join(' '));
ok('every promise has a reading longer than a label',
  promises.every((p) => p.reading && p.reading.length > 60),
  promises.filter((p) => !p.reading || p.reading.length <= 60).map((p) => p.id).join(' '));

// 2. The verdict vocabulary. A queued card is not a fifth verdict; it is
//    outside the four checked states.
ok('there are four audited verdicts', AUDITED_STATUSES.length === 4, `${AUDITED_STATUSES.length}`);
ok('the filter order keeps all five states',
  STATUS_ORDER.length === 5 && STATUS_ORDER[4] === 'queued', STATUS_ORDER.join(' '));
ok('every promise has a known status',
  promises.every((p) => Object.hasOwn(STATUS_LABELS, p.status)),
  promises.filter((p) => !Object.hasOwn(STATUS_LABELS, p.status)).map((p) => p.id).join(' '));
ok('no queued card claims an audited verdict',
  queued.every((p) => !AUDITED_STATUSES.includes(p.status)));

// 3. The four checks. Every checked card runs all four; every queued card says
//    plainly that none of them has been run.
ok('there are four audit checks', AUDIT_CHECKS.length === 4, `${AUDIT_CHECKS.length}`);
ok('the audit checks have unique ids',
  new Set(AUDIT_CHECKS.map((c) => c.id)).size === AUDIT_CHECKS.length);
ok('every promise carries all four checks',
  promises.every((p) => AUDIT_CHECKS.every((c) => p.checks && p.checks[c.id])),
  promises.filter((p) => !AUDIT_CHECKS.every((c) => p.checks && p.checks[c.id])).map((p) => p.id).join(' '));
ok('every check state is known',
  promises.every((p) => AUDIT_CHECKS.every((c) => Object.hasOwn(CHECK_STATES, p.checks[c.id].state))));
ok('a checked card that is not found says why',
  audited.every((p) =>
    AUDIT_CHECKS.every((c) => {
      const found = p.checks[c.id];
      return found.state === 'found' || found.state === 'partial' || (found.note && found.note.length > 20);
    })
  ));
ok('every queued card marks all four checks unchecked',
  queued.every((p) => AUDIT_CHECKS.every((c) => p.checks[c.id].state === 'unchecked')));
ok('no checked card hides an unchecked state',
  audited.every((p) => AUDIT_CHECKS.every((c) => p.checks[c.id].state !== 'unchecked')));

// 4. Evidence. Checked cards carry dated delivery evidence; queued cards carry
//    the manifesto page they were transcribed from.
ok('every checked card has at least two dated evidence entries',
  audited.every((p) => p.evidence.length >= 2 && p.evidence.every(([when, what, url]) => when && what && /^https?:/.test(url))));
ok('every queued card links its manifesto page',
  queued.every((p) => p.evidence.length === 1 && p.evidence[0][2] === manifestoPageUrl(p.pdfPage)));
ok('the manifesto URL is https', MANIFESTO.url.startsWith('https://'));
ok('the page link carries the PDF page', manifestoPageUrl(66).endsWith('#page=66'));

// 5. Counts and filters. Every tile stays on the board, and the two filters
//    compose rather than replace each other.
const counts = countByStatus(promises);
ok('the summary keeps all five states', counts.length === 5, `${counts.length}`);
const delivered = counts.find((c) => c.status === 'delivered');
ok('the delivered zero is counted, not hidden',
  delivered && delivered.count === 0, `${delivered && delivered.count}`);
const queuedCount = counts.find((c) => c.status === 'queued');
ok('the queue count is visible',
  queuedCount && queuedCount.count === 31, `${queuedCount && queuedCount.count}`);
ok('the counts add up to the set',
  counts.reduce((sum, c) => sum + c.count, 0) === promises.length);

const sectors = countBySector(promises);
ok('the sector counts cover both sectors', sectors.length === 2, `${sectors.length}`);
ok('the sector counts add up to the set',
  sectors.reduce((sum, s) => sum + s.count, 0) === promises.length);
ok('every sector has a label and a description',
  SECTORS.every((s) => s.label && s.description && s.description.length > 30));

ok('no filters returns the whole set', filterPromises(promises).length === 38);
ok('the health filter returns 29', filterPromises(promises, { sector: 'health' }).length === 29);
ok('the child filter returns 9', filterPromises(promises, { sector: 'child' }).length === 9);
ok('the queued filter returns 31', filterPromises(promises, { status: 'queued' }).length === 31);
ok('sector and verdict compose',
  filterPromises(promises, { sector: 'health', status: 'queued' }).length === 23,
  `${filterPromises(promises, { sector: 'health', status: 'queued' }).length}`);
ok('an empty combination is a real zero',
  filterPromises(promises, { sector: 'child', status: 'delivered' }).length === 0);

// 6. The take-away texts.
const first = promises[0];
const text = buildScorecardText(first);
ok('the citation carries the promise', text.includes(first.promise));
ok('the citation carries the page', text.includes(`p. ${first.page}`));
ok('the citation carries the sector', text.includes(`SECTOR: ${SECTOR_LABELS[first.sector]}`));
ok('the citation carries the verdict', text.includes(`VERDICT: ${STATUS_LABELS[first.status]}`));
ok('the citation carries every check',
  AUDIT_CHECKS.every((c) => text.includes(c.label)));
ok('the citation carries every check state',
  AUDIT_CHECKS.every((c) => text.includes(CHECK_STATES[first.checks[c.id].state].label)));
ok('the citation carries every evidence link',
  first.evidence.every(([, , url]) => text.includes(url)));
ok('the citation names its source', /THS Sankalp/.test(text));
ok('the citation has no em dash', !text.includes('—'));

const queuedText = buildScorecardText(queued[0]);
ok('a queued citation says it is not checked',
  queuedText.includes('STATUS: Not yet checked'));
ok('a queued citation carries the page', queuedText.includes(`p. ${queued[0].page}`));
ok('a queued citation carries all four unchecked states',
  AUDIT_CHECKS.every((c) => queuedText.includes(c.label) && queuedText.includes(CHECK_STATES.unchecked.label)));
ok('a queued citation does not borrow a verdict',
  !queuedText.includes('VERDICT:'));

const rti = buildPromiseRti(first);
ok('the RTI is addressed to the Public Information Officer',
  /^To,\nThe Public Information Officer\n/.test(rti), rti.split('\n').slice(0, 3).join(' | '));
ok('the RTI names the department', rti.includes(first.department));
ok('the RTI quotes the promise', rti.includes(first.promise));
ok('the RTI names the manifesto page', rti.includes(`page ${first.page}`));
ok('the RTI asks for the order', /1\. The file number/.test(rti));
ok('the RTI asks for the budget line', /2\. The budget head/.test(rti));
ok('the RTI asks for the operational record', /3\. The operational record/.test(rti));
ok('the RTI asks who holds the file', /4\. The name and designation/.test(rti));
ok('the RTI cites the thirty-day period and section 7(1)',
  /thirty days/.test(rti) && /section 7\(1\)/.test(rti));
ok('the RTI does not claim the fee has been paid',
  !/I have paid/i.test(rti) && /ready to pay/i.test(rti));
ok('the RTI leaves the applicant fields bracketed',
  /\[Your name\]/.test(rti) && /\[Your address\]/.test(rti));
ok('the RTI has no em dash', !rti.includes('—'));

const child = promises.find((p) => p.sector === 'child');
const childRti = buildPromiseRti(child);
ok('a child-sector RTI names the Women and Child Development Department',
  childRti.includes('Women and Child Development Department'));
ok('a child-sector RTI names its page', childRti.includes(`page ${child.page}`));

const queuedRti = buildPromiseRti(queued[0]);
ok('a queued promise still gets a fileable RTI',
  queuedRti.includes(queued[0].promise) && queuedRti.includes('thirty days'));

const named = buildPromiseRti(first, {
  name: 'A Citizen',
  address: 'A Village',
  phone: '0000000000',
  date: '30 October 2026',
});
ok('the RTI takes the applicant details',
  /Name: A Citizen/.test(named) && /Address: A Village/.test(named) &&
    !named.includes('[Your name]'));

// 7. The corpus block.
ok('two corpus facts link to a published page',
  corpusFacts.filter((f) => f.href).length === 2);
ok('the corpus links are research routes',
  corpusFacts.every((f) => !f.href || f.href.startsWith('#/research/')),
  corpusFacts.map((f) => f.href).filter(Boolean).join(' '));
ok('every corpus fact has a number and a sentence',
  corpusFacts.every((f) => f.n && f.text && f.text.length > 40));
ok('the source list names the manifesto and the delivery evidence',
  promiseSources.length === 2 && /manifesto/i.test(promiseSources[0]) && /evidence/i.test(promiseSources[1]));

if (failures) {
  console.log(`\n${failures} scorecard check(s) FAILED.`);
  process.exit(1);
}
console.log('\nAll scorecard checks passed.');
