// Verification for the legal review engine: the confidence axis, the
// reviewer's decisions, the sign-off hash, the review file round trip, the
// currency check, the on-device run log, and the exports that carry all of
// it.
//
// Run: node scripts/test-legal-review.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse } from '../src/lib/legal/pipeline.js';
import { assessApplicability } from '../src/lib/legal/applicability.js';
import {
  scoreConfidence, structuralMarkers, confidenceHistogram, CONFIDENCE_LEVELS,
} from '../src/lib/legal/confidence.js';
import {
  buildSignOff, buildReviewFile, parseReviewFile, reviewDecision, reviewCounts,
  exportedRows, rejectedRows, normaliseReview, emptyReview, REVIEW_FILE_SCHEMA,
} from '../src/lib/legal/review.js';
import { buildManifest, buildBundle, buildMarkdown, buildHtml, buildRedlineCsv } from '../src/lib/legal/exports.js';
import { gazetteHead } from '../src/lib/print/gazette.js';
import { buildDocx } from '../src/lib/legal/docx.js';
import { buildClientBriefText, buildClientBriefHtml } from '../src/lib/legal/clientBrief.js';
import { parseSourceDate, currencyCheck, DEFAULT_STALE_DAYS } from '../src/lib/legal/currency.js';
import {
  createRunRecord, appendRun, readRuns, clearRuns, exportAuditCsv, exportAuditJson,
  verifyRun, normaliseMatter, matterComplete, emptyMatter, MAX_RUNS,
} from '../src/lib/legal/audit.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}
function eq(name, got, want) {
  const good = got === want;
  if (!good) failures += 1;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function section(title) {
  console.log(`\n--- ${title} ---`);
}

const TEXT = `Section 4. The Central Government may, by notification in the Official Gazette, make rules for carrying out the purposes of this Act, provided that no such rules shall be made without prior consultation with the State Governments. Every beneficiary shall be entitled to receive the benefits in accordance with the provisions of this Act. The District Officer shall record the entries in the register within thirty days.`;

const GATE = {
  currency: 'Checked against the Gazette on 4 March 2026.',
  definitions: 'All defined terms resolved against the definitions section.',
  reviewer: 'A. Reviewer, Advocate, 4 March 2026',
  circulation: 'Approved for the client pack, 4 March 2026',
};

const analyseText = () =>
  analyse(TEXT, {
    jurisdictionId: 'in-bare-act',
    mode: 'legal-review',
    source: {
      title: 'Community Records Act, 2026',
      citation: 'Act No. 00 of 2026',
      date: '2026-01-15',
      reviewer: 'A. Reviewer',
    },
  });

// ---- 1. the confidence axis ------------------------------------------------

section('confidence');

{
  // No rule fired: the engine certified nothing, so it is Low. Never High.
  const c = scoreConfidence({ source: 'A plain sentence with no statutory phrase in it.', changes: [] });
  eq('a sentence no rule touched is low', c.level, 'low');
  ok('a low sentence asks for verification', c.verify === true);
  ok('a low sentence says why', c.reasons.some((r) => r.includes('No dictionary rule fired')));
}

{
  // A literal rule, nothing unresolved: High.
  const c = scoreConfidence({
    source: 'The Central Government may make rules.',
    changes: [{ from: 'shall', to: 'may', risk: 'green' }],
  });
  eq('a literal rewrite with nothing unresolved is high', c.level, 'high');
  ok('a high sentence does not demand verification', c.verify === false);
  ok('a high sentence records the literal hits', c.literalHits === 1);
}

{
  // One unresolved thing: Medium.
  const c = scoreConfidence({
    source: 'The rules are in accordance with section 8 of this Act.',
    changes: [{ from: 'in accordance with', to: 'under', risk: 'green' }],
  });
  eq('one unresolved cross-reference is medium', c.level, 'medium');
  ok('the cross-reference is named', c.unresolved.includes('cross-reference'));
}

{
  // Two unresolved things: Low.
  const c = scoreConfidence({
    source: 'The rules under section 8 apply, provided that the State Governments consent.',
    changes: [{ from: 'shall', to: 'must', risk: 'green' }],
  });
  eq('two unresolved things are low', c.level, 'low');
  ok('both are named', c.unresolved.length === 2, c.unresolved.join(', '));
}

{
  // A defined term is informational, not a defect. It must not, on its own,
  // push a sentence down the scale.
  const c = scoreConfidence({
    source: 'The designated officer shall issue the notice.',
    changes: [{ from: 'shall', to: 'must', risk: 'green' }],
    terms: ['designated officer'],
  });
  eq('a defined term alone leaves the sentence medium', c.level, 'medium');
  ok('the defined term is informational, not unresolved', c.unresolved.length === 0);
  ok('the defined term is listed as informational', c.informational.includes('defined-term'));
}

{
  // Risk and confidence are separate axes. A sentence flagged red because
  // the clause type demands legal judgement, rewritten literally and left
  // with nothing unresolved, is still high confidence — and still has to be
  // signed off. Reading both chips is how a reviewer works.
  const c = scoreConfidence({
    source: 'The penalty shall be one hundred rupees.',
    changes: [{ from: 'shall', to: 'must', risk: 'green' }],
    flag: 'red',
  });
  eq('a red flag does not lower the confidence', c.level, 'high');
  eq('the flag is recorded', c.flag, 'red');
  ok('a red flag still demands a sign-off', c.verify === true);
  ok('the sign-off note says why', c.verifyNote.includes('legal effect'));
}

{
  // A change that is itself a legal judgement is not a literal
  // substitution, so the sentence cannot be high confidence.
  const c = scoreConfidence({
    source: 'The Board shall not approve the transaction.',
    changes: [{ from: 'shall not', to: 'cannot', risk: 'red' }],
    flag: 'red',
  });
  ok('a red change is never high confidence', c.level !== 'high', c.level);
  ok('the reason is given', c.reasons.some((r) => r.includes('interpretive')));
}

{
  // A green sentence with nothing left open does not need verifying.
  const c = scoreConfidence({
    source: 'The Central Government may make rules.',
    changes: [{ from: 'shall', to: 'must', risk: 'green' }],
    flag: 'green',
  });
  ok('a clean green sentence does not need verifying', c.verify === false);
  eq('a clean green sentence has no verify note', c.verifyNote, '');
}

{
  // An interpretive-only rewrite is never High.
  const c = scoreConfidence({
    source: 'The officer may consider the representation.',
    changes: [{ from: 'may consider', to: 'can take into account', risk: 'amber' }],
  });
  ok('an interpretive-only rewrite is not high', c.level !== 'high', c.level);
  ok('the reason is given', c.reasons.some((r) => r.includes('interpretive')));
}

{
  // A blocked rule is unresolved: the engine did not do what it wanted to.
  const c = scoreConfidence({
    source: 'The Board shall apply the guidelines issued by the Authority.',
    changes: [{ from: 'shall', to: 'must', risk: 'green' }],
    blocked: [{ from: 'in accordance with the guidelines' }],
  });
  eq('a blocked rule is unresolved', c.unresolved.includes('blocked'), true);
}

{
  // The marker layer on its own.
  const markers = structuralMarkers({ source: 'See section 4 and the Schedule.' });
  ok('a cross-reference is a marker', markers.some((m) => m.id === 'cross-reference'));
  ok('markers carry a severity', markers.every((m) => ['unresolved', 'informational'].includes(m.severity)));
  eq('an empty sentence has no markers', structuralMarkers({ source: 'Nothing here.' }).length, 0);
}

{
  // The histogram adds up.
  const rows = [
    { confidence: { level: 'high' } },
    { confidence: { level: 'low' } },
    { confidence: { level: 'low' } },
    { confidence: null },
  ];
  const hist = confidenceHistogram(rows);
  eq('the histogram counts high', hist.high, 1);
  eq('the histogram counts low', hist.low, 3);
  eq('the histogram counts the total', hist.total, 4);
  ok('every level is one of the three', CONFIDENCE_LEVELS.length === 3);
}

{
  // The engine scores every row, and the pipeline histogram agrees with the
  // rows it produced.
  const result = analyseText();
  ok('every row carries a confidence', result.rows.every((r) => r.confidence && r.confidence.level));
  const counted = { high: 0, medium: 0, low: 0 };
  for (const row of result.rows) counted[row.confidence.level] += 1;
  eq('the pipeline histogram matches the rows', result.confidence.high, counted.high);
  eq('the pipeline histogram matches the rows (medium)', result.confidence.medium, counted.medium);
  eq('the pipeline histogram matches the rows (low)', result.confidence.low, counted.low);
  eq('the histogram total is the row count', result.confidence.total, result.rows.length);
  ok('at least one sentence is not high', result.confidence.low + result.confidence.medium > 0);
}

{
  // The confidence scorer is a pure function: no clock, no network. The same
  // inputs must give the same answer on any run.
  const a = scoreConfidence({ source: 'The officer shall do it.', changes: [{ from: 'shall', to: 'must', risk: 'green' }] });
  const b = scoreConfidence({ source: 'The officer shall do it.', changes: [{ from: 'shall', to: 'must', risk: 'green' }] });
  eq('the scorer is deterministic', JSON.stringify(a), JSON.stringify(b));
}

// ---- 2. accept, reject, and the counts -------------------------------------

section('accept and reject');

const result = analyseText();

{
  const review = {
    [result.rows[0].id]: { state: 'accepted', comment: 'Reads correctly.' },
    [result.rows[1].id]: { state: 'rejected', comment: 'The proviso is not carried across; read against the source.' },
  };

  eq('a rejection is a rejection', reviewDecision(review, result.rows[1].id).state, 'rejected');
  eq('an untouched sentence is pending', reviewDecision(review, result.rows[2].id).state, 'pending');
  eq('the comment comes back', reviewDecision(review, result.rows[1].id).comment, 'The proviso is not carried across; read against the source.');

  const kept = exportedRows(result, review);
  const dropped = rejectedRows(result, review);
  eq('a rejected sentence leaves the export', dropped.length, 1);
  eq('the rest stay in the export', kept.length, result.rows.length - 1);
  ok('the rejected sentence is the right one', dropped[0].id === result.rows[1].id);

  const counts = reviewCounts(result, review);
  eq('one accepted', counts.accepted, 1);
  eq('one rejected', counts.rejected, 1);
  eq('the rest are pending', counts.pending, result.rows.length - 2);
  eq('the total is the row count', counts.total, result.rows.length);
  eq('two comments were written', counts.commented, 2);
}

{
  // A sentence with only a comment and no decision is still pending, and it
  // is still exported: only a deliberate rejection removes a sentence.
  const review = { [result.rows[0].id]: { state: 'pending', comment: 'Check the figure.' } };
  eq('a comment alone does not remove the sentence', exportedRows(result, review).length, result.rows.length);
  eq('a comment alone is still pending', reviewDecision(review, result.rows[0].id).state, 'pending');
}

{
  // Normalising drops empty entries and keeps real ones.
  const review = normaliseReview({
    a: { state: 'pending', comment: '' },
    b: { state: 'accepted', comment: '' },
    c: { state: 'rejected', comment: 'no' },
    d: { state: 'nonsense', comment: 'kept anyway' },
  });
  eq('an empty pending entry is dropped', review.a, undefined);
  ok('an accepted entry is kept', review.b && review.b.state === 'accepted');
  ok('a rejection is kept with its reason', review.c && review.c.comment === 'no');
  ok('an unknown state becomes pending', review.d && review.d.state === 'pending');
  eq('an empty review is empty', Object.keys(emptyReview()).length, 0);
}

// ---- 3. the sign-off hash --------------------------------------------------

section('sign-off');

{
  const a = await buildSignOff({ gate: GATE, review: {} });
  const b = await buildSignOff({ gate: GATE, review: {} });
  eq('the same answers sign off to the same hash', a.hash, b.hash);
  ok('the hash is a real digest', /^[0-9a-f]{64}$/.test(a.hash), a.hash);
}

{
  // A different decision is a different sign-off. This is the whole point of
  // the fourth hash: it proves a named human signed this file.
  const base = await buildSignOff({ gate: GATE, review: {} });
  const changed = await buildSignOff({
    gate: GATE,
    review: { r1: { state: 'rejected', comment: 'no' } },
  });
  ok('a different decision changes the sign-off', base.hash !== changed.hash);
  const differentGate = await buildSignOff({ gate: { ...GATE, reviewer: 'B. Other' }, review: {} });
  ok('a different reviewer changes the sign-off', base.hash !== differentGate.hash);
}

{
  // The gate answers are normalised, so the order they were typed in does
  // not matter, but a blank is not the same as an answer.
  const a = await buildSignOff({ gate: { reviewer: 'A. Reviewer', currency: 'c' } });
  const b = await buildSignOff({ gate: { currency: 'c', reviewer: 'A. Reviewer' } });
  eq('the gate order does not change the hash', a.hash, b.hash);
  const c = await buildSignOff({ gate: { reviewer: 'A. Reviewer', currency: '   ' } });
  ok('a blank is not an answer', a.hash !== c.hash);
}

{
  // The manifest carries the sign-off hash, and it changes when the review
  // changes.
  const noReview = await buildManifest(result, { gate: GATE });
  const withReview = await buildManifest(result, { gate: GATE, review: { r1: { state: 'rejected', comment: 'no' } } });
  ok('the manifest carries a sign-off hash', Boolean(noReview.signOffHash));
  ok('a different review changes the sign-off hash', noReview.signOffHash !== withReview.signOffHash);
  eq('the manifest counts the rejections', withReview.review.rejected, 1);
  eq('the manifest counts the exports', withReview.review.exported, result.rows.length - 1);
}

// ---- 4. the review file round trip -----------------------------------------

section('review file round trip');

{
  const review = {
    [result.rows[0].id]: { state: 'accepted', comment: 'Reads correctly.' },
    [result.rows[1].id]: { state: 'rejected', comment: 'Proviso not carried across.' },
  };
  const raw = await buildReviewFile(result, { gate: GATE, review, matter: { client: 'Acme', matterRef: 'MAT-1', reviewer: 'A. Reviewer', instruction: 'Board pack' } });
  const data = JSON.parse(raw);
  eq('the file carries the schema', data.schema, REVIEW_FILE_SCHEMA);
  ok('the file carries the source text', data.source.text === result.text);
  ok('the file carries the decisions', Object.keys(data.review).length === 2);

  const back = await parseReviewFile(raw);
  ok('the file parses', back.ok);
  eq('the parsed file has no warnings', back.warnings.length, 0);
  eq('the source comes back', back.text, result.text);
  eq('the reviewer comes back', back.gate.reviewer, GATE.reviewer);
  eq('the decisions come back', back.review[result.rows[1].id].state, 'rejected');
  eq('the comment comes back', back.review[result.rows[1].id].comment, 'Proviso not carried across.');
  eq('the matter comes back', back.matter.client, 'Acme');
  eq('the sign-off hash survives the round trip', back.signOffHash, data.signOffHash);
}

{
  // A tampered file is caught, not trusted.
  const raw = await buildReviewFile(result, { gate: GATE, review: {} });
  const data = JSON.parse(raw);
  data.source.text = `${data.source.text} And this sentence was added after the fact.`;
  const back = await parseReviewFile(JSON.stringify(data));
  ok('a tampered file still parses', back.ok);
  eq('a tampered file is warned about', back.warnings.length, 1);
  ok('the warning says the source does not match', back.warnings[0].includes('does not match the hash'));
}

{
  // A decision edited without the hash being updated is caught too.
  const review = { [result.rows[0].id]: { state: 'rejected', comment: 'no' } };
  const raw = await buildReviewFile(result, { gate: GATE, review });
  const data = JSON.parse(raw);
  data.review[result.rows[0].id] = { state: 'accepted', comment: 'no' };
  const back = await parseReviewFile(JSON.stringify(data));
  eq('an edited decision is warned about', back.warnings.length, 1);
  ok('the warning says the sign-off does not match', back.warnings[0].includes('sign-off hash'));
}

{
  // A file that is not a review file is refused with a reason, not a crash.
  const notJson = await parseReviewFile('this is not json');
  ok('a non-JSON file is refused', !notJson.ok);
  ok('the refusal explains itself', typeof notJson.error === 'string' && notJson.error.length > 0);

  const wrongSchema = await parseReviewFile(JSON.stringify({ schema: 'something-else' }));
  ok('a foreign schema is refused', !wrongSchema.ok);
  ok('the refusal names the schema it found', wrongSchema.error.includes('something-else'));
}

// ---- 5. currency -----------------------------------------------------------

section('currency');

{
  ok('an ISO date is read', parseSourceDate('2026-01-15').precision === 'day');
  ok('a day-month-year date is read', parseSourceDate('15 January 2026').precision === 'day');
  ok('a month-day-year date is read', parseSourceDate('January 15, 2026').precision === 'day');
  ok('a year alone is read at lower precision', parseSourceDate('2026').precision === 'year');
  eq('an impossible date is refused', parseSourceDate('31 February 2026'), null);
  eq('an empty date is refused', parseSourceDate(''), null);
}

{
  const fresh = currencyCheck({ date: '2026-03-01' }, { today: new Date('2026-03-04T00:00:00Z') });
  ok('a recent source is not stale', fresh.stale === false);
  ok('a recent source is dated', fresh.stated === true);
  eq('the age is counted in days', fresh.ageDays, 3);

  const old = currencyCheck({ date: '2024-01-01' }, { today: new Date('2026-03-04T00:00:00Z') });
  ok('an old source is stale', old.stale === true);
  ok('the statement says so', old.statement.includes('cannot tell you whether it has been amended'));

  const undated = currencyCheck({}, { today: new Date('2026-03-04T00:00:00Z') });
  ok('an undated source says so', undated.stated === false);
  ok('an undated source cannot be stale', undated.stale === false);
  ok('the undated statement is explicit', undated.statement.includes('No date was recorded'));

  const boundary = currencyCheck({ date: '2026-01-01' }, { today: new Date('2026-01-01T00:00:00Z'), staleDays: DEFAULT_STALE_DAYS });
  ok('a source exactly at the limit is not stale', boundary.stale === false);
}

// ---- 6. the run log --------------------------------------------------------

section('run log');

{
  clearRuns();
  eq('the log starts empty', readRuns().length, 0);

  const record = await createRunRecord(result, {
    manifest: await buildManifest(result, { gate: GATE }),
    gate: GATE,
    matter: { client: 'Acme', matterRef: 'MAT-1', reviewer: 'A. Reviewer', instruction: 'Board pack' },
    action: 'copy-bundle',
    at: new Date('2026-03-04T10:00:00Z'),
  });
  ok('the record names the action', record.action === 'copy-bundle');
  ok('the record names the client', record.matter.client === 'Acme');
  ok('the record carries the source so the run can be repeated', record.sourceText === result.text);
  ok('the record carries the output hash', Boolean(record.outputHash));

  const { runs, dropped } = appendRun(record);
  eq('the run is in the log', runs.length, 1);
  eq('nothing fell off', dropped, 0);

  const csv = exportAuditCsv(runs);
  ok('the CSV has a header row', csv.split('\n')[0].startsWith('run_id,'));
  ok('the CSV has one row per run', csv.split('\n').length === 2);
  ok('the CSV names the client', csv.includes('Acme'));

  const json = JSON.parse(exportAuditJson(runs));
  eq('the JSON export has the run', json.runs.length, 1);
  ok('the JSON export carries the source', json.runs[0].sourceText === result.text);

  // The log is bounded, and it says what fell off.
  for (let i = 0; i < MAX_RUNS + 5; i += 1) {
    appendRun({ ...record, id: `run-${i}` });
  }
  eq('the log is bounded', readRuns().length, MAX_RUNS);
}

{
  // A recorded run can be re-run and checked.
  const record = await createRunRecord(result, {
    manifest: await buildManifest(result, { gate: GATE }),
    gate: GATE,
    at: new Date('2026-03-04T10:00:00Z'),
  });
  const check = await verifyRun(record);
  eq('the run reproduces exactly', check.status, 'reproduced');

  const tampered = { ...record, outputHash: 'deadbeef' };
  const drift = await verifyRun(tampered);
  eq('a changed output is caught', drift.status, 'drifted');

  const noSource = await verifyRun({ ...record, sourceText: '' });
  eq('a record with no source cannot be verified', noSource.status, 'unverifiable');
}

{
  // The matter.
  eq('an empty matter is empty', emptyMatter().client, '');
  ok('a matter needs a client, a reference and a reviewer', matterComplete({}) === false);
  ok(
    'a complete matter is complete',
    matterComplete({ client: 'Acme', matterRef: 'MAT-1', reviewer: 'A. Reviewer' }) === true,
  );
  const trimmed = normaliseMatter({ client: '  Acme  ', matterRef: 'MAT-1', reviewer: 'A. Reviewer' });
  eq('the matter fields are trimmed', trimmed.client, 'Acme');
}

// ---- 7. the exports carry the review and the confidence --------------------

section('exports');

const review = {
  [result.rows[0].id]: { state: 'accepted', comment: 'Reads correctly.' },
  [result.rows[1].id]: { state: 'rejected', comment: 'Proviso not carried across.' },
};
const manifest = await buildManifest(result, { gate: GATE, review });

{
  const bundle = buildBundle(result, { gate: GATE, manifest, review });
  ok('the bundle carries the confidence', bundle.includes('confidence'));
  ok('the bundle lists the rejected sentences', bundle.includes('SENTENCES REJECTED IN REVIEW'));
  ok('the bundle carries the rejection reason', bundle.includes('Proviso not carried across.'));
  ok('the bundle carries the gate answers', bundle.includes(GATE.circulation));
  ok('the bundle carries the sign-off hash', bundle.includes(manifest.signOffHash));
}

{
  const md = buildMarkdown(result, { gate: GATE, manifest, review });
  ok('the markdown has a confidence column', md.includes('| Clause | Type | Flag | Confidence |'));
  ok('the markdown lists the rejected sentences', md.includes('Sentences rejected in review'));
}

{
  const html = buildHtml(result, { gate: GATE, manifest, review });
  ok('the html has a confidence cell', html.includes('class="conf conf-'));
  ok('the html lists the rejected sentences', html.includes('Sentences rejected in review'));
  ok('the html carries the rejection reason', html.includes('Proviso not carried across.'));
  ok('the html carries the method card', html.includes('METHODOLOGY CARD'));
  ok('the redline pack is set as a gazette',
    html.includes('<main class="gz">') && html.includes('class="gz-head"')
      && html.includes('class="gz-columns"') && html.includes('class="gz-foot"'));
}

{
  const csv = buildRedlineCsv(result, { review });
  const lines = csv.split('\n');
  eq('the redline pack has a header', lines[0], 'sentence,clause,clause_type,flag,confidence,source_start,source_end,rule_from,rule_to,rule_risk,rationale,source_text,rewrite');
  const rejectedId = result.rows[1].id;
  ok('the rejected sentence is not in the redline pack', !csv.includes(`\n${rejectedId},`));
  ok('the kept sentence is in the redline pack', csv.includes(`\n${result.rows[0].id},`));
}

{
  // The client brief: no flags, no ledger, no rejected sentences, but the
  // sign-off travels with it.
  const brief = buildClientBriefText(result, { gate: GATE, manifest, matter: { client: 'Acme', matterRef: 'MAT-1', reviewer: 'A. Reviewer', instruction: 'Board pack' }, review });
  ok('the brief names the client', brief.includes('Acme'));
  ok('the brief carries the sign-off hash', brief.includes(manifest.signOffHash));
  ok('the brief says a sentence was rejected', brief.includes('rejected by the reviewer'));
  ok('the brief carries the rejected sentence\'s text nowhere', !brief.includes(result.rows[1].plain));

  const briefHtml = buildClientBriefHtml(result, { gate: GATE, manifest, matter: { client: 'Acme', matterRef: 'MAT-1', reviewer: 'A. Reviewer' }, review });
  ok('the brief html carries the client', briefHtml.includes('Acme'));
  ok('the brief html has no flags', !briefHtml.includes('flag-chip'));
  ok('the brief is set as a gazette',
    briefHtml.includes('<main class="gz">') && briefHtml.includes('class="gz-head"')
      && briefHtml.includes('class="gz-columns"') && briefHtml.includes('class="gz-foot"'));
}

{
  // The masthead is the one thing every printed artefact shares, so it is
  // escaped once, here, rather than trusted at each call site.
  const head = gazetteHead({
    imprint: 'A & B',
    edition: 'Edition',
    title: '<Act>',
    meta: [['Client', 'Acme & Sons'], ['Empty', '   ']],
  });
  ok('the gazette escapes the imprint', head.includes('A &amp; B') && !head.includes('A & B'));
  ok('the gazette escapes the title', head.includes('&lt;Act&gt;'));
  ok('the gazette drops a meta row with no value', !head.includes('<dt>Empty</dt>'));
  ok('the gazette keeps a filled meta row', head.includes('<dd>Acme &amp; Sons</dd>'));
}

{
  // The DOCX: a rejected sentence leaves the redline, and the confidence is
  // written on the face of the document.
  const bytes = buildDocx(result, { review, date: '2026-03-04T00:00:00Z' });
  ok('the docx is produced', bytes instanceof Uint8Array && bytes.length > 1000);
  const text = Buffer.from(bytes).toString('latin1');
  ok('the docx is a zip container', text.startsWith('PK'));
  ok('the docx carries the confidence', text.includes('confidence:'));
  ok('the docx carries tracked changes', text.includes('<w:ins ') && text.includes('<w:del '));
  ok('the docx lists the rejected sentences', text.includes('Sentences rejected in review'));
}

// ---- 8. the pinned fixtures ------------------------------------------------

section('fixtures');

{
  const manifestJson = JSON.parse(readFileSync(join(root, 'fixtures', 'legal', 'manifest.json'), 'utf8'));
  eq('the manifest pins five fixtures', manifestJson.fixtures.length, 5);

  for (const fixture of manifestJson.fixtures) {
    const text = readFileSync(join(root, 'fixtures', 'legal', fixture.file), 'utf8');
    const r = analyse(text, {
      jurisdictionId: fixture.jurisdictionId,
      mode: 'legal-review',
      source: { title: fixture.title, citation: fixture.citation, date: fixture.date },
    });
    const m = await buildManifest(r);
    eq(`${fixture.file}: the row count has not moved`, m.rows, fixture.rows);
    eq(`${fixture.file}: the flags have not moved`, m.confidence.high, fixture.confidence.high);
    eq(`${fixture.file}: the output hash has not moved`, m.outputHash, fixture.outputHash);
  }
}

// ---- 9. determinism --------------------------------------------------------

section('determinism');

{
  const a = analyseText();
  const b = analyseText();
  const ma = await buildManifest(a);
  const mb = await buildManifest(b);
  eq('the same text gives the same output hash', ma.outputHash, mb.outputHash);
  eq('the same text gives the same source hash', ma.sourceHash, mb.sourceHash);
  ok(
    'the same text gives the same rewrites',
    a.rows.every((row, i) => row.plain === b.rows[i].plain),
  );
}

// ---- 10. applicability: does this bind the reader? -------------------------

section('applicability');

{
  const text = [
    'The Central Government shall notify the scheme in the Official Gazette.',
    'Every scheduled commercial bank shall submit the return by the fifteenth day.',
    'The statutory auditor shall submit the compliance certificate to the bank.',
    'In this Act, "bank" means a banking company.',
  ].join(' ');
  const r = analyse(text, { mode: 'legal-review', jurisdictionId: 'in-bare-act' });
  const profile = {
    profileId: 'test', version: '1', entityType: 'SCB', depositTaking: null,
    nbfcCategory: null, assetSizeCr: null, layers: null, serviceUnits: null, activities: [],
  };
  const a = assessApplicability(r.rows, profile, {
    circularId: 'instrument',
    addresseeByCircular: { instrument: 'Scheduled commercial banks' },
    scopeTextByCircular: { instrument: '' },
  });
  const at = (needle) => a.rows.find((row, i) => r.rows[i].sourceText.includes(needle));

  eq('every row is joined, none dropped', a.rows.length, r.rows.length);
  eq(
    'the counts add up to the rows',
    Object.values(a.counts).reduce((sum, n) => sum + n, 0),
    r.rows.length,
  );

  const gov = at('Central Government');
  eq('a duty on the government is out of scope', gov.verdict, 'out-of-scope');
  ok('the exclusion states why', gov.reasons.some((x) => /government/.test(x)), gov.reasons.join('; '));

  const bank = at('scheduled commercial bank');
  eq('a duty on the reader is in scope', bank.verdict, 'in-scope');
  eq('the bearer is named', bank.bearer && bank.bearer.id, 'ENTITY');

  const auditor = at('statutory auditor');
  eq('a duty on the auditor is a dependency', auditor.verdict, 'dependency');
  eq('the dependency names who acts', auditor.bearer && auditor.bearer.id, 'AUDITOR');
  ok(
    'the dependency names what to read next',
    typeof auditor.nextRead === 'string' && /certificate/.test(auditor.nextRead),
    auditor.nextRead,
  );

  const definition = at('"bank" means');
  eq('a definition binds nobody', definition.verdict, 'not-a-duty');
  ok('and says so rather than dropping the row', definition.reasons.length > 0, definition.reasons.join('; '));
}

{
  // An unknown profile fact is a conditional, not an exclusion: the filter
  // cannot prove the row out, so it keeps it and names the fact it needs.
  const r = analyse('NBFCs-D shall maintain a record of every deposit received.', {
    mode: 'legal-review', jurisdictionId: 'in-bare-act',
  });
  const profile = {
    profileId: 'test', version: '1', entityType: 'NBFC', depositTaking: null,
    nbfcCategory: null, assetSizeCr: null, layers: null, serviceUnits: null, activities: [],
  };
  const a = assessApplicability(r.rows, profile, {
    circularId: 'instrument',
    addresseeByCircular: { instrument: 'NBFCs' },
    scopeTextByCircular: { instrument: '' },
  });
  eq('an unknown fact makes the row conditional', a.rows[0].verdict, 'conditional');
  ok(
    'the condition that would change the answer is named',
    a.rows[0].conditions.some((c) => c.id === 'deposit-taking' && c.value === 'unknown'),
    JSON.stringify(a.rows[0].conditions),
  );
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
