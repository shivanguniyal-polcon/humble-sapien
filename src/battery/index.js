// THS Policy Battery: the standalone engine. No React, no browser-only APIs
// beyond Web Crypto (with a Node fallback), so this directory can be lifted
// into its own package and driven by a CLI auditor runner later.
//
// The contract every tool module satisfies:
//   { id, label, question, validate(input), run(input, params), renderResults(results) }
//
// The four stages:
//   0 ingest   ingest(text, opts) -> { dataset, validation }
//   1 bind     presets from params.js + provenance (status: verified/reported/custom)
//   2 execute  module.run(input, params) -> plain deterministic JSON + buildManifest
//   3 render   buildReport(...) -> { html, json, manifest } (PIT gate enforced)

export { ingest, parseCSV, parseJSONData, parseNumber, inferSchema, numericColumn } from './ingest.js';
export { canonicalJSON, sha256Hex, hashObject } from './hash.js';
export { buildManifest, verifyManifest, BATTERY_VERSION } from './manifest.js';
export {
  DISCOUNT_PRESETS, UNIT_COST_PRESETS, HORIZON_PRESETS, VERIFICATION_LABELS,
  formatINR, formatINRCompact,
} from './params.js';
export { decisionTree, decisionTreeSample, escapeHtml } from './modules/decisionTree.js';
export { cba, cbaSample } from './modules/cba.js';
export { mcda, mcdaSample } from './modules/mcda.js';
export { cea, ceaSample } from './modules/cea.js';
export { equity, equitySample } from './modules/equity.js';
export { markov, markovSample } from './modules/markov.js';
export { budgetImpact, budgetImpactSample } from './modules/budgetImpact.js';
export { gameTheory, gameTheorySample } from './modules/gameTheory.js';
export { queueing, queueingSample, mmc } from './modules/queueing.js';
export { monteCarlo, monteCarloSample, mulberry32 } from './modules/monteCarlo.js';
export {
  scenario, scenarioSample, PMJAY_REFERENCE, DRIVERS,
  simulate, evaluateSustainability, requiredBudgetGrowth, budgetAt, avgClaimAt,
} from './modules/scenario.js';
export { buildReport, checkPit, PIT_QUESTIONS, distributionalReceipt, formatDistributional } from './report.js';
export {
  cbaFromRows, mcdaFromRows, scenarioFromRows, TREE_CSV_NOTE,
  decisionTreeFromRows, ceaFromRows, equityFromRows, markovFromRows,
  budgetImpactFromRows, gameTheoryFromRows, queueingFromRows, monteCarloFromRows,
} from './adapters.js';
export { GENERAL_RULES, MODULE_FORMATS } from './formats.js';

import { decisionTree } from './modules/decisionTree.js';
import { cba } from './modules/cba.js';
import { mcda } from './modules/mcda.js';
import { scenario } from './modules/scenario.js';
import { cea } from './modules/cea.js';
import { equity } from './modules/equity.js';
import { markov } from './modules/markov.js';
import { budgetImpact } from './modules/budgetImpact.js';
import { gameTheory } from './modules/gameTheory.js';
import { queueing } from './modules/queueing.js';
import { monteCarlo } from './modules/monteCarlo.js';

export const MODULES = [
  decisionTree, cba, mcda, scenario,
  cea, equity, markov, budgetImpact, gameTheory, queueing, monteCarlo,
];
