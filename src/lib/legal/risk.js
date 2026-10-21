// Per-sentence risk flags.
//
// A global warning ("verify with a translator") does not make review
// tractable. What makes it tractable is a flag on every sentence:
//
//   green  literal rewrite: the words changed, the legal effect did not
//   amber  interpretive: a reviewer must read it against the source
//   red    the rewrite can change the legal effect, or the automated
//          fidelity checks found something missing. Do not ship without a
//          lawyer's sign-off.
//
// Every flag carries its reasons, because a flag a reviewer cannot interrogate
// is just a colour. Some reasons come from the dictionary (the rule that
// fired, and what it risks). Some come from the clause type. Some come from
// the fidelity checks below, which compare the source and the rewrite
// mechanically: did a figure survive? did a negation survive? did the duty
// marker survive? Those three checks catch the failures that matter most and
// that a reader of the plain text would not notice.

import { getClauseType } from './clauses.js';

const countWords = (text) =>
  String(text || '').trim().split(/\s+/).filter(Boolean).length;

export const RISK_LEVELS = ['green', 'amber', 'red'];

export const RISK_RANK = { green: 0, amber: 1, red: 2 };

export const FLAG_LABELS = {
  green: 'Literal',
  amber: 'Interpretive',
  red: 'Legal judgement',
};

export const FLAG_MEANING = {
  green: 'A literal rewrite: the words changed, the legal effect did not.',
  amber: 'Interpretive: a reviewer must read this against the source before it goes out.',
  red: 'Requires legal judgement: the rewrite can change the legal effect, or a fidelity check failed. Do not ship without sign-off.',
};

export const worst = (...levels) =>
  levels.filter(Boolean).reduce(
    (acc, level) => (RISK_RANK[level] > RISK_RANK[acc] ? level : acc),
    'green',
  );

const numbersIn = (text) =>
  (String(text || '').match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/[.,]$/, ''));

const countMatches = (text, re) => (String(text || '').match(re) || []).length;

const NEGATION = /\b(not|no|never|nor|without|nobody|none|nothing)\b/gi;
const DUTY = /\b(shall|must|is required to|are required to|is obliged to|is liable to|is guilty)\b/gi;
const PERMISSION = /\b(may|can|is authorised to|is authorized to|is permitted to|is entitled to)\b/gi;

// The mechanical fidelity checks. Each returns a reason, or nothing.
export const fidelityChecks = (source, plain) => {
  const reasons = [];

  const sourceNumbers = numbersIn(source);
  const plainNumbers = numbersIn(plain);
  const missing = sourceNumbers.filter((n) => !plainNumbers.includes(n));
  if (missing.length > 0) {
    reasons.push({
      level: 'red',
      text: `The figure${missing.length > 1 ? 's' : ''} ${missing.map((n) => `“${n}”`).join(', ')} ${missing.length > 1 ? 'do' : 'does'} not appear in the rewrite.`,
    });
  }

  const sourceNegations = countMatches(source, NEGATION);
  const plainNegations = countMatches(plain, NEGATION);
  if (sourceNegations > plainNegations) {
    reasons.push({
      level: 'red',
      text: 'The source turns something away and the rewrite does not. A negation was lost.',
    });
  }

  const sourceDuty = countMatches(source, DUTY);
  const plainDuty = countMatches(plain, DUTY);
  if (sourceDuty > 0 && plainDuty === 0) {
    reasons.push({
      level: 'amber',
      text: 'The source states a duty and the rewrite has no duty marker left in it.',
    });
  }

  const sourcePermission = countMatches(source, PERMISSION);
  const plainPermission = countMatches(plain, PERMISSION);
  if (sourcePermission > 0 && plainPermission === 0) {
    reasons.push({
      level: 'amber',
      text: 'The source gives a power or a right and the rewrite no longer reads as one.',
    });
  }

  return reasons;
};

// Assess one rewritten sentence.
//   source      the source sentence
//   plain       the rewritten sentence
//   changes     the dictionary rules that fired
//   clauseType  the clause type id
//   terms       defined terms the sentence leans on
//   parts       how many pieces the source sentence was split into
//   blocked     rules that a definition prevented from firing
export const assessSentence = ({
  source,
  plain,
  changes = [],
  clauseType = 'other',
  terms = [],
  parts = 1,
  blocked = [],
}) => {
  const type = getClauseType(clauseType);
  const reasons = [];
  let level = 'green';

  for (const change of changes) {
    if (change.risk === 'red') {
      level = worst(level, 'red');
      reasons.push({
        level: 'red',
        text: `“${change.from}” → “${change.to}”. ${change.note}`,
      });
    } else if (change.risk === 'amber') {
      level = worst(level, 'amber');
      reasons.push({
        level: 'amber',
        text: `“${change.from}” → “${change.to}”. ${change.note}`,
      });
    }
  }

  if (type.risk === 'red') {
    level = worst(level, 'red');
    reasons.push({ level: 'red', text: `${type.label}. ${type.note}` });
  } else if (type.risk === 'amber') {
    level = worst(level, 'amber');
    reasons.push({ level: 'amber', text: `${type.label}. ${type.note}` });
  }

  for (const term of terms) {
    level = worst(level, 'amber');
    reasons.push({
      level: 'amber',
      text: `Uses the defined term “${term}”. The term was left exactly as the instrument defines it, so the rewrite only works if that definition still holds.`,
    });
  }

  for (const block of blocked) {
    level = worst(level, 'amber');
    reasons.push({
      level: 'amber',
      text: `A defined term in this sentence blocked the rule “${block.from}” → “${block.to}”, so that phrase was left as drafted. ${block.note}`,
    });
  }

  if (parts > 1) {
    level = worst(level, 'amber');
    reasons.push({
      level: 'amber',
      text: `The source sentence was split into ${parts} parts. Check the split did not change the subject or the condition.`,
    });
  } else if (countWords(source) > 22) {
    level = worst(level, 'amber');
    reasons.push({
      level: 'amber',
      text: 'The source sentence is long and could not be split at a joint that keeps its meaning. Read it against the source.',
    });
  }

  for (const reason of fidelityChecks(source, plain)) {
    level = worst(level, reason.level);
    reasons.push(reason);
  }

  if (reasons.length === 0) {
    reasons.push({
      level: 'green',
      text: 'Literal rewrite: only the listed phrases changed, and the figures, negations and duty markers all survived.',
    });
  }

  return { flag: level, reasons, type: type.id, typeLabel: type.label };
};
