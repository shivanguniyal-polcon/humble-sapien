// Stage 0 to stage 2 bridge: turn an ingested tabular dataset into a module
// input, deterministically. The CBA accepts schedule rows; the decision tree
// needs structured JSON and says so rather than pretending a flat file is a
// tree.

// Expected columns (names are matched loosely, case-insensitive):
//   line_id, label, kind (cost|benefit), group, year, value
//   optional: priced (true/false), effect, unit, who  (for unpriced ledger rows)
export function cbaFromRows(dataset, { title = 'Imported analysis', horizonYears } = {}) {
  const notes = [];
  const idx = (name) => {
    const i = dataset.columns.findIndex((c) => c.toLowerCase().replace(/\s+/g, '_') === name);
    return i;
  };
  const cols = {
    id: idx('line_id') >= 0 ? idx('line_id') : idx('id'),
    label: idx('label'),
    kind: idx('kind'),
    group: idx('group'),
    year: idx('year'),
    value: idx('value'),
    priced: idx('priced'),
    effect: idx('effect'),
    unit: idx('unit'),
    who: idx('who'),
  };
  const required = ['id', 'label', 'kind', 'year', 'value'];
  const missing = required.filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a cost-benefit schedule: ${missing.join(', ')}. Expected: line_id, label, kind, group, year, value.`],
    };
  }

  const lines = new Map();
  for (const row of dataset.rows) {
    const id = (row[cols.id] || '').trim();
    if (id === '') continue;
    const pricedRaw = cols.priced >= 0 ? (row[cols.priced] || '').trim().toLowerCase() : 'true';
    const priced = !(pricedRaw === 'false' || pricedRaw === '0' || pricedRaw === 'no');
    if (!lines.has(id)) {
      lines.set(id, {
        id,
        label: (row[cols.label] || id).trim(),
        kind: (row[cols.kind] || '').trim().toLowerCase(),
        group: cols.group >= 0 ? (row[cols.group] || '').trim() : '',
        priced,
        schedule: [],
        effect: cols.effect >= 0 ? (row[cols.effect] || '').trim() : '',
        unit: cols.unit >= 0 ? (row[cols.unit] || '').trim() : '',
        who: cols.who >= 0 ? (row[cols.who] || '').trim() : '',
      });
      continue;
    }
    const line = lines.get(id);
    if (!priced) line.priced = false;
    if (!line.effect && cols.effect >= 0) line.effect = (row[cols.effect] || '').trim();
    if (!line.who && cols.who >= 0) line.who = (row[cols.who] || '').trim();
    if (!line.unit && cols.unit >= 0) line.unit = (row[cols.unit] || '').trim();
  }

  let maxYear = 0;
  for (const row of dataset.rows) {
    const id = (row[cols.id] || '').trim();
    if (id === '' || !lines.has(id)) continue;
    const line = lines.get(id);
    const year = Number((row[cols.year] || '').trim());
    const value = Number((row[cols.value] || '').replace(/,/g, '').trim());
    if (line.priced) {
      if (!Number.isInteger(year) || !Number.isFinite(value)) {
        notes.push(`Row for "${id}" has an unusable year or value and was skipped.`);
        continue;
      }
      line.schedule.push({ year, value });
      if (year > maxYear) maxYear = year;
    }
  }

  const input = {
    title,
    baseYear: new Date().getFullYear(),
    horizonYears: horizonYears || Math.max(maxYear, 1),
    lines: [...lines.values()].map((l) => (l.priced ? l : { ...l, schedule: [] })),
  };
  notes.push(`Built ${input.lines.length} line items from ${dataset.rowCount} rows over a ${input.horizonYears}-year horizon.`);
  return { input, notes };
}

// MCDA rows: one row per alternative per criterion.
// Expected columns (matched loosely, case-insensitive):
//   alternative, criterion, score, weight, direction (benefit|cost)
//   optional: alt_label, crit_label, group, who, method,
//             pit_group, pit_effect, pit_note
export function mcdaFromRows(dataset, { title = 'Imported comparison' } = {}) {
  const notes = [];
  const idx = (name) => dataset.columns.findIndex((c) => c.toLowerCase().replace(/\s+/g, '_') === name);
  const cols = {
    alternative: idx('alternative'),
    criterion: idx('criterion'),
    score: idx('score'),
    weight: idx('weight'),
    direction: idx('direction'),
    altLabel: idx('alt_label') >= 0 ? idx('alt_label') : idx('alternative_label'),
    critLabel: idx('crit_label') >= 0 ? idx('crit_label') : idx('criterion_label'),
    group: idx('group'),
    who: idx('who'),
    method: idx('method'),
    pitGroup: idx('pit_group'),
    pitEffect: idx('pit_effect'),
    pitNote: idx('pit_note'),
  };
  const missing = ['alternative', 'criterion', 'score', 'weight', 'direction'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a multi-criteria comparison: ${missing.join(', ')}. Expected: alternative, criterion, score, weight, direction.`],
    };
  }

  const criteria = new Map();
  const alternatives = new Map();
  for (const row of dataset.rows) {
    const cid = (row[cols.criterion] || '').trim();
    const aid = (row[cols.alternative] || '').trim();
    if (cid === '' || aid === '') continue;
    if (!criteria.has(cid)) {
      criteria.set(cid, {
        id: cid,
        label: (cols.critLabel >= 0 ? row[cols.critLabel] || '' : '').trim() || cid,
        weight: Number((row[cols.weight] || '').replace(/,/g, '').trim()),
        direction: (row[cols.direction] || '').trim().toLowerCase(),
        group: cols.group >= 0 ? (row[cols.group] || '').trim() : '',
        who: cols.who >= 0 ? (row[cols.who] || '').trim() : '',
      });
    } else {
      const c = criteria.get(cid);
      const w = Number((row[cols.weight] || '').replace(/,/g, '').trim());
      if (Number.isFinite(w) && Math.abs(w - c.weight) > 1e-9) {
        notes.push(`Criterion "${cid}" carries two different weights (${c.weight} and ${w}). The first row's weight is used.`);
      }
    }
    if (!alternatives.has(aid)) {
      alternatives.set(aid, {
        id: aid,
        label: (cols.altLabel >= 0 ? row[cols.altLabel] || '' : '').trim() || aid,
        scores: {},
        pit: cols.pitGroup >= 0 && (row[cols.pitGroup] || '').trim()
          ? {
              group: (row[cols.pitGroup] || '').trim(),
              effect: cols.pitEffect >= 0 ? (row[cols.pitEffect] || '').trim() : '',
              note: cols.pitNote >= 0 ? (row[cols.pitNote] || '').trim() : '',
            }
          : null,
      });
    }
    const score = Number((row[cols.score] || '').replace(/,/g, '').trim());
    if (!Number.isFinite(score)) {
      notes.push(`Score for "${aid}" on "${cid}" is not a number and was skipped.`);
      continue;
    }
    alternatives.get(aid).scores[cid] = score;
  }

  const method = cols.method >= 0
    ? ((dataset.rows[0] || [])[cols.method] || '').trim().toLowerCase()
    : '';
  const input = {
    title,
    method: method === 'minmax' ? 'minmax' : 'weighted-sum',
    criteria: [...criteria.values()],
    alternatives: [...alternatives.values()],
  };
  notes.push(`Built ${input.alternatives.length} alternatives and ${input.criteria.length} criteria from ${dataset.rowCount} rows.`);
  return { input, notes };
}

