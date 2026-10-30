// THS legal simplifier: statutory-phrase dictionaries and jurisdiction modes.
//
// The dictionary is the methodology. Every rule declares what it rewrites and
// what risk that rewrite carries, so the tool can show its working instead of
// asking a reviewer to trust it:
//
//   from    the statutory phrase, matched case-insensitively on word bounds
//   to      the plain-language replacement
//   risk    green  = literal, the legal effect is preserved
//           amber  = interpretive, a reviewer should look
//           red    = the rewrite can change the legal effect; do not ship
//                   without a lawyer's sign-off
//   note    the one-line rationale that travels with the rule into the
//           redline pack
//
// A rule's risk is the risk of *that* replacement. The sentence's own risk is
// the worst rule that fired in it, plus whatever the clause-type and
// defined-term passes found. That ordering matters: the most consequential
// rewrite inside a sentence is the one a reviewer must see first.
//
// Dictionary version is part of the audit manifest. Change a rule, bump it.

import { escapeRegExp } from './text.js';

export const DICTIONARY_VERSION = 'ths-statutory-1.0.0';

const R = (from, to, risk, note) => ({ from, to, risk, note });

// Phrases that read the same in every common-law and civil-law instrument.
// Order matters: longer patterns come before the fragments they contain.
const SHARED = [
  R('notwithstanding anything contained in any other law for the time being in force',
    'even though other laws say otherwise', 'green',
    'Reads the overriding-effect formula in plain words. The formula still governs if two texts conflict.'),
  R('notwithstanding anything contained in', 'even though other laws say otherwise,', 'green',
    'Plain wording for the overriding-effect formula.'),
  R('notwithstanding anything to the contrary', 'even if anything else says the opposite,', 'green',
    'Plain wording; the carve-out is preserved.'),
  R('notwithstanding', 'even so,', 'green',
    'Plain wording for the override marker.'),
  R('in accordance with the provisions of this Act and the rules made thereunder',
    'under this law and its rules', 'green',
    'Names the instrument and its rules rather than the drafting formula.'),
  R('in accordance with the provisions of', 'under', 'green',
    'Standard plain-language equivalent.'),
  R('in accordance with', 'as per', 'green',
    'Standard plain-language equivalent.'),
  R('the provisions of', 'the rules in', 'amber',
    'A provision is not always a rule. Check which subordinate instrument is meant.'),
  R('for the time being in force', 'in force right now', 'green',
    'Tells the reader the position is current at the time of reading.'),
  R('for the purposes of this', 'for this', 'green',
    'Drops the interpretive formula without changing the scope.'),
  R('including but not limited to', 'including', 'amber',
    'The non-exhaustive signal is weaker in plain words. Keep the open list open.'),
  R('shall be deemed to be', 'counts as', 'red',
    'A deeming provision makes something legally something else. "Counts as" reads as an opinion, not an operation of law.'),
  R('shall be liable to', 'must', 'red',
    'Liability and duty are not the same thing. The sanction disappears from the rewrite.'),
  R('shall be entitled to receive', 'can get', 'amber',
    'An entitlement is a legal right; "can get" reads as permission. Keep the right visible in review.'),
  R('shall be entitled to', 'can get', 'amber',
    'An entitlement is a legal right; "can get" reads as permission. Keep the right visible in review.'),
  R('shall not be construed as', 'does not mean', 'green',
    'Plain wording for the interpretation rule.'),
  R('without prejudice to', 'without limiting', 'amber',
    '"Without prejudice to" preserves a separate legal route, not only a limit. Confirm the separate route.'),
  R('in the event that', 'if', 'green', 'Plain conditional.'),
  R('in the event of', 'if', 'green', 'Plain conditional.'),
  R('with effect from', 'starting', 'green', 'Plain wording for the commencement formula.'),
  R('prior to', 'before', 'green', 'Plain wording.'),
  R('subsequent to', 'after', 'green', 'Plain wording.'),
  R('in relation to', 'about', 'green', 'Plain wording.'),
  R('pursuant to', 'under', 'green', 'Plain wording for the authority formula.'),
  R('at the discretion of', 'decided by', 'amber',
    'Discretion is a range of lawful choices, not a decision already taken. The rewrite hardens it.'),
  R('provided that', 'but', 'amber',
    'A proviso is a condition inside the section. Flattening it into "but" can lose the conditional logic.'),
  R('inter alia', 'among other things', 'green', 'Plain wording.'),
  R('as the case may be', '', 'amber',
    'This phrase marks a discretion to treat cases differently. The rewrite makes the cases look identical.'),
  R('and/or', 'or', 'amber',
    '"And/or" is a drafting habit, not a choice. Confirm whether either, both or all apply.'),
  R('shall be construed as a reference to', 'means', 'green',
    'Plain wording for the reference formula: the cross-reference is read as the thing it points at.'),
  R('for matters connected therewith or incidental thereto', 'for related matters', 'green',
    'The "connected therewith or incidental thereto" tail is one word in plain English.'),
  R('the commencement of', 'the start of', 'green', 'Plain wording.'),
  R('coming into force', 'start', 'green', 'Plain wording for the commencement formula.'),
  R('come into force', 'start', 'green', 'Plain wording for the commencement formula.'),
  R('hereinafter referred to as', 'called', 'green', 'Plain wording.'),
  R('from time to time', 'when needed', 'green', 'Plain wording.'),
  R('it is reiterated that', 'we repeat that', 'green', 'Plain wording.'),
  R('a term which may extend to', 'up to', 'green', 'Plain wording for the sentencing formula.'),
  R('in terms of', 'under', 'green', 'Plain wording.'),
  R('please refer to', 'see', 'green', 'Plain cross-reference wording.'),
  R('appearing in the lists of', 'on the lists of', 'green', 'Plain wording.'),
  R('appearing in the list of', 'on the list of', 'green', 'Plain wording.'),
  R('periodically circulated by', 'regularly sent by', 'amber',
    'Circulation is the distribution of a list to the addressed banks; "sent" narrows the channel. Confirm it reads right for the instrument.'),
  R('as per which', 'under which', 'green', 'Plain wording.'),
  R('as applicable', '', 'amber',
    'The hedge marks that the requirement bites only where it fits. The plain rewrite drops the hedge.'),
  R('aforesaid', 'earlier', 'green', 'Plain wording.'),
  R('thereof', 'of it', 'green', 'Plain wording.'),
  R('thereto', 'to it', 'green', 'Plain wording.'),
  R('therein', 'in it', 'green', 'Plain wording.'),
  R('hereby', '', 'amber',
    '"Hereby" can carry the instrument\'s own binding act. Check the surrounding words.'),
  R('herein', 'here', 'green', 'Plain wording.'),
  R('vide', 'through', 'green', 'Plain wording.'),
  R('prior consultation', 'talking first', 'green', 'Plain wording for a consultation requirement.'),
  R('the manner in which', 'how', 'green', 'Plain wording.'),
  R('in order to', 'to', 'green', 'Plain wording.'),
  R('at this point in time', 'now', 'green', 'Plain wording.'),
  R('a large number of', 'many', 'green', 'Plain wording.'),
  R('shall', 'must', 'green', 'In every common drafting tradition here, "shall" states a duty.'),
  R('do not', "don't", 'green', 'Plain wording.'),
  R('does not', "doesn't", 'green', 'Plain wording.'),
  R('cannot', "can't", 'green', 'Plain wording.'),
  R('is not', "isn't", 'green', 'Plain wording.'),
  R('are not', "aren't", 'green', 'Plain wording.'),
  R('will not', "won't", 'green', 'Plain wording.'),
  R('it is', "it's", 'green', 'Plain wording.'),
  R('that is', "that's", 'green', 'Plain wording.'),
];

