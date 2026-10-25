// Operating-period waterfall: revenue, O&M, working capital, cash tax, CFADS,
// debt service, DSCR and the optional DSRA draw/replenish/release facility.
// Contractual DSCR stays a cash-flow measure; liquidity coverage is separate.

import { annualOpexFor } from './opex.js';
import { annualRevenueFor } from './revenue.js';
import { presentValueAt, yearOf } from './finance.js';

function firstBelow(periods, threshold) {
  const hit = periods.find((p) => p.dscr != null && p.dscr < threshold);
  return hit ? hit.operationalPeriod : null;
}

export function buildOperationPeriods({
  input,
  constructionPeriods,
  operatingPeriods,
  loanPeriods,
  debtServiceCr,
  debtSchedule,
  annualTax,
  initialDsraCr,
  periodRate,
}) {
  const operationPeriods = [];
  const dsraSupportEnabled = input.liquiditySupport === 'dsra-draw';
  let previousWorkingCapitalCr = 0;
  let dsraBalanceCr = initialDsraCr;
  let dsraDrawnTotalCr = 0;
  let dsraReplenishedTotalCr = 0;
  let dsraReleasedCr = 0;
  let uncoveredShortfallTotalCr = 0;
  let firstShortfallPeriod = null;
  let firstSupportedPeriod = null;
  let minLiquidityCoverage = null;

  for (let period = 1; period <= operatingPeriods; period += 1) {
    const year = yearOf(period);
    const taxYear = annualTax[year - 1];
    const periodsThisYear = taxYear.periods;
    const revenueCr = annualRevenueFor(input, year) / 2;
    const opexCr = annualOpexFor(input, year) / 2;
    const ebitdaCr = revenueCr - opexCr;

    const workingCapitalCr = revenueCr * Number(input.dsoDays) / 365
      - opexCr * Number(input.dpoDays) / 365;

    const isFinalOperatingPeriod = period === operatingPeriods;
    const workingCapitalReleaseCr = isFinalOperatingPeriod ? previousWorkingCapitalCr : 0;
    const deltaWorkingCapitalCr = isFinalOperatingPeriod
      ? -previousWorkingCapitalCr
      : workingCapitalCr - previousWorkingCapitalCr;

    const cashTaxCr = taxYear.cashTaxCr / periodsThisYear;
    const cfadsCr = ebitdaCr - deltaWorkingCapitalCr - cashTaxCr;
    const debtServicePeriodCr = period <= loanPeriods ? debtServiceCr : 0;
    const dscr = debtServicePeriodCr > 0 ? cfadsCr / debtServicePeriodCr : null;
    const schedule = debtSchedule[period - 1] || {
      openingDebtCr: 0,
      interestCr: 0,
      principalCr: 0,
      closingDebtCr: 0,
    };
    const isFinalDebtPeriod = period === loanPeriods;
    const shortfallCr = debtServicePeriodCr > 0
      ? Math.max(0, debtServicePeriodCr - cfadsCr)
      : 0;
    if (shortfallCr > 1e-9 && firstShortfallPeriod == null) firstShortfallPeriod = period;

    const dsraOpeningCr = dsraBalanceCr;
    let dsraDrawCr = 0;
    let dsraReplenishCr = 0;
    let dsraReleaseCr = 0;
    let liquidityDscr = null;
    let uncoveredShortfallCr = 0;

    if (dsraSupportEnabled) {
      dsraDrawCr = Math.min(shortfallCr, Math.max(0, dsraBalanceCr));
      liquidityDscr = debtServicePeriodCr > 0
        ? (cfadsCr + dsraDrawCr) / debtServicePeriodCr
        : null;
      if (liquidityDscr != null) {
        minLiquidityCoverage = minLiquidityCoverage == null
          ? liquidityDscr
          : Math.min(minLiquidityCoverage, liquidityDscr);
        if (firstSupportedPeriod == null && shortfallCr > 1e-9 && liquidityDscr >= 1 - 1e-9) {
          firstSupportedPeriod = period;
        }
      }
      uncoveredShortfallCr = Math.max(0, shortfallCr - dsraDrawCr);
      uncoveredShortfallTotalCr += uncoveredShortfallCr;
      const balanceAfterDrawCr = dsraBalanceCr - dsraDrawCr;
      if (isFinalDebtPeriod) {
        dsraReleaseCr = balanceAfterDrawCr;
        dsraBalanceCr = 0;
      } else if (debtServicePeriodCr > 0) {
        const surplusCr = Math.max(0, cfadsCr - debtServicePeriodCr);
        dsraReplenishCr = Math.min(surplusCr, Math.max(0, initialDsraCr - balanceAfterDrawCr));
        dsraBalanceCr = balanceAfterDrawCr + dsraReplenishCr;
      } else {
        dsraBalanceCr = balanceAfterDrawCr;
      }
      dsraDrawnTotalCr += dsraDrawCr;
      dsraReplenishedTotalCr += dsraReplenishCr;
    } else {
      // With support off, the reserve is still funded and released, but it is
      // not available to cover a shortfall in this run. Count the full gap so
      // the summary does not read as "no shortfall" when DSCR is below 1.
      uncoveredShortfallCr = shortfallCr;
      uncoveredShortfallTotalCr += shortfallCr;
      dsraReleaseCr = isFinalDebtPeriod ? initialDsraCr : 0;
      dsraBalanceCr = isFinalDebtPeriod ? 0 : initialDsraCr;
    }

    // One owner for the release total, regardless of whether support is on.
    // The equity cash flow below reads the same period field, so metadata and
    // booked cash cannot disagree.
    dsraReleasedCr += dsraReleaseCr;

    operationPeriods.push({
      index: constructionPeriods + period,
      phase: 'operation',
      period,
      operationalPeriod: period,
      year,
      revenueCr,
      opexCr,

      ebitdaCr,
      interestCr: schedule.interestCr,
      principalCr: schedule.principalCr,
      debtServiceCr: debtServicePeriodCr,
      openingDebtCr: schedule.openingDebtCr,
      closingDebtCr: schedule.closingDebtCr,
      workingCapitalCr,
      deltaWorkingCapitalCr,
      workingCapitalReleaseCr,
      cashTaxCr,
      cfadsCr,
      dscr,
      dsraOpeningCr,
      dsraDrawCr,
      dsraReplenishCr,
      dsraReleaseCr,
      dsraClosingCr: dsraBalanceCr,
      uncoveredShortfallCr,
      liquidityDscr,
      llcr: null,
      llcrInclDsra: null,
    });
    previousWorkingCapitalCr = workingCapitalCr;
  }

  // LLCR at the start of each operating period: PV of remaining CFADS over
  // opening debt. The DSRA version adds the reserve balance to the numerator.
  const cfads = operationPeriods.map((p) => p.cfadsCr);
  for (let i = 0; i < operationPeriods.length; i += 1) {
    const pv = presentValueAt(periodRate, cfads, i);
    const opening = operationPeriods[i].openingDebtCr;
    operationPeriods[i].llcr = opening > 1e-9 ? pv / opening : null;
    operationPeriods[i].llcrInclDsra = opening > 1e-9
      ? (pv + operationPeriods[i].dsraOpeningCr) / opening
      : null;
  }

  const dscrs = operationPeriods.map((p) => p.dscr).filter((d) => d != null);
  const minDscr = dscrs.length > 0 ? Math.min(...dscrs) : null;
  const minPeriod = dscrs.length > 0
    ? operationPeriods.find((p) => p.dscr === minDscr)
    : null;
  const averageDscr = dscrs.length > 0
    ? dscrs.reduce((sum, d) => sum + d, 0) / dscrs.length
    : null;

  return {
    periods: operationPeriods,
    summary: {
      minDscr,
      minDscrPeriod: minPeriod ? minPeriod.operationalPeriod : null,
      minDscrYear: minPeriod ? minPeriod.year : null,
      averageDscr,
      firstCoverBreachPeriod: firstBelow(operationPeriods, 1.0),
      firstDefaultBreachPeriod: firstBelow(operationPeriods, Number(input.defaultDscr)),
      firstLockupBreachPeriod: firstBelow(operationPeriods, Number(input.lockupDscr)),
    },
    dsraSupportEnabled,
    dsraDrawnTotalCr,
    dsraReplenishedTotalCr,
    dsraReleasedCr,
    uncoveredShortfallTotalCr,
    firstShortfallPeriod,
    firstSupportedPeriod,
    minLiquidityCoverage,
  };
}
