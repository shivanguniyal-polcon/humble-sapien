// The article, not the page.
//
// RBI's detail pages carry the whole instrument inline — the notification
// body, or the master direction with its index — wrapped in the site's
// navigation, breadcrumb, archive sidebar and footer. The WAF on the PDF
// host is hostile to automated clients; the detail page is not, so this is
// where the fetcher reads from.
//
// The cut is textual and deliberate: the title appears twice (breadcrumb and
// heading), and the article is what sits after the second one and before the
// "Back to previous page" footer. A page that does not match the shape
// returns its text unchanged rather than an empty string, so a redesign
// fails loudly in review instead of silently storing nothing.

import { htmlToText } from '../../../src/lib/monitor/text.js';

const tidy = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const FOOTER = /\n(?:Top\b|Back to previous page\b|More Links\s*:|Website last updated date\b|Supports: |(?:19|20)\d{2}\n{1,2}(?:(?:19|20)\d{2}|All Months|Archives))/;

export const articleText = (html, title) => {
  const text = htmlToText(html);
  const needle = tidy(title);
  let start = 0;
  if (needle) {
    const first = text.indexOf(needle);
    const second = first === -1 ? -1 : text.indexOf(needle, first + needle.length);
    if (second !== -1) start = second + needle.length;
  }
  let body = text.slice(start);
  const cut = body.search(FOOTER);
  if (cut > 0) body = body.slice(0, cut);
  return body.trim();
};

// The listing title and the detail heading can differ by an en dash or a
// line break. This is the shape check the fetcher uses before it stores a
// detail page: it must contain a body with duty language or a numbered
// clause, not just the site chrome.
export const looksLikeInstrument = (text) => {
  const body = String(text || '');
  if (body.length < 300) return false;
  return /\bshall\b|\bmay\b|\bmust\b/i.test(body) && /\b\d+\.\s|\([a-z0-9]{1,3}\)/.test(body);
};
