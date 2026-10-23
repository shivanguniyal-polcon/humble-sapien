// Typed propositions in a canonical frame.
//
// A rewrite and its source can both read fluently and still disagree about
// what was said. This layer makes the disagreement visible. Every sentence
// is typed — duty, prohibition, permission, entitlement, definition,
// constitution, method, instrument operation, illustration, statement — and
// its content is slotted into one canonical frame:
//
//     who — with what force — does what — when — under what condition —
//     unless what
//
// so the frame can be set beside today's rewrite and compared line for
// line. A rewrite that drops a condition or softens a prohibition shows up
// against the frame even when both sentences read well.
//
// Extraction is rule-based and deterministic, like the rest of the
// pipeline. A slot that cannot be read is left empty rather than guessed.

import {
  classifyObligation, isDutyTrigger, bearerOf, DUTY_VERB,
} from './obligations.js';
import { punctuate, capitalize } from './segments.js';

export const PROPOSITION_KINDS = [
  { id: 'duty', label: 'Duty', note: 'Someone must act. The frame names who and what they must do.' },
  { id: 'prohibition', label: 'Prohibition', note: 'Someone must not act. A prohibition is a duty with the force reversed.' },
  { id: 'permission', label: 'Permission', note: 'Someone may act. A choice, not a task.' },
  { id: 'entitlement', label: 'Entitlement', note: 'Someone may claim something. The frame names the claim, not a duty.' },
  { id: 'definition', label: 'Definition', note: 'A term is given a meaning. Nothing is asked of anyone.' },
  { id: 'constitutive', label: 'Constitution', note: 'Who or what something is. Binding, but there is no task in it.' },
  { id: 'method', label: 'Method', note: 'How a number is computed. Background unless the calculation itself is prescribed as conduct.' },
  { id: 'meta', label: 'Instrument operation', note: 'The instrument talking about itself: its title, its commencement, its own amendment.' },
  { id: 'illustration', label: 'Illustration', note: 'A worked example written in the language of duty. The numbers illustrate; they do not bind.' },
  { id: 'statement', label: 'Statement', note: 'Describes, reasons or warns. No duty, permission or definition in it.' },
];

export const getPropositionKind = (id) =>
  PROPOSITION_KINDS.find((k) => k.id === id) || PROPOSITION_KINDS[PROPOSITION_KINDS.length - 1];

// A quoted term given a meaning: "authorised officer" means an officer...
const DEFINITION_RE =
  /["“']([^"”']{1,80})["”']\s*(?:shall\s+)?mean(?:s)?(?:\s+and\s+includes)?\s+([^.;]{0,220})/i;
const DEFINITION_PLAIN_RE =
  /\bmean(?:s)?(?:\s+and\s+includes)?\s+([^.;]{0,220})/i;

const COMMENCEMENT_RE = /\bshall come into (?:force|effect|operation)\b/i;
const TITLE_RE = /\bshall be called\s+([^.;]{2,140})/i;
const AMEND_OP_RE =
  /\bshall\s+(?:stand|be)\s+(deleted|substituted|inserted|renamed|re-?numbered|omitted|added|repealed|modified)\b/i;
const NEGATED_RE = /\b(?:shall|must|may)\s+not\b/i;
const NO_SHALL_RE = /^\s*no\s+([^,.;]{1,60}?)\s+(?:shall|may)\b/i;

// "It shall be the obligation of the auditor to ..." names the bearer after
// the verb; the frame reads it from there.
const DUTY_OF_RE =
  /\b(?:it\s+(?:shall|will|is)\s+be\s+the\s+(?:obligation|duty|responsibility)|the\s+(?:duty|obligation|responsibility))\s+of\s+([^,.;]{2,60}?)(?=\s+to\s+|[,.;]|$)/i;

const CONDITION_HEAD = /^(?:provided that|provided|subject to|where|if)\b/i;
const EXCEPTION_HEAD = /^(?:unless|other than|except)\b/i;

