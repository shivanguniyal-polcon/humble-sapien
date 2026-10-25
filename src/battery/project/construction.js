// Construction funding and interest during construction (IDC).
//
// The DSRA is funded at COD, so it is not part of the construction IDC base.
// Debt, IDC and total cost form a fixed point; solve it deterministically.
// Money is in crore rupees and rates are decimals here.

import { annuityPayment, annualToHalfYear } from './finance.js';
import { ProjectInputError } from './errors.js';

export function resolveConstructionFunding(input) {
  const grossWithContingency = (Number(input.hardCostCr) + Number(input.softCostCr || 0))
    * (1 + Number(input.contingencyPct || 0) / 100);

  const grantCr = input.grantCr != null
    ? Number(input.grantCr)
    : grossWithContingency * (
      input.hamSupportPct != null
        ? Number(input.hamSupportPct)
        : Number(input.grantPct || 0)
    ) / 100;

  const constructionFundingCr = grossWithContingency - grantCr;
  if (constructionFundingCr <= 0) {
    throw new ProjectInputError('The grant covers the whole project; there is no private funding requirement.');
  }
  return { grossWithContingency, grantCr, constructionFundingCr };
}

export function buildConstruction(input, { phasing, constructionPeriods, loanPeriods, funding }) {
  const {
    grossWithContingency, grantCr, constructionFundingCr,
  } = funding || resolveConstructionFunding(input);

  const gearing = Number(input.gearingPct) / 100;
  const upfrontFeeRate = Number(input.upfrontFeePct) / 100;
  const annualRate = Number(input.interestRatePct) / 100;
  const periodRate = annualToHalfYear(input.interestRatePct);

  // k_idc = sum(rp * W_m), where W_m is cumulative construction spend.
  let cumulativeWeight = 0;
  let kIdc = 0;
  for (const weight of phasing) {
    cumulativeWeight += weight;
    kIdc += periodRate * cumulativeWeight;
  }

  const idcDenominator = 1 - gearing * (upfrontFeeRate + kIdc);
  if (idcDenominator <= 1e-9) {
    throw new ProjectInputError(
      'Funding structure is infeasible: gearing times upfront fee plus the IDC factor leaves no room for construction cost.',
      [{ field: 'gearingPct', message: 'IDC denominator is not positive.' }],
    );
  }

  let initialDsraCr = 0;
  let constructionCostCr = 0;
  let fundingRequirementCr = 0;
  let debtCr = 0;
  let debtServiceCr = 0;
  let converged = false;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    constructionCostCr = (constructionFundingCr + upfrontFeeRate * gearing * initialDsraCr) / idcDenominator;
    fundingRequirementCr = constructionCostCr + initialDsraCr;
    debtCr = gearing * fundingRequirementCr;
    debtServiceCr = annuityPayment(debtCr, periodRate, loanPeriods);
    const nextDsra = (Number(input.dsraMonths) / 6) * debtServiceCr;

    if (Math.abs(nextDsra - initialDsraCr) < 1e-11) {
      initialDsraCr = nextDsra;
      converged = true;
      break;
    }
    initialDsraCr = nextDsra;
  }
  if (!converged) {
    throw new ProjectInputError('IDC fixed-point iteration did not converge.');
  }

  constructionCostCr = (constructionFundingCr + upfrontFeeRate * gearing * initialDsraCr) / idcDenominator;
  fundingRequirementCr = constructionCostCr + initialDsraCr;
  debtCr = gearing * fundingRequirementCr;
  debtServiceCr = annuityPayment(debtCr, periodRate, loanPeriods);

  const constructionDebtCr = gearing * constructionCostCr;
  const dsraDebtCr = gearing * initialDsraCr;
  const constructionEquityCr = (1 - gearing) * constructionCostCr;
  const dsraEquityCr = (1 - gearing) * initialDsraCr;
  const upfrontFeeCr = upfrontFeeRate * debtCr;

  const construction = [];
  let cumulativeDebtCr = 0;
  let idcCr = 0;
  for (let period = 1; period <= constructionPeriods; period += 1) {
    const weight = phasing[period - 1];
    const debtDrawCr = constructionDebtCr * weight;
    const grantDrawCr = grantCr * weight;
    const equityDrawCr = constructionEquityCr * weight;
    cumulativeDebtCr += debtDrawCr;
    const interestCr = cumulativeDebtCr * periodRate;
    idcCr += interestCr;
    construction.push({
      index: period,
      phase: 'construction',
      period,
      year: Math.ceil(period / 2),
      debtDrawCr,
      grantDrawCr,
      equityDrawCr,
      cumulativeDebtCr,
      interestCr,
    });
  }

  return {
    grossWithContingency,
    grantCr,
    constructionFundingCr,
    upfrontFeeRate,
    annualRate,
    periodRate,
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
    idcIterations: converged ? 'converged' : 'not-converged',
  };
}
