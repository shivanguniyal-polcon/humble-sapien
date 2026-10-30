// The audit trail: an append-only log of every run, kept on the device.
//
// A firm cannot defend a rewrite with a screenshot of a browser tab. It can
// defend one with a chain: who ran it, when, against which text, under which
// dictionary, with which review answers, and what the output hashed to. This
// module is that chain.
//
// Three properties matter, and each one is a promise the tool makes:
//
//   append-only  a run is added, never edited. A later run cannot rewrite
//                what an earlier one said.
//   on-device    the log never leaves the browser. It is written to local
//                storage, and it is exported by the user, deliberately, to
//                a file they choose.
//   reproducible every record carries the source text it ran on, so the run
//                can be re-executed years later and checked against the
//                output hash it recorded.
//
// The log is bounded. A matter does not accumulate runs without limit, and a
// full log in local storage is a liability in a browser tab, so the oldest
// runs fall off and the count of what fell off is reported.

import { analyse } from './pipeline.js';
import { buildManifest } from './exports.js';
import { csvCell } from '../csv.js';

export const AUDIT_VERSION = 'ths-audit-1.0.0';
export const STORAGE_KEY = 'ths.legal.audit.v1';
export const MAX_RUNS = 50;

// ---- the matter file ------------------------------------------------------

// The fields a firm needs on a matter before an output can leave the
// building: who the client is, which matter it belongs to, who reviewed it,
// and what the instruction was.
export const MATTER_FIELDS = [
  { key: 'client', label: 'Client', placeholder: 'Acme Industries' },
  { key: 'matterRef', label: 'Matter reference', placeholder: 'MAT-2026-014' },
  { key: 'reviewer', label: 'Reviewing lawyer', placeholder: 'A. Reviewer, Advocate' },
  { key: 'instruction', label: 'Instruction', placeholder: 'Plain-language reading for the board pack' },
];

export const emptyMatter = () => ({
  client: '',
  matterRef: '',
  reviewer: '',
  instruction: '',
});

export const normaliseMatter = (matter = {}) => {
  const m = matter || {};
  return {
    client: String(m.client || '').trim(),
    matterRef: String(m.matterRef || '').trim(),
    reviewer: String(m.reviewer || '').trim(),
    instruction: String(m.instruction || '').trim(),
  };
};

export const matterComplete = (matter = {}) => {
  const m = normaliseMatter(matter);
  return Boolean(m.client && m.matterRef && m.reviewer);
};

// ---- the run record -------------------------------------------------------

// A run record is the receipt. It says what was run, on what, under which
// engine, and what came out — and it keeps the source so the run can be
// repeated.
export const createRunRecord = async (result, {
  manifest = null,
  gate = null,
  matter = null,
  action = 'export',
  at = new Date(),
} = {}) => {
  const m = manifest || (await buildManifest(result));
  const matterFields = normaliseMatter(matter);
  const source = result.source || {};

  return {
    id: `run-${m.outputHash.slice(0, 12)}-${at.getTime().toString(36)}`,
    at: at.toISOString(),
    action,
    engine: m.engine,
    dictionary: m.dictionary,
    jurisdiction: m.jurisdiction,
    instrument: source.title || '',
    citation: source.citation || '',
    version: source.version || '',
    sourceDate: source.date || '',
    sourceHash: m.sourceHash,
    inputHash: m.inputHash,
    outputHash: m.outputHash,
    reviewer: matterFields.reviewer || source.reviewer || '',
    matter: matterFields,
    gate: {
      currency: String((gate && gate.currency) || '').trim(),
      definitions: String((gate && gate.definitions) || '').trim(),
      reviewer: String((gate && gate.reviewer) || '').trim(),
      circulation: String((gate && gate.circulation) || '').trim(),
    },
    sentences: result.rows.length,
    words: result.stats ? result.stats.words : 0,
    flags: { ...result.summary },
    // The source travels with the record. Without it the run cannot be
    // reproduced, and a hash with nothing to check it against is decoration.
    sourceText: result.text || '',
  };
};

// ---- storage --------------------------------------------------------------

const memory = { value: null };

