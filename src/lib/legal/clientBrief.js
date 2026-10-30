// The one-page client brief.
//
// The review ledger is for the reviewer. The client brief is for the client:
// one page, plain words, no flags and no ledgers, but nothing left out that
// would matter to somebody relying on it. It says what the instrument does,
// what a lawyer still has to look at, how the reading was produced, and it
// carries the sign-off.
//
// Two rules govern it. First, a brief never claims more than the run proved:
// if a sentence was flagged for legal judgement, the brief says that a
// qualified lawyer must sign it off, without saying which sentences, because
// the client brief is not the review record. Second, the brief never loses
// the hashes: the partner who forwards the brief can still say which run
// produced it.

import { escapeHtml } from '../legal/exports.js';
import { getClauseType } from './clauses.js';
import { FLAG_LABELS } from './risk.js';
import { exportedRows, rejectedRows } from './review.js';

// The clause types a client actually cares about, in the order a brief
// should read them: what binds you, what forbids you, what you may do, and
// what happens if you get it wrong.
const BRIEF_SECTIONS = [
  { id: 'obligation', label: 'What the text requires' },
  { id: 'prohibition', label: 'What the text forbids' },
  { id: 'entitlement', label: 'What you are entitled to' },
  { id: 'permission', label: 'What may be done' },
  { id: 'condition-precedent', label: 'What has to happen first' },
  { id: 'proviso', label: 'Conditions attached' },
  { id: 'exception', label: 'Exceptions' },
  { id: 'safe-harbour', label: 'Protection from liability' },
  { id: 'deeming', label: 'Provisions that make one thing another' },
  { id: 'penalty', label: 'Penalties' },
];

const pick = (rows, n) => rows.slice(0, n);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The brief only ever describes sentences that survived review. A rejected
// sentence is not in the brief and not in the groups it draws from: the
// client sees the instrument as the reviewer approved it, and the review
// record keeps the rest.
const groupsOf = (result, review) => {
  const kept = new Set(exportedRows(result, review).map((r) => r.id));
  const out = {};
  for (const key of Object.keys(result.groups || {})) {
    out[key] = (result.groups[key] || []).filter((r) => kept.has(r.id));
  }
  return out;
};

const flagCounts = (result, review) => {
  const counts = { green: 0, amber: 0, red: 0 };
  for (const row of exportedRows(result, review)) counts[row.flag] += 1;
  return counts;
};

