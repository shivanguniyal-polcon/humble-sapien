// The fetcher's schema. D1 is SQLite, so this is SQLite: one row per
// instrument version, one row per queued extraction, a standalone FTS5 table
// kept in step by the store, and two small usage tables for the OCR endpoint.
//
// Versions are keyed on the PDF's sha256. A master direction that is
// re-issued under the same URL is a new row, not an overwrite, so the
// library can show what changed.

export const SCHEMA_VERSION = 'monitor-2';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS instruments (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  title TEXT NOT NULL,
  ref_no TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  pages INTEGER,
  text_status TEXT NOT NULL DEFAULT 'pending',
  text TEXT,
  text_hash TEXT,
  duties TEXT NOT NULL DEFAULT '[]',
  sentences TEXT NOT NULL DEFAULT '{}',
  empty_pages TEXT NOT NULL DEFAULT '[]',
  ocr_model TEXT,
  listing_fingerprint TEXT,
  etag TEXT,
  last_modified TEXT
);
CREATE INDEX IF NOT EXISTS instruments_source ON instruments(source, published_at DESC, fetched_at DESC);
CREATE INDEX IF NOT EXISTS instruments_pdf_url ON instruments(pdf_url);

CREATE TABLE IF NOT EXISTS extraction_queue (
  instrument_id TEXT PRIMARY KEY,
  queued_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS queue_state ON extraction_queue(state, queued_at);

CREATE VIRTUAL TABLE IF NOT EXISTS instruments_fts USING fts5(
  instrument_id UNINDEXED,
  title,
  ref_no,
  body,
  tokenize = 'unicode61'
);

CREATE TABLE IF NOT EXISTS fetch_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  seen INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  unchanged INTEGER NOT NULL DEFAULT 0,
  errors TEXT
);

CREATE TABLE IF NOT EXISTS ocr_usage (
  day TEXT NOT NULL,
  ip TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, ip)
);

CREATE TABLE IF NOT EXISTS ocr_global_usage (
  day TEXT PRIMARY KEY,
  pages INTEGER NOT NULL DEFAULT 0
);
`;

export const SCHEMA_STATEMENTS = SCHEMA.split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

// D1's exec() splits multi-line input differently from SQLite's, so the
// schema is applied one statement at a time. Each statement is a complete
// CREATE, which SQLite accepts as DDL and D1 accepts as a prepared query.
export const ensureSchema = async (db) => {
  for (const statement of SCHEMA_STATEMENTS) await db.prepare(statement).run();
};
