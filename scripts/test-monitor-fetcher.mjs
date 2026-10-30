// Verification for the regulatory fetcher and the OCR seam.
// Run: node scripts/test-monitor-fetcher.mjs
//
// The parser is tested against excerpts of the live RBI pages, the store
// against a real SQLite (Node's), and the fetcher against a fake network so
// every branch — new, unchanged, not a PDF, failed extraction, retry cap — is
// exercised without depending on rbi.org.in being up.

import { readFile } from 'node:fs/promises';
import { ensureSchema } from '../workers/src/monitor/schema.js';
import { parseDate, parseListing, refFromTitle } from '../workers/src/monitor/parse.js';
import {
  claimNext, enqueue, getInstrument, insertInstrument, latestByPdfUrl,
  saveExtraction, search, stats, takeOcrSlot,
} from '../workers/src/monitor/store.js';
import { drainQueue, runFetch } from '../workers/src/monitor/fetch.js';
import { articleText, looksLikeInstrument } from '../workers/src/monitor/article.js';
import { readSourcePage } from '../workers/src/monitor/extract.js';
import { ocrProviderConfigured, readPage } from '../workers/src/monitor/ocr.js';
import worker from '../workers/monitor-worker.js';
import { API_VERSION } from '../workers/src/monitor/config.js';
import { MemoryBucket, NodeD1 } from './lib/node-d1.mjs';
import { ocrPage } from '../src/lib/monitor/ocr.js';
import { buildMonitorManifest, buildPackMarkdown } from '../src/lib/monitor/pack.js';

