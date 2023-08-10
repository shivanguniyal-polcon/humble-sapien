// THS Compare: publicly funded health coverage schemes across the globe.
// Sources: WHO/World Bank/OECD/government materials, per sourceUrl fields.
// "signature" = a distinctive design trait, not a claim of exclusivity.

// Regional grouping. "Global North" = UK, US (high-income, mature welfare
// states). "Global South" = India, Thailand, Indonesia, Rwanda, Brazil
// (coverage still expanding). Grouping is analytic, not official.
export const regions = {
  north: {
    id: 'north',
    label: 'Global North',
    thesis:
      'Health coverage arrived after the state could already pay for it. These systems were built in rich countries, mostly in the 20th century, and they think in terms of entitlements, not enrolment drives.',
    approach: [
      ['Who pays', 'Broad tax or payroll bases. Everyone contributes through the tax system or mandatory insurance, so funding is stable and large.'],
      ['Who is covered', 'Residence or membership, not poverty tests. The default is everyone, and the hard arguments are about what is excluded.'],
      ['What is delivered', 'Comprehensive care: primary, hospital, mental health, long term. Packages are broad and old.'],
      ['Where digital sits', 'Digital systems manage records, not rights. Your ID helps the system find your file; it does not decide if you deserve care.'],
      ['The hard problem now', 'Ageing populations, rising costs, and waiting lists. The debate is about quality and budgets, not basic access.'],
    ],
    vsSouth:
      'The Global South is still building the front door. These systems argue about who gets in.',
  },
  south: {
    id: 'south',
    label: 'Global South',
    thesis:
      'Health coverage is being built now, at speed, often before the money is comfortable. These systems think in terms of targets, cards, and getting the worst harms under control first.',
    approach: [
      ['Who pays', 'Mixed and stretched: government budgets, small premiums, community pooling, donor support. Funding is the live constraint.'],
      ['Who is covered', 'Targeting first: poverty lists, informal workers, the rural poor. Universalism is the goal, but the entry door is narrow.'],
      ['What is delivered', 'Start with what kills and impoverishes fastest: inpatient care, maternity, referral pathways. Packages grow over time.'],
      ['Where digital sits', 'Digital identity is the front door. Aadhaar-style linkage and mobile apps decide who gets a card and who gets caught.'],
      ['The hard problem now', 'Getting people enrolled and keeping promises. Fraud, out-of-pocket spending, and squeezing quality out of thin budgets.'],
    ],
    vsNorth:
      'The Global North debates what care should include. These systems are still getting care to people at all.',
  },
};

