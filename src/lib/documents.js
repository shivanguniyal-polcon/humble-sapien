// Turning a rung's `carry` line into a checklist.
//
// The corpus writes the line as prose, because it sits inside a ladder entry.
// The documents step shows it as items, but the split must not turn one
// requirement into two: "The district's reply, or the absence of one" is a
// single instruction, not a reply plus an absence.
//
// "Everything below, in order" is also a single instruction that refers to
// the rungs beneath, so it is never split.

export function carryItems(carry) {
  const text = String(carry || '').trim();
  if (!text) return [];
  if (/everything below/i.test(text)) return [text];
  return text
    .split(/,(?![^(]*\))(?!\s*(?:or|and)\b)|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}
