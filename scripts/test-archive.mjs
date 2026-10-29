// Verification for the public archive: it is wider than the RBI library, every
// record names its issuer and coverage, the pinned docs match their hashes,
// and search works across issuer, summary and text.
// Run: node scripts/test-archive.mjs

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  archiveCitation,
  archiveDocMatches,
  archiveFileName,
  archiveRecord,
  archiveRecordJson,
  searchArchive,
  sortArchive,
} from '../src/lib/archive.js';
import { ledgerHistory, parseAmendmentLedger, parseAmendingAct } from '../src/lib/legal/ledger.js';
import { checkoutSections, sectionOf } from '../src/lib/legal/versions.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const sha256 = (text) => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

const ARCHIVE = readJson('src/data/archive/index.json');
const MONITOR = readJson('src/data/monitor/index.json');

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

// 1. The archive is a government-wide register, not the RBI library.
{
  const sources = new Set(ARCHIVE.records.map((record) => record.source));
  const nonRbi = ARCHIVE.records.filter((record) => record.source !== 'rbi');
  ok('the archive has records', ARCHIVE.records.length === ARCHIVE.counts.records && ARCHIVE.records.length > 50);
  ok('the record ids are unique', new Set(ARCHIVE.records.map((record) => record.id)).size === ARCHIVE.records.length);
  ok('the archive names more than one issuer', sources.size === ARCHIVE.counts.sources && sources.size >= 10, String(sources.size));
  ok('the RBI is one issuer, not the frame', nonRbi.length >= 15, String(nonRbi.length));
  ok('every record names its issuer and type', ARCHIVE.records.every((record) => record.issuer && record.kindLabel));
  ok('every record names its coverage', ARCHIVE.records.every((record) => record.coverage && record.coverageLabel));
  ok('every record source is in the register',
    ARCHIVE.records.every((record) => ARCHIVE.sources.some((source) => source.id === record.source)));
  ok('every record kind is in the register',
    ARCHIVE.records.every((record) => ARCHIVE.kinds.some((kind) => kind.id === record.kind)));
  ok('every source count is the number of its records',
    ARCHIVE.sources.every((source) =>
      source.count === ARCHIVE.records.filter((record) => record.source === source.id).length));
  ok('the archive includes Parliament, MeitY, NITI Aayog and PIB',
    ['parliament', 'meity', 'niti', 'pib'].every((id) => sources.has(id)));
  ok('the archive includes programme pages outside the RBI',
    ARCHIVE.records.filter((record) => record.kind === 'scheme').length >= 10);
  ok('a numeric monitor chunk resolves through a string archive ref',
    archiveDocMatches({ id: 13742 }, '13742') &&
      !archiveDocMatches({ id: 13742 }, '13715'));
}

// 2. Pinned documents carry the text their hash covers, and a source link.
{
  const docs = ARCHIVE.records.filter((record) => record.doc);
  ok('the archive holds non-RBI documents', docs.length >= 12, String(docs.length));
  ok('every document has a source link', docs.every((record) => record.sourceUrl));
  ok('every document has a retrieval date',
    docs.every((record) => readJson(`src/data/archive/${record.doc}`).retrieved));
  const hashed = docs.filter((record) => record.hash);
  ok('the hashed documents carry a hash', hashed.length >= 5, String(hashed.length));
  ok('every hashed document matches its pinned text',
    hashed.every((record) => {
      const doc = readJson(`src/data/archive/${record.doc}`);
      return sha256(doc.text) === record.hash && doc.hash === record.hash;
    }));
  ok('the hashed documents carry real text',
    hashed.every((record) => record.words > 100 && readJson(`src/data/archive/${record.doc}`).text.length > 1000));
}

// 2b. The archive is no longer a data/AI shelf: health, labour and rural
//     development each carry a full text from their own department.
{
  const expected = {
    'in-nhp-2017': ['health', 'Ministry of Health and Family Welfare', 'National Health Policy'],
    'in-code-on-wages-2019': ['labour', 'Ministry of Labour and Employment', 'Code on Wages'],
    'in-pmayg-2022': ['mord', 'Ministry of Rural Development', 'Pradhan Mantri Awaas Yojana'],
  };
  for (const [id, [source, issuer, phrase]] of Object.entries(expected)) {
    const record = ARCHIVE.records.find((entry) => entry.id === id);
    const doc = record?.doc ? readJson(`src/data/archive/${record.doc}`) : null;
    ok(`${id} is a full text from ${issuer}`,
      record?.source === source && record?.issuer === issuer &&
        record?.coverage === 'full-text' && doc?.text.includes(phrase), record?.issuer);
  }
  ok('the archive now spans health, labour and rural development in full text',
    ['health', 'labour', 'mord'].every((source) =>
      ARCHIVE.records.some((record) => record.source === source && record.coverage === 'full-text')));
}