// Scenario rows: one row per scenario per driver.
// Expected columns (matched loosely, case-insensitive):
//   scenario_id, scenario_label, driver, value
//   optional: model, pit_group, pit_effect, pit_note
export function scenarioFromRows(dataset, { title = 'Imported scenarios' } = {}) {
  const notes = [];
  const idx = (name) => dataset.columns.findIndex((c) => c.toLowerCase().replace(/\s+/g, '_') === name);
  const cols = {
    id: idx('scenario_id') >= 0 ? idx('scenario_id') : idx('scenario'),
    label: idx('scenario_label') >= 0 ? idx('scenario_label') : idx('label'),
    driver: idx('driver'),
    value: idx('value'),
    pitGroup: idx('pit_group'),
    pitEffect: idx('pit_effect'),
    pitNote: idx('pit_note'),
  };
  const missing = ['id', 'driver', 'value'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for scenario drivers: ${missing.join(', ')}. Expected: scenario_id, scenario_label, driver, value.`],
    };
  }
  const scenarios = new Map();
  for (const row of dataset.rows) {
    const sid = (row[cols.id] || '').trim();
    if (sid === '') continue;
    if (!scenarios.has(sid)) {
      scenarios.set(sid, {
        id: sid,
        label: (cols.label >= 0 ? (row[cols.label] || '').trim() : '') || sid,
        drivers: {},
        pit: cols.pitGroup >= 0 && (row[cols.pitGroup] || '').trim()
          ? {
              group: (row[cols.pitGroup] || '').trim(),
              effect: cols.pitEffect >= 0 ? (row[cols.pitEffect] || '').trim() : '',
              note: cols.pitNote >= 0 ? (row[cols.pitNote] || '').trim() : '',
            }
          : null,
      });
    }
    const driver = (row[cols.driver] || '').trim();
    const value = Number((row[cols.value] || '').replace(/,/g, '').trim());
    if (driver === '' || !Number.isFinite(value)) {
      notes.push(`Driver row for "${sid}" has an unusable driver or value and was skipped.`);
      continue;
    }
    scenarios.get(sid).drivers[driver] = value;
  }
  const input = { title, model: 'pmjay-calibrated', scenarios: [...scenarios.values()] };
  notes.push(`Built ${input.scenarios.length} scenarios from ${dataset.rowCount} rows. Unlisted drivers keep the calibrated reference-case values.`);
  return { input, notes };
}

export const TREE_CSV_NOTE =
  'A decision tree cannot be expressed as a flat table. Use the structured JSON input (see the sample) or the sample loader.';

// ---- Adapters for the remaining modules ----
// Same contract as the three above: { input, notes }. A tabular dataset goes
// in; the module's structured input comes out, or input: null and notes that
// name exactly which columns were missing. Nothing is guessed silently.

const loose = (dataset, name) =>
  dataset.columns.findIndex((c) => c.toLowerCase().replace(/\s+/g, '_') === name);
const cell = (row, i) => (i >= 0 ? String(row[i] == null ? '' : row[i]).trim() : '');
// Blank is not zero: empty cells parse as missing (NaN), never as 0.
const num = (s) => {
  const t = String(s == null ? '' : s).replace(/,/g, '').trim();
  return t === '' ? NaN : Number(t);
};
const list = (s) => String(s == null ? '' : s).split(/[;|]/).map((x) => x.trim()).filter((x) => x !== '');
const truthy = (s) => ['true', 'yes', 'y', '1', 'root', 'x'].includes(String(s || '').trim().toLowerCase());
const firstNum = (dataset, rows, i) => {
  for (const row of rows) {
    const v = num(cell(row, i));
    if (Number.isFinite(v)) return v;
  }
  return NaN;
};
const firstText = (dataset, i) => {
  for (const row of dataset.rows) {
    const v = cell(row, i);
    if (v !== '') return v;
  }
  return '';
};

function pitFrom(row, cols) {
  return cell(row, cols.pitGroup)
    ? { group: cell(row, cols.pitGroup), effect: cell(row, cols.pitEffect), note: cell(row, cols.pitNote) }
    : null;
}

// Decision tree rows: one row per node, an adjacency list.
// Expected columns: node_id, node_type (decision|chance|terminal), label,
//   children (id;id), probs (0.6;0.4), payoff, root (true on one row),
//   pit_group, pit_effect, pit_note
export function decisionTreeFromRows(dataset, { title = 'Imported tree' } = {}) {
  const notes = [];
  const cols = {
    id: loose(dataset, 'node_id') >= 0 ? loose(dataset, 'node_id') : loose(dataset, 'id'),
    type: loose(dataset, 'node_type') >= 0 ? loose(dataset, 'node_type') : loose(dataset, 'type'),
    label: loose(dataset, 'label'),
    children: loose(dataset, 'children'),
    probs: loose(dataset, 'probs'),
    payoff: loose(dataset, 'payoff'),
    root: loose(dataset, 'root'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['id', 'type'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a tree: ${missing.join(', ')}. Expected: node_id, node_type, label, children (id;id), probs (p;p), payoff, root.`],
    };
  }
  const nodes = [];
  const seen = new Set();
  let rootId = null;
  for (const row of dataset.rows) {
    const id = cell(row, cols.id);
    if (id === '') continue;
    if (seen.has(id)) {
      notes.push(`Node "${id}" appears more than once; the first row is used.`);
      continue;
    }
    seen.add(id);
    const type = cell(row, cols.type).toLowerCase();
    const children = cols.children >= 0 ? list(cell(row, cols.children)) : [];
    const probs = cols.probs >= 0 ? list(cell(row, cols.probs)).map(Number) : [];
    const node = {
      id,
      type: type === 'end' ? 'terminal' : type,
      label: cell(row, cols.label) || id,
      children,
      probs: type === 'chance' ? probs : [],
    };
    if (type === 'terminal') {
      const payoff = num(cell(row, cols.payoff));
      if (Number.isFinite(payoff)) node.payoff = payoff;
      else notes.push(`Terminal node "${id}" has no usable payoff yet; the validator will reject it.`);
    }
    const pit = pitFrom(row, cols);
    if (pit) node.pit = pit;
    nodes.push(node);
    if (cols.root >= 0 && truthy(cell(row, cols.root))) rootId = id;
  }
  if (nodes.length === 0) {
    return { input: null, notes: ['No node rows found. One row per node: node_id, node_type, label, children, probs, payoff.'] };
  }
  if (!rootId) {
    const referenced = new Set(nodes.flatMap((n) => n.children));
    const candidate = nodes.find((n) => !referenced.has(n.id));
    rootId = candidate ? candidate.id : nodes[0].id;
    notes.push(`No root column value found. The root is "${rootId}" (the node nothing points at); mark the intended root in a root column to override.`);
  }
  notes.push(`Built ${nodes.length} nodes from ${dataset.rowCount} rows. Children and probabilities are semicolon-separated within a cell.`);
  return { input: { title, root: rootId, nodes }, notes };
}

