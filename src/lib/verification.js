// The verification state behind a rung or a contact.
//
// A date on its own is not useful to a reader. What matters is whether the
// source was read recently enough to trust, so this turns a record into one
// of four states and one plain sentence:
//
// fresh    the source was read inside its review window
// due      the review window closes within a fortnight
// stale    the window has closed; the claim may have moved
// undated  nobody has recorded a date, so there is nothing to stand behind
//
// The words matter as much as the colour. "No check date recorded" is a
// truthful thing to print on a sheet a citizen carries; a green tick is not.

import { REVIEW_WINDOW_DAYS, verificationFor } from '../data/verification.js';

const MS_DAY = 86400000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const startOfUtcDay = (d) =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatChecked(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const UNDATED = {
  state: 'undated',
  label: 'No check date recorded. Confirm this before relying on it.',
  checkedOn: null,
  checkedBy: null,
  how: null,
  dueOn: null,
  daysLeft: null,
};

const fillTemplate = (template, values) =>
  String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );

// The visible sentence. Dates stay ISO (source data); the sentence around
// them is page chrome and must come from the selected locale.
export function verificationText(t, check) {
  if (!check) return '';
  if (!t) return check.label;
  if (check.state === 'undated') return t.verifyUndated;
  const values = { checked: check.checkedOn || '', due: check.dueOn || '' };
  return fillTemplate(check.state === 'stale' ? t.verifyStale : t.verifyDue, values);
}

// Pure: a record and a clock in, a state out. Kept separate from the ledger
// so the four states can be tested without editing the corpus.
export function stateFor(record, kind, now = new Date()) {
  if (!record || !ISO_DAY.test(record.checkedOn || '')) return UNDATED;

  const window = REVIEW_WINDOW_DAYS[kind] ?? REVIEW_WINDOW_DAYS.rungs;
  const dueOn = addDays(record.checkedOn, window);
  const daysLeft = Math.round(
    (Date.parse(`${dueOn}T00:00:00Z`) - startOfUtcDay(now)) / MS_DAY,
  );

  const state = daysLeft < 0 ? 'stale' : daysLeft <= 14 ? 'due' : 'fresh';
  const checked = formatChecked(record.checkedOn);
  const label =
    state === 'stale'
      ? `Checked ${checked}. Re-check overdue since ${formatChecked(dueOn)}.`
      : `Checked ${checked}. Re-check due ${formatChecked(dueOn)}.`;

  return {
    state,
    label,
    checkedOn: record.checkedOn,
    checkedBy: record.checkedBy || null,
    how: record.how || null,
    dueOn,
    daysLeft,
  };
}

export function verification(kind, key, now = new Date()) {
  return stateFor(verificationFor(kind, key), kind, now);
}