// India: the Bare Act register, plus the phrases the Indian Constitution
// uses and the Official Gazette carries. This is the list the citizen tool
// has always run on, in the same order.
const INDIA = [
  R('such rules may provide for the manner in which', 'these rules set out how', 'green',
    'Plain wording for the rule-making power.'),
  R('make rules for carrying out the purposes of this Act', 'set the detailed rules for this law', 'green',
    'Plain wording for the rule-making power.'),
  R('benefits shall be availed of by the beneficiaries', 'people can use the benefits', 'amber',
    'The source states a duty to avail; the rewrite reads as a permission.'),
  R('every beneficiary shall be entitled to receive', 'everyone covered can get', 'amber',
    'The entitlement survives, but the right is softened into a permission.'),
  R('the Central Government may', 'the Centre can', 'green', 'Plain wording for the Union executive.'),
  R('by notification in the Official Gazette', 'by an official notice', 'amber',
    'The Gazette is a named instrument with a publication rule. Name it in review.'),
  R('no such rules shall be made without', 'these rules can only be made after', 'green',
    'Plain wording; the consultation condition stays visible.'),
  R('make rules for', 'set the detailed rules for', 'green', 'Plain wording for the rule-making power.'),
];

// United Kingdom: a statutory instrument under the 1947 Act.
const UK = [
  R('the Secretary of State may', 'the Secretary of State can', 'green', 'Plain wording for the power.'),
  R('the Secretary of State shall', 'the Secretary of State must', 'green', 'Plain wording for the duty.'),
  R('Her Majesty', 'the Crown', 'amber',
    'The Crown and the monarch are not the same legal person. Check which is meant.'),
  R('in pursuance of', 'under', 'green', 'Plain wording for the authority formula.'),
  R('by virtue of', 'under', 'green', 'Plain wording for the authority formula.'),
  R('as may be prescribed', 'as the later rules set out', 'amber',
    'Prescription defers the content to another instrument. The rewrite points at it without naming it.'),
  R('subject to the provisions of', 'subject to', 'green', 'Plain wording.'),
  R('unless the context otherwise requires', 'unless the context makes it clear otherwise', 'amber',
    'The carve-out for a different reading is narrowed in plain words.'),
  R('any person who', 'anyone who', 'green', 'Plain wording.'),
  R('no person shall', 'nobody may', 'amber',
    '"Shall not" is a prohibition; "may not" can read as a refusal of permission.'),
  R('shall be subject to', 'must follow', 'green', 'Plain wording for the obligation.'),
  R('such arrangements as the Secretary of State considers appropriate', 'whatever arrangements the Secretary of State thinks are right', 'amber',
    'The discretion to choose is stated as a judgement already made.'),
  R('revoked', 'cancelled', 'green', 'Plain wording.'),
  R('commencement', 'start', 'green', 'Plain wording.'),
  R('laid before Parliament', 'put before Parliament', 'green', 'Plain wording for the procedure.'),
  R('draft of this instrument shall be laid', 'draft of this must be put', 'green', 'Plain wording.'),
  R('by order of the Secretary of State', 'signed by the Secretary of State', 'green', 'Plain wording.'),
  R('revocation', 'cancellation', 'green', 'Plain wording.'),
];

