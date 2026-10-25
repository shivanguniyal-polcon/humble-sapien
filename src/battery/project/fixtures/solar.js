// Solar IPP golden case.
//
// This fixture is the second engine contract. The expected values were derived
// outside the engine from the formulas in private/dcf-parameter-register.md,
// not by running the implementation. See private/solar-fixture-derivation.md.
//
// The case is deliberately a stress case, not a bankable showcase. A 90-day
// receivable is built in the first half-year before any collection, so the
// first-period DSCR is the binding liquidity point. The year-12 tax step is the
// second binding point and is where the switching table binds once the first
// period is cured. Do not tune these inputs to make the headline look better.
//
// Conventions used by this case:
//   - half-yearly periods; 12-month construction; full draw at start
//   - tariff x CUF revenue with 0.5% annual degradation
//   - 12-year annuity debt against a 25-year PPA/asset life
//   - DSRA funded at COD and released at debt maturity
//   - optional DSRA draw comparison in SOLAR_LIQUIDITY; the base case is off
//   - working capital released at the end of the PPA, not at debt maturity
//   - 115BAA tax, 15% WDV, 25-year book life, 8-year loss carry-forward

export const SOLAR_CASE = {
  projectName: 'Solar IPP golden case',
  sector: 'solar',
  state: 'Rajasthan',
  stage: 'financial-close',
  baseYear: 2026,

  constructionMonths: 12,
  constructionPhasing: [1, 0],
  assetLifeYears: 25,

  hardCostCr: 1050,
  softCostCr: 0,
  contingencyPct: 0,
  grantPct: 0,

  capacity: 250,
  capacityUnit: 'MW',
  revenueModel: 'tariff',
  tariff: 2.6,
  tariffUnit: '₹/kWh',
  tariffEscalationPct: 0,
  cufPct: 26.5,
  degradationPct: 0.5,

  opexFixedCrPerYear: 11.25,
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

  evidence: {
    projectName: { status: 'user', source: 'Fixture identity' },
    sector: { status: 'user', source: 'Fixture identity' },
    state: { status: 'user', source: 'Fixture identity' },
    baseYear: { status: 'user', source: 'Fixture identity' },
    constructionMonths: { status: 'benchmark', source: 'Register: 12-month solar construction; editable' },
    constructionPhasing: { status: 'convention', source: 'Full construction draw at the start of the year' },
    assetLifeYears: { status: 'benchmark', source: 'Register: 25-year PPA / asset life' },
    hardCostCr: { status: 'user', source: 'Fixture input' },
    softCostCr: { status: 'convention', source: 'Zero soft cost for the contract case' },
    contingencyPct: { status: 'convention', source: 'Zero contingency for the contract case' },
    grantPct: { status: 'convention', source: 'No capital grant or VGF in this case' },
    capacity: { status: 'user', source: 'Fixture input: 250 MW' },
    capacityUnit: { status: 'convention', source: 'MW' },
    revenueModel: { status: 'convention', source: 'Tariff x CUF for a solar PPA' },
    tariff: { status: 'user', source: 'Fixture input: ₹2.60/kWh fixed PPA tariff' },
    tariffUnit: { status: 'convention', source: '₹/kWh' },
    tariffEscalationPct: { status: 'convention', source: 'Fixed PPA tariff; no escalation' },
    cufPct: { status: 'benchmark', source: 'Register: 26.5% CUF illustration; edit for the site' },
    degradationPct: { status: 'benchmark', source: 'Register: 0.5% per year module degradation' },
    opexFixedCrPerYear: { status: 'benchmark', source: 'Register: ₹4.5 lakh/MW/year x 250 MW = ₹11.25 crore/year' },
    opexEscalationPct: { status: 'benchmark', source: 'Register: 3.5% O&M escalation' },
    upfrontFeePct: { status: 'benchmark', source: 'Register: 1.0% market practice' },
    dsraMonths: { status: 'benchmark', source: 'Register: 6 months market practice' },
    liquiditySupport: { status: 'convention', source: 'No DSRA draw in the base case; the toggle is for liquidity comparison' },
    gearingPct: { status: 'benchmark', source: 'Register: 70-80% common renewable gearing' },
    interestRatePct: { status: 'benchmark', source: 'Register: 9.25% proxy; edit for the sanction terms' },
    waccPct: { status: 'convention', source: 'Engine convention: 10.5% nominal screening rate; replace with the lender WACC' },
    costOfEquityPct: { status: 'convention', source: 'Engine convention: 14.0% nominal equity hurdle; replace with the sponsor hurdle' },
    loanTenorYears: { status: 'benchmark', source: 'Register: 12-year operational tenor illustration' },
    moratoriumYears: { status: 'convention', source: 'No separate moratorium in the contract case' },
    repaymentProfile: { status: 'convention', source: 'Annuity repayment for the contract case' },
    lockupDscr: { status: 'benchmark', source: 'Register: 1.15x market illustration' },
    defaultDscr: { status: 'benchmark', source: 'Register: 1.05x market illustration' },
    dsoDays: { status: 'benchmark', source: 'Register: 90 days for DISCOM receivables; edit for the counterparty' },
    dpoDays: { status: 'benchmark', source: 'Register: 30 days market practice' },
    taxRegime: { status: 'reported', source: 'Register: 115BAA baseline for a new SPV' },
    wdvBlockPct: { status: 'reported', source: 'Register: 15% plant and machinery block; confirm the asset class' },
    slmLifeYears: { status: 'benchmark', source: 'Register: 25-year book life' },
    lossCarryYears: { status: 'reported', source: 'Register: 8-year business-loss carry-forward' },
    economicMode: { status: 'convention', source: 'Financial lens only for the engine contract' },
  },
};

