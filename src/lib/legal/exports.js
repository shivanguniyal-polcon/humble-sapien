// Exports: what leaves the building.
//
// A rewrite that is reviewed in the tool and a rewrite that is filed in a
// matter are two different artefacts. These builders produce the second kind:
// a bundle that carries the source, the rewrite, the flags, the definitions
// that were left alone, the review gate answers and the methodology card —
// including the hashes that make the output reproducible.
//
// Every builder is a pure function of the pipeline result plus the review
// answers, so the same run always produces the same file.

import { hashObject, sha256Hex } from '../../battery/hash.js';
import { csvCell } from '../csv.js';
import { escapeHtml } from '../../battery/modules/decisionTree.js';
import { FLAG_LABELS, FLAG_MEANING } from './risk.js';
import { PIPELINE_VERSION } from './pipeline.js';
import { confidenceHistogram } from './confidence.js';
import { LEGAL_GATE_QUESTIONS, checkLegalGate } from './gate.js';
import {
  buildSignOff, exportedRows, rejectedRows, reviewCounts, reviewDecision,
} from './review.js';

export { escapeHtml };
export { LEGAL_GATE_QUESTIONS, checkLegalGate };

// The manifest has a version of its own, separate from the engine version.
// Firms pin to the manifest shape: if it changes underneath them, the
// receipt they kept no longer means what it meant. The schema version says
// which shape a given manifest is.
export const MANIFEST_VERSION = 'ths-legal-manifest-1.1.0';

// ---- the audit manifest ---------------------------------------------------

