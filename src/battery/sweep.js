// Stage 2 sensitivity sweeps: one setting, a range, and the same engine and
// manifest for every point.
//
// A sweep is not a chart of guesses. Each point is the full module run with the
// other Stage 2 values held, followed by the same SHA-256 manifest the Execute
// stage builds. That makes the movement visible twice: in the result, and in
// the hashes that prove each point is its own audit artefact.
//
// Only numeric policy settings are sweepable. Reproducibility settings (the
// Monte Carlo seed and run count) are marked sweep: false in the binding
// schema: changing them is a different experiment, not a sensitivity test.

import { MODULE_BINDINGS, applyBindings, bindingReceipt } from './bindings.js';
import { buildManifest } from './manifest.js';
import { DISCOUNT_PRESETS } from './params.js';

export const MAX_SWEEP_POINTS = 25;

// One result per module, chosen because it is the number the reader would
// quote, not because it is convenient to extract.
const inr = (value) => (value == null || !Number.isFinite(value)
  ? 'n/a'
  : `₹${Math.round(value).toLocaleString('en-IN')}`);

export const SWEEP_METRICS = {
  cba: {
    label: 'Net present value',
    value: (results) => results.npv,
    format: (value) => inr(value),
  },
  cea: {
    label: 'Best net monetary benefit',
    value: (results) => results.bestNmb,
    format: (value) => inr(value),
  },
  'equity-cba': {
    label: 'Equity-weighted net present value',
    value: (results) => results.weightedNpv,
    format: (value) => inr(value),
  },
  markov: {
    label: 'Cost per QALY',
    value: (results) => results.costPerQaly,
    format: (value) => (value == null ? 'n/a' : `${inr(value)} per QALY`),
  },
  'budget-impact': {
    label: 'Total net budget impact',
    value: (results) => results.totalNet,
    format: (value) => inr(value),
  },
  queueing: {
    label: 'Average wait',
    value: (results) => (results.stable ? results.wq : null),
    format: (value, results) => (value == null
      ? 'Unstable: no steady state'
      : `${Number(value).toFixed(2)} ${results.timeUnit}`),
  },
};

// Modules without a numeric Stage 2 policy setting say why, rather than
// offering a control that would only pretend to sweep something.
export const SWEEP_NOTES = {
  'decision-tree': 'The root node is categorical, and probabilities and payoffs live in the structure. There is no numeric Stage 2 setting to sweep.',
  mcda: 'The scoring method is categorical, and weights and scores live in the structure. There is no numeric Stage 2 setting to sweep.',
  scenario: 'The calibrated reference model is fixed. Scenario drivers belong to each scenario in the structure, so there is no single numeric setting here to sweep.',
  'stakeholder-game': 'The payoffs are the structure. There is no numeric Stage 2 setting to sweep.',
  'monte-carlo': 'The seed and run count are reproducibility settings, not policy assumptions. The module already reports the distribution across them; there is no policy parameter here to sweep.',
  cba: 'The discount rate and horizon are the two assumptions worth moving. The sensitivity band stays as set above.',
};

// CBA keeps its own panel rather than the generic binding list. These fields
// mirror that panel so the sweep uses the same values the run would.
export function sweepableFields(moduleId, values = {}) {
  if (moduleId === 'cba') {
    return [
      {
        key: 'discountRate',
        label: 'Discount rate',
        kind: 'number',
        percent: true,
        min: 0,
        max: 100,
        step: 0.1,
        current: values.discountRate == null ? null : Number(values.discountRate),
      },
      {
        key: 'horizonYears',
        label: 'Horizon',
        kind: 'number',
        integer: true,
        min: 1,
        max: 50,
        step: 1,
        unit: 'years',
        current: values.horizonYears == null ? null : Number(values.horizonYears),
      },
    ];
  }
  return (MODULE_BINDINGS[moduleId] ?? [])
    .filter((field) => field.kind === 'number' && field.sweep !== false)
    .map((field) => ({ ...field, current: Number(values[field.key]) }));
}

