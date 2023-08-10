// Battery module: cost-effectiveness analysis. Incremental analysis with a
// full dominance ladder: strictly dominated options are removed, then
// extendedly dominated ones (an option whose incremental ratio is beaten by a
// more effective mix), leaving the ICER path a payer should actually walk.
// The decision rule is printed as net monetary benefit at the stated
// threshold, because a threshold that lives only in the analyst's head is a
// parameter without provenance.

import { escapeHtml } from './decisionTree.js';

function incrementalLadder(alternatives) {
  // Work on clones sorted by effect, cheapest first at equal effect. The
  // input objects are never mutated: the audit manifest hashes them as given.
  const byEffect = alternatives.map((a) => ({ ...a })).sort((a, b) => a.effect - b.effect || a.cost - b.cost);

  // Strict dominance: another option costs no more and does at least as much.
  const status = new Map();
  for (const a of byEffect) {
    for (const b of byEffect) {
      if (a.id === b.id) continue;
      if (b.cost <= a.cost && b.effect >= a.effect && (b.cost < a.cost || b.effect > a.effect)) {
        status.set(a.id, 'strictly dominated');
        break;
      }
    }
  }

  // Extended dominance: remove options whose ICER exceeds that of a more
  // effective option, repeating until the ICERs rise with effect.
  let frontier = byEffect.filter((a) => status.get(a.id) !== 'strictly dominated');
  for (;;) {
    const icers = [];
    for (let i = 1; i < frontier.length; i += 1) {
      icers.push((frontier[i].cost - frontier[i - 1].cost) / (frontier[i].effect - frontier[i - 1].effect));
    }
    let drop = -1;
    for (let i = 1; i < icers.length; i += 1) {
      if (icers[i] <= icers[i - 1]) {
        drop = i; // the earlier option is the odd one out on the path
        break;
      }
    }
    if (drop === -1) break;
    status.set(frontier[drop].id, 'extendedly dominated');
    frontier = frontier.filter((a, idx) => idx !== drop);
  }

  // Final ICER path.
  let previous = null;
  for (const a of frontier) {
    if (previous === null) {
      a.icer = null;
    } else {
      a.icer = (a.cost - previous.cost) / (a.effect - previous.effect);
    }
    previous = a;
    status.set(a.id, status.get(a.id) || (a.icer === null ? 'reference option' : 'on the ICER path'));
  }

  return { frontier, status };
}

