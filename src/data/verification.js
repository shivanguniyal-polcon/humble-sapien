// Sampark's verification ledger.
//
// A rung or a contact is only as good as the last time someone read its
// source. This file is that record: one dated pass, the exact keys it
// covered, and every re-check since.
//
// Three rules:
//
// 1. A key that no pass covers has no date. The page says so. It must never
//    inherit the date of an older pass, because that is how a 2024 phone
//    number ends up wearing a 2026 badge.
// 2. `checkedOn` is the day the source was read, not the day the file was
//    edited. The initial pass is dated 2026-10-30, the research pass the
//    corpus was compiled in.
// 3. A re-check is a new entry in RECHECKS, never an edit of the initial
//    pass, so the history stays readable.
//
// A contact rots faster than a statute: phone numbers and helplines change
// within months, while an Act's period changes only when the Act does. That
// is why the two review windows differ.

export const REVIEW_WINDOW_DAYS = {
  rungs: 180,
  contacts: 90,
  schemes: 180,
};

const INITIAL_PASS = {
  id: 'initial-2026-10-30',
  checkedOn: '2026-10-30',
  checkedBy: 'THS research pass',
  how: 'source document read',
};

// Every rung in the corpus at the time of the initial pass. Level is the
// fifth rung, so the key names the exact office the date applies to.
export const INITIAL_RUNG_KEYS = [
  // MGNREGA
  'mgnrega/jobcard/village', 'mgnrega/jobcard/block', 'mgnrega/jobcard/district', 'mgnrega/jobcard/state', 'mgnrega/jobcard/national',
  'mgnrega/nowork/village', 'mgnrega/nowork/block', 'mgnrega/nowork/district', 'mgnrega/nowork/state', 'mgnrega/nowork/national',
  'mgnrega/wages/village', 'mgnrega/wages/block', 'mgnrega/wages/district', 'mgnrega/wages/state', 'mgnrega/wages/national',
  // Jal Jeevan Mission
  'jjm/notap/village', 'jjm/notap/block', 'jjm/notap/district', 'jjm/notap/state', 'jjm/notap/national',
  'jjm/quality/village', 'jjm/quality/block', 'jjm/quality/district', 'jjm/quality/state', 'jjm/quality/national',
  // PM-KISAN
  'pmkisan/notregistered/village', 'pmkisan/notregistered/block', 'pmkisan/notregistered/district', 'pmkisan/notregistered/state', 'pmkisan/notregistered/national',
  'pmkisan/nocredit/village', 'pmkisan/nocredit/block', 'pmkisan/nocredit/district', 'pmkisan/nocredit/state', 'pmkisan/nocredit/national',
  // PM-JAY
  'pmjay/card/village', 'pmjay/card/block', 'pmjay/card/district', 'pmjay/card/state', 'pmjay/card/national',
  'pmjay/refused/village', 'pmjay/refused/block', 'pmjay/refused/district', 'pmjay/refused/state', 'pmjay/refused/national',
  // PMAY-G
  'pmayg/notselected/village', 'pmayg/notselected/block', 'pmayg/notselected/district', 'pmayg/notselected/state', 'pmayg/notselected/national',
  'pmayg/money/village', 'pmayg/money/block', 'pmayg/money/district', 'pmayg/money/state', 'pmayg/money/national',
  // PMUY
  'pmuy/connection/village', 'pmuy/connection/block', 'pmuy/connection/district', 'pmuy/connection/state', 'pmuy/connection/national',
  // PM SVANidhi
  'svanidhi/loan/village', 'svanidhi/loan/block', 'svanidhi/loan/district', 'svanidhi/loan/state', 'svanidhi/loan/national',
  // PM Vishwakarma
  'vishwakarma/loan/village', 'vishwakarma/loan/block', 'vishwakarma/loan/district', 'vishwakarma/loan/state', 'vishwakarma/loan/national',
  // Sukanya Samriddhi
  'ssy/open/village', 'ssy/open/block', 'ssy/open/district', 'ssy/open/state', 'ssy/open/national',
  // e-Shram
  'eshram/register/village', 'eshram/register/block', 'eshram/register/district', 'eshram/register/state', 'eshram/register/national',
  // National Scholarship Portal
  'nsp/notpaid/village', 'nsp/notpaid/block', 'nsp/notpaid/district', 'nsp/notpaid/state', 'nsp/notpaid/national',
  // Saubhagya
  'saubhagya/connection/village', 'saubhagya/connection/block', 'saubhagya/connection/district', 'saubhagya/connection/state', 'saubhagya/connection/national',
  // Poshan
  'poshan/notfed/village', 'poshan/notfed/block', 'poshan/notfed/district', 'poshan/notfed/state', 'poshan/notfed/national',
  // Swachh Bharat Mission (Grameen)
  'sbm/toilet/village', 'sbm/toilet/block', 'sbm/toilet/district', 'sbm/toilet/state', 'sbm/toilet/national',
  'sbm/unusable/village', 'sbm/unusable/block', 'sbm/unusable/district', 'sbm/unusable/state', 'sbm/unusable/national',
];

