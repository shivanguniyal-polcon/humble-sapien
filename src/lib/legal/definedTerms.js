// Defined terms: the words an instrument defines for itself.
//
// A statutory definition is the one place where plain-language rewriting is
// dangerous. "Appropriate Government" can mean the Centre in one Act and the
// State in another; a dictionary that rewrites the phrase without knowing the
// definition is guessing. So the engine reads the definitions first, keeps
// those terms untouched, and tells the reviewer which sentences lean on one.
//
// Extraction is rule-based and deliberately conservative: it looks for the
// standard definitional verbs and reads the term backwards from them. A
// definition it cannot read confidently is not silently dropped — the
// unrecovered lead-in ("unless the context otherwise requires") is reported so
// a reviewer knows the section was read, not skipped.

import { escapeRegExp } from './text.js';

const KEYWORD = /\b(means|includes|refers to|has the meaning (?:given|assigned) to|shall be deemed to include)\b/gi;

const QUOTES = ['"', '“', '‘', "'"];

const isWordChar = (ch) => /[A-Za-z0-9)'&./-]/.test(ch);

const CONNECTORS = new Set(['of', 'the', 'and', 'or', 'for', 'in', 'to', 'a', 'an', 'as']);

// Walk backwards from a keyword and recover the term it defines.
const termBefore = (text, keywordStart) => {
  let i = keywordStart - 1;
  while (i >= 0 && /\s/.test(text[i])) i -= 1;
  if (i < 0) return null;

  // Quoted term: take what sits between the quotes.
  if (QUOTES.includes(text[i])) {
    const close = text[i];
    const open = close === '”' ? '“' : close === '‘' ? '‘' : close;
    const start = text.lastIndexOf(open, i - 1);
    if (start === -1) return null;
    const term = text.slice(start + 1, i).trim();
    return term ? { term, start: start + 1, end: i } : null;
  }

  // Bare term: the run of words immediately before the keyword.
  const words = [];
  let end = i + 1;
  while (i >= 0 && words.length < 6) {
    if (!isWordChar(text[i])) {
      if (text[i] === ')' || text[i] === '(') { i -= 1; continue; }
      break;
    }
    let start = i;
    while (start >= 0 && isWordChar(text[start])) start -= 1;
    words.unshift(text.slice(start + 1, end));
    end = start + 1;
    i = start;
    while (i >= 0 && /\s/.test(text[i])) i -= 1;
    // Stop at a sentence boundary or a clause opener.
    if (i >= 0 && (text[i] === ';' || text[i] === ':')) break;
  }
  while (words.length && CONNECTORS.has(words[0].toLowerCase())) words.shift();
  while (words.length && CONNECTORS.has(words[words.length - 1].toLowerCase())) words.pop();
  if (!words.length) return null;
  // A term in a definitions section is capitalised somewhere; a run of all
  // lower-case words is prose that happens to sit before "means".
  if (!words.some((w) => /[A-Z]/.test(w))) return null;
  const term = words.join(' ');
  const start = text.lastIndexOf(term, keywordStart);
  if (start === -1) return null;
  return { term, start, end: start + term.length };
};

// The definition body: from the keyword to the end of the entry.
const bodyAfter = (text, keywordEnd) => {
  let end = text.length;
  const semi = text.indexOf(';', keywordEnd);
  const newline = text.indexOf('\n', keywordEnd);
  const nextQuote = text.indexOf('("', keywordEnd);
  const stops = [semi, newline, nextQuote].filter((v) => v !== -1 && v > keywordEnd);
  if (stops.length) end = Math.min(...stops);
  const body = text.slice(keywordEnd, end).replace(/\s+/g, ' ').trim();
  return { body: body.length > 600 ? `${body.slice(0, 600).trim()}…` : body, end };
};

// Pull the definitions out of a source text.
// Returns { definitions, leadIns, unrecovered }.
export const extractDefinitions = (text) => {
  const source = String(text || '');
  const definitions = [];
  const leadIns = [];
  const unrecovered = [];
  const seen = new Set();

  KEYWORD.lastIndex = 0;
  let m;
  while ((m = KEYWORD.exec(source)) !== null) {
    const keyword = m[1].toLowerCase();
    const found = termBefore(source, m.index);
    const { body } = bodyAfter(source, m.index + m[0].length);
    if (!found) {
      if (body && body.length > 3) {
        unrecovered.push({ keyword, body: body.slice(0, 160) });
      }
      continue;
    }
    const key = found.term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    definitions.push({
      term: found.term,
      keyword,
      definition: body,
      start: found.start,
      end: found.end,
    });
  }

  // The standard lead-in tells the reader the definitions only apply "unless
  // the context otherwise requires". It is worth repeating: it is the escape
  // hatch that defeats a rigid reading of every definition.
  const leadIn = /unless the context otherwise requires[^.]{0,40}/gi;
  let l;
  while ((l = leadIn.exec(source)) !== null) leadIns.push(l[0].trim());

  return { definitions, leadIns, unrecovered };
};

// The terms the engine will not rewrite.
export const protectedTerms = (definitions) =>
  (definitions || []).map((d) => d.term).filter(Boolean);

// The forms a defined term can take in running text: the term itself, a
// plural, a possessive and (for words ending in y) the -ies plural. The
// match is deliberately simple; a term the tool cannot match is a term it
// will not claim to have protected.
const formsOf = (term) => {
  const forms = [term];
  if (term.endsWith('y')) forms.push(`${term.slice(0, -1)}ies`);
  else forms.push(`${term}s`);
  forms.push(`${term}'`, `${term}s'`);
  return forms;
};

// Which defined terms a given sentence leans on. The term is usually quoted
// in the source ("authorised officer" means ...), so the match runs on word
// boundaries rather than on spaces.
export const termsInSentence = (sentence, definitions) => {
  const hits = [];
  const text = String(sentence || '').toLowerCase();
  for (const def of definitions || []) {
    const term = def.term.toLowerCase();
    if (term.length < 3) continue;
    if (formsOf(term).some((form) => new RegExp(`\\b${escapeRegExp(form)}\\b`).test(text))) {
      hits.push(def.term);
    }
  }
  return hits;
};
