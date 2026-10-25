// Deterministic memo clauses for the project desk.
//
// The memo is assembled from conditions, not generated prose. Every clause is
// keyed to a result condition and a schema field label, so the same run always
// produces the same memo and a missing schema label is visible immediately.

import { normalizeProject, fieldLabel, SECTOR_TEMPLATES } from './schema.js';

const formatters = (digits) => {
  const fixed = (value) => (value == null || !Number.isFinite(Number(value)) ? 'n/a' : Number(value).toFixed(digits));
  return {
    crore: fixed,
    money: (value) => {
      if (value == null || !Number.isFinite(Number(value))) return 'n/a';
      const n = Number(value);
      return `${n < 0 ? '-' : ''}₹${Math.abs(n).toFixed(digits)}`;
    },
    ratio: fixed,
    percent: fixed,
  };
};

const EVIDENCE_RANK = {
  verified: 4,
  reported: 3,
  benchmark: 2,
  convention: 1,
  user: 0,
};

function lowestEvidence(provenance = {}) {
  let lowest = 'verified';
  let lowestRank = 4;
  for (const evidence of Object.values(provenance)) {
    const status = evidence?.status;
    if (!(status in EVIDENCE_RANK)) continue;
    if (EVIDENCE_RANK[status] < lowestRank) {
      lowest = status;
      lowestRank = EVIDENCE_RANK[status];
    }
  }
  return lowest;
}

function liquidityComparisonTable(comparison, fmt) {
  const { crore, ratio } = fmt;
  const off = comparison.off;
  const on = comparison.on;
  const row = (label, left, right) => `| ${label} | ${left} | ${right} |`;
  return [
    '| Metric | Support off | Support on |',
    '| :--- | ---: | ---: |',
    row('First-period gap before support (₹ crore)', crore(comparison.firstPeriodGapCr), crore(comparison.firstPeriodGapCr)),
    row('Covered by DSRA draw (₹ crore)', crore(off.firstPeriodDrawCr), crore(on.firstPeriodDrawCr)),
    row('First-period liquidity coverage', `${ratio(off.firstPeriodCoverage)}x`, `${ratio(on.firstPeriodCoverage)}x`),
    row('Contractual minimum DSCR', `${ratio(off.contractualMinDscr)}x`, `${ratio(on.contractualMinDscr)}x`),
    row('Uncovered debt service, whole case (₹ crore)', crore(off.uncoveredShortfallCr), crore(on.uncoveredShortfallCr)),
    row('DSRA draws (₹ crore)', crore(off.totalDsraDrawnCr), crore(on.totalDsraDrawnCr)),
    row('DSRA replenishments (₹ crore)', crore(off.totalDsraReplenishedCr), crore(on.totalDsraReplenishedCr)),
    row('DSRA release (₹ crore)', crore(off.dsraReleasedCr), crore(on.dsraReleasedCr)),
    row('Project NPV (₹ crore)', crore(off.projectNpvCr), crore(on.projectNpvCr)),
    row('Equity NPV (₹ crore)', crore(off.equityNpvCr), crore(on.equityNpvCr)),
    '',
    'The facility makes the cash timing work but does not cure the covenant breach.',
  ].join('\n');
}

