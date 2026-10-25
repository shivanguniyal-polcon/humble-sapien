// Verification for the Legal Simplifier API.
//
//     node scripts/test-api.mjs
//
// The API's whole claim is that it is the same engine as the browser, so
// these tests drive the Worker handler through real Request objects and
// check three things: the contract is honoured, the errors are real errors
// rather than stack traces, and a request through the API produces the same
// output hash as the same request through the library.

import worker, { API_VERSION, INDEX, FORMATS } from '../workers/worker.js';
import { analyse, PIPELINE_VERSION, JURISDICTIONS } from '../src/lib/legal/pipeline.js';
import { buildManifest, MANIFEST_VERSION } from '../src/lib/legal/exports.js';
import { REVIEW_FILE_SCHEMA } from '../src/lib/legal/review.js';

let failures = 0;
let checks = 0;

const ok = (name, cond, detail = '') => {
  checks += 1;
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const eq = (name, got, want) => ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const section = (t) => console.log(`\n${t}`);

const TEXT = `Section 4. The Central Government may, by notification in the Official Gazette, make rules for carrying out the purposes of this Act, provided that no such rules shall be made without prior consultation with the State Governments. Every beneficiary shall be entitled to receive the benefits in accordance with the provisions of this Act.`;

const GATE = {
  currency: 'Checked against the Gazette on 4 March 2026.',
  definitions: 'All defined terms resolved.',
  reviewer: 'A. Reviewer, Advocate, 4 March 2026',
  circulation: 'Approved, 4 March 2026',
};

const get = (path) => worker.fetch(new Request(`https://api.example.test${path}`));
const post = (path, body) =>
  worker.fetch(
    new Request(`https://api.example.test${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

// ---- the index and the metadata -------------------------------------------

section('index and metadata');
{
  const res = await get('/v1/');
  eq('the index is 200', res.status, 200);
  eq('the index is JSON', res.headers.get('content-type'), 'application/json; charset=utf-8');
  eq('the index is public', res.headers.get('access-control-allow-origin'), '*');
  const body = await res.json();
  eq('the index names the engine', body.engine, PIPELINE_VERSION);
  eq('the index names the manifest', body.manifest, MANIFEST_VERSION);
  // The handler serves exactly what it declares: no route in the index may
  // exist that the router does not answer, and vice versa.
  eq('the served index is the declared index', JSON.stringify(body), JSON.stringify(INDEX));
  ok('the index lists its routes', typeof body.routes['POST /v1/analyse'] === 'string');
  for (const route of Object.keys(body.routes)) {
    const [verb, p] = route.split(' ');
    const res = await worker.fetch(new Request(`https://api.example.test${p}`, { method: verb }));
    ok(`the index route ${route} is answered`, res.status !== 404);
  }
  ok('the index states its limits', typeof body.limitations === 'string' && body.limitations.length > 0);
  ok('the index says nothing is stored', body.guarantees.some((g) => /No telemetry, no retention, no account/.test(g)));
}

{
  const res = await get('/v1/health');
  const body = await res.json();
  eq('health is ok', body.status, 'ok');
  eq('health reports the api version', body.version, API_VERSION);
  eq('health reports the engine', body.engine, PIPELINE_VERSION);
  ok('health lists the registers', body.jurisdictions.length === JURISDICTIONS.length);
}

{
  const res = await get('/v1/jurisdictions');
  const body = await res.json();
  eq('the default register is named', body.default, JURISDICTIONS[0].id);
  eq('every register is listed', body.jurisdictions.length, JURISDICTIONS.length);
  ok('each register carries a readability target', body.jurisdictions.every((j) => j.readability && typeof j.readability.grade === 'number'));
}

{
  const res = await get('/v1/gate');
  const body = await res.json();
  eq('the gate has four questions', body.questions.length, 4);
  ok('each question carries a key', body.questions.every((q) => typeof q.key === 'string'));
}

// ---- analyse --------------------------------------------------------------

section('analyse');
{
  const res = await post('/v1/analyse', {
    text: TEXT,
    jurisdictionId: 'in-bare-act',
    source: { title: 'Community Records Act, 2026', citation: 'Act No. 00 of 2026', date: '2026-01-15' },
  });
  eq('analyse is 200', res.status, 200);
  const body = await res.json();
  ok('every row carries a source span', body.rows.every((r) => Number.isInteger(r.start) && Number.isInteger(r.end)));
  ok('every row carries a flag', body.rows.every((r) => ['green', 'amber', 'red'].includes(r.flag)));
  ok('every row carries confidence', body.rows.every((r) => r.confidence && ['high', 'medium', 'low'].includes(r.confidence.level)));
  ok('every row carries its reasons', body.rows.every((r) => Array.isArray(r.reasons)));
  ok('the summary counts the flags', body.summary.green + body.summary.amber + body.summary.red === body.rows.length);
  ok('the confidence histogram adds up', body.confidence.high + body.confidence.medium + body.confidence.low === body.rows.length);
  ok('readability is scored before and after', body.readability.original && body.readability.simplified);
  ok('the source record comes back', body.source.title === 'Community Records Act, 2026');
  ok('the currency statement comes back', typeof body.currency.statement === 'string');
  ok('the flag meanings travel with the payload', body.flagMeaning && body.flagMeaning.red);
}

{
  // The API is the same engine. The output hash a caller gets must match the
  // hash the library produces for the same input. This is the test that makes
  // the "identical engine" claim worth anything.
  const res = await post('/v1/manifest', { text: TEXT, jurisdictionId: 'in-bare-act', gate: GATE });
  const viaApi = await res.json();
  const viaLibrary = await buildManifest(analyse(TEXT, { jurisdictionId: 'in-bare-act' }), { gate: GATE });
  eq('the api and the library agree on the output hash', viaApi.outputHash, viaLibrary.outputHash);
  eq('the api and the library agree on the source hash', viaApi.sourceHash, viaLibrary.sourceHash);
  eq('the api and the library agree on the sign-off hash', viaApi.signOffHash, viaLibrary.signOffHash);
}

{
  const res = await post('/v1/manifest', {
    text: TEXT,
    jurisdictionId: 'in-bare-act',
    gate: GATE,
    review: { r1: { state: 'rejected', comment: 'Proviso not carried across.' } },
  });
  const body = await res.json();
  eq('the manifest counts a rejection', body.rejected, 1);
  eq('the manifest counts the exports', body.exported, body.rows - 1);
  eq('the gate is reported complete', body.reviewGate.complete, true);
  ok('the manifest carries a sign-off hash', /^[0-9a-f]{64}$/.test(body.signOffHash));
}

{
  const res = await post('/v1/analyse', { text: '' });
  eq('an empty text is rejected', res.status, 400);
  const body = await res.json();
  ok('the error names the field', /text/.test(body.error.message));
  ok('no stack trace leaks', !('stack' in body.error));
}

{
  const res = await post('/v1/analyse', { text: TEXT, jurisdictionId: 'not-a-register' });
  eq('an unknown register is rejected', res.status, 400);
  const body = await res.json();
  ok('the error lists where to look', /jurisdictions/.test(body.error.message));
}

{
  const res = await worker.fetch(new Request('https://api.example.test/v1/analyse', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not json at all',
  }));
  eq('malformed json is rejected', res.status, 400);
  ok('the message says so', /not valid JSON/.test((await res.json()).error.message));
}

