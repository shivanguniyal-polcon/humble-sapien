// Discovery and extraction.
//
// Twice a day the cron reads two RBI listing pages, compares each row's
// fingerprint against D1, and fetches only what is new or has changed. The
// detail page holds the instrument inline, so that page — not the PDF — is
// what gets stored: the HTML snapshot goes to R2, its hash becomes the row
// id, and an extraction row is queued.
//
// The PDF host (rbidocs.rbi.org.in) sits behind an F5 JavaScript challenge
// that a plain HTTP client cannot pass. The detail pages on www.rbi.org.in
// are served normally, which is why the reader is built on them. The PDF URL
// is still recorded, so a human can open the original; a browser-based
// fetcher can be added later without changing the store.
//
// The fetcher is polite: one request at a time, a 4 MB ceiling, a short
// delay, and no retries on a 4xx.

import {
  enqueue, claimNext, finishRun, getInstrument, insertInstrument, latestBySourceUrl,
  markDone, markFailed, saveExtraction, startRun,
} from './store.js';
import { parseListing, refFromTitle } from './parse.js';
import { readSourcePage, sha256Text } from './extract.js';

export const FETCHER_VERSION = 'monitor-fetch-2';
export const MAX_PAGE_BYTES = 4 * 1024 * 1024;
export const MAX_PER_RUN = 25;
export const USER_AGENT = 'THS-regulatory-monitor/0.1 (public regulatory reading; low volume)';

export const SOURCES = [
  {
    id: 'rbi-notifications',
    label: 'Reserve Bank of India — Notifications',
    listingUrl: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx',
    baseUrl: 'https://www.rbi.org.in/Scripts/',
  },
  {
    id: 'rbi-master-directions',
    label: 'Reserve Bank of India — Master Directions',
    listingUrl: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx',
    baseUrl: 'https://www.rbi.org.in/Scripts/',
  },
];

const pause = (ms) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

const isChallenge = (html) =>
  /bobcmn|TSPD_101|Unauthorised Access|Request Rejected/i.test(String(html || '').slice(0, 20000));

const downloadPage = async (fetchImpl, url, { timeoutMs = 30000, maxBytes = MAX_PAGE_BYTES } = {}) => {
  const response = await fetchImpl(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('page over 4 MB');
  const html = await response.text();
  if (html.length > maxBytes) throw new Error('page over 4 MB');
  if (isChallenge(html)) {
    const error = new Error('the page was a bot challenge, not the instrument');
    error.code = 'waf-challenge';
    throw error;
  }
  if (html.length < 200 || !/<\w+[\s>]/.test(html)) throw new Error('not an HTML page');
  return html;
};

export const fingerprintOf = async (item) =>
  sha256Text(`${item.title}\u0000${item.publishedAt || ''}\u0000${item.pdfUrl || ''}`);

export const runFetch = async ({
  db, bucket, fetch: fetchImpl, now = new Date().toISOString(),
  sources = SOURCES, limit = MAX_PER_RUN, delayMs = 400, maxBytes = MAX_PAGE_BYTES,
}) => {
  const results = [];
  for (const source of sources) {
    const runId = await startRun(db, source.id, now);
    const errors = [];
    let seen = 0;
    let added = 0;
    let unchanged = 0;
    let skipped = 0;
    try {
      const listing = await fetchImpl(source.listingUrl, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
        signal: AbortSignal.timeout(30000),
      });
      if (!listing.ok) throw new Error(`listing HTTP ${listing.status}`);
      const items = parseListing(await listing.text(), { source: source.id, baseUrl: source.baseUrl });
      seen = items.length;
      for (const item of items) {
        if (!item.url) {
          skipped += 1;
          continue;
        }
        const fingerprint = await fingerprintOf(item);
        const known = await latestBySourceUrl(db, item.url);
        if (known && known.listing_fingerprint === fingerprint) {
          unchanged += 1;
          continue;
        }
        if (added >= limit) break;
        try {
          const html = await downloadPage(fetchImpl, item.url, { maxBytes });
          const sha256 = await sha256Text(html);
          if (await getInstrument(db, sha256)) {
            unchanged += 1;
            continue;
          }
          const r2Key = `sources/${sha256}.html`;
          await bucket.put(r2Key, new TextEncoder().encode(html), { httpMetadata: { contentType: 'text/html' } });
          const record = await insertInstrument(db, {
            sha256,
            source: source.id,
            sourceUrl: item.url,
            pdfUrl: item.pdfUrl,
            title: item.title,
            refNo: refFromTitle(item.title),
            publishedAt: item.publishedAt,
            fetchedAt: now,
            bytes: html.length,
            r2Key,
            listingFingerprint: fingerprint,
          });
          if (record.added) {
            added += 1;
            await enqueue(db, record.id, now);
          } else {
            unchanged += 1;
          }
        } catch (error) {
          errors.push({ sourceUrl: item.url, code: error?.code || null, message: String(error?.message || error) });
        }
        await pause(delayMs);
      }
    } catch (error) {
      errors.push({ listing: source.listingUrl, message: String(error?.message || error) });
    }
    await finishRun(db, runId, { seen, added, unchanged, errors }, new Date().toISOString());
    results.push({ source: source.id, seen, added, unchanged, skipped, errors });
  }
  return results;
};

// One item per `page`, because extraction is the part that costs CPU. The
// caller decides how many pages one invocation may take.
export const drainQueue = async ({
  db, bucket, limit = 3, now = new Date().toISOString(), read = readSourcePage,
}) => {
  const out = [];
  for (let i = 0; i < limit; i += 1) {
    const id = await claimNext(db, now);
    if (!id) break;
    const row = await getInstrument(db, id);
    try {
      if (!row) throw new Error('no instrument row');
      const object = await bucket.get(row.r2_key);
      if (!object) throw new Error('source snapshot missing from R2');
      const html = new TextDecoder().decode(new Uint8Array(await object.arrayBuffer()));
      const readOut = await read(row, html, { date: now.slice(0, 10) });
      if (readOut.status === 'no-text') {
        await saveExtraction(db, id, {
          pages: null,
          text: '',
          textHash: null,
          duties: [],
          sentences: {},
          emptyPages: [],
          status: 'no-text',
        });
        await markDone(db, id);
        out.push({ id, status: 'no-text' });
        continue;
      }
      await saveExtraction(db, id, {
        pages: null,
        text: readOut.chunk.text,
        textHash: readOut.chunk.hash,
        duties: readOut.chunk.duties,
        sentences: readOut.chunk.sentences,
        emptyPages: [],
        status: readOut.status,
      });
      await markDone(db, id);
      out.push({ id, status: readOut.status, duties: readOut.chunk.duties.length });
    } catch (error) {
      await markFailed(db, id, error?.message || error, new Date().toISOString());
      out.push({ id, status: 'failed', error: String(error?.message || error) });
    }
  }
  return out;
};
