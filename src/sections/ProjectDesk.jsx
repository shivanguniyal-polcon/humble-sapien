import { useEffect, useRef, useState } from 'react';
import NumInput from '../components/NumInput';
import PageHead from '../components/PageHead';
import { downloadFile } from '../lib/download.js';
import { FIELD_GROUPS, fieldByKey, publicFieldKeys } from '../battery/project/schema.js';
import {
  buildMemo,
  HAM_ROAD_CASE,
  runProject,
  runProjectWithLiquidityComparison,
  SOLAR_CASE,
  solveSwitching,
} from '../battery';

const CASES = [
  {
    id: 'solar',
    label: 'Solar IPP',
    fixture: SOLAR_CASE,
    note: 'A 250 MW solar PPA with a 12-year loan against a 25-year asset life.',
  },
  {
    id: 'ham-road',
    label: 'HAM road',
    fixture: HAM_ROAD_CASE,
    note: 'A HAM highway with Authority support and a 15-year annuity.',
  },
];

const MODES = [
  {
    id: 'public',
    label: 'Public audit',
    note: 'The headline assumptions. Every other input comes from the sector template and is shown below.',
  },
  {
    id: 'practitioner',
    label: 'Practitioner',
    note: 'The full schema: construction, debt, tax, reserves, covenants and the economic-lens placeholders.',
  },
];

const USER_EVIDENCE = {
  status: 'user',
  source: 'Entered in the project desk.',
};

// The page is a screening view, not a working model. Two decimals keep the
// verdict and tables readable; the downloaded memo keeps the full precision
// a reviewer needs to reproduce the arithmetic.
const DISPLAY_PRECISION = 2;
const MEMO_PRECISION = 6;

const clone = (value) => JSON.parse(JSON.stringify(value));

const firstOperation = (result) =>
  result?.periods?.find((period) => period.phase === 'operation') || null;

const firstCoverage = (result) => {
  const period = firstOperation(result);
  return period?.liquidityDscr ?? period?.dscr ?? null;
};

const formatRatio = (value) =>
  value == null || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(DISPLAY_PRECISION)}x`;

const fixed = (value, digits) =>
  Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatCr = (value, digits = DISPLAY_PRECISION) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n < 0 ? '−' : ''}₹${fixed(Math.abs(n), digits)} crore`;
};

const formatNum = (value, digits = DISPLAY_PRECISION) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return fixed(value, digits);
};

const formatPct = (value, digits = DISPLAY_PRECISION) =>
  value == null || !Number.isFinite(Number(value)) ? '—' : `${fixed(value, digits)}%`;

const formatSignedPct = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n >= 0 ? '+' : '−'}${fixed(Math.abs(n), DISPLAY_PRECISION)}%`;
};

const formatDisplayValue = (value) => {
  if (value == null) return '—';
  return typeof value === 'number' && Number.isFinite(value)
    ? formatNum(value)
    : String(value);
};

const toError = (error) => ({
  message: error?.message || 'The case did not run.',
  details: Array.isArray(error?.errors)
    ? error.errors.map((detail) => detail?.message || String(detail))
    : [],
});

function effectiveValue(values, key) {
  if (key === 'capexCr') {
    if (values.capexCr != null) return values.capexCr;
    const base = (Number(values.hardCostCr) || 0) + (Number(values.softCostCr) || 0);
    return base * (1 + (Number(values.contingencyPct) || 0) / 100);
  }
  if (key === 'constructionYears') {
    if (values.constructionYears != null) return values.constructionYears;
    return values.constructionMonths == null ? null : Number(values.constructionMonths) / 12;
  }
  return values[key];
}

function buildRaw(values, mode) {
  const raw = clone(values);
  if (mode === 'public') {
    if (raw.capexCr != null) {
      raw.hardCostCr = Number(raw.capexCr);
      raw.softCostCr = 0;
      raw.contingencyPct = 0;
    }
    delete raw.capexCr;
    if (raw.constructionYears != null) {
      raw.constructionMonths = Math.max(0, Math.round(Number(raw.constructionYears) * 12));
    }
    delete raw.constructionYears;
  }
  return raw;
}

function computeRun(values, mode, compareBoth) {
  const raw = buildRaw(values, mode);
  const comparison = compareBoth ? runProjectWithLiquidityComparison(raw) : null;
  const base = comparison ? comparison.base : runProject({ ...raw, liquiditySupport: 'none' });
  const supported = comparison
    ? comparison
    : runProject({ ...raw, liquiditySupport: 'dsra-draw' });
  const selected = values.liquiditySupport === 'dsra-draw' ? supported : base;
  const switching = solveSwitching({ ...raw, liquiditySupport: 'none' }, base);
  const memoBase = comparison
    ? (values.liquiditySupport === 'dsra-draw' ? comparison : comparison.base)
    : selected;
  const memoResult = comparison
    ? { ...memoBase, comparison: comparison.comparison, switching }
    : { ...memoBase, switching };
  const memo = buildMemo(memoResult, raw);
  const memoFull = buildMemo(memoResult, raw, { precision: MEMO_PRECISION });

  return { raw, comparison, base, supported, headline: selected, switching, memo, memoFull };
}

function WeightsInput({ id, value, onChange, describedBy }) {
  const [draft, setDraft] = useState(Array.isArray(value) ? value.join(', ') : '');
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(Array.isArray(value) ? value.join(', ') : '');
  }

  const parts = draft
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
  const invalid = draft.trim() !== '' && (parts.length === 0 || parts.some((part) => !Number.isFinite(part)));

  const commit = () => {
    if (!invalid && parts.length > 0) onChange(parts);
  };

  return (
    <>
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-weights-error ${describedBy || ''}`.trim() : describedBy}
        placeholder="0.5, 0.5"
      />
      {invalid && (
        <span id={`${id}-weights-error`} className="input-error" role="alert">
          Use comma-separated numbers, one for each half-year.
        </span>
      )}
    </>
  );
}

