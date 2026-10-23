// The legal review pipeline.
//
// One text in, one reviewable ledger out. Every row of the ledger is a
// sentence of the rewrite, tied to the exact characters of the source it
// came from, typed as a legal clause, and flagged green, amber or red with
// the reasons spelled out.
//
// The pipeline is deterministic: the same text, jurisdiction and dictionary
// version always produce the same rows, the same flags and the same hashes.
// Nothing here calls a model or a network. That is the point — a firm can
// reproduce an output three years later or it cannot defend it at all.

import { flesch } from '../flesch.js';
import { renderHindi, hindiNote, translateTerms } from '../../data/hindi.js';
import {
  JURISDICTIONS, DEFAULT_JURISDICTION, DICTIONARY_VERSION, getJurisdiction,
  applyDictionary, blockedByDefinition,
} from './glossary.js';
import { extractDefinitions, protectedTerms, termsInSentence } from './definedTerms.js';
import { CLAUSE_ORDER, classifyClause, getClauseType } from './clauses.js';
import { segment, splitLong, clauseLabel, countWords, punctuate } from './segments.js';
import { assessSentence, FLAG_MEANING } from './risk.js';
import { scoreConfidence, confidenceHistogram } from './confidence.js';

export const PIPELINE_VERSION = 'ths-legal-simplifier-1.0.0';

const normalise = (text) =>
  String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Analyse a text under a jurisdiction.
//   mode          'citizen' or 'legal-review' (recorded, not enforced here)
//   jurisdiction  id from the JURISDICTIONS registry
//   source        { title, citation, version, date, url, reviewer }
export const analyse = (text, options = {}) => {
  const {
    mode = 'legal-review',
    jurisdictionId = DEFAULT_JURISDICTION,
    source = {},
  } = options;

  const jurisdiction = getJurisdiction(jurisdictionId);
  const original = String(text || '');
  const { definitions, leadIns, unrecovered } = extractDefinitions(original);
  const terms = protectedTerms(definitions);
  const segments = segment(original);

  const rows = [];
  const tally = new Map();

  segments.forEach((seg, sourceIndex) => {
    const { plain: plainFull, changes } = applyDictionary(seg.text, jurisdiction.phrases, {
      protectedTerms: terms,
    });
    const blocked = blockedByDefinition(seg.text, jurisdiction.phrases, terms);
    const parts = splitLong(plainFull).map((piece) => punctuate(piece));
    const type = classifyClause(seg.text);
    const sentenceTerms = termsInSentence(seg.text, definitions);
    const marker = clauseLabel(seg.text, jurisdiction);

    const assessment = assessSentence({
      source: seg.text,
      plain: parts.join(' '),
      changes,
      clauseType: type.id,
      terms: sentenceTerms,
      parts: parts.length,
      blocked,
    });

    // Confidence is scored on the source sentence, not on the part, because
    // confidence is a property of what the engine could not resolve. A long
    // sentence split in two carries the same unresolved cross-reference in
    // both halves, and both halves must say so.
    const confidence = scoreConfidence({
      source: seg.text,
      changes,
      terms: sentenceTerms,
      parts: parts.length,
      blocked,
      flag: assessment.flag,
    });

    for (const change of changes) {
      const key = change.from;
      const existing = tally.get(key);
      if (existing) existing.count += change.count;
      // The report must say what each phrase became, or that it was removed.
      // A bare "term × count" is not a change list a reader can audit.
      else tally.set(key, {
        term: key, from: key, to: change.to, risk: change.risk,
        count: change.count, removed: change.to === '',
      });
    }

    parts.forEach((piece, partIndex) => {
      rows.push({
        id: `r${rows.length + 1}`,
        index: rows.length,
        sourceId: sourceIndex,
        part: partIndex,
        parts: parts.length,
        sourceText: seg.text,
        start: seg.start,
        end: seg.end,
        clause: marker ? marker.label : null,
        clauseNo: marker ? marker.no : null,
        clauseKind: marker ? marker.kind : null,
        plain: piece,
        fullPlain: plainFull,
        flag: assessment.flag,
        reasons: assessment.reasons,
        type: type.id,
        typeLabel: type.label,
        typeNote: type.note,
        changes: partIndex === 0 ? changes : [],
        terms: sentenceTerms,
        blocked,
        confidence,
      });
    });
  });

  const simplifiedText = rows.map((r) => r.plain).join(' ');

  const groups = {};
  for (const id of CLAUSE_ORDER) groups[id] = [];
  for (const row of rows) {
    if (!groups[row.type]) groups[row.type] = [];
    groups[row.type].push(row);
  }

  const summary = { green: 0, amber: 0, red: 0, total: rows.length };
  for (const row of rows) summary[row.flag] += 1;

  const readability = {
    original: flesch(original),
    simplified: flesch(simplifiedText),
  };

  const warnings = [];
  if (definitions.length > 0) {
    warnings.push(
      `${definitions.length} defined term${definitions.length > 1 ? 's' : ''} found in the source. Those terms were left exactly as the instrument defines them.`,
    );
  }
  if (unrecovered.length > 0) {
    warnings.push(
      `${unrecovered.length} definition${unrecovered.length > 1 ? 's' : ''} could not be read confidently and ${unrecovered.length > 1 ? 'were' : 'was'} left for a reviewer.`,
    );
  }
  if (leadIns.length > 0) {
    warnings.push('The definitions carry the "unless the context otherwise requires" carve-out. A definition is not the only reading.');
  }
  if (readability.simplified.words > 0 && readability.simplified.grade > jurisdiction.readability.grade) {
    warnings.push(
      `The rewrite reads at grade ${readability.simplified.grade}, above the ${jurisdiction.readability.grade} target for ${jurisdiction.short}.`,
    );
  }
  if (summary.red > 0) {
    warnings.push(`${summary.red} sentence${summary.red > 1 ? 's' : ''} carry a red flag. A lawyer must sign these off before the text leaves the building.`);
  }
  if (summary.amber > 0) {
    warnings.push(`${summary.amber} sentence${summary.amber > 1 ? 's' : ''} carry an amber flag and need a reviewer.`);
  }
  if (!original.trim()) {
    warnings.push('There is no text to review yet.');
  }

  const replacements = [...tally.values()]
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));

  const hindiSentences = rows.map((row) => renderHindi(row.plain));

  return {
    mode,
    jurisdiction,
    jurisdictionId: jurisdiction.id,
    pipelineVersion: PIPELINE_VERSION,
    dictionaryVersion: DICTIONARY_VERSION,
    source: {
      title: String(source.title || ''),
      citation: String(source.citation || ''),
      version: String(source.version || ''),
      date: String(source.date || ''),
      url: String(source.url || ''),
      reviewer: String(source.reviewer || ''),
    },
    text: original,
    simplifiedText,
    rows,
    definitions: { definitions, leadIns, unrecovered },
    groups,
    obligations: groups.obligation.map((r) => r.plain),
    readability,
    stats: {
      words: countWords(original),
      sentences: segments.length,
      replacements,
    },
    summary,
    confidence: confidenceHistogram(rows),
    warnings,
    flagMeaning: FLAG_MEANING,
    hindi: { note: hindiNote, sentences: hindiSentences },
  };
};

