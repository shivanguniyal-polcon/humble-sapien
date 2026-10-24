// What changed since the last circular.
//
// Two comparisons, because two different questions get asked. The obligation
// diff answers "what must we now do that we did not have to do before", and
// matches duties across versions by similarity so a reworded duty is a
// change, not an addition. The sentence diff answers the narrower question
// for a list-based circular — a sanctions update changes entries, not duties
// — by taking the exact sentences that are new or gone.
//
// Both are set arithmetic on normalised text: no model, no threshold
// guessing beyond one stated similarity, and the same input always produces
// the same output.

import { cosine, tokenise } from '../textsim.js';

const SPACE = /\s+/g;

export const normalise = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(SPACE, ' ')
    .trim();

// The figures a sentence carries. Compared as sets: a circular that changes
// a threshold from 500 to 1,000 is a changed duty even when every other word
// is identical.
// A trailing suffix is part of the figure: "7th" and "500" are both
// thresholds, and stopping at one letter silently dropped ordinals.
export const figuresOf = (text) =>
  [...new Set((String(text || '').match(/\b\d[\d,.]*[A-Za-z]*\b/g) || []).map((n) => n.replace(/,/g, '').toLowerCase()))];

const vector = (text) => {
  const counts = new Map();
  for (const term of tokenise(text)) counts.set(term, (counts.get(term) || 0) + 1);
  let norm = 0;
  for (const count of counts.values()) norm += count * count;
  norm = Math.sqrt(norm) || 1;
  for (const [term, count] of counts) counts.set(term, count / norm);
  return counts;
};

const side = (row) => ({
  id: row.id,
  clause: row.clause || null,
  quote: String(row.quote || '').trim(),
  plain: String(row.plain || '').trim(),
});

// A duty is "the same duty" when its figures and most of its words match.
// The exact pass runs first so an unchanged duty never depends on the
// similarity score; the fuzzy pass then pairs the rewrites.
const SIMILAR = 0.8;

export const diffObligations = (previous = [], current = []) => {
  const prev = previous.map((row) => ({ row, key: normalise(row.quote) }));
  const pairs = new Map();
  const used = new Set();

  for (const row of current) {
    const key = normalise(row.quote);
    const hit = prev.find((entry) => !used.has(entry.row.id) && entry.key === key);
    if (hit) {
      used.add(hit.row.id);
      pairs.set(row.id, hit.row);
    }
  }

  const prevVectors = prev
    .filter((entry) => !used.has(entry.row.id))
    .map((entry) => ({ row: entry.row, vector: vector(entry.row.quote) }));
  for (const row of current.filter((candidate) => !pairs.has(candidate.id))) {
    const here = vector(row.quote);
    let best = null;
    let bestScore = 0;
    for (const entry of prevVectors) {
      if (used.has(entry.row.id)) continue;
      const score = cosine(here, entry.vector);
      if (score > bestScore) {
        bestScore = score;
        best = entry.row;
      }
    }
    if (best && bestScore >= SIMILAR - 1e-9) {
      used.add(best.id);
      pairs.set(row.id, best);
    }
  }

  const added = [];
  const changed = [];
  const unchanged = [];
  for (const row of current) {
    const before = pairs.get(row.id);
    if (!before) {
      added.push({ current: side(row), previous: null, figures: { lost: [], gained: figuresOf(row.quote) } });
      continue;
    }
    const lost = figuresOf(before.quote).filter((n) => !figuresOf(row.quote).includes(n));
    const gained = figuresOf(row.quote).filter((n) => !figuresOf(before.quote).includes(n));
    if (lost.length || gained.length) {
      changed.push({ current: side(row), previous: side(before), figures: { lost, gained } });
    } else {
      unchanged.push({ current: side(row), previous: side(before) });
    }
  }
  const removed = previous
    .filter((row) => !used.has(row.id))
    .map((row) => ({ current: null, previous: side(row), figures: { lost: figuresOf(row.quote), gained: [] } }));

  return {
    added,
    removed,
    changed,
    unchanged,
    summary: {
      previous: previous.length,
      current: current.length,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
    },
  };
};

// The sentences of an instrument, kept whole. Lists are line-separated in the
// source text; the splitter honours newlines as well as sentence ends so a
// sanctions entry is one unit, not half a sentence.
const sentencesOf = (text) =>
  String(text || '')
    .split(/\n+|(?<=[.;])\s+(?=[A-Z(“"])/)
    .map((s) => s.replace(SPACE, ' ').trim())
    .filter((s) => s.split(' ').filter(Boolean).length >= 5);

// `exclude` is the instrument's own furniture — title, reference, date. It
// differs between every two instruments by construction, and printing it as
// a change buries the entries that actually moved.
export const diffSentences = (before, after, { exclude = [] } = {}) => {
  const ignored = new Set(exclude.map(normalise).filter(Boolean));
  const previous = new Map();
  for (const sentence of sentencesOf(before)) {
    const key = normalise(sentence);
    if (key && !previous.has(key)) previous.set(key, sentence);
  }
  const current = new Map();
  for (const sentence of sentencesOf(after)) {
    const key = normalise(sentence);
    if (key && !current.has(key)) current.set(key, sentence);
  }
  const added = [...current.entries()]
    .filter(([key]) => !previous.has(key) && !ignored.has(key))
    .map(([, s]) => s);
  const removed = [...previous.entries()]
    .filter(([key]) => !current.has(key) && !ignored.has(key))
    .map(([, s]) => s);
  return {
    added,
    removed,
    summary: { previous: previous.size, current: current.size, added: added.length, removed: removed.length },
  };
};
