// Battery module: stakeholder game analysis. A two-player normal-form game,
// solved exactly: pure-strategy Nash equilibria, Pareto-efficient outcomes,
// and each player's maximin (the best of their worst cases). No mixed-strategy
// algebra in v1, and the module says so rather than implying it checked
// everything. The PIT layer is structural: every outcome carries a
// distributional column, because a payoff matrix without one is a story about
// numbers instead of people.

import { escapeHtml } from './decisionTree.js';

export const gameTheory = {
  id: 'stakeholder-game',
  label: 'Stakeholder game analysis',
  question: 'When both parties act in their own interest, which outcome lands, and who pays for the equilibrium?',

  bindNote:
    'The parameters are the payoffs in the structure. Payoffs are ordinal at heart: what matters is which outcome each player prefers, so state them in a common unit you can defend (rupees lakh, families served, a 0 to 10 preference). Mixed strategies are not solved in this version.',

  validate(input) {
    const errors = [];
    const warnings = [];
    const players = Array.isArray(input && input.players) ? input.players : [];
    const outcomes = Array.isArray(input && input.outcomes) ? input.outcomes : [];
    if (players.length !== 2) errors.push('Exactly two players are supported in this version. A two-player framing is usually the honest one.');
    players.forEach((p, i) => {
      if (!p.id || !p.label) errors.push(`Player ${i + 1} needs an id and a label.`);
      if (!Array.isArray(p.strategies) || p.strategies.length < 2) {
        errors.push(`Player "${p.label || p.id}" needs at least two strategies.`);
      }
    });
    if (players.length === 2) {
      const [row, col] = players;
      const seen = new Set();
      for (const o of outcomes) {
        seen.add(`${o.row}:${o.col}`);
        if (o.row < 0 || o.row >= row.strategies.length || o.col < 0 || o.col >= col.strategies.length) {
          errors.push(`Outcome at (${o.row}, ${o.col}) points outside the strategy grid.`);
          continue;
        }
        if (!Array.isArray(o.payoffs) || o.payoffs.length !== 2 || !o.payoffs.every((v) => Number.isFinite(v))) {
          errors.push(`Outcome at (${o.row}, ${o.col}) needs two numeric payoffs.`);
        }
        if (!o.pit || !o.pit.group) {
          warnings.push(`Outcome (${o.row}, ${o.col}) has no distributional column. The public interest check asks: who lives with this outcome?`);
        }
      }
      for (let r = 0; r < row.strategies.length; r += 1) {
        for (let c = 0; c < col.strategies.length; c += 1) {
          if (!seen.has(`${r}:${c}`)) errors.push(`Outcome (${r}, ${c}) is missing from the grid.`);
        }
      }
    }
    return { errors, warnings };
  },

  run(input) {
    const [rowP, colP] = input.players;
    const grid = new Map(input.outcomes.map((o) => [`${o.row}:${o.col}`, o]));

    // Pure Nash: neither player can improve by switching alone.
    const equilibria = [];
    for (const o of input.outcomes) {
      const rowPayoff = o.payoffs[0];
      const colPayoff = o.payoffs[1];
      let rowBest = true;
      for (let r = 0; r < rowP.strategies.length; r += 1) {
        const alt = grid.get(`${r}:${o.col}`);
        if (alt && alt.payoffs[0] > rowPayoff) rowBest = false;
      }
      let colBest = true;
      for (let c = 0; c < colP.strategies.length; c += 1) {
        const alt = grid.get(`${o.row}:${c}`);
        if (alt && alt.payoffs[1] > colPayoff) colBest = false;
      }
      if (rowBest && colBest) equilibria.push(o);
    }

    // Pareto efficiency: no other outcome makes both players at least as well
    // off and one strictly better.
    const pareto = input.outcomes.filter((o) =>
      !input.outcomes.some(
        (p) =>
          !(p.row === o.row && p.col === o.col) &&
          p.payoffs[0] >= o.payoffs[0] &&
          p.payoffs[1] >= o.payoffs[1] &&
          (p.payoffs[0] > o.payoffs[0] || p.payoffs[1] > o.payoffs[1]),
      ),
    );

    // Maximin: each player's best guaranteed payoff.
    const maximin = [rowP, colP].map((p, playerIdx) => {
      let best = null;
      for (let s = 0; s < p.strategies.length; s += 1) {
        let worst = Infinity;
        const opponentCount = playerIdx === 0 ? colP.strategies.length : rowP.strategies.length;
        for (let t = 0; t < opponentCount; t += 1) {
          const key = playerIdx === 0 ? `${s}:${t}` : `${t}:${s}`;
          const o = grid.get(key);
          if (o) worst = Math.min(worst, o.payoffs[playerIdx]);
        }
        if (best === null || worst > best.worst) best = { strategy: p.strategies[s], index: s, worst };
      }
      return best;
    });

    return {
      players: input.players.map((p) => ({ id: p.id, label: p.label, strategies: p.strategies })),
      outcomes: input.outcomes.map((o) => ({
        row: o.row,
        col: o.col,
        rowStrategy: rowP.strategies[o.row],
        colStrategy: colP.strategies[o.col],
        payoffs: o.payoffs,
        isEquilibrium: equilibria.includes(o),
        isPareto: pareto.includes(o),
        pit: o.pit || null,
      })),
      equilibria: equilibria.map((o) => ({
        rowStrategy: rowP.strategies[o.row],
        colStrategy: colP.strategies[o.col],
        payoffs: o.payoffs,
      })),
      paretoIds: pareto.map((o) => `${o.row}:${o.col}`),
      maximin: maximin.map((m, i) => ({
        player: input.players[i].label,
        strategy: m.strategy,
        guaranteedPayoff: m.worst,
      })),
      gaps: input.outcomes.filter((o) => !o.pit || !o.pit.group).map((o) => `${o.row}:${o.col}`),
    };
  },

  headline(r) {
    if (r.equilibria.length === 0) {
      return 'No pure-strategy equilibrium exists: both parties keep switching. The disagreement outcome is what people actually live with, and mixed strategies are not solved in this version.';
    }
    const e = r.equilibria[0];
    return `The equilibrium is ${e.rowStrategy} against ${e.colStrategy}, paying (${e.payoffs.join(', ')}). What is stable is not automatically what is fair: check the distributional column before calling it a solution.`;
  },

  renderResults(r) {
    const rows = r.outcomes
      .map(
        (o) => `<tr><th scope="row">${escapeHtml(o.rowStrategy)} vs ${escapeHtml(o.colStrategy)}</th>
          <td class="data-num">${o.payoffs[0]}</td>
          <td class="data-num">${o.payoffs[1]}</td>
          <td>${o.isEquilibrium ? 'yes' : ''}</td>
          <td>${o.isPareto ? 'yes' : ''}</td>
          <td>${o.pit && o.pit.group ? `${escapeHtml(o.pit.group)}: ${escapeHtml(o.pit.effect || '')}` : '<strong>missing</strong>'}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">Equilibrium, Pareto efficiency and the distributional column are printed on the same row, because an outcome can be stable, efficient and brutal at once.</p>
      <h3>Outcomes</h3>
      <table class="result-table"><thead><tr><th>Outcome</th><th>${escapeHtml(r.players[0].label)}</th><th>${escapeHtml(r.players[1].label)}</th><th>Equilibrium</th><th>Pareto-efficient</th><th>Distributional column</th></tr></thead><tbody>${rows}</tbody></table>
      ${r.gaps.length > 0 ? `<p class="report-warning">Distributional column missing for outcomes: ${r.gaps.map(escapeHtml).join(', ')}.</p>` : ''}
      <h3>Each player's floor</h3>
      <table class="result-table"><thead><tr><th>Player</th><th>Maximin strategy</th><th>Guaranteed payoff</th></tr></thead><tbody>${r.maximin.map((m) => `<tr><th scope="row">${escapeHtml(m.player)}</th><td>${escapeHtml(m.strategy)}</td><td class="data-num">${m.guaranteedPayoff}</td></tr>`).join('')}</tbody></table>
      <p class="fine-print">Solved in pure strategies only. A game without a pure equilibrium may still have a mixed one; this module does not compute it and does not pretend to.</p>`;
  },
};

export const gameTheorySample = {
  title: 'Illustrative: district hospital and private provider negotiating dialysis sessions',
  players: [
    { id: 'hospital', label: 'District hospital', strategies: ['Hold rate', 'Raise rate'] },
    { id: 'provider', label: 'Private provider', strategies: ['Accept cap', 'Refuse cap'] },
  ],
  outcomes: [
    {
      row: 0, col: 0, payoffs: [6, 5],
      pit: { group: 'Patients on capped sessions', effect: 'benefits', note: 'Stable supply at the capped rate; waiting lists hold.' },
    },
    {
      row: 0, col: 1, payoffs: [2, 6],
      pit: { group: 'Patients needing private sessions', effect: 'restricted', note: 'Provider serves paying patients first; scheme patients queue.' },
    },
    {
      row: 1, col: 0, payoffs: [4, 3],
      pit: { group: 'State budget', effect: 'restricted', note: 'Higher rate paid on every session; no volume gain.' },
    },
    {
      row: 1, col: 1, payoffs: [1, 2],
      pit: { group: 'Patients and district health team', effect: 'restricted', note: 'Breakdown: sessions move out of the district entirely.' },
    },
  ],
};
