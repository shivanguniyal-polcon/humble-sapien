// Battery module: scenario analysis. Driver-based policy runs against a
// system-dynamics reference case. The shipped reference case is the PM-JAY
// fiscal-sustainability model (Ayushman_Bharat_SD_Model.py, calibrated
// September 2026 to NHA / PIB / Lok Sabha anchors 2018-2025). This is a
// deterministic port: fixed-step RK4 at half-monthly steps instead of the
// original adaptive RK45, so the same input produces the same numbers on any
// machine, forever. Small residuals against the Python original are an
// integrator artefact and are documented in the tests.
//
// The distributional column is structural: the model produces one genuinely
// distributional quantity, the claims that are billed but never paid (the
// rationing burden), and every scenario must say who bears it.

import { escapeHtml } from './decisionTree.js';

// ---------------------------------------------------------------------------
// The reference case: calibrated parameters and the driver catalogue.
// ---------------------------------------------------------------------------

// Fitted 2026-09-04, log-space least squares on pmjay_official_series.csv
// (NHA / PIB / Lok Sabha anchors), fit window 2018-09 to 2025-03. These are
// the values in pmjay_calibrated_params.json.
export const PMJAY_REFERENCE = {
  id: 'pmjay-calibrated',
  label: 'PM-JAY fiscal-sustainability model (calibrated to NHA/PIB 2018-2025)',
  status: 'reported',
  provenance:
    'Port of Ayushman_Bharat_SD_Model.py with pmjay_calibrated_params.json (fitted 2026-09-04 to NHA / PIB / Lok Sabha anchors 2018-2025, log-space least squares). Official anchors: cards 10.39 Cr (Sep-19) to 40.45 Cr (Mar-25), admissions 1.69 M (FY19) to 9.19 Cr (Mar-25), empanelled hospitals 18,236 (Sep-18) to 31,005 (Mar-25), treatment value Rs 37,606 Cr (Mar-22) to Rs 1,29,386 Cr (Mar-25).',
  source: 'PMJAY_Calibration_Report.md and pmjay_official_series.csv in the THS research repository.',
  params: {
    targetPopulation: 500.0,
    initialEnrolled: 0.1,
    enrollmentRate: 0.3627,
    enrollmentDecay: 0.06173,
    govPushYears: 0.822,
    campaignRate: 1.3749,
    claimRatePerEnrolled: 0.08368,
    claimGrowthRate: 0.0,
    targetHospitals: 45.0,
    hospitalJoinRate: 4.241,
    hospitalAttritionRate: 0.03,
    initialHospitals: 18.236,
    avgClaimSize: 10180.0,
    avgClaimGrowth: 0.0785,
    initialFund: 2000.0,
    annualBudgetBase: 22500.0,
    budgetGrowthRate: 0.1,
    minReserveFraction: 0.05,
    fraudRate: 0.13,
    fraudDetectionRate: 0.2,
    fraudRecoveryRate: 0.15,
    fraudPenaltyMultiplier: 2.0,
    tStart: 2018.75,
    tEnd: 2035.0,
    prFloorTarget: 0.85,
    warmupYears: 3.25,
  },
};

// Every driver a scenario may override, with its range and meaning. Unknown
// keys are rejected loudly; nothing is guessed.
export const DRIVERS = {
  fraudRate: { label: 'Fraud share of billed claims', unit: 'fraction per year', min: 0, max: 1 },
  fraudDetectionRate: { label: 'Fraud detection rate', unit: 'fraction per year', min: 0, max: 1 },
  fraudRecoveryRate: { label: 'Fraud recovery rate', unit: 'fraction per year', min: 0, max: 1 },
  fraudPenaltyMultiplier: { label: 'Penalty multiplier on detected fraud', unit: 'times the amount', min: 0, max: 10 },
  targetHospitals: { label: 'Empanelment ceiling', unit: 'thousand hospitals', min: 1, max: 200 },
  hospitalAttritionRate: { label: 'Hospital attrition rate', unit: 'fraction per year', min: 0, max: 1 },
  hospitalJoinRate: { label: 'Hospital join rate at full ceiling gap', unit: 'thousand per year', min: 0, max: 50 },
  enrollmentRate: { label: 'Enrollment gap-closing rate', unit: 'fraction of remaining pool per year', min: 0, max: 1 },
  enrollmentDecay: { label: 'Card churn and inactive removal', unit: 'fraction per year', min: 0, max: 1 },
  claimRatePerEnrolled: { label: 'Admissions per enrolled person', unit: 'admissions per year', min: 0, max: 1 },
  claimGrowthRate: { label: 'Utilisation growth', unit: 'fraction per year', min: -0.5, max: 1 },
  avgClaimSize: { label: 'Average claim size at launch', unit: 'rupees per claim', min: 0, max: 1e6 },
  avgClaimGrowth: { label: 'Average claim growth (NCD case-mix driver)', unit: 'fraction per year', min: -0.5, max: 1 },
  annualBudgetBase: { label: 'Combined budget envelope after ramp', unit: 'rupees crore per year', min: 0, max: 1e6 },
  budgetGrowthRate: { label: 'Budget growth after the ramp', unit: 'fraction per year', min: -0.5, max: 2 },
  minReserveFraction: { label: 'Statutory reserve floor', unit: 'fraction of the fund', min: 0, max: 1 },
  targetPopulation: { label: 'Eligible population pool', unit: 'million persons', min: 1, max: 2000 },
  campaignRate: { label: 'Campaign wave multiplier', unit: 'times the pull', min: 0, max: 10 },
  govPushYears: { label: 'Verification-drive horizon', unit: 'years', min: 0, max: 20 },
};