// ---- export ---------------------------------------------------------------

section('export');
for (const [name, spec] of Object.entries(FORMATS)) {
  const res = await post('/v1/export', {
    text: TEXT,
    jurisdictionId: 'in-bare-act',
    format: name,
    gate: GATE,
    review: { r1: { state: 'rejected', comment: 'no' } },
    source: { title: 'Community Records Act, 2026' },
  });
  ok(`${name}: exports 200`, res.status === 200);
  ok(`${name}: carries the right content type`, (res.headers.get('content-type') || '').startsWith(spec.type.split(';')[0]));
  ok(`${name}: is an attachment`, /attachment/.test(res.headers.get('content-disposition') || ''));
  ok(`${name}: names its engine`, res.headers.get('x-ths-engine') === PIPELINE_VERSION);
  ok(`${name}: carries the output hash`, /^[0-9a-f]{64}$/.test(res.headers.get('x-ths-output-hash') || ''));
  eq(`${name}: reports the gate as answered`, res.headers.get('x-ths-gate-complete'), 'true');
  const bytes = new Uint8Array(await res.arrayBuffer());
  ok(`${name}: returns bytes`, bytes.length > 100);
  if (name === 'docx') {
    ok('docx: is a zip container', String.fromCharCode(...bytes.slice(0, 2)) === 'PK');
    ok('docx: names a .docx', res.headers.get('content-disposition').includes('.docx'));
  }
}

