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
//
// The object shape is the schema contract in
// private/proposition-schema-design.md (v2):
//
//   identity   id, sourceId, sourceText, clause, rewrite, split, schemaVersion
//   content    actor, action, object, qualifier, condition[], exception[],
//              consequence, deadline[], threshold[], authority, obligationType
//   annotation flags { hedged, illustration, needsReview, fragment }, unreadable[]
//   span       source { start, end, text }
//
// Absent values are scalars `null`, arrays `[]`. `unreadable[]` names the
// slots where the rules matched a trigger phrase but could not parse a span
// — "not present" and "not readable" are different states and stay
// distinguishable. Deprecated aliases (kind, timing, conditions, exceptions)
// are non-enumerable getters: readable on touch, never emitted.

import {
  classifyObligation, isDutyTrigger, bearerOf, DUTY_VERB,
} from './obligations.js';
import { punctuate, capitalize } from './segments.js';

// Bumped whenever the schema note is revised; shadow reports record it so a
// measured rate always names the schema it was measured under.
export const PROPOSITION_SCHEMA_VERSION = '1';

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
const MEAN_WORD_RE = /\bmean(?:s)?(?:\s+and\s+includes)?\b/i;

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

// Force modifiers on the act, kept in source words.
const QUALIFIER_SOURCE =
  '\\b(?:as\\s+far\\s+as\\s+(?:practicable|possible)|to\\s+the\\s+extent\\s+(?:practicable|possible)|so\\s+far\\s+as\\s+(?:practicable|possible)|where(?:ver)?\\s+possible|if\\s+practicable|preferably|endeavou?r(?:\\s+to)?|may\\s+consider)\\b';

// Numeric limits, copied character-for-character like deadlines.
const THRESHOLD_SOURCES = [
  '\\bshall\\s+not\\s+exceed\\s+[^,.;]{0,40}',
  '\\bnot\\s+exceeding\\s+[^,.;]{0,40}',
  '\\bat\\s+least\\s+[^,.;]{0,30}',
  '\\bno\\s+more\\s+than\\s+[^,.;]{0,30}',
  '\\bmaximum\\s+(?:period\\s+)?of\\s+[^,.;]{0,30}',
  '\\bminimum\\s+(?:period\\s+)?of\\s+[^,.;]{0,30}',
  '\\bsubject\\s+to\\s+a\\s+maximum\\s+(?:of\\s+)?[^,.;]{0,30}',
  '\\bup\\s+to\\s+[^,.;]{0,20}',
];

// Who notifies, decides or frames the act.
const AUTHORITY_SOURCES = [
  '\\bby\\s+notification[^,.;]{0,40}',
  '\\bwith\\s+(?:the\\s+)?prior\\s+(?:approval|sanction|concurrence|permission)\\s+of\\s+[^,.;]{0,40}',
  '\\bas\\s+(?:may\\s+be\\s+)?(?:specified|prescribed|determined|decided)\\s+by\\s+[^,.;]{0,40}',
  '\\bon\\s+the\\s+(?:recommendation|advice)\\s+of\\s+[^,.;]{0,40}',
];

// What follows from breach — read only from the sentence itself.
const CONSEQUENCE_SOURCES = [
  '\\bpunish(?:ed|able)\\s+with\\s+[^,.;]{0,80}',
  '\\bfailing\\s+which[^,.;]{0,40}',
  '\\bliable\\s+to\\s+(?:a\\s+|pay\\s+a\\s+)?(?:penalty|fine|imprisonment)[^,.;]{0,40}',
  '\\bshall\\s+attract[^,.;]{0,40}',
  '\\bon\\s+(?:such\\s+|any\\s+)?(?:contravention|default|non-?compliance)[^,.;]{0,40}',
];

const tidy = (text) =>
  String(text || '').replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();

// The act phrase as the sentence words it: whitespace and punctuation
// normalization only, never a rewording.
const cleanAct = (text) => tidy(text)
  .replace(/^[,;:.()\s]+/, '')
  .replace(/[\s,.:()]+$/, '')
  .trim();

const allMatches = (source, text) => {
  const re = new RegExp(source, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(String(text || ''))) !== null) out.push(tidy(m[0]));
  return out;
};

const phrasesFrom = (sources, text) => {
  const seen = new Map();
  for (const source of sources) {
    for (const phrase of allMatches(source, text)) {
      if (phrase && !seen.has(phrase)) seen.set(phrase, true);
    }
  }
  return [...seen.keys()];
};

