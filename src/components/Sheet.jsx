import { useMemo, useState } from 'react';
import { LEVELS } from '../data/schemes';
import { downloadFile } from '../lib/download.js';
import { deadlineLines, buildLetter, describePlace } from '../lib/india/letter';
import { rungKey } from '../data/verification';
import { verification, verificationText } from '../lib/verification';
import { schemeContacts } from '../lib/contacts';
import { copyFor, fill } from '../data/samparkCopy';

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
  locale = 'en',
  t = copyFor('en'),
}) {
  const [copied, setCopied] = useState(null);
  const [lang, setLang] = useState('en');
  const [applicant, setApplicant] = useState({ name: '', mobile: '', id: '' });

  const lines = useMemo(
    () => deadlineLines(clock, dates, undefined, locale),
    [clock, dates, locale]
  );
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

  // The date the office was last checked, on the sheet the citizen carries.
  // A clerk can see how fresh the claim is without asking anyone.
  const check = rung
    ? verification('rungs', rungKey(scheme.id, situation.id, rung.level))
    : null;
  const routes = schemeContacts(scheme.id);
  const levelLabel = (id) =>
    t[`level${id.charAt(0).toUpperCase()}${id.slice(1)}`] ||
    LEVELS.find((l) => l.id === id)?.label ||
    id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(t.sheetCopied);
    } catch {
      setCopied(t.sheetCopyFailed);
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
    setCopied(fill(t.sheetSaved, { file: name }));
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
          {t.sheetCopy}
        </button>
        <button type="button" className="btn btn-secondary" onClick={download}>
          {t.sheetDownload}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          {t.sheetPrint}
        </button>
      </div>
      {copied && <p className="sheet-note meta">{copied}</p>}

      {/* The printed sheet carries its own imprint, so a clerk can see where
          it came from and a citizen can file it. On screen the masthead is
          not there; the title below does the work. */}
      <div className="print-masthead">
        <p className="print-imprint">
          <span>The Humble Sapien · {t.sheetCarryTagline}</span>
          <span>{scheme.name}</span>
        </p>
        <p className="print-title">
          {scheme.name}: {situation.label}
        </p>
        <p className="print-where">{describePlace(place) || t.sheetNoPlace}</p>
      </div>

      <h3 className="sheet-title">
        {scheme.name}: {situation.label}
      </h3>
      <p className="sheet-where">
        {describePlace(place) || t.sheetPickPlace}
      </p>

      {place && rungs.length > 0 && (
        <label className="sheet-address">
          <span>{t.sheetAddressTo}</span>
          <select value={rung ? rung.level : ''} onChange={(e) => onAddress(e.target.value)}>
            {rungs.map((r) => (
              <option key={r.level} value={r.level}>
                {levelLabel(r.level)} - {r.office}
              </option>
            ))}
          </select>
        </label>
      )}
      {escalated && rung && homeLevel && rung.level !== homeLevel && (
        <p className="sheet-escalated">
          {t.sheetEscalated}
        </p>
      )}

      {/* On paper these three are the sheet's front page: two columns of
          guidance above the letter, which stays full width to be signed. */}
      <div className="sheet-brief">
        {rung && (
          <section className="sheet-block">
            <h4>{t.sheetWhereToGo}</h4>
            <p className="sheet-office">
              <strong>{rung.office}</strong>
              <span className="meta">: {rung.post}</span>
            </p>
            <p className="sheet-line">
              <span className="meta">{t.rungDecisionLabel}: </span>
              {rung.decides}
            </p>
            <dl className="sheet-facts">
              <div>
                <dt>{t.ladderWhere}</dt>
                <dd>{rung.where}</dd>
              </div>
              <div>
                <dt>{t.ladderCarry}</dt>
                <dd>{rung.carry}</dd>
              </div>
            </dl>
            <p className="meta sheet-source">{t.sourceLabel} {rung.source}</p>
            {check && (
              <p className={`meta sheet-verified verification verification-${check.state}`}>
                {verificationText(t, check)}
              </p>
            )}
          </section>
        )}

        {above.length > 0 && (
          <section className="sheet-block">
            <h4>{t.sheetIfNoAnswer}</h4>
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
            <h4>{t.sheetDates}</h4>
            <ul className="sheet-dates">
              {lines.map((l) => (
                <li key={`${l.anchor}-${l.what}`}>
                  {fill(t.sheetDueLine, { what: l.what, due: l.due })}
                  {l.passed && l.then ? `. ${l.then}` : ''}
                  <span className="meta"> {l.source}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {routes && (
          <section className="sheet-block">
            <h4>{t.sheetHowReach}</h4>
            <ul className="sheet-dates">
              {routes.channels.map((channel) => (
                <li key={channel.kind}>
                  <a
                    href={channel.href}
                    {...(channel.kind === 'phone'
                      ? {}
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {channel.label}
                  </a>
                  <span className="meta"> · {channel.text}</span>
                </li>
              ))}
              {routes.directory && (
                <li>{t.sheetDirectoryNote}</li>
              )}
            </ul>
            {routes.gap && <p className="meta">{routes.gap}</p>}
            {routes.helplines.length > 0 && (
              <p className="meta sheet-source">
                {t.sourceLabel} {routes.helplines[0].source.replace(/^https?:\/\//, '')}
              </p>
            )}
            <p className={`meta verification verification-${routes.check.state}`}>
              {verificationText(t, routes.check)}
            </p>
          </section>
        )}
      </div>

      <section className="sheet-block">
        <div className="sheet-letter-head">
          <h4>{t.sheetTheLetter}</h4>
          {hindi ? (
            <div className="sheet-lang" role="group" aria-label={t.sheetLetterLanguage}>
              <button
                type="button"
                className={`chip ${effectiveLang === 'en' ? 'chip-active' : ''}`}
                aria-pressed={effectiveLang === 'en'}
                onClick={() => setLang('en')}
              >
                {t.sheetLetterEnglish}
              </button>
              <button
                type="button"
                className={`chip ${effectiveLang === 'hi' ? 'chip-active' : ''}`}
                aria-pressed={effectiveLang === 'hi'}
                onClick={() => setLang('hi')}
              >
                {t.sheetLetterHindi}
              </button>
            </div>
          ) : (
            <p className="meta sheet-lang-note">
              {t.sheetHindiNote}
            </p>
          )}
        </div>

        <div className="sheet-applicant">
          <label>
            <span>{t.sheetName}</span>
            <input
              value={applicant.name}
              autoComplete="name"
              onChange={(e) => setApplicant((a) => ({ ...a, name: e.target.value }))}
            />
          </label>
          <label>
            <span>{t.sheetMobile}</span>
            <input
              value={applicant.mobile}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setApplicant((a) => ({ ...a, mobile: e.target.value }))}
            />
          </label>
          <label>
            <span>{t.sheetApplicantId}</span>
            <input
              value={applicant.id}
              onChange={(e) => setApplicant((a) => ({ ...a, id: e.target.value }))}
            />
          </label>
        </div>
        <p className="meta sheet-applicant-note">{t.sheetApplicantNote}</p>

        <p className="sheet-receipt">
          {t.sheetTakeTwo}
        </p>

        <pre className="sheet-letter" lang={effectiveLang === 'hi' ? 'hi' : undefined}>{letter}</pre>
      </section>
    </div>
  );
}
