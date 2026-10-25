// Project desk contract tests.
//
// The golden case in src/battery/project/fixtures/ham-road.js is the contract:
// its expected values were derived outside the engine from the register. This
// suite must fail if the engine drifts from those numbers, the schema loses a
// field the form or memo depends on, or a benchmark loses its evidence tag.

import assert from 'node:assert/strict';
import {
  FIELDS, FIELD_GROUPS, SECTOR_TEMPLATES, PUBLIC_FIELDS,
  resolveTemplate, validateProject, normalizeProject, fieldLabel,
  isPublicField, publicFieldKeys,
} from '../src/battery/project/schema.js';
import {
  runProject, runProjectWithSwitching, runProjectWithLiquidityComparison,
  solveSwitching, TAX_RATES,
} from '../src/battery/project/engine.js';
import { buildMemo } from '../src/battery/project/memo.js';
import { HAM_ROAD_CASE, HAM_ROAD_EXPECTED, HAM_ROAD_SWITCHING } from '../src/battery/project/fixtures/ham-road.js';
import { SOLAR_CASE, SOLAR_EXPECTED, SOLAR_LIQUIDITY, SOLAR_SWITCHING } from '../src/battery/project/fixtures/solar.js';
import { canonicalJSON } from '../src/battery/hash.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(`  ${err.message}`);
  }
}

function near(actual, expected, tol, label) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tol,
    `${label}: got ${actual}, expected ${expected} +/- ${tol}`,
  );
}

function hasError(errors, pattern) {
  return errors.some((e) => pattern.test(e.message || e.field || ''));
}

// ---------------------------------------------------------------------------
// Schema integrity
// ---------------------------------------------------------------------------

test('schema has the expected field groups and unique keys', () => {
  assert.ok(FIELD_GROUPS.length >= 7, 'expected at least seven field groups');
  const keys = FIELDS.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length, 'field keys must be unique');
  for (const f of FIELDS) {
    assert.ok(f.key && f.label && f.type, `field ${f.key} is incomplete`);
    assert.ok(f.group, `field ${f.key} has no group`);
    assert.ok(Array.isArray(f.modes) && f.modes.length > 0, `field ${f.key} has no modes`);
  }
});

test('every public field resolves to a real field definition', () => {
  for (const [sector, keys] of Object.entries(PUBLIC_FIELDS)) {
    assert.ok(keys.length >= 7 && keys.length <= 10, `${sector} public field count`);
    for (const key of keys) {
      assert.ok(FIELDS.some((f) => f.key === key), `${sector} references missing field ${key}`);
    }
  }
});

test('HAM public mode asks for capex and construction years, not the full waterfall', () => {
  const keys = PUBLIC_FIELDS['ham-road'];
  assert.ok(keys.includes('capexCr'));
  assert.ok(keys.includes('constructionYears'));
  assert.ok(keys.includes('hamSupportPct'));
  assert.ok(!keys.includes('wdvBlockPct'));
  assert.ok(!keys.includes('lockupDscr'));
});

test('public visibility has one owner: the sector allowlists', () => {
  const publicKeys = new Set(Object.values(PUBLIC_FIELDS).flat());
  for (const field of FIELDS) {
    assert.equal(
      field.modes.includes('public'),
      publicKeys.has(field.key),
      `${field.key} public mode disagrees with PUBLIC_FIELDS`,
    );
    assert.equal(isPublicField(field.key), publicKeys.has(field.key), `${field.key} helper disagrees`);
  }
  for (const [sector, keys] of Object.entries(PUBLIC_FIELDS)) {
    assert.deepEqual(publicFieldKeys(sector), keys);
    assert.deepEqual(resolveTemplate(sector).publicFields, [...keys]);
  }
  assert.ok(!isPublicField('capacityUnit'));
});

test('solar public mode can choose liquidity support and defaults to none', () => {
  const field = FIELDS.find((f) => f.key === 'liquiditySupport');
  assert.ok(field.modes.includes('public'));
  assert.ok(PUBLIC_FIELDS.solar.includes('liquiditySupport'));
  assert.ok(!PUBLIC_FIELDS['ham-road'].includes('liquiditySupport'));
  assert.equal(resolveTemplate('solar').values.liquiditySupport, 'none');
});

test('sector templates carry values and evidence tags', () => {
  const ham = resolveTemplate('ham-road');
  assert.equal(ham.values.gearingPct, 75);
  assert.equal(ham.values.taxRegime, '115BAA');
  assert.equal(ham.evidence.gearingPct.status, 'benchmark');
  assert.equal(ham.evidence.taxRegime.status, 'reported');
  assert.equal(ham.evidence.hamSupportPct.status, 'reported');

  const solar = resolveTemplate('solar');
  assert.equal(solar.values.wdvBlockPct, 15);
  assert.equal(solar.values.slmLifeYears, 25);
  assert.equal(solar.evidence.cufPct.status, 'benchmark');
  assert.ok(SECTOR_TEMPLATES.solar);
});

test('schema labels are stable for memo use', () => {
  assert.equal(fieldLabel('gearingPct'), 'Gearing');
  assert.equal(fieldLabel('annualRevenueCr'), 'Annual annuity / availability payment');
  assert.equal(fieldLabel('notAField'), 'notAField');
});

// ---------------------------------------------------------------------------
// Validation and normalization
// ---------------------------------------------------------------------------

test('the golden case validates cleanly', () => {
  const { errors, warnings } = validateProject(HAM_ROAD_CASE);
  assert.deepEqual(errors, []);
  assert.ok(Array.isArray(warnings));
});

test('missing identity and capex fail validation', () => {
  const { errors } = validateProject({ ...HAM_ROAD_CASE, projectName: '', hardCostCr: 0, softCostCr: 0 });
  assert.ok(hasError(errors, /projectName/i));
  assert.ok(hasError(errors, /cost|capex/i));
});

