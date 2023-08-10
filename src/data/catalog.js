// THS Data Commons: dataset catalog.
// Every dataset carries its tier (open / commons-plus), provenance and the
// series the playground can chart. Values live in datasets.json.

export const catalog = [
  {
    id: 'pmjay',
    title: 'Ayushman Bharat PM-JAY programme trajectories',
    tier: 'open',
    rows: 27,
    unitNote: 'National series, 2018–2025 milestone anchors',
    description:
      'Cards issued, authorised admissions, empanelled hospitals and treatment value at official milestone dates, each row sourced to PIB, Lok Sabha replies or the NHA annual report.',
    source: 'PIB releases, Lok Sabha written replies, NHA Annual Report 2024-25 (collected in THS research files)',
    view: 'series',
    rowsKey: 'pmjay_series',
    series: [
      { key: 'cards_crore', label: 'Ayushman cards issued', unit: 'crore' },
      { key: 'admissions_crore', label: 'Authorised admissions', unit: 'crore' },
      { key: 'hospitals_count', label: 'Empanelled hospitals', unit: 'count' },
      { key: 'treatment_value_crore', label: 'Treatment value authorised', unit: '₹ crore' },
    ],
  },
  {
    id: 'states',
    title: 'PM-JAY state and UT admissions by financial year',
    tier: 'commons-plus',
    rows: 123,
    unitNote: 'State/UT × financial year panel, FY2018-19 to FY2021-22',
    description:
      'The PIB annexure of authorised admissions, digitised as a tidy panel: which states absorbed the scheme, how fast, and where delivery lagged the national curve.',
    source: 'PIB PRID 1813651 annexure (State/UT × FY table)',
    view: 'bars',
    rowsKey: 'pmjay_states',
  },
  {
    id: 'evm',
    title: 'EVM rollout and the gender turnout gap',
    tier: 'commons-plus',
    rows: 13,
    unitNote: 'Regression output, 1999 Phase-1 natural experiment',
    description:
      'Difference-in-differences estimates of the 1999 EVM Phase-1 rollout on gender-disaggregated turnout across a 434-district panel, with clustered, randomisation-inference and wild-bootstrap specifications.',
    source: 'THS / IIT Delhi thesis research output (working paper in preparation)',
    view: 'coefficients',
    rowsKey: 'evm_gender_gap',
    betaField: 'beta',
    seField: 'se',
    labelField: 'variable',
  },
  {
    id: 'ec98',
    title: 'EVM urban horserace: EC98 specifications',
    tier: 'commons-plus',
    rows: 47,
    unitNote: 'Regression output, urban-sensitivity horserace',
    description:
      'The urban-race sensitivity set behind the EVM study: male and female turnout-gap effects across specifications with and without urban controls.',
    source: 'THS thesis research output (raw file: ec98_urban_horserace_results.csv)',
    view: 'coefficients',
    rowsKey: 'ec98_horserace',
    betaField: 'beta',
    seField: 'se',
    labelField: 'spec',
  },
  {
    id: 'dosage',
    title: 'EVM dosage–response (continuous dose)',
    tier: 'commons-plus',
    rows: 21,
    unitNote: 'Regression output, dose-response design',
    description:
      'Continuous-dose estimates of EVM exposure on the turnout gap at graded dose levels, with randomisation-inference and wild-bootstrap p-values.',
    source: 'THS thesis research output (raw file: dosage_ddd_corrected_results.csv)',
    view: 'coefficients',
    rowsKey: 'dosage_ddd',
    betaField: 'b3',
    seField: 'se3',
    labelField: 'Dose',
  },
];

export const byId = (id) => catalog.find((d) => d.id === id);