// Every contact in the escalation directory, keyed by policy, touchpoint
// index and step index. The order is the order the page reads.
export const INITIAL_CONTACT_KEYS = [
  // PM-JAY
  'pmjay/0/0', 'pmjay/0/1', 'pmjay/0/2',
  'pmjay/1/0', 'pmjay/1/1',
  'pmjay/2/0', 'pmjay/2/1',
  'pmjay/3/0', 'pmjay/3/1',
  'pmjay/4/0', 'pmjay/4/1',
  'pmjay/5/0', 'pmjay/5/1',
  // Swachh Bharat Mission
  'sbm/0/0', 'sbm/0/1',
  'sbm/1/0', 'sbm/1/1',
  'sbm/2/0', 'sbm/2/1',
  'sbm/3/0', 'sbm/3/1',
];

// Every scheme whose portal and grievance route the page shows.
export const INITIAL_SCHEME_KEYS = [
  'mgnrega', 'jjm', 'pmkisan', 'pmjay', 'pmayg', 'pmuy', 'svanidhi',
  'vishwakarma', 'ssy', 'eshram', 'nsp', 'saubhagya', 'poshan', 'sbm',
];

// Re-checks after the initial pass. Keys are the same as above. A record is
// { checkedOn, checkedBy, how } and replaces the earlier date for that key.
export const RECHECKS = {
  rungs: {
    // Example, to be filled by whoever reads the source again:
    // 'mgnrega/jobcard/village': {
    //   checkedOn: '2027-01-15',
    //   checkedBy: 'A. Reviewer',
    //   how: 'India Code, Schedule II, read again',
    // },
  },
  contacts: {},
  schemes: {
    // Helplines read on 2026-11-05, from the official pages named in
    // src/data/contacts.js. These are contact checks, not re-checks of a
    // scheme portal, so they sit apart from the 2026-10-30 pass.
    'helpline/jjm': {
      checkedOn: '2026-11-05',
      checkedBy: 'THS contact pass',
      how: 'official mission page read',
    },
    'helpline/pmuy': {
      checkedOn: '2026-11-05',
      checkedBy: 'THS contact pass',
      how: 'official FAQ read',
    },
    'helpline/ssy': {
      checkedOn: '2026-11-05',
      checkedBy: 'THS contact pass',
      how: 'India Post contact page read',
    },
    'helpline/eshram': {
      checkedOn: '2026-11-05',
      checkedBy: 'THS contact pass',
      how: 'official FAQ read',
    },
    'helpline/nsp': {
      checkedOn: '2026-11-05',
      checkedBy: 'THS contact pass',
      how: 'official helpdesk page read',
    },
  },
};

export const rungKey = (schemeId, situationId, level) =>
  `${schemeId}/${situationId}/${level}`;

export const contactKey = (policyId, touchpointIndex, stepIndex) =>
  `${policyId}/${touchpointIndex}/${stepIndex}`;

// A helpline key names the scheme whose number was read, not the scheme
// portal record: the two are checked separately and dated separately.
export const helplineKey = (schemeId) => `helpline/${schemeId}`;

const initialRungs = new Set(INITIAL_RUNG_KEYS);
const initialContacts = new Set(INITIAL_CONTACT_KEYS);
const initialSchemes = new Set(INITIAL_SCHEME_KEYS);

// The dated record for one key, or null when nobody has read the source
// since the corpus was compiled.
export function verificationFor(kind, key) {
  const later = RECHECKS[kind] ? RECHECKS[kind][key] : null;
  if (later) return later;
  if (kind === 'rungs') return initialRungs.has(key) ? INITIAL_PASS : null;
  if (kind === 'contacts') return initialContacts.has(key) ? INITIAL_PASS : null;
  if (kind === 'schemes') return initialSchemes.has(key) ? INITIAL_PASS : null;
  return null;
}
