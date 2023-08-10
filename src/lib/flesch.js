// Readability scoring: Flesch Reading Ease and Flesch–Kincaid grade level.
// Standard formulas; syllables estimated by vowel-group heuristic.

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

const countSentences = (text) =>
  (text.match(/[.!?]+/g) || []).length || (text.trim() ? 1 : 0);

export const countSyllables = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.length > 3 && w.endsWith('e') && !w.endsWith('le')) n -= 1;
  return Math.max(1, n);
};

export const flesch = (text) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const w = words.length;
  const s = countSentences(text);
  const syll = words.reduce((a, word) => a + countSyllables(word), 0);
  if (w === 0) return { score: 0, grade: 0, band: 'Empty', words: 0, sentences: 0 };
  const score = 206.835 - 1.015 * (w / s) - 84.6 * (syll / w);
  const grade = 0.39 * (w / s) + 11.8 * (syll / w) - 15.59;
  const clamped = Math.max(0, Math.min(100, score));
  const band =
    clamped >= 90 ? 'Very easy: 5th grade'
    : clamped >= 80 ? 'Easy: 6th grade'
    : clamped >= 70 ? 'Fairly easy: 7th grade'
    : clamped >= 60 ? 'Standard: 8th–9th grade'
    : clamped >= 50 ? 'Fairly difficult: 10th–12th grade'
    : clamped >= 30 ? 'Difficult: college level'
    : 'Very confusing: graduate level';
  return {
    score: Math.round(clamped * 10) / 10,
    grade: Math.round(Math.max(0, grade) * 10) / 10,
    band,
    words: w,
    sentences: s,
  };
};
