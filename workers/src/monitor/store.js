// The library in D1.
//
// Every function takes a D1-shaped `db` (prepare/bind/first/all/run) and does
// one thing, so the same code runs in a Worker, in the local runner and in
// the tests. Nothing here knows about HTTP or PDFs.

const statement = (db, sql, ...args) => db.prepare(sql).bind(...args);

export const insertInstrument = async (db, record) => {
  const existing = await statement(db, 'SELECT id FROM instruments WHERE sha256 = ?', record.sha256).first();
  if (existing) return { id: existing.id, added: false };
  await statement(
    db,
    `INSERT INTO instruments
      (id, source, source_url, pdf_url, title, ref_no, published_at, fetched_at,
       sha256, bytes, r2_key, pages, text_status, text, text_hash, duties,
       empty_pages, ocr_model, listing_fingerprint)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL, NULL, '[]', '[]', NULL, ?)`,
    record.sha256,
    record.source,
    record.sourceUrl,
    record.pdfUrl,
    record.title,
    record.refNo || null,
    record.publishedAt || null,
    record.fetchedAt,
    record.sha256,
    record.bytes,
    record.r2Key,
    record.listingFingerprint || null,
  ).run();
  await refreshFts(db, record.sha256);
  return { id: record.sha256, added: true };
};

// The full-text row carries the instrument id, its title and reference, and
// the extracted text. It is replaced whole on every change: FTS5 has no
// cheap in-place update, and the documents are small.
const refreshFts = async (db, id) => {
  const row = await statement(db, 'SELECT id, title, ref_no, text FROM instruments WHERE id = ?', id).first();
  if (!row) return;
  await statement(db, 'DELETE FROM instruments_fts WHERE instrument_id = ?', id).run();
  await statement(
    db,
    'INSERT INTO instruments_fts (instrument_id, title, ref_no, body) VALUES (?, ?, ?, ?)',
    id,
    row.title || '',
    row.ref_no || '',
    row.text || '',
  ).run();
};

export const latestByPdfUrl = (db, pdfUrl) =>
  statement(db, 'SELECT * FROM instruments WHERE pdf_url = ? ORDER BY fetched_at DESC LIMIT 1', pdfUrl).first();

export const latestBySourceUrl = (db, sourceUrl) =>
  statement(db, 'SELECT * FROM instruments WHERE source_url = ? ORDER BY fetched_at DESC LIMIT 1', sourceUrl).first();

export const getInstrument = (db, id) =>
  statement(db, 'SELECT * FROM instruments WHERE id = ?', id).first();

export const saveExtraction = async (db, id, { pages, text, textHash, duties, sentences, emptyPages, status, ocrModel = null }) => {
  await statement(
    db,
    `UPDATE instruments SET pages = ?, text = ?, text_hash = ?, duties = ?, sentences = ?, empty_pages = ?,
       text_status = ?, ocr_model = ? WHERE id = ?`,
    pages,
    text,
    textHash,
    JSON.stringify(duties || []),
    JSON.stringify(sentences || {}),
    JSON.stringify(emptyPages || []),
    status,
    ocrModel,
    id,
  ).run();
  await refreshFts(db, id);
};

export const enqueue = async (db, id, now) => {
  await statement(
    db,
    `INSERT INTO extraction_queue (instrument_id, queued_at, state, attempts)
     VALUES (?, ?, 'pending', 0)
     ON CONFLICT(instrument_id) DO UPDATE SET state = 'pending', queued_at = excluded.queued_at
     WHERE extraction_queue.state IN ('failed')`,
    id,
    now,
  ).run();
};

// Claim one row by moving it to running. Two callers can race; the second
// update changes nothing, so the caller that sees no row moves on.
export const claimNext = async (db, now) => {
  const row = await statement(
    db,
    `SELECT instrument_id FROM extraction_queue
     WHERE state = 'pending' AND attempts < 3 AND queued_at <= ?
     ORDER BY queued_at LIMIT 1`,
    now,
  ).first();
  if (!row) return null;
  const claimed = await statement(
    db,
    `UPDATE extraction_queue SET state = 'running', attempts = attempts + 1
     WHERE instrument_id = ? AND state = 'pending'`,
    row.instrument_id,
  ).run();
  const changes = claimed?.meta?.changes ?? claimed?.changes ?? 0;
  return changes ? row.instrument_id : null;
};

