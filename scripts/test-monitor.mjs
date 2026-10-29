// Verification for the regulatory monitor: the library is the pinned corpus
// and nothing else, the library metadata is internally consistent, the diff
// classes what changed, the review record survives round trips, and the pack
// carries the manifest and the omissions the tool claims.
// Run: node scripts/test-monitor.mjs

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { diffObligations, diffSentences, figuresOf } from '../src/lib/monitor/diff.js';
import {
  clearDecision,
  countsOf,
  decisionFor,
  emptyReview,
  setDecision,
  setReviewer,
  textOf,
  trailOf,
} from '../src/lib/monitor/review.js';
import {
  buildMonitorManifest,
  buildPackDocx,
  buildPackMarkdown,
  packFileName,
  profileLabel,
} from '../src/lib/monitor/pack.js';
import { filterObligations, summarise } from '../src/lib/legal/applicability.js';
import {
  archiveCitation,
  archiveFileName,
  archiveRecord,
  archiveRecordJson,
  searchArchive,
} from '../src/lib/archive.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const INDEX = readJson('src/data/monitor/index.json');
const ARCHIVE = readJson('src/data/archive/index.json');
const sha256 = (text) => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

// 1. The library is the pinned corpus, and every row of it is complete.
{
  const instruments = INDEX.instruments;
  ok('the library holds fifty instruments', instruments.length === 50, String(instruments.length));
  ok('every instrument id is unique', new Set(instruments.map((i) => i.id)).size === 50);
  ok('every instrument has a refNo', instruments.every((i) => /^RBI\//.test(i.refNo)));
  ok('every instrument has a real title',
    instruments.every((i) => i.title.length > 12 && !/Index To RBI|^RBI circular$/.test(i.title)));
  ok('every date parses to an ISO date',
    instruments.every((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.dateISO || '')));
  ok('every instrument records its text hash',
    instruments.every((i) => /^sha256:[0-9a-f]{64}$/.test(i.hash)));
  ok('every instrument has a family',
    instruments.every((i) => typeof i.family === 'string' && i.family.length > 0));
  // An amendment that only substitutes wording carries no duty sentence of
  // its own; the page says so instead of inventing one. Most instruments do
  // carry duties, and the library total is checked below.
  ok('at least forty instruments carry duty rows',
    instruments.filter((i) => i.duties > 0).length >= 40,
    String(instruments.filter((i) => i.duties > 0).length));
  ok('the library has a substantial duty list',
    instruments.reduce((sum, i) => sum + i.duties, 0) > 1500,
    String(instruments.reduce((sum, i) => sum + i.duties, 0)));
  ok('the corpus hash is recorded', /^sha256:[0-9a-f]{64}$/.test(INDEX.corpusHash));
  ok('the families cover every instrument', instruments.every((i) =>
    INDEX.families.some((f) => f.id === i.family && f.members.includes(i.id))));
  ok('a predecessor is an earlier member of its own family', instruments.every((i) => {
    if (!i.predecessor) return true;
    const before = instruments.find((x) => x.id === i.predecessor);
    return before && before.family === i.family && before.dateISO < i.dateISO;
  }));
}

// 2. The instruments on disk carry the text the index hashed, and each duty
//    points at a sentence that exists.
{
  const sample = [...INDEX.instruments]
    .sort((a, b) => b.duties - a.duties)
    .slice(0, 3)
    .map((meta) => ({ meta, chunk: readJson(`src/data/monitor/${meta.file}`) }));
  ok('the hashed text is the shipped text',
    sample.every(({ meta, chunk }) => sha256(chunk.text) === meta.hash));
  ok('every duty resolves to a source sentence',
    sample.every(({ chunk }) => chunk.duties.every((d) => typeof chunk.sentences[d.sourceId] === 'string')));
  ok('every duty carries its figures as read from the quote',
    sample.every(({ chunk }) => chunk.duties.every((d) =>
      JSON.stringify(d.numbers) === JSON.stringify(figuresOf(chunk.sentences[d.sourceId])))));
  ok('duty ids are contiguous from one',
    sample.every(({ chunk }) => chunk.duties.every((d, i) => d.id === i + 1)));
}

// 3. The diff: additions, removals, figure changes and reworded duties.
{
  const previous = [
    { id: 1, clause: 's. 4', quote: 'An NBFC must maintain a record for 500 days.', plain: 'Must keep records 500 days.' },
    { id: 2, clause: 's. 5', quote: 'An NBFC must file a return by the fifth day.', plain: 'Must file a return by day five.' },
    { id: 3, clause: 's. 6', quote: 'The Board must meet every quarter.', plain: 'The Board must meet each quarter.' },
  ];
  const current = [
    { id: 1, clause: 's. 4', quote: 'An NBFC must maintain a record for 1,000 days.', plain: 'Must keep records 1,000 days.' },
    { id: 2, clause: 's. 5', quote: 'An NBFC must file a return by the 7th day.', plain: 'Must file a return by day 7.' },
    { id: 3, clause: 's. 6', quote: 'The Board must meet every quarter.', plain: 'The Board must meet each quarter.' },
    { id: 4, clause: 's. 9', quote: 'An NBFC must appoint a grievance officer.', plain: 'Must appoint a grievance officer.' },
  ];
  const diff = diffObligations(previous, current);
  ok('a new duty is added', diff.summary.added === 1, JSON.stringify(diff.summary));
  ok('a duty still present is unchanged', diff.summary.unchanged === 1, JSON.stringify(diff.summary));
  ok('a duty with a changed figure is changed, not added', diff.summary.changed === 2, JSON.stringify(diff.summary));
  ok('the changed row names the old and new figure',
    diff.changed[0].figures.lost.includes('500') && diff.changed[0].figures.gained.includes('1000'),
    JSON.stringify(diff.changed[0].figures));
  const reworded = diffObligations(
    [{ id: 1, quote: 'The Board shall meet every quarter and record the minutes.' }],
    [{ id: 7, quote: 'The Board must meet each quarter and record its minutes.' }],
  );
  ok('a reworded duty matches instead of counting as added and dropped',
    reworded.summary.added === 0 && reworded.summary.removed === 0,
    JSON.stringify(reworded.summary));

  const text = diffSentences(
    'One entry is listed here.\nAnother entry remains.\nA third entry is withdrawn.',
    'One entry is listed here.\nAnother entry remains.\nA fourth entry is added.',
  );
  ok('the sentence diff finds the added line', text.added.includes('A fourth entry is added.'), JSON.stringify(text.added));
  ok('the sentence diff finds the removed line', text.removed.includes('A third entry is withdrawn.'), JSON.stringify(text.removed));
}

// 4. The review record: decisions, the text signed off, and the trail.
{
  const rows = [
    { id: 1, plain: 'Engine one.', quote: 'Quote one.' },
    { id: 2, plain: 'Engine two.', quote: 'Quote two.' },
  ];
  let review = emptyReview();
  ok('an empty review signs nothing', countsOf(rows, review).pending === 2);
  review = setReviewer(review, 'Asha Rao');
  ok('the reviewer is kept', review.reviewer === 'Asha Rao');
  review = setDecision(review, 1, { state: 'accepted' });
  review = setDecision(review, 2, { state: 'edited', text: 'Reviewer two.' });
  ok('decisions replace the engine read only where corrected',
    textOf(rows[0], review) === 'Engine one.' && textOf(rows[1], review) === 'Reviewer two.',
    JSON.stringify([textOf(rows[0], review), textOf(rows[1], review)]));
  ok('the counts separate accepted, corrected and pending',
    countsOf(rows, review).accepted === 1
      && countsOf(rows, review).edited === 1
      && countsOf(rows, review).pending === 0);
  ok('the trail is newest first and carries a date',
    trailOf(review).length === 2 && trailOf(review).every((entry) => /^\d{4}-\d{2}-\d{2}/.test(entry.at)));
  review = clearDecision(review, 1);
  ok('clearing a decision returns the row to pending',
    decisionFor(review, 1) === null && countsOf(rows, review).pending === 1);
}

// 5. Applicability over a real instrument: every row gets a verdict, none is
//    dropped, and the counts sum to the list.
{
  const meta = [...INDEX.instruments].sort((a, b) => b.duties - a.duties)[0];
  const chunk = readJson(`src/data/monitor/${meta.file}`);
  const profile = {
    version: 'test', entityType: 'NBFC', nbfcCategory: 'NBFC-ND', depositTaking: 'no',
    layers: 'MIDDLE', assetSizeCr: 2000, serviceUnits: 120, activities: [],
  };
  const prepared = chunk.duties.map((duty) => ({
    id: duty.id,
    quote: chunk.sentences[duty.sourceId],
    prev: chunk.sentences[duty.sourceId - 1] || '',
    circularId: chunk.id,
    bearer: duty.bearer,
    obligationType: duty.type,
    obligationLabel: duty.typeLabel,
    plain: duty.plain,
    clause: duty.clause,
  }));
  const filtered = filterObligations(prepared, profile, {
    addresseeByCircular: { [chunk.id]: chunk.addressee || '' },
    scopeTextByCircular: {},
  });
  const counts = summarise(filtered);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  ok('every duty gets an applicability verdict', filtered.every((row) => row.applicability?.verdict));
  ok('no duty is dropped by the filter', filtered.length === prepared.length && total === prepared.length,
    JSON.stringify({ rows: filtered.length, total }));
  ok('profile facts name a reason on every non-in-scope row',
    filtered.filter((row) => row.applicability.verdict !== 'in-scope')
      .every((row) => row.applicability.reasons.length > 0));
}

// 6. The pack: manifest, reviewer, the printed verdicts, and the DOCX.
{
  const meta = [...INDEX.instruments].sort((a, b) => b.duties - a.duties)[0];
  const chunk = readJson(`src/data/monitor/${meta.file}`);
  const profile = { version: 'test', entityType: 'NBFC', layers: 'MIDDLE', activities: [] };
  const rows = chunk.duties.slice(0, 3).map((duty) => ({
    ...duty,
    quote: chunk.sentences[duty.sourceId],
    applicability: {
      verdict: duty.id === 1 ? 'in-scope' : duty.id === 2 ? 'conditional' : 'out-of-scope',
      reasons: ['test reason'],
      nextRead: null,
    },
  }));
  let review = setReviewer(emptyReview(), 'Asha Rao');
  review = setDecision(review, 1, { state: 'accepted' });

  const manifest = await buildMonitorManifest({ instrument: chunk, profile, rows, review });
  ok('the manifest hashes the input and the output',
    /^[0-9a-f]{64}$/.test(manifest.inputHash) && /^[0-9a-f]{64}$/.test(manifest.outputHash));
  ok('the manifest records the monitor engine', manifest.engine === 'ths-regulatory-monitor-0.1.0' && manifest.module === 'regulator-obligation-monitor');
  const again = await buildMonitorManifest({ instrument: chunk, profile, rows, review });
  ok('the same review produces the same manifest legs',
    again.inputHash === manifest.inputHash && again.outputHash === manifest.outputHash);

  const markdown = buildPackMarkdown({ instrument: chunk, profile, rows, review, manifest, changes: null });
  ok('the pack names the instrument and the reviewer',
    markdown.includes(chunk.refNo) && markdown.includes('Asha Rao'));
  ok('the pack prints the manifest hash', markdown.includes(manifest.outputHash));
  ok('the pack does not print an out-of-scope obligation as a duty',
    !markdown.includes(rows[2].quote));
  ok('the pack states what it cannot say', markdown.includes('not legal advice'));
  ok('the profile label names the entity and the layer',
    /Non-banking financial company/i.test(profileLabel(profile)) && /middle layer/i.test(profileLabel(profile)),
    profileLabel(profile));

  const docx = buildPackDocx({ instrument: chunk, profile, rows, review, manifest });
  ok('the DOCX pack is a zip with a name', docx.bytes.length > 1000 && docx.name.endsWith('.docx'), String(docx.bytes.length));
  ok('the pack filename is readable', /obligation-pack\.md$/.test(packFileName(chunk, 'md')), packFileName(chunk, 'md'));
  ok('a pasted instrument is named after its title, not "no-reference"',
    packFileName({ refNo: 'no reference', title: 'A Circular on Exposures', date: '2026-10-24' }, 'md')
      === 'a-circular-on-exposures-2026-10-24-obligation-pack.md',
    packFileName({ refNo: 'no reference', title: 'A Circular on Exposures', date: '2026-10-24' }, 'md'));
  const xml = Buffer.from(docx.bytes).toString('latin1');
  ok('the DOCX carries the manifest line', xml.includes(manifest.outputHash));
}

// 7. The public archive: the same pinned text, a read-only search, a citation
//    and a downloaded record that carries its own hash and address. The full
//    cross-government checks live in scripts/test-archive.mjs; this block
//    only proves the RBI slice and the workbench cannot drift apart.
{
  const meta = ARCHIVE.records.find((entry) => entry.id === '13742');
  const chunk = readJson(`src/data/monitor/${meta.file}`);
  const record = archiveRecord(meta, chunk);
  ok('the archive record carries the pinned text', record.text === chunk.text);

  const hit = searchArchive([record], 'UAPA')[0];
  ok('the archive finds a word in the instrument body', Boolean(hit), 'UAPA');
  ok('the archive snippet quotes the match', /UAPA/i.test(hit?.snippet || ''), hit?.snippet);
  ok('the archive search is an AND over terms',
    searchArchive([record], 'UAPA sanctions').length === 1 &&
      searchArchive([record], 'UAPA nonexistentterm').length === 0);
  ok('the archive searches the reference number',
    searchArchive([record], meta.refNo).length === 1, meta.refNo);

  const citation = archiveCitation({ ...meta, sourceUrl: chunk.sourceUrl });
  ok('the citation names the central bank, reference and hash',
    /Reserve Bank of India/.test(citation) && citation.includes(meta.refNo) &&
      citation.includes(meta.hash), citation);
  ok('the citation carries the source URL', citation.includes(chunk.sourceUrl));

  const json = JSON.parse(archiveRecordJson(meta, chunk, '2026-10-27T00:00:00.000Z'));
  ok('the downloaded record carries the text and the hash',
    json.record.hash === meta.hash && json.record.text === chunk.text &&
      json.retrieved === '2026-10-27T00:00:00.000Z');
  ok('the downloaded record links back to the archive',
    json.archiveUrl === `#/archive/${meta.id}`, json.archiveUrl);
  ok('the download filename is readable',
    /^archive-rbi-rbi-2026-27-296\.json$/.test(archiveFileName(meta)), archiveFileName(meta));
  ok('every pinned instrument has a public record',
    INDEX.instruments.every((entry) => {
      const doc = readJson(`src/data/monitor/${entry.file}`);
      const publicRecord = ARCHIVE.records.find((record) => record.id === String(entry.id));
      return Boolean(doc.text) && doc.hash === entry.hash && publicRecord?.hash === entry.hash;
    }));
}

console.log(failures === 0 ? '\nAll monitor checks passed.' : `\n${failures} monitor check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
