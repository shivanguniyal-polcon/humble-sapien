// Village Passbook pilot: collect three Uttarakhand Gram Panchayats from
// eGramSwaraj's public reports and write one auditable data file.
//
// What is collected, per GP:
//   · profile (elected representative, secretary, office address, pin)
//   · XVFC receipt-and-expenditure row (opening, receipts, payments, closing)
//   · scheme-wise monthly receipts and payments (all state schemes)
//   · completed works, from the public physical-progress report
//   · vendor registration counts, not names
//
// What is deliberately not collected or published: mobile numbers, email
// addresses, vendor names, individual bills, Aadhaar or bank details.
//
// The script writes raw responses to private/passbook-pilot/raw/ (gitignored)
// so a reviewer can re-hash every published row. The public JSON carries the
// SHA-256 of each source response.
//
// Run: node scripts/collect-passbook.mjs
//      node scripts/collect-passbook.mjs --gp 23027

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const RAW_DIR = join(ROOT, 'private/passbook-pilot/raw');
const OUT = join(ROOT, 'src/data/passbook/index.json');

const BASE = 'https://egramswaraj.gov.in';
const YEAR = '2025-2026';
const PLAN_YEAR = '2025';
const FROM = '01/04/2025';
const TO = '31/03/2026';
const STATE = { code: 5, name: 'Uttarakhand' };
const DISTRICT = { code: 49, name: 'Dehradun' };
const BLOCK = { code: 963, name: 'Doiwala' };
const XVFC = 3287;
const MONTHS = [
  [4, 'Apr'], [5, 'May'], [6, 'Jun'], [7, 'Jul'], [8, 'Aug'], [9, 'Sep'],
  [10, 'Oct'], [11, 'Nov'], [12, 'Dec'], [1, 'Jan'], [2, 'Feb'], [3, 'Mar'],
];
const GPs = [
  { code: 23009, name: 'Jeevan Wala', nameHi: 'जीवन वाला' },
  { code: 23019, name: 'Markham Grant', nameHi: 'मार्खम ग्रांट' },
  { code: 23027, name: 'Raiwala', nameHi: 'रायवाला' },
];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};
const onlyGp = arg('--gp') ? Number(arg('--gp')) : null;
const targets = onlyGp ? GPs.filter((g) => g.code === onlyGp) : GPs;
if (!targets.length) throw new Error(`unknown GP ${onlyGp}`);