// 2c. The historical spine: the origin texts behind instruments already in
//     the register, including the statute behind the MGNREGA programme page and
//     the four wage laws the Code on Wages repealed.
{
  const spine = {
    // The phrases are matched without case: the older acts print their titles
    // in capitals, and the Gazette scan's running heads are OCR artefacts.
    'in-mgnrega-act-2005': ['parliament', '2005-09-07', 'one hundred days'],
    'in-payment-of-wages-act-1936': ['parliament', '1936-04-23', 'the payment of wages act'],
    'in-minimum-wages-act-1948': ['parliament', '1948-03-15', 'the minimum wages act'],
    'in-payment-of-bonus-act-1965': ['parliament', '1965-09-25', 'the payment of bonus act'],
    'in-equal-remuneration-act-1976': ['parliament', '1976-02-11', 'the equal remuneration act'],
    'in-nhp-2002': ['health', '2002-01-01', 'national health policy'],
    'in-nsai-2018': ['niti', '2018-06-01', 'national strategy for artificial intelligence'],
  };
  for (const [id, [source, dateISO, phrase]] of Object.entries(spine)) {
    const record = ARCHIVE.records.find((entry) => entry.id === id);
    const doc = record?.doc ? readJson(`src/data/archive/${record.doc}`) : null;
    ok(`${id} is a pinned spine record`,
      record?.source === source && record?.dateISO === dateISO &&
        record?.coverage === 'full-text' &&
        String(doc?.text || '').toLowerCase().includes(phrase.toLowerCase()) &&
        sha256(doc.text) === record.hash, record?.dateISO);
  }
  ok('the archive reaches back before 1950',
    ARCHIVE.records.filter((record) => record.dateISO && record.dateISO < '1950-01-01').length >= 2);
  ok('the MGNREGA record names the Act that replaced it',
    /Viksit Bharat/.test(ARCHIVE.records.find((record) => record.id === 'in-mgnrega-act-2005')?.status || ''));
  const repealed = ARCHIVE.records.filter((record) => /Repealed by the Code on Wages/.test(record.status || ''));
  ok('the four repealed wage laws each say they were repealed', repealed.length === 4, String(repealed.length));
  ok('the equal remuneration text is marked as a reproduction, not an official copy',
    /reproduction, not an official publication/.test(
      ARCHIVE.records.find((record) => record.id === 'in-equal-remuneration-act-1976')?.note || ''));
}

