// Village Passbook contract tests.
//
// The captured file is the public record of what eGramSwaraj said on the
// collection date. These checks make the page's claims falsifiable: the
// scheme totals must equal the monthly sums, the XVFC ledger must close, the
// works summary must equal the work rows, no contact detail may leak, and the
// data hash must match the rows it claims to describe.
//
// The golden figures are the captured contract. If a re-collection changes
// them, update this file in the same commit and say why in the message.
//
// Run: node scripts/test-passbook.mjs

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildQuestions,
  buildRtiText,
  buildShareText,
  dateLabel,
  monthLong,
  rupees,
} from '../src/lib/passbook.js';
import { copyFor } from '../src/lib/passbookCopy.js';
import { flyerContent, qrMatrix } from '../src/lib/passbookFlyer.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const DATA = JSON.parse(readFileSync(join(root, 'src/data/passbook/index.json'), 'utf8'));

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const near = (a, b, tol = 0.01) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
const iso = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const EXPECTED = {
  23009: {
    name: 'Jeevan Wala', sarpanch: 'GURJEET SINGH', receipts: 1199395,
    payments: 3216762, xvfcClosing: 597607, works: 5, worksCost: 637613,
  },
  23019: {
    name: 'Markham Grant', sarpanch: 'PARMINDER SINGH', receipts: 5409365,
    payments: 5504125, xvfcClosing: 4301190, works: 12, worksCost: 2376210,
  },
  23027: {
    name: 'Raiwala', sarpanch: 'SAGAR GIRI', receipts: 2500890,
    payments: 3063805.3, xvfcClosing: 4365128, works: 3, worksCost: 499000,
  },
};

ok('the pilot names its scope and year',
  DATA.version === 'passbook-pilot-1' && DATA.year === '2025-2026' && DATA.window?.from === '2025-04-01' && DATA.window?.to === '2026-03-31',
  `${DATA.version} ${DATA.year}`);
ok('the pilot covers three GPs', DATA.gps.length === 3, String(DATA.gps.length));
ok('the pilot is in Uttarakhand, Dehradun district, Doiwala block',
  DATA.state?.code === 5 && DATA.state?.name === 'Uttarakhand' &&
  DATA.district?.code === 49 && DATA.district?.name === 'Dehradun' &&
  DATA.block?.code === 963 && DATA.block?.name === 'Doiwala');
ok('the three GPs are the named Uttarakhand pilot',
  DATA.gps.map((gp) => gp.code).join(',') === '23009,23019,23027' &&
  DATA.gps.every((gp) => EXPECTED[gp.code]?.name === gp.name));
ok('the file is small enough to ship', Buffer.byteLength(JSON.stringify(DATA), 'utf8') < 1_000_000,
  `${Buffer.byteLength(JSON.stringify(DATA), 'utf8')} bytes`);

// 2. Hash and provenance.
ok('the data hash covers the GP rows',
  DATA.dataHash === `sha256:${sha256(JSON.stringify(DATA.gps))}`,
  DATA.dataHash);
ok('the collection records its request count',
  Number.isInteger(DATA.collection?.requests) && DATA.collection.requests > 100,
  String(DATA.collection?.requests));
ok('every source carries a live URL, a hash and a retrieval date',
  Array.isArray(DATA.sources) && DATA.sources.length >= 20 &&
  DATA.sources.every((source) =>
    /^https:\/\/egramswaraj\.gov\.in\//.test(source.url) &&
    /^sha256:[0-9a-f]{64}$/.test(source.sha256) &&
    Number.isInteger(source.bytes) && source.bytes > 0 &&
    !Number.isNaN(Date.parse(source.retrievedAt))),
  `${DATA.sources?.length} sources`);
ok('the source ids are unique', new Set(DATA.sources.map((source) => source.id)).size === DATA.sources.length);
ok('the caveats are present and substantive',
  Array.isArray(DATA.caveats) && DATA.caveats.length >= 6 &&
  DATA.caveats.every((line) => typeof line === 'string' && line.trim().length > 40),
  `${DATA.caveats?.length} caveats`);