// Cost-effectiveness rows: one row per alternative; threshold and unit are
// constants read from any row.
// Expected columns: alternative, label, cost, effect, threshold, effect_unit,
//   pit_group, pit_effect, pit_note
export function ceaFromRows(dataset, { title = 'Imported options' } = {}) {
  const notes = [];
  const cols = {
    id: loose(dataset, 'alternative') >= 0 ? loose(dataset, 'alternative') : loose(dataset, 'id'),
    label: loose(dataset, 'label'),
    cost: loose(dataset, 'cost'),
    effect: loose(dataset, 'effect'),
    threshold: loose(dataset, 'threshold'),
    effectUnit: loose(dataset, 'effect_unit'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['id', 'cost', 'effect', 'threshold'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for cost-effectiveness options: ${missing.join(', ')}. Expected: alternative, label, cost, effect, threshold (same on every row), effect_unit.`],
    };
  }
  const threshold = firstNum(dataset, dataset.rows, cols.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return { input: null, notes: ['The threshold column has no positive number. It is the price at which one unit of effect is worth buying; state it on every row.'] };
  }
  const alternatives = [];
  for (const row of dataset.rows) {
    const id = cell(row, cols.id);
    if (id === '') continue;
    const alt = {
      id,
      label: cell(row, cols.label) || id,
      cost: num(cell(row, cols.cost)),
      effect: num(cell(row, cols.effect)),
    };
    const pit = pitFrom(row, cols);
    if (pit) alt.pit = pit;
    alternatives.push(alt);
  }
  const effectUnit = cols.effectUnit >= 0 ? firstText(dataset, cols.effectUnit) : '';
  const input = { title, threshold, alternatives };
  if (effectUnit) input.effectUnit = effectUnit;
  notes.push(`Built ${alternatives.length} alternatives at a threshold of ${threshold}${effectUnit ? ` per ${effectUnit}` : ''}.`);
  return { input, notes };
}

// Equity CBA rows: one row per line per year, with group attributes as
// constants on the group's rows.
// Expected columns: line_id, label, kind (cost|benefit), group_id, group_label,
//   population_share, weight, year, value, horizon_years, discount_rate,
//   pit_group, pit_effect, pit_note (on the group's rows)
export function equityFromRows(dataset, { title = 'Imported distributional analysis' } = {}) {
  const notes = [];
  const cols = {
    id: loose(dataset, 'line_id') >= 0 ? loose(dataset, 'line_id') : loose(dataset, 'id'),
    label: loose(dataset, 'label'),
    kind: loose(dataset, 'kind'),
    group: loose(dataset, 'group_id') >= 0 ? loose(dataset, 'group_id') : loose(dataset, 'group'),
    groupLabel: loose(dataset, 'group_label'),
    share: loose(dataset, 'population_share'),
    weight: loose(dataset, 'weight'),
    year: loose(dataset, 'year'),
    value: loose(dataset, 'value'),
    horizon: loose(dataset, 'horizon_years'),
    rate: loose(dataset, 'discount_rate'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['id', 'kind', 'group', 'year', 'value', 'horizon', 'rate'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a distributional schedule: ${missing.join(', ')}. Expected: line_id, label, kind, group_id, group_label, population_share, weight, year, value, horizon_years, discount_rate.`],
    };
  }
  const horizonYears = firstNum(dataset, dataset.rows, cols.horizon);
  const discountRate = firstNum(dataset, dataset.rows, cols.rate);
  if (!Number.isInteger(horizonYears) || horizonYears < 1 || !Number.isFinite(discountRate) || discountRate < 0) {
    return { input: null, notes: ['horizon_years must be a positive whole number and discount_rate a non-negative number; give both on every row.'] };
  }
  const groups = new Map();
  const lines = new Map();
  for (const row of dataset.rows) {
    const gid = cell(row, cols.group);
    const lid = cell(row, cols.id);
    if (gid === '' || lid === '') continue;
    if (!groups.has(gid)) {
      groups.set(gid, {
        id: gid,
        label: cell(row, cols.groupLabel) || gid,
        populationShare: num(cell(row, cols.share)),
        pit: pitFrom(row, cols),
      });
      const w = num(cell(row, cols.weight));
      if (Number.isFinite(w)) groups.get(gid).weight = w;
    }
    if (!lines.has(lid)) {
      lines.set(lid, {
        id: lid,
        label: cell(row, cols.label) || lid,
        kind: cell(row, cols.kind).toLowerCase(),
        group: gid,
        schedule: [],
      });
    }
    const year = num(cell(row, cols.year));
    const value = num(cell(row, cols.value));
    if (!Number.isInteger(year) || !Number.isFinite(value)) {
      notes.push(`Row for "${lid}" has an unusable year or value and was skipped.`);
      continue;
    }
    lines.get(lid).schedule.push({ year, value });
  }
  for (const l of lines.values()) {
    l.schedule.sort((a, b) => a.year - b.year);
    if (l.schedule.length === 0) notes.push(`Line "${l.id}" has no usable schedule rows.`);
  }
  const input = {
    title,
    horizonYears,
    discountRate,
    groups: [...groups.values()],
    lines: [...lines.values()],
  };
  notes.push(`Built ${groups.size} groups and ${lines.size} lines over a ${horizonYears}-year horizon from ${dataset.rowCount} rows.`);
  return { input, notes };
}

