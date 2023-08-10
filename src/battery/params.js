// Parameter presets with provenance. Every parameter carries where it came
// from and a verification status, because a receipt that cannot say how solid
// it is, is not a receipt. Status values:
//   'verified'  read from a readable primary source (URL given)
//   'reported'  source identified but not machine-verified from primary text
//   'custom'    supplied by the user, provenance required

export const VERIFICATION_LABELS = {
  verified: 'Verified against primary source',
  reported: 'Reported, not verified against primary text',
  custom: 'User supplied',
};

export const DISCOUNT_PRESETS = [
  {
    id: 'health-reference-case',
    label: 'Health economic evaluation (Indian Reference Case)',
    discountRate: 0.03,
    sensitivity: [0, 0.05],
    status: 'verified',
    provenance:
      'Indian Reference Case for economic evaluation for health technology assessment (2023): 3% per year for costs and outcomes beyond one year; vary 0% to 5% in sensitivity analysis.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10485782/',
  },
  {
    id: 'general-appraisal-ieg',
    label: 'General public investment (IEG study for NITI Aayog)',
    discountRate: 0.08,
    sensitivity: [0.06, 0.12],
    status: 'reported',
    provenance:
      'Reassessment of National Parameters for Project Appraisal in India, IEG study for NITI Aayog (2018), reported to recommend 8% for general economic projects and 6% for environmental projects. The report PDF could not be read in this pass; treat as a lead, not an adopted government rule.',
    source: 'https://niti.gov.in/sites/default/files/2019-06/Final%20Report%20of%20the%20Research%20Study%20on%20%20Reassessment%20of%20National%20Parameters%20for%20Project%20Appraisal%20in%20India%20conducted%20by%20Institute%20of%20Economic%20Growth%20%28IEG%29_Delhi.pdf',
  },
  {
    id: 'custom',
    label: 'Custom rate (state your source)',
    discountRate: 0.05,
    sensitivity: [0.03, 0.07],
    status: 'custom',
    provenance: '',
    source: '',
  },
];

// Normative unit costs for the CBA starter line items. Same honesty rules.
export const UNIT_COST_PRESETS = [
  {
    id: 'sbm-toilet',
    label: 'Swachh Bharat Mission Gramin household toilet',
    value: 12000,
    unit: 'rupees per toilet',
    status: 'verified',
    provenance:
      'DDWS Swachh Bharat Mission Gramin FAQ: Rs 12,000 per IHHL, with a Centre/State split of 7,200/4,800 (60:40) for ordinary states and 10,800/1,200 (90:10) for special category states. The FAQ split refers to Phase I.',
    source: 'https://swachhbharatmission.ddws.gov.in/faq',
  },
  {
    id: 'pmay-house',
    label: 'PMAY-Gramin assistance per house (plain areas)',
    value: 120000,
    unit: 'rupees per house',
    status: 'reported',
    provenance:
      'PMAY-G assistance reported at Rs 1,20,000 in plain areas and Rs 1,30,000 in hilly, difficult, NER and IAP areas. The amounts appear in scheme summaries but could not be verified from the readable Cabinet/PIB text in this pass.',
    source: 'https://pmayg.dord.gov.in/netiayHome/about.aspx',
  },
  {
    id: 'mgnrega-wage',
    label: 'MGNREGA wage rate (state average)',
    value: 252,
    unit: 'rupees per day (Uttar Pradesh, FY 2025-26)',
    status: 'reported',
    provenance:
      'MGNREGA wage revision for FY 2025-26 effective 1 April 2025; reported at Rs 252/day for Uttar Pradesh and Rs 369/day for Kerala. The notification itself could not be read in this pass.',
    source: 'https://nregaplus.nic.in/netnrega/circular_new.aspx',
  },
  {
    id: 'nha-capita',
    label: 'Government health expenditure per capita',
    value: 3169,
    unit: 'rupees per person per year (FY 2021-22)',
    status: 'reported',
    provenance:
      'National Health Accounts 2021-22, indexed as Rs 3,169 per capita government health expenditure. The report PDF could not be read in this pass; PIB release dated 25 September 2024.',
    source: 'https://nhsrcindia.org/sites/default/files/2024-09/NHA%202021-22.pdf',
  },
  {
    id: 'pmposhan-cooking',
    label: 'PM POSHAN material cost per child per day',
    value: 6.78,
    unit: 'rupees per child per day (Bal Vatika and Primary)',
    status: 'reported',
    provenance:
      'PM POSHAN cooking cost revision effective 1 May 2025: Rs 6.78 per child per day (Bal Vatika/Primary) and Rs 10.17 (Upper Primary), per official indexing of the order. The order PDF could not be read in this pass.',
    source: 'https://pmposhan.education.gov.in/Files/Cooking_Cost_Revision/Revision%20of%20Material%20Cost_wef_1-may-2025.pdf',
  },
];

// Horizon conventions used as defaults in the CBA module.
export const HORIZON_PRESETS = [
  {
    id: 'health-lifetime',
    label: 'Lifetime horizon (health, mortality-affecting)',
    years: 30,
    status: 'verified',
    provenance:
      'Indian Reference Case (2023): use a horizon long enough to capture all important costs and outcomes; lifetime where the intervention affects mortality or survival.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10485782/',
  },
  {
    id: 'standard-ten',
    label: 'Standard 10-year appraisal window',
    years: 10,
    status: 'custom',
    provenance: 'A common appraisal window in scheme proposals. No single official rule was verifiable in this pass; state your justification.',
    source: '',
  },
];

// Indian number display: rupees with en-IN grouping, and lakh/crore helpers.
export function formatINR(value, { decimals = 0 } = {}) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;
}

export function formatINRCompact(value) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} crore`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} lakh`;
  return formatINR(value);
}
