// The agent layer, kept as a contract before it is a product.
//
// A "live" agent here is deterministic software that already runs on the
// Sampark page: a table lookup, a date rule, a document list, a letter
// template. A "next" agent is a staged model-assisted service. It is not
// live, it does not call a model in this build, and it may not send, file or
// deny anything. Every row ends at a named human gate.

export const SAMPARK_AGENTS = [
  {
    id: 'intake',
    name: 'Intake agent',
    status: 'next',
    statusLabel: 'Staged · model',
    role:
      'Turns a sentence such as “my wages have not come for 47 days” into a structured request, and asks only for the one missing fact.',
    bound:
      'The citizen’s own words, the chosen language, and the minimum facts needed to route the case. No inferred caste, religion, disability or income.',
    gate:
      'A person confirms the facts before a route is chosen. The agent may show which published criterion fails, and what would resolve it; it never issues a determination.',
  },
  {
    id: 'route',
    name: 'Route agent',
    status: 'live',
    statusLabel: 'Live · deterministic',
    role:
      'Maps the situation, scheme and place to the office that owes the answer, the rung above it, and the contact route for that state.',
    bound:
      'The published scheme, touchpoint and verification tables. Every rung carries its source and the date it was last checked.',
    gate:
      'A person can move the addressed rung. The agent does not invent an office or a telephone number when the table has no row.',
  },
  {
    id: 'evidence',
    name: 'Evidence agent',
    status: 'part',
    statusLabel: 'Live ledger · monitor staged',
    role:
      'Keeps the source ledger, flags a stale office or deadline, and prepares a correction packet when a rule or address changes.',
    bound:
      'The primary notification, the official directory and the recorded verification date. A source that cannot be opened is shown as unknown.',
    gate:
      'A named reviewer clears every correction before it becomes public. The agent may flag; it may not overwrite a verified row.',
  },
  {
    id: 'draft',
    name: 'Drafting agent',
    status: 'live',
    statusLabel: 'Live · template; model staged',
    role:
      'Assembles the printable sheet, the addressed letter, the document list and the case reference from the choices the citizen has made.',
    bound:
      'The selected scheme, situation and office; the citizen’s dates; the published document list. It does not give legal advice or predict an outcome.',
    gate:
      'The citizen reads and chooses to share, print or hand over the letter. There is no auto-send, no email from a model, and no signature in the citizen’s name.',
  },
  {
    id: 'follow',
    name: 'Follow-up agent',
    status: 'next',
    statusLabel: 'Staged · consent required',
    role:
      'Schedules a reminder, prepares an escalation packet if a deadline passes, and records the office response in the case file.',
    bound:
      'Only the contact route the citizen explicitly chose, and only the case facts the citizen allowed to be stored.',
    gate:
      'A human reviews every outgoing message. The citizen can stop reminders with one action, and the default is no message at all.',
  },
  {
    id: 'steward',
    name: 'Steward agent',
    status: 'next',
    statusLabel: 'Staged · back office',
    role:
      'Finds duplicate cases, checks translation consistency, prepares funder reporting and watches for a source that has changed.',
    bound:
      'Aggregate or de-identified data only. No citizen case narrative, name, phone number or document appears in a fundraising report.',
    gate:
      'A native-language reviewer signs off translation, and a programme lead signs off every public claim. The agent cannot approve its own work.',
  },
];

export const SAMPARK_AGENT_RULES = [
  'An agent may prepare and test published criteria against the facts a person confirms. No eligibility determination, no denial, no legal conclusion and no case closure is automated.',
  'No source, no sentence. Every address, deadline and document rule carries a source and a last-checked date.',
  'No send without a human. The citizen, or a named staff member acting on a recorded consent, presses the final action.',
  'Every run leaves a trace: input, source, model and prompt version, output, reviewer and timestamp.',
  'Citizen data is not training data. A model provider may not reuse a Sampark case to improve a general model.',
  'A correction changes the ledger and the agent. The old answer is kept in the public correction log.',
];

export const SAMPARK_LIVE_NOW = [
  '14 schemes in the citizen shelf, with two built deeply enough to draft a case',
  '21 situations across those schemes',
  'A five-rung office ladder, from village to state',
  'Four deadline rules and an addressed letter template',
  'A verification ledger with a last-checked date',
  'Nine languages, including Urdu in right-to-left layout',
  'No account, no server-side case file, nothing sent until the citizen chooses',
];

export const SAMPARK_STAGED = [
  'An intake summariser that asks one missing question at a time and tests the published criteria without issuing a determination',
  'A source monitor that proposes corrections for a human reviewer',
  'A translation QA pass that flags drift; a native reviewer signs off',
  'A consent-bound follow-up service with a one-tap stop',
  'A de-identified steward that prepares funder reporting from aggregate outcomes',
];
