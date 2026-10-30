// The regulatory monitor's API and twice-daily fetcher.
//
// One Worker, three jobs:
//   - a cron that discovers new RBI instruments and queues them;
//   - a queue drain that extracts text and duties with the same rules as the
//     browser;
//   - a small read API the monitor page can search, plus an OCR endpoint for
//     scanned pages.
//
// Bindings (see monitor.wrangler.toml): DB (D1), FILES (R2). Secrets:
// ADMIN_TOKEN for the manual trigger, REPLICATE_API_TOKEN (or the OCR_* pair)
// for OCR. Without them the read API still works and OCR says so.

import { SCHEMA_VERSION, ensureSchema } from './src/monitor/schema.js';
import {
  getInstrument, recent, releaseOcrSlot, search, stats, takeOcrSlot,
} from './src/monitor/store.js';
import { FETCHER_VERSION, SOURCES, drainQueue, runFetch } from './src/monitor/fetch.js';
import {
  OCR_VERSION, ocrProviderConfigured, provenanceOf, readPage, storePage,
} from './src/monitor/ocr.js';
import { sha256Hex } from './src/monitor/extract.js';
import { API_VERSION, OCR_LIMIT_PER_DAY } from './src/monitor/config.js';

const JSON_TYPE = 'application/json; charset=utf-8';

const originOf = (env) => env.ALLOWED_ORIGIN || '*';

// A response carries one allowed origin, but a deployment may need several —
// the live site, a workers.dev address before the domain lands, and localhost
// during development. ALLOWED_ORIGIN takes a comma-separated list; this picks
// the one that matches the caller and leaves everything else on the first
// entry, so the header is never widened to a wildcard. The OCR route below
// compares against the same resolved value, so its check still holds.
const withOrigin = (request, env) => {
  const allowed = String(env.ALLOWED_ORIGIN || '*').split(',').map((value) => value.trim()).filter(Boolean);
  if (!allowed.length || allowed.includes('*')) return env;
  const caller = request.headers.get('origin');
  return { ...env, ALLOWED_ORIGIN: caller && allowed.includes(caller) ? caller : allowed[0] };
};

const headers = (env, extra = {}) => ({
  'content-type': JSON_TYPE,
  'access-control-allow-origin': originOf(env),
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'cache-control': 'no-store',
  ...extra,
});

const json = (body, status, env, extra) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: headers(env, extra) });

const failure = (status, code, message, env) => json({ error: { code, message } }, status, env);

// One schema check per isolate. CREATE IF NOT EXISTS is cheap, but it is not
// free, and the read path is the one a visitor waits on.
let schemaReady = null;
const ready = (db) => {
  if (!schemaReady) schemaReady = ensureSchema(db).catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
};

const readJson = async (request, limit = 3_000_000) => {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > limit) {
    const error = new Error('That request is too large.');
    error.status = 413;
    throw error;
  }
  const raw = await request.text();
  if (raw.length > limit) {
    const error = new Error('That request is too large.');
    error.status = 413;
    throw error;
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    const error = new Error('The body is not valid JSON.');
    error.status = 400;
    throw error;
  }
};

