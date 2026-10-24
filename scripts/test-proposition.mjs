// Verification for the proposition extractor (Task 5) and the proposition
// renderer (Task 6), against the schema contract in
// private/proposition-schema-design.md (v2): every field of the schema, the
// absent-value rule (scalars null, arrays []), the per-field reading rules,
// span traceability, the unreadable record, determinism, and the renderer's
// frames with number- and negation-preservation per obligation type.
// Run: node scripts/test-proposition.mjs

import {
  propose, extractPropositions, PROPOSITION_SCHEMA_VERSION,
} from '../src/lib/legal/propositions.js';
import { classifyObligation } from '../src/lib/legal/obligations.js';
import { render } from '../src/lib/legal/render.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const CONTENT_FIELDS = [
  'actor', 'action', 'object', 'qualifier', 'condition', 'exception',
  'consequence', 'deadline', 'threshold', 'authority', 'obligationType',
];
const IDENTITY_FIELDS = [
  'id', 'sourceId', 'sourceText', 'clause', 'rewrite', 'split', 'schemaVersion',
];

// Slot values compare against the source the way the extractor normalizes it:
// whitespace collapsed, quote marks folded, so a verbatim slice still traces.
const norm = (s) => String(s ?? '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:])/g, '$1')
  .replace(/["“”‘’]/g, '"')
  .trim();
const traced = (p, value) => norm(p.sourceText).includes(norm(value));

// 1. The schema shape: every field present, absent scalars null, absent
//    arrays empty, annotations and identity complete.
{
  const p = propose('The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.');
  for (const field of [...CONTENT_FIELDS, ...IDENTITY_FIELDS]) {
    ok(`schema field "${field}" is present`, field in p, Object.keys(p).join(','));
  }
  ok('annotations carry flags and unreadable', Boolean(p.flags) && Array.isArray(p.unreadable));
  ok('absent scalars are null', p.consequence === null && p.authority === null && p.qualifier === null, JSON.stringify([p.consequence, p.authority, p.qualifier]));
  ok('absent arrays are empty', p.threshold.length === 0 && p.condition.length === 0, JSON.stringify([p.threshold, p.condition]));
  ok('read arrays are filled', p.deadline.length === 1 && p.exception.length === 1);
  ok('schemaVersion is stamped on the proposition', p.schemaVersion === PROPOSITION_SCHEMA_VERSION);
}

// 2. The act splits into action and object; the force stays in the modality,
//    never in the act (a prohibition renders "must not", the act says "transfer").
{
  const cases = [
    ['The Bank shall appoint the auditors of the Company.', 'duty', 'appoint', 'the auditors of the Company'],
    ['The Company shall not transfer the shares.', 'prohibition', 'transfer', 'the shares'],
    ['Every beneficiary shall be entitled to receive the benefits.', 'entitlement', 'receive', 'the benefits'],
    ['Membership of the BLBC shall comprise of banks and officers.', 'constitutive', 'comprise of', 'banks and officers'],
    ['It shall be the obligation of the auditor to file the return within thirty days.', 'duty', 'file', 'the return'],
  ];
  for (const [sentence, kind, action, object] of cases) {
    const p = propose(sentence);
    ok(`typed as ${kind}`, p.obligationType === kind, `${p.obligationType}: ${sentence.slice(0, 40)}`);
    ok(`action is the verb phrase (${kind})`, p.action === action, `got ${JSON.stringify(p.action)}`);
    ok(`object is the noun phrase (${kind})`, p.object === object, `got ${JSON.stringify(p.object)}`);
  }
  const neg = propose('The Company shall not transfer the shares.');
  ok('the negation lives in the force, not the act', neg.modality === 'must not' && !/\bnot\b/.test(neg.action), `${neg.modality} / ${neg.action}`);
  // An ambiguous split stays honest: the whole act is the action, object null.
  const amb = propose('The Centre may make rules for carrying out the purposes of this Act.');
  ok('an ambiguous split leaves object null', amb.object === null && amb.action === 'make rules for carrying out the purposes of this Act', `${amb.action} | ${amb.object}`);
}

// 3. Definition: the note is binding — action = "means", object = the meaning.
{
  const d = propose('In this Act, "authorised officer" means an officer appointed in writing.');
  ok('definition action is "means"', d.action === 'means', JSON.stringify(d.action));
  ok('definition object is the meaning', d.object === 'an officer appointed in writing', JSON.stringify(d.object));
}

// 4. Statement: the minimum viable subset, in the sentence's own words.
{
  const s = propose('The Reserve Bank has examined the feedback received on the draft Directions.');
  ok('a sentence with no rule hit is typed statement', s.obligationType === 'statement', s.obligationType);
  ok('statement action is the predicate, verbatim', /examined the feedback received on the draft Directions/.test(s.action), JSON.stringify(s.action));
  ok('statement object stays null', s.object === null);
  ok('statement actor is the recorded fallback', s.actor && s.actor.known === false, JSON.stringify(s.actor));
  ok('the minimum viable subset is complete',
    Boolean(s.id) && 'sourceId' in s && Boolean(s.sourceText) && s.obligationType === 'statement'
    && Boolean(s.actor) && typeof s.action === 'string' && s.action.length > 0);
}

// 5. Numbers are copied character-for-character into deadline and threshold.
{
  const t = propose('The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.');
  ok('deadline is copied verbatim', t.deadline.length === 1 && t.deadline[0] === 'within fifteen days', JSON.stringify(t.deadline));
  const th = propose('The total exposure shall not exceed ten per cent of the owned fund.');
  ok('threshold is copied verbatim', th.threshold.length === 1 && th.threshold[0] === 'shall not exceed ten per cent of the owned fund', JSON.stringify(th.threshold));
  ok('no unit conversion happens', !/15|10%/.test(`${th.deadline.join()}${th.threshold.join()}`));
}

// 6. Authority is read from agent phrases; the act splits around it.
{
  const a = propose('The appropriate Government may, by notification in the Official Gazette, frame a scheme for the grant of financial assistance.');
  ok('authority is read from the agent phrase', a.authority === 'by notification in the Official Gazette', JSON.stringify(a.authority));
  ok('the act splits around the authority phrase', a.action === 'frame' && a.object === 'a scheme for the grant of financial assistance', `${a.action} | ${a.object}`);
}

// 7. Consequence is read from its own sentence only — a penalty in the next
//    sentence stays in the next sentence's proposition.
{
  const c = propose('Whoever contravenes shall be punished with imprisonment for a term which may extend to six months.');
  ok('consequence is read from breach language', /punished with imprisonment for a term which may extend to six months/.test(String(c.consequence)), JSON.stringify(c.consequence));
  const rows = [
    { sourceId: 0, sourceText: 'The bank shall file the return within thirty days.', clause: 's. 4', plain: 'The bank must file the return within thirty days.' },
    { sourceId: 1, sourceText: 'A person who contravenes shall be punished with imprisonment for six months.', clause: 's. 21', plain: 'A person who breaks this rule must be punished with imprisonment for six months.' },
  ];
  const ps = extractPropositions(rows);
  ok('one proposition per source sentence', ps.length === 2, `${ps.length}`);
  ok('the penalty does not leak backwards', ps[0].consequence === null && ps[1].consequence != null, JSON.stringify([ps[0].consequence, ps[1].consequence]));
}

// 8. Qualifier keeps the hedge in source words and mirrors flags.hedged.
{
  const q = propose('The bank shall preferably file the return.');
  ok('qualifier records the hedge in source words', q.qualifier === 'preferably', JSON.stringify(q.qualifier));
  ok('the hedge is split out of the act', q.action === 'file' && q.object === 'the return', `${q.action} | ${q.object}`);
  ok('flags.hedged mirrors the qualifier', q.flags.hedged === true);
}

// 9. What the rules could not read is recorded, never hidden.
{
  const u = propose('The bank shall file the return within the said time.');
  ok('a deadline trigger with no parseable span is unreadable, not absent', u.deadline.length === 0 && u.unreadable.includes('deadline'), JSON.stringify(u.unreadable));
  ok('an unreadable slot marks the proposition for review', u.flags.needsReview === true);
  const u2 = propose('The NBFC shall maintain capital at least');
  ok('a threshold trigger with no parseable span is visible', u2.unreadable.includes('threshold'), JSON.stringify(u2.unreadable));
  const u3 = propose('The Bank shall');
  ok('a duty trigger with no act is visible', u3.action === null && u3.unreadable.includes('action'), JSON.stringify([u3.action, u3.unreadable]));
  const clean = propose('The Bank shall appoint the auditors of the Company.');
  ok('a fully read proposition carries no unreadable slots', clean.unreadable.length === 0 && clean.flags.needsReview === false, JSON.stringify(clean.unreadable));
}

// 10. Determinism, the deprecated aliases, and what is emitted.
{
  const x = propose('The Bank shall appoint the auditors.');
  ok('the extractor is deterministic', JSON.stringify(propose('The Bank shall appoint the auditors.')) === JSON.stringify(x));
  ok('the deprecated alias "kind" reads through', x.kind === x.obligationType);
  ok('the deprecated alias "timing" reads through', x.timing === x.deadline);
  ok('the deprecated alias "conditions" reads through', x.conditions === x.condition);
  ok('the deprecated alias "exceptions" reads through', x.exceptions === x.exception);
  const emitted = JSON.parse(JSON.stringify(x));
  ok('canonical names are emitted', 'obligationType' in emitted && 'deadline' in emitted && 'condition' in emitted && 'exception' in emitted);
  ok('deprecated aliases are never emitted', !('kind' in emitted) && !('timing' in emitted) && !('conditions' in emitted) && !('exceptions' in emitted), Object.keys(emitted).join(','));
}

// 11. Every filled slot traces back to real characters in the source.
{
  const battery = [
    'The Bank shall appoint the auditors of the Company.',
    'The Company shall not transfer the shares, provided that the Board approves the transfer.',
    'The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.',
    'The appropriate Government may, by notification in the Official Gazette, frame a scheme for the grant of financial assistance.',
    'Every beneficiary shall be entitled to receive the benefits in accordance with the provisions of this Act.',
    'In this Act, "authorised officer" means an officer appointed in writing.',
    'Membership of the BLBC shall comprise of banks and officers.',
    'These Directions shall come into effect from January 1, 2027.',
    'Whoever contravenes shall be punished with imprisonment for a term which may extend to six months.',
    'The bank shall preferably file the return.',
  ];
  for (const sentence of battery) {
    const p = propose(sentence);
    const slots = [
      p.action, p.object, p.qualifier, p.authority, p.consequence,
      ...p.deadline, ...p.threshold, ...p.condition, ...p.exception,
    ].filter((v) => typeof v === 'string' && v.length > 0);
    ok(`every slot traces to source: ${sentence.slice(0, 36)}…`, slots.every((v) => traced(p, v)),
      JSON.stringify(slots.filter((v) => !traced(p, v))));
    const subjectOk = traced(p, p.subject) || p.subject === 'Someone'
      || (p.actor && p.actor.known && p.subject === p.actor.label);
    ok(`the subject traces to source or is the declared fallback: ${sentence.slice(0, 36)}…`, subjectOk, JSON.stringify(p.subject));
  }
}

// 12. The sentences test-simplifier exercises (no dictionary rule hit) all
//    carry the minimum viable subset and the kind the classifier gives them.
{
  const sentences = [
    ['The Bank shall appoint the auditors of the Company.', 'duty'],
    ['The Company shall not transfer the shares.', 'prohibition'],
    ['No such rules shall be made without prior consultation.', 'prohibition'],
    ['The Centre may make rules for carrying out the purposes of this Act.', 'permission'],
    ['Every beneficiary shall be entitled to receive the benefits.', 'entitlement'],
    ['In this Act, "authorised officer" means an officer appointed in writing.', 'definition'],
    ['Membership of the BLBC shall comprise of banks and officers.', 'constitutive'],
    ['These Directions shall come into effect from January 1, 2027.', 'meta'],
    ['The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.', 'duty'],
    ['It shall be the obligation of the auditor to file the return within thirty days.', 'duty'],
    ['The Bank shall appoint the auditors.', 'duty'],
  ];
  for (const [sentence, want] of sentences) {
    const p = propose(sentence);
    ok(`minimum viable subset: ${sentence.slice(0, 44)}…`,
      Boolean(p.id) && 'sourceId' in p && Boolean(p.sourceText) && Boolean(p.obligationType)
      && Boolean(p.actor) && typeof p.action === 'string' && p.action.length > 0);
    ok(`kind is ${want}: ${sentence.slice(0, 44)}…`, p.obligationType === want, p.obligationType);
  }

  // The kind comes from obligations.js, not a parallel rulebook.
  const blbc = 'Membership of the BLBC shall comprise of banks and officers.';
  ok('the classifier types it constitutive', classifyObligation(blbc).type === 'constitutive');
  ok('the proposition kind follows the classifier', propose(blbc).obligationType === 'constitutive');
  const entitled = 'Every beneficiary shall be entitled to receive the benefits.';
  ok('the classifier types it entitlement', classifyObligation(entitled).type === 'entitlement');
  ok('the proposition kind follows (2)', propose(entitled).obligationType === 'entitlement');
}

// 12a. Force patterns are read from the sentence proper. A proviso's "shall"
//    is the condition's force — "may frame a scheme, provided that no scheme
//    shall be framed" is a permission — and must not re-type the sentence.
{
  const permitted = propose('The appropriate Government may, by notification in the Official Gazette, frame a scheme for the grant of financial assistance to the beneficiaries, provided that no scheme shall be framed without prior consultation with the State Governments.');
  ok('a proviso duty trigger does not type a may sentence as duty',
    permitted.obligationType === 'permission', permitted.obligationType);
  ok('the frame joins the force and its insertions without stray spaces',
    /^The appropriate Government may, by notification in the Official Gazette, frame a scheme/.test(permitted.frame), permitted.frame);

  const duty = propose('The bank shall file the return, provided that the Reserve Bank must not extend the period without recording reasons.');
  ok('a proviso negation does not turn a duty into a prohibition',
    duty.obligationType === 'duty', duty.obligationType);

  // Boundary: when the main clause carries no force of its own, the whole
  // sentence is the force pattern. The proviso still binds, so the sentence
  // stays on the binding side rather than dropping to a statement.
  const bare = propose('The scheme provides for assistance to the beneficiaries, provided that no scheme shall be framed without prior consultation with the State Governments.');
  ok('a proviso alone still types a binding sentence',
    bare.obligationType === 'duty', bare.obligationType);
}

// 13. propose() takes a segment and hands back a source span pointing at the
//    characters, and accepts the { jurisdiction, definitions } options.
{
  const seg = { start: 41, end: 76, text: 'The Bank shall appoint the auditors.' };
  const p = propose(seg);
  ok('the source span points at the segment', p.source.start === 41 && p.source.end === 76 && p.source.text === seg.text, JSON.stringify(p.source));
  ok('sourceText carries the sentence', p.sourceText === seg.text);
  const withOpts = propose(seg, { jurisdiction: 'in', definitions: [] });
  ok('jurisdiction and definitions are accepted', JSON.stringify(withOpts) === JSON.stringify(p));
  ok('a bare sentence gets a full-length span', propose('The Bank shall appoint the auditors.').source.end === 'The Bank shall appoint the auditors.'.length);
}

// ---------------------------------------------------------------------------
// 14. Render suite (Task 6): render.js turns a proposition into one plain
//    sentence in the canonical frame. Per obligation type: the frame shape,
//    number preservation and negation preservation.

const digitTokens = (s) => String(s || '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
const NEG_CUE = /\b(?:\w+ not|no \w+|never|without|cannot)\b/i;

// A method proposition is built by hand: the method patterns never sit next
// to a duty trigger, so typeProposition cannot currently reach that kind.
// Task 6 owns the frame, so the frame is what is tested here.
const methodProp = {
  id: 'p-m', sourceId: 0, source: { start: 0, end: 86, text: 'The net book value is to be calculated on the basis of the book value of 100 rupees.' },
  sourceText: 'The net book value is to be calculated on the basis of the book value of 100 rupees.',
  clause: null, rewrite: '', split: false, schemaVersion: PROPOSITION_SCHEMA_VERSION,
  obligationType: 'method',
  actor: { id: 'UNNAMED', label: 'someone else', side: 'unclear', known: false },
  action: 'be calculated on the basis of the book value of 100 rupees', object: null,
  qualifier: null, condition: [], exception: [], consequence: null,
  deadline: [], threshold: [], authority: null,
  subject: 'The net book value', modality: 'is computed as', predicate: 'the book value of 100 rupees',
  flags: { hedged: false, illustration: false, needsReview: false, fragment: false },
  unreadable: [],
};

const renderCases = [
  ['duty', propose('The bank shall file the return within 30 days of 31 March 2027.'),
    /^The bank must file the return, within 30 days of 31 March 2027\.$/],
  ['prohibition', propose('The Company shall not transfer more than 10 per cent of the shares.'),
    /^The Company must not transfer more than 10 per cent of the shares\.$/],
  ['permission', propose('The appropriate Government may frame a scheme under section 14.'),
    /^The appropriate Government may frame a scheme under section 14\.$/],
  ['entitlement', propose('Every beneficiary shall be entitled to receive assistance of up to 5000 rupees.'),
    /^Every beneficiary is entitled to receive assistance of up to 5000 rupees\.$/],
  ['definition', propose('In this Act, "scheme" means the scheme notified under section 14 and not a scheme under section 15.'),
    /^"scheme" means the scheme notified under section 14 and not a scheme under section 15\.$/],
  ['constitutive', propose('The Committee shall comprise of 12 members and not officers.'),
    /^The Committee comprises 12 members and not officers\.$/],
  ['method', methodProp,
    /^The net book value is computed as the book value of 100 rupees\.$/],
  ['meta', propose('These Directions shall come into effect from January 1, 2027.'),
    /^These Directions come into effect: from January 1, 2027\.$/],
  ['illustration', propose('For instance, the bank shall file one return within 10 days.'),
    /^For instance, the bank must file one return, within 10 days\.$/],
  ['statement', propose('The Reserve Bank has examined 3 feedback letters received on the draft Directions.'),
    /^The Reserve Bank has examined 3 feedback letters received on the draft Directions\.$/],
];

for (const [kind, p, shape] of renderCases) {
  const r = render(p);
  ok(`the frame reads as one sentence (${kind})`, shape.test(r.plain), r.plain);
  ok(`resolved (${kind})`, r.unresolved === false);
  const slotText = [
    p.action, p.object, p.qualifier, p.consequence, p.authority, p.predicate,
    ...(p.deadline || []), ...(p.threshold || []), ...(p.condition || []), ...(p.exception || []),
  ].join(' ');
  const missing = digitTokens(slotText).filter((t) => !r.plain.includes(t));
  ok(`number preserved (${kind})`, missing.length === 0, `missing ${missing.join(',')}: ${r.plain}`);
  const srcNeg = NEG_CUE.test(p.sourceText);
  ok(`negation preserved (${kind})`, NEG_CUE.test(r.plain) === srcNeg,
    `source ${srcNeg} vs output ${NEG_CUE.test(r.plain)}: ${r.plain}`);
}

// The dictionary becomes the vocabulary inside the frame, and the renderer
// reports exactly which rules it used.
{
  const p = propose('The Centre may make rules for carrying out the purposes of this Act, provided that no such rules shall be made without prior consultation with the State Governments.');
  const r = render(p);
  ok('render returns plain text plus the substitutions it used',
    typeof r.plain === 'string' && Array.isArray(r.substitutions));
  ok('a dictionary rule fired inside the frame is recorded',
    r.substitutions.some((s) => s.from === 'prior consultation' && s.to === 'talking first'),
    JSON.stringify(r.substitutions.map((s) => s.from)));
  ok('the frame keeps the source wording the substitutions came from',
    r.frame.includes('prior consultation') && r.plain.includes('talking first'), r.frame);
  // The condition appears in the output in its source words or in the
  // vocabulary's substitution for them — never as a clause of its own.
  const rendered = (phrase) => {
    const rule = r.substitutions.find((s) => s.from.toLowerCase() === phrase.toLowerCase());
    return rule ? rule.to : phrase;
  };
  ok('a condition renders only from the proposition',
    r.plain.includes(rendered('provided that'))
      && r.plain.includes(rendered('prior consultation'))
      && r.plain.includes('State Governments'), r.plain);
}

// The renderer cannot introduce a condition the proposition does not carry.
{
  const p = propose('The bank shall file the return within 30 days of 31 March 2027.');
  const r = render(p);
  ok('no condition is introduced',
    p.condition.length === 0 && p.exception.length === 0 && !/\b(provided|unless|subject to)\b/i.test(r.plain), r.plain);
}

// A type the renderer does not recognise gets the source back, not a guess.
{
  const p = { ...propose('The Bank shall appoint the auditors.'), obligationType: 'promise' };
  const r = render(p);
  ok('an unrecognised type renders the source text', r.plain === p.sourceText, r.plain);
  ok('and marks the sentence unresolved', r.unresolved === true);
}

// A statement keeps its own words: tidying only, never a rewording.
{
  const r = render(propose('The Reserve Bank has examined 3 feedback letters received on the draft Directions.'));
  ok('a statement is never reworded', r.substitutions.length === 0, JSON.stringify(r.substitutions.map((s) => s.from)));
}

// ---- 9. Shadow mode: proposition vs substitution rewrite (Task 7) ----
//
// Six checks per sentence, all-or-nothing per sentence. A check with
// nothing to test passes vacuously and is not counted as engaged. Critical
// classes: force flip, invented actor, silently dropped number.
import {
  CHECKS, THRESHOLD, checkForce, checkType, checkNumbers, checkActor,
  checkQualifiers, checkCoverage, compareSentence, compareEngines,
  thresholdVerdict, drawReviewSample,
} from '../src/lib/legal/shadow.js';

// Check 1: force parity across source, frame and rewrite.
{
  const kept = checkForce({
    source: 'The Company shall not transfer the shares.',
    frame: 'The Company must not transfer the shares.',
    rewrite: 'The Company must not transfer the shares.',
  });
  ok('a kept negation is force parity', kept.engaged && kept.pass && !kept.critical, JSON.stringify(kept));
  const flip = checkForce({
    source: 'The Company shall not transfer the shares.',
    frame: 'The Company must transfer the shares.',
    rewrite: 'The Company must transfer the shares.',
  });
  ok('a dropped negation is a force flip', !flip.pass && flip.critical, JSON.stringify(flip));
  const vacuous = checkForce({
    source: 'The Bank shall appoint the auditors.',
    frame: 'The Bank must appoint the auditors.',
    rewrite: 'The Bank must appoint the auditors.',
  });
  ok('no negation anywhere is a vacuous pass', !vacuous.engaged && vacuous.pass, JSON.stringify(vacuous));
}

// Check 2: type parity — the mapping table in the design note, and nothing else.
{
  ok('action maps to duty',
    checkType({ source: 'The Bank shall appoint the auditors of the Company.', kind: 'duty' }).pass);
  ok('action maps to prohibition',
    checkType({ source: 'The Company shall not transfer the shares.', kind: 'prohibition' }).pass);
  ok('entitlement maps to permission',
    checkType({ source: 'Every beneficiary shall be entitled to receive the benefits.', kind: 'permission' }).pass);
  ok('constitutive maps to constitutive',
    checkType({ source: 'Membership of the BLBC shall comprise of banks and officers.', kind: 'constitutive' }).pass);
  const bad = checkType({
    source: 'In this Act, "scheme" shall mean the scheme notified under section 14.',
    kind: 'duty',
  });
  ok('a definition typed as a duty fails parity', !bad.pass, JSON.stringify(bad));
  const vacuous = checkType({
    source: 'The Reserve Bank has examined 3 feedback letters received on the draft Directions.',
    kind: 'statement',
  });
  ok('a statement is vacuously true', !vacuous.engaged && vacuous.pass, JSON.stringify(vacuous));
}

// Check 3: number conservation — verbatim on the proposition side,
// normalized on the rewrite side, and a declared gap is not silent.
{
  const kept = checkNumbers({
    source: 'The fine shall be 5,000 rupees for every contravention.',
    propositionText: 'The Bank must set the fine 5,000 rupees.',
    rewrite: 'The fine must be 5,000 rupees for every contravention.',
    needsReview: false,
  });
  ok('a kept number conserves', kept.engaged && kept.pass && !kept.critical, JSON.stringify(kept));
  const reformatted = checkNumbers({
    source: 'The fine shall be 5,000 rupees.',
    propositionText: 'The fine must be 5,000 rupees.',
    rewrite: 'The fine must be 5000 rupees.',
    needsReview: false,
  });
  ok('a reformatted number in the rewrite still conserves', reformatted.pass, JSON.stringify(reformatted));
  const dropped = checkNumbers({
    source: 'The fine shall be 5,000 rupees.',
    propositionText: 'The Bank must set the fine.',
    rewrite: 'The fine must be rupees.',
    needsReview: false,
  });
  ok('a dropped number fails the check', !dropped.pass, JSON.stringify(dropped));
  ok('an undeclared dropped number is critical', dropped.critical, JSON.stringify(dropped));
  const declared = checkNumbers({
    source: 'The fine shall be 5,000 rupees.',
    propositionText: 'The Bank must set the fine.',
    rewrite: 'The fine must be rupees.',
    needsReview: true,
  });
  ok('a declared gap fails but is not silent', !declared.pass && !declared.critical, JSON.stringify(declared));
  const vacuous = checkNumbers({
    source: 'The Bank shall appoint the auditors.',
    propositionText: 'The Bank must appoint the auditors.',
    rewrite: 'The Bank must appoint the auditors.',
    needsReview: false,
  });
  ok('a source without numbers does not engage', !vacuous.engaged && vacuous.pass, JSON.stringify(vacuous));
}

// Check 4: actor non-invention.
{
  const fine = checkActor({
    source: 'The Bank shall appoint the auditors of the Company.',
    subject: 'The Bank',
    actor: { label: 'the Bank', known: true },
  });
  ok('a source-span subject is not invention', fine.engaged && fine.pass && !fine.critical, JSON.stringify(fine));
  const invented = checkActor({
    source: 'The Bank shall appoint the auditors of the Company.',
    subject: 'The Ministry',
    actor: { label: 'the Ministry', known: true },
  });
  ok('an invented actor is caught', !invented.pass && invented.critical, JSON.stringify(invented));
  const fallback = checkActor({
    source: 'shall be paid forthwith',
    subject: 'Someone',
    actor: { label: 'someone else', known: false },
  });
  ok('the declared fallback is not invention', fallback.pass && !fallback.critical && !fallback.engaged, JSON.stringify(fallback));
}

// Check 5: condition/exception conservation, both directions.
{
  const kept = checkQualifiers({
    source: 'The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.',
    proposition: { condition: [], exception: ['unless the Reserve Bank extends the period'] },
    rewrite: 'The applicant must furnish the documents within fifteen days, unless the Reserve Bank extends the period.',
  });
  ok('a kept exception conserves', kept.engaged && kept.pass, JSON.stringify(kept));
  const dropped = checkQualifiers({
    source: 'The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.',
    proposition: { condition: [], exception: ['unless the Reserve Bank extends the period'] },
    rewrite: 'The applicant must furnish the documents within fifteen days.',
  });
  ok('an exception lost in the rewrite fails', !dropped.pass, JSON.stringify(dropped));
  const missed = checkQualifiers({
    source: 'He may do it, provided that he pays the fee.',
    proposition: { condition: [], exception: [] },
    rewrite: 'He may do it, provided that he pays the fee.',
  });
  ok('a condition missed by the extractor fails', !missed.pass, JSON.stringify(missed));
  const vacuous = checkQualifiers({
    source: 'The Bank shall appoint the auditors.',
    proposition: { condition: [], exception: [] },
    rewrite: 'The Bank must appoint the auditors.',
  });
  ok('a sentence with no qualifiers does not engage', !vacuous.engaged && vacuous.pass, JSON.stringify(vacuous));
}

// Check 6: coverage — the minimum viable subset, on every sentence.
{
  ok('the minimum subset passes',
    checkCoverage({ proposition: propose('The Bank shall appoint the auditors.') }).pass);
  const hole = { ...propose('The Bank shall appoint the auditors.'), action: null };
  ok('a missing action fails coverage', !checkCoverage({ proposition: hole }).pass);
}

// compareSentence carries both renderings and a verdict per check.
{
  const rec = compareSentence('The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.');
  ok('both renderings are on the record',
    typeof rec.substitution === 'string' && rec.substitution.length > 0 && rec.frame.length > 0,
    JSON.stringify({ substitution: rec.substitution, frame: rec.frame }));
  ok('every check has a verdict',
    rec.checks.length === 6 && rec.checks.every((c) => typeof c.pass === 'boolean'),
    JSON.stringify(rec.checks.map((c) => [c.id, c.engaged, c.pass])));
  ok('a clean sentence agrees', rec.agree === true, JSON.stringify(rec.checks.filter((c) => !c.pass)));

  const run = compareEngines('The Bank shall appoint the auditors. Every beneficiary shall be entitled to receive the benefits within thirty days.');
  ok('the rate carries totals',
    run.rate.total === 2 && run.rate.agreed >= 1 && typeof run.rate.agreement === 'number',
    JSON.stringify(run.rate));
  ok('the per-check breakdown engages and passes',
    run.rate.perCheck.force && typeof run.rate.perCheck.force.engaged === 'number',
    JSON.stringify(run.rate.perCheck));
  ok('criticals are counted by class',
    typeof run.rate.critical.total === 'number' && !!run.rate.critical.byClass,
    JSON.stringify(run.rate.critical));
  const again = compareEngines('The Bank shall appoint the auditors. Every beneficiary shall be entitled to receive the benefits within thirty days.');
  ok('the measurement is deterministic', JSON.stringify(again.rate) === JSON.stringify(run.rate));
}

// The threshold reads as needs vs has, and the switch is not the agent's to name.
{
  ok('the threshold is 95% agreement with zero criticals',
    THRESHOLD.agreement === 0.95 && THRESHOLD.criticals === 0, JSON.stringify(THRESHOLD));
  const met = thresholdVerdict({
    rate: { agreement: 0.97, total: 100, agreed: 97, critical: { total: 0, byClass: {} }, perCheck: {} },
    humanReview: { passed: 18, of: 20 },
    founderSignOff: false,
  });
  ok('mechanical bars met still needs the founder',
    met.switch === 'pending' && met.reasons.some((r) => /founder/i.test(r)), JSON.stringify(met));
  const low = thresholdVerdict({
    rate: { agreement: 0.9, total: 100, agreed: 90, critical: { total: 2, byClass: { 'force flip': 2 } }, perCheck: {} },
    humanReview: null,
    founderSignOff: false,
  });
  ok('below threshold is a finding, not a failure',
    low.switch === 'not-justified' && low.reasons.length > 0, JSON.stringify(low));
}

// The human-review draw is stratified, sized and repeatable.
{
  const run = compareEngines('The Bank shall appoint the auditors of the Company. The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period. In this Act, "scheme" means the scheme notified under section 14.');
  const sample = drawReviewSample(run.sentences, 3);
  ok('the draw stays inside its size', sample.length === 3, `${sample.length}`);
  ok('the draw is repeatable',
    JSON.stringify(drawReviewSample(run.sentences, 3).map((s) => s.id)) === JSON.stringify(sample.map((s) => s.id)));
  ok('the drawn records name their stratum',
    sample.every((s) => typeof s.reviewStratum === 'string' && s.reviewStratum.length > 0),
    JSON.stringify(sample.map((s) => s.reviewStratum)));
}

// ---- 10. Extractor gaps the corpus run exposed -------------------------
//
// The month "May" is not the modal "may", and a fragment with no predicate
// still carries the minimum viable subset — its own words.
import { typeProposition, propositionFromSentence } from '../src/lib/legal/propositions.js';

{
  ok('a bare month is not a permission', typeProposition('May') === 'statement', typeProposition('May'));
  ok('a date fragment is not a permission',
    typeProposition('May 2010, 4 Dec.') === 'statement', typeProposition('May 2010, 4 Dec.'));
  ok('a real permission still reads as one',
    typeProposition('The Centre may make rules for carrying out the purposes of this Act.') === 'permission');
  ok('a modal before a comma still reads as force',
    typeProposition('It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint') !== 'statement');
  const frag = propositionFromSentence('May');
  ok('a fragment carries its own words as its predicate',
    checkCoverage({ proposition: frag }).pass,
    JSON.stringify({ kind: frag.obligationType, action: frag.action, predicate: frag.predicate }));
}

// The permission row decision: "permission" is a deontic grant in active
// voice. A passive possibility ("can be found") and a future ("will depend")
// are statements — the modal word alone is not the force.
{
  ok('a passive possibility is not a permission',
    typeProposition('The press release regarding the above can be found at the Bank\'s website.') === 'statement',
    typeProposition('The press release regarding the above can be found at the Bank\'s website.'));
  ok('a future is not a permission',
    typeProposition('The timelines for submission of returns will depend on the frequency at which the return is to be submitted.') === 'statement',
    typeProposition('The timelines for submission of returns will depend on the frequency at which the return is to be submitted.'));
  ok('a deontic grant stays a permission',
    typeProposition('Individuals seeking delisting can submit their request to the Ombudsperson.') === 'permission',
    typeProposition('Individuals seeking delisting can submit their request to the Ombudsperson.'));
}

// ---- 11. Critical violations the corpus run exposed --------------------
//
// The shadow run's 32 criticals, sentence for sentence. Two root causes:
// invented actors — the meta branch hardcodes "These Directions" and the
// subject falls back to a bearer tag ("the entity itself") that the source
// never uses — and one force flip, where a leading condition ("Where ... is
// not possible,") is never captured, so the frame drops its negation. The
// contract under test: the subject is a source span or the declared
// fallback, and a leading or intervening qualifier clause is read into the
// condition slot, so the frame keeps every negation the source carries.

const actorOk = (sentence) => {
  const p = propositionFromSentence(sentence);
  return checkActor({ source: sentence, subject: p.subject, actor: p.actor });
};
const subjectOf = (sentence) => propositionFromSentence(sentence).subject;

const META_TITLE = '3. These Amendment Directions shall be called the Reserve Bank of India (Non-Banking Financial Companies – Concentration Risk Management) Fourth Amendment Directions, 2026.';
const META_COMMENCE = '4. These Amendment Directions shall come into force with immediate effect.';
const META_ABOVE = '5. The above amendments shall come into force with immediate effect.';
const COMMS = '(8) Written communication, if any, sent by an employee / recovery agent to the borrower / guarantor shall have prior approval of the NBFC and shall contain the name and contact details of the sender.';
const HOWEVER = 'However, if an audit firm engaged with audit / non- audit works for the Group Entities (which are not regulated by RBI) is being considered by any of the RBI regulated entities in the Group for appointment as SCAs / SAs, it shall be the responsibility of the Board / ACB / LM of the concerned RBI regulated entity to ensure that there is no conflict of interest and independence of auditors is ensured, and this should be suitably recorded in the minutes of the meetings of Board / ACB / LM.';
const INTERVENING = '33. The NBFC, if using or intending to use mobile financial services, shall develop a mechanism for safeguarding information assets that are used by mobile applications to provide services to customers.';
const UNDER = 'Under unavoidable circumstances, if the PT is conducted in test environment, the NBFC shall ensure that the version and configuration of the test environment resembles the production environment.';
const IN_THOSE = 'In those cases, where the source code is not owned by the NBFC, the NBFC shall obtain a certificate from the application developer stating that the application is free of known vulnerabilities, malware, and any covert channels in the code.';
const APART = '9. Apart from the matters enumerated in Paragraph 6(1) above, where a company has obtained a specific advice from RBI that it is not required to hold a CoR from RBI, the auditor shall include a statement that the company is complying with the conditions as stipulated by RBI.';
const FOR_EG = 'For example, if an IDF-NBFC which is a group entity of a Scheduled Commercial Bank, the regulations as applicable to NBFC – Upper Layer, other than the requirement of listing, shall be applicable to the IDF-NBFC.';
const BEFORE = "101P. Before a financial product / service, other than those determined as suitable for all customers as per the NBFC's policy, is sold to an individual customer, its suitability and appropriateness for the customer shall be determined by the NBFC based on an analysis of the features, risk-return attributes, time horizon, complexity, fee structure, etc. vis-à-vis the customer's age, income, level of financial literacy, risk tolerance, etc. Wherever the financial sector regulator has prescribed any specific suitability assessment analysis for determining the suitability and appropriateness of the product / service regulated by it, an NBFC shall ensure adherence to the same.";
const FORCE_LEAD = 'Where obtaining of the source code is not possible, the NBFC shall put in place a source code escrow arrangement or other arrangements to adequately mitigate the risk of default by the vendor.';

for (const [name, sentence] of [
  ['a meta title names its own instrument', META_TITLE],
  ['a commencement names its own instrument', META_COMMENCE],
  ['a commencement with an addressee subject', META_ABOVE],
  ['a subject phrase interrupted by a parenthetical', COMMS],
  ['a duty-of sentence with a leading if-clause', HOWEVER],
  ['a subject interrupted by an if-clause', INTERVENING],
  ['a sentence with two fronted clauses', UNDER],
  ['a sentence with a where-clause between subject and verb', IN_THOSE],
  ['an apart-from sentence with a where-clause', APART],
  ['an illustration with an if-clause before the subject', FOR_EG],
  ['a before-clause with an embedded exception', BEFORE],
]) {
  const verdict = actorOk(sentence);
  ok(`no invented actor: ${name}`, verdict.pass, JSON.stringify(verdict.detail));
  const subject = subjectOf(sentence);
  ok(`the subject is a source span: ${name}`,
    subject === 'Someone' || sentence.includes(subject),
    JSON.stringify(subject));
}

ok('a meta subject is the sentence\'s own words',
  subjectOf(META_TITLE) === '3. These Amendment Directions',
  JSON.stringify(subjectOf(META_TITLE)));
ok('a duty-of subject is read from after the verb',
  subjectOf(HOWEVER) === 'the Board / ACB / LM of the concerned RBI regulated entity',
  JSON.stringify(subjectOf(HOWEVER)));
ok('a leading where-clause is not the subject',
  subjectOf(FORCE_LEAD) === 'the NBFC',
  JSON.stringify(subjectOf(FORCE_LEAD)));

// The force flip: the frame must keep the negation the source carries.
{
  const p = propositionFromSentence(FORCE_LEAD);
  const verdict = checkForce({
    source: FORCE_LEAD,
    frame: p.frame,
    rewrite: p.frame,
  });
  ok('a leading condition keeps the frame\'s negation', verdict.pass,
    JSON.stringify(verdict.detail));
  ok('the leading condition is captured',
    p.condition.some((c) => /^Where obtaining/.test(c)),
    JSON.stringify(p.condition));
}

console.log(failures === 0 ? '\nAll proposition checks passed.' : `\n${failures} proposition check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
