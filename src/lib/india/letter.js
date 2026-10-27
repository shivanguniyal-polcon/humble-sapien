// The letter.
//
// A citizen leaves with a sheet, not with knowledge. This turns what the
// tool knows into the form an office expects: who it is addressed to, what
// happened, which law applies, and what is enclosed.
//
// The letter is in the citizen's voice from the first line to the last. A
// person writing to an office does not write "Work must be provided to
// you"; they write "I asked for work and was not given any." So every
// situation carries the complaint in the citizen's own words, and every
// deadline carries the claim they would make about it. The duty the office
// owed is quoted inside that claim, the way a person writes a citation, and
// not dropped beside it in a list of rules.
//
// Each deadline sits under the date the citizen gave for it, because that is
// the order the two were spoken in: this happened, and this is what the law
// said would follow from it.
//
// Nothing here is invented. Every line comes from the ladder data or from a
// date the citizen typed, and the law is quoted by the citation the ladder
// already carries.

import { dueDate, deadlineStatus, formatDue, formatDay } from './clock.js';

const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// The deadline lines, with the date each one falls.
export function deadlineLines(clock, dates, now = new Date()) {
  if (!clock || !clock.deadlines) return [];
  const out = [];
  for (const d of clock.deadlines) {
    const start = dates[d.anchor];
    if (!start) continue;
    // The same "now" the clock on the page uses, so the letter cannot fall
    // out of step with the deadline the citizen is looking at. An hour
    // deadline typed for today runs from this moment, not from midnight.
    const due = dueDate(start, d, now);
    if (!due) continue;
    const status = deadlineStatus(due, now, d);
    out.push({
      anchor: d.anchor,
      what: d.what,
      claim: d.claim,
      unmet: d.unmet,
      clause: d.clause,
      doc: d.doc,
      due: formatDue(due, d),
      passed: status.passed,
      then: d.then,
      source: d.source,
    });
  }
  return out;
}

// One deadline, as the citizen writes it: what was owed, the date it fell,
// the provision it comes from, and what is still missing if the date has
// gone by.
function claimParagraph(l) {
  let text = l.claim.replace('{due}', l.due);
  if (l.clause && l.doc) text += ` (${l.clause} of the ${l.doc})`;
  text += '.';
  if (l.passed && l.unmet) text += ` ${l.unmet}`;
  return text;
}

// The place as an address: village, panchayat, then the offices above it.
// The walk stores State first; a letter has to read the other way round.
export function describePlace(place) {
  if (!place || !Array.isArray(place.path) || !place.path.length) return '';
  const gp = place.gp && place.gp.name ? place.gp.name : '';
  const chain = gp
    ? [place.path[0], `Gram Panchayat ${gp}`, ...place.path.slice(1)]
    : place.path;
  return chain.join(', ');
}

// The letter itself.
export function buildLetter({ scheme, situation, place, rung, clock, dates }) {
  const given = dates || {};
  const lines = [];
  const placeLabel = describePlace(place);
  const dl = deadlineLines(clock, given);
  const anchors = clock && clock.anchors ? clock.anchors : [];

  if (rung) {
    lines.push(rung.office);
    lines.push(rung.where);
    lines.push('');
  }
  lines.push(`Date: ${longDate(formatDay(new Date()))}`);
  lines.push('');
  lines.push(`Subject: ${scheme.name}: ${situation.label}`);
  lines.push('');
  lines.push('Respected Sir or Madam,');
  lines.push('');
  if (placeLabel) {
    lines.push(`I live in ${placeLabel}.`);
    lines.push('');
  }
  // What happened, in the citizen's words, and the scheme it happened under.
  lines.push(situation.complaint || situation.label);
  lines.push(`I am writing about this under ${scheme.name}.`);
  lines.push('');

  // The dates the citizen gave, and the law that turned on them. Each date
  // is followed by the deadlines that run from it, in the order they were
  // listed on the page.
  for (const a of anchors) {
    const iso = given[a.id];
    if (!iso || !a.sentence) continue;
    lines.push(a.sentence.replace('{date}', longDate(iso)));
    lines.push('');
    for (const l of dl) {
      if (l.anchor !== a.id || !l.claim) continue;
      lines.push(claimParagraph(l));
      lines.push('');
    }
  }

  // The ask, in the citizen's own words.
  lines.push(
    situation.ask ||
      'I ask that you look into this matter, tell me what I am entitled to, and reply to me in writing.'
  );
  lines.push('');
  lines.push('Enclosures');
  lines.push('1. A copy of my application, or the record of it that I have.');
  lines.push('2. Any letter, receipt or intimation I received from the office.');
  lines.push('');
  lines.push('Yours faithfully,');
  lines.push('');
  lines.push('_______________________');
  lines.push('Name:');
  lines.push('Mobile number:');
  lines.push('');

  return lines.join('\n');
}