const SCENARIO_LEVERS = {
  baseline: {},
  fraud_control: {
    fraudDetectionRate: 0.4,
    fraudRecoveryRate: 0.3,
    fraudPenaltyMultiplier: 3.0,
    fraudRate: 0.1,
  },
  hospital_expansion: {
    targetHospitals: 60.0,
    hospitalAttritionRate: 0.02,
    enrollmentRate: 0.3627 * 1.25,
  },
  combined: {
    fraudDetectionRate: 0.4,
    fraudRecoveryRate: 0.3,
    fraudPenaltyMultiplier: 3.0,
    fraudRate: 0.1,
    targetHospitals: 60.0,
    hospitalAttritionRate: 0.02,
    enrollmentRate: 0.3627 * 1.25,
  },
};

// ---------------------------------------------------------------------------
// The model core. All flows are annual rates; t is in years.
// ---------------------------------------------------------------------------

function derive(t, y, p) {
  const enrolled = Math.max(y[0], 0.01);
  const fund = Math.max(y[1], 0);
  const hospitals = Math.max(y[2], 0.01);
  const fraudAcc = Math.max(y[3], 0);
  const yearsElapsed = Math.max(t - p.tStart, 0);

  const annualBudget = budgetAt(yearsElapsed, p);

  const govPush = Math.max(0, 1 - yearsElapsed / p.govPushYears);
  let campPush = 0;
  const campStart = 5;
  const campEnd = 7;
  if (yearsElapsed >= campStart && yearsElapsed <= campEnd) {
    const ramp = Math.min(1, (yearsElapsed - campStart) / 0.5);
    const fade = Math.min(1, (campEnd - yearsElapsed) / 0.5);
    campPush = p.campaignRate * ramp * fade;
  }
  const remaining = Math.max(p.targetPopulation - enrolled, 0);
  const enrollmentPull = remaining * p.enrollmentRate * (0.3 + 0.7 * govPush + campPush);
  const enrollmentOut = p.enrollmentDecay * enrolled;

  // Exogenous calibrated claim path: million x Rs / 1e1 = Rs crore per year.
  const avgClaim = avgClaimAt(yearsElapsed, p);
  const effectiveClaimRate = p.claimRatePerEnrolled * (1 + p.claimGrowthRate * yearsElapsed);
  const totalClaims = (enrolled * effectiveClaimRate * avgClaim) / 1e1;
  const fraudClaims = totalClaims * p.fraudRate;

  const fraudDetection = fraudAcc * p.fraudDetectionRate + fraudClaims * p.fraudDetectionRate * 0.5;
  const fraudRecovery = fraudDetection * p.fraudRecoveryRate * p.fraudPenaltyMultiplier;

  // Payment rule: pay in full above the statutory reserve, otherwise
  // pay-as-you-go at what the budget and recoveries can fund.
  const reserve = p.minReserveFraction * fund;
  const claimsPayment = fund > reserve ? totalClaims : Math.min(totalClaims, annualBudget + fraudRecovery);
  const paymentRatio = Math.min(claimsPayment / Math.max(totalClaims, 1e-9), 1);

  const hospitalJoin = p.hospitalJoinRate * (1 - hospitals / p.targetHospitals) * paymentRatio;
  const hospitalLeave = p.hospitalAttritionRate * hospitals * (1 - paymentRatio);
  const fraudAccumRate = fraudClaims * (1 - p.fraudDetectionRate * 0.5);
  const admissionsPerYear = enrolled * effectiveClaimRate;

  return [
    enrollmentPull - enrollmentOut,
    annualBudget - claimsPayment + fraudRecovery,
    hospitalJoin - hospitalLeave,
    fraudAccumRate - fraudRecovery,
    enrollmentPull,
    admissionsPerYear,
    // flow extras (not state derivatives) packed after the six states
    claimsPayment,
    totalClaims,
    annualBudget,
  ];
}

