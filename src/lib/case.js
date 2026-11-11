// The case note a citizen can hand to THS.
//
// The note is built in the browser from the same data the sheet uses, so it
// cannot say something the page does not already stand behind. It carries a
// reference the citizen can quote on the phone, and it never claims that
// anything has been sent: the mailto link and the download are the citizen's
// own actions.
//
// The consent line is the important one. Without it the note asks for advice;
// with it the note says THS may write to the office on the citizen's behalf.
// There is no third state, and no message is sent in the citizen's name by
// the page itself.

import { deadlineLines } from './india/letter.js';

// A small, deterministic hash. The reference has to stay the same when the
// citizen reopens the same case, and change when the office changes, so it is
// built from the case fields rather than from a clock or a random number.
const fnv = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(7, '0').slice(-6);
};

export const caseReference = ({ scheme, situation, place, rung }) =>
  `THS-${fnv(
    [scheme?.id || '', situation?.id || '', place?.label || '', rung?.level || ''].join('|')
  )}`;

export function buildCaseNote({
  scheme,
  situation,
  place,
  rung,
  clock,
  dates,
  applicant = {},
  consent = false,
  reference,
}) {
  const lines = [];
  lines.push('THS case note');
  lines.push(`Reference: ${reference}`);
  lines.push(`Prepared: ${new Date().toISOString().slice(0, 10)} in the citizen's browser`);
  lines.push('');
  lines.push(`Scheme: ${scheme.name} (${scheme.full})`);
  lines.push(`Situation: ${situation.label}`);
  if (place && place.label) lines.push(`Place: ${place.label}`);
  if (rung) lines.push(`Office addressed: ${rung.office} (${rung.post})`);
  if (rung) lines.push(`Office source: ${rung.source}`);

  const deadlines = deadlineLines(clock, dates || {});
  if (deadlines.length) {
    lines.push('');
    lines.push('Dates given');
    for (const line of deadlines) {
      lines.push(`- ${line.what}: due ${line.due}${line.passed ? ' (passed)' : ''}`);
    }
  }

  lines.push('');
  lines.push(
    consent
      ? 'Consent: I ask THS to take this case up on my behalf, including writing to the office about it.'
      : 'Consent: I am sending this for advice only. I have not authorised THS to act for me.'
  );

  if (applicant.name || applicant.mobile) {
    lines.push('');
    lines.push('Contact');
    if (applicant.name) lines.push(`Name: ${applicant.name}`);
    if (applicant.mobile) lines.push(`Mobile: ${applicant.mobile}`);
  }

  lines.push('');
  lines.push('What happened, in the citizen’s words');
  lines.push(situation.complaint || situation.label);
  lines.push('');
  lines.push('What the citizen asks for');
  lines.push(situation.ask || 'A written reply.');

  return lines.join('\n');
}