test('construction phasing must cover the construction periods and sum to one', () => {
  const short = validateProject({ ...HAM_ROAD_CASE, constructionPhasing: [0.5, 0.5] });
  assert.ok(hasError(short.errors, /phasing/i));

  const wrongSum = validateProject({
    ...HAM_ROAD_CASE,
    constructionPhasing: [0.2, 0.2, 0.2, 0.2, 0.1],
  });
  assert.ok(hasError(wrongSum.errors, /phasing/i));
});

test('covenant ordering and tax-regime switches are enforced', () => {
  const covenants = validateProject({ ...HAM_ROAD_CASE, lockupDscr: 1.0, defaultDscr: 1.05 });
  assert.ok(hasError(covenants.errors, /lockup|default/i));

  const tax = validateProject({ ...HAM_ROAD_CASE, taxRegime: '115BAB', legacy115Bab: false });
  assert.ok(hasError(tax.errors, /115BAB|legacy/i));
});

test('liquidity support is limited to none or a DSRA draw', () => {
  const invalid = validateProject({ ...SOLAR_CASE, liquiditySupport: 'working-capital-facility' });
  assert.ok(hasError(invalid.errors, /liquiditySupport/i));
  assert.equal(resolveTemplate('solar').values.liquiditySupport, 'none');
  assert.equal(resolveTemplate('ham-road').values.liquiditySupport, 'none');
});

test('HAM support and a separate grant cannot both be set', () => {
  const { errors } = validateProject({ ...HAM_ROAD_CASE, grantPct: 10 });
  assert.ok(hasError(errors, /grant|support/i));
});

test('the full economic lens needs at least one benefit line', () => {
  const { errors } = validateProject({ ...HAM_ROAD_CASE, economicMode: 'full' });
  assert.ok(hasError(errors, /benefit/i));
});

test('zero revenue is rejected, not silently converted to a zero DSCR', () => {
  const { errors } = validateProject({ ...HAM_ROAD_CASE, annualRevenueCr: 0 });
  assert.ok(hasError(errors, /revenue/i));
});

test('public normalization splits total capex and fills construction years', () => {
  const project = normalizeProject({
    projectName: 'Public HAM screen',
    sector: 'ham-road',
    state: 'Maharashtra',
    capexCr: 1200,
    constructionYears: 2.5,
    annualRevenueCr: 120,
    opexFixedCrPerYear: 12,
  });
  assert.equal(project.hardCostCr, 1200);
  assert.equal(project.softCostCr, 0);
  assert.equal(project.contingencyPct, 0);
  assert.equal(project.constructionMonths, 30);
  assert.equal(project.constructionPhasing.length, 5);
  assert.equal(project.gearingPct, 75);
  assert.equal(project.taxRegime, '115BAA');
});

// ---------------------------------------------------------------------------
// Golden case: funding and IDC
// ---------------------------------------------------------------------------

const result = runProject(HAM_ROAD_CASE);
const switched = runProjectWithSwitching(HAM_ROAD_CASE);
const solar = runProject(SOLAR_CASE);
const solarSwitched = runProjectWithSwitching(SOLAR_CASE);
const solarSupported = runProject({ ...SOLAR_CASE, liquiditySupport: 'dsra-draw' });
const solarComparison = runProjectWithLiquidityComparison(SOLAR_CASE);

test('the case produces construction and operation periods', () => {
  assert.equal(result.periods.length, HAM_ROAD_EXPECTED.periodCount);
  assert.equal(result.periods[0].phase, 'construction');
  assert.equal(result.periods[4].phase, 'construction');
  assert.equal(result.periods[5].phase, 'operation');
  assert.equal(result.operations.operationalPeriods, HAM_ROAD_EXPECTED.operationalPeriods);
});

test('funding requirement, IDC and debt match the independent table', () => {
  near(result.funding.grossCostCr, HAM_ROAD_EXPECTED.grossCostCr, 1e-6, 'gross cost');
  near(result.funding.grantCr, HAM_ROAD_EXPECTED.grantCr, 1e-6, 'grant');
  near(result.funding.constructionFundingCr, HAM_ROAD_EXPECTED.constructionFundingCr, 1e-6, 'construction funding');
  near(result.funding.kIdc, HAM_ROAD_EXPECTED.kIdc, 1e-9, 'IDC factor');
  near(result.funding.initialDsraCr, HAM_ROAD_EXPECTED.initialDsraCr, 1e-5, 'DSRA');
  near(result.funding.constructionDebtCr, HAM_ROAD_EXPECTED.constructionDebtCr, 1e-5, 'construction debt');
  near(result.funding.dsraDebtCr, HAM_ROAD_EXPECTED.dsraDebtCr, 1e-5, 'DSRA debt');
  near(result.funding.idcCr, HAM_ROAD_EXPECTED.idcCr, 1e-5, 'IDC');
  near(result.funding.upfrontFeeCr, HAM_ROAD_EXPECTED.upfrontFeeCr, 1e-5, 'upfront fee');
  near(result.funding.fundingRequirementCr, HAM_ROAD_EXPECTED.fundingRequirementCr, 1e-5, 'funding requirement');
  near(result.funding.debtCr, HAM_ROAD_EXPECTED.debtCr, 1e-5, 'total debt');
  near(result.funding.equityCr, HAM_ROAD_EXPECTED.equityCr, 1e-5, 'equity');
  near(result.funding.debtServiceCr, HAM_ROAD_EXPECTED.debtServiceCr, 1e-5, 'half-year debt service');
  near(result.operations.annualDebtServiceCr, HAM_ROAD_EXPECTED.annualDebtServiceCr, 1e-5, 'annual debt service');
});

test('construction draws sum to the construction debt and IDC to the register value', () => {
  const construction = result.periods.filter((p) => p.phase === 'construction');
  const drawTotal = construction.reduce((sum, p) => sum + p.debtDrawCr, 0);
  const interestTotal = construction.reduce((sum, p) => sum + p.interestCr, 0);
  near(drawTotal, result.funding.constructionDebtCr, 1e-5, 'draw total');
  near(interestTotal, result.funding.idcCr, 1e-5, 'construction interest');
});

