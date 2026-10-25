import { publicFieldKeys } from './visibility.js';

const deepClone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

const hamEvidence = {
  constructionMonths: { status: 'benchmark', source: 'Register: HAM construction typically 24-30 months; editable.' },
  assetLifeYears: { status: 'benchmark', source: 'Register: 20-year economic life for the contract case.' },
  contingencyPct: { status: 'benchmark', source: 'Register: 5% typical contingency, editable.' },
  hamSupportPct: { status: 'reported', source: 'HAM MCA: 40% Authority support in five milestone instalments.' },
  annuityYears: { status: 'reported', source: 'HAM MCA: 15-year annuity period.' },
  annuityRatePct: { status: 'benchmark', source: 'Register: MCLR + 1.25%; 9.25% is a proxy, not a quote.' },
  opexEscalationPct: { status: 'benchmark', source: 'Register: 5% O&M escalation example; edit for the concession.' },
  upfrontFeePct: { status: 'benchmark', source: 'Register: 1.0% market practice.' },
  dsraMonths: { status: 'benchmark', source: 'Register: 6 months market practice.' },
  liquiditySupport: { status: 'convention', source: 'No DSRA draw in the base case; the toggle is for liquidity comparison.' },
  gearingPct: { status: 'benchmark', source: 'Register: 70-80% common infrastructure gearing.' },
  interestRatePct: { status: 'benchmark', source: 'Register: HAM MCLR + 1.25%; 9.25% is a proxy, not a quote.' },
  waccPct: { status: 'convention', source: 'Engine convention: 10.5% nominal screening rate for the frozen case; replace with the lender WACC.' },
  costOfEquityPct: { status: 'convention', source: 'Engine convention: 14.0% nominal equity hurdle for the frozen case; replace with the sponsor hurdle.' },
  loanTenorYears: { status: 'reported', source: 'HAM MCA: 15-year annuity period.' },
  repaymentProfile: { status: 'convention', source: 'Annuity for the contract case; sculpted and equal-principal are available.' },
  lockupDscr: { status: 'benchmark', source: 'Register: 1.15x market illustration, not a regulatory minimum.' },
  defaultDscr: { status: 'benchmark', source: 'Register: 1.05x market illustration, not a regulatory minimum.' },
  dsoDays: { status: 'benchmark', source: 'Register: 45 days for NHAI-type annuities.' },
  dpoDays: { status: 'benchmark', source: 'Register: 30 days market practice.' },
  taxRegime: { status: 'reported', source: 'Register: 115BAA baseline for a new SPV.' },
  wdvBlockPct: { status: 'reported', source: 'Register: 10% road/building block; confirm the asset class.' },
  slmLifeYears: { status: 'benchmark', source: 'Register: 15-year common road book life.' },
  lossCarryYears: { status: 'reported', source: 'Register: 8-year business-loss carry-forward.' },
  revenueEscalationPct: { status: 'convention', source: 'Level annuity; no escalation unless the user changes it.' },
  constructionPhasing: { status: 'convention', source: 'Equal half-yearly weights unless the user provides a profile.' },
  economicMode: { status: 'convention', source: 'Financial lens only for the V1 contract case.' },
};

const solarEvidence = {
  constructionMonths: { status: 'benchmark', source: 'Register: 12-month solar construction; editable.' },
  assetLifeYears: { status: 'benchmark', source: 'Register: 25-year PPA / asset life.' },
  contingencyPct: { status: 'benchmark', source: 'Register: 5% typical contingency, editable.' },
  grantPct: { status: 'convention', source: 'No capital grant or VGF in the solar template; edit if the scheme provides one.' },
  cufPct: { status: 'benchmark', source: 'Register: 26.5% CUF illustration for Indian utility solar; edit for the site.' },
  degradationPct: { status: 'benchmark', source: 'Register: 0.5% per year module degradation.' },
  opexEscalationPct: { status: 'benchmark', source: 'Register: 3.5% O&M escalation.' },
  upfrontFeePct: { status: 'benchmark', source: 'Register: 1.0% market practice.' },
  dsraMonths: { status: 'benchmark', source: 'Register: 6 months market practice.' },
  liquiditySupport: { status: 'convention', source: 'No DSRA draw in the base case; enable the toggle to test first-period support.' },
  gearingPct: { status: 'benchmark', source: 'Register: 70-80% common renewable gearing.' },
  interestRatePct: { status: 'benchmark', source: 'Register: 9.25% proxy; edit for the actual sanction terms.' },
  waccPct: { status: 'convention', source: 'Engine convention: 10.5% nominal screening rate; replace with the lender WACC.' },
  costOfEquityPct: { status: 'convention', source: 'Engine convention: 14.0% nominal equity hurdle; replace with the sponsor hurdle.' },
  loanTenorYears: { status: 'benchmark', source: 'Register: 12-year operational tenor illustration.' },
  repaymentProfile: { status: 'convention', source: 'Annuity for the template; sculpted is available.' },
  lockupDscr: { status: 'benchmark', source: 'Register: 1.15x market illustration, not a regulatory minimum.' },
  defaultDscr: { status: 'benchmark', source: 'Register: 1.05x market illustration, not a regulatory minimum.' },
  dsoDays: { status: 'benchmark', source: 'Register: 90 days for DISCOM receivables; edit for the counterparty.' },
  dpoDays: { status: 'benchmark', source: 'Register: 30 days market practice.' },
  taxRegime: { status: 'reported', source: 'Register: 115BAA baseline for a new SPV.' },
  wdvBlockPct: { status: 'reported', source: 'Register: 15% plant and machinery block; confirm the asset class.' },
  slmLifeYears: { status: 'benchmark', source: 'Register: 25-year book life.' },
  lossCarryYears: { status: 'reported', source: 'Register: 8-year business-loss carry-forward.' },
  revenueEscalationPct: { status: 'convention', source: 'Generic revenue escalation; solar uses tariffEscalationPct.' },
  tariffEscalationPct: { status: 'convention', source: 'Most Indian solar PPAs are fixed; zero unless the PPA says otherwise.' },
  constructionPhasing: { status: 'convention', source: 'Equal half-yearly weights unless the user provides a profile.' },
  economicMode: { status: 'convention', source: 'Financial lens only by default.' },
};

