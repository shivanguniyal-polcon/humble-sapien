import { useRef, useState } from 'react';
import {
  decisionTree, decisionTreeSample, cba, cbaSample, mcda, mcdaSample,
  scenario, scenarioSample, PMJAY_REFERENCE, DRIVERS,
  cea, ceaSample, equity, equitySample, markov, markovSample,
  budgetImpact, budgetImpactSample, gameTheory, gameTheorySample,
  queueing, queueingSample, monteCarlo, monteCarloSample,
  DISCOUNT_PRESETS, VERIFICATION_LABELS, HORIZON_PRESETS,
  ingest, buildManifest, buildReport, checkPit, PIT_QUESTIONS,
  cbaFromRows, mcdaFromRows, scenarioFromRows, TREE_CSV_NOTE,
  GENERAL_RULES, MODULE_FORMATS, BATTERY_VERSION, formatINRCompact,
} from '../battery';

const STAGES = [
  { id: 1, label: 'Ingest', note: 'Unorganised data becomes an organised dataset with a validation report.' },
  { id: 2, label: 'Bind', note: 'Parameters with provenance. Every value says where it came from.' },
  { id: 3, label: 'Execute', note: 'Deterministic run plus the audit manifest that makes it reproducible.' },
  { id: 4, label: 'Report', note: 'Print-ready output, gated on the public interest check.' },
];

const MODULES = [
  { id: 'decision-tree', label: 'Decision tree', mod: decisionTree },
  { id: 'cba', label: 'Cost-benefit analysis', mod: cba },
  { id: 'mcda', label: 'Multi-criteria ranking', mod: mcda },
  { id: 'scenario', label: 'Scenario analysis', mod: scenario },
  { id: 'cea', label: 'Cost-effectiveness', mod: cea },
  { id: 'equity-cba', label: 'Distributional CBA', mod: equity },
  { id: 'markov', label: 'Markov cohort model', mod: markov },
  { id: 'budget-impact', label: 'Budget impact', mod: budgetImpact },
  { id: 'stakeholder-game', label: 'Stakeholder game', mod: gameTheory },
  { id: 'queueing', label: 'Queue and waiting times', mod: queueing },
  { id: 'monte-carlo', label: 'Monte Carlo risk', mod: monteCarlo },
];

const SAMPLES = {
  'decision-tree': decisionTreeSample,
  cba: cbaSample,
  mcda: mcdaSample,
  scenario: scenarioSample,
  cea: ceaSample,
  'equity-cba': equitySample,
  markov: markovSample,
  'budget-impact': budgetImpactSample,
  'stakeholder-game': gameTheorySample,
  queueing: queueingSample,
  'monte-carlo': monteCarloSample,
};

const JSON_ONLY_NOTE =
  'This module reads the structured JSON input shown below. Load the sample to see the exact shape; the input format table lists every field.';

const INGEST_NOTES = {
  'decision-tree': (format) =>
    format === 'json'
      ? ['JSON detected: check the structure below to confirm it is a tree.']
      : [TREE_CSV_NOTE],
  cba: null, // built by cbaFromRows
  mcda: null, // built by mcdaFromRows
  scenario: null, // built by scenarioFromRows
  cea: () => [JSON_ONLY_NOTE],
  'equity-cba': () => [JSON_ONLY_NOTE],
  markov: () => [JSON_ONLY_NOTE],
  'budget-impact': () => [JSON_ONLY_NOTE],
  'stakeholder-game': () => [JSON_ONLY_NOTE],
  queueing: () => [JSON_ONLY_NOTE],
  'monte-carlo': () => [JSON_ONLY_NOTE],
};