// ---------------------------------------------------------------------------
// Golden case: DSCR, LLCR and cash flow
// ---------------------------------------------------------------------------

test('DSCR, average DSCR and LLCR match the independent table', () => {
  near(result.operations.minDscr, HAM_ROAD_EXPECTED.minDscr, 1e-6, 'minimum DSCR');
  assert.equal(result.operations.minDscrPeriod, HAM_ROAD_EXPECTED.minDscrPeriod);
  assert.equal(result.operations.minDscrYear, HAM_ROAD_EXPECTED.minDscrYear);
  near(result.operations.averageDscr, HAM_ROAD_EXPECTED.averageDscr, 1e-6, 'average DSCR');
  near(result.operations.llcrAtCod, HAM_ROAD_EXPECTED.llcrAtCod, 1e-6, 'LLCR at COD');
});

test('first and final operating period cash flows match the independent table', () => {
  const first = result.periods[5];
  const last = result.periods[34];
  near(first.cfadsCr, HAM_ROAD_EXPECTED.cfadsPeriod1Cr, 1e-5, 'period 1 CFADS');
  near(last.cfadsCr, HAM_ROAD_EXPECTED.cfadsPeriod30Cr, 1e-5, 'period 30 CFADS');
  near(first.dscr, HAM_ROAD_EXPECTED.dscrPeriod1, 1e-6, 'period 1 DSCR');
  near(last.dscr, HAM_ROAD_EXPECTED.dscrPeriod30, 1e-6, 'period 30 DSCR');
  assert.ok(last.workingCapitalReleaseCr > 0, 'final period should release working capital');
});

test('the minimum is period 29, not the final period, because of the working-capital release', () => {
  assert.equal(result.operations.minDscrPeriod, 29);
  const p29 = result.periods.find((p) => p.operationalPeriod === 29);
  const p30 = result.periods.find((p) => p.operationalPeriod === 30);
  assert.ok(p29.dscr < p30.dscr);
});

test('the case is covered but below its default and lock-up covenants', () => {
  assert.equal(result.operations.firstCoverBreachPeriod, null);
  assert.ok(result.operations.firstDefaultBreachPeriod !== null);
  assert.ok(result.operations.firstLockupBreachPeriod !== null);
});

// ---------------------------------------------------------------------------
// Golden case: project and equity valuation
// ---------------------------------------------------------------------------

test('project and equity NPV/IRR match the independent table', () => {
  near(result.npv.projectNpvCr, HAM_ROAD_EXPECTED.projectNpvCr, 1e-5, 'project NPV');
  near(result.npv.projectIrrPct, HAM_ROAD_EXPECTED.projectIrrPct, 1e-4, 'project IRR');
  near(result.npv.equityNpvCr, HAM_ROAD_EXPECTED.equityNpvCr, 1e-5, 'equity NPV');
  near(result.npv.equityIrrPct, HAM_ROAD_EXPECTED.equityIrrPct, 1e-4, 'equity IRR');
  near(result.npv.projectNpvAtIrrCr, 0, 1e-6, 'project NPV at project IRR');
  near(result.npv.equityNpvAtIrrCr, 0, 1e-6, 'equity NPV at equity IRR');
});

test('project FCFF excludes financing costs and nets the construction grant', () => {
  const project = result.npv.cashFlows.project;
  const construction = project.filter((p) => p.phase === 'construction');
  near(construction.reduce((sum, p) => sum + p.amountCr, 0), -720, 1e-6, 'construction FCFF');
  near(project.reduce((sum, p) => sum + p.amountCr, 0), 794.856176, 1e-5, 'undiscounted project cash');
  assert.equal(project.length, HAM_ROAD_EXPECTED.periodCount);
  assert.ok(project[5].amountCr > 0);
});

test('equity cash flow funds DSRA at COD and releases it at maturity', () => {
  const equity = result.npv.cashFlows.equity;
  near(equity[4].amountCr, -50.471663, 1e-6, 'COD equity outflow including DSRA');
  near(equity[equity.length - 1].amountCr, 46.799526, 1e-6, 'final equity inflow including DSRA release');
  assert.equal(equity.length, HAM_ROAD_EXPECTED.periodCount);
  assert.ok(equity.slice(0, 5).every((p) => p.amountCr < 0));
});

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

test('debt roll-forward and DSCR identity hold in every operating period', () => {
  const operations = result.periods.filter((p) => p.phase === 'operation');
  for (const p of operations) {
    near(p.openingDebtCr - p.principalCr, p.closingDebtCr, 1e-9, `debt roll-forward period ${p.operationalPeriod}`);
    near(p.dscr * p.debtServiceCr, p.cfadsCr, 1e-9, `DSCR identity period ${p.operationalPeriod}`);
  }
  near(operations[operations.length - 1].closingDebtCr, 0, 1e-6, 'final debt balance');
});

test('WDV, loss pools and cash tax never go negative', () => {
  for (const year of result.tax.annual) {
    assert.ok(year.wdvClosingCr >= -1e-9, `negative WDV in year ${year.year}`);
    assert.ok(year.lossPoolEndCr >= -1e-9, `negative loss pool in year ${year.year}`);
    assert.ok(year.cashTaxCr >= -1e-9, `negative cash tax in year ${year.year}`);
  }
});

// ---------------------------------------------------------------------------
// Switching values
// ---------------------------------------------------------------------------

const switchRow = (run, parameter, metric, threshold) => run.switching.rows.find((row) => row.parameter === parameter
  && row.metric === metric
  && Math.abs(row.threshold - threshold) < 1e-9);

function reprice(baseCase, parameter, alpha) {
  if (parameter === 'annualRevenueCr') {
    return runProject({ ...baseCase, annualRevenueCr: baseCase.annualRevenueCr * (1 + alpha) });
  }
  if (parameter === 'tariff') {
    return runProject({ ...baseCase, tariff: baseCase.tariff * (1 + alpha) });
  }
  if (parameter === 'opexFixedCrPerYear') {
    return runProject({ ...baseCase, opexFixedCrPerYear: baseCase.opexFixedCrPerYear * (1 + alpha) });
  }
  return runProject({
    ...baseCase,
    hardCostCr: baseCase.hardCostCr * (1 + alpha),
    softCostCr: baseCase.softCostCr * (1 + alpha),
  });
}