const timingPhrases = (text) => phrasesFrom([TIMING_SOURCE], text);

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
// A modal is only a modal before a verb. The month "May" collides with the
// modal "may", and micro-fragments ("May", "May 2010", "4 Dec.") are dates,
// not permissions — the force word must be followed by a letter-led word
// (possibly after a comma: "may, by notification, appoint").
const MODAL_RE = /\b(?:shall|may|must|will|can|should|could|would|might)(?:\s*,)?\s+(?:not\s+)?[a-z]/i;
// A permission is a deontic grant in active voice — "may apply", "can
// submit". A passive possibility ("can be found") and a future ("will
// depend") are statements: the modal word alone is not the force.
const PERMISSION_RE = /\b(?:may|can)(?:\s*,)?\s+(?:not\s+)?(?!be\b)[a-z]/i;

export const typeProposition = (sentence, { prev = '' } = {}) => {
  const text = String(sentence || '');
  if (DEFINITION_RE.test(text)) return 'definition';
  // "No such rules shall be made ..." is a prohibition whatever else the
  // sentence looks like: the negation lives in the subject.
  if (NO_SHALL_RE.test(text.trim())) return 'prohibition';
  // The force pattern is read from the sentence proper. A proviso's "shall"
  // is the condition's force — "may frame a scheme, provided that no scheme
  // shall be framed" is a permission — so it never re-types the sentence.
  // Only when the main clause carries no force of its own does the whole
  // sentence decide: a proviso that binds still keeps the sentence on the
  // binding side.
  const { main } = splitQualifiers(text);
  const force = isDutyTrigger(main) || MODAL_RE.test(main) || NEGATED_RE.test(main)
    ? main : text;
  if (!isDutyTrigger(force)) return PERMISSION_RE.test(force) ? 'permission' : 'statement';
  const cls = classifyObligation(force, { prev });
  switch (cls.type) {
    case 'definition': return 'definition';
    case 'illustration': return 'illustration';
    case 'meta': return 'meta';
    case 'method': return 'method';
    case 'constitutive': return 'constitutive';
    case 'entitlement': return 'entitlement';
    default:
      return NEGATED_RE.test(force) ? 'prohibition' : 'duty';
  }
};

