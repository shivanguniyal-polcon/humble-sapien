// The Tapri evaluation engine: econometrics that runs in the browser.
// Every estimator is implemented from scratch so the mechanics are auditable:
// OLS with HC1 robust and cluster-robust variance, logit via IRLS, two-stage
// least squares, two-way fixed effects difference-in-differences with an event
// study, sharp and fuzzy regression discontinuity with triangular kernels, and
// synthetic control with simplex-constrained weights.
//
// Verification: scripts/test-econometrics.mjs pins every estimator against
// constructed cases with known exact answers. Run `node scripts/test-econometrics.mjs`.

// ---------- linear algebra ----------

const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));

export function transpose(A) {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

export function matmul(A, B) {
  const n = A.length;
  const k = B.length;
  const m = B[0].length;
  const C = zeros(n, m);
  for (let i = 0; i < n; i += 1) {
    for (let t = 0; t < k; t += 1) {
      const a = A[i][t];
      if (a === 0) continue;
      for (let j = 0; j < m; j += 1) C[i][j] += a * B[t][j];
    }
  }
  return C;
}

export function matvec(A, x) {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

// Gauss-Jordan inverse with partial pivoting. Returns null when singular.
export function invert(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j += 1) M[col][j] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j += 1) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row.slice(n));
}

// ---------- distribution tails ----------

function logGamma(x) {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  let z = x - 1;
  let a = 0.9999999999998099;
  for (let i = 0; i < 8; i += 1) a += g[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

// Continued fraction for the incomplete beta (Lentz's method).
function betacf(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a, b).
export function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b);
  const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(a, b, x)) / a
    : 1 - (front * betacf(b, a, 1 - x)) / b;
}

// Two-sided Student-t tail probability.
export function tPValue(t, df) {
  if (!Number.isFinite(t)) return 0;
  if (df <= 0) return NaN;
  return betai(df / 2, 0.5, df / (df + t * t));
}

// Two-sided normal tail via a complementary error function approximation.
export function normPValue(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const y =
    t *
    Math.exp(
      -x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return Math.min(1, 2 * y);
}

export function stars(p) {
  return p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : p < 0.1 ? '.' : '';
}

export function fmtNum(v, d = 3) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'n/a';
  if (!Number.isFinite(v)) return v > 0 ? '+inf' : '-inf';
  return v.toFixed(d);
}

export function fmtP(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return 'n/a';
  return p < 0.001 ? '<0.001' : p.toFixed(3);
}

// ---------- weighted least squares core ----------

