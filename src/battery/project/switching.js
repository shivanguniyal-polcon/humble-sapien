// Switching values.
//
// The register asks for a multiplicative shock x(a) = x0 * (1 + a), a grid
// scan for non-smooth metrics (minimum DSCR), and a bracketed solve on every
// sign change. The primary result is the crossing nearest the base case; all
// crossings are retained so a non-monotonic minimum DSCR cannot hide a second
// breach. A solver that finds no crossing says so instead of returning a range
// edge.

import { validateProject } from './schema.js';
import { runProject } from './run-project.js';

export const SWITCHING_RANGE = Object.freeze({ min: -0.9, max: 3.0, gridPoints: 200 });

const SWITCHING_PARAMETERS = Object.freeze([
  { key: 'annualRevenueCr', label: 'Annual annuity / availability payment', unit: '₹ crore per year' },
  { key: 'tariff', label: 'PPA tariff', unit: '₹ per kWh' },
  { key: 'capex', label: 'Gross capital cost', unit: '₹ crore' },
  { key: 'opexFixedCrPerYear', label: 'Fixed O&M', unit: '₹ crore per year' },
]);

function switchingBaseValue(input, key, baseResult) {
  if (key === 'annualRevenueCr') return Number(input.annualRevenueCr);
  if (key === 'tariff') return Number(input.tariff);
  if (key === 'opexFixedCrPerYear') return Number(input.opexFixedCrPerYear);
  if (key === 'capex') return Number(baseResult.funding.grossCostCr);
  return null;
}

function shockProject(raw, key, factor) {
  const next = { ...raw };
  if (key === 'annualRevenueCr') {
    next.annualRevenueCr = Number(raw.annualRevenueCr) * factor;
  } else if (key === 'tariff') {
    next.tariff = Number(raw.tariff) * factor;
  } else if (key === 'opexFixedCrPerYear') {
    next.opexFixedCrPerYear = Number(raw.opexFixedCrPerYear) * factor;
  } else if (key === 'capex') {
    if (raw.hardCostCr != null) next.hardCostCr = Number(raw.hardCostCr) * factor;
    if (raw.softCostCr != null) next.softCostCr = Number(raw.softCostCr) * factor;
    if (raw.capexCr != null) next.capexCr = Number(raw.capexCr) * factor;
  }
  return next;
}

function switchingMetric(result, metric) {
  if (metric === 'minDscr') return result.operations.minDscr;
  if (metric === 'projectNpvCr') return result.npv.projectNpvCr;
  return null;
}

function findCrossings(evaluate, range = SWITCHING_RANGE) {
  const roots = [];
  const zeroValue = evaluate(0);
  if (Number.isFinite(zeroValue) && Math.abs(zeroValue) < 1e-12) roots.push(0);

  let previousAlpha = range.min;
  let previousValue = evaluate(range.min);
  for (let i = 1; i <= range.gridPoints; i += 1) {
    const alpha = range.min + ((range.max - range.min) * i) / range.gridPoints;
    const value = evaluate(alpha);
    if (!Number.isFinite(value)) {
      previousAlpha = alpha;
      previousValue = value;
      continue;
    }
    if (Math.abs(value) < 1e-12) {
      roots.push(alpha);
    } else if (Number.isFinite(previousValue) && previousValue * value < 0) {
      let a = previousAlpha;
      let b = alpha;
      let fa = previousValue;
      for (let iteration = 0; iteration < 80; iteration += 1) {
        const mid = (a + b) / 2;
        const fm = evaluate(mid);
        if (!Number.isFinite(fm)) break;
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
    previousAlpha = alpha;
    previousValue = value;
  }

  const unique = [];
  for (const root of roots.sort((a, b) => a - b)) {
    if (!unique.some((existing) => Math.abs(existing - root) < 1e-7)) unique.push(root);
  }
  return unique;
}

export function solveSwitching(raw = {}, baseResult = null) {
  const base = baseResult || runProject(raw);
  const { input } = validateProject(raw);
  const targets = [
    { metric: 'minDscr', threshold: 1.0, label: '1.00x cover' },
    { metric: 'minDscr', threshold: Number(input.defaultDscr), label: `default ${Number(input.defaultDscr).toFixed(2)}x` },
    { metric: 'minDscr', threshold: Number(input.lockupDscr), label: `lock-up ${Number(input.lockupDscr).toFixed(2)}x` },
    { metric: 'projectNpvCr', threshold: 0, label: 'project NPV zero' },
  ];
  const rows = [];
  const parameters = input.sector === 'solar'
    ? SWITCHING_PARAMETERS.filter((parameter) => parameter.key !== 'annualRevenueCr')
    : SWITCHING_PARAMETERS.filter((parameter) => parameter.key !== 'tariff');

  for (const parameter of parameters) {
    const baseValue = switchingBaseValue(input, parameter.key, base);
    for (const target of targets) {
      const baseMetric = switchingMetric(base, target.metric);
      const evaluate = (alpha) => {
        try {
          const stressed = shockProject(raw, parameter.key, 1 + alpha);
          const result = runProject(stressed, { irr: false });
          const value = switchingMetric(result, target.metric);
          return Number.isFinite(value) ? value - target.threshold : NaN;
        } catch {
          return NaN;
        }
      };
      const roots = findCrossings(evaluate);
      const crossings = roots.map((alpha) => {
        const stressed = runProject(shockProject(raw, parameter.key, 1 + alpha), { irr: false });
        return {
          alpha,
          alphaPct: alpha * 100,
          parameterValue: baseValue * (1 + alpha),
          metricValue: switchingMetric(stressed, target.metric),
          bindingPeriod: target.metric === 'minDscr' ? stressed.operations.minDscrPeriod : null,
          bindingYear: target.metric === 'minDscr' ? stressed.operations.minDscrYear : null,
        };
      });
      const primary = crossings.length > 0
        ? crossings.reduce((best, current) => (Math.abs(current.alpha) < Math.abs(best.alpha) ? current : best))
        : null;
      const direction = baseMetric >= target.threshold ? 'headroom' : 'required-improvement';
      rows.push({
        parameter: parameter.key,
        label: parameter.label,
        unit: parameter.unit,
        baseValue,
        metric: target.metric,
        metricLabel: target.metric === 'minDscr' ? 'Minimum DSCR' : 'Project NPV',
        threshold: target.threshold,
        targetLabel: target.label,
        baseMetric,
        direction,
        reachable: roots.length > 0,
        reason: roots.length > 0 ? null : 'No crossing in the tested range; the edge is not reported as a switching value.',
        crossings,
        primary,
      });
    }
  }

  return {
    method: 'grid+bisection',
    range: { ...SWITCHING_RANGE },
    base: {
      minDscr: base.operations.minDscr,
      projectNpvCr: base.npv.projectNpvCr,
      equityNpvCr: base.npv.equityNpvCr,
      projectIrrPct: base.npv.projectIrrPct,
      equityIrrPct: base.npv.equityIrrPct,
    },
    rows,
  };
}

export function runProjectWithSwitching(raw = {}) {
  const result = runProject(raw);
  result.switching = solveSwitching(raw, result);
  return result;
}