// The joints at which the main clause ends and a condition or exception
// begins. The connective travels with the qualifier, so the frame can say
// "provided that ..." exactly as the drafter wrote it.
const BOUNDARY_RE =
  /[,;]\s*(?=(?:provided that|provided|subject to|where|if|unless|other than|except)\b)/gi;

// Timing phrases: constraints on when or how often, kept in their own slot
// so the frame separates the act from its clock.
const TIMING_SOURCE =
  '\\b(?:within\\s+(?:\\d+|[a-z]+)?\\s*(?:days?|months?|years?|weeks?|hours?|period|fortnight)[^,.;:]{0,30}|not\\s+(?:later\\s+than|exceeding)\\s+[^,.;:]{0,30}|no\\s+later\\s+than\\s+[^,.;:]{0,30}|with\\s+immediate\\s+effect|every\\s+[^,.;:]{0,20}?(?:month|year|quarter|week)s?|from\\s+time\\s+to\\s+time|on\\s+or\\s+before\\s+[^,.;:]{0,30})';

const tidy = (text) =>
  String(text || '').replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();

const timingPhrases = (text) => {
  const re = new RegExp(TIMING_SOURCE, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(String(text || ''))) !== null) out.push(tidy(m[0]));
  return out;
};

const stripTiming = (text) =>
  tidy(String(text || '').replace(new RegExp(TIMING_SOURCE, 'gi'), ' '));

// Cut the sentence at the first condition or exception joint, then sort the
// tail pieces into their slots.
const splitQualifiers = (text) => {
  const source = String(text || '');
  const boundary = new RegExp(BOUNDARY_RE.source, 'gi');
  const marks = [];
  let m;
  while ((m = boundary.exec(source)) !== null) {
    marks.push({ cut: m.index, from: m.index + m[0].length });
  }
  if (marks.length === 0) {
    return { main: source, conditions: [], exceptions: [] };
  }
  const main = source.slice(0, marks[0].cut).replace(/[,;]\s*$/, '').trim();
  const pieces = [];
  for (let i = 0; i < marks.length; i += 1) {
    const from = marks[i].from;
    const to = i + 1 < marks.length ? marks[i + 1].cut : source.length;
    const piece = source.slice(from, to).replace(/\s+/g, ' ').trim();
    if (piece) pieces.push(piece);
  }
  const conditions = [];
  const exceptions = [];
  for (const piece of pieces) {
    if (EXCEPTION_HEAD.test(piece)) exceptions.push(piece);
    else if (CONDITION_HEAD.test(piece)) conditions.push(piece);
    else exceptions.push(piece);
  }
  return { main, conditions, exceptions };
};

// Type the sentence. A sentence with no binding language and no definition
// is a statement — it still gets a frame, but its frame is its own words.
export const typeProposition = (sentence, { prev = '' } = {}) => {
  const text = String(sentence || '');
  if (DEFINITION_RE.test(text)) return 'definition';
  // "No such rules shall be made ..." is a prohibition whatever else the
  // sentence looks like: the negation lives in the subject.
  if (NO_SHALL_RE.test(text.trim())) return 'prohibition';
  if (!isDutyTrigger(text)) return /\bmay\b/i.test(text) ? 'permission' : 'statement';
  const cls = classifyObligation(text, { prev });
  switch (cls.type) {
    case 'definition': return 'definition';
    case 'illustration': return 'illustration';
    case 'meta': return 'meta';
    case 'method': return 'method';
    case 'constitutive': return 'constitutive';
    case 'entitlement': return 'entitlement';
    default:
      return NEGATED_RE.test(text) ? 'prohibition' : 'duty';
  }
};

