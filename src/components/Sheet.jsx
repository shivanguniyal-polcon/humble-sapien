import { useMemo, useState } from 'react';
import { LEVELS } from '../data/schemes';
import { deadlineLines, buildLetter } from '../lib/india/letter';

// The sheet.
//
// The tool names the office. The sheet is what the citizen carries to the
// counter: the rung that applies to them, the line above it if that office
// does not answer, the dates, and a letter they can hand over.
//
// It prints on one page and copies to the clipboard, so it works on a
// feature phone as well as on a printer.
export default function Sheet({ scheme, situation, place, clock, dates }) {
  const [copied, setCopied] = useState(null);

  const rungs = situation ? situation.rungs : [];
  const levelIndex = Object.fromEntries(LEVELS.map((l, i) => [l.id, i]));
  const yours = place && place.rung
    ? rungs.find((r) => r.level === place.rung)
    : null;
  const above = yours
    ? rungs.filter((r) => levelIndex[r.level] > levelIndex[yours.level])
    : [];

  const lines = useMemo(() => deadlineLines(clock, dates), [clock, dates]);
  const letter = useMemo(
    () => (situation ? buildLetter({ scheme, situation, place, rung: yours, clock, dates }) : ''),
    [scheme, situation, place, yours, clock, dates]
  );

  if (!situation) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied('The letter is on your clipboard.');
    } catch {
      setCopied('The browser would not copy it. Select the letter and copy it by hand.');
    }
  };

  // The letter as a file, for a citizen who would rather attach it to a
  // message than paste it.
  const download = () => {
    const name = `${scheme.name}-${situation.id}.txt`.replace(/[^\w.-]+/g, '-');
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopied(`Saved as ${name}.`);
  };

  return (
    <div className="sheet">
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={copy}>
          Copy the letter
        </button>
        <button type="button" className="btn btn-secondary" onClick={download}>
          Download the letter
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print this page
        </button>
      </div>
      {copied && <p className="sheet-note meta">{copied}</p>}

      <h3 className="sheet-title">
        {scheme.name}: {situation.label}
      </h3>
      <p className="sheet-where">
        {place && place.path.length
          ? place.path.join(', ')
          : 'Pick a place on the map and this sheet fills itself in.'}
      </p>

      {yours && (
        <section className="sheet-block">
          <h4>Where to go</h4>
          <p className="sheet-office">
            <strong>{yours.office}</strong>
            <span className="meta">: {yours.post}</span>
          </p>
          <p className="sheet-line">{yours.decides}</p>
          <dl className="sheet-facts">
            <div>
              <dt>Where</dt>
              <dd>{yours.where}</dd>
            </div>
            <div>
              <dt>Carry</dt>
              <dd>{yours.carry}</dd>
            </div>
          </dl>
          <p className="meta sheet-source">Source: {yours.source}</p>
        </section>
      )}

      {above.length > 0 && (
        <section className="sheet-block">
          <h4>If that office does not answer</h4>
          <ol className="sheet-above">
            {above.map((r) => (
              <li key={r.level}>
                <strong>{r.office}</strong>
                <span className="meta">: {r.post}</span>
                <br />
                {r.where}
              </li>
            ))}
          </ol>
        </section>
      )}

      {lines.length > 0 && (
        <section className="sheet-block">
          <h4>Dates</h4>
          <ul className="sheet-dates">
            {lines.map((l) => (
              <li key={l.what}>
                {l.what}. Due on {l.due}
                {l.passed && l.then ? `. ${l.then}` : ''}
                <span className="meta"> {l.source}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sheet-block">
        <h4>The letter</h4>
        <pre className="sheet-letter">{letter}</pre>
      </section>
    </div>
  );
}