function checkSwitch(run, baseCase, parameter, metric, threshold, expected) {
  const row = switchRow(run, parameter, metric, threshold);
  assert.ok(row, `missing switching row ${parameter} ${metric} ${threshold}`);
  assert.equal(row.direction, row.baseMetric >= threshold ? 'headroom' : 'required-improvement');
  if (expected.reachable === false) {
    assert.equal(row.reachable, false);
    assert.equal(row.primary, null);
    assert.equal(row.crossings.length, 0);
    assert.ok(/no crossing/i.test(row.reason));
    return;
  }
  assert.equal(row.reachable, true);
  assert.equal(row.crossings.length, expected.crossings, `${parameter} ${threshold} crossing count`);
  assert.ok(row.primary, `${parameter} ${threshold} has no primary crossing`);
  near(row.primary.alphaPct, expected.alphaPct, 1e-4, `${parameter} ${threshold} alpha`);
  near(row.primary.parameterValue, expected.value, 1e-4, `${parameter} ${threshold} value`);
  assert.equal(row.primary.bindingPeriod, expected.bindingPeriod, `${parameter} ${threshold} binding period`);
  for (const crossing of row.crossings) {
    const rerun = reprice(baseCase, parameter, crossing.alpha);
    const actual = metric === 'minDscr' ? rerun.operations.minDscr : rerun.npv.projectNpvCr;
    near(actual, threshold, Math.max(1e-6, Math.abs(threshold) * 0.001), `${parameter} ${threshold} rerun`);
  }
}

test('1.00x, default and lock-up switching values reproduce the independent table', () => {
  for (const [parameter, table] of Object.entries(HAM_ROAD_SWITCHING)) {
    checkSwitch(switched, HAM_ROAD_CASE, parameter, 'minDscr', 1.0, table.minDscr1);
    checkSwitch(switched, HAM_ROAD_CASE, parameter, 'minDscr', 1.05, table.minDscr105);
    checkSwitch(switched, HAM_ROAD_CASE, parameter, 'minDscr', 1.15, table.minDscr115);
    checkSwitch(switched, HAM_ROAD_CASE, parameter, 'projectNpvCr', 0, table.projectNpv);
  }
});

test('the 1.00x revenue row keeps all non-monotonic crossings', () => {
  const row = switchRow(switched, 'annualRevenueCr', 'minDscr', 1.0);
  assert.equal(row.crossings.length, 3);
  assert.ok(row.crossings.some((c) => c.alphaPct < -13));
  assert.ok(row.crossings.some((c) => c.bindingPeriod === 1));
  assert.ok(row.primary.alphaPct > -2, 'primary should be the crossing nearest the base case');
});

test('a target with no crossing is reported as unreachable, not as a range edge', () => {
  const stressed = solveSwitching({
    ...HAM_ROAD_CASE,
    lockupDscr: 5,
    defaultDscr: 4,
  });
  const unreachable = stressed.rows.filter((row) => row.reachable === false);
  assert.ok(unreachable.length > 0, 'expected at least one unreachable target');
  for (const row of unreachable) {
    assert.equal(row.primary, null);
    assert.ok(/no crossing/i.test(row.reason));
  }
});

// ---------------------------------------------------------------------------
// Golden case: tax and depreciation
// ---------------------------------------------------------------------------

test('115BAA tax uses both depreciation tracks and a loss pool', () => {
  assert.equal(result.tax.regime, '115BAA');
  near(result.tax.rate, TAX_RATES['115BAA'], 1e-12, 'tax rate');
  near(result.tax.bookDepreciationYear1Cr, HAM_ROAD_EXPECTED.bookDepreciationYear1Cr, 1e-5, 'book depreciation');
  near(result.tax.taxDepreciationYear1Cr, HAM_ROAD_EXPECTED.taxDepreciationYear1Cr, 1e-5, 'tax depreciation');
  near(result.tax.taxableIncomeYear1Cr, HAM_ROAD_EXPECTED.taxableIncomeYear1Cr, 1e-5, 'year-1 taxable income');
  near(result.tax.totalTaxCr, HAM_ROAD_EXPECTED.totalTaxCr, 1e-5, 'total cash tax');
  near(result.tax.lossPoolEndCr, HAM_ROAD_EXPECTED.lossPoolEndCr, 1e-5, 'usable loss pool at end');
  near(result.tax.lossExpiredUnusedCr, HAM_ROAD_EXPECTED.lossExpiredUnusedCr, 1e-5, 'expired unused losses');
  near(result.tax.lossPoolGrossUnusedCr, HAM_ROAD_EXPECTED.lossExpiredUnusedCr, 1e-5, 'gross unused losses');
  assert.notEqual(result.tax.bookDepreciationYear1Cr, result.tax.taxDepreciationYear1Cr);
  assert.ok(result.tax.lossUsedCr > 0, 'loss pool should be used before tax is paid');
});

test('tax and CFADS read the same escalated O&M series', () => {
  for (const run of [result, solar]) {
    for (const year of run.tax.annual) {
      const operationsThisYear = run.periods.filter((period) => period.phase === 'operation'
        && period.year === year.year);
      const cfadsOpexCr = operationsThisYear.reduce((sum, period) => sum + period.opexCr, 0);
      near(cfadsOpexCr, year.opexCr, 1e-9, `${run.meta.sector} year ${year.year} O&M`);
    }
  }
});

// ---------------------------------------------------------------------------
// Solar golden case
// ---------------------------------------------------------------------------

const solarPeriod = (n) => solar.periods.find((p) => p.phase === 'operation' && p.operationalPeriod === n);

