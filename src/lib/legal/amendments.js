// Amendment and supersession edges.
//
// The design (private/amendment-graph-design.md) models the amendment chain
// as typed edges between instrument versions, each carrying two quotes — the
// operation sentence and its payload — with span and SHA-256 receipts. This
// module is the extraction side of that design, in the same deterministic,
// rule-based style as the rest of the pipeline:
//
//   1. Instrument resolution — read the title ("Reserve Bank of India
//      (<family>) [Nth] Amendment Directions, <year>") for the chain
//      identity and the amendment ordinal, and the in-text reference for the
//      base instrument. What cannot be resolved is reported `unresolved`.
//   2. Op extraction — find the operation sentences the drafter wrote
//      ("Paragraph 10(15A) shall be inserted as below:", "the paragraphs 408
//      to 416 and 442 to 454 shall be deleted"), with the target address and
//      the payload block that follows.
//   3. Obligation-level diff — classify the payload into born rows and mark
//      the dying address for deletes, so every diff row answers what
//      appeared or disappeared and carries the sentence that proves it.
//
// No edge exists without quotes. An operation the extractor cannot address
// is returned in `unresolved` for human pairing, never guessed.

import { segment } from './segments.js';
import {
  classifyObligation, isDutyTrigger, bearerOf,
} from './obligations.js';
import { sha256Hex } from '../../battery/hash.js';

export const AMENDMENT_EXTRACTOR_VERSION = 'ths-amendment-edges-1.0.0';

// The operation vocabulary. The drafter's own words map onto it one to one;
// anything outside this list is not an amendment operation and produces no
// edge.
const OP_WORDS = {
  inserted: 'INSERT',
  added: 'INSERT',
  deleted: 'DELETE',
  omitted: 'DELETE',
  substituted: 'SUBSTITUTE',
  modified: 'SUBSTITUTE',
  renamed: 'RENAME',
  renumbered: 'RENUMBER',
  're-numbered': 'RENUMBER',
  repealed: 'REPEAL',
};

export const AMENDMENT_OPS = [
  'INSERT', 'DELETE', 'SUBSTITUTE', 'RENUMBER', 'RENAME', 'REPEAL',
];

// "shall (stand) (be) <op>" — the amendment operation in the instrument's
// own grammar.
const OP_TRIGGER =
  /\bshall\s+(?:stand\s+)?(?:be\s+)?(inserted|added|deleted|omitted|substituted|modified|renamed|re-?numbered|repealed)\b/gi;

// The instrument's own title: family and topic in the parens, chain ordinal
// when it is an amendment.
const TITLE_RE =
  /Reserve Bank of India\s*\(([^)]{3,140})\)\s*(?:(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\s+)?(Amendment\s+)?Directions,?\s*(\d{4})/i;

const ORDINALS = {
  First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5,
  Sixth: 6, Seventh: 7, Eighth: 8, Ninth: 9, Tenth: 10,
};

// The base instrument as the text names it: "Reserve Bank of India (<scope>)
// Directions, <year>" — without "Amendment", so the instrument's own title
// never matches.
const BASE_TITLE_RE =
  /(Reserve Bank of India \([^)]{3,140}\) (?![^,.;]{0,40}Amendment)[^()]{0,40}?Directions, \d{4})/i;

// The drafter's numbering: "(2) ", "i. ", "4.". It labels the operation;
// it is not part of the target address.
const LIST_MARKER = /^\s*[([]?\s*(?:\d+[A-Za-z]?|[ivxlc]{1,5})\s*[.)\]]\s*/i;

// The chain identity: RBI plus the normalised scope, dashes and spaces
// folded the same way on both sides so a title and a reference to the same
// family produce the same id.
export const idFromScope = (scope) =>
  `RBI/${String(scope || '')
    .toUpperCase()
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, '_')
    .trim()}`;