// SHA-256 where the platform offers it, a labelled fallback where it does
// not (an insecure origin has no Web Crypto). Either way the hash is stable,
// and the manifest says which one it used.
const fallbackHash = (text) => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return `fnv1a-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
};

export const hashText = async (text) => {
  try {
    return { hash: await sha256Hex(text), algorithm: 'sha256' };
  } catch {
    return { hash: fallbackHash(String(text)), algorithm: 'fnv1a64-fallback' };
  }
};

export const buildManifest = async (result, { gate = null, review = null } = {}) => {
  const source = await hashText(result.text || '');
  const input = await hashObject({
    text: result.text || '',
    jurisdiction: result.jurisdictionId,
    mode: result.mode,
    dictionaryVersion: result.dictionaryVersion,
  });
  const output = await hashObject(
    result.rows.map((r) => ({
      id: r.id,
      plain: r.plain,
      flag: r.flag,
      type: r.type,
      start: r.start,
      end: r.end,
    })),
  );

  // The sign-off hash is the fourth hash. The three above describe what the
  // engine did; this one describes what the human did. Together they identify
  // a file: these rows, as reviewed by this person, under these answers.
  const signOff = await buildSignOff({ gate, review });
  const counts = reviewCounts(result, review);
  const kept = exportedRows(result, review);
  const histogram = result.confidence || confidenceHistogram(result.rows);

  return {
    manifestVersion: MANIFEST_VERSION,
    engine: PIPELINE_VERSION,
    dictionary: `${result.jurisdictionId}@${result.dictionaryVersion}`,
    jurisdiction: result.jurisdiction.label,
    createdAt: new Date().toISOString(),
    sourceHash: `${source.algorithm}:${source.hash}`,
    inputHash: input,
    outputHash: output,
    signOffHash: signOff.hash,
    confidence: {
      high: histogram.high || 0,
      medium: histogram.medium || 0,
      low: histogram.low || 0,
      total: histogram.total || 0,
    },
    review: {
      accepted: counts.accepted,
      rejected: counts.rejected,
      pending: counts.pending,
      commented: counts.commented,
      exported: kept.length,
    },
    rows: result.rows.length,
  };
};

// ---- the methodology card -------------------------------------------------

export const methodologyCard = (result, manifest) => {
  const s = result.source || {};
  const conf = (manifest && manifest.confidence) || { high: 0, medium: 0, low: 0 };
  const lines = [
    'METHODOLOGY CARD',
    `Pipeline: ${manifest.engine}`,
    `Dictionary: ${manifest.dictionary}`,
    `Jurisdiction: ${manifest.jurisdiction}`,
    `Run at: ${manifest.createdAt}`,
    `Source hash: ${manifest.sourceHash}`,
    `Input hash: ${manifest.inputHash}`,
    `Output hash: ${manifest.outputHash}`,
    `Sentences reviewed: ${manifest.rows}`,
    `Sentences exported: ${manifest.review ? manifest.review.exported : manifest.rows}`,
    `Confidence: ${conf.high} high, ${conf.medium} medium, ${conf.low} low.`,
    `Sign-off hash: ${manifest.signOffHash}`,
    '',
    'SOURCE',
    `Instrument: ${s.title || '[not stated]'}`,
    `Citation: ${s.citation || '[not stated]'}`,
    `Version: ${s.version || '[not stated]'}`,
    `Source date: ${s.date || '[not stated]'}`,
    `Source URL: ${s.url || '[not stated]'}`,
    `Reviewer: ${s.reviewer || '[not stated]'}`,
    '',
    'WHAT THIS TOOL DID',
    '1. Split the source into sentences, keeping the character offsets of each one.',
    '2. Read the definitions in the source, if any, and left those terms exactly as the instrument defines them.',
    '3. Replaced the listed statutory phrases with plain words, using the dictionary named above.',
    '4. Split any sentence too long to read in one breath.',
    '5. Typed each sentence as a legal clause and flagged it green, amber or red, with the reasons shown.',
    '6. Scored the readability before and after.',
    '',
    'WHAT IT CANNOT PROVE',
    'It cannot tell you the law is correct, current, or in force. It cannot tell you the rewrite means the same thing in every case.',
    'It does not check the source against the official gazette, and it does not check the amendment history.',
    'A green flag means the rewrite was literal. It does not mean the sentence was correctly classified.',
    'Every red sentence needs a qualified lawyer. Every amber sentence needs a reviewer.',
  ];
  return lines.join('\n');
};

// ---- the plain bundle (what a copy button hands over) ----------------------

export const buildBundle = (result, { gate = null, manifest = null, review = null } = {}) => {
  const lines = [];
  const kept = exportedRows(result, review);
  const dropped = rejectedRows(result, review);
  lines.push('THS Legal Simplifier: reviewed plain-language rewrite');
  lines.push('');
  if (manifest) lines.push(methodologyCard(result, manifest));
  lines.push('--- SOURCE ---');
  lines.push(result.text);
  lines.push('');
  lines.push('--- REWRITE, SENTENCE BY SENTENCE ---');
  for (const row of kept) {
    const flag = `${row.flag.toUpperCase()} (${FLAG_LABELS[row.flag]})`;
    const confidence = row.confidence ? row.confidence.label : 'Confidence: not scored';
    lines.push('');
    lines.push(
      `${row.id}${row.clause ? ` · ${row.clause}` : ''} · ${row.typeLabel} · ${flag} · ${confidence}`,
    );
    lines.push(`  Source: ${row.sourceText}`);
    lines.push(`  Rewrite: ${row.plain}`);
    lines.push(`  Source characters ${row.start}-${row.end}`);
    for (const reason of row.reasons) lines.push(`  - ${reason.text}`);
    if (row.confidence && row.confidence.verify) {
      lines.push(`  - ${row.confidence.verifyNote}`);
    }
  }
  if (dropped.length > 0) {
    lines.push('');
    lines.push('--- SENTENCES REJECTED IN REVIEW ---');
    lines.push('These sentences were rejected by the reviewer and are not part of the rewrite above.');
    for (const row of dropped) {
      const { comment } = reviewDecision(review, row.id);
      lines.push('');
      lines.push(`${row.id}${row.clause ? ` · ${row.clause}` : ''} · ${row.typeLabel}`);
      lines.push(`  Source: ${row.sourceText}`);
      lines.push(`  Rejected: ${comment || 'no reason recorded'}`);
    }
  }
  lines.push('');
  lines.push('--- DEFINITIONS LEFT UNCHANGED ---');
  if (result.definitions.definitions.length === 0) {
    lines.push('No definitions were found in the source text.');
  } else {
    for (const def of result.definitions.definitions) {
      lines.push(`${def.term}: ${def.definition || '[definition not read]'}`);
    }
  }
  lines.push('');
  lines.push('--- READABILITY ---');
  lines.push(
    `Source: Flesch reading ease ${result.readability.original.score}, grade ${result.readability.original.grade}.`,
  );
  lines.push(
    `Rewrite: Flesch reading ease ${result.readability.simplified.score}, grade ${result.readability.simplified.grade}.`,
  );
  lines.push(`Target for ${result.jurisdiction.short}: ${result.jurisdiction.readability.label}.`);
  if (result.hindi.sentences.length > 0) {
    lines.push('');
    lines.push('--- HINDI PLAIN VERSION ---');
    for (const h of result.hindi.sentences) lines.push(h.text);
    lines.push(result.hindi.note);
  }
  if (gate) {
    lines.push('');
    lines.push('--- LEGAL REVIEW GATE ---');
    for (const q of LEGAL_GATE_QUESTIONS) {
      lines.push(`${q.label} ${String((gate && gate[q.key]) || '').trim() || '[not answered]'}`);
    }
  }
  lines.push('');
  lines.push(
    'This is a draft simplification, not legal advice. The source text travels with the rewrite: nothing here replaces the instrument itself.',
  );
  return lines.join('\n');
};

// ---- markdown -------------------------------------------------------------

export const buildMarkdown = (result, { gate = null, manifest = null, review = null } = {}) => {
  const out = [];
  const kept = exportedRows(result, review);
  const dropped = rejectedRows(result, review);
  out.push(`# ${result.source.title || 'Reviewed plain-language rewrite'}`);
  out.push('');
  if (result.source.citation) out.push(`**Citation:** ${result.source.citation}`);
  if (result.source.version) out.push(`**Version:** ${result.source.version}`);
  if (result.source.date) out.push(`**Date:** ${result.source.date}`);
  if (result.source.url) out.push(`**Source:** ${result.source.url}`);
  out.push('');
  out.push(
    `Flesch reading ease ${result.readability.original.score} → ${result.readability.simplified.score}; grade ${result.readability.original.grade} → ${result.readability.simplified.grade}.`,
  );
  out.push('');
  out.push('## Rewrite');
  out.push('');
  out.push('| # | Clause | Type | Flag | Confidence | Source | Rewrite |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of kept) {
    out.push(
      `| ${row.index + 1} | ${row.clause || '—'} | ${row.typeLabel} | ${row.flag} | ${row.confidence ? row.confidence.level : '—'} | ${escapeMd(row.sourceText)} | ${escapeMd(row.plain)} |`,
    );
  }
  out.push('');
  out.push('## Why each sentence is flagged');
  out.push('');
  for (const row of kept) {
    out.push(`**${row.id}${row.clause ? ` · ${row.clause}` : ''} · ${row.flag}**`);
    for (const reason of row.reasons) out.push(`- ${reason.text}`);
    if (row.confidence && row.confidence.verify) {
      out.push(`- ${row.confidence.verifyNote}`);
    }
    out.push('');
  }
  if (dropped.length > 0) {
    out.push('## Sentences rejected in review');
    out.push('');
    out.push('These sentences were rejected by the reviewer and are not part of the rewrite above.');
    out.push('');
    for (const row of dropped) {
      const { comment } = reviewDecision(review, row.id);
      out.push(`- **${row.id}${row.clause ? ` · ${row.clause}` : ''}** — ${comment || 'no reason recorded'}`);
    }
    out.push('');
  }
  if (result.definitions.definitions.length > 0) {
    out.push('## Definitions left unchanged');
    out.push('');
    for (const def of result.definitions.definitions) {
      out.push(`- **${def.term}** — ${def.definition || '[definition not read]'}`);
    }
    out.push('');
  }
  if (gate) {
    out.push('## Legal review gate');
    out.push('');
    for (const q of LEGAL_GATE_QUESTIONS) {
      out.push(`- **${q.label}** ${String((gate && gate[q.key]) || '').trim() || '[not answered]'}`);
    }
    out.push('');
  }
  if (manifest) {
    out.push('## Methodology card');
    out.push('');
    out.push('```');
    out.push(methodologyCard(result, manifest));
    out.push('```');
  }
  return out.join('\n');
};

