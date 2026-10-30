import { useMemo, useState } from 'react';
import { LEVELS } from '../data/schemes';
import { downloadFile } from '../lib/download.js';
import { deadlineLines, buildLetter, describePlace } from '../lib/india/letter';

// The sheet.
//
// The tool names the office. The sheet is what the citizen carries to the
// counter: the rung the letter is addressed to, the line above it if that
// office does not answer, the dates, and a letter they can hand over.
//
// The address is a choice, not a consequence of the pin on the map. A
// citizen whose village secretary is the problem must be able to keep the
// village in the letter and send it to the block. A passed deadline moves
// the default up one rung, and the citizen can move it again.
//
// It prints on one page and copies to the clipboard, so it works on a
// feature phone as well as on a printer.
export default function Sheet({
  scheme,
  situation,
  place,
  rung,
  rungs,
  homeLevel,
  escalated,
  onAddress,
  clock,
  dates,
}) {
  const [copied, setCopied] = useState(null);
  const [lang, setLang] = useState('en');
  const [applicant, setApplicant] = useState({ name: '', mobile: '', id: '' });

  const lines = useMemo(() => deadlineLines(clock, dates), [clock, dates]);
  const hindi = Boolean(situation && situation.hi);
  const effectiveLang = lang === 'hi' && hindi ? 'hi' : 'en';

  const letter = useMemo(
    () =>
      situation
        ? buildLetter({
            scheme,
            situation,
            place,
            rung,
            clock,
            dates,
            lang: effectiveLang,
            applicant,
          })
        : '',
    [scheme, situation, place, rung, clock, dates, effectiveLang, applicant]
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
    const name = `${scheme.name}-${situation.id}${effectiveLang === 'hi' ? '-hi' : ''}.txt`.replace(
      /[^\w.-]+/g,
      '-'
    );
    downloadFile(name, letter, 'text/plain;charset=utf-8');
    setCopied(`Saved as ${name}.`);
  };

  const addressedIndex = rung ? LEVELS.findIndex((l) => l.id === rung.level) : -1;
  const above =
    rung && addressedIndex >= 0
      ? rungs.filter((r) => LEVELS.findIndex((l) => l.id === r.level) > addressedIndex)
      : [];

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
        {describePlace(place) || 'Pick a place on the map and this sheet fills itself in.'}
      </p>

      {place && rungs.length > 0 && (
        <label className="sheet-address">
          <span>Address the letter to</span>
          <select value={rung ? rung.level : ''} onChange={(e) => onAddress(e.target.value)}>
            {rungs.map((r) => (
              <option key={r.level} value={r.level}>
                {LEVELS.find((l) => l.id === r.level)?.label || r.level} - {r.office}
              </option>
            ))}
          </select>
        </label>
      )}
      {escalated && rung && homeLevel && rung.level !== homeLevel && (
        <p className="sheet-escalated">
          A deadline below has passed, so this letter is addressed to the office above your own
          rung. Your village and panchayat stay in it.
        </p>
      )}

      {rung && (
        <section className="sheet-block">
          <h4>Where to go</h4>
          <p className="sheet-office">
            <strong>{rung.office}</strong>
            <span className="meta">: {rung.post}</span>
          </p>
          <p className="sheet-line">{rung.decides}</p>
          <dl className="sheet-facts">
            <div>
              <dt>Where</dt>
              <dd>{rung.where}</dd>
            </div>
            <div>
              <dt>Carry</dt>
              <dd>{rung.carry}</dd>
            </div>
          </dl>
          <p className="meta sheet-source">Source: {rung.source}</p>
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
              <li key={`${l.anchor}-${l.what}`}>
                {l.what}. Due on {l.due}
                {l.passed && l.then ? `. ${l.then}` : ''}
                <span className="meta"> {l.source}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sheet-block">
        <div className="sheet-letter-head">
          <h4>The letter</h4>
          {hindi ? (
            <div className="sheet-lang" role="group" aria-label="Letter language">
              <button
                type="button"
                className={`chip ${effectiveLang === 'en' ? 'chip-active' : ''}`}
                aria-pressed={effectiveLang === 'en'}
                onClick={() => setLang('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`chip ${effectiveLang === 'hi' ? 'chip-active' : ''}`}
                aria-pressed={effectiveLang === 'hi'}
                onClick={() => setLang('hi')}
              >
                हिंदी
              </button>
            </div>
          ) : (
            <p className="meta sheet-lang-note">
              Hindi letter: reviewed for MGNREGA, PM-JAY, PM-KISAN, PMAY-G, PM SVANidhi and
              Saubhagya; the other schemes are in English until their text is checked.
            </p>
          )}
        </div>

        <div className="sheet-applicant">
          <label>
            <span>Name</span>
            <input
              value={applicant.name}
              autoComplete="name"
              onChange={(e) => setApplicant((a) => ({ ...a, name: e.target.value }))}
            />
          </label>
          <label>
            <span>Mobile number</span>
            <input
              value={applicant.mobile}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setApplicant((a) => ({ ...a, mobile: e.target.value }))}
            />
          </label>
          <label>
            <span>Job card / application / beneficiary number</span>
            <input
              value={applicant.id}
              onChange={(e) => setApplicant((a) => ({ ...a, id: e.target.value }))}
            />
          </label>
        </div>
        <p className="meta sheet-applicant-note">
          These stay in this browser tab. They are not sent to a server or saved.
        </p>

        <p className="sheet-receipt">
          <strong>Take two copies.</strong> Hand over one and ask the office to put the date, its
          signature and its stamp on your copy. If it will not take the letter, send it by
          registered post and keep the receipt.
        </p>

        <pre className="sheet-letter">{letter}</pre>
      </section>
    </div>
  );
}