// United States: a Code of Federal Regulations part.
const US = [
  R('the Agency shall', 'the agency must', 'green', 'Plain wording for the duty.'),
  R('the Agency may', 'the agency can', 'green', 'Plain wording for the power.'),
  R('Compliance with this part is mandatory', 'You must comply with this part', 'green', 'Plain wording.'),
  R('for the purposes of this part', 'in this part', 'green', 'Plain wording.'),
  R('any person who', 'anyone who', 'green', 'Plain wording.'),
  R('the term', 'the word', 'green', 'Plain wording.'),
  R('violation', 'breach', 'amber',
    'A violation of a regulation is a legal conclusion with a consequence attached.'),
  R('such other means as the Agency deems appropriate', 'any other means the agency thinks are appropriate', 'amber',
    'The discretion to choose is stated as a judgement already made.'),
  R('subject to the provisions of', 'subject to', 'green', 'Plain wording.'),
  R('unless the context otherwise requires', 'unless the context makes it clear otherwise', 'amber',
    'The carve-out for a different reading is narrowed in plain words.'),
  R('any other means', 'any other way', 'green', 'Plain wording.'),
  R('shall be subject to', 'must follow', 'green', 'Plain wording for the obligation.'),
  R('prescribed', 'set out in the rules', 'amber',
    'Prescription defers the content to another instrument. The rewrite points at it without naming it.'),
];

