import { dueDate, deadlineStatus, formatDue, today } from '../lib/india/clock';
import { DEADLINE_STATUS } from '../data/schemes';

// The clock on the wall.
//
// The ladder says who decides. The clock says by when. The citizen types
// the day the clock started, and the tool answers three questions: when the
// deadline falls, how much time is left, and what to do if it has already
// passed.
//
// Each deadline says where it comes from, because the difference is worth
// the citizen's money: a period set by a section of an Act can be quoted in
// a complaint, and a period published as a guideline can only be quoted as
// the scheme's own rule.
//
// The dates stay in the browser. A link to this page can be passed to a
// relative or to a volunteer at a help desk, and a relative's date is not
// the volunteer's business.
export default function Clock({ clock, dates, onDate }) {
  if (!clock || !clock.deadlines || clock.deadlines.length === 0) return null;

  const now = new Date();

  return (
    <div className="clock">
      <h4 className="clock-title">By when</h4>

      <div className="clock-anchors">
        {clock.anchors.map((a) => (
          <label key={a.id} className="clock-anchor">
            <span className="clock-anchor-label">{a.label}</span>
            <input
              type="date"
              value={dates[a.id] || ''}
              max={today()}
              onChange={(e) => onDate(a.id, e.target.value)}
            />
          </label>
        ))}
      </div>

      <ol className="clock-list">
        {clock.deadlines.map((d) => {
          const start = dates[d.anchor];
          const due = start ? dueDate(start, d, now) : null;
          const status = due ? deadlineStatus(due, now, d) : null;
          const anchorLabel = (clock.anchors.find((a) => a.id === d.anchor) || {}).label;
          const kind = DEADLINE_STATUS[d.status];
          return (
            <li
              key={`${d.anchor}-${d.days || d.hours}-${d.what}`}
              className={`clock-item ${status && status.passed ? 'is-passed' : ''}`}
            >
              <p className="clock-what">{d.what}</p>
              {due ? (
                <p className={`clock-count ${status.passed ? 'is-passed' : ''}`}>
                  <strong className="clock-date">{formatDue(due, d)}</strong>
                  {status.passed
                    ? ' has passed'
                    : d.hours
                      ? `, ${status.hours} hours left`
                      : `, ${status.days} ${status.days === 1 ? 'day' : 'days'} left`}
                </p>
              ) : (
                <p className="clock-count clock-count-pending">
                  <strong className="clock-date">
                    {d.days ? `${d.days} days` : `${d.hours} hours`}
                  </strong>{' '}
                  from{' '}
                  {anchorLabel
                    ? anchorLabel.charAt(0).toLowerCase() + anchorLabel.slice(1)
                    : 'the date you give above'}
                </p>
              )}
              {d.note && <p className="clock-note">{d.note}</p>}
              {status && status.passed && d.then && (
                <p className="clock-then">{d.then}</p>
              )}
              <p className="meta clock-source">
                {kind && (
                  <span className="chip chip-tag" title={kind.detail}>
                    {kind.label}
                  </span>
                )}
                <span className="clock-cite">{d.source}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
