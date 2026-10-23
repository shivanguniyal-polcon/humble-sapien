// Applicability filter: join a versioned buyer entity profile to obligation
// rows. Design: private/applicability-filter-design.md.
//
// The costly error is asymmetric — silently dropping a binding obligation is a
// compliance failure, keeping an irrelevant row costs a reviewer seconds. So
// this filter never drops anything it cannot prove out-of-scope, and every
// exclusion carries a reason string.
//
// Deterministic rules over curated fields only. No guessing: a null profile
// field never matches a restriction's trigger; it raises the row to
// 'conditional' instead of dropping it.
//
// Verdicts:
//   in-scope      binds the buyer
//   conditional   binds if a profile fact holds, or the fact is unknown
//   dependency    binds a third party the buyer relies on (auditor, CCIL, ...)
//   out-of-scope  provably does not bind; reason + source recorded

// ---------------------------------------------------------------------------
// Entity classes. A profile maps to one or more scope keys; a circular's
// addressee block and in-text scope clauses map to the same keys. The join is
// set intersection on these strings.

import { bearerTag, bearerOf, isBindingStatement, isDutyTrigger, classifyObligation, getObligationType } from './obligations.js';

// The entity classes a profile can be one of. The filter joins on these
// strings, so the list is the vocabulary of the join and not a taxonomy of
// Indian financial regulation: an entity type the filter cannot join on is
// not a profile it can answer for.
export const ENTITY_TYPES = [
  { id: 'SCB', label: 'Scheduled commercial bank' },
  { id: 'SFB', label: 'Small finance bank' },
  { id: 'PAYMENT_BANK', label: 'Payment bank' },
  { id: 'RRB', label: 'Regional rural bank' },
  { id: 'LAB', label: 'Local area bank' },
  { id: 'UCB', label: 'Urban co-operative bank' },
  { id: 'COOP_BANK', label: 'Co-operative bank' },
  { id: 'NBFC', label: 'Non-banking financial company' },
  { id: 'HFC', label: 'Housing finance company' },
  { id: 'AIFI', label: 'All-India financial institution' },
];