// 3. No personal contact details in the public file.
const text = JSON.stringify(DATA);
const textWithoutHashes = text.replace(/sha256:[0-9a-f]{64}/g, 'sha256:hash');
ok('no email address is published', !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text));
ok('no ten-digit phone number is published', !/(?:\+91[\s-]?)?[6-9]\d{9}\b/.test(textWithoutHashes));
ok('no mobile, phone or email key survives',
  !/"(?:mobile|phone|email|contact)(?:Number|Address)?":/i.test(text));

// 4. Each GP.
for (const gp of DATA.gps) {
  const expected = EXPECTED[gp.code];
  ok(`${gp.name}: the profile names the Sarpanch and Secretary`,
    gp.profile?.sarpanch === expected.sarpanch &&
    typeof gp.profile?.secretary === 'string' && gp.profile.secretary.trim().length > 2);
  ok(`${gp.name}: the office has an address and a six-digit PIN`,
    typeof gp.profile?.address === 'string' && gp.profile.address.trim().length > 3 &&
    /^\d{6}$/.test(gp.profile?.pin || ''));
  ok(`${gp.name}: the profile source resolves`,
    DATA.sources.some((source) => source.id === gp.sourceIds.profile));

  const finance = gp.finance;
  ok(`${gp.name}: the budget year is the pilot year`, finance?.year === DATA.year);
  ok(`${gp.name}: the headline receipts are the captured figure`,
    near(finance.totals.receipts, expected.receipts), `${finance.totals.receipts}`);
  ok(`${gp.name}: the headline payments are the captured figure`,
    near(finance.totals.payments, expected.payments), `${finance.totals.payments}`);
  ok(`${gp.name}: at least one scheme carries money`, finance.schemes.length >= 1);
  ok(`${gp.name}: every scheme has finite, non-negative money`,
    finance.schemes.every((scheme) =>
      Number.isFinite(scheme.receipts) && scheme.receipts >= 0 &&
      Number.isFinite(scheme.payments) && scheme.payments >= 0 &&
      near(scheme.net, scheme.receipts - scheme.payments)));
  ok(`${gp.name}: scheme receipts sum to the headline`,
    near(finance.schemes.reduce((sum, scheme) => sum + scheme.receipts, 0), finance.totals.receipts));
  ok(`${gp.name}: scheme payments sum to the headline`,
    near(finance.schemes.reduce((sum, scheme) => sum + scheme.payments, 0), finance.totals.payments));
  ok(`${gp.name}: the month series has twelve labelled months`,
    finance.months.length === 12 &&
    finance.months.map((month) => month.label).join(',') === 'Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,Jan,Feb,Mar');
  ok(`${gp.name}: monthly receipts sum to the headline`,
    near(finance.months.reduce((sum, month) => sum + month.receipts, 0), finance.totals.receipts));
  ok(`${gp.name}: monthly payments sum to the headline`,
    near(finance.months.reduce((sum, month) => sum + month.payments, 0), finance.totals.payments));
  ok(`${gp.name}: every scheme month series has twelve rows`,
    finance.schemes.every((scheme) => scheme.months.length === 12));

  const xvfc = finance.xvfc;
  ok(`${gp.name}: the XVFC ledger closes`,
    near(xvfc.opening + xvfc.receipts - xvfc.payments, xvfc.closing) &&
    near(xvfc.closing, expected.xvfcClosing), `${xvfc.closing}`);
  ok(`${gp.name}: the untied and tied components close`,
    near(xvfc.untied.opening + xvfc.untied.receipts - xvfc.untied.payments, xvfc.untied.closing) &&
    near(xvfc.tied.opening + xvfc.tied.receipts - xvfc.tied.payments, xvfc.tied.closing));
  ok(`${gp.name}: the components sum to the ledger`,
    near(xvfc.untied.closing + xvfc.tied.closing, xvfc.closing) &&
    near(xvfc.untied.receipts + xvfc.tied.receipts, xvfc.receipts));
  ok(`${gp.name}: the reconciliation is exact`,
    finance.reconciliation.closingDelta === 0 &&
    finance.reconciliation.receiptDelta === 0 &&
    finance.reconciliation.paymentDelta === 0);
  ok(`${gp.name}: the XVFC monthly return is the ledger return`,
    near(finance.reconciliation.monthlyXVFCReceipts, xvfc.receipts) &&
    near(finance.reconciliation.monthlyXVFCPayments, xvfc.payments));

  ok(`${gp.name}: the hand-off between the ledger and the works table is declared`,
    ['work-report', 'plan-api'].includes(gp.worksSource) &&
    typeof gp.worksNote === 'string' && gp.worksNote.length > 40);
  ok(`${gp.name}: the completed-work count is the captured figure`,
    gp.works.length === expected.works, `${gp.works.length}`);
  ok(`${gp.name}: every work has an activity code and a name`,
    gp.works.every((work) =>
      /^\d+$/.test(work.activityCode) &&
      typeof work.name === 'string' && work.name.trim().length > 3));
  ok(`${gp.name}: every completion date is ISO or explicitly unpublished`,
    gp.works.every((work) => work.completedOn == null || iso(work.completedOn)));
  ok(`${gp.name}: every cost is finite or explicitly unpublished`,
    gp.works.every((work) => work.approvedCost == null || Number.isFinite(work.approvedCost)));
  ok(`${gp.name}: the works summary counts every row`,
    gp.worksSummary.count === gp.works.length &&
    gp.worksSummary.pricedCount + gp.worksSummary.unpricedCount === gp.works.length);
  ok(`${gp.name}: the works summary cost is the captured figure`,
    near(gp.worksSummary.approvedCost, expected.worksCost), `${gp.worksSummary.approvedCost}`);
  ok(`${gp.name}: the works summary cost is the sum of priced rows`,
    near(
      gp.worksSummary.approvedCost,
      gp.works.filter((work) => Number.isFinite(work.approvedCost))
        .reduce((sum, work) => sum + work.approvedCost, 0),
    ));
  ok(`${gp.name}: each work source resolves`,
    gp.sourceIds.works.length > 0 &&
    gp.sourceIds.works.every((id) => DATA.sources.some((source) => source.id === id)));

  const vendors = gp.vendors;
  ok(`${gp.name}: the vendor counts add up`,
    vendors.accepted + vendors.rejected + vendors.pending + vendors.other === vendors.total);
  ok(`${gp.name}: the vendor type counts add up`,
    vendors.byType.reduce((sum, type) => sum + type.total, 0) === vendors.total);
  ok(`${gp.name}: the vendor source resolves`,
    DATA.sources.some((source) => source.id === gp.sourceIds.vendors));
}