const escapeMd = (text) =>
  String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// ---- the standalone HTML document -----------------------------------------

export const buildHtml = (result, { gate = null, manifest = null, review = null } = {}) => {
  const flagCell = (flag) =>
    `<span class="flag flag-${flag}">${flag} · ${FLAG_LABELS[flag]}</span>`;
  const confidenceCell = (row) =>
    row.confidence
      ? `<span class="conf conf-${row.confidence.level}">${escapeHtml(row.confidence.label)}</span>`
      : '—';
  const kept = exportedRows(result, review);
  const dropped = rejectedRows(result, review);

  const rows = kept
    .map(
      (r) => `<tr>
      <td class="num">${r.index + 1}</td>
      <td class="mono">${escapeHtml(r.clause || '—')}</td>
      <td>${escapeHtml(r.typeLabel)}</td>
      <td>${flagCell(r.flag)}</td><td>${confidenceCell(r)}</td>
      <td class="src">${escapeHtml(r.sourceText)}</td>
      <td class="plain">${escapeHtml(r.plain)}</td>
    </tr>`,
    )
    .join('\n');

  const reasons = kept
    .map(
      (r) => `<tr>
      <td class="mono">${escapeHtml(r.id)}${r.clause ? ` · ${escapeHtml(r.clause)}` : ''}</td>
      <td>${flagCell(r.flag)}</td><td>${confidenceCell(r)}</td>
      <td><ul>${r.reasons.map((x) => `<li>${escapeHtml(x.text)}</li>`).join('')}</ul></td>
    </tr>`,
    )
    .join('\n');

  const rejected = dropped.length
    ? `<h2>Sentences rejected in review</h2>
       <p class="fine-print">These sentences were rejected by the reviewer and are not part of the rewrite above. They are listed so the record shows what was removed and why.</p>
       <table>
         <thead><tr><th>Sentence</th><th>Reason</th></tr></thead>
         <tbody>${dropped
           .map((d) => {
             const { comment } = reviewDecision(review, d.id);
             const label = `${d.id}${d.clause ? ` · ${d.clause}` : ''}`;
             return `<tr><th scope="row" class="mono">${escapeHtml(label)}</th><td>${escapeHtml(comment || 'no reason recorded')}</td></tr>`;
           })
           .join('')}
         </tbody>
       </table>`
    : '';

  const definitions = result.definitions.definitions.length
    ? `<h2>Definitions left unchanged</h2>
       <table><thead><tr><th>Term</th><th>Definition as read</th></tr></thead><tbody>
       ${result.definitions.definitions
         .map((d) => `<tr><th scope="row">${escapeHtml(d.term)}</th><td>${escapeHtml(d.definition || '[definition not read]')}</td></tr>`)
         .join('')}
       </tbody></table>`
    : '';

  const gateBlock = gate
    ? `<h2>Legal review gate</h2>
       <div class="gate">${LEGAL_GATE_QUESTIONS.map((q) => {
         const answer = String((gate && gate[q.key]) || '').trim();
         return `<p><strong>${escapeHtml(q.label)}</strong> ${answer ? escapeHtml(answer) : '<em>[not answered]</em>'}</p>`;
       }).join('')}</div>`
    : '';

  const warnings = result.warnings.length
    ? `<h2>Warnings</h2><ul class="warnings">${result.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
    : '';

  const method = manifest
    ? `<h2>Methodology card</h2><pre class="stamp">${escapeHtml(methodologyCard(result, manifest))}</pre>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(result.source.title || 'Reviewed plain-language rewrite')}</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b1815; background: #fff; margin: 0; padding: 2.5rem 1.5rem; line-height: 1.55; }
  main { max-width: 62rem; margin: 0 auto; }
  h1 { font-size: 1.9rem; line-height: 1.15; margin: 0.25rem 0 0.5rem; }
  h2 { font-size: 1.25rem; margin-top: 2.25rem; border-bottom: 1.5px solid #e0ddd8; padding-bottom: 0.35rem; }
  .kicker { font-family: 'Courier New', monospace; font-size: 0.72rem; letter-spacing: 0.02em; color: #7a1f2b; }
  .fine-print { font-size: 0.85rem; color: #4b4640; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-block: 0.75rem; }
  th, td { text-align: left; padding: 0.45rem 0.6rem 0.45rem 0; border-bottom: 1px solid #eceae6; vertical-align: top; }
  thead th { font-family: 'Courier New', monospace; font-size: 0.68rem; letter-spacing: 0.02em; color: #4b4640; border-bottom: 1.5px solid #c7c2bb; }
  .num, .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .num { width: 2.5rem; color: #6f6a63; }
  .src { color: #4b4640; width: 34%; }
  .plain { width: 34%; }
  .flag { font-family: 'Courier New', monospace; font-size: 0.68rem; border-radius: 999px; padding: 0.15rem 0.6rem; white-space: nowrap; }
  .flag-green { background: #eceae6; color: #322e29; }
  .flag-amber { background: #f0e1e3; color: #641622; }
  .flag-red { background: #7a1f2b; color: #fff; }
  .conf { font-family: 'Courier New', monospace; font-size: 0.68rem; white-space: nowrap; }
  .conf-high { color: #2f6b3c; }
  .conf-medium { color: #7a5a12; }
  .conf-low { color: #7a1f2b; }
  .gate { background: #fff; border: 1px solid #eceae6; border-top: 3px solid #7a1f2b; padding: 1rem 1.25rem; }
  .warnings { font-size: 0.88rem; color: #641622; }
  .stamp { font-family: 'Courier New', monospace; font-size: 0.72rem; white-space: pre-wrap; background: #f6f5f3; border: 1px solid #eceae6; padding: 1rem; }
  .summary { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; }
  .summary div { border: 1px solid #eceae6; padding: 0.6rem 0.9rem; border-radius: 8px; font-size: 0.85rem; }
  .summary strong { display: block; font-size: 1.3rem; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } table { break-inside: auto; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <p class="kicker">THS Legal Simplifier · ${escapeHtml(result.jurisdiction.label)} · ${escapeHtml(manifest ? manifest.engine : PIPELINE_VERSION)}</p>
  <h1>${escapeHtml(result.source.title || 'Reviewed plain-language rewrite')}</h1>
  <p class="fine-print">${escapeHtml(result.source.citation || 'No citation recorded.')}${result.source.version ? ` · version ${escapeHtml(result.source.version)}` : ''}${result.source.date ? ` · ${escapeHtml(result.source.date)}` : ''}</p>

  <div class="summary">
    <div><strong>${result.summary.green}</strong>literal</div>
    <div><strong>${result.summary.amber}</strong>interpretive</div>
    <div><strong>${result.summary.red}</strong>legal judgement</div>
    <div><strong>${manifest && manifest.confidence ? manifest.confidence.high : 0}</strong>high confidence</div>
    <div><strong>${manifest && manifest.confidence ? manifest.confidence.low : 0}</strong>verify against source</div>
    <div><strong>${result.readability.simplified.grade}</strong>grade after</div>
    <div><strong>${result.readability.simplified.score}</strong>reading ease after</div>
  </div>

  ${warnings}

  <h2>Source and rewrite, side by side</h2>
  <table>
    <thead><tr><th>#</th><th>Clause</th><th>Type</th><th>Flag</th><th>Confidence</th><th>Source</th><th>Rewrite</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Why each sentence carries that flag</h2>
  <table>
    <thead><tr><th>Sentence</th><th>Flag</th><th>Confidence</th><th>Reasons</th></tr></thead>
    <tbody>${reasons}</tbody>
  </table>

  ${rejected}

  ${definitions}
  ${gateBlock}
  ${method}

  <h2>Limitations</h2>
  <ul class="fine-print">
    <li>This is a draft simplification, not legal advice, and not a certification that the source text is current or in force.</li>
    <li>Flags describe the rewrite, not the law. A green flag means the wording changed mechanically; it does not mean the clause was classified correctly.</li>
    <li>Defined terms are matched by exact wording and common inflections. A term the tool did not read is a term it did not protect.</li>
    <li>Every red sentence needs a qualified lawyer before it leaves the building.</li>
  </ul>
</main>
</body>
</html>`;
};

// ---- the redline pack (CSV) -----------------------------------------------

export const buildRedlineCsv = (result, { review = null } = {}) => {
  const header = [
    'sentence',
    'clause',
    'clause_type',
    'flag',
    'confidence',
    'source_start',
    'source_end',
    'rule_from',
    'rule_to',
    'rule_risk',
    'rationale',
    'source_text',
    'rewrite',
  ];
  const lines = [header.join(',')];
  for (const row of exportedRows(result, review)) {
    const base = [
      row.id,
      row.clause || '',
      row.typeLabel,
      row.flag,
      row.confidence ? row.confidence.level : '',
      row.start,
      row.end,
    ];
    const tail = [row.sourceText, row.plain];
    if (row.changes.length === 0) {
      lines.push([...base, '', '', '', '', ...tail].map(csvCell).join(','));
      continue;
    }
    for (const change of row.changes) {
      lines.push(
        [
          ...base,
          change.from,
          change.to,
          change.risk,
          change.note,
          ...tail,
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return lines.join('\n');
};

// ---- the comparative report -----------------------------------------------

export const buildDeltaReport = (delta) => {
  const lines = [];
  lines.push('THS Legal Simplifier: comparative reading');
  lines.push('');
  lines.push(`Alignment method: ${delta.method}.`);
  lines.push(
    `${delta.counts.changed} changed, ${delta.counts.added} added, ${delta.counts.removed} removed, ${delta.counts.unchanged} unchanged.`,
  );
  lines.push(
    `Reading ease ${delta.before.readability.simplified.score} → ${delta.after.readability.simplified.score}; grade ${delta.before.readability.simplified.grade} → ${delta.after.readability.simplified.grade}.`,
  );
  lines.push('');
  for (const change of delta.changes) {
    if (change.status === 'unchanged') continue;
    lines.push(`--- ${change.status.toUpperCase()}${change.clause ? ` · ${change.clause}` : ''} · ${change.type} · ${change.flag}`);
    if (change.before) {
      lines.push(`  Before: ${change.before.text}`);
      lines.push(`  Before in plain words: ${change.before.plain}`);
    }
    if (change.after) {
      lines.push(`  After: ${change.after.text}`);
      lines.push(`  After in plain words: ${change.after.plain}`);
    }
    for (const reason of change.reasons || []) lines.push(`  - ${reason.text}`);
    lines.push('');
  }
  lines.push('This is a draft comparison, not legal advice. Clause numbers were matched where both versions carried them; where they did not, the two texts were aligned on common sentences and the result should be read as a pointer, not a finding.');
  return lines.join('\n');
};

export { FLAG_MEANING };
