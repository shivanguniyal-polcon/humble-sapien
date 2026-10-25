// Half-yearly debt schedule. The engine starts repayment at COD and supports
// the annuity profile; sculpted repayment is recorded but not applied.

import { yearOf } from './finance.js';

export function buildDebtSchedule({ debtCr, periodRate, loanPeriods, debtServiceCr }) {
  const schedule = [];
  let openingDebtCr = debtCr;
  for (let period = 1; period <= loanPeriods; period += 1) {
    const interestCr = openingDebtCr * periodRate;
    const principalCr = debtServiceCr - interestCr;
    const closingDebtCr = openingDebtCr - principalCr;
    schedule.push({
      period,
      year: yearOf(period),
      openingDebtCr,
      interestCr,
      principalCr,
      closingDebtCr,
    });
    openingDebtCr = closingDebtCr;
  }
  return schedule;
}
