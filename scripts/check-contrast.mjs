// THS contrast check: measures, never estimates (better-colors rule).
// The tokens are read from src/index.css and resolved through var(), so this
// script can only ever measure what the site actually renders. The old
// version carried its own copy of the palette and drifted behind it; a
// measurement that is not of the shipped file is a rumour with decimals.

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

const props = new Map();
for (const match of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
  props.set(match[1], match[2].trim());
}

const resolve = (name, seen = new Set()) => {
  const raw = props.get(name);
  if (!raw) throw new Error(`--${name} is not declared in src/index.css`);
  const ref = raw.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (!ref) return raw;
  if (seen.has(ref[1])) throw new Error(`--${name} is a var() cycle`);
  seen.add(ref[1]);
  return resolve(ref[1], seen);
};

const rgb = (name) => {
  const value = resolve(name);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (!hex) throw new Error(`--${name} resolves to "${value}", which is not a hex colour`);
  const int = parseInt(hex[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => c / 255);
};

const lum = ([r, g, b]) =>
  0.2126 * (r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4) +
  0.7152 * (g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4) +
  0.0722 * (b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4);

const ratio = (fg, bg) => {
  const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [name, foreground token, background token, minimum ratio]
const pairs = [
  ['body text on page', 'paper-900', 'paper-100', 4.5],
  ['body text on surface', 'paper-900', 'paper-50', 4.5],
  ['secondary text on page', 'paper-700', 'paper-100', 4.5],
  ['muted text on surface', 'paper-600', 'paper-50', 4.5],
  ['accent text on surface', 'clay-700', 'paper-50', 4.5],
  ['accent text on page', 'clay-700', 'paper-100', 4.5],
  ['accent text on accent-soft', 'clay-700', 'clay-50', 4.5],
  ['on-accent label on accent-solid', 'paper-50', 'clay-600', 4.5],
  ['on-accent label on accent-hover', 'paper-50', 'clay-700', 4.5],
  ['manifesto heading on accent-50', 'clay-800', 'clay-50', 4.5],
  ['table header on sunken', 'paper-700', 'paper-200', 4.5],
  ['series-1 on surface (chart mark)', 'clay-600', 'paper-50', 3],
  ['series-2 on surface (chart mark)', 'data-teal-600', 'paper-50', 3],
  ['series-3 on surface (chart mark)', 'data-indigo-600', 'paper-50', 3],
  ['series-4 on surface (chart mark)', 'data-ochre-500', 'paper-50', 3],
  ['deep-time years on deep band', 'paper-500', 'paper-900', 3],
  ['deep-time era on deep band', 'paper-400', 'paper-900', 3],
  ['strata heading on deep band', 'paper-50', 'paper-900', 4.5],
  ['strata body on deep band', 'paper-300', 'paper-900', 4.5],
  ['stratum card text on paper-800', 'paper-300', 'paper-800', 4.5],
  ['stratum-now text on accent-600', 'clay-50', 'clay-600', 4.5],
  ['marquee text on accent-50', 'clay-800', 'clay-50', 4.5],
  ['dt fact key on deep band', 'clay-300', 'paper-800', 4.5],
  ['dt cta label on deep band', 'paper-50', 'paper-800', 4.5],
  ['dt node label on deep band', 'paper-400', 'paper-900', 3],
  ['pub kicker on page', 'clay-700', 'paper-100', 4.5],
  ['mono stat label on page', 'paper-600', 'paper-100', 4.5],
];

// Status and licence badges: the tint and the ink it carries.
const status = [
  ['score badge: delivered', 'status-delivered-ink', 'status-delivered-tint'],
  ['score badge: partial', 'status-partial-ink', 'status-partial-tint'],
  ['score badge: announced', 'status-announced-ink', 'status-announced-tint'],
  ['score badge: none', 'status-none-ink', 'status-none-tint'],
  ['policy region: north', 'status-announced-ink', 'status-announced-tint'],
  ['policy region: south', 'status-delivered-ink', 'status-delivered-tint'],
  ['licence badge: open', 'status-delivered-ink', 'status-delivered-tint'],
  ['licence badge: portal', 'status-announced-ink', 'status-announced-tint'],
  ['licence badge: free access', 'status-partial-ink', 'status-partial-tint'],
];

let fails = 0;
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(rgb(fg), rgb(bg));
  const ok = r >= min;
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${name}`);
}
for (const [name, fg, bg] of status) {
  const r = ratio(rgb(fg), rgb(bg));
  const ok = r >= 4.5;
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min 4.5)  ${name}`);
}
console.log(fails === 0 ? '\nAll pairs pass.' : `\n${fails} pair(s) fail.`);
process.exit(fails === 0 ? 0 : 1);
