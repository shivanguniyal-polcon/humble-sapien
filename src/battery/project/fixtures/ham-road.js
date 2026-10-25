// HAM road golden case.
//
// This fixture is the contract for the project-DCF engine. The expected values
// below were derived from the formulas in private/dcf-parameter-register.md
// outside the engine (an independent half-yearly table), not by running the
// implementation. If the engine changes, this file must not change to match it;
// a mismatch is a bug in the engine or in the convention.
//
// Conventions used by this case (all from the register):
//   - half-yearly periods; 30-month construction; 5 drawdown tranches
//   - interest during construction charged only on construction debt
//   - DSRA funded at COD, not during construction
//   - annuity repayment on total debt
//   - level HAM annuity for the engine contract (the declining-balance MCA
//     annuity is a separate revenue-profile test)
//   - 115BAA tax, WDV block depreciation, 8-year business-loss carry-forward
//   - book depreciation is a separate straight-line track
//
// Money is in crore rupees. Ratios are multiples.

export const HAM_ROAD_CASE = {
  projectName: 'HAM highway golden case',
  sector: 'ham-road',
  state: 'Maharashtra',
  stage: 'financial-close',
  baseYear: 2026,

  constructionMonths: 30,
  constructionPhasing: [0.2, 0.2, 0.2, 0.2, 0.2],
  assetLifeYears: 20,

  hardCostCr: 1000,
  softCostCr: 200,
  contingencyPct: 0,
  hamSupportPct: 40,

  revenueModel: 'level-annuity',
  annualRevenueCr: 120,
  revenueEscalationPct: 0,
  annuityYears: 15,
  annuityRatePct: 9.25,

  opexFixedCrPerYear: 12,
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

  evidence: {
    projectName: { status: 'user', source: 'Fixture identity' },
    sector: { status: 'user', source: 'Fixture identity' },
    state: { status: 'user', source: 'Fixture identity' },
    baseYear: { status: 'user', source: 'Fixture identity' },
    constructionMonths: { status: 'user', source: 'Five half-year construction periods' },
    constructionPhasing: { status: 'convention', source: 'Equal drawdown weights for the contract case' },
    assetLifeYears: { status: 'benchmark', source: 'Register: 20-year economic life' },
    hardCostCr: { status: 'user', source: 'Fixture input' },
    softCostCr: { status: 'user', source: 'Fixture input' },
    contingencyPct: { status: 'convention', source: 'Zero contingency for the contract case' },
    hamSupportPct: { status: 'reported', source: 'HAM MCA: 40% Authority support in five milestone instalments' },
    revenueModel: { status: 'convention', source: 'Level annuity for the engine contract' },
    annualRevenueCr: { status: 'user', source: 'Levelized HAM annuity for the contract case' },
    revenueEscalationPct: { status: 'convention', source: 'Level annuity; no escalation' },
    annuityYears: { status: 'reported', source: 'HAM MCA: 15-year annuity period' },
    annuityRatePct: { status: 'benchmark', source: 'Register: HAM annuity rate proxy, MCLR + 1.25%' },
    opexFixedCrPerYear: { status: 'user', source: 'Fixture input' },
    opexEscalationPct: { status: 'benchmark', source: 'Register: 5% O&M escalation example' },
    upfrontFeePct: { status: 'benchmark', source: 'Register: 1.0% market practice' },
    dsraMonths: { status: 'benchmark', source: 'Register: 6 months market practice' },
    liquiditySupport: { status: 'convention', source: 'No DSRA draw in the base case; the toggle is for liquidity comparison' },
    gearingPct: { status: 'benchmark', source: 'Register: 70-80% common infrastructure gearing' },
    interestRatePct: { status: 'benchmark', source: 'Register: HAM MCLR + 1.25%; 9.25% proxy' },
    waccPct: { status: 'convention', source: 'Engine convention: 10.5% nominal screening rate for the frozen case; replace with the lender WACC' },
    costOfEquityPct: { status: 'convention', source: 'Engine convention: 14.0% nominal equity hurdle for the frozen case; replace with the sponsor hurdle' },
    loanTenorYears: { status: 'reported', source: 'HAM MCA: 15-year annuity period' },
    moratoriumYears: { status: 'convention', source: 'No separate moratorium in the contract case' },
    repaymentProfile: { status: 'convention', source: 'Annuity repayment for the contract case' },
    lockupDscr: { status: 'benchmark', source: 'Register: 1.15x market illustration' },
    defaultDscr: { status: 'benchmark', source: 'Register: 1.05x market illustration' },
    dsoDays: { status: 'benchmark', source: 'Register: 45 days for NHAI-type annuities' },
    dpoDays: { status: 'benchmark', source: 'Register: 30 days market practice' },
    taxRegime: { status: 'reported', source: 'Register: 115BAA baseline for a new SPV' },
    wdvBlockPct: { status: 'reported', source: 'Register: 10% road/building block; confirm asset class' },
    slmLifeYears: { status: 'benchmark', source: 'Register: 15-year common road book life' },
    lossCarryYears: { status: 'reported', source: 'Register: 8-year business-loss carry-forward' },
    economicMode: { status: 'convention', source: 'Financial lens only for the V1 contract case' },
  },
};

