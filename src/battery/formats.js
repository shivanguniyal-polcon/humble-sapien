// The input-format specification, in one place. The Battery tool and the
// licensing page render this same structure, so the documentation cannot
// drift from what the engine accepts.

export const GENERAL_RULES = [
  'Anything the engine cannot read is reported in the validation report. Nothing is guessed silently.',
  'Text inputs must be UTF-8. CSV follows RFC 4180: a header row, comma separated, quotes for cells containing commas or quotes.',
  'JSON input is an array of row objects (for ingestion) or the structured module input shown in the sample loader.',
  'Numbers may be plain (1234.5), Indian grouped (1,23,456.78), currency marked (Rs 12,000 or the rupee sign), parenthesised for negatives ((450)), or percentages (45% reads as 0.45).',
  'PDF and images are not read in this version. Export your tables to CSV or JSON first.',
  'Every run produces a project file: the input, the parameters and the public interest answers in one JSON that re-runs exactly.',
];

export const MODULE_FORMATS = [
  {
    id: 'cba',
    module: 'Cost-benefit analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'line_id', required: true, example: 'capex', note: 'Groups rows into one line item.' },
      { name: 'label', required: true, example: 'Toilet construction assistance', note: 'Printed in the report.' },
      { name: 'kind', required: true, example: 'cost or benefit', note: 'Priced lines must be cost or benefit.' },
      { name: 'year', required: true, example: '0', note: 'Whole years from the base year, inside the horizon.' },
      { name: 'value', required: true, example: '1,20,000', note: 'Rupees per year. One row per year per line.' },
      { name: 'group', required: false, example: 'capital', note: 'Free tag for grouping in the report.' },
      { name: 'priced', required: false, example: 'false', note: 'false moves the line to the unpriced ledger.' },
      { name: 'effect, unit, who', required: false, example: 'hours saved, hours per household per year, Women and girls', note: 'Required in spirit for unpriced lines: what, in which units, to whom.' },
    ],
    notes: [
      'A line is one schedule spread over years; repeat line_id across year rows to build it.',
      'Unpriced effects are first-class: they print in their own units beside the priced table, never silently dropped.',
    ],
  },
  {
    id: 'decision-tree',
    module: 'Decision tree',
    answer: 'CSV or JSON. The tabular form is an adjacency list: one row per node.',
    columns: [
      { name: 'root', required: true, example: 'd1', note: 'The id of the first node.' },
      { name: 'nodes[].id, .type', required: true, example: 'c1, chance', note: 'type is decision, chance or terminal.' },
      { name: 'nodes[].children', required: true, example: '["t1", "t2"]', note: 'Branch targets.' },
      { name: 'nodes[].probs', required: true, example: '[0.6, 0.4]', note: 'One probability per child at chance nodes; must add up to 1.' },
      { name: 'nodes[].payoff', required: true, example: '4500000', note: 'Rupees at terminal nodes.' },
      { name: 'nodes[].pit', required: false, example: '{ group, effect, note }', note: 'Distributional column: who lands in this branch. Its absence is reported as a gap.' },
    ],
    notes: [
      'The engine folds the tree back to expected values and reports the optimal branch at every decision node.',
      'CSV form: node_id, node_type, label, children (semicolon-separated ids), probs (semicolon-separated), payoff, root (true on one row), pit_group, pit_effect, pit_note.',
    ],
  },
  {
    id: 'mcda',
    module: 'Multi-criteria decision analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'alternative', required: true, example: 'public', note: 'One row per alternative per criterion.' },
      { name: 'criterion', required: true, example: 'poorest', note: 'Criterion id.' },
      { name: 'score', required: true, example: '8', note: 'Any numeric scale, but every row for one criterion must share it.' },
      { name: 'weight', required: true, example: '0.3', note: 'Repeat the criterion weight on each of its rows. Weights are normalised to 1.' },
      { name: 'direction', required: true, example: 'benefit or cost', note: 'benefit: more is better. cost: less is better.' },
      { name: 'group, who', required: false, example: 'Households, Poorest eligible households', note: 'Whose standpoint the criterion measures; drives the attribution table.' },
      { name: 'alt_label, crit_label', required: false, example: 'Expand public dialysis', note: 'Printed labels.' },
      { name: 'pit_group, pit_effect, pit_note', required: false, example: 'Rural patients, restricted, travel costs fall on households', note: 'Distributional column per alternative.' },
      { name: 'method', required: false, example: 'minmax', note: 'minmax scales each criterion 0 to 1 first; weighted-sum takes scores as given.' },
    ],
    notes: [
      'Use minmax when criteria live on different scales (rupees next to 0 to 10 judgements). Use weighted-sum only when all scores already share one scale.',
      'The run reports the exact weight move that flips the lead, solved in closed form.',
    ],
  },
  {
    id: 'scenario',
    module: 'Scenario analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'scenario_id', required: true, example: 'fraud_control', note: 'One row per scenario per driver.' },
      { name: 'scenario_label', required: true, example: 'Fraud control (L1)', note: 'Printed label.' },
      { name: 'driver', required: true, example: 'fraudRate', note: 'A named model driver. Unknown names are rejected, never ignored.' },
      { name: 'value', required: true, example: '0.10', note: 'Absolute driver level (not a delta). Unlisted drivers keep the reference-case values.' },
      { name: 'pit_group, pit_effect, pit_note', required: false, example: 'Enrolled households, restricted, denied admissions', note: 'Who is left unpaid under this scenario.' },
    ],
    notes: [
      'The reference case is the PM-JAY fiscal-sustainability model, calibrated to NHA and PIB anchors 2018-2025. Driver names and ranges are listed with the module.',
      'A scenario with no driver rows is the pure reference case. That is how the baseline row works.',
    ],
  },
  {
    id: 'cea',
    module: 'Cost-effectiveness analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'effectUnit', required: true, example: 'dialysis-years delivered', note: 'The unit of effect being bought. Printed in every ratio.' },
      { name: 'threshold', required: true, example: '90000', note: 'Worth paying per unit of effect, in rupees. State its provenance.' },
      { name: 'alternatives[].id, .label', required: true, example: 'public-unit, In-house unit', note: 'One entry per option.' },
      { name: 'alternatives[].cost', required: true, example: '3400000', note: 'Present-value cost in rupees.' },
      { name: 'alternatives[].effect', required: true, example: '22', note: 'Present-value effect in effectUnit.' },
      { name: 'alternatives[].pit', required: false, example: '{ group, effect, note }', note: 'Whose health is bought, and at whose cost.' },
    ],
    notes: [
      'Strictly and extendedly dominated options are removed before any incremental ratio is printed.',
      'CSV form: one row per alternative — alternative, label, cost, effect, threshold (same on every row), effect_unit, pit_group, pit_effect, pit_note.',
    ],
  },
  {
    id: 'equity-cba',
    module: 'Distributional cost-benefit analysis',
    answer: 'CSV or JSON. Schedules are the same shape as the CBA module.',
    columns: [
      { name: 'groups[].id, .label', required: true, example: 'sc-hh, Scheduled caste households', note: 'At least two groups.' },
      { name: 'groups[].populationShare', required: true, example: '0.25', note: 'Share of the affected population (0 to 1).' },
      { name: 'groups[].weight', required: false, example: '2', note: 'Equity weight. 1 counts the group like any other; missing weights count 1 with a warning.' },
      { name: 'lines[].kind, .group', required: true, example: 'benefit, sc-hh', note: 'cost or benefit, assigned to a listed group.' },
      { name: 'lines[].schedule', required: true, example: '[{ year: 1, value: 800000 }]', note: 'Same schedule shape as the CBA module.' },
    ],
    notes: [
      'Two totals are printed side by side: plain NPV and equity-weighted NPV. Where they disagree in sign, that disagreement is the finding.',
      'CSV form: one row per line per year — line_id, label, kind, group_id, group_label, population_share, weight, year, value, horizon_years, discount_rate, pit_group, pit_effect, pit_note.',
    ],
  },
  {
    id: 'markov',
    module: 'Markov cohort model',
    answer: 'CSV or JSON. The tabular form is one row per state with one transition column per state.',
    columns: [
      { name: 'states[].id, .label', required: true, example: 'stable, Stable on treatment', note: 'One row per state in the matrix.' },
      { name: 'states[].costPerCycle, .utilityPerCycle', required: true, example: '18000, 0.75', note: 'Rupees and utility (0 to 1) per cycle.' },
      { name: 'transitions', required: true, example: '[[0.85, 0.1, 0.05], ...]', note: 'Row i is the chance of each next state from state i. Rows must add up to 1; they are rejected otherwise.' },
      { name: 'initial', required: true, example: '[1, 0, 0]', note: 'Starting cohort shares; must add up to 1.' },
      { name: 'cycles, cycleYears, discountRate', required: true, example: '10, 1, 0.03', note: 'Horizon, cycle length in years, and the annual discount rate.' },
      { name: 'halfCycleCorrection', required: false, example: 'true', note: 'Default true: first and last cycles weighted 0.5.' },
    ],
    notes: [
      'The full cohort trace is printed in the report so every cycle can be checked against the matrix.',
      'CSV form: state, label, cost_per_cycle, utility_per_cycle, absorbing, initial, cycles, cycle_years, discount_rate, half_cycle_correction, plus one column named after each state id holding that transition probability.',
    ],
  },
  {
    id: 'budget-impact',
    module: 'Budget impact analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'horizonYears', required: true, example: '5', note: 'Whole years, 1 to 5. Budget impact is a short-horizon instrument.' },
      { name: 'eligiblePopulation', required: true, example: '4200', note: 'Persons eligible in year 1.' },
      { name: 'populationGrowth', required: true, example: '0.01', note: 'Annual growth of the eligible pool (0 is fine).' },
      { name: 'uptake', required: true, example: '[0.35, 0.55, 0.7]', note: 'One fraction per year (0 to 1).' },
      { name: 'perPatientCost', required: true, example: '[210000, 214200]', note: 'Rupees per treated patient per year.' },
      { name: 'offsets[]', required: false, example: '{ label, perPatient: [8000, ...] }', note: 'Only money the same payer genuinely stops spending. Everything else is somebody else saving.' },
    ],
    notes: [
      'Gross, offset and net are printed as three columns so any self-financing claim can be checked against the offset row alone.',
      'CSV form: one row per line per year — line_type (uptake|per_patient_cost|offset), label (for offsets), year (1-based), value, horizon_years, eligible_population, population_growth.',
    ],
  },
  {
    id: 'stakeholder-game',
    module: 'Stakeholder game analysis',
    answer: 'CSV or JSON. The tabular form is one row per grid cell.',
    columns: [
      { name: 'players[]', required: true, example: 'two players with id, label, strategies', note: 'Exactly two players in this version.' },
      { name: 'outcomes[]', required: true, example: '{ row: 0, col: 0, payoffs: [6, 5] }', note: 'One entry per grid cell; every cell must be present.' },
      { name: 'outcomes[].pit', required: false, example: '{ group, effect, note }', note: 'Who lives with this outcome. Its absence is reported as a gap.' },
    ],
    notes: [
      'Pure-strategy equilibria only: the module reports honestly when no pure equilibrium exists instead of implying it solved the mixed case.',
      'CSV form: row_strategy, col_strategy, payoff_row, payoff_col, player_row, player_col, pit_group, pit_effect, pit_note. Strategy order is first appearance in the file.',
    ],
  },
  {
    id: 'queueing',
    module: 'Queue and waiting-time analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'arrivalRate', required: true, example: '42', note: 'Arrivals per time unit.' },
      { name: 'serviceRate', required: true, example: '50', note: 'Services per server per time unit.' },
      { name: 'servers', required: true, example: '1', note: 'Whole number of parallel servers.' },
      { name: 'timeUnit', required: true, example: 'hour', note: 'The unit both rates share. A waiting time without a unit is a number without a meaning.' },
    ],
    notes: [
      'An unstable queue (arrivals at or above capacity) is rejected: it has no steady state to report.',
      'CSV form: one scenario per row — arrival_rate, service_rate, servers, time_unit, pit_group, pit_effect, pit_note. One row runs at a time.',
    ],
  },
  {
    id: 'monte-carlo',
    module: 'Monte Carlo risk analysis',
    answer: 'CSV or JSON.',
    columns: [
      { name: 'seed', required: true, example: '20261014', note: 'Whole number. The seed is part of the result: it is what makes the run reproducible.' },
      { name: 'runs', required: true, example: '10000', note: 'Whole number, 100 to 100,000 draws.' },
      { name: 'variables[]', required: true, example: '{ id, label, kind, dist, scale? }', note: 'kind is cost or benefit. scale multiplies the draw into project units (optional).' },
      { name: 'dist.dist', required: true, example: 'uniform, normal, lognormal, beta, triangular', note: 'With the parameters named by the distribution (min/max, mean/sd, mu/sigma, alpha/beta, min/mode/max).' },
    ],
    notes: [
      'The generator is seeded, so the same input reproduces the same percentiles exactly. Re-run tomorrow: identical hashes.',
      'CSV form: one row per uncertain variable — variable_id, label, kind, dist, its parameter columns (min/max, mean/sd, mu/sigma, alpha/beta, min/mode/max), scale, runs, seed.',
    ],
  },
];
