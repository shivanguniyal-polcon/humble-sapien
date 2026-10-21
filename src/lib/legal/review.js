// The review state: what a human decided, sentence by sentence.
//
// The engine produces a draft. A reviewer turns it into something a firm can
// file. This module holds the part of that which the engine cannot know: the
// decisions. It also carries the review file, which is how those decisions
// travel from one person to another without an account, a server or a
// login.
//
// Three properties matter:
//
//   no account      the review lives in the reviewer's browser and in a file
//                   they hold. Nothing is uploaded anywhere. (INV-1, INV-2)
//   explicit        a sentence is rejected on purpose, by a person. Nothing
//                   is dropped silently, and a rejection always carries the
//                   reviewer's reason where one was given.
//   reversible      the review file carries the source text and a hash of it,
//                   so re-importing it onto a changed text is detected
//                   rather than quietly applied to the wrong document.

import { hashObject } from '../../battery/hash.js';
import { normaliseGate } from './gate.js';

export const REVIEW_FILE_SCHEMA = 'ths-legal-review-file-1';

export const REVIEW_STATES = ['pending', 'accepted', 'rejected'];

export const emptyReview = () => ({});

// The decision recorded for one sentence. Anything not in the file is
// pending, and pending sentences are exported: only a deliberate rejection
// removes a sentence from the output.
export const reviewDecision = (review, id) => {
  const entry = review && review[id];
  const state = entry && REVIEW_STATES.includes(entry.state) ? entry.state : 'pending';
  return { state, comment: String((entry && entry.comment) || '').trim() };
};

export const isRejected = (review, id) => reviewDecision(review, id).state === 'rejected';

export const normaliseReview = (review = {}) => {
  const out = {};
  for (const id of Object.keys(review || {})) {
    const { state, comment } = reviewDecision(review, id);
    if (state === 'pending' && !comment) continue;
    out[id] = { state, comment };
  }
  return out;
};

// The sentences that go into the output, and the sentences that do not.
export const exportedRows = (result, review) =>
  result.rows.filter((row) => !isRejected(review, row.id));

export const rejectedRows = (result, review) =>
  result.rows.filter((row) => isRejected(review, row.id));

// The counts the manifest records and the UI shows.
export const reviewCounts = (result, review) => {
  const counts = { accepted: 0, rejected: 0, pending: 0, commented: 0, total: result.rows.length };
  for (const row of result.rows) {
    const { state, comment } = reviewDecision(review, row.id);
    if (state === 'accepted') counts.accepted += 1;
    else if (state === 'rejected') counts.rejected += 1;
    else counts.pending += 1;
    if (comment) counts.commented += 1;
  }
  return counts;
};

// The sign-off: what the human did, hashed. This is the fourth hash in the
// manifest. The three-hash promise on the licensing page — source, input,
// output — is unchanged; this one covers the reviewer's decisions, so a
// buyer can prove that a named human signed the file and not merely that
// the engine produced it.
export const buildSignOff = async ({ gate = null, review = null } = {}) => {
  const gateAnswers = normaliseGate(gate);
  const decisions = normaliseReview(review);
  const hash = await hashObject({ gate: gateAnswers, review: decisions });
  return {
    hash,
    gate: gateAnswers,
    reviewer: gateAnswers.reviewer || '',
    circulation: gateAnswers.circulation || '',
    decisions,
  };
};

// ---- the review file ------------------------------------------------------

// The file a reviewer hands to a colleague. It carries the source, the
// reviewer's answers, the sentence-by-sentence decisions and a hash of the
// source, so the file can be checked before it is trusted.
export const buildReviewFile = async (result, { gate = null, review = null, matter = null } = {}) => {
  const signOff = await buildSignOff({ gate, review });
  const sourceHash = await hashObject({ text: result.text || '' });
  const counts = reviewCounts(result, review);

  return JSON.stringify(
    {
      schema: REVIEW_FILE_SCHEMA,
      engine: result.pipelineVersion,
      dictionary: `${result.jurisdictionId}@${result.dictionaryVersion}`,
      jurisdiction: result.jurisdiction.label,
      exportedAt: new Date().toISOString(),
      sourceHash,
      signOffHash: signOff.hash,
      source: {
        text: result.text || '',
        title: result.source.title || '',
        citation: result.source.citation || '',
        version: result.source.version || '',
        date: result.source.date || '',
        url: result.source.url || '',
        reviewer: result.source.reviewer || '',
      },
      matter: matter || null,
      gate: signOff.gate,
      review: signOff.decisions,
      counts,
      sentences: result.rows.map((row) => ({
        id: row.id,
        start: row.start,
        end: row.end,
        flag: row.flag,
        confidence: row.confidence ? row.confidence.level : null,
        plain: row.plain,
      })),
    },
    null,
    2,
  );
};

// Read a review file back. Nothing is applied here: the caller decides
// whether to load it. The result says what was read, and what is wrong with
// it if anything is.
export const parseReviewFile = async (raw) => {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, error: 'That file is not a review file: it is not readable JSON.' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'That file is not a review file: it does not contain a review.' };
  }
  if (data.schema !== REVIEW_FILE_SCHEMA) {
    return {
      ok: false,
      error: `That file is not a review file: it carries the schema "${data.schema || 'none'}", and this build reads "${REVIEW_FILE_SCHEMA}".`,
    };
  }

  const warnings = [];
  const text = String((data.source && data.source.text) || '');

  // The file carries a hash of the text it was made against. Check it, so a
  // truncated or edited file is caught rather than trusted.
  const expected = data.sourceHash;
  const actual = await hashObject({ text });
  if (expected && expected !== actual) {
    warnings.push(
      'The source text in this review file does not match the hash recorded in it. The file has been edited since it was made, or it was damaged in transit.',
    );
  }

  const signOff = await buildSignOff({ gate: data.gate, review: data.review });
  if (data.signOffHash && data.signOffHash !== signOff.hash) {
    warnings.push(
      'The sign-off hash in this file does not match the answers and decisions it contains. Someone edited one without the other.',
    );
  }

  return {
    ok: true,
    warnings,
    source: data.source || {},
    text,
    matter: data.matter || null,
    gate: normaliseGate(data.gate),
    review: normaliseReview(data.review),
    counts: data.counts || null,
    engine: data.engine || '',
    dictionary: data.dictionary || '',
    exportedAt: data.exportedAt || '',
    sourceHash: actual,
    signOffHash: signOff.hash,
  };
};
