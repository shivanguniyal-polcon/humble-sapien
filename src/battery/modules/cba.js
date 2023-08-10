// Battery module: cost-benefit analysis. Year-by-year schedules for priced
// lines, discounted to the base year; NPV, BCR, IRR and payback computed
// deterministically. The PIT layer is structural: unpriced effects live in the
// same table as the priced ones and can never be silently dropped.

import { escapeHtml } from './decisionTree.js';

const SHOCK = 0.2;

function expandSchedule(line, horizonYears) {
  const yearly = new Array(horizonYears + 1).fill(0);
  for (const p of Array.isArray(line.schedule) ? line.schedule : []) {
    const y = Number(p.year);
    if (Number.isInteger(y) && y >= 0 && y <= horizonYears && Number.isFinite(p.value)) {
      yearly[y] += p.value;
    }
  }
  return yearly;
}

function pvAt(rate, yearly) {
  return yearly.reduce((a, v, t) => a + v / Math.pow(1 + rate, t), 0);
}

// Deterministic IRR by bisection on the NPV function.
function irr(yearly) {
  const npv = (r) => pvAt(r, yearly);
  let lo = -0.95;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-9) return mid;
    if (npv(lo) * v <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function paybackYear(cumulative) {
  for (let t = 0; t < cumulative.length; t += 1) {
    if (cumulative[t] >= 0) return t;
  }
  return null;
}

export const cba = {
  id: 'cba',
  label: 'Cost-benefit analysis',
  question: 'Do the gains to the public justify the costs, and whose gains never got a price?',

  validate(input) {
    const errors = [];
    const warnings = [];
    const lines = Array.isArray(input && input.lines) ? input.lines : [];
    if (lines.length === 0) errors.push('The analysis has no line items.');
    const horizon = input && input.horizonYears;
    if (!Number.isInteger(horizon) || horizon < 1) errors.push('horizonYears must be a positive whole number of years.');
    const priced = lines.filter((l) => l.priced !== false);
    if (!priced.some((l) => l.kind === 'cost')) errors.push('At least one priced cost line is required.');
    if (!priced.some((l) => l.kind === 'benefit')) errors.push('At least one priced benefit line is required.');
    for (const l of lines) {
      if (!l.id || !l.label) errors.push('Every line needs an id and a label.');
      if (l.priced === false) {
        if (!l.effect) warnings.push(`Unpriced line "${l.label}" should describe its effect in physical units.`);
        if (!l.who) warnings.push(`Unpriced line "${l.label}" should name who is affected. The public interest check asks anyway.`);
        continue;
      }
      if (l.kind !== 'cost' && l.kind !== 'benefit') errors.push(`Line "${l.label}" must be kind "cost" or "benefit".`);
      const sched = Array.isArray(l.schedule) ? l.schedule : [];
      if (sched.length === 0) errors.push(`Priced line "${l.label}" has no schedule.`);
      for (const p of sched) {
        if (!Number.isInteger(Number(p.year)) || p.year < 0 || p.year > horizon) {
          errors.push(`Line "${l.label}" has a value in year ${p.year}, outside the 0 to ${horizon} horizon.`);
        }
        if (!Number.isFinite(p.value)) errors.push(`Line "${l.label}" has a non-numeric value in year ${p.year}.`);
      }
    }
    const unpriced = lines.filter((l) => l.priced === false);
    if (unpriced.length === 0) {
      warnings.push('No unpriced effects listed. If truly none exist, say so in the public interest check rather than leaving it blank.');
    }
    return { errors, warnings };
  },

  run(input, params) {
    const horizon = input.horizonYears;
    const rate = params.discountRate;
    const priced = input.lines.filter((l) => l.priced !== false);
    const pricedRows = priced.map((l) => {
      const yearly = expandSchedule(l, horizon);
      return {
        id: l.id,
        label: l.label,
        kind: l.kind,
        group: l.group || 'other',
        yearly,
        nominal: yearly.reduce((a, b) => a + b, 0),
        pv: pvAt(rate, yearly),
      };
    });

    const costYearly = new Array(horizon + 1).fill(0);
    const benefitYearly = new Array(horizon + 1).fill(0);
    for (const r of pricedRows) {
      const target = r.kind === 'cost' ? costYearly : benefitYearly;
      r.yearly.forEach((v, t) => {
        target[t] += v;
      });
    }
    const netYearly = costYearly.map((c, t) => benefitYearly[t] - c);

    const pvCost = pvAt(rate, costYearly);
    const pvBenefit = pvAt(rate, benefitYearly);
    const npv = pvBenefit - pvCost;
    const bcr = pvCost > 0 ? pvBenefit / pvCost : null;
    const irrValue = irr(netYearly);

    const cumNominal = [];
    const cumDiscounted = [];
    let a = 0;
    let b = 0;
    for (let t = 0; t <= horizon; t += 1) {
      a += netYearly[t];
      b += netYearly[t] / Math.pow(1 + rate, t);
      cumNominal.push(a);
      cumDiscounted.push(b);
    }

    const scenarios = [];
    for (const [label, r] of [
      ['Discount rate at the low end', params.sensitivityLo ?? rate - 0.02],
      ['Discount rate at the high end', params.sensitivityHi ?? rate + 0.02],
    ]) {
      const pcb = pvAt(r, benefitYearly);
      const pcc = pvAt(r, costYearly);
      scenarios.push({ label, npv: pcb - pcc, bcr: pcc > 0 ? pcb / pcc : null, rate: r });
    }
    for (const [label, cb, cc] of [
      ['Benefits 20% lower', 1 - SHOCK, 1],
      ['Benefits 20% higher', 1 + SHOCK, 1],
      ['Costs 20% higher', 1, 1 + SHOCK],
      ['Costs 20% lower', 1, 1 - SHOCK],
    ]) {
      const pcb = pvBenefit * cb;
      const pcc = pvCost * cc;
      scenarios.push({ label, npv: pcb - pcc, bcr: pcc > 0 ? pcb / pcc : null, rate });
    }

    return {
      horizonYears: horizon,
      discountRate: rate,
      lines: pricedRows.map((l) => ({
        id: l.id,
        label: l.label,
        kind: l.kind,
        group: l.group,
        nominal: l.nominal,
        pv: l.pv,
      })),
      pvCost,
      pvBenefit,
      npv,
      bcr,
      irr: irrValue,
      paybackYear: paybackYear(cumNominal),
      discountedPaybackYear: paybackYear(cumDiscounted),
      breakEvenDiscount: irrValue,
      scenarios,
      unpriced: input.lines
        .filter((l) => l.priced === false)
        .map((l) => ({ label: l.label, effect: l.effect || '', unit: l.unit || '', who: l.who || '' })),
    };
  },

  renderResults(r, params) {
    const fmt = (v, d = 0) => (v == null ? 'n/a' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }));
    const lineRows = r.lines
      .map(
        (l) => `<tr><th scope="row">${escapeHtml(l.label)}</th><td>${l.kind}</td><td class="data-num">${fmt(l.nominal)}</td><td class="data-num">${fmt(l.pv)}</td></tr>`,
      )
      .join('');
    const scenRows = r.scenarios
      .map(
        (s) => `<tr><th scope="row">${escapeHtml(s.label)}</th><td class="data-num">${fmt(s.npv)}</td><td class="data-num">${s.bcr == null ? 'n/a' : s.bcr.toFixed(2)}</td></tr>`,
      )
      .join('');
    const unpricedRows = r.unpriced
      .map(
        (u) => `<tr><th scope="row">${escapeHtml(u.label)}</th><td>${escapeHtml(u.effect)}</td><td>${escapeHtml(u.unit)}</td><td>${escapeHtml(u.who)}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">Net present value: <strong>₹${fmt(r.npv)}</strong> at a ${(r.discountRate * 100).toFixed(1)}% discount rate. Benefit-cost ratio <strong>${r.bcr == null ? 'n/a' : r.bcr.toFixed(2)}</strong>.</p>
      <h3>Line items, discounted to the base year</h3>
      <table class="result-table"><thead><tr><th>Line</th><th>Kind</th><th>Nominal (₹)</th><th>Present value (₹)</th></tr></thead><tbody>${lineRows}</tbody></table>
      <h3>Sensitivity</h3>
      <table class="result-table"><thead><tr><th>Scenario</th><th>NPV (₹)</th><th>BCR</th></tr></thead><tbody>${scenRows}</tbody></table>
      <p class="fine-print">Internal rate of return: ${r.irr == null ? 'no sign change in the flows, IRR undefined' : `${(r.irr * 100).toFixed(1)}%`}. Discounted payback: ${r.discountedPaybackYear == null ? `beyond the ${r.horizonYears}-year horizon` : `year ${r.discountedPaybackYear}`}. Break-even discount rate equals the IRR.</p>
      <h3>Unpriced ledger</h3>
      <p class="fine-print">Effects that resist monetisation are listed here in their own units. They are part of the decision, not a footnote to it.</p>
      ${unpricedRows ? `<table class="result-table"><thead><tr><th>Effect</th><th>Direction and size</th><th>Unit</th><th>Who</th></tr></thead><tbody>${unpricedRows}</tbody></table>` : '<p class="report-warning">No unpriced effects recorded. The public interest check must state why.</p>'}
      ${params && params.status ? `<p class="fine-print">Parameter verification status: ${escapeHtml(params.status)}.</p>` : ''}`;
  },
};

