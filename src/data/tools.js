// The instruments of the analysis floor. Shared by the Tools page, the nav
// dropdown and each tool's own page.
//
// Every entry carries three lines, and every surface prints them in the same
// order: the name, the question it answers, and what it does plus how to use
// it. `label` is the plain-English category, kept visible so a first-time
// reader is not asked to guess what a Sanskrit name does.

export const TOOLS = [
  {
    id: 'battery',
    name: 'Manthan',
    label: 'Analysis battery',
    question: 'Can your analysis run again tomorrow and give the same answer?',
    blurb: 'Unorganised data in, auditable analysis out: ingestion with a loud validation report, parameters with provenance, deterministic execution with an audit manifest, and a report that cannot be exported until the public interest check is answered.',
    how: 'Start with your own data or a worked example, answer the module’s questions, and read the manifest before you export.',
  },
  {
    id: 'project',
    name: 'Nirmaan',
    label: 'Infrastructure',
    question: 'Does the project cover its debt?',
    blurb: 'A half-yearly project-finance screening case with contractual DSCR, a DSRA liquidity comparison, switching values and a memo. Solar and HAM road cases run entirely in your browser.',
    how: 'Open the solar or HAM road case, change one assumption at a time, and watch the covenant tests and the memo move with it.',
  },
  {
    id: 'lab',
    name: 'Mulyankan',
    label: 'Evaluation engine',
    question: 'Does the policy actually change the outcome?',
    blurb: 'Run difference-in-differences, regression discontinuity, synthetic control and matching live, on complete census and health-survey coverage.',
    how: 'Pick a method, set the design and the sample, then read the estimate beside its standard errors and the assumptions it cannot escape.',
  },
  {
    id: 'stakeholders',
    name: 'Sutra',
    label: 'Stakeholder mapper',
    question: 'Who gains, who is restricted, and who decided?',
    blurb: 'A distributional ledger for any policy: direction, magnitude and power per party, with the verdict read back to you.',
    how: 'Add each party, set the direction and size of the effect, record who held the decision, and read the verdict back before a policy is announced.',
  },
  {
    id: 'touchpoints',
    name: 'Sampark',
    label: 'Touchpoint maps',
    question: 'Which office owes you the answer?',
    blurb: 'Follow a scheme from eligibility to grievance redressal, with the escalation route at every step.',
    how: 'Walk down the map to your village for the office that owes you an answer, or start from the scheme and follow delivery step by step.',
  },
  {
    id: 'simplifier',
    name: 'Saral',
    label: 'Policy simplifier',
    question: 'What does this notification actually say?',
    blurb: 'Plain-language rewriting of policy text, with readability scoring you can check.',
    how: 'Paste the notification, read it sentence by sentence with the flags that need a lawyer, and export the review file with the source text attached.',
  },
  {
    id: 'passbook',
    name: 'Khata',
    label: 'The village money tool',
    question: 'Where did the village’s money go?',
    blurb: 'A Gram Panchayat’s own record, read like a household passbook: what came in, what went out, the 15th Finance Commission balance, the completed works on the GP’s register, and the questions a Gram Sabha can put to it. Built from public eGramSwaraj returns, with every source hashed.',
    how: 'Choose your State, district and village. The page then reads that Gram Panchayat’s record and hands you the questions to carry into the next Gram Sabha.',
  },
  {
    id: 'monitor',
    name: 'Prahari',
    label: 'Regulatory monitor',
    question: 'What changed, and does it bind us?',
    blurb: 'Fifty RBI instruments read as obligations, plus a live library that checks for new circulars twice a day: who must act, what changed since the previous circular, whether it binds your entity profile, and a board pack with the reviewer trail and a manifest.',
    how: 'Set your entity profile, open a circular to read its duties, then compare it with the version before it and export the board pack with the reviewer trail.',
  },
  {
    id: 'scorecards',
    name: 'Sankalp',
    label: 'Promise scorecards',
    question: 'What was promised, what is the record?',
    blurb: 'Manifesto promises against delivered evidence, four years on.',
    how: 'Pick a promise, read the evidence beside the promise, and use the scorecard in a campaign, a classroom or a newsroom.',
  },
  {
    id: 'gender-index',
    name: 'Bhaagidaari',
    label: 'Gender inclusion index',
    question: 'Where do women actually stand, state by state?',
    blurb: 'A composite over five public indicators — women’s schooling, institutional births, anaemia, sex ratio and female literacy — with the weights in your hands and the method printed underneath.',
    how: 'Move the weights and watch the state ranking move with them; the method and every source sit underneath the chart.',
  },
  {
    id: 'solutions',
    name: 'Ankur',
    label: 'Local solutions',
    question: 'Who already solved this somewhere?',
    blurb: 'A knowledge base of grassroots solutions, documented with their conditions.',
    how: 'Search by the problem, not the project name, and read what the fix needs before you copy it.',
  },
  {
    id: 'notes',
    name: 'Field notes',
    label: 'Field notes',
    question: 'What did the work teach?',
    blurb: 'The thinking behind the instruments: methods, failures and corrections.',
    how: 'Read these before trusting any instrument on the floor; each note says what broke and what changed after it.',
  },
  {
    id: 'arcade',
    name: 'Policy arcade',
    label: 'Policy arcade',
    question: 'Can policy literacy be a game?',
    blurb: 'The playground corner of the tools floor. Sixty seconds, falling entitlements.',
    how: 'Arrow keys or pointer, sixty seconds on the clock. It is a break, not an argument.',
  },
];

export const toolById = (id) => TOOLS.find((tool) => tool.id === id);
