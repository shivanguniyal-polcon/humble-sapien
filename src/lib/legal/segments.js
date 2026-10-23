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
  // A dotted reference or number sequence is one token, not a run of
  // one-word "sentences": "DoR.AML.REC.250/14.06.001/2026-27".
  if (/\w\.$/.test(a.text) && /\w/.test(source[a.end] || '')) return true;
  // A line that ends in a comma is a wrapped list, not a sentence. Cutting
  // it and re-punctuating invents "Banks,.".
  if (/[,;:]$/.test(a.text)) return true;
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

// A finite verb: the auxiliaries and copulas legal clauses lead with. A
// lexical verb alone ("enacted", "circulated") is not enough to tell a clause
// apart from a list item.
const FINITE = /\b(?:shall|must|may|will|can|could|would|should|is|are|was|were|has|have|had|does|do|did|cannot)\b/i;
const SUBORD = /^(?:if|when|where|unless|after|before|upon|once|while|although|though|because|since|provided|subject|in the event|in case|to the extent|so far as)\b/i;

// "…may appoint and different dates may be appointed…" is two clauses with
// no comma between them, and splitting it shortens both sentences. "banks
// and officers" and "1267 (1999), 1989 (2011) and 2253 (2015)" are lists,
// and splitting those changes what the text says. The tail is a clause when
// its finite verb comes before any comma or relative pronoun in it.
const coordinationJoint = (sentence) => {
  const lower = sentence.toLowerCase();
  let at = lower.indexOf(' and ');
  while (at > 0) {
    const head = sentence.slice(0, at);
    const tail = sentence.slice(at + 5);
    // A tail that opens with its own subordinator ("if…", "in the event
    // of…") is a clause whatever the commas inside its adjuncts say:
    // "…this Act, and in the event of X at one time and Y at another, such
    // reference shall…" splits cleanly at the "and" even though its finite
    // verb sits past a comma.
    if (
      FINITE.test(head)
      && clauseTail(tail, { items: false })
      && countWords(head) >= 4 && countWords(tail) >= 4
    ) return at;
    at = lower.indexOf(' and ', at + 5);
  }
  return -1;
};

// Split an overlong sentence at natural joints. The same rule the citizen
// tool has always used, kept in one place so the two modes never diverge.
//
// The connective survives the split. "A, and B." read as "A. B." loses the
// list relation, and "A, but B." read as "A. B." loses the contrast — in
// legal text both losses change what the sentence says. So the tail keeps
// its "and", "but" or "so", and a ", which " joint is not used at all,
// because a sentence cannot start with "which".
// The tail of a comma joint is a clause when it opens with its subject and
// its finite verb comes before any comma in it. "…resolution 2734 (2024),
// and adopted under Chapter VII …" is the tail of a noun phrase, not a
// clause: splitting there prints "And adopted under Chapter VII …" as a
// sentence of its own, and that garble is what the joint exists to prevent.
const SUBJECT = /^(?:the|a|an|this|that|these|those|such|every|each|any|no|all|both|some|different|several|other|another|it|he|she|they|we|you|there|if|when|where)\b/i;
// An enumerated item — "(a) …", "(2) …", "2. …" — or a quoted definition
// ("the Scheme" means …) is its own unit even with no determiner and no
// finite verb: "the rules may provide for— (a) …; (b) …; (c) the fees
// payable …" splits into its items, not into fragments. Items are accepted
// at the comma joints only: at a bare "and" an item tail ("…and (iii)") is
// part of the same list and must not break.
const ENUM_ITEM = /^(?:\(?(?:\d+[a-z]?|[a-z]{1,2}|[ivxlc]{1,4})[.)]\s+\S|["“'][^"”']{1,80}["”']\s+(?:means?|includes?|refers?|has?|shall|is|are|will|can)\b)/i;
const clauseTail = (tail, { items = true } = {}) => {
  const body = tail.replace(/^(?:and|but|so)\s+/i, '');
  if (items && ENUM_ITEM.test(body)) return true;
  if (!SUBJECT.test(body)) return false;
  if (SUBORD.test(body)) return true;
  const verb = FINITE.exec(body);
  const comma = body.search(/[,;]/);
  return !!verb && (comma === -1 || verb.index < comma);
};

export const splitLong = (sentence, maxWords = LONG_SENTENCE_WORDS) => {
  if (countWords(sentence) <= maxWords) return [sentence];
  const joints = [', and ', ', but ', '; ', ', so '];
  for (const joint of joints) {
    let at = sentence.indexOf(joint);
    while (at > 0) {
      if (at > 8 && at < sentence.length - 12) {
        const head = sentence.slice(0, at).trim();
        let tail = sentence.slice(at + joint.length).trim();
        const lead = joint.trim().startsWith(',') ? joint.trim().slice(1).trim() : '';
        tail = capitalize(`${lead ? `${lead} ` : ''}${tail}`);
        if (clauseTail(tail)) {
          return [head, tail].flatMap((piece) => splitLong(piece, maxWords));
        }
      }
      at = sentence.indexOf(joint, at + joint.length);
    }
  }
  const at = coordinationJoint(sentence);
  if (at > 8 && at < sentence.length - 12) {
    const head = sentence.slice(0, at).trim();
    const tail = capitalize(`And ${sentence.slice(at + 5).trim()}`);
    return [head, tail].flatMap((piece) => splitLong(piece, maxWords));
  }
  return [sentence];
};

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const punctuate = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
