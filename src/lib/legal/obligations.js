// Obligation-type classifier.
//
// A "shall" sentence is not an obligation. "Every bank shall nominate a
// District Co-Ordinator" is one. "Membership of the BLBC shall comprise of
// banks and officers" is a composition rule. "The following users shall be
// eligible" is a grant. A buyer's task list contains the first kind only;
// the precision test (2026-10-22) showed the first version could not tell
// them apart (60.5% duty precision) even though it found 99.5% of binding
// statements. This module is the missing layer: it types a trigger-matched
// sentence, in the same rule-ordered style as the clause taxonomy.
//
// Types, in review priority order:
//   action        someone must act, refrain, or hold to a constraint
//   constitutive  composition, status, classification, treatment mechanics
//   entitlement   eligibility, permission, option
//   meta          the instrument's own scope and operation
//   definition    what a term means
//   method        how a metric is computed
//   illustration  a worked example written in the language of duty
//
// Every type carries a note for the reviewer. Sentences can be flagged
// fragment (the span is cut mid-clause) and hedged (preferably, endeavour),
// because both were separate failure modes in the test.

export const OBLIGATION_TYPES = [
  {
    id: 'definition',
    label: 'Definition',
    note: 'Says what a term means. No one acts on it; the reviewer keeps it for defined terms only.',
  },
  {
    id: 'illustration',
    label: 'Worked example',
    note: 'A worked example written with "shall". The numbers are illustrations, not duties.',
  },
  {
    id: 'meta',
    label: 'Instrument scope or operation',
    note: 'The instrument talking about itself: commencement, amendment operations, applicability, savings, interpretation.',
  },
  {
    id: 'entitlement',
    label: 'Eligibility or permission',
    note: 'A grant, option or eligibility rule. Not a duty; a compliance list shows these as boundaries, not tasks.',
  },
  {
    id: 'constitutive',
    label: 'Constitution, status or treatment',
    note: 'Who composes a forum, what something is classified as, how a position is treated. Binding, but nothing is asked of anyone.',
  },
  {
    id: 'method',
    label: 'Method of calculation',
    note: 'How a metric is computed. Treated as background unless the calculation itself is prescribed as conduct.',
  },
  {
    id: 'action',
    label: 'Action obligation or constraint',
    note: 'Someone must act, refrain, or stay inside a threshold. This is the row that belongs on a task list.',
  },
];

export const getObligationType = (id) =>
  OBLIGATION_TYPES.find((t) => t.id === id) || OBLIGATION_TYPES[OBLIGATION_TYPES.length - 1];

// The order a compliance list reads in: what someone has to do first, then
// what they are entitled to, then what is composed, then the background.
// The taxonomy above is written in the opposite direction — definitions and
// illustrations first, because those are the ones a reader has to rule out
// before a sentence can be called a duty.
export const OBLIGATION_ORDER = [
  'action',
  'entitlement',
  'constitutive',
  'method',
  'meta',
  'definition',
  'illustration',
];

// Binding language. A sentence without it binds nobody, however much it
// looks as though it does. This is the trigger the classifier sits on top
// of: the classifier types a trigger-matched sentence, it does not decide
// for itself that a sentence is a duty. "must" and "shall" are the two the
// statutes use; the rest are the forms a circular or a guidance note uses.
const DUTY_TRIGGER =
  /\b(?:shall|must|mandatorily|is required to|are required to|is liable to|are liable to|is obliged to|are obliged to|is bound to|are bound to|has to|have to|will have to)\b/i;

export const isDutyTrigger = (sentence) =>
  DUTY_TRIGGER.test(String(sentence || ''));

// Context that marks a worked example. The segmenter keeps the previous
// sentence, so "Illustratively:" or "Suppose that..." lights up what follows.
const ILLUSTRATION_CONTEXT =
  /\b(?:illustrativ|suppose that|suppose,|then immediately upon|for example|for instance|say,|say that|say the)\b/i;

// The instrument talking about itself. "shall be called" is meta only for
// citation ("These Directions shall be called..."); naming a body is
// constitutive and handled below.
const META_PATTERNS = [
  /\b(?:directions?|circular|instructions?|act|rules?|regulations?|notification) shall be called\b/i,
  /\bshall be deemed to have come into force\b/i,
  /\bshall come into (?:force|effect|operation)\b/i,
  /\bshall (?:stand|be) (?:deleted|substituted|inserted|renamed|re-?numbered|omitted|added|repealed|modified)\b/i,
  /\bshall amend\b/i,
  /\bshall (?:not )?(?:also )?(?:apply|be applicable|extend) to\b/i,
  /\bshall continue to (?:remain repealed|be governed)\b/i,
  /\bshall not (?:in any way )?prejudicially affect\b/i,
  /\bshall be in addition to, and not in derogation\b/i,
  /\bshall be final and binding\b/i,
  /^(?:\W*)(?:the )?provisions? (?:of|under) (?:this|these|the) [^.]{0,40}shall (?:cover|apply|prevail|supplement)\b/i,
];