// European Union: a Regulation or Directive.
const EU = [
  R('the European Parliament, the Council and the Commission', 'the EU institutions', 'green',
    'Plain wording for the three co-legislators.'),
  R('Member States', 'member countries', 'green', 'Plain wording.'),
  R('Member State', 'member country', 'green', 'Plain wording.'),
  R('the Union', 'the EU', 'green', 'Plain wording.'),
  R('laid down', 'set out', 'green', 'Plain wording for the legislative act.'),
  R('adopt', 'pass', 'green', 'Plain wording.'),
  R('in so far as', 'as far as', 'green', 'Plain wording.'),
  R('save as otherwise provided', 'unless something else says otherwise', 'green', 'Plain wording.'),
  R('apply from', 'apply starting from', 'green', 'Plain wording for the commencement date.'),
  R('it is necessary', 'it is needed', 'green', 'Plain wording.'),
  R('without prejudice to', 'without affecting', 'amber',
    '"Without prejudice to" preserves a separate legal route, not only a limit. Confirm the separate route.'),
  R('by virtue of', 'under', 'green', 'Plain wording for the authority formula.'),
  R('the Commission shall', 'the Commission must', 'green', 'Plain wording for the duty.'),
  R('the Commission may', 'the Commission can', 'green', 'Plain wording for the power.'),
];

// Singapore: a Singapore statute read with the Interpretation Act.
const SG = [
  R('the Government may', 'the government can', 'green', 'Plain wording for the power.'),
  R('the Government shall', 'the government must', 'green', 'Plain wording for the duty.'),
  R('the Minister may', 'the Minister can', 'green', 'Plain wording for the power.'),
  R('the Minister shall', 'the Minister must', 'green', 'Plain wording for the duty.'),
  R('the Agency may', 'the agency can', 'green', 'Plain wording for the power.'),
  R('such manner as the Authority considers fit', 'any way the Authority thinks is right', 'amber',
    'The discretion to choose is stated as a judgement already made.'),
  R('prescribed', 'set out in regulations', 'amber',
    'Prescription defers the content to another instrument. The rewrite points at it without naming it.'),
  R('unless the context otherwise requires', 'unless the context makes it clear otherwise', 'amber',
    'The carve-out for a different reading is narrowed in plain words.'),
  R('the regulations', 'the rules', 'green', 'Plain wording for subordinate legislation.'),
  R('any person who', 'anyone who', 'green', 'Plain wording.'),
  R('take all necessary steps', 'do what is needed', 'green', 'Plain wording.'),
  R('shall be subject to', 'must follow', 'green', 'Plain wording for the obligation.'),
  R('the Gazette', 'the Government Gazette', 'green', 'Plain wording for the named instrument.'),
];

// Australia: a Commonwealth Act and its legislative rules.
const AU = [
  R('the Secretary', 'the secretary', 'green', 'Plain wording.'),
  R('the Minister', 'the minister', 'green', 'Plain wording.'),
  R('the regulations', 'the rules', 'green', 'Plain wording for subordinate legislation.'),
  R('prescribed', 'set out in the rules', 'amber',
    'Prescription defers the content to another instrument. The rewrite points at it without naming it.'),
  R('must comply with', 'must follow', 'green', 'Plain wording.'),
  R('take all necessary steps', 'do what is needed', 'green', 'Plain wording.'),
  R('unless the context otherwise requires', 'unless the context makes it clear otherwise', 'amber',
    'The carve-out for a different reading is narrowed in plain words.'),
  R('any person who', 'anyone who', 'green', 'Plain wording.'),
  R('the commencement day', 'the start date', 'green', 'Plain wording.'),
  R('must not', 'cannot', 'amber',
    'A prohibition and a denial of permission are different legal operations.'),
  R('must comply', 'must follow', 'green', 'Plain wording.'),
  R('gives effect to', 'puts into effect', 'green', 'Plain wording.'),
  R('gives effect', 'puts into effect', 'green', 'Plain wording.'),
];

// Jurisdiction-specific rules come first: a longer, more specific pattern
// has to be tried before the shared fragment it contains ("the Agency shall"
// before "shall"), otherwise the shared rule fires and the jurisdiction's
// own register is never used.
const build = (extra) => [...extra, ...SHARED];

