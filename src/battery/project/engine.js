// Project-finance engine public surface.
//
// Implementations are split by concern:
//   run-project.js  validation and orchestration
//   construction.js construction funding and IDC
//   debt.js         debt repayment schedule
//   tax.js          115BAA tax, loss pool, WDV and SLM tracks
//   opex.js         escalated O&M series
//   operations.js   operating waterfall, DSRA facility, LLCR and DSCR summary
//   valuation.js    project/equity NPV and IRR
//   switching.js    switching-value solver
//   comparison.js   liquidity support, off versus on

export { TAX_RATES } from './schema.js';
export {
  runProject, normalizeProject,
  ProjectInputError, ENGINE_VERSION, CONVENTION_VERSION,
} from './run-project.js';
export {
  SWITCHING_RANGE, solveSwitching, runProjectWithSwitching,
} from './switching.js';
export { runProjectWithLiquidityComparison } from './comparison.js';
