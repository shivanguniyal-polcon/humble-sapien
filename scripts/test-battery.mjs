// Verification for the Policy Battery. Constructed cases with hand-derived
// answers where arithmetic exists; determinism and gate behaviour everywhere
// else. Run: node scripts/test-battery.mjs

import {
  ingest, parseCSV, parseNumber, decisionTree, decisionTreeSample, cba, cbaSample,
  mcda, mcdaSample, scenario, scenarioSample, PMJAY_REFERENCE,
  cea, ceaSample, equity, equitySample, markov, markovSample,
  budgetImpact, budgetImpactSample, gameTheory, gameTheorySample,
  queueing, queueingSample, mmc, monteCarlo, monteCarloSample, mulberry32,
  budgetAt, avgClaimAt, simulate, evaluateSustainability,
  mcdaFromRows, scenarioFromRows,
  decisionTreeFromRows, ceaFromRows, equityFromRows, markovFromRows,
  budgetImpactFromRows, gameTheoryFromRows, queueingFromRows, monteCarloFromRows,
  buildManifest, verifyManifest, buildReport, checkPit, canonicalJSON,
} from '../src/battery/index.js';

let failures = 0;
function approx(name, got, want, tol = 1e-6) {
  const ok = got != null && Math.abs(got - want) <= tol;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}, want ${want}`);
}
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

// 1. Indian number parsing.
approx('parseNumber 1,23,456.78', parseNumber('1,23,456.78').value, 123456.78);
approx('parseNumber Rs 12,000', parseNumber('Rs 12,000').value, 12000);
approx('parseNumber (450) negative', parseNumber('(450)').value, -450);
approx('parseNumber 45% fraction', parseNumber('45%').value, 0.45);
ok('parseNumber rejects text', !parseNumber('abc').ok);
ok('parseNumber empty flagged', parseNumber('').empty);

// 2. CSV parsing: quotes, escapes, CRLF, ragged rows, duplicate headers.
{
  const t = 'a,a,b\r\n1,"x, y",3\r\n2,"say ""hi"""\r\n3,only\r\n';
  const p = parseCSV(t);
  ok('CSV duplicate headers renamed', p.header[1] === 'a (2)', p.header.join('|'));
  ok('CSV quoted comma cell', p.rows[0][1] === 'x, y', p.rows[0][1]);
  ok('CSV escaped quotes', p.rows[1][1] === 'say "hi"', p.rows[1][1]);
  ok('CSV short row padded', p.rows[2].length === 3 && p.rows[2][1] === 'only');
  ok('CSV ragged warnings present', p.warnings.length >= 2, p.warnings.join('; '));
}

// 3. Ingestion of JSON objects and schema detection.
{
  const { dataset, validation } = ingest(
    JSON.stringify([
      { block: 'A', households: '1,200', cost: '₹ 12,000' },
      { block: 'B', households: '980', cost: '13,000' },
    ]),
  );
  ok('JSON objects ingested', dataset.rowCount === 2 && dataset.columns.includes('cost'));
  const hh = validation.schema.find((c) => c.name === 'households');
  ok('Schema infers number with grouping commas', hh.type === 'number' && hh.min === 980 && hh.max === 1200);
  const blk = validation.schema.find((c) => c.name === 'block');
  ok('Schema infers category', blk.type === 'category', blk.type);
  ok('Ingestion reports no errors', validation.errors.length === 0);
}
{
  const { validation } = ingest('x,y\n1,2\nbad,3\n4.5,5\n');
  const x = validation.schema.find((c) => c.name === 'x');
  ok('Mixed numeric column flagged', x.type === 'mixed-number' && x.unparseable.includes('bad'));
}

// 4. Decision tree: exact fold-back.
//    A: chance 0.5*100 + 0.5*300 = 200. B: terminal 150. Root picks A (200).
{
  const input = {
    title: 't', root: 'd',
    nodes: [
      { id: 'd', type: 'decision', label: 'choose', children: ['c', 'b'] },
      { id: 'c', type: 'chance', label: 'risky', children: ['x', 'y'], probs: [0.5, 0.5] },
      { id: 'x', type: 'terminal', label: 'low', payoff: 100, pit: { group: 'g', effect: 'benefits' } },
      { id: 'y', type: 'terminal', label: 'high', payoff: 300, pit: { group: 'g', effect: 'benefits' } },
      { id: 'b', type: 'terminal', label: 'safe', payoff: 150, pit: { group: 'g', effect: 'mixed' } },
    ],
  };
  const v = decisionTree.validate(input);
  ok('Tree validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = decisionTree.run(input);
  approx('Tree root EV', r.rootEV, 200);
  ok('Tree picks the risky branch', r.optimalPath.join('>') === 'd>c>x', r.optimalPath.join('>'));
}
{
  const bad = {
    title: 't', root: 'c',
    nodes: [
      { id: 'c', type: 'chance', label: 'n', children: ['x', 'y'], probs: [0.9, 0.3] },
      { id: 'x', type: 'terminal', label: 'x', payoff: 1 },
      { id: 'y', type: 'terminal', label: 'y', payoff: 2 },
    ],
  };
  const v = decisionTree.validate(bad);
  ok('Probabilities not summing to 1 rejected', v.errors.some((e) => e.includes('add up to')));
  ok('Leaf without PIT flagged', v.warnings.some((w) => w.includes('distributional')));
}

// 5. CBA: hand-computed NPV/BCR and exact IRR.
//    Cost 100 at t0; benefits 60 at t1 and t2; discount 10%.
//    NPV = -100 + 60/1.1 + 60/1.21 = 4.132231404958677
//    BCR = 104.13223140495868 / 100
{
  const input = {
    title: 't', baseYear: 2026, horizonYears: 2,
    lines: [
      { id: 'c', label: 'cost', kind: 'cost', priced: true, schedule: [{ year: 0, value: 100 }] },
      { id: 'b', label: 'benefit', kind: 'benefit', priced: true, schedule: [{ year: 1, value: 60 }, { year: 2, value: 60 }] },
    ],
  };
  const v = cba.validate(input);
  ok('CBA validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = cba.run(input, { discountRate: 0.1 });
  approx('CBA NPV', r.npv, -100 + 60 / 1.1 + 60 / 1.21);
  approx('CBA BCR', r.bcr, (60 / 1.1 + 60 / 1.21) / 100);
  approx('CBA PV cost', r.pvCost, 100);
  ok('CBA discounted payback year 2', r.discountedPaybackYear === 2, String(r.discountedPaybackYear));
  ok('CBA sensitivity has 6 scenarios', r.scenarios.length === 6, String(r.scenarios.length));
}
{
  const input = {
    title: 't', baseYear: 2026, horizonYears: 1,
    lines: [
      { id: 'c', label: 'cost', kind: 'cost', priced: true, schedule: [{ year: 0, value: 100 }] },
      { id: 'b', label: 'benefit', kind: 'benefit', priced: true, schedule: [{ year: 1, value: 110 }] },
    ],
  };
  const r = cba.run(input, { discountRate: 0.05 });
  approx('CBA IRR exact 10%', r.irr, 0.1, 1e-9);
  ok('CBA payback year 1', r.paybackYear === 1, String(r.paybackYear));
}

// 6. Manifest determinism and verification.
{
  const input = { title: 't', root: 'n', nodes: [{ id: 'n', type: 'terminal', label: 'n', payoff: 5, pit: { group: 'g', effect: 'mixed' } }] };
  const params = { discountRate: 0.03 };
  const results = decisionTree.run(input);
  const m1 = await buildManifest({ module: 'decision-tree', input, params, results });
  const m2 = await buildManifest({ module: 'decision-tree', input, params, results: decisionTree.run(input) });
  ok('Manifest input hash stable', m1.inputHash === m2.inputHash);
  ok('Manifest output hash stable across re-runs', m1.outputHash === m2.outputHash);
  const m3 = await buildManifest({ module: 'decision-tree', input, params: { discountRate: 0.05 }, results });
  ok('Param change changes param hash', m1.paramHash !== m3.paramHash);
  const v = await verifyManifest(m1, { input, params, results });
  ok('verifyManifest confirms a clean run', v.inputMatches && v.paramsMatch && v.outputMatches);
  const tampered = await verifyManifest(m1, { input, params: { discountRate: 0.05 }, results });
  ok('verifyManifest catches tampering', !tampered.paramsMatch);
  ok('Canonical JSON key order independent',
    canonicalJSON({ b: 1, a: 2 }) === canonicalJSON({ a: 2, b: 1 }));
}

// 7. Report gate: PIT answers are mandatory, then the artefacts carry them.
{
  const input = decisionTreeSample;
  const params = { values: {}, meta: {} };
  const results = decisionTree.run(input);
  let threw = false;
  try {
    await buildReport({ module: decisionTree, input, params, results, pit: { whoBenefits: '', whoPays: '', whoMissing: '' } });
  } catch (e) {
    threw = e.message.includes('Public interest check incomplete');
  }
  ok('Report refuses to build without PIT answers', threw);

  const report = await buildReport({
    module: decisionTree, input, params, results,
    pit: { whoBenefits: 'Households', whoPays: 'The state budget', whoMissing: 'Non-eligible near-poor' },
  });
  ok('Report HTML carries the PIT section', report.html.includes('Public interest check') && report.html.includes('Non-eligible near-poor'));
  ok('Report HTML carries the manifest', report.html.includes(report.manifest.outputHash));
  ok('Report HTML carries the module-rendered results',
    report.html.includes('Expected value at the root') && !report.html.includes('undefined</h2>') && !report.html.includes('\n  undefined\n'),
    'results section rendered from the module');
  ok('Report JSON has the manifest', report.json.manifest.outputHash === report.manifest.outputHash);
  ok('checkPit reports completeness', checkPit({ whoBenefits: 'x', whoPays: 'y', whoMissing: 'z' }).complete);
}

// 8. The shipped samples themselves must pass their own gates.
{
  const v1 = cba.validate(cbaSample);
  ok('CBA sample validates', v1.errors.length === 0, v1.errors.join('; '));
  const r = cba.run(cbaSample, { discountRate: 0.03 });
  ok('CBA sample runs', Number.isFinite(r.npv), `NPV ${Math.round(r.npv)}`);
  const v2 = decisionTree.validate(decisionTreeSample);
  ok('Tree sample validates', v2.errors.length === 0, v2.errors.join('; '));
}

// 9. MCDA: exact constructed cases with hand-derived flip points.
//    k1 (w 0.5), k2 (w 0.3), k3 (w 0.2), all benefit.
//    X (10,0,0) -> 5, Y (0,10,0) -> 3, Z (0,0,10) -> 2. Leader X.
//    Flip derivation (challenger Y, criterion k2):
//      rest_X = 5 (X's k1 contribution), rest_Y = 0 (Y scores zero outside k2);
//      the other weights renormalise over 1 - 0.3 = 0.7.
//      Tie when x*0 + (1-x)*5/0.7 = x*10 + (1-x)*0, i.e. x = 5/12.
//      Distance from 0.3 is 7/60, and that is the smallest one-weight move.
{
  const input = {
    title: 't', method: 'weighted-sum',
    criteria: [
      { id: 'k1', label: 'K1', weight: 0.5, direction: 'benefit', group: 'G1', who: 'A' },
      { id: 'k2', label: 'K2', weight: 0.3, direction: 'benefit', group: 'G2', who: 'B' },
      { id: 'k3', label: 'K3', weight: 0.2, direction: 'benefit', group: 'G1', who: 'C' },
    ],
    alternatives: [
      { id: 'X', label: 'X', scores: { k1: 10, k2: 0, k3: 0 }, pit: { group: 'g', effect: 'benefits' } },
      { id: 'Y', label: 'Y', scores: { k1: 0, k2: 10, k3: 0 }, pit: { group: 'g', effect: 'mixed' } },
      { id: 'Z', label: 'Z', scores: { k1: 0, k2: 0, k3: 10 }, pit: { group: 'g', effect: 'restricted' } },
    ],
  };
  const v = mcda.validate(input);
  ok('MCDA validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = mcda.run(input);
  approx('MCDA total X', r.alternatives[0].total, 5);
  approx('MCDA total Y', r.alternatives[1].total, 3);
  approx('MCDA total Z', r.alternatives[2].total, 2);
  ok('MCDA ranks X first', r.alternatives[0].rank === 1, String(r.alternatives[0].rank));
  approx('MCDA lead margin', r.leadMargin, 2);
  ok('MCDA flip names criterion k2 and challenger Y',
    r.flip.criterion === 'k2' && r.flip.challenger === 'Y',
    `${r.flip.criterion} / ${r.flip.challenger}`);
  approx('MCDA flip point is exactly 5/12', r.flip.to, 5 / 12, 1e-12);
  approx('MCDA flip distance is exactly 7/60', r.flip.distance, 7 / 60, 1e-12);
  approx('MCDA attribution G1 for X', r.alternatives[0].byGroup.G1, 5);
  approx('MCDA attribution G2 for X', r.alternatives[0].byGroup.G2, 0);
}
{
  // min-max case: A1 (100, 10), A2 (50, 20); c1 benefit, c2 cost; w 0.5/0.5.
  // A1 normalises to (1, 1) -> 1.0 exactly; A2 to (0, 0) -> 0.
  const input = {
    title: 't', method: 'minmax',
    criteria: [
      { id: 'c1', label: 'C1', weight: 0.5, direction: 'benefit', group: 'G', who: 'w' },
      { id: 'c2', label: 'C2', weight: 0.5, direction: 'cost', group: 'G', who: 'w' },
    ],
    alternatives: [
      { id: 'A1', label: 'A1', scores: { c1: 100, c2: 10 }, pit: { group: 'g', effect: 'benefits' } },
      { id: 'A2', label: 'A2', scores: { c1: 50, c2: 20 }, pit: { group: 'g', effect: 'restricted' } },
    ],
  };
  const r = mcda.run(input);
  approx('MCDA minmax total A1', r.alternatives[0].total, 1);
  approx('MCDA minmax total A2', r.alternatives[1].total, 0);
  ok('MCDA minmax has no flip inside the weights',
    r.flip === null || r.flip.distance > 0, r.flip ? String(r.flip.distance) : 'null');
}
{
  // Cost criteria negate in weighted-sum, and ties share rank 1.
  const input = {
    title: 't', method: 'weighted-sum',
    criteria: [
      { id: 'c', label: 'Cost', weight: 0.5, direction: 'cost', group: 'G', who: 'w' },
      { id: 'b', label: 'Benefit', weight: 0.5, direction: 'benefit', group: 'G', who: 'w' },
    ],
    alternatives: [
      { id: 'A', label: 'A', scores: { c: 2, b: 4 }, pit: { group: 'g', effect: 'benefits' } },
      { id: 'B', label: 'B', scores: { c: 8, b: 4 }, pit: { group: 'g', effect: 'mixed' } },
    ],
  };
  const r = mcda.run(input);
  approx('MCDA cost criterion negates (A)', r.alternatives[0].total, 0.5 * -2 + 0.5 * 4);
  approx('MCDA cost criterion negates (B)', r.alternatives[1].total, 0.5 * -8 + 0.5 * 4);
  const tieInput = {
    title: 't', method: 'weighted-sum',
    criteria: input.criteria,
    alternatives: [
      { id: 'P', label: 'P', scores: { c: 5, b: 5 }, pit: { group: 'g', effect: 'mixed' } },
      { id: 'Q', label: 'Q', scores: { c: 5, b: 5 }, pit: { group: 'g', effect: 'mixed' } },
    ],
  };
  const rt = mcda.run(tieInput);
  ok('MCDA ties share rank 1', rt.alternatives[0].rank === 1 && rt.alternatives[1].rank === 1,
    `${rt.alternatives[0].rank}/${rt.alternatives[1].rank}`);
}
{
  // Loud validation: missing scores and unknown methods are errors.
  const bad = {
    title: 't', method: 'magic',
    criteria: [{ id: 'c', label: 'C', weight: 1, direction: 'sideways' }],
    alternatives: [{ id: 'A', label: 'A', scores: {} }],
  };
  const v = mcda.validate(bad);
  ok('MCDA rejects unknown method', v.errors.some((e) => e.includes('Unknown method')));
  ok('MCDA rejects unknown direction', v.errors.some((e) => e.includes('benefit')));
  ok('MCDA rejects missing scores', v.errors.some((e) => e.includes('no numeric score')));
  ok('MCDA warns on missing distributional column', v.warnings.some((w) => w.includes('distributional')));
}

// 10. Scenario: exact constructed cases against the model formulas.
{
  const p = PMJAY_REFERENCE.params;
  approx('Budget ramp at launch is 0.4x base', budgetAt(0, p), 0.4 * 22500);
  approx('Budget ramp at year 5 is the full base', budgetAt(5, p), 22500);
  approx('Budget grows after the ramp', budgetAt(6, p), 22500 * 1.1);
  approx('Average claim path at year 7', avgClaimAt(7, p), 10180 * Math.pow(1.0785, 7));
}
{
  // Degenerate configuration where the fund integrates a linear budget ramp:
  // RK4 is exact for linear right-hand sides, so the closed-form answer is
  // fund = initial + base * integral(0.4 + 0.6t/5) over [0,5] = 2000 + 3.5*base.
  const p = {
    ...PMJAY_REFERENCE.params,
    tEnd: PMJAY_REFERENCE.params.tStart + 5,
    targetPopulation: 0.1, initialEnrolled: 0.1,
    enrollmentRate: 0, enrollmentDecay: 0, claimRatePerEnrolled: 0,
    fraudRate: 0, hospitalJoinRate: 0, hospitalAttritionRate: 0,
  };
  const months = simulate(p);
  const last = months[months.length - 1];
  approx('Fund integrates the linear budget ramp exactly', last.fund, 2000 + 22500 * 3.5, 1e-6);
  approx('Zero claims means zero paid', last.claimsPaid, 0);
}
{
  // Hand-built monthly series for the sustainability criteria.
  const p = {
    ...PMJAY_REFERENCE.params,
    tStart: 0, tEnd: 2, warmupYears: 1, prFloorTarget: 0.85,
    targetPopulation: 100, initialFund: 0,
  };
  const months = [
    { t: 0, enrolled: 10, fund: 0, paymentRatio: 1, claimsPaid: 100, claimsBilled: 100 },
    { t: 1, enrolled: 20, fund: 0, paymentRatio: 0.9, claimsPaid: 90, claimsBilled: 100 },
    { t: 2, enrolled: 30, fund: 0, paymentRatio: 0.8, claimsPaid: 80, claimsBilled: 100 },
  ];
  const s = evaluateSustainability(months, p);
  approx('Sustainability pr floor over the warm window', s.prFloor, 0.8);
  ok('Sustainability breach months counted after warm-up', s.prBreachMonths === 1, String(s.prBreachMonths));
  approx('Sustainability rationing onset', s.rationingOnset, 1);
  approx('Sustainability coverage', s.coverage2035, 30);
  approx('Sustainability net expenditure is the trapezoid of payments', s.netExpenditure, 95 + 85);
  approx('Rationing burden is the unpaid claims area', s.unpaidClaims, 5 + 15);
  approx('Unpaid share of billed', s.unpaidShare, 20 / 200);
  ok('Sustainability verdict fails below the floor', s.verdict === 'FAIL', s.verdict);
}
{
  const v = scenario.validate(scenarioSample);
  ok('Scenario sample validates', v.errors.length === 0, v.errors.join('; '));
  ok('Scenario sample has no distributional gaps', v.warnings.filter((w) => w.includes('distributional')).length === 0);
  const bad = {
    title: 't',
    scenarios: [
      { id: 'a', label: 'A', drivers: { madeUpDriver: 3 } },
      { id: 'a', label: 'A again', drivers: {} },
    ],
  };
  const vb = scenario.validate(bad);
  ok('Scenario rejects unknown drivers', vb.errors.some((e) => e.includes('madeUpDriver')));
  ok('Scenario rejects duplicate ids', vb.errors.some((e) => e.includes('unique')));
  ok('Scenario warns on a single scenario', scenario.validate({ scenarios: [{ id: 'x', label: 'X', drivers: {} }] }).warnings.some((w) => w.includes('baseline')));
}

// 11. Cross-check against the Python reference model.
//     Reference values generated by running Ayushman_Bharat_SD_Model.py with
//     pmjay_calibrated_params.json (scipy 1.13.1, RK45, max_step 0.1). This
//     port integrates fixed-step RK4 at half-monthly steps and samples one
//     extra month at t=2035 (the Python arange stops at 2034.92), so small
//     systematic gaps are expected and bounded below. A porting bug in the
//     money conversion or a flow equation shows up as a 10x or 30% error, far
//     outside these tolerances.
{
  const PYTHON_REFERENCE = {
    baseline: { prFloor: 0.5397248543, prBreachMonths: 122, rationingOnset: 2024.8333, coverage2035: 65.6105, netExpenditure: 557756.9, finalFraud: 66664.0, requiredBudgetGrowth: 0.4541015625, verdict: 'FAIL' },
    fraud_control: { prFloor: 0.5699003035, prBreachMonths: 119, rationingOnset: 2025.0833, coverage2035: 65.6105, netExpenditure: 582047.4, finalFraud: 13622.4, requiredBudgetGrowth: 0.3918945313, verdict: 'FAIL' },
    hospital_expansion: { prFloor: 0.4955740497, prBreachMonths: 144, rationingOnset: 2023.0, coverage2035: 70.4812, netExpenditure: 561092.9, finalFraud: 72497.4, requiredBudgetGrowth: 0.8, verdict: 'FAIL' },
    combined: { prFloor: 0.5261625050, prBreachMonths: 139, rationingOnset: 2023.4167, coverage2035: 70.4812, netExpenditure: 586587.3, finalFraud: 14662.9, requiredBudgetGrowth: 0.8, verdict: 'FAIL' },
  };
  const t0 = Date.now();
  const r = scenario.run(scenarioSample);
  ok('Scenario reference case runs in one pass', r.scenarios.length === 4);
  ok('Scenario run stays interactive (under 10s for 4 scenarios with budget bisection)', Date.now() - t0 < 10000, `${Date.now() - t0}ms`);
  for (const s of r.scenarios) {
    const ref = PYTHON_REFERENCE[s.id];
    approx(`Port matches Python: ${s.id} payment-ratio floor`, s.metrics.prFloor, ref.prFloor, 0.005);
    ok(`Port matches Python: ${s.id} breach months within 2`, Math.abs(s.metrics.prBreachMonths - ref.prBreachMonths) <= 2,
      `${s.metrics.prBreachMonths} vs ${ref.prBreachMonths}`);
    ok(`Port matches Python: ${s.id} rationing onset within a quarter year`, Math.abs(s.metrics.rationingOnset - ref.rationingOnset) <= 0.25,
      `${s.metrics.rationingOnset} vs ${ref.rationingOnset}`);
    ok(`Port matches Python: ${s.id} coverage within 0.1pp`, Math.abs(s.metrics.coverage2035 - ref.coverage2035) <= 0.1,
      `${s.metrics.coverage2035} vs ${ref.coverage2035}`);
    ok(`Port matches Python: ${s.id} net expenditure within 2%`, Math.abs(s.metrics.netExpenditure / ref.netExpenditure - 1) <= 0.02,
      `${s.metrics.netExpenditure} vs ${ref.netExpenditure}`);
    ok(`Port matches Python: ${s.id} final fraud within 2%`, Math.abs(s.metrics.finalFraud / ref.finalFraud - 1) <= 0.02,
      `${s.metrics.finalFraud} vs ${ref.finalFraud}`);
    approx(`Port matches Python: ${s.id} required budget growth`, s.metrics.requiredBudgetGrowth, ref.requiredBudgetGrowth, 0.005);
    ok(`Port matches Python: ${s.id} verdict`, s.metrics.verdict === ref.verdict, s.metrics.verdict);
    ok(`Port matches Python: ${s.id} rationing burden is positive`, s.metrics.unpaidClaims > 0, String(Math.round(s.metrics.unpaidClaims)));
  }
  ok('Port and Python agree the envelope is unattainable within 0 to 80% for expansion scenarios',
    r.scenarios.filter((s) => !s.metrics.requiredBudgetAttained).map((s) => s.id).join(',') === 'hospital_expansion,combined');
}
{
  // Determinism: re-running the whole scenario engine reproduces the output
  // hash exactly, and a driver change is visible in the manifest.
  const r1 = scenario.run(scenarioSample);
  const r2 = scenario.run(scenarioSample);
  const m1 = await buildManifest({ module: 'scenario', input: scenarioSample, params: {}, results: r1 });
  const m2 = await buildManifest({ module: 'scenario', input: scenarioSample, params: {}, results: r2 });
  ok('Scenario output hash stable across re-runs', m1.outputHash === m2.outputHash);
  const changed = JSON.parse(JSON.stringify(scenarioSample));
  changed.scenarios[1].drivers.fraudRate = 0.05;
  const r3 = scenario.run(changed);
  const m3 = await buildManifest({ module: 'scenario', input: changed, params: {}, results: r3 });
  ok('Scenario driver change changes the output hash', m1.outputHash !== m3.outputHash);
  ok('MCDA sample validates', mcda.validate(mcdaSample).errors.length === 0, mcda.validate(mcdaSample).errors.join('; '));
  const mr = mcda.run(mcdaSample);
  ok('MCDA sample runs with a named leader', mr.alternatives.some((a) => a.rank === 1), JSON.stringify(mr.alternatives.map((a) => a.rank)));
}

// 12. Adapters: ingested tables become module inputs deterministically.
{
  const csv = [
    'alternative,criterion,score,weight,direction,group,who,pit_group,pit_effect',
    'A,c1,10,0.5,benefit,G,who A,Group A,benefits',
    'A,c2,2,0.5,cost,G,who B,Group A,benefits',
    'B,c1,5,0.5,benefit,G,who A,Group B,mixed',
    'B,c2,8,0.5,cost,G,who B,Group B,mixed',
  ].join('\n');
  const { dataset, validation } = ingest(csv);
  ok('MCDA CSV ingests without errors', validation.errors.length === 0, validation.errors.join('; '));
  const { input, notes } = mcdaFromRows(dataset, { title: 't' });
  ok('MCDA adapter builds 2 alternatives and 2 criteria',
    input.alternatives.length === 2 && input.criteria.length === 2, notes.join('; '));
  const r = mcda.run(input);
  approx('MCDA adapter total A (weighted-sum)', r.alternatives[0].total, 0.5 * 10 - 0.5 * 2);
  approx('MCDA adapter total B (weighted-sum)', r.alternatives[1].total, 0.5 * 5 - 0.5 * 8);
  ok('MCDA adapter keeps the distributional column', input.alternatives[0].pit.group === 'Group A');
}
{
  const csv = [
    'scenario_id,scenario_label,driver,value,pit_group,pit_effect',
    'baseline,Baseline,fraudRate,0.13,Enrolled households,restricted',
    'fraud,Fraud control,fraudRate,0.10,Enrolled households,benefits',
  ].join('\n');
  const { dataset, validation } = ingest(csv);
  ok('Scenario CSV ingests without errors', validation.errors.length === 0, validation.errors.join('; '));
  const { input, notes } = scenarioFromRows(dataset, { title: 't' });
  ok('Scenario adapter builds 2 scenarios', input.scenarios.length === 2, notes.join('; '));
  const v = scenario.validate(input);
  ok('Scenario adapter output validates', v.errors.length === 0, v.errors.join('; '));
  const r = scenario.run(input);
  ok('Scenario adapter runs both scenarios', r.scenarios.length === 2 && r.scenarios[1].metrics.prFloor !== r.scenarios[0].metrics.prFloor);
}

// 12b. Adapters for the remaining eight modules: every module can start from
// a pasted table, and each adapter's output passes its own validator.
{
  const csv = [
    'node_id,node_type,label,children,probs,payoff,root,pit_group,pit_effect',
    'd1,decision,Empanel,c1;b1,,,true,',
    'c1,chance,Under the scheme,t1;t2,0.6;0.4,,,',
    't1,terminal,High take-up,,,100,,Eligible households,benefits',
    't2,terminal,Low take-up,,,300,,Eligible households,benefits',
    'b1,terminal,Do not empanel,,,150,,Paying patients,mixed',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = decisionTreeFromRows(dataset, { title: 't' });
  ok('Tree adapter builds the node list', input && input.nodes.length === 5, notes.join('; '));
  ok('Tree adapter reads the root column', input.root === 'd1', input.root);
  const v = decisionTree.validate(input);
  ok('Tree adapter output validates', v.errors.length === 0, v.errors.join('; '));
  approx('Tree adapter root EV (0.6*100 + 0.4*300)', decisionTree.run(input).rootEV, 180);
}
{
  const csv = [
    'alternative,label,cost,effect,threshold,effect_unit,pit_group,pit_effect',
    'a,A,100,1.0,250,units,g,benefits',
    'b,B,400,2.0,250,units,g,mixed',
    'c,C,500,3.0,250,units,g,benefits',
    'd,D,600,2.5,250,units,g,restricted',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = ceaFromRows(dataset, { title: 't' });
  ok('CEA adapter builds 4 alternatives', input && input.alternatives.length === 4, notes.join('; '));
  const v = cea.validate(input);
  ok('CEA adapter output validates', v.errors.length === 0, v.errors.join('; '));
  const r = cea.run(input);
  ok('CEA adapter ladder leaves A and C on the path', r.frontierIds.join(',') === 'a,c', r.frontierIds.join(','));
  ok('CEA adapter picks C at threshold 250', r.best === 'c', r.best);
}
{
  const { dataset } = ingest('alternative,cost,effect\nx,1,2\n');
  const { input, notes } = ceaFromRows(dataset);
  ok('CEA adapter refuses a table without a threshold', input === null && notes.join(' ').includes('threshold'), notes.join('; '));
}
{
  const csv = [
    'line_id,label,kind,group_id,group_label,population_share,weight,year,value,horizon_years,discount_rate,pit_group,pit_effect',
    'ben,Time saved,benefit,g1,Group one,0.4,2,1,1000,2,0.05,Group one,benefits',
    'ben,Time saved,benefit,g1,Group one,0.4,2,2,1000,2,0.05,Group one,benefits',
    'ben2,Time saved,benefit,g2,Group two,0.6,1,1,500,2,0.05,Group two,mixed',
    'ben2,Time saved,benefit,g2,Group two,0.6,1,2,500,2,0.05,Group two,mixed',
    'cost1,Tariff,cost,g1,Group one,0.4,2,0,300,2,0.05,Group one,benefits',
    'cost2,Tariff,cost,g2,Group two,0.6,1,0,200,2,0.05,Group two,mixed',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = equityFromRows(dataset, { title: 't' });
  ok('Equity adapter builds 2 groups and 4 lines', input.groups.length === 2 && input.lines.length === 4, notes.join('; '));
  const v = equity.validate(input);
  ok('Equity adapter output validates', v.errors.length === 0, v.errors.join('; '));
  const r = equity.run(input);
  approx('Equity adapter plain NPV', r.totalNpv,
    (1000 / 1.05 + 1000 / 1.1025 - 300) + (500 / 1.05 + 500 / 1.1025 - 200));
}
{
  const csv = [
    'state,label,cost_per_cycle,utility_per_cycle,absorbing,initial,cycles,cycle_years,discount_rate,stable,dead',
    'stable,Stable,100,0.8,false,1,3,1,0,0.9,0.1',
    'dead,Dead,0,0,true,0,3,1,0,0,1',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = markovFromRows(dataset, { title: 't' });
  ok('Markov adapter builds a square matrix',
    input.states.length === 2 && input.transitions.length === 2 && input.transitions[0].length === 2, notes.join('; '));
  const v = markov.validate(input);
  ok('Markov adapter output validates', v.errors.length === 0, v.errors.join('; '));
  ok('Markov adapter traces every cycle', markov.run(input).trace.length === 4);
}
{
  const csv = [
    'line_type,label,year,value,horizon_years,eligible_population,population_growth',
    'uptake,,1,0.5,2,1000,0',
    'uptake,,2,0.8,2,1000,0',
    'per_patient_cost,,1,100,2,1000,0',
    'per_patient_cost,,2,120,2,1000,0',
    'offset,Averted travel,1,20,2,1000,0',
    'offset,Averted travel,2,25,2,1000,0',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = budgetImpactFromRows(dataset, { title: 't' });
  ok('Budget adapter builds the year arrays',
    input.uptake.join(',') === '0.5,0.8' && input.perPatientCost.join(',') === '100,120', notes.join('; '));
  const v = budgetImpact.validate(input);
  ok('Budget adapter output validates', v.errors.length === 0, v.errors.join('; '));
  approx('Budget adapter year-1 net', budgetImpact.run(input).rows[0].net, 1000 * 0.5 * (100 - 20));
}
{
  const csv = [
    'row_strategy,col_strategy,payoff_row,payoff_col,player_row,player_col,pit_group,pit_effect',
    'Hold rate,Accept cap,6,5,District hospital,Private provider,Patients,benefits',
    'Hold rate,Refuse cap,2,6,District hospital,Private provider,Patients,restricted',
    'Raise rate,Accept cap,4,3,District hospital,Private provider,State budget,restricted',
    'Raise rate,Refuse cap,1,2,District hospital,Private provider,Patients,restricted',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = gameTheoryFromRows(dataset, { title: 't' });
  ok('Game adapter builds the 2x2 grid', input.outcomes.length === 4 && input.players[0].strategies.length === 2, notes.join('; '));
  const v = gameTheory.validate(input);
  ok('Game adapter output validates', v.errors.length === 0, v.errors.join('; '));
  const r = gameTheory.run(input);
  ok('Game adapter finds the single equilibrium',
    r.equilibria.length === 1 && r.equilibria[0].rowStrategy === 'Hold rate' && r.equilibria[0].colStrategy === 'Refuse cap',
    JSON.stringify(r.equilibria));
}
{
  const csv = 'arrival_rate,service_rate,servers,time_unit,pit_group,pit_effect\n42,50,1,hour,Daily-wage patients,restricted\n';
  const { dataset } = ingest(csv);
  const { input, notes } = queueingFromRows(dataset, { title: 't' });
  ok('Queue adapter reads the scenario', input.arrivalRate === 42 && input.servers === 1, notes.join('; '));
  const v = queueing.validate(input);
  ok('Queue adapter output validates', v.errors.length === 0, v.errors.join('; '));
  approx('Queue adapter average wait before service', queueing.run(input).wq, 0.105);
}
{
  const csv = [
    'variable_id,label,kind,dist,min,max,mean,sd,scale,runs,seed',
    'capex,Capital cost,cost,uniform,100,200,,,,500,42',
    'benefit,Health benefit,benefit,normal,,,500,10,,500,42',
  ].join('\n');
  const { dataset } = ingest(csv);
  const { input, notes } = monteCarloFromRows(dataset, { title: 't' });
  ok('Monte Carlo adapter builds 2 variables',
    input.variables.length === 2 && input.runs === 500 && input.seed === 42, notes.join('; '));
  const v = monteCarlo.validate(input);
  ok('Monte Carlo adapter output validates', v.errors.length === 0, v.errors.join('; '));
  const a = monteCarlo.run(input);
  const b = monteCarlo.run(input);
  approx('Monte Carlo adapter is seeded and reproducible', a.mean, b.mean, 0);
}

// 13. CEA: hand-derived dominance ladder.
//     A (100, 1.0), B (400, 2.0), C (500, 3.0), D (600, 2.5).
//     D is strictly dominated by C. ICERs: B vs A = 300, C vs B = 100, so B
//     is extendedly dominated and the path is A to C at 200 per unit.
//     NMB at threshold 250: A 150, B 100, C 250, so C wins.
{
  const input = {
    title: 't', effectUnit: 'units', threshold: 250,
    alternatives: [
      { id: 'a', label: 'A', cost: 100, effect: 1.0, pit: { group: 'g', effect: 'benefits' } },
      { id: 'b', label: 'B', cost: 400, effect: 2.0, pit: { group: 'g', effect: 'mixed' } },
      { id: 'c', label: 'C', cost: 500, effect: 3.0, pit: { group: 'g', effect: 'benefits' } },
      { id: 'd', label: 'D', cost: 600, effect: 2.5, pit: { group: 'g', effect: 'restricted' } },
    ],
  };
  const v = cea.validate(input);
  ok('CEA validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = cea.run(input);
  const row = (id) => r.alternatives.find((x) => x.id === id);
  ok('CEA marks D strictly dominated', row('d').status === 'strictly dominated', row('d').status);
  ok('CEA marks B extendedly dominated', row('b').status === 'extendedly dominated', row('b').status);
  ok('CEA marks A the reference option', row('a').status === 'reference option' && row('a').icer === null);
  approx('CEA incremental ratio on the path (C)', row('c').icer, 200);
  approx('CEA average ratio (A)', row('a').acer, 100);
  approx('CEA net benefit at threshold (C)', row('c').nmb, 250 * 3 - 500);
  ok('CEA picks C by net benefit', r.best === 'c', r.best);
  ok('CEA does not mutate its input', !('icer' in input.alternatives[0]) && !('status' in input.alternatives[0]));
  const m1 = await buildManifest({ module: 'cea', input: JSON.parse(JSON.stringify(input)), params: {}, results: r });
  const m2 = await buildManifest({ module: 'cea', input: JSON.parse(JSON.stringify(input)), params: {}, results: cea.run(JSON.parse(JSON.stringify(input))) });
  ok('CEA manifest stable across re-parsed clones', m1.outputHash === m2.outputHash && m1.inputHash === m2.inputHash);
}

// 14. Equity CBA: hand-derived weighted and per-capita totals.
//     G1 share 0.4 weight 2 with benefit 100 at year 0;
//     G2 share 0.6 weight 1 with benefit 50 at year 0; discount 0.
//     total 150; weighted 2*100 + 1*50 = 250; per capita 250 and 83.33.
{
  const input = {
    title: 't', horizonYears: 1, discountRate: 0,
    groups: [
      { id: 'g1', label: 'G1', populationShare: 0.4, weight: 2, pit: { group: 'G1 people', effect: 'benefits' } },
      { id: 'g2', label: 'G2', populationShare: 0.6, weight: 1, pit: { group: 'G2 people', effect: 'mixed' } },
    ],
    lines: [
      { id: 'b1', label: 'Benefit to G1', kind: 'benefit', group: 'g1', schedule: [{ year: 0, value: 100 }] },
      { id: 'b2', label: 'Benefit to G2', kind: 'benefit', group: 'g2', schedule: [{ year: 0, value: 50 }] },
    ],
  };
  const v = equity.validate(input);
  ok('Equity CBA validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = equity.run(input);
  approx('Equity total NPV', r.totalNpv, 150);
  approx('Equity weighted NPV', r.weightedNpv, 250);
  approx('Equity per-capita NPV (G1)', r.groups[0].perCapitaNpv, 250);
  approx('Equity per-capita NPV (G2)', r.groups[1].perCapitaNpv, 50 / 0.6, 1e-9);
  approx('Equity benefit share (G1)', r.groups[0].benefitShare, 100 / 150, 1e-9);
  ok('Equity totals agree in sign', r.agreement === 'agree', r.agreement);
  const discounted = equity.run({
    ...input, discountRate: 0.1,
    lines: [{ id: 'b', label: 'Benefit later', kind: 'benefit', group: 'g1', schedule: [{ year: 1, value: 110 }] }],
  });
  approx('Equity discounts one year exactly', discounted.groups[0].npv, 100, 1e-9);
}

// 15. Markov: hand-built two-state trace.
//     A (cost 10, utility 1), B (cost 0, utility 0), matrix [[0.5, 0.5],
//     [0, 1]], initial [1, 0], two cycles, no discount.
//     Occupancy: [1, 0], [0.5, 0.5], [0.25, 0.75].
//     Per cycle: cost 10, 5, 2.5; utility 1, 0.5, 0.25.
//     HCC on (weights 0.5, 1, 0.5): cost 0.5*10 + 5 + 0.5*2.5 = 11.25;
//     QALY 0.5*1 + 0.5 + 0.5*0.25 = 1.125; cost per QALY 11.25/1.125 = 10.
//     HCC off: cost 17.5; QALY 1.75.
{
  const input = {
    title: 't', cycles: 2, cycleYears: 1, discountRate: 0, halfCycleCorrection: true,
    states: [
      { id: 'a', label: 'A', costPerCycle: 10, utilityPerCycle: 1 },
      { id: 'b', label: 'B', costPerCycle: 0, utilityPerCycle: 0, absorbing: true },
    ],
    transitions: [[0.5, 0.5], [0, 1]],
    initial: [1, 0],
    pit: { group: 'g', effect: 'mixed' },
  };
  const v = markov.validate(input);
  ok('Markov validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = markov.run(input);
  approx('Markov discounted cost with HCC', r.pvCost, 11.25, 1e-9);
  approx('Markov QALYs with HCC', r.qaly, 1.125, 1e-9);
  approx('Markov cost per QALY', r.costPerQaly, 11.25 / 1.125, 1e-9);
  approx('Markov final occupancy of A', r.finalOccupancy[0].share, 0.25, 1e-9);
  approx('Markov cycle-1 occupancy of B', r.trace[1].occupancy[1], 0.5, 1e-9);
  const r2 = markov.run({ ...input, halfCycleCorrection: false });
  approx('Markov cost without HCC', r2.pvCost, 17.5, 1e-9);
  approx('Markov QALYs without HCC', r2.qaly, 1.75, 1e-9);
  const bad = JSON.parse(JSON.stringify(input));
  bad.transitions = [[0.5, 0.6], [0, 1]];
  ok('Markov rejects a matrix row not summing to 1',
    markov.validate(bad).errors.some((e) => e.includes('adds up to')));
}

// 16. Budget impact: exact arithmetic.
//     1000 eligible, no growth, uptake 0.5 then 1.0, cost 100 then 200,
//     offset 10 then 20 per patient. Year 1 net 45,000; year 2 net 180,000.
{
  const input = {
    title: 't', horizonYears: 2, eligiblePopulation: 1000, populationGrowth: 0,
    uptake: [0.5, 1], perPatientCost: [100, 200],
    offsets: [{ label: 'Saved', perPatient: [10, 20] }],
    pit: { group: 'State budget', effect: 'restricted' },
  };
  const v = budgetImpact.validate(input);
  ok('Budget impact validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = budgetImpact.run(input);
  approx('Budget impact year 1 treated', r.rows[0].treated, 500);
  approx('Budget impact year 1 net', r.rows[0].net, 500 * 100 - 500 * 10);
  approx('Budget impact year 2 net', r.rows[1].net, 1000 * 200 - 1000 * 20);
  approx('Budget impact total net', r.totalNet, 225000);
  approx('Budget impact total gross', r.totalGross, 250000);
  approx('Budget impact total offsets', r.totalOffsets, 25000);
  approx('Budget impact net per patient year 1', r.rows[0].perPatientNet, 90);
  ok('Budget impact peak year is year 2', r.peakNet.year === 2, String(r.peakNet.year));
}

// 17. Stakeholder game: prisoner's dilemma, hand-derived.
//     CC (3,3), CD (0,5), DC (5,0), DD (1,1). The only pure equilibrium is
//     DD; the Pareto set is CC, CD, DC. Maximin: Row's worst case is 0 on
//     Cooperate and 1 on Defect; Col's worst case is 0 on Cooperate and 1 on
//     Defect. Both floors are Defect at 1.
{
  const input = {
    title: 't',
    players: [
      { id: 'r', label: 'Row', strategies: ['Cooperate', 'Defect'] },
      { id: 'c', label: 'Col', strategies: ['Cooperate', 'Defect'] },
    ],
    outcomes: [
      { row: 0, col: 0, payoffs: [3, 3], pit: { group: 'Both', effect: 'benefits' } },
      { row: 0, col: 1, payoffs: [0, 5], pit: { group: 'Col', effect: 'benefits' } },
      { row: 1, col: 0, payoffs: [5, 0], pit: { group: 'Row', effect: 'benefits' } },
      { row: 1, col: 1, payoffs: [1, 1], pit: { group: 'Both', effect: 'restricted' } },
    ],
  };
  const v = gameTheory.validate(input);
  ok('Game validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = gameTheory.run(input);
  ok('Game finds exactly one pure equilibrium', r.equilibria.length === 1, String(r.equilibria.length));
  ok('Game equilibrium is Defect vs Defect',
    r.equilibria[0].rowStrategy === 'Defect' && r.equilibria[0].colStrategy === 'Defect');
  ok('Game Pareto set is the three cooperative outcomes',
    r.paretoIds.join(',') === '0:0,0:1,1:0', r.paretoIds.join(','));
  ok('Game maximin for Row is Defect', r.maximin[0].strategy === 'Defect' && r.maximin[0].guaranteedPayoff === 1);
  ok('Game maximin for Col is Defect', r.maximin[1].strategy === 'Defect' && r.maximin[1].guaranteedPayoff === 1);
  const missing = JSON.parse(JSON.stringify(input));
  delete missing.outcomes[0].pit;
  ok('Game flags outcomes without a distributional column', gameTheory.validate(missing).warnings.some((w) => w.includes('distributional')));
}

// 18. Queueing: exact M/M/c closed forms.
//     M/M/1 with lambda 2, mu 3: rho 2/3, Lq 4/3, L 2, Wq 2/3, W 1,
//     P(wait) 2/3. M/M/2 with the same rates: P(wait) 1/6, Lq 1/12.
{
  const one = mmc(2, 3, 1);
  ok('M/M/1 is stable', one.stable);
  approx('M/M/1 utilisation', one.rho, 2 / 3, 1e-9);
  approx('M/M/1 chance of waiting', one.pWait, 2 / 3, 1e-9);
  approx('M/M/1 queue length', one.lq, 4 / 3, 1e-9);
  approx('M/M/1 people in system', one.l, 2, 1e-9);
  approx('M/M/1 wait before service', one.wq, 2 / 3, 1e-9);
  approx('M/M/1 total time', one.w, 1, 1e-9);
  const two = mmc(2, 3, 2);
  approx('M/M/2 chance of waiting (Erlang C)', two.pWait, 1 / 6, 1e-9);
  approx('M/M/2 queue length', two.lq, 1 / 12, 1e-9);
  ok('M/M/c reports instability at rho = 1', mmc(3, 3, 1).stable === false);
  const v = queueing.validate({ arrivalRate: 3, serviceRate: 3, servers: 1, timeUnit: 'hour' });
  ok('Queue rejects an unstable queue loudly', v.errors.some((e) => e.includes('unstable')));
  ok('Queue warns when the time unit is missing',
    queueing.validate({ arrivalRate: 2, serviceRate: 3, servers: 1 }).warnings.some((w) => w.includes('timeUnit')));
}

// 19. Monte Carlo: seeded determinism and sampling properties.
{
  const a = mulberry32(42);
  const b = mulberry32(42);
  ok('Seeded generator is reproducible', a() === b() && a() === b() && a() === b());

  const input = {
    title: 't', runs: 10000, seed: 7,
    variables: [
      { id: 'gain', label: 'Gain', kind: 'benefit', dist: { dist: 'uniform', min: 0, max: 2 }, scale: 10 },
    ],
    pit: { group: 'g', effect: 'benefits' },
  };
  const v = monteCarlo.validate(input);
  ok('Monte Carlo validates clean', v.errors.length === 0, v.errors.join('; '));
  const r = monteCarlo.run(input);
  approx('Monte Carlo mean of uniform gain', r.mean, 10, 0.5);
  approx('Monte Carlo 5th percentile near 1', r.p5, 1, 0.5);
  approx('Monte Carlo 95th percentile near 19', r.p95, 19, 0.5);
  ok('Monte Carlo all-benefit run never goes negative', r.pNegative === 0 && r.worst >= 0);
  const again = monteCarlo.run(input);
  ok('Monte Carlo identical seed gives identical output', canonicalJSON(again) === canonicalJSON(r));
  const reseeded = monteCarlo.run({ ...input, seed: 8 });
  ok('Monte Carlo seed change gives different output', canonicalJSON(reseeded) !== canonicalJSON(r));
  const beta = monteCarlo.run({
    title: 't', runs: 10000, seed: 11,
    variables: [
      { id: 'b', label: 'Beta draw', kind: 'benefit', dist: { dist: 'beta', alpha: 2, beta: 5 }, scale: 240000 },
    ],
    pit: { group: 'g', effect: 'mixed' },
  });
  // Beta(2, 5) has mean 2/7; scaled by 240,000 that is about 68,571.
  approx('Monte Carlo beta mean matches theory', beta.variables[0].mean, (2 / 7) * 240000, 3000);
  ok('Monte Carlo beta draws stay inside 0 to scale', beta.variables[0].p95 < 240000 && beta.variables[0].p5 > 0);
  const tri = monteCarlo.run({
    title: 't', runs: 5000, seed: 5,
    variables: [
      { id: 't', label: 'Triangular', kind: 'cost', dist: { dist: 'triangular', min: 10, mode: 20, max: 60 } },
    ],
    pit: { group: 'g', effect: 'restricted' },
  });
  ok('Triangular draws stay inside their bounds', tri.variables[0].p5 >= 10 && tri.variables[0].p95 <= 60,
    `${tri.variables[0].p5} to ${tri.variables[0].p95}`);
}

// 20. Every shipped sample validates, runs and carries a headline.
{
  const all = [
    ['CEA', cea, ceaSample],
    ['Equity', equity, equitySample],
    ['Markov', markov, markovSample],
    ['Budget impact', budgetImpact, budgetImpactSample],
    ['Stakeholder game', gameTheory, gameTheorySample],
    ['Queueing', queueing, queueingSample],
    ['Monte Carlo', monteCarlo, monteCarloSample],
  ];
  for (const [name, mod, sample] of all) {
    const v = mod.validate(sample);
    ok(`${name} sample validates`, v.errors.length === 0, v.errors.join('; '));
    const r = mod.run(sample);
    const head = mod.headline(r);
    ok(`${name} sample runs with a headline`, typeof head === 'string' && head.length > 20, head.slice(0, 60));
    const report = await buildReport({
      module: mod, input: sample, params: { values: {}, meta: {} }, results: r,
      pit: { whoBenefits: 'B', whoPays: 'P', whoMissing: 'M' },
    });
    ok(`${name} report renders the results section`,
      report.html.includes('Results') && !report.html.includes('undefined'));
  }
}

console.log(failures === 0 ? '\nAll battery checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