// "shall include" is definitional only when it extends a "mean" definition or
// a quoted term. In composition ("Other members shall include officers") it
// is constitutive, handled below.
const DEFINITION_PATTERNS = [
  /\bshall (?:mean|have the same meaning|have the meanings? assigned)\b/i,
  /\bmean(?:s)?\b[^.]{0,220}\bshall include\b/i,
  /\bmeans and includes\b/i,
];

// Positive evidence that conduct is compelled or restricted. These run
// before the constitutive predicates so mixed sentences (classification
// plus recording duty) land on action.
const ACTION_PATTERNS = [
  /\bshall (?:not )?(?:ensure|furnish|submit|report|obtain|notify|intimate|record|prepare|draw up|convene|hold|conduct|review|monitor|circulate|publicise|sensiti[sz]e|modify|dispose|adhere|comply|provide|appoint|designate|nominate|co-ordinate|coordinate|identify|establish|put in place|maintain|make all efforts|dispense with|factor in|aggregate|place before|forward|discuss|table|exit|follow|achieve|incorporate|specify|contain|undertake|enter into|settle|use|furnish|deliver|reduced to|be recorded|be disclosed|be furnished|be reported|be calculated on a proportionate|be applied|be adjusted against|be treated as|be achieved|be carried|be in dematerialised form|be cash settled|be a resident entity|be obliged|be responsible|cease to act|cease to be)\b/i,
  /\bshall (?:not )?(?:be )?(?:sold|offered|written|entered into|utilised|participate|transact|buy|sell)\b/i,
  /\bshall (?:not )?(?:exceed|fall below|be subject to (?:a |an )?(?:limit|maximum|cap))\b/i,
  /\bonly for the (?:purpose|benefit) of\b/i,
  // Eligibility criteria that restrict a choice ("There shall be at least
  // one-year continuous association…") are constraints, not constitution.
  /\bthere (?:shall|will) be (?:at least|no more than|a minimum|an? (?:minimum|maximum))\b/i,
  /\bshall not be (?:included|subject to the minimum|sold|offered|participate)\b/i,
  /\bare (?:required|directed|advised|instructed|mandated) to\b/i,
  /\bis (?:required|directed|advised|mandated) to\b/i,
  /\bwill have to\b/i,
  /\bmandatorily\b/i,
];

const ENTITLEMENT_PATTERNS = [
  /\bshall (?:be eligible(?: to be classified)?|be permitted|be allowed|have the option|be entitled)\b/i,
];


// A grant that also restricts ("shall be allowed ... only for hedging") is a
// constraint, not an entitlement.
const RESTRICTION_MARKER = /\b(?:only|not exceed|shall not|no later than|subject to a maximum)\b/i;

const CONSTITUTIVE_PATTERNS = [
  /\bshall (?:not )?be (?:deemed|called)\b/i,
  /\bshall (?:\w+ly )?(?:comprise|consist|function|serve as|primarily focus|stand extinguished|be replaced by)\b/i,
  /\bshall (?:have (?:representatives|membership)|be (?:chaired|co-chaired|constituted|set up|an invitee|invited|the (?:chairperson|chairman|apex|key areas?)|classified|placed|adjusted|expected to serve))\b/i,
  /\bshall be a (?:forum|apex)\b/i,
  /\bthere shall be\b/i,
  // Treatment mechanics: how something is effected or grouped, not a duty.
  /\bshall be (?:effected|given effect to)\b/i,
  /\bshall be liable to be dealt with\b/i,
  /\b(?:shall|will) be considered as (?:one|a single) (?:entity|group)\b/i,
  /\bindicators? (?:to be )?track(?:ed)? shall be\b/i,
  /\b(?:members?|membership) shall (?:include|comprise|consist)\b/i,
];

const METHOD_PATTERNS = [
  /\b(?:is|are) to be calculated on the basis of\b/i,
  /\bwill depend on\b/i,
];

// Span quality.
const FRAGMENT_END = /(?:[,;:]|\b(?:the|a|an|in|of|to|as|per|from|with|for|at|by|or|and|under|i)\.?)$/i;
const HEDGED = /\b(?:preferably|endeavou?r|as far as possible|to the extent possible|may consider)\b/i;

const unbalanced = (text) => {
  const open = (text.match(/\(/g) || []).length;
  const close = (text.match(/\)/g) || []).length;
  return open > close;
};

