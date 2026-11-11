// The CSO's operating portfolio. The page is the handover, not the whole
// institution: a desk, a partner network, a referral route, a public record
// and a small institutional lab. The boundaries are part of the offer.

export const SAMPARK_OFFERS = [
  {
    id: 'citizen',
    label: 'Citizen desk',
    stage: 'Pilot',
    title: 'A person at the end of the letter',
    summary:
      'The page prepares the paper; a trained helper reads it with the citizen, checks the facts, prints it and makes the follow-up call. The desk is the unit of service, not the web session.',
    who: 'Citizens who arrive through a CSO, CSC, panchayat, legal-aid clinic or worker helpline.',
    what: [
      'A 30–45 minute assisted session, in the citizen’s language',
      'Document check and a printed handover pack',
      'An eligibility test against the published criteria, with the failed clause shown',
      'A case reference and a next-step sheet',
      'One follow-up call or message after 7–14 days',
      'An escalation packet if the office does not respond',
    ],
    boundary:
      'Not legal representation, not an eligibility determination and not a promise of a benefit. The desk may show which published criterion fails; the department decides. A legal-aid referral when the issue needs a lawyer.',
    money:
      'Free to the citizen. Partner desks are funded by programme grants, not by a fee charged to the person seeking help.',
  },
  {
    id: 'academy',
    label: 'Partner academy',
    stage: 'Next',
    title: 'Train the helper, not just the citizen',
    summary:
      'A short curriculum and desk kit for the people who already sit with citizens: how to use the map, how to avoid overpromising, how to record a correction and how to refer.',
    who: 'Frontline staff and supervisors in CSOs, CSCs, panchayats, worker helplines and legal-aid clinics.',
    what: [
      'A two-day core course and a quarterly refresher',
      'Desk kit: script, checklist, poster, print pack and case log',
      'Source-update alerts when an office or deadline changes',
      'A monthly case-review clinic with a Sampark reviewer',
      'A peer network across districts, not a franchise',
    ],
    boundary:
      'Training does not certify anyone as a lawyer or a government agent. The employing organisation remains responsible for its own conduct; Sampark can withdraw the kit or the listing.',
    money:
      'Free for small CSOs; a published cohort fee for institutional partners. Training revenue is capped so it cannot become the main business.',
  },
  {
    id: 'referral',
    label: 'Referral network',
    stage: 'Next',
    title: 'A warm handoff, not a signpost',
    summary:
      'When a case crosses from information into representation, Sampark routes it to a named person and records whether it landed. The citizen should not have to retell the story at every door.',
    who: 'Citizens whose problem needs a lawyer, a worker helpline, a mental-health service or a district grievance clinic.',
    what: [
      'A district and issue map of named referral partners',
      'A consent-based referral note the citizen can carry',
      'A warm handoff to a named person, not a generic email',
      'Closed-loop confirmation that the referral was received',
      'A quarterly review of refused, lost and repeat referrals',
    ],
    boundary:
      'Sampark does not take over the legal case, charge a referral fee or promise representation. The partner remains responsible for its own advice.',
    money:
      'Free. Funded as part of the access programme. No commission and no paid placement in the referral directory.',
  },
  {
    id: 'evidence',
    label: 'Evidence commons',
    stage: 'Live base',
    title: 'A public record of where the answer lives',
    summary:
      'The office graph, source ledger and correction log are public goods. Sampark also publishes delivery-failure research and district evidence packs, with the method and its limits attached.',
    who: 'CSOs, journalists, researchers, panchayats, state programme teams and funders.',
    what: [
      'The office and touchpoint map, with a last-checked date',
      'A public correction log, including the answers that changed',
      'Scheme and district delivery-failure briefs',
      'A custom district evidence pack for a programme or evaluation',
      'A method note and data dictionary for every public release',
    ],
    boundary:
      'No paid ranking, no funder approval of findings and no publication of citizen-identifying data. A funder may pay for a study; it does not buy the result.',
    money:
      'The public layer stays free. Custom research and evidence packs are paid work, with the method published and the funder disclosed.',
  },
  {
    id: 'lab',
    label: 'Institutional lab',
    stage: 'Later',
    title: 'Programme design, evaluation and AI assurance',
    summary:
      'A small independent lab for public-interest teams that want a citizen-access pilot, an outcome evaluation or a source-bound AI agent a human can audit. It is built from Sampark’s own operating stack, not sold as a generic chatbot.',
    who: 'CSR foundations, state missions, national CSOs and public-interest technology teams.',
    what: [
      'District access programme design and costing',
      'Independent process and outcome evaluation',
      'Agent source-boundness, bias and human-gate review',
      'DPIA and model-procurement support',
      'A public method note and a management response',
    ],
    boundary:
      'No paid favourable finding, no vendor selection for a fee and no build that automates eligibility denial or sends a case without a human. The lab cannot audit its own work.',
    money:
      'Paid, at published day rates. Earned work is capped and disclosed; the lab does not become the master of the access programme.',
  },
];

export const SAMPARK_FREE = [
  'The citizen route: the page, the office map, the document list and the letter',
  'The eligibility test against the published criteria, with the clause and the source',
  'The public correction log and the basic source ledger',
  'A starter desk kit for a small CSO or panchayat',
  'The referral directory and a consent-based referral note',
];

export const SAMPARK_NOT = [
  'Act as a law firm, sign a vakalatnama or promise representation',
  'Determine eligibility, sanction a benefit or deny one on the department’s behalf',
  'Publish a paid ranking of offices, officials or schemes',
  'Let a funder approve a finding, a correction or a citizen’s letter',
  'Sell, rent or train a general model on citizen case data',
  'Become a general-purpose chatbot with no named human behind it',
];
