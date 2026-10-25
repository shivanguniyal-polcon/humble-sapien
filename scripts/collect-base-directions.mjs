// Collect the base directions the amendment graph needs.
//
// For every base named by the pinned amendments, this reads the RBI Master
// Directions listing, opens the direction's own history page, and takes the
// version in force immediately before the first amendment in this library.
// The current consolidated text is not used when a historical version exists:
// it may already contain the amendment being diffed.
//
// Raw HTML is kept under private/ for audit. The extracted text is written to
// private/verification/2026-10-22-rbi-precision-test/base-directions.jsonl,
// which build-monitor-data.mjs ingests as base instruments.
//
// Run: node scripts/collect-base-directions.mjs
//      node scripts/collect-base-directions.mjs --force   # refetch raw pages

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parseListing, parseDate, textOf } from '../workers/src/monitor/parse.js';
import { articleText, looksLikeInstrument } from '../workers/src/monitor/article.js';
import { htmlToText } from '../src/lib/monitor/text.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const plan = JSON.parse(readFileSync(join(root, 'src/data/monitor/collection.json'), 'utf8'));
const corpusDir = join(root, 'private/verification/2026-10-22-rbi-precision-test');
const pageDir = join(corpusDir, 'base-pages');
const outPath = join(corpusDir, 'base-directions.jsonl');
const force = process.argv.includes('--force');
const UA = 'THS-regulatory-monitor/0.1 (public regulatory reading; low volume)';
const BASE = 'https://www.rbi.org.in/Scripts/';

mkdirSync(pageDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const cleanTitle = (value) =>
  String(value || '').replace(/\s*\(Updated as on [^)]+\)\s*$/i, '').replace(/\s+/g, ' ').trim();
const refFrom = (text) => {
  const hit = String(text || '').match(/\bRBI\/[^\s]*\d[^\s]*/i);
  return hit ? hit[0].replace(/[.,;:]+$/, '') : null;
};
const dateOfLabel = (label) => parseDate(String(label || '').replace(/^Updated as on\s+/i, ''));

// A master direction repeats its own title in cross-references, so cutting at
// the second title occurrence can land in the middle of a definition. The
// version banner is the reliable head: everything after it is the instrument.
const baseText = (html, title) => {
  const full = htmlToText(html);
  const marker = full.search(/\(Updated as on [^)]+\)/i);
  let start = marker >= 0 && marker <= 50000 ? marker : -1;
  if (start < 0) {
    // The original 2025 issue has no version banner. Its first reference line
    // is the head of the instrument, immediately before the title and index.
    const ref = full.search(/\bRBI\/[^\s]*\d/);
    if (ref >= 0 && ref <= 50000) start = ref;
  }
  if (start < 0) return articleText(html, title);
  let body = full.slice(start);
  const footer = /\n(?:Top\b|Back to previous page\b|More Links\s*:|Website last updated date\b|Supports: )/.exec(body);
  if (footer && footer.index > 0) body = body.slice(0, footer.index);
  return body.trim();
};

const get = async (url) => {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(45000),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const html = await response.text();
  if (html.length < 500) throw new Error(`short page for ${url}`);
  return html;
};

const pagePath = (id, hist) => join(pageDir, `${id}-${hist || 'current'}.html`);
const readPage = async (url, id, hist) => {
  const path = pagePath(id, hist);
  if (!force && existsSync(path)) return readFileSync(path, 'utf8');
  const html = await get(url);
  writeFileSync(path, html);
  await sleep(400);
  return html;
};

const historyOf = (html) =>
  [...String(html || '').matchAll(/href=NotificationPreVersion\.aspx\?id=(\d+)&Histid=(\d+)>\s*([^<]+)<\/a>/gi)]
    .map((match) => ({ id: Number(match[1]), hist: Number(match[2]), label: match[3].trim(), date: dateOfLabel(match[3]) }))
    .filter((entry) => entry.date)
    .sort((a, b) => a.date.localeCompare(b.date));

const listingHtml = await get(`${BASE}BS_ViewMasDirections.aspx`);
await sleep(400);
const listing = parseListing(listingHtml, { source: 'rbi-master-directions', baseUrl: BASE });

const rows = [];
const failures = [];
for (const base of plan.bases) {
  const wanted = norm(base.title);
  const candidates = listing.filter((item) => norm(item.title).startsWith(wanted));
  if (candidates.length !== 1) {
    failures.push({ title: base.title, reason: `listing matches ${candidates.length}`, candidates: candidates.map((item) => item.title) });
    continue;
  }
  const item = candidates[0];
  const masterId = Number(new URL(item.url).searchParams.get('id'));
  // The current detail page may carry only a PDF. Its history page is the
  // route that keeps earlier snapshots inline, so read the history first and
  // fetch the version, not the current consolidated page.
  const historyUrl = `${BASE}NotificationPreVersion.aspx?id=${masterId}`;
  const historyPage = await readPage(historyUrl, masterId, 'history');
  const history = historyOf(historyPage);
  const before = history.filter((entry) => entry.date < base.firstDate);
  const chosen = before.at(-1) || null;
  const updated = /Updated as on ([^)]+)/i.exec(item.title)?.[1];
  const asOf = chosen?.date || parseDate(updated) || item.publishedAt;
  const url = chosen ? `${BASE}NotificationPreVersion.aspx?id=${masterId}&Histid=${chosen.hist}` : item.url;
  const page = chosen ? await readPage(url, masterId, chosen.hist) : await readPage(item.url, masterId, 'current');
  const text = baseText(page, base.title);
  if (!looksLikeInstrument(text)) {
    failures.push({ title: base.title, reason: 'not an instrument after article extraction', url });
    continue;
  }
  const clean = cleanTitle(item.title);
  const refNo = refFrom(text) || item.refNo || `Master Direction ${masterId}`;
  rows.push({
    id: masterId,
    kind: 'base-direction',
    title: clean,
    sourceTitle: item.title,
    refNo,
    date: asOf,
    issued: item.publishedAt,
    sourceUrl: url,
    masterId,
    histId: chosen?.hist || null,
    versionDate: asOf,
    text,
  });
  const flags = chosen ? `history ${chosen.date}` : 'current text (no earlier version)';
  console.log(`${String(rows.length).padStart(2)}. ${masterId} | ${asOf} | ${flags} | ${text.length} chars | ${clean.slice(0, 78)}`);
}

writeFileSync(outPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
console.log(`\nwrote ${rows.length}/${plan.bases.length} base directions to ${outPath}`);
if (failures.length) {
  console.error('failures:');
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exitCode = 1;
}