// Who the duty falls on. Keyword tagging on the whole sentence, because the
// extracted actor string is unreliable. 'entity' covers banks, NBFCs and
// market participants; 'third-party' covers RBI, government, NABARD and
// institutional forums acting as forums.
// "the bank" is deliberately absent: in an RBI instrument it names the
// regulated bank (the buyer) at least as often as it names the Reserve Bank,
// and the corpus bears that out — 78 of 118 sentences the earlier pattern
// read as regulator-side were duties on the bank. "The Reserve Bank" and
// "RBI" are unambiguous; a bare "the Bank" is not, and the filter's rule is
// that ambiguity keeps a row rather than dropping it.
const THIRD_PARTY =
  /\b(?:reserve bank|\brbi\b|nabard|ddm|ldo|lead district officer|district collector|district magistrate|chief minister|minister of|state government|panchayat|msme-dfo|development commissioner|agriculture commissioner|regional offices? of rbi|sebi|fimmda|determinations committee|sub-committee|steering|the forum|this forum|these fora|each of these fora|\bblbc\b|\bdcc\b|\bdlrc\b|\bssc\b|\bslbcs?\b(?! convenor)|\butlbcs?\b(?! convenor))\b/i;
const ENTITY_SIDE =
  /\b(?:convenor bank|lead banks?|\bldm\b|lead district manager|\bdco\b|regulated entit|nbfc|non-banking financial compan|housing finance compan|microfinance|market-?makers?|market participants?|users?|\bfpi\w*|exchanges?|\bccil\b|clearing corporation|banks?|companies|parties to|transferor|transferee|applicant)\b/i;

export const bearerTag = (sentence) => {
  // Order matters: an SLBC Convenor bank is a bank; the SLBC forum is not.
  const convenor = /\b(?:slbc|utlbc) convenor\b/i.test(sentence) || /\bconvenor banks?\b/i.test(sentence);
  if (convenor && /\b(?:prepare|convene|designate|identify|monitor|advise|maintain|co-ordinate|coordinate|circulate|provide|required|shall appoint|report)\b/i.test(sentence)) {
    return 'entity';
  }
  const third = THIRD_PARTY.test(sentence);
  const entity = ENTITY_SIDE.test(sentence);
  if (third && !entity) return 'third-party';
  if (entity && !third) return 'entity';
  if (third && entity) return 'mixed';
  return 'unclear';
};

// ---------------------------------------------------------------------------
// Who bears the duty, named.
//
// The tag above answers "which side does this fall on". This answers "who".
// A dependency verdict that says "binds someone you rely on" without naming
// them is a shrug, and a reviewer cannot file a shrug.
//
// The bearer is the SUBJECT of the duty, not any noun that happens to be in
// the sentence: "The Bank shall appoint the auditors" is a duty on the bank,
// and "the auditors shall file the return" is a duty on the auditor. So the
// subject is read as the text before the sentence's first duty verb, cut at
// the first post-modifier ("the auditors of the Company" -> "the
// auditors"), and the bearer is the noun closest to that verb.
//
// 'side' is what the applicability filter joins on:
//   entity      the buyer or its own organ acts
//   third-party somebody the buyer relies on acts (auditor, CCIL)
//   regulator   the regulator or the government acts

export const DUTY_VERB =
  /\b(?:shall|will|must|is required to|are required to|is liable to|are liable to|is obliged to|are obliged to|is bound to|are bound to|has to|have to|will have to|mandatorily)\b/i;

// A post-modifier is not the subject: "the auditors of the Company" is the
// auditors, "the Plan under the Act" is the Plan.
const POST_MODIFIER =
  /\s+(?:of|appointed by|holding|registered under|licensed under|constituted under|prescribed under|under)\b/i;

// "It shall be the obligation of the auditor to ..." puts the bearer after
// the verb. The construction names it, so it is read from there.
const DUTY_OF =
  /\b(?:it\s+(?:shall|will|is)\s+be\s+the\s+(?:obligation|duty|responsibility)|the\s+(?:duty|obligation|responsibility))\s+of\s+([^,.;]{2,60})/i;