// Slot one sentence into the canonical frame: who, force, act, when,
// condition, exception. Slots that cannot be read stay empty.
export const propositionFromSentence = (sentence, context = {}) => {
  const text = String(sentence || '').replace(/\s+/g, ' ').trim();
  const { prev = '', clause = null, rewrite = '', sourceId = null } = context;
  const kind = typeProposition(text, { prev });
  const cls = classifyObligation(text, { prev });
  const actor = bearerOf(text);

  const { main, conditions, exceptions } = splitQualifiers(text);
  const timing = timingPhrases(main);

  let subject = '';
  let modality = '';
  let predicate = '';

  const dutyOf = DUTY_OF_RE.exec(main);
  const verb = DUTY_VERB.exec(main);
  const afterVerb = (verb ? main.slice(verb.index + verb[0].length) : main).trim();

  if (kind === 'definition') {
    const m = DEFINITION_RE.exec(text);
    if (m) {
      subject = `"${m[1].trim()}"`;
      modality = 'means';
      predicate = m[2].trim();
    } else {
      const p = DEFINITION_PLAIN_RE.exec(text);
      subject = text.slice(0, p ? p.index : 0).replace(/\b(?:in this act,|unless the context otherwise requires,?)\b/gi, '').trim();
      modality = 'means';
      predicate = p ? p[1].trim() : text;
    }
  } else if (kind === 'meta') {
    const titled = TITLE_RE.exec(text);
    const amend = AMEND_OP_RE.exec(text);
    if (titled) {
      subject = 'These Directions';
      modality = /^these\b/i.test(text) ? 'are called' : 'is called';
      predicate = titled[1].trim();
    } else if (COMMENCEMENT_RE.test(text)) {
      subject = 'These Directions';
      modality = 'come into force';
      predicate = stripTiming(text.slice(text.search(COMMENCEMENT_RE) + text.match(COMMENCEMENT_RE)[0].length)).replace(/^[:,\s]+/, '').trim();
    } else if (amend) {
      subject = dutySubjectOf(main);
      modality = 'is';
      predicate = afterVerb.replace(/^(?:be|stand)\s+/i, '').replace(/[\s:.]+$/, '').trim();
    } else {
      subject = dutySubjectOf(main) || 'These Directions';
      modality = 'is';
      predicate = afterVerb.replace(/^be\s+/i, '').replace(/[\s:.]+$/, '').trim();
    }
  } else if (kind === 'statement') {
    predicate = stripTiming(main);
  } else if (NO_SHALL_RE.test(main)) {
    const m = NO_SHALL_RE.exec(main);
    subject = m[1].trim();
    modality = 'must not';
    predicate = stripTiming(afterVerb.replace(/^not\s+/i, '')).replace(/[\s:.]+$/, '').trim();
  } else if (dutyOf) {
    subject = dutyOf[1].trim();
    modality = kind === 'prohibition' ? 'must not' : 'must';      predicate = stripTiming(main.slice(dutyOf.index + dutyOf[0].length)).replace(/^to\s+/i, '').replace(/[\s:.]+$/, '').trim();
  } else if (kind === 'permission') {
    const mayAt = main.search(/\bmay\b/i);
    subject = main.slice(0, mayAt).trim();
    modality = 'may';
    predicate = stripTiming(main.slice(mayAt + 3)).replace(/[\s:.]+$/, '').trim();
  } else if (kind === 'entitlement') {
    subject = namedSubject(main, actor);
    modality = 'is entitled to';
    predicate = stripTiming(afterVerb)
      .replace(/^be\s+(?:entitled|permitted|allowed|eligible(?:\s+to\s+be\s+classified)?)\s+(?:to\s+)?/i, '')
      .replace(/[\s:.]+$/, '')
      .trim();
  } else if (kind === 'constitutive') {
    subject = namedSubject(main, actor);
    if (/^there\s+shall\b/i.test(main.trim())) {
      subject = 'There';
      modality = 'must be';
      predicate = stripTiming(afterVerb.replace(/^be\s+/i, '')).replace(/[\s:.]+$/, '').trim();
    } else if (/^be\s+/.test(afterVerb) && !/^(?:be\s+)?(?:comprise|consist)\b/i.test(afterVerb)) {
      modality = 'is';
      predicate = stripTiming(afterVerb.replace(/^be\s+/i, '')).replace(/[\s:.]+$/, '').trim();
    } else if (/^comprise/i.test(afterVerb)) {
      modality = 'comprises';
      predicate = stripTiming(afterVerb.replace(/^comprise(?:s)?\s+(?:of\s+)?/i, '')).replace(/[\s:.]+$/, '').trim();
    } else if (/^consist/i.test(afterVerb)) {
      modality = 'consists of';
      predicate = stripTiming(afterVerb.replace(/^consist(?:s)?\s+(?:of\s+)?/i, '')).replace(/[\s:.]+$/, '').trim();
    } else {
      modality = 'is';
      predicate = stripTiming(afterVerb).replace(/[\s:.]+$/, '').trim();
    }
  } else {
    // duty, prohibition, method, illustration: the act is what follows the
    // force word. A prohibition carries its negation in the force, not in
    // the act, so "shall not exceed" reads "must not exceed".
    subject = namedSubject(main, actor);
    modality = kind === 'prohibition' ? 'must not' : kind === 'method' ? 'is computed as' : 'must';
    predicate = stripTiming(afterVerb.replace(/^not\s+/i, ''))
      .replace(/^be\s+(?:calculated|computed)\s+on\s+the\s+basis\s+of\s+/i, '')
      .replace(/[\s:.]+$/, '')
      .trim();
  }

  const proposition = {
    id: context.id || `p${sourceId != null ? sourceId + 1 : 1}`,
    sourceId,
    clause,
    source: text,
    rewrite,
    kind,
    kindLabel: getPropositionKind(kind).label,
    kindNote: getPropositionKind(kind).note,
    subject,
    modality,
    predicate,
    timing,
    conditions,
    exceptions,
    actor: { id: actor.id, label: actor.label, side: actor.side, known: actor.known },
    flags: { fragment: cls.fragment, hedged: cls.hedged },
  };
  proposition.frame = renderFrame(proposition);
  return proposition;
};

