import { useMemo, useState } from 'react';
import { census2011, censusDerived } from '../data/census2011';
import { nfhsStates, nfhsIndicators } from '../data/nfhsPanel';
import {
  ols, logit, tsls, didTWFE, didEventStudy, didTable, rddLocal, rddBins,
  syntheticControl, propensityMatch, fmtNum, fmtP,
} from '../lib/econometrics';
import { LineChart, CoefficientPlot } from '../components/charts';
import NumInput from '../components/NumInput';
import { ingest, parseNumber } from '../battery/ingest.js';
import { useSharedDatasets, shareDataset, togglePin } from '../lib/datasetStore';
import { usePitDraft } from '../lib/pitStore';
import { censusCoverage, coverageLines, panelReceipt, nfhsCoverage, findUnitColumn } from '../lib/coverage';

const CENSUS_VARS = {
  lit: 'Literacy rate, age 7+ (%)',
  litF: 'Female literacy rate (%)',
  litM: 'Male literacy rate (%)',
  genderGapLit: 'Literacy gap, male minus female (pp)',
  sexRatio: 'Sex ratio (females per 1,000 males)',
  logPop: 'Log population',
  scShare: 'Scheduled Caste share (%)',
  stShare: 'Scheduled Tribe share (%)',
};

const METHODS = {
  ols: {
    label: 'OLS regression',
    question: 'Does one indicator move with another, holding the rest constant?',
    how: 'Least squares on the 35 states and UTs of the Census 2011 cross-section, with HC1 robust standard errors.',
    limits: 'Cross-section associations are not causal. Omitted variables (income, urbanisation, state capacity) sit behind every coefficient here.',
  },
  logit: {
    label: 'Logit',
    question: 'What predicts whether a state falls above or below a threshold?',
    how: 'Maximum likelihood logit via iteratively reweighted least squares, McFadden pseudo-R2, on the same census cross-section.',
    limits: 'Thirty-five observations is small for a logit. Treat this as a demonstration of the mechanics, not a published model.',
  },
  iv: {
    label: 'IV / 2SLS',
    question: 'What if the regressor is endogenous?',
    how: 'Two-stage least squares with your chosen instrument, robust variance, and a first-stage fit check.',
    limits: 'Instrument validity cannot be tested from the data. The instruments here are chosen by you; the exclusion restriction is your responsibility.',
  },
  did: {
    label: 'DiD + event study',
    question: 'Did the gap between two groups change after a moment, beyond the trend both shared?',
    how: 'Two-way fixed effects on the NFHS state panel (2005-06, 2015-16, 2019-21), clustered by state, with an event-study plot for the pre-trend check.',
    limits: 'Treatment here is defined by a baseline threshold you set, not by a real policy rollout. The estimator is exact; the counterfactual is only as good as the parallel-trends story.',
  },
  rdd: {
    label: 'RDD sharp & fuzzy',
    question: 'Does something jump at a cutoff?',
    how: 'Local linear regression either side of the cutoff with triangular kernel weights, bandwidth and donut controls; fuzzy mode reports the Wald ratio.',
    limits: 'With 35 states the running variable is coarse and the cutoff is yours to pick. A real RDD needs dense units near the boundary.',
  },
  sc: {
    label: 'Synthetic control',
    question: 'What would this state have looked like without it?',
    how: 'Donor weights minimise the pre-period gap subject to non-negativity and adding to one (Abadie, Diamond and Hainmueller).',
    limits: 'Two pre-periods is the minimum for a synthetic control and not enough for an inference claim. Read the pre-fit before the post-gap.',
  },
  match: {
    label: 'Matching',
    question: 'Compared with whom?',
    how: 'Nearest-neighbour matching on the logit propensity score with a 0.2 sd caliper; ATT with paired-difference standard errors.',
    limits: 'Matching balances observed covariates only. Paired-difference SEs are conservative approximations of the Abadie-Imbens variance.',
  },
};

const censusRows = census2011.map(censusDerived);

function nfhsList(indicator) {
  return nfhsStates
    .map((s) => ({ state: s.state, ...s.v[indicator] }))
    .filter((r) => r.n5 != null);
}

const WAVE_LABELS = ['2005-06 (NFHS-3)', '2015-16 (NFHS-4)', '2019-21 (NFHS-5)'];

// ---------- bring-your-own data ----------
// Rows where every mapped column parses as a number, kept aligned, with the
// source row numbers so a dropped row can always be traced back.
function completeCases(dataset, keys) {
  const idx = keys.map((k) => dataset.columns.indexOf(k));
  const rows = [];
  const rowNos = [];
  const droppedRowNos = [];
  let dropped = 0;
  dataset.rows.forEach((row, i) => {
    const vals = {};
    let ok = true;
    keys.forEach((k, j) => {
      const p = parseNumber(row[idx[j]]);
      if (p.ok) vals[k] = p.value;
      else ok = false;
    });
    if (ok) {
      rows.push(vals);
      rowNos.push(i + 2);
    } else {
      dropped += 1;
      droppedRowNos.push(i + 2);
    }
  });
  return { rows, rowNos, dropped, droppedRowNos };
}

// ---------- who is missing (computed) ----------
// The third public interest question, answered by the machine wherever the
// data can answer it: which Census 2011 units the estimate describes, what
// share of the enumerated population that covers, which rows and units were
// dropped on the way in, and which panel cells are absent. Everything here is
// derived from the data on screen. Nothing is typed.

function dropLines(droppedRowNos) {
  if (droppedRowNos.length === 0) return ['Every row in the data parsed and is used; nothing was dropped.'];
  const shown = droppedRowNos.slice(0, 10).join(', ');
  return [`${droppedRowNos.length} row(s) dropped as incomplete (source rows ${shown}${droppedRowNos.length > 10 ? ', …' : ''}). The people behind those rows are absent from every number above.`];
}

function customKeys(method, map) {
  switch (method) {
    case 'ols': return map.olsY && map.olsX.length > 0 ? [map.olsY, ...map.olsX] : null;
    case 'logit': return map.logitY && map.logitX.length > 0 ? [map.logitY, ...map.logitX] : null;
    case 'iv': return map.ivY && map.ivEnd && map.ivInst ? [map.ivY, map.ivEnd, map.ivInst, ...map.ivExog] : null;
    case 'rdd': return map.rddX && map.rddY ? [map.rddX, map.rddY, ...(map.rddFuzzy && map.rddTake ? [map.rddTake] : [])] : null;
    case 'match': return map.matchX && map.matchY && map.matchCovs.length > 0 ? [map.matchX, map.matchY, ...map.matchCovs] : null;
    default: return null;
  }
}

// Panel presence, row by row: which rows parsed, which units never produced a
// usable cell, and (via panelReceipt) which units miss which waves.
function panelCells(ds, unitCol, waveCol, yCol) {
  const ui = ds.columns.indexOf(unitCol);
  const wi = ds.columns.indexOf(waveCol);
  const yi = ds.columns.indexOf(yCol);
  const cells = [];
  const badRows = [];
  const total = new Map();
  const good = new Map();
  ds.rows.forEach((row, i) => {
    const unit = String(row[ui] == null ? '' : row[ui]).trim();
    if (unit !== '') {
      total.set(unit, (total.get(unit) || 0) + 1);
      if (!good.has(unit)) good.set(unit, 0);
    }
    const wave = parseNumber(row[wi]);
    const yv = parseNumber(row[yi]);
    if (unit === '' || !wave.ok || !yv.ok) {
      badRows.push(i + 2);
      return;
    }
    good.set(unit, good.get(unit) + 1);
    cells.push({ unit, wave: wave.value });
  });
  const deadUnits = [...total.keys()].filter((u) => good.get(u) === 0);
  return { cells, badRows, deadUnits };
}