// Markov rows: one row per state, with one transition column per state (the
// column is named after the destination state id).
// Expected columns: state, label, cost_per_cycle, utility_per_cycle, absorbing,
//   initial, cycles, cycle_years, discount_rate, half_cycle_correction,
//   pit_group, pit_effect, pit_note, plus one column per state id.
export function markovFromRows(dataset, { title = 'Imported cohort model' } = {}) {
  const notes = [];
  const cols = {
    id: loose(dataset, 'state') >= 0 ? loose(dataset, 'state') : loose(dataset, 'id'),
    label: loose(dataset, 'label'),
    cost: loose(dataset, 'cost_per_cycle'),
    utility: loose(dataset, 'utility_per_cycle'),
    absorbing: loose(dataset, 'absorbing'),
    initial: loose(dataset, 'initial'),
    cycles: loose(dataset, 'cycles'),
    cycleYears: loose(dataset, 'cycle_years'),
    rate: loose(dataset, 'discount_rate'),
    hcc: loose(dataset, 'half_cycle_correction'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['id', 'cost', 'utility', 'initial', 'cycles', 'cycleYears', 'rate'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a cohort model: ${missing.join(', ')}. Expected: state, label, cost_per_cycle, utility_per_cycle, absorbing, initial, cycles, cycle_years, discount_rate, and one transition column per state.`],
    };
  }
  const states = [];
  const rowsById = new Map();
  for (const row of dataset.rows) {
    const id = cell(row, cols.id);
    if (id === '' || rowsById.has(id)) continue;
    rowsById.set(id, row);
    const s = {
      id,
      label: cell(row, cols.label) || id,
      costPerCycle: num(cell(row, cols.cost)),
      utilityPerCycle: num(cell(row, cols.utility)),
    };
    if (truthy(cell(row, cols.absorbing))) s.absorbing = true;
    states.push(s);
  }
  if (states.length < 2) {
    return { input: null, notes: ['At least two state rows are required: one row per state, transition columns named after the state ids.'] };
  }
  const transitions = states.map((s) => {
    const row = rowsById.get(s.id);
    return states.map((t) => {
      const i = loose(dataset, t.id);
      return i >= 0 ? num(cell(row, i)) : NaN;
    });
  });
  transitions.forEach((r, i) => {
    if (r.some((p) => !Number.isFinite(p))) {
      notes.push(`Transition row "${states[i].id}" is missing a value in one of the state columns; the validator will reject it.`);
    }
  });
  const initial = states.map((s) => num(cell(rowsById.get(s.id), cols.initial)));
  const cycles = firstNum(dataset, dataset.rows, cols.cycles);
  const cycleYears = firstNum(dataset, dataset.rows, cols.cycleYears);
  const discountRate = firstNum(dataset, dataset.rows, cols.rate);
  const hccRaw = cols.hcc >= 0 ? firstText(dataset, cols.hcc).toLowerCase() : '';
  const input = {
    title,
    cycles,
    cycleYears,
    discountRate,
    states,
    transitions,
    initial,
  };
  if (['true', 'yes'].includes(hccRaw)) input.halfCycleCorrection = true;
  if (['false', 'no'].includes(hccRaw)) input.halfCycleCorrection = false;
  const pit = pitFrom(dataset.rows[0] || [], cols);
  if (pit) input.pit = pit;
  notes.push(`Built ${states.length} states from ${states.length} rows; transition columns were matched by state id.`);
  return { input, notes };
}

// Budget impact rows: one row per line per year (long format).
// Expected columns: line_type (uptake|per_patient_cost|offset), label (for
//   offsets), year (1-based), value, horizon_years, eligible_population,
//   population_growth, pit_group, pit_effect, pit_note
export function budgetImpactFromRows(dataset, { title = 'Imported budget impact' } = {}) {
  const notes = [];
  const cols = {
    type: loose(dataset, 'line_type') >= 0 ? loose(dataset, 'line_type') : loose(dataset, 'type'),
    label: loose(dataset, 'label'),
    year: loose(dataset, 'year'),
    value: loose(dataset, 'value'),
    horizon: loose(dataset, 'horizon_years'),
    population: loose(dataset, 'eligible_population'),
    growth: loose(dataset, 'population_growth'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['type', 'year', 'value', 'horizon', 'population', 'growth'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for budget impact: ${missing.join(', ')}. Expected: line_type (uptake|per_patient_cost|offset), label, year, value, horizon_years, eligible_population, population_growth.`],
    };
  }
  const horizonYears = firstNum(dataset, dataset.rows, cols.horizon);
  if (!Number.isInteger(horizonYears) || horizonYears < 1 || horizonYears > 5) {
    return { input: null, notes: ['horizon_years must be a whole number from 1 to 5. Budget impact is a short-horizon instrument.'] };
  }
  const uptake = new Array(horizonYears).fill(NaN);
  const perPatientCost = new Array(horizonYears).fill(NaN);
  const offsets = new Map();
  for (const row of dataset.rows) {
    const type = cell(row, cols.type).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    const year = num(cell(row, cols.year));
    const value = num(cell(row, cols.value));
    if (!Number.isInteger(year) || year < 1 || year > horizonYears || !Number.isFinite(value)) {
      if (cell(row, cols.type) !== '') notes.push(`A ${type || 'row'} row has an unusable year or value and was skipped.`);
      continue;
    }
    if (type === 'uptake') uptake[year - 1] = value;
    else if (type === 'per_patient_cost' || type === 'perpatientcost') perPatientCost[year - 1] = value;
    else if (type === 'offset') {
      const label = cell(row, cols.label) || 'Offset';
      if (!offsets.has(label)) offsets.set(label, { label, perPatient: new Array(horizonYears).fill(0) });
      offsets.get(label).perPatient[year - 1] = value;
    } else {
      notes.push(`Unknown line_type "${type}" on year ${year}; expected uptake, per_patient_cost or offset.`);
    }
  }
  const input = {
    title,
    horizonYears,
    eligiblePopulation: firstNum(dataset, dataset.rows, cols.population),
    populationGrowth: firstNum(dataset, dataset.rows, cols.growth),
    uptake,
    perPatientCost,
    offsets: [...offsets.values()],
  };
  const pit = pitFrom(dataset.rows[0] || [], cols);
  if (pit) input.pit = pit;
  notes.push(`Built a ${horizonYears}-year schedule with ${offsets.size} offset line(s) from ${dataset.rowCount} rows.`);
  return { input, notes };
}