// The frame is one sentence in fixed slot order:
//   who, force, act, when, condition, exception.
export const renderFrame = (p) => {
  const head = [capitalize(p.subject), p.modality, p.predicate]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tail = [...p.timing, ...p.conditions, ...p.exceptions]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  return punctuate(tail.length ? `${head}, ${tail.join(', ')}` : head);
};

// The subject as the sentence names it. A duty the sentence names gets its
// own words; a duty only the bearer tag can place gets the tag's label.
const namedSubject = (main, actor) => {
  const head = dutySubjectOf(main);
  if (head) return head;
  return actor && actor.known ? actor.label : 'Someone';
};

const dutySubjectOf = (main) => {
  const m = DUTY_VERB.exec(String(main || ''));
  if (!m) return '';
  return String(main || '')
    .slice(0, m.index)
    .replace(/^(?:in order to [^,.;]{2,60},|where[^,.;]{2,60},)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// One proposition per source sentence. A sentence too long to say in one
// breath becomes several rows in the pipeline; it is still one proposition,
// so the frame is never listed twice for the same source sentence.
export const extractPropositions = (rows) => {
  const bySource = new Map();
  for (const row of rows) {
    if (!bySource.has(row.sourceId)) {
      bySource.set(row.sourceId, {
        sentence: row.sourceText,
        clause: row.clause,
        rewrites: [],
        parts: 0,
      });
    }
    const entry = bySource.get(row.sourceId);
    entry.rewrites.push(row.plain);
    entry.parts += 1;
  }
  const ordered = [...bySource.entries()].sort((a, b) => a[0] - b[0]);
  return ordered.map(([sourceId, entry], i) => {
    const proposition = propositionFromSentence(entry.sentence, {
      prev: i > 0 ? ordered[i - 1][1].sentence : '',
      clause: entry.clause,
      rewrite: entry.rewrites.join(' '),
      sourceId,
      id: `p${i + 1}`,
    });
    proposition.split = entry.parts > 1;
    return proposition;
  });
};
