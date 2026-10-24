// The reviewer's own record.
//
// A monitor that presents an extraction as finished is lying about what a
// rule engine can do. Every row here can be accepted, corrected or flagged,
// and the decisions are the sign-off a board pack carries: who reviewed
// what, when, and what they changed. The engine's read is never overwritten —
// a correction sits beside it, so the record shows both.
//
// Decisions live in localStorage under the instrument's text hash. That is a
// deliberate v1 limit: a public tool with no sign-in has no server-side
// per-firm history, and pretending otherwise would be the wrong kind of
// honest. The pack embeds the decisions, so the record survives the export.

export const REVIEW_KEY = 'ths-monitor-review-v1';
export const PROFILE_KEY = 'ths-monitor-profile-v1';

export const STATES = ['accepted', 'edited', 'flagged'];

export const emptyReview = () => ({ decisions: {}, reviewer: '', updatedAt: null });

const storage = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

const read = (key) => {
  const store = storage();
  if (!store) return null;
  try {
    return JSON.parse(store.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const write = (key, value) => {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked store must not take the page down.
  }
};

export const reviewKey = (instrumentHash) => `${REVIEW_KEY}:${instrumentHash}`;

export const loadReview = (instrumentHash) => {
  const stored = read(reviewKey(instrumentHash));
  if (!stored || typeof stored !== 'object') return emptyReview();
  return {
    ...emptyReview(),
    ...stored,
    decisions: stored.decisions && typeof stored.decisions === 'object' ? stored.decisions : {},
  };
};

export const saveReview = (instrumentHash, review) => {
  write(reviewKey(instrumentHash), review);
};

export const loadProfile = () => read(PROFILE_KEY);

export const saveProfile = (profile) => {
  write(PROFILE_KEY, profile);
};

export const decisionFor = (review, id) => review?.decisions?.[id] || null;

export const setDecision = (review, id, patch) => {
  const at = new Date().toISOString();
  const next = {
    ...emptyReview(),
    ...review,
    decisions: {
      ...(review?.decisions || {}),
      [id]: { ...(review?.decisions?.[id] || {}), ...patch, at },
    },
    updatedAt: at,
  };
  return next;
};

export const clearDecision = (review, id) => {
  const decisions = { ...(review?.decisions || {}) };
  delete decisions[id];
  return { ...review, decisions, updatedAt: new Date().toISOString() };
};

export const setReviewer = (review, reviewer) => ({
  ...review,
  reviewer: String(reviewer || '').trim(),
  updatedAt: new Date().toISOString(),
});

// The text the row is signed off on: the reviewer's correction when there is
// one, the engine's rewrite otherwise.
export const textOf = (row, review) => {
  const entry = decisionFor(review, row.id);
  if (entry && entry.state === 'edited' && String(entry.text || '').trim()) return String(entry.text).trim();
  return String(row.plain || row.quote || '').trim();
};

export const countsOf = (rows, review) => {
  const counts = { accepted: 0, edited: 0, flagged: 0, pending: 0, total: rows.length };
  for (const row of rows) {
    const entry = decisionFor(review, row.id);
    if (entry && STATES.includes(entry.state)) counts[entry.state] += 1;
    else counts.pending += 1;
  }
  return counts;
};

// The trail, most recent first. This is what the pack prints and what makes
// "reviewed by X on Y" a fact rather than a label.
export const trailOf = (review) => {
  const decisions = review?.decisions || {};
  return Object.entries(decisions)
    .map(([id, entry]) => ({ id, ...entry }))
    .filter((entry) => STATES.includes(entry.state))
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
};
