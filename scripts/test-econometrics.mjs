// Verification for the evaluation engine. Every case here has a known exact
// answer derived by hand, so any regression in the matrix machinery fails loudly.
// Run: node scripts/test-econometrics.mjs

import {
  ols, logit, tsls, didTWFE, didEventStudy, didTable, rddLocal, rddBins,
  syntheticControl, propensityMatch, tPValue,
} from '../src/lib/econometrics.js';

let failures = 0;
function approx(name, got, want, tol = 1e-6) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}, want ${want} (tol ${tol})`);
}

// 1. OLS against the textbook series y = [2,4,5,4,5] on x = 1..5.
//    Closed form: slope = 0.6, intercept = 2.2, R2 = 0.6.
//    HC1 sandwich, hand-computed: (X'X)^-1 = [[1.1,-0.3],[-0.3,0.1]],
//    meat = (5/3)*[[2.4,6],[6,17.84]], so V = [[0.916, .],[., 0.0573333]]
//    and se(intercept) = sqrt(0.916), se(slope) = sqrt(0.0573333).
{
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 5, 4, 5];
  const X = x.map((v) => [1, v]);
  const fit = ols(y, X);
  approx('OLS intercept', fit.beta[0], 2.2);
  approx('OLS slope', fit.beta[1], 0.6);
  approx('OLS R2', fit.r2, 0.6);
  approx('OLS HC1 se(intercept)', fit.se[0], Math.sqrt(0.916));
  approx('OLS HC1 se(slope)', fit.se[1], Math.sqrt(0.0573333333333333), 1e-6);
}

// 2. Student-t tails: t_{0.975, 10} = 2.228138852 gives two-sided p = 0.05.
approx('t tail df=10', tPValue(2.228138852, 10), 0.05, 1e-6);

// 3. TWFE DiD: 4 units, 2 waves, unit effects [-2,0,1,3], time effect +1 in
//    wave 1, treatment effect 5 on units 3-4 from wave 1. Model is saturated,
//    so the estimate must be exactly 5 and the 2x2 table must agree.
{
  const unitFE = [-2, 0, 1, 3];
  const rows = [];
  for (let i = 0; i < 4; i += 1) {
    for (let t = 0; t < 2; t += 1) {
      const treated = i >= 2;
      rows.push({
        unit: `u${i}`, wave: t,
        y: unitFE[i] + t + (treated && t >= 1 ? 5 : 0),
        firstTreat: treated ? 1 : null,
      });
    }
  }
  const fit = didTWFE(rows);
  approx('DiD TWFE effect', fit.effect, 5);
  const tab = didTable(rows, 1);
  approx('DiD 2x2 raw estimate', tab.rawDID, 5);
}

// 4. Event study: 3 waves, effect 5 only in wave 2. Base wave 0, so the
//    wave-1 coefficient must be 0 and the wave-2 coefficient 5.
{
  const unitFE = [-2, 0, 1, 3];
  const rows = [];
  for (let i = 0; i < 4; i += 1) {
    for (let t = 0; t < 3; t += 1) {
      const treated = i >= 2;
      rows.push({
        unit: `u${i}`, wave: t,
        y: unitFE[i] + t + (treated && t === 2 ? 5 : 0),
        firstTreat: treated ? 2 : null,
      });
    }
  }
  const fit = didEventStudy(rows, 0);
  const byWave = Object.fromEntries(fit.points.map((p) => [p.wave, p]));
  approx('Event study wave 1 (pre)', byWave[1].beta, 0);
  approx('Event study wave 2 (effect)', byWave[2].beta, 5);
}

// 5. Sharp RDD: y = 1 + 0.5x + 4*1(x >= 0) on x = -3..3 step 0.5.
//    Piecewise linear exactly, so the discontinuity must be exactly 4.
{
  const x = [];
  for (let v = -3; v <= 3.001; v += 0.5) x.push(Number(v.toFixed(2)));
  const y = x.map((v) => 1 + 0.5 * v + (v >= 0 ? 4 : 0));
  const fit = rddLocal(y, x, 0, { bandwidth: 3 });
  approx('RDD sharp effect', fit.effect, 4);
  approx('RDD left intercept', fit.leftFit.intercept, 1);
  approx('RDD right intercept', fit.rightFit.intercept, 5);
  const bins = rddBins(y, x, 0, 4);
  if (bins.length === 0) {
    failures += 1;
    console.log('FAIL  RDD bins: got none');
  } else {
    console.log(`PASS  RDD bins: ${bins.length} bins plotted`);
  }
}

// 6. Fuzzy RDD: take-up D = 0.2 + 0.1x + 0.6*1(x >= 0), outcome
//    y = 1 + 0.5x + 2*D. Jumps: D at 0.6, y at 1.2. Wald ratio = 2 exactly.
{
  const x = [];
  for (let v = -3; v <= 3.001; v += 0.5) x.push(Number(v.toFixed(2)));
  const D = x.map((v) => 0.2 + 0.1 * v + (v >= 0 ? 0.6 : 0));
  const y = x.map((v, i) => 1 + 0.5 * v + 2 * D[i]);
  const fit = rddLocal(y, x, 0, { bandwidth: 3, fuzzyD: D });
  approx('RDD fuzzy first stage', fit.firstStage.jump, 0.6);
  approx('RDD fuzzy Wald effect', fit.effect, 2);
}

// 7. Synthetic control: treated pre [4,2] is exactly the 50/50 blend of donor
//    A [2,4] and donor B [6,0]. Post: treated [7,3], donors unchanged.
//    Weights must be 0.5/0.5 and the post gaps 3 and 1.
{
  const res = syntheticControl({
    treatedPre: [4, 2],
    treatedPost: [7, 3],
    donorPre: [[2, 4], [6, 0]],
    donorPost: [[2, 4], [6, 0]],
    donorNames: ['A', 'B'],
  });
  const w = Object.fromEntries(res.weights.map((x) => [x.name, x.weight]));
  approx('SC weight A', w.A, 0.5, 1e-5);
  approx('SC weight B', w.B, 0.5, 1e-5);
  approx('SC post gap 1', res.postGap[0], 3);
  approx('SC post gap 2', res.postGap[1], 1);
  approx('SC mean post gap', res.postMeanGap, 2);
}

// 8. Logit: x = [-3,-2,-1,1,2,3], y = [1,0,0,1,1,0]. The score vanishes at
//    beta = (0,0) and the log-likelihood is concave, so the MLE is exactly 0,0.
{
  const x = [-3, -2, -1, 1, 2, 3];
  const y = [1, 0, 0, 1, 1, 0];
  const X = x.map((v) => [1, v]);
  const fit = logit(y, X);
  approx('Logit intercept', fit.beta[0], 0, 1e-7);
  approx('Logit slope', fit.beta[1], 0, 1e-7);
  if (!fit.converged) {
    failures += 1;
    console.log('FAIL  Logit convergence');
  } else {
    console.log('PASS  Logit convergence');
  }
}

// 9. 2SLS: z = 1..10, endogenous x1 = 2z, y = 1 + 3*x1. The first stage is
//    exact, so 2SLS must return exactly [1, 3].
{
  const z = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const x1 = z.map((v) => 2 * v);
  const y = x1.map((v) => 1 + 3 * v);
  const X = x1.map((v) => [1, v]);
  const Z = z.map((v) => [1, v]);
  const fit = tsls(y, X, Z);
  approx('2SLS intercept', fit.beta[0], 1);
  approx('2SLS slope', fit.beta[1], 3);
}

// 10. Matching: treated x = 1, 2 with y = 5, 6; controls x = 1, 2 with y = 2, 3.
//     Propensity scores tie at 0.5, so each treated unit matches its covariate
//     twin. ATT = 3 on either pairing.
{
  const res = propensityMatch({
    y: [5, 6, 2, 3],
    treat: [1, 1, 0, 0],
    X: [[1, 1], [1, 2], [1, 1], [1, 2]],
  });
  approx('Matching ATT', res.att, 3);
  if (res.nMatched !== 2) {
    failures += 1;
    console.log(`FAIL  Matching pair count: got ${res.nMatched}, want 2`);
  } else {
    console.log('PASS  Matching pair count: 2');
  }
}

console.log(failures === 0 ? '\nAll engine checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
