// RARA's development store.
//
// The collector in scripts/collect-rara-developments.mjs does the fetching: it
// reads arXiv, lab blogs and regulator feeds, and writes the snapshot the site
// ships. This Worker is the other end of that pipe — a D1 table the same
// payload can be pushed into, so the tracker can read the newest collection
// without a rebuild.
//
//   GET  /                 what this is
//   GET  /developments     the newest rows, newest first
//   POST /ingest           the collector's payload, bearer ADMIN_TOKEN
//
// Deploy with workers/rara.wrangler.toml. Without ADMIN_TOKEN the read API
// still works and ingest refuses rather than accepting anonymous writes.

const JSON_TYPE = 'application/json; charset=utf-8';

const originOf = (env) => env.ALLOWED_ORIGIN || '*';

// A response carries one allowed origin, but a deployment may need several —
// the live site, a workers.dev address before the domain lands, and localhost
// during development. ALLOWED_ORIGIN takes a comma-separated list; this picks
// the one that matches the caller and leaves everything else on the first
// entry, so the header is never widened to a wildcard.
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

const json = (body, status, env) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: headers(env) });

const failure = (status, code, message, env) => json({ error: { code, message } }, status, env);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS developments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT NOT NULL,
    published_at TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_label TEXT,
    source_type TEXT,
    tier TEXT,
    city TEXT,
    country TEXT,
    iso TEXT,
    topics TEXT NOT NULL DEFAULT '[]',
    fetched_at TEXT,
    seen_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS developments_published ON developments(published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS developments_source ON developments(source_id)`,
  `CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generated_at TEXT,
    received_at TEXT NOT NULL,
    window_days INTEGER,
    items INTEGER,
    primary_items INTEGER,
    sources TEXT
  )`,
];

let schemaReady = null;
const ready = (db) => {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of SCHEMA) await db.prepare(statement).run();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
};

const authorised = (request, env) => {
  if (!env.ADMIN_TOKEN) return false;
  return request.headers.get('authorization') === `Bearer ${env.ADMIN_TOKEN}`;
};

const readJson = async (request, limit = 4_000_000) => {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > limit) {
    const error = new Error('That payload is too large.');
    error.status = 413;
    throw error;
  }
  const raw = await request.text();
  if (raw.length > limit) {
    const error = new Error('That payload is too large.');
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

const cleanText = (value, max) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const httpUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const rowFor = (item, seenAt) => {
  const url = httpUrl(item.url);
  if (!url || !item.publishedAt || !item.id) return null;
  const place = item.place || {};
  return {
    id: cleanText(item.id, 120),
    title: cleanText(item.title, 400),
    summary: cleanText(item.summary, 1200),
    url,
    published_at: cleanText(item.publishedAt, 40),
    source_id: cleanText(item.sourceId, 60),
    source_label: cleanText(item.sourceLabel, 120),
    source_type: cleanText(item.sourceType, 30),
    tier: item.tier === 'secondary' ? 'secondary' : 'primary',
    city: cleanText(place.city, 80) || null,
    country: cleanText(place.country, 80) || null,
    iso: /^[A-Z]{2}$/.test(place.iso || '') ? place.iso : null,
    topics: JSON.stringify(
      Array.isArray(item.topics) ? item.topics.filter((t) => typeof t === 'string').slice(0, 10) : [],
    ),
    fetched_at: cleanText(item.fetchedAt, 40) || null,
    seen_at: seenAt,
  };
};

const UPSERT = `INSERT INTO developments (
  id, title, summary, url, published_at, source_id, source_label, source_type,
  tier, city, country, iso, topics, fetched_at, seen_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  published_at = excluded.published_at,
  source_type = excluded.source_type,
  tier = excluded.tier,
  city = excluded.city,
  country = excluded.country,
  iso = excluded.iso,
  topics = excluded.topics,
  fetched_at = excluded.fetched_at,
  seen_at = excluded.seen_at`;

const ingest = async (request, env) => {
  const body = await readJson(request);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return failure(400, 'empty', 'The payload carries no items.', env);

  const seenAt = new Date().toISOString();
  const rows = items.map((item) => rowFor(item, seenAt)).filter(Boolean);
  if (!rows.length) return failure(422, 'unusable', 'No item had an id, a date and an http URL.', env);

  const statements = rows.map((row) =>
    env.DB.prepare(UPSERT).bind(
      row.id, row.title, row.summary, row.url, row.published_at, row.source_id,
      row.source_label, row.source_type, row.tier, row.city, row.country, row.iso,
      row.topics, row.fetched_at, row.seen_at,
    ),
  );

  const sources = Array.isArray(body.sources) ? body.sources : [];
  statements.push(
    env.DB.prepare(
      `INSERT INTO runs (generated_at, received_at, window_days, items, primary_items, sources)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      cleanText(body.generatedAt, 40) || null,
      seenAt,
      Number(body.windowDays) || null,
      rows.length,
      rows.filter((row) => row.tier === 'primary').length,
      JSON.stringify(sources.map((source) => ({
        id: cleanText(source.id, 60),
        label: cleanText(source.label, 120),
        ok: Boolean(source.ok),
        count: Number(source.count) || 0,
        // Health travels with the run. Dropping these made a failed source
        // read as `ok: false` with no reason, and a half-answered one look
        // identical to a quiet week.
        ...(source.error ? { error: cleanText(source.error, 240) } : {}),
        ...(Array.isArray(source.partial) && source.partial.length
          ? {
              partial: source.partial.slice(0, 6).map((entry) => ({
                id: cleanText(entry.id, 60),
                error: cleanText(entry.error, 120),
              })),
            }
          : {}),
      }))),
    ),
  );

  await env.DB.batch(statements);
  return json({ stored: rows.length, skipped: items.length - rows.length, receivedAt: seenAt }, 200, env);
};

