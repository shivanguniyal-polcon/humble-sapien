// Valuation: project FCFF and equity cash flows, then NPV and IRR.
//
// Project FCFF is gross capex net of the construction grant, then CFADS. IDC,
// the upfront fee and the DSRA are financing flows, not project costs; they
// belong in the equity lens, not in the project NPV.

import {
  annualToHalfYear, annualiseIrr, irrRoots, presentValue,
} from './finance.js';

export function buildValuation({
  input,
  construction,
  operationPeriods,
  phasing,
  constructionPeriods,
  grossWithContingency,
  dsraEquityCr,
  computeIrr,
}) {
  const projectCashFlows = [];
  const equityCashFlows = [];
  const projectDiscountPeriodRate = annualToHalfYear(input.waccPct);
  const equityDiscountPeriodRate = annualToHalfYear(input.costOfEquityPct);
  for (const period of construction) {
    const weight = phasing[period.period - 1];
    const projectAmountCr = -(grossWithContingency * weight) + period.grantDrawCr;
    projectCashFlows.push({
      period: period.period,
      phase: 'construction',
      amountCr: projectAmountCr,
      discountFactor: 1 / Math.pow(1 + projectDiscountPeriodRate, period.period),
      presentValueCr: projectAmountCr / Math.pow(1 + projectDiscountPeriodRate, period.period),
    });
    let equityAmountCr = -period.equityDrawCr;
    if (period.period === constructionPeriods) equityAmountCr -= dsraEquityCr;
    equityCashFlows.push({
      period: period.period,
      phase: 'construction',
      amountCr: equityAmountCr,
      discountFactor: 1 / Math.pow(1 + equityDiscountPeriodRate, period.period),
      presentValueCr: equityAmountCr / Math.pow(1 + equityDiscountPeriodRate, period.period),
    });
  }
  for (const period of operationPeriods) {
    projectCashFlows.push({
      period: period.index,
      phase: 'operation',
      amountCr: period.cfadsCr,
      discountFactor: 1 / Math.pow(1 + projectDiscountPeriodRate, period.index),
      presentValueCr: period.cfadsCr / Math.pow(1 + projectDiscountPeriodRate, period.index),
    });
    const equityAmountCr = period.cfadsCr - period.debtServiceCr
      + period.dsraDrawCr - period.dsraReplenishCr + period.dsraReleaseCr;
    equityCashFlows.push({
      period: period.index,
      phase: 'operation',
      amountCr: equityAmountCr,
      discountFactor: 1 / Math.pow(1 + equityDiscountPeriodRate, period.index),
      presentValueCr: equityAmountCr / Math.pow(1 + equityDiscountPeriodRate, period.index),
    });
  }

  const projectCashFlowAmounts = projectCashFlows.map((p) => p.amountCr);
  const equityCashFlowAmounts = equityCashFlows.map((p) => p.amountCr);
  const projectRoots = computeIrr ? irrRoots(projectCashFlowAmounts) : [];
  const equityRoots = computeIrr ? irrRoots(equityCashFlowAmounts) : [];
  const projectNpvCr = projectCashFlows.reduce((sum, p) => sum + p.presentValueCr, 0);
  const equityNpvCr = equityCashFlows.reduce((sum, p) => sum + p.presentValueCr, 0);
  const projectIrrPct = computeIrr ? annualiseIrr(projectRoots[0]) : null;
  const equityIrrPct = computeIrr ? annualiseIrr(equityRoots[0]) : null;
  const projectNpvAtIrrCr = projectRoots.length > 0
    ? presentValue(projectRoots[0], projectCashFlowAmounts)
    : null;
  const equityNpvAtIrrCr = equityRoots.length > 0
    ? presentValue(equityRoots[0], equityCashFlowAmounts)
    : null;

  const warnings = [];
  if (computeIrr && projectRoots.length === 0) {
    warnings.push('Project IRR is undefined: the project cash flows have no sign change in the tested rate range.');
  }
  if (computeIrr && equityRoots.length === 0) {
    warnings.push('Equity IRR is undefined: the equity cash flows have no sign change in the tested rate range.');
  }
  if (computeIrr && projectRoots.length > 1) {
    warnings.push(`Project cash flows have ${projectRoots.length} IRR roots in the tested range; the first is reported and all roots are listed.`);
  }
  if (computeIrr && equityRoots.length > 1) {
    warnings.push(`Equity cash flows have ${equityRoots.length} IRR roots in the tested range; the first is reported and all roots are listed.`);
  }

  return {
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
    warnings,
  };
}