function buildWhoIsMissing({ dataSource, custom, map, method, spec }) {
  if (dataSource === 'builtin') {
    if (method === 'did') {
      const c = nfhsCoverage({ indicator: spec.didInd, waves: [spec.didBase, 'n5'] });
      return {
        lines: [
          ...c.lines,
          `Treatment groups are fixed by the baseline threshold you set (${spec.didCut}); this receipt covers who is in the data, not the counterfactual.`,
        ],
        coverage: null,
      };
    }
    if (method === 'sc') {
      const c = nfhsCoverage({ indicator: spec.scInd, waves: ['n4', 'n5'] });
      return {
        lines: [
          ...c.lines,
          'A state missing a required value cannot be a donor, so it is absent from the counterfactual as well as from the estimate.',
        ],
        coverage: null,
      };
    }
    const cov = censusCoverage(censusRows.map((r) => r.s));
    return { lines: coverageLines(cov), coverage: cov };
  }
  if (!custom || !custom.dataset) {
    return { lines: ['Load data above and the coverage receipt computes itself.'], coverage: null };
  }
  const ds = custom.dataset;
  const lines = [];

  // Where are the units? The mapped unit column first, else the column that
  // matches the most census states. No column matches? Say so, never guess.
  const mappedUnit = method === 'did' ? map.didUnit : method === 'sc' ? map.scUnit : '';
  let unitInfo = null;
  if (mappedUnit && ds.columns.includes(mappedUnit)) {
    const names = distinctValues(ds, mappedUnit);
    unitInfo = { column: mappedUnit, names, coverage: censusCoverage(names) };
  }
  if (!unitInfo || unitInfo.coverage.matched.length === 0) {
    const found = findUnitColumn(ds);
    if (found) unitInfo = found;
  }
  if (unitInfo && unitInfo.coverage.matched.length > 0) {
    lines.push(...coverageLines(unitInfo.coverage, { estimatedFrom: `Unit names taken from the "${unitInfo.column}" column.` }));
  } else if (unitInfo) {
    lines.push(`The "${unitInfo.column}" column names ${unitInfo.names.length} unit(s), none of them a Census 2011 state or UT, so population coverage cannot be computed: ${unitInfo.names.slice(0, 6).join(', ')}${unitInfo.names.length > 6 ? ', …' : ''}.`);
  } else {
    lines.push('No column in this data names Indian states or UTs, so population coverage cannot be computed. The row and unit drops below are the receipt instead.');
  }

  if (method === 'did' || method === 'sc') {
    const unitCol = method === 'did' ? map.didUnit : map.scUnit;
    const waveCol = method === 'did' ? map.didWave : map.scWave;
    const yCol = method === 'did' ? map.didY : map.scY;
    if (unitCol && waveCol && yCol && ds.columns.includes(unitCol)) {
      const { cells, badRows, deadUnits } = panelCells(ds, unitCol, waveCol, yCol);
      lines.push(...dropLines(badRows));
      if (deadUnits.length > 0) lines.push(`Unit(s) with no usable row at all: ${deadUnits.join(', ')}. They are absent from the panel entirely.`);
      const panel = panelReceipt(cells);
      for (const g of panel.unbalanced) {
        lines.push(`${g.unit} is missing ${g.missingWaves.join(', ')}: a unit absent from a wave cannot carry its own trend through the estimate.`);
      }
      if (panel.unbalanced.length === 0 && cells.length > 0) {
        lines.push(`The panel is balanced: all ${panel.units.length} units hold across every wave used (${panel.waves.join(', ')}).`);
      }
    } else {
      lines.push('Pick the unit, wave and outcome columns and the panel receipt computes itself.');
    }
  } else {
    const keys = customKeys(method, map);
    if (keys) {
      const { droppedRowNos } = completeCases(ds, keys);
      lines.push(...dropLines(droppedRowNos));
    } else {
      lines.push('Pick the columns this design needs and the row-drop receipt computes itself.');
    }
  }
  return { lines, coverage: unitInfo ? unitInfo.coverage : null };
}

function distinctValues(dataset, colName) {
  const i = dataset.columns.indexOf(colName);
  if (i < 0) return [];
  return [...new Set(dataset.rows.map((r) => String(r[i] == null ? '' : r[i]).trim()).filter((v) => v !== ''))];
}

function numericColNames(validation) {
  return (validation ? validation.schema : [])
    .filter((c) => c.type === 'number' || c.type === 'mixed-number')
    .map((c) => c.name);
}

function autoMap(dataset, validation) {
  const numCols = numericColNames(validation);
  const [n1, n2, n3] = numCols;
  return {
    olsY: n1 || '', olsX: numCols.slice(1, 4),
    logitY: n1 || '', logitCut: 0, logitX: numCols.slice(1, 4),
    ivY: n1 || '', ivEnd: n2 || '', ivInst: n3 || '', ivExog: numCols.slice(3, 5),
    didUnit: dataset.columns[0] || '', didWave: n1 || '', didY: n2 || '', didTreat: '',
    rddX: n1 || '', rddY: n2 || '', rddCut: 0, rddBw: 10, rddDonut: 0, rddFuzzy: false, rddTake: '',
    scUnit: dataset.columns[0] || '', scWave: n1 || '', scY: n2 || '', scTreated: '', scPost: null,
    matchX: n1 || '', matchCut: 0, matchY: n2 || '', matchCovs: numCols.slice(2, 5),
  };
}

function Sel({ label, value, onChange, options, hint }) {
  return (
    <Control label={label}>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choose a column —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {hint && <p className="fine-print" style={{ margin: '0.35rem 0 0' }}>{hint}</p>}
    </Control>
  );
}

function CheckList({ label, options, value, onToggle, disabled }) {
  return (
    <Control label={label}>
      {options.map((o) => (
        <label key={o} className="check-row">
          <input
            type="checkbox"
            checked={value.includes(o)}
            disabled={disabled === o}
            onChange={(e) => onToggle(e.target.checked ? [...value, o] : value.filter((x) => x !== o))}
          />
          {o}
        </label>
      ))}
    </Control>
  );
}

