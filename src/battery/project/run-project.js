// Project-finance DCF orchestrator, V1.
//
// Scope of this slice: HAM road and solar IPP, one debt tranche, half-yearly
// periods, construction drawdown, IDC, DSRA, annuity repayment, CFADS, DSCR,
// LLCR, project/equity NPV and IRR, and 115BAA tax with a business-loss pool
// and two depreciation tracks. Operating life is separate from loan tenor, so
// a 25-year solar PPA can outlive a 12-year loan. An optional DSRA draw keeps
// the contractual DSCR and the supported liquidity coverage as separate
// metrics; a reserve draw is not a second CFADS line.
//
// This file only validates, orders and assembles. Construction and IDC live in
// construction.js, the debt schedule in debt.js, tax in tax.js, the operating
// waterfall, DSRA and covenant summary in operations.js, and valuation in
// valuation.js.
//
// The contracts are src/battery/project/fixtures/ham-road.js and solar.js.
// Their expected values were derived outside this file from
// private/dcf-parameter-register.md. Do not tune this engine to a fixture; fix
// the engine or the convention when they disagree.
//
// Money is in crore rupees. Rates are percentages in the input, decimals here.
// No rounding is applied to intermediate values.

import {
  normalizeProject,
  validateProject,
  buildProvenance,
  TAX_RATES,
} from './schema.js';
import { ProjectInputError } from './errors.js';
import { annualiseIrr } from './finance.js';
import { buildConstruction, resolveConstructionFunding } from './construction.js';
import { buildDebtSchedule } from './debt.js';
import { buildAnnualTax } from './tax.js';
import { buildOperationPeriods } from './operations.js';
import { buildValuation } from './valuation.js';

export { ProjectInputError };
export { normalizeProject };

export const ENGINE_VERSION = 'project-dcf-0.2.0';
export const CONVENTION_VERSION = 'dcf-register-0.2.0';

