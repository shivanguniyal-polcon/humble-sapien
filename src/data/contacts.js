// The contact gap, per scheme.
//
// Sampark can name an office for every rung, but for most schemes it cannot
// yet name a phone number, a nodal officer or a district desk. The gap is
// recorded here rather than left blank, the same way a situation with no
// published period carries a clock gap instead of an invented deadline.
//
// A note is written only after the scheme's own documents and the central
// grievance route were checked. It states what the page can stand behind and
// what it cannot, so a citizen is not sent looking for a number that does not
// exist on this page.
//
// Helplines live beside the gaps. A scheme that gained a number loses the
// note that said it had none; a number that is narrower than the scheme keeps
// a note saying what it does not cover.
//
// PM-JAY is absent on purpose: its helplines and state grievance officers are
// already in the escalation directory, and the page links to them.

export const SCHEME_CONTACT_GAPS = {
  mgnrega:
    'No national helpline or named officer number is recorded for MGNREGA. The MIS portal and CPGRAMS are the two routes this page can stand behind; the block Programme Officer remains the first counter.',
  jjm:
    'No beneficiary helpline is published. The national line reaches the office of the Mission Director, not a grievance desk; the Gram Panchayat and the block remain the first counters.',
  pmkisan:
    'No helpline number is recorded here. The PM-KISAN portal carries the current contact details; CPGRAMS is the tracked escalation.',
  pmayg:
    'No national helpline or district officer number is recorded for PMAY-G. The portal and CPGRAMS are the two routes this page can stand behind; the Block Development Officer is the first counter.',
  svanidhi:
    'No mission helpline or bank nodal number is recorded. The portal and CPGRAMS are the two routes this page can stand behind; the lending bank is the first counter.',
  vishwakarma:
    'No helpline number is recorded here. The portal and CPGRAMS are the two routes this page can stand behind; the district implementation desk is the first counter.',
  ssy:
    'No SSY-specific helpline exists. India Post customer care covers general postal and savings queries; the post office or bank branch holding the account is the only counter for a dispute.',
  saubhagya:
    'No national helpline is recorded. The distribution company that serves the address is the first counter; CPGRAMS is the tracked escalation.',
  poshan:
    'No national helpline is recorded. The school or anganwadi and the Block Education Officer are the first counters; CPGRAMS is the tracked escalation.',
};

// Helplines read on 2026-11-05.
//
// Every entry below was read on its `source` page on that date and the digits
// copied from what the page printed. `handles` is what the page says the line
// is for, so a citizen is not told that an office switchboard is a grievance
// desk.
//
// Seven schemes are deliberately absent: their official pages returned 401,
// 403, a TLS error or a timeout at the last check, or printed no number at
// all. Their gap notes above say so rather than borrowing a number from a
// news report or a directory.
export const SCHEME_HELPLINES = {
  jjm: {
    label: 'National Jal Jeevan Mission office',
    numbers: ['011-24361670'],
    handles: 'Office of the Mission Director; not a grievance desk',
    source: 'https://jaljeevanmission.gov.in/national_jal_jeevan_mission',
    checkedOn: '2026-11-05',
    tollFree: false,
  },
  pmuy: {
    label: 'Ujjwala helpline',
    numbers: ['1800 266 6696', '1800 2333 555'],
    handles: 'Connection status and subsidy queries',
    source: 'https://www.pmuy.gov.in/faq.html',
    checkedOn: '2026-11-05',
    tollFree: true,
  },
  ssy: {
    label: 'India Post customer care',
    numbers: ['1800 266 6868'],
    handles: 'General postal and savings-scheme queries; not SSY-specific',
    source: 'https://www.indiapost.gov.in/help&Support/contactus',
    checkedOn: '2026-11-05',
    tollFree: true,
  },
  eshram: {
    label: 'e-Shram helpdesk',
    numbers: ['14434', '1800 889 6811'],
    handles: 'Registration, technical support and grievances; 9.00 AM to 6.00 PM daily',
    source: 'https://eshram.gov.in/faqs',
    checkedOn: '2026-11-05',
    tollFree: true,
  },
  nsp: {
    label: 'NSP helpdesk',
    numbers: ['0120-6619540'],
    handles: 'Scholarship portal queries; 8.00 AM to 8.00 PM, except government holidays',
    source: 'https://scholarships.gov.in/nsphelpdesk',
    checkedOn: '2026-11-05',
    tollFree: false,
  },
};
