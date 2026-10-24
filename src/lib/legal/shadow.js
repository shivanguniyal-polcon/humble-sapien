// THS shadow mode (Task 7).
//
// Both engines run on every sentence — today's substitution rewrite
// (simplify()) and the proposition extractor — and a sentence *agrees* when
// all six checks in private/proposition-schema-design.md pass:
//
//   1. force parity        source negation ↔ frame force ↔ rewrite cue
//   2. type parity         obligation row type ↔ proposition kind (the table)
//   3. number conservation verbatim on the proposition side, normalized on
//                          the rewrite side
//   4. actor non-invention subject is a source span, an evidenced actor tag,
//                          or the declared fallback "Someone"
//   5. condition/exception conservation, symmetric: source → proposition →
//                          rewrite, matched by head connective plus
//                          content-word overlap (textsim)
//   6. coverage            every sentence ends in a proposition carrying the
//                          minimum viable subset
//
// A check with nothing to test on a sentence passes vacuously and is not
// counted as engaged; the report says how many sentences each check actually
// engaged. A sentence's verdict is all-or-nothing across the six.
//
// Three failure classes are critical — an invented actor, a force flip, a
// silently dropped number — and any one of them fails the switch gate
// outright, whatever the rate. A number the extractor could not place is
// declared (needsReview) rather than silent: it fails the check but is not
// critical.
//
// The threshold is the design note's: ≥ 95% agreement, zero criticals,
// ≥ 18 of 20 in a stratified human review drawn before the run, and founder
// sign-off. Below threshold is a valid finding — the report publishes and the
// panel stays on substitution. Only the founder names the switch.

import { classifyObligation } from './obligations.js';
import {
  PROPOSITION_KINDS, getPropositionKind, propositionFromSentence, renderFrame,
  qualifierClauses, qualifierHead,
} from './propositions.js';
import { render } from './render.js';
import { simplify } from '../simplify.js';
import { segment, countWords } from './segments.js';
import { tokenise } from '../textsim.js';
import { DEFAULT_JURISDICTION } from './glossary.js';

export const SHADOW_VERSION = 'ths-shadow-1.0.0';

export const CHECKS = [
  { id: 'force', label: 'Force parity', criticalClass: 'force flip' },
  { id: 'type', label: 'Type parity', criticalClass: null },
  { id: 'numbers', label: 'Number conservation', criticalClass: 'silently dropped number' },
  { id: 'actor', label: 'Actor non-invention', criticalClass: 'invented actor' },
  { id: 'qualifiers', label: 'Condition/exception conservation', criticalClass: null },
  { id: 'coverage', label: 'Coverage', criticalClass: null },
];

export const CRITICAL_CLASSES = CHECKS.filter((c) => c.criticalClass).map((c) => c.criticalClass);

export const THRESHOLD = {
  agreement: 0.95,
  criticals: 0,
  humanReviewPassed: 18,
  humanReviewOf: 20,
  founderSignOff: true,
};

const mk = (id, engaged, pass, detail, critical = false) => {
  const meta = CHECKS.find((c) => c.id === id);
  const fails = engaged && !pass;
  return {
    id,
    label: meta.label,
    engaged: Boolean(engaged),
    pass: Boolean(pass),
    critical: Boolean(critical && fails),
    criticalClass: critical && fails ? meta.criticalClass : null,
    detail,
  };
};

// ---- check 1: force parity -------------------------------------------------

