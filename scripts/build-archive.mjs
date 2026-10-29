// Build the public archive index.
//
// The archive is not the Prahari library with a different skin. It is a
// government-wide record: regulator instruments, statutes, policy documents,
// official releases and programme pages. Each source keeps its own issuer,
// reference, date and link; the index only joins them.
//
// Run: node scripts/build-archive.mjs

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { SCHEMES } from '../src/data/schemes.js';
import { parseAmendmentLedger, parseAmendingAct } from '../src/lib/legal/ledger.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const SOURCES = {
  rbi: { name: 'Reserve Bank of India', short: 'RBI', kind: 'Central bank' },
  parliament: { name: 'Parliament of India', short: 'Parliament', kind: 'Legislature' },
  meity: {
    name: 'Ministry of Electronics and Information Technology',
    short: 'MeitY',
    kind: 'Ministry',
  },
  niti: { name: 'NITI Aayog', short: 'NITI Aayog', kind: 'Policy commission' },
  pib: { name: 'Press Information Bureau', short: 'PIB', kind: 'Government media' },
  mord: { name: 'Ministry of Rural Development', short: 'Rural Development', kind: 'Ministry' },
  jalshakti: { name: 'Ministry of Jal Shakti', short: 'Jal Shakti', kind: 'Ministry' },
  agri: {
    name: 'Ministry of Agriculture and Farmers Welfare',
    short: 'Agriculture',
    kind: 'Ministry',
  },
  health: {
    name: 'Ministry of Health and Family Welfare',
    short: 'Health',
    kind: 'Ministry',
  },
  housing: {
    name: 'Ministry of Housing and Urban Affairs',
    short: 'Housing & Urban Affairs',
    kind: 'Ministry',
  },
  petroleum: {
    name: 'Ministry of Petroleum and Natural Gas',
    short: 'Petroleum',
    kind: 'Ministry',
  },
  msme: {
    name: 'Ministry of Micro, Small and Medium Enterprises',
    short: 'MSME',
    kind: 'Ministry',
  },
  finance: { name: 'Ministry of Finance', short: 'Finance', kind: 'Ministry' },
  labour: { name: 'Ministry of Labour and Employment', short: 'Labour', kind: 'Ministry' },
  education: { name: 'Ministry of Education', short: 'Education', kind: 'Ministry' },
  power: { name: 'Ministry of Power', short: 'Power', kind: 'Ministry' },
};

const KINDS = {
  instrument: 'Regulatory instrument',
  statute: 'Act of Parliament',
  rules: 'Rules',
  notification: 'Notification',
  guideline: 'Guideline',
  policy: 'Policy',
  strategy: 'Strategy',
  release: 'Official release',
  scheme: 'Central scheme',
};

const COVERAGE = {
  'full-text': 'Full text',
  excerpt: 'Selected text',
  summary: 'Summary',
  'programme-page': 'Programme page',
};

// The scheme portal is a ministry page, not a document. The source map keeps
// the issuer and the link aligned even where two schemes share a ministry.
const SCHEME_SOURCE = {
  mgnrega: 'mord',
  pmayg: 'mord',
  jjm: 'jalshakti',
  pmkisan: 'agri',
  pmjay: 'health',
  pmuy: 'petroleum',
  svanidhi: 'housing',
  vishwakarma: 'msme',
  ssy: 'finance',
  eshram: 'labour',
  nsp: 'education',
  poshan: 'education',
  saubhagya: 'power',
};

const records = [];

// 1. RBI instruments: the full text stays in the monitor chunks, and the
// archive index carries the same hash. One regulator is not the frame; it is
// one source in the register below.
const monitor = readJson('src/data/monitor/index.json');
for (const entry of monitor.instruments) {
  records.push({
    id: String(entry.id),
    source: 'rbi',
    issuer: SOURCES.rbi.name,
    issuerShort: SOURCES.rbi.short,
    kind: 'instrument',
    kindLabel: KINDS.instrument,
    title: entry.title,
    shortTitle: '',
    refNo: entry.refNo,
    date: entry.date,
    dateISO: entry.dateISO,
    datePrecision: 'day',
    sourceUrl: '',
    summary: '',
    coverage: 'full-text',
    coverageLabel: COVERAGE['full-text'],
    hash: entry.hash,
    words: entry.words,
    duties: entry.duties,
    family: entry.family,
    status: 'Regulator instrument. Not a legal consolidation.',
    note: 'The instrument as published by the Reserve Bank, pinned for this library. It does not claim the instrument is still in force.',
    follows: [],
    file: entry.file,
    doc: null,
  });
}