// ols(y, X, opts): X is n x k (include a constant column yourself).
// opts.weights: length-n array; opts.cluster: length-n cluster ids.
// HC1 robust variance by default; cluster-robust when opts.cluster is given.
export function ols(y, X, opts = {}) {
  const n = y.length;
  const k = X[0].length;
  const w = opts.weights ? opts.weights.slice() : new Array(n).fill(1);

  const XtWX = zeros(k, k);
  const XtWy = new Array(k).fill(0);
  for (let i = 0; i < n; i += 1) {
    for (let a = 0; a < k; a += 1) {
      XtWy[a] += w[i] * X[i][a] * y[i];
      for (let b = 0; b < k; b += 1) XtWX[a][b] += w[i] * X[i][a] * X[i][b];
    }
  }
  const XtWXinv = invert(XtWX);
  if (!XtWXinv) return { beta: null, singular: true };
  const beta = matvec(XtWXinv, XtWy);

  const fitted = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const df = n - k;

  // weighted R2 against the weighted mean
  const sw = w.reduce((a, b) => a + b, 0);
  const ybar = y.reduce((a, v, i) => a + w[i] * v, 0) / sw;
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i += 1) {
    sse += w[i] * resid[i] * resid[i];
    sst += w[i] * (y[i] - ybar) * (y[i] - ybar);
  }
  const r2 = sst > 0 ? 1 - sse / sst : NaN;
  const adjR2 = sst > 0 && df > 0 ? 1 - ((1 - r2) * (n - 1)) / df : NaN;

  // sandwich meat: HC1 or clustered
  const meat = zeros(k, k);
  if (opts.cluster) {
    const groups = new Map();
    for (let i = 0; i < n; i += 1) {
      const g = opts.cluster[i];
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(i);
    }
    for (const idxs of groups.values()) {
      const score = new Array(k).fill(0);
      for (const i of idxs) {
        const e = w[i] * resid[i];
        for (let a = 0; a < k; a += 1) score[a] += e * X[i][a];
      }
      for (let a = 0; a < k; a += 1) {
        for (let b = 0; b < k; b += 1) meat[a][b] += score[a] * score[b];
      }
    }
    const G = groups.size;
    const corr = G > 1 ? (G / (G - 1)) * ((n - 1) / df) : 1;
    for (let a = 0; a < k; a += 1) {
      for (let b = 0; b < k; b += 1) meat[a][b] *= corr;
    }
  } else {
    for (let i = 0; i < n; i += 1) {
      const e2 = w[i] * w[i] * resid[i] * resid[i];
      for (let a = 0; a < k; a += 1) {
        for (let b = 0; b < k; b += 1) meat[a][b] += e2 * X[i][a] * X[i][b];
      }
    }
    const hc1 = df > 0 ? n / df : 1;
    for (let a = 0; a < k; a += 1) {
      for (let b = 0; b < k; b += 1) meat[a][b] *= hc1;
    }
  }
  const vcov = matmul(matmul(XtWXinv, meat), XtWXinv);

  const se = vcov.map((row, i) => Math.sqrt(Math.max(0, row[i])));
  const t = beta.map((b, i) => (se[i] > 0 ? b / se[i] : b === 0 ? 0 : (b > 0 ? Infinity : -Infinity)));
  const p = t.map((tv) => tPValue(tv, df));

  return {
    beta, se, t, p, stars: p.map(stars), r2, adjR2, n, k, df, resid, fitted,
    vcov, singular: false, sse,
  };
}

// ---------- logit (IRLS) ----------

export function logit(y, X, opts = {}) {
  const n = y.length;
  const k = X[0].length;
  let beta = new Array(k).fill(0);
  let converged = false;
  let iter = 0;
  for (iter = 1; iter <= (opts.maxIter || 60); iter += 1) {
    const eta = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
    const mu = eta.map((e) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, e)))));
    const score = new Array(k).fill(0);
    const info = zeros(k, k);
    for (let i = 0; i < n; i += 1) {
      const wgt = Math.max(mu[i] * (1 - mu[i]), 1e-10);
      const e = y[i] - mu[i];
      for (let a = 0; a < k; a += 1) {
        score[a] += X[i][a] * e;
        for (let b = 0; b < k; b += 1) info[a][b] += wgt * X[i][a] * X[i][b];
      }
    }
    const infoInv = invert(info);
    if (!infoInv) return { beta: null, singular: true };
    const step = matvec(infoInv, score);
    beta = beta.map((b, j) => b + step[j]);
    if (Math.max(...step.map(Math.abs)) < 1e-10) {
      converged = true;
      break;
    }
  }
  const eta = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const mu = eta.map((e) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, e)))));
  let ll = 0;
  let ll0 = 0;
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i += 1) {
    ll += y[i] * Math.log(Math.max(mu[i], 1e-12)) + (1 - y[i]) * Math.log(Math.max(1 - mu[i], 1e-12));
    ll0 += y[i] * Math.log(Math.max(ybar, 1e-12)) + (1 - y[i]) * Math.log(Math.max(1 - ybar, 1e-12));
  }
  const wgt = mu.map((m) => Math.max(m * (1 - m), 1e-10));
  // information-based standard errors: (X'WX)^-1
  const XtWX = zeros(k, k);
  for (let i = 0; i < n; i += 1) {
    for (let a = 0; a < k; a += 1) {
      for (let b = 0; b < k; b += 1) XtWX[a][b] += wgt[i] * X[i][a] * X[i][b];
    }
  }
  const vcov = invert(XtWX);
  const se = vcov ? vcov.map((row, i) => Math.sqrt(Math.max(0, row[i]))) : new Array(k).fill(NaN);
  const z = beta.map((b, i) => (se[i] > 0 ? b / se[i] : NaN));
  const p = z.map((v) => normPValue(v));
  return {
    beta, se, z, p, stars: p.map(stars), n, k, converged, iter,
    logLik: ll, pseudoR2: ll0 !== 0 ? 1 - ll / ll0 : NaN, fitted: mu,
  };
}