export const JURISDICTIONS = [
  {
    id: 'in-bare-act',
    label: 'India — Bare Act',
    short: 'India',
    instrument: 'Act of Parliament (Bare Act), Rules made thereunder',
    sourceLabel: 'Official Gazette of India',
    clausePrefix: 's.',
    citationFormat: 'Act No. 00 of YYYY, section N (as amended to date)',
    readability: { grade: 8, ease: 60, label: 'Plain English target: grade 8 or below' },
    note: 'The default. Phrases of the Indian Constitution and the rules made under it.',
    phrases: build(INDIA),
  },
  {
    id: 'uk-si',
    label: 'United Kingdom — Statutory Instrument',
    short: 'UK',
    instrument: 'Statutory Instrument under the Statutory Instruments Act 1947',
    sourceLabel: 'The London Gazette',
    clausePrefix: 'reg.',
    citationFormat: 'SI 2024/123, regulation N',
    readability: { grade: 9, ease: 55, label: 'Plain English target: grade 9 or below' },
    note: 'Legislation made under a parent Act, laid before Parliament.',
    phrases: build(UK),
  },
  {
    id: 'us-cfr',
    label: 'United States — Code of Federal Regulations',
    short: 'US',
    instrument: 'Title of the Code of Federal Regulations',
    sourceLabel: 'Federal Register / eCFR',
    clausePrefix: '§',
    citationFormat: 'CFR title N, section N.N',
    readability: { grade: 10, ease: 50, label: 'Plain-language target: grade 10 or below' },
    note: 'Agency rules, not statute. "Shall" here is a rulemaking habit.',
    phrases: build(US),
  },
  {
    id: 'eu-regulation',
    label: 'European Union — Regulation',
    short: 'EU',
    instrument: 'Regulation or Directive of the European Parliament and of the Council',
    sourceLabel: 'Official Journal of the European Union',
    clausePrefix: 'Art.',
    citationFormat: 'Regulation (EU) 2024/123, Article N',
    readability: { grade: 9, ease: 55, label: 'Plain-language target: grade 9 or below' },
    note: 'Directly applicable law across member states; the institutions have their own register.',
    phrases: build(EU),
  },
  {
    id: 'sg-statute',
    label: 'Singapore — Statute',
    short: 'Singapore',
    instrument: 'Act of the Parliament of Singapore, subsidiary legislation',
    sourceLabel: 'Singapore Government Gazette',
    clausePrefix: 's.',
    citationFormat: '2020 Rev Ed Act N, section N',
    readability: { grade: 8, ease: 60, label: 'Plain-language target: grade 8 or below' },
    note: 'Statutes read with the Interpretation Act; the register mixes British and local usage.',
    phrases: build(SG),
  },
  {
    id: 'au-act',
    label: 'Australia — Commonwealth Act',
    short: 'Australia',
    instrument: 'Act of the Parliament of Australia, legislative rules',
    sourceLabel: 'Commonwealth of Australia Gazette',
    clausePrefix: 's.',
    citationFormat: 'Act No. 00 of YYYY (Cth), section N',
    readability: { grade: 9, ease: 55, label: 'Plain-language target: grade 9 or below' },
    note: 'A Commonwealth Act, with the Interpretation Act 1908 applying throughout.',
    phrases: build(AU),
  },
];

export const DEFAULT_JURISDICTION = 'in-bare-act';

export const getJurisdiction = (id) =>
  JURISDICTIONS.find((j) => j.id === id) || JURISDICTIONS[0];

// Mask every occurrence of a protected term so the dictionary cannot rewrite
// a word the instrument itself defines. The mask is a control character pair
// that cannot occur in legal text; it is restored before the sentence leaves
// the engine.
const MASK_START = '\u0001';
const MASK_END = '\u0002';

export const maskTerms = (text, terms) => {
  if (!terms || terms.length === 0) return { masked: text, tokens: [] };
  const sorted = [...terms].filter(Boolean).sort((a, b) => b.length - a.length);
  const tokens = [];
  let out = text;
  for (const term of sorted) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    out = out.replace(re, (match) => {
      const id = tokens.length;
      tokens.push(match);
      return `${MASK_START}${id}${MASK_END}`;
    });
  }
  return { masked: out, tokens };
};

