// The clock: the deadline arithmetic, kept free of React so it can be
// tested on its own.
//
// The law counts days, not hours on a screen, so a day deadline runs to the
// end of the day it falls on. Dates are plain YYYY-MM-DD strings and the
// day arithmetic is done in UTC, so a citizen in any State sees the same
// date the Act does.
//
// An hour deadline is different. It runs from the moment the clock started,
// not from midnight, because a hospital asks for pre-authorisation at the
// time it asks. Those deadlines are read in the reader's own clock, which is
// the clock of the office they are standing in.

const MS_DAY = 86400000;
const MS_HOUR = 3600000;

export function parseDay(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const startOfDay = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// The day as the reader's own calendar writes it. A date typed into a form
// is a local date, so a date compared against today has to be local too.
export const localDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = () => localDay(new Date());

// Where a deadline starts counting from. A day deadline starts at UTC
// midnight, so the date it falls on is the same date everywhere. An hour
// deadline starts at the moment it was asked for, unless the citizen typed
// a day that has already gone by, in which case it started at that day's
// local midnight and has already run out.
export function baseFor(startIso, deadline, now) {
  const start = parseDay(startIso);
  if (!start) return null;
  if (!deadline.hours || deadline.days) return start;
  if (now && localDay(now) === startIso) return now;
  return new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
}

// When a deadline falls, given the day the clock started.
export function dueDate(startIso, deadline, now) {
  const base = baseFor(startIso, deadline, now);
  if (!base) return null;
  const days = Number(deadline.days || 0);
  const hours = Number(deadline.hours || 0);
  if (!days && !hours) return null;
  return new Date(base.getTime() + days * MS_DAY + hours * MS_HOUR);
}

// How the deadline stands today. A day deadline that falls today has not
// passed: the citizen still has the rest of the day. An hour deadline is
// measured to the minute.
export function deadlineStatus(due, now, deadline) {
  if (!due || !now) return null;
  if (deadline.hours && !deadline.days) {
    const ms = due.getTime() - now.getTime();
    return {
      passed: ms <= 0,
      days: 0,
      hours: Math.ceil(Math.abs(ms) / MS_HOUR),
    };
  }
  const days = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / MS_DAY);
  return { passed: days < 0, days, hours: 0 };
}

export function formatDay(date) {
  return date.toISOString().slice(0, 10);
}

export function formatStamp(date, locale = undefined) {
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

// The date a deadline falls, as a citizen reads it. A day deadline is read
// in UTC, because a date that shifts by a day with the reader's timezone
// would send somebody to the counter a day early or a day late.
export function formatDue(due, deadline, locale = undefined) {
  if (!due) return '';
  if (deadline.hours && !deadline.days) return formatStamp(due, locale);
  return due.toLocaleDateString(locale, { dateStyle: 'medium', timeZone: 'UTC' });
}
