// Source currency: how old is the text, and can the tool tell you whether it
// still says what it said?
//
// It cannot. The gazette, the amending Act and the commencement date live
// outside the browser, and a tool that guesses is worse than a tool that
// says so. What the tool can do is refuse to be quiet about it: read the
// date off the source record, say how old the text is, and make "have you
// confirmed this is the current text?" a question the reviewer has to answer
// before anything leaves the building.
//
// The date is read from the source record the reviewer typed, not from the
// body of the text. An Act that says "commences on such date as the
// Government notifies" has no useful date, and the record is the only place
// where a reviewer can honestly write one down.

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const ISO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
const DAY_MONTH_YEAR = /^(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,-]*(\d{4})$/i;
const MONTH_DAY_YEAR = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s-]*(\d{1,2})(?:st|nd|rd|th)?[\s,-]*(\d{4})$/i;
const YEAR_ONLY = /^(\d{4})$/;

const makeDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible dates ("31 February") rather than rolling them over.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return date;
};

// Read a date out of a free-text field. Returns { date, precision } or null.
// Precision matters: a year alone is a weaker statement than a day, and the
// reader is told which one it got.
export const parseSourceDate = (text) => {
  const value = String(text || '').trim();
  if (!value) return null;

  const iso = value.match(ISO);
  if (iso) {
    const date = makeDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (date) return { date, precision: 'day' };
  }

  const dmy = value.match(DAY_MONTH_YEAR);
  if (dmy) {
    const date = makeDate(Number(dmy[3]), MONTHS[dmy[2].toLowerCase()], Number(dmy[1]));
    if (date) return { date, precision: 'day' };
  }

  const mdy = value.match(MONTH_DAY_YEAR);
  if (mdy) {
    const date = makeDate(Number(mdy[3]), MONTHS[mdy[1].toLowerCase()], Number(mdy[2]));
    if (date) return { date, precision: 'day' };
  }

  const year = value.match(YEAR_ONLY);
  if (year) {
    const date = makeDate(Number(year[1]), 0, 1);
    if (date) return { date, precision: 'year' };
  }

  return null;
};

export const DEFAULT_STALE_DAYS = 180;

const fmt = (date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);

// Check the currency of a source record.
//   source   { date, version, citation }
//   today    the reference date (injectable so the check is testable)
//   staleDays how old a source may be before the run says so
export const currencyCheck = (source = {}, { today = new Date(), staleDays = DEFAULT_STALE_DAYS } = {}) => {
  const parsed = parseSourceDate(source.date);
  const reference = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  if (!parsed) {
    return {
      stated: false,
      date: null,
      precision: null,
      ageDays: null,
      stale: false,
      statement: 'No date was recorded for this source. A rewrite of an undated text cannot be defended against an amendment.',
    };
  }

  const ageDays = daysBetween(parsed.date, reference);
  const stale = ageDays > staleDays;
  const years = Math.floor(ageDays / 365);
  const age =
    ageDays < 0
      ? 'dated in the future'
      : years >= 1
        ? `${years} year${years > 1 ? 's' : ''} old`
        : `${ageDays} day${ageDays === 1 ? '' : 's'} old`;

  const statement = stale
    ? `The source is dated ${fmt(parsed.date)}, ${age} at the time of this run. The tool cannot tell you whether it has been amended since. Confirm against the gazette before relying on it.`
    : `The source is dated ${fmt(parsed.date)}, ${age} at the time of this run. That is recent enough to be worth working from, but the tool still cannot confirm it is the current text.`;

  return {
    stated: true,
    date: parsed.date.toISOString().slice(0, 10),
    precision: parsed.precision,
    ageDays,
    stale,
    statement,
  };
};