const readDevelopments = async (request, env) => {
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 200));
  const tier = url.searchParams.get('tier');
  const where = tier === 'primary' || tier === 'secondary' ? 'WHERE tier = ?' : '';
  const statement = env.DB.prepare(
    `SELECT * FROM developments ${where} ORDER BY published_at DESC LIMIT ?`,
  );
  const bound = tier === 'primary' || tier === 'secondary'
    ? statement.bind(tier, limit)
    : statement.bind(limit);
  const [rows, run] = await Promise.all([
    bound.all(),
    env.DB.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 1').first(),
  ]);

  let runSources = [];
  try {
    runSources = JSON.parse(run?.sources || '[]');
  } catch {
    runSources = [];
  }

  return json({
    generatedAt: run?.generated_at || null,
    receivedAt: run?.received_at || null,
    sources: runSources,
    items: (rows.results || []).map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      url: row.url,
      publishedAt: row.published_at,
      sourceId: row.source_id,
      sourceLabel: row.source_label,
      sourceType: row.source_type,
      tier: row.tier,
      place: row.iso ? { city: row.city, country: row.country, iso: row.iso } : null,
      topics: JSON.parse(row.topics || '[]'),
      fetchedAt: row.fetched_at,
      seenAt: row.seen_at,
    })),
    run: run ? { ...run, sources: undefined } : null,
  }, 200, env);
};

export default {
  async fetch(request, env) {
    env = withOrigin(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(env) });

    const url = new URL(request.url);
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return json({
          name: 'RARA development store',
          version: 'rara-1',
          routes: ['GET /developments?limit=&tier=', 'POST /ingest'],
          ingestConfigured: Boolean(env.ADMIN_TOKEN),
        }, 200, env);
      }

      if (url.pathname === '/developments' && request.method === 'GET') {
        await ready(env.DB);
        return await readDevelopments(request, env);
      }

      if (url.pathname === '/ingest' && request.method === 'POST') {
        if (!authorised(request, env)) {
          return failure(401, 'unauthorised', 'Ingest requires a bearer token.', env);
        }
        await ready(env.DB);
        return await ingest(request, env);
      }

      return failure(404, 'not-found', 'No such route.', env);
    } catch (error) {
      console.error('rara-worker', error?.stack || error);
      return failure(error?.status || 500, 'failed', error?.message || 'The request failed.', env);
    }
  },
};