// The brief, as plain text. Pasting this into an email is a legitimate
// deliverable, and a firm does that more often than it files a document.
export const buildClientBriefText = (result, { gate = null, manifest = null, matter = null, delta = null, review = null } = {}) => {
  const s = result.source || {};
  const lines = [];
  const m = matter || {};
  const groups = groupsOf(result, review);
  const counts = flagCounts(result, review);
  const dropped = rejectedRows(result, review);

  lines.push('PLAIN-LANGUAGE BRIEF');
  lines.push('');
  if (m.client) lines.push(`Client: ${m.client}`);
  if (m.matterRef) lines.push(`Matter: ${m.matterRef}`);
  lines.push(`Instrument: ${s.title || '[not stated]'}`);
  if (s.citation) lines.push(`Citation: ${s.citation}`);
  if (s.version) lines.push(`Version: ${s.version}`);
  if (s.date) lines.push(`Source date: ${s.date}`);
  lines.push(`Register: ${result.jurisdiction.label}`);
  if (m.instruction) lines.push(`Instruction: ${m.instruction}`);
  lines.push('');

  lines.push('1. WHAT THIS DOCUMENT IS');
  lines.push(
    'A plain-language reading of the instrument named above, prepared from the source text and reviewed against it sentence by sentence. It is a draft. It is not legal advice, and it does not replace the instrument itself.',
  );
  lines.push('');

  lines.push('2. WHAT THE TEXT DOES');
  for (const section of BRIEF_SECTIONS) {
    const rows = groups[section.id] || [];
    if (rows.length === 0) continue;
    lines.push(`${section.label} (${rows.length}):`);
    for (const row of pick(rows, 3)) lines.push(`  - ${row.plain}`);
    if (rows.length > 3) lines.push(`  - and ${rows.length - 3} more of this kind in the full review.`);
  }
  if (delta) {
    lines.push('');
    lines.push('What changed in plain words:');
    lines.push(
      `  ${plural(delta.counts.changed, 'clause', 'clauses')} changed, ${delta.counts.added} added, ${delta.counts.removed} removed (aligned on ${delta.method}).`,
    );
  }
  lines.push('');

  lines.push('3. WHAT STILL NEEDS A LAWYER');
  if (counts.red > 0) {
    lines.push(
      `${plural(counts.red, 'sentence', 'sentences')} carry a legal-judgement flag: the rewrite there may change the legal effect, and a qualified lawyer must sign them off before this brief is relied on.`,
    );
  } else {
    lines.push('No sentence in this reading was flagged for legal judgement.');
  }
  lines.push(
    `${plural(counts.amber, 'sentence', 'sentences')} were flagged interpretive: a reviewer reads them against the source, but they do not change the legal effect on their face.`,
  );
  if (dropped.length > 0) {
    lines.push(
      `${plural(dropped.length, 'sentence was', 'sentences were')} rejected by the reviewer and left out of this brief entirely.`,
    );
  }
  lines.push('');

  lines.push('4. HOW THE READING WAS PRODUCED');
  lines.push(
    `Rule-based rewriting, not a model's judgement. The source was split into ${plural(result.stats.sentences, 'sentence', 'sentences')}; each was rewritten with a published phrase dictionary, typed as a legal clause, and checked for lost figures, lost negations and lost duty markers.`,
  );
  lines.push(
    `Reading level: Flesch reading ease ${result.readability.original.score} → ${result.readability.simplified.score}; grade ${result.readability.original.grade} → ${result.readability.simplified.grade}.`,
  );
  if (result.definitions.definitions.length > 0) {
    lines.push(
      `Terms the instrument defines for itself (${result.definitions.definitions.map((d) => d.term).join(', ')}) were left exactly as defined, and every sentence leaning on one was marked for review.`,
    );
  }
  if (result.currency && result.currency.stated) {
    lines.push(result.currency.statement);
  }
  if (manifest) {
    lines.push(`Run: ${manifest.engine} · ${manifest.dictionary} · ${manifest.createdAt}`);
    lines.push(`Output hash: ${manifest.outputHash}`);
    if (manifest.signOffHash) lines.push(`Sign-off hash: ${manifest.signOffHash}`);
    if (manifest.confidence) {
      lines.push(
        `Confidence: ${manifest.confidence.high} high, ${manifest.confidence.medium} medium, ${manifest.confidence.low} to be verified against the source.`,
      );
    }
  }
  lines.push('');

  lines.push('5. WHAT THIS BRIEF CANNOT DO');
  lines.push('It cannot tell you the law is current, in force, or correctly applied to your facts.');
  lines.push('It cannot tell you whether the source you gave us is the latest version of the instrument.');
  lines.push('It cannot replace advice on your specific situation.');
  lines.push('');

  lines.push('6. SIGN-OFF');
  lines.push(`Reviewed by: ${m.reviewer || s.reviewer || '[not stated]'}`);
  if (gate) {
    for (const [key, value] of Object.entries(gate)) {
      if (!String(value || '').trim()) continue;
      lines.push(`${key}: ${String(value).trim()}`);
    }
  }
  lines.push('');
  lines.push('This is a draft simplification, not legal advice. The source text travels with this brief.');
  return lines.join('\n');
};

