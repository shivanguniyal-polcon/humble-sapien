// THS Policy Atlas: 15 sectors, flagship policies in the Global North and
// Global South, and where the approaches split.
// Policy names, years and design traits checked against official or
// authoritative sources (see sectorSources). "signature" is a distinctive
// design trait, not a claim of exclusivity. Grouping North/South is an
// analytic choice by THS, not an official classification.

export const sectors = [
  {
    id: 'tech',
    label: 'Technology & digital',
    north: [
      { n: 'General Data Protection Regulation (GDPR)', j: 'European Union', y: '2016', w: 'Common rules for processing personal data, applying across the EU since May 2018.', s: 'Data protection written in as a fundamental right, with one harmonised regulation for all member states.' },
      { n: 'Digital Services Act (DSA)', j: 'European Union', y: '2022', w: 'Obligations for digital intermediaries and online platforms, with extra duties for the largest services.', s: 'A graduated regime: the bigger the platform, the heavier the duties.' },
      { n: 'California Consumer Privacy Act (CCPA)', j: 'California, United States', y: '2018', w: 'Consumer rights to know, delete, correct and restrict sale of personal information.', s: 'An opt-out design: you can tell businesses not to sell or share your data.' },
    ],
    south: [
      { n: 'Digital Personal Data Protection Act', j: 'India', y: '2023', w: 'National framework for processing digital personal data, with duties on data fiduciaries.', s: 'A statutory Data Protection Board plus a consent-centred model with listed "legitimate uses".' },
      { n: 'Lei Geral de Proteção de Dados (LGPD)', j: 'Brazil', y: '2018', w: 'Regulates personal-data processing by public and private entities, digital or not.', s: 'One broad national law covering public and private processing together.' },
      { n: 'Personal Data Protection Law (UU PDP)', j: 'Indonesia', y: '2022', w: 'National framework for personal-data rights and controller obligations.', s: 'A single comprehensive statute instead of scattered sector rules.' },
    ],
    diff: [
      ['Architecture', 'Layered rules: a general data regulation plus a separate platform law (EU), or state-level consumer rights (California).', 'One national comprehensive statute per country, covering the whole field at once.'],
      ['Rights basis', 'GDPR grounds data in fundamental rights; CCPA grounds it in consumer choice and opt-outs.', 'Rights and handler duties are set nationally, with consent and legitimate-use lists at the centre.'],
      ['Legal form', 'EU regulations that bind directly, plus a state law where federal rules do not exist.', 'Acts of a national parliament, with a regulator or board created by the statute itself.'],
    ],
  },
  {
    id: 'ai',
    label: 'Artificial intelligence',
    north: [
      { n: 'AI Act (Regulation (EU) 2024/1689)', j: 'European Union', y: '2024', w: 'Harmonised rules for AI systems, with obligations tied to how they are used and the risk they carry.', s: 'Risk tiers: some practices are banned outright, high-risk uses carry heavy duties.' },
      { n: 'Directive on Automated Decision-Making', j: 'Canada', y: '2019', y2: 'federal', w: 'Requirements for federal departments using automated decision systems.', s: 'Mandatory Algorithmic Impact Assessments before deployment.' },
      { n: 'AI Promotion Act (fundamental law)', j: 'Japan', y: '2025', w: 'A national framework to promote AI research, development and use.', s: 'Promotion over policing: a Basic AI Plan and coordination duties, not compliance penalties.' },
    ],
    south: [
      { n: 'IndiaAI Mission', j: 'India', y: '2024', w: 'Cabinet-approved national programme to build AI compute, datasets, skills and adoption.', s: 'Capability first: public investment in the stack, not a compliance law.' },
      { n: 'Brazilian AI Strategy (EBIA)', j: 'Brazil', y: '2021', w: 'National strategic directions for responsible AI development and innovation.', s: 'A strategy of thematic axes and proposed actions rather than binding rules.' },
      { n: 'National AI Strategy (STRANAS KA)', j: 'Indonesia', y: '2020', w: 'Guides national AI development across 2020 to 2045 with priority areas for government.', s: 'AI policy tied to a 25-year development horizon: talent, ethics, infrastructure, industry.' },
    ],
    diff: [
      ['Main instrument', 'Binding regulation (EU AI Act), administrative directives (Canada), promotional statutes (Japan).', 'National strategies and missions that plan, fund and build capability.'],
      ['Emphasis', 'Risk control and rights protection, with promotion only where the politics allowed it.', 'National capability, priority sectors, infrastructure and skills.' ],
      ['Enforcement', 'Obligations phased in by risk category, with impact assessments in government use.', 'Mostly government planning and public investment; legal enforceability varies and is often thin.'],
    ],
  },
  {
    id: 'health',
    label: 'Health coverage',
    north: [
      { n: 'National Health Service (NHS)', j: 'United Kingdom', y: '1948', w: 'Tax-funded service providing comprehensive care to all ordinarily resident people.', s: 'Care as an entitlement of residence, not a purchased policy.' },
      { n: 'Medicaid', j: 'United States', y: '1965', w: 'Joint federal-state health coverage for people on low incomes, run state by state.', s: 'EPSDT: under-21s must receive medically necessary services beyond the standard package.' },
      { n: 'Canada Health Act', j: 'Canada', y: '1984', w: 'Sets conditions provinces must meet to receive federal health transfers.', s: 'Cash-supremacy conditions: portability and comprehensiveness are enforced through the money.' },
    ],
    south: [
      { n: 'Ayushman Bharat PM-JAY', j: 'India', y: '2018', w: 'Cashless hospital assurance for poor households, with an annual family cap of ₹5 lakh.', s: 'Targeted hospital cover with a defined package, not a general health service.' },
      { n: 'Universal Coverage Scheme (UCS)', j: 'Thailand', y: '2002', w: 'Tax-funded residual scheme covering citizens outside civil-service and social-security funds.', s: 'Strategic purchasing: capitation for outpatients, DRG payment inside a global budget.' },
      { n: 'JKN (BPJS Kesehatan)', j: 'Indonesia', y: '2014', w: 'Mandatory national health insurance for all residents, now covering about 98% of the population.', s: 'Single-payer consolidation: hundreds of schemes merged into one.' },
    ],
    diff: [
      ['Who pays', 'Broad tax or payroll bases that fund entitlements (UK, Canada) or means-tested programmes (US).', 'Government budgets and small contributions, with funding as the live constraint.'],
      ['Getting in', 'Residence or eligibility category is enough.', 'Poverty lists, enrolment drives and cards decide who gets covered first.'],
      ['The package', 'Comprehensive: primary, hospital, mental health, community care.', 'Start with what impoverishes fastest (hospital care), then widen.'],
      ['The fight today', 'Waiting lists, ageing and cost growth: quality, not access.', 'Fraud, out-of-pocket costs and thin budgets: access first, quality next.'],
    ],
  },
  {
    id: 'industrial',
    label: 'Industrial policy',
    north: [
      { n: 'CHIPS and Science Act', j: 'United States', y: '2022', w: 'Support for domestic semiconductor manufacturing plus research programmes for federal science agencies.', s: 'Manufacturing support and science funding bundled into one federal law.' },
      { n: 'European Chips Act', j: 'European Union', y: '2023', w: 'Aims to strengthen the EU semiconductor ecosystem and reduce external dependencies.', s: 'Three pillars: research capacity, security of supply, and crisis monitoring.' },
      { n: 'Inflation Reduction Act (manufacturing credits)', j: 'United States', y: '2022', w: 'Tax credits for clean-energy manufacturing, including an Advanced Manufacturing Production Credit.', s: 'Delivered through the tax code, with bonus credits for wage and apprenticeship standards.' },
    ],
    south: [
      { n: 'Production-Linked Incentive (PLI) Scheme', j: 'India', y: '2020', w: 'Sector-based incentives to raise manufacturing competitiveness, investment and exports.', s: 'Incentives tied to incremental production, across 14 sectors rather than one project.' },
      { n: 'Nova Indústria Brasil (NIB)', j: 'Brazil', y: '2024', w: 'National industrial-development agenda to 2033, invested through BNDES, Finep and Embrapii.', s: 'Organised around six missions: agro, health, infrastructure, digitalisation, decarbonisation, strategic tech.' },
      { n: 'National Industrialization Policy Framework', j: 'Kenya', y: '2012', w: 'Long-term industrialisation framework running to 2030.', s: 'A single long-horizon framework for a whole industrialisation drive.' },
    ],
    diff: [
      ['Target', 'Named strategic technologies: semiconductors and clean energy.', 'Whole sectors and national development agendas, not one technology.'],
      ['Instrument', 'Federal grants, research programmes and tax credits.', 'Production-linked incentives and mission-based planning through public banks.'],
      ['Goal', 'Supply-chain resilience and technological sovereignty.', 'Domestic production, jobs and capability building at national scale.'],
    ],
  },
  {
    id: 'labour',
    label: 'Labour & work',
    north: [
      { n: 'Fair Labor Standards Act (FLSA)', j: 'United States', y: '1938', w: 'Federal minimum wage, overtime, recordkeeping and child-labour standards.', s: 'A federal floor only: states can go higher, and no general paid leave is guaranteed.' },
      { n: 'National Minimum Wage Act', j: 'United Kingdom', y: '1998', w: 'Statutory basis for the UK national minimum wage.', s: 'Rates advised by the Low Pay Commission, with business, union and academic members.' },
      { n: 'European Pillar of Social Rights Action Plan', j: 'European Union', y: '2021', w: 'Roadmap turning social principles into policy, with 2030 headline targets.', s: 'Quantified EU-wide targets: 78% employment, 60% adult training, 15 million fewer at poverty risk.' },
    ],
    south: [
      { n: 'National Minimum Wage Act', j: 'South Africa', y: '2018', w: 'National minimum wage with a commission that reviews it annually, in force since January 2019.', s: 'A statutory floor with an annual review process and an exemption mechanism.' },
      { n: 'Code on Social Security', j: 'India', y: '2020', w: 'Consolidates social-security law and recognises gig and platform workers as a category.', s: 'First-class statutory recognition of gig and platform work (recognition is not a benefit guarantee).' },
      { n: 'Bolsa Família', j: 'Brazil', y: '2023', w: 'Federal cash transfer for low-income families, run through the Cadastro Único registry.', s: 'Cash support tied to health and education follow-through, shared across three levels of government.' },
    ],
    diff: [
      ['Focus', 'Statutory wage floors and shared employment targets for formal workers.', 'Wage floors plus cash transfers, and worker categories the North only debates (gig, platform).'],
      ['Coverage logic', 'Covered employment as the unit; informal work sits outside the frame.', 'Registries and codes designed to pull informal and platform workers into the system.'],
      ['Delivery', 'Wage law enforced on employers; EU targets tracked nationally.', 'National law plus programme administration, with subnational coordination (Brazil).'],
    ],
  },
  {
    id: 'education',
    label: 'Education',
    north: [
      { n: 'Every Student Succeeds Act (ESSA)', j: 'United States', y: '2015', w: 'Reauthorises federal K-12 law: standards, accountability and school support.', s: 'Federal assessment requirements with states designing their own accountability systems.' },
      { n: 'Pupil Premium', j: 'England, United Kingdom', y: '2011', w: 'Extra school funding for disadvantaged pupils.', s: 'Money follows the disadvantaged pupil, but schools choose how to spend it.' },
      { n: 'Compulsory Education Act', j: 'Finland', y: '2020', w: 'Extends compulsory education to age 18 or an upper-secondary qualification, from August 2021.', s: 'Compulsory schooling extended upward, with learning materials free within the system.' },
    ],
    south: [
      { n: 'National Education Policy (NEP)', j: 'India', y: '2020', w: 'National framework covering school and higher education.', s: 'A 5+3+3+4 school structure rebuilt around developmental stages.' },
      { n: 'Fundeb (Constitutional Amendment 108)', j: 'Brazil', y: '2020', w: 'Makes school financing permanent, raises federal contributions and steers money to poorer municipalities.', s: 'Redistribution by formula, with part of transfers tied to education outcomes.' },
      { n: 'National Norms and Standards for School Funding', j: 'South Africa', y: '1998', w: 'National norms for funding public schools under the Schools Act.', s: 'School poverty quintiles decide the money: poorer schools get relatively more.' },
    ],
    diff: [
      ['Instrument', 'Accountability frameworks and targeted top-up funding for disadvantaged pupils.', 'National curricular redesign and redistributive financing formulas.'],
      ['Who decides', 'States and schools hold the spending discretion (US, England).', 'National formulas direct money across municipalities and school categories.'],
      ['Reform style', 'Extend the years of compulsory schooling (Finland).', 'Rebuild the structure (India) or the money flows (Brazil, South Africa).'],
    ],
  },
  {
    id: 'environment',
    label: 'Environment & biodiversity',
    north: [
      { n: 'Endangered Species Act', j: 'United States', y: '1973', w: 'Protects listed threatened and endangered species and plans their recovery.', s: 'Species listing plus interagency duties to avoid harm to listed species.' },
      { n: 'Nature Restoration Regulation', j: 'European Union', y: '2024', w: 'Binding restoration targets for degraded ecosystems across land and sea.', s: 'A measurable EU-wide target: restoration covering at least 20% of land and sea by 2030.' },
      { n: 'Environment Act 2021 (biodiversity net gain)', j: 'England, United Kingdom', y: '2021', w: 'Statutory basis for biodiversity net gain in planning decisions.', s: 'Most development must deliver 10% biodiversity net gain, measured by a statutory metric.' },
    ],
    south: [
      { n: 'Forest Code (Law 12,651)', j: 'Brazil', y: '2012', w: 'Rules for protecting and sustainably using native vegetation on rural land.', s: 'Conservation duties land on private landowners: Permanent Preservation Areas and Legal Reserves.' },
      { n: 'Forest Rights Act', j: 'India', y: '2006', w: 'Recognises forest and land rights of forest-dwelling communities.', s: 'Community forest-resource rights, with the Gram Sabha running claims and governance.' },
      { n: 'Forestry Law 7575 (payments for services)', j: 'Costa Rica', y: '1996', w: 'Legal basis for conservation and paying landowners for forest environmental services.', s: 'Pays for carbon, water, biodiversity and scenery, funded largely by a fuel tax.' },
    ],
    diff: [
      ['Instrument', 'Species protections and measurable outcome targets on development.', 'Land-use rules on owners, plus payments and recognised community rights.'],
      ['Who acts', 'Regulators, statutory duties and planning systems.', 'Landholders and forest communities are named policy actors, not subjects.' ],
      ['Measurement', 'Metrics and percentages (10% net gain, 20% restoration).', 'Rights recognition and payment schemes that make conservation pay locally.' ],
    ],
  },
  {
    id: 'climate',
    label: 'Climate & energy transition',
    north: [
      { n: 'EU Emissions Trading System (Directive 2003/87/EC)', j: 'European Union', y: '2003', w: 'Cap-and-trade for greenhouse-gas emissions from covered sectors, operating since 2005.', s: 'A declining cap creates tradable allowances; auction revenue funds the transition.' },
      { n: 'Greenhouse Gas Pollution Pricing Act', j: 'Canada', y: '2018', w: 'Federal carbon pricing through a fuel charge and output-based pricing for large industry.', s: 'Two mechanisms in one law: a fuel charge and a separate industrial benchmark system.' },
      { n: 'Climate Change Act', j: 'United Kingdom', y: '2008', w: 'Legally binding carbon budgets with independent oversight; the 2050 target was strengthened to net zero in 2019.', s: 'Five-year carbon budgets kept out of day-to-day politics by an independent committee.' },
    ],
    south: [
      { n: 'National Green Hydrogen Mission', j: 'India', y: '2023', w: 'Supports production, use and export of green hydrogen and derivatives.', s: 'SIGHT incentives for electrolysers and hydrogen production, plus hydrogen hubs.' },
      { n: 'RenovaBio (Law 13,576)', j: 'Brazil', y: '2017', w: 'Cuts transport-fuel carbon intensity by expanding biofuels and creating decarbonisation credits.', s: 'Mandatory distributor targets met with tradable CBIO credits scored on lifecycle carbon.' },
      { n: 'Carbon Tax Act', j: 'South Africa', y: '2019', w: 'Tax on the CO2 equivalent of greenhouse-gas emissions, in force since June 2019.', s: 'A statutory emissions tax, with rates adjusted over time rather than a trading floor.' },
    ],
    diff: [
      ['Pricing carbon', 'Emissions trading with a hard cap (EU) and hybrid pricing frameworks (Canada).', 'A direct tax (South Africa) and credit markets tied to certified fuels (Brazil).'],
      ['Industrial tool', 'Tax credits pull private investment into clean energy at scale (US style).', 'Mission-led public programmes build specific industries, like green hydrogen (India).'],
      ['Time binding', 'Long-run legal targets and budgets that survive electoral cycles.', 'Mission deadlines and tax schedules tied to development priorities.' ],
    ],
  },
  {
    id: 'crime',
    label: 'Crime & policing',
    north: [
      { n: 'First Step Act', j: 'United States', y: '2018', w: 'Reforms federal prison programming, time credits and corrections practice.', s: 'Risk-and-needs assessments that convert rehabilitation work into earned time credits.' },
      { n: 'Police, Crime, Sentencing and Courts Act', j: 'England and Wales', y: '2022', w: 'Changes police powers to condition processions and assemblies.', s: 'Protest conditions expanded by reference to "serious disruption", framed as balancing rights and impact.' },
      { n: 'Interrogation recording amendment', j: 'Japan', y: '2016', w: 'Mandatory audio-video recording of interrogations in specified case categories.', s: 'Recording as evidence safeguard, but only in listed categories, not universally.' },
    ],
    south: [
      { n: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)', j: 'India', y: '2023', w: 'Replaces the Code of Criminal Procedure with a new procedural framework.', s: 'Wholesale recodification of criminal procedure instead of incremental amendment.' },
      { n: 'Independent Policing Oversight Authority Act', j: 'Kenya', y: '2011', w: 'Creates civilian oversight of the police through IPOA.', s: 'An oversight authority that sits outside the police service it investigates.' },
      { n: 'IPID Act', j: 'South Africa', y: '2011', w: 'Establishes the Independent Police Investigative Directorate.', s: 'Statutory duty to investigate deaths in custody, police shootings, rape, torture and assault.' },
    ],
    diff: [
      ['Reform target', 'Operational fixes: rehabilitation incentives, protest powers, interrogation procedure.', 'Structural moves: new procedural codes and standalone police-oversight institutions.'],
      ['Accountability', 'Oversight varies; the selected laws mostly change powers rather than create watchdogs.', 'Dedicated civilian bodies (Kenya, South Africa) with statutory investigation duties.'],
      ['Style', 'Amend and adjust existing systems.', 'Rewrite the system wholesale or build a new institution beside it.' ],
    ],
  },
  {
    id: 'justice',
    label: 'Justice & legal aid',
    north: [
      { n: 'Legal Services Corporation Act', j: 'United States', y: '1974', w: 'Creates the LSC to fund civil legal assistance for people who cannot afford it.', s: 'A private nonprofit distributes funding; the statute protects lawyers freedom to act for clients.' },
      { n: 'LASPO', j: 'England and Wales', y: '2012', w: 'Reshapes the scope of civil legal aid and related funding.', s: 'Legal aid defined by statutory categories and exceptions, not a general right to representation.' },
      { n: 'Comprehensive Legal Support Act', j: 'Japan', y: '2004', w: 'Sets principles for legal support and creates the Japan Legal Support Center.', s: 'Information, civil legal aid and court-appointed counsel under one national centre.' },
    ],
    south: [
      { n: 'Legal Services Authorities Act', j: 'India', y: '1987', w: 'Creates legal-services authorities for free legal aid and organises Lok Adalats.', s: 'Legal aid plus statutory alternative dispute forums (Lok Adalats) in one architecture.' },
      { n: 'Legal Aid South Africa Act', j: 'South Africa', y: '2014', w: 'Establishes Legal Aid South Africa and its governing board.', s: 'Independence and impartiality written into the statute that funds the service.' },
      { n: 'Legal Aid Act', j: 'Kenya', y: '2016', w: 'Statutory legal-aid framework with a National Legal Aid Service.', s: 'A national service that also accredits private providers to deliver aid.' },
    ],
    diff: [
      ['Delivery model', 'A grant-making nonprofit (US), a statutory scope regime (UK), a national support centre (Japan).', 'Statutory authorities with local forums (India) and national services that accredit providers (Kenya).'],
      ['Scope', 'Mostly civil matters, with eligibility rules narrowing who gets help.', 'Free services for named groups, plus community dispute forums outside the courts.' ],
      ['Design intent', 'Equal access framed against economic barriers.', 'Access plus institutional delivery at district level.' ],
    ],
  },
  {
    id: 'women-children',
    label: 'Women & children',
    north: [
      { n: 'Violence Against Women Act (2022 reauthorisation)', j: 'United States', y: '2022', w: 'Reauthorises VAWA and expands tribal criminal jurisdiction over specified crimes.', s: 'Special tribal jurisdiction extended to child violence, sexual violence, trafficking and stalking.' },
      { n: 'Act respecting First Nations, Inuit and Métis children', j: 'Canada', y: '2019', w: 'Affirms Indigenous jurisdiction over child and family services.', s: 'A child cannot be taken into care solely for poverty or inadequate housing.' },
      { n: 'Employment Insurance maternity and parental benefits', j: 'Canada', y: '1996', w: 'Income benefits during maternity and parental leave.', s: 'Maternity and parental benefits split, with parental leave shareable and extendable.' },
    ],
    south: [
      { n: "Children's Act 38", j: 'South Africa', y: '2005', w: 'Comprehensive child-law framework: care, protection, parental responsibilities, children’s courts, adoption.', s: 'One broad statute gathering all of child law instead of single-issue laws.' },
      { n: 'Law on Prevention and Punishment of Gender-Based Violence', j: 'Rwanda', y: '2008', w: 'Standalone legal framework for preventing and punishing gender-based violence.', s: 'GBV given its own statute rather than folded into general criminal law.' },
      { n: 'Maternity Benefit (Amendment) Act', j: 'India', y: '2017', w: 'Amends maternity-benefit law for eligible employees.', s: 'Paid maternity leave extended from 12 to 26 weeks.' },
    ],
    diff: [
      ['Child protection', 'Jurisdiction and principles first: who decides, and on what grounds a child is separated.', 'Comprehensive national child statutes and standalone GBV laws.' ],
      ['Family policy', 'Income replacement through insurance systems with shareable parental leave.', 'Longer statutory maternity entitlements tied to employment law.' ],
      ['Approach', 'Rights and jurisdiction (tribal, Indigenous) as the lever.', 'Codification and benefit extension as the levers.' ],
    ],
  },
  {
    id: 'youth',
    label: 'Youth: jobs & skills',
    north: [
      { n: 'Reinforced Youth Guarantee', j: 'European Union', y: '2020', w: 'Commitment to offer under-30s a job, education, apprenticeship or traineeship within four months.', s: 'A time-bound offer commitment, implemented through national plans and EU funding.' },
      { n: 'Vocational Training Act (BBiG)', j: 'Germany', y: '1969', w: 'Legal framework for the dual vocational training system.', s: 'Company training governed by recognised occupational regulations with fixed exams.' },
      { n: 'Apprenticeship Levy', j: 'United Kingdom', y: '2017', w: 'Levy on qualifying employers to fund apprenticeship training.', s: '0.5% of pay bill above a threshold, collected as a hiring-and-training signal.' },
    ],
    south: [
      { n: 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY)', j: 'India', y: '2015', w: 'Skill training and certification to improve employability, including recognition of prior learning.', s: 'Outcome-based national certification that also counts skills people already have.' },
      { n: 'Apprenticeship Law (Lei da Aprendizagem)', j: 'Brazil', y: '2000', w: 'Statutory apprenticeship framework requiring larger establishments to hire apprentices.', s: 'Mandatory employer quotas of roughly 5% to 15% of the relevant workforce.' },
      { n: 'Employment Tax Incentive (ETI)', j: 'South Africa', y: '2013', w: 'Tax incentive reducing employers’ payroll tax for hiring young workers, live from January 2014.', s: 'The state subsidises the first payslip through the tax system rather than funding training.' },
    ],
    diff: [
      ['Who is obliged', 'Public institutions coordinate offers (EU) or employers fund training via levy (UK).', 'Employers face quotas (Brazil) or receive hiring subsidies (South Africa).'],
      ['What is offered', 'A guaranteed offer within a deadline, or a regulated training pathway.', 'Certification of skills, apprenticeship slots, or cheaper first hires.'],
      ['Philosophy', 'Service guarantee and training standards.', 'Direct pressure or payment on the demand side: the employer.' ],
    ],
  },
  {
    id: 'security',
    label: 'Security & defence',
    north: [
      { n: 'Strong, Secure, Engaged (defence policy)', j: 'Canada', y: '2017', w: 'Sets defence priorities and planned reforms for the armed forces.', s: 'A public defence policy: strong at home, secure in the continent, engaged in the world.' },
      { n: 'European Border and Coast Guard Regulation', j: 'European Union', y: '2019', w: 'Legal basis for Frontex and its Standing Corps supporting member states at borders.', s: 'A supranational uniformed service of up to 10,000 officers by 2027.' },
      { n: 'Nationality and Borders Act', j: 'United Kingdom', y: '2022', w: 'Changes nationality, asylum and immigration rules.', s: 'Asylum claims can be ruled inadmissible after irregular arrival from a safe country.' },
    ],
    south: [
      { n: 'Agnipath Scheme', j: 'India', y: '2022', w: 'Recruits young people into the armed forces as Agniveers on fixed terms.', s: 'Four-year service tenures instead of career-long recruitment.' },
      { n: 'Border Management Authority Act', j: 'South Africa', y: '2020', w: 'Creates a single Border Management Authority.', s: 'Border functions previously scattered across departments, integrated into one body.' },
      { n: 'Constitution, Article 12 (abolition of the army)', j: 'Costa Rica', y: '1949', w: 'Proscribes a permanent army; public order is kept by necessary forces.', s: 'Security by constitutional demilitarisation.' },
    ],
    diff: [
      ['Force design', 'Long-term defence planning and standing multinational corps.', 'Fixed-term recruitment reforms, integrated border bodies, or no standing army at all.'],
      ['Borders', 'Supranational corps (EU) and asylum-rule tightening (UK).', 'One national authority per border (South Africa), with defence kept separate from policing.'],
      ['Model', 'Capability, operations and immigration control.', 'Institutional innovation: how forces are raised, merged or abolished.' ],
    ],
  },
  {
    id: 'foreign',
    label: 'Foreign policy & cooperation',
    north: [
      { n: 'PEPFAR', j: 'United States', y: '2003', w: 'Global HIV/AIDS initiative supporting prevention, care and treatment in partner countries.', s: 'Disease-focused aid at massive scale, delivered across many agencies.' },
      { n: 'Global Gateway', j: 'European Union', y: '2021', w: 'Investment and cooperation strategy for digital, energy, transport, health and research links.', s: '"Team Europe" investment with explicit sustainability and labour standards attached.' },
      { n: 'Partnership for Quality Infrastructure', j: 'Japan', y: '2015', w: 'Infrastructure-financing initiative for partner countries.', s: 'Quality of infrastructure as the selling point, not volume of projects.' },
    ],
    south: [
      { n: 'Development Partnership Administration', j: 'India', y: '2012', w: 'Foreign-ministry division coordinating development partnerships and concessional credit lines.', s: 'Infrastructure finance bundled with technical cooperation and capacity building.' },
      { n: 'Vaccine Maitri', j: 'India', y: '2021', w: 'COVID-19 vaccine supply abroad through grant, commercial and COVAX channels.', s: 'Aid, sales and multilateral distribution in one campaign.' },
      { n: 'Indonesian AID', j: 'Indonesia', y: '2019', w: 'Public-service agency managing Indonesia’s international development cooperation.', s: 'A domestic endowment-fund model for financing assistance abroad.' },
    ],
    diff: [
      ['Instrument', 'Large programme delivery and standards-based investment strategies.', 'Concessional credit, technical cooperation, vaccine supply and aid endowments.'],
      ['Positioning', 'Donor frameworks with quality and sustainability conditions attached.', 'South-South cooperation language, capacity building and patient capital.' ],
      ['Delivery', 'Multi-agency programmes and coordinated regional platforms.', 'A foreign-ministry unit, a supply campaign, or a purpose-built aid agency.' ],
    ],
  },
  {
    id: 'niche',
    label: 'Niche & innovation',
    north: [
      { n: 'e-Residency', j: 'Estonia', y: '2014', w: 'State-issued digital identity letting non-residents use Estonian online services and run EU companies.', s: 'A country as a service: citizenship-free access to a state’s digital infrastructure.' },
      { n: 'vTaiwan', j: 'Taiwan', y: '2014', w: 'Online and offline public consultation process for policy discussions.', s: 'Structured online deliberation that actually feeds into lawmaking.' },
      { n: 'European Citizens’ Initiative', j: 'European Union', y: '2012', w: 'Lets citizens invite the Commission to consider proposing EU legislation.', s: 'One million valid signatures buys a hearing, not an automatic law.' },
    ],
    south: [
      { n: 'Unified Payments Interface (UPI)', j: 'India', y: '2016', w: 'Mobile payments interface linking multiple bank accounts for instant transfers.', s: 'Interoperable public payment rails that private apps build on top of.' },
      { n: 'Pix', j: 'Brazil', y: '2020', w: 'Central-bank instant-payment scheme.', s: 'A central bank building the rail itself and making instant payments free and ubiquitous.' },
      { n: 'Bolsa Família', j: 'Brazil', y: '2003', w: 'Federal cash-transfer programme reducing poverty while investing in human capital.', s: 'Conditional cash transfers as a platform for health and education follow-through.' },
    ],
    diff: [
      ['What is new', 'New interfaces between citizen and state: identity, deliberation, petitions.', 'New public infrastructure for money movement and social protection at population scale.'],
      ['Who builds', 'States offering services to non-residents and structured participation.', 'Central banks and social registries building rails everyone else plugs into.'],
      ['Reach', 'Elegant, small-surface innovations that punch above their weight.', 'Systems measured in hundreds of millions of users.' ],
    ],
  },
];

export const sectorSources = [
  'European Commission (data protection, AI Act, Chips Act, nature restoration, Global Gateway, Youth Guarantee)',
  'EUR-Lex (DSA, Platform Work Directive, EU ETS directive)',
  'Official law portals: legislation.gov.uk, Congress.gov, PRS Legislative Research, Kenya Law, South African Government, Planalto (Brazil), BPK (Indonesia), Japan Law Translation',
  'US agencies: DOL, BOP, DOJ, FWS, IRS, LSC; Canada: laws-lois.justice.gc.ca, Canada.ca',
  'PIB and ministry pages (India: DPDP, PLI, NEP, PMKVY, Agnipath, Green Hydrogen, BNSS, Maternity Benefit)',
  'World Bank, ILO, OECD and IEA policy databases',
];

export const atlasNote =
  'This atlas compares selected flagship policies, not whole regions. "North" and "South" are analytic groupings by THS, and approaches vary widely within each group. Years are enactment or launch years; some instruments are statutes and some are programmes, and the table says which in each card.';
