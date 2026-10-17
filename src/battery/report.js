// Battery stage 3: the standard report. Two artefacts from one run: a
// print-ready standalone HTML document and a machine-readable JSON that
// carries the audit manifest. The public interest check is a gate, not a
// suggestion: a report cannot be built until all three PIT questions are
// answered, and the answers print in the artefact.

import { buildManifest } from './manifest.js';
import { VERIFICATION_LABELS, formatINRCompact } from './params.js';
import { escapeHtml } from './modules/decisionTree.js';

export const PIT_QUESTIONS = [
  { key: 'whoBenefits', label: 'Who benefits?' },
  { key: 'whoPays', label: 'Who pays?' },
  { key: 'whoMissing', label: 'Who is missing from the data?' },
];

export function checkPit(pit) {
  const missing = PIT_QUESTIONS.filter((q) => !pit || !String(q.key && pit[q.key] || '').trim()).map((q) => q.label);
  return { complete: missing.length === 0, missing };
}

// Distributional coverage of a run: how many of its outputs name who they hit.
// Walks the result tree for arrays whose items carry a `pit` or `who` column
// (leaves, alternatives, groups, scenarios, outcomes, ledger lines) and counts
// which are named. Module-level `pit` counts as one output for the run itself.
// The gap arrays modules already publish are honoured alongside, so a module
// that reports its own gaps is never second-guessed.
export function distributionalReceipt(results) {
  const units = [];
  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 3) return;
    if (Array.isArray(node)) {
      const items = node.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
      const pitItems = items.filter((x) => 'pit' in x);
      if (pitItems.length > 0) {
        for (const it of pitItems) {
          units.push({ id: String(it.id != null ? it.id : it.label != null ? it.label : '?'), named: !!(it.pit && it.pit.group) });
        }
        return;
      }
      const whoItems = items.filter((x) => 'who' in x);
      if (whoItems.length > 0) {
        for (const it of whoItems) {
          units.push({ id: String(it.id != null ? it.id : it.label != null ? it.label : '?'), named: !!(it.who && String(it.who).trim()) });
        }
        return;
      }
      for (const it of items) visit(it, depth + 1);
      return;
    }
    for (const v of Object.values(node)) visit(v, depth + 1);
  };
  if (results && typeof results === 'object' && 'pit' in results) {
    units.push({ id: 'the run', named: !!(results.pit && results.pit.group) });
  }
  visit(results, 0);

  const gapIds = [];
  if (results && typeof results === 'object') {
    if (Array.isArray(results.leavesWithoutDistribution)) gapIds.push(...results.leavesWithoutDistribution.map(String));
    if (Array.isArray(results.gaps)) gapIds.push(...results.gaps.map(String));
    else if (results.gaps && typeof results.gaps === 'object') gapIds.push(...Object.values(results.gaps).flat().map(String));
  }
  const unnamed = units.filter((u) => !u.named).map((u) => u.id);
  return {
    total: units.length > 0 ? units.length : null,
    covered: units.filter((u) => u.named).length,
    missing: [...new Set([...gapIds, ...unnamed])],
  };
}

export function formatDistributional(d) {
  if (!d) return '';
  if (d.total == null) {
    return d.missing.length > 0
      ? `${d.missing.length} output(s) flagged as missing a distributional column: ${d.missing.slice(0, 6).join(', ')}${d.missing.length > 6 ? ', …' : ''}.`
      : 'No output in this run carries a distributional column.';
  }
  if (d.total === 0) return 'No output in this run carries a distributional column.';
  const head = `${d.covered} of ${d.total} outputs name who they hit`;
  return d.missing.length > 0
    ? `${head}. Missing: ${d.missing.slice(0, 6).join(', ')}${d.missing.length > 6 ? ', …' : ''}.`
    : `${head}.`;
}