// Stakeholder game rows: one row per grid cell.
// Expected columns: row_strategy, col_strategy, payoff_row, payoff_col,
//   player_row, player_col, pit_group, pit_effect, pit_note
export function gameTheoryFromRows(dataset, { title = 'Imported game' } = {}) {
  const notes = [];
  const cols = {
    rowStrategy: loose(dataset, 'row_strategy') >= 0 ? loose(dataset, 'row_strategy') : loose(dataset, 'row'),
    colStrategy: loose(dataset, 'col_strategy') >= 0 ? loose(dataset, 'col_strategy') : loose(dataset, 'col'),
    payoffRow: loose(dataset, 'payoff_row') >= 0 ? loose(dataset, 'payoff_row') : loose(dataset, 'payoff_1'),
    payoffCol: loose(dataset, 'payoff_col') >= 0 ? loose(dataset, 'payoff_col') : loose(dataset, 'payoff_2'),
    playerRow: loose(dataset, 'player_row'),
    playerCol: loose(dataset, 'player_col'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['rowStrategy', 'colStrategy', 'payoffRow', 'payoffCol'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a payoff grid: ${missing.join(', ')}. Expected: row_strategy, col_strategy, payoff_row, payoff_col, player_row, player_col.`],
    };
  }
  const rowStrategies = [];
  const colStrategies = [];
  const outcomes = [];
  const seen = new Set();
  for (const row of dataset.rows) {
    const rs = cell(row, cols.rowStrategy);
    const cs = cell(row, cols.colStrategy);
    if (rs === '' || cs === '') continue;
    if (!rowStrategies.includes(rs)) rowStrategies.push(rs);
    if (!colStrategies.includes(cs)) colStrategies.push(cs);
    const key = `${rs}:${cs}`;
    if (seen.has(key)) {
      notes.push(`The cell (${rs}, ${cs}) appears more than once; the first row is used.`);
      continue;
    }
    seen.add(key);
    const outcome = {
      row: rowStrategies.indexOf(rs),
      col: colStrategies.indexOf(cs),
      payoffs: [num(cell(row, cols.payoffRow)), num(cell(row, cols.payoffCol))],
    };
    const pit = pitFrom(row, cols);
    if (pit) outcome.pit = pit;
    outcomes.push(outcome);
  }
  if (rowStrategies.length < 2 || colStrategies.length < 2) {
    return { input: null, notes: ['A two-player game needs at least two distinct row strategies and two distinct column strategies.'] };
  }
  const input = {
    title,
    players: [
      { id: 'row', label: cols.playerRow >= 0 ? firstText(dataset, cols.playerRow) || 'Row player' : 'Row player', strategies: rowStrategies },
      { id: 'col', label: cols.playerCol >= 0 ? firstText(dataset, cols.playerCol) || 'Column player' : 'Column player', strategies: colStrategies },
    ],
    outcomes,
  };
  const missingCells = rowStrategies.length * colStrategies.length - outcomes.length;
  if (missingCells > 0) notes.push(`${missingCells} grid cell(s) have no row; the validator will reject the incomplete grid.`);
  notes.push(`Built a ${rowStrategies.length}x${colStrategies.length} grid from ${dataset.rowCount} rows.`);
  return { input, notes };
}

// Queueing rows: one scenario per row; this run uses the first.
// Expected columns: arrival_rate, service_rate, servers, time_unit,
//   pit_group, pit_effect, pit_note
export function queueingFromRows(dataset, { title = 'Imported queue' } = {}) {
  const notes = [];
  const cols = {
    arrival: loose(dataset, 'arrival_rate') >= 0 ? loose(dataset, 'arrival_rate') : loose(dataset, 'arrivals'),
    service: loose(dataset, 'service_rate') >= 0 ? loose(dataset, 'service_rate') : loose(dataset, 'services'),
    servers: loose(dataset, 'servers') >= 0 ? loose(dataset, 'servers') : loose(dataset, 'server_count'),
    timeUnit: loose(dataset, 'time_unit') >= 0 ? loose(dataset, 'time_unit') : loose(dataset, 'unit'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['arrival', 'service', 'servers'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a queue: ${missing.join(', ')}. Expected: arrival_rate, service_rate, servers, time_unit.`],
    };
  }
  const row = dataset.rows.find((r) => cell(r, cols.arrival) !== '') || dataset.rows[0];
  const input = {
    title,
    arrivalRate: num(cell(row, cols.arrival)),
    serviceRate: num(cell(row, cols.service)),
    servers: num(cell(row, cols.servers)),
    timeUnit: cell(row, cols.timeUnit) || undefined,
  };
  const pit = pitFrom(row, cols);
  if (pit) input.pit = pit;
  if (dataset.rowCount > 1) {
    notes.push(`${dataset.rowCount} scenario rows found; the queueing module runs one scenario at a time, so this run uses the first. Re-paste with one row to run the others.`);
  }
  notes.push('Rates must share the time unit. If arrivals are bursty in practice, treat the reported wait as the floor.');
  return { input, notes };
}