// 2. Pinned government documents. Each doc file is a source snapshot with the
// text, the URL, the retrieval date and its own hash. Adding a department is a
// doc file, not a change to the page.
const docsDir = join(root, 'src/data/archive/docs');
const docFiles = readdirSync(docsDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

for (const name of docFiles) {
  const doc = readJson(`src/data/archive/docs/${name}`);
  const source = SOURCES[doc.source];
  if (!source) throw new Error(`${doc.id}: unknown source ${doc.source}`);
  if (!KINDS[doc.kind]) throw new Error(`${doc.id}: unknown kind ${doc.kind}`);
  if (!COVERAGE[doc.coverage]) throw new Error(`${doc.id}: unknown coverage ${doc.coverage}`);
  records.push({
    id: doc.id,
    source: doc.source,
    issuer: doc.issuer || source.name,
    issuerShort: source.short,
    kind: doc.kind,
    kindLabel: KINDS[doc.kind],
    title: doc.title,
    shortTitle: doc.shortTitle || '',
    refNo: doc.refNo || '',
    date: doc.date || '',
    dateISO: doc.dateISO || null,
    datePrecision: doc.datePrecision || 'day',
    sourceUrl: doc.sourceUrl || '',
    summary: doc.summary || '',
    coverage: doc.coverage,
    coverageLabel: COVERAGE[doc.coverage],
    hash: doc.hash || '',
    words: Number(doc.words) || 0,
    duties: null,
    family: null,
    status: doc.status || '',
    note: doc.note || '',
    follows: doc.follows || [],
    // A statute that amends another names it here. The count is the number of
    // patches the consolidated text prints for itself: a footnote per patch.
    amends: doc.amends || null,
    // An earlier text of the same statute names the record it is a version
    // of. The build groups the two so a reader can open either one.
    versionOf: doc.versionOf || null,
    // The date of the text, which is not the date of the instrument: a 2005
    // Act consolidated to 2025 carries both.
    asOf: doc.asOf || doc.dateISO || null,
    amendmentRows: parseAmendmentLedger(doc.text || '').rows.length,
    // The section map of an amending Act is three or four rows, so it can sit
    // in the index and let a ledger row name the section it changed without
    // loading every amending text.
    patches: doc.amends
      ? parseAmendingAct(doc.text || '').map(({ section, target, heading }) => ({ section, target, heading }))
      : [],
    file: null,
    doc: `docs/${name}`,
  });
}

// 3. Central schemes. These are programme pages, not legal texts: the record
// says so, and the page links to the ministry's own portal. Where the archive
// also holds the scheme's framework, the page record says so and points to it
// as a separate record rather than claiming the full text is absent.
const FULL_TEXT_BY_SCHEME = { pmayg: true };
for (const scheme of SCHEMES) {
  const sourceId = SCHEME_SOURCE[scheme.id];
  const source = SOURCES[sourceId];
  if (!source) throw new Error(`scheme ${scheme.id}: unknown source ${sourceId}`);
  records.push({
    id: `scheme-${scheme.id}`,
    source: sourceId,
    issuer: scheme.ministry,
    issuerShort: source.short,
    kind: 'scheme',
    kindLabel: KINDS.scheme,
    title: scheme.full,
    shortTitle: scheme.name,
    refNo: '',
    date: '',
    dateISO: null,
    datePrecision: null,
    sourceUrl: scheme.portal,
    summary: scheme.what,
    coverage: 'programme-page',
    coverageLabel: COVERAGE['programme-page'],
    hash: '',
    words: 0,
    duties: null,
    family: null,
    status: 'Official programme page. Not a legal instrument.',
    note: FULL_TEXT_BY_SCHEME[scheme.id]
      ? 'The archive indexes the programme page; the full scheme framework is held as a separate record.'
      : 'The archive indexes the programme page. It does not hold the scheme guidelines or the legal text.',
    follows: [],
    file: null,
    doc: null,
  });
}

// A stable order: dated records newest first, then the undated programme pages
// by issuer and title. The page can still sort or filter within this.
records.sort((a, b) => {
  if (a.dateISO && b.dateISO) {
    return b.dateISO.localeCompare(a.dateISO) || a.title.localeCompare(b.title);
  }
  if (a.dateISO) return -1;
  if (b.dateISO) return 1;
  return a.issuer.localeCompare(b.issuer) || a.title.localeCompare(b.title);
});

const ids = new Set();
for (const record of records) {
  if (ids.has(record.id)) throw new Error(`duplicate archive id: ${record.id}`);
  ids.add(record.id);
  if (!SOURCES[record.source]) throw new Error(`${record.id}: unknown source`);
  if (!record.title || !record.issuer) throw new Error(`${record.id}: missing title or issuer`);
  if (record.doc && !existsSync(join(root, 'src/data/archive', record.doc))) {
    throw new Error(`${record.id}: missing doc ${record.doc}`);
  }
  if (record.doc) {
    const doc = readJson(`src/data/archive/${record.doc}`);
    if (doc.hash && doc.hash !== record.hash) {
      throw new Error(`${record.id}: doc hash does not match the index`);
    }
  }
}

// A doc names the records it follows; the other direction is derived, so the
// two edges can never disagree. A follow that points nowhere is a broken
// chain, not a missing field, so the build refuses it.
const byId = new Map(records.map((record) => [record.id, record]));
for (const record of records) {
  for (const id of record.follows) {
    if (id === record.id) throw new Error(`${record.id}: follows itself`);
    if (!byId.has(id)) throw new Error(`${record.id}: follows an unknown record ${id}`);
  }
}
for (const record of records) {
  record.followedBy = records
    .filter((other) => other.follows.includes(record.id))
    .map((other) => other.id);
}

// An amending Act points at the Act it changes. The edge is checked in both
// directions: a missing principal or a self-amendment fails the build, and the
// principal derives the list of instruments that amended it.
for (const record of records) {
  if (!record.amends) continue;
  if (record.amends === record.id) throw new Error(`${record.id}: amends itself`);
  const target = byId.get(record.amends);
  if (!target) throw new Error(`${record.id}: amends an unknown record ${record.amends}`);
  if (target.kind !== 'statute') throw new Error(`${record.id}: amends ${record.amends}, which is not a statute`);
}
for (const record of records) {
  record.amendedBy = records.filter((other) => other.amends === record.id).map((other) => other.id);
}

// Versions of one statute: the canonical record plus every earlier text that
// names it. A version must point at a statute, must not be the record itself,
// and must predate the text it is a version of — otherwise the group is a
// cycle or a fiction and the build refuses it.
for (const record of records) {
  if (!record.versionOf) continue;
  if (record.versionOf === record.id) throw new Error(`${record.id}: is a version of itself`);
  const target = byId.get(record.versionOf);
  if (!target) throw new Error(`${record.id}: version of an unknown record ${record.versionOf}`);
  if (target.kind !== 'statute') throw new Error(`${record.id}: version of ${record.versionOf}, which is not a statute`);
  if (!record.asOf || !target.asOf) throw new Error(`${record.id}: a version needs a text date, and so does its principal`);
  if (record.asOf >= target.asOf) {
    throw new Error(`${record.id}: its text is dated on or after the text it is a version of`);
  }
}
// Every member of a version group carries the whole group, so the older text
// can name the newer one and the newer can name the older.
const versionGroups = new Map();
for (const record of records) {
  const key = record.versionOf || record.id;
  if (!versionGroups.has(key)) versionGroups.set(key, []);
  versionGroups.get(key).push(record);
}
for (const record of records) {
  const members = versionGroups
    .get(record.versionOf || record.id)
    .slice()
    .sort((a, b) => String(a.asOf).localeCompare(String(b.asOf)));
  record.versions = members.length > 1
    ? members.map((entry) => ({
        id: entry.id,
        date: entry.date,
        asOf: entry.asOf,
        label: entry.shortTitle || entry.title,
        hash: entry.hash,
        words: entry.words,
      }))
    : [];
}

const sourceCounts = Object.entries(SOURCES)
  .map(([id, source]) => ({
    id,
    ...source,
    count: records.filter((record) => record.source === id).length,
  }))
  .filter((source) => source.count > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const kindCounts = Object.entries(KINDS)
  .map(([id, label]) => ({
    id,
    label,
    count: records.filter((record) => record.kind === id).length,
  }))
  .filter((kind) => kind.count > 0)
  .sort((a, b) => a.label.localeCompare(b.label));

const index = {
  generatedAt: new Date().toISOString(),
  archiveVersion: 1,
  monitorGeneratedAt: monitor.generatedAt,
  monitorCorpusHash: monitor.corpusHash,
  counts: {
    records: records.length,
    sources: sourceCounts.length,
    fullText: records.filter((record) => record.coverage === 'full-text').length,
    excerpt: records.filter((record) => record.coverage === 'excerpt').length,
    summary: records.filter((record) => record.coverage === 'summary').length,
    programmePage: records.filter((record) => record.coverage === 'programme-page').length,
    linked: records.filter((record) => record.follows.length || record.followedBy.length).length,
  },
  sources: sourceCounts,
  kinds: kindCounts,
  records,
};

writeFileSync(
  join(root, 'src/data/archive/index.json'),
  `${JSON.stringify(index, null, 2)}\n`,
);

console.log(
  `archive: ${index.counts.records} records, ${index.counts.sources} issuers, ` +
    `${index.counts.fullText} full text, ${index.counts.excerpt} selected, ` +
    `${index.counts.summary} summary, ${index.counts.programmePage} programme pages, ` +
    `${index.counts.linked} in a lineage`,
);