export const markDone = (db, id) =>
  statement(db, `UPDATE extraction_queue SET state = 'done', last_error = NULL WHERE instrument_id = ?`, id).run();

export const markFailed = (db, id, message, now) =>
  statement(
    db,
    `UPDATE extraction_queue
     SET state = CASE WHEN attempts < 3 THEN 'pending' ELSE 'failed' END,
         last_error = ?, queued_at = ?
     WHERE instrument_id = ?`,
    String(message || 'extraction failed').slice(0, 500),
    now,
    id,
  ).run();

export const startRun = async (db, source, now) => {
  const result = await statement(
    db,
    'INSERT INTO fetch_runs (source, started_at, errors) VALUES (?, ?, NULL)',
    source,
    now,
  ).run();
  return result?.meta?.last_row_id ?? result?.lastInsertRowid ?? null;
};

export const finishRun = (db, id, { seen, added, unchanged, errors }, now = new Date().toISOString()) => {
  if (id == null) return Promise.resolve();
  return statement(
    db,
    `UPDATE fetch_runs SET finished_at = ?, seen = ?, added = ?, unchanged = ?, errors = ?
     WHERE id = ?`,
    now,
    seen,
    added,
    unchanged,
    errors.length ? JSON.stringify(errors).slice(0, 4000) : null,
    id,
  ).run();
};

export const recent = async (db, limit = 30) => {
  const rows = await statement(
    db,
    `SELECT id, title, ref_no, published_at, source, text_status, pages
     FROM instruments ORDER BY COALESCE(published_at, fetched_at) DESC, fetched_at DESC LIMIT ?`,
    Math.min(Math.max(limit, 1), 100),
  ).all();
  return rows.results || [];
};

export const search = async (db, query, limit = 30) => {
  const clean = String(query || '').replace(/["*()]/g, ' ').trim();
  if (!clean) return [];
  const rows = await statement(
    db,
    `SELECT i.id, i.title, i.ref_no, i.published_at, i.source, i.text_status,
            snippet(instruments_fts, 3, '', '', '…', 18) AS snippet
     FROM instruments_fts
     JOIN instruments i ON i.id = instruments_fts.instrument_id
     WHERE instruments_fts MATCH ?
     ORDER BY rank LIMIT ?`,
    clean,
    Math.min(Math.max(limit, 1), 100),
  ).all();
  return rows.results || [];
};

export const stats = async (db) => {
  const counts = await statement(
    db,
    `SELECT text_status, COUNT(*) AS n FROM instruments GROUP BY text_status`,
  ).all();
  const queue = await statement(
    db,
    `SELECT state, COUNT(*) AS n FROM extraction_queue GROUP BY state`,
  ).all();
  const runs = await statement(
    db,
    'SELECT COUNT(*) AS n, MAX(finished_at) AS last FROM fetch_runs',
  ).first();
  const instruments = (counts.results || []).reduce((sum, row) => sum + row.n, 0);
  return {
    instruments,
    byStatus: Object.fromEntries((counts.results || []).map((row) => [row.text_status, row.n])),
    queue: Object.fromEntries((queue.results || []).map((row) => [row.state, row.n])),
    runs: runs?.n || 0,
    lastRun: runs?.last || null,
  };
};

// One OCR attempt per page per IP per day, capped. The read is not atomic
// with the write, which is acceptable for a small free allowance: the worst
// case is a few extra pages, never a negative or unbounded count.
export const takeOcrSlot = async (db, { day, ip, limit = 5 }) => {
  const row = await statement(db, 'SELECT pages FROM ocr_usage WHERE day = ? AND ip = ?', day, ip).first();
  const used = row?.pages || 0;
  if (used >= limit) return { allowed: false, used, limit };
  await statement(
    db,
    `INSERT INTO ocr_usage (day, ip, pages) VALUES (?, ?, 1)
     ON CONFLICT(day, ip) DO UPDATE SET pages = pages + 1`,
    day,
    ip,
  ).run();
  return { allowed: true, used: used + 1, limit };
};

// A failed provider call should not cost the reader a page of the day's
// allowance. The count never goes below zero.
export const releaseOcrSlot = (db, { day, ip }) =>
  statement(
    db,
    'UPDATE ocr_usage SET pages = MAX(pages - 1, 0) WHERE day = ? AND ip = ?',
    day,
    ip,
  ).run();