// 2d. The chains are complete in both directions, and every full text is a
//     copy held in this repository. The archive is a preservation surface: a
//     record that only points at a government URL has nothing to preserve.
{
  const byId = new Map(ARCHIVE.records.map((record) => [record.id, record]));
  const follows = (id) => byId.get(id)?.follows || [];
  const followedBy = (id) => byId.get(id)?.followedBy || [];

  const wageCode = 'in-code-on-wages-2019';
  const wageActs = [
    'in-payment-of-wages-act-1936',
    'in-minimum-wages-act-1948',
    'in-payment-of-bonus-act-1965',
    'in-equal-remuneration-act-1976',
  ];
  ok('the Code on Wages follows the four laws it consolidated',
    wageActs.every((id) => follows(wageCode).includes(id)), follows(wageCode).join(','));
  ok('each repealed wage law is followed by the Code on Wages',
    wageActs.every((id) => followedBy(id).includes(wageCode)));

  ok('the health policy follows its 2002 predecessor',
    follows('in-nhp-2017').includes('in-nhp-2002') &&
      followedBy('in-nhp-2002').includes('in-nhp-2017'));
  ok('the AI chain runs 2018 strategy to 2021 approach to 2025 guidelines',
    follows('in-niti-rai-2021').includes('in-nsai-2018') &&
      follows('in-ai-guidelines-2025').includes('in-niti-rai-2021') &&
      followedBy('in-nsai-2018').includes('in-niti-rai-2021'));

  ok('the MGNREGA chain runs from the 2005 Act to the Act that replaced it',
    follows('in-vbg-ramg-act-2025').includes('in-mgnrega-act-2005') &&
      followedBy('in-mgnrega-act-2005').includes('in-vbg-ramg-act-2025'));
  ok('the commencement notification hangs off the Act it commences',
    follows('in-vbg-ramg-commencement-2026').includes('in-vbg-ramg-act-2025'));
  ok('the repeal date in the 2005 record is backed by a held notification',
    /1 July 2026/.test(byId.get('in-mgnrega-act-2005')?.status || '') &&
      /1 July 2026/.test(byId.get('in-vbg-ramg-commencement-2026')?.status || ''));

  ok('every lineage edge resolves to a record in the register',
    ARCHIVE.records.every((record) => (record.follows || []).every((id) => byId.has(id))));
  ok('every lineage edge is mirrored in both directions',
    ARCHIVE.records.every((record) =>
      (record.follows || []).every((id) => followedBy(id).includes(record.id)) &&
        (record.followedBy || []).every((id) => follows(id).includes(record.id))));

  const fullText = ARCHIVE.records.filter((record) => record.coverage === 'full-text');
  ok('every full text carries a hash of the stored copy',
    fullText.every((record) => record.hash), fullText.filter((record) => !record.hash).map((r) => r.id).join(','));
  ok('every full text is stored in this repository, not fetched at read time',
    fullText.every((record) => record.doc || record.file));
  ok('the spine is held even where the official copies are gone',
    ['in-mgnrega-act-2005', 'in-equal-remuneration-act-1976'].every((id) => {
      const record = byId.get(id);
      const doc = record?.doc ? readJson(`src/data/archive/${record.doc}`) : null;
      return doc?.text && sha256(doc.text) === record.hash;
    }));
}

