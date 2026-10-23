// THS proposition renderer (Task 6).
//
// A proposition is the meaning; this module is the words. It emits one plain
// sentence in the canonical frame for the proposition's kind — who, force,
// act, when, condition, exception — per the frame table in
// private/proposition-schema-design.md. The statutory dictionary moves down a
// layer here: it is the vocabulary the renderer uses *inside* a frame, not a
// transformation of the sentence, and every rule it uses is reported back.
//
// The renderer's prohibitions, enforced by construction and by the render
// suite in scripts/test-proposition.mjs:
//
// 1. No invention of actors. The subject is a source slice, or the actor tag
//    with known: true, or the literal fallback "Someone".
// 2. No added conditions — and no dropped ones. Tail clauses come only from
//    the proposition's own slots, and a slot already present in the frame is
//    never appended twice.
// 3. No dropped negations. The force comes from the kind (a prohibition
//    renders "must not"), never from a paraphrase of the act.
// 4. No silently dropped numbers. Slots are verbatim source spans and the
//    dictionary has no rules containing digits, so every number read into
//    the proposition reaches the output; a tail clause is appended whenever
//    its words are not already in the frame.
// 5. A sentence no rule touched — and any kind this module does not
//    recognise — renders with the source beside it, never a clean card: an
//    unrecognised kind returns the source text and marks the sentence
//    unresolved. A `statement` keeps its own words: tidying is whitespace
//    and punctuation normalization only, no rewording, ever.

import {
  getJurisdiction, applyDictionary, DEFAULT_JURISDICTION, DICTIONARY_VERSION,
} from './glossary.js';
import { punctuate, capitalize } from './segments.js';

const tidy = (s) => String(s || '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:])/g, '$1')
  .replace(/^[,;:.()\s]+/, '')
  .replace(/[\s,.:()]+$/, '')
  .trim();

const has = (s) => String(s || '').trim() !== '';

// Source words as they stand: whitespace and spacing normalization only —
// terminal punctuation is the sentence's, not the renderer's to remove.
const tidySource = (s) => String(s || '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:])/g, '$1')
  .trim();

// Prohibition 1: the subject is a source slice, the named actor, or the
// declared fallback. Nothing else.
const actorOf = (p) => {
  const subject = String(p.subject || '').trim();
  if (subject) return subject;
  return p.actor && p.actor.known ? p.actor.label : 'Someone';
};

// Force is derived from the kind plus the negation read — a twelfth field it
// is not. Prohibition 3: a prohibition renders "must not" whatever the act
// says, and the negation never lives in the act.
const FORCE = {
  duty: 'must',
  prohibition: 'must not',
  permission: 'may',
  entitlement: 'is entitled to',
  illustration: 'must',
};

const RELATIONS = /^(?:is|are|comprises?|consists? of|must be)$/i;

// Append tail clauses to a head. A clause whose words are already in the
// frame is not appended twice (prohibitions 2 and 4), and no clause enters
// that did not come from the proposition's own slots.
const withTail = (head, p) => {
  let out = tidy(head);
  const when = [...(p.deadline || []), ...(p.threshold || [])]
    .map(tidy)
    .filter((clause) => has(clause) && !out.toLowerCase().includes(clause.toLowerCase()))
    .join(', ');
  if (has(when)) out = `${out}, ${when}`;
  const clauses = [
    ...(p.condition || []),
    ...(p.exception || []),
    p.consequence,
    p.authority,
  ];
  for (const raw of clauses) {
    const clause = tidy(raw);
    if (!has(clause)) continue;
    if (out.toLowerCase().includes(clause.toLowerCase())) continue;
    out = `${out}; ${clause}`;
  }
  return out;
};

const actOf = (p) => [tidy(p.action), tidy(p.object)].filter(has).join(' ');

const forceFrame = (p, force) =>
  withTail([capitalize(actorOf(p)), force, actOf(p)].filter(has).join(' '), p);

const FRAMES = {
  duty: (p) => forceFrame(p, FORCE.duty),
  prohibition: (p) => forceFrame(p, FORCE.prohibition),
  permission: (p) => forceFrame(p, FORCE.permission),
  entitlement: (p) => forceFrame(p, FORCE.entitlement),
  illustration: (p) => forceFrame(p, FORCE.illustration),
  definition: (p) =>
    withTail(`${capitalize(actorOf(p))} means ${tidy(p.object) || tidy(p.predicate)}`, p),
  constitutive: (p) => {
    const relation = RELATIONS.test(String(p.modality || '').trim()) ? p.modality : 'is';
    return withTail(`${capitalize(actorOf(p))} ${relation} ${tidy(p.object) || tidy(p.predicate)}`, p);
  },
  method: (p) =>
    withTail(`${capitalize(actorOf(p))} is computed as ${tidy(p.predicate) || tidy(p.object) || actOf(p)}`, p),
  meta: (p) => {
    const operation = tidy(p.action) || tidy(p.modality) || 'operates';
    const material = tidy(p.predicate) || tidy(p.object);
    return withTail(`${capitalize(actorOf(p))} ${operation}${has(material) ? `: ${material}` : ''}`, p);
  },
};

// Render one proposition. Returns the plain sentence, the canonical frame it
// was built from, and the dictionary substitutions used on the way — so a
// reader can see what the vocabulary changed and what it did not.
export const render = (proposition, options = {}) => {
  const p = proposition || {};
  const {
    jurisdiction = DEFAULT_JURISDICTION, protectedTerms = [],
  } = options;
  const j = typeof jurisdiction === 'string' || jurisdiction == null
    ? getJurisdiction(jurisdiction || DEFAULT_JURISDICTION)
    : jurisdiction;
  const base = {
    plain: '', frame: null, substitutions: [], unresolved: false,
    dictionaryVersion: DICTIONARY_VERSION,
  };
  const source = tidySource(p.sourceText);

  // A statement is the sentence's own words. Tidying is whitespace and
  // punctuation normalization only — no dictionary, no rewording, ever.
  if (p.obligationType === 'statement') {
    return { ...base, plain: source, frame: source };
  }

  const build = FRAMES[p.obligationType];
  if (!build) {
    // The renderer never emits a frame for a type it does not recognise.
    return { ...base, plain: source, unresolved: true };
  }

  const frame = punctuate(build(p));
  const { plain, changes } = applyDictionary(frame, j.phrases, { protectedTerms });
  return { ...base, plain, frame, substitutions: changes };
};
