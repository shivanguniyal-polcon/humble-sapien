// The data commons, classified. Themes replace the flat sector tags so the
// directory reads like an archive: every row carries publisher, coverage,
// licence, what it is, and what you can do with it on this site. Bundled rows
// are the datasets the evaluation engine runs on; the rest link to source.

import { datasets as dirDatasets } from './opendata';

export const themes = [
  { id: 'population', label: 'Population & census', note: 'Complete enumerations. Where a number has to be right, it starts here.' },
  { id: 'health', label: 'Health & nutrition', note: 'Household surveys, programme series and health accounts.' },
  { id: 'labour', label: 'Labour & work', note: 'Employment, wages and the working day, by survey and by official count.' },
  { id: 'education', label: 'Education', note: 'School systems: enrolment, staffing, completion.' },
  { id: 'tech', label: 'Technology & AI', note: 'Digital infrastructure, adoption and the governance of algorithms.' },
  { id: 'economy', label: 'Economy & industry', note: 'Output, trade, energy and the industrial base.' },
  { id: 'environment', label: 'Environment & climate', note: 'What is measured about the physical world, and at what resolution.' },
  { id: 'governance', label: 'Governance, justice & security', note: 'State capacity, rule of law, elections and public safety.' },
  { id: 'society', label: 'Society & demographics', note: 'Gender, childhood, youth and the shape of the population.' },
];

const sectorTheme = {
  tech: 'tech', ai: 'tech',
  health: 'health',
  labour: 'labour',
  education: 'education',
  industrial: 'economy',
  environment: 'environment', climate: 'environment',
  crime: 'governance', justice: 'governance', security: 'governance', foreign: 'governance',
  'women-children': 'society', youth: 'society', niche: 'society',
};

// Bundled first: these run in the evaluation engine or the data playground.
const bundled = [
  {
    theme: 'population',
    name: 'Census of India 2011: state and UT key indicators',
    pub: 'Registrar General and Census Commissioner, India',
    coverage: '2011 · all usual residents · 35 states and UTs',
    licence: 'open',
    terms: 'Re-published census tables fall under the Government Open Data License (GODL) India',
    what: 'Population, sex ratio, literacy (total, male, female) and SC/ST counts from the Primary Census Abstract.',
    canDo: 'Runs in the evaluation engine: 8 derived indicators across 35 units for regression, IV, RDD and matching.',
    url: 'https://censusindia.gov.in/census.website/data/census-tables',
    lab: true,
  },
  {
    theme: 'health',
    name: 'NFHS state panel: 2005-06, 2015-16, 2019-21',
    pub: 'IIPS / Ministry of Health and Family Welfare',
    coverage: '3 survey waves · 36 states and UTs · 5 indicators',
    licence: 'free-access',
    terms: 'Factsheets public; community extractions of the IIPS state factsheets, verified against published totals',
    what: 'Anaemia in women, stunting, institutional births, total fertility rate and women with 10+ years of schooling.',
    canDo: 'Runs in the evaluation engine: difference-in-differences, event studies and synthetic control on a real three-wave panel.',
    url: 'https://www.nfhsiips.in/',
    lab: true,
  },
  {
    theme: 'health',
    name: 'PM-JAY programme trajectories',
    pub: 'National Health Authority, via THS analysis',
    coverage: '2018-2025 · national · cards, admissions, hospitals, value',
    licence: 'open',
    terms: 'Derived from NHA and PIB releases; model calibrated against official anchors',
    what: 'The programme series behind the fiscal sustainability model.',
    canDo: 'Open in the data playground to correlate any two series, or read the calibration report.',
    url: 'https://pmjay.gov.in/',
    run: 'pmjay',
  },
  {
    theme: 'governance',
    name: 'EVM rollout and the gender turnout gap',
    pub: 'Election Commission of India, via THS analysis',
    coverage: '1998-2024 · state-constituency panel',
    licence: 'open',
    terms: 'THS working analysis on ECI turnout records; EC98 specifications published in full',
    what: 'Rollout exposure against the gender gap in turnout, with horserace and dosage-response designs.',
    canDo: 'Open in the data playground to inspect every specification.',
    url: 'https://www.eci.gov.in/',
    run: 'evm',
  },
];

export const catalog = [
  ...bundled,
  ...dirDatasets.map((d) => ({
    theme: sectorTheme[d.sector] || 'society',
    name: d.name,
    pub: d.pub,
    coverage: d.what,
    licence: d.license,
    terms: d.terms,
    what: d.what,
    canDo: 'Linked source: download from the publisher. Checks and quirks noted on the record.',
    url: d.url,
  })),
];

export function byTheme(themeId) {
  return themeId === 'all' ? catalog : catalog.filter((r) => r.theme === themeId);
}
