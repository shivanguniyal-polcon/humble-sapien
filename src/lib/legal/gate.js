// The legal review gate.
//
// The public interest check asks who the policy binds. The legal review gate
// asks the questions a reviewer has to answer before a file goes to a client:
// is this the current text, are the defined terms resolved, who reviewed it,
// and is it cleared for circulation. Still a hard gate: the export buttons
// stay shut until all four are answered.
//
// This lives in its own module because two others need it. The exports
// builder writes the answers into every artefact; the review file carries
// them between people. If the gate were defined inside the exports module,
// those two would have to import each other.

export const LEGAL_GATE_QUESTIONS = [
  { key: 'currency', label: 'Source version confirmed current?', type: 'text' },
  { key: 'definitions', label: 'Defined terms resolved?', type: 'text' },
  { key: 'reviewer', label: 'Reviewed by (name, qualification) and date', type: 'text' },
  { key: 'circulation', label: 'Approved for external circulation (name, date)', type: 'text' },
];

export const checkLegalGate = (gate) => {
  const missing = LEGAL_GATE_QUESTIONS
    .filter((q) => !String((gate && gate[q.key]) || '').trim())
    .map((q) => q.label);
  return { complete: missing.length === 0, missing };
};

// The gate answers, trimmed, in a fixed key order, so two runs of the same
// answers hash to the same thing whatever order they were typed in.
export const normaliseGate = (gate = {}) => {
  const out = {};
  for (const q of LEGAL_GATE_QUESTIONS) {
    out[q.key] = String((gate && gate[q.key]) || '').trim();
  }
  return out;
};
