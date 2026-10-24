// The board pack.
//
// A compliance officer's export is not a screenshot: it is the list they
// reviewed, the profile they reviewed it against, who signed it, and a hash
// that proves the list did not change after signature. The manifest reuses
// the Battery's pattern for exactly that reason — the same promise, the same
// shape, one fewer place for the institution to invent a second language.
//
// Two formats: Markdown for the record, DOCX for the board. Both carry the
// manifest; both say what the tool cannot do.

import { buildManifest } from '../../battery/manifest.js';
import { buildDocx } from '../legal/docx.js';
import { ENTITY_TYPES } from '../legal/applicability.js';
import { DICTIONARY_VERSION } from '../legal/glossary.js';
import { countsOf, decisionFor, textOf, trailOf } from './review.js';

export const MANIFEST_MODULE = 'regulator-obligation-monitor';
export const MONITOR_VERSION = 'ths-regulatory-monitor-0.1.0';

export const profileLabel = (profile) => {
  const type = ENTITY_TYPES.find((entry) => entry.id === profile?.entityType)?.label
    || profile?.entityType
    || 'Not stated';
  const bits = [type];
  if (profile?.nbfcCategory) bits.push(profile.nbfcCategory);
  if (profile?.layers) bits.push(`${String(profile.layers).toLowerCase()} layer`);
  if (profile?.depositTaking === 'yes') bits.push('takes deposits');
  if (profile?.depositTaking === 'no') bits.push('does not take deposits');
  if (profile?.assetSizeCr) bits.push(`₹${profile.assetSizeCr} crore assets`);
  if (Array.isArray(profile?.activities) && profile.activities.length) {
    bits.push(profile.activities.join(', '));
  }
  return bits.join(' · ');
};

export const buildMonitorManifest = async ({ instrument, profile, rows, review, ocr = [] }) => {
  const manifest = await buildManifest({
    module: MANIFEST_MODULE,
    input: { instrument: instrument.hash, refNo: instrument.refNo, date: instrument.date },
    params: {
      profile,
      profileLabel: profileLabel(profile),
      dictionary: DICTIONARY_VERSION,
      engine: MONITOR_VERSION,
      // Only pages a hosted model read. Empty for a text-layer instrument.
      ocr: ocr.map(({ page, provider, model, version, imageSha256, imageKey }) => ({
        page, provider, model, version, imageSha256, imageKey: imageKey || null,
      })),
    },
    results: {
      rows: rows.map((row) => ({
        id: row.id,
        quote: row.quote,
        verdict: row.applicability?.verdict || null,
        decision: decisionFor(review, row.id)?.state || 'pending',
        text: textOf(row, review),
      })),
      counts: countsOf(rows, review),
    },
  });
  // The Battery's engine name would be a lie in a monitor pack: the hash
  // pattern is shared, the thing that ran is not the Battery.
  return { ...manifest, engine: MONITOR_VERSION };
};

const decisionLabel = (review, row) => {
  const entry = decisionFor(review, row.id);
  if (!entry) return 'Not reviewed';
  const when = String(entry.at || '').slice(0, 10);
  const note = String(entry.note || '').trim();
  const state = entry.state === 'edited' ? 'Corrected by reviewer' : entry.state === 'accepted' ? 'Accepted' : 'Flagged';
  return `${state}${when ? ` ${when}` : ''}${note ? ` — ${note}` : ''}`;
};

const VERDICT_ORDER = ['in-scope', 'conditional', 'dependency', 'out-of-scope'];
const VERDICT_LABEL = {
  'in-scope': 'Binds you',
  conditional: 'Conditional',
  dependency: 'Someone you rely on',
  'out-of-scope': 'Out of scope',
};

