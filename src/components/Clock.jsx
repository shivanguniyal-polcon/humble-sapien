import { dueDate, deadlineStatus, formatDue, today } from '../lib/india/clock';
import { DEADLINE_STATUS } from '../data/schemes';
import { copyFor, fill } from '../data/samparkCopy';

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
export default function Clock({ clock, dates, onDate, locale = 'en', t = copyFor('en') }) {
  if (!clock || !clock.deadlines || clock.deadlines.length === 0) return null;

  const now = new Date();
  const dateLocale = locale === 'en' ? undefined : `${locale}-IN`;

  return (
    <div className="clock">
      <h4 className="clock-title">{t.clockByWhen}</h4>

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
          const statusKey = d.status
            ? `deadline${d.status.charAt(0).toUpperCase()}${d.status.slice(1)}`
            : '';
          return (
            <li
              key={`${d.anchor}-${d.days || d.hours}-${d.what}`}
              className={`clock-item ${status && status.passed ? 'is-passed' : ''}`}
            >
              <p className="clock-what">{d.what}</p>
              {due ? (
                <p className={`clock-count ${status.passed ? 'is-passed' : ''}`}>
                  <strong className="clock-date">{formatDue(due, d, dateLocale)}</strong>
                  {status.passed
                    ? ` ${t.clockHasPassed}`
                    : d.hours
                      ? `, ${fill(t.clockHoursLeft, { n: status.hours })}`
                      : `, ${fill(
                          status.days === 1 ? t.clockDayLeft : t.clockDaysLeft,
                          { n: status.days }
                        )}`}
                </p>
              ) : (
                <p className="clock-count clock-count-pending">
                  <strong className="clock-date">
                    {d.days
                      ? fill(t.clockDaysAfter, { n: d.days })
                      : fill(t.clockHoursAfter, { n: d.hours })}
                  </strong>{' '}
                  {fill(t.clockFrom, {
                    anchor: anchorLabel
                      ? anchorLabel.charAt(0).toLowerCase() + anchorLabel.slice(1)
                      : t.clockDateAbove,
                  })}
                </p>
              )}
              {d.note && <p className="clock-note">{d.note}</p>}
              {status && status.passed && d.then && (
                <p className="clock-then">{d.then}</p>
              )}
              <p className="meta clock-source">
                {kind && (
                  <span
                    className="chip chip-tag"
                    title={statusKey ? t[`${statusKey}Detail`] : ''}
                  >
                    {statusKey ? t[`${statusKey}Label`] : kind.label}
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
