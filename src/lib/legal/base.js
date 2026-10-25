// Reading the other side of an amendment.
//
// An amendment names the address it removes. The base direction holds the
// text at that address. Clause numbering is not uniform across RBI's
// Directions — a paragraph can sit above sub-paragraphs, a chapter can use
// Roman numerals, and an annex can be lettered — so this helper reads the
// ref's own grammar, locates that address in the base text and returns the
// surrounding paragraph. It never falls back from a specific address to a
// broad chapter: a heading replaced under "A.8.1 of Chapter II" should quote
// A.8.1, not the first Chapter II in the document.

const tidy = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const escape = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The address nouns, in descending specificity. A paragraph number beats the
// chapter that contains it; a sub-section beats its chapter. Only one address
// is read per ref, so "sub-paragraph (4) paragraph 15" resolves to paragraph
// 15, not to the first "(4)" in the instrument.
const ADDRESS_PATTERNS = [
  {
    kind: 'paragraph',
    // Negative lookbehind keeps "sub-paragraph" out of the parent match.
    re: /(?<!sub-)(?:paragraphs?|paras?)\s+\(?(?:nos?\.?\s*)?(\d{1,4}(?:\([0-9A-Za-z]+\))?)/i,
  },
  {
    kind: 'subparagraph',
    re: /sub-?para(?:graph)?s?\s+\(?(?:nos?\.?\s*)?(\d{1,4}(?:\([0-9A-Za-z]+\))?)/i,
  },
  {
    kind: 'section',
    re: /(?:sub-?section|section)\s+([A-Z]?\d+(?:\.\d+)+|[A-Z](?:\.\d+)*|[IVXLC]+|\d+[A-Z]?)/i,
  },
  {
    kind: 'chapter',
    re: /(?:chapter|part)\s+([IVXLC]+(?:-[A-Z0-9]+)?|\d+[A-Z]?)/i,
  },
  {
    kind: 'annex',
    re: /annex(?:ure)?\s*([IVXLC]+|\d+[A-Z]?)/i,
  },
];

const addressOf = (ref) => {
  const source = String(ref || '');
  for (const { kind, re } of ADDRESS_PATTERNS) {
    const match = re.exec(source);
    if (match) return { kind, label: match[1].replace(/\s+/g, '') };
  }
  return null;
};

const findParagraph = (text, number) => {
  const match = new RegExp(`(?:^|\\n)\\s*${escape(number)}\\.\\s`).exec(text);
  if (!match) return -1;
  return match.index + match[0].indexOf(number);
};

const findChild = (text, marker, from) => {
  const match = new RegExp(`(?:^|\\n)\\s*\\(${escape(marker)}\\)\\s`).exec(text.slice(from, from + 12000));
  return match ? from + match.index + match[0].indexOf('(') : -1;
};

const locate = (text, address) => {
  if (!address) return -1;

  if (address.kind === 'paragraph' || address.kind === 'subparagraph') {
    const parts = /^(\d{1,4})(?:\(([0-9A-Za-z]+)\))?$/.exec(address.label);
    if (!parts) return -1;
    const start = findParagraph(text, parts[1]);
    if (start < 0) return -1;
    if (parts[2]) {
      const child = findChild(text, parts[2], start);
      if (child >= 0) return child;
    }
    return start;
  }

  // A heading address is printed as the heading, not as a numbered clause.
  // The first occurrence after the front matter is the heading; the 1,200
  // character gate skips the index and the cross-references above it.
  const pattern = address.kind === 'chapter'
    ? new RegExp(`(?:Chapter|Part)\\s+${escape(address.label)}\\b`, 'i')
    : address.kind === 'annex'
      ? new RegExp(`Annex(?:ure)?\\s*${escape(address.label)}\\b`, 'i')
      // A dotted sub-section prints as its own heading ("A.8.1 Parametric
      // scoring methodology"). A bare Roman section only counts with its
      // noun; searching for the letter "I" alone would land anywhere.
      : /[.\d]/.test(address.label)
        ? new RegExp(`\\b${escape(address.label)}\\b`, 'i')
        : new RegExp(`(?:sub-?section|section)\\s+${escape(address.label)}\\b`, 'i');
  const match = pattern.exec(text);
  return match && match.index >= 1200 ? match.index : -1;
};

const excerptAt = (text, index, length = 900, { stopAtSibling = false } = {}) => {
  let start = text.lastIndexOf('\n', index);
  start = start < 0 ? 0 : start + 1;
  let end = text.indexOf('\n', index + length);
  if (end < 0) end = Math.min(text.length, index + length);
  // A sub-paragraph dies alone. Stop at the next numbered sibling so the
  // excerpt does not attribute text that survives to the clause that dies.
  if (stopAtSibling) {
    const sibling = /\n\s*\(\s*\d{1,3}\s*\)\s/.exec(text.slice(index + 1, index + length + 400));
    if (sibling) end = Math.min(end, index + 1 + sibling.index);
  }
  // Do not run into the next numbered clause or lettered sub-section when
  // the paragraph is short.
  const next = /\n\s*(?:\d{1,4}[A-Z]?\.|[A-Z]\.\d+(?:\.\d+)*)\s/.exec(
    text.slice(index + 20, index + length + 400),
  );
  if (next) end = Math.min(end, index + 20 + next.index);
  return tidy(text.slice(start, Math.max(index + 80, end))).slice(0, length);
};

// A bare sub-paragraph ("sub-paragraph (4)") has no parent of its own; the
// operation's context names it ("In paragraph 15, sub-paragraph (4)"). Join
// the two into one address so the snapshot lookup can find 15(4) rather than
// the first "(4)" in the instrument.
export const baseRefFor = (edge, ref) => {
  const value = String(ref || '');
  if (!edge?.context) return value;
  if (/(?<!sub-)(?:paragraphs?|paras?)\s+\d/i.test(value)) return value;
  const sub = /sub-?para(?:graph)?s?\s+\(?(?:nos?\.?\s*)?(\d{1,4}(?:\([0-9A-Za-z]+\))?)/i.exec(value);
  if (!sub || sub[1].includes('(')) return value;
  const parent = /(?:paragraphs?|paras?)\s+(\d{1,4})/i.exec(edge.context);
  return parent ? `paragraph ${parent[1]}(${sub[1]})` : value;
};

export const baseExcerpts = (text, refs, { limit = 2 } = {}) => {
  const source = String(text || '');
  if (!source || !refs?.length) return [];
  const out = [];
  const seen = new Set();

  for (const ref of refs) {
    const address = addressOf(ref);
    if (!address) continue;
    const at = locate(source, address);
    if (at < 0) continue;

    const excerpt = excerptAt(source, at, 900, { stopAtSibling: /\([0-9A-Za-z]+\)$/.test(address.label) });
    if (!excerpt || seen.has(excerpt)) continue;
    seen.add(excerpt);
    out.push({ label: address.label, text: excerpt });
    if (out.length >= limit) break;
  }

  return out;
};