// Split the act into the verb phrase and the noun phrase it operates on.
// The object is read only where the split is unambiguous: the noun phrase
// must be determiner-led and begin right after the verb (plus at most one
// particle), or — for relation verbs like "comprise of" — right after the
// preposition. Anything else keeps the whole act as the action and leaves
// object null rather than guessing a boundary.
const DETERMINERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'any', 'all', 'such',
  'each', 'every', 'its', 'their', 'my', 'our', 'no', 'another', 'both', 'half',
]);
const PARTICLES = new Set([
  'of', 'to', 'in', 'for', 'on', 'with', 'from', 'at', 'by', 'into', 'onto',
  'upon', 'about', 'against', 'across', 'along', 'around', 'over', 'up', 'out',
  'off', 'down', 'through', 'toward', 'towards', 'before', 'after', 'during',
  'within', 'under', 'above', 'below', 'per', 'as',
]);
const word = (token) => String(token || '').toLowerCase().replace(/[^a-z']/g, '');

const splitActObject = (act) => {
  const tokens = String(act || '').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { action: '', object: null };
  const detAt = tokens.findIndex((t) => DETERMINERS.has(word(t)));
  if (detAt === 1 || (detAt === 2 && PARTICLES.has(word(tokens[1])))) {
    return {
      action: tokens.slice(0, detAt).join(' '),
      object: tokens.slice(detAt).join(' '),
    };
  }
  if (detAt === -1 && tokens.length >= 3 && word(tokens[1]) === 'of') {
    return { action: `${tokens[0]} of`, object: tokens.slice(2).join(' ') };
  }
  return { action: tokens.join(' '), object: null };
};

// Slot one sentence into the canonical frame: who, force, act, when,
// condition, exception. Slots that cannot be read stay empty.
//
// `propose` is the Task 5 entry point: it takes a segment ({ start, end,
// text }) or a bare sentence and the { jurisdiction, definitions } options.
// Both are accepted now — extraction is jurisdiction-agnostic and every slot
// is a verbatim source slice, which is what reading rule 6 (defined terms
// keep their source wording) requires — and neither changes the output, so
// the extractor stays deterministic whatever is passed.
export const propose = (segment, context = {}) => {
  const raw = typeof segment === 'string' ? String(segment || '') : String(segment?.text || '');
  const span = typeof segment === 'string' || !segment
    ? { start: 0, end: raw.length, text: raw }
    : {
      start: Number.isFinite(segment.start) ? segment.start : 0,
      end: Number.isFinite(segment.end) ? segment.end : raw.length,
      text: raw,
    };
  return propositionFromSentence(raw, { ...context, source: span });
};

export const propositionFromSentence = (sentence, context = {}) => {
  const text = String(sentence || '').replace(/\s+/g, ' ').trim();
  const {
    prev = '', clause = null, rewrite = '', sourceId = null,
    source: sourceSpan = null, split = false,
  } = context;
  const kind = typeProposition(text, { prev });
  const cls = classifyObligation(text, { prev });
  const actor = bearerOf(text);

  const { main, conditions, exceptions } = splitQualifiers(text);
  const deadline = timingPhrases(text);
  const threshold = phrasesFrom(THRESHOLD_SOURCES, text);
  const qualifiers = phrasesFrom([QUALIFIER_SOURCE], text);
  const qualifier = qualifiers.length ? qualifiers.join(', ') : null;
  const authorities = phrasesFrom(AUTHORITY_SOURCES, text);
  const authority = authorities.length ? authorities[0] : null;
  const consequences = phrasesFrom(CONSEQUENCE_SOURCES, text);
  const consequence = consequences.length ? consequences[0] : null;

  let subject = '';
  let modality = '';
  let predicate = '';
  let metaOp = null;

  const dutyOf = DUTY_OF_RE.exec(main);
  const verb = DUTY_VERB.exec(main);
  const afterVerb = (verb ? main.slice(verb.index + verb[0].length) : main).trim();

  if (kind === 'definition') {
    const m = DEFINITION_RE.exec(text);
    if (m) {
      subject = `\"${m[1].trim()}\"`;
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
      metaOp = 'be called';
    } else if (COMMENCEMENT_RE.test(text)) {
      subject = 'These Directions';
      modality = 'come into force';
      predicate = stripTiming(text.slice(text.search(COMMENCEMENT_RE) + text.match(COMMENCEMENT_RE)[0].length)).replace(/^[:,\s]+/, '').trim();
      metaOp = text.match(COMMENCEMENT_RE)[0].replace(/^shall\s+/i, '');
    } else if (amend) {
      subject = dutySubjectOf(main);
      modality = 'is';
      predicate = afterVerb.replace(/^(?:be|stand)\s+/i, '').replace(/[\s:.]+$/, '').trim();
      metaOp = amend[0].replace(/^shall\s+/i, '');
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
    modality = kind === 'prohibition' ? 'must not' : 'must';
    predicate = stripTiming(main.slice(dutyOf.index + dutyOf[0].length)).replace(/^to\s+/i, '').replace(/[\s:.]+$/, '').trim();
  } else if (kind === 'permission') {
    const mayAt = main.search(/\bmay\b/i);
    subject = main.slice(0, mayAt).trim();
    modality = 'may';
    predicate = stripTiming(main.slice(mayAt + 3)).replace(/[\s:.]+$/, '').trim();
  } else if (kind === 'entitlement') {
    subject = namedSubject(main, actor);
    modality = 'is entitled to';
    predicate = stripTiming(afterVerb)
      .replace(/^be\s+(?:entitled|permitted|allowed|eligible(?:\s+to\s+be\sclassified)?)\s+(?:to\s+)?/i, '')
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

  // ---- the act, as action + object -------------------------------------
  let action = null;
  let object = null;
  if (kind === 'definition') {
    action = (text.match(MEAN_WORD_RE) || ['means'])[0];
    object = predicate || null;
  } else if (kind === 'statement') {
    // A statement's action is the predicate in the source's own words — and
    // when there is no predicate (a fragment, a date line, a heading) the
    // source's own words are the subset. Never empty, never guessed.
    action = predicate || cleanAct(text) || null;
    object = null;
  } else if (metaOp) {
    action = metaOp;
    object = cleanAct(afterVerb.slice(metaOp.length)) || null;
  } else {
    // The act splits on its own words. Authority and qualifier phrases are
    // insertions — "may, by notification …, frame a scheme" — so the act is
    // read from the contiguous run of source words after the last insertion
    // (or before the first, when the insertion ends the act). Every part of
    // the action and the object is then a real span of the source.
    const actSource = kind === 'constitutive' ? afterVerb : predicate;
    const insertions = [...authorities, ...qualifiers]
      .map((phrase) => ({ phrase, at: actSource.indexOf(phrase) }))
      .filter((entry) => entry.at >= 0);
    let splitSource = actSource;
    if (insertions.length > 0) {
      const last = insertions.reduce((a, b) => (b.at > a.at ? b : a));
      const tail = actSource.slice(last.at + last.phrase.length);
      const head = actSource.slice(0, insertions[0].at);
      splitSource = cleanAct(tail) ? tail : head;
    }
    const splitAct = splitActObject(cleanAct(splitSource));
    action = splitAct.action || null;
    object = splitAct.object;
  }

  // ---- what the rules could not read -----------------------------------
  const unreadable = [];
  const actionTrigger = /\b(?:shall|must|may|will|is required to|are required to|has to|have to|mandatorily)\b/i;
  if (actionTrigger.test(text) && action == null) unreadable.push('action');
  const captured = [...conditions, ...exceptions].map((s) => s.toLowerCase());
  const condHeads = [...text.matchAll(/\b(provided that|provided|subject to|where|if)\b/gi)].map((m) => m[1].toLowerCase());
  const excHeads = [...text.matchAll(/\b(unless|other than|except)\b/gi)].map((m) => m[1].toLowerCase());
  if (condHeads.some((h) => !captured.some((c) => c.startsWith(h)))) unreadable.push('condition');
  if (excHeads.some((h) => !captured.some((c) => c.startsWith(h)))) unreadable.push('exception');
  if (/\bwithin\b|\b(?:no|not)\s+later\s+than\b|\bwith\s+immediate\s+effect\b|\bon\s+or\s+before\b|\bfrom\s+time\s+to\s+time\b/i.test(text) && deadline.length === 0) {
    unreadable.push('deadline');
  }
  if (/\bshall\s+not\s+exceed\b|\bnot\s+exceeding\b|\bat\s+least\b|\bno\s+more\s+than\b|\bmaximum\s+(?:period\s+)?of\b|\bminimum\s+(?:period\s+)?of\b|\bsubject\s+to\s+a\s+maximum\b|\bup\s+to\b/i.test(text) && threshold.length === 0) {
    unreadable.push('threshold');
  }
  if (/\bby\s+notification\b|\bprior\s+(?:approval|sanction|concurrence|permission)\s+of\b|\b(?:specified|prescribed|determined|decided)\s+by\b|\b(?:recommendation|advice)\s+of\b/i.test(text) && authority == null) {
    unreadable.push('authority');
  }
  if (/\bpunish(?:ed|able)\s+with\b|\bfailing\s+which\b|\bliable\s+to\s+(?:a\s+|pay\s+a\s+)?(?:penalty|fine|imprisonment)\b|\bshall\s+attract\b|\bon\s+(?:such\s+|any\s+)?(?:contravention|default|non-?compliance)\b/i.test(text) && consequence == null) {
    unreadable.push('consequence');
  }

  const proposition = {
    id: context.id || `p${sourceId != null ? sourceId + 1 : 1}`,
    sourceId,
    clause,
    sourceText: text,
    source: sourceSpan || { start: 0, end: text.length, text },
    rewrite,
    split: Boolean(split),
    schemaVersion: PROPOSITION_SCHEMA_VERSION,
    obligationType: kind,
    actor: { id: actor.id, label: actor.label, side: actor.side, known: actor.known },
    action,
    object,
    qualifier,
    condition: conditions,
    exception: exceptions,
    consequence,
    deadline,
    threshold,
    authority,
    subject,
    modality,
    predicate,
    flags: {
      hedged: cls.hedged || qualifier != null,
      illustration: kind === 'illustration',
      needsReview: false,
      fragment: cls.fragment,
    },
    unreadable,
    kindLabel: getPropositionKind(kind).label,
    kindNote: getPropositionKind(kind).note,
  };
  proposition.frame = renderFrame(proposition);

  // Prohibition 4: every numeric token must appear verbatim in the frame or
  // in a declared slot. One that cannot be placed marks the proposition for
  // review instead of disappearing.
  const numberTokens = text.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  const placed = [
    proposition.frame, clause || '', action || '', object || '', qualifier || '',
    authority || '', consequence || '', ...deadline, ...threshold,
    ...conditions, ...exceptions,
  ].join(' ');
  proposition.flags.needsReview = unreadable.length > 0
    || numberTokens.some((token) => !placed.includes(token));

  // Deprecated aliases: accepted on read, never emitted.
  for (const [alias, canonical] of [
    ['kind', 'obligationType'],
    ['timing', 'deadline'],
    ['conditions', 'condition'],
    ['exceptions', 'exception'],
  ]) {
    Object.defineProperty(proposition, alias, {
      get: () => proposition[canonical],
      enumerable: false,
      configurable: true,
    });
  }
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
    .replace(/\s+([,;:])/g, '$1')
    .trim();
  const tail = [...p.deadline, ...p.condition, ...p.exception]
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
        start: Number.isFinite(row.start) ? row.start : null,
        end: Number.isFinite(row.end) ? row.end : null,
      });
    }
    const entry = bySource.get(row.sourceId);
    entry.rewrites.push(row.plain);
    entry.parts += 1;
  }
  const ordered = [...bySource.entries()].sort((a, b) => a[0] - b[0]);
  return ordered.map(([sourceId, entry], i) => propose(
    entry.start != null
      ? { start: entry.start, end: entry.end, text: entry.sentence }
      : entry.sentence,
    {
      prev: i > 0 ? ordered[i - 1][1].sentence : '',
      clause: entry.clause,
      rewrite: entry.rewrites.join(' '),
      sourceId,
      id: `p${i + 1}`,
      split: entry.parts > 1,
    },
  ));
};
