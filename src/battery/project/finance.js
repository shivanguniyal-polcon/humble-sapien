// Financial primitives: half-yearly conversion, annuity payments, present
// values and IRR roots. No project or sector knowledge lives here.

export const annualToHalfYear = (annualPct) => Number(annualPct) / 200;

export function annuityPayment(presentValue, periodRate, periods) {
  if (!(periods > 0)) throw new Error('annuityPayment needs at least one period');
  if (periodRate === 0) return presentValue / periods;
  return (presentValue * periodRate) / (1 - Math.pow(1 + periodRate, -periods));
}

export function presentValueAt(rate, cashFlows, fromIndex) {
  let value = 0;
  for (let i = fromIndex; i < cashFlows.length; i += 1) {
    value += cashFlows[i] / Math.pow(1 + rate, i - fromIndex);
  }
  return value;
}

export function presentValue(rate, cashFlows) {
  let value = 0;
  for (let i = 0; i < cashFlows.length; i += 1) {
    value += cashFlows[i] / Math.pow(1 + rate, i + 1);
  }
  return value;
}

// IRR is solved on the half-yearly cash-flow array. Roots are reported as
// nominal annual rates (periodic x 2), matching the register's rate basis.
export function irrRoots(cashFlows) {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) return [];
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return [];

  const roots = [];
  const lo = -0.9999;
  const hi = 5;
  const steps = 2000;
  let previousRate = lo;
  let previousValue = presentValue(lo, cashFlows);
  if (Math.abs(previousValue) < 1e-10) roots.push(lo);

  for (let i = 1; i <= steps; i += 1) {
    const rate = lo + ((hi - lo) * i) / steps;
    const value = presentValue(rate, cashFlows);
    if (!Number.isFinite(value)) {
      previousRate = rate;
      previousValue = value;
      continue;
    }
    if (Math.abs(value) < 1e-10) {
      roots.push(rate);
    } else if (previousValue * value < 0) {
      let a = previousRate;
      let b = rate;
      let fa = previousValue;
      for (let iteration = 0; iteration < 100; iteration += 1) {
        const mid = (a + b) / 2;
        const fm = presentValue(mid, cashFlows);
        if (Math.abs(fm) < 1e-12 || Math.abs(b - a) < 1e-11) break;
        if (fa * fm <= 0) {
          b = mid;
        } else {
          a = mid;
          fa = fm;
        }
      }
      roots.push((a + b) / 2);
    }
    previousRate = rate;
    previousValue = value;
  }

  const unique = [];
  for (const root of roots) {
    if (!unique.some((existing) => Math.abs(existing - root) < 1e-7)) unique.push(root);
  }
  return unique;
}

export function annualiseIrr(periodicRate) {
  return periodicRate == null ? null : periodicRate * 2 * 100;
}

export function yearOf(operationalPeriod) {
  return Math.ceil(operationalPeriod / 2);
}
