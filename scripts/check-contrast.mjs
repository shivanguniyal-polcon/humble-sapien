// THS contrast check: measures, never estimates (better-colors rule).
// Converts the OKLCH tokens to sRGB and reports WCAG contrast ratios for
// every rendered pair the interface depends on. Single institutional
// palette, matching src/index.css exactly.

const oklchToSrgb = (L, C, hDeg) => {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gamma = (c) => {
    const v = Math.min(1, Math.max(0, c));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return [gamma(r), gamma(g), gamma(bl)];
};

const lum = ([r, g, b]) =>
  0.2126 * (r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4) +
  0.7152 * (g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4) +
  0.0722 * (b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4);

const ratio = (fg, bg) => {
  const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// tokens exactly as declared in src/index.css
const T = {
  paper50: [0.99, 0.005, 95],
  paper100: [0.965, 0.008, 92],
  paper200: [0.93, 0.01, 90],
  paper300: [0.875, 0.012, 88],
  paper400: [0.74, 0.013, 85],
  paper500: [0.56, 0.013, 80],
  paper600: [0.455, 0.013, 78],
  paper700: [0.35, 0.012, 75],
  paper800: [0.26, 0.011, 72],
  paper900: [0.195, 0.01, 70],
  accent50: [0.96, 0.018, 50],
  accent300: [0.735, 0.105, 42],
  accent600: [0.49, 0.155, 38],
  accent700: [0.45, 0.135, 38],
  accent800: [0.38, 0.11, 38],
  series1: [0.49, 0.155, 38],
  series2: [0.5, 0.09, 195],
  series3: [0.5, 0.11, 320],
  series4: [0.58, 0.11, 80],
  white: [1, 0, 0],
};

const pairs = [
  ['body text on page', T.paper900, T.paper100, 4.5],
  ['body text on surface', T.paper900, T.paper50, 4.5],
  ['secondary text on page', T.paper700, T.paper100, 4.5],
  ['muted text on surface', T.paper600, T.paper50, 4.5],
  ['accent text on surface', T.accent700, T.paper50, 4.5],
  ['accent text on accent-soft', T.accent700, T.accent50, 4.5],
  ['on-accent label on accent-solid', T.paper50, T.accent600, 4.5],
  ['on-accent label on accent-hover', T.paper50, T.accent700, 4.5],
  ['manifesto heading on accent-50', T.accent800, T.accent50, 4.5],
  ['table header on sunken', T.paper700, T.paper200, 4.5],
  ['series-1 on surface (chart mark)', T.series1, T.paper50, 3],
  ['series-2 on surface (chart mark)', T.series2, T.paper50, 3],
  ['series-3 on surface (chart mark)', T.series3, T.paper50, 3],
  ['series-4 on surface (chart mark)', T.series4, T.paper50, 3],
  ['muted axis text on surface', T.paper500, T.paper50, 3],
  ['strata heading on deep band', T.paper50, T.paper900, 4.5],
  ['strata body on deep band', T.paper300, T.paper900, 4.5],
  ['stratum card text on paper-800', T.paper300, T.paper800, 4.5],
  ['stratum-now text on accent-600', T.accent50, T.accent600, 4.5],
  ['marquee text on accent-50', T.accent800, T.accent50, 4.5],
  ['dt fact key on deep band', T.accent300, T.paper800, 4.5],
  ['dt cta label on deep band', T.paper50, T.paper800, 4.5],
  ['dt node label on deep band', T.paper400, T.paper900, 3],
  ['pub kicker on page', T.accent700, T.paper100, 4.5],
  ['mono stat label on page', T.paper600, T.paper100, 4.5],
];

// Fixed status shades from index.css (score and licence badges).
const STATUS = {
  'score badge (delivered)': { fg: [0.35, 0.08, 160], bg: [0.95, 0.03, 155] },
  'score badge (partial)': { fg: [0.42, 0.1, 70], bg: [0.96, 0.035, 85] },
  'score badge (announced)': { fg: [0.38, 0.11, 262], bg: [0.95, 0.025, 258] },
  'score badge (none)': { fg: [0.42, 0.13, 28], bg: [0.955, 0.025, 30] },
  'policy region (north)': { fg: [0.38, 0.11, 262], bg: [0.95, 0.025, 258] },
  'policy region (south)': { fg: [0.35, 0.08, 160], bg: [0.95, 0.03, 155] },
  'licence badge (open)': { fg: [0.35, 0.08, 160], bg: [0.95, 0.03, 155] },
  'licence badge (portal)': { fg: [0.38, 0.11, 262], bg: [0.95, 0.025, 258] },
  'licence badge (free access)': { fg: [0.42, 0.1, 70], bg: [0.96, 0.035, 85] },
};

let fails = 0;
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(oklchToSrgb(...fg), oklchToSrgb(...bg));
  const ok = r >= min;
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${name}`);
}
for (const [name, { fg, bg }] of Object.entries(STATUS)) {
  const r = ratio(oklchToSrgb(...fg), oklchToSrgb(...bg));
  const ok = r >= 4.5;
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min 4.5)  ${name}`);
}
console.log(fails === 0 ? '\nAll pairs pass.' : `\n${fails} pair(s) fail.`);
process.exit(fails === 0 ? 0 : 1);
