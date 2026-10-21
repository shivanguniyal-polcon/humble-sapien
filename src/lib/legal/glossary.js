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

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