const getStorage = () => {
  try {
    const store = globalThis.localStorage;
    if (!store) return null;
    const probe = `${STORAGE_KEY}.probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
};

export const readRuns = () => {
  const store = getStorage();
  if (store) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return memory.value ? [...memory.value] : [];
};

const writeRuns = (runs) => {
  memory.value = [...runs];
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // A full or disabled storage must not break the run. The in-memory copy
    // still holds the log for this session.
  }
};

// Add a run to the log. Returns { runs, dropped } where dropped is the number
// of runs that fell off the end of the bounded log.
export const appendRun = (record) => {
  const runs = [...readRuns(), record];
  const dropped = Math.max(0, runs.length - MAX_RUNS);
  const kept = runs.slice(-MAX_RUNS);
  writeRuns(kept);
  return { runs: kept, dropped };
};

export const clearRuns = () => {
  writeRuns([]);
  return [];
};

// ---- exports --------------------------------------------------------------

// The log as a flat CSV: one row per run, one column per field, no nesting.
// This is the shape a firm's document management system or SIEM ingests
// without a parser, which is the whole point of having it.
export const exportAuditCsv = (runs) => {
  const header = [
    'run_id',
    'at',
    'action',
    'engine',
    'dictionary',
    'jurisdiction',
    'instrument',
    'citation',
    'version',
    'source_date',
    'source_hash',
    'input_hash',
    'output_hash',
    'client',
    'matter_ref',
    'reviewer',
    'instruction',
    'gate_currency',
    'gate_definitions',
    'gate_reviewer',
    'gate_circulation',
    'sentences',
    'words',
    'green',
    'amber',
    'red',
  ];
  const lines = [header.join(',')];
  for (const run of runs || []) {
    lines.push(
      [
        run.id,
        run.at,
        run.action,
        run.engine,
        run.dictionary,
        run.jurisdiction,
        run.instrument,
        run.citation,
        run.version,
        run.sourceDate,
        run.sourceHash,
        run.inputHash,
        run.outputHash,
        run.matter ? run.matter.client : '',
        run.matter ? run.matter.matterRef : '',
        run.reviewer,
        run.matter ? run.matter.instruction : '',
        run.gate ? run.gate.currency : '',
        run.gate ? run.gate.definitions : '',
        run.gate ? run.gate.reviewer : '',
        run.gate ? run.gate.circulation : '',
        run.sentences,
        run.words,
        run.flags ? run.flags.green : '',
        run.flags ? run.flags.amber : '',
        run.flags ? run.flags.red : '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
};

// The same log with the source text of each run, so the file is the evidence
// and not only the index of it.
export const exportAuditJson = (runs) =>
  JSON.stringify(
    {
      auditVersion: AUDIT_VERSION,
      exportedAt: new Date().toISOString(),
      runs: runs || [],
    },
    null,
    2,
  );

// ---- the reproduction check ------------------------------------------------

// Re-run a recorded run and check it against the hash it wrote down.
//   reproduced    the same output, byte for byte
//   drifted      the same input produced a different output
//   engine-changed the engine or dictionary version moved, so the run was
//                 re-executed under a different rulebook
export const verifyRun = async (record) => {
  if (!record || !record.sourceText) {
    return { status: 'unverifiable', detail: 'The record carries no source text to re-run.' };
  }

  const jurisdictionId = String(record.dictionary || '').split('@')[0] || 'in-bare-act';
  const result = analyse(record.sourceText, {
    jurisdictionId,
    mode: 'legal-review',
    source: {
      title: record.instrument,
      citation: record.citation,
      version: record.version,
      date: record.sourceDate,
    },
  });
  const manifest = await buildManifest(result);

  if (manifest.outputHash !== record.outputHash) {
    return {
      status: 'drifted',
      detail: `The re-run produced ${manifest.outputHash}, but the record says ${record.outputHash}.`,
      manifest,
    };
  }

  if (manifest.engine !== record.engine || manifest.dictionary !== record.dictionary) {
    return {
      status: 'engine-changed',
      detail: `The output reproduces exactly, but it now runs on ${manifest.engine} with ${manifest.dictionary} rather than ${record.engine} with ${record.dictionary}.`,
      manifest,
    };
  }

  return {
    status: 'reproduced',
    detail: `The run reproduces exactly: ${manifest.outputHash}.`,
    manifest,
  };
};
