// Clause-type taxonomy.
//
// "Obligations found" is the right instinct for a citizen tool and too coarse
// for a reviewer. A proviso, a deeming provision, a condition precedent and a
// safe harbour are not the same kind of sentence: they can be simplified in
// different ways, and they break in different ways. The classifier is
// rule-based and ordered by legal consequence, so the most consequential type
// is the one that gets to claim the sentence.
//
// Each type carries:
//   risk   the baseline flag for a sentence of this type
//   note   how the type must be handled in a rewrite (travels into the
//          redline pack as the rationale)

export const CLAUSE_TYPES = [
  {
    id: 'definition',
    label: 'Definition',
    risk: 'amber',
    note: 'A definition sets the meaning of a term for the whole instrument. The term is left as the instrument defines it.',
    test: /\bmeans\b|\bincludes\b|\bhas the meaning\b/i,
  },
  {
    id: 'deeming',
    label: 'Deeming provision',
    risk: 'red',
    note: 'A deeming provision makes one thing legally another. It is never rewritten into ordinary words without a lawyer.',
    test: /\bshall be deemed\b|\bdeemed to\b|\bdeemed\b|\bdeeming\b/i,
  },
  {
    id: 'penalty',
    label: 'Penalty or offence',
    risk: 'red',
    note: 'The sanction carries the weight of the provision. The rewrite does not restate it, so a reviewer must read the source.',
    test: /\bshall be punished\b|\bshall be liable to (?:a |an )?(?:fine|imprisonment|penalty)\b|\bguilty of an offence\b|\bimprisonment\b|\bpen(alty|alty of)\b|\bequivalent to a fine\b/i,
  },
  {
    id: 'prohibition',
    label: 'Prohibition',
    risk: 'amber',
    note: 'A prohibition is not a duty to do the opposite. The rewrite must keep the thing forbidden visible.',
    test: /\bshall not\b|\bmust not\b|\bno person shall\b|\bnobody shall\b|\bnot be entitled\b|\bprohibited\b|\bcease to\b/i,
  },
  {
    id: 'entitlement',
    label: 'Entitlement',
    risk: 'green',
    note: 'An entitlement is a legal right. The rewrite may soften the words but must not soften the right.',
    test: /\bshall be entitled to\b|\bis entitled to\b|\bare entitled to\b|\bhas the right to\b|\bhas a right to\b/i,
  },
  {
    id: 'discretion',
    label: 'Discretion',
    risk: 'amber',
    note: 'Discretion is a range of lawful choices. The rewrite must not present the choice as already made.',
    test: /\bin the discretion of\b|\bat the discretion of\b|\bas it thinks fit\b|\bconsiders? (?:fit|appropriate|satisfactory)\b|\bas he or she thinks\b/i,
  },
  {
    id: 'proviso',
    label: 'Proviso',
    risk: 'amber',
    note: 'A proviso is a condition sitting inside the section. It stays a condition in the rewrite, never a trailing "but".',
    test: /^\s*provided\b|\bprovided that\b|\bprovided further\b|\bprovided always\b/i,
  },
  {
    id: 'condition-precedent',
    label: 'Condition precedent',
    risk: 'amber',
    note: 'The rule does not bite until the condition is met. The rewrite must name the condition, not bury it.',
    test: /\bonly if\b|\bshall not apply (?:unless|except|except where)\b|\bunless\b|\bsubject to the condition\b|\bwhere .{0,40}\bsatisfied\b|\bin the case of\b/i,
  },
  {
    id: 'exception',
    label: 'Exception',
    risk: 'amber',
    note: 'An exception carves a case out of the rule. The rewrite must keep the carve-out attached to the rule it qualifies.',
    test: /\bexcept\b|\bsave as\b|\bbut not including\b|\bother than\b|\bexcept as provided\b/i,
  },
  {
    id: 'safe-harbour',
    label: 'Safe harbour',
    risk: 'amber',
    note: 'A safe harbour removes liability for a defined course of conduct. The rewrite must keep the shield and its conditions together.',
    test: /\bdoes not apply (?:to|if|where)\b|\bis not liable\b|\bno liability\b|\bnot treated as\b|\bunless otherwise agreed\b/i,
  },
  {
    id: 'cross-reference',
    label: 'Cross-reference',
    risk: 'amber',
    note: 'The sentence points at another provision. The cross-reference is reproduced in the rewrite, not resolved for the reader.',
    test: /\bsection \d|\bunder section\b|\breferred to in\b|\bprovided in section\b|\bsub-section\b|\bchapter\b|\bschedule\b|\bpart [IVXLC\d]/i,
  },
  {
    id: 'commencement',
    label: 'Commencement',
    risk: 'green',
    note: 'A commencement clause fixes the date the instrument bites. Keep the date and its trigger together.',
    test: /\bcome into force\b|\bcome into operation\b|\bshall come into effect\b|\bwith effect from\b|\bcommencement\b/i,
  },
  {
    id: 'repeal',
    label: 'Repeal or amendment',
    risk: 'green',
    note: 'A repeal clause removes an earlier law. The rewrite names what is removed, not what replaces it.',
    test: /\bis repealed\b|\bhereby repeals\b|\bomitted\b|\bshall be amended\b/i,
  },
  {
    id: 'permission',
    label: 'Permission or power',
    risk: 'amber',
    note: 'A power to act is not a duty to act. In Indian drafting "may" is often a power; the rewrite keeps the power.',
    test: /\bmay\b|\bis authorised to\b|\bis authorized to\b|\bis permitted to\b|\bpower to\b|\bem empowered to\b/i,
  },
  {
    id: 'obligation',
    label: 'Obligation',
    risk: 'green',
    note: 'A duty on a named party. The rewrite keeps the actor and the act together.',
    test: /\bshall\b|\bmust\b|\bis required to\b|\bare required to\b|\bhas the duty\b|\bit is the duty of\b|\brequires? .{0,20}to\b/i,
  },
  {
    id: 'other',
    label: 'Descriptive or unclassified',
    risk: 'amber',
    note: 'No clause type matched. Read it against the source before it leaves the building.',
    test: null,
  },
];

export const CLAUSE_TYPE_BY_ID = Object.fromEntries(
  CLAUSE_TYPES.map((t) => [t.id, t]),
);

export const getClauseType = (id) =>
  CLAUSE_TYPE_BY_ID[id] || CLAUSE_TYPE_BY_ID.other;

// Classify one source sentence. The first matching type wins, so the order
// of CLAUSE_TYPES is the legal priority order.
export const classifyClause = (sentence) => {
  const text = String(sentence || '');
  for (const type of CLAUSE_TYPES) {
    if (!type.test) continue;
    if (type.test.test(text)) return type;
  }
  return CLAUSE_TYPE_BY_ID.other;
};

// The order a reviewer reads a list in: obligations first (they bind), then
// the carve-outs, then the descriptive residue.
export const CLAUSE_ORDER = [
  'obligation',
  'prohibition',
  'entitlement',
  'permission',
  'discretion',
  'condition-precedent',
  'proviso',
  'exception',
  'safe-harbour',
  'deeming',
  'penalty',
  'cross-reference',
  'definition',
  'commencement',
  'repeal',
  'other',
];