// 2e. The amendment ledger: every footnote a consolidated statute prints is
//     one patch, the amending Act says which section it reached, and a row
//     that cannot be read says so instead of disappearing.
{
  const ledgerOf = (id) => {
    const record = ARCHIVE.records.find((entry) => entry.id === id);
    const doc = record?.doc ? readJson(`src/data/archive/${record.doc}`) : null;
    return parseAmendmentLedger(doc?.text || '');
  };

  const rti = ledgerOf('in-rti-act-2005');
  ok('the RTI Act carries its printed amendment history', rti.rows.length === 15, String(rti.rows.length));
  ok('every printed footnote becomes a row', rti.footnotes === rti.rows.length && rti.partial === 0);
  ok('the ledger reads the amending Act and its section',
    rti.rows.some((row) => row.instrument === 'Act 24 of 2019' && row.amendingSection === '2'));
  ok('the ledger quotes the words a patch replaced',
    rti.rows.some((row) => /for a term of five years/.test(row.oldText || '')));
  ok('the ledger resolves a printed commencement date',
    rti.rows.filter((row) => row.effective === '2019-10-24').length === 5);

  const amending = ARCHIVE.records.find((entry) => entry.id === 'in-rti-amendment-act-2019');
  const amendingDoc = readJson(`src/data/archive/${amending.doc}`);
  ok('the amending Act is pinned as its own record',
    amending.refNo === 'Act No. 24 of 2019' && sha256(amendingDoc.text) === amending.hash);
  const patches = parseAmendingAct(amendingDoc.text);
  ok('the amending Act names the sections it reaches',
    patches.length === 3 && patches.map((patch) => patch.target).join(',') === '13,16,27',
    patches.map((patch) => `${patch.section}->${patch.target}`).join(','));
  ok('the index carries the section map for the page',
    (amending.patches || []).map((patch) => patch.target).join(',') === '13,16,27');

  const history = ledgerHistory(rti, patches);
  const targeted = history.filter((row) => row.target);
  ok('a ledger row names the section of this Act it changed',
    targeted.length === 5 && targeted.every((row) => [13, 16, 27].includes(row.target)),
    targeted.map((row) => row.target).join(','));
  ok('a patch from another Act is not given a target it does not have',
    history.filter((row) => row.instrument === 'Act 22 of 2023').every((row) => row.target === null));

  const principal = ARCHIVE.records.find((entry) => entry.id === 'in-rti-act-2005');
  ok('the principal Act lists the Act that amended it',
    (principal.amendedBy || []).includes('in-rti-amendment-act-2019'));

  // The other three print their footnotes in blocks at the foot of a page with
  // the reference marks stripped, so a footnote's position says nothing about
  // the section it amends. The ledger holds the history and claims no target;
  // the regression below is the case that proved it.
  for (const id of ['in-payment-of-wages-act-1936', 'in-payment-of-bonus-act-1965', 'in-minimum-wages-act-1948']) {
    const ledger = ledgerOf(id);
    ok(`${id} keeps every printed footnote as a row`,
      ledger.footnotes === ledger.rows.length && ledger.rows.length === ARCHIVE.records.find((entry) => entry.id === id).amendmentRows,
      `${ledger.footnotes}/${ledger.rows.length}`);
    ok(`${id} claims no section it cannot prove`,
      ledgerHistory(ledger, []).every((row) => row.target === null));
  }

  // Note 7 of the Payment of Wages print sits under section 5 and belongs to a
  // Kerala amendment of section 6. Reading the target off the page would put a
  // 2017 proviso on the wrong section, so the row keeps its printed reference
  // and no target.
  {
    const wages = ledgerOf('in-payment-of-wages-act-1936');
    const row = wages.rows.find((entry) => /Act 1 of 2017/.test(entry.raw));
    ok('a footnote that names another section is not pinned to the one above it',
      Boolean(row) && /section 6/.test(row.oldReference || '') && row.printedSection === undefined,
      row?.oldReference || 'row not found');
  }

  // Shapes the parser has to survive: an adaptation order, a gazette
  // notification, and "ibid." pointing at the instrument above it.
  const sample = parseAmendmentLedger(
    ['1. Subs. by Act 24 of 2019, s. 2, for "five years" (w.e.f. 24-10-2019).',
      '2. Ins. by s. 4, ibid. (w.e.f. 24-10-2019).',
      '3. Subs. by the A.O. 1950, for "the Crown".',
      '4. Subs. by notification No. G.S.R. 319(E), dated 4-5-2021.'].join('\n'),
  );
  ok('ibid. takes the instrument from the row above',
    sample.rows[1].instrument === 'Act 24 of 2019' && sample.rows[1].resolved === 'ibid');
  ok('an adaptation order is not read as an Act', sample.rows[2].instrumentKind === 'order');
  ok('a gazette notification keeps its number', /G\.S\.R\. 319\(E\)/.test(sample.rows[3].instrument || ''));
}

// 2f. Versions: two pinned texts of one Act, and a checkout that reads the
//     sections an amendment named in the state they were in before it.
{
  const principal = ARCHIVE.records.find((entry) => entry.id === 'in-rti-act-2005');
  const earlier = ARCHIVE.records.find((entry) => entry.id === 'in-rti-act-2005-2011');
  ok('the earlier text is a version of the RTI Act', earlier?.versionOf === 'in-rti-act-2005');
  ok('both records carry the same version group',
    principal?.versions?.length === 2 && earlier?.versions?.length === 2);
  ok('the group is ordered by the date of the text',
    principal.versions[0].id === 'in-rti-act-2005-2011' && principal.versions[1].asOf === '2025-11-18');
  ok('the earlier text predates the 2019 amendment',
    earlier.asOf < '2019-10-24' && !/such term as may be prescribed/.test(readJson(`src/data/archive/${earlier.doc}`).text));

  const now = readJson(`src/data/archive/${principal.doc}`).text;
  const old = readJson(`src/data/archive/${earlier.doc}`).text;
  const before = sectionOf(old, 13);
  const after = sectionOf(now, 13);
  ok('section 13 is readable in both texts', Boolean(before?.text) && Boolean(after?.text));
  // Both copies break lines mid-phrase, so the checks read the section as one
  // run of words rather than trusting where the PDF put its line ends.
  const run = (text) => String(text).replace(/\s+/g, ' ');
  ok('the section as it stood says five years', /for a term of five years/.test(run(before.text)));
  ok('the section as it stands leaves the term to rules',
    /such term as may be prescribed by the Central Government/.test(run(after.text)) &&
      !/for a term of five years/.test(run(after.text)));

  const rows = checkoutSections(old, now, [13, 16, 27]);
  ok('the checkout covers each section the ledger names',
    rows.length === 3 && rows.every((row) => row.before && row.after), String(rows.length));
  ok('the checkout reports how far apart the two texts are',
    rows.every((row) => row.similarity > 0 && row.similarity < 1));
  ok('a section the ledger does not name is not invented',
    !rows.some((row) => row.number === 8));
  ok('the 2011 copy is held as it reads, OCR included',
    /\(\/\)/.test(before.text) && /Govemment|tbr/.test(old));
}

