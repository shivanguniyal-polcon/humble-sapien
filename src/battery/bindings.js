// Stage 2 bindings: the model settings that sit beside the data.
//
// The structured input remains the record of the data and the structure: a
// tree's probabilities, an MCDA weight, a transition matrix, a set of cash-flow
// lines. What lives here is the smaller set of settings a reader would change
// to test the same model: the discount rate, the Monte Carlo seed, the queue's
// server count. Every module declares a binding list, so the page can say
// plainly which settings are bound and which are part of the structure.
//
// Values shown by the UI are in display units (a discount rate of 5, not 0.05).
// applyBindings converts percentage fields back to the fraction the modules
// expect, so the JSON input and the report keep the engine's own units.

export const MODULE_BINDINGS = {
  'decision-tree': [
    {
      key: 'root',
      label: 'Root node',
      kind: 'select',
      optionsFrom: 'nodes',
      provenance: 'Declared by the analyst.',
      note: 'Which node opens the tree. The nodes, probabilities and payoffs stay in the structure.',
    },
  ],
  // CBA has a dedicated panel because its discount preset and sensitivity band
  // are a pair; its numeric fields are still hashed as parameters.
  cba: [],
  mcda: [
    {
      key: 'method',
      label: 'Scoring method',
      kind: 'select',
      default: 'weighted-sum',
      options: [
        { value: 'minmax', label: 'Min-max scaling' },
        { value: 'weighted-sum', label: 'Weighted sum' },
      ],
      provenance: 'Declared by the analyst.',
      note: 'Min-max scales each criterion to 0 to 1 and inverts cost criteria. Weights stay in the structure.',
    },
  ],
  scenario: [],
  cea: [
    {
      key: 'threshold',
      label: 'Willingness-to-pay threshold',
      kind: 'number',
      min: 1,
      step: 1000,
      unit: '₹ per unit of effect',
      provenance: 'Declared by the analyst.',
      note: 'The cost worth paying for one more unit of effect. The alternatives and their costs stay in the structure.',
    },
  ],
  'equity-cba': [
    {
      key: 'horizonYears',
      label: 'Horizon',
      kind: 'number',
      integer: true,
      min: 1,
      max: 50,
      step: 1,
      unit: 'years',
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'discountRate',
      label: 'Discount rate',
      kind: 'number',
      percent: true,
      min: 0,
      max: 100,
      step: 0.1,
      provenance: 'Declared by the analyst.',
    },
  ],
  markov: [
    {
      key: 'cycles',
      label: 'Cycles',
      kind: 'number',
      integer: true,
      min: 1,
      max: 100,
      step: 1,
      provenance: 'Declared by the analyst.',
      note: 'The transition matrix, costs and utilities stay in the structure.',
    },
    {
      key: 'cycleYears',
      label: 'Cycle length',
      kind: 'number',
      min: 0.01,
      max: 100,
      step: 0.5,
      unit: 'years',
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'discountRate',
      label: 'Discount rate',
      kind: 'number',
      percent: true,
      min: 0,
      max: 100,
      step: 0.1,
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'halfCycleCorrection',
      label: 'Half-cycle correction',
      kind: 'boolean',
      default: true,
      provenance: 'Declared by the analyst.',
      note: 'Weights the first and last cycle at 0.5, because people enter states part way through a cycle.',
    },
  ],
  'budget-impact': [
    {
      key: 'eligiblePopulation',
      label: 'Eligible population',
      kind: 'number',
      min: 1,
      step: 1,
      unit: 'persons',
      provenance: 'Declared by the analyst.',
      note: 'The yearly uptake, cost and offset arrays fix the horizon; this binds the population envelope.',
    },
    {
      key: 'populationGrowth',
      label: 'Population growth',
      kind: 'number',
      percent: true,
      min: -100,
      max: 100,
      step: 0.1,
      provenance: 'Declared by the analyst.',
    },
  ],
  'stakeholder-game': [],
  queueing: [
    {
      key: 'arrivalRate',
      label: 'Arrivals',
      kind: 'number',
      min: 0.0001,
      step: 1,
      unit: 'people per time unit',
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'serviceRate',
      label: 'Service rate',
      kind: 'number',
      min: 0.0001,
      step: 1,
      unit: 'people per server per time unit',
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'servers',
      label: 'Servers',
      kind: 'number',
      integer: true,
      min: 1,
      step: 1,
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'timeUnit',
      label: 'Time unit',
      kind: 'text',
      provenance: 'Declared by the analyst.',
      note: 'Hour, day or week: a waiting time without a unit is a number without a meaning.',
    },
  ],
  'monte-carlo': [
    {
      key: 'runs',
      label: 'Runs',
      kind: 'number',
      integer: true,
      min: 100,
      max: 100000,
      step: 100,
      sweep: false,
      provenance: 'Declared by the analyst.',
    },
    {
      key: 'seed',
      label: 'Seed',
      kind: 'number',
      integer: true,
      step: 1,
      sweep: false,
      provenance: 'Declared by the analyst.',
      note: 'The same seed and input replay the same draws. Change it only to run a different experiment.',
    },
  ],
};

