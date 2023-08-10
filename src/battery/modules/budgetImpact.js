// Battery module: budget impact analysis. What a scheme costs the payer over
// one to five years, built from eligible population, uptake and per-patient
// cost, minus offsets that genuinely land on the same budget. The columns are
// gross, offset and net on purpose: "the scheme pays for itself" is a claim
// about the offset row, and that row is printed where a reader can argue
// with it.

import { escapeHtml } from './decisionTree.js';

export const budgetImpact = {
  id: 'budget-impact',
  label: 'Budget impact analysis',
  question: 'What does the payer actually disburse each year, and which budget head carries it?',

  bindNote:
    'Parameters live in the structure: eligible population, its growth, uptake and per-patient cost by year, and offset lines. Offsets count only money the same payer genuinely stops spending; everything else is somebody else saving, and belongs in the distributional column instead.',

  validate(input) {
    const errors = [];
    const warnings = [];
    const years = input && input.horizonYears;
    if (!Number.isInteger(years) || years < 1 || years > 5) {
      errors.push('horizonYears must be a whole number from 1 to 5. Budget impact is a short-horizon instrument.');
    }
    if (!Number.isFinite(input && input.eligiblePopulation) || input.eligiblePopulation <= 0) {
      errors.push('eligiblePopulation must be a positive number (persons).');
    }
    if (!Number.isFinite(input && input.populationGrowth)) errors.push('populationGrowth must be a number (0 is fine).');
    const uptake = Array.isArray(input && input.uptake) ? input.uptake : [];
    const perPatient = Array.isArray(input && input.perPatientCost) ? input.perPatientCost : [];
    const check = (arr, name) => {
      if (arr.length !== years) {
        errors.push(`${name} must have exactly ${years} yearly entries; it has ${arr.length}.`);
      }
      arr.forEach((v, i) => {
        if (!Number.isFinite(v)) errors.push(`${name} has a non-numeric value in year ${i + 1}.`);
      });
    };
    check(uptake, 'uptake');
    check(perPatient, 'perPatientCost');
    uptake.forEach((v, i) => {
      if (v < 0 || v > 1) errors.push(`uptake in year ${i + 1} is ${v}, outside 0 to 1.`);
    });
    const offsets = Array.isArray(input && input.offsets) ? input.offsets : [];
    for (const o of offsets) {
      if (!o.label) errors.push('Every offset needs a label.');
      const arr = Array.isArray(o.perPatient) ? o.perPatient : [];
      if (arr.length !== years) errors.push(`Offset "${o.label || 'unnamed'}" must have exactly ${years} yearly entries.`);
      arr.forEach((v, i) => {
        if (!Number.isFinite(v)) errors.push(`Offset "${o.label || 'unnamed'}" has a non-numeric value in year ${i + 1}.`);
        if (v < 0) warnings.push(`Offset "${o.label || 'unnamed'}" is negative in year ${i + 1}: that is a cost, not a saving.`);
      });
    }
    if (offsets.length === 0) {
      warnings.push('No offsets listed. If the scheme genuinely saves the payer nothing, say so in the public interest check rather than leaving the row empty.');
    }
    if (!input || !input.pit || !input.pit.group) {
      warnings.push('No distributional column. The public interest check asks: which budget head, which level of government, and who is displaced when it is funded?');
    }
    return { errors, warnings };
  },

  run(input) {
    const years = input.horizonYears;
    const rows = [];
    let totalNet = 0;
    for (let y = 0; y < years; y += 1) {
      const pop = input.eligiblePopulation * Math.pow(1 + input.populationGrowth, y);
      const treated = pop * input.uptake[y];
      const gross = treated * input.perPatientCost[y];
      const offsetPerPatient = input.offsets.reduce((a, o) => a + (o.perPatient[y] || 0), 0);
      const offsets = treated * offsetPerPatient;
      const net = gross - offsets;
      totalNet += net;
      rows.push({
        year: y + 1,
        eligiblePopulation: pop,
        treated,
        uptake: input.uptake[y],
        gross,
        offsets,
        net,
        perPatientNet: treated > 0 ? net / treated : null,
      });
    }
    return {
      horizonYears: years,
      rows,
      totalGross: rows.reduce((a, r) => a + r.gross, 0),
      totalOffsets: rows.reduce((a, r) => a + r.offsets, 0),
      totalNet,
      peakNet: rows.reduce((a, r) => (r.net > a.net ? r : a)),
      pit: input.pit || null,
    };
  },

  headline(r) {
    return `Total net budget impact over ${r.horizonYears} years: ₹${Math.round(r.totalNet).toLocaleString('en-IN')} crore-equivalent at the units given, peaking in year ${r.peakNet.year} at ₹${Math.round(r.peakNet.net).toLocaleString('en-IN')}.`;
  },

  renderResults(r) {
    const num = (v, d = 0) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
    const rows = r.rows
      .map(
        (y) => `<tr><th scope="row">Year ${y.year}</th>
          <td class="data-num">${num(y.eligiblePopulation)}</td>
          <td class="data-num">${(y.uptake * 100).toFixed(1)}%</td>
          <td class="data-num">${num(y.treated)}</td>
          <td class="data-num">₹${num(y.gross)}</td>
          <td class="data-num">₹${num(y.offsets)}</td>
          <td class="data-num">₹${num(y.net)}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">Gross, offset and net are printed as three columns so the self-financing claim can be checked against the offset row alone.</p>
      <h3>Year by year</h3>
      <table class="result-table"><thead><tr><th>Year</th><th>Eligible</th><th>Uptake</th><th>Treated</th><th>Gross cost</th><th>Offsets</th><th>Net impact</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Totals</h3>
      <table class="result-table"><thead><tr><th>Measure</th><th>Value</th></tr></thead><tbody>
        <tr><th scope="row">Gross over the horizon</th><td class="data-num">₹${num(r.totalGross)}</td></tr>
        <tr><th scope="row">Offsets over the horizon</th><td class="data-num">₹${num(r.totalOffsets)}</td></tr>
        <tr><th scope="row">Net budget impact</th><td class="data-num">₹${num(r.totalNet)}</td></tr>
      </tbody></table>
      ${r.pit && r.pit.group ? `<p class="fine-print">Distributional column: ${escapeHtml(r.pit.group)}: ${escapeHtml(r.pit.effect || '')}. ${escapeHtml(r.pit.note || '')}</p>` : '<p class="report-warning">No distributional column. Which budget head carries this, and who is displaced when it is funded?</p>'}`;
  },
};

export const budgetImpactSample = {
  title: 'Illustrative: five-year budget impact of district dialysis cover',
  horizonYears: 5,
  eligiblePopulation: 4200,
  populationGrowth: 0.01,
  uptake: [0.35, 0.55, 0.7, 0.8, 0.85],
  perPatientCost: [210000, 214200, 218484, 222854, 227311],
  offsets: [
    { label: 'Averted referral travel reimbursement', perPatient: [8000, 8200, 8400, 8600, 8800] },
    { label: 'Averted emergency admissions on the same budget', perPatient: [22000, 22600, 23200, 23800, 24400] },
  ],
  pit: {
    group: 'State health budget (NHM flexible pool) versus district RKS funds',
    effect: 'mixed',
    note: 'The recurring cost lands on the state pool while the offsets accrue partly to district funds: the payer that saves is not the payer that pays.',
  },
};
