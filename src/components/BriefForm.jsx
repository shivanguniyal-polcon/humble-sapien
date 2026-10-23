import { useState } from 'react';
import { emptyBrief, validateBrief } from '../battery/businessCase.js';

// The business-case brief: the scoping questions a consulting deliverable
// starts with, in the order a reader expects them. It emits the Battery's
// own CBA input, so nothing downstream changes.
//
// The line editors are deliberately tables of plain fields rather than a
// builder: an analyst pasting a cost from a spreadsheet wants a box per
// number, not a drag interaction.

const LineEditor = ({ title, hint, lines, onChange, kind }) => {
  const set = (i, key, value) => {
    const next = lines.map((l, j) => (i === j ? { ...l, [key]: value } : l));
    onChange(next);
  };
  return (
    <fieldset className="profile-activities">
      <legend>{title}</legend>
      <p className="meta">{hint}</p>
      {lines.length === 0 && (
        <p className="fine-print">No lines yet. Add the first one.</p>
      )}
      {lines.map((l, i) => (
        <div className="brief-line" key={`${kind}-${i}`}>
          <div className="control brief-line-label">
            <label htmlFor={`${kind}-label-${i}`}>Name</label>
            <input
              id={`${kind}-label-${i}`}
              value={l.label}
              onChange={(e) => set(i, 'label', e.target.value)}
              placeholder={kind === 'cost' ? 'Construction assistance' : 'Averted treatment costs'}
            />
          </div>
          <div className="control">
            <label htmlFor={`${kind}-value-${i}`}>Annual value (₹)</label>
            <input
              id={`${kind}-value-${i}`}
              type="number"
              min="0"
              value={l.annualValue}
              onChange={(e) => set(i, 'annualValue', e.target.value)}
            />
          </div>
          <div className="control">
            <label htmlFor={`${kind}-from-${i}`}>From year</label>
            <input
              id={`${kind}-from-${i}`}
              type="number"
              min="0"
              value={l.fromYear}
              onChange={(e) => set(i, 'fromYear', e.target.value)}
            />
          </div>
          <div className="control">
            <label htmlFor={`${kind}-to-${i}`}>To year</label>
            <input
              id={`${kind}-to-${i}`}
              type="number"
              min="0"
              value={l.toYear}
              onChange={(e) => set(i, 'toYear', e.target.value)}
            />
          </div>
          <button
            type="button"
            className="linklike brief-line-remove"
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
            aria-label={`Remove ${l.label || title + ' line'}`}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            onChange([...lines, { label: '', annualValue: '', fromYear: 0, toYear: '' }])
          }
        >
          Add a {kind} line
        </button>
      </div>
    </fieldset>
  );
};

export default function BriefForm({ onBuild }) {
  const [brief, setBrief] = useState(() => emptyBrief());
  const [checked, setChecked] = useState(null);

  // Functional updates: two Add clicks in one tick must not lose a row, so
  // each set reads the latest brief rather than the one this render closed
  // over.
  const set = (key, value) => setBrief((prev) => ({ ...prev, [key]: value }));

  const check = () => {
    const v = validateBrief(brief);
    setChecked(v);
    return v;
  };

  const build = () => {
    const v = check();
    if (v.errors.length === 0) onBuild(brief);
  };

  return (
    <div className="card">
      <h3>Business case brief</h3>
      <p>
        Answer the five questions a consulting brief starts with. The form
        builds the cost-benefit input below it, so the run, the manifest and
        the gate are the same ones every other analysis goes through. Nothing
        is calculated here; this is the scoping half the JSON box never asked
        for.
      </p>

      <div className="control">
        <label htmlFor="bc-question">
          1. What decision is this for? <span className="meta">(who decides, what they choose between, and by when)</span>
        </label>
        <textarea
          id="bc-question"
          rows={2}
          value={brief.question}
          onChange={(e) => set('question', e.target.value)}
          placeholder="Should the mission fund second-generation toilets in the 40 worst blocks before the 2027 monsoon?"
        />
      </div>

      <div className="meta-grid">
        <div className="control">
          <label htmlFor="bc-sponsor">2. Who is the client?</label>
          <input
            id="bc-sponsor"
            value={brief.sponsor}
            onChange={(e) => set('sponsor', e.target.value)}
            placeholder="State rural development mission"
          />
        </div>
        <div className="control">
          <label htmlFor="bc-base">Base year</label>
          <input
            id="bc-base"
            type="number"
            value={brief.baseYear}
            onChange={(e) => set('baseYear', Number(e.target.value))}
          />
        </div>
        <div className="control">
          <label htmlFor="bc-horizon">3. Over how many years?</label>
          <input
            id="bc-horizon"
            type="number"
            min="1"
            max="50"
            value={brief.horizonYears}
            onChange={(e) => set('horizonYears', Number(e.target.value))}
          />
        </div>
      </div>

      <LineEditor
        kind="cost"
        title="4. What does it cost?"
        hint="One row per cost line, flat annual value across the years it runs. Capital costs usually sit in year 0."
        lines={brief.costs}
        onChange={(next) => set('costs', next)}
      />
      <LineEditor
        kind="benefit"
        title="What does it return?"
        hint="In rupees, however rough. Averted treatment costs, additional productivity, recovered fees. The discount rate and its provenance are chosen on the next stage."
        lines={brief.benefits}
        onChange={(next) => set('benefits', next)}
      />

      <fieldset className="profile-activities">
        <legend>5. What does it change that no price can carry?</legend>
        <p className="meta">
          Time saved, safety, dignity, work displaced. Named in physical units
          and by who is affected, because the public interest check asks and a
          blank line is not an answer.
        </p>
        {brief.unpriced.map((u, i) => (
          <div className="brief-line" key={`unpriced-${i}`}>
            <div className="control brief-line-label">
              <label htmlFor={`unpriced-label-${i}`}>Name</label>
              <input
                id={`unpriced-label-${i}`}
                value={u.label}
                onChange={(e) =>
                  set('unpriced', brief.unpriced.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))
                }
              />
            </div>
            <div className="control">
              <label htmlFor={`unpriced-effect-${i}`}>Effect, in units</label>
              <input
                id={`unpriced-effect-${i}`}
                value={u.effect}
                onChange={(e) =>
                  set('unpriced', brief.unpriced.map((x, j) => (i === j ? { ...x, effect: e.target.value } : x)))
                }
                placeholder="hours per household per year"
              />
            </div>
            <div className="control">
              <label htmlFor={`unpriced-who-${i}`}>Who is affected</label>
              <input
                id={`unpriced-who-${i}`}
                value={u.who}
                onChange={(e) =>
                  set('unpriced', brief.unpriced.map((x, j) => (i === j ? { ...x, who: e.target.value } : x)))
                }
                placeholder="Women and girls in beneficiary households"
              />
            </div>
            <button
              type="button"
              className="linklike brief-line-remove"
              onClick={() => set('unpriced', brief.unpriced.filter((_, j) => j !== i))}
              aria-label={`Remove ${u.label || 'unpriced effect'}`}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => set('unpriced', [...brief.unpriced, { label: '', effect: '', who: '' }])}
          >
            Add an unpriced effect
          </button>
        </div>
      </fieldset>

      <fieldset className="profile-activities">
        <legend>The assumptions register</legend>
        <p className="meta">
          Every number in this brief rests on something. Write it down here and
          the report prints it beside the result, with the same verification
          labels the parameter stage uses.
        </p>
        {brief.assumptions.map((a, i) => (
          <div className="brief-line" key={`assumption-${i}`}>
            <div className="control brief-line-label">
              <label htmlFor={`assumption-text-${i}`}>Assumption</label>
              <input
                id={`assumption-text-${i}`}
                value={a.text}
                onChange={(e) =>
                  set('assumptions', brief.assumptions.map((x, j) => (i === j ? { ...x, text: e.target.value } : x)))
                }
                placeholder="Unit cost holds at ₹12,000 per toilet"
              />
            </div>
            <div className="control">
              <label htmlFor={`assumption-source-${i}`}>Source</label>
              <input
                id={`assumption-source-${i}`}
                value={a.source}
                onChange={(e) =>
                  set('assumptions', brief.assumptions.map((x, j) => (i === j ? { ...x, source: e.target.value } : x)))
                }
                placeholder="DDWS SBM-G FAQ"
              />
            </div>
            <div className="control">
              <label htmlFor={`assumption-status-${i}`}>Status</label>
              <select
                id={`assumption-status-${i}`}
                value={a.status}
                onChange={(e) =>
                  set('assumptions', brief.assumptions.map((x, j) => (i === j ? { ...x, status: e.target.value } : x)))
                }
              >
                <option value="verified">Verified against primary source</option>
                <option value="reported">Reported, not verified</option>
                <option value="custom">User supplied</option>
              </select>
            </div>
            <button
              type="button"
              className="linklike brief-line-remove"
              onClick={() => set('assumptions', brief.assumptions.filter((_, j) => j !== i))}
              aria-label={`Remove assumption ${i + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => set('assumptions', [...brief.assumptions, { text: '', source: '', status: 'custom' }])}
          >
            Add an assumption
          </button>
        </div>
      </fieldset>

      <fieldset className="profile-activities">
        <legend>What could make this recommendation wrong</legend>
        <p className="meta">
          One line each. The report prints them under the result, because a
          business case that names its own weak points survives review and one
          that does not, does not.
        </p>
        {brief.risks.map((r, i) => (
          <div className="brief-line" key={`risk-${i}`}>
            <div className="control brief-line-label">
              <label htmlFor={`risk-${i}`}>Risk {i + 1}</label>
              <input
                id={`risk-${i}`}
                value={r}
                onChange={(e) => set('risks', brief.risks.map((x, j) => (i === j ? e.target.value : x)))}
                placeholder="Empanelment lags and the schedule slips a year"
              />
            </div>
            <button
              type="button"
              className="linklike brief-line-remove"
              onClick={() => set('risks', brief.risks.filter((_, j) => j !== i))}
              aria-label={`Remove risk ${i + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => set('risks', [...brief.risks, ''])}
          >
            Add a risk
          </button>
        </div>
      </fieldset>

      {checked && (checked.errors.length > 0 || checked.warnings.length > 0) && (
        <div className={`card ${checked.errors.length > 0 ? 'legal-warnings' : ''}`}>
          {checked.errors.length > 0 && (
            <>
              <h4>Before this can be built</h4>
              <ul className="evidence-list">
                {checked.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </>
          )}
          {checked.warnings.length > 0 && (
            <>
              <h4>Worth knowing</h4>
              <ul className="evidence-list">
                {checked.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={build}>
          Build the cost-benefit input
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setBrief(emptyBrief(brief.baseYear))}>
          Clear the brief
        </button>
      </div>
    </div>
  );
}
