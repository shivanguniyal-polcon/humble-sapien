// Citation exports for the research library: BibTeX, RIS and APA, each with
// the publication's stable permalink. Permalinks are hash routes so they hold
// on any static host without server configuration.

export function pubPermalink(pub) {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';
  return `${base}#/research/${pub.id}`;
}

export function pubYear(pub) {
  const m = String(pub.date || '').match(/(\d{4})/);
  return m ? m[1] : '';
}

// Corporate authors stay literal: 'THS Research', never 'Research, THS'.
const CORPORATE = /\b(THS|Lab|Institute|Team|Commission|Committee|Centre|Center)\b/;

export function isCorporate(author) {
  return CORPORATE.test(String(author || ''));
}

export function lastNameFirst(author) {
  if (isCorporate(author)) return String(author).trim();
  const parts = String(author || '').trim().split(/\s+/);
  if (parts.length < 2) return author;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
}

function bibKey(pub) {
  const raw = String(pub.author || 'ths');
  const author = (isCorporate(raw) ? raw.split(/\s+/)[0] : raw.split(/\s+/).pop())
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const word =
    String(pub.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .find((w) => w.length > 3) || 'work';
  return `${author}${pubYear(pub) || 'nd'}${word}`;
}

const LONG_FORM = ['Report', 'Working paper', 'Brief'];

export function citeLine(pub) {
  const year = pubYear(pub);
  return `${lastNameFirst(pub.author)} (${year || 'n.d.'}). ${pub.title}. ${pub.type}. THS: The Humble Sapien. ${pubPermalink(pub)}`;
}

export function citeAPA(pub) {
  return citeLine(pub);
}

export function citeBibTeX(pub) {
  const kind = LONG_FORM.includes(pub.type) ? 'techreport' : 'misc';
  const authorField = isCorporate(pub.author)
    ? `{{${String(pub.author).trim()}}}`
    : lastNameFirst(pub.author);
  return [
    `@${kind}{${bibKey(pub)},`,
    `  author = {${authorField}},`,
    `  title = {${pub.title}},`,
    `  year = {${pubYear(pub)}},`,
    '  institution = {THS: The Humble Sapien},',
    `  type = {${pub.type}},`,
    `  url = {${pubPermalink(pub)}},`,
    `  note = {Accessed ${new Date().toISOString().slice(0, 10)}}`,
    '}',
  ].join('\n');
}

export function citeRIS(pub) {
  return [
    `TY  - ${LONG_FORM.includes(pub.type) ? 'RPRT' : 'GEN'}`,
    `AU  - ${lastNameFirst(pub.author)}`,
    `TI  - ${pub.title}`,
    `PY  - ${pubYear(pub)}`,
    'PB  - THS: The Humble Sapien',
    'LA  - en',
    `UR  - ${pubPermalink(pub)}`,
    'ER  - ',
  ].join('\n');
}
