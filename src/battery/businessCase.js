// The business-case front end: a scoping form that emits the Battery's own
// module input. The engine, the manifest and the gate do not change — this
// only turns the questions a consulting brief asks (what decision, what
// options, what it costs, what it returns, what could go wrong) into the CBA
// input the four stages already run.
//
// A consulting business case is not a research report. The missing half was
// always the front end: a client question, an options register, an
// assumptions register with provenance, and the risks — none of which the
// JSON box asked for. The assumptions and risks travel into the report's
// parameter table, so what was assumed is printed beside what was found.

let seq = 0;
const lineId = (prefix) => {
  seq += 1;
  return `${prefix}-${seq}`;
};

export const emptyBrief = (baseYear = new Date().getFullYear()) => ({
  question: '',
  sponsor: '',
  baseYear,
  horizonYears: 10,
  // Cash lines: { label, annualValue, fromYear, toYear, group }
  costs: [],
  benefits: [],
  // Unpriced effects: { label, effect, who }
  unpriced: [],
  // Assumptions: { text, source, status } — status is the Battery's own
  // vocabulary: verified | reported | custom.
  assumptions: [],
  // Risks: one line each, in the reader's words.
  risks: [],
});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isInt = (v) => Number.isInteger(v);

// A flat annual value across a range of years becomes the schedule the CBA
// module expects. One row per year: the module reads year-by-year, and a
// spread schedule that lies about its shape is worse than no schedule.
const scheduleFor = (line, horizon) => {
  const from = Math.max(0, Math.trunc(num(line.fromYear) ?? 0));
  const to = Math.min(horizon, Math.trunc(num(line.toYear) ?? horizon));
  const value = num(line.annualValue) ?? 0;
  const out = [];
  for (let year = from; year <= to; year += 1) out.push({ year, value });
  return out;
};

// The brief is valid when the module would accept what it produces, plus the
// two things a brief owes a reader: a question worth answering and at least
// one option that differs from doing nothing.
export const validateBrief = (brief) => {
  const errors = [];
  const warnings = [];

  if (!String(brief.question || '').trim()) {
    errors.push('The brief needs the decision question: what is being decided, by whom, and by when.');
  }
  if (!isInt(brief.horizonYears) || brief.horizonYears < 1 || brief.horizonYears > 50) {
    errors.push('The horizon must be a whole number of years between 1 and 50.');
  }
  if (!isInt(brief.baseYear) || brief.baseYear < 1990) {
    errors.push('The base year must be a four-digit year.');
  }

  const checkLines = (lines, kind) => {
    for (const l of lines) {
      if (!String(l.label || '').trim()) {
        errors.push(`Every ${kind} line needs a name.`);
        continue;
      }
      if (num(l.annualValue) == null) {
        errors.push(`"${l.label}" needs an annual value in rupees.`);
      }
      const from = num(l.fromYear);
      const to = num(l.toYear);
      if (from != null && (from < 0 || from > brief.horizonYears)) {
        errors.push(`"${l.label}" starts in year ${from}, outside the 0 to ${brief.horizonYears} horizon.`);
      }
      if (to != null && (to < 0 || to > brief.horizonYears)) {
        errors.push(`"${l.label}" ends in year ${to}, outside the 0 to ${brief.horizonYears} horizon.`);
      }
      if (from != null && to != null && from > to) {
        errors.push(`"${l.label}" starts after it ends.`);
      }
    }
  };
  checkLines(brief.costs, 'cost');
  checkLines(brief.benefits, 'benefit');

  if (brief.costs.filter((l) => String(l.label || '').trim()).length === 0) {
    errors.push('A business case with no cost line is a wish, not a case. Add what the option costs.');
  }
  if (brief.benefits.filter((l) => String(l.label || '').trim()).length === 0) {
    errors.push('Add at least one priced benefit: what the option returns, in rupees, however rough.');
  }
  if (brief.unpriced.filter((l) => String(l.label || '').trim()).length === 0) {
    warnings.push(
      'No unpriced effects listed. If truly none exist, say so in the public interest check rather than leaving it blank.',
    );
  }
  for (const u of brief.unpriced) {
    if (!String(u.label || '').trim()) continue;
    if (!String(u.effect || '').trim()) {
      warnings.push(`"${u.label}" should describe its effect in physical units.`);
    }
    if (!String(u.who || '').trim()) {
      warnings.push(`"${u.label}" should name who is affected. The public interest check asks anyway.`);
    }
  }
  for (const a of brief.assumptions) {
    if (!String(a.text || '').trim()) continue;
    if (!String(a.source || '').trim()) {
      warnings.push(`Assumption "${a.text}" has no source. Mark it user supplied or give it one.`);
    }
  }

  return { errors, warnings };
};

// Brief -> CBA module input. The question becomes the title, so the report
// opens with the decision it answers rather than with a file name.
export const briefToInput = (brief, { idPrefix = 'bc' } = {}) => {
  const horizon = brief.horizonYears;
  const mk = (line, kind, group) => ({
    id: lineId(`${idPrefix}-${kind}`),
    label: String(line.label || '').trim(),
    kind,
    priced: true,
    group,
    schedule: scheduleFor(line, horizon),
  });

  const lines = [
    ...brief.costs
      .filter((l) => String(l.label || '').trim())
      .map((l) => mk(l, 'cost', l.group === 'recurring' ? 'recurring' : 'capital')),
    ...brief.benefits
      .filter((l) => String(l.label || '').trim())
      .map((l) => mk(l, 'benefit', 'beneficiary')),
    ...brief.unpriced
      .filter((l) => String(l.label || '').trim())
      .map((l) => ({
        id: lineId(`${idPrefix}-effect`),
        label: String(l.label).trim(),
        priced: false,
        effect: String(l.effect || '').trim(),
        unit: 'physical units, stated by the analyst',
        who: String(l.who || '').trim(),
      })),
  ];

  return {
    title: String(brief.question || '').trim() || 'Business case',
    baseYear: brief.baseYear,
    horizonYears: horizon,
    lines,
  };
};

// Assumptions and risks travel into the report's parameter table, so the
// artefact prints what was assumed beside what was found. Status uses the
// Battery's own vocabulary so the reader sees the same three labels they see
// on the discount rate.
export const briefToParams = (brief) => {
  const values = {};
  const meta = {};

  if (brief.sponsor) {
    values.sponsor = brief.sponsor;
    meta.sponsor = {
      label: 'Sponsor',
      provenance: 'Named in the business-case brief.',
      status: 'custom',
    };
  }

  brief.assumptions
    .filter((a) => String(a.text || '').trim())
    .forEach((a, i) => {
      const key = `assumption${i + 1}`;
      values[key] = String(a.text).trim();
      meta[key] = {
        label: `Assumption ${i + 1}`,
        provenance: String(a.source || '').trim() || 'Not sourced in the brief.',
        status: ['verified', 'reported', 'custom'].includes(a.status) ? a.status : 'custom',
      };
    });

  brief.risks
    .map((r) => String(r || '').trim())
    .filter(Boolean)
    .forEach((r, i) => {
      const key = `risk${i + 1}`;
      values[key] = r;
      meta[key] = {
        label: `Risk ${i + 1}`,
        provenance: 'Named in the business-case brief. What would have to be true for the recommendation to be wrong.',
        status: 'custom',
      };
    });

  return { values, meta };
};