export const buildPackMarkdown = ({
  instrument,
  profile,
  rows,
  review,
  manifest,
  changes = null,
  ocr = [],
}) => {
  const counts = countsOf(rows, review);
  const verdicts = rows.reduce((acc, row) => {
    const key = row.applicability?.verdict || 'unassessed';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const printed = rows.filter((row) => row.applicability?.verdict !== 'out-of-scope');
  const trail = trailOf(review);

  const lines = [];
  lines.push(`# Obligation review pack — ${instrument.title}`);
  lines.push('');
  lines.push(`**Regulator:** Reserve Bank of India  `);
  lines.push(`**Instrument:** ${instrument.refNo} — ${instrument.date}  `);
  lines.push(`**Source:** ${instrument.sourceUrl}  `);
  lines.push(`**Text hash:** \`${instrument.hash}\`  `);
  lines.push(`**Profile:** ${profileLabel(profile)}  `);
  lines.push(`**Reviewer:** ${review?.reviewer || 'Not named'}  `);
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('## What this pack contains');
  lines.push('');
  lines.push(
    `${rows.length} duty sentences were read from the instrument and assessed against the profile: `
    + `${verdicts['in-scope'] || 0} bind the entity, ${verdicts.conditional || 0} are conditional, `
    + `${verdicts.dependency || 0} sit with someone the entity relies on, `
    + `${verdicts['out-of-scope'] || 0} are out of scope and are not printed below.`,
  );
  lines.push(
    `Review: ${counts.accepted} accepted, ${counts.edited} corrected, ${counts.flagged} flagged, `
    + `${counts.pending} not reviewed.`,
  );
  lines.push('');
  lines.push('## Manifest');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(manifest, null, 2));
  lines.push('```');
  lines.push('');
  if (trail.length) {
    lines.push('## Reviewer trail');
    lines.push('');
    for (const entry of trail) {
      lines.push(`- Row ${entry.id} — ${entry.state}${entry.at ? ` · ${String(entry.at).slice(0, 10)}` : ''}${entry.note ? ` — ${entry.note}` : ''}`);
    }
    lines.push('');
  }
  lines.push('## Obligations');
  lines.push('');
  const grouped = VERDICT_ORDER.filter((verdict) => printed.some((row) => (row.applicability?.verdict || 'unassessed') === verdict));
  for (const verdict of grouped) {
    lines.push(`### ${VERDICT_LABEL[verdict] || verdict}`);
    lines.push('');
    for (const row of printed.filter((candidate) => (candidate.applicability?.verdict || 'unassessed') === verdict)) {
      const reasons = (row.applicability?.reasons || []).join('; ');
      lines.push(`**Row ${row.id}${row.clause ? ` · ${row.clause}` : ''} — ${VERDICT_LABEL[verdict] || verdict}**`);
      lines.push('');
      lines.push(`Obligation: ${textOf(row, review)}`);
      lines.push('');
      lines.push(`Source: “${row.quote}”`);
      lines.push('');
      if (reasons) lines.push(`Why: ${reasons}`);
      if (reasons) lines.push('');
      if (row.applicability?.nextRead) {
        lines.push(`Read next: ${row.applicability.nextRead}`);
        lines.push('');
      }
      lines.push(`Review: ${decisionLabel(review, row)}`);
      lines.push('');
    }
  }
  lines.push('## Changes since the previous instrument');
  lines.push('');
  if (!changes) {
    lines.push('No earlier instrument in this family is in the library, so there is nothing to compare against.');
  } else {
    const summary = changes.obligations.summary;
    lines.push(
      `Obligations: ${summary.added} added, ${summary.removed} dropped, ${summary.changed} changed, `
      + `${summary.unchanged} unchanged.`,
    );
    lines.push('');
    for (const entry of changes.obligations.added.slice(0, 20)) {
      lines.push(`- Added — ${entry.current.quote}`);
    }
    for (const entry of changes.obligations.removed.slice(0, 20)) {
      lines.push(`- Dropped — ${entry.previous.quote}`);
    }
    for (const entry of changes.obligations.changed.slice(0, 20)) {
      lines.push(`- Changed — ${entry.current.quote}`);
    }
    lines.push('');
    lines.push(`Text: ${changes.sentences.summary.added} sentences added, ${changes.sentences.summary.removed} removed.`);
    for (const sentence of changes.sentences.added.slice(0, 15)) lines.push(`- + ${sentence}`);
    for (const sentence of changes.sentences.removed.slice(0, 15)) lines.push(`- − ${sentence}`);
  }
  if (ocr.length) {
    lines.push('## Machine-read pages');
    lines.push('');
    lines.push(
      'The following pages had no text layer and were read by a hosted OCR model. '
      + 'Their text is machine-read: check it against the page image before relying on it.',
    );
    lines.push('');
    for (const entry of ocr) {
      lines.push(
        `- Page ${entry.page} — ${entry.provider} · ${entry.model} · ${entry.version} · image ${String(entry.imageSha256).slice(0, 16)}…`
        + (entry.imageKey ? ` · stored at ${entry.imageKey}` : ''),
      );
    }
    lines.push('');
  }
  lines.push('## Limitations');
  lines.push('');
  lines.push(
    'This is a reading and triage aid, not legal advice and not a compliance certificate. '
    + 'The obligations were extracted by fixed rules; a duty the rules did not recognise is absent, '
    + 'and an applicability verdict is only as good as the profile supplied. The tool does not check '
    + 'that the instrument is current or in force, and it cannot see an amendment it has not read. '
    + 'Every printed obligation is quoted with its source sentence so a reviewer can check it in place.',
  );
  lines.push('');
  return lines.join('\n');
};

const slug = (text) =>
  String(text || 'pack')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'pack';

// A pasted instrument has no reference number; naming the file after the
// placeholder would produce "no-reference-..." for every paste, so fall back
// to the title in that case.
const referenceFor = (instrument) => {
  const reference = String(instrument.refNo || '').trim();
  if (!reference || /^no[\s-]?reference$/i.test(reference)) return instrument.title;
  return reference;
};

export const packFileName = (instrument, extension) =>
  `${slug(referenceFor(instrument))}-${slug(instrument.date)}-obligation-pack.${extension}`;

const flagFor = (verdict) => (verdict === 'in-scope' ? 'amber' : verdict === 'dependency' ? 'blue' : 'green');

export const buildPackDocx = ({ instrument, profile, rows, review, manifest, ocr = [] }) => {
  const printed = rows.filter((row) => row.applicability?.verdict !== 'out-of-scope');
  const result = {
    source: {
      title: `Obligation review pack — ${instrument.title}`,
      citation: instrument.refNo,
      version: instrument.hash,
      date: instrument.date,
      url: instrument.sourceUrl,
      reviewer: review?.reviewer || 'Not named',
    },
    manifest: `Monitor manifest · input ${manifest.inputHash} · output ${manifest.outputHash}`
      + (ocr.length ? ` · OCR ${ocr.length} page${ocr.length === 1 ? '' : 's'} (${ocr[0].model})` : ''),
    jurisdiction: { label: `Reserve Bank of India · ${profileLabel(profile)}` },
    jurisdictionId: 'rbi-circulars',
    dictionaryVersion: DICTIONARY_VERSION,
    rows: printed.map((row, index) => ({
      id: index + 1,
      clause: row.clause,
      sourceText: row.quote,
      plain: textOf(row, review),
      flag: flagFor(row.applicability?.verdict),
      typeLabel: VERDICT_LABEL[row.applicability?.verdict] || 'Obligation',
      reasons: [{ text: (row.applicability?.reasons || []).join(' ') || 'No applicability reason recorded.' }],
      confidence: null,
    })),
  };
  return { bytes: buildDocx(result, { author: review?.reviewer || 'THS regulatory monitor' }), name: packFileName(instrument, 'docx') };
};