export function runProject(raw = {}, options = {}) {
  const computeIrr = options.irr !== false;
  const validation = validateProject(raw);
  if (validation.errors.length > 0) {
    throw new ProjectInputError(
      `Invalid project input: ${validation.errors.map((e) => e.message).join(' ')}`,
      validation.errors,
    );
  }

  const input = validation.input;
  if (input.sector !== 'ham-road' && input.sector !== 'solar') {
    throw new ProjectInputError(
      `V1 engine supports the HAM road and solar templates only; "${input.sector}" is schema-only for now.`,
      [{ field: 'sector', message: 'V1 engine supports ham-road and solar only.' }],
    );
  }
  if (input.repaymentProfile !== 'annuity' && input.repaymentProfile !== 'sculpted') {
    throw new ProjectInputError(
      `V1 engine supports annuity or sculpted repayment; "${input.repaymentProfile}" is not implemented.`,
      [{ field: 'repaymentProfile', message: 'Unsupported repayment profile.' }],
    );
  }

  const warnings = [...validation.warnings];
  const phasing = input.constructionPhasing.map(Number);
  const constructionPeriods = Math.max(1, Math.ceil(Number(input.constructionMonths) / 6));
  const funding = resolveConstructionFunding(input);

  const loanPeriods = Math.round(Number(input.loanTenorYears) * 2);
  if (!(loanPeriods > 0)) throw new ProjectInputError('Loan tenor must produce at least one half-year period.');
  const operatingYears = input.sector === 'ham-road'
    ? Number(input.annuityYears || input.assetLifeYears)
    : Number(input.assetLifeYears);
  const operatingPeriods = Math.round(operatingYears * 2);
  if (!(operatingPeriods > 0)) {
    throw new ProjectInputError('Operating life must produce at least one half-year period.');
  }
  if (operatingPeriods < loanPeriods) {
    warnings.push('Loan tenor extends beyond the operating/revenue period; the debt schedule outlives the cash-flow case.');
  }

  if (Number(input.moratoriumYears) > 0) {
    warnings.push('The V1 engine starts repayment at COD; the moratorium input is recorded but not applied. Do not rely on this case for moratorium structuring.');
  }
  if (input.repaymentProfile === 'sculpted') {
    warnings.push('The V1 engine uses the annuity payment schedule; sculpted repayment is recorded but not applied yet.');
  }
  if (input.revenueModel === 'ham-annuity') {
    warnings.push('The V1 engine uses a level annuity; the declining-balance HAM annuity profile is not applied yet.');
  }
  if (input.economicMode !== 'none') {
    warnings.push('The economic lens is not part of this engine step; only the financial DCF is calculated.');
  }

  const {
    annualRate,
    periodRate,
    grossWithContingency,
    grantCr,
    constructionFundingCr,
    kIdc,
    initialDsraCr,
    constructionCostCr,
    constructionDebtCr,
    dsraDebtCr,
    constructionEquityCr,
    dsraEquityCr,
    idcCr,
    upfrontFeeCr,
    fundingRequirementCr,
    debtCr,
    debtServiceCr,
    construction,
    idcIterations,
  } = buildConstruction(input, {
    phasing,
    constructionPeriods,
    loanPeriods,
    funding,
  });

  const debtSchedule = buildDebtSchedule({
    debtCr,
    periodRate,
    loanPeriods,
    debtServiceCr,
  });

  const {
    annualTax,
    taxRate,
    lossUsedTotalCr,
    lossExpiredUnusedTotalCr,
    totalTaxCr,
    lossPoolEndCr,
  } = buildAnnualTax({
    input,
    operatingYears,
    operatingPeriods,
    grossWithContingency,
    idcCr,
    upfrontFeeCr,
    debtSchedule,
    taxRate: TAX_RATES[input.taxRegime],
  });

  const {
    periods: operationPeriods,
    summary,
    dsraSupportEnabled,
    dsraDrawnTotalCr,
    dsraReplenishedTotalCr,
    dsraReleasedCr,
    uncoveredShortfallTotalCr,
    firstShortfallPeriod,
    firstSupportedPeriod,
    minLiquidityCoverage,
  } = buildOperationPeriods({
    input,
    constructionPeriods,
    operatingPeriods,
    loanPeriods,
    debtServiceCr,
    debtSchedule,
    annualTax,
    initialDsraCr,
    periodRate,
  });

  const valuation = buildValuation({
    input,
    construction,
    operationPeriods,
    phasing,
    constructionPeriods,
    grossWithContingency,
    dsraEquityCr,
    computeIrr,
  });
  const {
    projectCashFlows,
    equityCashFlows,
    projectNpvCr,
    projectIrrPct,
    projectRoots,
    projectNpvAtIrrCr,
    equityNpvCr,
    equityIrrPct,
    equityRoots,
    equityNpvAtIrrCr,
  } = valuation;
  warnings.push(...valuation.warnings);

  const allPeriods = [...construction, ...operationPeriods];
  const {
    minDscr,
    minDscrPeriod,
    minDscrYear,
    averageDscr,
    firstCoverBreachPeriod,
    firstDefaultBreachPeriod,
    firstLockupBreachPeriod,
  } = summary;

  if (minDscr != null && minDscr < 0) {
    warnings.push('Cash flow after debt service is negative in at least one period; the DSCR is reported, not clamped.');
  } else if (minDscr != null && minDscr < 1) {
    warnings.push('CFADS does not cover debt service in at least one period; the case fails the 1.00x cover test.');
  }
  if (firstDefaultBreachPeriod != null) {
    warnings.push(`DSCR falls below the default covenant of ${input.defaultDscr.toFixed(2)}x in operating period ${firstDefaultBreachPeriod}.`);
  }
  if (firstLockupBreachPeriod != null) {
    warnings.push(`DSCR falls below the lock-up of ${input.lockupDscr.toFixed(2)}x in operating period ${firstLockupBreachPeriod}; distributions would be trapped under this convention.`);
  }
  if (dsraSupportEnabled && dsraDrawnTotalCr > 1e-9) {
    warnings.push(`DSRA draw support is on: ₹${dsraDrawnTotalCr.toFixed(2)} crore is drawn across the case and ₹${dsraReplenishedTotalCr.toFixed(2)} crore is replenished from later surplus. Contractual DSCR is unchanged; liquidity coverage is reported separately.`);
  }
  if (dsraSupportEnabled && uncoveredShortfallTotalCr > 1e-9) {
    warnings.push(`₹${uncoveredShortfallTotalCr.toFixed(2)} crore of debt service remains uncovered after exhausting the DSRA; the reserve does not cure the case.`);
  }

  const totalBookDepreciationYear1Cr = annualTax[0]?.bookDepreciationCr ?? 0;
  const totalTaxDepreciationYear1Cr = annualTax[0]?.taxDepreciationCr ?? 0;

  return {
    meta: {
      engine: ENGINE_VERSION,
      convention: CONVENTION_VERSION,
      sector: input.sector,
      projectName: input.projectName,
      state: input.state,
      baseYear: Number(input.baseYear),
      currency: 'INR crore',
      periodsPerYear: 2,
      constructionPeriods,
      operationalPeriods: operatingPeriods,
      operatingYears,
      loanPeriods,
      annualRate,
      periodRate,
    },
    funding: {
      grossCostCr: grossWithContingency,
      grantCr,
      constructionFundingCr,
      kIdc,
      initialDsraCr,
      constructionCostCr,
      constructionDebtCr,
      dsraDebtCr,
      constructionEquityCr,
      dsraEquityCr,
      idcCr,
      upfrontFeeCr,
      fundingRequirementCr,
      debtCr,
      equityCr: fundingRequirementCr - debtCr,
      debtServiceCr,
      annualDebtServiceCr: debtServiceCr * 2,
      idcIterations,
    },
    construction: {
      periods: constructionPeriods,
      debtDrawnCr: constructionDebtCr,
      grantDrawnCr: grantCr,
      equityDrawnCr: constructionEquityCr,
      interestCr: idcCr,
    },
    operations: {
      operationalPeriods: operatingPeriods,
      operatingYears,
      debtPeriods: loanPeriods,
      debtServiceCr,
      annualDebtServiceCr: debtServiceCr * 2,
      minDscr,
      minDscrPeriod,
      minDscrYear,
      averageDscr,
      llcrAtCod: operationPeriods[0]?.llcr ?? null,
      llcrInclDsraAtCod: operationPeriods[0]?.llcrInclDsra ?? null,
      firstCoverBreachPeriod,
      firstDefaultBreachPeriod,
      firstLockupBreachPeriod,
      totalCashTaxCr: totalTaxCr,
      liquidity: {
        support: input.liquiditySupport,
        firstShortfallPeriod,
        firstSupportedPeriod,
        totalDsraDrawnCr: dsraDrawnTotalCr,
        totalDsraReplenishedCr: dsraReplenishedTotalCr,
        dsraReleasedCr,
        uncoveredShortfallCr: uncoveredShortfallTotalCr,
        minLiquidityCoverage,
      },
    },
    npv: {
      projectDiscountRatePct: Number(input.waccPct),
      costOfEquityPct: Number(input.costOfEquityPct),
      projectNpvCr,
      projectIrrPct,
      projectIrrRootsPct: projectRoots.map(annualiseIrr),
      projectNpvAtIrrCr,
      equityNpvCr,
      equityIrrPct,
      equityIrrRootsPct: equityRoots.map(annualiseIrr),
      equityNpvAtIrrCr,
      cashFlows: {
        project: projectCashFlows,
        equity: equityCashFlows,
      },
    },
    tax: {
      regime: input.taxRegime,
      rate: taxRate,
      bookDepreciationYear1Cr: totalBookDepreciationYear1Cr,
      taxDepreciationYear1Cr: totalTaxDepreciationYear1Cr,
      taxableIncomeYear1Cr: annualTax[0]?.taxableIncomeCr ?? 0,
      totalTaxCr: totalTaxCr,
      lossUsedCr: lossUsedTotalCr,
      lossPoolEndCr,
      lossExpiredUnusedCr: lossExpiredUnusedTotalCr,
      lossPoolGrossUnusedCr: lossPoolEndCr + lossExpiredUnusedTotalCr,
      annual: annualTax,
    },
    periods: allPeriods,
    provenance: buildProvenance(input),
    warnings,
  };
}