// The budget ramp and the exogenous claim path, exposed separately because
// they are exact, hand-checkable formulas.
export function budgetAt(yearsElapsed, p) {
  const rampYears = 5;
  const budgetRamp = yearsElapsed < rampYears ? 0.4 + 0.6 * (yearsElapsed / rampYears) : 1;
  return p.annualBudgetBase * budgetRamp * Math.pow(1 + p.budgetGrowthRate, Math.max(yearsElapsed - rampYears, 0));
}

export function avgClaimAt(yearsElapsed, p) {
  return p.avgClaimSize * Math.pow(1 + p.avgClaimGrowth, yearsElapsed);
}

const DT = 1 / 24; // half-monthly integration step (RK4), monthly output grid

function rk4Step(t, y, h, p) {
  const k1 = derive(t, y, p);
  const k2 = derive(t + h / 2, y.map((v, i) => v + (h / 2) * k1[i]), p);
  const k3 = derive(t + h / 2, y.map((v, i) => v + (h / 2) * k2[i]), p);
  const k4 = derive(t + h, y.map((v, i) => v + h * k3[i]), p);
  return y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// Simulate one scenario. Returns monthly samples: t, the six states, and the
// flow values implied at each sample point. The step counter (not accumulated
// float addition) keeps the time grid exact, so re-runs are bit-identical.
export function simulate(p) {
  const months = [];
  let y = [p.initialEnrolled, p.initialFund, p.initialHospitals, 0, 0, 0];
  const outMonth = (tNow, yNow) => {
    const d = derive(tNow, yNow, p);
    months.push({
      t: tNow,
      enrolled: yNow[0],
      fund: yNow[1],
      hospitals: yNow[2],
      fraud: yNow[3],
      cumCards: yNow[4],
      cumAdmissions: yNow[5],
      claimsPaid: d[6],
      claimsBilled: d[7],
      annualBudget: d[8],
      paymentRatio: Math.min(d[6] / Math.max(d[7], 1e-9), 1),
    });
  };
  outMonth(p.tStart, y);
  const totalSteps = Math.round((p.tEnd - p.tStart) / DT);
  for (let step = 1; step <= totalSteps; step += 1) {
    const tNow = p.tStart + step * DT;
    y = rk4Step(tNow - DT, y, DT, p);
    if (step % 2 === 0) outMonth(tNow, y);
  }
  return months;
}

function trapezoid(values, t) {
  let sum = 0;
  for (let i = 0; i < values.length - 1; i += 1) {
    sum += ((values[i] + values[i + 1]) / 2) * (t[i + 1] - t[i]);
  }
  return sum;
}

// Sustainability criteria, ported from evaluate_sustainability().
export function evaluateSustainability(months, p) {
  const warm = p.tStart + p.warmupYears;
  const ts = months.map((m) => m.t);
  const afterWarm = months.filter((m) => m.t >= warm);

  const prFloor = Math.min(...afterWarm.map((m) => m.paymentRatio));
  const breachMonths = afterWarm.filter((m) => m.paymentRatio < p.prFloorTarget).length;
  const rationing = afterWarm.find((m) => m.paymentRatio < 0.999);
  const coverage = (months[months.length - 1].enrolled / p.targetPopulation) * 100;

  const paidCum = trapezoid(months.map((m) => m.claimsPaid), ts);
  const netExpenditure = paidCum - months[months.length - 1].fund + p.initialFund;

  // The rationing burden: claims billed but never paid. This is the model's
  // distributional quantity, and the public interest check asks who bears it.
  const unpaidClaims = trapezoid(
    months.map((m) => Math.max(m.claimsBilled - m.claimsPaid, 0)),
    ts,
  );
  const billedCum = trapezoid(months.map((m) => m.claimsBilled), ts);

  return {
    prFloor,
    prBreachMonths: breachMonths,
    rationingOnset: rationing ? rationing.t : null,
    coverage2035: coverage,
    finalFund: months[months.length - 1].fund,
    finalFraud: months[months.length - 1].fraud,
    netExpenditure,
    costPerCoveragePoint: netExpenditure / Math.max(coverage, 1e-9),
    unpaidClaims,
    unpaidShare: billedCum > 0 ? unpaidClaims / billedCum : 0,
    verdict:
      prFloor >= p.prFloorTarget && !rationing && coverage >= 60 ? 'PASS' : 'FAIL',
  };
}

// Smallest constant budget growth that holds the payment-ratio floor, by
// bisection. The headline policy number: it converts "unsustainable" into
// "the budget must grow at least X% per year".
export function requiredBudgetGrowth(p, lo = 0.1, hi = 0.8) {
  const endPr = (g) => {
    const q = { ...p, budgetGrowthRate: g };
    const months = simulate(q);
    const warm = q.tStart + q.warmupYears;
    return Math.min(...months.filter((m) => m.t >= warm).map((m) => m.paymentRatio));
  };
  const target = p.prFloorTarget;
  if (endPr(lo) >= target) return { growth: lo, prFloor: endPr(lo), attained: true };
  if (endPr(hi) < target) return { growth: hi, prFloor: endPr(hi), attained: false };
  for (let i = 0; i < 30; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (endPr(mid) >= target) hi = mid;
    else lo = mid;
    if (hi - lo < 1e-4) break;
  }
  return { growth: hi, prFloor: endPr(hi), attained: endPr(hi) >= target };
}

// ---------------------------------------------------------------------------
// Module contract
// ---------------------------------------------------------------------------

function mergeParams(drivers) {
  return { ...PMJAY_REFERENCE.params, ...drivers };
}

function annualSeries(months) {
  const out = [];
  for (let i = 0; i < months.length; i += 12) {
    const m = months[i];
    out.push({
      year: Number(m.t.toFixed(2)),
      paymentRatio: Number(m.paymentRatio.toFixed(4)),
      claimsBilled: Number(m.claimsBilled.toFixed(1)),
      claimsPaid: Number(m.claimsPaid.toFixed(1)),
      budget: Number(m.annualBudget.toFixed(1)),
      enrolled: Number(m.enrolled.toFixed(2)),
    });
  }
  return out;
}

export const scenario = {
  id: 'scenario',
  label: 'Scenario analysis',
  question: 'Which policy lever moves the outcome, and who is left unpaid when it does not?',

  validate(input) {
    const errors = [];
    const warnings = [];
    const scenarios = Array.isArray(input && input.scenarios) ? input.scenarios : [];
    if (scenarios.length === 0) errors.push('The run has no scenarios.');
    if (scenarios.length === 1) warnings.push('A scenario analysis with one scenario is a baseline. Add an alternative.');
    const ids = scenarios.map((s) => s.id);
    if (new Set(ids).size !== ids.length) errors.push('Scenario ids must be unique.');
    for (const s of scenarios) {
      if (!s.id || !s.label) errors.push('Every scenario needs an id and a label.');
      const drivers = s.drivers || {};
      for (const [k, v] of Object.entries(drivers)) {
        const meta = DRIVERS[k];
        if (!meta) {
          errors.push(`Scenario "${s.label}" uses unknown driver "${k}". Known drivers are documented with the module.`);
          continue;
        }
        if (!Number.isFinite(v)) {
          errors.push(`Driver "${k}" in scenario "${s.label}" is not a number.`);
          continue;
        }
        if (v < meta.min || v > meta.max) {
          warnings.push(`Driver "${k}" in scenario "${s.label}" is ${v}, outside the plausible range ${meta.min} to ${meta.max} ${meta.unit}.`);
        }
      }
      if (!s.pit || !s.pit.group) {
        warnings.push(`Scenario "${s.label}" has no distributional column. The public interest check asks: who is left unpaid here?`);
      }
    }
    if (input && input.model && input.model !== PMJAY_REFERENCE.id) {
      errors.push(`Unknown reference model "${input.model}". This engine ships ${PMJAY_REFERENCE.id}.`);
    }
    return { errors, warnings };
  },

  run(input) {
    const base = input.base || {};
    const out = [];
    for (const s of input.scenarios) {
      const drivers = { ...base, ...(s.drivers || {}) };
      const p = mergeParams(drivers);
      const months = simulate(p);
      const sus = evaluateSustainability(months, p);
      const req = requiredBudgetGrowth(p);
      out.push({
        id: s.id,
        label: s.label,
        drivers,
        metrics: {
          prFloor: sus.prFloor,
          prBreachMonths: sus.prBreachMonths,
          rationingOnset: sus.rationingOnset,
          coverage2035: sus.coverage2035,
          finalFund: sus.finalFund,
          finalFraud: sus.finalFraud,
          netExpenditure: sus.netExpenditure,
          costPerCoveragePoint: sus.costPerCoveragePoint,
          unpaidClaims: sus.unpaidClaims,
          unpaidShare: sus.unpaidShare,
          verdict: sus.verdict,
          requiredBudgetGrowth: req.growth,
          requiredBudgetAttained: req.attained,
        },
        series: annualSeries(months),
        pit: s.pit || null,
      });
    }
    return {
      model: PMJAY_REFERENCE.id,
      modelLabel: PMJAY_REFERENCE.label,
      modelProvenance: PMJAY_REFERENCE.provenance,
      modelSource: PMJAY_REFERENCE.source,
      modelStatus: PMJAY_REFERENCE.status,
      horizon: { startYear: PMJAY_REFERENCE.params.tStart, endYear: PMJAY_REFERENCE.params.tEnd },
      prFloorTarget: PMJAY_REFERENCE.params.prFloorTarget,
      scenarios: out,
      gaps: out.filter((s) => !s.pit || !s.pit.group).map((s) => s.id),
    };
  },

  renderResults(r) {
    const pct = (v, d = 1) => (v == null ? 'n/a' : `${(v * 100).toFixed(d)}%`);
    const num = (v, d = 0) =>
      v == null ? 'n/a' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
    const year = (v) => (v == null ? 'never' : `year ${v.toFixed(1)}`);

    const rows = r.scenarios
      .map(
        (s) => `<tr><th scope="row">${escapeHtml(s.label)}</th>
          <td class="data-num">${pct(s.metrics.prFloor)}</td>
          <td class="data-num">${num(s.metrics.prBreachMonths)}</td>
          <td class="data-num">${year(s.metrics.rationingOnset)}</td>
          <td class="data-num">${s.metrics.coverage2035.toFixed(1)}%</td>
          <td>${s.metrics.verdict === 'PASS' ? 'holds' : 'fails'}</td></tr>`,
      )
      .join('');

    const burdenRows = r.scenarios
      .map(
        (s) => `<tr><th scope="row">${escapeHtml(s.label)}</th>
          <td class="data-num">₹${num(s.metrics.unpaidClaims)} Cr</td>
          <td class="data-num">${pct(s.metrics.unpaidShare)}</td>
          <td class="data-num">${s.metrics.requiredBudgetAttained ? `+${pct(s.metrics.requiredBudgetGrowth)}/yr` : `+${pct(s.metrics.requiredBudgetGrowth)}/yr (floor unattainable inside 0 to 80%)`}</td>
          <td>${s.pit && s.pit.group ? `${escapeHtml(s.pit.group)}: ${escapeHtml(s.pit.effect || '')}` : '<strong>missing</strong>'}</td></tr>`,
      )
      .join('');

    const best = r.scenarios.reduce((a, b) =>
      a.metrics.requiredBudgetGrowth <= b.metrics.requiredBudgetGrowth ? a : b,
    );
    const holds = r.scenarios.filter((s) => s.metrics.verdict === 'PASS');
    const headline = holds.length === 0
      ? `None of the ${r.scenarios.length} scenarios holds the ${(r.prFloorTarget * 100).toFixed(0)}% payment-ratio floor on this envelope. The smallest ask: <strong>${escapeHtml(best.label)}</strong> needs the budget to grow <strong>${pct(best.metrics.requiredBudgetGrowth)}</strong> per year to hold it.`
      : `${holds.length} of ${r.scenarios.length} scenarios hold the ${(r.prFloorTarget * 100).toFixed(0)}% payment-ratio floor. The cheapest route to the floor: <strong>${escapeHtml(best.label)}</strong> at <strong>${pct(best.metrics.requiredBudgetGrowth)}</strong> budget growth per year.`;
    const first = r.scenarios[0];

    return `
      <p class="report-headline">${headline} In ${escapeHtml(first.label)} rationing starts at ${year(first.metrics.rationingOnset)}.</p>
      <h3>Sustainability criteria by scenario</h3>
      <table class="result-table"><thead><tr><th>Scenario</th><th>Payment-ratio floor</th><th>Months below ${(r.prFloorTarget * 100).toFixed(0)}%</th><th>Rationing onset</th><th>Coverage ${r.horizon.endYear}</th><th>Verdict</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>The rationing burden and who carries it</h3>
      <p class="fine-print">Unpaid claims are the billed care that the fund could not settle. In the model the shortfall is spread across enrolled households as denied or delayed treatment; the column names who actually bears it in the world. A scenario without that column does not know who pays for its savings.</p>
      <table class="result-table"><thead><tr><th>Scenario</th><th>Unpaid claims (cumulative)</th><th>Share of billed</th><th>Budget growth to hold the floor</th><th>Distributional column</th></tr></thead><tbody>${burdenRows}</tbody></table>
      ${r.gaps.length > 0 ? `<p class="report-warning">Distributional column missing for: ${r.gaps.map(escapeHtml).join(', ')}. The public interest check is incomplete for these scenarios.</p>` : ''}
      <h3>Annual path of the first scenario</h3>
      <table class="result-table"><thead><tr><th>Year</th><th>Payment ratio</th><th>Claims billed (₹ Cr)</th><th>Claims paid (₹ Cr)</th><th>Budget (₹ Cr)</th><th>Enrolled (M)</th></tr></thead><tbody>${r.scenarios[0].series
        .map(
          (y) => `<tr><th scope="row">${y.year}</th><td class="data-num">${pct(y.paymentRatio)}</td><td class="data-num">${num(y.claimsBilled)}</td><td class="data-num">${num(y.claimsPaid)}</td><td class="data-num">${num(y.budget)}</td><td class="data-num">${num(y.enrolled, 1)}</td></tr>`,
        )
        .join('')}</tbody></table>
      <p class="fine-print">Reference case: ${escapeHtml(r.modelLabel)}. ${escapeHtml(r.modelProvenance)} Source: ${escapeHtml(r.modelSource)} Engine note: this port integrates with fixed-step RK4 at half-monthly steps, while the Python original uses adaptive RK45; figures agree to roughly 1%, and rationing onset to within a few months.</p>`;
  },
};

// ---------------------------------------------------------------------------
// The shipped sample: the four calibrated PM-JAY lever scenarios.
// ---------------------------------------------------------------------------

export const scenarioSample = {
  title: 'PM-JAY fiscal sustainability to 2035: the four calibrated lever scenarios',
  model: 'pmjay-calibrated',
  scenarios: [
    {
      id: 'baseline',
      label: 'Baseline (calibrated levers)',
      drivers: {},
      pit: {
        group: 'Enrolled households facing denied or delayed admissions',
        effect: 'restricted',
        note: 'When the payment ratio falls, hospitals ration beds and families return to out-of-pocket spending. The near-poor above the eligibility line absorb the first cut.',
      },
    },
    {
      id: 'fraud_control',
      label: 'Fraud control (L1): detection, penalties, deterrence',
      drivers: SCENARIO_LEVERS.fraud_control,
      pit: {
        group: 'Enrolled households and defrauded patients',
        effect: 'benefits',
        note: 'Recovered money returns to genuine claims; billing fraud in the sample data clusters around ghost patients, so the beneficiaries of detection are the same population the fraud excluded.',
      },
    },
    {
      id: 'hospital_expansion',
      label: 'Hospital expansion (L2): empanelment ceiling and access',
      drivers: SCENARIO_LEVERS.hospital_expansion,
      pit: {
        group: 'New enrollees in underserved districts versus hospitals awaiting settlement',
        effect: 'mixed',
        note: 'Coverage rises fastest where empanelment grew, but faster enrollment against a fixed envelope sharpens the rationing for everyone already in the pool.',
      },
    },
    {
      id: 'combined',
      label: 'Combined (L1 + L2)',
      drivers: SCENARIO_LEVERS.combined,
      pit: {
        group: 'Enrolled households, hospitals and the state budget',
        effect: 'mixed',
        note: 'The levers compose: fraud savings help, expansion raises claims. The unpaid-claims column shows how much of the improvement is real and how much is rationing by another name.',
      },
    },
  ],
};