const decimals = (value) => {
  const text = String(value);
  return text.includes('.') ? text.split('.')[1].length : 0;
};

const roundTo = (value, places) => Number(value.toFixed(Math.min(8, Math.max(0, places))));

const align = (value, step, mode) => {
  const factor = 1 / step;
  const aligned = (mode === 'ceil' ? Math.ceil(value * factor) : Math.floor(value * factor)) / factor;
  return roundTo(aligned, Math.max(decimals(step), 6));
};

// A five-point bracket around the current value, kept inside the schema's
// bounds and on the field's own step. The reader can replace it; this is only
// a starting point that makes the first sweep useful without typing.
export function defaultSweepRange(field, current) {
  const step = Number.isFinite(field.step) && field.step > 0 ? field.step : 1;
  const shown = current == null ? NaN : Number(current);
  const base = Number.isFinite(shown) ? shown : (field.min ?? 0);
  const span = field.integer
    ? Math.max(Math.abs(base) * 0.25, step * 2)
    : Math.max(Math.abs(base) * 0.5, step * 4);

  let from = base - span;
  let to = base + span;
  if (field.min != null) from = Math.max(field.min, from);
  if (field.max != null) to = Math.min(field.max, to);
  from = align(from, step, 'ceil');
  to = align(to, step, 'floor');

  if (!(to > from)) {
    from = field.min != null ? field.min : roundTo(base - step, 6);
    to = field.max != null ? field.max : roundTo(base + step, 6);
  }
  if (!(to > from)) {
    from = roundTo(base - step, 6);
    to = roundTo(base + step, 6);
  }
  return { from, to, steps: 5 };
}

// Evenly spaced points, rounded to the field's arithmetic. Integer fields can
// collapse two requested points into one value; the warning says so instead of
// inventing a fractional server or cycle.
export function sweepValues(field, from, to, steps) {
  const errors = [];
  if (from == null || to == null) errors.push('Enter a start and an end for the range.');
  if (!Number.isInteger(steps) || steps < 2 || steps > MAX_SWEEP_POINTS) {
    errors.push(`Use a whole number of points from 2 to ${MAX_SWEEP_POINTS}.`);
  }
  if (errors.length > 0) return { values: [], errors, warnings: [] };
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    errors.push('Enter a numeric start and end for the range.');
  }
  if (errors.length > 0) return { values: [], errors, warnings: [] };
  if (field.min != null && (start < field.min || end < field.min)) {
    errors.push(`Keep the range within the field's minimum of ${field.min}.`);
  }
  if (field.max != null && (start > field.max || end > field.max)) {
    errors.push(`Keep the range within the field's maximum of ${field.max}.`);
  }
  if (!(end > start)) errors.push('The end of the range must be greater than the start.');
  if (errors.length > 0) return { values: [], errors, warnings: [] };

  const values = [];
  for (let i = 0; i < steps; i += 1) {
    const raw = start + ((end - start) * i) / (steps - 1);
    const point = field.integer ? Math.round(raw) : roundTo(raw, 6);
    if (values.length === 0 || values[values.length - 1] !== point) values.push(point);
  }

  if (values.length < 2) {
    return {
      values: [],
      errors: ['That range and point count produce fewer than two distinct values.'],
      warnings: [],
    };
  }
  const warnings = values.length < steps
    ? [`${steps} points requested; ${values.length} distinct ${field.integer ? 'whole ' : ''}values fit in this range.`]
    : [];
  return { values, errors: [], warnings };
}