// 5. The page claims a source for every scheme row it prints.
for (const gp of DATA.gps) {
  ok(`${gp.name}: every scheme row has a monthly source`,
    gp.finance.schemes.every((scheme) => gp.sourceIds.monthly.includes(scheme.sourceId) &&
      DATA.sources.some((source) => source.id === scheme.sourceId)));
}

// 6. The reading layer: both languages, the generated questions, and the two
// documents a resident can carry out of the page. These are pure functions, so
// the checks need no browser.
const doc = { ...DATA, gp: DATA.gps[0] };
const enCopy = copyFor('en');
const hiCopy = copyFor('hi');

ok('the English and Hindi packs carry the same keys',
  Object.keys(enCopy).sort().join(',') === Object.keys(hiCopy).sort().join(','),
  Object.keys(enCopy).filter((key) => !(key in hiCopy)).join(', '));
ok('every copy key has the same shape in both languages',
  Object.keys(enCopy).every((key) => typeof enCopy[key] === typeof hiCopy[key]));

// Catch a key the page asks for but neither pack defines, and a ten-key drift
// that key-parity alone would miss only if the page used a different name.
const pageSource = readFileSync(join(root, 'src/sections/VillagePassbook.jsx'), 'utf8');
const usedKeys = new Set([...pageSource.matchAll(/\bt\.([A-Za-z0-9_]+)/g)].map((match) => match[1]));
ok('every copy key the page uses exists in both languages',
  [...usedKeys].every((key) => key in enCopy && key in hiCopy),
  [...usedKeys].filter((key) => !(key in enCopy) || !(key in hiCopy)).join(', '));

const questionsEn = buildQuestions(doc, { lang: 'en' });
const questionsHi = buildQuestions(doc, { lang: 'hi' });
ok('the questions are generated in both languages, in the same order',
  questionsEn.length >= 5 && questionsEn.length === questionsHi.length,
  `${questionsEn.length} / ${questionsHi.length}`);