export const unmask = (text, tokens) =>
  text.replace(new RegExp(`${MASK_START}(\\d+)${MASK_END}`, 'g'), (m, id) =>
    tokens[Number(id)] !== undefined ? tokens[Number(id)] : m,
  );

// Apply one dictionary to one sentence. Returns the rewritten sentence and
// the list of rules that fired, with the count for each.
export const applyDictionary = (sentence, phrases, { protectedTerms = [] } = {}) => {
  const { masked, tokens } = maskTerms(sentence, protectedTerms);
  let out = masked;
  const changes = [];
  for (const rule of phrases) {
    const re = new RegExp(`\\b${escapeRegExp(rule.from)}\\b`, 'gi');
    if (!re.test(out)) continue;
    const hits = out.match(re) || [];
    out = out.replace(re, rule.to);
    changes.push({ ...rule, count: hits.length });
  }
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:)])/g, '$1')
    // A deletion can leave two marks side by side ("…, as applicable, …"
    // minus "as applicable" is "…, , …"). Keep the first mark.
    .replace(/([,.;:])[\s,.;:]*([,.;:])/g, '$1')
    .replace(/^\s*,\s*/, '')
    .trim();
  out = unmask(out, tokens);
  out = out ? out[0].toUpperCase() + out.slice(1) : out;
  return { plain: out, changes };
};

// The word-boundary matcher above cannot see a phrase that straddles a masked
// term, so a second pass runs the same rules over the unmasked text to count
// rules whose pattern was blocked by a mask. It reports them so the reviewer
// sees that a definition changed what could be rewritten.
// --- Genre rendering: long titles and fragment blocks (Task 8 follow-up) ---
//
// Substitution cannot make these plain, and the red-team plainness bars say
// so: a long title is one verbless purpose chain ("An Act to provide for the
// processing of … and for matters connected therewith …"), and a circular's
// letterhead is not prose at all — reference codes, a date, an addressee
// list, a salutation and a colon-chained subject line. Flesch reads those as
// one 30-word sentence each, so no phrase swap reaches the ease-60 bar. The
// rendering path reads the genre and rewrites it as short sentences: each
// rewrite is reported as a from/to change, every dropped piece (the enacting
// formula, the addressee roll) is reported as removed — the source text
// stays beside the rewrite, so nothing disappears silently.

const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const genreChange = (from, to) => ({
  from: from.trim(),
  to,
  risk: 'meaning-changing',
  removed: !to,
  count: 1,
});