export const SECTOR_TEMPLATES = {
  'ham-road': {
    id: 'ham-road',
    label: 'HAM road',
    values: {
      sector: 'ham-road',
      stage: 'financial-close',
      baseYear: 2026,
      constructionMonths: 24,
      assetLifeYears: 20,
      hardCostCr: null,
      softCostCr: null,
      contingencyPct: 5,
      hamSupportPct: 40,
      grantPct: null,
      grantCr: null,
      revenueModel: 'level-annuity',
      annualRevenueCr: null,
      revenueEscalationPct: 0,
      annuityYears: 15,
      annuityRatePct: 9.25,
      opexFixedCrPerYear: null,
      opexEscalationPct: 5,
      upfrontFeePct: 1.0,
      dsraMonths: 6,
      liquiditySupport: 'none',
      gearingPct: 75,
      interestRatePct: 9.25,
      waccPct: 10.5,
      costOfEquityPct: 14.0,
      loanTenorYears: 15,
      moratoriumYears: 0,
      repaymentProfile: 'annuity',
      lockupDscr: 1.15,
      defaultDscr: 1.05,
      dsoDays: 45,
      dpoDays: 30,
      taxRegime: '115BAA',
      wdvBlockPct: 10,
      slmLifeYears: 15,
      lossCarryYears: 8,
      economicMode: 'none',
    },
    evidence: hamEvidence,
  },
  solar: {
    id: 'solar',
    label: 'Solar IPP',
    values: {
      sector: 'solar',
      stage: 'financial-close',
      baseYear: 2026,
      constructionMonths: 12,
      assetLifeYears: 25,
      hardCostCr: null,
      softCostCr: null,
      contingencyPct: 5,
      hamSupportPct: null,
      grantPct: 0,
      grantCr: null,
      revenueModel: 'tariff',
      annualRevenueCr: null,
      revenueEscalationPct: 0,
      tariffEscalationPct: 0,
      capacity: null,
      capacityUnit: 'MW',
      tariff: null,
      tariffUnit: '₹/kWh',
      cufPct: 26.5,
      degradationPct: 0.5,
      opexFixedCrPerYear: null,
      opexEscalationPct: 3.5,
      upfrontFeePct: 1.0,
      dsraMonths: 6,
      liquiditySupport: 'none',
      gearingPct: 75,
      interestRatePct: 9.25,
      waccPct: 10.5,
      costOfEquityPct: 14.0,
      loanTenorYears: 12,
      moratoriumYears: 0,
      repaymentProfile: 'annuity',
      lockupDscr: 1.15,
      defaultDscr: 1.05,
      dsoDays: 90,
      dpoDays: 30,
      taxRegime: '115BAA',
      wdvBlockPct: 15,
      slmLifeYears: 25,
      lossCarryYears: 8,
      economicMode: 'none',
    },
    evidence: solarEvidence,
  },
};

export function resolveTemplate(sector = 'ham-road') {
  const template = SECTOR_TEMPLATES[sector];
  if (!template) throw new Error(`Unknown sector template: ${sector}`);
  return {
    id: template.id,
    label: template.label,
    values: deepClone(template.values),
    evidence: deepClone(template.evidence),
    publicFields: [...publicFieldKeys(template.id)],
  };
}

export function evidenceFor(input, key) {
  const own = input?.evidence?.[key];
  if (own) return own;
  const sector = input?.sector || 'ham-road';
  const preset = SECTOR_TEMPLATES[sector]?.evidence?.[key];
  if (preset) return preset;
  return { status: 'user', source: 'User input' };
}

export function buildProvenance(input) {
  const out = {};
  for (const key of Object.keys(input || {})) {
    if (key === 'evidence') continue;
    out[key] = evidenceFor(input, key);
  }
  for (const [key, ev] of Object.entries(input?.evidence || {})) out[key] = ev;
  return out;
}
