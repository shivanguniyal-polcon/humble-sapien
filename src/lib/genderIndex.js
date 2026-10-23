// Gender inclusion index: a composite over NFHS-5 women's indicators and
// Census 2011 female indicators, with weights the reader sets.
//
// Every step is stated rather than chosen quietly:
//   - each indicator is min-max normalised across the states that have it, so
//     a score is a position in the distribution, not a percentage;
//   - an indicator that is "worse when higher" (anaemia) is inverted before
//     normalising, so 100 is always "better for women";
//   - a state missing one indicator is scored on the rest, with its weight
//     renormalised over what is present, and the row says what is missing;
//   - a state missing every indicator gets no score and is listed, not
//     dropped silently.
//
// The two sources are different vintages: NFHS-5 is 2019-21, Census 2011 is
// 2011. They are joined on state, and the method note says so. Nothing is
// interpolated between them.

import { nfhsStates } from '../data/nfhsPanel.js';
import { census2011 } from '../data/census2011.js';

export const GENDER_INDICATORS = [
  {
    key: 'women_schooling',
    label: 'Women with 10+ years of schooling',
    source: 'NFHS-5 (2019-21)',
    unit: '%',
    higherIsBetter: true,
    note: 'Comparable across NFHS rounds.',
  },
  {
    key: 'inst_births',
    label: 'Institutional births',
    source: 'NFHS-5 (2019-21)',
    unit: '%',
    higherIsBetter: true,
    note: 'Comparable across NFHS rounds.',
  },
  {
    key: 'anaemia_women',
    label: 'Women 15-49 who are anaemic',
    source: 'NFHS-5 (2019-21)',
    unit: '%',
    higherIsBetter: false,
    note:
      'Inverted: fewer anaemic women scores higher. Measurement and adjustment ' +
      'changed between NFHS-4 and NFHS-5, so read movement across waves with care; ' +
      'this index uses NFHS-5 only.',
  },
  {
    key: 'sexRatio',
    label: 'Sex ratio (females per 1,000 males)',
    source: 'Census 2011',
    unit: 'per 1,000',
    higherIsBetter: true,
    note: 'The only sex-ratio count that covers every unit; 2021 census not held.',
  },
  {
    key: 'litF',
    label: 'Female literacy rate',
    source: 'Census 2011',
    unit: '%',
    higherIsBetter: true,
    note: 'Census definition: literates aged 7 and above.',
  },
];

export const DEFAULT_WEIGHTS = Object.fromEntries(
  GENDER_INDICATORS.map((i) => [i.key, 1]),
);

// State names do not match between the two sources: Census writes "and",
// NFHS writes "&"; Delhi is "NCT Delhi" in NFHS; the 2011 union territory of
// Dadra and Nagar Haveli plus Daman and Diu became one unit in 2020, which
// NFHS-5 reflects and Census 2011 cannot. Normalise both sides, then map the
// named cases.
const normaliseName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/nct delhi/, 'delhi')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const CENSUS_ALIASES = {
  // NFHS-5's combined UT has no single Census 2011 counterpart. Both halves
  // are listed in the join so the row can say the census side is split.
  'dadra and nagar haveli and daman and diu': [
    'dadra and nagar haveli',
    'daman and diu',
  ],
};

// Units present in only one source. They are listed with a reason rather
// than scored on a substitute.
export const UNJOINED_UNITS = [
  {
    unit: 'Ladakh',
    reason:
      'Carved out of Jammu & Kashmir in 2019. NFHS-5 covers it; Census 2011 does not exist for it.',
  },
  {
    unit: 'Telangana',
    reason:
      'Carved out of Andhra Pradesh in 2014. NFHS-5 covers it; Census 2011 does not exist for it.',
  },
  {
    unit: 'Dadra & Nagar Haveli and Daman & Diu',
    reason:
      'One unit in NFHS-5 (merged 2020); two units in Census 2011. Scored without the census indicators rather than merging 2011 populations without weights.',
  },
];

// The join. Returns one row per NFHS unit with whatever census data matches.
const buildRows = () => {
  const censusByKey = new Map();
  for (const c of census2011) censusByKey.set(normaliseName(c.s), c);

  return nfhsStates.map((n) => {
    const key = normaliseName(n.state);
    const aliases = CENSUS_ALIASES[key];
    let census = null;
    let censusNote = null;
    if (aliases) {
      censusNote =
        'Census 2011 records this area as two units; no single 2011 row matches.';
    } else {
      census = censusByKey.get(key) || null;
    }

    const raw = {};
    for (const ind of GENDER_INDICATORS) {
      if (ind.source.startsWith('NFHS')) {
        raw[ind.key] = n.v?.[ind.key]?.n5 ?? null;
      } else {
        raw[ind.key] = census ? census[ind.key] : null;
      }
    }
    return { state: n.state, raw, censusNote };
  });
};

const round1 = (x) => Math.round(x * 10) / 10;

// Min-max normalise one indicator to 0-100 across the states that have it.
// An inverted indicator flips before scaling, so 100 is always better.
const normalised = (rows, indicator) => {
  const present = rows
    .map((r) => r.raw[indicator.key])
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (present.length < 2) return new Map();
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  const out = new Map();
  if (hi === lo) {
    for (const r of rows) if (r.raw[indicator.key] != null) out.set(r.state, 100);
    return out;
  }
  for (const r of rows) {
    const v = r.raw[indicator.key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const frac = (v - lo) / (hi - lo);
    out.set(r.state, round1((indicator.higherIsBetter ? frac : 1 - frac) * 100));
  }
  return out;
};

// The composite. Weights are renormalised over the indicators a state
// actually has, so a missing value costs it nothing and gains it nothing —
// and the row reports what was missing.
export const computeGenderIndex = (weights = DEFAULT_WEIGHTS) => {
  const rows = buildRows();
  const norm = Object.fromEntries(
    GENDER_INDICATORS.map((ind) => [ind.key, normalised(rows, ind)]),
  );

  const scored = rows.map((r) => {
    let sum = 0;
    let weightSum = 0;
    const missing = [];
    const parts = {};
    for (const ind of GENDER_INDICATORS) {
      const w = Number(weights[ind.key]) || 0;
      const n = norm[ind.key].get(r.state);
      parts[ind.key] = n ?? null;
      if (typeof n !== 'number') {
        if (w > 0) missing.push(ind.label);
        continue;
      }
      sum += n * w;
      weightSum += w;
    }
    return {
      ...r,
      parts,
      missing,
      score: weightSum > 0 ? round1(sum / weightSum) : null,
    };
  });

  const rankable = scored
    .filter((r) => r.score != null)
    .sort((a, b) => b.score - a.score);
  rankable.forEach((r, i) => {
    r.rank = i + 1;
  });
  const unranked = scored.filter((r) => r.score == null);

  return { rows: scored, ranked: rankable, unranked };
};
