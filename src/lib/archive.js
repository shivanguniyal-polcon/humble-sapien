// The public archive.
//
// A separate surface from the Prahari workbench, and deliberately wider than
// it. The workbench answers "does this bind us?" for one regulator; the
// archive answers "what did the government publish, and can I cite it?" across
// statutes, policy documents, regulator instruments, releases and programme
// pages. Each record carries its own issuer, source and coverage.
//
//   #/archive
//   #/archive/13742
//   #/archive/in-rti-act-2005
//   #/archive/scheme-mgnrega
//
// This module holds only the parts that do not need React: the text search,
// the citation string and the downloaded record.

export function normaliseSearchText(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

// A quoted phrase stays together; every other run of non-space characters is
// a term. The search is an AND: every term has to appear somewhere in the
// record. That is the useful default for a legal text, where a single common
// word would otherwise return the whole library.
export function searchTerms(query = '') {
  const raw = String(query).trim();
  if (!raw) return [];
  const pieces = raw.match(/"[^"]+"|\S+/g) || [];
  return pieces
    .map((piece) => normaliseSearchText(piece.replace(/^"|"$/g, '')))
    .filter(Boolean);
}

const collapseWhitespace = (text = '') => String(text).replace(/\s+/g, ' ').trim();

// Monitor chunks carry numeric ids; archive routes are strings. Normalise both
// sides before deciding that the loaded chunk is the record on screen.
export function archiveDocMatches(doc, ref) {
  return Boolean(doc && ref && String(doc.id) === String(ref));
}

export function archiveRecord(meta, doc = null) {
  const text = doc?.text || '';
  return {
    meta,
    text,
    haystack: normaliseSearchText(
      [
        meta.id,
        meta.title,
        meta.shortTitle,
        meta.refNo,
        meta.date,
        meta.issuer,
        meta.issuerShort,
        meta.kindLabel,
        meta.summary,
        text,
      ]
        .filter(Boolean)
        .join(' '),
    ),
  };
}

// A short window around the earliest matching term. The snippet keeps the
// original casing and punctuation; only line breaks are collapsed, because a
// search result is read as a sentence, not as a page image.
export function archiveSnippet(text, terms, radius = 140) {
  if (!text || !terms.length) return '';
  const collapsed = collapseWhitespace(text);
  const lower = collapsed.toLowerCase();
  let at = -1;
  let matched = '';
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index >= 0 && (at < 0 || index < at)) {
      at = index;
      matched = term;
    }
  }
  if (at < 0) return '';
  const start = Math.max(0, at - radius);
  const end = Math.min(collapsed.length, at + matched.length + radius);
  const before = collapsed.slice(start, at).trim();
  const match = collapsed.slice(at, at + matched.length);
  const after = collapsed.slice(at + matched.length, end).trim();
  return `${start > 0 ? '…' : ''}${before}${before ? ' ' : ''}${match}${after ? ' ' : ''}${after}${end < collapsed.length ? '…' : ''}`;
}

const byNewest = (a, b) => {
  if (a.dateISO && b.dateISO) {
    return (
      String(b.dateISO).localeCompare(String(a.dateISO)) ||
      String(a.title || '').localeCompare(String(b.title || ''))
    );
  }
  if (a.dateISO) return -1;
  if (b.dateISO) return 1;
  return (
    String(a.issuer || '').localeCompare(String(b.issuer || '')) ||
    String(a.title || '').localeCompare(String(b.title || ''))
  );
};

export function sortArchive(records = []) {
  return [...records].sort((a, b) => byNewest(a.meta || a, b.meta || b));
}

export function searchArchive(records = [], query = '') {
  const terms = searchTerms(query);
  if (!terms.length) return records.map((record) => ({ record, snippet: '' }));

  return records
    .map((record) => {
      let score = 0;
      for (const term of terms) {
        if (!record.haystack.includes(term)) return null;
        const title = normaliseSearchText(record.meta.title);
        const shortTitle = normaliseSearchText(record.meta.shortTitle);
        const refNo = normaliseSearchText(record.meta.refNo);
        const issuer = normaliseSearchText(record.meta.issuer);
        const kind = normaliseSearchText(record.meta.kindLabel);
        score += 1;
        if (title.includes(term)) score += 4;
        if (shortTitle.includes(term)) score += 3;
        if (refNo.includes(term)) score += 2;
        if (issuer.includes(term)) score += 3;
        if (kind.includes(term)) score += 1;
      }
      return { record, score, snippet: archiveSnippet(record.text, terms) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || byNewest(a.record.meta, b.record.meta));
}

export function archiveCitation(meta) {
  const issuer = String(meta.issuer || '').trim();
  const title = String(meta.title || '').trim().replace(/\.+$/, '');
  const parts = [issuer, title, meta.refNo, meta.date].filter(Boolean);
  let text = `${parts.join('. ')}.`;
  if (meta.coverage === 'programme-page') text += ' Official programme page.';
  else if (meta.coverage === 'summary') text += ' Summary in the archive, not the published text.';
  else if (meta.coverage === 'excerpt') text += ' Selected text in the archive.';
  if (meta.sourceUrl) text += ` ${meta.sourceUrl}`;
  if (meta.hash) text += ` Pinned text ${meta.hash}.`;
  return text;
}

export function archiveFileName(meta) {
  const issuer = String(meta.issuerShort || meta.issuer || 'government')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = String(meta.refNo || meta.id || 'record')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `archive-${issuer || 'government'}-${base || 'record'}.json`;
}

export function archiveRecordJson(meta, doc = null, retrieved = new Date().toISOString()) {
  return JSON.stringify(
    {
      archive: 'THS public archive',
      issuer: meta.issuer,
      issuerShort: meta.issuerShort,
      kind: meta.kind,
      kindLabel: meta.kindLabel,
      coverage: meta.coverage,
      coverageLabel: meta.coverageLabel,
      archiveUrl: `#/archive/${encodeURIComponent(meta.id)}`,
      retrieved,
      record: {
        id: meta.id,
        title: meta.title,
        shortTitle: meta.shortTitle || '',
        refNo: meta.refNo || '',
        date: meta.date || '',
        dateISO: meta.dateISO || null,
        status: meta.status || '',
        hash: meta.hash || '',
        sourceUrl: doc?.sourceUrl || meta.sourceUrl || '',
        summary: meta.summary || '',
        words: meta.words || 0,
        duties: meta.duties ?? null,
        text: doc?.text || '',
      },
    },
    null,
    2,
  );
}
