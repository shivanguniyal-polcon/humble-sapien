import { RUNG_STATUS, LEVELS } from '../data/schemes';

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
}) {
  if (!scheme) return null;
  const current = situation || scheme.situations[0];
  if (!current) return null;

  const levelIndex = Object.fromEntries(LEVELS.map((l, i) => [l.id, i]));
  const pinnedIndex = rung ? levelIndex[rung] : -1;

  return (
    <div className="ladder">
      {scheme.situations.length > 1 && (
        <div className="filter-row" role="group" aria-label="Choose what you need">
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
          return (
            <li
              key={`${r.level}-${r.office}`}
              className={`ladder-rung ${isYours ? 'is-yours' : ''} ${isAbove ? 'is-above' : ''}`}
            >
              <div className="ladder-rung-head">
                <span className="ladder-level">{r.level}</span>
                {isYours && (
                  <span className="ladder-here">your rung{placeLabel ? ` · ${placeLabel}` : ''}</span>
                )}
                {onAddress && (
                  <button
                    type="button"
                    className={`ladder-address ${addressedLevel === r.level ? 'is-addressed' : ''}`}
                    aria-pressed={addressedLevel === r.level}
                    onClick={() => onAddress(r.level)}
                  >
                    {addressedLevel === r.level ? 'The letter goes here' : 'Address the letter here'}
                  </button>
                )}
              </div>

              <h4 className="ladder-office">{r.office}</h4>
              <p className="ladder-post">{r.post}</p>
              <p className="ladder-decides">{r.decides}</p>

              <dl className="ladder-facts">
                <div>
                  <dt>Where</dt>
                  <dd>{r.where}</dd>
                </div>
                <div>
                  <dt>Carry</dt>
                  <dd>{r.carry}</dd>
                </div>
              </dl>

              <p className="ladder-source">
                <span
                  className={`chip chip-tag ladder-status ladder-status-${r.status}`}
                  title={status ? status.detail : ''}
                >
                  {status ? status.label : r.status}
                </span>
                <span className="meta">{r.source}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
