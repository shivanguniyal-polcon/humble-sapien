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
import { officeHi, whereHi } from './hindi.js';

const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const longDateHi = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
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
      dueHi:
        d.hours && !d.days
          ? `${due.toLocaleDateString('hi-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}, ${String(due.getHours()).padStart(2, '0')}:${String(
              due.getMinutes()
            ).padStart(2, '0')}`
          : due.toLocaleDateString('hi-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }),
      passed: status.passed,
      then: d.then,
      hi: d.hi || null,
      source: d.source,
    });
  }
  return out;
}

// One deadline, as the citizen writes it: what was owed, the date it fell,
// the provision it comes from, and what is still missing if the date has
// gone by.
function claimParagraph(l, hindi = false) {
  const source = hindi && l.hi && l.hi.claim ? l.hi : l;
  let text = source.claim.replace('{due}', hindi ? l.dueHi : l.due);
  const unmet = hindi && l.hi && l.hi.unmet ? l.hi.unmet : l.unmet;
  if (l.clause && l.doc) {
    text += hindi ? ` (${l.doc}, ${l.clause})` : ` (${l.clause} of the ${l.doc})`;
  }
  text += hindi ? '।' : '.';
  if (l.passed && unmet) text += ` ${unmet}`;
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
//
// `lang: 'hi'` writes the Hindi letter. It is offered only where the
// situation carries reviewed Hindi text, so a half-translated letter cannot
// reach a counter. The default is English.
export function buildLetter({ scheme, situation, place, rung, clock, dates, lang = 'en', applicant = {} }) {
  const given = dates || {};
  const lines = [];
  const placeLabel = describePlace(place);
  const dl = deadlineLines(clock, given);
  const anchors = clock && clock.anchors ? clock.anchors : [];
  const hindi = lang === 'hi' && Boolean(situation.hi);
  const hi = hindi ? situation.hi : null;
  const label = hindi && hi.label ? hi.label : situation.label;

  if (rung) {
    lines.push(hindi ? officeHi(rung.office) : rung.office);
    lines.push(hindi ? whereHi(rung.where) : rung.where);
    lines.push('');
  }
  lines.push(hindi ? `दिनांक: ${longDateHi(formatDay(new Date()))}` : `Date: ${longDate(formatDay(new Date()))}`);
  lines.push('');
  lines.push(hindi ? `विषय: ${scheme.name}: ${label}` : `Subject: ${scheme.name}: ${label}`);
  lines.push('');
  lines.push(hindi ? 'महोदय / महोदया,' : 'Respected Sir or Madam,');
  lines.push('');
  if (placeLabel) {
    lines.push(hindi ? `मेरा पता: ${placeLabel}।` : `I live in ${placeLabel}.`);
    lines.push('');
  }
  // What happened, in the citizen's words, and the scheme it happened under.
  lines.push(hindi && hi.complaint ? hi.complaint : situation.complaint || situation.label);
  lines.push(hindi ? `यह पत्र ${scheme.name} के अंतर्गत है।` : `I am writing about this under ${scheme.name}.`);
  lines.push('');

  // The dates the citizen gave, and the law that turned on them. Each date
  // is followed by the deadlines that run from it, in the order they were
  // listed on the page.
  for (const a of anchors) {
    const iso = given[a.id];
    const sentence = hindi && a.hi && a.hi.sentence ? a.hi.sentence : a.sentence;
    if (!iso || !sentence) continue;
    lines.push(sentence.replace('{date}', hindi ? longDateHi(iso) : longDate(iso)));
    lines.push('');
    for (const l of dl) {
      if (l.anchor !== a.id || !l.claim) continue;
      lines.push(claimParagraph(l, hindi));
      lines.push('');
    }
  }

  // The ask, in the citizen's own words.
  if (hindi) {
    lines.push(hi.ask || situation.ask || 'मेरी प्रार्थना है कि इस मामले की जाँच की जाए और मुझे लिखित उत्तर दिया जाए।');
  } else {
    lines.push(
      situation.ask ||
        'I ask that you look into this matter, tell me what I am entitled to, and reply to me in writing.'
    );
  }
  lines.push('');
  lines.push(hindi ? 'संलग्न:' : 'Enclosures');
  lines.push(hindi ? '1. मेरे आवेदन की प्रति, या उसका जो रिकॉर्ड मेरे पास है।' : '1. A copy of my application, or the record of it that I have.');
  lines.push(hindi ? '2. कार्यालय से मिला कोई पत्र, रसीद या सूचना।' : '2. Any letter, receipt or intimation I received from the office.');
  lines.push('');
  // A letter handed over at a counter needs a second copy, or there is no
  // proof it was ever given in.
  lines.push(
    hindi
      ? 'कृपया इस पत्र की दूसरी प्रति पर दिनांक, हस्ताक्षर और कार्यालय की मुहर के साथ प्राप्ति की पावती दें।'
      : 'Please acknowledge receipt of this letter on the second copy, with the date, your signature and the office stamp.'
  );
  lines.push('');
  lines.push(hindi ? 'भवदीय,' : 'Yours faithfully,');
  lines.push('');
  lines.push('_______________________');
  lines.push(hindi ? `नाम: ${applicant.name || ''}` : `Name: ${applicant.name || ''}`);
  lines.push(hindi ? `मोबाइल नंबर: ${applicant.mobile || ''}` : `Mobile number: ${applicant.mobile || ''}`);
  lines.push(
    hindi
      ? `जॉब कार्ड / आवेदन / लाभार्थी संख्या: ${applicant.id || ''}`
      : `Job card / application / beneficiary number: ${applicant.id || ''}`
  );
  lines.push('');

  return lines.join('\n');
}