// Derived outside the engine from the register formulas. See
// private/ham-fixture-derivation.md for the arithmetic trail.
export const HAM_ROAD_EXPECTED = {
  periodCount: 35,
  constructionPeriods: 5,
  operationalPeriods: 30,

  grossCostCr: 1200,
  grantCr: 480,
  constructionFundingCr: 720,
  kIdc: 0.13875,
  initialDsraCr: 39.737253,
  constructionDebtCr: 608.060243,
  dsraDebtCr: 29.802940,
  idcCr: 84.368359,
  upfrontFeeCr: 6.378632,
  fundingRequirementCr: 850.484244,
  debtCr: 637.863183,
  equityCr: 212.621061,
  debtServiceCr: 39.737253,
  annualDebtServiceCr: 79.474506,

  cfadsPeriod1Cr: 47.095890,
  cfadsPeriod30Cr: 46.799526,
  dscrPeriod1: 1.185182,
  dscrPeriod30: 1.177724,
  minDscr: 1.01731152,
  minDscrPeriod: 29,
  minDscrYear: 15,
  averageDscr: 1.27072713,
  llcrAtCod: 1.35071705,

  // Project FCFF excludes IDC, the upfront fee and DSRA funding. Equity cash
  // flow includes construction equity, DSRA equity at COD, debt service and
  // the DSRA release at the final period. IRR is nominal annual, x2 the
  // half-yearly root.
  projectNpvCr: -24.600650,
  projectIrrPct: 9.879603,
  equityNpvCr: -64.694224,
  equityIrrPct: 6.779059,

  bookDepreciationYear1Cr: 86.049799,
  taxDepreciationYear1Cr: 129.074699,
  taxableIncomeYear1Cr: -79.603625,
  totalTaxCr: 26.201061,
  // The usable pool at the end is zero: all remaining vintages expired under
  // the 8-year carry-forward. The gross unused amount (expired + usable) is
  // 142.295, which is the number a naive "accumulated losses" report shows.
  lossPoolEndCr: 0,
  lossExpiredUnusedCr: 142.295470,
};

// Independent switching-value table from the same half-yearly arithmetic.
// alphaPct is the multiplicative shock x(a) = x0 * (1 + a); the primary row is
// the crossing nearest the base case. The 1.00x rows have more than one
// crossing because the minimum DSCR is non-monotonic once tax losses and the
// working-capital release move the binding period; all crossings are retained
// and the nearest-to-base one is the headline.
export const HAM_ROAD_SWITCHING = {
  annualRevenueCr: {
    minDscr1: { alphaPct: -1.532126, value: 118.161449, bindingPeriod: 29, crossings: 3 },
    minDscr105: { alphaPct: 2.893037, value: 123.471645, bindingPeriod: 29, crossings: 1 },
    minDscr115: { alphaPct: 11.743363, value: 134.092035, bindingPeriod: 29, crossings: 1 },
    projectNpv: { alphaPct: 3.797358, value: 124.556830, bindingPeriod: null, crossings: 1 },
  },
  capex: {
    minDscr1: { alphaPct: 1.945010, value: 1223.340122, bindingPeriod: 29, crossings: 3 },
    minDscr105: { alphaPct: -3.477322, value: 1158.272137, bindingPeriod: 29, crossings: 1 },
    minDscr115: { alphaPct: -12.757923, value: 1046.904919, bindingPeriod: 29, crossings: 1 },
    projectNpv: { alphaPct: -4.181881, value: 1149.817432, bindingPeriod: null, crossings: 1 },
  },
  opexFixedCrPerYear: {
    minDscr1: { alphaPct: 7.778961, value: 12.933475, bindingPeriod: 29, crossings: 1 },
    minDscr105: { alphaPct: -14.688628, value: 10.237365, bindingPeriod: 29, crossings: 1 },
    minDscr115: { alphaPct: -59.623808, value: 4.845143, bindingPeriod: 29, crossings: 1 },
    projectNpv: { alphaPct: -29.227709, value: 8.492675, bindingPeriod: null, crossings: 1 },
  },
};
