// Reading an RBI listing page.
//
// Notifications and Master Directions use the same furniture: a
// `table.tablebg` per date, a bold date header, then one row per item with a
// `link2` anchor to the detail page and a PDF anchor to the file. This parser
// reads that shape rather than the whole page, so navigation, scripts and the
// site chrome never enter the library.
//
// The pages are old ASP.NET: attributes are sometimes quoted, sometimes not,
// and one row can carry a category header instead of a date. Anything that
// does not parse is skipped and counted, never guessed.

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘' };

const decode = (text) =>
  String(text || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });

export const textOf = (html) => decode(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// "Oct 23, 2026" to "2026-10-23". A category header ("Banker and Debt
// Manager to Government") parses to null and is skipped by the row reader.
export const parseDate = (value) => {
  const match = /([A-Za-z]{3})[A-Za-z]*\s+(\d{1,2}),\s*(\d{4})/.exec(String(value || ''));
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  const day = String(Number(match[2])).padStart(2, '0');
  const year = match[3];
  const probe = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(probe.getTime()) || probe.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};

export const resolveUrl = (href, baseUrl) => {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&').trim(), baseUrl).href;
  } catch {
    return null;
  }
};

const sizeOf = (value) => {
  const match = /([\d.]+)\s*(kb|mb)/i.exec(String(value || ''));
  if (!match) return null;
  return Math.round(Number(match[1]) * (match[2].toLowerCase() === 'mb' ? 1024 * 1024 : 1024));
};

// One table block, in document order. A date header applies to the rows
// under it; a category header ("Banker and Debt Manager to Government")
// does not change the date and is ignored. Rows that carry no PDF are kept
// with `pdfUrl: null` so the caller can report them rather than drop them
// silently.
const parseBlock = (block, { source, baseUrl, found }) => {
  let publishedAt = null;
  for (const row of block.split(/<tr\b/i).slice(1)) {
    const header = /class=["']?tableheader[^>]*>([\s\S]*?)<\/td>/i.exec(row);
    if (header) {
      const date = parseDate(textOf(header[1]));
      if (date) publishedAt = date;
    }
    const link = /<a\b[^>]*class=["']?link2[^>]*href=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/a>/i.exec(row)
      || /<a\b[^>]*href=["']?([^"'\s>]+)["']?[^>]*class=["']?link2[^>]*>([\s\S]*?)<\/a>/i.exec(row);
    if (!link) continue;
    const title = textOf(link[2]);
    if (!title) continue;
    const pdf = /<a\b[^>]*href=["']?([^"'\s>]+\.pdf)["']?/i.exec(row);
    const size = sizeOf(textOf(row));
    const url = resolveUrl(link[1], baseUrl);
    const pdfUrl = pdf ? resolveUrl(pdf[1], baseUrl) : null;
    if (!url) continue;
    found.push({
      source,
      title,
      url,
      pdfUrl,
      publishedAt,
      listingBytes: size,
    });
  }
};

export const parseListing = (html, { source = 'rbi', baseUrl = 'https://www.rbi.org.in/Scripts/' } = {}) => {
  const found = [];
  const blocks = String(html || '').split(/<table\b[^>]*class=["']?tablebg/i).slice(1);
  for (const block of blocks) {
    const end = block.indexOf('</table>');
    parseBlock(end === -1 ? block : block.slice(0, end), { source, baseUrl, found });
  }
  // The listing can repeat a row across date tables; the PDF is the identity.
  const seen = new Set();
  return found.filter((item) => {
    const key = item.pdfUrl || item.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// The reference number is usually in the title or on the detail page, and
// never in a consistent place. This reads the common RBI shapes and returns
// null rather than inventing one.
export const refFromTitle = (title) => {
  const match = /\b(?:RBI|DOR|DoR|DBR|DNBS|MD|Circular|Notification)[\s./-]*(?:[A-Z]{2,6}[./-])?[A-Z0-9]{2,}[./-][0-9]{2,}\b/i.exec(String(title || ''));
  return match ? match[0].replace(/\s+/g, '') : null;
};