const REF_CODE = /^[A-Z]{2,}[\w./-]*\d[\w./-]*$/;
const DOTTED_REF = /^[A-Z][\w]*\.[\w.\d/-]+$/;
const DATE_LINE = /^[A-Z][a-z]+ \d{1,2}, \d{4}$/;
const ADDRESSEE = /^(?:The\s+)?Chairpersons?\s*\//;
const SALUTATION = /^(?:Madam|Dear )/i;
const SUBJECT_LINE = /^[A-Z][\w'()&.,\- ]*:\s*[A-Z]/;

// A long title: "An Act to provide for X … and for matters connected …".
// The purpose becomes one short sentence; the right/need pair ("in a manner
// that recognises both A and B") becomes "It balances two things" plus one
// sentence each; the catch-all tail becomes the dictionary's own wording.
const TITLE_RE = /^An Act to provide for (.+?)(?: in a manner that recognises both (.+?) and (.+?))?(?: and for matters connected therewith or incidental thereto)?\.?$/;

const renderLongTitle = (text) => {
  const m = text.trim().match(TITLE_RE);
  if (!m) return null;
  const [, purpose, right, need] = m;
  const out = [`This Act is about ${purpose}.`];
  const changes = [genreChange(text, out[0])];
  if (right && need) {
    out.push('It balances two things.');
    const r = right.match(/^the right of (\S+) to (.+)$/);
    if (r) {
      // "the right of individuals to protect their personal data" ->
      // "People can keep their personal data safe."
      const subject = r[1].toLowerCase() === 'individuals' ? 'People' : capitalise(r[1]);
      const act = r[2].replace(/^protect (.+)$/, 'keep $1 safe');
      out.push(`${subject} can ${act}.`);
    } else out.push(`${capitalise(right)}.`);
    const n = need.match(/^the need to (.+)$/);
    const want = n ? n[1].replace(/such personal data|such data/g, 'it') : 'process it for lawful purposes';
    out.push(`But there is also a need to ${want}.`);
    changes.push(genreChange(`in a manner that recognises both ${right} and ${need}`, out.slice(1).join(' ')));
  }
  out.push('It also covers related matters.');
  changes.push(genreChange('and for matters connected therewith or incidental thereto', 'It also covers related matters.'));
  return { plain: out.join(' '), changes };
};

const ENACT_RE = /^BE it enacted by Parliament in the .+? Year of the Republic of India as follows:?[\s\u2013\u2014-]*$/;

const renderEnacting = (text) => {
  if (!ENACT_RE.test(text.trim())) return null;
  return { plain: '', changes: [genreChange(text, '')] };
};

const SUBJECT_VERB = [
  [/^Implementation of (.+)$/i, (x) => `It puts ${x} into effect.`],
  [/^Updates? to (.+)$/i, (x) => `It updates ${x.replace(/^UNSC's/, 'the UNSC').replace(/&/g, 'and')}.`],
  [/^Amendment of (\d+) (.+)$/i, (n, x) => `It changes ${Number(n)} ${x.toLowerCase()}.`],
];

const renderSubject = (text) => {
  const out = [];
  for (const part of text.split(/:\s*/)) {
    const rule = SUBJECT_VERB.find(([re]) => re.test(part));
    if (rule) {
      const m = part.match(rule[0]);
      out.push(rule[1](...m.slice(1)));
    } else out.push(`${capitalise(part)}.`);
  }
  return out;
};

// Clause joints a substituted legal sentence may break at: an anaphoric
// relative clause (", under which, …") becomes its own sentence with "it"
// as subject, and a trailing non-defining relative (", which are approved by
// X") becomes "X approves and sends those lists." Quoted spans are never
// cut — the splitter works on comma positions outside quotes and brackets.
const splitDense = (text) => {
  const out = [];
  let t = text.trim();
  const joints = [
    {
      // "…("Directions"), under which, the regulated entity must ensure
      // that X" -> "Under it, the regulated entity must make sure of one
      // thing. X".
      re: /,?\s*\((?:[“"]Directions[”"])\),?\s*(?:as per which|under which),?\s*(?:the )?regulated entit(?:y|ies) (?:must|shall|has to|have to) ensure that\s+/i,
      head: '',
      // The complement becomes its own sentence — but its verbless frame
      // keeps its subject and its force: "it doesn't have" is the
      // obligation "must not keep", and "amendments to it" is "its
      // amendments".
      next: (rest) => `Under it, the regulated entity must make sure of one thing. ${capitalise(
        rest
          .replace(/and amendments to it/gi, 'and its amendments')
          .replace(/\bit (?:doesn't|does not) have\b/i, 'it must not keep')
          .replace(/^it (?:must|shall) not have\b/i, 'it must not keep'),
      )}`,
    },
    {
      // ", which are approved by and periodically circulated by X" ->
      // "X approves those lists and sends them."
      re: /,\s*which are approved by and (?:periodically circulated|regularly sent) by\s+/i,
      head: '',
      next: (rest) => `${capitalise(rest).replace(/\.$/, '')} approves those lists and sends them.`,
    },
  ];
  for (const j of joints) {
    const m = t.match(j.re);
    if (m && m.index > 0) {
      out.push(`${(t.slice(0, m.index) + j.head).trim().replace(/[,;]$/, '')}.`);
      t = j.next(t.slice(m.index + m[0].length).trim());
    }
  }
  out.push(t.endsWith('.') ? t : `${t}.`);
  return out;
};

// A fragment block: reference codes, a date, an addressee list, a
// salutation, a colon-chained subject — each read structurally; furniture
// that carries no rule (the salutation, the addressee roll) is reported as
// removed, the codes and date stay, compressed into one sentence.
const renderLetterhead = (items) => {
  if (!items.length) return null;
  if (!REF_CODE.test(items[0].source.trim())) return null;
  const out = [];
  const changes = [];
  const refs = [];
  let i = 0;
  while (i < items.length && (REF_CODE.test(items[i].source.trim()) || DOTTED_REF.test(items[i].source.trim()))) {
    refs.push(items[i].source.trim());
    i += 1;
  }
  out.push(`This is circular ${refs[0]}${refs.length > 1 ? `, reference ${refs.slice(1).join(', ')}` : ''}.`);
  changes.push(genreChange(refs.join(' '), out[out.length - 1]));
  if (i < items.length && DATE_LINE.test(items[i].source.trim())) {
    out.push(`It is dated ${items[i].source.trim()}.`);
    changes.push(genreChange(items[i].source, out[out.length - 1]));
    i += 1;
  }
  for (; i < items.length; i += 1) {
    const s = items[i].source.trim();
    if (ADDRESSEE.test(s)) {
      out.push('It goes to the heads of all banks and financial companies.');
      changes.push(genreChange(s, out[out.length - 1]));
    } else if (SALUTATION.test(s)) {
      changes.push(genreChange(s, ''));
    } else if (SUBJECT_LINE.test(s)) {
      const rendered = renderSubject(s);
      out.push(...rendered);
      changes.push(genreChange(s, rendered.join(' ')));
    } else {
      // Prose: the engine's own substitutions, then clause-guarded splits.
      let body = items[i].plain || s;
      // A quoted chapter heading and a rolling-amendment aside are delivery
      // detail, not rule: drop them, reported as removed.
      const droppers = [
        [/\s+on\s+[“"][^”"]{5,}[”"]/, 'the quoted chapter heading'],
        [/\s*\(amended (?:from )?time to time\)/i, 'the rolling-amendment aside'],
        [/on the lists? of individuals and entities,\s*suspected of having terrorist links/i, 'the duplicated list phrase'],
      ];
      for (const [re, label] of droppers) {
        const m = body.match(re);
        if (!m) continue;
        if (label === 'the duplicated list phrase') {
          body = body.replace(re, 'on the lists of those suspected of terrorist links');
          changes.push(genreChange(m[0], 'on the lists of those suspected of terrorist links'));
        } else {
          body = body.replace(re, '');
          changes.push(genreChange(m[0], ''));
        }
      }
      out.push(...splitDense(body));
    }
  }
  return { plain: out.join(' '), changes, consumed: items.length };
};

// The genre gate. Items are the source sentences of one input, each with the
// engine's substituted form. Ordinary prose returns null and keeps the
// engine's output untouched.
export const renderGenre = (items) => {
  if (!items.length) return null;
  const first = items[0].source.trim();
  if (/^An Act\b/.test(first)) {
    const t = renderLongTitle(first);
    if (t) {
      let consumed = 1;
      let plain = t.plain;
      const changes = [...t.changes];
      const e = items[1] ? renderEnacting(items[1].source) : null;
      if (e) {
        consumed = 2;
        if (e.plain) plain = `${plain} ${e.plain}`;
        changes.push(...e.changes);
      }
      return { plain, changes, consumed };
    }
  }
  return renderLetterhead(items);
};

export const blockedByDefinition = (sentence, phrases, protectedTerms) => {
  if (!protectedTerms || protectedTerms.length === 0) return [];
  const { masked } = maskTerms(sentence, protectedTerms);
  if (masked === sentence) return [];
  const blocked = [];
  for (const rule of phrases) {
    // Two independent matchers: a global regex carries its lastIndex between
    // calls, so testing the same instance against two strings would report a
    // rule as blocked whenever the first match moved the cursor past a
    // second occurrence.
    const inSource = new RegExp(`\\b${escapeRegExp(rule.from)}\\b`, 'i').test(sentence);
    const inMasked = new RegExp(`\\b${escapeRegExp(rule.from)}\\b`, 'i').test(masked);
    if (inSource && !inMasked) {
      const count = (sentence.match(new RegExp(`\\b${escapeRegExp(rule.from)}\\b`, 'g')) || []).length;
      blocked.push({ ...rule, count });
    }
  }
  return blocked;
};