// ---- comparative mode -----------------------------------------------------

const lcsPairs = (a, b) => {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
};

// Align two versions of a text. Clause numbers are the primary key when
// both versions carry them; otherwise the alignment falls back to the longest
// common subsequence of the source sentences.
const align = (before, after) => {
  const beforeKeys = before.rows.filter((r) => r.clauseNo).map((r) => r.clauseNo);
  const afterKeys = after.rows.filter((r) => r.clauseNo).map((r) => r.clauseNo);
  const overlap = beforeKeys.filter((k) => afterKeys.includes(k));

  if (overlap.length > 0) {
    const beforeMap = new Map();
    const afterMap = new Map();
    for (const row of before.rows) if (row.clauseNo && !beforeMap.has(row.clauseNo)) beforeMap.set(row.clauseNo, row);
    for (const row of after.rows) if (row.clauseNo && !afterMap.has(row.clauseNo)) afterMap.set(row.clauseNo, row);
    const pairs = [];
    const usedBefore = new Set();
    const usedAfter = new Set();
    for (const key of [...new Set([...beforeKeys, ...afterKeys])]) {
      const b = beforeMap.get(key);
      const a = afterMap.get(key);
      if (b && a) {
        pairs.push([b, a]);
        usedBefore.add(b.id);
        usedAfter.add(a.id);
      }
    }
    const removed = before.rows.filter((r) => !usedBefore.has(r.id));
    const added = after.rows.filter((r) => !usedAfter.has(r.id));
    return { pairs, removed, added, method: 'clause number' };
  }

  const beforeTexts = before.rows.map((r) => normalise(r.sourceText));
  const afterTexts = after.rows.map((r) => normalise(r.sourceText));
  const matches = lcsPairs(beforeTexts, afterTexts);
  const pairs = matches.map(([i, j]) => [before.rows[i], after.rows[j]]);
  const usedBefore = new Set(matches.map(([i]) => i));
  const usedAfter = new Set(matches.map(([, j]) => j));
  const removed = before.rows.filter((r) => !usedBefore.has(r.id));
  const added = after.rows.filter((r) => !usedAfter.has(r.id));
  return { pairs, removed, added, method: 'sentence alignment' };
};

// Compare two versions of an instrument: what changed, in plain words, with
// the flags on both sides.
export const compare = (previousText, currentText, options = {}) => {
  const before = analyse(previousText, { ...options, mode: 'legal-review' });
  const after = analyse(currentText, { ...options, mode: 'legal-review' });
  const { pairs, removed, added, method } = align(before, after);

  const changes = [];
  for (const [b, a] of pairs) {
    const sourceChanged = normalise(b.sourceText) !== normalise(a.sourceText);
    const plainChanged = normalise(b.plain) !== normalise(a.plain);
    changes.push({
      status: sourceChanged || plainChanged ? 'changed' : 'unchanged',
      clause: a.clause || b.clause,
      type: a.typeLabel,
      flag: a.flag,
      before: { text: b.sourceText, plain: b.plain, flag: b.flag },
      after: { text: a.sourceText, plain: a.plain, flag: a.flag },
      reasons: a.reasons,
    });
  }
  for (const row of removed) {
    changes.push({
      status: 'removed',
      clause: row.clause,
      type: row.typeLabel,
      flag: row.flag,
      before: { text: row.sourceText, plain: row.plain, flag: row.flag },
      after: null,
      reasons: [],
    });
  }
  for (const row of added) {
    changes.push({
      status: 'added',
      clause: row.clause,
      type: row.typeLabel,
      flag: row.flag,
      before: null,
      after: { text: row.sourceText, plain: row.plain, flag: row.flag },
      reasons: row.reasons,
    });
  }

  const counts = changes.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, { changed: 0, added: 0, removed: 0, unchanged: 0 });

  return {
    before,
    after,
    method,
    changes,
    counts,
    readabilityDelta: {
      grade: after.readability.simplified.grade - before.readability.simplified.grade,
      ease: after.readability.simplified.score - before.readability.simplified.score,
    },
  };
};

export { JURISDICTIONS, DEFAULT_JURISDICTION, getJurisdiction, getClauseType, translateTerms };
