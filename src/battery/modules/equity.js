// Battery module: equity-weighted (distributional) cost-benefit analysis.
// The same schedules as the CBA, but disaggregated by population group, with
// explicit equity weights and a per-capita reading. The headline is two
// numbers on purpose: the plain NPV (which treats a rupee the same wherever
// it lands) and the equity-weighted NPV (which does not). Where they disagree,
// the disagreement IS the finding.

import { escapeHtml } from './decisionTree.js';

function pvAt(rate, yearly) {
  return yearly.reduce((a, v, t) => a + v / Math.pow(1 + rate, t), 0);
}

export const equity = {
  id: 'equity-cba',
  label: 'Distributional cost-benefit analysis',
  question: 'The project is worth it. For whom, and is it still worth it once a rupee to the worst-off counts for more?',

  bindNote:
    'Parameters live in the structure: the discount rate and the equity weights per group. A weight of 1 means the group counts like any other. Weights above 1 say how much more, in the open, where a reader can disagree with the number instead of discovering it later.',

  validate(input) {
    const errors = [];
    const warnings = [];
    const groups = Array.isArray(input && input.groups) ? input.groups : [];
    const lines = Array.isArray(input && input.lines) ? input.lines : [];
    if (groups.length < 2) errors.push('At least two groups are required. A distributional analysis with one group is an ordinary one.');
    if (lines.length === 0) errors.push('The analysis has no cost or benefit lines.');
    const horizon = input && input.horizonYears;
    if (!Number.isInteger(horizon) || horizon < 1) errors.push('horizonYears must be a positive whole number of years.');
    if (!Number.isFinite(input && input.discountRate) || input.discountRate < 0) errors.push('A non-negative discount rate is required.');

    const gids = groups.map((g) => g.id);
    if (new Set(gids).size !== gids.length) errors.push('Group ids must be unique.');
    let shareSum = 0;
    for (const g of groups) {
      if (!g.id || !g.label) errors.push('Every group needs an id and a label.');
      if (!Number.isFinite(g.populationShare) || g.populationShare <= 0) {
        errors.push(`Group "${g.label || g.id}" needs a positive populationShare (0 to 1).`);
      } else {
        shareSum += g.populationShare;
      }
      if (g.weight == null) {
        warnings.push(`Group "${g.label || g.id}" has no equity weight; it counts 1, like every other group.`);
      } else if (!Number.isFinite(g.weight) || g.weight <= 0) {
        errors.push(`Group "${g.label || g.id}" has an equity weight that is not a positive number.`);
      }
      if (!g.pit || !g.pit.group) {
        warnings.push(`Group "${g.label || g.id}" has no distributional column. Name who these people are.`);
      }
    }
    if (groups.length > 0 && Math.abs(shareSum - 1) > 1e-6) {
      warnings.push(`Population shares add up to ${shareSum.toFixed(4)}, not 1. Per-capita figures are scaled by the shares as given.`);
    }
    for (const l of lines) {
      if (!l.id || !l.label) errors.push('Every line needs an id and a label.');
      if (l.kind !== 'cost' && l.kind !== 'benefit') errors.push(`Line "${l.label || l.id}" must be kind "cost" or "benefit".`);
      if (!gids.includes(l.group)) errors.push(`Line "${l.label || l.id}" names group "${l.group}", which is not in the group list.`);
      const sched = Array.isArray(l.schedule) ? l.schedule : [];
      if (sched.length === 0) errors.push(`Line "${l.label || l.id}" has no schedule.`);
      for (const p of sched) {
        if (!Number.isInteger(Number(p.year)) || p.year < 0 || p.year > horizon) {
          errors.push(`Line "${l.label || l.id}" has a value in year ${p.year}, outside the 0 to ${horizon} horizon.`);
        }
        if (!Number.isFinite(p.value)) errors.push(`Line "${l.label || l.id}" has a non-numeric value in year ${p.year}.`);
      }
    }
    return { errors, warnings };
  },

  run(input) {
    const rate = input.discountRate;
    const horizon = input.horizonYears;
    const weights = new Map(input.groups.map((g) => [g.id, g.weight == null ? 1 : g.weight]));

    const groups = input.groups.map((g) => {
      const pvCost = pvAt(
        rate,
        input.lines
          .filter((l) => l.group === g.id && l.kind === 'cost')
          .reduce((acc, l) => {
            for (const p of l.schedule) acc[p.year] = (acc[p.year] || 0) + p.value;
            return acc;
          }, new Array(horizon + 1).fill(0)),
      );
      const pvBenefit = pvAt(
        rate,
        input.lines
          .filter((l) => l.group === g.id && l.kind === 'benefit')
          .reduce((acc, l) => {
            for (const p of l.schedule) acc[p.year] = (acc[p.year] || 0) + p.value;
            return acc;
          }, new Array(horizon + 1).fill(0)),
      );
      const npv = pvBenefit - pvCost;
      return {
        id: g.id,
        label: g.label,
        populationShare: g.populationShare,
        weight: weights.get(g.id),
        pvCost,
        pvBenefit,
        npv,
        perCapitaNpv: npv / g.populationShare,
        weightedNpv: weights.get(g.id) * npv,
        pit: g.pit || null,
      };
    });

    const totalNpv = groups.reduce((a, g) => a + g.npv, 0);
    const weightedNpv = groups.reduce((a, g) => a + g.weightedNpv, 0);
    const totalBenefits = groups.reduce((a, g) => a + g.pvBenefit, 0);

    return {
      horizonYears: horizon,
      discountRate: rate,
      groups: groups.map((g) => ({
        ...g,
        benefitShare: totalBenefits > 0 ? g.pvBenefit / totalBenefits : 0,
      })),
      totalNpv,
      weightedNpv,
      agreement: Math.sign(totalNpv) === Math.sign(weightedNpv) ? 'agree' : 'disagree',
      gaps: groups.filter((g) => !g.pit || !g.pit.group).map((g) => g.id),
    };
  },

  headline(r) {
    const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;
    return `Plain net present value ${fmt(r.totalNpv)}; equity-weighted ${fmt(r.weightedNpv)}. The two readings ${r.agreement}${r.agreement === 'disagree' ? ', and that disagreement is the finding' : ''}.`;
  },

  renderResults(r) {
    const num = (v, d = 0) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
    const rows = r.groups
      .map(
        (g) => `<tr><th scope="row">${escapeHtml(g.label)}</th>
          <td class="data-num">${(g.populationShare * 100).toFixed(1)}%</td>
          <td class="data-num">${num(g.weight, 2)}</td>
          <td class="data-num">₹${num(g.pvBenefit)}</td>
          <td class="data-num">₹${num(g.pvCost)}</td>
          <td class="data-num">₹${num(g.npv)}</td>
          <td class="data-num">₹${num(g.perCapitaNpv)}</td>
          <td class="data-num">${(g.benefitShare * 100).toFixed(1)}%</td>
          <td>${g.pit && g.pit.group ? `${escapeHtml(g.pit.group)}: ${escapeHtml(g.pit.effect || '')}` : '<strong>missing</strong>'}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">Per-capita columns divide by population share, so a small group's real gain is never hidden inside a large group's total. The weighted column states the equity judgement in numbers, not adjectives.</p>
      <h3>Who gets what, in rupees and per person</h3>
      <table class="result-table"><thead><tr><th>Group</th><th>Population share</th><th>Equity weight</th><th>Benefits (PV)</th><th>Costs (PV)</th><th>Net (PV)</th><th>Net per person</th><th>Share of benefits</th><th>Distributional column</th></tr></thead><tbody>${rows}</tbody></table>
      ${r.gaps.length > 0 ? `<p class="report-warning">Distributional column missing for: ${r.gaps.map(escapeHtml).join(', ')}.</p>` : ''}
      <h3>Two totals, printed side by side</h3>
      <table class="result-table"><thead><tr><th>Reading</th><th>Net present value (₹)</th></tr></thead><tbody>
        <tr><th scope="row">Plain (every rupee counts equally)</th><td class="data-num">₹${num(r.totalNpv)}</td></tr>
        <tr><th scope="row">Equity-weighted (weights as stated above)</th><td class="data-num">₹${num(r.weightedNpv)}</td></tr>
      </tbody></table>
      <p class="fine-print">The plain and weighted readings ${r.agreement === 'agree' ? 'agree in sign' : '<strong>disagree in sign</strong>: the project is worth it to one reading and not the other'}. Publish both numbers, and the weights beside them.</p>`;
  },
};

export const equitySample = {
  title: 'Illustrative: piped water scheme, benefits and burdens by group',
  horizonYears: 5,
  discountRate: 0.05,
  groups: [
    {
      id: 'sc-hh', label: 'Scheduled caste households in the command area',
      populationShare: 0.25, weight: 2,
      pit: { group: 'SC households', effect: 'benefits', note: 'Longest collection walks today, so the largest time saving; the weight reflects that priority.' },
    },
    {
      id: 'other-hh', label: 'Other households in the command area',
      populationShare: 0.55, weight: 1,
      pit: { group: 'Other households', effect: 'benefits', note: 'Gains reliability and water quality; pays the same tariff.' },
    },
    {
      id: 'downstream', label: 'Downstream users losing informal access',
      populationShare: 0.2, weight: 2,
      pit: { group: 'Downstream users', effect: 'restricted', note: 'Lost informal access to the source; compensation is not in the scheme design.' },
    },
  ],
  lines: [
    {
      id: 'capex', label: 'Scheme capital cost borne by households (tariff and contributions)', kind: 'cost', group: 'sc-hh',
      schedule: [{ year: 0, value: 900000 }, { year: 1, value: 300000 }],
    },
    {
      id: 'capex2', label: 'Scheme capital cost borne by households (tariff and contributions)', kind: 'cost', group: 'other-hh',
      schedule: [{ year: 0, value: 2200000 }, { year: 1, value: 700000 }],
    },
    {
      id: 'capex3', label: 'Lost access costs (extra distance, purchases)', kind: 'cost', group: 'downstream',
      schedule: [{ year: 0, value: 200000 }, { year: 1, value: 250000 }, { year: 2, value: 250000 }, { year: 3, value: 250000 }, { year: 4, value: 250000 }, { year: 5, value: 250000 }],
    },
    {
      id: 'time', label: 'Time saved and health gains (valued)', kind: 'benefit', group: 'sc-hh',
      schedule: [{ year: 1, value: 800000 }, { year: 2, value: 900000 }, { year: 3, value: 950000 }, { year: 4, value: 1000000 }, { year: 5, value: 1050000 }],
    },
    {
      id: 'time2', label: 'Time saved and health gains (valued)', kind: 'benefit', group: 'other-hh',
      schedule: [{ year: 1, value: 1800000 }, { year: 2, value: 1900000 }, { year: 3, value: 2000000 }, { year: 4, value: 2100000 }, { year: 5, value: 2200000 }],
    },
  ],
};
