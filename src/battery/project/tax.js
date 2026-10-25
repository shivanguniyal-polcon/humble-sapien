// Annual corporate tax. Two depreciation tracks are kept side by side: the
// tax WDV block and the book SLM life. The business-loss pool is vintage-based
// so expiry is visible rather than a single running balance.

import { annualOpexFor } from './opex.js';
import { annualRevenueFor } from './revenue.js';

export function buildAnnualTax({
  input,
  operatingYears,
  operatingPeriods,
  grossWithContingency,
  idcCr,
  upfrontFeeCr,
  debtSchedule,
  taxRate,
}) {
  const annualTax = [];
  const lossVintages = [];
  let wdvOpeningCr = grossWithContingency + idcCr + upfrontFeeCr;
  let lossUsedTotalCr = 0;
  let lossExpiredUnusedTotalCr = 0;
  let totalTaxCr = 0;

  for (let year = 1; year <= operatingYears; year += 1) {
    const periodsThisYear = Math.min(2, operatingPeriods - (year - 1) * 2);
    const revenueCr = annualRevenueFor(input, year);
    const opexCr = annualOpexFor(input, year);
    const ebitdaCr = revenueCr - opexCr;

    const interestCr = debtSchedule
      .slice((year - 1) * 2, (year - 1) * 2 + periodsThisYear)
      .reduce((sum, p) => sum + p.interestCr, 0);

    const taxDepreciationCr = wdvOpeningCr * (Number(input.wdvBlockPct) / 100);
    const bookDepreciationCr = year <= Number(input.slmLifeYears)
      ? (grossWithContingency + idcCr + upfrontFeeCr) / Number(input.slmLifeYears)
      : 0;

    const taxableIncomeCr = ebitdaCr - interestCr - taxDepreciationCr;

    // Drop expired vintages before applying the current year's taxable income.
    // Track the unused amount so the memo can distinguish "expired" from
    // "still available"; the usable pool at the end of the case is not the same
    // number as the gross unused losses.
    for (const vintage of lossVintages) {
      if (vintage.expiryYear < year && vintage.amountCr > 0) {
        lossExpiredUnusedTotalCr += vintage.amountCr;
        vintage.amountCr = 0;
      }
    }

    let lossUsedCr = 0;
    let cashTaxCr = 0;
    if (taxableIncomeCr < 0) {
      lossVintages.push({
        year,
        expiryYear: year + Number(input.lossCarryYears),
        amountCr: -taxableIncomeCr,
      });
    } else if (taxableIncomeCr > 0) {
      let remainingCr = taxableIncomeCr;
      for (const vintage of lossVintages) {
        if (remainingCr <= 0) break;
        if (vintage.amountCr <= 0) continue;
        const usedCr = Math.min(vintage.amountCr, remainingCr);
        vintage.amountCr -= usedCr;
        remainingCr -= usedCr;
        lossUsedCr += usedCr;
      }
      cashTaxCr = remainingCr * taxRate;
    }

    const bookPatCr = ebitdaCr - bookDepreciationCr - interestCr - cashTaxCr;
    lossUsedTotalCr += lossUsedCr;
    totalTaxCr += cashTaxCr;

    annualTax.push({
      year,
      periods: periodsThisYear,
      revenueCr,
      opexCr,
      ebitdaCr,
      interestCr,
      bookDepreciationCr,
      taxDepreciationCr,
      taxableIncomeCr,
      lossUsedCr,
      cashTaxCr,
      bookPatCr,
      wdvOpeningCr,
      wdvClosingCr: wdvOpeningCr - taxDepreciationCr,
      lossPoolEndCr: lossVintages.reduce((sum, v) => sum + v.amountCr, 0),
      lossExpiredUnusedCr: lossExpiredUnusedTotalCr,
      lossPoolGrossUnusedCr: lossVintages.reduce((sum, v) => sum + v.amountCr, 0) + lossExpiredUnusedTotalCr,
    });

    wdvOpeningCr -= taxDepreciationCr;
  }

  return {
    annualTax,
    taxRate,
    lossUsedTotalCr,
    lossExpiredUnusedTotalCr,
    totalTaxCr,
    lossPoolEndCr: lossVintages.reduce((sum, v) => sum + v.amountCr, 0),
  };
}
