// Segmentation with offsets, clause numbering, and long-sentence splitting.
//
// Provenance is the feature that makes a rewrite reviewable: every sentence
// the tool produces must point back at the exact characters of the source it
// came from. That means the sentence splitter has to keep offsets, which the
// simple regex split the citizen tool started with threw away.
//
// Clause numbering is a best effort, and says so. It reads a leading section
// number ("4.", "Section 12", "4.2", "(3)") and labels it in the register of
// the chosen jurisdiction. Where it cannot find one, the row carries no
// clause number rather than a guess.

export const LONG_SENTENCE_WORDS = 22;

export const countWords = (text) =>
  String(text || '').trim().split(/\s+/).filter(Boolean).length;

// A segment that is only a clause head: "Section 4.", "Art. 12", "4.2".
const CLAUSE_HEAD = /^(?:(?:section|sec|article|regulation|rule|part|chapter|schedule)\s+)?\[?\d+[A-Za-z]?(?:\.\d+)*\]?\.?$/i;

// A bare clause number on its own line, the way a Bare Act numbers itself.
const BARE_HEAD = /^\d+[A-Za-z]?(?:\.\d+)*\.?$/;

// Abbreviations that end in a full stop without ending a sentence.
const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|Prof|No|Rs|Sec|Art|Para|Fig|Ref|pp|Vol|cl|al|etc|vs|St)\.$/;

// Split into sentences, keeping the character offsets of each sentence in
// the original text. The pattern matches the citizen tool's splitter exactly
// so the two modes never disagree about what a sentence is.
export const segment = (text) => {
  const source = String(text || '');
  const raw = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const chunk = m[0];
    const lead = chunk.length - chunk.trimStart().length;
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const start = m.index + lead;
    raw.push({ start, end: start + trimmed.length, text: trimmed });
  }

  // Merge back the false sentence breaks. "Section 4." is a clause head, not
  // a sentence; "Rs." is an abbreviation. Without this the ledger would
  // show a row for the number of the section and a row for the section.
  const out = [];
  for (const seg of raw) {
    const last = out[out.length - 1];
    if (last && shouldMerge(source, last, seg)) {
      out[out.length - 1] = {
        start: last.start,
        end: seg.end,
        text: source.slice(last.start, seg.end).replace(/\s+/g, ' ').trim(),
      };
      continue;
    }
    out.push(seg);
  }
  return out;
};

const startsLine = (source, index) => index === 0 || /[\n]/.test(source.slice(0, index).slice(-2));

const shouldMerge = (source, a, b) => {
  if (ABBREVIATIONS.test(a.text)) return true;
  if (CLAUSE_HEAD.test(a.text) && /\b(?:section|sec|article|regulation|rule|part|chapter|schedule)\b/i.test(a.text)) {
    return true;
  }
  if (BARE_HEAD.test(a.text) && startsLine(source, a.start) && /^[A-Z"“]/.test(b.text)) {
    return true;
  }
  return false;
};

const SECTION_PATTERNS = [
  { re: /^\s*section\s+(\d+[A-Za-z]?(?:\.\d+)*)/i, kind: 'section' },
  { re: /^\s*sec(?:tion)?\.?\s+(\d+[A-Za-z]?(?:\.\d+)*)\b/i, kind: 'section' },
  { re: /^\s*article\s+(\d+[A-Za-z]?)\b/i, kind: 'article' },
  { re: /^\s*regulation\s+(\d+[A-Za-z]?)\b/i, kind: 'regulation' },
  { re: /^\s*(\d+[A-Za-z]?(?:\.\d+)*)\s*(?:[.):]|[-–—])/, kind: 'section' },
  { re: /^\s*(\d+[A-Za-z]?(?:\.\d+)*)\s+\(?[A-Z"“]/, kind: 'section' },
  { re: /^\s*\[?\s*(\d+[A-Za-z]?(?:\.\d+)*)\s*\]?\s*(?:[.):]|[-–—])/, kind: 'section' },
];

// The leading marker of a sub-clause: "(3)", "(a)", "(i)".
const SUBCLAUSE = /^\s*\((\d+[A-Za-z]?|[a-z]{1,2}|[ivxlc]{1,4})\)/i;

// A part, chapter or schedule heading.
const DIVISION = /^\s*\(?(chapter|part|schedule|division)\s+([IVXLC\d]+)\)?\b/i;

// Read the clause marker at the head of a segment.
export const clauseMarker = (text) => {
  const source = String(text || '');
  const sub = source.match(SUBCLAUSE);
  if (sub && !SECTION_PATTERNS.some((p) => p.re.test(source))) {
    return { no: `(${sub[1]})`, label: `(${sub[1]})`, kind: 'sub-clause' };
  }
  for (const pattern of SECTION_PATTERNS) {
    const m = source.match(pattern.re);
    if (m) {
      return { no: m[1], label: m[1], kind: pattern.kind };
    }
  }
  const div = source.match(DIVISION);
  if (div) {
    return {
      no: `${div[1]} ${div[2]}`,
      label: `${div[1]} ${div[2]}`,
      kind: div[1].toLowerCase(),
    };
  }
  return null;
};

// The label as it is cited in this jurisdiction: "s. 4", "reg. 4", "§ 4.2",
// "Art. 4".
export const clauseLabel = (text, jurisdiction) => {
  const marker = clauseMarker(text);
  if (!marker) return null;
  const prefix = (jurisdiction && jurisdiction.clausePrefix) || 's.';
  if (marker.kind === 'sub-clause') {
    return { no: marker.no, label: marker.no, kind: marker.kind, prefix };
  }
  return { no: marker.no, label: `${prefix} ${marker.no}`, kind: marker.kind, prefix };
};

// Split an overlong sentence at natural joints. The same rule the citizen
// tool has always used, kept in one place so the two modes never diverge.
//
// The connective survives the split. "A, and B." read as "A. B." loses the
// list relation, and "A, but B." read as "A. B." loses the contrast — in
// legal text both losses change what the sentence says. So the tail keeps
// its "and", "but" or "so", and a ", which " joint is not used at all,
// because a sentence cannot start with "which".
export const splitLong = (sentence, maxWords = LONG_SENTENCE_WORDS) => {
  if (countWords(sentence) <= maxWords) return [sentence];
  const joints = [', and ', ', but ', '; ', ', so '];
  for (const joint of joints) {
    const i = sentence.indexOf(joint);
    if (i > 8 && i < sentence.length - 12) {
      const head = sentence.slice(0, i).trim();
      let tail = sentence.slice(i + joint.length).trim();
      const lead = joint.trim().startsWith(',') ? joint.trim().slice(1).trim() : '';
      tail = capitalize(`${lead ? `${lead} ` : ''}${tail}`);
      return [head, tail].flatMap((piece) => splitLong(piece, maxWords));
    }
  }
  return [sentence];
};

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const punctuate = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