test('the solar case validates and runs 25 operating years against 12-year debt', () => {
  const { errors } = validateProject(SOLAR_CASE);
  assert.deepEqual(errors, []);
  assert.equal(solar.periods.length, SOLAR_EXPECTED.periodCount);
  assert.equal(solar.meta.operationalPeriods, 50);
  assert.equal(solar.meta.operatingYears, 25);
  assert.equal(solar.meta.loanPeriods, 24);
  assert.equal(solar.periods.filter((p) => p.phase === 'construction').length, 2);
  assert.equal(solar.periods.filter((p) => p.phase === 'operation').length, 50);
});

test('solar funding, IDC and debt match the independent table', () => {
  near(solar.funding.grossCostCr, SOLAR_EXPECTED.grossCostCr, 1e-6, 'solar gross cost');
  near(solar.funding.kIdc, SOLAR_EXPECTED.kIdc, 1e-9, 'solar IDC factor');
  near(solar.funding.initialDsraCr, SOLAR_EXPECTED.initialDsraCr, 1e-5, 'solar DSRA');
  near(solar.funding.constructionDebtCr, SOLAR_EXPECTED.constructionDebtCr, 1e-5, 'solar construction debt');
  near(solar.funding.idcCr, SOLAR_EXPECTED.idcCr, 1e-5, 'solar IDC');
  near(solar.funding.upfrontFeeCr, SOLAR_EXPECTED.upfrontFeeCr, 1e-5, 'solar upfront fee');
  near(solar.funding.fundingRequirementCr, SOLAR_EXPECTED.fundingRequirementCr, 1e-5, 'solar funding requirement');
  near(solar.funding.debtCr, SOLAR_EXPECTED.debtCr, 1e-5, 'solar debt');
  near(solar.funding.equityCr, SOLAR_EXPECTED.equityCr, 1e-5, 'solar equity');
  near(solar.funding.debtServiceCr, SOLAR_EXPECTED.debtServiceCr, 1e-5, 'solar half-year debt service');
});

test('solar revenue uses capacity x CUF x tariff and degrades annually', () => {
  const y1 = solar.tax.annual[0];
  const y2 = solar.tax.annual[1];
  near(y1.revenueCr, SOLAR_EXPECTED.revenueYear1Cr, 1e-5, 'solar year-1 revenue');
  near(y2.revenueCr, y1.revenueCr * 0.995, 1e-6, 'solar year-2 degradation');
  near(solarPeriod(1).cfadsCr, SOLAR_EXPECTED.cfadsPeriod1Cr, 1e-5, 'solar period-1 CFADS');
  near(solarPeriod(2).cfadsCr, SOLAR_EXPECTED.cfadsPeriod2Cr, 1e-5, 'solar period-2 CFADS');
});

test('solar is a stress case: first-period liquidity and the year-12 tax step bind', () => {
  near(solar.operations.minDscr, SOLAR_EXPECTED.minDscr, 1e-6, 'solar minimum DSCR');
  assert.equal(solar.operations.minDscrPeriod, 1);
  assert.equal(solar.operations.firstCoverBreachPeriod, 1);
  near(solarPeriod(1).dscr, SOLAR_EXPECTED.dscrPeriod1, 1e-6, 'solar period-1 DSCR');
  near(solarPeriod(24).dscr, SOLAR_EXPECTED.dscrPeriod24, 1e-6, 'solar period-24 DSCR');
  near(solar.operations.averageDscr, SOLAR_EXPECTED.averageDscr, 1e-6, 'solar average DSCR');
  near(solar.operations.llcrAtCod, SOLAR_EXPECTED.llcrAtCod, 1e-6, 'solar LLCR');
  assert.ok(solar.warnings.some((w) => /cover|breach/i.test(w)));
});

test('solar tax steps up as the loss pool and WDV shield exhaust', () => {
  near(solar.tax.bookDepreciationYear1Cr, SOLAR_EXPECTED.bookDepreciationYear1Cr, 1e-5, 'solar book depreciation');
  near(solar.tax.taxDepreciationYear1Cr, SOLAR_EXPECTED.taxDepreciationYear1Cr, 1e-5, 'solar WDV depreciation');
  near(solar.tax.taxableIncomeYear1Cr, SOLAR_EXPECTED.taxableIncomeYear1Cr, 1e-5, 'solar year-1 taxable income');
  near(solar.tax.annual[11].cashTaxCr, SOLAR_EXPECTED.cashTaxYear12Cr, 1e-5, 'solar year-12 cash tax');
  near(solar.tax.annual[12].cashTaxCr, SOLAR_EXPECTED.cashTaxYear13Cr, 1e-5, 'solar year-13 cash tax');
  near(solar.tax.totalTaxCr, SOLAR_EXPECTED.totalTaxCr, 1e-5, 'solar total cash tax');
  near(solar.tax.lossPoolEndCr, SOLAR_EXPECTED.lossPoolEndCr, 1e-5, 'solar usable loss pool');
  near(solar.tax.lossExpiredUnusedCr, SOLAR_EXPECTED.lossExpiredUnusedCr, 1e-5, 'solar expired losses');
});

test('solar NPV and IRR match the independent table', () => {
  near(solar.npv.projectNpvCr, SOLAR_EXPECTED.projectNpvCr, 1e-5, 'solar project NPV');
  near(solar.npv.projectIrrPct, SOLAR_EXPECTED.projectIrrPct, 1e-4, 'solar project IRR');
  near(solar.npv.equityNpvCr, SOLAR_EXPECTED.equityNpvCr, 1e-5, 'solar equity NPV');
  near(solar.npv.equityIrrPct, SOLAR_EXPECTED.equityIrrPct, 1e-4, 'solar equity IRR');
  near(solar.npv.projectNpvAtIrrCr, 0, 1e-6, 'solar project NPV at IRR');
  near(solar.npv.equityNpvAtIrrCr, 0, 1e-6, 'solar equity NPV at IRR');
});