// 3. Search crosses issuers and kinds.
{
  const records = ARCHIVE.records.map((record) => archiveRecord(record));
  const search = (query) => searchArchive(records, query).map((hit) => hit.record.meta);

  const rti = search('Right to Information');
  ok('search finds a statute by title', rti.some((record) => record.id === 'in-rti-act-2005'), rti.map((r) => r.id).join(','));

  const health = search('National Health Policy');
  ok('search finds the health policy', health.some((record) => record.id === 'in-nhp-2017'), health.map((r) => r.id).join(','));

  const wages = search('Code on Wages');
  ok('search finds the labour code', wages.some((record) => record.id === 'in-code-on-wages-2019'), wages.map((r) => r.id).join(','));

  const housing = search('PMAY-G');
  ok('search finds the rural housing framework', housing.some((record) => record.id === 'in-pmayg-2022'), housing.map((r) => r.id).join(','));

  const rural = search('Ministry of Rural Development');
  ok('search finds a programme by issuer', rural.some((record) => record.id === 'scheme-mgnrega'), rural.map((r) => r.id).join(','));
  ok('search finds more than one record from the same ministry',
    rural.filter((record) => record.source === 'mord').length >= 2);

  const pib = search('Press Information Bureau');
  ok('search finds a release by issuer', pib.some((record) => record.source === 'pib'), pib.map((r) => r.id).join(','));

  const uapa = search('UAPA 13742');
  ok('search crosses from the archive back into the RBI library',
    uapa.length === 1 && uapa[0].id === '13742', uapa.map((r) => r.id).join(','));

  ok('the search is an AND over terms',
    search('Right Information').length > 0 && search('Right nonexistentterm').length === 0);
  ok('a scheme without a doc still searches its summary',
    search('Jal Jeevan Mission').some((record) => record.id === 'scheme-jjm'));
}

// 4. Sort order: dated records first, newest first, undated programme pages
//    last. The archive is not an RBI chronology.
{
  const sorted = sortArchive(ARCHIVE.records).map((record) => record.meta || record);
  const firstUndated = sorted.findIndex((record) => !record.dateISO);
  const lastDated = sorted.findLastIndex((record) => record.dateISO);
  ok('dated records come before undated records', firstUndated > lastDated, `${firstUndated} / ${lastDated}`);
  const dated = sorted.filter((record) => record.dateISO);
  ok('dated records are newest first',
    dated.every((record, index) => index === 0 || dated[index - 1].dateISO >= record.dateISO));
  ok('the archive reaches back before the RBI snapshot',
    sorted.some((record) => record.dateISO < '2020-01-01'));
}

// 5. Citations name the issuer and say what part of the record is present.
{
  const rbi = ARCHIVE.records.find((record) => record.id === '13742');
  const chunk = readJson(`src/data/monitor/${rbi.file}`);
  const rbiCitation = archiveCitation({ ...rbi, sourceUrl: chunk.sourceUrl });
  ok('an RBI citation names the central bank, reference and hash',
    /Reserve Bank of India/.test(rbiCitation) && rbiCitation.includes(rbi.refNo) && rbiCitation.includes(rbi.hash), rbiCitation);
  ok('an RBI citation carries the source URL', rbiCitation.includes(chunk.sourceUrl));

  const scheme = ARCHIVE.records.find((record) => record.id === 'scheme-mgnrega');
  const schemeCitation = archiveCitation(scheme);
  ok('a programme citation names the ministry and says it is a programme page',
    /Ministry of Rural Development/.test(schemeCitation) && /Official programme page/.test(schemeCitation), schemeCitation);

  const summary = ARCHIVE.records.find((record) => record.id === 'pib-nsap-2026');
  const summaryCitation = archiveCitation(summary);
  ok('a summary citation says it is not the published text',
    /Summary in the archive, not the published text/.test(summaryCitation), summaryCitation);

  const noHash = archiveCitation({ ...scheme, hash: '' });
  ok('a citation without a hash does not claim pinned text', !/Pinned text/.test(noHash), noHash);
}

