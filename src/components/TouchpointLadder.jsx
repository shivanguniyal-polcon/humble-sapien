import { RUNG_STATUS, LEVELS } from '../data/schemes';
import { rungKey } from '../data/verification';
import { verification, verificationText } from '../lib/verification';
import { copyFor } from '../data/samparkCopy';

// The ladder, drawn.
//
// Each rung says three things: which office it is, what that office decides,
// and how firm the claim is. The status badge is not decoration. A rung
// marked "created by law" was read out of a statute; a rung marked "post name
// varies by state" is a true statement about a job, not about a title, and a
// citizen who walks in and asks for the wrong title loses the visit.
//
// When a place is known, its rung is marked as the citizen's own, and the
// rungs above it become the escalation path.
export default function TouchpointLadder({
  scheme,
  situation,
  rung,
  placeLabel,
  addressedLevel,
  onAddress,
  onPickSituation,
  t = copyFor('en'),
}) {
  if (!scheme) return null;
  const current = situation || scheme.situations[0];
  if (!current) return null;

  const levelIndex = Object.fromEntries(LEVELS.map((l, i) => [l.id, i]));
  const pinnedIndex = rung ? levelIndex[rung] : -1;
  const levelName = (id) =>
    t[`level${id.charAt(0).toUpperCase()}${id.slice(1)}`] || id;

  return (
    <div className="ladder">
      {scheme.situations.length > 1 && (
        <div className="filter-row" role="group" aria-label={t.ladderChooseNeed}>
          {scheme.situations.map((s) => (
            <button
              key={s.id}
              className={`chip ${current.id === s.id ? 'chip-active' : ''}`}
              onClick={() => onPickSituation && onPickSituation(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <ol className="ladder-list">
        {current.rungs.map((r) => {
          const idx = levelIndex[r.level];
          const isYours = idx === pinnedIndex;
          const isAbove = pinnedIndex >= 0 && idx > pinnedIndex;
          const status = RUNG_STATUS[r.status];
          const statusKey = r.status
            ? `rung${r.status.charAt(0).toUpperCase()}${r.status.slice(1)}`
            : '';
          const check = verification('rungs', rungKey(scheme.id, current.id, r.level));
          return (
            <li
              key={`${r.level}-${r.office}`}
              className={`ladder-rung ${isYours ? 'is-yours' : ''} ${isAbove ? 'is-above' : ''}`}
            >
              <div className="ladder-rung-head">
                <span className="ladder-level">{levelName(r.level)}</span>
                {isYours && (
                  <span className="ladder-here">
                    {t.ladderYourRung}{placeLabel ? ` · ${placeLabel}` : ''}
                  </span>
                )}
                {onAddress && (
                  <button
                    type="button"
                    className={`ladder-address ${addressedLevel === r.level ? 'is-addressed' : ''}`}
                    aria-pressed={addressedLevel === r.level}
                    onClick={() => onAddress(r.level)}
                  >
                    {addressedLevel === r.level ? t.ladderLetterGoesHere : t.ladderAddressHere}
                  </button>
                )}
              </div>

              <h4 className="ladder-office">{r.office}</h4>
              <p className="ladder-post">{r.post}</p>
              <p className="ladder-decides">
                <span className="meta">{t.rungDecisionLabel}: </span>
                {r.decides}
              </p>

              <dl className="ladder-facts">
                <div>
                  <dt>{t.ladderWhere}</dt>
                  <dd>{r.where}</dd>
                </div>
                <div>
                  <dt>{t.ladderCarry}</dt>
                  <dd>{r.carry}</dd>
                </div>
              </dl>

              <p className="ladder-source">
                <span
                  className={`chip chip-tag ladder-status ladder-status-${r.status}`}
                  title={statusKey ? t[`${statusKey}Detail`] : ''}
                >
                  {statusKey ? t[`${statusKey}Label`] : status ? status.label : r.status}
                </span>
                <span className="meta">{r.source}</span>
              </p>

              <p className={`meta verification verification-${check.state}`}>
                {verificationText(t, check)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
