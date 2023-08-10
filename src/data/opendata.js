// THS Open Data Directory: government datasets you can actually reuse.
// License labels are honest: 'open' means explicit reuse terms were found on
// the source; 'portal-default' means the portal's stated default applies but
// item-level terms should be checked; 'free-access' means data are free to
// download but no reuse licence was confirmed. Check before commercial reuse.

export const LICENSES = {
  open: { label: 'Open licence', note: 'Explicit reuse terms found' },
  'portal-default': { label: 'Portal default', note: 'Portal policy applies, check the item' },
  'free-access': { label: 'Free access', note: 'Free to download, licence unverified' },
};

export const datasets = [
  // technology
  { sector: 'tech', name: 'ICT Access and Usage by Businesses', pub: 'OECD', url: 'https://data-explorer.oecd.org/', license: 'portal-default', terms: 'OECD content from July 2024 is CC BY 4.0; dataset-level terms not confirmed', what: 'Business ICT-use indicators across countries and years.' },
  { sector: 'tech', name: 'EU open data portal (data.europa.eu)', pub: 'European Commission', url: 'https://data.europa.eu/', license: 'portal-default', terms: 'EU re-use decision encourages reuse with attribution; item exceptions exist', what: 'Catalogue of datasets from EU institutions and member states, all sectors.' },
  // ai
  { sector: 'ai', name: 'Federal Agency AI Use Case Inventory 2024', pub: 'US Office of Management and Budget', url: 'https://github.com/ombegov/2024-Federal-AI-Use-Case-Inventory', license: 'free-access', terms: 'No explicit data licence found in the repository', what: 'CSV and XLS files covering 2,133 federal AI use cases from 41 agencies.' },
  { sector: 'ai', name: 'India open data portal (data.gov.in)', pub: 'Government of India', url: 'https://www.data.gov.in/', license: 'portal-default', terms: 'Government Open Data License (GODL) India applies to portal datasets', what: 'Thousands of Indian government datasets across ministries and sectors.' },
  // health
  { sector: 'health', name: 'Global Health Observatory', pub: 'World Health Organization', url: 'https://www.who.int/data/gho', license: 'free-access', terms: 'WHO publication terms do not automatically cover GHO data items', what: 'Health indicators for member states: mortality, immunisation, health systems.' },
  { sector: 'health', name: 'Youth Risk Behavior Surveillance (YRBSS)', pub: 'US CDC', url: 'https://www.cdc.gov/yrbs/data/index.html', license: 'free-access', terms: 'Free to download and use per CDC; no formal licence name stated', what: 'US high-school health-risk behaviours, national and state datasets.' },
  { sector: 'health', name: 'National Family Health Survey (NFHS-5)', pub: 'India MoHFW / IIPS', url: 'https://www.nfhsiips.in/', license: 'free-access', terms: 'Reports public; microdata via DHS portal after registration', what: 'India household survey on health, nutrition and fertility, 2019-21.' },
  // industrial
  { sector: 'industrial', name: 'World Development Indicators', pub: 'World Bank', url: 'https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators', license: 'open', terms: 'CC BY 4.0, stated on the dataset record', what: '1,500+ development indicators including industry, trade and infrastructure, 1960-2025.' },
  { sector: 'industrial', name: 'EIA Open Data', pub: 'US Energy Information Administration', url: 'https://www.eia.gov/opendata/', license: 'free-access', terms: 'API access requires registration and terms agreement', what: 'US energy time series: electricity, petroleum, natural gas.' },
  // labour
  { sector: 'labour', name: 'ILOSTAT databases', pub: 'International Labour Organization', url: 'https://ilostat.ilo.org/data/', license: 'open', terms: 'CC BY 4.0 for datasets published on or after 3 May 2023', what: 'Global labour statistics: employment, wages, working conditions.' },
  { sector: 'labour', name: 'Labour Market Statistics', pub: 'UK Office for National Statistics', url: 'https://www.data.gov.uk/dataset/ea10bc7b-3887-4bd2-93f3-97c7ea209e4e/labour-market-statistics', license: 'portal-default', terms: 'Open Government Licence v3.0 by default on data.gov.uk, check the record', what: 'UK employment, unemployment, earnings and vacancies series.' },
  { sector: 'labour', name: 'Periodic Labour Force Survey (PLFS)', pub: 'India MoSPI', url: 'https://microdata.gov.in/NADA/index.php/catalog/PLFS', license: 'free-access', terms: 'Access and reuse terms unverified; registration may apply', what: 'India employment and unemployment indicators by survey round.' },
  // education
  { sector: 'education', name: 'UIS Data Browser', pub: 'UNESCO Institute for Statistics', url: 'https://databrowser.uis.unesco.org/', license: 'open', terms: 'CC BY-SA 4.0, stated in UIS terms and conditions', what: 'Internationally comparable education, science and culture statistics.' },
  { sector: 'education', name: 'UDISE+ school data and reports', pub: 'India Ministry of Education', url: 'https://dashboard.udiseplus.gov.in/', license: 'free-access', terms: 'No explicit reuse licence found on the portal', what: 'Indian school profiles, infrastructure and enrolment by academic year.' },
  // environment
  { sector: 'environment', name: 'EPA environmental data', pub: 'US Environmental Protection Agency', url: 'https://edg.epa.gov/epa_data_license.html', license: 'open', terms: 'US public domain by default unless a dataset says otherwise', what: 'Air, water, waste and chemical datasets across US environmental programmes.' },
  { sector: 'environment', name: 'Copernicus Sentinel data', pub: 'EU / ESA Copernicus programme', url: 'https://dataspace.copernicus.eu/terms-and-conditions', license: 'open', terms: 'Free, full and open under the Sentinel Data Legal Notice; registration needed', what: 'Satellite earth observation from the Sentinel missions since 2014.' },
  // climate
  { sector: 'climate', name: 'Global Historical Climatology Network daily (GHCNd)', pub: 'US NOAA NCEI', url: 'https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily', license: 'free-access', terms: 'Aggregates many sources; record-level terms not confirmed', what: 'Daily temperature, precipitation and snow from 100,000+ stations in 180 countries.' },
  { sector: 'climate', name: 'Eurostat databases', pub: 'Eurostat', url: 'https://ec.europa.eu/eurostat/data/database', license: 'portal-default', terms: 'Reuse permitted with source acknowledgement; exceptions for third-party items', what: 'European statistics: energy, environment, economy, population.' },
  // crime
  { sector: 'crime', name: 'Crime Statistics (Crime Survey + police records)', pub: 'UK ONS via data.gov.uk', url: 'https://www.data.gov.uk/dataset/d174ce54-1cc2-4cb2-963b-91ae703d989a/crime_statistics', license: 'portal-default', terms: 'Open Government Licence v3.0 by default; check the record for exceptions', what: 'Crime Survey for England and Wales and police-recorded crime series.' },
  { sector: 'crime', name: 'Crime Data Explorer (UCR)', pub: 'US FBI', url: 'https://cde.ucr.cjis.gov/', license: 'free-access', terms: 'No dataset-level reuse licence confirmed', what: 'Reported US crime and law-enforcement data from participating agencies.' },
  // justice
  { sector: 'justice', name: 'UNODC Data Portal', pub: 'UN Office on Drugs and Crime', url: 'https://data.unodc.org/', license: 'free-access', terms: 'Reuse licence not confirmed on the portal', what: 'International indicators on homicide, prisons, justice systems and drugs.' },
  { sector: 'justice', name: 'Worldwide Governance Indicators', pub: 'World Bank', url: 'https://www.worldbank.org/en/publication/worldwide-governance-indicators', license: 'open', terms: 'CC BY 4.0 under the World Bank open data default', what: 'Rule of law, control of corruption and government effectiveness, all countries.' },
  // women & children
  { sector: 'women-children', name: 'Gender Statistics', pub: 'World Bank', url: 'https://datacatalog.worldbank.org/search/dataset/0037654/gender-statistics', license: 'open', terms: 'CC BY 4.0, stated on the dataset record', what: 'Sex-disaggregated data on education, health, work and public life, 1960-2025.' },
  { sector: 'women-children', name: 'UNdata', pub: 'UN Statistics Division', url: 'https://data.un.org/', license: 'free-access', terms: 'Conditions of use exist; exact terms not verified in this pass', what: 'Statistical series compiled from UN sources across all development topics.' },
  // youth
  { sector: 'youth', name: 'ACS 5-Year Detailed Tables', pub: 'US Census Bureau', url: 'https://catalog.data.gov/dataset/american-community-survey-5-year-estimates-detailed-tables-5-year', license: 'open', terms: 'CC0 1.0 public domain dedication, shown in the dataset record', what: 'Detailed US population and housing tables down to block-group level.' },
  { sector: 'youth', name: 'World Bank Poverty and Equity Database', pub: 'World Bank', url: 'https://datacatalog.worldbank.org/search/dataset/0038020/poverty-and-equity-database-poverty-and-inequality-platform', license: 'open', terms: 'CC BY 4.0, stated on the dataset record', what: 'Poverty, inequality and distribution measures, 1963-2023.' },
  // security
  { sector: 'security', name: 'Known Exploited Vulnerabilities Catalog', pub: 'US CISA', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', license: 'free-access', terms: 'Machine-readable formats offered; reuse licence not stated', what: 'Catalogue of actively exploited software vulnerabilities, continuously updated.' },
  // foreign
  { sector: 'foreign', name: 'Development indicators and aid data (WDI)', pub: 'World Bank', url: 'https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators', license: 'open', terms: 'CC BY 4.0, stated on the dataset record', what: 'Country-comparable development, trade and aid indicators, 1960-2025.' },
  // niche
  { sector: 'niche', name: 'World Bank microdata library', pub: 'World Bank', url: 'https://microdata.worldbank.org/', license: 'free-access', terms: 'Terms vary by survey; check each catalogue record', what: 'Household and firm survey microdata from countries worldwide.' },
];

export const directorySectors = [
  ['all', 'Everything'],
  ['tech', 'Technology'],
  ['ai', 'AI'],
  ['health', 'Health'],
  ['industrial', 'Industrial'],
  ['labour', 'Labour'],
  ['education', 'Education'],
  ['environment', 'Environment'],
  ['climate', 'Climate'],
  ['crime', 'Crime'],
  ['justice', 'Justice'],
  ['women-children', 'Women & children'],
  ['youth', 'Youth'],
  ['security', 'Security'],
  ['foreign', 'Foreign'],
  ['niche', 'Niche'],
];

export const licenseLaw = [
  ['Best', 'Public domain and CC0 (US federal data, US Census): reuse needs no permission at all.'],
  ['Strong', 'Named open licences: CC BY 4.0 (World Bank, ILO post-2023), CC BY-SA 4.0 (UNESCO), OGL v3.0 (UK), GODL (India). Copy, adapt and sell, just credit the source.'],
  ['Check first', 'Portal defaults and free-access data: the download is free, but reuse terms may differ per item. Read the record before publishing.'],
];
