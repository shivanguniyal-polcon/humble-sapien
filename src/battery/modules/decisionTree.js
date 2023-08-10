// Battery module: decision tree. Fold-back over chance and decision nodes to
// an expected value per node, with the optimal branch chosen at each decision.
// The PIT layer is structural: terminal nodes carry a distributional column
// (who lands in this branch, and in which direction), and leaves without one
// are reported as gaps.

export const decisionTree = {
  id: 'decision-tree',
  label: 'Decision tree',
  question: 'Which branch of a choice serves the most people, once chance is priced honestly?',
  bindRowLabel: 'Probabilities and payoffs',

  validate(input) {
    const errors = [];
    const warnings = [];
    const nodes = Array.isArray(input && input.nodes) ? input.nodes : [];
    if (nodes.length === 0) errors.push('The tree has no nodes.');
    const byId = new Map(nodes.map((n) => [n.id, n]));
    if (input && input.root && !byId.has(input.root)) errors.push(`Root "${input.root}" is not in the node list.`);
    if (new Set(nodes.map((n) => n.id)).size !== nodes.length) errors.push('Node ids must be unique.');

    for (const n of nodes) {
      const kids = Array.isArray(n.children) ? n.children : [];
      if (n.type === 'terminal') {
        if (kids.length > 0) errors.push(`Terminal node "${n.id}" cannot have children.`);
        if (typeof n.payoff !== 'number' || !Number.isFinite(n.payoff)) {
          errors.push(`Terminal node "${n.id}" needs a numeric payoff in rupees.`);
        }
        if (!n.pit || !n.pit.group) {
          warnings.push(`Leaf "${n.id}" has no distributional column. The public interest check asks: who lands here?`);
        }
      } else if (n.type === 'chance') {
        if (kids.length === 0) errors.push(`Chance node "${n.id}" needs children.`);
        const probs = Array.isArray(n.probs) ? n.probs : [];
        if (probs.length !== kids.length) {
          errors.push(`Chance node "${n.id}" has ${kids.length} children but ${probs.length} probabilities.`);
        } else {
          const sum = probs.reduce((a, b) => a + b, 0);
          if (Math.abs(sum - 1) > 1e-6) {
            errors.push(`Probabilities at "${n.id}" add up to ${sum.toFixed(4)}, not 1.`);
          }
          probs.forEach((p) => {
            if (p < 0 || p > 1) errors.push(`Probability ${p} at "${n.id}" is outside 0 to 1.`);
          });
        }
      } else if (n.type === 'decision') {
        if (kids.length < 2) warnings.push(`Decision node "${n.id}" offers only ${kids.length} branch. A decision needs a real alternative.`);
      } else {
        errors.push(`Node "${n.id}" has unknown type "${n.type}".`);
      }
      for (const k of kids) {
        if (!byId.has(k)) errors.push(`Node "${n.id}" points at missing node "${k}".`);
      }
    }

    // cycle detection from the root
    const root = input && input.root;
    if (root && byId.has(root)) {
      const stack = new Set();
      const walk = (id) => {
        if (stack.has(id)) {
          errors.push(`The tree contains a cycle through "${id}".`);
          return;
        }
        stack.add(id);
        for (const k of (byId.get(id).children || [])) if (byId.has(k)) walk(k);
        stack.delete(id);
      };
      walk(root);
    }
    return { errors, warnings };
  },

  run(input) {
    const byId = new Map(input.nodes.map((n) => [n.id, n]));
    const memo = new Map();
    const compute = (id) => {
      if (memo.has(id)) return memo.get(id);
      const n = byId.get(id);
      let out;
      if (n.type === 'terminal') {
        out = { ev: n.payoff, leaf: id, path: [id] };
      } else {
        const kids = (n.children || []).map(compute);
        if (n.type === 'chance') {
          const ev = kids.reduce((a, k, i) => a + k.ev * n.probs[i], 0);
          out = { ev, path: [id, ...kids[0].path] };
        } else {
          let best = kids[0];
          let bestIdx = 0;
          kids.forEach((k, i) => {
            if (k.ev > best.ev) {
              best = k;
              bestIdx = i;
            }
          });
          out = { ev: best.ev, leaf: best.leaf, path: [id, ...best.path], choice: bestIdx, choiceLabel: n.children[bestIdx] };
        }
      }
      memo.set(id, out);
      return out;
    };
    const rootResult = compute(input.root);

    const nodes = input.nodes.map((n) => {
      const c = memo.get(n.id);
      return {
        id: n.id,
        type: n.type,
        label: n.label,
        ev: c ? c.ev : null,
        payoff: n.type === 'terminal' ? n.payoff : null,
        choice: c && c.choice != null ? { index: c.choice, node: c.choiceLabel } : null,
      };
    });

    const leaves = input.nodes
      .filter((n) => n.type === 'terminal')
      .map((n) => ({
        id: n.id,
        label: n.label,
        payoff: n.payoff,
        ev: memo.get(n.id) ? memo.get(n.id).ev : null,
        onOptimalPath: rootResult.path.includes(n.id),
        pit: n.pit || null,
      }));

    return {
      rootEV: rootResult.ev,
      optimalPath: rootResult.path,
      nodes,
      leaves,
      leavesWithoutDistribution: leaves.filter((l) => !l.pit || !l.pit.group).map((l) => l.id),
    };
  },

  renderResults(r) {
    const rows = r.nodes
      .map(
        (n) => `<tr><th scope="row">${escapeHtml(n.label || n.id)}</th><td>${n.type}</td><td class="data-num">${n.ev == null ? 'n/a' : Math.round(n.ev).toLocaleString('en-IN')}</td><td>${n.choice ? `branch to ${escapeHtml(n.choice.node)}` : ''}</td></tr>`,
      )
      .join('');
    const leaves = r.leaves
      .map(
        (l) => `<tr><th scope="row">${escapeHtml(l.label || l.id)}</th><td class="data-num">${Math.round(l.payoff).toLocaleString('en-IN')}</td><td>${l.onOptimalPath ? 'yes' : 'no'}</td><td>${l.pit && l.pit.group ? `${escapeHtml(l.pit.group)}: ${escapeHtml(l.pit.effect || '')}` : '<strong>missing</strong>'}</td></tr>`,
      )
      .join('');
    return `
      <p class="report-headline">Expected value at the root: <strong>₹${Math.round(r.rootEV).toLocaleString('en-IN')}</strong></p>
      <h3>Node values</h3>
      <table class="result-table"><thead><tr><th>Node</th><th>Type</th><th>Expected value (₹)</th><th>Optimal branch</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Leaves and who lands there</h3>
      <table class="result-table"><thead><tr><th>Leaf</th><th>Payoff (₹)</th><th>On optimal path</th><th>Distributional column</th></tr></thead><tbody>${leaves}</tbody></table>
      ${r.leavesWithoutDistribution.length > 0 ? `<p class="report-warning">Distributional column missing for: ${r.leavesWithoutDistribution.map(escapeHtml).join(', ')}. The public interest check is incomplete for these outcomes.</p>` : ''}`;
  },
};

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const decisionTreeSample = {
  title: 'Illustrative: empanel a new district hospital under a public scheme',
  root: 'd1',
  nodes: [
    {
      id: 'd1', type: 'decision', label: 'Empanelment decision',
      children: ['c1', 'c2'], probs: [],
    },
    {
      id: 'c1', type: 'chance', label: 'Empanel under the scheme',
      children: ['t1', 't2'], probs: [0.6, 0.4],
    },
    {
      id: 'c2', type: 'chance', label: 'Do not empanel',
      children: ['t3', 't4'], probs: [0.5, 0.5],
    },
    {
      id: 't1', type: 'terminal', label: 'High take-up, public financing arrives',
      payoff: 4500000,
      pit: { group: 'Eligible households in the district', effect: 'benefits', note: 'Cashless care reaches families that previously paid out of pocket.' },
    },
    {
      id: 't2', type: 'terminal', label: 'Low take-up, claim delays',
      payoff: -1200000,
      pit: { group: 'Hospital balance sheet and staff hours', effect: 'restricted', note: 'Delayed settlement eats working capital; patients still gain cover.' },
    },
    {
      id: 't3', type: 'terminal', label: 'Steady private demand',
      payoff: 800000,
      pit: { group: 'Paying patients', effect: 'mixed', note: 'Capacity stays available, but the near-poor are still excluded.' },
    },
    {
      id: 't4', type: 'terminal', label: 'Occupancy falls',
      payoff: -600000,
      pit: { group: 'Hospital staff on contract', effect: 'restricted', note: 'Contract hours are cut first.' },
    },
  ],
};