export const cea = {
  id: 'cea',
  label: 'Cost-effectiveness analysis',
  question: 'Which option buys the most outcome per rupee, and what is the incremental price of the next best thing?',

  bindNote:
    'The parameters of this analysis live in the structure: the cost and effect of each option in present values, and the threshold at which an outcome is worth buying. State the threshold with its provenance: an unnamed threshold is an unnamed value judgement.',

  validate(input) {
    const errors = [];
    const warnings = [];
    const alts = Array.isArray(input && input.alternatives) ? input.alternatives : [];
    if (alts.length === 0) errors.push('The analysis has no alternatives.');
    if (alts.length === 1) warnings.push('One alternative cannot be compared. Add at least a do-nothing option.');
    if (!Number.isFinite(input && input.threshold) || input.threshold <= 0) {
      errors.push('A positive threshold (cost worth paying per unit of effect) is required.');
    }
    if (!input || !String(input.effectUnit || '').trim()) {
      warnings.push('No effectUnit named. Say what is being bought: life-years, DALYs averted, children immunised.');
    }
    const ids = alts.map((a) => a.id);
    if (new Set(ids).size !== ids.length) errors.push('Alternative ids must be unique.');
    for (const a of alts) {
      if (!a.id || !a.label) errors.push('Every alternative needs an id and a label.');
      if (!Number.isFinite(a.cost)) errors.push(`Alternative "${a.label || a.id}" needs a numeric cost in present values.`);
      if (!Number.isFinite(a.effect)) errors.push(`Alternative "${a.label || a.id}" needs a numeric effect.`);
      else if (a.effect <= 0) warnings.push(`Alternative "${a.label || a.id}" has zero or negative effect; its average ratio is undefined.`);
      if (!a.pit || !a.pit.group) {
        warnings.push(`Alternative "${a.label || a.id}" has no distributional column. The public interest check asks: whose health, at whose cost?`);
      }
    }
    return { errors, warnings };
  },

  run(input) {
    const { frontier, status } = incrementalLadder(input.alternatives);
    const rows = input.alternatives.map((a) => ({
      id: a.id,
      label: a.label,
      cost: a.cost,
      effect: a.effect,
      acer: a.effect > 0 ? a.cost / a.effect : null,
      status: status.get(a.id),
      icer: (() => {
        const f = frontier.find((x) => x.id === a.id);
        return f ? f.icer : null;
      })(),
      nmb: input.threshold * a.effect - a.cost,
      nhb: a.effect - a.cost / input.threshold,
      pit: a.pit || null,
    }));
    const best = rows.reduce((a, b) => (b.nmb > a.nmb ? b : a));
    return {
      threshold: input.threshold,
      effectUnit: input.effectUnit || 'units of effect',
      alternatives: rows,
      frontierIds: frontier.map((a) => a.id),
      best: best.id,
      bestNmb: best.nmb,
      gaps: rows.filter((r) => !r.pit || !r.pit.group).map((r) => r.id),
    };
  },

  headline(r) {
    const best = r.alternatives.find((a) => a.id === r.best);
    return `At a threshold of ₹${Math.round(r.threshold).toLocaleString('en-IN')} per ${r.effectUnit}, ${best.label} maximises net monetary benefit at ₹${Math.round(best.nmb).toLocaleString('en-IN')}.`;
  },

  renderResults(r) {
    const num = (v, d = 0) => (v == null ? 'n/a' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }));
    const rows = r.alternatives
      .map(
        (a) => `<tr><th scope="row">${escapeHtml(a.label)}</th>
          <td class="data-num">₹${num(a.cost)}</td>
          <td class="data-num">${num(a.effect, 2)}</td>
          <td class="data-num">${a.acer == null ? 'n/a' : `₹${num(a.acer)}`}</td>
          <td class="data-num">${a.icer == null ? 'reference' : `₹${num(a.icer)}`}</td>
          <td class="data-num">₹${num(a.nmb)}</td>
          <td>${escapeHtml(a.status)}</td>
          <td>${a.pit && a.pit.group ? `${escapeHtml(a.pit.group)}: ${escapeHtml(a.pit.effect || '')}` : '<strong>missing</strong>'}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">The incremental path prices the next unit of ${escapeHtml(r.effectUnit)} explicitly: options marked dominated are removed before any ratio is quoted, so the headline ratio is never an average in disguise.</p>
      <h3>Options, ratios and the incremental path</h3>
      <table class="result-table"><thead><tr><th>Option</th><th>Cost (₹)</th><th>Effect</th><th>Average ratio</th><th>Incremental ratio</th><th>Net benefit at threshold</th><th>Status</th><th>Distributional column</th></tr></thead><tbody>${rows}</tbody></table>
      ${r.gaps.length > 0 ? `<p class="report-warning">Distributional column missing for: ${r.gaps.map(escapeHtml).join(', ')}.</p>` : ''}
      <p class="fine-print">Threshold used: ₹${num(r.threshold)} per ${escapeHtml(r.effectUnit)}. Net health benefit of the chosen option: ${num(r.alternatives.find((a) => a.id === r.best).nhb, 2)} ${escapeHtml(r.effectUnit)}. If the threshold is contested, so is the ranking: re-run at the other threshold and publish both.</p>`;
  },
};

export const ceaSample = {
  title: 'Illustrative: four routes to district dialysis cover',
  effectUnit: 'dialysis-years delivered',
  // Set between the incremental ratios on the efficient path (175,000 and
  // 200,000 here), so the sample demonstrates a real choice rather than a
  // universal no. A different threshold changes the winner: that is the
  // point of printing it with its provenance.
  threshold: 180000,
  alternatives: [
    {
      id: 'status-quo', label: 'Status quo (referral to medical college)',
      cost: 1200000, effect: 10,
      pit: { group: 'Patients travelling to the referral centre', effect: 'restricted', note: 'Travel and lost wages sit on the poorest households and appear nowhere in the cost column.' },
    },
    {
      id: 'public-unit', label: 'In-house unit at the district hospital',
      cost: 3400000, effect: 22,
      pit: { group: 'Patients in the district, especially women who cannot travel', effect: 'benefits', note: 'Care comes to the district; the hiring burden lands on the state health budget.' },
    },
    {
      id: 'empanelled', label: 'Empanelled private sessions',
      cost: 4200000, effect: 26,
      pit: { group: 'Patients able to reach the empanelled centre', effect: 'mixed', note: 'Wider coverage, but per-session contracting shifts risk onto providers and continuity suffers.' },
    },
    {
      id: 'mobile', label: 'Mobile dialysis vans',
      cost: 2600000, effect: 18,
      pit: { group: 'Remote block populations', effect: 'benefits', note: 'Reaches blocks nothing else reaches; weather and road access decide who is actually served.' },
    },
  ],
};