// 6. Downloads carry the record's own address, issuer and text.
{
  const rbi = ARCHIVE.records.find((record) => record.id === '13742');
  const chunk = readJson(`src/data/monitor/${rbi.file}`);
  const json = JSON.parse(archiveRecordJson(rbi, chunk, '2026-10-27T00:00:00.000Z'));
  ok('the download names the issuer and the kind', json.issuer === 'Reserve Bank of India' && json.kind === 'instrument');
  ok('the download carries the text and the hash',
    json.record.hash === rbi.hash && json.record.text === chunk.text && json.retrieved === '2026-10-27T00:00:00.000Z');
  ok('the download links back to the string id', json.archiveUrl === '#/archive/13742', json.archiveUrl);

  const scheme = ARCHIVE.records.find((record) => record.id === 'scheme-mgnrega');
  const schemeJson = JSON.parse(archiveRecordJson(scheme, null, '2026-10-27T00:00:00.000Z'));
  ok('a programme download keeps the summary and the source',
    schemeJson.record.summary.includes('100 days') && schemeJson.record.sourceUrl === scheme.sourceUrl);
  ok('a programme download has no invented text', schemeJson.record.text === '');

  ok('a numerical record has a readable filename',
    archiveFileName(rbi) === 'archive-rbi-rbi-2026-27-296.json', archiveFileName(rbi));
  ok('a string record has a readable filename',
    archiveFileName(scheme) === 'archive-rural-development-scheme-mgnrega.json', archiveFileName(scheme));
}

// 7. The indexed RBI records still point at the monitor corpus, so the
//    archive cannot drift from the workbench it cites.
{
  const rbi = ARCHIVE.records.filter((record) => record.source === 'rbi');
  ok('every RBI record points at a monitor chunk',
    rbi.every((record) => record.file && MONITOR.instruments.some((entry) => String(entry.id) === record.id)));
  ok('every RBI record carries the monitor hash',
    rbi.every((record) => MONITOR.instruments.find((entry) => String(entry.id) === record.id)?.hash === record.hash));
}

// 8. Lineage: a doc names what it follows, the build derives the reverse, and
//    the chain connects a text to the instrument that replaced it.
{
  const byId = new Map(ARCHIVE.records.map((record) => [record.id, record]));
  ok('every lineage edge resolves to an archive record',
    ARCHIVE.records.every((record) => (record.follows || []).every((id) => byId.has(id))));
  ok('no record follows itself',
    ARCHIVE.records.every((record) => !(record.follows || []).includes(record.id)));
  ok('the reverse edge is derived, not hand-written',
    ARCHIVE.records.every((record) => {
      const expected = ARCHIVE.records
        .filter((other) => (other.follows || []).includes(record.id))
        .map((other) => other.id)
        .sort();
      return JSON.stringify(expected) === JSON.stringify([...(record.followedBy || [])].sort());
    }));

  const code = byId.get('in-code-on-wages-2019');
  ok('the Code on Wages follows the four laws it repealed',
    ['in-payment-of-wages-act-1936', 'in-minimum-wages-act-1948',
      'in-payment-of-bonus-act-1965', 'in-equal-remuneration-act-1976']
      .every((id) => code.follows.includes(id)));
  ok('the wage laws are listed as followed by the Code',
    byId.get('in-payment-of-wages-act-1936').followedBy.includes('in-code-on-wages-2019'));
  ok('the health policy chain links 2002 to 2017',
    byId.get('in-nhp-2017').follows.includes('in-nhp-2002') &&
      byId.get('in-nhp-2002').followedBy.includes('in-nhp-2017'));
  ok('the AI chain runs from the 2018 strategy to the 2025 guidelines',
    byId.get('in-niti-rai-2021').follows.includes('in-nsai-2018') &&
      byId.get('in-ai-guidelines-2025').follows.includes('in-niti-rai-2021'));
  ok('the archive counts the records that sit in a chain',
    ARCHIVE.counts.linked ===
      ARCHIVE.records.filter((record) => record.follows.length || record.followedBy.length).length);
}

console.log(failures === 0 ? '\nAll archive checks passed.' : `\n${failures} archive check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