const NEGATION =
  /\b(?:not|never|n't|cannot|can't|won't|shan't|mustn't|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|hasn't|haven't|hadn't|shouldn't|wouldn't|couldn't)\b/i;
const NEGATION_LEAD = /^\s*(?:no|nothing|none|nobody)\b/i;

export const negationOf = (text) => {
  const s = String(text || '');
  return NEGATION.test(s) || NEGATION_LEAD.test(s);
};

export const checkForce = ({ source = '', frame = '', rewrite = '' }) => {
  const values = [negationOf(source), negationOf(frame), negationOf(rewrite)];
  const engaged = values.some(Boolean);
  const pass = values[0] === values[1] && values[0] === values[2];
  return mk('force', engaged, pass,
    { sourceNegates: values[0], frameNegates: values[1], rewriteNegates: values[2] },
    true);
};

// ---- check 2: type parity --------------------------------------------------

// The only place the obligations.js classifier's seven types and this
// schema's ten proposition kinds are mapped. A kind not in this table for the
// row's type is a disagreement; `statement` has no obligation row and is
// vacuously true.
const TYPE_PARITY = {
  action: ['duty', 'prohibition'],
  entitlement: ['entitlement', 'permission'],
  constitutive: ['constitutive'],
  meta: ['meta'],
  method: ['method'],
  definition: ['definition'],
  illustration: ['illustration'],
};

export const checkType = ({ source = '', kind = '' }) => {
  if (kind === 'statement') return mk('type', false, true, { kind, rowType: null, allowed: null });
  const rowType = classifyObligation(String(source || '')).type;
  const allowed = TYPE_PARITY[rowType] || [];
  return mk('type', true, allowed.includes(kind), { kind, rowType, allowed });
};

// ---- check 3: number conservation -----------------------------------------

const NUMERIC = /\d[\d,]*(?:\.\d+)?/g;
const numTokens = (text) => String(text || '').match(NUMERIC) || [];
const numValue = (token) => String(token).replace(/,/g, '').replace(/\.$/, '');

export const checkNumbers = ({ source = '', propositionText = '', rewrite = '', needsReview = false }) => {
  const tokens = numTokens(source);
  const engaged = tokens.length > 0;
  const prop = String(propositionText || '');
  const rewriteValues = numTokens(rewrite).map(numValue);
  const missing = [];
  for (const token of tokens) {
    // Verbatim on the proposition side (reading rule 2); value-equal after
    // normalization on the rewrite side — the substitution engine may
    // reformat 5,000 as 5000 while preserving the value.
    const inProposition = prop.includes(token);
    const inRewrite = rewriteValues.includes(numValue(token));
    if (!inProposition || !inRewrite) missing.push({ token, inProposition, inRewrite });
  }
  return mk('numbers', engaged, missing.length === 0,
    { tokens, missing, needsReview },
    !needsReview);
};

// ---- check 4: actor non-invention -----------------------------------------

const norm = (s) => String(s || '').toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/^[,;:.()\s]+|[,;:.()\s]+$/g, '');

export const checkActor = ({ source = '', subject = '', actor = null }) => {
  const sub = norm(subject);
  if (!sub || sub === 'someone') {
    return mk('actor', false, true, { subject: sub || 'someone', fallback: true });
  }
  const src = norm(source);
  const subjectInSource = src.includes(sub);
  const label = actor && actor.known ? norm(actor.label) : '';
  const labelInSource = Boolean(label) && src.includes(label);
  return mk('actor', true, subjectInSource || labelInSource,
    { subject: sub, label, subjectInSource, labelInSource },
    true);
};

// ---- check 5: condition/exception conservation ----------------------------
//
// Symmetric: every qualifier read into the proposition must appear in the
// rewrite, and every qualifier phrase in the source must appear in the
// proposition. Matching is head connective plus content-word overlap — the
// drafter's connective and the substance of the clause, not exact strings.

// The shared clause reader — the proposition extractor's own — so a
// qualifier phrase is read the same way on both sides of the comparison.
export const qualifierPhrases = (text) => qualifierClauses(text);

const headOf = (phrase) => qualifierHead(phrase);

const overlap = (phrase, text) => {
  const toks = tokenise(phrase);
  if (!toks.length) return 1;
  const hay = new Set(tokenise(text));
  return toks.filter((t) => hay.has(t)).length / toks.length;
};

const matchInEntries = (phrase, entries) => {
  const head = headOf(phrase);
  return entries.some((entry) => headOf(entry) === head && overlap(phrase, entry) >= 0.5);
};

const conservedInRewrite = (phrase, rewrite) => {
  const text = String(rewrite || '');
  const phrases = qualifierPhrases(text);
  if (matchInEntries(phrase, phrases.map((q) => q.phrase))) return true;
  // The joint may have moved or been dropped in a faithful rewording: fall
  // back to the connective present anywhere plus the clause's content words.
  const head = headOf(phrase);
  return Boolean(head) && new RegExp(`\\b${head}\\b`, 'i').test(text) && overlap(phrase, text) >= 0.5;
};

export const checkQualifiers = ({ source = '', proposition = null, rewrite = '' }) => {
  const p = proposition || {};
  const sourcePhrases = qualifierPhrases(source);
  const entries = [...(p.condition || []), ...(p.exception || [])].map(String);
  const rewritePhrases = qualifierPhrases(rewrite);
  const engaged = sourcePhrases.length > 0 || entries.length > 0 || rewritePhrases.length > 0;
  const missingInRewrite = entries.filter((e) => !conservedInRewrite(e, rewrite));
  const missingInProposition = sourcePhrases
    .filter((q) => !matchInEntries(q.phrase, entries))
    .map((q) => q.phrase);
  return mk('qualifiers', engaged, missingInRewrite.length === 0 && missingInProposition.length === 0,
    {
      source: sourcePhrases.map((q) => q.phrase),
      proposition: entries,
      missingInRewrite,
      missingInProposition,
    });
};