test('solar debt is repaid at period 24 while operations continue to period 50', () => {
  const lastDebt = solarPeriod(24);
  const firstPostDebt = solarPeriod(25);
  near(lastDebt.closingDebtCr, 0, 1e-6, 'solar final debt balance');
  assert.equal(lastDebt.dsraClosingCr, 0);
  assert.equal(firstPostDebt.debtServiceCr, 0);
  assert.equal(firstPostDebt.dscr, null);
  assert.equal(firstPostDebt.llcr, null);
  assert.ok(solarPeriod(50).workingCapitalReleaseCr > 0);
  assert.equal(solarPeriod(50).operationalPeriod, 50);
});

test('the DSRA draw covers the first-period and year-12 shortfalls without changing contractual DSCR', () => {
  const baseLiquidity = solar.operations.liquidity;
  assert.equal(baseLiquidity.support, 'none');
  assert.equal(baseLiquidity.firstShortfallPeriod, SOLAR_LIQUIDITY.firstShortfallPeriod);
  assert.equal(baseLiquidity.totalDsraDrawnCr, 0);
  near(baseLiquidity.uncoveredShortfallCr, SOLAR_LIQUIDITY.unsupportedUncoveredShortfallCr, 1e-5, 'unsupported uncovered shortfall');
  near(solarPeriod(1).uncoveredShortfallCr, 11.230573, 1e-5, 'period-1 unsupported shortfall');
  assert.equal(baseLiquidity.minLiquidityCoverage, null);

  const liquidity = solarSupported.operations.liquidity;
  assert.equal(liquidity.support, 'dsra-draw');
  assert.equal(liquidity.firstShortfallPeriod, SOLAR_LIQUIDITY.firstShortfallPeriod);
  assert.equal(liquidity.firstSupportedPeriod, SOLAR_LIQUIDITY.firstSupportedPeriod);
  near(liquidity.totalDsraDrawnCr, SOLAR_LIQUIDITY.totalDsraDrawnCr, 1e-5, 'total DSRA draws');
  near(liquidity.totalDsraReplenishedCr, SOLAR_LIQUIDITY.totalDsraReplenishedCr, 1e-5, 'total DSRA replenishment');
  near(liquidity.dsraReleasedCr, SOLAR_LIQUIDITY.dsraReleasedCr, 1e-5, 'DSRA release');
  near(liquidity.uncoveredShortfallCr, SOLAR_LIQUIDITY.uncoveredShortfallCr, 1e-5, 'uncovered shortfall');
  near(liquidity.minLiquidityCoverage, SOLAR_LIQUIDITY.minLiquidityCoverage, 1e-9, 'minimum liquidity coverage');

  // The reserve is a liquidity source, not project cash flow: the contractual
  // ratio and the project lens must be identical with the facility on and off.
  near(solarSupported.operations.minDscr, SOLAR_LIQUIDITY.contractualMinDscr, 1e-6, 'contractual minimum DSCR');
  near(solarSupported.operations.averageDscr, solar.operations.averageDscr, 1e-12, 'supported average DSCR');
  near(solarSupported.funding.debtCr, solar.funding.debtCr, 1e-12, 'supported debt sizing');
  near(solarSupported.tax.totalTaxCr, solar.tax.totalTaxCr, 1e-12, 'supported total tax');
  near(solarSupported.npv.projectNpvCr, SOLAR_LIQUIDITY.projectNpvCr, 1e-5, 'supported project NPV');
  near(solarSupported.npv.equityNpvCr, SOLAR_LIQUIDITY.supportedEquityNpvCr, 1e-5, 'supported equity NPV');
  near(solarSupported.npv.equityIrrPct, SOLAR_LIQUIDITY.supportedEquityIrrPct, 1e-4, 'supported equity IRR');
});

test('both liquidity paths record the DSRA release in metadata and the booked cash flow', () => {
  const baseLast = solarPeriod(24);
  const baseEquity = solar.npv.cashFlows.equity.find((p) => p.period === 26);
  near(baseLast.dsraReleaseCr, solar.funding.initialDsraCr, 1e-9, 'support-off period-24 release');
  near(solar.operations.liquidity.dsraReleasedCr, solar.funding.initialDsraCr, 1e-9, 'support-off summary release');
  near(baseEquity.amountCr, 56.815775, 1e-6, 'support-off period-24 equity');
  near(
    baseLast.cfadsCr - baseLast.debtServiceCr + baseLast.dsraReleaseCr,
    baseEquity.amountCr,
    1e-9,
    'support-off equity identity at debt maturity',
  );

  const supportedLast = solarSupported.periods.find((p) => p.phase === 'operation'
    && p.operationalPeriod === 24);
  const supportedEquity = solarSupported.npv.cashFlows.equity.find((p) => p.period === 26);
  near(supportedLast.dsraReleaseCr, SOLAR_LIQUIDITY.dsraReleasedCr, 1e-5, 'support-on period-24 release');
  near(solarSupported.operations.liquidity.dsraReleasedCr, SOLAR_LIQUIDITY.dsraReleasedCr, 1e-5, 'support-on summary release');
  near(supportedEquity.amountCr, SOLAR_LIQUIDITY.dsraReleasedCr, 1e-5, 'support-on period-24 equity');
  near(
    supportedLast.cfadsCr - supportedLast.debtServiceCr
      + supportedLast.dsraDrawCr - supportedLast.dsraReplenishCr + supportedLast.dsraReleaseCr,
    supportedEquity.amountCr,
    1e-9,
    'support-on equity identity at debt maturity',
  );
});