// CBA's receipt lives beside its own panel. Building it here keeps the sweep
// and the normal run on one definition of the parameters.
export function cbaRunParams({
  discountPct, horizon, sensitivity, provenance, presetId, briefParams,
}) {
  const status = (DISCOUNT_PRESETS.find((preset) => preset.id === presetId) || {}).status || 'custom';
  const [lo, hi] = Array.isArray(sensitivity) ? sensitivity : [0, 5];
  return {
    discountRate: Number(discountPct) / 100,
    sensitivityLo: Number(lo) / 100,
    sensitivityHi: Number(hi) / 100,
    horizonYears: Number(horizon),
    values: {
      discountRate: `${discountPct}%`,
      horizonYears: Number(horizon),
      ...(briefParams?.values ?? {}),
    },
    meta: {
      discountRate: {
        label: 'Discount rate',
        provenance,
        status,
      },
      horizonYears: {
        label: 'Horizon (years)',
        provenance: 'Declared by the analyst.',
        status: 'custom',
      },
      ...(briefParams?.meta ?? {}),
    },
  };
}

export function cbaSweepPrepare({ input, ...state }) {
  return (fieldKey, point) => {
    const next = {
      ...state,
      discountPct: fieldKey === 'discountRate' ? point : state.discountPct,
      horizon: fieldKey === 'horizonYears' ? point : state.horizon,
    };
    return { input, params: cbaRunParams(next) };
  };
}

function bindingPrepare(moduleId, input, values, fieldKey, point) {
  const nextValues = { ...values, [fieldKey]: point };
  const boundInput = applyBindings(moduleId, input, nextValues);
  const fields = MODULE_BINDINGS[moduleId] ?? [];
  return {
    input: boundInput,
    params: {
      ...Object.fromEntries(fields.map((field) => [field.key, boundInput[field.key]])),
      ...bindingReceipt(moduleId, nextValues, boundInput),
    },
  };
}

// Run every point. The caller can supply prepare(fieldKey, point) for a module
// whose parameters live outside the generic binding list (CBA); otherwise the
// bound copy of the input is built exactly as Execute does.
export async function runSweep({
  module, moduleId, input, values = {}, fieldKey, points, prepare,
}) {
  const metric = SWEEP_METRICS[moduleId];
  if (!metric) return { errors: [`No sensitivity metric is declared for ${moduleId}.`], rows: [] };
  if (!Array.isArray(points) || points.length < 2) {
    return { errors: ['A sweep needs at least two points.'], rows: [] };
  }

  const rows = [];
  for (const point of points) {
    const prepared = prepare
      ? prepare(fieldKey, point)
      : bindingPrepare(moduleId, input, values, fieldKey, point);
    if (!prepared || !prepared.input || !prepared.params) {
      return { errors: [`Could not prepare the run at ${fieldKey} = ${point}.`], rows: [] };
    }
    const check = typeof module.validate === 'function' ? module.validate(prepared.input) : { errors: [] };
    if (check.errors.length > 0) {
      return { errors: [`At ${fieldKey} = ${point}: ${check.errors.join(' ')}`], rows: [] };
    }
    let results;
    try {
      results = module.run(prepared.input, prepared.params);
    } catch (error) {
      return { errors: [`At ${fieldKey} = ${point}: ${error.message}`], rows: [] };
    }
    const manifest = await buildManifest({
      module: moduleId,
      input: prepared.input,
      params: prepared.params,
      results,
    });
    const metricValue = metric.value(results);
    rows.push({
      point,
      input: prepared.input,
      params: prepared.params,
      results,
      manifest,
      metricValue,
      metricText: metric.format(metricValue, results),
    });
  }

  return {
    rows,
    metricLabel: metric.label,
    fieldKey,
    distinct: {
      results: new Set(rows.map((row) => row.metricText)).size,
      inputs: new Set(rows.map((row) => row.manifest.inputHash)).size,
      params: new Set(rows.map((row) => row.manifest.paramHash)).size,
      outputs: new Set(rows.map((row) => row.manifest.outputHash)).size,
    },
  };
}

export function formatSweepValue(field, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  const text = number.toLocaleString('en-IN', {
    maximumFractionDigits: field.integer ? 0 : 4,
  });
  return field.percent ? `${text}%` : text;
}

export function sweepFieldLabel(field) {
  if (field.percent) return `${field.label} (%)`;
  return field.unit ? `${field.label} (${field.unit})` : field.label;
}