let failures = 0;
let checks = 0;
const ok = (name, cond, detail = '') => {
  checks += 1;
  if (cond) console.log(`PASS  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  }
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const section = (title) => console.log(`\n${title}`);

const notifications = await readFile(new URL('../workers/test-fixtures/rbi-notifications.html', import.meta.url), 'utf8');
const directions = await readFile(new URL('../workers/test-fixtures/rbi-master-directions.html', import.meta.url), 'utf8');
const notificationPage = await readFile(new URL('../workers/test-fixtures/rbi-detail-notification.html', import.meta.url), 'utf8');
const directionPage = await readFile(new URL('../workers/test-fixtures/rbi-detail-master-direction.html', import.meta.url), 'utf8');

// ---- the listing parser ---------------------------------------------------

section('listing parser');
eq('a date parses', parseDate('Oct 23, 2026'), '2026-10-23');
eq('a category header is not a date', parseDate('Banker and Debt Manager to Government'), null);
eq('an impossible date is refused', parseDate('Feb 31, 2026'), null);
eq('a reference is not invented from nothing', refFromTitle('Master Direction on Know Your Customer'), null);

const items = parseListing(notifications, { source: 'rbi-notifications' });
ok('notifications yield items', items.length >= 10, String(items.length));
ok('every item carries its date', items.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)));
ok('every item carries the PDF', items.every((item) => /^https:\/\/rbidocs\.rbi\.org\.in\//.test(item.pdfUrl || '')));
ok('the title is decoded', items.some((item) => item.title.includes('–')));
ok('the detail URL is absolute', items.every((item) => item.url.startsWith('https://www.rbi.org.in/Scripts/')));
ok('the PDF size is read', items.every((item) => item.listingBytes > 1000));
ok('dates descend from the newest', items[0].publishedAt === '2026-10-23');

const directionsItems = parseListing(directions, { source: 'rbi-master-directions' });
eq('master directions yield items', directionsItems.length, 2);
eq('the date header applies to the rows under it', directionsItems.map((item) => item.publishedAt), ['2018-07-03', '2016-07-01']);

// ---- the detail page ------------------------------------------------------

section('detail page');
const notificationTitle = 'Reserve Bank of India (Commercial Banks – Forthcoming Instructions) Second Amendment Directions, 2026';
const directionTitle = 'Digital Payments – E-mandate Framework, 2026';
const notificationText = articleText(notificationPage, notificationTitle);
const directionText = articleText(directionPage, directionTitle);
ok('the notification body is found', notificationText.startsWith('Please refer to Chapter IV'), notificationText.slice(0, 80));
ok('the notification body ends with the signatory', /Chief General Manager\s*$/.test(notificationText));
ok('the page furniture is gone', !/Home Notifications|Back to previous page|Website last updated/.test(notificationText));
ok('the master direction body is found', directionText.startsWith('In exercise of the powers'));
ok('the archive years are gone', !/\n2015\s*$/.test(directionText));
ok('both look like instruments', looksLikeInstrument(notificationText) && looksLikeInstrument(directionText));
ok('site chrome is not an instrument', !looksLikeInstrument('Home Notifications Back to previous page'));

const directRead = await readSourcePage({ id: 'x', title: notificationTitle, ref_no: null, published_at: '2026-10-23', source_url: 'u' }, notificationPage);
eq('the detail page reads to duties', directRead.status, 'extracted');
ok('the duties carry their source', directRead.chunk.duties.length > 0 && directRead.chunk.duties.every((duty) => duty.quote));
ok('the chunk is keyed to its text', /^sha256:[0-9a-f]{64}$/.test(directRead.chunk.hash));

// ---- the store ------------------------------------------------------------

section('store');
const db = new NodeD1(':memory:');
await ensureSchema(db);
const base = {
  sha256: 'a'.repeat(64),
  source: 'rbi-notifications',
  sourceUrl: 'https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=1',
  pdfUrl: 'https://rbidocs.rbi.org.in/rdocs/notification/PDFs/ONE.PDF',
  title: 'Master Direction on Testing',
  refNo: 'RBI/2026-27/1',
  publishedAt: '2026-10-23',
  fetchedAt: '2026-10-24T00:00:00.000Z',
  bytes: 1200,
  r2Key: 'sources/one.html',
  listingFingerprint: 'f'.repeat(64),
};
const first = await insertInstrument(db, base);
ok('an instrument is added', first.added === true, JSON.stringify(first));
const duplicate = await insertInstrument(db, base);
ok('the same hash is not added twice', duplicate.added === false && duplicate.id === base.sha256);
ok('the row is readable', (await getInstrument(db, base.sha256)).title === base.title);
ok('it is found by its PDF URL', (await latestByPdfUrl(db, base.pdfUrl)).id === base.sha256);
ok('the new instrument starts pending', (await getInstrument(db, base.sha256)).text_status === 'pending');

await saveExtraction(db, base.sha256, {
  pages: 2,
  text: 'A non-banking financial company shall maintain a register of complaints.',
  textHash: 'sha256:' + 'b'.repeat(64),
  duties: [{ id: 1, quote: 'A non-banking financial company shall maintain a register of complaints.' }],
  sentences: { 1: 'A non-banking financial company shall maintain a register of complaints.' },
  emptyPages: [],
  status: 'extracted',
});
const stored = await getInstrument(db, base.sha256);
ok('the text is stored', /register of complaints/.test(stored.text));
ok('the duties are stored', JSON.parse(stored.duties).length === 1);
ok('the sentences are stored', JSON.parse(stored.sentences)[1].includes('register'));
ok('the status is extracted', stored.text_status === 'extracted');
const hits = await search(db, 'complaints');
eq('full text search finds it', hits.map((hit) => hit.id), [base.sha256]);
ok('the search returns a snippet', typeof hits[0].snippet === 'string');
eq('a search with punctuation does not throw', (await search(db, 'complaints "NBFC"')).length, 0);
eq('an empty search returns nothing', (await search(db, '   ')).length, 0);
ok('stats count the library', (await stats(db)).instruments === 1);

// ---- the queue ------------------------------------------------------------

section('queue');
await enqueue(db, base.sha256, '2026-10-24T00:00:00.000Z');
const claimed = await claimNext(db, '2026-10-24T01:00:00.000Z');
eq('the queue hands out the instrument', claimed, base.sha256);
eq('the queue will not hand it out twice', await claimNext(db, '2026-10-24T01:00:00.000Z'), null);
const attempts = await db.prepare('SELECT attempts, state FROM extraction_queue WHERE instrument_id = ?').bind(base.sha256).first();
eq('the attempt is counted', [attempts.attempts, attempts.state], [1, 'running']);

// ---- the fetcher ----------------------------------------------------------

section('fetcher');
const pageFor = (url) => `${notificationPage}\n<!-- ${url} -->`;
const fakeFetch = async (url) => {
  if (String(url).includes('NotificationUser.aspx?')) return new Response(pageFor(url), { status: 200 });
  if (String(url).includes('NotificationUser.aspx')) return new Response(notifications, { status: 200 });
  if (String(url).includes('BS_ViewMasDirections.aspx?')) return new Response(pageFor(url), { status: 200 });
  if (String(url).includes('BS_ViewMasDirections.aspx')) return new Response(directions, { status: 200 });
  return new Response('not found', { status: 404 });
};
const bucket = new MemoryBucket();
const fresh = new NodeD1(':memory:');
await ensureSchema(fresh);
const run1 = await runFetch({
  db: fresh,
  bucket,
  fetch: fakeFetch,
  now: '2026-10-24T06:00:00.000Z',
  sources: [{ id: 'rbi-notifications', listingUrl: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx', baseUrl: 'https://www.rbi.org.in/Scripts/' }],
  limit: 2,
  delayMs: 0,
});
eq('two new instruments are read', run1[0].added, 2);
eq('the rest are left for the next run', run1[0].seen, items.length);
ok('the source pages are in the bucket', bucket.objects.size === 2);
ok('the snapshots are HTML', [...bucket.objects.keys()].every((key) => key.endsWith('.html')));
ok('the queue has two rows', (await stats(fresh)).queue.pending === 2);
ok('the same source is not read again', (await latestByPdfUrl(fresh, items[0].pdfUrl)) !== null);

const run2 = await runFetch({
  db: fresh,
  bucket,
  fetch: fakeFetch,
  now: '2026-10-24T18:00:00.000Z',
  sources: [{ id: 'rbi-notifications', listingUrl: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx', baseUrl: 'https://www.rbi.org.in/Scripts/' }],
  limit: 5,
  delayMs: 0,
});
ok('the second run adds only what is new', run2[0].added === 5, JSON.stringify(run2[0]));
ok('nothing is added twice', (await stats(fresh)).instruments === 7);

const challengePage = async (url) => {
  if (String(url).includes('NotificationUser.aspx?')) {
    return new Response('<html><script>window["bobcmn"]="x"</script>Request Rejected</html>', { status: 200 });
  }
  if (String(url).includes('NotificationUser.aspx')) return new Response(notifications, { status: 200 });
  return new Response('not found', { status: 404 });
};
const badDb = new NodeD1(':memory:');
await ensureSchema(badDb);
const badRun = await runFetch({
  db: badDb,
  bucket: new MemoryBucket(),
  fetch: challengePage,
  sources: [{ id: 'rbi-notifications', listingUrl: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx', baseUrl: 'https://www.rbi.org.in/Scripts/' }],
  limit: 1,
  delayMs: 0,
  now: '2026-10-24T06:00:00.000Z',
});
eq('a bot challenge is not stored', badRun[0].added, 0);
ok('the challenge is named', badRun[0].errors.some((error) => error.code === 'waf-challenge'));

// ---- extraction -----------------------------------------------------------

section('extraction');
const drained = await drainQueue({
  db: fresh,
  bucket,
  limit: 1,
  now: '2026-10-25T00:00:00.000Z',
  read: async () => ({
    status: 'extracted',
    pages: 1,
    empty: [],
    chunk: {
      text: 'A regulated entity shall maintain a register.',
      hash: 'sha256:' + 'c'.repeat(64),
      duties: [{ id: 1, quote: 'A regulated entity shall maintain a register.' }],
      sentences: { 1: 'A regulated entity shall maintain a register.' },
    },
  }),
});
eq('one instrument is extracted', drained[0].duties, 1);
const extractedRow = await getInstrument(fresh, drained[0].id);
ok('the fetched text is stored', /register/.test(extractedRow.text));
ok('the fetched duties are stored', JSON.parse(extractedRow.duties).length === 1);
ok('the fetched sentences are stored', JSON.parse(extractedRow.sentences)[1].includes('register'));
const queueState = await fresh.prepare('SELECT state FROM extraction_queue WHERE instrument_id = ?').bind(drained[0].id).first();
eq('the queue marks it done', queueState.state, 'done');

const scan = await drainQueue({
  db: fresh,
  bucket,
  limit: 1,
  now: '2026-10-25T01:00:00.000Z',
  read: async () => ({ status: 'no-text', pages: null, empty: [] }),
});
eq('a scan is labelled no-text', (await getInstrument(fresh, scan[0].id)).text_status, 'no-text');

const failure = await drainQueue({
  db: fresh,
  bucket,
  limit: 1,
  now: '2026-10-25T02:00:00.000Z',
  read: async () => { throw new Error('pdf broken'); },
});
eq('a failure is reported', failure[0].error, 'pdf broken');
const errorId = failure[0].id;
const retry = await fresh.prepare('SELECT state, attempts, last_error FROM extraction_queue WHERE instrument_id = ?').bind(errorId).first();
eq('a failure is retried', [retry.state, retry.attempts], ['pending', 1]);
ok('the error is kept', /pdf broken/.test(retry.last_error));

// ---- OCR ------------------------------------------------------------------

section('OCR');
const ocrFetch = (body, status = 200) => async () => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});
const image = Buffer.from('fake-jpeg-bytes').toString('base64');
const replicate = await readPage({
  env: { REPLICATE_API_TOKEN: 'r8_test', OCR_MODEL: 'lucataco/glm-ocr' },
  image,
  fetch: ocrFetch({ status: 'succeeded', output: 'A scanned duty.\nSecond line.', version: 'abc123' }),
});
eq('replicate returns the text', replicate.text, 'A scanned duty.\nSecond line.');
eq('replicate records its model', [replicate.provider, replicate.model, replicate.version], ['replicate', 'lucataco/glm-ocr', 'abc123']);

let sent;
const openai = await readPage({
  env: { OCR_PROVIDER: 'openai', OCR_BASE_URL: 'https://ocr.test/v1/', OCR_MODEL: 'unlimited-ocr', OCR_API_KEY: 'k' },
  image,
  mediaType: 'image/png',
  fetch: async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Page text.' } }] }), { status: 200 });
  },
});
eq('openai-compatible returns the text', openai.text, 'Page text.');
ok('the openai call is a chat completion', sent.url === 'https://ocr.test/v1/chat/completions');
ok('the image is a data URL', sent.body.messages[0].content[1].image_url.url.startsWith('data:image/png;base64,'));

const codeOf = async (promise) => {
  try {
    await promise;
    return 'no-error';
  } catch (error) {
    return error.code || 'unknown';
  }
};
eq('without a token OCR says so', await codeOf(readPage({ env: {}, image, fetch: ocrFetch({}) })), 'ocr-not-configured');
ok('replicate is unconfigured without a token', ocrProviderConfigured({}) === false);
ok('replicate is configured with a token', ocrProviderConfigured({ REPLICATE_API_TOKEN: 'x' }) === true);
ok('openai needs both base and model', ocrProviderConfigured({ OCR_PROVIDER: 'openai', OCR_BASE_URL: 'u' }) === false);
ok('openai is configured with base and model', ocrProviderConfigured({ OCR_PROVIDER: 'openai', OCR_BASE_URL: 'u', OCR_MODEL: 'm' }) === true);
eq('an empty image is refused', await codeOf(readPage({ env: { REPLICATE_API_TOKEN: 'x' }, image: '' })), 'no-image');
eq('a non-base64 image is refused', await codeOf(readPage({
  env: { REPLICATE_API_TOKEN: 'x' },
  image: 'not base64!',
})), 'invalid-image');
eq('an over-padded image is refused', await codeOf(readPage({
  env: { REPLICATE_API_TOKEN: 'x' },
  image: 'aGVsbG8==',
})), 'invalid-image');
eq('an oversized image is refused', await codeOf(readPage({
  env: { REPLICATE_API_TOKEN: 'x' },
  image: 'a'.repeat(3 * 1024 * 1024),
})), 'image-too-large');
eq('a provider failure is an error', await codeOf(readPage({
  env: { REPLICATE_API_TOKEN: 'x' },
  image,
  fetch: ocrFetch({ detail: 'payment required' }, 402),
})), 'unknown');

{
  // The real Replicate path: one POST with `prefer: wait`, so the page comes
  // back with the prediction instead of needing a polling loop.
  const realFetch = globalThis.fetch;
  const sent = [];
  let posted = null;
  let headers = null;
  globalThis.fetch = async (url, init = {}) => {
    sent.push(`${init.method || 'GET'} ${url}`);
    if (init.body) posted = JSON.parse(init.body);
    headers = init.headers || null;
    return new Response(JSON.stringify({ status: 'succeeded', output: ['Every bank', 'shall report.'], version: 'v9' }), { status: 201 });
  };
  let out;
  try {
    out = await readPage({ env: { REPLICATE_API_TOKEN: 'tok', OCR_MODEL: 'lucataco/glm-ocr' }, image });
  } finally {
    globalThis.fetch = realFetch;
  }
  eq('replicate joins a list of lines', out.text, 'Every bank\nshall report.');
  eq('replicate records the version', out.version, 'v9');
  ok('the page is one call to the model endpoint', sent.length === 1 && sent[0] === 'POST https://api.replicate.com/v1/models/lucataco/glm-ocr/predictions', sent.join(' | '));
  ok('the call asks the provider to wait', headers?.prefer === 'wait');
  ok('the image travels as a data URL', String(posted?.input?.image).startsWith('data:image/jpeg;base64,'), JSON.stringify(posted).slice(0, 120));
}

const usage = new NodeD1(':memory:');
await ensureSchema(usage);
const slots = [];
for (let i = 0; i < 3; i += 1) slots.push(await takeOcrSlot(usage, { day: '2026-10-24', ip: '1.2.3.4', limit: 2 }));
eq('the OCR allowance stops at the limit', slots.map((slot) => slot.allowed), [true, true, false]);
ok('the limit is reported', slots[2].limit === 2 && slots[2].used === 2);

const concurrent = await Promise.all(
  Array.from({ length: 10 }, () => takeOcrSlot(usage, { day: '2026-10-25', ip: '5.6.7.8', limit: 3 })),
);
eq('concurrent requests admit only the limit', concurrent.filter((slot) => slot.allowed).length, 3);
const concurrentRow = await usage.prepare('SELECT pages FROM ocr_usage WHERE day = ? AND ip = ?').bind('2026-10-25', '5.6.7.8').first();
eq('concurrent requests write only the limit', concurrentRow.pages, 3);
const afterConcurrent = await takeOcrSlot(usage, { day: '2026-10-25', ip: '5.6.7.8', limit: 3 });
eq('the request after the limit is refused', afterConcurrent.allowed, false);
eq('the refusal names the per-IP limit', afterConcurrent.reason, 'ip');

const globalSlots = await Promise.all(
  Array.from({ length: 10 }, (_, i) => takeOcrSlot(usage, {
    day: '2026-10-26', ip: `10.0.0.${i}`, limit: 5, dailyLimit: 3,
  })),
);
eq('the global ceiling admits only its limit', globalSlots.filter((slot) => slot.allowed).length, 3);
const globalRow = await usage.prepare('SELECT pages FROM ocr_global_usage WHERE day = ?').bind('2026-10-26').first();
eq('the global ceiling writes only its limit', globalRow.pages, 3);
const globalDenied = await takeOcrSlot(usage, {
  day: '2026-10-26', ip: '10.0.0.99', limit: 5, dailyLimit: 3,
});
eq('a fresh IP is refused when the global ceiling is spent', globalDenied.allowed, false);
eq('the refusal names the global ceiling', globalDenied.reason, 'global');
const globalDeniedLocal = await usage.prepare('SELECT pages FROM ocr_usage WHERE day = ? AND ip = ?')
  .bind('2026-10-26', '10.0.0.99').first();
eq('a global refusal returns the per-IP slot', globalDeniedLocal.pages, 0);

const sharedDay = '2026-10-27';
await takeOcrSlot(usage, { day: sharedDay, ip: '192.0.2.1', limit: 1, dailyLimit: 2 });
const sameIpAgain = await takeOcrSlot(usage, { day: sharedDay, ip: '192.0.2.1', limit: 1, dailyLimit: 2 });
eq('a per-IP refusal is not admitted', sameIpAgain.allowed, false);
eq('a per-IP refusal does not read the global counter', sameIpAgain.global, null);
const sharedGlobalRow = await usage.prepare('SELECT pages FROM ocr_global_usage WHERE day = ?').bind(sharedDay).first();
eq('a per-IP refusal leaves the global counter alone', sharedGlobalRow.pages, 1);
const otherIp = await takeOcrSlot(usage, { day: sharedDay, ip: '192.0.2.2', limit: 1, dailyLimit: 2 });
eq('another address can use the global slot', otherIp.allowed, true);
eq('the global counter is still exact', otherIp.global, 2);

// ---- the browser OCR client ----------------------------------------------

section('OCR client');
let ocrRequest;
const client = await ocrPage({
  api: 'https://api.test',
  image: 'data:image/jpeg;base64,Zm9v',
  page: 2,
  fetch: async (url, init) => {
    ocrRequest = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ text: 'Page two.', provenance: { page: 2, model: 'glm-ocr' }, used: 1, limit: 5 }), { status: 200 });
  },
});
eq('the client strips the data prefix', ocrRequest.body.image, 'Zm9v');
eq('the client posts the page number', ocrRequest.body.page, 2);
eq('the client returns the text', client.text, 'Page two.');
eq('the client returns the provenance', client.provenance.model, 'glm-ocr');
const rateLimited = await (async () => {
  try {
    await ocrPage({
      api: 'https://api.test',
      image: 'Zm9v',
      fetch: async () => new Response(JSON.stringify({ error: { code: 'rate-limited' } }), { status: 429 }),
    });
    return null;
  } catch (error) {
    return error;
  }
})();
ok('a rate limit is explained', /daily OCR allowance/.test(rateLimited.message));
eq('a rate limit keeps its code', rateLimited.code, 'rate-limited');
const globalLimited = await (async () => {
  try {
    await ocrPage({
      api: 'https://api.test',
      image: 'Zm9v',
      fetch: async () => new Response(JSON.stringify({
        error: { code: 'rate-limited', message: 'OCR has reached its daily ceiling for this deployment.' },
      }), { status: 429 }),
    });
    return null;
  } catch (error) {
    return error;
  }
})();
ok('the global ceiling reason reaches the reader', /daily ceiling/.test(globalLimited.message), globalLimited.message);
const unconfigured = await (async () => {
  try {
    await ocrPage({ api: '', image: 'Zm9v' });
    return null;
  } catch (error) {
    return error.code;
  }
})();
eq('an unconfigured client refuses', unconfigured, 'not-configured');

// ---- OCR provenance in the pack ------------------------------------------

section('OCR provenance');
const ocrEntries = [{
  page: 2,
  provider: 'replicate',
  model: 'lucataco/glm-ocr',
  version: 'abc123',
  imageSha256: 'd'.repeat(64),
  imageKey: null,
}];
const instrument = { hash: 'sha256:' + 'e'.repeat(64), refNo: 'RBI/1', date: '2026-10-23' };
const plainManifest = await buildMonitorManifest({ instrument, profile: { entityType: 'NBFC' }, rows: [], review: {} });
const ocrManifest = await buildMonitorManifest({ instrument, profile: { entityType: 'NBFC' }, rows: [], review: {}, ocr: ocrEntries });
ok('OCR changes the parameter hash', plainManifest.paramHash !== ocrManifest.paramHash);
const markdown = buildPackMarkdown({
  instrument, profile: { entityType: 'NBFC' }, rows: [], review: {}, manifest: ocrManifest, ocr: ocrEntries,
});
ok('the pack names the machine-read page', /## Machine-read pages/.test(markdown) && /Page 2 — replicate/.test(markdown));
ok('the pack carries the model version', /lucataco\/glm-ocr · abc123/.test(markdown));
ok('the pack says to check the image', /check it against the page image/i.test(markdown));

// ---- the Worker -----------------------------------------------------------

section('worker');
const workerDb = new NodeD1(':memory:');
await ensureSchema(workerDb);
const env = { DB: workerDb, FILES: new MemoryBucket(), ALLOWED_ORIGIN: '*' };
const health = await worker.fetch(new Request('http://api.test/v1/health'), env);
eq('health is 200', health.status, 200);
const healthBody = await health.json();
eq('health names the version', healthBody.version, API_VERSION);
eq('health reports no instruments', healthBody.instruments, 0);
const index = await (await worker.fetch(new Request('http://api.test/'), env)).json();
ok('the index lists the sources', index.sources.length === 2);
ok('the index states the limits', /pages per address per day/.test(index.limits));
const missing = await worker.fetch(new Request('http://api.test/v1/instruments/nope'), env);
eq('a missing instrument is 404', missing.status, 404);
const noAdmin = await worker.fetch(new Request('http://api.test/v1/admin/fetch', { method: 'POST', body: '{}' }), env);
eq('the admin trigger is off without a token', noAdmin.status, 503);

const ocrDb = new NodeD1(':memory:');
await ensureSchema(ocrDb);
const ocrEnv = { DB: ocrDb, FILES: new MemoryBucket(), ALLOWED_ORIGIN: '*', REPLICATE_API_TOKEN: 'r8_test' };
const realFetch = globalThis.fetch;
const realError = console.error;
globalThis.fetch = ocrFetch({ detail: 'payment required' }, 402);
console.error = () => {};
const ocrStatuses = [];
try {
  for (let i = 0; i < 6; i += 1) {
    const response = await worker.fetch(new Request('http://api.test/v1/ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
      body: JSON.stringify({ image: 'aGVsbG8=', mediaType: 'image/jpeg' }),
    }), ocrEnv);
    ocrStatuses.push(response.status);
  }
} finally {
  globalThis.fetch = realFetch;
  console.error = realError;
}
const ocrRow = await ocrDb.prepare('SELECT pages FROM ocr_usage WHERE ip = ?')
  .bind('203.0.113.9').first();
eq('a failed provider call is a 502', ocrStatuses[0], 502);
eq('a failed provider call still spends the page', ocrRow.pages, 5);
eq('the sixth failing page is refused', ocrStatuses[5], 429);
const oversized = await worker.fetch(new Request('http://api.test/v1/ocr', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
  body: JSON.stringify({ image: 'a'.repeat(2_800_000), mediaType: 'image/jpeg' }),
}), ocrEnv);
eq('an oversized page is refused before the quota', oversized.status, 413);
const afterOversized = await ocrDb.prepare('SELECT pages FROM ocr_usage WHERE ip = ?')
  .bind('203.0.113.9').first();
eq('an oversized page does not spend a slot', afterOversized.pages, 5);
const malformed = await worker.fetch(new Request('http://api.test/v1/ocr', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
  body: JSON.stringify({ image: 'not base64!', mediaType: 'image/jpeg' }),
}), ocrEnv);
eq('a malformed page is refused before the quota', malformed.status, 400);
const afterMalformed = await ocrDb.prepare('SELECT pages FROM ocr_usage WHERE ip = ?')
  .bind('203.0.113.9').first();
eq('a malformed page does not spend a slot', afterMalformed.pages, 5);
const afterMalformedGlobal = await ocrDb.prepare('SELECT pages FROM ocr_global_usage').first();
eq('a malformed page does not spend the global slot', afterMalformedGlobal.pages, 5);

const globalDb = new NodeD1(':memory:');
await ensureSchema(globalDb);
const globalEnv = {
  DB: globalDb,
  FILES: new MemoryBucket(),
  ALLOWED_ORIGIN: '*',
  REPLICATE_API_TOKEN: 'r8_test',
  OCR_GLOBAL_LIMIT_PER_DAY: '1',
};
globalThis.fetch = ocrFetch({ detail: 'payment required' }, 402);
console.error = () => {};
let firstGlobal;
let secondGlobal;
try {
  firstGlobal = await worker.fetch(new Request('http://api.test/v1/ocr', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.1' },
    body: JSON.stringify({ image: 'aGVsbG8=', mediaType: 'image/jpeg' }),
  }), globalEnv);
  secondGlobal = await worker.fetch(new Request('http://api.test/v1/ocr', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.2' },
    body: JSON.stringify({ image: 'aGVsbG8=', mediaType: 'image/jpeg' }),
  }), globalEnv);
} finally {
  globalThis.fetch = realFetch;
  console.error = realError;
}
eq('the first global request reaches the provider', firstGlobal.status, 502);
eq('a fresh IP is refused at the global ceiling', secondGlobal.status, 429);
const globalRouteRow = await globalDb.prepare('SELECT pages FROM ocr_global_usage WHERE day = ?')
  .bind(new Date().toISOString().slice(0, 10)).first();
eq('the global route counter reads one', globalRouteRow.pages, 1);
const secondIpRow = await globalDb.prepare('SELECT pages FROM ocr_usage WHERE ip = ?')
  .bind('198.51.100.2').first();
eq('a global refusal returns the fresh IP slot', secondIpRow.pages, 0);

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
