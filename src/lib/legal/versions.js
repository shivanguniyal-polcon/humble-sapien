// Reading a statute in two states.
//
// "Git for laws" is only worth the name if a reader can check out a text as it
// stood before a change. That needs three things: an earlier pinned text, a
// ledger saying which sections a later Act touched, and a way to cut a statute
// at a section. This module supplies the third.
//
// The extraction is per section, not a full parse of the Act, because a bare
// Act prints its headings twice — once in the contents and once in the body —
// and a line parser cannot tell them apart by the words. It can tell them apart
// by what follows: a contents entry is followed by the next entry a line or two
// later, while a body heading is followed by the section's text. So for a given
// number the occurrence with the most text under it is the one to read.
//
// The comparison is scoped for the same reason. It does not scan the whole
// statute for sentences that differ, because an older copy may be a scan: OCR
// damage ("tbr" for "for") would read as change on every page. It compares the
// sections the amendment ledger names, prints both texts, and gives a
// similarity so a reader can see how far apart they are without being told what
// to conclude.

const HEADING = /^(\d{1,2})\.\s+(.+)$/;
// The dash separating a heading from its body as printed: ".—(1)", ".-(I)",
// ". — (" and the OCR variants of the same.
const SPLIT = /\s*[.·]?\s*[—–-]{1,2}\s*[([{]/;

// A numbered footnote has the shape of a heading: "1. The words 'except the
// State of Jammu and Kashmir' …". Titles do not open with these forms.
const FOOTNOTE_START = /^(The words|For |In |Subs|Ins|Omitted|Added|Repealed|Vide|Notification|G\.\s?S\.\s?R|S\.\s?O|Act\s|Ordinance)/i;

const looksLikeTitle = (title) =>
  /^[A-Z(“"]/.test(title) &&
  title.length >= 4 &&
  !/^\d/.test(title) &&
  !FOOTNOTE_START.test(title) &&
  !/\bof\s+\d{4}\b/.test(title) &&
  !/w\.e\.f\./i.test(title) &&
  !/\b(sub-section|clause)\b/i.test(title) &&
  !/\bheld|shall|means\b/.test(title);

// A heading printed with its body on the same line leaves the separator and
// the sub-section marker at the front of the text: ".—(1) The Chief …" or the
// OCR forms ".-(I)" and ".—(/)". They are printing furniture, not law.
const cleanBody = (text) =>
  String(text)
    // Drop the printed dash only. The sub-section marker behind it — "(1)",
    // "(I)", "(/)" — is part of the section and stays.
    .replace(/^[\s.·—–-]+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

function readHeading(line) {
  const match = line.match(HEADING);
  if (!match) return null;
  const [title, ...body] = match[2].split(SPLIT);
  const clean = title.replace(/\s+/g, ' ').trim();
  if (!looksLikeTitle(clean)) return null;
  return {
    number: Number(match[1]),
    title: clean,
    inline: body.length ? match[2].slice(title.length).trim() : '',
  };
}

// One section, as printed. The block runs to the next numbered line of any
// kind, so a footnote or a schedule item ends it rather than being absorbed.
export function sectionOf(text = '', number) {
  const lines = String(text).split('\n').map((line) => line.trim());
  const candidates = [];
  lines.forEach((line, index) => {
    const heading = readHeading(line);
    if (!heading || heading.number !== Number(number)) return;
    let end = lines.length;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (HEADING.test(lines[next])) {
        end = next;
        break;
      }
    }
    candidates.push({
      ...heading,
      index,
      size: end - index,
      text: cleanBody([heading.inline, ...lines.slice(index + 1, end)].join('\n')),
    });
  });
  if (!candidates.length) return null;
  // Most text under the heading wins; a tie goes to the later occurrence,
  // since the body follows the contents.
  candidates.sort((a, b) => b.size - a.size || b.index - a.index);
  return candidates[0];
}

const words = (text = '') =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);

// How much of the two vocabularies the sections share. A high score is not
// proof the text is identical — a scan can damage a word on every line — and a
// low score is not proof the law changed. It is one number shown next to both
// texts, not a verdict.
export function sectionSimilarity(before = '', after = '') {
  const a = new Set(words(before));
  const b = new Set(words(after));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return Number((shared / (a.size + b.size - shared)).toFixed(3));
}

export function checkoutSections(beforeText = '', afterText = '', numbers = []) {
  return [...new Set(numbers)]
    .sort((a, b) => a - b)
    .map((number) => {
      const old = sectionOf(beforeText, number);
      const now = sectionOf(afterText, number);
      if (!old && !now) return null;
      return {
        number,
        title: now?.title || old?.title || '',
        before: old?.text || '',
        after: now?.text || '',
        beforeTitle: old?.title || '',
        afterTitle: now?.title || '',
        similarity: old && now ? sectionSimilarity(old.text, now.text) : 0,
        missing: !old ? 'before' : !now ? 'after' : null,
      };
    })
    .filter(Boolean);
}