// ---------- two-stage least squares ----------

// tsls(y, X, Z): X is n x k1 (endogenous + exogenous, constant included),
// Z is n x k2 (instruments + exogenous) with k2 >= k1. Robust (HC1) variance.
export function tsls(y, X, Z, opts = {}) {
  const n = y.length;
  const k = X[0].length;
  // first stage: project each column of X on Z
  const Xhat = Array.from({ length: n }, () => new Array(k).fill(0));
  for (let j = 0; j < k; j += 1) {
    const col = X.map((row) => row[j]);
    const fit = ols(col, Z, opts);
    if (fit.singular) return { beta: null, singular: true, stage: 1 };
    for (let i = 0; i < n; i += 1) Xhat[i][j] = fit.fitted[i];
  }
  const second = ols(y, Xhat, opts);
  if (second.singular) return { beta: null, singular: true, stage: 2 };
  // robust variance for 2SLS: sandwich with Xhat in the bread and X in the meat
  const resid = X.map((row, i) => y[i] - row.reduce((s, v, j) => s + v * second.beta[j], 0));
  const XtXinv = invert(matmul(transpose(Xhat), Xhat));
  const meat = zeros(k, k);
  for (let i = 0; i < n; i += 1) {
    const e2 = resid[i] * resid[i];
    for (let a = 0; a < k; a += 1) {
      for (let b = 0; b < k; b += 1) meat[a][b] += e2 * Xhat[i][a] * Xhat[i][b];
    }
  }
  const df = n - k;
  const hc1 = df > 0 ? n / df : 1;
  const vcov = matmul(matmul(XtXinv, meat), XtXinv).map((row) => row.map((v) => v * hc1));
  const se = vcov.map((row, i) => Math.sqrt(Math.max(0, row[i])));
  const t = second.beta.map((b, i) => (se[i] > 0 ? b / se[i] : Infinity));
  const p = t.map((tv) => tPValue(tv, df));

  // first-stage F for the excluded instruments (all Z columns beyond X's span)
  const r2First = [];
  for (let j = 0; j < k; j += 1) {
    const col = X.map((row) => row[j]);
    const fit = ols(col, Z, opts);
    r2First.push(fit.r2);
  }

  return {
    beta: second.beta, se, t, p, stars: p.map(stars), n, k, df,
    resid, r2First, singular: false,
  };
}

// ---------- difference-in-differences ----------

// rows: [{ unit, wave, y, firstTreat }] where firstTreat is the wave index in
// which the unit first receives treatment (null or undefined = never treated).
// Two-way fixed effects with a single treated-post indicator, clustered by unit.
export function didTWFE(rows) {
  const units = [...new Set(rows.map((r) => r.unit))];
  const waves = [...new Set(rows.map((r) => r.wave))].sort((a, b) => a - b);
  const unitIdx = new Map(units.map((u, i) => [u, i]));
  const waveIdx = new Map(waves.map((w, i) => [w, i]));

  const n = rows.length;
  const k = 1 + (units.length - 1) + (waves.length - 1) + 1;
  const X = Array.from({ length: n }, () => new Array(k).fill(0));
  const y = new Array(n).fill(0);
  const cluster = new Array(n).fill(0);
  rows.forEach((r, i) => {
    y[i] = r.y;
    cluster[i] = unitIdx.get(r.unit);
    X[i][0] = 1;
    const ui = unitIdx.get(r.unit);
    if (ui > 0) X[i][ui] = 1;
    const wi = waveIdx.get(r.wave);
    if (wi > 0) X[i][units.length - 1 + wi] = 1;
    X[i][k - 1] = r.firstTreat != null && r.wave >= r.firstTreat ? 1 : 0;
  });
  const fit = ols(y, X, { cluster });
  if (fit.singular) return { singular: true };
  const j = k - 1;
  return {
    singular: false,
    effect: fit.beta[j],
    se: fit.se[j],
    t: fit.t[j],
    p: fit.p[j],
    stars: fit.stars[j],
    n: fit.n,
    units: units.length,
    waves: waves.length,
  };
}