function FieldControl({ field, value, onChange }) {
  const id = `project-${field.key}`;
  const helpId = field.help ? `${id}-help` : undefined;
  const describedBy = helpId;
  const numeric = ['number', 'integer', 'currency', 'percent'].includes(field.type);

  let control;
  if (field.type === 'select') {
    control = (
      <select
        id={id}
        value={value == null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
        required={field.required || undefined}
        aria-describedby={describedBy}
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'checkbox') {
    control = (
      <label className="check-row" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={describedBy}
        />
        {field.label}
      </label>
    );
  } else if (field.type === 'textarea') {
    control = (
      <textarea
        id={id}
        rows={3}
        value={value == null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
      />
    );
  } else if (field.type === 'table') {
    control = (
      <WeightsInput
        id={id}
        value={value}
        onChange={onChange}
        describedBy={describedBy}
      />
    );
  } else if (numeric) {
    control = (
      <NumInput
        id={id}
        value={value}
        onChange={onChange}
        min={field.min}
        max={field.max}
        step={field.step}
        describedBy={describedBy}
      />
    );
  } else {
    control = (
      <input
        id={id}
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
        required={field.required || undefined}
        aria-describedby={describedBy}
      />
    );
  }

  return (
    <div className="control">
      {field.type === 'checkbox' ? (
        control
      ) : (
        <>
          <label htmlFor={id}>
            {field.label}
            {field.unit ? <span className="meta"> · {field.unit}</span> : null}
            {field.required ? <span aria-hidden="true"> *</span> : null}
          </label>
          {control}
        </>
      )}
      {field.help && (
        <p id={helpId} className="fine-print">
          {field.help}
        </p>
      )}
    </div>
  );
}

function ComparisonTable({ run, selectedSupport }) {
  const comparison = run.comparison?.comparison;
  if (!comparison) return null;
  const { off, on } = comparison;
  const noDraw = Number(on.totalDsraDrawnCr) <= 1e-9;
  const note = on.uncoveredShortfallCr > 1e-9
    ? 'The facility makes the cash timing work but does not cure the covenant breach.'
    : noDraw
      ? 'No period needed a DSRA draw in this case; the two paths are the same.'
      : 'The reserve covers the first-period shortfall, but the contractual DSCR is unchanged.';

  return (
    <section className="card" aria-labelledby="project-comparison-heading">
      <h3 id="project-comparison-heading">Liquidity support, off versus on</h3>
      <p className="meta">
        Contractual DSCR is a cash-flow covenant. The DSRA is a liquidity source, so a
        reserve draw changes the cash timing and liquidity coverage, not the covenant
        calculation.
      </p>
      <div className="compare-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th scope="col">Test</th>
              <th scope="col" className="data-num">Support off</th>
              <th scope="col" className="data-num">Support on</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">First-period gap</th>
              <td colSpan={2} className="data-num">{formatCr(comparison.firstPeriodGapCr)}</td>
            </tr>
            <tr>
              <th scope="row">Covered by a DSRA draw</th>
              <td colSpan={2} className="data-num">{formatCr(comparison.coveredByDsraCr)}</td>
            </tr>
            <tr>
              <th scope="row">First-period coverage</th>
              <td className="data-num">{formatRatio(off.firstPeriodCoverage)}</td>
              <td className="data-num">{formatRatio(on.firstPeriodCoverage)}</td>
            </tr>
            <tr>
              <th scope="row">Contractual minimum DSCR</th>
              <td className="data-num">{formatRatio(off.contractualMinDscr)}</td>
              <td className="data-num">{formatRatio(on.contractualMinDscr)}</td>
            </tr>
            <tr>
              <th scope="row">Contractual DSCR identical</th>
              <td colSpan={2}>{comparison.contractualDscrIdentical ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <th scope="row">Uncovered shortfall</th>
              <td className="data-num">{formatCr(off.uncoveredShortfallCr)}</td>
              <td className="data-num">{formatCr(on.uncoveredShortfallCr)}</td>
            </tr>
            <tr>
              <th scope="row">Total DSRA drawn</th>
              <td className="data-num">{formatCr(off.totalDsraDrawnCr)}</td>
              <td className="data-num">{formatCr(on.totalDsraDrawnCr)}</td>
            </tr>
            <tr>
              <th scope="row">Total replenished</th>
              <td className="data-num">{formatCr(off.totalDsraReplenishedCr)}</td>
              <td className="data-num">{formatCr(on.totalDsraReplenishedCr)}</td>
            </tr>
            <tr>
              <th scope="row">Released at debt maturity</th>
              <td className="data-num">{formatCr(off.dsraReleasedCr)}</td>
              <td className="data-num">{formatCr(on.dsraReleasedCr)}</td>
            </tr>
            <tr>
              <th scope="row">Project NPV</th>
              <td className="data-num">{formatCr(off.projectNpvCr)}</td>
              <td className="data-num">{formatCr(on.projectNpvCr)}</td>
            </tr>
            <tr>
              <th scope="row">Equity NPV</th>
              <td className="data-num">{formatCr(off.equityNpvCr)}</td>
              <td className="data-num">{formatCr(on.equityNpvCr)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="method-note">{note}</p>
      <p className="fine-print">
        The selected headline path is <strong>{selectedSupport === 'dsra-draw' ? 'with DSRA support' : 'contractual, support off'}</strong>.
        The comparison table always shows both paths so the covenant result cannot be
        mistaken for the liquidity result.
      </p>
    </section>
  );
}

function PeriodTable({ result }) {
  const periods = result.periods.filter((period) => period.phase === 'operation');
  if (periods.length === 0) return null;
  return (
    <section className="card" aria-labelledby="project-periods-heading">
      <h3 id="project-periods-heading">Operating periods</h3>
      <p className="meta">
        Half-yearly cash flow and reserve movement. Construction drawdown and IDC are
        summarised in the funding table above. Coverage is the after-draw ratio where a
        DSRA draw exists, otherwise the contractual DSCR.
      </p>
      <div className="compare-wrap" style={{ maxHeight: '30rem', overflowY: 'auto' }}>
        <table className="result-table" style={{ minWidth: '64rem' }}>
          <caption className="fine-print" style={{ textAlign: 'left' }}>
            {periods.length} operating periods
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-num">Period</th>
              <th scope="col" className="data-num">Year</th>
              <th scope="col" className="data-num">Revenue</th>
              <th scope="col" className="data-num">O&amp;M</th>
              <th scope="col" className="data-num">CFADS</th>
              <th scope="col" className="data-num">Debt service</th>
              <th scope="col" className="data-num">DSCR</th>
              <th scope="col" className="data-num">DSRA draw</th>
              <th scope="col" className="data-num">DSRA close</th>
              <th scope="col" className="data-num">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={`${period.period}-${period.phase}`}>
                <td className="data-num">{period.operationalPeriod}</td>
                <td className="data-num">{period.year}</td>
                <td className="data-num">{formatCr(period.revenueCr)}</td>
                <td className="data-num">{formatCr(period.opexCr)}</td>
                <td className="data-num">{formatCr(period.cfadsCr)}</td>
                <td className="data-num">{formatCr(period.debtServiceCr)}</td>
                <td className="data-num">{formatRatio(period.dscr)}</td>
                <td className="data-num">{formatCr(period.dsraDrawCr)}</td>
                <td className="data-num">{formatCr(period.dsraClosingCr)}</td>
                <td className="data-num">{formatRatio(period.liquidityDscr ?? period.dscr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SwitchingTable({ switching }) {
  if (!switching?.rows) return null;
  const rows = switching.rows.filter(
    (row) => (row.metric === 'minDscr' && Math.abs(row.threshold - 1) < 1e-9)
      || row.metric === 'projectNpvCr',
  );
  return (
    <section className="card" aria-labelledby="project-switching-heading">
      <h3 id="project-switching-heading">What would have to change</h3>
      <p className="meta">
        The nearest crossing in the tested range. These are arithmetic boundaries, not
        forecasts. A missing crossing means the metric did not change sign in the range.
      </p>
      <div className="compare-wrap">
        <table className="result-table" style={{ minWidth: '48rem' }}>
          <thead>
            <tr>
              <th scope="col">Assumption</th>
              <th scope="col" className="data-num">Base</th>
              <th scope="col" className="data-num">Target</th>
              <th scope="col" className="data-num">Change</th>
              <th scope="col" className="data-num">Crossing</th>
              <th scope="col">Binding period</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.parameter}-${row.metric}-${row.threshold}`}>
                <th scope="row">{row.label}</th>
                <td className="data-num">
                  {formatNum(row.baseValue, 2)} {row.unit}
                </td>
                <td>{row.targetLabel}</td>
                <td className="data-num">
                  {row.reachable && row.primary
                    ? formatSignedPct(row.primary.alphaPct)
                    : 'No crossing'}
                </td>
                <td className="data-num">
                  {row.reachable && row.primary
                    ? `${formatNum(row.primary.parameterValue, 2)} ${row.unit}`
                    : '—'}
                </td>
                <td className="data-num">
                  {row.metric === 'minDscr' && row.primary?.bindingPeriod != null
                    ? `${row.primary.bindingPeriod} (year ${row.primary.bindingYear})`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FundingTable({ result }) {
  const funding = result.funding;
  return (
    <section className="card" aria-labelledby="project-funding-heading">
      <h3 id="project-funding-heading">Funding and debt service</h3>
      <table className="result-table">
        <tbody>
          <tr><th scope="row">Gross project cost</th><td className="data-num">{formatCr(funding.grossCostCr)}</td></tr>
          <tr><th scope="row">Capital grant / HAM support</th><td className="data-num">{formatCr(funding.grantCr)}</td></tr>
          <tr><th scope="row">IDC</th><td className="data-num">{formatCr(funding.idcCr)}</td></tr>
          <tr><th scope="row">Initial DSRA</th><td className="data-num">{formatCr(funding.initialDsraCr)}</td></tr>
          <tr><th scope="row">Debt</th><td className="data-num">{formatCr(funding.debtCr)}</td></tr>
          <tr><th scope="row">Equity</th><td className="data-num">{formatCr(funding.equityCr)}</td></tr>
          <tr><th scope="row">Half-yearly debt service</th><td className="data-num">{formatCr(funding.debtServiceCr)}</td></tr>
        </tbody>
      </table>
      <p className="fine-print">
        {result.meta.constructionPeriods} construction periods, {result.meta.operationalPeriods}{' '}
        operating periods, {result.meta.loanPeriods} loan periods.
      </p>
    </section>
  );
}

function ProvenanceTable({ run, caseId }) {
  const provenance = run.base.provenance || {};
  const raw = run.raw;
  const keys = publicFieldKeys(caseId).filter((key) => key !== 'sector');
  return (
    <section className="card" aria-labelledby="project-provenance-heading">
      <h3 id="project-provenance-heading">Where these numbers come from</h3>
      <p className="meta">
        Public assumptions carry their evidence level. Hidden template values still enter
        the run; the lowest evidence level is shown in the memo.
      </p>
      <div className="compare-wrap">
        <table className="result-table" style={{ minWidth: '42rem' }}>
          <thead>
            <tr>
              <th scope="col">Assumption</th>
              <th scope="col" className="data-num">Value</th>
              <th scope="col">Evidence</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const actualKey = key === 'capexCr'
                ? 'hardCostCr'
                : key === 'constructionYears'
                  ? 'constructionMonths'
                  : key;
              const field = fieldByKey(key);
              const evidence = provenance[actualKey] || { status: 'unknown', source: 'Not recorded.' };
              const value = raw[actualKey];
              const shown = key === 'constructionYears' && value != null
                ? Number(value) / 12
                : key === 'capexCr'
                  ? effectiveValue(raw, 'capexCr')
                  : value;
              return (
                <tr key={key}>
                  <th scope="row">{field?.label || key}</th>
                  <td className="data-num">
                    {key === 'liquiditySupport'
                      ? (value === 'dsra-draw' ? 'DSRA draw' : 'None')
                      : formatDisplayValue(shown)}
                    {field?.unit ? ` ${field.unit}` : ''}
                  </td>
                  <td><span className="chip chip-tag">{evidence.status}</span></td>
                  <td className="fine-print">{evidence.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ProjectDesk() {
  const [caseId, setCaseId] = useState('solar');
  const [mode, setMode] = useState('public');
  const [values, setValues] = useState(() => clone(SOLAR_CASE));
  const [compareBoth, setCompareBoth] = useState(true);
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const runId = useRef(0);
  const valuesRef = useRef(values);
  const modeRef = useRef(mode);

  useEffect(() => {
    valuesRef.current = values;
    modeRef.current = mode;
  });

  const caseInfo = CASES.find((entry) => entry.id === caseId) || CASES[0];

  const execute = (snapshotValues, snapshotMode, snapshotCompare) => {
    const id = ++runId.current;
    const snapshotKey = JSON.stringify({ values: snapshotValues, mode: snapshotMode });
    setBusy(true);
    setRun(null);
    setError(null);
    setTimeout(() => {
      try {
        const next = computeRun(snapshotValues, snapshotMode, snapshotCompare);
        if (id !== runId.current) return;
        setRun(next);
        setDirty(snapshotKey !== JSON.stringify({ values: valuesRef.current, mode: modeRef.current }));
      } catch (caught) {
        if (id !== runId.current) return;
        setError(toError(caught));
        setDirty(true);
      } finally {
        if (id === runId.current) setBusy(false);
      }
    }, 0);
  };

  useEffect(() => {
    execute(valuesRef.current, modeRef.current, compareBoth);
    return () => { runId.current += 1; };
    // The run is triggered by case, reload and the two scenario controls only.
    // Other edits stay local until the user presses Run.
  }, [caseId, reload, compareBoth, values.liquiditySupport]);

  const loadCase = (id) => {
    const next = CASES.find((entry) => entry.id === id) || CASES[0];
    setCaseId(next.id);
    setValues(clone(next.fixture));
    setRun(null);
    setError(null);
    setDirty(true);
    setReload((count) => count + 1);
  };

  const updateValue = (key, value) => {
    setDirty(true);
    setError(null);
    setValues((previous) => {
      const next = { ...previous, evidence: { ...previous.evidence } };
      if (key === 'capexCr') {
        const amount = value == null ? null : Number(value);
        delete next.capexCr;
        next.hardCostCr = amount;
        next.softCostCr = 0;
        next.contingencyPct = 0;
        if (amount != null) next.evidence.hardCostCr = USER_EVIDENCE;
      } else if (key === 'constructionYears') {
        const years = value == null ? null : Number(value);
        delete next.constructionYears;
        next.constructionMonths = years == null ? null : Math.max(0, Math.round(years * 12));
        if (next.constructionMonths != null) {
          const periods = Math.max(1, Math.ceil(next.constructionMonths / 6));
          next.constructionPhasing = Array.from({ length: periods }, () => 1 / periods);
          next.evidence.constructionMonths = USER_EVIDENCE;
        }
      } else if (key === 'constructionMonths') {
        next.constructionMonths = value == null ? null : Number(value);
        if (next.constructionMonths != null) {
          const periods = Math.max(1, Math.ceil(next.constructionMonths / 6));
          next.constructionPhasing = Array.from({ length: periods }, () => 1 / periods);
          next.evidence.constructionMonths = USER_EVIDENCE;
        }
      } else {
        next[key] = value;
        if (value != null) next.evidence[key] = USER_EVIDENCE;
      }
      return next;
    });
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
  };

  const visibleGroups = FIELD_GROUPS.map((group) => {
    const fields = group.fields.filter((field) => {
      if (field.key === 'sector' || field.key === 'liquiditySupport') return false;
      if (mode === 'public') {
        if (!publicFieldKeys(caseId).includes(field.key)) return false;
      } else {
        if (!field.modes.includes('practitioner')) return false;
        if (['capexCr', 'constructionYears', 'benefitLines'].includes(field.key)) return false;
      }
      if (field.showIf && !field.showIf(values)) return false;
      return true;
    });
    return { ...group, fields };
  }).filter((group) => group.fields.length > 0);

  const headline = run?.headline;
  const first = headline ? firstCoverage(headline) : null;
  const minimum = headline?.operations?.minDscr;
  const verdict = minimum == null
    ? 'Debt service is not defined for this case.'
    : minimum < 0
      ? 'Cash flow after debt service is negative in at least one period.'
      : minimum < 1
        ? 'The case does not cover debt service on the 1.00x test.'
        : minimum < Number(values.lockupDscr)
          ? `The case covers debt service but stays below the ${Number(values.lockupDscr).toFixed(2)}x lock-up.`
          : `The case covers debt service and stays above the ${Number(values.lockupDscr).toFixed(2)}x lock-up.`;
  const memoText = run?.memoFull?.text || run?.memo?.text || '';
  const downloadMemo = () => {
    if (memoText) downloadFile(`project-memo-${caseId}.txt`, memoText, 'text/plain;charset=utf-8');
  };

  return (
    <section>
      <PageHead
        eyebrow="Infrastructure"
        title="Nirmaan"
        question="Does the project cover its debt?"
      >
        A half-yearly project-finance screening case. It separates the
        contractual DSCR from the liquidity a DSRA draw can provide, and shows
        what would have to change before the case reaches the covenant tests.
        Open the solar or HAM road case, change one assumption at a time, and
        watch the covenant tests and the memo move with it. Everything runs in
        your browser.
      </PageHead>

      <div className="filter-row" role="group" aria-label="Project case">
        {CASES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`chip ${caseId === entry.id ? 'chip-active' : ''}`}
            aria-pressed={caseId === entry.id}
            onClick={() => loadCase(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="filter-row" role="group" aria-label="Form mode">
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`chip ${mode === entry.id ? 'chip-active' : ''}`}
            aria-pressed={mode === entry.id}
            onClick={() => switchMode(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="meta">
        {caseInfo.note} {MODES.find((entry) => entry.id === mode)?.note}
      </p>

      <div className="lab-grid">
        <div className="card lab-spec">
          <div className="fund-row">
            <h3 style={{ margin: 0 }}>{caseInfo.label} assumptions</h3>
            <span className="chip chip-tag">{mode === 'public' ? 'Public' : 'Practitioner'}</span>
          </div>

          {mode === 'practitioner' && (
            <p className="fine-print">
              Practitioner mode uses the hard/soft cost split and construction months.
              Public mode uses one headline capex and construction years. The switch between
              the two is a display convention; the engine receives the same underlying case.
            </p>
          )}

          {visibleGroups.map((group) => (
            mode === 'practitioner' ? (
              <details key={group.id} className="project-group">
                <summary>
                  <strong>{group.label}</strong>{' '}
                  <span className="meta">{group.fields.length} fields</span>
                </summary>
                {group.fields.map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={effectiveValue(values, field.key)}
                    onChange={(value) => updateValue(field.key, value)}
                  />
                ))}
              </details>
            ) : (
              <div key={group.id} className="project-group">
                <h4>{group.label}</h4>
                {group.fields.map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={effectiveValue(values, field.key)}
                    onChange={(value) => updateValue(field.key, value)}
                  />
                ))}
              </div>
            )
          ))}

          <div className="control">
            <span className="meta" id="project-liquidity-label">Liquidity support</span>
            <div className="filter-row" role="group" aria-labelledby="project-liquidity-label">
              <button
                type="button"
                className={`chip ${values.liquiditySupport !== 'dsra-draw' ? 'chip-active' : ''}`}
                aria-pressed={values.liquiditySupport !== 'dsra-draw'}
                onClick={() => updateValue('liquiditySupport', 'none')}
              >
                No draw
              </button>
              <button
                type="button"
                className={`chip ${values.liquiditySupport === 'dsra-draw' ? 'chip-active' : ''}`}
                aria-pressed={values.liquiditySupport === 'dsra-draw'}
                onClick={() => updateValue('liquiditySupport', 'dsra-draw')}
              >
                DSRA draw
              </button>
            </div>
            <p className="fine-print">
              The toggle picks the headline path. The comparison table still shows both.
            </p>
          </div>

          <label className="check-row" htmlFor="project-compare-both">
            <input
              id="project-compare-both"
              type="checkbox"
              checked={compareBoth}
              onChange={(event) => setCompareBoth(event.target.checked)}
            />
            Compare the contractual and supported paths
          </label>

          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => execute(values, mode, compareBoth)}
              disabled={busy}
            >
              {busy ? 'Running…' : 'Run case'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadMemo()}
              disabled={!memoText}
            >
              Download memo
            </button>
          </div>
          {dirty && !busy && (
            <p className="meta" role="status">
              Assumptions changed. Run the case to refresh the numbers.
            </p>
          )}
        </div>

        <div className="lab-results" aria-busy={busy || undefined}>
          {busy && (
            <div className="card" role="status">
              <p style={{ margin: 0 }}>Running the case, switching values and the memo…</p>
            </div>
          )}

          {error && (
            <div className="card" role="alert">
              <h3>The case did not run</h3>
              <p>{error.message}</p>
              {error.details.length > 0 && (
                <ul className="report-warnings">
                  {error.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              )}
            </div>
          )}

          {!busy && !error && !run && (
            <div className="card">
              <h3>Run the reference case</h3>
              <p className="meta" style={{ marginBottom: 0 }}>
                The reference case is loaded. Press <strong>Run case</strong> to calculate the
                DSCR, the DSRA comparison, switching values and the memo.
              </p>
            </div>
          )}

          {!busy && run && headline && (
            <>
              <section className="card" aria-labelledby="project-verdict-heading">
                <div className="fund-row">
                  <h3 id="project-verdict-heading" style={{ margin: 0 }}>Verdict</h3>
                  <span className="chip chip-tag">
                    {values.liquiditySupport === 'dsra-draw' ? 'Support on' : 'Contractual'}
                  </span>
                </div>
                <p>{verdict}</p>
                <div className="stat-grid">
                  <div className="stat">
                    <span className="stat-num">{formatRatio(minimum)}</span>
                    <span className="stat-label">Minimum DSCR</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{formatRatio(first)}</span>
                    <span className="stat-label">First-period coverage</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{formatCr(headline.npv.projectNpvCr)}</span>
                    <span className="stat-label">Project NPV</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{formatPct(headline.npv.projectIrrPct)}</span>
                    <span className="stat-label">Project IRR</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{formatRatio(headline.operations.llcrAtCod)}</span>
                    <span className="stat-label">LLCR at COD</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{formatCr(headline.npv.equityNpvCr)}</span>
                    <span className="stat-label">Equity NPV</span>
                  </div>
                </div>
                <p className="fine-print">
                  First breach of the 1.00x cover test: {headline.operations.firstCoverBreachPeriod ?? 'none'}.
                  {' '}Default covenant breach: {headline.operations.firstDefaultBreachPeriod ?? 'none'}.
                  {' '}Lock-up breach: {headline.operations.firstLockupBreachPeriod ?? 'none'}.
                </p>
              </section>

              {run.comparison && (
                <ComparisonTable run={run} selectedSupport={values.liquiditySupport} />
              )}

              <FundingTable result={headline} />
              <PeriodTable result={headline} />
              <SwitchingTable switching={run.switching} />
              <ProvenanceTable run={run} caseId={caseId} />

              {headline.warnings.length > 0 && (
                <section className="card" aria-labelledby="project-warnings-heading">
                  <h3 id="project-warnings-heading">Warnings</h3>
                  <ul className="report-warnings">
                    {headline.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </section>
              )}

              <section className="card" aria-labelledby="project-memo-heading">
                <div className="fund-row">
                  <h3 id="project-memo-heading" style={{ margin: 0 }}>Memo</h3>
                  <span className="chip chip-tag">Lowest evidence: {run.memo.lowestEvidence}</span>
                </div>
                {run.memo.sections.map((section) => (
                  <div key={section.id}>
                    <h4>{section.title}</h4>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{section.text}</p>
                  </div>
                ))}
                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={downloadMemo}>
                    Download the memo
                  </button>
                </div>
                <p className="fine-print" style={{ marginBottom: 0 }}>
                  This is a screening estimate, not a TEV study, credit rating or investment
                  advice. The output is deterministic; the assumptions are not facts.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
