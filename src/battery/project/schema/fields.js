import { isPublicField, publicFieldKeys } from './visibility.js';

const deepClone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

let fieldOrder = 0;
function field(key, label, type, unit, group, opts = {}) {
  return {
    key,
    label,
    type,
    unit,
    group,
    modes: isPublicField(key) ? ['public', 'practitioner'] : ['practitioner'],
    required: opts.required === true,
    default: opts.default ?? null,
    min: opts.min,
    max: opts.max,
    step: opts.step,
    options: opts.options ? deepClone(opts.options) : undefined,
    help: opts.help || '',
    showIf: opts.showIf || null,
    benchmark: opts.benchmark || null,
    order: fieldOrder++,
  };
}

const isHam = (v) => v && v.sector === 'ham-road';
const isSolar = (v) => v && v.sector === 'solar';
const isSculpted = (v) => v && v.repaymentProfile === 'sculpted';
const isCustomDiscount = (v) => v && v.discountScenario === 'custom';
const isFullEconomic = (v) => v && v.economicMode === 'full';
const is115Bab = (v) => v && v.taxRegime === '115BAB';

export const FIELD_GROUPS = [
  {
    id: 'identity',
    label: 'Project identity',
    fields: [
      field('projectName', 'Project name', 'text', '', 'identity', { required: true, help: 'Used on the memo and manifest.' }),
      field('sector', 'Sector archetype', 'select', '', 'identity', {
        required: true,
        default: 'ham-road',
        options: [
          { value: 'ham-road', label: 'HAM road' },
          { value: 'solar', label: 'Solar IPP' },
        ],
      }),
      field('state', 'State', 'text', '', 'identity', { required: true }),
      field('stage', 'Stage', 'select', '', 'identity', {
        default: 'dpr',
        options: [
          { value: 'concept', label: 'Concept' },
          { value: 'dpr', label: 'DPR / feasibility' },
          { value: 'bid', label: 'Bid' },
          { value: 'financial-close', label: 'Financial close' },
          { value: 'operating', label: 'Operating' },
        ],
      }),
      field('baseYear', 'Base year', 'integer', 'year', 'identity', { default: 2026, min: 2000, max: 2100 }),
      field('constructionYears', 'Construction period', 'number', 'years', 'identity', {
        min: 0,
        max: 10,
        step: 0.5,
        help: 'Public mode uses years; the engine converts to half-yearly periods.',
      }),
      field('constructionMonths', 'Construction period', 'number', 'months', 'identity', {
        min: 0,
        max: 120,
        step: 1,
      }),
      field('assetLifeYears', 'Asset / concession life', 'number', 'years', 'identity', { required: true, min: 1, max: 100, step: 1 }),
    ],
  },
  {
    id: 'physical',
    label: 'Physical scope',
    fields: [
      field('lengthKm', 'Road length', 'number', 'km', 'physical', { showIf: isHam, min: 0, max: 500 }),
      field('capacity', 'Capacity', 'number', 'MW', 'physical', { showIf: isSolar, min: 0, max: 5000 }),
      field('capacityUnit', 'Capacity unit', 'select', '', 'physical', {
        showIf: isSolar,
        default: 'MW',
        options: [
          { value: 'MW', label: 'MW' },
          { value: 'MLD', label: 'MLD' },
          { value: 'TPD', label: 'TPD' },
        ],
      }),
      field('landStatus', 'Land / right of way', 'select', '', 'physical', {
        default: 'partly',
        options: [
          { value: 'available', label: 'Available' },
          { value: 'partly', label: 'Partly acquired' },
          { value: 'not-acquired', label: 'Not acquired' },
        ],
      }),
      field('constructionPhasing', 'Construction drawdown weights', 'table', 'share', 'physical', {
        help: 'One weight per half-year; must sum to 1. Missing weights default to equal.',
      }),
    ],
  },
  {
    id: 'capex',
    label: 'Capital cost',
    fields: [
      field('capexCr', 'Total headline capex', 'currency', '₹ crore', 'capex', {
        min: 0,
        help: 'Public mode takes one number and treats it as hard cost with no soft-cost split.',
      }),
      field('hardCostCr', 'Hard cost', 'currency', '₹ crore', 'capex', { min: 0 }),
      field('softCostCr', 'Soft cost', 'currency', '₹ crore', 'capex', { min: 0 }),
      field('contingencyPct', 'Contingency', 'percent', '% of hard + soft', 'capex', {
        min: 0,
        max: 30,
        step: 0.5,
      }),
      field('hamSupportPct', 'HAM Authority support', 'percent', '% of project cost', 'capex', {
        showIf: isHam,
        min: 0,
        max: 100,
        step: 1,
        help: 'HAM MCA: 40% support in five milestone instalments.',
      }),
      field('grantPct', 'Capital grant / VGF', 'percent', '% of project cost', 'capex', {
        showIf: isSolar,
        min: 0,
        max: 100,
        step: 1,
      }),
      field('grantCr', 'Capital grant (absolute)', 'currency', '₹ crore', 'capex', {
        min: 0,
        help: 'Use either a grant percentage or an absolute grant, not both.',
      }),
      field('upfrontFeePct', 'Upfront fee', 'percent', '% of debt', 'capex', {
        min: 0,
        max: 5,
        step: 0.1,
      }),
      field('dsraMonths', 'Debt service reserve', 'number', 'months of debt service', 'capex', {
        min: 0,
        max: 24,
        step: 1,
      }),
      field('liquiditySupport', 'Liquidity support', 'select', '', 'capex', {
        default: 'none',
        options: [
          { value: 'none', label: 'None (contractual DSCR only)' },
          { value: 'dsra-draw', label: 'DSRA draw and replenish' },
        ],
        help: 'When enabled, the DSRA may cover a debt-service shortfall. Contractual DSCR is unchanged; the memo reports liquidity coverage separately.',
      }),
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue and demand',
    fields: [
      field('revenueModel', 'Revenue model', 'select', '', 'revenue', {
        default: 'level-annuity',
        options: [
          { value: 'level-annuity', label: 'Level annuity / availability payment' },
          { value: 'ham-annuity', label: 'HAM declining-balance annuity' },
          { value: 'tariff', label: 'Tariff x volume' },
        ],
      }),
      field('annualRevenueCr', 'Annual annuity / availability payment', 'currency', '₹ crore per year', 'revenue', {
        showIf: (v) => isHam(v) || (v && v.revenueModel === 'level-annuity'),
        min: 0,
      }),
      field('revenueEscalationPct', 'Revenue escalation', 'percent', '% per year', 'revenue', {
        min: -10,
        max: 30,
        step: 0.1,
      }),
      field('annuityYears', 'Annuity period', 'number', 'years', 'revenue', {
        showIf: isHam,
        min: 1,
        max: 40,
      }),
      field('annuityRatePct', 'HAM annuity rate', 'percent', '% per year', 'revenue', {
        showIf: isHam,
        min: 0,
        max: 25,
        step: 0.05,
        help: 'MCA benchmark: bank rate / MCLR + 1.25%. Enter the actual rate you are testing.',
      }),
      field('demand', 'Demand', 'number', 'PCU/day or riders/day', 'revenue', {
        min: 0,
      }),
      field('demandUnit', 'Demand unit', 'select', '', 'revenue', {
        default: 'PCU/day',
        options: [
          { value: 'PCU/day', label: 'PCU/day' },
          { value: 'riders/day', label: 'Riders/day' },
          { value: 'units/day', label: 'Units/day' },
        ],
      }),
      field('tariff', 'Tariff', 'number', '₹ per unit / PCU', 'revenue', {
        showIf: isSolar,
        min: 0,
      }),
      field('tariffUnit', 'Tariff unit', 'select', '', 'revenue', {
        showIf: isSolar,
        default: '₹/kWh',
        options: [
          { value: '₹/kWh', label: '₹/kWh' },
          { value: '₹/PCU', label: '₹/PCU' },
        ],
      }),
      field('tariffEscalationPct', 'Tariff escalation', 'percent', '% per year', 'revenue', {
        showIf: isSolar,
        min: -10,
        max: 30,
        step: 0.1,
        help: 'Most Indian solar PPAs are fixed; leave at zero unless the PPA has an escalation clause.',
      }),
      field('availabilityPct', 'Availability', 'percent', '%', 'revenue', {
        min: 0,
        max: 100,
      }),
      field('collectionEfficiencyPct', 'Collection efficiency', 'percent', '%', 'revenue', {
        min: 0,
        max: 100,
      }),
      field('cufPct', 'Capacity utilisation factor', 'percent', '%', 'revenue', {
        showIf: isSolar,
        min: 0,
        max: 100,
        step: 0.1,
      }),
      field('degradationPct', 'Module degradation', 'percent', '% per year', 'revenue', {
        showIf: isSolar,
        min: 0,
        max: 5,
        step: 0.01,
      }),
    ],
  },
  {
    id: 'opex',
    label: 'Operating cost',
    fields: [
      field('opexFixedCrPerYear', 'Fixed O&M', 'currency', '₹ crore per year', 'opex', { min: 0 }),
      field('opexVariablePerUnit', 'Variable O&M', 'number', '₹ per unit', 'opex', {
        min: 0,
      }),
      field('opexEscalationPct', 'O&M escalation', 'percent', '% per year', 'opex', {
        min: -5,
        max: 30,
        step: 0.1,
      }),
      field('lifecycleCostCr', 'Major maintenance / lifecycle cost', 'currency', '₹ crore', 'opex', {
        min: 0,
      }),
      field('lifecyclePeriodYears', 'Lifecycle cycle', 'number', 'years', 'opex', {
        min: 0,
        max: 30,
      }),
      field('insurancePct', 'Insurance', 'percent', '% of gross cost per year', 'opex', {
        min: 0,
        max: 5,
        step: 0.05,
      }),
    ],
  },
  {
    id: 'financing',
    label: 'Financing and covenants',
    fields: [
      field('gearingPct', 'Gearing', 'percent', '% of funding requirement', 'financing', {
        min: 0,
        max: 90,
        step: 1,
        help: 'Debt share of total funding requirement, including IDC, fees and DSRA.',
      }),
      field('interestRatePct', 'Interest rate', 'percent', '% per year nominal', 'financing', {
        min: 0,
        max: 25,
        step: 0.05,
      }),
      field('waccPct', 'Project discount rate', 'percent', '% per year nominal', 'financing', {
        min: 0,
        max: 40,
        step: 0.1,
        help: 'Nominal screening discount rate for project FCFF. This is a convention, not a market WACC; replace it with the lender or sponsor rate before relying on NPV.',
      }),
      field('costOfEquityPct', 'Cost of equity', 'percent', '% per year nominal', 'financing', {
        min: 0,
        max: 40,
        step: 0.1,
        help: 'Nominal equity hurdle for equity NPV. Equity IRR does not use this rate.',
      }),
      field('rateType', 'Rate type', 'select', '', 'financing', {
        default: 'fixed',
        options: [
          { value: 'fixed', label: 'Fixed' },
          { value: 'floating', label: 'Floating' },
        ],
      }),
      field('benchmarkRatePct', 'Benchmark rate', 'percent', '% per year', 'financing', {
        min: 0,
        max: 25,
        showIf: (v) => v && v.rateType === 'floating',
      }),
      field('spreadPct', 'Spread', 'percent', '% per year', 'financing', {
        min: 0,
        max: 10,
        showIf: (v) => v && v.rateType === 'floating',
      }),
      field('loanTenorYears', 'Loan tenor', 'number', 'years', 'financing', {
        min: 1,
        max: 40,
      }),
      field('moratoriumYears', 'Moratorium', 'number', 'years', 'financing', {
        min: 0,
        max: 10,
      }),
      field('repaymentProfile', 'Repayment profile', 'select', '', 'financing', {
        default: 'annuity',
        options: [
          { value: 'annuity', label: 'Annuity (equal payment)' },
          { value: 'equal-principal', label: 'Equal principal' },
          { value: 'sculpted', label: 'Sculpted to target DSCR' },
        ],
      }),
      field('targetDscr', 'Target DSCR', 'number', 'x', 'financing', {
        min: 0.5,
        max: 5,
        step: 0.01,
        showIf: isSculpted,
      }),
      field('lockupDscr', 'Lock-up DSCR', 'number', 'x', 'financing', {
        default: 1.15,
        min: 0.5,
        max: 5,
        step: 0.01,
      }),
      field('defaultDscr', 'Default DSCR', 'number', 'x', 'financing', {
        default: 1.05,
        min: 0.5,
        max: 5,
        step: 0.01,
      }),
      field('dsoDays', 'Receivable days', 'number', 'days', 'financing', {
        default: 45,
        min: 0,
        max: 365,
      }),
      field('dpoDays', 'Payable days', 'number', 'days', 'financing', {
        default: 30,
        min: 0,
        max: 180,
      }),
    ],
  },
  {
    id: 'tax',
    label: 'Tax and depreciation',
    fields: [
      field('taxRegime', 'Tax regime', 'select', '', 'tax', {
        default: '115BAA',
        options: [
          { value: '115BAA', label: 'Section 115BAA (25.168%)' },
          { value: '115BAB', label: 'Section 115BAB (17.16%)' },
          { value: 'ordinary', label: 'Ordinary corporate rate (34.944%)' },
        ],
        help: 'Tax is a transfer in the economic lens; it is a cash cost in the financial lens.',
      }),
      field('legacy115Bab', 'Eligible for 115BAB', 'checkbox', '', 'tax', {
        showIf: is115Bab,
        help: '115BAB requires a new manufacturing or power undertaking and a 1 October 2019 – 31 March 2024 commencement window. Do not switch it on without checking.',
      }),
      field('wdvBlockPct', 'WDV block rate', 'percent', '% per year', 'tax', {
        default: 10,
        min: 0,
        max: 100,
        step: 0.1,
      }),
      field('slmLifeYears', 'Book depreciation life', 'number', 'years', 'tax', {
        default: 15,
        min: 1,
        max: 60,
      }),
      field('lossCarryYears', 'Business-loss carry-forward', 'number', 'years', 'tax', {
        default: 8,
        min: 0,
        max: 20,
      }),
      field('gstRecoverablePct', 'GST / duty recoverable', 'percent', '% of capex', 'tax', {
        min: 0,
        max: 100,
      }),
    ],
  },
  {
    id: 'economic',
    label: 'Economic bridge',
    fields: [
      field('economicMode', 'Economic lens', 'select', '', 'economic', {
        default: 'none',
        options: [
          { value: 'none', label: 'Financial lens only' },
          { value: 'screen', label: 'Economic screen' },
          { value: 'full', label: 'Full economic CBA' },
        ],
      }),
      field('discountScenario', 'Discount-rate schedule', 'select', '', 'economic', {
        default: 'niti-2026',
        options: [
          { value: 'niti-2026', label: 'NITI Aayog 2026 step-down' },
          { value: 'niti-2018', label: 'NITI Aayog 2018 flat 8%' },
          { value: 'custom', label: 'Custom' },
        ],
      }),
      field('customDiscountRatePct', 'Custom discount rate', 'percent', '% real', 'economic', {
        min: 0,
        max: 30,
        showIf: isCustomDiscount,
      }),
      field('inflationPct', 'Inflation', 'percent', '% per year', 'economic', {
        min: 0,
        max: 20,
        step: 0.1,
      }),
      field('carbonTco2e', 'Avoided emissions', 'number', 'tCO2e per year', 'economic', {
        min: 0,
      }),
      field('carbonPriceUsd', 'Carbon price', 'number', 'USD per tCO2e', 'economic', {
        min: 0,
      }),
      field('benefitLines', 'Benefit lines', 'table', '', 'economic', {
        showIf: isFullEconomic,
        help: 'Each line needs a label, annual value, start year, end year and evidence level.',
      }),
      field('sourceNote', 'Source note', 'textarea', '', 'economic', {
        help: 'Free-text provenance for the memo. It does not change the calculation.',
      }),
    ],
  },
];

export const FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

export function fieldByKey(key) {
  return FIELD_BY_KEY[key];
}

export function fieldLabel(key) {
  return FIELD_BY_KEY[key]?.label || key;
}

export function fieldUnit(key) {
  return FIELD_BY_KEY[key]?.unit || '';
}

export function publicFields(sector = 'ham-road') {
  return publicFieldKeys(sector).map((key) => FIELD_BY_KEY[key]).filter(Boolean);
}
