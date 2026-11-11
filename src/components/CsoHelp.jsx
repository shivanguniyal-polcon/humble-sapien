import { useMemo, useState } from 'react';
import { buildCaseNote, caseReference } from '../lib/case';
import { downloadFile } from '../lib/download.js';
import { copyFor, fill } from '../data/samparkCopy';

// The hand-off to THS.
//
// A citizen who wants someone else to carry the case should not have to
// rewrite it. This block prepares the note from the page's own data, gives it
// a reference, and opens the citizen's mail app with the note in it.
//
// Two limits are deliberate. The page never sends anything by itself, and it
// never claims that THS has taken the case. The consent box only changes what
// the citizen is asking for: advice, or representation. Software prepares the
// note; a person reads it before any letter goes out, and no bot signs as the
// citizen.
const THS_MAIL = 'shivang.uni@gmail.com';

export default function CsoHelp({
  scheme,
  situation,
  place,
  rung,
  clock,
  dates,
  t = copyFor('en'),
  showHeading = true,
}) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState(null);

  const reference = useMemo(
    () => caseReference({ scheme, situation, place, rung }),
    [scheme, situation, place, rung]
  );

  const note = useMemo(
    () =>
      buildCaseNote({
        scheme,
        situation,
        place,
        rung,
        clock,
        dates,
        applicant: { name, mobile },
        consent,
        reference,
      }),
    [scheme, situation, place, rung, clock, dates, name, mobile, consent, reference]
  );

  const subject = `THS case ${reference}: ${scheme.name} - ${situation.label}`;
  const mailto = `mailto:${THS_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(note)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setStatus(t.csoCopied);
    } catch {
      setStatus(t.csoCopyFailed);
    }
  };

  const download = () => {
    downloadFile(`THS-case-${reference}.txt`, note, 'text/plain;charset=utf-8');
    setStatus(fill(t.csoSaved, { file: `THS-case-${reference}.txt` }));
  };

  return (
    <section
      className="cso-help"
      aria-labelledby={showHeading ? 'cso-help-title' : undefined}
      aria-label={showHeading ? undefined : t.step7}
    >
      {showHeading && (
        <h3 className="pane-title" id="cso-help-title">
          7. {t.step7}
        </h3>
      )}
      <p>{t.csoIntro}</p>
      <p className="meta">{t.csoNote}</p>

      <div className="cso-fields">
        <label>
          <span>{t.csoName}</span>
          <input
            value={name}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          <span>{t.csoMobile}</span>
          <input
            value={mobile}
            inputMode="tel"
            autoComplete="tel"
            onChange={(event) => setMobile(event.target.value)}
          />
        </label>
      </div>

      <label className="cso-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{t.csoConsent}</span>
      </label>

      <div className="cso-actions">
        <a className="btn btn-primary" href={mailto}>
          {t.csoEmail}
        </a>
        <button type="button" className="btn btn-secondary" onClick={copy}>
          {t.csoCopy}
        </button>
        <button type="button" className="btn btn-secondary" onClick={download}>
          {t.csoDownload}
        </button>
      </div>

      <p className="meta cso-reference">{fill(t.csoReference, { ref: reference })}</p>
      {status && (
        <p className="meta" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