const authorised = (request, env) => {
  if (!env.ADMIN_TOKEN) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${env.ADMIN_TOKEN}`;
};

const INDEX = (env) => ({
  name: 'THS regulatory monitor',
  version: API_VERSION,
  fetcher: FETCHER_VERSION,
  ocr: OCR_VERSION,
  schema: SCHEMA_VERSION,
  sources: SOURCES.map((source) => ({ id: source.id, label: source.label })),
  routes: {
    'GET /': 'this index',
    'GET /v1/health': 'instrument counts, queue depth and the last fetch',
    'GET /v1/instruments': 'recent instruments, or search with ?q=',
    'GET /v1/instruments/:id': 'one instrument with its text, duties and sentences',
    'POST /v1/ocr': 'read one scanned page (rate limited)',
    'POST /v1/admin/fetch': 'manual discovery + drain, requires ADMIN_TOKEN',
  },
  limits: `OCR accepts ${OCR_LIMIT_PER_DAY} pages per address per day and 2 MB per page.`,
  guarantees: [
    'PDFs are stored in R2 and text in D1; nothing is sent to a model except pages you explicitly OCR.',
    'Automatic extraction reads the PDF text layer only. A scan is stored and labelled no-text, never guessed.',
    'The duty rules are the same fixed rules the browser runs. No generative model decides what a duty is.',
  ],
  disclaimer: 'A reading aid, not legal advice and not a compliance certificate. Check every quote against its source.',
});

const instrumentView = (row) => ({
  ...row,
  duties: safeParse(row.duties, []),
  sentences: safeParse(row.sentences, {}),
  empty_pages: safeParse(row.empty_pages, []),
});

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
};

const handle = async (request, env) => {
  if (!env.DB) return failure(503, 'no-database', 'This deployment has no D1 database bound.', env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(env) });

  if (request.method === 'GET' && path === '/') return json(INDEX(env), 200, env);
  if (request.method === 'GET' && path === '/v1/health') {
    await ready(env.DB);
    return json({ status: 'ok', version: API_VERSION, fetcher: FETCHER_VERSION, ...(await stats(env.DB)) }, 200, env);
  }
  if (request.method === 'GET' && path === '/v1/instruments') {
    await ready(env.DB);
    const query = url.searchParams.get('q') || '';
    const limit = Number(url.searchParams.get('limit') || 30);
    const items = query ? await search(env.DB, query, limit) : await recent(env.DB, limit);
    return json({ query, count: items.length, instruments: items }, 200, env);
  }
  if (request.method === 'GET' && path.startsWith('/v1/instruments/')) {
    await ready(env.DB);
    const id = decodeURIComponent(path.slice('/v1/instruments/'.length));
    const row = await getInstrument(env.DB, id);
    if (!row) return failure(404, 'not-found', 'That instrument is not in the library.', env);
    return json(instrumentView(row), 200, env);
  }
  if (request.method === 'POST' && path === '/v1/ocr') {
    await ready(env.DB);
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const requestOrigin = request.headers.get('origin');
    if (allowedOrigin && allowedOrigin !== '*' && requestOrigin && requestOrigin !== allowedOrigin) {
      return failure(403, 'origin', 'This origin is not allowed to call OCR.', env);
    }
    let body;
    try {
      body = await readJson(request, 3_000_000);
    } catch (error) {
      return failure(error.status || 400, 'body', error.message, env);
    }
    if (!ocrProviderConfigured(env)) {
      return failure(503, 'ocr-not-configured', 'OCR is not configured on this deployment.', env);
    }
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    const day = new Date().toISOString().slice(0, 10);
    const slot = await takeOcrSlot(env.DB, { day, ip, limit: OCR_LIMIT_PER_DAY });
    if (!slot.allowed) {
      return failure(429, 'rate-limited', `OCR is limited to ${slot.limit} pages per day here. Try again tomorrow.`, env);
    }
    try {
      const read = await readPage({ env, image: body.image, mediaType: body.mediaType });
      const bytes = Uint8Array.from(atob(body.image), (character) => character.charCodeAt(0));
      const imageSha256 = await sha256Hex(bytes);
      const imageKey = await storePage({
        bucket: env.FILES, env, image: body.image, day, sha256: imageSha256, mediaType: body.mediaType,
      });
      return json({
        text: read.text,
        provenance: provenanceOf({ read, imageSha256, page: Number(body.page) || null, imageKey }),
        used: slot.used,
        limit: slot.limit,
      }, 200, env);
    } catch (error) {
      await releaseOcrSlot(env.DB, { day, ip });
      if (error.code === 'ocr-not-configured') {
        return failure(503, 'ocr-not-configured', 'OCR is not configured on this deployment.', env);
      }
      return failure(502, 'ocr-failed', String(error.message || error).slice(0, 300), env);
    }
  }
  if (request.method === 'POST' && path === '/v1/admin/fetch') {
    await ready(env.DB);
    if (!authorised(request, env)) {
      return failure(env.ADMIN_TOKEN ? 401 : 503, 'admin', env.ADMIN_TOKEN
        ? 'Send the admin token as a bearer token.'
        : 'This deployment has no ADMIN_TOKEN, so the manual trigger is off.', env);
    }
    let body;
    try {
      body = await readJson(request, 20000);
    } catch (error) {
      return failure(error.status || 400, 'body', error.message, env);
    }
    const sources = body.source ? SOURCES.filter((source) => source.id === body.source) : SOURCES;
    if (!sources.length) return failure(400, 'source', 'No such source. See GET / for the list.', env);
    const fetched = await runFetch({
      db: env.DB, bucket: env.FILES, fetch, limit: Math.min(Number(body.limit) || 10, 25), sources,
    });
    const drained = await drainQueue({
      db: env.DB, bucket: env.FILES, limit: Math.min(Number(body.drain) || 0, 10),
    });
    return json({ fetched, drained }, 200, env);
  }
  return failure(404, 'route', 'No such route. GET / lists them.', env);
};

export default {
  async fetch(request, env) {
    env = withOrigin(request, env);
    try {
      return await handle(request, env);
    } catch (error) {
      return failure(500, 'unhandled', String(error?.message || error).slice(0, 300), env);
    }
  },

  async scheduled(event, env, ctx) {
    if (!env.DB || !env.FILES) return;
    // The local scheduled endpoint may not pass the cron string; treat that
    // as the discovery run so `wrangler dev` can exercise the same path.
    const discovery = !event.cron || event.cron.includes('6,18');
    ctx.waitUntil((async () => {
      await ensureSchema(env.DB);
      if (discovery) {
        await runFetch({ db: env.DB, bucket: env.FILES, fetch, now: new Date().toISOString() });
      }
      // Three instruments per run keeps a free-plan invocation inside its
      // CPU budget; a paid plan can raise this. The drain-only trigger runs
      // every six hours so a backlog from a busy week still clears.
      await drainQueue({ db: env.DB, bucket: env.FILES, limit: discovery ? 3 : 5 });
    })());
  },
};
