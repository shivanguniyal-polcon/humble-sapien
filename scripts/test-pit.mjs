// Verification for the computed "who is missing" coverage engine and the
// distributional coverage walker. Hand-derived where arithmetic exists.
// Run: node scripts/test-pit.mjs

import {
  censusCoverage, coverageLines, panelReceipt, nfhsCoverage, findUnitColumn,
  CENSUS_TOTAL_POP, CENSUS_UNIVERSE_SIZE,
} from '../src/lib/coverage.js';
import { census2011 } from '../src/data/census2011.js';
import {
  equity, equitySample, cba, cbaSample, decisionTree, decisionTreeSample,
  markov, markovSample, distributionalReceipt, formatDistributional,
} from '../src/battery/index.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}
function approx(name, got, want, tol = 1e-6) {
  const good = got != null && Math.abs(got - want) <= tol;
  if (!good) failures += 1;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}: got ${got}, want ${want}`);
}

// 1. The census universe itself: 35 units, 1,210,854,977 people (Census 2011).
ok('census universe size is 35', CENSUS_UNIVERSE_SIZE === 35, `${CENSUS_UNIVERSE_SIZE}`);
approx('census total population', CENSUS_TOTAL_POP, 1210854977, 0.5);

// 2. Name matching: aliases and ampersand normalisation.
{
  const cov = censusCoverage(['NCT Delhi', 'Andaman & Nicobar Islands', 'Bihar']);
  ok('alias and ampersand names match the census', cov.matched.length === 3, cov.matched.map((m) => m.name).join(', '));
  ok('nothing unknown among matched names', cov.unknown.length === 0);
  approx('missing units named', cov.missing.length, CENSUS_UNIVERSE_SIZE - 3);
}

// 3. Post-2011 units are named as unknown with the right reason, never guessed.
{
  const cov = censusCoverage(['Telangana']);
  ok('Telangana is unknown, not matched', cov.matched.length === 0 && cov.unknown.length === 1);
  ok('Telangana carries the 2014 note', /2014/.test(cov.unknown[0].note), cov.unknown[0].note.slice(0, 60));
}

// 4. The merged UT row covers two census units, in the long form and the
// abbreviation the PM-JAY tables actually use.
{
  const cov = censusCoverage(['Dadra & Nagar Haveli and Daman & Diu']);
  ok('merged UT covers both 2011 UTs', cov.matched.length === 2, cov.matched.map((m) => m.name).join(', '));
  const short = censusCoverage(['DNH and DD']);
  ok('DNH and DD covers both 2011 UTs', short.matched.length === 2 && short.unknown.length === 0, short.matched.map((m) => m.name).join(', '));
}

// 5. Population coverage arithmetic, against direct summation of the data.
{
  const names = ['Bihar', 'Delhi'];
  const cov = censusCoverage(names);
  const expectedPop = census2011.filter((r) => ['Bihar', 'Delhi'].includes(r.s)).reduce((a, r) => a + r.pop, 0);
  approx('population covered is summed from the data', cov.populationCovered, expectedPop);
  approx('coverage percentage', cov.coveragePct, (expectedPop / CENSUS_TOTAL_POP) * 100);
  const lines = coverageLines(cov);
  ok('receipt names the count', /2 of 35/.test(lines[0]), lines[0]);
  ok('receipt names absent units', /Andhra Pradesh/.test(lines[1]), lines[1]);
}

// 6. Panel receipt names the unit missing a wave.
{
  const panel = panelReceipt(
    [{ unit: 'a', wave: 0 }, { unit: 'a', wave: 1 }, { unit: 'b', wave: 0 }],
    { waveLabels: ['2005-06', '2015-16'] },
  );
  ok('unbalanced unit named', panel.unbalanced.length === 1 && panel.unbalanced[0].unit === 'b');
  ok('missing wave labelled', panel.unbalanced[0].missingWaves[0] === '2015-16');
  approx('complete units counted', panel.complete, 1);
}

// 7. NFHS receipt: excluded states named with their reason.
{
  const c = nfhsCoverage({ indicator: 'stunting', waves: ['n3', 'n4', 'n5'] });
  ok('states with all three waves are used', c.used.includes('Arunachal Pradesh'));
  ok('states missing NFHS-3 are excluded by name', c.excluded.some((e) => e.name === 'Andaman & Nicobar Islands'));
  ok('every excluded state carries a reason', c.excluded.every((e) => /no .* value/.test(e.reason)), c.excluded[0] && c.excluded[0].reason);
  ok('used plus excluded covers the universe', c.used.length + c.excluded.length === 36, `${c.used.length}+${c.excluded.length}`);
}

// 8. Unit-column detection: finds geography, refuses to guess otherwise.
{
  const found = findUnitColumn({ columns: ['state', 'x'], rows: [['Bihar', '1'], ['Delhi', '2'], ['zz', '3']] });
  ok('unit column detected', found && found.column === 'state', found && found.column);
  const none = findUnitColumn({ columns: ['a', 'b'], rows: [['foo', '1'], ['bar', '2']] });
  ok('no geography, no detection', none === null);
}

// 9. Distributional walker: every group named in the distributional CBA.
{
  const r = equity.run(equitySample);
  const d = distributionalReceipt(r);
  ok('equity: all three groups carry a distributional column', d.total === 3 && d.covered === 3, `${d.covered}/${d.total}`);
  ok('equity: no gaps', d.missing.length === 0);
  ok('equity format', formatDistributional(d) === '3 of 3 outputs name who they hit.', formatDistributional(d));
}

// 10. The CBA unpriced ledger counts as its distributional columns.
{
  const r = cba.run(cbaSample, { discountRate: 0.03, sensitivityLo: 0.01, sensitivityHi: 0.05 });
  const d = distributionalReceipt(r);
  ok('cba: unpriced ledger both name who they hit', d.total === 2 && d.covered === 2, `${d.covered}/${d.total}`);
}

// 11. The tree: leaves with distributional columns produce no gaps.
{
  const r = decisionTree.run(decisionTreeSample, {});
  const d = distributionalReceipt(r);
  ok('tree: outputs found', d.total != null && d.total > 0, `${d.covered}/${d.total}`);
  ok('tree: every leaf named', d.covered === d.total && d.missing.length === 0);
}

// 12. Module-level pit counts as one output for the run itself.
{
  const r = markov.run(markovSample, {});
  const d = distributionalReceipt(r);
  ok('markov: the run carries its distributional column', d.total === 1 && d.covered === 1, `${d.covered}/${d.total}`);
}

// 13. Format honesty: empty meters say so.
ok('empty result reads as no column', formatDistributional({ total: 0, covered: 0, missing: [] }) === 'No output in this run carries a distributional column.');
ok('flagged gaps are named', /flagged as missing/.test(formatDistributional({ total: null, covered: 0, missing: ['x', 'y'] })));

// 14. Shared dataset store: a pin holds through a same-name re-share, so a
// pin is only lost when the analyst unpins — as the UI promises.
{
  const store = await import('../src/lib/datasetStore.js');
  store.shareDataset({ name: 'regression', dataset: { rows: [[1]], rowCount: 1 }, validation: { ok: true }, source: 'lab' });
  store.togglePin(store.listDatasets()[0].id);
  store.shareDataset({ name: 'regression', dataset: { rows: [[1], [2]], rowCount: 2 }, validation: { ok: true }, source: 'lab' });
  const e = store.listDatasets()[0];
  ok('re-share under a pinned name keeps the pin and takes the new rows', e.pinned === true && e.dataset.rowCount === 2);
  store.unshareDataset(e.id);
  ok('unsharing empties the slot', store.listDatasets().length === 0);
}

console.log(failures === 0 ? '\nAll PIT checks passed.' : `\n${failures} PIT check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
