// The nine instruments of the analysis floor. Shared by the Tools page and
// the nav dropdown, which needs the same ids and labels for deep links.

export const TOOLS = [
  {
    id: 'battery', label: 'Analysis battery',
    question: 'Can your analysis run again tomorrow and give the same answer?',
    blurb: 'Unorganised data in, auditable analysis out: ingestion with a loud validation report, parameters with provenance, deterministic execution with an audit manifest, and a report that cannot be exported until the public interest check is answered.',
  },
  {
    id: 'lab', label: 'Evaluation engine',
    question: 'Does the policy actually change the outcome?',
    blurb: 'Run difference-in-differences, regression discontinuity, synthetic control and matching live, on complete census and health-survey coverage.',
  },
  {
    id: 'stakeholders', label: 'Stakeholder mapper',
    question: 'Who gains, who is restricted, and who decided?',
    blurb: 'A distributional ledger for any policy: direction, magnitude and power per party, with the verdict read back to you.',
  },
  {
    id: 'touchpoints', label: 'Touchpoint maps',
    question: 'Which office owes you the answer?',
    blurb: 'Follow a scheme from eligibility to grievance redressal, with the escalation route at every step.',
  },
  {
    id: 'simplifier', label: 'Policy simplifier',
    question: 'What does this notification actually say?',
    blurb: 'Plain-language rewriting of policy text, with readability scoring you can check.',
  },
  {
    id: 'scorecards', label: 'Promise scorecards',
    question: 'What was promised, what is the record?',
    blurb: 'Manifesto promises against delivered evidence, four years on.',
  },
  {
    id: 'solutions', label: 'Local solutions',
    question: 'Who already solved this somewhere?',
    blurb: 'A knowledge base of grassroots solutions, documented with their conditions.',
  },
  {
    id: 'notes', label: 'Field notes',
    question: 'What did the work teach?',
    blurb: 'The thinking behind the instruments: methods, failures and corrections.',
  },
  {
    id: 'arcade', label: 'Policy arcade',
    question: 'Can policy literacy be a game?',
    blurb: 'The playground corner of the tools floor. Sixty seconds, falling entitlements.',
  },
];
