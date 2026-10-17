// Computed "who is missing": coverage receipts against real universes.
// The third public interest question stops being a prompt and becomes a
// receipt. Given the unit names behind an estimate, this module says which
// census 2011 states and UTs are described, which are absent by name, and
// what share of India's enumerated population the estimate covers. The
// Census is a complete enumeration, so its universe is the honest yardstick;
// NFHS is a sample survey and says so in every receipt it produces.
//
// Unit names across sources do not agree: NFHS writes "Andaman & Nicobar
// Islands" where the census writes "and", Delhi appears as "NCT Delhi", and
// the 2020 merger means one NFHS row covers two census UTs. Names are
// normalised (ampersands, case, punctuation) and the few real divergences
// carry explicit aliases below. Nothing is fuzzy-matched: an unmatched name
// is reported as unmatched, not guessed into a state.

import { census2011 } from '../data/census2011.js';
import { nfhsStates, nfhsWaves } from '../data/nfhsPanel.js';

export const CENSUS_UNIVERSE_SIZE = census2011.length;
export const CENSUS_TOTAL_POP = census2011.reduce((a, r) => a + r.pop, 0);

// Normalised census universe: name key -> { label, pop }.
function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CENSUS_BY_KEY = new Map(census2011.map((r) => [norm(r.s), { label: r.s, pop: r.pop }]));

// Explicit aliases for names that normalise differently across sources.
// A group alias covers one row that spans several census units.
const ALIASES = new Map([
  ['nct delhi', ['Delhi']],
  ['dadra and nagar haveli and daman and diu', ['Dadra and Nagar Haveli', 'Daman and Diu']],
  // The PM-JAY tables abbreviate the merged UT to 'DNH and DD'; same two
  // census units, so the same honest treatment as the full name.
  ['dnh and dd', ['Dadra and Nagar Haveli', 'Daman and Diu']],
]);

// Units created after 2011: they cannot appear in the census universe, and
// saying so is more useful than a silent non-match.
export const POST_2011_UNITS = new Map([
  ['telangana', 'Telangana was created in 2014; the Census 2011 universe counts its population inside undivided Andhra Pradesh.'],
  ['ladakh', 'Ladakh was created in 2019; the Census 2011 universe counts its population inside Jammu and Kashmir.'],
]);

// Coverage of a set of unit names against the Census 2011 universe.
//   matched:  universe units the names describe (with population)
//   missing:  universe units no name describes, named, with population
//   unknown:  names that are not census 2011 units, with the reason
export function censusCoverage(unitNames) {
  const seen = new Set();
  const names = [];
  for (const n of unitNames || []) {
    const k = norm(n);
    if (k === '' || seen.has(k)) continue;
    seen.add(k);
    names.push(n);
  }

  const coveredKeys = new Set();
  const unknown = [];
  for (const n of names) {
    const k = norm(n);
    if (CENSUS_BY_KEY.has(k)) {
      coveredKeys.add(k);
      continue;
    }
    const alias = ALIASES.get(k);
    if (alias) {
      for (const a of alias) coveredKeys.add(norm(a));
      continue;
    }
    unknown.push({
      name: String(n),
      note: POST_2011_UNITS.get(k) || 'Not a state or UT in the Census 2011 universe; population coverage cannot be computed for it.',
    });
  }

  const matched = [];
  const missing = [];
  for (const r of census2011) {
    (coveredKeys.has(norm(r.s)) ? matched : missing).push({ name: r.s, pop: r.pop });
  }
  const populationCovered = matched.reduce((a, r) => a + r.pop, 0);

  return {
    universe: 'Census of India 2011 (complete enumeration of usual residents)',
    universeSize: CENSUS_UNIVERSE_SIZE,
    totalPopulation: CENSUS_TOTAL_POP,
    matched,
    missing,
    unknown,
    populationCovered,
    coveragePct: (populationCovered / CENSUS_TOTAL_POP) * 100,
  };
}

// Which column of an ingested table names places? Returns the column whose
// distinct values match the most census 2011 units (at least two), so a
// receipt can be computed without asking the analyst to point. Returns null
// when no column looks like geography — and saying so beats guessing.
export function findUnitColumn(dataset) {
  let best = null;
  const cols = (dataset && dataset.columns) || [];
  cols.forEach((col, i) => {
    const names = [...new Set((dataset.rows || []).map((r) => String(r[i] == null ? '' : r[i]).trim()).filter((v) => v !== ''))];
    if (names.length === 0) return;
    const coverage = censusCoverage(names);
    if (coverage.matched.length >= 2 && (!best || coverage.matched.length > best.score)) {
      best = { column: col, names, coverage, score: coverage.matched.length };
    }
  });
  return best;
}