// The facts a profile can state. Anything left null is unknown, and an
// unknown fact raises a row to 'conditional' rather than dropping it.
export const PROFILE_FACTS = [
  {
    key: 'depositTaking',
    label: 'Takes deposits',
    options: [
      { id: '', label: 'Not stated' },
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    key: 'nbfcCategory',
    label: 'NBFC category',
    options: [
      { id: '', label: 'Not stated' },
      { id: 'NBFC-D', label: 'NBFC-D (deposit-taking)' },
      { id: 'NBFC-ND', label: 'NBFC-ND (not deposit-taking)' },
      { id: 'NBFC-ICC', label: 'NBFC-ICC' },
      { id: 'NBFC-MFI', label: 'NBFC-MFI' },
      { id: 'NBFC-CIC', label: 'NBFC-CIC (core investment company)' },
    ],
  },
  {
    key: 'layers',
    label: 'NBFC scale layer',
    options: [
      { id: '', label: 'Not stated' },
      { id: 'UPPER', label: 'Upper layer' },
      { id: 'MIDDLE', label: 'Middle layer' },
      { id: 'LOWER', label: 'Lower layer' },
      { id: 'BASE', label: 'Base layer' },
    ],
  },
];

// The activities a profile can state. Ticking one asserts it; leaving one
// blank says nothing, and nothing is unknown rather than false.
export const PROFILE_ACTIVITIES = [
  { id: 'CDS', label: 'Participates in credit derivatives' },
  { id: 'POP_SERVICES', label: 'Offers point-of-purchase services' },
  { id: 'SNFA_HOLDING', label: 'Holds or acquires specified non-financial assets' },
];

const SCOPE_PATTERNS = [
  { key: 'SCB', test: /\b(?:scheduled )?commercial banks?\b/i },
  { key: 'SFB', test: /\bsmall finance banks?\b/i },
  { key: 'PAYMENT_BANK', test: /\bpayment banks?\b/i },
  { key: 'RRB', test: /\bregional rural banks?\b/i },
  { key: 'LAB', test: /\blocal area banks?\b/i },
  { key: 'UCB', test: /\burban co-?operative banks?\b/i },
  { key: 'COOP_BANK', test: /\b(?:rural )?co-?operative banks?\b/i },
  { key: 'NBFC', test: /\bnon-?banking financial compan(?:y|ies)\b|\bNBFCs?\b/i },
  { key: 'HFC', test: /\bhousing finance compan(?:y|ies)\b|\bHFCs?\b/i },
  { key: 'AIFI', test: /\bAIFIs?\b|\ball-?India financial institutions?\b/i },
];

export const scopeKeysFromText = (text) => {
  const keys = new Set();
  for (const { key, test } of SCOPE_PATTERNS) if (test.test(text)) keys.add(key);
  return keys;
};

// Profile -> scope keys. NBFC sub-categories (D, ND, ICC, MFI, CIC) all sit
// under NBFC; the category distinction is handled by trigger conditions, not
// by instrument scope.
export const scopeKeysFromProfile = (profile) => {
  const keys = new Set(['NBFC', 'HFC'].includes(profile.entityType) ? ['NBFC'] : []);
  keys.add(profile.entityType);
  return keys;
};

// ---------------------------------------------------------------------------
// Trigger conditions: typed predicates over profile fields. Conditions on one
// row are conjunctive — any false excludes, any unknown (and none false) marks
// the row conditional.

const NBFC_LIKE = new Set(['NBFC', 'HFC']);
const BANK_CLASSES = new Set(['SCB', 'SFB', 'PAYMENT_BANK', 'RRB', 'LAB', 'UCB', 'COOP_BANK']);

// Inter-institutional bodies whose membership is defined by operating
// presence ("branch managers of all banks operating in the block including…")
// and therefore reaches past the instrument's addressee. Deliberately narrow:
// the buyer's OWN committees (SCBMF, the Board) are not here — their duties
// bind the buyer directly. A body-duty row is one where the BODY (or its
// members collectively) discharges the task — not one where a named solo
// official (LDM, Convenor, DCO) merely references a body.
const BODY_MODAL_SUBJECT =
  /\b(?:BLBC|DCC|SLBCs?|UTLBCs?|DLRCs?|LBS fora)\b\s+(?:shall|will|must)\b/i;
const BODY_MEETING_WORK =
  /\b(?:discussed|reviewed|resolved|overseen|decided|agreed|participated?)\b[^.]{0,60}\b(?:in|before) the (?:DCC|BLBC|SLBCs?|UTLBCs?|DLRCs?)\b/i;
const BODY_PLAN = /\bBlock Credit Plan\b/i;
const BODY_WORK_VERB =
  /\b(?:prepare|review|resolve|oversee|monitor|finali[sz]e|participate)\b/i;
const MEETING_MECHANICS =
  /\bmeetings?\s+(?:shall|will|must)\s+(?:be\s+)?(?:held|convened|chaired|conducted)\b/i;
// Presence-reach rows: "every bank in the district" / the DCO apparatus. The
// duty lands on each bank where it operates — footprint, not addressee.
const PRESENCE_REACH =
  /\b(?:every|all|any)\s+banks?\s+in\s+the\s+(?:district|block|state)\b|\bDistrict Co-?Ordinator\b|\bDCO\b/i;

const CONDITIONS = [
  {
    id: 'deposit-taking',
    test: /\bNBFCs?-D\b|\bNBFC-D\b|\bdeposit[- ]taking\b/i,
    field: 'depositTaking',
    label: 'deposit-taking (NBFC-D)',
    eval: (profile) => bool3(profile.depositTaking),
  },
  {
    id: 'upper-middle-layer',
    test: /\bUpper and Middle Layers?\b/i,
    field: 'layers',
    label: 'Upper/Middle Layer',
    eval: (profile) =>
      profile.layers == null
        ? null
        : profile.layers.some((l) => l === 'UPPER' || l === 'MIDDLE'),
  },
  {
    id: 'service-units-10',
    test: /\b10 and more ['\u2018]?fixed point service delivery/i,
    field: 'serviceUnits',
    label: '10+ fixed point service delivery units',
    eval: (profile) => num3(profile.serviceUnits, (n) => n >= 10),
  },
  {
    id: 'asset-size-1000',
    test: /asset size (?:above|exceeding) .{0,12}1[,.]000/i,
    field: 'assetSizeCr',
    label: 'asset size above Rs 1,000 cr',
    eval: (profile) => num3(profile.assetSizeCr, (n) => n > 1000),
  },
  {
    id: 'snfa-holding',
    test: /\bSNFAs?\b|\bspecified non-financial assets?\b/i,
    field: 'activities',
    label: 'holds/acquires SNFAs',
    eval: (profile) => {
      if (!NBFC_LIKE.has(profile.entityType)) return false; // framework covers NBFCs
      return profile.activities != null && profile.activities.includes('SNFA_HOLDING') ? true : null;
    },
  },
  {
    id: 'cic',
    test: /\bCICs?\b|\bcore investment compan(?:y|ies)\b/i,
    field: 'nbfcCategory',
    label: 'Core Investment Company',
    eval: (profile) =>
      profile.nbfcCategory == null ? null : profile.nbfcCategory === 'NBFC-CIC',
  },
  // Activity predicates. Open-world: an activity absent from the buyer's list
  // is UNKNOWN, not false — profiles are illustrative, not certified complete,
  // and a wrongly dropped duty is the costly error. False only where the
  // entity class is definitively outside the framework.
  {
    id: 'cds-participation',
    test:
      /\bcredit derivatives?\b|\bCDS\b|\bTRS\b|total return swaps?|market[\s-]?makers?|\bmarket[\s-]?participants?\b|\bprotection (?:seller|buyer)\b|\b(?:reference|deliverable) (?:entity|obligation|asset|index)s?\b|\bnovation\b|\boffshore derivative\b|\bcredit index\b|\bfinancial benchmark administrator\b/i,
    field: 'activities',
    label: 'participation in credit derivatives (CDS)',
    context: true,
    eval: (profile) => {
      if (profile.entityType === 'UCB' || profile.entityType === 'COOP_BANK') return false;
      return profile.activities != null && profile.activities.includes('CDS') ? true : null;
    },
  },
  {
    id: 'pop-services',
    test: /\bPoP\b|Point of Purchase/i,
    field: 'activities',
    label: 'Point of Purchase (PoP) services',
    context: true,
    eval: (profile) =>
      profile.activities != null && profile.activities.includes('POP_SERVICES') ? true : null,
  },
];

const bool3 = (v) => (typeof v === 'boolean' ? v : null);
const num3 = (v, pred) => (typeof v === 'number' ? pred(v) : null);

export const conditionsForRow = (quote, prev = '') => {
  const found = [];
  for (const c of CONDITIONS) {
    const hay = c.context ? `${quote} ${prev}` : quote;
    const m = c.test.exec(hay);
    if (m) found.push({ id: c.id, label: c.label, field: c.field, matched: m[0] });
  }
  return found;
};

// ---------------------------------------------------------------------------
// Regulator-facing rows: the duty falls on RBI / government / a forum, not on
// any regulated entity. These leave the list with the bearer as the reason.

// "the Bank" is not in this list. In an instrument addressed to banks it
// names the buyer as often as the regulator, and reading it as the regulator
// drops the buyer's own duty with a confident reason. Only the names that
// cannot mean anyone else are here.
const REGULATOR_BEARER =
  /\b(?:RBI|the Reserve Bank|SEBI|NABARD|the Central Government|the Government|the Appellate Tribunal|the Forum|the Ombudsman)\b\s+(?:shall|will)\b/i;

// The third parties a buyer relies on and cannot do without: the auditor who
// signs the report, the clearing corporation that settles the trade. A duty
// on either is a line in the buyer's board pack, so it becomes a dependency
// rather than being dropped. A duty on a government officer or a forum's own
// meeting mechanics is not: nobody is waiting on that for the buyer.
const RELIED_ON = new Set(['AUDITOR', 'CCIL']);

// The document a dependency points at. "The duty falls on the auditor" is
// only half an answer; the board pack needs the thing the auditor will
// produce. The document is named in the sentence, so it is read from the
// sentence rather than guessed.
const DOCUMENT =
  /\b((?:annual|monthly|quarterly|half-yearly|periodic|interim|audited?|revised|final|compliance)\s+)?(reports?|returns?|certificates?|statements?|registers?|logs?|records?|plans?|forms?|schedules?|annexures?|annex|filings?)\b/i;

export const nextReadFor = (quote, bearer) => {
  const doc = DOCUMENT.exec(String(quote || ''));
  const who = String(bearer?.label || 'someone else').replace(/^the\s+/i, '');
  if (doc) return `the ${who}'s ${doc[0].trim().toLowerCase()}`;
  return `the ${who}'s own obligation`;
};

// ---------------------------------------------------------------------------

const bool3Eval = (cond, profile) => cond.eval(profile);

export const filterObligations = (rows, profile, options = {}) => {
  const addresseeByCircular = options.addresseeByCircular || {};
  const scopeTextByCircular = options.scopeTextByCircular || {};

  return rows.map((row) => {
    const reasons = [];
    const quote = row.quote || '';

    // Layer 1: instrument scope.
    const scopeText =
      `${addresseeByCircular[row.circularId] || ''} ${scopeTextByCircular[row.circularId] || ''}`;
    const scopeKeys = scopeKeysFromText(scopeText);
    const profileKeys = scopeKeysFromProfile(profile);
    let scopeState = 'unknown'; // unknown blocks nothing
    if (scopeKeys.size > 0) {
      const hit = [...scopeKeys].some((k) => profileKeys.has(k));
      scopeState = hit ? 'in' : 'out';
      if (!hit) reasons.push(`instrument addresses ${[...scopeKeys].join(', ')}, not ${profile.entityType}`);
    }

    // Layer 2: clause bearer. The named bearer says WHO has to act; the
    // keyword tag only says which side. A duty on the regulator is out of
    // scope, a duty on the auditor or the clearing corporation is a
    // dependency — somebody else does it, and the buyer still has to show
    // for it.
    const named = bearerOf(quote);
    let bearerState = 'entity';
    if (REGULATOR_BEARER.test(quote) || named.side === 'regulator') {
      bearerState = 'regulator';
      reasons.push(`the duty falls on ${named.known ? named.label : 'the regulator'}, not on the buyer`);
    } else if (named.side === 'third-party' && RELIED_ON.has(named.id)) {
      bearerState = 'third-party';
    } else if (row.bearer === 'third-party') {
      bearerState = 'third-party';
    }

    // Layer 3: trigger conditions (conjunctive, three-valued).
    const conds = conditionsForRow(quote, row.prev || '');
    let condState = 'all-true';
    for (const c of conds) {
      const v = bool3Eval(
        CONDITIONS.find((x) => x.id === c.id),
        profile,
      );
      c.value = v === null ? 'unknown' : v ? 'true' : 'false';
      if (v === false) {
        condState = 'false';
        reasons.push(`condition not met: ${c.label}`);
      } else if (v === null && condState !== 'false') {
        condState = 'unknown';
        reasons.push(`unknown profile fact: ${c.label}`);
      }
    }

    // Verdict. Order matters: provable exclusion first, dependency next,
    // conditional before in-scope so unknowns are never presented as duties.
    //
    // Body-duty and presence-reach rows are exempt from the scope drop: a
    // body's membership clause (or "every bank in the district") reaches past
    // the addressee, so a scope mismatch cannot prove the buyer out. What the
    // addressee CAN prove out is entity class — an NBFC does not sit on
    // banking fora and is not "a bank in the district".
    const ctx = `${quote} ${row.prev || ''}`;
    const bodyDuty =
      !MEETING_MECHANICS.test(quote) &&
      (BODY_MODAL_SUBJECT.test(quote) ||
        (BODY_PLAN.test(ctx) && BODY_WORK_VERB.test(quote)) ||
        BODY_MEETING_WORK.test(quote));
    const presenceReach = PRESENCE_REACH.test(quote);
    const buyerIsBank = BANK_CLASSES.has(profile.entityType);
    let verdict;
    if (
      bearerState === 'regulator' ||
      condState === 'false' ||
      ((bodyDuty || (presenceReach && scopeState === 'out')) && !buyerIsBank) ||
      (scopeState === 'out' && !bodyDuty && !(presenceReach && buyerIsBank))
    ) {
      verdict = 'out-of-scope';
      if ((bodyDuty || presenceReach) && !buyerIsBank)
        reasons.push(`body/district apparatus excludes ${profile.entityType} (not a bank class)`);
    } else if (bodyDuty) {
      verdict = 'dependency';
      reasons.push(
        named.id === 'FORUM'
          ? `the work sits with ${named.label}`
          : 'the work sits with a forum the buyer belongs to',
      );
    } else if (named.side === 'third-party' && RELIED_ON.has(named.id)) {
      // A dependency is a statement about WHO acts; an unknown condition is
      // a statement about WHETHER it applies. The dependency section is the
      // buyer's board pack, so a row that names its bearer goes there, and
      // the unknown fact is still listed on the row.
      verdict = 'dependency';
      reasons.push(`the duty falls on ${named.label}`);
    } else if (condState === 'unknown' || (presenceReach && scopeState === 'out')) {
      verdict = 'conditional';
    } else {
      verdict = 'in-scope';
    }

    return {
      ...row,
      applicability: {
        verdict,
        reasons,
        scopeState,
        bearerState,
        bearer: named.known ? { id: named.id, label: named.label, side: named.side } : null,
        nextRead: verdict === 'dependency' ? nextReadFor(quote, named) : null,
        conditions: conds,
        profileVersion: profile.version || null,
      },
    };
  });
};

// ---------------------------------------------------------------------------
// Clean addressee extraction. The corpus's `addressee` field is scraped HTML
// ("id=pnlDetails class=grid_11… Index To RBI Circulars 762 kb …") that only
// accidentally contains the instrument title. The reliable scope signals live
// in the circular text itself: the title (names the entity classes) and the
// addressee block ("To\nAll participants in …\nDear Sir/Madam" or
// "The Chairpersons/ CEOs of …\nMadam / Dear Sir").

export const cleanAddressee = (raw = '', text = '') => {
  const stripped = String(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const dirty =
    /class=|id=|Index To RBI|pdf\.gif|style=|<|\b\d+\s*kb\b/i.test(stripped) ||
    stripped.length < 20;
  const parts = [];
  const title = /Reserve Bank of India \([^)]*\)[^.\n]{0,60}/.exec(text);
  if (title) parts.push(title[0].trim());
  const toBlock = /\nTo\n([\s\S]{0,300}?)(?:Dear Sir|Dear Madam|Madam,|Sir,)/i.exec(text);
  const chairBlock =
    /((?:The Chairpersons?|The Chief Executive|The Chairman|The Managing Director)[\s\S]{0,300}?)(?:Madam|Dear Sir|Sir,|Madam,)/i.exec(
      text,
    );
  if (toBlock) parts.push(toBlock[1].replace(/\n/g, ' ').trim());
  else if (chairBlock) parts.push(chairBlock[1].replace(/\n/g, ' ').trim());
  if (!dirty && stripped) parts.push(stripped);
  return parts.join(' | ');
};

export const summarise = (filtered) => {
  const counts = {
    'in-scope': 0, conditional: 0, dependency: 0, 'out-of-scope': 0, 'not-a-duty': 0,
  };
  for (const r of filtered) {
    const verdict = r.applicability.verdict;
    if (counts[verdict] === undefined) counts[verdict] = 0;
    counts[verdict] += 1;
  }
  return counts;
};

// ---------------------------------------------------------------------------
// The join, made for the review.
//
// The filter above was written against a corpus where each row carried a
// quote, a circular id and a bearer. The review pipeline's rows carry the
// same information under different names, so the join happens here, once,
// rather than in the interface.

// The sentences of an instrument that say who it applies to. The addressee
// block is the primary signal; these catch the instruments that say it in
// the first paragraph instead.
export const scopeTextFromInstrument = (text) => {
  const parts = String(text || '').split(/(?<=[.;:])\s+/);
  return parts
    .filter((sentence) =>
      /\b(?:applicable to|apply to|shall apply|applies to|addressed to|are directed to|shall be addressed)\b/i.test(
        sentence,
      ),
    )
    .join(' ');
};

// The review's rows, in the shape the filter reads. The previous source
// sentence travels with each row, because two of the trigger conditions read
// the sentence before ("NBFCs which are market-makers") and the sentence
// before is where that context lives.
export const rowsForFilter = (rows, { circularId = 'instrument' } = {}) => {
  const sourceTextById = new Map();
  for (const row of rows) {
    if (!sourceTextById.has(row.sourceId)) sourceTextById.set(row.sourceId, row.sourceText);
  }
  return rows.map((row) => {
    const prev = sourceTextById.get(row.sourceId - 1) || '';
    const cls = classifyObligation(row.sourceText, { prev });
    return {
      id: row.id,
      quote: row.sourceText,
      prev,
      circularId,
      bearer: bearerTag(row.sourceText),
      obligationType: cls.type,
      obligationLabel: getObligationType(cls.type).label,
      plain: row.plain,
      clause: row.clause,
    };
  });
};

// Join the review's rows to a profile. One verdict per row, in the order
// the rows came in, and the counts that go with them.
//
// Nothing is dropped. The filter's own rule is that a row it cannot prove
// out-of-scope stays in, tagged with what is unknown — and the interface
// honours that by showing every row with its verdict rather than hiding the
// ones it does not like.
//
// Every row gets a verdict, including the ones that bind nobody. A
// definition, a commencement clause and a worked example are not out of
// scope and not in scope: they are not duties, and saying so is more use to
// a reviewer than leaving the row unlabelled.
export const assessApplicability = (rows, profile, options = {}) => {
  const counts = {
    'in-scope': 0, conditional: 0, dependency: 0, 'out-of-scope': 0, 'not-a-duty': 0,
  };
  if (!profile || !profile.entityType) return { rows: [], counts };

  const prepared = rowsForFilter(rows, options);
  // Only binding statements get a verdict against the profile. The rest get
  // the verdict that says what they are.
  const bindingIds = new Set(
    prepared
      .filter((row) => isBindingStatement(row.quote, { prev: row.prev }))
      .map((row) => row.id),
  );
  const filtered = filterObligations(prepared, profile, options);
  const joined = filtered.map((row) => {
    const app = row.applicability;
    if (bindingIds.has(row.id)) {
      return {
        id: row.id,
        ...app,
        obligationType: row.obligationType,
        obligationLabel: row.obligationLabel,
      };
    }
    return {
      id: row.id,
      verdict: 'not-a-duty',
      reasons: [
        isDutyTrigger(row.quote)
          ? `not a duty — ${row.obligationLabel ? row.obligationLabel.toLowerCase() : 'this sentence'} binds nobody`
          : 'no duty language — this sentence asks nobody to do anything',
      ],
      obligationType: row.obligationType,
      obligationLabel: row.obligationLabel,
      scopeState: app.scopeState,
      bearerState: app.bearerState,
      bearer: app.bearer,
      nextRead: null,
      conditions: app.conditions,
      profileVersion: app.profileVersion,
    };
  });
  return { rows: joined, counts: summarise(filtered.map((row, i) => ({ applicability: joined[i] }))) };
};
