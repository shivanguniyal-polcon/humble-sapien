// Per-sentence confidence.
//
// The risk axis answers one question: "what kind of change did the engine
// make here?" — green, amber, red. This axis answers a different one: "how
// far can a reviewer trust this sentence without going back to the source?"
//
// They are independent on purpose. A sentence can be high confidence and
// red (the engine is certain it moved the legal effect, so it is certainly
// a lawyer's problem) or low confidence and green (the engine barely looked
// at it, so the tidy green flag means very little). Collapsing the two
// destroys the distinction a reviewer actually works with.
//
// Two things are measured, and nothing else:
//
//   engagement     whether the dictionary fired on the sentence at all. A
//                  sentence no rule touched is a sentence the engine
//                  certified nothing about, and it is Low. Never High,
//                  never rounded up.
//   structure      what the engine could not resolve inside the sentence:
//                  a cross-reference, a proviso, a rule a definition
//                  blocked, a list whose scope the engine cannot model.
//
// The structural markers come in two kinds, and keeping them apart is what
// makes the axis usable. Some are unresolved: the sentence points at a
// text this run never read, or attaches a condition the engine did not
// model. Some are merely worth saying out loud: the sentence uses a defined
// term, and the engine read that definition and left the term alone. A
// protected term is not a defect; it is the engine doing its job, and it
// must not push a sentence down the scale on its own.
//
//   High     the engine rewrote the sentence with literal rules, and left
//            nothing in it unresolved.
//   Medium   one unresolved thing, or only things worth mentioning, or the
//            rewrite leaned on an interpretation.
//   Low      the engine did not engage with the sentence, or two or more
//            things in it stayed unresolved.
//
// The flag is not scored here. Risk answers "does this change the legal
// effect"; confidence answers "how much of this sentence did the engine
// actually examine". A penalty clause rewritten literally is high confidence
// and still red. Keeping the two apart is what lets a reviewer read both
// chips and act on each one separately.
//
// What the flag does do is set `verify`: a red sentence always has to be
// read against the source and signed off, whatever the engine's confidence
// in its own work. That is a separate field for a separate decision.
//
// The whole module is a pure function of the pipeline result. It calls no
// clock and no network, so adding a confidence chip to a sentence does not
// touch the determinism promise the licensing page makes.

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];

export const CONFIDENCE_LABELS = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export const CONFIDENCE_MEANING = {
  high: 'The engine rewrote this sentence with literal rules and left nothing in it unresolved.',
  medium: 'One thing in this sentence was left for you, or the rewrite leaned on an interpretation rather than a literal substitution.',
  low: 'The engine could not certify this sentence. Read it against the source, sentence by sentence.',
};

// A cross-reference is a pointer the engine does not follow. "Section 4",
// "the Second Schedule", "the Act" — the meaning of the sentence depends on
// a text this run never read.
const CROSS_REFERENCE = /\b(?:section|sub-section|schedule|chapter|part|clause|article|paragraph)\s+(\d+|[ivxlcdm]+)\b|\b(?:the|this|said)\s+Act\b/i;

// A proviso changes what the rest of the sentence means. The engine rewrites
// the words; it does not model the condition they are attached to.
const PROVISO = /\b(?:unless|provided that|provided\b|subject to|except(?:ed)?|notwithstanding|in addition to|save as|without prejudice to|to the extent|so far as|subject to the provisions)\b/i;

// A list whose scope the engine cannot model: two or more enumerated items.
const ENUMERATION = /\((?:[a-z]|[ivxlcdm]+|\d+)\)/gi;

const countMatches = (text, re) => (String(text || '').match(re) || []).length;

// The structural markers, and what each one costs the sentence.
//
//   unresolved   the sentence depends on something the run did not read, or
//                the engine's rewrite of it is an interpretation
//   informational the engine handled it, and a reviewer should know
//
// A defined term is informational: the engine read the definition and left
// the term exactly as drafted. A split is informational: the engine broke a
// long sentence at a punctuation mark, which is a formatting decision, not a
// legal one.
const MARKERS = [
  {
    id: 'defined-term',
    label: 'Defined term',
    severity: 'informational',
    detail: 'The sentence leans on a term the instrument defines, and the engine left that definition exactly as drafted.',
  },
  {
    id: 'cross-reference',
    label: 'Cross-reference',
    severity: 'unresolved',
    detail: 'The sentence points at another provision the engine did not read, so the meaning is not fully inside this run.',
  },
  {
    id: 'proviso',
    label: 'Condition attached',
    severity: 'unresolved',
    detail: 'The sentence carries a proviso or qualifier. The engine rewrote the words, not the condition they attach to.',
  },
  {
    id: 'split',
    label: 'Split sentence',
    severity: 'informational',
    detail: 'The source sentence was too long to read in one breath and was split at a punctuation mark.',
  },
  {
    id: 'blocked',
    label: 'Rule blocked',
    severity: 'unresolved',
    detail: 'A defined term stopped a rule from firing, so that phrase was left as drafted.',
  },
  {
    id: 'enumeration',
    label: 'List',
    severity: 'unresolved',
    detail: 'The sentence contains a list. The engine cannot tell which item a duty attaches to.',
  },
];

