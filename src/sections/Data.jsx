import { useMemo, useState } from 'react';
import datasets from '../data/datasets.json';
import { catalog, byId } from '../data/catalog';
import { pearson, ols, readingFor, formatNumber } from '../lib/stats';
import { censusCoverage, coverageLines, panelReceipt } from '../lib/coverage';
import {
  LineChart,
  ScatterPlot,
  BarChart,
  CoefficientPlot,
} from '../components/charts';
import Methods from './Methods';
import OpenData from './OpenData';

const DAY = 86400000;

const toYear = (iso) => {
  const t = new Date(iso).getTime();
  return new Date(t).getUTCFullYear() + (new Date(t).getUTCMonth() * 30 + new Date(t).getUTCDate()) / 365;
};

// Pair two series at nearest milestone date (within tolerance), deduplicated.
const pairSeries = (a, b, tolDays = 220) => {
  const used = new Set();
  const pairs = [];
  for (const pa of a) {
    let best = null;
    let bestDt = Infinity;
    for (const pb of b) {
      const dt = Math.abs(new Date(pa.d) - new Date(pb.d));
      if (dt < bestDt) {
        bestDt = dt;
        best = pb;
      }
    }
    if (best && bestDt <= tolDays * DAY && !used.has(best.d)) {
      used.add(best.d);
      pairs.push({ xa: pa, yb: best });
    }
  }
  return pairs;
};

const LockPanel = ({ title, rows, onUnlock, onSupport }) => (
  <div className="lock-panel">
    <div className="lock-body">
      <div className="lock-title">
        <span aria-hidden="true">🔒</span> {title}
      </div>
      <p className="meta">
        This dataset is part of <strong>THS Data Commons Plus</strong>, the
        paid tier that cross-subsidises THS&apos;s free tools and field work.
        The schema and first rows are previewable below.
      </p>
      <div className="preview-fade">
        <table className="data-table">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row" style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-primary" onClick={onSupport}>
          Support THS to unlock the Commons
        </button>
        <button className="btn btn-secondary" onClick={onUnlock}>
          Open demo access
        </button>
      </div>
    </div>
  </div>
);

