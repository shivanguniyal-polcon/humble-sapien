import { TAX_RATES } from './constants.js';
import { FIELD_BY_KEY } from './fields.js';
import { normalizeProject } from './normalize.js';
import { SECTOR_TEMPLATES } from './templates.js';

function err(fieldKey, message) {
  return { field: fieldKey, message };
}

export function validateProject(raw = {}) {
  const input = normalizeProject(raw);
  const errors = [];
  const warnings = [];

  if (!input.projectName || !String(input.projectName).trim()) {
    errors.push(err('projectName', 'projectName is required.'));
  }
  if (!input.state || !String(input.state).trim()) {
    errors.push(err('state', 'state is required.'));
  }
  if (!SECTOR_TEMPLATES[input.sector]) {
    errors.push(err('sector', `sector must be one of: ${Object.keys(SECTOR_TEMPLATES).join(', ')}.`));
  }
  if (!Number.isInteger(Number(input.baseYear)) || Number(input.baseYear) < 2000 || Number(input.baseYear) > 2100) {
    errors.push(err('baseYear', 'baseYear must be an integer between 2000 and 2100.'));
  }
  if (!(Number(input.assetLifeYears) > 0)) {
    errors.push(err('assetLifeYears', 'assetLifeYears must be greater than zero.'));
  }

  const hasCapex = Number(input.hardCostCr) > 0 || Number(input.capexCr) > 0;
  if (!hasCapex) errors.push(err('hardCostCr', 'A positive hard cost or total capex is required.'));
  if (input.capexCr != null && input.hardCostCr != null && Number(input.hardCostCr) > 0) {
    errors.push(err('capexCr', 'Use either capexCr or hardCostCr, not both.'));
  }
  if (Number(input.softCostCr) < 0) errors.push(err('softCostCr', 'softCostCr cannot be negative.'));
  if (Number(input.contingencyPct) < 0 || Number(input.contingencyPct) > 30) {
    errors.push(err('contingencyPct', 'contingencyPct must be between 0 and 30.'));
  }

  const months = Number(input.constructionMonths);
  if (!(months >= 0) || months > 120) {
    errors.push(err('constructionMonths', 'constructionMonths must be between 0 and 120.'));
  }
  if (months >= Number(input.assetLifeYears) * 12) {
    errors.push(err('constructionMonths', 'constructionMonths must be shorter than the asset life.'));
  }

  const periods = Math.max(1, Math.ceil(months / 6));
  const phasing = input.constructionPhasing;
  if (!Array.isArray(phasing) || phasing.length !== periods) {
    errors.push(err('constructionPhasing', `constructionPhasing must have ${periods} half-year weights.`));
  } else {
    const sum = phasing.reduce((total, w) => total + Number(w || 0), 0);
    if (Math.abs(sum - 1) > 1e-6) {
      errors.push(err('constructionPhasing', 'constructionPhasing weights must sum to 1.'));
    }
    if (phasing.some((w) => Number(w) < 0)) {
      errors.push(err('constructionPhasing', 'constructionPhasing weights cannot be negative.'));
    }
  }

  if (input.sector === 'ham-road') {
    if (input.hamSupportPct == null) {
      errors.push(err('hamSupportPct', 'hamSupportPct is required for a HAM road.'));
    } else if (Number(input.hamSupportPct) < 0 || Number(input.hamSupportPct) > 100) {
      errors.push(err('hamSupportPct', 'hamSupportPct must be between 0 and 100.'));
    }
    if (input.grantPct != null || input.grantCr != null) {
      errors.push(err('grantPct', 'Use HAM support or a separate grant, not both.'));
    }
  }

  if (input.sector === 'solar') {
    if (!(Number(input.capacity) > 0)) errors.push(err('capacity', 'capacity is required for a solar project.'));
    if (!(Number(input.tariff) > 0)) errors.push(err('tariff', 'tariff is required for a solar project.'));
    if (Number(input.cufPct) < 0 || Number(input.cufPct) > 100) {
      errors.push(err('cufPct', 'cufPct must be between 0 and 100.'));
    }
  }

  if (input.grantPct != null && input.grantCr != null) {
    errors.push(err('grantPct', 'Use either grantPct or grantCr, not both.'));
  }
  if (input.grantPct != null && (Number(input.grantPct) < 0 || Number(input.grantPct) > 100)) {
    errors.push(err('grantPct', 'grantPct must be between 0 and 100.'));
  }
  if (input.grantCr != null && Number(input.grantCr) < 0) {
    errors.push(err('grantCr', 'grantCr cannot be negative.'));
  }

  if (Number(input.upfrontFeePct) < 0 || Number(input.upfrontFeePct) > 5) {
    errors.push(err('upfrontFeePct', 'upfrontFeePct must be between 0 and 5.'));
  }
  if (Number(input.dsraMonths) < 0 || Number(input.dsraMonths) > 24) {
    errors.push(err('dsraMonths', 'dsraMonths must be between 0 and 24.'));
  }
  if (!['none', 'dsra-draw'].includes(input.liquiditySupport)) {
    errors.push(err('liquiditySupport', 'liquiditySupport must be none or dsra-draw.'));
  }

  if (input.revenueModel === 'level-annuity' || input.sector === 'ham-road') {
    if (!(Number(input.annualRevenueCr) > 0)) {
      errors.push(err('annualRevenueCr', 'annualRevenueCr must be greater than zero.'));
    }
  }
  if (Number(input.revenueEscalationPct) < -10 || Number(input.revenueEscalationPct) > 30) {
    errors.push(err('revenueEscalationPct', 'revenueEscalationPct must be between -10 and 30.'));
  }
  if (input.annuityYears != null && !(Number(input.annuityYears) > 0)) {
    errors.push(err('annuityYears', 'annuityYears must be greater than zero.'));
  }
  if (input.annuityRatePct != null && (Number(input.annuityRatePct) < 0 || Number(input.annuityRatePct) > 25)) {
    errors.push(err('annuityRatePct', 'annuityRatePct must be between 0 and 25.'));
  }
  if (Number(input.tariffEscalationPct) < -10 || Number(input.tariffEscalationPct) > 30) {
    errors.push(err('tariffEscalationPct', 'tariffEscalationPct must be between -10 and 30.'));
  }

  if (!(Number(input.opexFixedCrPerYear) >= 0)) {
    errors.push(err('opexFixedCrPerYear', 'opexFixedCrPerYear must be zero or greater.'));
  }
  if (Number(input.opexEscalationPct) < -5 || Number(input.opexEscalationPct) > 30) {
    errors.push(err('opexEscalationPct', 'opexEscalationPct must be between -5 and 30.'));
  }

  if (!(Number(input.gearingPct) >= 0) || Number(input.gearingPct) > 90) {
    errors.push(err('gearingPct', 'gearingPct must be between 0 and 90.'));
  }
  if (!(Number(input.interestRatePct) >= 0) || Number(input.interestRatePct) > 25) {
    errors.push(err('interestRatePct', 'interestRatePct must be between 0 and 25.'));
  }
  if (!(Number(input.waccPct) > 0) || Number(input.waccPct) > 40) {
    errors.push(err('waccPct', 'waccPct must be greater than 0 and at most 40.'));
  }
  if (!(Number(input.costOfEquityPct) >= 0) || Number(input.costOfEquityPct) > 40) {
    errors.push(err('costOfEquityPct', 'costOfEquityPct must be between 0 and 40.'));
  }
  if (!(Number(input.loanTenorYears) > 0) || Number(input.loanTenorYears) > 40) {
    errors.push(err('loanTenorYears', 'loanTenorYears must be between 0 and 40.'));
  }
  if (Number(input.moratoriumYears) < 0) {
    errors.push(err('moratoriumYears', 'moratoriumYears cannot be negative.'));
  }
  if (!(Number(input.lockupDscr) > 0) || !(Number(input.defaultDscr) > 0)) {
    errors.push(err('lockupDscr', 'lock-up and default DSCR must be greater than zero.'));
  } else if (Number(input.lockupDscr) <= Number(input.defaultDscr)) {
    errors.push(err('lockupDscr', 'lockupDscr must be greater than defaultDscr.'));
  }
  if (input.repaymentProfile === 'sculpted') {
    if (!(Number(input.targetDscr) >= Number(input.lockupDscr))) {
      errors.push(err('targetDscr', 'targetDscr must be at least the lock-up DSCR.'));
    }
  }
  if (Number(input.dsoDays) < 0 || Number(input.dsoDays) > 365) {
    errors.push(err('dsoDays', 'dsoDays must be between 0 and 365.'));
  }
  if (Number(input.dpoDays) < 0 || Number(input.dpoDays) > 180) {
    errors.push(err('dpoDays', 'dpoDays must be between 0 and 180.'));
  }

  if (!TAX_RATES[input.taxRegime]) {
    errors.push(err('taxRegime', `taxRegime must be one of: ${Object.keys(TAX_RATES).join(', ')}.`));
  }
  if (input.taxRegime === '115BAB' && !input.legacy115Bab) {
    errors.push(err('legacy115Bab', '115BAB requires the legacy eligibility toggle; a new greenfield SPV normally cannot use it.'));
  }
  if (!(Number(input.wdvBlockPct) > 0) || Number(input.wdvBlockPct) > 100) {
    errors.push(err('wdvBlockPct', 'wdvBlockPct must be between 0 and 100.'));
  }
  if (!(Number(input.slmLifeYears) > 0)) {
    errors.push(err('slmLifeYears', 'slmLifeYears must be greater than zero.'));
  }
  if (Number(input.lossCarryYears) < 0 || Number(input.lossCarryYears) > 20) {
    errors.push(err('lossCarryYears', 'lossCarryYears must be between 0 and 20.'));
  }

  if (input.economicMode === 'full') {
    if (!Array.isArray(input.benefitLines) || input.benefitLines.length === 0) {
      errors.push(err('benefitLines', 'A full economic lens needs at least one benefit line.'));
    }
  }
  if (input.discountScenario === 'custom' && !(Number(input.customDiscountRatePct) >= 0)) {
    errors.push(err('customDiscountRatePct', 'A custom discount scenario needs a rate.'));
  }

  if (Number(input.loanTenorYears) + Number(input.moratoriumYears) > 0.85 * Number(input.assetLifeYears)) {
    warnings.push('Loan tenor plus moratorium exceeds 85% of asset life; RBI 2025 caps the tenor at 85% of economic life for project loans.');
  }

  return { errors, warnings, input };
}

export function validateField(key, value, input = {}) {
  const def = FIELD_BY_KEY[key];
  if (!def) return [];
  if (typeof def.showIf === 'function' && !def.showIf(input)) return [];
  const errors = [];
  if (def.required && (value == null || value === '')) {
    errors.push(err(key, `${def.label} is required.`));
    return errors;
  }
  if (value == null || value === '') return errors;
  if (['number', 'integer', 'percent', 'currency'].includes(def.type)) {
    const n = Number(value);
    if (!Number.isFinite(n)) errors.push(err(key, `${def.label} must be a number.`));
    if (def.type === 'integer' && !Number.isInteger(n)) errors.push(err(key, `${def.label} must be an integer.`));
    if (def.min != null && n < def.min) errors.push(err(key, `${def.label} must be at least ${def.min}.`));
    if (def.max != null && n > def.max) errors.push(err(key, `${def.label} must be at most ${def.max}.`));
  }
  if (def.type === 'select' && def.options && !def.options.some((o) => o.value === value)) {
    errors.push(err(key, `${def.label} must be one of the listed options.`));
  }
  return errors;
}
