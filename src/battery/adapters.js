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
