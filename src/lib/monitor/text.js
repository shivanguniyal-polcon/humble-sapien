// Turning a file into text, without touching a PDF runtime.
//
// The format decision, the HTML pass and the PDF line unwrap are plain
// string work. They live apart from ingest.js so the fetcher can use them in
// a Worker without dragging pdf.js into the bundle.

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const FILE_ACCEPT = '.pdf,.html,.htm,.txt,application/pdf,text/html,text/plain';

// The kind of reader a file needs, from its extension and MIME type. The
// extension is the more reliable signal: operating systems hand over
// inconsistent MIME types for .htm and .txt files.
export const fileKind = (name = '', type = '') => {
  const lower = String(name || '').toLowerCase();
  const mime = String(type || '').toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('text/html') || /\.html?$/.test(lower)) return 'html';
  if (mime.startsWith('text/') || /\.(txt|text|md)$/.test(lower)) return 'text';
  return 'unsupported';
};

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', middot: '·', copy: '©', sect: '§',
  rsaquo: '›', lsaquo: '‹', raquo: '»', laquo: '«', times: '×',
  divide: '÷', deg: '°', euro: '€', pound: '£', yen: '¥',
  trade: '™', reg: '®', rupee: '₹', percnt: '%', num: '#',
};

export const decodeEntities = (text) =>
  String(text || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    const value = ENTITIES[body.toLowerCase()];
    return value === undefined ? match : value;
  });

// HTML to text. There is no DOM parser here on purpose: this runs on the
// same code path in the browser and in the tests, and the input is a
// regulator's page, not arbitrary application markup. Blocks become line
// breaks, tables keep their cells apart, script and style are dropped whole,
// and the result is one line per block with the blank-line runs collapsed.
export const htmlToText = (html) => {
  let text = String(html || '');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const block = 'p|div|section|article|header|footer|nav|aside|li|tr|h[1-6]|table|blockquote|pre|dl|dt|dd|figure|figcaption';
  text = text.replace(new RegExp(`<\\/(?:${block})\\s*>`, 'gi'), '\n');
  text = text.replace(new RegExp(`<(?:${block})\\b[^>]*>`, 'gi'), '\n');
  text = text.replace(/<(br|hr)\s*\/?>/gi, '\n');
  text = text.replace(/<\/(td|th)\s*>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  text = text.replace(/\r\n?/g, '\n');
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v\u00a0]+/g, ' ').trim())
    .join('\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
};

// A PDF's text layer has a newline at every visual line, not every sentence:
// the sentence that runs over a line break is one sentence, and the rules
// downstream must see it whole. A line that does not end in terminal
// punctuation and is not itself the start of a numbered clause or a heading
// is joined back onto the line before it.
const clauseStart = /^(?:\d+[.)]\s|\([a-z0-9]{1,3}\)\s|[A-Z][A-Z\s]{6,}$|(?:chapter|section|part|annexure|schedule)\b)/i;

export const unwrapLines = (text) => {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const prev = out.length ? out[out.length - 1] : '';
    const joins = prev
      && !/[.:;!?)\]\u201d\u2019]$/.test(prev)
      && /^[a-z]/.test(line)
      && !clauseStart.test(line.trim());
    if (joins) out[out.length - 1] = `${prev} ${line.trim()}`;
    else out.push(line.trim());
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