test('the comparison entry point returns both paths and the first-period bridge', () => {
  const { comparison, base } = solarComparison;
  assert.equal(canonicalJSON(base), canonicalJSON(solar), 'support-off comparison path must be the base run');
  assert.equal(base.operations.liquidity.support, 'none');
  assert.equal(solarComparison.operations.liquidity.support, 'dsra-draw');
  assert.equal(comparison.firstPeriod, 1);
  near(comparison.firstPeriodGapCr, SOLAR_LIQUIDITY.firstPeriodGapCr, 1e-5, 'first-period gap');
  near(comparison.coveredByDsraCr, SOLAR_LIQUIDITY.coveredByDsraCr, 1e-5, 'first-period cover');
  near(comparison.off.firstPeriodCoverage, SOLAR_LIQUIDITY.firstPeriodCoverageOff, 1e-6, 'support-off first-period coverage');
  near(comparison.on.firstPeriodCoverage, SOLAR_LIQUIDITY.firstPeriodCoverageOn, 1e-9, 'support-on first-period coverage');
  near(comparison.off.contractualMinDscr, SOLAR_LIQUIDITY.contractualMinDscr, 1e-6, 'support-off contractual minimum');
  near(comparison.on.contractualMinDscr, SOLAR_LIQUIDITY.contractualMinDscr, 1e-6, 'support-on contractual minimum');
  assert.equal(comparison.contractualDscrIdentical, true);

  near(comparison.off.firstPeriodUncoveredCr, SOLAR_LIQUIDITY.firstPeriodGapCr, 1e-5, 'support-off first-period uncovered');
  near(comparison.on.firstPeriodUncoveredCr, 0, 1e-12, 'support-on first-period uncovered');
  near(comparison.off.uncoveredShortfallCr, SOLAR_LIQUIDITY.unsupportedUncoveredShortfallCr, 1e-5, 'support-off uncovered total');
  near(comparison.on.uncoveredShortfallCr, SOLAR_LIQUIDITY.uncoveredShortfallCr, 1e-5, 'support-on uncovered total');
  near(comparison.off.totalDsraDrawnCr, 0, 1e-12, 'support-off draws');
  near(comparison.on.totalDsraDrawnCr, SOLAR_LIQUIDITY.totalDsraDrawnCr, 1e-5, 'support-on draws');
  near(comparison.off.totalDsraReplenishedCr, 0, 1e-12, 'support-off replenishment');
  near(comparison.on.totalDsraReplenishedCr, SOLAR_LIQUIDITY.totalDsraReplenishedCr, 1e-5, 'support-on replenishment');
  near(comparison.off.dsraReleasedCr, SOLAR_EXPECTED.initialDsraCr, 1e-5, 'support-off release');
  near(comparison.on.dsraReleasedCr, SOLAR_LIQUIDITY.dsraReleasedCr, 1e-5, 'support-on release');
  near(comparison.off.projectNpvCr, SOLAR_LIQUIDITY.projectNpvCr, 1e-5, 'support-off project NPV');
  near(comparison.on.projectNpvCr, SOLAR_LIQUIDITY.projectNpvCr, 1e-5, 'support-on project NPV');
  near(comparison.off.equityNpvCr, SOLAR_EXPECTED.equityNpvCr, 1e-5, 'support-off equity NPV');
  near(comparison.on.equityNpvCr, SOLAR_LIQUIDITY.supportedEquityNpvCr, 1e-5, 'support-on equity NPV');
});

test('the memo prints the comparison as a table with the covenant sentence', () => {
  const memo = buildMemo(solarComparison, SOLAR_CASE);
  assert.ok(/Liquidity support, off versus on/i.test(memo.text));
  assert.ok(memo.text.includes('| Metric | Support off | Support on |'));
  assert.ok(memo.text.includes('| First-period gap before support (₹ crore) | 11.23 | 11.23 |'));
  assert.ok(memo.text.includes('| Covered by DSRA draw (₹ crore) | 0.00 | 11.23 |'));
  assert.ok(memo.text.includes('| First-period liquidity coverage | 0.82x | 1.00x |'));
  assert.ok(memo.text.includes('| Contractual minimum DSCR | 0.82x | 0.82x |'));
  assert.ok(/The facility makes the cash timing work but does not cure the covenant breach\./.test(memo.text));
});

test('DSRA draws and replenishments follow the independent support table', () => {
  for (const expected of SOLAR_LIQUIDITY.draws) {
    const period = solarSupported.periods.find((p) => p.phase === 'operation'
      && p.operationalPeriod === expected.period);
    near(period.dsraDrawCr, expected.drawCr, 1e-5, `period ${expected.period} draw`);
    near(period.dsraReplenishCr, expected.replenishCr, 1e-5, `period ${expected.period} replenish`);
    near(period.dsraReleaseCr, expected.releaseCr, 1e-5, `period ${expected.period} release`);
    if (expected.drawCr > 0) {
      near(period.liquidityDscr, 1, 1e-9, `period ${expected.period} liquidity coverage`);
      near(period.uncoveredShortfallCr, 0, 1e-12, `period ${expected.period} uncovered shortfall`);
    }
  }

  const operations = solarSupported.periods.filter((p) => p.phase === 'operation');
  for (const p of operations) {
    near(
      p.dsraOpeningCr - p.dsraDrawCr + p.dsraReplenishCr - p.dsraReleaseCr,
      p.dsraClosingCr,
      1e-9,
      `DSRA roll-forward period ${p.operationalPeriod}`,
    );
    assert.ok(p.dsraClosingCr >= -1e-9, `negative DSRA in period ${p.operationalPeriod}`);
  }
  near(operations[operations.length - 1].dsraClosingCr, 0, 1e-9, 'final DSRA balance');
  assert.ok(solarSupported.operations.llcrInclDsraAtCod > solarSupported.operations.llcrAtCod);
});

test('a zero reserve leaves the shortfall uncovered instead of reporting a cure', () => {
  const noReserve = runProject({ ...SOLAR_CASE, liquiditySupport: 'dsra-draw', dsraMonths: 0 });
  assert.equal(noReserve.operations.liquidity.totalDsraDrawnCr, 0);
  assert.ok(noReserve.operations.liquidity.uncoveredShortfallCr > 0);
  assert.equal(noReserve.operations.liquidity.firstSupportedPeriod, null);
  assert.ok(noReserve.warnings.some((w) => /uncovered/i.test(w)));
  const memo = buildMemo(noReserve, { ...SOLAR_CASE, liquiditySupport: 'dsra-draw', dsraMonths: 0 });
  assert.ok(/reserve is empty or too small/i.test(memo.text));
});