// Event study: interactions of treated x wave, base wave omitted.
// rows: [{ unit, wave, y, firstTreat }]; returns one coefficient per wave.
export function didEventStudy(rows, baseWave = null) {
  const units = [...new Set(rows.map((r) => r.unit))];
  const waves = [...new Set(rows.map((r) => r.wave))].sort((a, b) => a - b);
  const unitIdx = new Map(units.map((u, i) => [u, i]));
  const waveIdx = new Map(waves.map((w, i) => [w, i]));
  const base = baseWave != null ? baseWave : waves[0];

  const n = rows.length;
  const interWaves = waves.filter((w) => w !== base);
  const interStart = 1 + (units.length - 1) + (waves.length - 1);
  const k = interStart + interWaves.length;
  const X = Array.from({ length: n }, () => new Array(k).fill(0));
  const y = new Array(n).fill(0);
  const cluster = new Array(n).fill(0);
  rows.forEach((r, i) => {
    y[i] = r.y;
    cluster[i] = unitIdx.get(r.unit);
    X[i][0] = 1;
    const ui = unitIdx.get(r.unit);
    if (ui > 0) X[i][ui] = 1;
    const wi = waveIdx.get(r.wave);
    if (wi > 0) X[i][units.length - 1 + wi] = 1;
    const treated = r.firstTreat != null;
    const iw = interWaves.indexOf(r.wave);
    if (treated && iw >= 0) X[i][interStart + iw] = 1;
  });
  const fit = ols(y, X, { cluster });
  if (fit.singular) return { singular: true };
  const offset = interStart;
  return {
    singular: false,
    baseWave: base,
    points: [
      { wave: base, beta: 0, se: 0, p: 1, isBase: true },
      ...interWaves.map((w, i) => ({
        wave: w,
        beta: fit.beta[offset + i],
        se: fit.se[offset + i],
        p: fit.p[offset + i],
        isBase: false,
      })),
    ],
    n: fit.n,
  };
}