mkdirSync(RAW_DIR, { recursive: true });

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const num = (value) => {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const isoNow = () => new Date().toISOString();

const sources = [];
const sourceById = new Map();
const rawFiles = new Set();
let requests = 0;

function rememberCookies(response) {
  const jar = response.headers.getSetCookie?.() || [];
  for (const entry of jar) {
    const pair = entry.split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
const cookies = new Map();

async function fetchText(url, { referer = BASE, json = false, retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    requests += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'user-agent': UA,
          accept: json ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml,*/*',
          'accept-language': 'en-IN,en;q=0.9',
          ...(referer ? { referer } : {}),
          ...(cookies.size ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (attempt === retries) throw new Error(`${url}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
      continue;
    }
    clearTimeout(timer);
    rememberCookies(response);
    const text = await response.text();
    if (response.ok) return { text, status: response.status, url };
    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === retries) {
      throw new Error(`${url}: HTTP ${response.status}${text.includes('Bad Request') ? ' (the site refused the report request)' : ''}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt));
  }
  throw new Error(`${url}: unreachable`);
}

function addSource(id, label, url, text, retrievedAt = isoNow()) {
  if (sourceById.has(id)) return sourceById.get(id);
  const file = join(RAW_DIR, `${id.replace(/[^a-z0-9._-]+/gi, '-')}.txt`);
  writeFileSync(file, text, 'utf8');
  rawFiles.add(file);
  const entry = {
    id,
    label,
    url,
    retrievedAt,
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: `sha256:${sha256(text)}`,
  };
  sources.push(entry);
  sourceById.set(id, entry);
  return entry;
}

const decode = (text) => text
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));

const linesOf = (html) => decode(
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n'),
)
  .split('\n')
  .map((line) => line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim())
  .filter(Boolean);

const valueAfter = (lines, label, from = 0, to = lines.length) => {
  const at = lines.findIndex((line, i) => i >= from && i < to && line === label);
  if (at < 0) return null;
  for (let i = at + 1; i < to; i += 1) {
    const line = lines[i];
    if (!line || line === '-->' || line.startsWith('XXXX')) continue;
    if (/^(Mobile Number|Email Address|Name|Address Line [123]|Pin Code|Phone Number|Panchayat Website)/.test(line)) return null;
    return line;
  }
  return null;
};

function parseProfile(html) {
  const lines = linesOf(html);
  const sarpanchAt = lines.indexOf('Sarpanch/President Details');
  const secretaryAt = lines.indexOf('Officer/Secretary Details');
  const officeAt = lines.indexOf('Office Contact Details');
  const otherAt = lines.indexOf('Other Details');
  if (sarpanchAt < 0 || secretaryAt < 0 || officeAt < 0) {
    throw new Error('profile page did not carry the expected sections');
  }
  const sarpanch = valueAfter(lines, 'Name', sarpanchAt, secretaryAt);
  const secretary = valueAfter(lines, 'Name', secretaryAt, officeAt);
  const addressLines = ['Address Line 1', 'Address Line 2', 'Address Line 3']
    .map((label) => valueAfter(lines, label, officeAt, otherAt < 0 ? lines.length : otherAt))
    .filter((value) => value && !/^not available$/i.test(value));
  const address = [...new Set(addressLines)].join(', ');
  const pin = valueAfter(lines, 'Pin Code', officeAt, otherAt < 0 ? lines.length : otherAt);
  if (!sarpanch || !secretary) throw new Error('profile page did not name the sarpanch and secretary');
  return { sarpanch, secretary, address, pin: pin || null };
}

function parseWorksReport(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const works = [];
  const seen = new Set();
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => decode(cell[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
    if (cells.length < 8) continue;
    if (!/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[1])) continue;
    const activityCode = cells[1];
    if (seen.has(activityCode)) continue;
    seen.add(activityCode);
    const [day, month, year] = cells[7].split('-');
    const completedOn = day && month && year && /^\d{4}$/.test(year)
      ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : null;
    works.push({
      activityCode,
      name: cells[2],
      focusArea: cells[3] || null,
      approvedCost: cells[4] ? num(cells[4]) : null,
      scheme: cells[5] || null,
      component: cells[6] || null,
      completedOn,
    });
  }
  return works.sort((a, b) => String(b.completedOn || '').localeCompare(String(a.completedOn || '')));
}

async function fallbackWorks(gpCode) {
  const activityUrl = `${BASE}/webservice/getLbApprovedActivityData/${STATE.code}/${PLAN_YEAR}/${gpCode}`;
  const progressUrl = `${BASE}/webservice/getLbPhysicalProgressData/${STATE.code}/${PLAN_YEAR}/${gpCode}`;
  const [activityRaw, progressRaw] = await Promise.all([
    fetchText(activityUrl, { json: true }),
    fetchText(progressUrl, { json: true }),
  ]);
  const activitySource = addSource(`works-plan-${gpCode}`, `Plan API activities, ${gpCode}`, activityUrl, activityRaw.text);
  const progressSource = addSource(`works-progress-${gpCode}`, `Plan API physical progress, ${gpCode}`, progressUrl, progressRaw.text);
  const activities = JSON.parse(activityRaw.text);
  const progress = JSON.parse(progressRaw.text);
  const latest = new Map();
  for (const row of Array.isArray(progress) ? progress : []) {
    const dates = (row.physicalProgressAssetStageWebService || [])
      .map((stage) => stage.cmpltnDt)
      .filter(Boolean)
      .sort();
    const completedOn = dates.at(-1) || null;
    if (!completedOn) continue;
    const previous = latest.get(row.activityCd);
    if (!previous || completedOn > previous) latest.set(row.activityCd, completedOn);
  }
  // The completed-work report uses wrkstts=176. The plan API exposes the
  // same status on an activity (176) and the physical-progress rows carry the
  // completion date where one has been published. Using the status row as
  // well as the progress row keeps administrative works that have no asset
  // progress entry, which is why the counts match the report.
  const works = (Array.isArray(activities) ? activities : [])
    .filter((activity) => activity.activityStts === 176 && num(activity.totalCost) > 0)
    .map((activity) => ({
      activityCode: String(activity.activityCd),
      name: activity.activityName,
      focusArea: null,
      approvedCost: num(activity.totalCost),
      scheme: null,
      component: null,
      completedOn: latest.get(activity.activityCd) || null,
    }))
    .sort((a, b) => String(b.completedOn || '').localeCompare(String(a.completedOn || '')));
  return { works, sourceIds: [activitySource.id, progressSource.id] };
}

function monthsFrom(rows) {
  const byMonth = new Map(MONTHS.map(([monthNo, label]) => [monthNo, { monthNo, label, receipts: 0, payments: 0 }]));
  for (const row of Array.isArray(rows) ? rows : []) {
    const entry = byMonth.get(row.monthNo);
    if (!entry) continue;
    entry.receipts = round2(entry.receipts + num(row.receipt));
    entry.payments = round2(entry.payments + num(row.payment));
  }
  return MONTHS.map(([monthNo]) => byMonth.get(monthNo));
}

const emptyMonths = () => MONTHS.map(([monthNo, label]) => ({ monthNo, label, receipts: 0, payments: 0 }));

const sumMonths = (a, b) => a.map((row, i) => ({
  ...row,
  receipts: round2(row.receipts + b[i].receipts),
  payments: round2(row.payments + b[i].payments),
}));

function summariseWorks(works) {
  const byScheme = new Map();
  let approvedCost = 0;
  let priced = 0;
  for (const work of works) {
    if (Number.isFinite(work.approvedCost)) {
      approvedCost += work.approvedCost;
      priced += 1;
      const key = work.scheme || 'Not stated in the plan API';
      const entry = byScheme.get(key) || { scheme: key, count: 0, cost: 0 };
      entry.count += 1;
      entry.cost = round2(entry.cost + work.approvedCost);
      byScheme.set(key, entry);
    }
  }
  const dates = works.map((work) => work.completedOn).filter(Boolean).sort();
  return {
    count: works.length,
    pricedCount: priced,
    unpricedCount: works.length - priced,
    approvedCost: round2(approvedCost),
    latestCompletion: dates.at(-1) || null,
    byScheme: [...byScheme.values()].sort((a, b) => b.cost - a.cost),
  };
}

const startedAt = isoNow();
console.log(`Collecting ${targets.map((gp) => gp.name).join(', ')} for ${YEAR}`);

// One scheme master and one XVFC ledger are shared by all three GPs.
const schemesUrl = `${BASE}/schemeListByState.do?stateId=${STATE.code}`;
const schemesRaw = await fetchText(schemesUrl, { json: true });
const schemes = JSON.parse(schemesRaw.text);
const schemesSource = addSource('schemes-5', 'Scheme list, Uttarakhand', schemesUrl, schemesRaw.text);
if (!Array.isArray(schemes) || !schemes.length) throw new Error('scheme list was empty');

const xvfcUrl = `${BASE}/recExpVpNew.do?finYear=${YEAR}&schemeCode=${XVFC}&stateCode=${STATE.code}&districtCode=${DISTRICT.code}`;
const xvfcRaw = await fetchText(xvfcUrl, { json: true });
const xvfcRows = JSON.parse(xvfcRaw.text);
const xvfcSource = addSource('xvfc-2025-2026', 'XV Finance Commission receipts and expenditure, Dehradun', xvfcUrl, xvfcRaw.text);

// A session cookie helps the physical-progress report answer; if the site
// refuses it, the plan API below still carries the same completed works.
try {
  await fetchText(`${BASE}/ongoingActivityReport.do`, { referer: BASE });
} catch {
  // The report page is optional; the collector is designed to fall back.
}

const gps = [];
for (const gp of targets) {
  console.log(`  ${gp.name} (${gp.code})`);
  const profileUrl = `${BASE}/viewGpProfile.do?localBodyCode=${gp.code}&stateCode=${STATE.code}`;
  const profileRaw = await fetchText(profileUrl);
  const profileSource = addSource(`profile-${gp.code}`, `GP profile, ${gp.name}`, profileUrl, profileRaw.text);
  const profile = parseProfile(profileRaw.text);

  const vendorUrl = `${BASE}/getVendorListData.do?stateCode=${STATE.code}&villageCode=${gp.code}`;
  const vendorRaw = await fetchText(vendorUrl, { json: true });
  const vendorSource = addSource(`vendors-${gp.code}`, `Vendor registrations, ${gp.name}`, vendorUrl, vendorRaw.text);
  const vendorRows = JSON.parse(vendorRaw.text);
  const vendors = {
    total: Array.isArray(vendorRows) ? vendorRows.length : 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    other: 0,
    byType: [],
  };
  const typeCounts = new Map();
  for (const row of Array.isArray(vendorRows) ? vendorRows : []) {
    const status = String(row.status || '').toLowerCase();
    if (status === 'accepted') vendors.accepted += 1;
    else if (status === 'rejected') vendors.rejected += 1;
    else if (status === 'pending') vendors.pending += 1;
    else vendors.other += 1;
    const type = row.vendor_type || 'Unstated';
    const entry = typeCounts.get(type) || { type, accepted: 0, rejected: 0, total: 0 };
    entry.total += 1;
    if (status === 'accepted') entry.accepted += 1;
    if (status === 'rejected') entry.rejected += 1;
    typeCounts.set(type, entry);
  }
  vendors.byType = [...typeCounts.values()].sort((a, b) => b.total - a.total);

  const xvfcRow = (Array.isArray(xvfcRows) ? xvfcRows : []).find((row) => Number(row.bpCode) === gp.code);
  if (!xvfcRow) throw new Error(`no XVFC ledger row for ${gp.code}`);
  const xvfc = {
    schemeName: xvfcRow.schemeName || 'XV Finance Commission',
    opening: round2(num(xvfcRow.totOb)),
    receipts: round2(num(xvfcRow.totReceiptDirect) + num(xvfcRow.totReceiptAuto)),
    payments: round2(num(xvfcRow.totPaymentAmount)),
    closing: round2(num(xvfcRow.untiedUb) + num(xvfcRow.tiedUb)),
    untied: {
      opening: round2(num(xvfcRow.untiedOb)),
      receipts: round2(num(xvfcRow.untiedReceiptDirect) + num(xvfcRow.untiedReceiptAuto)),
      payments: round2(num(xvfcRow.untiedPaymentAmount)),
      closing: round2(num(xvfcRow.untiedUb)),
    },
    tied: {
      opening: round2(num(xvfcRow.tiedOb)),
      receipts: round2(num(xvfcRow.tiedReceiptDirect) + num(xvfcRow.tiedReceiptAuto)),
      payments: round2(num(xvfcRow.tiedPaymentAmount)),
      closing: round2(num(xvfcRow.tiedUb)),
    },
  };

  const schemeRows = [];
  let months = emptyMonths();
  let monthlyXVFC = null;
  for (const scheme of schemes) {
    const monthlyUrl = `${BASE}/getSchemeWiseMonthly.do?finYear=${YEAR}&stateCode=${STATE.code}&schemeCode=${scheme.schemeid}&fromDate=${FROM}&toDate=${TO}&localBodyCode=${gp.code}`;
    let monthlyRaw;
    try {
      monthlyRaw = await fetchText(monthlyUrl, { json: true, referer: `${BASE}/schemeWiseExpenditureReport.do` });
    } catch (error) {
      console.warn(`    skip scheme ${scheme.schemeid}: ${error.message}`);
      continue;
    }
    let rows;
    try {
      rows = JSON.parse(monthlyRaw.text);
    } catch {
      continue;
    }
    if (!Array.isArray(rows) || rows.length !== 12) continue;
    const schemeMonths = monthsFrom(rows);
    const receipts = round2(schemeMonths.reduce((sum, row) => sum + row.receipts, 0));
    const payments = round2(schemeMonths.reduce((sum, row) => sum + row.payments, 0));
    if (receipts === 0 && payments === 0) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      continue;
    }
    const source = addSource(
      `monthly-${gp.code}-${scheme.schemeid}`,
      `Monthly receipts and payments, ${scheme.schemename}, ${gp.name}`,
      monthlyUrl,
      monthlyRaw.text,
    );
    schemeRows.push({
      code: scheme.schemeid,
      name: scheme.schemename,
      abbr: scheme.schemename_abbreviation || '',
      receipts,
      payments,
      net: round2(receipts - payments),
      opening: scheme.schemeid === XVFC ? xvfc.opening : null,
      closing: scheme.schemeid === XVFC ? xvfc.closing : null,
      months: schemeMonths,
      sourceId: source.id,
    });
    months = sumMonths(months, schemeMonths);
    if (scheme.schemeid === XVFC) monthlyXVFC = { receipts, payments };
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  schemeRows.sort((a, b) => (b.receipts + b.payments) - (a.receipts + a.payments));
  const receipts = round2(schemeRows.reduce((sum, row) => sum + row.receipts, 0));
  const payments = round2(schemeRows.reduce((sum, row) => sum + row.payments, 0));
  const computedClosing = round2(xvfc.opening + xvfc.receipts - xvfc.payments);

  const worksUrl = `${BASE}/physicalprogressReport.do?statecd=${STATE.code}&fyear=${YEAR}&gpcd=${gp.code}&wrkstts=176`;
  let works = [];
  let worksSource = 'unavailable';
  let worksNote = 'No completed-work rows could be retrieved at capture time.';
  let workSourceIds = [];
  try {
    const worksRaw = await fetchText(worksUrl, { referer: `${BASE}/ongoingActivityReport.do` });
    if (!worksRaw.text.includes('Activity Code')) throw new Error('the work report answered without a table');
    works = parseWorksReport(worksRaw.text);
    worksSource = 'work-report';
    worksNote = 'Completed works as reported in the eGramSwaraj physical progress report (wrkstts=176).';
    workSourceIds = [addSource(`works-${gp.code}`, `Completed works, ${gp.name}`, worksUrl, worksRaw.text).id];
  } catch (error) {
    console.warn(`    work report refused: ${error.message}; using the plan API`);
    try {
      const fallback = await fallbackWorks(gp.code);
      works = fallback.works;
      workSourceIds = fallback.sourceIds;
      worksSource = 'plan-api';
      worksNote = 'The completed-work report did not answer at capture time. These rows are status-176 (completed) plan activities; completion dates come from physical-progress rows where published, and the plan API does not state the funding scheme.';
    } catch (fallbackError) {
      console.warn(`    plan API also failed: ${fallbackError.message}`);
    }
  }

  gps.push({
    code: gp.code,
    name: gp.name,
    nameHi: gp.nameHi,
    profile,
    profileUrl,
    sourceIds: {
      profile: profileSource.id,
      works: workSourceIds,
      vendors: vendorSource.id,
      xvfc: xvfcSource.id,
      monthly: schemeRows.map((row) => row.sourceId),
      schemes: schemesSource.id,
    },
    worksSource,
    worksNote,
    worksUrl: workSourceIds[0] ? sources.find((source) => source.id === workSourceIds[0]).url : worksUrl,
    finance: {
      year: YEAR,
      xvfc,
      schemes: schemeRows,
      months,
      totals: {
        receipts,
        payments,
        net: round2(receipts - payments),
        schemeCount: schemeRows.length,
        openingXVFC: xvfc.opening,
        closingXVFC: xvfc.closing,
      },
      reconciliation: {
        closingComputed: computedClosing,
        closingReported: xvfc.closing,
        closingDelta: round2(xvfc.closing - computedClosing),
        monthlyXVFCReceipts: monthlyXVFC ? monthlyXVFC.receipts : null,
        monthlyXVFCPayments: monthlyXVFC ? monthlyXVFC.payments : null,
        receiptDelta: monthlyXVFC ? round2(monthlyXVFC.receipts - xvfc.receipts) : null,
        paymentDelta: monthlyXVFC ? round2(monthlyXVFC.payments - xvfc.payments) : null,
      },
    },
    works,
    worksSummary: summariseWorks(works),
    vendors,
  });
}

const dataHash = `sha256:${sha256(JSON.stringify(gps))}`;
const finishedAt = isoNow();
const caveats = [
  `Official eGramSwaraj data captured on ${finishedAt.slice(0, 10)}. A Gram Panchayat or the state can revise an entry after capture; the source links and hashes are the record of what was read.`,
  'Receipts and payments are scheme-wise cash flows for 2025-26. A payment can settle a bill from an earlier year, so it is not the cost of this year\u2019s works.',
  'Opening and closing balances are published in this report only for XV Finance Commission funds. Other schemes show the year\u2019s receipts and payments, not a balance.',
  'Completed rows are as reported by the Gram Panchayat or its plan record. The passbook does not verify a work or activity on the ground, its quality, or its geotag.',
  'Vendor counts are registration records on the GP profile, not payments to those vendors. No vendor names, mobile numbers or email addresses are published.',
  'Where the completed-work report was unavailable, rows come from the public plan API, which does not name the funding scheme.',
];
if (gps.some((gp) => gp.worksSource === 'plan-api')) {
  caveats.push('At least one GP\u2019s completed-work report was unavailable at capture time; those rows are marked in the table.');
}
if (gps.some((gp) => gp.finance.reconciliation.closingDelta !== 0)) {
  caveats.push('An XVFC closing balance does not reconcile exactly with opening plus receipts minus payments; the difference is printed in the ledger.');
}

const payload = {
  version: 'passbook-pilot-1',
  generatedAt: finishedAt,
  year: YEAR,
  planYear: PLAN_YEAR,
  window: { from: '2025-04-01', to: '2026-03-31' },
  state: STATE,
  district: DISTRICT,
  block: BLOCK,
  gps,
  sources: sources.sort((a, b) => a.id.localeCompare(b.id)),
  caveats,
  dataHash,
  collection: { startedAt, finishedAt, requests, rawFiles: rawFiles.size },
};

writeFileSync(OUT, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`\nWrote ${OUT}`);
console.log(`${gps.length} GPs, ${gps.reduce((n, gp) => n + gp.works.length, 0)} works, ${sources.length} sources, ${requests} requests`);
for (const gp of gps) {
  console.log(`  ${gp.name}: ₹${gp.finance.totals.receipts.toLocaleString('en-IN')} received, ₹${gp.finance.totals.payments.toLocaleString('en-IN')} paid, ${gp.works.length} works (${gp.worksSource}), XVFC closes at ₹${gp.finance.xvfc.closing.toLocaleString('en-IN')}`);
}