{
  const res = await post('/v1/export', { text: TEXT, format: 'nonsense' });
  eq('an unknown format is rejected', res.status, 400);
  ok('the error lists the formats', /bundle/.test((await res.json()).error.message));
}

{
  // An unanswered gate does not block the API — an internal tool may call it —
  // but the response must say so rather than look signed off.
  const res = await post('/v1/export', { text: TEXT, format: 'html' });
  eq('an unanswered gate still exports', res.status, 200);
  eq('and says so in the header', res.headers.get('x-ths-gate-complete'), 'false');
}

// ---- review files ---------------------------------------------------------

section('review files');
{
  const res = await post('/v1/review-file', {
    text: TEXT,
    jurisdictionId: 'in-bare-act',
    gate: GATE,
    review: { r1: { state: 'accepted', comment: 'Reads correctly.' } },
    matter: { client: 'Acme', matterRef: 'MAT-1', reviewer: 'A. Reviewer' },
  });
  eq('the review file exports', res.status, 200);
  eq('the schema is named', res.headers.get('x-ths-schema'), REVIEW_FILE_SCHEMA);
  const body = await res.json();
  eq('it carries the source', body.source.text, TEXT);
  ok('it carries the decisions', Object.keys(body.review).length === 1);
  ok('it carries the matter', body.matter.client === 'Acme');

  // Round trip through the API.
  const parsed = await post('/v1/review-file/parse', { reviewFile: JSON.stringify(body) });
  const back = await parsed.json();
  eq('the round trip is clean', parsed.status, 200);
  eq('the round trip has no warnings', back.warnings.length, 0);
  eq('the sign-off hash survives', back.signOffHash, body.signOffHash);
}

{
  const res = await post('/v1/review-file/parse', { reviewFile: '{"schema":"something-else"}' });
  eq('a foreign review file is refused', res.status, 400);
  ok('and says which schema it found', /something-else/.test((await res.json()).error.message));
}

// ---- compare --------------------------------------------------------------

section('compare');
{
  const earlier = TEXT.replace('thirty days', 'sixty days');
  const res = await post('/v1/compare', {
    previous: earlier,
    current: TEXT,
    jurisdictionId: 'in-bare-act',
    source: { title: 'Community Records Act, 2026' },
  });
  eq('compare is 200', res.status, 200);
  const body = await res.json();
  ok('the delta names its alignment method', typeof body.method === 'string' && body.method.length > 0);
  ok('the counts are present', Number.isFinite(body.counts.changed));
  ok('the report is included', typeof body.report === 'string' && body.report.includes('comparative reading'));
  ok('each change carries a status', body.changes.every((c) => typeof c.status === 'string'));
}

{
  const res = await post('/v1/compare', { previous: 'a' });
  eq('compare without both versions is rejected', res.status, 400);
}

// ---- routing --------------------------------------------------------------

section('routing');
{
  const res = await get('/v1/nope');
  eq('an unknown route is 404', res.status, 404);
  ok('and points at the index', /GET \/v1\//.test((await res.json()).error.message));
}
{
  const res = await worker.fetch(new Request('https://api.example.test/v1/health', { method: 'DELETE' }));
  eq('a bad method is 405', res.status, 405);
}
{
  const res = await worker.fetch(new Request('https://api.example.test/v1/analyse', { method: 'OPTIONS' }));
  eq('a preflight is 204', res.status, 204);
  eq('a preflight allows any origin', res.headers.get('access-control-allow-origin'), '*');
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
