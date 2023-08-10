// Battery module: multi-criteria decision analysis. Weighted scoring over
// alternatives and criteria, with three things most MCDA spreadsheets skip:
// a rank-sensitivity result with a closed-form flip point (how far one weight
// must move before the lead changes hands), a score-attribution table that
// sums contributions by the group each criterion measures (the PIT layer),
// and an explicit gap report for alternatives and criteria with no
// distributional column.

import { escapeHtml } from './decisionTree.js';

const TIE = 1e-9;

export const mcda = {
  id: 'mcda',
  label: 'Multi-criteria decision analysis',
  question: 'Whose weights decide the ranking, and how far can they move before it flips?',

  validate(input) {
    const errors = [];
    const warnings = [];
    const criteria = Array.isArray(input && input.criteria) ? input.criteria : [];
    const alternatives = Array.isArray(input && input.alternatives) ? input.alternatives : [];
    if (criteria.length < 2) errors.push('At least two criteria are required. One criterion is not a decision framework.');
    if (alternatives.length < 2) errors.push('At least two alternatives are required. A ranking needs something to rank.');
    if (input && input.method && input.method !== 'weighted-sum' && input.method !== 'minmax') {
      errors.push(`Unknown method "${input.method}". Use "weighted-sum" or "minmax".`);
    }

    const cids = criteria.map((c) => c.id);
    if (new Set(cids).size !== cids.length) errors.push('Criterion ids must be unique.');
    const aids = alternatives.map((a) => a.id);
    if (new Set(aids).size !== aids.length) errors.push('Alternative ids must be unique.');

    let weightSum = 0;
    for (const c of criteria) {
      if (!c.id || !c.label) errors.push('Every criterion needs an id and a label.');
      if (!Number.isFinite(c.weight)) {
        errors.push(`Criterion "${c.label || c.id}" needs a numeric weight.`);
      } else {
        weightSum += c.weight;
        if (c.weight < 0) errors.push(`Criterion "${c.label || c.id}" has a negative weight.`);
        if (c.weight === 0) warnings.push(`Criterion "${c.label || c.id}" has zero weight and cannot change any ranking.`);
      }
      if (c.direction !== 'benefit' && c.direction !== 'cost') {
        errors.push(`Criterion "${c.label || c.id}" must say whether it is a "benefit" (more is better) or a "cost" (less is better).`);
      }
      if (!c.who) {
        warnings.push(`Criterion "${c.label || c.id}" says whose standpoint it measures. Add "who" so the attribution table names the group.`);
      }
    }
    if (criteria.length > 0 && Math.abs(weightSum - 1) > 1e-6) {
      warnings.push(`Weights add up to ${weightSum.toFixed(4)}, not 1. They are normalised to sum to 1 in the run.`);
    }

    for (const a of alternatives) {
      if (!a.id || !a.label) errors.push('Every alternative needs an id and a label.');
      const scores = a.scores || {};
      for (const c of criteria) {
        const v = scores[c.id];
        if (!Number.isFinite(v)) {
          errors.push(`Alternative "${a.label || a.id}" has no numeric score for criterion "${c.label || c.id}".`);
        }
      }
      for (const k of Object.keys(scores)) {
        if (!cids.includes(k)) warnings.push(`Alternative "${a.label || a.id}" carries a score for unknown criterion "${k}", which is ignored.`);
      }
      if (!a.pit || !a.pit.group) {
        warnings.push(`Alternative "${a.label || a.id}" has no distributional column. The public interest check asks: who gains, who loses?`);
      }
    }
    return { errors, warnings };
  },

  run(input) {
    const method = input.method || 'weighted-sum';
    const criteria = input.criteria;
    const alternatives = input.alternatives;

    const weightSum = criteria.reduce((a, c) => a + c.weight, 0);
    const weights = criteria.map((c) => (weightSum > 0 ? c.weight / weightSum : 0));

    // Transformed scores: what each criterion contributes per unit of weight.
    // weighted-sum: raw score, negated for cost criteria.
    // minmax: scaled to 0..1 across the alternatives, inverted for cost
    // criteria so that higher is always better. A criterion with no variation
    // scores everyone 0.5 (neutral) and cannot change the ranking.
    const transformed = new Map();
    for (let j = 0; j < criteria.length; j += 1) {
      const c = criteria[j];
      const raw = alternatives.map((a) => a.scores[c.id]);
      const min = Math.min(...raw);
      const max = Math.max(...raw);
      const col = raw.map((s) => {
        if (method === 'minmax') {
          if (max - min < TIE) return 0.5;
          return c.direction === 'cost' ? (max - s) / (max - min) : (s - min) / (max - min);
        }
        return c.direction === 'cost' ? -s : s;
      });
      transformed.set(c.id, col);
    }

    const totals = alternatives.map((a, i) =>
      criteria.reduce((sum, c, j) => sum + weights[j] * transformed.get(c.id)[i], 0),
    );

    // Rank with explicit joint ranks for ties.
    const order = alternatives.map((a, i) => i).sort((x, y) => totals[y] - totals[x] || x - y);
    const ranks = new Array(alternatives.length);
    let currentRank = 0;
    order.forEach((idx, pos) => {
      if (pos > 0 && Math.abs(totals[idx] - totals[order[pos - 1]]) > TIE) currentRank = pos;
      ranks[idx] = currentRank + 1;
    });

    // Attribution: per-criterion weighted contributions, summed by the group
    // each criterion measures. This is the score's distributional reading.
    const groupNames = [...new Set(criteria.map((c) => c.group || 'ungrouped'))];
    const ranked = alternatives.map((a, i) => {
      const contributions = criteria.map((c, j) => ({
        criterion: c.id,
        label: c.label,
        group: c.group || 'ungrouped',
        who: c.who || '',
        contribution: weights[j] * transformed.get(c.id)[i],
      }));
      const byGroup = {};
      for (const g of groupNames) byGroup[g] = 0;
      for (const c of contributions) byGroup[c.group] += c.contribution;
      return {
        id: a.id,
        label: a.label,
        total: totals[i],
        rank: ranks[i],
        contributions,
        byGroup,
        pit: a.pit || null,
      };
    });

    // Rank sensitivity, closed form. For the leader against each challenger,
    // and each criterion k: move weight w_k to x and rescale the rest
    // proportionally. The score difference is linear in x, so the exact flip
    // point is solvable, not searched for.
    const leader = ranked[order[0]];
    const flips = [];
    if (criteria.length > 1) {
      for (let j = 0; j < criteria.length; j += 1) {
        const wk = weights[j];
        if (wk >= 1 - TIE) continue;
        const T = transformed.get(criteria[j].id);
        for (const challenger of ranked) {
          if (challenger.id === leader.id) continue;
          const iL = alternatives.findIndex((a) => a.id === leader.id);
          const iC = alternatives.findIndex((a) => a.id === challenger.id);
          const a = T[iL] - T[iC];
          const restL = leader.total - wk * T[iL];
          const restC = challenger.total - wk * T[iC];
          const b = (restL - restC) / (1 - wk);
          if (Math.abs(a - b) < TIE) continue; // parallel: no crossing
          const x = b / (b - a);
          if (x < -TIE || x > 1 + TIE) continue;
          flips.push({
            criterion: criteria[j].id,
            criterionLabel: criteria[j].label,
            challenger: challenger.id,
            challengerLabel: challenger.label,
            from: wk,
            to: Math.min(Math.max(x, 0), 1),
            distance: Math.abs(Math.min(Math.max(x, 0), 1) - wk),
          });
        }
      }
    }
    flips.sort((p, q) => p.distance - q.distance);
    const flip = flips.length > 0 ? flips[0] : null;

    // Weight-shock scenarios, deterministic set.
    const scenarios = [];
    {
      const equal = criteria.map(() => 1 / criteria.length);
      const eqTotals = alternatives.map((a, i) =>
        criteria.reduce((sum, c, j) => sum + equal[j] * transformed.get(c.id)[i], 0),
      );
      const eqLeader = alternatives[eqTotals.indexOf(Math.max(...eqTotals))];
      scenarios.push({
        label: 'All weights equal',
        newLeader: eqLeader.label,
        changed: eqLeader.id !== leader.id,
      });
    }
    {
      const iL = alternatives.findIndex((a) => a.id === leader.id);
      const shocked = totals.map((t, i) => (i === iL ? t * 0.9 : t));
      const winner = alternatives[shocked.indexOf(Math.max(...shocked))];
      scenarios.push({
        label: 'The leader scores 10% lower',
        newLeader: winner.label,
        changed: winner.id !== leader.id,
      });
    }
    {
      const runner = ranked[order[1]];
      const shocked = totals.map((t, i) => (alternatives[i].id === runner.id ? t * 1.1 : t));
      const winner = alternatives[shocked.indexOf(Math.max(...shocked))];
      scenarios.push({
        label: 'The runner-up scores 10% higher',
        newLeader: winner.label,
        changed: winner.id !== leader.id,
      });
    }

    return {
      method,
      weights: criteria.map((c, j) => ({ id: c.id, label: c.label, weight: weights[j], rawWeight: c.weight, direction: c.direction, group: c.group || 'ungrouped', who: c.who || '' })),
      alternatives: ranked,
      groupNames,
      leadMargin: ranked[order[0]].total - ranked[order[1]].total,
      flip,
      flipCandidates: flips.length,
      scenarios,
      gaps: {
        alternatives: ranked.filter((a) => !a.pit || !a.pit.group).map((a) => a.id),
        criteria: criteria.filter((c) => !c.who).map((c) => c.id),
      },
    };
  },

  renderResults(r) {
    const fmt = (v, d = 3) => (v == null ? 'n/a' : Number(v).toFixed(d));
    const top = [...r.alternatives].sort((a, b) => a.rank - b.rank || b.total - a.total)[0];
    const rows = [...r.alternatives]
      .sort((a, b) => a.rank - b.rank || b.total - a.total)
      .map(
        (a) => `<tr><th scope="row">${escapeHtml(a.label)}</th><td class="data-num">${a.rank}</td><td class="data-num">${fmt(a.total)}</td><td>${a.pit && a.pit.group ? `${escapeHtml(a.pit.group)}: ${escapeHtml(a.pit.effect || '')}` : '<strong>missing</strong>'}</td></tr>`,
      )
      .join('');

    const groupCells = (a) => r.groupNames.map((g) => `<td class="data-num">${fmt(a.byGroup[g])}</td>`).join('');
    const groupHead = r.groupNames.map((g) => `<th>${escapeHtml(g)}</th>`).join('');
    const attributionRows = [...r.alternatives]
      .sort((a, b) => a.rank - b.rank)
      .map((a) => `<tr><th scope="row">${escapeHtml(a.label)}</th>${groupCells(a)}</tr>`)
      .join('');

    const weightRows = r.weights
      .map(
        (w) => `<tr><th scope="row">${escapeHtml(w.label)}</th><td class="data-num">${(w.weight * 100).toFixed(1)}%</td><td>${w.direction}</td><td>${escapeHtml(w.group)}</td><td>${escapeHtml(w.who || 'not stated')}</td></tr>`,
      )
      .join('');

    const scenRows = r.scenarios
      .map(
        (s) => `<tr><th scope="row">${escapeHtml(s.label)}</th><td>${escapeHtml(s.newLeader)}</td><td>${s.changed ? 'yes, the lead changes' : 'no'}</td></tr>`,
      )
      .join('');

    const flipSentence = r.flip
      ? `The lead is fragile at exactly one point: moving the weight on <strong>${escapeHtml(r.flip.criterionLabel)}</strong> from ${(r.flip.from * 100).toFixed(1)}% to <strong>${(r.flip.to * 100).toFixed(1)}%</strong> (other weights rescaled proportionally) ties ${escapeHtml(r.flip.challengerLabel)} with the leader. That is a ${(r.flip.distance * 100).toFixed(1)} percentage-point move.`
      : 'No single weight change flips the lead. The ranking survives every one-weight move tested.';

    return `
      <p class="report-headline">Highest-ranked: <strong>${escapeHtml(top.label)}</strong> at ${fmt(top.total)}, leading by ${fmt(r.leadMargin)} over the runner-up on the ${r.method === 'minmax' ? 'min-max normalised' : 'weighted-sum'} score. ${flipSentence}</p>
      <h3>Ranking and who each choice lands on</h3>
      <table class="result-table"><thead><tr><th>Alternative</th><th>Rank</th><th>Score</th><th>Distributional column</th></tr></thead><tbody>${rows}</tbody></table>
      ${r.gaps.alternatives.length > 0 ? `<p class="report-warning">Distributional column missing for: ${r.gaps.alternatives.map(escapeHtml).join(', ')}. The public interest check is incomplete for these alternatives.</p>` : ''}
      <h3>Score attribution by group</h3>
      <p class="fine-print">Where each score comes from: weighted contributions summed over the group each criterion measures. A ranking driven by one group's criteria is a statement about that group, not about the whole public.</p>
      <table class="result-table"><thead><tr><th>Alternative</th>${groupHead}</tr></thead><tbody>${attributionRows}</tbody></table>
      <h3>Criteria, weights and standpoint</h3>
      <table class="result-table"><thead><tr><th>Criterion</th><th>Weight</th><th>Direction</th><th>Group</th><th>Whose standpoint</th></tr></thead><tbody>${weightRows}</tbody></table>
      ${r.gaps.criteria.length > 0 ? `<p class="report-warning">Standpoint not stated for: ${r.gaps.criteria.map(escapeHtml).join(', ')}.</p>` : ''}
      <h3>Rank sensitivity</h3>
      <table class="result-table"><thead><tr><th>Shock</th><th>Rank 1 becomes</th><th>Lead changes</th></tr></thead><tbody>${scenRows}</tbody></table>
      <p class="fine-print">Flip points are solved in closed form from the linear score difference, not searched numerically: the reported weight is exact for the scores given. ${r.flipCandidates} challenger-and-criterion pairs were tested.</p>`;
  },
};

