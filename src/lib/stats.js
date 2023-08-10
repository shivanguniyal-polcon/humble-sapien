// THS Data Commons: statistics engine.
// Runs entirely client-side. Nothing leaves the browser.

export const pearson = (xs, ys) => {
  const n = xs.length;
  if (n < 2) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return NaN;
  return sxy / Math.sqrt(sxx * syy);
};

export const ols = (xs, ys) => {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const slope = sxx === 0 ? NaN : sxy / sxx;
  return { slope, intercept: my - slope * mx };
};

// Plain-language reading of a correlation, per better-writing: says what
// happened and what to do next, no hedging filler.
export const readingFor = (r, n, xLabel, yLabel) => {
  if (Number.isNaN(r) || n < 3) {
    return 'Not enough shared data points to estimate a relationship. Pick two series with at least three overlapping observations.';
  }
  const strength =
    Math.abs(r) >= 0.9 ? 'move almost perfectly together'
    : Math.abs(r) >= 0.7 ? 'move together strongly'
    : Math.abs(r) >= 0.4 ? 'move together moderately'
    : Math.abs(r) >= 0.2 ? 'move together weakly'
    : 'barely move together';
  const direction = r >= 0 ? 'in the same direction' : 'in opposite directions';
  return `${xLabel} and ${yLabel} ${strength} (${direction}, r = ${r.toFixed(2)} across ${n} shared observations). Correlation is not causation: treat this as a prompt for investigation, not a verdict.`;
};

export const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
};