export default function Data({ onNavigate, openSub }) {
  // Deep links from the nav dropdown: #/data/<dataset-id>, #/data/methods,
  // #/data/opendata. Unknown subs fall through to the playground untouched.
  // Seeded from the prop so a fresh load lands on the right view/dataset,
  // then adjusted on change (render-time prop pattern, not an effect).
  const [activeId, setActiveId] = useState(
    openSub && catalog.some((d) => d.id === openSub) ? openSub : 'pmjay',
  );
  const [unlocked, setUnlocked] = useState([]);
  const [xKey, setXKey] = useState('cards_crore');
  const [yKey, setYKey] = useState('admissions_crore');
  const [mode, setMode] = useState('line');
  const [fy, setFy] = useState('2020-21');
  const [view, setView] = useState(
    openSub === 'methods' || openSub === 'opendata' ? openSub : 'playground',
  );

  const [seenSub, setSeenSub] = useState(openSub);
  if (openSub !== seenSub) {
    setSeenSub(openSub);
    if (openSub === 'methods' || openSub === 'opendata') {
      setView(openSub);
    } else if (catalog.some((d) => d.id === openSub)) {
      setActiveId(openSub);
      setView('playground');
    }
  }

  const meta = byId(activeId);
  const locked = meta.tier === 'commons-plus' && !unlocked.includes(activeId);

  const analysis = useMemo(() => {
    if (activeId !== 'pmjay' || locked) return null;
    const sa = datasets.pmjay_series[xKey] || [];
    const sb = datasets.pmjay_series[yKey] || [];
    const pairs = pairSeries(sa, sb);
    // Zero-value launch anchors are the definition of the start, not an
    // observation of the relationship: excluded from analysis, disclosed below.
    const pos = pairs.filter((p) => p.xa.v > 0 && p.yb.v > 0);
    const xs = pos.map((p) => p.xa.v);
    const ys = pos.map((p) => p.yb.v);
    const r = pearson(xs, ys);
    return {
      pos,
      fit: pos.length >= 3 ? ols(xs, ys) : null,
      r,
      r2: r * r,
      n: pos.length,
    };
  }, [activeId, locked, xKey, yKey]);

  const seriesLabel = (key) =>
    meta.series.find((s) => s.key === key)?.label ?? key;

  const stateView = useMemo(() => {
    if (activeId !== 'states' || locked) return null;
    const rows = datasets.pmjay_states.filter((r) => r.fy === fy);
    rows.sort((a, b) => b.a - a.a);
    return rows.slice(0, 12);
  }, [activeId, locked, fy]);

  const growthView = useMemo(() => {
    if (activeId !== 'states' || locked) return null;
    const byState = {};
    for (const r of datasets.pmjay_states) {
      byState[r.s] = { ...(byState[r.s] || {}) };
      byState[r.s][r.fy] = r.a;
    }
    return Object.entries(byState)
      .filter(([, v]) => v['2019-20'] !== undefined && v['2020-21'] !== undefined)
      .map(([s, v]) => ({
        x: v['2019-20'],
        y: v['2020-21'],
        note: s,
      }));
  }, [activeId, locked]);

  // Absence receipts, computed and never typed. For the national series pair:
  // which milestones fall out of the pairing window. For the states table:
  // which states and years are absent, against the Census 2011 universe.
  const pairReceipt = useMemo(() => {
    if (activeId !== 'pmjay' || locked) return null;
    const sa = datasets.pmjay_series[xKey] || [];
    const sb = datasets.pmjay_series[yKey] || [];
    const pairs = pairSeries(sa, sb);
    const pairedA = new Set(pairs.map((p) => p.xa.d));
    const pairedB = new Set(pairs.map((p) => p.yb.d));
    const unpairedA = sa.filter((x) => !pairedA.has(x.d));
    const unpairedB = sb.filter((b) => !pairedB.has(b.d));
    const zeroAnchors = pairs.filter((p) => !(p.xa.v > 0 && p.yb.v > 0));
    // Resolved from the imported catalog (pure, module-level) rather than the
    // component-scope helper, so the memo does not depend on a new closure.
    const labelOf = (key) => (byId('pmjay').series.find((s) => s.key === key) || {}).label || key;
    const lines = [
      `This relationship pairs ${pairs.length} shared observation(s); the correlation describes only those.`,
    ];
    if (unpairedA.length > 0) {
      lines.push(`${labelOf(xKey)} has ${unpairedA.length} milestone(s) with no counterpart inside the 220-day window, absent from this relationship: ${unpairedA.map((u) => u.d).join(', ')}.`);
    }
    if (unpairedB.length > 0) {
      lines.push(`${labelOf(yKey)} has ${unpairedB.length} milestone(s) absent from this relationship: ${unpairedB.map((u) => u.d).join(', ')}.`);
    }
    if (unpairedA.length === 0 && unpairedB.length === 0) {
      lines.push('Every milestone in both series finds a counterpart; nothing is absent from this pair.');
    }
    if (zeroAnchors.length > 0) {
      lines.push(`${zeroAnchors.length} paired observation(s) excluded as zero-value launch anchors (${zeroAnchors.map((z) => z.xa.d).join(', ')}): a launch date is the definition of the start, not an observation of the relationship.`);
    }
    lines.push('A missing milestone is a missing observation, not a zero. Nothing here is imputed.');
    return { lines };
  }, [activeId, locked, xKey, yKey]);

  const statesReceipt = useMemo(() => {
    if (activeId !== 'states' || locked) return null;
    const rows = datasets.pmjay_states;
    const names = [...new Set(rows.map((r) => r.s))];
    const cov = censusCoverage(names);
    const lines = coverageLines(cov, { estimatedFrom: 'State names taken from the PM-JAY admissions table.' });
    const presentFy = new Set(rows.filter((r) => r.fy === fy).map((r) => r.s));
    const absentFy = names.filter((n) => !presentFy.has(n));
    if (absentFy.length > 0) {
      lines.push(`In FY ${fy} this table names no row for: ${absentFy.join(', ')}. A state absent from a year cannot be ranked in it.`);
    } else {
      lines.push(`Every state in the table has an FY ${fy} row.`);
    }
    if (growthView) {
      const inGrowth = new Set(growthView.map((g) => g.note));
      const leftOut = names.filter((n) => !inGrowth.has(n));
      lines.push(
        leftOut.length === 0
          ? `The FY2019-20 to FY2020-21 comparison covers every state in the table (${names.length}).`
          : `The FY2019-20 to FY2020-21 comparison covers ${growthView.length} of ${names.length} states; outside it: ${leftOut.slice(0, 8).join(', ')}${leftOut.length > 8 ? `, and ${leftOut.length - 8} more` : ''}.`,
      );
    }
    const panel = panelReceipt(rows.map((r) => ({ unit: r.s, wave: r.fy })));
    if (panel.unbalanced.length > 0) {
      const shown = panel.unbalanced.slice(0, 6).map((g) => `${g.unit} (${g.missingWaves.join(', ')})`).join('; ');
      lines.push(`${panel.unbalanced.length} state(s) hold rows for only some years: ${shown}${panel.unbalanced.length > 6 ? ', and more' : ''}. The table is an unbalanced panel; read a year's ranking as that year's coverage.`);
    }
    return { lines, coverage: cov };
  }, [activeId, locked, fy, growthView]);

  const receipt = pairReceipt || statesReceipt;

  const coeffRows = useMemo(() => {
    if (meta.view !== 'coefficients' || locked) return null;
    return (datasets[meta.rowsKey] || []).slice(0, 9).map((r) => ({
      key: r.section || r.Design || r.spec,
      spec: r.spec || r.Design || r.Dose || '',
      variable: r[meta.labelField] || '',
      beta: Number(r[meta.betaField]),
      se: Number(r[meta.seField]),
      N: r.N || '',
    }));
  }, [activeId, locked, meta]);

  return (
    <section>
      <div className="section-head">
        <span className="overline">THS Data Commons</span>
        <h2>Pick a dataset. Break it. See what holds.</h2>
        <p className="section-strap">
          A playground, not a catalogue. Chart any series, pair two datasets and
          run the relationship yourself: correlation, fit and reading update as
          you explore. Everything runs in your browser.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Data view">
        <button
          className={`chip ${view === 'playground' ? 'chip-active' : ''}`}
          aria-pressed={view === 'playground'}
          onClick={() => setView('playground')}
        >
          Playground
        </button>
        <button
          className={`chip ${view === 'methods' ? 'chip-active' : ''}`}
          aria-pressed={view === 'methods'}
          onClick={() => setView('methods')}
        >
          Methods &amp; downloads
        </button>
        <button
          className={`chip ${view === 'opendata' ? 'chip-active' : ''}`}
          aria-pressed={view === 'opendata'}
          onClick={() => setView('opendata')}
        >
          Open data directory
        </button>
      </div>

      {view === 'methods' ? (
        <Methods />
      ) : view === 'opendata' ? (
        <OpenData
          onNavigate={onNavigate}
          onOpenDataset={(run) => {
            setActiveId(run);
            setView('playground');
          }}
        />
      ) : (
      <div className="playground">
        <div className="play-controls">
          <div>
            <label id="ds-label">Dataset</label>
            <div className="dataset-list" role="group" aria-labelledby="ds-label">
              {catalog.map((d) => (
                <button
                  key={d.id}
                  className={`dataset-card ${activeId === d.id ? 'dataset-active' : ''}`}
                  onClick={() => setActiveId(d.id)}
                >
                  <div className="dataset-title">{d.title}</div>
                  <div className="dataset-meta">
                    {d.rows} rows · {d.unitNote}
                  </div>
                  <div style={{ marginTop: '0.45rem' }}>
                    <span
                      className={`chip chip-tag ${d.tier === 'commons-plus' ? 'chip-locked' : ''}`}
                    >
                      {d.tier === 'open' ? 'Open' : 'Commons Plus'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {activeId === 'pmjay' && !locked && (
            <>
              <div>
                <label htmlFor="x-key">First series</label>
                <select id="x-key" value={xKey} onChange={(e) => setXKey(e.target.value)}>
                  {meta.series.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} ({s.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="y-key">Second series</label>
                <select id="y-key" value={yKey} onChange={(e) => setYKey(e.target.value)}>
                  {meta.series.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} ({s.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label id="mode-label">View</label>
                <div className="filter-row" role="group" aria-labelledby="mode-label" style={{ marginBottom: 0 }}>
                  <button
                    className={`chip ${mode === 'line' ? 'chip-active' : ''}`}
                    onClick={() => setMode('line')}
                  >
                    Trajectories
                  </button>
                  <button
                    className={`chip ${mode === 'scatter' ? 'chip-active' : ''}`}
                    onClick={() => setMode('scatter')}
                  >
                    Relationship
                  </button>
                </div>
              </div>
            </>
          )}

          {activeId === 'states' && !locked && (
            <div>
              <label htmlFor="fy-pick">Financial year</label>
              <select id="fy-pick" value={fy} onChange={(e) => setFy(e.target.value)}>
                {['2018-19', '2019-20', '2020-21', '2021-22'].map((y) => (
                  <option key={y} value={y}>
                    FY {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="meta" style={{ margin: 0 }}>
            {meta.description}
          </p>
          <p className="meta" style={{ margin: 0 }}>
            Source: {meta.source}
          </p>
        </div>

        <div className="stack">
          {locked ? (
            <LockPanel
              title={meta.title}
              rows={
                activeId === 'states'
                  ? datasets.pmjay_states.slice(0, 6).map((r) => [r.s, r.fy, String(r.a)])
                  : (datasets[meta.rowsKey] || []).slice(0, 6).map((r) => [
                      r.spec || r.Design || r.Dose || '',
                      r[meta.labelField] || '',
                      String(r[meta.betaField] ?? '').slice(0, 7),
                    ])
              }
              onUnlock={() => setUnlocked([...unlocked, activeId])}
              onSupport={() => onNavigate('support')}
            />
          ) : (
            <>
              {activeId === 'pmjay' && mode === 'line' && (
                <div className="chart-surface">
                  <h3>Trajectories, indexed to first shared milestone = 100</h3>
                  <p className="meta">
                    Different units on one honest footing: both series are set to
                    100 at their first shared non-zero milestone so growth curves
                    compare directly. Zero-value launch anchors are excluded.
                  </p>
                  <LineChart
                    xLabel="Year"
                    yLabel="Index (first shared milestone = 100)"
                    series={[
                      {
                        label: seriesLabel(xKey),
                        points: analysis.pos.map((p) => ({
                          x: toYear(p.xa.d),
                          y: (p.xa.v / analysis.pos[0].xa.v) * 100,
                        })),
                      },
                      {
                        label: seriesLabel(yKey),
                        points: analysis.pos.map((p) => ({
                          x: toYear(p.yb.d),
                          y: (p.yb.v / analysis.pos[0].yb.v) * 100,
                        })),
                      },
                    ]}
                  />
                  <div className="chart-legend">
                    <span>
                      <span className="legend-swatch" style={{ background: 'var(--color-series-1)' }} />
                      {seriesLabel(xKey)}
                    </span>
                    <span>
                      <span className="legend-swatch" style={{ background: 'var(--color-series-2)' }} />
                      {seriesLabel(yKey)}
                    </span>
                  </div>
                </div>
              )}

              {activeId === 'pmjay' && mode === 'scatter' && (
                <div className="chart-surface">
                  <h3>Does one move with the other?</h3>
                  <ScatterPlot
                    points={analysis.pos.map((p) => ({
                      x: p.xa.v,
                      y: p.yb.v,
                      note: `${p.xa.d} / ${p.yb.d}`,
                    }))}
                    fit={analysis.fit}
                    xLabel={`${seriesLabel(xKey)} (${meta.series.find((s) => s.key === xKey).unit})`}
                    yLabel={`${seriesLabel(yKey)} (${meta.series.find((s) => s.key === yKey).unit})`}
                  />
                  <div className="stat-grid">
                    <div className="stat">
                      <span className="stat-num">{analysis.n}</span>
                      <span className="stat-label">Shared observations</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{formatNumber(analysis.r)}</span>
                      <span className="stat-label">Pearson r</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{formatNumber(analysis.r2)}</span>
                      <span className="stat-label">R² (variance shared)</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">
                        {analysis.fit ? formatNumber(analysis.fit.slope) : 'n/a'}
                      </span>
                      <span className="stat-label">Fitted slope</span>
                    </div>
                  </div>
                  <div className="reading">
                    <p>
                      {readingFor(analysis.r, analysis.n, seriesLabel(xKey), seriesLabel(yKey))}
                    </p>
                    <p className="meta">
                      Observations paired at nearest milestone date (within 220
                      days); zero-value launch anchors excluded; the dashed line
                      is an ordinary least-squares fit.
                    </p>
                  </div>
                </div>
              )}

              {activeId === 'states' && (
                <>
                  <div className="chart-surface">
                    <h3>Top states by authorised admissions, FY {fy}</h3>
                    <BarChart
                      bars={stateView.map((r) => ({ label: r.s, y: r.a }))}
                      xLabel={`States (FY ${fy})`}
                      yLabel="Authorised admissions"
                    />
                  </div>
                  {growthView && growthView.length >= 3 && (
                    <div className="chart-surface">
                      <h3>Did growth follow the base? FY2019-20 vs FY2020-21</h3>
                      <ScatterPlot
                        points={growthView}
                        fit={ols(growthView.map((p) => p.x), growthView.map((p) => p.y))}
                        xLabel="Admissions, FY2019-20"
                        yLabel="Admissions, FY2020-21"
                      />
                      <div className="reading">
                        <p>
                          {readingFor(
                            pearson(
                              growthView.map((p) => p.x),
                              growthView.map((p) => p.y),
                            ),
                            growthView.length,
                            'Prior-year admissions',
                            'Next-year admissions',
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {meta.view === 'coefficients' && coeffRows && (
                <div className="chart-surface">
                  <h3>Estimated effects with 95% intervals</h3>
                  <p className="meta">
                    Point estimates with 95% intervals (β ± 2SE). A bar crossing
                    zero is consistent with no effect at this sample size.
                  </p>
                  <CoefficientPlot
                    rows={coeffRows.map((r) => ({
                      section: r.key,
                      variable: r.variable,
                      beta: r.beta,
                      se: r.se,
                    }))}
                    xLabel="Estimated effect (percentage points)"
                    yLabel="Specification"
                  />
                  <table className="data-table" style={{ marginTop: '1.5rem' }}>
                    <thead>
                      <tr>
                        <th>Specification</th>
                        <th>Variable</th>
                        <th>β</th>
                        <th>SE</th>
                        <th>N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coeffRows.map((r, i) => (
                        <tr key={`${r.key}-${r.variable}-${i}`}>
                          <td>{r.spec}</td>
                          <td>{r.variable}</td>
                          <td>{formatNumber(r.beta)}</td>
                          <td>{formatNumber(r.se)}</td>
                          <td>{r.N}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {receipt && (
                <div className="receipt-block">
                  <p className="approach-key">Who is absent from this view (computed)</p>
                  {receipt.coverage && (
                    <>
                      <div
                        className="meter"
                        role="img"
                        aria-label={`Unit coverage ${receipt.coverage.coveragePct.toFixed(1)} percent of the enumerated population`}
                      >
                        <div
                          className="meter-fill"
                          style={{ width: `${Math.min(100, receipt.coverage.coveragePct).toFixed(1)}%` }}
                        />
                      </div>
                      <p className="fine-print" style={{ margin: '0.35rem 0 0.6rem' }}>
                        {receipt.coverage.matched.length} of {receipt.coverage.universeSize} census 2011 units ·{' '}
                        {receipt.coverage.coveragePct.toFixed(1)}% of the enumerated population.
                      </p>
                    </>
                  )}
                  <ul className="fine-print" style={{ marginBottom: 0 }}>
                    {receipt.lines.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