export const SOLAR_EXPECTED = {
  periodCount: 52,
  constructionPeriods: 2,
  operationalPeriods: 50,
  operatingYears: 25,
  loanPeriods: 24,

  grossCostCr: 1050,
  grantCr: 0,
  constructionFundingCr: 1050,
  kIdc: 0.0925,
  initialDsraCr: 62.910402,
  constructionCostCr: 1137.951879,
  constructionDebtCr: 853.463909,
  dsraDebtCr: 47.182802,
  idcCr: 78.945412,
  upfrontFeeCr: 9.006467,
  fundingRequirementCr: 1200.862281,
  debtCr: 900.646711,
  equityCr: 300.215570,
  debtServiceCr: 62.910402,
  annualDebtServiceCr: 125.820804,

  revenueYear1Cr: 150.891000,
  cfadsPeriod1Cr: 51.679829,
  cfadsPeriod2Cr: 69.820500,
  dscrPeriod1: 0.821483,
  dscrPeriod24: 0.903122,
  minDscr: 0.821483,
  minDscrPeriod: 1,
  minDscrYear: 1,
  averageDscr: 1.038366,
  llcrAtCod: 1.365225,

  projectNpvCr: -25.880212,
  projectIrrPct: 10.142269,
  equityNpvCr: -144.378676,
  equityIrrPct: 8.866402,

  bookDepreciationYear1Cr: 45.518075,
  taxDepreciationYear1Cr: 170.692782,
  taxableIncomeYear1Cr: -113.378536,
  totalTaxCr: 359.166284,
  cashTaxYear12Cr: 12.740180,
  cashTaxYear13Cr: 25.370160,
  lossPoolEndCr: 0,
  lossExpiredUnusedCr: 38.464554,
};

// DSRA draw comparison. The base case leaves the reserve untouched and reports
// the contractual ratio. With `liquiditySupport: 'dsra-draw'`, the reserve
// covers the first-period and year-12 shortfalls, then is replenished from
// surplus. Contractual DSCR and project NPV do not move; only liquidity
// coverage and equity timing do.
export const SOLAR_LIQUIDITY = {
  firstShortfallPeriod: 1,
  firstSupportedPeriod: 1,
  firstPeriodGapCr: 11.230573,
  coveredByDsraCr: 11.230573,
  firstPeriodCoverageOff: 0.821483,
  firstPeriodCoverageOn: 1,
  unsupportedUncoveredShortfallCr: 23.308535,
  totalDsraDrawnCr: 23.308535,
  totalDsraReplenishedCr: 11.230573,
  dsraReleasedCr: 50.832441,
  uncoveredShortfallCr: 0,
  minLiquidityCoverage: 1,
  contractualMinDscr: 0.821483,
  projectNpvCr: -25.880212,
  supportedEquityNpvCr: -143.491181,
  supportedEquityIrrPct: 8.881671,
  draws: [
    { period: 1, drawCr: 11.230573, replenishCr: 0, releaseCr: 0 },
    { period: 2, drawCr: 0, replenishCr: 6.910098, releaseCr: 0 },
    { period: 3, drawCr: 0, replenishCr: 4.320475, releaseCr: 0 },
    { period: 23, drawCr: 5.983334, replenishCr: 0, releaseCr: 0 },
    { period: 24, drawCr: 6.094627, replenishCr: 0, releaseCr: 50.832441 },
  ],
};

// Independent switching table. The base case is below 1.00x, so all DSCR rows
// are "required improvement". Opex cannot cure the first-period working-capital
// gap even at a 90% cut, so those three rows are unreachable; the NPV row is
// reachable. Tariff and capex bind at period 24 (year 12), the tax step.
export const SOLAR_SWITCHING = {
  tariff: {
    minDscr1: { alphaPct: 20.584853, value: 3.135206, bindingPeriod: 24, crossings: 1 },
    minDscr105: { alphaPct: 26.472176, value: 3.288277, bindingPeriod: 24, crossings: 1 },
    minDscr115: { alphaPct: 38.246823, value: 3.594417, bindingPeriod: 24, crossings: 1 },
    projectNpv: { alphaPct: 2.522003, value: 2.665572, bindingPeriod: null, crossings: 1 },
  },
  capex: {
    minDscr1: { alphaPct: -18.870869, value: 851.855878, bindingPeriod: 24, crossings: 1 },
    minDscr105: { alphaPct: -23.025286, value: 808.234499, bindingPeriod: 24, crossings: 1 },
    minDscr115: { alphaPct: -30.176277, value: 733.149089, bindingPeriod: 24, crossings: 1 },
    projectNpv: { alphaPct: -2.725336, value: 1021.383974, bindingPeriod: null, crossings: 1 },
  },
  opexFixedCrPerYear: {
    minDscr1: { reachable: false, crossings: 0, bindingPeriod: null },
    minDscr105: { reachable: false, crossings: 0, bindingPeriod: null },
    minDscr115: { reachable: false, crossings: 0, bindingPeriod: null },
    projectNpv: { alphaPct: -25.263351, value: 8.407873, bindingPeriod: null, crossings: 1 },
  },
};