export const schemes = [
  {
    id: 'pmjay',
    region: 'south',
    country: 'India',
    flag: '🇮🇳',
    name: 'Ayushman Bharat PM-JAY',
    covered: 'Target: 100 million poor households (scheme target, not enrolment)',
    eligibility: 'Socioeconomic vulnerability (SECC household criteria); 70+ expansion approved',
    financing: 'Government-funded; no beneficiary premiums',
    benefits: 'Hospital care only: secondary and tertiary inpatient packages',
    providers: 'Empanelled public and private hospitals',
    portability: 'Reported national portability; implementation not fully verified',
    digital: 'Aadhaar-linked verification; requirement varies by state',
    signature:
      'Cashless, defined-package hospital assurance with an annual family-level cap (₹5 lakh): a targeted hospital scheme, not a general health service',
  },
  {
    id: 'nhs',
    region: 'north',
    country: 'United Kingdom',
    flag: '🇬🇧',
    name: 'NHS',
    covered: 'All ordinarily resident people (subject to charging rules)',
    eligibility: 'Ordinary residence: not citizenship or tax history',
    financing: 'General taxation, plus National Insurance contributions',
    benefits: 'Comprehensive: primary, hospital, community, mental health',
    providers: 'Mostly public; GPs are independent contractors; some private delivery',
    portability: 'Devolved across four nations: not one uniform UK-wide scheme',
    digital: 'NHS number identifies patients but does not itself establish entitlement',
    signature:
      'Residence-based tax-funded service: care is an entitlement, not a purchased policy',
  },
  {
    id: 'ucs',
    region: 'south',
    country: 'Thailand',
    flag: '🇹🇭',
    name: 'Universal Coverage Scheme (UCS)',
    covered: '53 million people (2021): about 74% of the population',
    eligibility: 'Thai citizens outside civil-service and social-security schemes; not income-tested',
    financing: 'General taxation, non-contributory',
    benefits: 'Comprehensive: outpatient, inpatient, prevention and promotion',
    providers: 'Predominantly public district health network; some contracted private clinics',
    portability: 'Registered-provider network with referral rules; later reforms not fully verified',
    digital: 'National ID/UC-card linkage (not verified from official source)',
    signature:
      'Tax-funded residual scheme with strategic purchasing: capitation for outpatients, DRG payment within a global budget for inpatients',
  },
  {
    id: 'jkn',
    region: 'south',
    country: 'Indonesia',
    flag: '🇮🇩',
    name: 'JKN (BPJS Kesehatan)',
    covered: '280 million members: 98% of the population (World Bank, Jul 2025)',
    eligibility: 'Mandatory for all residents, regardless of income or employment',
    financing: 'Mixed social insurance: contributions plus government subsidy for the poor',
    benefits: 'Broad: outpatient, inpatient, prescribed medicines; some exclusions',
    providers: 'Contracted public and private; specialist care via referral',
    portability: 'National scheme, but subject to contracted-provider and referral rules',
    digital: 'Mobile JKN app; national-ID linkage not verified',
    signature:
      'Single-payer consolidation: hundreds of fragmented insurance arrangements merged into one standardised national scheme',
  },
  {
    id: 'cbhi',
    region: 'south',
    country: 'Rwanda',
    flag: '🇷🇼',
    name: 'Mutuelles de Santé (CBHI)',
    covered: '>90% of Rwandans held some health insurance in 2020 (all schemes, not CBHI alone)',
    eligibility: 'National scheme for people not covered elsewhere: informal and rural households',
    financing: 'Mixed: member premiums plus government subsidy for the poorest',
    benefits: 'Defined package through a referral pathway: health centre → district hospital → referral',
    providers: 'Health centres, district hospitals, referral facilities',
    portability: 'Referral-based access; no verified right to use any provider anywhere',
    digital: 'No scheme-specific digital-ID linkage verified',
    signature:
      'Community-based mutual insurance, nationally organised, with premium subsidies for the poor: local participation meets government financing',
  },
  {
    id: 'sus',
    region: 'south',
    country: 'Brazil',
    flag: '🇧🇷',
    name: 'SUS',
    covered: 'Universal entitlement: private insurance does not remove SUS access',
    eligibility: 'Universal access; not income-tested',
    financing: 'Public revenues across federal, state and municipal levels',
    benefits: 'Comprehensive, free at point of service: primary, hospital, vaccination, essential medicines',
    providers: 'Public facilities plus contracted private and nonprofit providers',
    portability: 'National system, decentralised; access not identical across municipalities',
    digital: 'Cartão Nacional de Saúde (CNS) user ID; Meu SUS Digital',
    signature:
      'Universal public entitlement that coexists with private insurance: the public system remains the right of everyone',
  },
  {
    id: 'medicaid',
    region: 'north',
    country: 'United States',
    flag: '🇺🇸',
    name: 'Medicaid',
    covered: '65.97 million enrollees (CMS snapshot, Jun 2026)',
    eligibility: 'Means-tested and category-based; varies by state',
    financing: 'Joint federal and state funding',
    benefits: 'Comprehensive but state-variable; EPSDT gives under-21s especially broad coverage',
    providers: 'Public and private; fee-for-service and managed care, varies by state',
    portability: 'Limited: state-administered; moving usually requires new eligibility',
    digital: 'No single national beneficiary ID; state-administered systems',
    signature:
      'EPSDT: children under 21 must receive medically necessary services to correct or ameliorate conditions, even beyond the standard state package',
  },
];

export const featureRows = [
  { key: 'covered', label: 'Population covered' },
  { key: 'eligibility', label: 'Eligibility basis' },
  { key: 'financing', label: 'Financing' },
  { key: 'benefits', label: 'Benefits package' },
  { key: 'providers', label: 'Provider mix' },
  { key: 'portability', label: 'Portability' },
  { key: 'digital', label: 'Digital ID linkage' },
];

// Head-to-head approach differences between the two regions, read off the
// schemes above. Plain language, no jargon.
export const approachDiff = [
  {
    dimension: 'The starting question',
    north: 'What should the system include?',
    south: 'Who can we get covered first, and how?',
  },
  {
    dimension: 'Money',
    north: 'Big, steady pots: general taxes (UK, Thailand, Brazil) or payroll insurance (US share).',
    south: 'Mixed and tight: state budgets (India), small premiums with subsidies (Rwanda), mandatory insurance (Indonesia).',
  },
  {
    dimension: 'Getting in',
    north: 'Living there is enough. Residence (UK) or eligibility category (US).',
    south: 'You often need to be found first: poverty lists, enrolment drives, a card.',
  },
  {
    dimension: 'The package',
    north: 'Wide: primary care, hospitals, mental health, community care.',
    south: 'Focused first: hospital care and maternity, then widening (India covers inpatient care only today).',
  },
  {
    dimension: 'Technology',
    north: 'Runs the paperwork: records, referrals, billing.',
    south: 'Runs the front door: digital IDs decide who gets a card (India) or who is counted (Indonesia).',
  },
  {
    dimension: 'The fight today',
    north: 'Waiting lists, ageing, cost growth. Quality, not access.',
    south: 'Fraud, out-of-pocket costs, thin budgets. Access first, quality next.',
  },
];

export const sources = [
  'BMC Health Services Research (2024): PM-JAY design study',
  'gov.uk / NHS entitlement guidance',
  'BMJ Global Health (2024): Thailand UCS',
  'World Bank (2025/26): Indonesia JKN coverage brief',
  'Pan African Medical Journal (2020): Rwanda CBHI',
  'IJERPH (2022) + OECD (2025): Brazil SUS',
  'CMS.gov: Medicaid overview, EPSDT, enrollment data',
];