const finite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Options can be fixed or drawn from the input, as the decision-tree root is.
export function bindingOptions(field, input) {
  if (field.optionsFrom === 'nodes' && Array.isArray(input && input.nodes)) {
    return input.nodes.map((node) => ({
      value: String(node.id),
      label: `${node.label || node.id} (${node.type || 'node'})`,
    }));
  }
  return field.options ?? [];
}

// The values the Stage 2 panel shows. Overrides are already in display units;
// values taken from the input are converted where the field is a percentage.
export function effectiveBindings(moduleId, input, overrides = {}) {
  const fields = MODULE_BINDINGS[moduleId] ?? [];
  const out = {};
  for (const field of fields) {
    let value;
    if (overrides && overrides[field.key] !== undefined && overrides[field.key] !== null) {
      value = overrides[field.key];
    } else if (input && input[field.key] !== undefined) {
      value = input[field.key];
      if (field.kind === 'number' && field.percent) {
        const number = finite(value);
        value = number == null ? value : number * 100;
      }
    } else {
      value = field.default;
    }

    if (field.kind === 'number') {
      const number = finite(value);
      out[field.key] = number == null ? value : number;
    } else if (field.kind === 'boolean') {
      out[field.key] = value === undefined ? true : Boolean(value);
    } else {
      out[field.key] = value == null ? '' : String(value);
    }
  }
  return out;
}

export function validateBindings(moduleId, values, input) {
  const errors = [];
  for (const field of MODULE_BINDINGS[moduleId] ?? []) {
    const value = values[field.key];
    if (field.kind === 'number') {
      if (!Number.isFinite(value)) {
        errors.push(`${field.label} must be a number.`);
        continue;
      }
      if (field.integer && !Number.isInteger(value)) {
        errors.push(`${field.label} must be a whole number.`);
      }
      if (field.min != null && value < field.min) {
        errors.push(`${field.label} must be at least ${field.min}${field.percent ? '%' : ''}.`);
      }
      if (field.max != null && value > field.max) {
        errors.push(`${field.label} must be at most ${field.max}${field.percent ? '%' : ''}.`);
      }
    } else if (field.kind === 'select') {
      const options = bindingOptions(field, input).map((option) => option.value);
      if (!options.includes(String(value))) {
        errors.push(`${field.label} must name one of the options in the structure.`);
      }
    } else if (field.kind === 'text') {
      if (!String(value ?? '').trim()) errors.push(`${field.label} cannot be empty.`);
    }
  }
  return errors;
}

// Copy the input and write only the bound settings. Percentage fields are
// converted back to fractions here, so the module never sees display units.
export function applyBindings(moduleId, input, values) {
  const next = { ...(input && typeof input === 'object' ? input : {}) };
  for (const field of MODULE_BINDINGS[moduleId] ?? []) {
    const value = values[field.key];
    if (value === undefined) continue;
    if (field.kind === 'number') {
      const number = finite(value);
      if (number != null) next[field.key] = field.percent ? number / 100 : number;
    } else {
      next[field.key] = value;
    }
  }
  return next;
}

export function formatBindingValue(field, value, input) {
  if (field.kind === 'number') {
    const number = finite(value);
    if (number == null) return 'n/a';
    if (field.percent) {
      return `${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
    }
    const shown = number.toLocaleString('en-IN', { maximumFractionDigits: 4 });
    return field.unit ? `${shown} ${field.unit}` : shown;
  }
  if (field.kind === 'boolean') return value ? 'Yes' : 'No';
  if (field.kind === 'select') {
    const option = bindingOptions(field, input).find((entry) => entry.value === String(value));
    return option ? option.label : String(value ?? '');
  }
  return String(value ?? '');
}

// The receipt the report prints, in the same shape as the CBA panel's.
export function bindingReceipt(moduleId, values, input) {
  const display = {};
  const meta = {};
  for (const field of MODULE_BINDINGS[moduleId] ?? []) {
    display[field.key] = formatBindingValue(field, values[field.key], input);
    meta[field.key] = {
      label: field.label,
      provenance: field.provenance || 'Declared by the analyst.',
      status: 'custom',
    };
  }
  return { values: display, meta };
}

// Every module gets a declared list, even when the list is empty. The Stage 2
// page can then distinguish "nothing separable to bind" from "not implemented".
export const moduleHasBindings = (moduleId) => (MODULE_BINDINGS[moduleId] ?? []).length > 0;