// Plain 2x2 difference-in-differences on means, for the receipt table.
// postWave is the first wave counted as post for everyone (treated and control).
export function didTable(rows, postWave) {
  const cell = (treated, post) => {
    const vals = rows
      .filter((r) =>
        (r.firstTreat != null) === treated && (post ? r.wave >= postWave : r.wave < postWave))
      .map((r) => r.y);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const preT = cell(true, false);
  const postT = cell(true, true);
  const preC = cell(false, false);
  const postC = cell(false, true);
  if ([preT, postT, preC, postC].some((v) => v == null)) return null;
  return {
    preTreated: preT, postTreated: postT, preControl: preC, postControl: postC,
    changeTreated: postT - preT, changeControl: postC - preC,
    rawDID: postT - preT - (postC - preC),
  };
}

// ---------- regression discontinuity ----------

// rddLocal(y, x, cutoff, opts): local linear fits with triangular kernel.
// opts.bandwidth (default: 2x the sd of x), opts.donut (points within this
// distance of the cutoff are dropped), opts.fuzzyD (take-up variable for fuzzy).
// Returns the discontinuity estimate with HC1 variance from the pooled fit.
export function rddLocal(y, x, cutoff, opts = {}) {
  const n = y.length;
  const sd = Math.sqrt(x.reduce((a, v) => a + (v - x.reduce((p, q) => p + q, 0) / n) ** 2, 0) / Math.max(1, n - 1));
  const h = opts.bandwidth || 2 * sd;
  const donut = opts.donut || 0;
  const idx = [];
  for (let i = 0; i < n; i += 1) {
    const d = Math.abs(x[i] - cutoff);
    if (d < h && d >= donut) idx.push(i);
  }
  if (idx.length < 6) return { singular: true, reason: 'too few points inside the bandwidth' };

  const w = idx.map((i) => Math.max(0, 1 - Math.abs(x[i] - cutoff) / h));
  const yUse = idx.map((i) => y[i]);
  const dx = idx.map((i) => x[i] - cutoff);
  const D = idx.map((i) => (x[i] >= cutoff ? 1 : 0));

  // y = a + b*dx + tau*D + g*D*dx
  const X = dx.map((v, i) => [1, v, D[i], D[i] * v]);
  const fit = ols(yUse, X, { weights: w });
  if (fit.singular) return { singular: true };

  const out = {
    singular: false,
    effect: fit.beta[2],
    se: fit.se[2],
    t: fit.t[2],
    p: fit.p[2],
    stars: fit.stars[2],
    bandwidth: h,
    donut,
    nUsed: idx.length,
    nLeft: D.filter((d) => d === 0).length,
    nRight: D.filter((d) => d === 1).length,
    leftFit: { intercept: fit.beta[0], slope: fit.beta[1] },
    rightFit: { intercept: fit.beta[0] + fit.beta[2], slope: fit.beta[1] + fit.beta[3] },
  };

  if (opts.fuzzyD) {
    const dUse = idx.map((i) => opts.fuzzyD[i]);
    // first stage: take-up jumps at the cutoff
    const fs = ols(dUse, X, { weights: w });
    const jump = fs.beta[2];
    out.firstStage = { jump, se: fs.se[2], t: fs.t[2], p: fs.p[2] };
    if (Math.abs(jump) > 1e-10) {
      // Wald ratio; variance via the delta method on (tau_y / tau_d)
      out.effect = fit.beta[2] / jump;
      const vy = fit.se[2] ** 2;
      const vd = fs.se[2] ** 2;
      out.se = Math.sqrt(Math.max(0, vy / (jump * jump) + (fit.beta[2] * fit.beta[2] * vd) / (jump ** 4)));
      out.t = out.effect / (out.se || Infinity);
      out.p = tPValue(out.t, fit.df);
      out.stars = stars(out.p);
      out.fuzzy = true;
    }
  }
  return out;
}

// Binned scatter for the RD plot: means within equal bins either side.
export function rddBins(y, x, cutoff, bins = 10) {
  const sides = [
    { sign: -1, pts: [] },
    { sign: 1, pts: [] },
  ];
  x.forEach((v, i) => {
    const s = v < cutoff ? 0 : 1;
    sides[s].pts.push({ x: v, y: y[i] });
  });
  return sides
    .filter((s) => s.pts.length > 0)
    .flatMap((s) => {
      const xs = s.pts.map((p) => p.x);
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      const width = (hi - lo) / bins || 1;
      const buckets = Array.from({ length: bins }, () => []);
      s.pts.forEach((p) => {
        const b = Math.min(bins - 1, Math.floor((p.x - lo) / width));
        buckets[b].push(p);
      });
      return buckets
        .filter((b) => b.length > 0)
        .map((b) => ({
          x: b.reduce((a, p) => a + p.x, 0) / b.length,
          y: b.reduce((a, p) => a + p.y, 0) / b.length,
          n: b.length,
        }));
    });
}

// ---------- synthetic control ----------

// Project a vector onto the probability simplex.
function projectSimplex(v) {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let theta = 0;
  for (let i = 0; i < n; i += 1) {
    css += u[i];
    const t = (css - 1) / (i + 1);
    if (u[i] - t > 0) {
      theta = t;
    }
  }
  return v.map((x) => Math.max(0, x - theta));
}

// syntheticControl({ treatedPre, treatedPost, donorPre, donorPost, donorNames })
// treatedPre/Post: arrays of outcome values; donorPre/Post: arrays of arrays
// (one per donor). Weights minimize pre-period squared gap subject to the
// simplex constraint (Abadie-Diamond-Hainmueller).
export function syntheticControl({ treatedPre, treatedPost, donorPre, donorPost, donorNames = [] }) {
  const nDonors = donorPre.length;
  const nPre = treatedPre.length;
  const nPost = treatedPost.length;

  // loss(w) = ||X0 w - X1||^2 over pre periods
  const loss = (w) => {
    let s = 0;
    for (let t = 0; t < nPre; t += 1) {
      let pred = 0;
      for (let d = 0; d < nDonors; d += 1) pred += w[d] * donorPre[d][t];
      s += (pred - treatedPre[t]) ** 2;
    }
    return s;
  };
  const grad = (w) => {
    const g = new Array(nDonors).fill(0);
    for (let t = 0; t < nPre; t += 1) {
      let pred = 0;
      for (let d = 0; d < nDonors; d += 1) pred += w[d] * donorPre[d][t];
      const err = pred - treatedPre[t];
      for (let d = 0; d < nDonors; d += 1) g[d] += 2 * err * donorPre[d][t];
    }
    return g;
  };

  let w = new Array(nDonors).fill(1 / nDonors);
  let lr = 0.5;
  const scale = Math.max(1e-9, donorPre.flat().reduce((a, v) => a + v * v, 0));
  lr = 1 / (2 * scale / nDonors + 1e-9);
  let best = loss(w);
  for (let it = 0; it < 20000; it += 1) {
    const g = grad(w);
    const cand = projectSimplex(w.map((v, d) => v - lr * g[d]));
    const l = loss(cand);
    if (l <= best + 1e-14) {
      w = cand;
      best = l;
      if (Math.max(...g.map(Math.abs)) < 1e-10) break;
    } else {
      lr *= 0.7;
      if (lr < 1e-12) break;
    }
  }
  w = projectSimplex(w);

  const preGap = treatedPre.map((v, t) => {
    let pred = 0;
    for (let d = 0; d < nDonors; d += 1) pred += w[d] * donorPre[d][t];
    return v - pred;
  });
  const postGap = treatedPost.map((v, t) => {
    let pred = 0;
    for (let d = 0; d < nDonors; d += 1) pred += w[d] * donorPost[d][t];
    return v - pred;
  });
  const mspePre = preGap.reduce((a, v) => a + v * v, 0) / Math.max(1, nPre);

  return {
    weights: w.map((v, d) => ({
      name: donorNames[d] || `Donor ${d + 1}`,
      weight: v,
      pre: donorPre[d],
      post: donorPost[d],
    })).sort((a, b) => b.weight - a.weight),
    preGap,
    postGap,
    mspePre,
    postMeanGap: postGap.reduce((a, v) => a + v, 0) / Math.max(1, nPost),
  };
}

// ---------- propensity score matching ----------

// propensityMatch({ y, treat, X }): nearest-neighbour matching on the logit
// propensity score with a 0.2-sd caliper, ATT with paired-difference SE.
export function propensityMatch({ y, treat, X }) {
  const fit = logit(treat, X);
  if (fit.singular || !fit.beta) return { singular: true };
  const ps = fit.fitted;
  const logits = ps.map((p) => Math.log(Math.max(1e-9, Math.min(1 - 1e-9, p)) / (1 - Math.max(1e-9, Math.min(1 - 1e-9, p)))));
  const mean = logits.reduce((a, b) => a + b, 0) / logits.length;
  const sd = Math.sqrt(logits.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, logits.length - 1));
  const caliper = 0.2 * (sd || 1);

  const treated = treat.map((t, i) => (t === 1 ? i : -1)).filter((i) => i >= 0);
  const control = treat.map((t, i) => (t === 0 ? i : -1)).filter((i) => i >= 0);
  const used = new Set();
  const pairs = [];
  for (const ti of treated) {
    let bestJ = -1;
    let bestD = Infinity;
    for (const cj of control) {
      if (used.has(cj)) continue;
      const d = Math.abs(logits[ti] - logits[cj]);
      if (d < bestD) {
        bestD = d;
        bestJ = cj;
      }
    }
    if (bestJ >= 0 && bestD <= caliper) {
      used.add(bestJ);
      pairs.push({ treated: ti, control: bestJ, psTreated: ps[ti], psControl: ps[bestJ], diff: y[ti] - y[bestJ] });
    }
  }
  if (pairs.length === 0) return { singular: true, reason: 'no matches inside the caliper' };
  const diffs = pairs.map((p) => p.diff);
  const att = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const sdD = Math.sqrt(diffs.reduce((a, v) => a + (v - att) ** 2, 0) / Math.max(1, diffs.length - 1));
  const se = sdD / Math.sqrt(diffs.length);
  const t = se > 0 ? att / se : Infinity;
  return {
    singular: false,
    att,
    se,
    t,
    p: tPValue(t, Math.max(1, diffs.length - 1)),
    stars: stars(tPValue(t, Math.max(1, diffs.length - 1))),
    nTreated: treated.length,
    nMatched: pairs.length,
    pairs,
    pseudoR2: fit.pseudoR2,
    converged: fit.converged,
  };
}