// Monte Carlo rows: one row per uncertain variable; runs and seed are
// constants read from any row.
// Expected columns: variable_id, label, kind (cost|benefit), dist (uniform|
//   normal|lognormal|beta|triangular), min, max, mean, sd, mu, sigma, alpha,
//   beta, mode, scale, runs, seed, pit_group, pit_effect, pit_note
export function monteCarloFromRows(dataset, { title = 'Imported risk model' } = {}) {
  const notes = [];
  const cols = {
    id: loose(dataset, 'variable_id') >= 0 ? loose(dataset, 'variable_id') : loose(dataset, 'id'),
    label: loose(dataset, 'label'),
    kind: loose(dataset, 'kind'),
    dist: loose(dataset, 'dist') >= 0 ? loose(dataset, 'dist') : loose(dataset, 'distribution'),
    min: loose(dataset, 'min'),
    max: loose(dataset, 'max'),
    mean: loose(dataset, 'mean'),
    sd: loose(dataset, 'sd'),
    mu: loose(dataset, 'mu'),
    sigma: loose(dataset, 'sigma'),
    alpha: loose(dataset, 'alpha'),
    beta: loose(dataset, 'beta'),
    mode: loose(dataset, 'mode'),
    scale: loose(dataset, 'scale'),
    runs: loose(dataset, 'runs'),
    seed: loose(dataset, 'seed'),
    pitGroup: loose(dataset, 'pit_group'),
    pitEffect: loose(dataset, 'pit_effect'),
    pitNote: loose(dataset, 'pit_note'),
  };
  const missing = ['id', 'kind', 'dist', 'runs', 'seed'].filter((k) => cols[k] < 0);
  if (missing.length > 0) {
    return {
      input: null,
      notes: [`Missing columns for a risk model: ${missing.join(', ')}. Expected: variable_id, label, kind, dist, its parameters (min/max, mean/sd, mu/sigma, alpha/beta, min/mode/max), scale, runs, seed.`],
    };
  }
  const param = (row, key) => {
    const v = num(cell(row, cols[key]));
    return Number.isFinite(v) ? v : undefined;
  };
  const variables = [];
  for (const row of dataset.rows) {
    const id = cell(row, cols.id);
    if (id === '') continue;
    const distName = cell(row, cols.dist).toLowerCase();
    const d = { dist: distName };
    for (const key of ['min', 'max', 'mean', 'sd', 'mu', 'sigma', 'alpha', 'beta', 'mode']) {
      const v = param(row, key);
      if (v !== undefined) d[key] = v;
    }
    const variable = { id, label: cell(row, cols.label) || id, kind: cell(row, cols.kind).toLowerCase(), dist: d };
    const scale = param(row, 'scale');
    if (scale !== undefined) variable.scale = scale;
    variables.push(variable);
  }
  const runs = firstNum(dataset, dataset.rows, cols.runs);
  const seed = firstNum(dataset, dataset.rows, cols.seed);
  const input = { title, runs, seed, variables };
  const pit = pitFrom(dataset.rows[0] || [], cols);
  if (pit) input.pit = pit;
  notes.push(`Built ${variables.length} uncertain variables from ${dataset.rowCount} rows at seed ${seed}. Same input, same draws, forever.`);
  return { input, notes };
}