export const cbaSample = {
  title: 'Illustrative: household toilets in one block',
  baseYear: 2026,
  horizonYears: 10,
  lines: [
    {
      id: 'capex', label: 'Toilet construction assistance', kind: 'cost', priced: true, group: 'capital',
      schedule: [{ year: 0, value: 12000000 }],
    },
    {
      id: 'maint', label: 'Maintenance and water supply support', kind: 'cost', priced: true, group: 'recurring',
      schedule: [
        { year: 1, value: 800000 }, { year: 2, value: 800000 }, { year: 3, value: 900000 }, { year: 4, value: 900000 },
        { year: 5, value: 1000000 }, { year: 6, value: 1000000 }, { year: 7, value: 1100000 }, { year: 8, value: 1100000 },
        { year: 9, value: 1200000 }, { year: 10, value: 1200000 },
      ],
    },
    {
      id: 'health', label: 'Averted treatment costs (household out-of-pocket)', kind: 'benefit', priced: true, group: 'beneficiary',
      schedule: [
        { year: 1, value: 3000000 }, { year: 2, value: 3500000 }, { year: 3, value: 4000000 }, { year: 4, value: 4200000 },
        { year: 5, value: 4400000 }, { year: 6, value: 4600000 }, { year: 7, value: 4800000 }, { year: 8, value: 5000000 },
        { year: 9, value: 5200000 }, { year: 10, value: 5400000 },
      ],
    },
    {
      id: 'time', label: 'Time saved and safety for women and girls', priced: false,
      effect: 'Estimated in hours and in reduced night-time exposure, not in rupees', unit: 'hours per household per year', who: 'Women and girls in beneficiary households',
    },
    {
      id: 'workers', label: 'Hazardous cleaning work displaced', priced: false,
      effect: 'Reduction in manual cleaning tasks where mechanisation follows', unit: 'tasks avoided', who: 'Sanitation workers',
    },
  ],
};