ok('no question leaks an undefined or NaN value',
  [...questionsEn, ...questionsHi].every((question) =>
    question && !/undefined|NaN|null/.test(question)));
ok('the Hindi questions are written in Devanagari',
  questionsHi.every((question) => /[\u0900-\u097F]/.test(question)));
ok('the figure-bearing questions quote a rupee amount',
  questionsEn.filter((question) => question.includes('₹')).length >= 4,
  `${questionsEn.filter((question) => question.includes('₹')).length} of ${questionsEn.length}`);

const shareHi = buildShareText(doc, { lang: 'hi', url: 'https://example.test/khata' });
ok('the WhatsApp summary names the GP, the year and the three headline figures',
  shareHi.includes(doc.gp.nameHi) && shareHi.includes(doc.year) &&
  shareHi.includes(rupees(doc.gp.finance.totals.receipts, 'hi')) &&
  shareHi.includes(rupees(doc.gp.finance.totals.payments, 'hi')) &&
  shareHi.includes(rupees(doc.gp.finance.xvfc.closing, 'hi')));
ok('the WhatsApp summary carries the share link',
  shareHi.includes('https://example.test/khata'));

const rtiEn = buildRtiText(doc, { lang: 'en' });
const rtiHi = buildRtiText(doc, { lang: 'hi' });
ok('the RTI draft names every captured activity code',
  doc.gp.works.every((work) => rtiEn.includes(work.activityCode) && rtiHi.includes(work.activityCode)));
ok('the RTI draft leaves the applicant fields to fill in',
  rtiEn.includes('[name]') && rtiEn.includes('[date]') && rtiHi.includes('[नाम]') && rtiHi.includes('[दिनांक]'));
ok('the RTI draft carries the data hash',
  rtiEn.includes(doc.dataHash) && rtiHi.includes(doc.dataHash));

const flyer = flyerContent(doc, { url: 'https://example.test/#/tools/passbook?s=25&d=49' });
ok('the image flyer is written in Hindi',
  flyer.brand === 'खाता' && /[\u0900-\u097F]/.test(flyer.kicker) &&
  /[\u0900-\u097F]/.test(flyer.title));
ok('the image flyer carries the three headline figures',
  flyer.stats.length === 3 &&
  flyer.stats[0].value === rupees(doc.gp.finance.totals.receipts, 'hi') &&
  flyer.stats[1].value === rupees(doc.gp.finance.totals.payments, 'hi') &&
  flyer.stats[2].value === rupees(doc.gp.finance.xvfc.closing, 'hi'));
ok('the image flyer carries the first three Gram Sabha questions',
  flyer.questions.length === 3 && flyer.questions.every((question) => /[\u0900-\u097F]/.test(question)));
ok('the image flyer keeps the share link and the source hash',
  flyer.url === 'https://example.test/#/tools/passbook?s=25&d=49' &&
  flyer.source.includes('eGramSwaraj') &&
  flyer.source.includes(doc.dataHash.replace(/^sha256:/, '').slice(0, 16)));

// The QR must be a real code for the printed URL, not a decorative square.
const qr = qrMatrix(flyer.url);
const qrPattern = (matrix) => Array.from({ length: matrix.count }, (_, row) =>
  Array.from({ length: matrix.count }, (_, column) => (matrix.isDark(row, column) ? '1' : '0')).join('')
).join('');
ok('the flyer QR is a full QR matrix',
  qr.count >= 21 && qrPattern(qr).includes('1'));
ok('the flyer QR encodes the supplied URL, not a fixed image',
  qrPattern(qr) !== qrPattern(qrMatrix('https://example.test/#/tools/passbook?s=25&d=49&v=Other')));

ok('rupees uses Indian digit grouping', rupees(1199395) === '₹11,99,395', rupees(1199395));
ok('the prose month name is not the chart abbreviation',
  monthLong('Nov') === 'November' && monthLong('Nov', 'hi') === 'नवंबर');
ok('a captured date reads in Indian order',
  dateLabel('2026-03-31') === '31 Mar 2026', dateLabel('2026-03-31'));
ok('an unknown language falls back to English', copyFor('fr') === enCopy);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}  ${failures === 0 ? 'all passbook checks passed' : `${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