export async function buildReport({ module, input, params, results, pit, source, validation, resultsHtml, coverage }) {
  const check = checkPit(pit);
  if (!check.complete) {
    throw new Error(`Public interest check incomplete. Answer: ${check.missing.join('; ')}.`);
  }
  const manifest = await buildManifest({ module: module.id, input, params, results });
  // The module renders its own results. A caller may override the HTML, but a
  // report never prints an empty or undefined results section.
  const resultsBody = resultsHtml || module.renderResults(results, params);

  const paramRows = Object.entries(params.values || {})
    .map(([k, v]) => {
      const meta = (params.meta && params.meta[k]) || {};
      const status = meta.status || 'custom';
      return `<tr><th scope="row">${escapeHtml(meta.label || k)}</th><td class="data-num">${escapeHtml(String(v))}</td><td>${escapeHtml(meta.provenance || '')}</td><td>${escapeHtml(VERIFICATION_LABELS[status] || status)}</td></tr>`;
    })
    .join('');

  const validationSummary = validation
    ? `<p>${validation.rowsParsed} rows parsed. ${validation.errors.length} errors, ${validation.warnings.length} warnings.</p>
       ${validation.warnings.length ? `<ul class="report-warnings">${validation.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}`
    : '<p>Structured input; no ingestion validation was required.</p>';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title || 'Battery report')} (THS Policy Battery)</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b1815; background: #fff; margin: 0; padding: 2.5rem 1.5rem; line-height: 1.55; }
  main { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 1.9rem; line-height: 1.15; margin: 0.25rem 0 0.5rem; }
  h2 { font-size: 1.25rem; margin-top: 2.25rem; border-bottom: 1.5px solid #e0ddd8; padding-bottom: 0.35rem; }
  h3 { font-size: 1.05rem; margin-top: 1.5rem; }
  .kicker { font-family: 'Courier New', monospace; font-size: 0.72rem; letter-spacing: 0.02em; color: #7a1f2b; }
  .fine-print { font-size: 0.85rem; color: #4b4640; }
  .report-headline { font-size: 1.15rem; background: #fff; border: 1px solid #eceae6; border-left: 3px solid #7a1f2b; padding: 0.9rem 1.1rem; }
  .report-warning { color: #7a1f2b; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-block: 0.75rem; }
  th, td { text-align: left; padding: 0.45rem 0.6rem 0.45rem 0; border-bottom: 1px solid #eceae6; vertical-align: top; }
  thead th { font-family: 'Courier New', monospace; font-size: 0.68rem; letter-spacing: 0.02em; color: #4b4640; border-bottom: 1.5px solid #c7c2bb; }
  .data-num { font-variant-numeric: tabular-nums; }
  .pit-block { background: #fff; border: 1px solid #eceae6; border-top: 3px solid #7a1f2b; padding: 1rem 1.25rem; }
  .stamp { font-family: 'Courier New', monospace; font-size: 0.72rem; word-break: break-all; color: #4b4640; }
  ul.report-warnings { font-size: 0.85rem; color: #4b4640; }
  @media print {
    body { background: #fff; padding: 0; }
    h2 { break-after: avoid; }
    table, .pit-block, .report-headline { break-inside: avoid; }
    .kicker { color: #000; }
  }
</style>
</head>
<body>
<main>
  <p class="kicker">THS Policy Battery · ${escapeHtml(module.label)} · ${escapeHtml(manifest.engine)}</p>
  <h1>${escapeHtml(input.title || 'Policy analysis run')}</h1>
  <p class="fine-print">Run ${escapeHtml(manifest.createdAt)}. All figures in rupees unless stated. This report is reproducible: the audit manifest at the end re-derives every number from the inputs and parameters printed here.</p>

  <h2>The question</h2>
  <p>${escapeHtml(module.question)}</p>

  <h2>Data receipt</h2>
  ${validationSummary}
  ${source ? `<p class="fine-print">Source: ${escapeHtml(source)}</p>` : ''}
  ${Array.isArray(coverage) && coverage.length > 0 ? `<h3>Who is missing from the data (computed)</h3><ul class="fine-print">${coverage.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : '<p class="fine-print">No computed coverage receipt was available for this run. The public interest check below answers by hand.</p>'}

  <h2>Parameters</h2>
  <table><thead><tr><th>Parameter</th><th>Value</th><th>Provenance</th><th>Verification</th></tr></thead><tbody>${paramRows || '<tr><td colspan="4">No parameters bound.</td></tr>'}</tbody></table>

  <h2>Results</h2>
  ${resultsBody}

  <h2>Public interest check</h2>
  <div class="pit-block">
    ${PIT_QUESTIONS.map((q) => {
      const answer = String((pit && pit[q.key]) || '').trim();
      return `<p><strong>${q.label}</strong> ${answer ? escapeHtml(answer) : '<em>[not answered]</em>'}</p>`;
    }).join('')}
    <p><strong>Distributional columns</strong> ${escapeHtml(formatDistributional(distributionalReceipt(results)))}</p>
  </div>

  <h2>Limitations</h2>
  <ul>
    <li>Estimates are only as good as the inputs and the parameter provenance printed above.</li>
    <li>Sensitivity runs test the parameters moved here, not the structure of the model.</li>
    <li>This report is an input to a public decision, not a substitute for consultation with the people it describes.</li>
  </ul>

  <h2>Audit manifest</h2>
  <p class="stamp">engine ${escapeHtml(manifest.engine)} · module ${escapeHtml(manifest.module)}<br>input ${escapeHtml(manifest.inputHash)}<br>params ${escapeHtml(manifest.paramHash)}<br>output ${escapeHtml(manifest.outputHash)}</p>
  <p class="fine-print">Re-run the same input and parameters through the same engine version and these three hashes match exactly.${results.npv != null || results.rootEV != null ? ` Total value reference: ${escapeHtml(formatINRCompact(results.npv != null ? results.npv : results.rootEV))}.` : ''}</p>
</main>
</body>
</html>`;

  const json = {
    schemaVersion: 'ths-battery-1',
    module: module.id,
    input,
    params,
    results,
    pit,
    coverage: Array.isArray(coverage) ? coverage : null,
    distributional: distributionalReceipt(results),
    source: source || null,
    manifest,
  };
  return { html, json, manifest };
}