test('the memo reports the supported and unsupported liquidity paths separately', () => {
  const baseMemo = buildMemo(solar, SOLAR_CASE);
  assert.ok(/liquidity support/i.test(baseMemo.text));
  assert.ok(/switched off/i.test(baseMemo.text));
  assert.ok(/first debt-service shortfall is in operating period 1/i.test(baseMemo.text));

  const supportedMemo = buildMemo(solarSupported, { ...SOLAR_CASE, liquiditySupport: 'dsra-draw' });
  assert.ok(/DSRA is treated as a draw facility/i.test(supportedMemo.text));
  assert.ok(/contractual DSCR is unchanged/i.test(supportedMemo.text));
  assert.ok(/23\.31 crore/i.test(supportedMemo.text));
  assert.ok(/50\.83 crore is released/i.test(supportedMemo.text));
});

test('solar switching values reproduce the independent table', () => {
  assert.equal(solarSwitched.switching.rows.length, 12);
  for (const [parameter, table] of Object.entries(SOLAR_SWITCHING)) {
    checkSwitch(solarSwitched, SOLAR_CASE, parameter, 'minDscr', 1.0, table.minDscr1);
    checkSwitch(solarSwitched, SOLAR_CASE, parameter, 'minDscr', 1.05, table.minDscr105);
    checkSwitch(solarSwitched, SOLAR_CASE, parameter, 'minDscr', 1.15, table.minDscr115);
    checkSwitch(solarSwitched, SOLAR_CASE, parameter, 'projectNpvCr', 0, table.projectNpv);
  }
});

test('solar DSCR switches bind at the year-12 tax step, not the first period', () => {
  for (const parameter of ['tariff', 'capex']) {
    for (const threshold of [1.0, 1.05, 1.15]) {
      const row = switchRow(solarSwitched, parameter, 'minDscr', threshold);
      assert.equal(row.primary.bindingPeriod, 24, `${parameter} ${threshold} binding period`);
    }
  }
  const opex = switchRow(solarSwitched, 'opexFixedCrPerYear', 'minDscr', 1.0);
  assert.equal(opex.reachable, false);
  assert.ok(/no crossing/i.test(opex.reason));
});

test('solar memo names the first-period breach and the tariff switching boundary', () => {
  const memo = buildMemo(solarSwitched, SOLAR_CASE);
  assert.ok(/Solar IPP/i.test(memo.text));
  assert.ok(/does not cover debt service/i.test(memo.text));
  assert.ok(/PPA tariff/i.test(memo.text));
  assert.ok(/switching values/i.test(memo.text));
});

// ---------------------------------------------------------------------------
// Provenance, determinism and failure modes
// ---------------------------------------------------------------------------

test('every key input carries an evidence level', () => {
  for (const key of ['gearingPct', 'taxRegime', 'hamSupportPct', 'annualRevenueCr', 'wdvBlockPct', 'waccPct', 'liquiditySupport']) {
    assert.ok(result.provenance[key], `missing provenance for ${key}`);
    assert.ok(['verified', 'reported', 'benchmark', 'user', 'convention'].includes(result.provenance[key].status));
  }
  assert.equal(result.provenance.gearingPct.status, 'benchmark');
  assert.equal(result.provenance.taxRegime.status, 'reported');
  assert.equal(result.provenance.annualRevenueCr.status, 'user');
  assert.equal(result.provenance.waccPct.status, 'convention');
  assert.equal(result.provenance.liquiditySupport.status, 'convention');
});

test('the same inputs produce byte-identical results', () => {
  assert.equal(canonicalJSON(result), canonicalJSON(runProject(HAM_ROAD_CASE)));
});

test('negative CFADS is reported, not clamped', () => {
  const stressed = runProject({
    ...HAM_ROAD_CASE,
    annualRevenueCr: 6,
    opexFixedCrPerYear: 12,
  });
  assert.ok(stressed.operations.minDscr < 0, 'DSCR should be negative');
  assert.ok(stressed.warnings.some((w) => /negative|breach|cover/i.test(w)));
  assert.equal(stressed.operations.firstCoverBreachPeriod, 1);
});

test('zero revenue fails loudly', () => {
  assert.throws(
    () => runProject({ ...HAM_ROAD_CASE, annualRevenueCr: 0 }),
    /revenue/i,
  );
});

// ---------------------------------------------------------------------------
// Memo clauses
// ---------------------------------------------------------------------------

test('the memo is deterministic, labelled and carries the limitations clause', () => {
  const memo = buildMemo(result, HAM_ROAD_CASE);
  assert.ok(memo.text.includes('HAM highway golden case'));
  assert.ok(/minimum dscr/i.test(memo.text));
  assert.ok(/screening estimate/i.test(memo.text));
  assert.ok(/not a tev/i.test(memo.text));
  assert.ok(memo.sections.length >= 4);
  for (const section of memo.sections) {
    assert.ok(section.title && section.text, 'memo section is empty');
  }
  assert.equal(memo.text, buildMemo(runProject(HAM_ROAD_CASE), HAM_ROAD_CASE).text);
});

test('the memo leads with the breach when the case does not cover debt service', () => {
  const stressed = runProject({ ...HAM_ROAD_CASE, annualRevenueCr: 6 });
  const memo = buildMemo(stressed, { ...HAM_ROAD_CASE, annualRevenueCr: 6 });
  assert.ok(/does not cover|breach/i.test(memo.text));
});

test('the memo prints switching values and both valuation lenses', () => {
  const memo = buildMemo(switched, HAM_ROAD_CASE);
  assert.ok(/switching values/i.test(memo.text));
  assert.ok(/annual annuity.*fall 1\.53%/i.test(memo.text));
  assert.ok(/project npv/i.test(memo.text));
  assert.ok(/equity irr/i.test(memo.text));
});

// ---------------------------------------------------------------------------

if (failed > 0) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\n${passed} project-desk checks passed`);