// ---- check 6: coverage ----------------------------------------------------
//
// The minimum viable subset: source text, a type, an actor and a predicate.
// Identity fields (id, sourceId) are pipeline plumbing and recorded in the
// detail. An untouched sentence certified green is structurally impossible
// when this passes on every sentence.

const ACTION_KINDS = new Set(['duty', 'prohibition', 'permission', 'entitlement', 'illustration']);

export const checkCoverage = ({ proposition = null }) => {
  const p = proposition || {};
  // "action/predicate" is per kind: the action-bearing kinds need the act;
  // the rest carry their content in the predicate or the meaning slot.
  const content = ACTION_KINDS.has(p.obligationType)
    ? Boolean(String(p.action || '').trim())
    : Boolean(String(p.action || p.predicate || p.object || '').trim());
  const subset = {
    sourceText: Boolean(String(p.sourceText || '').trim()),
    obligationType: Boolean(p.obligationType),
    actor: Boolean(p.actor),
    content,
    id: p.id != null,
    sourceId: p.sourceId != null,
  };
  return mk('coverage', true,
    subset.sourceText && subset.obligationType && subset.actor && subset.content,
    subset);
};

// ---- one sentence, both engines -------------------------------------------

export const compareSentence = (source, options = {}) => {
  const {
    prev = '', id = 's1', sourceId = 1, jurisdiction = DEFAULT_JURISDICTION,
  } = options;
  const text = String(source || '');
  const proposition = propositionFromSentence(text, { prev, id, sourceId });
  const frame = renderFrame(proposition);
  const rendered = render(proposition, { jurisdiction });
  const substitution = simplify(text).simplifiedText;

  // Everything the proposition read, for the verbatim side of check 3.
  const propositionText = [
    frame,
    proposition.action, proposition.object, proposition.qualifier,
    ...(proposition.deadline || []), ...(proposition.threshold || []),
    ...(proposition.condition || []), ...(proposition.exception || []),
    proposition.consequence, proposition.authority,
  ].filter(Boolean).join(' ');

  const checks = [
    checkForce({ source: text, frame, rewrite: substitution }),
    checkType({ source: text, kind: proposition.obligationType }),
    checkNumbers({
      source: text,
      propositionText,
      rewrite: substitution,
      needsReview: Boolean(proposition.flags && proposition.flags.needsReview),
    }),
    checkActor({ source: text, subject: proposition.subject, actor: proposition.actor }),
    checkQualifiers({ source: text, proposition, rewrite: substitution }),
    checkCoverage({ proposition }),
  ];

  return {
    id,
    sourceId,
    source: text,
    substitution,
    frame,
    render: {
      plain: rendered.plain,
      substitutions: rendered.substitutions,
      unresolved: Boolean(rendered.unresolved),
    },
    proposition: {
      obligationType: proposition.obligationType,
      kindLabel: getPropositionKind(proposition.obligationType).label,
      subject: proposition.subject,
      actor: proposition.actor,
      action: proposition.action,
      object: proposition.object,
      condition: proposition.condition,
      exception: proposition.exception,
      deadline: proposition.deadline,
      threshold: proposition.threshold,
      authority: proposition.authority,
      consequence: proposition.consequence,
      flags: proposition.flags,
      unreadable: proposition.unreadable,
    },
    checks,
    agree: checks.every((c) => c.pass),
    critical: checks.filter((c) => c.critical).map((c) => c.criticalClass),
  };
};

export const rateOf = (sentences) => {
  const total = sentences.length;
  const agreed = sentences.filter((s) => s.agree).length;
  const perCheck = {};
  for (const meta of CHECKS) {
    const engaged = sentences.filter((s) => s.checks.find((c) => c.id === meta.id).engaged).length;
    const passed = sentences.filter((s) => {
      const c = s.checks.find((x) => x.id === meta.id);
      return c.engaged && c.pass;
    }).length;
    perCheck[meta.id] = {
      label: meta.label,
      engaged,
      passed,
      failed: engaged - passed,
    };
  }
  const byClass = Object.fromEntries(CRITICAL_CLASSES.map((cls) => [
    cls,
    sentences.reduce((n, s) => n + s.critical.filter((x) => x === cls).length, 0),
  ]));
  return {
    total,
    agreed,
    disagreed: total - agreed,
    agreement: total ? agreed / total : 1,
    perCheck,
    critical: {
      total: Object.values(byClass).reduce((a, b) => a + b, 0),
      byClass,
    },
  };
};