// Find the structural markers in one sentence.
//   source   the source sentence
//   terms    defined terms the sentence uses
//   parts    how many pieces the source sentence was split into
//   blocked  rules a definition prevented from firing
export const structuralMarkers = ({ source = '', terms = [], parts = 1, blocked = [] } = {}) => {
  const found = [];
  const text = String(source);

  if (Array.isArray(terms) && terms.length > 0) {
    found.push({
      id: 'defined-term',
      label: 'Defined term',
      severity: 'informational',
      detail: `${MARKERS[0].detail} Terms in this sentence: ${terms.join(', ')}.`,
    });
  }
  if (CROSS_REFERENCE.test(text)) {
    found.push({ ...MARKERS[1] });
  }
  if (PROVISO.test(text)) {
    found.push({ ...MARKERS[2] });
  }
  if (parts > 1) {
    found.push({ ...MARKERS[3] });
  }
  if (Array.isArray(blocked) && blocked.length > 0) {
    found.push({
      id: 'blocked',
      label: 'Rule blocked',
      severity: 'unresolved',
      detail: `${MARKERS[4].detail} Blocked: ${blocked.map((b) => b.from).join(', ')}.`,
    });
  }
  if (countMatches(text, ENUMERATION) >= 2) {
    found.push({ ...MARKERS[5] });
  }

  return found;
};

// Score one sentence.
//   source      the source sentence
//   changes     the dictionary rules that fired on it
//   terms       defined terms the sentence uses
//   parts       how many pieces the source sentence was split into
//   blocked     rules a definition prevented from firing
//   flag        the risk flag, recorded for the reviewer but NOT used to
//               score confidence: risk and confidence are separate axes
export const scoreConfidence = ({
  source = '',
  changes = [],
  terms = [],
  parts = 1,
  blocked = [],
  flag = null,
} = {}) => {
  const fired = Array.isArray(changes) ? changes : [];
  const literal = fired.filter((c) => c.risk === 'green');
  const interpretive = fired.length - literal.length;
  const markers = structuralMarkers({ source, terms, parts, blocked });
  const unresolved = markers.filter((m) => m.severity === 'unresolved');
  const informational = markers.filter((m) => m.severity === 'informational');
  const reasons = [];

  let level;

  if (fired.length === 0) {
    // The rule that matters: an unmeasured sentence is Low. If no rule fired,
    // the engine has certified nothing about it, and the reviewer has to
    // read it against the source.
    level = 'low';
    reasons.push(
      'No dictionary rule fired on this sentence, so the engine certified nothing about it. The rewrite is the source text, unexamined.',
    );
  } else if (unresolved.length >= 2) {
    level = 'low';
    reasons.push(
      `The sentence carries ${unresolved.length} things the engine could not resolve: ${unresolved.map((m) => m.label.toLowerCase()).join(', ')}.`,
    );
  } else if (unresolved.length === 1) {
    level = 'medium';
    reasons.push(`${unresolved[0].label}: ${unresolved[0].detail}`);
  } else if (informational.length > 0) {
    level = 'medium';
    for (const marker of informational) {
      reasons.push(`${marker.label}: ${marker.detail}`);
    }
  } else {
    level = 'high';
  }

  if (fired.length > 0 && interpretive > 0) {
    if (level === 'high') level = 'medium';
    reasons.push(
      interpretive === fired.length
        ? 'Every rule that fired on this sentence was interpretive rather than literal, so the rewrite may carry a different legal effect.'
        : `${interpretive} of the ${fired.length} rules that fired were interpretive rather than literal, so part of the rewrite is the engine's judgement.`,
    );
  }

  if (fired.length > 0 && literal.length > 0) {
    reasons.push(
      `${fired.length} dictionary rule${fired.length > 1 ? 's' : ''} fired, ${literal.length} of them literal.`,
    );
  }

  const words = String(source).trim().split(/\s+/).filter(Boolean).length;
  const coverage = words > 0 ? Math.min(1, literal.length / Math.max(3, words / 8)) : 0;

  // Two separate decisions, two separate fields. The level is the engine's
  // confidence in its own work. `verify` is what a human has to do about
  // it: a Low sentence has to be read against the source, and a red
  // sentence has to be signed off, whatever the engine's confidence in it.
  const verify = level === 'low' || flag === 'red';
  const verifyNote =
    level === 'low'
      ? 'Verify against the source: the engine could not certify this sentence.'
      : flag === 'red'
        ? 'Sign this off before it leaves the building: the rewrite can change the legal effect here.'
        : '';

  return {
    level,
    label: CONFIDENCE_LABELS[level],
    meaning: CONFIDENCE_MEANING[level],
    hits: fired.length,
    literalHits: literal.length,
    interpretiveHits: interpretive,
    markers,
    unresolved: unresolved.map((m) => m.id),
    informational: informational.map((m) => m.id),
    reasons,
    coverage: Math.round(coverage * 100) / 100,
    verify,
    verifyNote,
    flag,
  };
};

// The histogram the manifest carries: how many sentences the engine was
// sure about, how many it was not, and how many it could not measure.
export const confidenceHistogram = (rows = []) => {
  const histogram = { high: 0, medium: 0, low: 0, total: rows.length };
  for (const row of rows) {
    const level = row && row.confidence ? row.confidence.level : 'low';
    if (histogram[level] === undefined) histogram[level] = 0;
    histogram[level] += 1;
  }
  return histogram;
};
