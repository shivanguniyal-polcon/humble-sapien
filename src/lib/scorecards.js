// The two things a reader can carry away from a card: a citation block for a
// newsroom or classroom, and an RTI application for the department that holds
// the file. Both are plain text built from the card, so neither can drift
// from what the page shows.
//
// The RTI draft asks for the four things the four checks look for: the order,
// the budget line, the operational record and the officer who holds the file.
// It leaves the applicant's details bracketed because the page does not know
// them.

import {
  AUDIT_CHECKS,
  CHECK_STATES,
  SECTORS,
  SECTOR_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
} from '../data/promises.js';

// Every state stays on the board, including a zero and including the queue. A
// scorecard that hides "0 Delivered" or hides how much has not been checked is
// hiding the two most important numbers on it.
export function countByStatus(list) {
  return STATUS_ORDER.map((status) => ({
    status,
    count: list.filter((promise) => promise.status === status).length,
  }));
}

export function countBySector(list) {
  return SECTORS.map((sector) => ({
    ...sector,
    count: list.filter((promise) => promise.sector === sector.id).length,
  }));
}

// Sector and verdict are independent filters. A reader can ask for one sector,
// one verdict, or both, without the two selections overwriting each other.
export function filterPromises(list, { sector = null, status = null } = {}) {
  return list.filter(
    (promise) =>
      (!sector || promise.sector === sector) &&
      (!status || promise.status === status),
  );
}

// One card as a block a journalist, teacher or campaigner can paste without
// losing the verdict or the links. The four checks travel with it, because
// they are the method, not decoration.
export function buildScorecardText(promise) {
  const checks = AUDIT_CHECKS.map((check) => {
    const found = promise.checks[check.id];
    const state = CHECK_STATES[found.state];
    return `- ${check.label}: ${state.label}${found.note ? `. ${found.note}` : ''}`;
  });

  const verdict =
    promise.status === 'queued'
      ? 'STATUS: Not yet checked. This card is transcribed, not audited.'
      : `VERDICT: ${STATUS_LABELS[promise.status]}`;

  return [
    `PROMISE (BJP Gujarat 2022 manifesto, ${promise.sourceChapter}, p. ${promise.page})`,
    `"${promise.promise}"`,
    '',
    `SECTOR: ${SECTOR_LABELS[promise.sector]}`,
    verdict,
    promise.reading,
    '',
    'FOUR CHECKS',
    ...checks,
    '',
    'EVIDENCE',
    ...promise.evidence.map(([when, what, url]) => `- ${when}: ${what} (${url})`),
    '',
    'Source: THS Sankalp, promise scorecards. Status checked October 2026.',
  ].join('\n');
}

const RTI_REQUESTS = [
  'The file number, date and a copy of every government order, notification, resolution or sanction by which this promise was approved or implemented.',
  'The budget head and line item, with the amount allocated and the amount spent, for each financial year from 2022-23 to 2025-26, and for 2026-27 the amount allocated and spent to date.',
  'The operational record for the promise: posts created and filled, or beneficiaries served, as applicable, with the date of each report.',
  'The name and designation of the officer responsible for implementing the promise, and the office where its file is held.',
];

// A ready-to-file application. It does not claim the fee has been paid,
// because it has not; it says the applicant is ready to pay it in whatever
// manner the department requires. A queued promise can still be filed: the
// four records are the same four the audit would ask for.
export function buildPromiseRti(promise, applicant = {}) {
  return [
    'To,',
    'The Public Information Officer',
    promise.department,
    '',
    `Subject: Information under the Right to Information Act, 2005 on the promise: ${promise.promise}`,
    '',
    'Sir or Madam,',
    '',
    `I am a citizen seeking information about a promise published in the BJP Gujarat 2022 manifesto, ${promise.sourceChapter}, page ${promise.page}. The promise, as published, reads:`,
    '',
    `"${promise.promise}"`,
    '',
    'I request the following information:',
    ...RTI_REQUESTS.map((request, index) => `${index + 1}. ${request}`),
    '',
    'I am ready to pay the prescribed fee in the manner the department requires. If any part of the information is exempt under section 8 or section 9 of the Act, please cite the clause and release the rest.',
    '',
    'Please provide the information within thirty days of receipt, as section 7(1) of the Act requires.',
    '',
    'Yours faithfully,',
    `Name: ${applicant.name || '[Your name]'}`,
    `Address: ${applicant.address || '[Your address]'}`,
    `Phone: ${applicant.phone || '[Your phone]'}`,
    `Date: ${applicant.date || '[Date]'}`,
  ].join('\n');
}