// Both engines over one text. The sentence set is whatever segmentation
// yields — every sentence, no filtering — so the count is reproducible.
export const compareEngines = (text, options = {}) => {
  const { jurisdiction = DEFAULT_JURISDICTION } = options;
  const segments = segment(String(text || ''));
  const sentences = segments.map((seg, i) => compareSentence(seg.text, {
    prev: i > 0 ? segments[i - 1].text : '',
    id: `s${i + 1}`,
    sourceId: i + 1,
    jurisdiction,
  }));
  return { sentences, rate: rateOf(sentences) };
};

// ---- the threshold --------------------------------------------------------

const pct = (x) => `${(x * 100).toFixed(1)}%`;

export const thresholdVerdict = ({ rate, humanReview = null, founderSignOff = false }) => {
  const bars = [];
  bars.push({
    id: 'agreement',
    text: `agreement needs ≥ ${pct(THRESHOLD.agreement)}; has ${pct(rate.agreement)} (${rate.agreed} of ${rate.total})`,
    pass: rate.agreement >= THRESHOLD.agreement,
  });
  bars.push({
    id: 'criticals',
    text: `critical violations need = ${THRESHOLD.criticals}; has ${rate.critical.total}`,
    pass: rate.critical.total === THRESHOLD.criticals,
  });
  bars.push(humanReview ? {
    id: 'humanReview',
    text: `human review needs ≥ ${THRESHOLD.humanReviewPassed} of ${THRESHOLD.humanReviewOf}; has ${humanReview.passed} of ${humanReview.of}`,
    pass: humanReview.passed >= THRESHOLD.humanReviewPassed && humanReview.of === THRESHOLD.humanReviewOf,
  } : {
    id: 'humanReview',
    text: `human review needs ≥ ${THRESHOLD.humanReviewPassed} of ${THRESHOLD.humanReviewOf}; has nothing yet — the ${THRESHOLD.humanReviewOf} sentences are drawn, the review is the founder's`,
    pass: null,
  });
  bars.push({
    id: 'founderSignOff',
    text: `founder sign-off needs a dated name; has ${founderSignOff ? 'it' : 'nothing yet'}`,
    pass: founderSignOff ? true : null,
  });

  const failed = bars.some((b) => b.pass === false);
  const outstanding = bars.some((b) => b.pass === null);
  return {
    switch: failed ? 'not-justified' : outstanding ? 'pending' : 'justified',
    bars,
    reasons: bars
      .filter((b) => b.pass !== true)
      .map((b) => (b.pass === false ? b.text : `outstanding — ${b.text}`)),
  };
};

// ---- the human-review draw ------------------------------------------------
//
// Stratified and outcome-independent: a record qualifies by stratum alone and
// the pick inside a stratum is the lowest hash of the source text — no
// verdict, rate or check result enters the draw. "Drawn before the run" is
// mechanical, not a promise.

const fnv = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const drawReviewSample = (records, size = THRESHOLD.humanReviewOf) => {
  const strata = [
    ...PROPOSITION_KINDS.map((k) => ({
      stratum: k.id,
      pick: (r) => r.proposition.obligationType === k.id,
    })),
    { stratum: 'fragment', pick: (r) => Boolean(r.proposition.flags && r.proposition.flags.fragment) },
    { stratum: 'hedged', pick: (r) => Boolean(r.proposition.flags && r.proposition.flags.hedged) },
    { stratum: 'illustration', pick: (r) => Boolean(r.proposition.flags && r.proposition.flags.illustration) },
    {
      stratum: 'mixed',
      pick: (r) => (r.proposition.condition || []).length + (r.proposition.exception || []).length >= 2,
    },
    { stratum: 'long', pick: (r) => countWords(r.source) > 35 },
  ];
  const byHash = [...records].sort((a, b) => fnv(a.source) - fnv(b.source) || (a.id < b.id ? -1 : 1));
  const taken = new Set();
  const out = [];
  for (const stratum of strata) {
    if (out.length >= size) break;
    const hit = byHash.find((r) => !taken.has(r.id) && stratum.pick(r));
    if (hit) {
      taken.add(hit.id);
      out.push({ ...hit, reviewStratum: stratum.stratum });
    }
  }
  for (const r of byHash) {
    if (out.length >= size) break;
    if (taken.has(r.id)) continue;
    taken.add(r.id);
    out.push({ ...r, reviewStratum: 'filler' });
  }
  return out;
};