// Human lines for a coverage receipt, in the house voice: numbers first,
// names always, caveats attached to the number they qualify.
export function coverageLines(cov, { estimatedFrom } = {}) {
  const lines = [];
  const crore = (p) => `${(p / 1e7).toFixed(1)} crore`;
  if (cov.matched.length === 0) {
    lines.push('No unit in this data matches a Census 2011 state or UT, so population coverage cannot be computed. Units named in the data: '
      + (cov.unknown.length > 0 ? cov.unknown.map((u) => u.name).join(', ') : 'none') + '.');
  } else {
    lines.push(`This estimate describes ${cov.matched.length} of ${cov.universeSize} Census 2011 states and UTs, covering ${crore(cov.populationCovered)} of ${crore(cov.totalPopulation)} people (${cov.coveragePct.toFixed(1)}% of the enumerated population).`);
    if (cov.missing.length > 0) {
      const names = cov.missing.map((m) => m.name);
      const shown = names.slice(0, 8).join(', ');
      lines.push(`Absent by name: ${shown}${names.length > 8 ? `, and ${names.length - 8} more` : ''} (${crore(cov.missing.reduce((a, m) => a + m.pop, 0))} of population).`);
    } else {
      lines.push('Every state and UT in the Census 2011 universe is named in this data: nothing is absent.');
    }
  }
  for (const u of cov.unknown) lines.push(`${u.name}: ${u.note}`);
  if (estimatedFrom) lines.push(estimatedFrom);
  lines.push('The Census is a complete enumeration, so this is a real coverage figure, not a sample estimate.');
  return lines;
}

// Panel receipt: which units are missing which waves, and which rows were
// dropped for not parsing. A panel is not "36 states" because 36 states
// appear somewhere in it; it is however many states hold together across
// the waves the estimate actually uses.
export function panelReceipt(cells, { waveLabels } = {}) {
  const byUnit = new Map();
  for (const c of cells || []) {
    if (!byUnit.has(c.unit)) byUnit.set(c.unit, new Set());
    byUnit.get(c.unit).add(c.wave);
  }
  const waves = [...new Set((cells || []).map((c) => c.wave))].sort((a, b) => a - b);
  const label = (w) => {
    const i = waves.indexOf(w);
    return (waveLabels && waveLabels[i]) || String(w);
  };
  const gaps = [];
  for (const [unit, have] of byUnit) {
    const missingWaves = waves.filter((w) => !have.has(w)).map(label);
    if (missingWaves.length > 0) gaps.push({ unit, missingWaves });
  }
  return {
    units: [...byUnit.keys()],
    waves: waves.map(label),
    unbalanced: gaps,
    complete: byUnit.size - gaps.length,
  };
}

// NFHS receipt for the built-in data: which states enter an estimate that
// needs the given waves of an indicator, and which are excluded because a
// value is missing (with the reason named). NFHS is a sample survey; the
// receipt says so rather than borrowing the census's completeness claim.
export function nfhsCoverage({ indicator, waves }) {
  const needed = waves && waves.length > 0 ? waves : ['n5'];
  const used = [];
  const excluded = [];
  for (const s of nfhsStates) {
    const missingWaves = needed.filter((w) => s.v[indicator] == null || s.v[indicator][w] == null);
    if (missingWaves.length === 0) {
      used.push(s.state);
    } else {
      const surveys = missingWaves.map((w) => (nfhsWaves.find((x) => x.key === w) || {}).survey || w);
      excluded.push({ name: s.state, reason: `no ${surveys.join(' or ')} value for this indicator` });
    }
  }
  return {
    universe: 'NFHS state factsheets (sample survey of households)',
    used,
    excluded,
    lines: [
      `This estimate describes ${used.length} of ${nfhsStates.length} states and UTs with the required NFHS values.`,
      excluded.length > 0
        ? `Excluded by name: ${excluded.map((e) => `${e.name} (${e.reason})`).join('; ')}.`
        : 'Every state and UT in the NFHS universe carries the required values.',
      'NFHS is a sample survey, not an enumeration: these states represent their surveyed households, and the states excluded here are absent from the estimate entirely.',
    ],
  };
}
