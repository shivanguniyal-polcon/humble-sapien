import { useMemo, useState } from 'react';
import { census2011, censusDerived } from '../data/census2011';
import { nfhsStates, nfhsIndicators } from '../data/nfhsPanel';
import {
  ols, logit, tsls, didTWFE, didEventStudy, didTable, rddLocal, rddBins,
  syntheticControl, propensityMatch, fmtNum, fmtP,
} from '../lib/econometrics';
import { LineChart, CoefficientPlot } from '../components/charts';

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
            <title>{`${WAVE_LABELS[p.wave]}: ${fmtNum(p.beta)} (SE ${fmtNum(p.se)})`}</title>
          </circle>
          <text x={x(i)} y={H - M.bottom + 22} textAnchor="middle" fontSize="12" fill="var(--color-text-muted)" className="data-num">
            {WAVE_LABELS[p.wave].split(' ')[0]}
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

  const result = useMemo(() => {
    try {
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
          ? { kind: 'rdd', fit, error: fit.reason || 'Not enough points inside this bandwidth.' }
          : { kind: 'rdd', fit, bins: rddBins(y, x, spec.rddCut, 6), xs: x, ys: y };
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
        };
      }
      return null;
    } catch (err) {
      return { error: String(err && err.message ? err.message : err) };
    }
  }, [method, spec]);

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
    lines.push('', 'Source: Census of India 2011 and IIPS NFHS state factsheets, via the THS data commons. Runs in the browser.');
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

      <div className="lab-grid">
        <div className="card lab-spec">
          <h3>Design</h3>
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
                  <input
                    type="number"
                    value={spec.logitCut}
                    onChange={(e) => set('logitCut', Number(e.target.value))}
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
                  <input
                    type="number"
                    value={spec.didCut}
                    onChange={(e) => set('didCut', Number(e.target.value))}
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
                  <input
                    type="number"
                    value={spec.matchCut}
                    onChange={(e) => set('matchCut', Number(e.target.value))}
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
          <div className="btn-row">
            <CopyButton text={copyText()} />
            <button type="button" className="btn btn-secondary" onClick={() => onNavigate && onNavigate('data')}>
              See the data
            </button>
          </div>
        </div>

        <div className="lab-results">
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
                <RddChart y={result.ys} x={result.xs} cutoff={spec.rddCut} fit={result.fit} bins={result.bins} />
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
                      <th scope="row">Treated ({result.nTreated} states)</th>
                      <td className="data-num">{fmtNum(result.table.preTreated, 2)}</td>
                      <td className="data-num">{fmtNum(result.table.postTreated, 2)}</td>
                      <td className="data-num">{fmtNum(result.table.changeTreated, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Control ({result.nControl} states)</th>
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
                  <div className="stat-cell"><span className="stat-label">States</span><span className="data-num stat-value">{result.fit.units}</span></div>
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
                  xLabel="Survey wave (0: 2005-06, 1: 2015-16, 2: 2019-21)"
                  yLabel={nfhsIndicators.find((i) => i.key === spec.scInd).label}
                />
                <table className="result-table">
                  <thead>
                    <tr>
                      <th scope="col">Donor</th>
                      <th scope="col">Weight</th>
                      <th scope="col">2015-16 value</th>
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
                        <th scope="row">{censusRows[p.treated].s}</th>
                        <td>{censusRows[p.control].s}</td>
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