// The brief, as a print-ready document. A4 or Letter, one page where it can
// be, and the print stylesheet is part of the file so what the partner sees
// on screen is what comes out of the printer. The print brief has no
// comparison block, so it takes no `delta`; the text brief does.
export const buildClientBriefHtml = (result, { gate = null, manifest = null, matter = null, review = null } = {}) => {
  const s = result.source || {};
  const m = matter || {};
  const groups = groupsOf(result, review);
  const counts = flagCounts(result, review);
  const dropped = rejectedRows(result, review);

  const head = [
    m.client ? ['Client', m.client] : null,
    m.matterRef ? ['Matter', m.matterRef] : null,
    ['Instrument', s.title || '[not stated]'],
    s.citation ? ['Citation', s.citation] : null,
    s.version ? ['Version', s.version] : null,
    s.date ? ['Source date', s.date] : null,
    ['Register', result.jurisdiction.label],
    m.instruction ? ['Instruction', m.instruction] : null,
  ].filter(Boolean);

  const sections = BRIEF_SECTIONS.map((section) => {
    const rows = groups[section.id] || [];
    if (rows.length === 0) return '';
    const items = rows
      .slice(0, 4)
      .map((row) => `<li>${escapeHtml(row.plain)}</li>`)
      .join('');
    const more =
      rows.length > 4 ? `<p class="more">and ${rows.length - 4} more of this kind in the full review.</p>` : '';
    return `<section class="block"><h2>${escapeHtml(section.label)} <span class="count">${rows.length}</span></h2><ul>${items}</ul>${more}</section>`;
  }).join('');

  const needsLawyer = `
    <section class="block">
      <h2>What still needs a lawyer</h2>
      <p>${
        counts.red > 0
          ? `${counts.red} sentence${counts.red > 1 ? 's' : ''} carry a legal-judgement flag: the rewrite there may change the legal effect, and a qualified lawyer must sign them off before this brief is relied on.`
          : 'No sentence in this reading was flagged for legal judgement.'
      }</p>
      <p>${counts.amber} sentence${counts.amber > 1 ? 's were' : ' was'} flagged interpretive: a reviewer reads ${counts.amber > 1 ? 'them' : 'it'} against the source, but ${counts.amber > 1 ? 'they do' : 'it does'} not change the legal effect on ${counts.amber > 1 ? 'their' : 'its'} face.</p>
      ${dropped.length > 0 ? `<p>${dropped.length} sentence${dropped.length > 1 ? 's were' : ' was'} rejected by the reviewer and left out of this brief entirely.</p>` : ''}
    </section>`;

  const method = `
    <section class="block">
      <h2>How the reading was produced</h2>
      <p>Rule-based rewriting, not a model's judgement. The source was split into ${result.stats.sentences} sentence${result.stats.sentences === 1 ? '' : 's'}; each was rewritten with a published phrase dictionary, typed as a legal clause, and checked for lost figures, lost negations and lost duty markers.</p>
      <p>Reading level: Flesch reading ease ${result.readability.original.score} &rarr; ${result.readability.simplified.score}; grade ${result.readability.original.grade} &rarr; ${result.readability.simplified.grade}.</p>
      ${
        result.definitions.definitions.length > 0
          ? `<p>Terms the instrument defines for itself (${escapeHtml(result.definitions.definitions.map((d) => d.term).join(', '))}) were left exactly as defined, and every sentence leaning on one was marked for review.</p>`
          : ''
      }
      ${result.currency && result.currency.stated ? `<p>${escapeHtml(result.currency.statement)}</p>` : ''}
      ${
        manifest
          ? `<p class="stamp">Run: ${escapeHtml(manifest.engine)} · ${escapeHtml(manifest.dictionary)} · ${escapeHtml(manifest.createdAt)}<br>Output hash: ${escapeHtml(manifest.outputHash)}${manifest.signOffHash ? `<br>Sign-off hash: ${escapeHtml(manifest.signOffHash)}` : ''}</p>`
          : ''
      }
    </section>`;

  const signOff = `
    <section class="block signoff">
      <h2>Sign-off</h2>
      <table class="signoff-table">
        <tbody>
          <tr><th scope="row">Reviewed by</th><td>${escapeHtml(m.reviewer || s.reviewer || '[not stated]')}</td></tr>
          <tr><th scope="row">Source version confirmed current</th><td>${escapeHtml((gate && gate.currency) || '[not answered]')}</td></tr>
          <tr><th scope="row">Defined terms resolved</th><td>${escapeHtml((gate && gate.definitions) || '[not answered]')}</td></tr>
          <tr><th scope="row">Approved for circulation</th><td>${escapeHtml((gate && gate.circulation) || '[not answered]')}</td></tr>
        </tbody>
      </table>
      <p class="disclaimer">This is a draft simplification, not legal advice. It cannot tell you the law is current, in force, or correctly applied to your facts, and it does not replace the instrument itself.</p>
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plain-language brief — ${escapeHtml(s.title || 'instrument')}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b1815; background: #fff; margin: 0; padding: 2rem 1.5rem; line-height: 1.45; }
  main { max-width: 46rem; margin: 0 auto; }
  .kicker { font-family: 'Courier New', monospace; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; color: #7a1f2b; margin: 0; }
  h1 { font-size: 1.6rem; line-height: 1.15; margin: 0.2rem 0 0.9rem; }
  h2 { font-size: 0.95rem; margin: 0 0 0.35rem; letter-spacing: 0.01em; }
  .count { font-family: 'Courier New', monospace; font-size: 0.72rem; color: #6f6a63; font-weight: normal; }
  dl { display: grid; grid-template-columns: 8rem 1fr; gap: 0.15rem 0.75rem; margin: 0 0 1.25rem; font-size: 0.82rem; }
  dt { color: #6f6a63; }
  dd { margin: 0; }
  .block { border-top: 1px solid #e0ddd8; padding-top: 0.7rem; margin-top: 0.9rem; }
  .block p { font-size: 0.86rem; margin: 0.25rem 0; }
  ul { margin: 0.25rem 0 0; padding-left: 1.1rem; font-size: 0.86rem; }
  li { margin-bottom: 0.2rem; }
  .more { color: #6f6a63; font-size: 0.8rem; }
  .stamp { font-family: 'Courier New', monospace; font-size: 0.68rem; color: #4b4640; background: #f6f5f3; border: 1px solid #eceae6; padding: 0.5rem 0.6rem; }
  .signoff-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .signoff-table th { text-align: left; font-weight: normal; color: #6f6a63; width: 14rem; vertical-align: top; padding: 0.15rem 0.6rem 0.15rem 0; border-bottom: 1px solid #f0eeea; }
  .signoff-table td { padding: 0.15rem 0; border-bottom: 1px solid #f0eeea; }
  .disclaimer { font-size: 0.76rem; color: #4b4640; border-top: 1px solid #e0ddd8; padding-top: 0.5rem; margin-top: 0.8rem; }
  @media print { body { padding: 0; font-size: 10.5pt; } .block { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <p class="kicker">Plain-language brief</p>
  <h1>${escapeHtml(s.title || 'Instrument')}</h1>
  <dl>
    ${head.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('\n    ')}
  </dl>

  <section class="block">
    <h2>What this document is</h2>
    <p>A plain-language reading of the instrument named above, prepared from the source text and reviewed against it sentence by sentence. It is a draft. It is not legal advice, and it does not replace the instrument itself.</p>
  </section>

  <section class="block">
    <h2>What the text does</h2>
    ${sections}
  </section>

  ${needsLawyer}
  ${method}
  ${signOff}
</main>
</body>
</html>`;
};

// Open a document in a new window and send it to the printer. The browser's
// own "save as PDF" is one click further, which is the shortest honest path
// to a PDF from a browser with no PDF library in it.
export const printHtml = (html) => {
  if (typeof window === 'undefined' || !window.open) return false;
  const win = window.open('', '_blank');
  if (!win) return false;
  win.opener = null;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  try {
    win.print();
  } catch {
    // Printing is not available in every embedded webview. The document is
    // open on screen either way.
  }
  return true;
};

export { BRIEF_SECTIONS, getClauseType, FLAG_LABELS };
