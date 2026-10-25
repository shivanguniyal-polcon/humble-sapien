// Liquidity comparison.
//
// One entry point returns both paths: the contractual base case and the same
// case with the DSRA draw switched on. The comparison is a view over the two
// results, not a third cash-flow model, so every booked number still comes
// from runProject.

import { runProject } from './run-project.js';

function firstOperatingPeriod(result) {
  return result.periods.find((period) => period.phase === 'operation'
    && period.operationalPeriod === 1) || null;
}

function liquiditySnapshot(result) {
  const first = firstOperatingPeriod(result);
  const liquidity = result.operations.liquidity;
  return {
    firstPeriodCoverage: first?.liquidityDscr ?? first?.dscr ?? null,
    firstPeriodDrawCr: first?.dsraDrawCr ?? 0,
    firstPeriodUncoveredCr: first?.uncoveredShortfallCr ?? 0,
    contractualMinDscr: result.operations.minDscr,
    uncoveredShortfallCr: liquidity.uncoveredShortfallCr,
    totalDsraDrawnCr: liquidity.totalDsraDrawnCr,
    totalDsraReplenishedCr: liquidity.totalDsraReplenishedCr,
    dsraReleasedCr: liquidity.dsraReleasedCr,
    projectNpvCr: result.npv.projectNpvCr,
    equityNpvCr: result.npv.equityNpvCr,
  };
}

export function runProjectWithLiquidityComparison(raw = {}) {
  const base = runProject({ ...raw, liquiditySupport: 'none' });
  const supported = runProject({ ...raw, liquiditySupport: 'dsra-draw' });
  const first = firstOperatingPeriod(base);
  const firstPeriodGapCr = first
    ? Math.max(0, Number(first.debtServiceCr) - Number(first.cfadsCr))
    : 0;
  const off = liquiditySnapshot(base);
  const on = liquiditySnapshot(supported);

  return {
    ...supported,
    base,
    comparison: {
      firstPeriod: first?.operationalPeriod ?? 1,
      firstPeriodGapCr,
      coveredByDsraCr: on.firstPeriodDrawCr,
      off,
      on,
      contractualDscrIdentical: Math.abs(off.contractualMinDscr - on.contractualMinDscr) < 1e-12,
    },
  };
}