export const BEARERS = [
  { id: 'AUDITOR', label: 'the statutory auditor', side: 'third-party',
    test: /\b(?:statutory auditors?|independent auditors?|auditors?)\b/i },
  { id: 'CCIL', label: 'CCIL', side: 'third-party',
    test: /\bCCIL\b|\bclearing corporation\b/i },
  { id: 'CONVENOR', label: 'the convenor bank', side: 'entity',
    test: /\b(?:convenor bank|(?:SLBC|UTLBC|DCC|BLBC)\s+Convenor)\b/i },
  { id: 'BOARD', label: 'the board', side: 'entity',
    test: /\bboard of directors\b|\bthe board\b/i },
  { id: 'OFFICER', label: 'the named officer', side: 'third-party',
    test: /\b(?:district officer|authorised officer|designated officer|lead district manager|\bLDM\b|\bDCO\b|additional district magistrate|district collector|district magistrate|\bcollector\b|\bregistrar\b|public information officer|\bCPIO\b)\b/i },
  { id: 'GOVERNMENT', label: 'the government', side: 'regulator',
    test: /\b(?:the Central Government|the appropriate Government|the Government|the State Governments?|the State)\b/i },
  { id: 'REGULATOR', label: 'the regulator', side: 'regulator',
    test: /\b(?:the Reserve Bank(?: of India)?|\bRBI\b|NABARD|SEBI|IRDAI)\b/i },
  { id: 'FORUM', label: 'the forum', side: 'third-party',
    test: /\b(?:BLBC|DCC|SLBCs?|UTLBCs?|DLRCs?|the Forum|the Committee|the Tribunal|CRSF|Central Registry)\b/i },
  { id: 'ENTITY', label: 'the entity itself', side: 'entity',
    test: /\b(?:commercial banks?|the banks?|NBFCs?|non-?banking financial compan\w*|housing finance compan\w*|market participants?|the users?|borrowers?|investors?|the Company|the company|the borrower|the lender|the issuer|market makers?|the applicant|the recipient|the beneficiary|persons?|entities?)\b/i },
];

// The text before the sentence's first duty verb. This is the candidate
// subject, not a finished one: it can still carry an adverbial clause in
// front of it.
export const dutySubject = (sentence) => {
  const text = String(sentence || '');
  const m = DUTY_VERB.exec(text);
  if (!m) return '';
  return text.slice(0, m.index).replace(/\s+/g, ' ').trim();
};

// Name the bearer. Returns { id, label, side, known }. 'known' is false when
// no bearer could be read, which is a different thing from a bearer that
// could not be named: the first is the sentence's problem, the second is the
// reader's.
export const bearerOf = (sentence) => {
  const text = String(sentence || '');
  const head = dutySubject(text);

  if (head) {
    const subject = head.split(POST_MODIFIER)[0] || head;
    let best = null;
    for (const bearer of BEARERS) {
      const m = bearer.test.exec(subject);
      if (!m) continue;
      // The subject is the noun nearest the verb.
      if (!best || m.index > best.at) {
        best = { id: bearer.id, label: bearer.label, side: bearer.side, at: m.index };
      }
    }
    if (best) return { id: best.id, label: best.label, side: best.side, known: true };
  }

  const dutyOf = DUTY_OF.exec(text);
  if (dutyOf) {
    for (const bearer of BEARERS) {
      if (bearer.test.test(dutyOf[1])) {
        return { id: bearer.id, label: bearer.label, side: bearer.side, known: true };
      }
    }
  }

  return { id: 'UNNAMED', label: 'someone else', side: 'unclear', known: false };
};

// Type a trigger-matched sentence. Returns the type id and quality flags.
export const classifyObligation = (sentence, { prev = '' } = {}) => {
  const text = String(sentence || '');

  const fragment =
    FRAGMENT_END.test(text.trim()) || unbalanced(text) || /\bshall (?:be|have)?\s*$/i.test(text.trim());
  const hedged = HEDGED.test(text);

  let type = 'action';
  if (DEFINITION_PATTERNS.some((re) => re.test(text))) type = 'definition';
  else if (ILLUSTRATION_CONTEXT.test(prev) || ILLUSTRATION_CONTEXT.test(text)) type = 'illustration';
  else if (META_PATTERNS.some((re) => re.test(text))) type = 'meta';
  else if (ACTION_PATTERNS.some((re) => re.test(text))) type = 'action';
  else if (ENTITLEMENT_PATTERNS.some((re) => re.test(text)) && !RESTRICTION_MARKER.test(text))
    type = 'entitlement';
  else if (ENTITLEMENT_PATTERNS.some((re) => re.test(text))) type = 'action';
  else if (CONSTITUTIVE_PATTERNS.some((re) => re.test(text))) type = 'constitutive';
  else if (METHOD_PATTERNS.some((re) => re.test(text))) type = 'method';

  return { type, fragment, hedged, bearer: bearerTag(text) };
};

// The types that bind somebody. The rest describe the instrument, its
// method or a worked example, and a compliance list has no task in them.
export const BINDING_TYPES = new Set(['action', 'constitutive', 'entitlement']);

// Is this sentence a binding statement? The trigger on its own is not
// enough: a definition and a worked example both carry binding language,
// and neither of them asks anybody to do anything.
export const isBindingStatement = (sentence, { prev = '' } = {}) => {
  if (!isDutyTrigger(sentence)) return false;
  return BINDING_TYPES.has(classifyObligation(sentence, { prev }).type);
};