// The reference normaliser both the extractor and the scorer use. A target
// address is compared without its articles, its quote marks and its
// drafter's padding ("as below", "thereunder"), so "A new Chapter VII-A as
// under" and "Chapter VII-A" are the same address.
export const normRef = (ref) =>
  String(ref || '')
    .toLowerCase()
    .replace(/[‘’“”'"()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:(?:a|an|the|new|further)\s+)+/, '')
    .replace(/\s+(?:as under|as below|thereunder|namely)$/, '')
    .replace(/[.,;:]+$/, '')
    .trim();

// ---- 1. instrument resolution --------------------------------------------

// Who the instrument is and what it amends. `resolved` is false when the
// title or the base reference cannot be read; the caller queues those for
// human pairing rather than inventing a link.
export const resolveInstrument = (doc) => {
  const text = String(doc.text || '');
  const title = TITLE_RE.exec(text);
  const out = {
    docId: doc.id,
    refNo: String(doc.refNo || '').trim(),
    date: String(doc.date || '').trim(),
    sourceUrl: String(doc.sourceUrl || '').trim(),
    form: 'UNKNOWN',
    instrumentId: null,
    scope: null,
    ordinal: null,
    title: null,
    baseTitle: null,
    resolved: false,
    reason: '',
  };
  if (!title) {
    out.reason = 'no instrument title found';
    return out;
  }
  out.scope = title[1].trim();
  out.title = title[0].replace(/\s+/g, ' ').trim();
  out.instrumentId = idFromScope(out.scope);
  const isAmendment = Boolean(title[3]) || Boolean(title[2]);
  out.form = isAmendment ? 'AMENDMENT' : 'BASE';
  if (title[2]) out.ordinal = ORDINALS[title[2]] || null;

  const base = BASE_TITLE_RE.exec(text);
  if (base) out.baseTitle = base[1].replace(/\s+/g, ' ').trim();

  if (out.form === 'AMENDMENT' && !out.baseTitle) {
    out.reason = 'amendment title read, but no base instrument reference found';
    return out;
  }
  out.resolved = true;
  return out;
};

// ---- 2. operation extraction ---------------------------------------------

const OP_ANCHOR =
  /the following [^.;]{0,70}? shall be inserted (after|before|at) ([^,.;:]{2,80})(?:,\s*)?namely\s*:/i;

// The evidence span of one operation: from the sentence that states it to
// its colon ("as below:", "namely:") or full stop. The sentence starts at
// the last full stop, colon or line break before the trigger, which is how
// the drafter's own numbering ("(1)", "i.") is left outside the quote.
const sentenceStartBefore = (text, index) => {
  const head = text.slice(0, index);
  const stops = [/[.!?](?=\s|$)/g, /[:;](?=\s|$)/g, /\n/g];
  let cut = 0;
  for (const re of stops) {
    let m;
    let last = -1;
    while ((m = re.exec(head)) !== null) last = m.index + m[0].length;
    if (last > cut) cut = last;
  }
  return cut;
};

const sentenceEndAfter = (text, index) => {
  const tail = text.slice(index);
  const stop = /[:.](?=\s|$)|[:.](?=\n)/.exec(tail);
  return stop ? index + stop.index + 1 : text.length;
};

// Where the payload stops: the next operation, the signature block, or the
// commencement line — whichever comes first. The scraper's junk after the
// signature is never part of a payload.
const payloadEnd = (text, from) => {
  // A fresh regex every call: the shared trigger carries lastIndex state.
  const nextOp = new RegExp(OP_TRIGGER.source, 'gi').exec(text.slice(from));
  const next = nextOp ? from + nextOp.index : text.length;
  const signature = /\(\s*[A-Z][A-Za-z .]{3,60}\s*\)\s*\n\s*Chief General Manager/.exec(text.slice(from));
  const commence = /These Directions shall come into (?:force|effect|operation)/.exec(text.slice(from));
  const annex = /\n\s*Annex(?:ure)?\s*[-–—:]?\s*\d*/i.exec(text.slice(from));
  const cuts = [next];
  if (signature) cuts.push(from + signature.index);
  if (commence) cuts.push(from + commence.index);
  if (annex) cuts.push(from + annex.index);
  return Math.min(...cuts);
};

const quoteOf = (text, start, end) =>
  String(text || '').slice(start, end).replace(/\s+/g, ' ').trim();

// One edge per operation sentence, each with its quote and hash. An
// operation whose target address cannot be read goes to `unresolved`.
export const extractAmendmentEdges = async (doc) => {
  const text = String(doc.text || '');
  const instrument = resolveInstrument(doc);
  const edges = [];
  const unresolved = [];

  const trigger = new RegExp(OP_TRIGGER.source, 'gi');
  let m;
  while ((m = trigger.exec(text)) !== null) {
    const op = OP_WORDS[m[1].toLowerCase()];
    const start = sentenceStartBefore(text, m.index);
    const end = sentenceEndAfter(text, m.index + m[0].length);
    const sentence = quoteOf(text, start, end);

    let targetRef = '';
    let anchor = null;
    let context = null;

    const anchored = OP_ANCHOR.exec(text.slice(start, end + 1));
    if (anchored && anchored.index + start < m.index) {
      anchor = anchored[1].toLowerCase();
      targetRef = anchored[2].trim();
      const head = sentence.slice(0, anchored.index).trim();
      if (head) context = head.replace(/^[^A-Za-z]+/, '').replace(/,\s*$/, '').trim() || null;
    } else {
      // The address is the noun phrase before the trigger, minus any
      // chapter or paragraph context clause in front of it and the
      // drafter's numbering.
      let before = text.slice(start, m.index);
      before = before
        .replace(LIST_MARKER, '')
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/^(?:Further|However|Accordingly),?\s+/i, '')
        .trim();
      const contextMatch = /^(?:In|Under)\s+((?:Chapter|Paragraph|Section|Part)\s+[^,]{2,60}),\s*/i.exec(before);
      if (contextMatch) {
        context = contextMatch[1].trim();
        before = before.slice(contextMatch[0].length);
      }
      targetRef = before
        .replace(/\s+(?:as under|as below)$/i, '')
        .replace(/\s*shall\s*$/i, '')
        .trim();
      // "A new Chapter VII-A" — the "A new" is the drafter's, not the address.
      if (/^a new\s+/i.test(targetRef)) targetRef = targetRef.replace(/^a new\s+/i, '');
    }

    if (!targetRef) {
      unresolved.push({ reason: 'operation without a readable target address', quote: sentence });
      continue;
    }

    let payload = null;
    if (op === 'INSERT' || op === 'SUBSTITUTE') {
      const rawSlice = text.slice(end, payloadEnd(text, end));
      const lead = rawSlice.length - rawSlice.trimStart().length;
      const start2 = end + lead;
      const end2 = start2 + rawSlice.trim().length;
      if (end2 > start2) {
        payload = {
          quote: quoteOf(text, start2, end2),
          start: start2,
          end: end2,
          sha256: await sha256Hex(text.slice(start2, end2)),
        };
      }
      if (!payload) {
        unresolved.push({ reason: 'insertion without a readable payload', quote: sentence });
        continue;
      }
    }

    edges.push({
      fromRef: instrument.refNo,
      fromTitle: instrument.title,
      toInstrumentId: instrument.instrumentId,
      form: instrument.form,
      op,
      targetRef,
      anchor,
      context,
      evidence: {
        quote: sentence,
        start,
        end,
        sha256: await sha256Hex(text.slice(start, end)),
      },
      payload,
      effectiveDate: instrument.effectiveDate || null,
    });
  }

  return { instrument, edges, unresolved };
};

// The commencement date, read from the instrument's own commencement
// sentence ("These Directions shall come into effect from January 1, 2027").
export const commencementOf = (text) => {
  const m = /These Directions shall come into (?:force|effect|operation)(?:\s+with\s+effect)?\s*(?:from|on|with effect from)?\s*([^.;\n]{2,60})/i.exec(String(text || ''));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};

// ---- 3. obligation-level diff --------------------------------------------

// A definition in a payload ("‘specified non-financial asset’ (SNFA) means
// ...") is a born row even without binding language: the amendment writes a
// term into the instrument. The term is whatever stands before "means".
const DEFINITION_HINT = /[^.;:\n]{2,70}\s+(?:shall\s+)?means?(?:\s+and\s+includes)?\b/i;

// The rows an INSERT or SUBSTITUTE payload brings to life: one typed row per
// payload sentence that binds somebody or defines a term, each carrying its
// own quote.
export const diffBornRows = (payloadQuote) => {
  const segs = segment(String(payloadQuote || ''));
  const rows = [];
  segs.forEach((seg, i) => {
    const duty = isDutyTrigger(seg.text);
    const definition = !duty && DEFINITION_HINT.test(seg.text);
    if (!duty && !definition) return;
    const cls = classifyObligation(seg.text, { prev: i > 0 ? segs[i - 1].text : '' });
    rows.push({
      quote: seg.text,
      start: seg.start,
      end: seg.end,
      type: definition && cls.type === 'action' ? 'definition' : cls.type,
      bearer: bearerOf(seg.text),
    });
  });
  return rows;
};

// The address a DELETE kills, in its parts: "the paragraphs 408 to 416 and
// 442 to 454" names two ranges, and a diff that lists only one of them has
// half-killed the chapter. A part that carries no noun of its own inherits
// the head of the first.
export const diedRefsOf = (targetRef) => {
  const parts = String(targetRef || '').split(/\s+and\s+/i).map((p) => p.replace(/^[Tt]he\s+/, '').trim()).filter(Boolean);
  if (parts.length <= 1) return parts;
  const head = (parts[0].match(/^[a-z-]+s?\b/i) || [''])[0];
  return parts.map((p, i) => {
    if (i === 0) return p;
    return /^\d/.test(p) && head ? `${head} ${p}` : p;
  });
};

// When the base text is in hand, a DELETE names the rows that die: the rows
// under the target address. The corpus carries no base versions, so this
// path runs only where a reviewer supplies one.
export const applyDeleteToRows = (baseRows, edge) => {
  const refs = diedRefsOf(edge.targetRef).map(normRef);
  return baseRows.filter((row) => {
    const address = normRef([row.clauseNo, row.clause].filter(Boolean).join(' '));
    return refs.some((ref) => address && (address.includes(ref) || ref.includes(address)));
  });
};

// The whole extraction for one instrument: resolution, edges, diff rows and
// receipts, ready for the manifest.
export const extractAmendmentGraph = async (doc) => {
  const text = String(doc.text || '');
  const { instrument, edges, unresolved } = await extractAmendmentEdges(doc);
  instrument.effectiveDate = commencementOf(text);
  for (const edge of edges) edge.effectiveDate = edge.effectiveDate || instrument.effectiveDate;
  return {
    version: AMENDMENT_EXTRACTOR_VERSION,
    instrument,
    edges,
    unresolved,
    born: edges
      .filter((e) => e.op === 'INSERT' || e.op === 'SUBSTITUTE')
      .map((e) => ({ targetRef: e.targetRef, rows: diffBornRows(e.payload ? e.payload.quote : '') })),
    died: edges
      .filter((e) => e.op === 'DELETE' || e.op === 'REPEAL')
      .map((e) => ({ targetRef: e.targetRef, refs: diedRefsOf(e.targetRef), rows: null })),
  };
};