const PLACEHOLDERS = {
  'decision-tree': 'Paste JSON rows or load the sample tree.',
  cba: 'line_id,label,kind,group,year,value\n...',
  mcda: 'alternative,criterion,score,weight,direction,group,who,pit_group,pit_effect\n...',
  scenario: 'scenario_id,scenario_label,driver,value,pit_group,pit_effect\n...',
  cea: 'JSON only for this module. Load the sample to see the structure.',
  'equity-cba': 'JSON only for this module. Load the sample to see the structure.',
  markov: 'JSON only for this module. Load the sample to see the structure.',
  'budget-impact': 'JSON only for this module. Load the sample to see the structure.',
  'stakeholder-game': 'JSON only for this module. Load the sample to see the structure.',
  queueing: 'JSON only for this module. Load the sample to see the structure.',
  'monte-carlo': 'JSON only for this module. Load the sample to see the structure.',
};

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const ValidationCard = ({ validation, notes }) => (
  <div className="card">
    <h3>Validation report</h3>
    {validation ? (
      <>
        <p className="fine-print">
          {validation.rowsParsed} rows parsed · {validation.errors.length} errors ·{' '}
          {validation.warnings.length} warnings
        </p>
        {validation.errors.length > 0 && (
          <ul className="report-warnings">
            {validation.errors.map((e) => <li key={e}>Error: {e}</li>)}
          </ul>
        )}
        {validation.warnings.length > 0 && (
          <ul className="fine-print">
            {validation.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        <table className="result-table">
          <thead>
            <tr>
              <th scope="col">Column</th>
              <th scope="col">Inferred type</th>
              <th scope="col">Missing</th>
              <th scope="col">Distinct</th>
              <th scope="col">Range</th>
            </tr>
          </thead>
          <tbody>
            {validation.schema.map((c) => (
              <tr key={c.name}>
                <th scope="row">{c.name}</th>
                <td>{c.type}</td>
                <td className="data-num">{c.missing}</td>
                <td className="data-num">{c.distinct}</td>
                <td className="data-num">
                  {c.min != null ? `${c.min} to ${c.max}` : (c.samples || []).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ) : (
      <p className="placeholder">Paste or load data, then validate. Nothing is guessed silently.</p>
    )}
    {(notes || []).map((n) => <p key={n} className="fine-print">{n}</p>)}
  </div>
);

export default function Battery({ onNavigate }) {
  const [stage, setStage] = useState(1);
  const [moduleId, setModuleId] = useState('cba');
  const moduleChoice = MODULES.find((m) => m.id === moduleId);

  const [rawText, setRawText] = useState('');
  const [validation, setValidation] = useState(null);
  const [adapterNotes, setAdapterNotes] = useState([]);
  const [inputText, setInputText] = useState(JSON.stringify(cbaSample, null, 2));
  const [structErrors, setStructErrors] = useState([]);
  const [structWarnings, setStructWarnings] = useState([]);

  const [presetId, setPresetId] = useState('health-reference-case');
  const [discountPct, setDiscountPct] = useState(3);
  const [sensitivity, setSensitivity] = useState([0, 5]);
  const [horizon, setHorizon] = useState(10);
  const [provenance, setProvenance] = useState(DISCOUNT_PRESETS[0].provenance);

  const [results, setResults] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [runError, setRunError] = useState('');
  const [pit, setPit] = useState({ whoBenefits: '', whoPays: '', whoMissing: '' });
  const [report, setReport] = useState(null);
  const frameRef = useRef(null);

  const pitCheck = checkPit(pit);

  const loadSample = () => {
    const sample = SAMPLES[moduleId];
    setInputText(JSON.stringify(sample, null, 2));
    setRawText('');
    setValidation(null);
    setAdapterNotes([]);
    setStructErrors([]);
    setStructWarnings([]);
    setResults(null);
    setManifest(null);
    setReport(null);
    if (moduleId === 'cba') setHorizon(sample.horizonYears);
  };

  const switchModule = (id) => {
    setModuleId(id);
    setInputText(JSON.stringify(SAMPLES[id], null, 2));
    setValidation(null);
    setAdapterNotes(INGEST_NOTES[id] ? INGEST_NOTES[id]('csv') : []);
    setStructErrors([]);
    setStructWarnings([]);
    setResults(null);
    setManifest(null);
    setReport(null);
  };

  const runIngest = () => {
    const { dataset, validation: v } = ingest(rawText, { name: 'pasted data' });
    setValidation(v);
    const adapted =
      moduleId === 'cba' && dataset.format !== 'json'
        ? cbaFromRows(dataset, { horizonYears: horizon })
        : moduleId === 'mcda' && dataset.format !== 'json'
          ? mcdaFromRows(dataset)
          : moduleId === 'scenario' && dataset.format !== 'json'
            ? scenarioFromRows(dataset)
            : null;
    if (adapted) {
      if (adapted.input) setInputText(JSON.stringify(adapted.input, null, 2));
      setAdapterNotes(adapted.notes);
      return;
    }
    const noteBuilder = INGEST_NOTES[moduleId];
    setAdapterNotes(noteBuilder ? noteBuilder(dataset.format) : []);
  };

  const checkStructure = () => {
    try {
      const input = JSON.parse(inputText);
      const v = moduleChoice.mod.validate(input);
      setStructErrors(v.errors);
      setStructWarnings(v.warnings);
    } catch (e) {
      setStructErrors([`Not valid JSON: ${e.message}`]);
      setStructWarnings([]);
    }
  };

  const runExecute = async () => {
    try {
      const input = JSON.parse(inputText);
      const v = moduleChoice.mod.validate(input);
      setStructErrors(v.errors);
      setStructWarnings(v.warnings);
      if (v.errors.length > 0) {
        setRunError('The structure has errors. Fix them before running.');
        return;
      }
      const params =
        moduleId === 'cba'
          ? { discountRate: discountPct / 100, sensitivityLo: sensitivity[0] / 100, sensitivityHi: sensitivity[1] / 100 }
          : {};
      const out = moduleChoice.mod.run(input, params);
      const man = await buildManifest({ module: moduleChoice.id, input, params, results: out });
      setResults(out);
      setManifest(man);
      setRunError('');
      setReport(null);
      setStage(3);
    } catch (e) {
      setRunError(String(e && e.message ? e.message : e));
    }
  };

  const buildOut = async () => {
    try {
      const input = JSON.parse(inputText);
      const params =
        moduleId === 'cba'
          ? {
              values: { discountRate: `${discountPct}%`, horizonYears: horizon },
              meta: {
                discountRate: {
                  label: 'Discount rate',
                  provenance,
                  status: (DISCOUNT_PRESETS.find((p) => p.id === presetId) || {}).status || 'custom',
                },
                horizonYears: { label: 'Horizon (years)', provenance: 'Declared by the analyst.', status: 'custom' },
              },
            }
          : moduleId === 'scenario'
            ? {
                values: { referenceCase: 'PM-JAY calibrated' },
                meta: {
                  referenceCase: {
                    label: 'Reference model',
                    provenance: PMJAY_REFERENCE.provenance,
                    status: PMJAY_REFERENCE.status,
                  },
                },
              }
            : {
                values: { parameters: 'Declared in the structured input' },
                meta: {
                  parameters: {
                    label: 'Module parameters',
                    provenance: 'Declared in the structured input; the input hash in the audit manifest pins them.',
                    status: 'custom',
                  },
                },
              };
      const out = await buildReport({
        module: moduleChoice.mod,
        input,
        params,
        results,
        pit,
        source: 'THS Policy Battery sample or user-supplied data; see the validation report.',
        validation,
      });
      setReport(out);
    } catch (e) {
      setRunError(String(e && e.message ? e.message : e));
    }
  };

  const saveProject = () => {
    const project = {
      battery: BATTERY_VERSION,
      module: moduleId,
      inputText,
      presetId,
      discountPct,
      sensitivity,
      horizon,
      provenance,
      pit,
    };
    download('ths-battery-project.json', JSON.stringify(project, null, 2), 'application/json');
  };

  const loadProject = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result));
        setModuleId(p.module || 'cba');
        setInputText(p.inputText || '');
        setPresetId(p.presetId || 'custom');
        setDiscountPct(p.discountPct ?? 3);
        setSensitivity(p.sensitivity || [0, 5]);
        setHorizon(p.horizon ?? 10);
        setProvenance(p.provenance || '');
        setPit(p.pit || { whoBenefits: '', whoPays: '', whoMissing: '' });
        setResults(null);
        setManifest(null);
        setReport(null);
        setStage(1);
      } catch {
        setRunError('That project file could not be read.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <section>
      <div className="section-head">
        <span className="overline">The policy battery</span>
        <h2>Unorganised data in, auditable analysis out</h2>
        <p className="section-strap">
          The same input and parameters produce the same output today and in ten
          years, and the report carries the proof. Four stages, four modules: a
          decision tree, a full cost-benefit analysis, multi-criteria ranking,
          and scenario runs against the calibrated PM-JAY reference model. Each
          ends in a report that cannot be exported until the public interest
          check is answered.
        </p>
      </div>

      <div className="battery-steps" role="group" aria-label="Battery stages">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`step ${stage === s.id ? 'step-active' : ''} ${stage > s.id ? 'step-done' : ''}`}
            onClick={() => setStage(s.id)}
          >
            <span className="step-num data-num">{s.id}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <p className="fine-print">{STAGES.find((s) => s.id === stage).note}</p>

      {stage === 1 && (
        <div className="lab-grid">
          <div className="card lab-spec">
            <h3>Input</h3>
            <div className="control">
              <label>Module</label>
              <div className="filter-row" role="group" aria-label="Module">
                {MODULES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`chip ${moduleId === m.id ? 'chip-active' : ''}`}
                    onClick={() => switchModule(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="control">
              <label>Paste data (CSV or JSON) or load a file</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={PLACEHOLDERS[moduleId]}
              />
              <input
                type="file"
                accept=".csv,.json,.txt"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => setRawText(String(reader.result));
                  reader.readAsText(f);
                }}
              />
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={runIngest} disabled={rawText.trim() === ''}>
                Validate the data
              </button>
              <button type="button" className="btn btn-secondary" onClick={loadSample}>
                Load the sample
              </button>
            </div>
            <div className="control" style={{ marginTop: '1.25rem' }}>
              <label>Structured module input (editable JSON)</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                spellCheck="false"
                style={{ fontFamily: 'var(--font-data)', fontSize: '0.78rem', minHeight: '9rem' }}
              />
              <button type="button" className="btn btn-secondary" onClick={checkStructure}>
                Check structure
              </button>
            </div>
            {structErrors.length > 0 && (
              <ul className="report-warnings">
                {structErrors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
            {structWarnings.length > 0 && (
              <ul className="fine-print">
                {structWarnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStage(2)}
                disabled={structErrors.length > 0}
              >
                Continue to parameters
              </button>
            </div>
          </div>
          <div className="lab-results">
            <div className="card">
              <h3>Input format for this module</h3>
              <p className="fine-print">
                Accepted input: <strong>{(MODULE_FORMATS.find((f) => f.id === moduleId) || {}).answer}</strong>{' '}
                General rules: {GENERAL_RULES[0]} {GENERAL_RULES[3]}
              </p>
              <table className="result-table">
                <thead>
                  <tr>
                    <th scope="col">Column or field</th>
                    <th scope="col">Required</th>
                    <th scope="col">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {((MODULE_FORMATS.find((f) => f.id === moduleId) || {}).columns || []).map((c) => (
                    <tr key={c.name}>
                      <th scope="row">{c.name}</th>
                      <td>{c.required ? 'yes' : 'optional'}</td>
                      <td>{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="fine-print" style={{ marginBottom: 0 }}>
                The full specification, with examples and the rules for every
                module, is on the{' '}
                <button type="button" className="linklike" onClick={() => onNavigate && onNavigate('licensing')}>
                  licensing page
                </button>
                .
              </p>
            </div>
            <ValidationCard validation={validation} notes={adapterNotes} />
          </div>
        </div>
      )}

      {stage === 2 && (
        <div className="lab-grid">
          <div className="card lab-spec">
            <h3>Parameters with provenance</h3>
            {moduleId === 'cba' ? (
              <>
                <div className="control">
                  <label>Discount rate preset</label>
                  <select
                    value={presetId}
                    onChange={(e) => {
                      const p = DISCOUNT_PRESETS.find((x) => x.id === e.target.value);
                      setPresetId(p.id);
                      setDiscountPct(p.discountRate * 100);
                      setSensitivity(p.sensitivity.map((x) => x * 100));
                      setProvenance(p.provenance);
                    }}
                  >
                    {DISCOUNT_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="control">
                  <label>Discount rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value))}
                  />
                </div>
                <div className="control">
                  <label>Horizon (years)</label>
                  <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
                    {HORIZON_PRESETS.map((h) => (
                      <option key={h.id} value={h.years}>{h.label} ({h.years})</option>
                    ))}
                    {[5, 15, 20, 25, 30].map((y) => (
                      <option key={y} value={y}>{y} years</option>
                    ))}
                  </select>
                </div>
                <div className="control">
                  <label>Provenance note (required)</label>
                  <textarea value={provenance} onChange={(e) => setProvenance(e.target.value)} />
                </div>
              </>
            ) : moduleId === 'scenario' ? (
              <>
                <div className="control">
                  <label>Reference model (calibrated, with provenance)</label>
                  <p className="fine-print">
                    <strong>{PMJAY_REFERENCE.label}</strong>
                    <br />
                    Verification: {VERIFICATION_LABELS[PMJAY_REFERENCE.status]}.
                  </p>
                  <p className="fine-print">{PMJAY_REFERENCE.provenance}</p>
                  <p className="fine-print">Source: {PMJAY_REFERENCE.source}</p>
                </div>
                <div className="control">
                  <label>Drivers a scenario may override</label>
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th scope="col">Driver</th>
                        <th scope="col">Calibrated value</th>
                        <th scope="col">Unit</th>
                        <th scope="col">Plausible range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(DRIVERS).map(([k, d]) => (
                        <tr key={k}>
                          <th scope="row">{d.label}</th>
                          <td className="data-num">{PMJAY_REFERENCE.params[k]}</td>
                          <td>{d.unit}</td>
                          <td className="data-num">{d.min} to {d.max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="fine-print">
                    Driver values in the input are absolute levels, not deltas.
                    A scenario that leaves a driver out keeps the calibrated
                    value. Unknown driver names are rejected by the validator.
                  </p>
                </div>
              </>
            ) : moduleId === 'mcda' ? (
              <p className="fine-print">
                The weights and scores live in the structure, so this receipt
                records the scoring method instead. minmax scales every
                criterion to 0 to 1 first and inverts cost criteria; use it
                when criteria sit on different scales. weighted-sum takes the
                scores as given and negates cost criteria. Weights are
                normalised to sum to 1, and the run reports the exact weight
                move that flips the lead.
              </p>
            ) : (
              <p className="fine-print">
                {moduleChoice.mod.bindNote ||
                  'This module takes no economic parameters outside the structure. The distributional column is the public interest parameter.'}
              </p>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStage(3)}
                disabled={moduleId === 'cba' && provenance.trim() === ''}
              >
                Continue to the run
              </button>
            </div>
          </div>
          <div className="lab-results">
            <div className="card">
              <h3>Parameter receipt</h3>
              <table className="result-table">
                <thead>
                  <tr>
                    <th scope="col">Parameter</th>
                    <th scope="col">Value</th>
                    <th scope="col">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleId === 'cba' ? (
                    <>
                      <tr>
                        <th scope="row">Discount rate</th>
                        <td className="data-num">{discountPct}%</td>
                        <td>{VERIFICATION_LABELS[(DISCOUNT_PRESETS.find((p) => p.id === presetId) || {}).status || 'custom']}</td>
                      </tr>
                      <tr>
                        <th scope="row">Sensitivity band</th>
                        <td className="data-num">{sensitivity[0]}% to {sensitivity[1]}%</td>
                        <td>Declared with the preset</td>
                      </tr>
                      <tr>
                        <th scope="row">Horizon</th>
                        <td className="data-num">{horizon} years</td>
                        <td>{VERIFICATION_LABELS.custom}</td>
                      </tr>
                    </>
                  ) : moduleId === 'scenario' ? (
                    <>
                      <tr>
                        <th scope="row">Reference model</th>
                        <td>PM-JAY calibrated</td>
                        <td>{VERIFICATION_LABELS[PMJAY_REFERENCE.status]}</td>
                      </tr>
                      <tr>
                        <th scope="row">Budget envelope</th>
                        <td className="data-num">₹{PMJAY_REFERENCE.params.annualBudgetBase.toLocaleString('en-IN')} Cr/yr shared by every scenario</td>
                        <td>Calibrated to the combined central and state envelope</td>
                      </tr>
                      <tr>
                        <th scope="row">Scenario drivers</th>
                        <td>In the structure</td>
                        <td>{VERIFICATION_LABELS.custom}</td>
                      </tr>
                    </>
                  ) : moduleId === 'mcda' ? (
                    <tr>
                      <th scope="row">Weights, scores and method</th>
                      <td>In the structure</td>
                      <td>{VERIFICATION_LABELS.custom}</td>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="row">{moduleChoice.mod.bindRowLabel || 'Parameters'}</th>
                      <td>In the structure</td>
                      <td>{VERIFICATION_LABELS.custom}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="fine-print" style={{ marginBottom: 0 }}>
                Provenance: {provenance || 'the structure itself'}
              </p>
            </div>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="lab-results">
          <div className="card">
            <h3>Deterministic run</h3>
            <p className="fine-print">
              Engine {BATTERY_VERSION}. The same input and parameters always
              produce these exact numbers and the exact hashes below.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={runExecute}>
                {results ? 'Re-run (identical output)' : 'Run the module'}
              </button>
              {results && (
                <button type="button" className="btn btn-secondary" onClick={() => setStage(4)}>
                  Continue to the report
                </button>
              )}
            </div>
            {runError && <p className="report-warnings">{runError}</p>}
            {structWarnings.map((w) => <p key={w} className="fine-print">{w}</p>)}
          </div>
          {results && (
            <div className="card">
              <h3>Results</h3>
              <div dangerouslySetInnerHTML={{ __html: moduleChoice.mod.renderResults(results, { status: 'custom' }) }} />
            </div>
          )}
          {manifest && (
            <div className="card">
              <h3>Audit manifest</h3>
              <p className="stamp">
                engine {manifest.engine} · module {manifest.module}
                <br />input {manifest.inputHash}
                <br />params {manifest.paramHash}
                <br />output {manifest.outputHash}
              </p>
              <p className="fine-print" style={{ marginBottom: 0 }}>
                Re-run tomorrow with the same files and these three hashes match
                exactly. That is what makes this an audit artefact rather than a
                slide.
              </p>
            </div>
          )}
          {results && moduleId === 'cba' && (
            <div className="card">
              <h3>Headline</h3>
              <p style={{ marginBottom: 0 }}>
                Net present value <strong>{formatINRCompact(results.npv)}</strong>, benefit-cost
                ratio <strong>{results.bcr == null ? 'n/a' : results.bcr.toFixed(2)}</strong> at a{' '}
                {(results.discountRate * 100).toFixed(1)}% discount rate.
              </p>
            </div>
          )}
          {results && moduleId === 'scenario' && (
            <div className="card">
              <h3>Headline</h3>
              <p style={{ marginBottom: 0 }}>
                {(() => {
                  const best = results.scenarios.reduce((a, b) =>
                    a.metrics.requiredBudgetGrowth <= b.metrics.requiredBudgetGrowth ? a : b,
                  );
                  const first = results.scenarios[0];
                  return (
                    <>
                      In <strong>{first.label}</strong>, rationing starts at{' '}
                      <strong>{first.metrics.rationingOnset == null ? 'never' : first.metrics.rationingOnset.toFixed(1)}</strong>. The
                      cheapest scenario, <strong>{best.label}</strong>, still needs the budget to grow{' '}
                      <strong>{(best.metrics.requiredBudgetGrowth * 100).toFixed(1)}% per year</strong> to hold the{' '}
                      {(results.prFloorTarget * 100).toFixed(0)}% payment-ratio floor.
                    </>
                  );
                })()}
              </p>
            </div>
          )}
          {results && moduleId === 'mcda' && (
            <div className="card">
              <h3>Headline</h3>
              <p style={{ marginBottom: 0 }}>
                {(() => {
                  const top = [...results.alternatives].sort((a, b) => a.rank - b.rank)[0];
                  return (
                    <>
                      Highest-ranked: <strong>{top.label}</strong> at {top.total.toFixed(3)}.{' '}
                      {results.flip
                        ? `A ${(results.flip.distance * 100).toFixed(1)} percentage-point move in the weight on ${results.flip.criterionLabel} hands the lead to ${results.flip.challengerLabel}.`
                        : 'No single weight change flips the lead.'}
                    </>
                  );
                })()}
              </p>
            </div>
          )}
          {results && moduleChoice.mod.headline && (
            <div className="card">
              <h3>Headline</h3>
              <p style={{ marginBottom: 0 }}>{moduleChoice.mod.headline(results)}</p>
            </div>
          )}
        </div>
      )}

      {stage === 4 && (
        <div className="lab-grid">
          <div className="card lab-spec">
            <h3>Public interest check (required)</h3>
            <p className="fine-print">
              The report cannot be built until all three are answered. The
              answers print in the artefact, so the nudge travels with the work.
            </p>
            {PIT_QUESTIONS.map((q) => (
              <div key={q.key} className="control">
                <label>{q.label}</label>
                <textarea
                  value={pit[q.key]}
                  onChange={(e) => setPit({ ...pit, [q.key]: e.target.value })}
                  placeholder={q.key === 'whoMissing' ? 'Who is absent from the data behind this run?' : ''}
                />
              </div>
            ))}
            <p className="fine-print">
              {pitCheck.complete ? 'Check complete. The report can be built.' : `Still needed: ${pitCheck.missing.join('; ')}.`}
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={buildOut} disabled={!pitCheck.complete || !results}>
                Build the report
              </button>
              <button type="button" className="btn btn-secondary" onClick={saveProject}>
                Save project file
              </button>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                Load project
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) loadProject(f);
                  }}
                />
              </label>
            </div>
          </div>
          <div className="lab-results">
            <div className="card">
              <h3>Report preview</h3>
              {report ? (
                <>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => download('ths-battery-report.html', report.html, 'text/html')}
                    >
                      Download HTML
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => download('ths-battery-run.json', JSON.stringify(report.json, null, 2), 'application/json')}
                    >
                      Download JSON
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => frameRef.current && frameRef.current.contentWindow.print()}
                    >
                      Print
                    </button>
                  </div>
                  <iframe
                    ref={frameRef}
                    title="Report preview"
                    srcDoc={report.html}
                    className="report-frame"
                  />
                </>
              ) : (
                <p className="placeholder">
                  {results
                    ? 'Answer the three questions, then build the report.'
                    : 'Run the module first. The report renders results, parameters, the public interest check and the audit manifest into one printable document.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="tool-ending">
        <h3>Keep going</h3>
        <div className="btn-row">
          {onNavigate && (
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('work', 'lab')}>
              Check the numbers in the evaluation engine
            </button>
          )}
          {onNavigate && (
            <button type="button" className="btn btn-secondary" onClick={() => onNavigate('work', 'stakeholders')}>
              Map who the policy moves
            </button>
          )}
          {onNavigate && (
            <button type="button" className="btn btn-secondary" onClick={() => onNavigate('licensing')}>
              Read the licence and the input formats
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