export function buildMemo(result, rawInput = {}, options = {}) {
  const precision = Number.isInteger(options.precision) ? options.precision : 2;
  const fmt = formatters(precision);
  const { crore, money, ratio, percent } = fmt;
  const input = normalizeProject(rawInput);
  const projectName = result?.meta?.projectName || input.projectName || 'Unnamed project';
  const sectorLabel = SECTOR_TEMPLATES[result?.meta?.sector || input.sector]?.label || input.sector || 'project';
  const state = result?.meta?.state || input.state || 'unspecified state';
  const minDscr = result?.operations?.minDscr;
  const averageDscr = result?.operations?.averageDscr;
  const minPeriod = result?.operations?.minDscrPeriod;
  const minYear = result?.operations?.minDscrYear;
  const lockup = Number(input.lockupDscr);
  const defaultDscr = Number(input.defaultDscr);
  const firstCover = result?.operations?.firstCoverBreachPeriod;
  const firstDefault = result?.operations?.firstDefaultBreachPeriod;
  const firstLockup = result?.operations?.firstLockupBreachPeriod;
  const npv = result?.npv;
  const switching = result?.switching;
  const findSwitch = (parameter, metric, threshold) => switching?.rows?.find((row) => row.parameter === parameter
    && row.metric === metric
    && Math.abs(row.threshold - threshold) < 1e-9);
  const describeSwitch = (row, targetText) => {
    if (!row) return null;
    if (!row.reachable || !row.primary) return `${row.label}: no crossing in the tested range.`;
    const p = row.primary;
    const sign = p.alphaPct >= 0 ? 'rise' : 'fall';
    const verb = row.direction === 'headroom' ? 'can' : 'must';
    const connector = row.direction === 'headroom' ? 'before' : 'to reach';
    const periodText = row.metric === 'minDscr' && p.bindingPeriod != null
      ? ` in operating period ${p.bindingPeriod} (year ${p.bindingYear})`
      : '';
    return `${row.label} ${verb} ${sign} ${Math.abs(p.alphaPct).toFixed(precision)}% (to ₹${p.parameterValue.toFixed(precision)} ${row.unit.replace('₹ ', '')}) ${connector} ${targetText}${periodText}.`;
  };
  const revenueCover = findSwitch('annualRevenueCr', 'minDscr', 1.0);
  const revenueDefault = findSwitch('annualRevenueCr', 'minDscr', defaultDscr);
  const tariffCover = findSwitch('tariff', 'minDscr', 1.0);
  const tariffDefault = findSwitch('tariff', 'minDscr', defaultDscr);
  const capexCover = findSwitch('capex', 'minDscr', 1.0);
  const opexCover = findSwitch('opexFixedCrPerYear', 'minDscr', 1.0);
  const revenueNpv = findSwitch('annualRevenueCr', 'projectNpvCr', 0);
  const tariffNpv = findSwitch('tariff', 'projectNpvCr', 0);
  const capexNpv = findSwitch('capex', 'projectNpvCr', 0);
  const opexNpv = findSwitch('opexFixedCrPerYear', 'projectNpvCr', 0);

  let verdict;
  if (minDscr == null) {
    verdict = 'Debt service is not defined for this case.';
  } else if (minDscr < 0) {
    verdict = 'The case does not cover debt service: cash flow after debt service is negative in at least one period.';
  } else if (minDscr < 1) {
    verdict = 'The case does not cover debt service on the 1.00x test in at least one period.';
  } else if (minDscr < lockup) {
    verdict = `The case covers debt service but stays below the ${lockup.toFixed(precision)}x lock-up in at least one period.`;
  } else {
    verdict = `The case covers debt service and stays above the ${lockup.toFixed(precision)}x lock-up on the base case.`;
  }

  const sections = [];

  sections.push({
    id: 'breach',
    title: 'What would have to break',
    text: firstCover != null
      ? `The first breach of the 1.00x cover test is operating period ${firstCover} (year ${Math.ceil(firstCover / 2)}). The minimum DSCR is ${ratio(minDscr)}x in operating period ${minPeriod ?? 'n/a'} (year ${minYear ?? 'n/a'}). ${firstDefault != null ? `The default covenant of ${defaultDscr.toFixed(precision)}x is first breached in period ${firstDefault}. ` : ''}${firstLockup != null ? `The lock-up of ${lockup.toFixed(precision)}x is first breached in period ${firstLockup}. ` : ''}The switching section below converts those breach points into the input change that would reach them.`
      : `No period breaches the 1.00x cover test. The minimum DSCR is ${ratio(minDscr)}x in operating period ${minPeriod ?? 'n/a'} (year ${minYear ?? 'n/a'}). ${firstDefault != null ? `The default covenant of ${defaultDscr.toFixed(precision)}x is first breached in period ${firstDefault}. ` : 'The default covenant is not breached. '}${firstLockup != null ? `The lock-up of ${lockup.toFixed(precision)}x is first breached in period ${firstLockup}. ` : 'The lock-up is not breached. '}A positive base case is not a statement that the project is safe; the demand and cost assumptions still carry the case.`,
  });

  const switchLines = [];
  const coverLine = describeSwitch(revenueCover, 'the 1.00x cover test');
  if (coverLine) switchLines.push(coverLine);
  const tariffCoverLine = describeSwitch(tariffCover, 'the 1.00x cover test');
  if (tariffCoverLine) switchLines.push(tariffCoverLine);
  const capexLine = describeSwitch(capexCover, 'the 1.00x cover test');
  if (capexLine) switchLines.push(capexLine);
  const opexLine = describeSwitch(opexCover, 'the 1.00x cover test');
  if (opexLine) switchLines.push(opexLine);
  const defaultLine = describeSwitch(revenueDefault, `the ${defaultDscr.toFixed(precision)}x default covenant`);
  if (defaultLine) switchLines.push(defaultLine);
  const tariffDefaultLine = describeSwitch(tariffDefault, `the ${defaultDscr.toFixed(precision)}x default covenant`);
  if (tariffDefaultLine) switchLines.push(tariffDefaultLine);
  const npvLines = [
    describeSwitch(revenueNpv, 'project NPV zero'),
    describeSwitch(tariffNpv, 'project NPV zero'),
    describeSwitch(capexNpv, 'project NPV zero'),
    describeSwitch(opexNpv, 'project NPV zero'),
  ].filter(Boolean);
  sections.push({
    id: 'switching',
    title: 'Switching values',
    text: switchLines.length > 0 || npvLines.length > 0
      ? `${switchLines.join(' ')} ${npvLines.join(' ')} The primary crossing is the one nearest the base case; the full crossing list is in the manifest. These are arithmetic boundaries, not forecasts.`
      : 'Switching values were not computed for this run. Do not read the base case as a boundary estimate.',
  });

  const npvText = npv
    ? ` At a ${percent(npv.projectDiscountRatePct)}% nominal project discount rate the project NPV is ${money(npv.projectNpvCr)} crore and the project IRR is ${percent(npv.projectIrrPct)}%. Equity NPV at a ${percent(npv.costOfEquityPct)}% cost of equity is ${money(npv.equityNpvCr)} crore and the equity IRR is ${percent(npv.equityIrrPct)}%.`
    : '';
  sections.push({
    id: 'headline',
    title: 'Verdict',
    text: `${projectName} (${sectorLabel}, ${state}). ${verdict} The minimum DSCR is ${ratio(minDscr)}x and the average DSCR is ${ratio(averageDscr)}x. The LLCR at COD is ${ratio(result?.operations?.llcrAtCod)}x.${npvText}`,
  });

  const grantLabel = input.sector === 'ham-road' ? 'HAM grant' : 'capital grant / VGF';
  sections.push({
    id: 'funding',
    title: 'Funding and IDC',
    text: `The gross project cost is ₹${crore(result?.funding?.grossCostCr)} crore. The ${grantLabel} is ₹${crore(result?.funding?.grantCr)} crore, leaving a construction funding requirement of ₹${crore(result?.funding?.constructionFundingCr)} crore. IDC is ₹${crore(result?.funding?.idcCr)} crore and the DSRA is ₹${crore(result?.funding?.initialDsraCr)} crore. The funding requirement is ₹${crore(result?.funding?.fundingRequirementCr)} crore, split into ₹${crore(result?.funding?.debtCr)} crore of debt and ₹${crore(result?.funding?.equityCr)} crore of equity. The gearing assumption is ${percent(input.gearingPct)}% (${fieldLabel('gearingPct')}).`,
  });

  sections.push({
    id: 'debt',
    title: 'Debt service',
    text: `The half-yearly debt service is ₹${crore(result?.operations?.debtServiceCr)} crore and the annual debt service is ₹${crore(result?.operations?.annualDebtServiceCr)} crore. The ${fieldLabel('repaymentProfile').toLowerCase()} is ${input.repaymentProfile}. The first operating period CFADS is ₹${crore(result?.periods?.find((p) => p.phase === 'operation')?.cfadsCr)} crore. The final period releases working capital; that is why the minimum can sit before the last period.`,
  });

  const comparison = result?.comparison;
  const liquidity = result?.operations?.liquidity;
  const supportOn = liquidity?.support === 'dsra-draw';
  if (comparison) {
    sections.push({
      id: 'liquidity',
      title: 'Liquidity support, off versus on',
      text: liquidityComparisonTable(comparison, fmt),
    });
  } else if (liquidity) {
    let text;
    if (supportOn && liquidity.totalDsraDrawnCr > 1e-9) {
      const uncovered = liquidity.uncoveredShortfallCr > 1e-9
        ? ` ₹${crore(liquidity.uncoveredShortfallCr)} crore of the shortfall remains uncovered after the reserve is exhausted, so this facility does not cure the case.`
        : ' No shortfall remains uncovered.';
      text = `Liquidity support is switched on and the DSRA is treated as a draw facility. The first shortfall is in operating period ${liquidity.firstShortfallPeriod ?? 'n/a'}; the minimum coverage after a draw is ${ratio(liquidity.minLiquidityCoverage)}x. Total draws are ₹${crore(liquidity.totalDsraDrawnCr)} crore and ₹${crore(liquidity.totalDsraReplenishedCr)} crore is replenished from later surplus; ₹${crore(liquidity.dsraReleasedCr)} crore is released at debt maturity.${uncovered} Contractual DSCR is unchanged at ${ratio(minDscr)}x because the reserve is a liquidity source, not project cash flow; project NPV is also unchanged. Equity NPV reflects only the timing of the draw and replenishment, not new cash. With support off, the same case reports the contractual ratio and no reserve draw.`;
    } else if (supportOn && liquidity.firstShortfallPeriod != null) {
      text = `Liquidity support is switched on, but the reserve is empty or too small to make a draw. The first shortfall is in operating period ${liquidity.firstShortfallPeriod}; ₹${crore(liquidity.uncoveredShortfallCr)} crore remains uncovered, so the facility does not cure the case.`;
    } else if (supportOn) {
      text = `Liquidity support is switched on, but no period needed a DSRA draw: contractual DSCR and the supported run are the same.`;
    } else if (liquidity.firstShortfallPeriod != null) {
      text = `Liquidity support is switched off. The first debt-service shortfall is in operating period ${liquidity.firstShortfallPeriod}; the contractual minimum DSCR is ${ratio(minDscr)}x and no reserve draw is modelled. ₹${crore(liquidity.uncoveredShortfallCr)} crore of debt service remains uncovered by the facility in this run; the DSRA balance is funded at COD and released at maturity, not drawn. Switch the facility on to compare the supported path.`;
    } else {
      text = `Liquidity support is switched off. No period has a debt-service shortfall, so a DSRA draw would not change the case.`;
    }
    sections.push({ id: 'liquidity', title: 'Liquidity support', text });
  }

  sections.push({
    id: 'tax',
    title: 'Tax and depreciation',
    text: `The tax case uses ${result?.tax?.regime || input.taxRegime} at ${percent((result?.tax?.rate ?? 0) * 100)}%. Book depreciation in year 1 is ₹${crore(result?.tax?.bookDepreciationYear1Cr)} crore; tax WDV depreciation is ₹${crore(result?.tax?.taxDepreciationYear1Cr)} crore. Year-1 taxable income is ${money(result?.tax?.taxableIncomeYear1Cr)} crore, so the case starts ${Number(result?.tax?.taxableIncomeYear1Cr) < 0 ? 'in a loss position' : 'tax-positive'}. Total cash tax over the case period is ₹${crore(result?.tax?.totalTaxCr)} crore. The usable loss pool at the end is ₹${crore(result?.tax?.lossPoolEndCr)} crore, and ₹${crore(result?.tax?.lossExpiredUnusedCr)} crore of losses expired unused under the ${input.lossCarryYears}-year carry-forward.`,
  });

  const lowest = lowestEvidence(result?.provenance);
  const userCount = Object.values(result?.provenance || {}).filter((e) => e?.status === 'user').length;
  const revenueLabel = input.sector === 'solar' ? fieldLabel('tariff') : fieldLabel('annualRevenueCr');
  sections.push({
    id: 'evidence',
    title: 'Assumption provenance',
    text: `The lowest evidence level in this run is ${lowest}. ${userCount} input${userCount === 1 ? '' : 's'} are user-supplied. Benchmarks and conventions are editable starting points, not forecasts. The memo should be read with the ${revenueLabel} and ${fieldLabel('gearingPct')} assumptions in front of you.`,
  });

  sections.push({
    id: 'limitations',
    title: 'Limitations',
    text: `This is a screening estimate generated from structured inputs. It is not a TEV study, credit rating, legal opinion or investment advice. It does not constitute compliance with the RBI (Project Finance) Directions, 2025, and it does not replace a lender's model, an independent engineer's report or a statutory audit. The output is deterministic; the assumptions are not facts.`,
  });

  const text = sections.map((section) => `${section.title}\n${section.text}`).join('\n\n');
  return { sections, text, lowestEvidence: lowest };
}