export const mcdaSample = {
  title: 'Illustrative: delivery models for district dialysis cover',
  // min-max normalisation because the criteria live on different scales
  // (rupees per session next to 0 to 10 judgements). Weighted-sum is right
  // only when every score already shares one scale.
  method: 'minmax',
  criteria: [
    {
      id: 'cost', label: 'Cost per session to the exchequer', weight: 0.25,
      direction: 'cost', group: 'Fiscal', who: 'State health budget and future claimants',
    },
    {
      id: 'poorest', label: 'Coverage of the poorest eligibility quintile', weight: 0.3,
      direction: 'benefit', group: 'Households', who: 'Poorest eligible households',
    },
    {
      id: 'oop', label: 'Out-of-pocket spending averted', weight: 0.2,
      direction: 'benefit', group: 'Households', who: 'Families paying for care today',
    },
    {
      id: 'continuity', label: 'Continuity of care and follow-up', weight: 0.15,
      direction: 'benefit', group: 'Patients', who: 'Patients on long-term dialysis',
    },
    {
      id: 'speed', label: 'Speed of rollout with existing capacity', weight: 0.1,
      direction: 'benefit', group: 'Administration', who: 'District health teams',
    },
  ],
  alternatives: [
    {
      id: 'public', label: 'Expand public district hospital dialysis',
      scores: { cost: 1400, poorest: 8, oop: 7, continuity: 8, speed: 4 },
      pit: {
        group: 'Patients in districts without a nephrologist',
        effect: 'mixed',
        note: 'The best continuity where it exists, but rollout is slowest in the districts that need it most.',
      },
    },
    {
      id: 'empanelled', label: 'Empanel private providers at negotiated rates',
      scores: { cost: 2100, poorest: 7, oop: 6, continuity: 6, speed: 9 },
      pit: {
        group: 'Rural patients travelling to empanelled centres',
        effect: 'restricted',
        note: 'Fast coverage, but travel costs and lost wages fall on the household and are invisible in the claim rate.',
      },
    },
    {
      id: 'voucher', label: 'Patient-held vouchers with regulation',
      scores: { cost: 1800, poorest: 5, oop: 5, continuity: 5, speed: 7 },
      pit: {
        group: 'Patients able to navigate purchase',
        effect: 'mixed',
        note: 'Choice on paper; in practice the voucher favours households with documents, information and travel means.',
      },
    },
  ],
};
