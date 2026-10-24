// Detail page to duties.
//
// RBI's detail pages carry the instrument inline, and unlike the PDF host
// they do not sit behind the bot challenge. The stored snapshot is the page
// HTML; this module turns it into the same instrument chunk the monitor's
// library uses.

import { articleText, looksLikeInstrument } from './article.js';
import { instrumentFromText } from '../../../src/lib/monitor/read.js';

export const sha256Hex = async (bytes) => {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const sha256Text = async (text) => sha256Hex(new TextEncoder().encode(String(text || '')));

export const readSourcePage = async (row, html, { date } = {}) => {
  const text = articleText(html, row.title);
  if (!looksLikeInstrument(text)) {
    return { status: 'no-text', pages: null, empty: [], chunk: null };
  }
  const chunk = await instrumentFromText({
    id: row.id,
    title: row.title,
    refNo: row.ref_no,
    text,
    date: row.published_at || date,
    sourceUrl: row.source_url,
  });
  return { status: 'extracted', pages: null, empty: [], chunk };
};
