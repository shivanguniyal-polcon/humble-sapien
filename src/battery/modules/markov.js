// Battery module: cohort Markov (state-transition) model. A deterministic
// cohort trace over a fixed transition matrix, with per-cycle costs and
// utilities, discounting, and the half-cycle correction done openly (first
// and last cycles weighted 0.5) rather than in a footnote. The output is the
// trace itself, so a reader can check every cycle against the matrix.

import { escapeHtml } from './decisionTree.js';

export const markov = {
  id: 'markov',
  label: 'Markov cohort model',
  question: 'Where does the cohort end up, and what does the journey cost per year of life gained?',

  bindNote:
    'Parameters live in the structure: the transition matrix, per-cycle costs and utilities, the cycle length and the discount rate. The matrix is read row by row: from this state, the chance of each next state. Rows that do not add up to 1 are rejected, not repaired.',

  validate(input) {
    const errors = [];
    const warnings = [];
    const states = Array.isArray(input && input.states) ? input.states : [];
    const matrix = input && input.transitions;
    if (states.length < 2) errors.push('At least two states are required.');
    const sids = states.map((s) => s.id);
    if (new Set(sids).size !== sids.length) errors.push('State ids must be unique.');
    if (!Array.isArray(matrix) || matrix.length !== states.length) {
      errors.push(`The transition matrix must have one row per state (${states.length} rows).`);
    } else {
      matrix.forEach((row, i) => {
        if (!Array.isArray(row) || row.length !== states.length) {
          errors.push(`Transition row ${i + 1} must have ${states.length} entries.`);
          return;
        }
        const sum = row.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 1e-6) {
          errors.push(`Transition row ${i + 1} (${states[i] ? states[i].label : i}) adds up to ${sum.toFixed(4)}, not 1.`);
        }
        row.forEach((p) => {
          if (p < 0 || p > 1) errors.push(`Transition row ${i + 1} has a probability outside 0 to 1.`);
        });
      });
    }
    const initial = Array.isArray(input && input.initial) ? input.initial : [];
    if (initial.length !== states.length) {
      errors.push('The initial cohort must give one share per state.');
    } else {
      const sum = initial.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-6) errors.push(`The initial cohort adds up to ${sum.toFixed(4)}, not 1.`);
    }
    const cycles = input && input.cycles;
    if (!Number.isInteger(cycles) || cycles < 1) errors.push('cycles must be a positive whole number.');
    if (!Number.isFinite(input && input.cycleYears) || input.cycleYears <= 0) errors.push('cycleYears must be positive.');
    if (!Number.isFinite(input && input.discountRate) || input.discountRate < 0) errors.push('A non-negative discount rate is required.');
    for (const s of states) {
      if (!s.id || !s.label) errors.push('Every state needs an id and a label.');
      if (!Number.isFinite(s.costPerCycle)) errors.push(`State "${s.label || s.id}" needs a numeric costPerCycle (0 is fine).`);
      if (!Number.isFinite(s.utilityPerCycle)) errors.push(`State "${s.label || s.id}" needs a numeric utilityPerCycle (0 is fine).`);
    }
    if (!input || !input.pit || !input.pit.group) {
      warnings.push('No distributional column on the model. The public interest check asks: which patients or states does this cohort hide?');
    }
    if (states.some((s) => s.absorbing === true) === false) {
      warnings.push('No state is marked absorbing. Most clinical models have at least one (death or cure). Say so in the structure if none applies.');
    }
    return { errors, warnings };
  },

  run(input) {
    const { states, transitions, initial, cycles, cycleYears, discountRate } = input;
    const trace = [[...initial]];
    for (let c = 1; c <= cycles; c += 1) {
      const prev = trace[c - 1];
      const next = new Array(states.length).fill(0);
      for (let i = 0; i < states.length; i += 1) {
        for (let j = 0; j < states.length; j += 1) {
          next[j] += prev[i] * transitions[i][j];
        }
      }
      trace.push(next);
    }

    // Per-cycle aggregates. The half-cycle correction weights the first and
    // last cycle at 0.5: people enter states part way through a cycle.
    const hcc = input.halfCycleCorrection !== false;
    const cycleWeight = (c) => (hcc && (c === 0 || c === cycles) ? 0.5 : 1);
    let pvCost = 0;
    let qaly = 0;
    const perCycle = [];
    for (let c = 0; c <= cycles; c += 1) {
      const occ = trace[c];
      const cost = occ.reduce((a, share, i) => a + share * states[i].costPerCycle, 0);
      const utility = occ.reduce((a, share, i) => a + share * states[i].utilityPerCycle, 0);
      const disc = Math.pow(1 + discountRate, c * cycleYears);
      const w = cycleWeight(c);
      pvCost += (w * cost) / disc;
      qaly += (w * utility * cycleYears) / disc;
      perCycle.push({ cycle: c, year: Number((c * cycleYears).toFixed(4)), occupancy: occ.map((v) => Number(v.toFixed(6))), cost, utility });
    }

    return {
      cycles,
      cycleYears,
      discountRate,
      halfCycleCorrection: hcc,
      trace: perCycle,
      pvCost,
      qaly,
      costPerQaly: qaly > 0 ? pvCost / qaly : null,
      finalOccupancy: trace[cycles].map((v, i) => ({ state: states[i].id, label: states[i].label, share: v })),
      pit: input.pit || null,
    };
  },

  headline(r) {
    return `Discounted cost ₹${Math.round(r.pvCost).toLocaleString('en-IN')} for ${r.qaly.toFixed(2)} quality-adjusted life-years: ₹${r.costPerQaly == null ? 'n/a' : Math.round(r.costPerQaly).toLocaleString('en-IN')} per QALY.${r.pit && r.pit.group ? '' : ' The distributional column is missing.'}`;
  },

  renderResults(r) {
    const num = (v, d = 0) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
    const rows = r.trace
      .map(
        (t) => `<tr><th scope="row">${t.cycle}</th><td class="data-num">${t.year}</td>${t.occupancy.map((o) => `<td class="data-num">${(o * 100).toFixed(1)}%</td>`).join('')}<td class="data-num">₹${num(t.cost)}</td><td class="data-num">${t.utility.toFixed(3)}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">The cohort trace is printed in full: every cycle, every state share, discounted at ${(r.discountRate * 100).toFixed(1)}% per year with the half-cycle correction ${r.halfCycleCorrection ? 'on' : 'off'}.</p>
      <h3>Cohort trace</h3>
      <table class="result-table"><thead><tr><th>Cycle</th><th>Year</th><th>State shares</th><th>Cost this cycle</th><th>Utility this cycle</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Where the cohort ends</h3>
      <table class="result-table"><thead><tr><th>State</th><th>Share at cycle ${r.cycles}</th></tr></thead><tbody>${r.finalOccupancy.map((o) => `<tr><th scope="row">${escapeHtml(o.label)}</th><td class="data-num">${(o.share * 100).toFixed(2)}%</td></tr>`).join('')}</tbody></table>
      <h3>Totals</h3>
      <table class="result-table"><thead><tr><th>Measure</th><th>Value</th></tr></thead><tbody>
        <tr><th scope="row">Discounted cost</th><td class="data-num">₹${num(r.pvCost)}</td></tr>
        <tr><th scope="row">Discounted QALYs</th><td class="data-num">${r.qaly.toFixed(3)}</td></tr>
        <tr><th scope="row">Cost per QALY</th><td class="data-num">${r.costPerQaly == null ? 'n/a' : `₹${num(r.costPerQaly)}`}</td></tr>
      </tbody></table>
      ${r.pit && r.pit.group ? `<p class="fine-print">Distributional column: ${escapeHtml(r.pit.group)}: ${escapeHtml(r.pit.effect || '')}. ${escapeHtml(r.pit.note || '')}</p>` : '<p class="report-warning">No distributional column. The public interest check asks: which patients or states does this cohort hide?</p>'}`;
  },
};

export const markovSample = {
  title: 'Illustrative: chronic kidney disease cohort, three states',
  cycles: 10,
  cycleYears: 1,
  discountRate: 0.03,
  halfCycleCorrection: true,
  states: [
    { id: 'stable', label: 'Stable on treatment', costPerCycle: 18000, utilityPerCycle: 0.75 },
    { id: 'progressed', label: 'Progressed disease', costPerCycle: 65000, utilityPerCycle: 0.55 },
    { id: 'death', label: 'Death (absorbing)', costPerCycle: 0, utilityPerCycle: 0, absorbing: true },
  ],
  transitions: [
    [0.85, 0.1, 0.05],
    [0, 0.8, 0.2],
    [0, 0, 1],
  ],
  initial: [1, 0, 0],
  pit: {
    group: 'Patients progressing to dialysis in districts without a unit',
    effect: 'restricted',
    note: 'The progressed state concentrates in poorer districts: the trace counts people, but not who they are.',
  },
};
