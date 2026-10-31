import NumInput from './NumInput';
import { MAX_SWEEP_POINTS, formatSweepValue, sweepFieldLabel } from '../battery/sweep';

const hashCell = (hash) => (
  <td>
    <code className="battery-sweep-hash" title={hash}>{hash.slice(0, 10)}</code>
  </td>
);

const movement = (label, distinct, total) =>
  `${label} hashes: ${distinct} distinct across ${total} ${total === 1 ? 'run' : 'runs'}.`;

// The Stage 2 sweep card. The parent owns the field and range so a changed
// binding can clear a stale result; this component only renders and reports
// edits.
export default function BatterySweep({
  fields, field, range, onField, onRange, onRun, result, error, busy, note,
}) {
  return (
    <div className="card battery-sweep">
      <h3>Sensitivity sweep</h3>
      <p className="fine-print">
        Re-run the same model across one Stage 2 setting. Every point gets its
        own run and its own SHA-256 manifest, so a result that moves can be
        traced to the number that moved it.
      </p>

      {fields.length === 0 ? (
        <p className="fine-print" style={{ marginBottom: 0 }}>{note}</p>
      ) : (
        <>
          <div className="battery-sweep-controls">
            <div className="control">
              <label htmlFor="battery-sweep-field">Stage 2 setting</label>
              <select
                id="battery-sweep-field"
                value={field.key}
                onChange={(event) => onField(event.target.value)}
              >
                {fields.map((entry) => (
                  <option key={entry.key} value={entry.key}>{sweepFieldLabel(entry)}</option>
                ))}
              </select>
            </div>
            <div className="control">
              <label htmlFor="battery-sweep-from">From</label>
              <NumInput
                id="battery-sweep-from"
                value={range.from}
                onChange={(value) => onRange({ from: value })}
                min={field.min}
                max={field.max}
                step={field.step}
              />
            </div>
            <div className="control">
              <label htmlFor="battery-sweep-to">To</label>
              <NumInput
                id="battery-sweep-to"
                value={range.to}
                onChange={(value) => onRange({ to: value })}
                min={field.min}
                max={field.max}
                step={field.step}
              />
            </div>
            <div className="control">
              <label htmlFor="battery-sweep-points">Points</label>
              <NumInput
                id="battery-sweep-points"
                value={range.steps}
                onChange={(value) => onRange({ steps: value })}
                min={2}
                max={MAX_SWEEP_POINTS}
                step={1}
              />
            </div>
          </div>

          <p className="fine-print">
            Current value: {formatSweepValue(field, field.current)}. {note}
          </p>

          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={onRun} disabled={busy}>
              {busy ? 'Running the sweep…' : 'Run the sweep'}
            </button>
          </div>

          {error && <p className="report-warnings" role="alert">{error}</p>}

          {result && (
            <div className="battery-sweep-output">
              <p className="fine-print" role="status">
                {movement('Parameter', result.distinct.params, result.rows.length)}{' '}
                {movement('Output', result.distinct.outputs, result.rows.length)}{' '}
                {movement('Input', result.distinct.inputs, result.rows.length)}
              </p>
              {result.warnings && result.warnings.length > 0 && (
                <p className="fine-print">{result.warnings.join(' ')}</p>
              )}
              <div className="battery-sweep-table">
                <table className="result-table">
                  <caption className="fine-print">
                    {sweepFieldLabel(field)} from {formatSweepValue(field, result.rows[0].point)} to{' '}
                    {formatSweepValue(field, result.rows[result.rows.length - 1].point)}. Each row
                    is a full run and its audit manifest; hashes are shortened, with the full
                    SHA-256 in the tooltip.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Setting</th>
                      <th scope="col" className="data-num">{result.metricLabel}</th>
                      <th scope="col">Input</th>
                      <th scope="col">Params</th>
                      <th scope="col">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.point}>
                        <th scope="row">{formatSweepValue(field, row.point)}</th>
                        <td className="data-num">{row.metricText}</td>
                        {hashCell(row.manifest.inputHash)}
                        {hashCell(row.manifest.paramHash)}
                        {hashCell(row.manifest.outputHash)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fine-print" style={{ marginBottom: 0 }}>
                {result.distinct.outputs === result.rows.length
                  ? 'Every point produced a different output hash: this setting moves the result across the whole range.'
                  : `${result.rows.length - result.distinct.outputs} repeat output ${result.rows.length - result.distinct.outputs === 1 ? 'hash' : 'hashes'}: between those settings the result does not move.`}{' '}
                The Stage 2 values above are unchanged; this sweep is a diagnostic, not the run.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