// The column mapping panel: one compact role picker per design.
function CustomRoles({ method, map, setMap, custom }) {
  const m = (k, v) => setMap((s) => ({ ...s, [k]: v }));
  if (!custom) {
    return <p className="fine-print">Load your data above to choose the columns each design needs.</p>;
  }
  const { dataset, validation } = custom;
  const numCols = numericColNames(validation);
  const allCols = dataset.columns;
  return (
    <>
      {method === 'ols' && (
        <>
          <Sel label="Outcome" value={map.olsY} onChange={(v) => m('olsY', v)} options={numCols} />
          <CheckList label="Regressors" options={numCols} value={map.olsX} disabled={map.olsY} onToggle={(v) => m('olsX', v)} />
        </>
      )}
      {method === 'logit' && (
        <>
          <Control label="Threshold outcome (1 when the column is at or above)">
            <div className="inline-fields">
              <select value={map.logitY} onChange={(e) => m('logitY', e.target.value)}>
                <option value="">— choose a column —</option>
                {numCols.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="op">≥</span>
              <NumInput id="c-logit-cut" value={map.logitCut} onChange={(v) => m('logitCut', v)} />
            </div>
          </Control>
          <CheckList label="Regressors" options={numCols} value={map.logitX} disabled={map.logitY} onToggle={(v) => m('logitX', v)} />
        </>
      )}
      {method === 'iv' && (
        <>
          <Sel label="Outcome" value={map.ivY} onChange={(v) => m('ivY', v)} options={numCols} />
          <Sel label="Endogenous regressor" value={map.ivEnd} onChange={(v) => m('ivEnd', v)} options={numCols} />
          <Sel label="Instrument" value={map.ivInst} onChange={(v) => m('ivInst', v)} options={numCols} />
          <CheckList
            label="Exogenous controls"
            options={numCols}
            value={map.ivExog}
            disabled={[map.ivY, map.ivEnd, map.ivInst].join('|')}
            onToggle={(v) => m('ivExog', v)}
          />
        </>
      )}
      {method === 'did' && (
        <>
          <Sel label="Unit column" value={map.didUnit} onChange={(v) => m('didUnit', v)} options={allCols} hint="One row per unit per wave." />
          <Sel label="Wave column (numeric)" value={map.didWave} onChange={(v) => m('didWave', v)} options={numCols} />
          <Sel label="Outcome" value={map.didY} onChange={(v) => m('didY', v)} options={numCols} />
          <Sel
            label="First-treated wave (optional)"
            value={map.didTreat}
            onChange={(v) => m('didTreat', v)}
            options={numCols}
            hint="Per unit: the first wave counted as treated. A blank cell means never treated."
          />
        </>
      )}
      {method === 'rdd' && (
        <>
          <Sel label="Running variable" value={map.rddX} onChange={(v) => m('rddX', v)} options={numCols} />
          <Sel label="Outcome" value={map.rddY} onChange={(v) => m('rddY', v)} options={numCols} />
          <Control label="Cutoff"><NumInput id="c-rdd-cut" value={map.rddCut} onChange={(v) => m('rddCut', v)} /></Control>
          <Control label="Bandwidth"><NumInput id="c-rdd-bw" step="0.5" min="0" value={map.rddBw} onChange={(v) => m('rddBw', v)} /></Control>
          <Control label="Donut hole"><NumInput id="c-rdd-donut" step="0.5" min="0" value={map.rddDonut} onChange={(v) => m('rddDonut', v)} /></Control>
          <label className="check-row">
            <input type="checkbox" checked={!!map.rddFuzzy} onChange={(e) => m('rddFuzzy', e.target.checked)} />
            Fuzzy design (Wald ratio on a take-up jump)
          </label>
          {map.rddFuzzy && (
            <Sel label="Take-up variable" value={map.rddTake} onChange={(v) => m('rddTake', v)} options={numCols} />
          )}
        </>
      )}
      {method === 'sc' && (
        <>
          <Sel label="Unit column" value={map.scUnit} onChange={(v) => m('scUnit', v)} options={allCols} />
          <Sel label="Wave column (numeric)" value={map.scWave} onChange={(v) => m('scWave', v)} options={numCols} />
          <Sel label="Outcome" value={map.scY} onChange={(v) => m('scY', v)} options={numCols} />
          <Sel
            label="Treated unit"
            value={map.scTreated}
            onChange={(v) => m('scTreated', v)}
            options={distinctValues(dataset, map.scUnit)}
          />
          <Sel
            label="First post wave"
            value={map.scPost == null ? '' : String(map.scPost)}
            onChange={(v) => m('scPost', v === '' ? null : Number(v))}
            options={distinctValues(dataset, map.scWave).filter((v) => Number.isFinite(Number(v))).sort((a, b) => a - b)}
            hint="Waves before this one fit the donor weights; the gap after it is the estimate."
          />
        </>
      )}
      {method === 'match' && (
        <>
          <Control label="Treated when">
            <div className="inline-fields">
              <select value={map.matchX} onChange={(e) => m('matchX', e.target.value)}>
                <option value="">— choose a column —</option>
                {numCols.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="op">≥</span>
              <NumInput id="c-match-cut" value={map.matchCut} onChange={(v) => m('matchCut', v)} />
            </div>
          </Control>
          <Sel label="Outcome" value={map.matchY} onChange={(v) => m('matchY', v)} options={numCols} />
          <CheckList label="Balance on" options={numCols} value={map.matchCovs} disabled={`${map.matchX}|${map.matchY}`} onToggle={(v) => m('matchCovs', v)} />
        </>
      )}
    </>
  );
}

// ---------- shared pieces ----------

function Control({ label, children }) {
  return (
    <div className="control">
      <label>{label}</label>
      {children}
    </div>
  );
}

function CoefTable({ fit, names }) {
  return (
    <table className="result-table">
      <thead>
        <tr>
          <th scope="col">Term</th>
          <th scope="col">Estimate</th>
          <th scope="col">SE</th>
          <th scope="col">t / z</th>
          <th scope="col">p</th>
          <th scope="col" aria-label="Significance" />
        </tr>
      </thead>
      <tbody>
        {fit.beta.map((b, i) => (
          <tr key={names[i]}>
            <th scope="row">{names[i]}</th>
            <td className="data-num">{fmtNum(b)}</td>
            <td className="data-num">{fmtNum(fit.se[i])}</td>
            <td className="data-num">{fmtNum(fit.t ? fit.t[i] : fit.z[i], 2)}</td>
            <td className="data-num">{fmtP(fit.p[i])}</td>
            <td className="data-num">{fit.stars[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CopyButton({ text, label = 'Copy results' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function EventPlot({ points }) {
  const W = 720;
  const H = 320;
  const M = { top: 20, right: 24, bottom: 52, left: 64 };
  const lows = points.map((p) => p.beta - 2 * p.se);
  const highs = points.map((p) => p.beta + 2 * p.se);
  const yMin = Math.min(0, ...lows);
  const yMax = Math.max(0, ...highs);
  const pad = (yMax - yMin) * 0.15 || 1;
  const band = (W - M.left - M.right) / Math.max(1, points.length);
  const x = (i) => M.left + band * (i + 0.5);
  const y = (v) => H - M.bottom - ((v - (yMin - pad)) / (yMax - yMin + 2 * pad)) * (H - M.top - M.bottom);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Event study coefficients by wave">
      <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--color-text-muted)" strokeWidth="1.5" />
      {points.map((p, i) => (
        <g key={p.wave}>
          <line x1={x(i)} x2={x(i)} y1={y(p.beta - 2 * p.se)} y2={y(p.beta + 2 * p.se)} stroke="var(--color-series-1)" strokeWidth="2" />
          <circle cx={x(i)} cy={y(p.beta)} r="6" fill={p.isBase ? 'var(--color-text-muted)' : 'var(--color-series-1)'}>
            <title>{`${p.label != null ? p.label : WAVE_LABELS[p.wave]}: ${fmtNum(p.beta)} (SE ${fmtNum(p.se)})`}</title>
          </circle>
          <text x={x(i)} y={H - M.bottom + 22} textAnchor="middle" fontSize="12" fill="var(--color-text-muted)" className="data-num">
            {p.label != null ? p.label : WAVE_LABELS[p.wave].split(' ')[0]}
          </text>
          <text x={x(i)} y={H - M.bottom + 38} textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">
            {p.isBase ? 'base' : `p ${fmtP(p.p)}`}
          </text>
        </g>
      ))}
      <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" fontSize="12.5" fill="var(--color-text-secondary)">
        Survey wave
      </text>
    </svg>
  );
}

function RddChart({ y, x, cutoff, fit, bins }) {
  const W = 720;
  const H = 360;
  const M = { top: 20, right: 24, bottom: 52, left: 64 };
  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const yMin = Math.min(...y);
  const yMax = Math.max(...y);
  const pad = (yMax - yMin) * 0.1 || 1;
  const xs = (v) => M.left + ((v - xMin) / (xMax - xMin || 1)) * (W - M.left - M.right);
  const ys = (v) => H - M.bottom - ((v - (yMin - pad)) / (yMax - yMin + 2 * pad)) * (H - M.top - M.bottom);
  const line = (side, from, to) => {
    const f = side === 'l' ? fit.leftFit : fit.rightFit;
    return (
      <line
        x1={xs(from)} y1={ys(f.intercept + f.slope * (from - cutoff))}
        x2={xs(to)} y2={ys(f.intercept + f.slope * (to - cutoff))}
        stroke="var(--color-series-1)" strokeWidth="2.5"
      />
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Outcome against running variable around the cutoff">
      <line x1={xs(cutoff)} x2={xs(cutoff)} y1={M.top} y2={H - M.bottom} stroke="var(--color-text-muted)" strokeDasharray="6 5" />
      <text x={xs(cutoff) + 8} y={M.top + 14} fontSize="11.5" fill="var(--color-text-secondary)">cutoff</text>
      {bins.map((b, i) => (
        <circle key={i} cx={xs(b.x)} cy={ys(b.y)} r={Math.min(9, 3 + Math.sqrt(b.n))} fill="var(--color-text-muted)" fillOpacity="0.65">
          <title>{`${fmtNum(b.x, 2)}: ${fmtNum(b.y)} (bin of ${b.n})`}</title>
        </circle>
      ))}
      {x.map((v, i) => (
        <circle key={i} cx={xs(v)} cy={ys(y[i])} r="3" fill="var(--color-series-1)" fillOpacity="0.35">
          <title>{`${fmtNum(v, 2)}: ${fmtNum(y[i])}`}</title>
        </circle>
      ))}
      {fit && line('l', Math.min(...x), cutoff)}
      {fit && line('r', cutoff, Math.max(...x))}
    </svg>
  );
}

function Limits({ method }) {
  const m = METHODS[method];
  return (
    <div className="method-note">
      <p><strong>The question.</strong> {m.question}</p>
      <p><strong>How it runs.</strong> {m.how}</p>
      <p style={{ marginBottom: 0 }}><strong>What it does not prove.</strong> {m.limits}</p>
    </div>
  );
}

// The computed "who is missing" receipt: a coverage meter where population
// coverage exists, and the named lines either way.
function WhoCard({ who, compact }) {
  const cov = who.coverage;
  const showMeter = cov && cov.matched.length > 0;
  return (
    <div className={compact ? 'receipt-block' : 'card'}>
      <h3>Who is missing from this estimate</h3>
      {showMeter && (
        <>
          <div className="meter" role="img" aria-label={`Unit coverage ${cov.coveragePct.toFixed(1)} percent of the enumerated population`}>
            <div className="meter-fill" style={{ width: `${Math.min(100, cov.coveragePct).toFixed(1)}%` }} />
          </div>
          <p className="fine-print" style={{ margin: '0.35rem 0 0.6rem' }}>
            {cov.matched.length} of {cov.universeSize} census 2011 units · {cov.coveragePct.toFixed(1)}% of the enumerated population.
          </p>
        </>
      )}
      <ul className="fine-print" style={{ marginBottom: 0 }}>
        {who.lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}

// ---------- the lab ----------

export default function EconometricsLab({ onNavigate }) {
  const [method, setMethod] = useState('did');
  const [spec, setSpec] = useState({
    olsY: 'litF', olsX: ['lit', 'logPop', 'scShare', 'stShare'],
    logitY: 'lit', logitCut: 75, logitX: ['logPop', 'scShare', 'stShare'],
    ivY: 'litF', ivEnd: 'lit', ivInst: 'sexRatio', ivExog: ['logPop'],
    didInd: 'stunting', didBase: 'n4', didRule: 'above', didCut: 35,
    rddX: 'stShare', rddY: 'litF', rddCut: 20, rddBw: 10, rddDonut: 0, rddFuzzy: false, rddTake: 'lit',
    scInd: 'stunting', scState: 'Bihar',
    matchX: 'stShare', matchCut: 20, matchY: 'litF', matchCovs: ['lit', 'logPop', 'sexRatio'],
  });
  const set = (k, v) => setSpec((s) => ({ ...s, [k]: v }));

  // Bring-your-own data: pasted or uploaded, ingested through the same
  // validation engine as the Battery, then mapped column by column.
  const [dataSource, setDataSource] = useState('builtin');
  const [customText, setCustomText] = useState('');
  const [custom, setCustom] = useState(null);
  const [map, setMap] = useState(autoMap({ columns: [] }, null));

  const loadCustom = () => {
    const { dataset, validation } = ingest(customText, { name: 'user data' });
    setCustom({ dataset, validation });
    setMap(validation.errors.length === 0 ? autoMap(dataset, validation) : autoMap({ columns: [] }, null));
  };

  const [pit, setPit] = useState({ whoBenefits: '', whoPays: '', whoMissing: '' });
  const [shareNote, setShareNote] = useState('');
  const [pinNote, setPinNote] = useState('');

  const shared = useSharedDatasets();
  const pitDraft = usePitDraft();
  const who = useMemo(
    () => buildWhoIsMissing({ dataSource, custom, map, method, spec }),
    [dataSource, custom, map, method, spec],
  );

  // The reverse flow: push validated rows to the Battery, where the ingest
  // adapters turn them into a structured module input.
  const shareWithBattery = () => {
    if (!custom || !custom.validation.ok) return;
    shareDataset({
      name: 'Lab data',
      dataset: custom.dataset,
      validation: custom.validation,
      source: 'lab',
    });
    setShareNote('Shared with the battery: open Tools → The policy battery and pick it under "Shared datasets".');
  };

  const loadShared = (d) => {
    setDataSource('custom');
    setCustom({ dataset: d.dataset, validation: d.validation });
    setMap(autoMap(d.dataset, d.validation));
  };

  const loadCustomFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCustomText(String(reader.result));
    };
    reader.onerror = () => {
      setCustom({ dataset: { columns: [], rows: [], rowCount: 0, columnCount: 0 }, validation: { ok: false, errors: [`That file (${file.name}) could not be read.`], warnings: [], schema: [], rowsParsed: 0 } });
    };
    reader.readAsText(file);
  };

  const result = useMemo(() => {
    try {
      const needed = { logit: ['logitCut'], did: ['didCut'], rdd: ['rddCut', 'rddBw', 'rddDonut'], match: ['matchCut'] }[method] || [];
      if (needed.some((k) => !Number.isFinite(spec[k]))) {
        return { error: 'Every cutoff field needs a number before this design can run.' };
      }
      if (dataSource === 'custom') {
        if (!custom) return { error: 'Load your data above first.' };
        const ds = custom.dataset;
        const tooFew = (n) => ({ error: `Only ${n} complete rows survived the mapping; the design needs more.` });
        if (method === 'ols') {
          if (!map.olsY || map.olsX.length === 0) return { error: 'Pick an outcome and at least one regressor from your columns.' };
          const { rows, dropped } = completeCases(ds, [map.olsY, ...map.olsX]);
          if (rows.length < 3) return tooFew(rows.length);
          const y = rows.map((r) => r[map.olsY]);
          const X = rows.map((r) => [1, ...map.olsX.map((k) => r[k])]);
          return { kind: 'table', fit: ols(y, X), names: ['const', ...map.olsX], dropped };
        }
        if (method === 'logit') {
          if (!map.logitY || map.logitX.length === 0 || !Number.isFinite(map.logitCut)) return { error: 'Pick an outcome, a numeric threshold and at least one regressor.' };
          const { rows, dropped } = completeCases(ds, [map.logitY, ...map.logitX]);
          if (rows.length < 3) return tooFew(rows.length);
          const y = rows.map((r) => (r[map.logitY] >= map.logitCut ? 1 : 0));
          const X = rows.map((r) => [1, ...map.logitX.map((k) => r[k])]);
          return { kind: 'table', fit: logit(y, X), names: ['const', ...map.logitX], events: y.reduce((a, b) => a + b, 0), dropped };
        }
        if (method === 'iv') {
          if (!map.ivY || !map.ivEnd || !map.ivInst) return { error: 'Pick the outcome, the endogenous regressor and the instrument.' };
          const { rows, dropped } = completeCases(ds, [map.ivY, map.ivEnd, map.ivInst, ...map.ivExog]);
          if (rows.length < 3) return tooFew(rows.length);
          const y = rows.map((r) => r[map.ivY]);
          const X = rows.map((r) => [1, r[map.ivEnd], ...map.ivExog.map((k) => r[k])]);
          const Z = rows.map((r) => [1, r[map.ivInst], ...map.ivExog.map((k) => r[k])]);
          return { kind: 'table', fit: tsls(y, X, Z), names: ['const', map.ivEnd, ...map.ivExog], instrument: map.ivInst, dropped };
        }
        if (method === 'did') {
          if (!map.didUnit || !map.didWave || !map.didY) return { error: 'Pick the unit, wave and outcome columns.' };
          const ui = ds.columns.indexOf(map.didUnit);
          const wi = ds.columns.indexOf(map.didWave);
          const yi = ds.columns.indexOf(map.didY);
          const ti = map.didTreat ? ds.columns.indexOf(map.didTreat) : -1;
          const cells = [];
          const treatByUnit = new Map();
          let dropped = 0;
          for (const row of ds.rows) {
            const unit = String(row[ui] == null ? '' : row[ui]).trim();
            const wave = parseNumber(row[wi]);
            const yv = parseNumber(row[yi]);
            if (unit === '' || !wave.ok || !yv.ok) {
              dropped += 1;
              continue;
            }
            if (ti >= 0) {
              const tp = parseNumber(row[ti]);
              if (tp.ok) {
                const prev = treatByUnit.get(unit);
                if (prev == null || tp.value < prev) treatByUnit.set(unit, tp.value);
              } else if (!treatByUnit.has(unit)) treatByUnit.set(unit, null);
            }
            cells.push({ unit, wave: wave.value, y: yv.value });
          }
          const rows = cells.map((r) => ({ ...r, firstTreat: treatByUnit.get(r.unit) ?? null }));
          const units = [...new Set(rows.map((r) => r.unit))];
          const waves = [...new Set(rows.map((r) => r.wave))].sort((a, b) => a - b);
          if (rows.length < 4 || units.length < 2 || waves.length < 2) {
            return { error: 'The panel needs at least two units, two waves and four rows with values.' };
          }
          const treatedUnits = units.filter((u) => treatByUnit.get(u) != null);
          if (treatedUnits.length === 0) {
            return { error: 'No unit has a first-treated wave. Give treated units a value in that column; a blank cell means never treated.' };
          }
          const fit = didTWFE(rows);
          if (fit.singular) return { error: 'The design is collinear with this panel: treatment never changes within a wave.' };
          const es = didEventStudy(rows);
          return {
            kind: 'did',
            fit,
            table: didTable(rows, waves[waves.length - 1]),
            study: es.singular ? es : { ...es, points: es.points.map((p) => ({ ...p, label: String(p.wave) })) },
            nTreated: treatedUnits.length,
            nControl: units.length - treatedUnits.length,
            dropped,
          };
        }
        if (method === 'rdd') {
          if (!map.rddX || !map.rddY || !Number.isFinite(map.rddCut) || !Number.isFinite(map.rddBw)) {
            return { error: 'Pick the running variable and outcome, with a numeric cutoff and bandwidth.' };
          }
          const { rows, dropped } = completeCases(ds, [map.rddX, map.rddY, ...(map.rddFuzzy && map.rddTake ? [map.rddTake] : [])]);
          if (rows.length < 5) return tooFew(rows.length);
          const x = rows.map((r) => r[map.rddX]);
          const y = rows.map((r) => r[map.rddY]);
          const fuzzyD = map.rddFuzzy && map.rddTake ? rows.map((r) => r[map.rddTake]) : null;
          const fit = rddLocal(y, x, map.rddCut, { bandwidth: map.rddBw, donut: map.rddDonut || 0, fuzzyD });
          return fit.singular
            ? { kind: 'rdd', fit, cutoff: map.rddCut, error: fit.reason || 'Not enough points inside this bandwidth.' }
            : { kind: 'rdd', fit, bins: rddBins(y, x, map.rddCut, 6), xs: x, ys: y, cutoff: map.rddCut, dropped };
        }
        if (method === 'sc') {
          if (!map.scUnit || !map.scWave || !map.scY || !map.scTreated || !Number.isFinite(map.scPost)) {
            return { error: 'Pick the unit, wave and outcome columns, the treated unit and the first post wave.' };
          }
          const ui = ds.columns.indexOf(map.scUnit);
          const wi = ds.columns.indexOf(map.scWave);
          const yi = ds.columns.indexOf(map.scY);
          const cells = new Map();
          for (const row of ds.rows) {
            const unit = String(row[ui] == null ? '' : row[ui]).trim();
            const wave = parseNumber(row[wi]);
            const yv = parseNumber(row[yi]);
            if (unit === '' || !wave.ok || !yv.ok) continue;
            if (!cells.has(unit)) cells.set(unit, new Map());
            cells.get(unit).set(wave.value, yv.value);
          }
          const waves = [...new Set([...cells.values()].flatMap((mm) => [...mm.keys()]))].sort((a, b) => a - b);
          const preWaves = waves.filter((w) => w < map.scPost);
          const postWaves = waves.filter((w) => w >= map.scPost);
          const tMap = cells.get(map.scTreated);
          if (!tMap) return { error: 'The treated unit has no rows in the data.' };
          if (preWaves.length < 1 || postWaves.length < 1) return { error: 'The chosen post wave leaves no pre or post waves to compare.' };
          const allWaves = [...preWaves, ...postWaves];
          if (allWaves.some((w) => !tMap.has(w))) return { error: 'The treated unit needs a value in every wave.' };
          const donors = [...cells.keys()].filter((u) => u !== map.scTreated && allWaves.every((w) => cells.get(u).has(w)));
          if (donors.length === 0) return { error: 'No donor unit has a value in every wave.' };
          const sc = syntheticControl({
            treatedPre: preWaves.map((w) => tMap.get(w)),
            treatedPost: postWaves.map((w) => tMap.get(w)),
            donorPre: donors.map((u) => preWaves.map((w) => cells.get(u).get(w))),
            donorPost: donors.map((u) => postWaves.map((w) => cells.get(u).get(w))),
            donorNames: donors,
          });
          const treatedPts = allWaves.map((w) => ({ x: w, y: tMap.get(w) }));
          const synPts = allWaves
            .map((w) => {
              let acc = 0;
              let wsum = 0;
              for (const u of donors) {
                const wt = sc.weights.find((x) => x.name === u).weight;
                acc += wt * cells.get(u).get(w);
                wsum += wt;
              }
              return wsum > 0 ? { x: w, y: acc / wsum } : null;
            })
            .filter(Boolean);
          return {
            kind: 'sc',
            sc,
            treated: { state: map.scTreated },
            preIdx: [],
            treatedPts,
            synPts,
            donors: [],
            yLabel: map.scY,
            xLabel: `Wave (${map.scWave})`,
            preLabel: `Wave ${preWaves[preWaves.length - 1]}`,
          };
        }
        if (method === 'match') {
          if (!map.matchY || !map.matchX || !Number.isFinite(map.matchCut) || map.matchCovs.length === 0) {
            return { error: 'Pick the treatment rule (a column and a numeric cutoff), an outcome and at least one covariate.' };
          }
          const { rows, dropped, rowNos } = completeCases(ds, [map.matchX, map.matchY, ...map.matchCovs]);
          if (rows.length < 4) return tooFew(rows.length);
          const y = rows.map((r) => r[map.matchY]);
          const treat = rows.map((r) => (r[map.matchX] >= map.matchCut ? 1 : 0));
          const X = rows.map((r) => [1, ...map.matchCovs.map((k) => r[k])]);
          return {
            kind: 'match',
            match: propensityMatch({ y, treat, X }),
            names: map.matchCovs,
            labels: rowNos.map((n) => `row ${n}`),
            dropped,
          };
        }
        return { error: 'This design is not available on custom data yet.' };
      }
      if (method === 'ols') {
        const y = censusRows.map((r) => r[spec.olsY]);
        const X = censusRows.map((r) => [1, ...spec.olsX.map((k) => r[k])]);
        return { kind: 'table', fit: ols(y, X), names: ['const', ...spec.olsX.map((k) => CENSUS_VARS[k])] };
      }
      if (method === 'logit') {
        const y = censusRows.map((r) => (r[spec.logitY] >= spec.logitCut ? 1 : 0));
        const X = censusRows.map((r) => [1, ...spec.logitX.map((k) => r[k])]);
        return { kind: 'table', fit: logit(y, X), names: ['const', ...spec.logitX.map((k) => CENSUS_VARS[k])], events: y.reduce((a, b) => a + b, 0) };
      }
      if (method === 'iv') {
        const y = censusRows.map((r) => r[spec.ivY]);
        const X = censusRows.map((r) => [1, r[spec.ivEnd], ...spec.ivExog.map((k) => r[k])]);
        const Z = censusRows.map((r) => [1, r[spec.ivInst], ...spec.ivExog.map((k) => r[k])]);
        return {
          kind: 'table',
          fit: tsls(y, X, Z),
          names: ['const', CENSUS_VARS[spec.ivEnd], ...spec.ivExog.map((k) => CENSUS_VARS[k])],
          instrument: CENSUS_VARS[spec.ivInst],
        };
      }
      if (method === 'did') {
        const list = nfhsList(spec.didInd).map((r) => ({
          ...r,
          base: r[spec.didBase],
        })).filter((r) => r.base != null);
        const cut = spec.didCut;
        const rows = [];
        for (const r of list) {
          const treated = spec.didRule === 'above' ? r.base >= cut : r.base <= cut;
          [r.n3, r.n4, r.n5].forEach((v, w) => {
            if (v != null) rows.push({ unit: r.state, wave: w, y: v, firstTreat: treated ? 2 : null });
          });
        }
        return {
          kind: 'did',
          fit: didTWFE(rows),
          table: didTable(rows, 2),
          study: didEventStudy(rows, spec.didBase === 'n3' ? 0 : 1),
          nTreated: list.filter((r) => (spec.didRule === 'above' ? r.base >= cut : r.base <= cut)).length,
          nControl: list.filter((r) => (spec.didRule === 'above' ? r.base < cut : r.base > cut)).length,
        };
      }
      if (method === 'rdd') {
        const x = censusRows.map((r) => r[spec.rddX]);
        const y = censusRows.map((r) => r[spec.rddY]);
        const fuzzyD = spec.rddFuzzy ? censusRows.map((r) => r[spec.rddTake]) : null;
        const fit = rddLocal(y, x, spec.rddCut, {
          bandwidth: spec.rddBw, donut: spec.rddDonut, fuzzyD,
        });
        return fit.singular
          ? { kind: 'rdd', fit, cutoff: spec.rddCut, error: fit.reason || 'Not enough points inside this bandwidth.' }
          : { kind: 'rdd', fit, bins: rddBins(y, x, spec.rddCut, 6), xs: x, ys: y, cutoff: spec.rddCut };
      }
      if (method === 'sc') {
        const list = nfhsList(spec.scInd);
        const treated = list.find((r) => r.state === spec.scState);
        const donors = list.filter((r) => r.state !== spec.scState && r.n4 != null);
        const preIdx = [treated.n3 != null ? 0 : -1, 1].filter((i) => i >= 0);
        const treatedPre = preIdx.map((i) => [treated.n3, treated.n4][i]);
        const donorPre = donors.map((d) => preIdx.map((i) => [d.n3, d.n4][i]));
        const sc = syntheticControl({
          treatedPre, treatedPost: [treated.n5],
          donorPre, donorPost: donors.map((d) => [d.n5]),
          donorNames: donors.map((d) => d.state),
        });
        // trajectories for the chart: treated and its synthetic twin per wave
        const keys = ['n3', 'n4', 'n5'];
        const treatedPts = keys
          .map((key, w) => ({ x: w, y: treated[key] }))
          .filter((p) => p.y != null);
        const synPts = keys
          .map((key, w) => {
            let acc = 0;
            let wsum = 0;
            for (const d of donors) {
              if (d[key] == null) continue;
              const wt = sc.weights.find((x) => x.name === d.state).weight;
              acc += wt * d[key];
              wsum += wt;
            }
            return wsum > 0 ? { x: w, y: acc / wsum } : null;
          })
          .filter(Boolean);
        return { kind: 'sc', sc, treated, preIdx, treatedPts, synPts, donors };
      }
      if (method === 'match') {
        const y = censusRows.map((r) => r[spec.matchY]);
        const treat = censusRows.map((r) => (r[spec.matchX] >= spec.matchCut ? 1 : 0));
        const X = censusRows.map((r) => [1, ...spec.matchCovs.map((k) => r[k])]);
        return {
          kind: 'match',
          match: propensityMatch({ y, treat, X }),
          names: spec.matchCovs.map((k) => CENSUS_VARS[k]),
          labels: censusRows.map((r) => r.s),
        };
      }
      return null;
    } catch (err) {
      return { error: String(err && err.message ? err.message : err) };
    }
  }, [method, spec, dataSource, custom, map]);

  const copyText = () => {
    const lines = [`THS evaluation engine: ${METHODS[method].label}`, ''];
    if (result && result.fit && result.fit.beta) {
      result.fit.beta.forEach((b, i) => {
        const nm = result.names ? result.names[i] : `b${i}`;
        lines.push(`${nm}\t${fmtNum(b)}\tSE ${fmtNum(result.fit.se[i])}\tp ${fmtP(result.fit.p[i])}`);
      });
      lines.push('', `N ${result.fit.n}`);
    } else if (result && result.fit && result.fit.effect != null) {
      lines.push(`effect\t${fmtNum(result.fit.effect)}\tSE ${fmtNum(result.fit.se)}\tp ${fmtP(result.fit.p)}`);
    } else if (result && result.sc) {
      result.sc.weights.filter((w) => w.weight > 0.001).forEach((w) => {
        lines.push(`${w.name}\t${fmtNum(w.weight, 3)}`);
      });
      lines.push('', `mean post gap\t${fmtNum(result.sc.postMeanGap)}`);
    } else if (result && result.match) {
      lines.push(`ATT\t${fmtNum(result.match.att)}\tSE ${fmtNum(result.match.se)}\tp ${fmtP(result.match.p)}`);
    }
    lines.push('', dataSource === 'custom'
      ? 'Source: user-supplied data, ingested and mapped in the THS evaluation engine. Runs in the browser.'
      : 'Source: Census of India 2011 and IIPS NFHS state factsheets, via the THS data commons. Runs in the browser.');
    lines.push('', '--- Public interest check ---');
    for (const [q, a] of [
      ['Who benefits?', pit.whoBenefits],
      ['Who pays?', pit.whoPays],
      ['Who is missing from the data?', pit.whoMissing],
    ]) {
      lines.push(`${q} ${String(a || '').trim() || '[not answered]'}`);
    }
    lines.push('Who is missing (computed):', ...who.lines.map((l) => `  ${l}`));
    return lines.join('\n');
  };

  return (
    <section>
      <div className="section-head">
        <span className="overline">Evaluation engine</span>
        <h2>Run the identification yourself</h2>
        <p className="section-strap">
          Every estimate on this page is computed in your browser from the
          complete census and the national family health surveys: real
          population coverage, no server, no black box. Pick a method, set the
          design, and read what the numbers will and will not support.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Estimation methods">
        {Object.entries(METHODS).map(([id, m]) => (
          <button
            key={id}
            className={`chip ${method === id ? 'chip-active' : ''}`}
            onClick={() => setMethod(id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3>Data</h3>
        <div className="filter-row" role="group" aria-label="Data source">
          <button
            type="button"
            className={`chip ${dataSource === 'builtin' ? 'chip-active' : ''}`}
            onClick={() => setDataSource('builtin')}
          >
            Census and NFHS (built in)
          </button>
          <button
            type="button"
            className={`chip ${dataSource === 'custom' ? 'chip-active' : ''}`}
            onClick={() => setDataSource('custom')}
          >
            Your own data
          </button>
        </div>
        {dataSource === 'custom' && (
          <div className="control" style={{ marginTop: '1rem' }}>
            <label htmlFor="custom-data">Paste a CSV (or JSON row objects) or load a file</label>
            <textarea
              id="custom-data"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={6}
              spellCheck="false"
              placeholder={'state,litF,logPop,stShare\nBihar,63.8,16.3,20.1\n...'}
            />
            <input
              type="file"
              accept=".csv,.json,.txt"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) loadCustomFile(f);
              }}
            />
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={loadCustom} disabled={customText.trim() === ''}>
                Use this data
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={shareWithBattery}
                disabled={!custom || !custom.validation.ok}
                aria-describedby="share-battery-hint"
              >
                Share with the battery
              </button>
            </div>
            <p id="share-battery-hint" className="fine-print" style={{ margin: '0.35rem 0 0' }}>
              {shareNote || 'Validate a table first; sharing passes the rows to the battery, where the ingest adapters rebuild a module input from them.'}
            </p>
            {custom && custom.validation.errors.length === 0 && <WhoCard who={who} compact />}
            {custom && (
              <p className="fine-print" style={{ marginBottom: 0 }}>
                {custom.validation.rowsParsed} rows · {custom.dataset.columnCount} columns ·{' '}
                {custom.validation.errors.length} errors · {custom.validation.warnings.length} warnings.
                {custom.validation.errors.length > 0
                  ? ` ${custom.validation.errors.join(' ')}`
                  : ` Numeric columns: ${numericColNames(custom.validation).join(', ') || 'none detected'}.`}
              </p>
            )}
            {shared.length > 0 && (
              <div className="control" style={{ marginTop: '1rem' }}>
                <label>Shared from the battery</label>
                <div className="filter-row" role="group" aria-label="Shared datasets">
                  {shared.map((d) => (
                    <span key={d.id} className="shared-row">
                      <button type="button" className="chip" onClick={() => loadShared(d)}>
                        {d.name} · {d.dataset.rowCount} rows
                      </button>
                      <button
                        type="button"
                        className={`pin-btn ${d.pinned ? 'pin-btn-on' : ''}`}
                        aria-pressed={!!d.pinned}
                        onClick={() => {
                          const r = togglePin(d.id);
                          setPinNote(
                            r.pinned && !r.persisted
                              ? 'Local storage is blocked in this browser, so this pin lasts only until the tab closes.'
                              : '',
                          );
                        }}
                        title={d.pinned ? 'Pinned: kept after the tab closes. Click to unpin.' : 'Pin: keep this dataset after the tab closes.'}
                      >
                        {d.pinned ? 'Pinned' : 'Pin'}
                      </button>
                    </span>
                  ))}
                </div>
                <p className="fine-print" style={{ margin: '0.35rem 0 0' }}>
                  Ingested in the Battery or loaded here. Click one to analyse
                  it. Unpinned datasets vanish when the tab closes; pinned ones
                  stay until you unpin them.
                  {pinNote && <strong> {pinNote}</strong>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lab-grid">
        <div className="card lab-spec">
          <h3>Design</h3>
          {dataSource === 'builtin' ? (
          <>
          {method === 'ols' && (
            <>
              <Control label="Outcome">
                <select value={spec.olsY} onChange={(e) => set('olsY', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label="Regressors">
                {Object.entries(CENSUS_VARS).map(([k, v]) => (
                  <label key={k} className="check-row">
                    <input
                      type="checkbox"
                      checked={spec.olsX.includes(k)}
                      disabled={k === spec.olsY}
                      onChange={(e) => set('olsX', e.target.checked ? [...spec.olsX, k] : spec.olsX.filter((x) => x !== k))}
                    />
                    {v}
                  </label>
                ))}
              </Control>
            </>
          )}
          {method === 'logit' && (
            <>
              <Control label="Threshold outcome (state is 1 when...)">
                <div className="inline-fields">
                  <select value={spec.logitY} onChange={(e) => set('logitY', e.target.value)}>
                    {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <span className="op">≥</span>
                  <NumInput
                    id="logit-cut"
                    value={spec.logitCut}
                    onChange={(v) => set('logitCut', v)}
                  />
                </div>
              </Control>
              <Control label="Regressors">
                {Object.keys(CENSUS_VARS).map((k) => (
                  <label key={k} className="check-row">
                    <input
                      type="checkbox"
                      checked={spec.logitX.includes(k)}
                      disabled={k === spec.logitY}
                      onChange={(e) => set('logitX', e.target.checked ? [...spec.logitX, k] : spec.logitX.filter((x) => x !== k))}
                    />
                    {CENSUS_VARS[k]}
                  </label>
                ))}
              </Control>
            </>
          )}
          {method === 'iv' && (
            <>
              <Control label="Outcome">
                <select value={spec.ivY} onChange={(e) => set('ivY', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label="Endogenous regressor">
                <select value={spec.ivEnd} onChange={(e) => set('ivEnd', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label="Instrument">
                <select value={spec.ivInst} onChange={(e) => set('ivInst', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label="Exogenous controls">
                {Object.keys(CENSUS_VARS).map((k) => (
                  <label key={k} className="check-row">
                    <input
                      type="checkbox"
                      checked={spec.ivExog.includes(k)}
                      disabled={k === spec.ivEnd || k === spec.ivInst || k === spec.ivY}
                      onChange={(e) => set('ivExog', e.target.checked ? [...spec.ivExog, k] : spec.ivExog.filter((x) => x !== k))}
                    />
                    {CENSUS_VARS[k]}
                  </label>
                ))}
              </Control>
            </>
          )}
          {method === 'did' && (
            <>
              <Control label="Outcome indicator (NFHS)">
                <select value={spec.didInd} onChange={(e) => set('didInd', e.target.value)}>
                  {nfhsIndicators.map((i) => <option key={i.key} value={i.key}>{i.label} ({i.unit})</option>)}
                </select>
              </Control>
              <Control label="Baseline wave (defines the groups)">
                <select value={spec.didBase} onChange={(e) => set('didBase', e.target.value)}>
                  <option value="n3">2005-06 (NFHS-3)</option>
                  <option value="n4">2015-16 (NFHS-4)</option>
                </select>
              </Control>
              <Control label="Treated group">
                <div className="inline-fields">
                  <select value={spec.didRule} onChange={(e) => set('didRule', e.target.value)}>
                    <option value="above">baseline at or above</option>
                    <option value="below">baseline at or below</option>
                  </select>
                  <NumInput
                    id="did-cut"
                    value={spec.didCut}
                    onChange={(v) => set('didCut', v)}
                  />
                </div>
              </Control>
              <p className="fine-print">
                Effect window: the 2019-21 wave. Groups are fixed by the baseline
                value, so nothing is assigned after the fact.
              </p>
            </>
          )}
          {method === 'rdd' && (
            <>
              <Control label="Running variable">
                <select value={spec.rddX} onChange={(e) => set('rddX', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label="Outcome">
                <select value={spec.rddY} onChange={(e) => set('rddY', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label={`Cutoff (${fmtNum(spec.rddCut, 1)})`}>
                <input
                  type="range"
                  min={Math.min(...censusRows.map((r) => r[spec.rddX]))}
                  max={Math.max(...censusRows.map((r) => r[spec.rddX]))}
                  step="0.5"
                  value={spec.rddCut}
                  onChange={(e) => set('rddCut', Number(e.target.value))}
                />
              </Control>
              <Control label={`Bandwidth (${fmtNum(spec.rddBw, 1)})`}>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={spec.rddBw}
                  onChange={(e) => set('rddBw', Number(e.target.value))}
                />
              </Control>
              <Control label={`Donut hole (${fmtNum(spec.rddDonut, 1)})`}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={spec.rddDonut}
                  onChange={(e) => set('rddDonut', Number(e.target.value))}
                />
              </Control>
              <label className="check-row">
                <input type="checkbox" checked={spec.rddFuzzy} onChange={(e) => set('rddFuzzy', e.target.checked)} />
                Fuzzy design (Wald ratio on a take-up jump)
              </label>
              {spec.rddFuzzy && (
                <Control label="Take-up variable">
                  <select value={spec.rddTake} onChange={(e) => set('rddTake', e.target.value)}>
                    {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Control>
              )}
            </>
          )}
          {method === 'sc' && (
            <>
              <Control label="Outcome indicator (NFHS)">
                <select value={spec.scInd} onChange={(e) => set('scInd', e.target.value)}>
                  {nfhsIndicators.map((i) => <option key={i.key} value={i.key}>{i.label} ({i.unit})</option>)}
                </select>
              </Control>
              <Control label="Treated state">
                <select value={spec.scState} onChange={(e) => set('scState', e.target.value)}>
                  {nfhsStates.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
                </select>
              </Control>
              <p className="fine-print">
                Donor pool: every other state with a 2015-16 value. Pre-period
                fit uses 2005-06 and 2015-16 where the state has both.
              </p>
            </>
          )}
          {method === 'match' && (
            <>
              <Control label="Treated when">
                <div className="inline-fields">
                  <select value={spec.matchX} onChange={(e) => set('matchX', e.target.value)}>
                    {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <span className="op">≥</span>
                  <NumInput
                    id="match-cut"
                    value={spec.matchCut}
                    onChange={(v) => set('matchCut', v)}
                  />
                </div>
              </Control>
              <Control label="Outcome">
                <select value={spec.matchY} onChange={(e) => set('matchY', e.target.value)}>
                  {Object.entries(CENSUS_VARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Control>
              <Control label="Balance on">
                {Object.keys(CENSUS_VARS).map((k) => (
                  <label key={k} className="check-row">
                    <input
                      type="checkbox"
                      checked={spec.matchCovs.includes(k)}
                      disabled={k === spec.matchX || k === spec.matchY}
                      onChange={(e) => set('matchCovs', e.target.checked ? [...spec.matchCovs, k] : spec.matchCovs.filter((x) => x !== k))}
                    />
                    {CENSUS_VARS[k]}
                  </label>
                ))}
              </Control>
            </>
          )}
          </>
          ) : (
            <CustomRoles method={method} map={map} setMap={setMap} custom={custom} />
          )}
          <div className="btn-row">
            <CopyButton text={copyText()} />
            <button type="button" className="btn btn-secondary" onClick={() => onNavigate && onNavigate('data')}>
              See the data
            </button>
          </div>
          <div className="control" style={{ marginTop: '1.25rem' }}>
            <label>Public interest check (travels with copied results)</label>
            <textarea
              value={pit.whoBenefits}
              onChange={(e) => setPit({ ...pit, whoBenefits: e.target.value })}
              placeholder="Who benefits from this estimate?"
              rows={2}
            />
            <textarea
              value={pit.whoPays}
              onChange={(e) => setPit({ ...pit, whoPays: e.target.value })}
              placeholder="Who pays?"
              rows={2}
            />
            <textarea
              value={pit.whoMissing}
              onChange={(e) => setPit({ ...pit, whoMissing: e.target.value })}
              placeholder="Who is missing from the data?"
              rows={2}
              aria-describedby="who-missing-hint"
            />
            {pitDraft && (
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPit({
                    whoBenefits: pitDraft.whoBenefits,
                    whoPays: pitDraft.whoPays,
                    whoMissing: pitDraft.whoMissing,
                  })}
                >
                  Fill the three answers from the stakeholder map{pitDraft.policyName ? ` (${pitDraft.policyName})` : ''}
                </button>
              </div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPit({ ...pit, whoMissing: who.lines.join(' ') })}
              >
                Fill the third answer with the computed receipt
              </button>
            </div>
            <p id="who-missing-hint" className="fine-print" style={{ margin: '0.35rem 0 0' }}>
              Unanswered fields print as [not answered] in copied results. The
              computed receipt prints beside them either way.
            </p>
          </div>
        </div>

        <div className="lab-results">
          {result && <WhoCard who={who} />}
          {result && result.error && (
            <div className="card"><p className="placeholder">The design needs adjusting: {result.error}</p></div>
          )}
          {result && result.kind === 'table' && result.fit && result.fit.beta && (
            <>
              <div className="card">
                <h3>Coefficient table</h3>
                <CoefTable fit={result.fit} names={result.names} />
                <p className="fine-print">
                  N {result.fit.n}
                  {result.dropped ? ` · ${result.dropped} rows dropped as incomplete` : ''}
                  {result.fit.r2 != null && Number.isFinite(result.fit.r2) ? ` · R2 ${fmtNum(result.fit.r2)} · adj R2 ${fmtNum(result.fit.adjR2)}` : ''}
                  {result.fit.pseudoR2 != null ? ` · McFadden pseudo-R2 ${fmtNum(result.fit.pseudoR2)}` : ''}
                  {result.fit.converged != null ? ` · IRLS ${result.fit.converged ? 'converged' : 'did not converge'}` : ''}
                  {result.events != null ? ` · ${result.events} states above the threshold` : ''}
                </p>
                {result.instrument && (
                  <p className="fine-print">
                    First-stage fit for {result.instrument}: R2{' '}
                    {result.fit.r2First && result.fit.r2First.length > 1
                      ? fmtNum(result.fit.r2First[1])
                      : 'n/a'}.
                    A weak first stage makes the estimate worse than OLS, not better.
                  </p>
                )}
                <CoefficientPlot
                  rows={result.names
                    .map((nm, i) => ({ section: 'lab', variable: nm, beta: result.fit.beta[i], se: result.fit.se[i] }))
                    .filter((r) => r.variable !== 'const')}
                  xLabel="Estimate with 95% interval"
                  yLabel=""
                />
              </div>
              <Limits method={method} />
            </>
          )}
          {result && result.kind === 'rdd' && result.fit && result.fit.effect != null && (
            <>
              <div className="card">
                <h3>{result.fit.fuzzy ? 'Fuzzy discontinuity (Wald ratio)' : 'Discontinuity at the cutoff'}</h3>
                <div className="stat-grid">
                  <div className="stat-cell"><span className="stat-label">Estimate</span><span className="data-num stat-value">{fmtNum(result.fit.effect)}</span></div>
                  <div className="stat-cell"><span className="stat-label">Robust SE</span><span className="data-num stat-value">{fmtNum(result.fit.se)}</span></div>
                  <div className="stat-cell"><span className="stat-label">p</span><span className="data-num stat-value">{fmtP(result.fit.p)}</span></div>
                  <div className="stat-cell"><span className="stat-label">Points in band</span><span className="data-num stat-value">{result.fit.nUsed}</span></div>
                </div>
                {result.fit.firstStage && (
                  <p className="fine-print">
                    First stage: take-up jumps {fmtNum(result.fit.firstStage.jump)} at the cutoff
                    (p {fmtP(result.fit.firstStage.p)}). Left {result.fit.nLeft} points, right {result.fit.nRight}.
                  </p>
                )}
                <RddChart y={result.ys} x={result.xs} cutoff={result.cutoff} fit={result.fit} bins={result.bins} />
                <p className="fine-print">
                  Bandwidth {fmtNum(result.fit.bandwidth, 1)}, donut {fmtNum(result.fit.donut, 1)}.
                  Bigger bands mean more points and more bias. Move both and watch the estimate.
                </p>
              </div>
              <Limits method={method} />
            </>
          )}
          {result && result.kind === 'did' && result.table && result.fit && (
            <>
              <div className="card">
                <h3>The 2x2 receipt</h3>
                <table className="result-table">
                  <thead>
                    <tr>
                      <th scope="col">Group</th>
                      <th scope="col">Before</th>
                      <th scope="col">After</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Treated ({result.nTreated} {dataSource === 'custom' ? 'units' : 'states'})</th>
                      <td className="data-num">{fmtNum(result.table.preTreated, 2)}</td>
                      <td className="data-num">{fmtNum(result.table.postTreated, 2)}</td>
                      <td className="data-num">{fmtNum(result.table.changeTreated, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Control ({result.nControl} {dataSource === 'custom' ? 'units' : 'states'})</th>
                      <td className="data-num">{fmtNum(result.table.preControl, 2)}</td>
                      <td className="data-num">{fmtNum(result.table.postControl, 2)}</td>
                      <td className="data-num">{fmtNum(result.table.changeControl, 2)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="fine-print">
                  Raw difference-in-differences: {fmtNum(result.table.rawDID, 2)}.
                </p>
              </div>
              <div className="card">
                <h3>Effect and pre-trend</h3>
                <div className="stat-grid">
                  <div className="stat-cell"><span className="stat-label">Effect</span><span className="data-num stat-value">{fmtNum(result.fit.effect)}</span></div>
                  <div className="stat-cell"><span className="stat-label">Cluster SE</span><span className="data-num stat-value">{fmtNum(result.fit.se)}</span></div>
                  <div className="stat-cell"><span className="stat-label">p</span><span className="data-num stat-value">{fmtP(result.fit.p)}</span></div>
                  <div className="stat-cell"><span className="stat-label">{dataSource === 'custom' ? 'Units' : 'States'}</span><span className="data-num stat-value">{result.fit.units}</span></div>
                </div>
                {!result.study.singular && <EventPlot points={result.study.points} />}
                <p className="fine-print">
                  The base wave is pinned to zero. If the earlier wave is not
                  near zero, the parallel-trends story is already failing.
                </p>
              </div>
              <Limits method={method} />
            </>
          )}
          {result && result.kind === 'sc' && result.sc && (
            <>
              <div className="card">
                <h3>Synthetic {result.treated.state}</h3>
                <div className="stat-grid">
                  <div className="stat-cell"><span className="stat-label">Mean post gap</span><span className="data-num stat-value">{fmtNum(result.sc.postMeanGap, 2)}</span></div>
                  <div className="stat-cell"><span className="stat-label">Pre-period MSPE</span><span className="data-num stat-value">{fmtNum(result.sc.mspePre, 3)}</span></div>
                  <div className="stat-cell"><span className="stat-label">Donors used</span><span className="data-num stat-value">{result.sc.weights.filter((w) => w.weight > 0.001).length}</span></div>
                </div>
                <LineChart
                  series={[
                    { label: result.treated.state, points: result.treatedPts },
                    { label: `Synthetic ${result.treated.state}`, points: result.synPts },
                  ]}
                  xLabel={result.xLabel || 'Survey wave (0: 2005-06, 1: 2015-16, 2: 2019-21)'}
                  yLabel={result.yLabel || (nfhsIndicators.find((i) => i.key === spec.scInd) || {}).label || 'Outcome'}
                />
                <table className="result-table">
                  <thead>
                    <tr>
                      <th scope="col">Donor</th>
                      <th scope="col">Weight</th>
                      <th scope="col">{result.preLabel || '2015-16 value'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sc.weights.filter((w) => w.weight > 0.001).slice(0, 8).map((w) => (
                      <tr key={w.name}>
                        <th scope="row">{w.name}</th>
                        <td className="data-num">{fmtNum(w.weight, 3)}</td>
                        <td className="data-num">{fmtNum(w.pre != null ? w.pre[w.pre.length - 1] : null, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="fine-print">
                  Gap by wave, treated minus synthetic:{' '}
                  {[...result.sc.preGap, ...result.sc.postGap].map((g) => fmtNum(g, 2)).join(' · ')}
                </p>
              </div>
              <Limits method={method} />
            </>
          )}
          {result && result.kind === 'match' && result.match && (
            <>
              <div className="card">
                <h3>Effect on the treated</h3>
                <div className="stat-grid">
                  <div className="stat-cell"><span className="stat-label">ATT</span><span className="data-num stat-value">{fmtNum(result.match.att)}</span></div>
                  <div className="stat-cell"><span className="stat-label">SE</span><span className="data-num stat-value">{fmtNum(result.match.se)}</span></div>
                  <div className="stat-cell"><span className="stat-label">p</span><span className="data-num stat-value">{fmtP(result.match.p)}</span></div>
                  <div className="stat-cell"><span className="stat-label">Matched</span><span className="data-num stat-value">{result.match.nMatched}/{result.match.nTreated}</span></div>
                </div>
                <table className="result-table">
                  <thead>
                    <tr>
                      <th scope="col">Treated state</th>
                      <th scope="col">Matched to</th>
                      <th scope="col">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.match.pairs.map((p) => (
                      <tr key={p.treated}>
                        <th scope="row">{result.labels ? result.labels[p.treated] : censusRows[p.treated].s}</th>
                        <td>{result.labels ? result.labels[p.control] : censusRows[p.control].s}</td>
                        <td className="data-num">{fmtNum(p.diff, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Limits method={method} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
