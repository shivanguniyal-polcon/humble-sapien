// Battery module: probabilistic sensitivity analysis (Monte Carlo risk).
// Uncertainty is declared distribution by distribution, then sampled with a
// SEEDED generator (mulberry32), so the same input produces the same draws on
// every machine, forever. A Monte Carlo run that cannot be reproduced is a
// rumour; this one is an audit artefact like every other module.

import { escapeHtml } from './decisionTree.js';

// Deterministic PRNG. Same seed, same sequence, on any JavaScript engine.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sampling per distribution. The sampler consumes the seeded generator
// directly so every draw (including the two uniforms inside a normal) is
// reproducible and statistically independent of its neighbours.
function drawFrom(dist, rand, scale) {
  const unit = (() => {
    switch (dist.dist) {
      case 'uniform':
        return dist.min + (dist.max - dist.min) * rand();
      case 'normal': {
        const u1 = Math.max(rand(), 1e-12);
        const u2 = rand();
        return dist.mean + dist.sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }
      case 'lognormal': {
        const u1 = Math.max(rand(), 1e-12);
        const u2 = rand();
        return Math.exp(dist.mu + dist.sigma * (Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
      }
      case 'beta': {
        // Ratio of two gamma draws (Marsaglia and Tsang), each with its own
        // normal draw. Rejection keeps the cube step valid.
        const gamma = (k) => {
          if (k < 1) return gamma(k + 1) * Math.pow(Math.max(rand(), 1e-12), 1 / k);
          const d = k - 1 / 3;
          const c = 1 / Math.sqrt(9 * d);
          for (;;) {
            const u1 = Math.max(rand(), 1e-12);
            const u2 = rand();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const v = Math.pow(1 + c * z, 3);
            if (v > 0 && u2 > 0) {
              if (Math.log(u2) < 0.5 * z * z + d * (1 - v + Math.log(v))) return d * v;
            }
          }
        };
        const x = gamma(dist.alpha);
        const y = gamma(dist.beta);
        return x / (x + y);
      }
      case 'triangular': {
        const { min, mode, max } = dist;
        const u = rand();
        const f = (mode - min) / (max - min);
        return u < f
          ? min + Math.sqrt(u * (max - min) * (mode - min))
          : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
      }
      default:
        return 0;
    }
  })();
  return unit * (scale == null ? 1 : scale);
}

export const monteCarlo = {
  id: 'monte-carlo',
  label: 'Monte Carlo risk analysis',
  question: 'When every assumption is uncertain at once, how often does the project still pay, and what is the downside tail?',

  bindNote:
    'Parameters live in the structure: the distributions of each uncertain input and the seed. The seed is part of the result: it is what makes this run reproducible and the manifest meaningful. Change the seed only when you intend to run a different experiment.',

  validate(input) {
    const errors = [];
    const warnings = [];
    const vars = Array.isArray(input && input.variables) ? input.variables : [];
    if (vars.length === 0) errors.push('No uncertain variables declared.');
    const ids = vars.map((v) => v.id);
    if (new Set(ids).size !== ids.length) errors.push('Variable ids must be unique.');
    for (const v of vars) {
      if (!v.id || !v.label) errors.push('Every variable needs an id and a label.');
      const d = v.dist || {};
      switch (d.dist) {
        case 'uniform':
          if (!Number.isFinite(d.min) || !Number.isFinite(d.max) || d.max <= d.min) errors.push(`"${v.label || v.id}": uniform needs min < max.`);
          break;
        case 'normal':
          if (!Number.isFinite(d.mean) || !Number.isFinite(d.sd) || d.sd <= 0) errors.push(`"${v.label || v.id}": normal needs a mean and a positive sd.`);
          break;
        case 'lognormal':
          if (!Number.isFinite(d.mu) || !Number.isFinite(d.sigma) || d.sigma <= 0) errors.push(`"${v.label || v.id}": lognormal needs mu and a positive sigma.`);
          break;
        case 'beta':
          if (!Number.isFinite(d.alpha) || !Number.isFinite(d.beta) || d.alpha <= 0 || d.beta <= 0) errors.push(`"${v.label || v.id}": beta needs positive alpha and beta.`);
          break;
        case 'triangular':
          if (!Number.isFinite(d.min) || !Number.isFinite(d.mode) || !Number.isFinite(d.max) || !(d.min <= d.mode && d.mode <= d.max) || d.max === d.min) {
            errors.push(`"${v.label || v.id}": triangular needs min <= mode <= max.`);
          }
          break;
        default:
          errors.push(`"${v.label || v.id}": unknown distribution "${d.dist}". Use uniform, normal, lognormal, beta or triangular.`);
      }
      if (v.kind !== 'cost' && v.kind !== 'benefit') errors.push(`"${v.label || v.id}" must be kind "cost" or "benefit".`);
      if (v.scale != null && (!Number.isFinite(v.scale) || v.scale <= 0)) {
        errors.push(`"${v.label || v.id}": scale must be a positive number when given.`);
      }
    }
    const runs = input && input.runs;
    if (!Number.isInteger(runs) || runs < 100 || runs > 100000) errors.push('runs must be a whole number from 100 to 100,000.');
    if (!Number.isInteger(input && input.seed)) errors.push('seed must be a whole number. It is what makes this run reproducible.');
    if (!input || !input.pit || !input.pit.group) {
      warnings.push('No distributional column. The public interest check asks: when the tail bites, who gets bitten?');
    }
    return { errors, warnings };
  },

  run(input) {
    const { variables, runs, seed } = input;
    const rand = mulberry32(seed);
    const npvSamples = new Array(runs);
    const byVar = variables.map(() => new Array(runs));

    for (let i = 0; i < runs; i += 1) {
      let npv = 0;
      for (let j = 0; j < variables.length; j += 1) {
        const v = variables[j];
        const x = drawFrom(v.dist, rand, v.scale);
        byVar[j][i] = x;
        npv += v.kind === 'cost' ? -x : x;
      }
      npvSamples[i] = npv;
    }

    const sorted = [...npvSamples].sort((a, b) => a - b);
    const quantile = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    const mean = npvSamples.reduce((a, b) => a + b, 0) / runs;
    const pLoss = npvSamples.filter((v) => v < 0).length / runs;

    return {
      runs,
      seed,
      mean,
      p5: quantile(0.05),
      p25: quantile(0.25),
      median: quantile(0.5),
      p75: quantile(0.75),
      p95: quantile(0.95),
      worst: sorted[0],
      best: sorted[sorted.length - 1],
      pNegative: pLoss,
      variables: variables.map((v, j) => {
        const col = [...byVar[j]].sort((a, b) => a - b);
        return {
          id: v.id,
          label: v.label,
          kind: v.kind,
          mean: col.reduce((a, b) => a + b, 0) / runs,
          p5: col[Math.floor(0.05 * runs)],
          p95: col[Math.floor(0.95 * runs)],
        };
      }),
      pit: input.pit || null,
    };
  },

  headline(r) {
    return `Across ${r.runs.toLocaleString('en-IN')} seeded runs: mean net ₹${Math.round(r.mean).toLocaleString('en-IN')}, 5th percentile ₹${Math.round(r.p5).toLocaleString('en-IN')}, and a ${(r.pNegative * 100).toFixed(1)}% chance the net value is negative.`;
  },

  renderResults(r) {
    const num = (v) => Math.round(v).toLocaleString('en-IN');
    const rows = r.variables
      .map(
        (v) => `<tr><th scope="row">${escapeHtml(v.label)}</th><td>${v.kind}</td><td class="data-num">₹${num(v.mean)}</td><td class="data-num">₹${num(v.p5)}</td><td class="data-num">₹${num(v.p95)}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">Every figure below comes from the seeded sequence beginning at seed ${r.seed}. Re-run with the same input and the percentiles move not at all.</p>
      <h3>Net value distribution</h3>
      <table class="result-table"><thead><tr><th>Statistic</th><th>Net value (₹)</th></tr></thead><tbody>
        <tr><th scope="row">Mean</th><td class="data-num">₹${num(r.mean)}</td></tr>
        <tr><th scope="row">5th percentile (downside)</th><td class="data-num">₹${num(r.p5)}</td></tr>
        <tr><th scope="row">25th percentile</th><td class="data-num">₹${num(r.p25)}</td></tr>
        <tr><th scope="row">Median</th><td class="data-num">₹${num(r.median)}</td></tr>
        <tr><th scope="row">75th percentile</th><td class="data-num">₹${num(r.p75)}</td></tr>
        <tr><th scope="row">95th percentile</th><td class="data-num">₹${num(r.p95)}</td></tr>
        <tr><th scope="row">Worst run of ${r.runs.toLocaleString('en-IN')}</th><td class="data-num">₹${num(r.worst)}</td></tr>
        <tr><th scope="row">Chance of a negative net</th><td class="data-num">${(r.pNegative * 100).toFixed(1)}%</td></tr>
      </tbody></table>
      <h3>Uncertain inputs as sampled</h3>
      <table class="result-table"><thead><tr><th>Variable</th><th>Kind</th><th>Mean</th><th>5th percentile</th><th>95th percentile</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="fine-print">The 5th percentile is the planning number: a scheme that survives the average but not the tail is a scheme that fails in a bad year. Name who absorbs that year.</p>
      ${r.pit && r.pit.group ? `<p class="fine-print">Distributional column: ${escapeHtml(r.pit.group)}: ${escapeHtml(r.pit.effect || '')}. ${escapeHtml(r.pit.note || '')}</p>` : '<p class="report-warning">No distributional column. When the tail bites, who gets bitten?</p>'}`;
  },
};

export const monteCarloSample = {
  title: 'Illustrative: net value of a district dialysis programme under joint uncertainty',
  runs: 10000,
  seed: 20261014,
  variables: [
    {
      id: 'capex', label: 'Capital cost of the unit', kind: 'cost',
      dist: { dist: 'triangular', min: 2400000, mode: 3000000, max: 4200000 },
    },
    {
      id: 'opex', label: 'Annual operating cost', kind: 'cost',
      dist: { dist: 'normal', mean: 700000, sd: 100000 },
    },
    {
      id: 'sessions', label: 'Valued health benefit per year', kind: 'benefit',
      dist: { dist: 'lognormal', mu: 15.1, sigma: 0.4 },
    },
    {
      id: 'offset', label: 'Averted referral costs captured by the payer', kind: 'benefit',
      dist: { dist: 'uniform', min: 120000, max: 260000 },
    },
    {
      id: 'utilisation', label: 'Shared-savings bonus (0 to 1 of the pool)', kind: 'benefit',
      dist: { dist: 'beta', alpha: 2, beta: 5 }, scale: 240000,
    },
  ],
  pit: {
    group: 'Patients in the tail scenario (low utilisation years)',
    effect: 'restricted',
    note: 'When the model lands in its downside tail, the programme still runs but rationing starts: the tail is measured in sessions denied, not only in rupees.',
  },
};
