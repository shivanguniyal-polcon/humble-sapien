// THS Policy Atlas: 15 sectors, flagship policies in the Global North and
// Global South, and where the approaches split.
// Policy names, years and design traits checked against official or
// authoritative sources (see sectorSources). "signature" is a distinctive
// design trait, not a claim of exclusivity. Grouping North/South is an
// analytic choice by THS, not an official classification.
//
// Every policy also carries a "pit": THS's own reading of the public
// interest test, in the three questions the PIT Desk asks. Who benefits,
// who pays, who is missing. These are readings of what the instrument
// does, not claims made by the instrument, and they are the part of the
// card most worth arguing with. scripts/test-atlas.mjs fails if a policy
// loses one of the three.

export const sectors = [
  {
    id: 'tech',
    label: 'Technology & digital',
    north: [
      {
        n: 'General Data Protection Regulation (GDPR)',
        j: 'European Union',
        y: '2016',
        w: 'Common rules for processing personal data, applying across the EU since May 2018.',
        s: 'Data protection written in as a fundamental right, with one harmonised regulation for all member states.',
        pit: {
          benefits: 'Anyone whose data is processed in the EU gains rights to access, correct, erase and object, and one set of rules to read instead of 27. People can also take a case to a single regulator.',
          pays: 'Firms that trade in EU data pay for consent systems, deletion workflows and the fines that follow. Individuals pay in the friction of making a request, and in whatever a company decides not to collect next time.',
          missing: 'People whose data is processed outside the EU, or by entities the regulation does not reach. Records that never became digital stay outside it, whether they sit in a clinic file, a school register or a notebook a neighbour keeps.',
        },
      },
      {
        n: 'Digital Services Act (DSA)',
        j: 'European Union',
        y: '2022',
        w: 'Obligations for digital intermediaries and online platforms, with extra duties for the largest services.',
        s: 'A graduated regime: the bigger the platform, the heavier the duties.',
        pit: {
          benefits: 'Users get a complaint route, restrictions on certain ads, and a duty on platforms to say how they rank content. Small publishers gain a way to be heard that national media law rarely gives them.',
          pays: 'The largest platforms pay for compliance staff, audit rights and risk teams. Smaller intermediaries carry a lighter version. The enforcement budget comes from the public purse.',
          missing: 'People outside the EU live with the effects of these rules on the platforms they use and get none of the remedies. Smaller services can lose the reach that came from operating across borders.',
        },
      },
      {
        n: 'California Consumer Privacy Act (CCPA)',
        j: 'California, United States',
        y: '2018',
        w: 'Consumer rights to know, delete, correct and restrict sale of personal information.',
        s: 'An opt-out design: you can tell businesses not to sell or share your data.',
        pit: {
          benefits: 'California residents can see what a business holds about them, have it deleted, and refuse its sale. The consumer takes the first move rather than waiting for a regulator.',
          pays: 'Businesses pay to honour requests, and that work lands in the price of whatever they sell. Data brokers lose the revenue from selling what the law lets a person refuse.',
          missing: 'Residents whose data was already sold before the opt-out, and anyone outside California sitting in the same systems. A right to delete does not reach data already in a third party\'s hands.',
        },
      },
    ],
    south: [
      {
        n: 'Digital Personal Data Protection Act',
        j: 'India',
        y: '2023',
        w: 'National framework for processing digital personal data, with duties on data fiduciaries.',
        s: 'A statutory Data Protection Board plus a consent-centred model with listed "legitimate uses".',
        pit: {
          benefits: 'Indians gain a right to know what a digital firm holds about them and to have it erased. Start-ups get one national rulebook instead of a patchwork of state amendments.',
          pays: 'Data fiduciaries pay for consent management, security and the board that inspects them. Individuals hand over contact details, and the cost of an identity check falls on the provider.',
          missing: 'The Act stops at the digital and at the border. Paper files in most small firms and many government offices sit outside it, and some rights cannot be exercised without documents people do not have.',
        },
      },
      {
        n: 'Lei Geral de Proteção de Dados (LGPD)',
        j: 'Brazil',
        y: '2018',
        w: 'Regulates personal-data processing by public and private entities, digital or not.',
        s: 'One broad national law covering public and private processing together.',
        pit: {
          benefits: 'Brazilians gain access, correction, deletion and the right to know who holds their data, in a law that covers public agencies as well as companies.',
          pays: 'Companies and the state pay for the registers, the consent logs and the sanctions. Individuals give up data in exchange for loans, apps and services.',
          missing: 'Access ordered by a judge, and data Brazil has already exported, are not covered. Rural and low-connectivity citizens reach these rights least often, because the rights run through the same networks they lack.',
        },
      },
      {
        n: 'Personal Data Protection Law (UU PDP)',
        j: 'Indonesia',
        y: '2022',
        w: 'National framework for personal-data rights and controller obligations.',
        s: 'A single comprehensive statute instead of scattered sector rules.',
        pit: {
          benefits: 'Indonesians gain rights to access, correct and delete personal data, and state-held data gets a legal basis for the first time.',
          pays: 'Businesses pay for compliance, security and licensing. Individuals hand over identity documents for the sake of a loan, a job or a phone.',
          missing: 'The law leans on consent that most people sign without reading, and it says little about what happens to data already held. Someone with no digital footprint has nothing here to enforce.',
        },
      },
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
      {
        n: 'AI Act (Regulation (EU) 2024/1689)',
        j: 'European Union',
        y: '2024',
        w: 'Harmonised rules for AI systems, with obligations tied to how they are used and the risk they carry.',
        s: 'Risk tiers: some practices are banned outright, high-risk uses carry heavy duties.',
        pit: {
          benefits: 'People subject to a high-risk system get protections that cannot be traded away, and a deployer gets a published list of what counts as high risk.',
          pays: 'Providers of high-risk systems pay for conformity assessment, logging and human oversight. Public deployers carry the cost of the paper trail their decisions leave behind.',
          missing: 'The duties bite hardest on the largest systems. Small deployers and open-source models get lighter rules, and anyone harmed by a system outside the defined categories has no route to complain.',
        },
      },
      {
        n: 'Directive on Automated Decision-Making',
        j: 'Canada',
        y: '2019',
        y2: 'federal',
        w: 'Requirements for federal departments using automated decision systems.',
        s: 'Mandatory Algorithmic Impact Assessments before deployment.',
        pit: {
          benefits: 'A federal department must publish what it wants to automate and how it judged the impact, so the public can read the reasoning before the system runs.',
          pays: 'Departments pay for the assessment, the review and the documentation. Nobody applying for a service is charged for it.',
          missing: 'It binds the federal government and leaves private firms and provincial services alone. A person whose benefits are decided by an automated system at the provincial level gets no such record.',
        },
      },
      {
        n: 'AI Promotion Act (fundamental law)',
        j: 'Japan',
        y: '2025',
        w: 'A national framework to promote AI research, development and use.',
        s: 'Promotion over policing: a Basic AI Plan and coordination duties, not compliance penalties.',
        pit: {
          benefits: 'Japanese firms and researchers get state coordination, compute and shared datasets, with fewer compliance costs than a European-style risk law would impose.',
          pays: 'Public money and civil servant time pay for the coordination and the plan. No citizen is charged.',
          missing: 'The statute governs promotion rather than harm, so the person a deployed system injures has no forum inside it. The plan sets priorities for research and does nothing for a worker harmed by a system built under it.',
        },
      },
    ],
    south: [
      {
        n: 'IndiaAI Mission',
        j: 'India',
        y: '2024',
        w: 'Cabinet-approved national programme to build AI compute, datasets, skills and adoption.',
        s: 'Capability first: public investment in the stack, not a compliance law.',
        pit: {
          benefits: 'Researchers and start-ups get compute, datasets and skills programmes, and Indian languages gain models and data that would not otherwise exist.',
          pays: 'The exchequer pays for the compute capacity and the empanelled partners. No citizen pays a direct charge.',
          missing: 'The mission is built for the firms constructing the stack. The people whose data trains the models, and the users who carry the errors, are nowhere in the design.',
        },
      },
      {
        n: 'Brazilian AI Strategy (EBIA)',
        j: 'Brazil',
        y: '2021',
        w: 'National strategic directions for responsible AI development and innovation.',
        s: 'A strategy of thematic axes and proposed actions rather than binding rules.',
        pit: {
          benefits: 'Research bodies, government and industry share one set of priorities and a plan to fund them, with ethics and transparency among the axes.',
          pays: 'Public funding and the time of civil servants working across ministries pay for the coordination. Users are not charged.',
          missing: 'A strategy has no enforcement behind it. The person a system misjudges has no remedy until a later law gives them one.',
        },
      },
      {
        n: 'National AI Strategy (STRANAS KA)',
        j: 'Indonesia',
        y: '2020',
        w: 'Guides national AI development across 2020 to 2045 with priority areas for government.',
        s: 'AI policy tied to a 25-year development horizon: talent, ethics, infrastructure, industry.',
        pit: {
          benefits: 'Indonesian agencies and firms get a common 25-year frame, and the priority sectors are named so budgets can follow them.',
          pays: 'The national budget pays for the programmes, and agency staff pay in coordination time.',
          missing: 'The horizon is long and the binding force is thin. Workers in the priority sectors hold no entitlement under the strategy, and there is no complaint route for them.',
        },
      },
    ],
    diff: [
      ['Main instrument', 'Binding regulation (EU AI Act), administrative directives (Canada), promotional statutes (Japan).', 'National strategies and missions that plan, fund and build capability.'],
      ['Emphasis', 'Risk control and rights protection, with promotion only where the politics allowed it.', 'National capability, priority sectors, infrastructure and skills.'],
      ['Enforcement', 'Obligations phased in by risk category, with impact assessments in government use.', 'Mostly government planning and public investment; legal enforceability varies and is often thin.'],
    ],
  },
  {
    id: 'health',
    label: 'Health coverage',
    north: [
      {
        n: 'National Health Service (NHS)',
        j: 'United Kingdom',
        y: '1948',
        w: 'Tax-funded service providing comprehensive care to all ordinarily resident people.',
        s: 'Care as an entitlement of residence, not a purchased policy.',
        pit: {
          benefits: 'Everyone ordinarily resident gets care regardless of income, most of it free at the point of use, and nobody is turned away for being poor.',
          pays: 'The taxpayer funds it through general taxation, so the cost lands across the whole population rather than on the sick. People who use it pay in waiting time.',
          missing: 'Non-residents get emergency care and little else. People who cannot reach a clinic, or who wait long enough to give up, get nothing from a right on paper.',
        },
      },
      {
        n: 'Medicaid',
        j: 'United States',
        y: '1965',
        w: 'Joint federal-state health coverage for people on low incomes, run state by state.',
        s: 'EPSDT: under-21s must receive medically necessary services beyond the standard package.',
        pit: {
          benefits: 'Low-income households, and in most states children and pregnant women, get cover for doctor visits, hospital care and prescriptions they would otherwise buy out of pocket.',
          pays: 'Federal and state governments pay, and enrollees pay modest premiums and co-payments. Providers accept lower fees in exchange for the volume.',
          missing: 'Each state sets its own rules, so the benefit differs across a border and can be cut in a budget year. Adults who fit no state category get nothing.',
        },
      },
      {
        n: 'Canada Health Act',
        j: 'Canada',
        y: '1984',
        w: 'Sets conditions provinces must meet to receive federal health transfers.',
        s: 'Cash-supremacy conditions: portability and comprehensiveness are enforced through the money.',
        pit: {
          benefits: 'Provinces keep the money and the administration, and residents get medically necessary hospital and physician services without a fee at the point of care.',
          pays: 'Federal general taxation funds the transfer that conditions provincial spending, and provinces cover the rest from their own revenue.',
          missing: 'Drugs, dental, vision and long-term care sit outside the Act. Provinces that do not sign the agreements lose the federal transfer, and a resident of a province with its own system is not covered by this one.',
        },
      },
    ],
    south: [
      {
        n: 'Ayushman Bharat PM-JAY',
        j: 'India',
        y: '2018',
        w: 'Cashless hospital assurance for poor households, with an annual family cap of ₹5 lakh.',
        s: 'Targeted hospital cover with a defined package, not a general health service.',
        pit: {
          benefits: 'Families below the deprivation criteria get ₹5 lakh a year of cashless hospital care, and a published price list caps what a hospital can bill.',
          pays: 'The centre and the states share the premium, funded by general taxation and by a slice of states\' GST. Covered households pay nothing for covered treatment.',
          missing: 'Eligibility runs off a list that states update unevenly, so a family that slips off it loses cover. The package stops at secondary and tertiary care, and outpatient treatment and medicines largely sit outside it.',
        },
      },
      {
        n: 'Universal Coverage Scheme (UCS)',
        j: 'Thailand',
        y: '2002',
        w: 'Tax-funded residual scheme covering citizens outside civil-service and social-security funds.',
        s: 'Strategic purchasing: capitation for outpatients, DRG payment inside a global budget.',
        pit: {
          benefits: 'Thais outside the civil service and social security funds get a tax-funded residual scheme that pays for care they would otherwise buy themselves.',
          pays: 'General taxation pays, with a small per-capita contribution from those enrolled. People pay co-payments for services outside the benefit.',
          missing: 'The workers the scheme was built for are informal workers who have never registered, and they are the hardest to enrol. Migrants without documents fail the eligibility rule.',
        },
      },
      {
        n: 'JKN (BPJS Kesehatan)',
        j: 'Indonesia',
        y: '2014',
        w: 'Mandatory national health insurance for all residents, now covering about 98% of the population.',
        s: 'Single-payer consolidation: hundreds of schemes merged into one.',
        pit: {
          benefits: 'Residents get a national entitlement to medical care at public and contracted private facilities, and capitation gives hospitals a reason to keep people out of expensive wards.',
          pays: 'Workers and employers pay contributions and the state covers the poor. The fiscal gap in the middle class, where the premium is small but the wage is not, falls on the state budget.',
          missing: 'Contributors get a benefit on paper; the services they can use are narrower than the package, and a facility outside the contracted network charges full price.',
        },
      },
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
      {
        n: 'CHIPS and Science Act',
        j: 'United States',
        y: '2022',
        w: 'Support for domestic semiconductor manufacturing plus research programmes for federal science agencies.',
        s: 'Manufacturing support and science funding bundled into one federal law.',
        pit: {
          benefits: 'Chip fabs and the firms clustered around them get subsidies, and the science agencies get multi-year funding instead of an annual appropriation fight.',
          pays: 'Taxpayers pay, and the benefit concentrates. The subsidy reaches a handful of companies in a few states.',
          missing: 'The law speaks to the fab, not to the town around it. The workers who lose an older plant are not in the statute, and a withdrawn project takes its subsidy with it.',
        },
      },
      {
        n: 'European Chips Act',
        j: 'European Union',
        y: '2023',
        w: 'Aims to strengthen the EU semiconductor ecosystem and reduce external dependencies.',
        s: 'Three pillars: research capacity, security of supply, and crisis monitoring.',
        pit: {
          benefits: 'Member states get a shared framework for grants, research pilot lines and a mechanism to monitor supply disruption together.',
          pays: 'Member states and the Commission pay, and the framework lets each state shape its own intervention. Industry co-funds the pilot lines.',
          missing: 'The Act is a set of instruments rather than a commitment, so the money depends on what each government chooses to spend. The workers in a closed fab are not covered by it.',
        },
      },
      {
        n: 'Inflation Reduction Act (manufacturing credits)',
        j: 'United States',
        y: '2022',
        w: 'Tax credits for clean-energy manufacturing, including an Advanced Manufacturing Production Credit.',
        s: 'Delivered through the tax code, with bonus credits for wage and apprenticeship standards.',
        pit: {
          benefits: 'Clean-energy manufacturers get a credit for every unit they produce here, and buyers get cheaper power from what gets built.',
          pays: 'The cost falls on the federal budget and so on taxpayers, spread over the life of the credit.',
          missing: 'The credit rewards output, so the people working in the plants it funds get nothing directly, and a community beside a smelter carries the pollution the credit helped make cheap.',
        },
      },
    ],
    south: [
      {
        n: 'Production-Linked Incentive (PLI) Scheme',
        j: 'India',
        y: '2020',
        w: 'Sector-based incentives to raise manufacturing competitiveness, investment and exports.',
        s: 'Incentives tied to incremental production, across 14 sectors rather than one project.',
        pit: {
          benefits: 'Firms in fourteen sectors get a subsidy tied to the goods they produce here, and buyers get a domestic supply that did not exist before.',
          pays: 'The exchequer pays the incentive, and part of it reaches firms as a transfer larger than the production it is meant to create. Buyers of a protected good may pay more for it.',
          missing: 'The scheme rewards the units a firm sells, so labour standards barely feature and the workers who make the goods are not its beneficiaries. A firm that wins the incentive can raise its price.',
        },
      },
      {
        n: 'Nova Indústria Brasil (NIB)',
        j: 'Brazil',
        y: '2024',
        w: 'National industrial-development agenda to 2033, invested through BNDES, Finep and Embrapii.',
        s: 'Organised around six missions: agro, health, infrastructure, digitalisation, decarbonisation, strategic tech.',
        pit: {
          benefits: 'Brazil\'s development bank, innovation agency and research bodies get six funded missions on a ten-year horizon.',
          pays: 'Public banks and the federal budget pay, and firms that co-finance get cheap credit.',
          missing: 'The missions run through the industries and firms that already receive public money, and the communities where the new plants go have no seat in the plan.',
        },
      },
      {
        n: 'National Industrialization Policy Framework',
        j: 'Kenya',
        y: '2012',
        w: 'Long-term industrialisation framework running to 2030.',
        s: 'A single long-horizon framework for a whole industrialisation drive.',
        pit: {
          benefits: 'Kenyan firms get a framework that lets them plan past an election cycle, and the state gets a stated route to manufacturing and export growth.',
          pays: 'Treasury and county budgets pay, and the firms taking incentives pay back through commitments to produce locally.',
          missing: 'The framework assumes firms big enough to take the incentives. Small traders, and the informal workers a manufacturing push can displace, are not in it.',
        },
      },
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
      {
        n: 'Fair Labor Standards Act (FLSA)',
        j: 'United States',
        y: '1938',
        w: 'Federal minimum wage, overtime, recordkeeping and child-labour standards.',
        s: 'A federal floor only: states can go higher, and no general paid leave is guaranteed.',
        pit: {
          benefits: 'Covered workers get a floor under their hourly rate, overtime pay for long hours and protection from child labour. States can raise the floor further.',
          pays: 'Employers pay the difference between the federal rate and what they already paid, and the burden falls hardest on the low-wage sectors where margins are thin. Enforcement costs the state, so enforcement varies.',
          missing: 'Agricultural and many tipped workers sit outside the Act, and the federal rate has not kept pace with the cost of living. The law sets a floor and no paid leave on top of it.',
        },
      },
      {
        n: 'National Minimum Wage Act',
        j: 'United Kingdom',
        y: '1998',
        w: 'Statutory basis for the UK national minimum wage.',
        s: 'Rates advised by the Low Pay Commission, with business, union and academic members.',
        pit: {
          benefits: 'Workers get a floor set by a commission that has to weigh the economic effect, rather than a rate left to negotiation alone.',
          pays: 'Employers below the floor pay the difference, and low-wage employers cut hours or jobs to absorb it. The commission costs the public.',
          missing: 'It is a floor, and the gap up to a living wage is a political decision taken each year. Zero-hours workers and the self-employed sit outside its protection.',
        },
      },
      {
        n: 'European Pillar of Social Rights Action Plan',
        j: 'European Union',
        y: '2021',
        w: 'Roadmap turning social principles into policy, with 2030 headline targets.',
        s: 'Quantified EU-wide targets: 78% employment, 60% adult training, 15 million fewer at poverty risk.',
        pit: {
          benefits: 'National governments get a number they can be held to, and a parliament can argue with the Council about the method as well as the target.',
          pays: 'The money is national. The Commission and the Council pay in staff time for the monitoring that produces the reports.',
          missing: 'The plan is a method, not a budget. Nothing in it moves money to the households it counts, so the targets depend on national budgets that are already under pressure.',
        },
      },
    ],
    south: [
      {
        n: 'National Minimum Wage Act',
        j: 'South Africa',
        y: '2018',
        w: 'National minimum wage with a commission that reviews it annually, in force since January 2019.',
        s: 'A statutory floor with an annual review process and an exemption mechanism.',
        pit: {
          benefits: 'Several million workers get a floor that rises every year, set by an independent commission and then by the President.',
          pays: 'Employers pay the higher wage, and the commission\'s independence means the rate is not the lowest sum that keeps employers whole. Farm and security employers often answer with fewer hours and less hiring.',
          missing: 'Some categories of worker are excluded, and an employer who cannot afford the rate is left to close or to go further informal. One national rate sits awkwardly with a cost of living that is not the same everywhere.',
        },
      },
      {
        n: 'Code on Social Security',
        j: 'India',
        y: '2020',
        w: 'Consolidates social-security law and recognises gig and platform workers as a category.',
        s: 'First-class statutory recognition of gig and platform work (recognition is not a benefit guarantee).',
        pit: {
          benefits: 'Gig and platform workers are named in law as a category for the first time, and nine separate social security laws become one code.',
          pays: 'Employers and workers pay contributions, and the state carries a share for the informal population. The new code costs the government in training and administration.',
          missing: 'Recognition is not a benefit. Most platform workers fall below any contribution threshold, and an aggregator can classify them as independent contractors, which puts the obligation on the worker rather than on the platform.',
        },
      },
      {
        n: 'Bolsa Família',
        j: 'Brazil',
        y: '2023',
        w: 'Federal cash transfer for low-income families, run through the Cadastro Único registry.',
        s: 'Cash support tied to health and education follow-through, shared across three levels of government.',
        pit: {
          benefits: 'Low-income families get cash they can spend on food, and part of the benefit is held back until children show up for school and vaccinations.',
          pays: 'Federal and municipal budgets pay, and the states\' share is negotiated case by case. Families who miss a health or school appointment lose part of the payment.',
          missing: 'The registry that decides who qualifies is the one the state built, so a family missing from it gets nothing. In cities without a municipal team, no one helps a household register.',
        },
      },
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
      {
        n: 'Every Student Succeeds Act (ESSA)',
        j: 'United States',
        y: '2015',
        w: 'Reauthorises federal K-12 law: standards, accountability and school support.',
        s: 'Federal assessment requirements with states designing their own accountability systems.',
        pit: {
          benefits: 'A state keeps its federal K-12 money only if it runs a statewide assessment system, and Title I money follows poverty into the districts that need it.',
          pays: 'Taxpayers pay, and states pay for the assessment and reporting systems the money requires.',
          missing: 'Accountability is written in test scores, so a school can raise the score without raising what children know, and the children the tests miss stay outside the measure. Federal education spending is a small enough share that the pressure lands unevenly.',
        },
      },
      {
        n: 'Pupil Premium',
        j: 'England, United Kingdom',
        y: '2011',
        w: 'Extra school funding for disadvantaged pupils.',
        s: 'Money follows the disadvantaged pupil, but schools choose how to spend it.',
        pit: {
          benefits: 'Schools get extra money for each disadvantaged pupil, and the money follows the child, so a family that moves carries its funding along.',
          pays: 'The money comes out of the general education budget, so it comes from the rest of the system.',
          missing: 'The entitlement depends on being counted as disadvantaged, which depends on the school identifying the family correctly, and the amount moves with the funding formula. Schools choose how to spend it, so the support a pupil gets is uneven.',
        },
      },
      {
        n: 'Compulsory Education Act',
        j: 'Finland',
        y: '2020',
        w: 'Extends compulsory education to age 18 or an upper-secondary qualification, from August 2021.',
        s: 'Compulsory schooling extended upward, with learning materials free within the system.',
        pit: {
          benefits: 'Young people must stay in education to 18 or earn a qualification, and the state pays for the study places, the materials and the student allowance that make staying possible.',
          pays: 'The taxpayer pays now, and any saving on unemployment and welfare arrives later if it arrives at all.',
          missing: 'A right to remain in education is not the same as a place that suits the student, and a pupil with learning needs or a difficult home still leaves earlier. The extra year costs a year of earnings, and that cost falls on the family.',
        },
      },
    ],
    south: [
      {
        n: 'National Education Policy (NEP)',
        j: 'India',
        y: '2020',
        w: 'National framework covering school and higher education.',
        s: 'A 5+3+3+4 school structure rebuilt around developmental stages.',
        pit: {
          benefits: 'Pupils get a 5+3+3+4 structure with a foundational stage, and vocational routes open alongside the academic one.',
          pays: 'The state pays for new textbooks, teacher training and buildings. Families bear the cost of the extra years of schooling, and of the coaching the system still leans on.',
          missing: 'The policy is a framework that states implement at their own pace, so what a child gets depends on which state they are in. The foundational stage for ages three to eight is the part with the fewest teachers trained for it.',
        },
      },
      {
        n: 'Fundeb (Constitutional Amendment 108)',
        j: 'Brazil',
        y: '2020',
        w: 'Makes school financing permanent, raises federal contributions and steers money to poorer municipalities.',
        s: 'Redistribution by formula, with part of transfers tied to education outcomes.',
        pit: {
          benefits: 'Municipalities get a permanent share of federal education money, and the formula sends more per pupil to poorer municipalities than to richer ones.',
          pays: 'Federal and state budgets pay, and a share of the transfer is held back when a municipality misses education targets.',
          missing: 'The formula sends money to a municipality, not to a child, and it does not follow a student across a state border. A weak administration can still spend the money badly, and the penalty for missing targets lands hardest on the weakest.',
        },
      },
      {
        n: 'National Norms and Standards for School Funding',
        j: 'South Africa',
        y: '1998',
        w: 'National norms for funding public schools under the Schools Act.',
        s: 'School poverty quintiles decide the money: poorer schools get relatively more.',
        pit: {
          benefits: 'Poorer schools get a bigger share of the education budget per learner, which narrows the gap between the best-funded and the worst-funded school.',
          pays: 'National and provincial budgets pay, and the norms decide the split.',
          missing: 'Money per learner does not fix a school with no water and no teacher, and the formula runs on a pupil count, so a small school with expensive-to-teach children is under-resourced. The norms were set in 1998 and the money has not kept up with them.',
        },
      },
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
      {
        n: 'Endangered Species Act',
        j: 'United States',
        y: '1973',
        w: 'Protects listed threatened and endangered species and plans their recovery.',
        s: 'Species listing plus interagency duties to avoid harm to listed species.',
        pit: {
          benefits: 'A listed species gets protection from harm, and the agencies that must avoid harming it are named in the statute, so the duty can be enforced.',
          pays: 'Developers, farmers and the agencies pay for surveys, permits and habitat work. A species listed without a recovery plan imposes cost with no route back.',
          missing: 'Species nobody has surveyed stay off the list, so the ones most damaged by habitat loss are the least likely to be protected. Land outside a project area sees no duty at all.',
        },
      },
      {
        n: 'Nature Restoration Regulation',
        j: 'European Union',
        y: '2024',
        w: 'Binding restoration targets for degraded ecosystems across land and sea.',
        s: 'A measurable EU-wide target: restoration covering at least 20% of land and sea by 2030.',
        pit: {
          benefits: 'Member states get a shared target, restoring at least 20% of land and sea by 2030, and a common method for counting what counts.',
          pays: 'Land managers and public funds pay for the restoration, and member states carry the reporting burden.',
          missing: 'The law does not say who pays for restoring land nobody owns, and it does not reach the marine habitats under the seabed and on the high seas. A 20% target can be met on paper by counting the same ground twice.',
        },
      },
      {
        n: 'Environment Act 2021 (biodiversity net gain)',
        j: 'England, United Kingdom',
        y: '2021',
        w: 'Statutory basis for biodiversity net gain in planning decisions.',
        s: 'Most development must deliver 10% biodiversity net gain, measured by a statutory metric.',
        pit: {
          benefits: 'Developers get one national metric to work to, and the planning system gains a way to require nature gain that it never had before.',
          pays: 'Developers pay for the offsets they buy, and the price of a biodiversity credit reaches the house price. Farmers who lose grazing land to long-term habitat pay most of it.',
          missing: 'The 10% is measured against the site before development, so a small slice of a rich site buys a large slice of a poor one and the metric can be met with little nature returning. Ten-year agreements let the gain be undone after the obligation ends.',
        },
      },
    ],
    south: [
      {
        n: 'Forest Code (Law 12,651)',
        j: 'Brazil',
        y: '2012',
        w: 'Rules for protecting and sustainably using native vegetation on rural land.',
        s: 'Conservation duties land on private landowners: Permanent Preservation Areas and Legal Reserves.',
        pit: {
          benefits: 'Rural landowners keep the right to use their land and get a route to regularise past clearing. Indigenous and traditional territories gain a deadline that finally bites.',
          pays: 'Landowners pay for the restoration they owe, and small farmers with the least cleared land pay the least. The registry that would make the law work costs money the states do not have.',
          missing: 'Landowners who never registered their title are the hardest to reach, and the law covers the Amazon far more thoroughly than the Cerrado, where most of the remaining vegetation is.',
        },
      },
      {
        n: 'Forest Rights Act',
        j: 'India',
        y: '2006',
        w: 'Recognises forest and land rights of forest-dwelling communities.',
        s: 'Community forest-resource rights, with the Gram Sabha running claims and governance.',
        pit: {
          benefits: 'Forest-dwelling communities get legal title to forest produce and the right to run the forest through their Gram Sabha, which is a claim to authority rather than to compensation.',
          pays: 'The state gives up control of the resource, and the Gram Sabha machinery takes the time of the people who sit on it. Adjudicating claims costs the administration.',
          missing: 'Claims from communities displaced more than 75 years ago sit outside the Act, and the individual claims for forest land go to a process with no deadline. Anyone who does not live in the forest has no standing.',
        },
      },
      {
        n: 'Forestry Law 7575 (payments for services)',
        j: 'Costa Rica',
        y: '1996',
        w: 'Legal basis for conservation and paying landowners for forest environmental services.',
        s: 'Pays for carbon, water, biodiversity and scenery, funded largely by a fuel tax.',
        pit: {
          benefits: 'Landowners get a national payment for keeping trees on their land, and the money comes from a fuel tax, so the driver of fuel pays for the water and carbon the forest supplies.',
          pays: 'Whoever buys fuel funds the scheme, and the traders pass the tax on. The landowners receive it.',
          missing: 'The payment is per hectare of standing tree, so the owners who already have the most forest get the most. People who live in the forest without owning it are not on the register.',
        },
      },
    ],
    diff: [
      ['Instrument', 'Species protections and measurable outcome targets on development.', 'Land-use rules on owners, plus payments and recognised community rights.'],
      ['Who acts', 'Regulators, statutory duties and planning systems.', 'Landholders and forest communities are named policy actors, not subjects.'],
      ['Measurement', 'Metrics and percentages (10% net gain, 20% restoration).', 'Rights recognition and payment schemes that make conservation pay locally.'],
    ],
  },
  {
    id: 'climate',
    label: 'Climate & energy transition',
    north: [
      {
        n: 'EU Emissions Trading System (Directive 2003/87/EC)',
        j: 'European Union',
        y: '2003',
        w: 'Cap-and-trade for greenhouse-gas emissions from covered sectors, operating since 2005.',
        s: 'A declining cap creates tradable allowances; auction revenue funds the transition.',
        pit: {
          benefits: 'A firm that cuts emissions keeps the surplus allowances, so the incentive is to act rather than to talk. Auction revenue has paid for energy and industrial support in several member states.',
          pays: 'Every covered emitter pays for each tonne it emits, and the bill reaches electricity users, hauliers and consumers. The households the revenue is recycled to are not the households paying the higher energy bill.',
          missing: 'Firms outside the cap are not in the scheme, and the communities beside the largest emitters get no protection from the carbon price. Free allocation of allowances to industry softened the incentive the law was built on.',
        },
      },
      {
        n: 'Greenhouse Gas Pollution Pricing Act',
        j: 'Canada',
        y: '2018',
        w: 'Federal carbon pricing through a fuel charge and output-based pricing for large industry.',
        s: 'Two mechanisms in one law: a fuel charge and a separate industrial benchmark system.',
        pit: {
          benefits: 'A province that wanted a different system kept it, and households in provinces with the federal fuel charge get a rebate returning part of what they paid.',
          pays: 'Drivers and fuel consumers pay at the pump, and industrial firms pay the output-based benchmark. The cost lands unevenly on rural and long-distance drivers.',
          missing: 'Provinces with their own carbon price, and provinces with no price at all, sit outside the federal scheme, so the same fuel costs different amounts depending on the postal code. The federal backstop is a floor for one province rather than a national rule.',
        },
      },
      {
        n: 'Climate Change Act',
        j: 'United Kingdom',
        y: '2008',
        w: 'Legally binding carbon budgets with independent oversight; the 2050 target was strengthened to net zero in 2019.',
        s: 'Five-year carbon budgets kept out of day-to-day politics by an independent committee.',
        pit: {
          benefits: 'Carbon budgets are set five years ahead and are the government\'s own, so the commitment survives a change of minister, and the committee can say publicly when the government is off track.',
          pays: 'The cost falls on whoever emits, so on energy prices and on the same industries the government promised to protect. The households spending the largest share of income on energy are hit hardest.',
          missing: 'The Act sets targets and a committee, not a mechanism for delivering them, so the gap between the budget and the policy is where the emissions are. The committee can report and be ignored.',
        },
      },
    ],
    south: [
      {
        n: 'National Green Hydrogen Mission',
        j: 'India',
        y: '2023',
        w: 'Supports production, use and export of green hydrogen and derivatives.',
        s: 'SIGHT incentives for electrolysers and hydrogen production, plus hydrogen hubs.',
        pit: {
          benefits: 'Electrolyser makers, developers and the ports where hydrogen ships get demand guaranteed by incentives, and steel and fertiliser buyers get a supply India does not yet have.',
          pays: 'The mission budget and the SIGHT incentives pay, funded by the exchequer and by the coal and gas pool used to make the hydrogen. Grid users pick up the electricity the electrolysers run on.',
          missing: 'Green hydrogen is expensive today, so the first buyers will be the fertiliser and steel plants that can pass the cost on. Villages along the transmission routes carry the land and the disruption.',
        },
      },
      {
        n: 'RenovaBio (Law 13,576)',
        j: 'Brazil',
        y: '2017',
        w: 'Cuts transport-fuel carbon intensity by expanding biofuels and creating decarbonisation credits.',
        s: 'Mandatory distributor targets met with tradable CBIO credits scored on lifecycle carbon.',
        pit: {
          benefits: 'Farmers get a guaranteed market for sugarcane ethanol, and distributors get a target they can meet by buying credits, so the law does not require behaviour the market will not pay for.',
          pays: 'A distributor that comes up short on credits pays, and the credit price sets the reward for decarbonising. The cost reaches the pump.',
          missing: 'Cane grown for fuel competes with food and for land, and the law counts lifecycle carbon from the crop, which rewards the cheapest way to make the fuel rather than the cleanest. Landless workers in the cane belt get no part of the credit.',
        },
      },
      {
        n: 'Carbon Tax Act',
        j: 'South Africa',
        y: '2019',
        w: 'Tax on the CO2 equivalent of greenhouse-gas emissions, in force since June 2019.',
        s: 'A statutory emissions tax, with rates adjusted over time rather than a trading floor.',
        pit: {
          benefits: 'Large emitters pay a rate that government sets and raises over time, which gives the carbon price a path a trading floor does not.',
          pays: 'The emitters pay, and the cost passes into the electricity price and into exports that compete with dearer local production. The revenue goes to the budget.',
          missing: 'A rate set by a minister can be changed by a minister, and the Act reaches the large emitters only, so most of the economy sits outside the price. The poor pay a bigger share of their income in the electricity bill.',
        },
      },
    ],
    diff: [
      ['Pricing carbon', 'Emissions trading with a hard cap (EU) and hybrid pricing frameworks (Canada).', 'A direct tax (South Africa) and credit markets tied to certified fuels (Brazil).'],
      ['Industrial tool', 'Tax credits pull private investment into clean energy at scale (US style).', 'Mission-led public programmes build specific industries, like green hydrogen (India).'],
      ['Time binding', 'Long-run legal targets and budgets that survive electoral cycles.', 'Mission deadlines and tax schedules tied to development priorities.'],
    ],
  },
  {
    id: 'crime',
    label: 'Crime & policing',
    north: [
      {
        n: 'First Step Act',
        j: 'United States',
        y: '2018',
        w: 'Reforms federal prison programming, time credits and corrections practice.',
        s: 'Risk-and-needs assessments that convert rehabilitation work into earned time credits.',
        pit: {
          benefits: 'People in federal prison get risk and needs assessment, more time credits for rehabilitation and earlier release, with some halfway houses returning to the system.',
          pays: 'The Bureau of Prisons and the courts pay for the assessments, the credits and the supervision, and the cost lands in the federal budget.',
          missing: 'People in state prisons get none of it, and most people in prison are in state custody. The savings from shorter sentences do not follow the person out of the gate.',
        },
      },
      {
        n: 'Police, Crime, Sentencing and Courts Act',
        j: 'England and Wales',
        y: '2022',
        w: 'Changes police powers to condition processions and assemblies.',
        s: 'Protest conditions expanded by reference to "serious disruption", framed as balancing rights and impact.',
        pit: {
          benefits: 'Protesters get a clearer standard for when conditions may be imposed on a procession, and the police get a lawful route to impose them. The law also tightens the parole process.',
          pays: 'The policing and court budgets pay for the new powers and the tighter release rules. Protesters who break the conditions pay in fines and imprisonment.',
          missing: 'The law gives the police more tools to restrict protest, and the wider public order package was passed alongside it. The communities with the least trust in the police are the ones asked to accept the new powers.',
        },
      },
      {
        n: 'Interrogation recording amendment',
        j: 'Japan',
        y: '2016',
        w: 'Mandatory audio-video recording of interrogations in specified case categories.',
        s: 'Recording as evidence safeguard, but only in listed categories, not universally.',
        pit: {
          benefits: 'A suspect in a specified case gets an audio and video record of the interrogation, and a court can see what was said and how.',
          pays: 'The police pay for the equipment, the recording and the storage, out of the police budget rather than the suspect\'s.',
          missing: 'The duty covers only listed categories, so most interrogations go unrecorded, and a confession obtained in an unrecorded session that precedes the recording is not in the file. Suspects outside the categories get no protection.',
        },
      },
    ],
    south: [
      {
        n: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)',
        j: 'India',
        y: '2023',
        w: 'Replaces the Code of Criminal Procedure with a new procedural framework.',
        s: 'Wholesale recodification of criminal procedure instead of incremental amendment.',
        pit: {
          benefits: 'A person facing arrest gets a charter with grounds to be told, counsel to have, an electronic record at the police station and a national register of arrests.',
          pays: 'The states pay for the monitoring infrastructure, the training and the forensic capacity the code assumes, and the poorest states can least afford it.',
          missing: 'The code sets procedure and leaves delivery to the states, so a person\'s right to counsel depends on the station they happen to be in. It is written for the formally arrested, and someone picked up without a charge leaves no record.',
        },
      },
      {
        n: 'Independent Policing Oversight Authority Act',
        j: 'Kenya',
        y: '2011',
        w: 'Creates civilian oversight of the police through IPOA.',
        s: 'An oversight authority that sits outside the police service it investigates.',
        pit: {
          benefits: 'The public gets a civilian body that investigates the police and reports to the parliament rather than to the service it is checking.',
          pays: 'The state funds the authority, and officers under investigation are suspended or disciplined, so the cost lands on their careers as well as the budget.',
          missing: 'The authority depends on cooperation from the police service it investigates, and its own budget passes through the executive. Officers who resign before a case concludes are rarely prosecuted.',
        },
      },
      {
        n: 'IPID Act',
        j: 'South Africa',
        y: '2011',
        w: 'Establishes the Independent Police Investigative Directorate.',
        s: 'Statutory duty to investigate deaths in custody, police shootings, rape, torture and assault.',
        pit: {
          benefits: 'Families get an independent investigation into a death in custody or a police shooting, which the police service cannot conduct for itself.',
          pays: 'The state funds the directorate, and officers who are found responsible face discipline and prosecution. The family gets an answer without having to sue.',
          missing: 'The directorate\'s investigators need the police to preserve evidence, and the Act does not cover the private security industry that does much of the policing work. The investigators are not police, and that shows in the evidence they can get.',
        },
      },
    ],
    diff: [
      ['Reform target', 'Operational fixes: rehabilitation incentives, protest powers, interrogation procedure.', 'Structural moves: new procedural codes and standalone police-oversight institutions.'],
      ['Accountability', 'Oversight varies; the selected laws mostly change powers rather than create watchdogs.', 'Dedicated civilian bodies (Kenya, South Africa) with statutory investigation duties.'],
      ['Style', 'Amend and adjust existing systems.', 'Rewrite the system wholesale or build a new institution beside it.'],
    ],
  },
  {
    id: 'justice',
    label: 'Justice & legal aid',
    north: [
      {
        n: 'Legal Services Corporation Act',
        j: 'United States',
        y: '1974',
        w: 'Creates the LSC to fund civil legal assistance for people who cannot afford it.',
        s: 'A private nonprofit distributes funding; the statute protects lawyers freedom to act for clients.',
        pit: {
          benefits: 'People who cannot afford a lawyer get civil legal help, and the LSC\'s independence protects the lawyer\'s duty to the client rather than to a government funder.',
          pays: 'Congress funds the LSC and the states receiving grants pay a share. A client pays nothing for the representation.',
          missing: 'Immigration, family law and most criminal defence sit outside the statute, so the people with the hardest cases are the ones the LSC cannot take.',
        },
      },
      {
        n: 'LASPO',
        j: 'England and Wales',
        y: '2012',
        w: 'Reshapes the scope of civil legal aid and related funding.',
        s: 'Legal aid defined by statutory categories and exceptions, not a general right to representation.',
        pit: {
          benefits: 'Legal aid is confined to a defined set of matters, and a court gets a statutory test to apply before an application is even made.',
          pays: 'The Legal Aid Fund is paid from the criminal justice system, so the money for civil legal aid comes out of the courts\' budget. People who lose a case pay.',
          missing: 'Most applications are refused on scope, and the person turned away at the gate gets no second hearing. Advice on a problem that will not become a case is funded nowhere.',
        },
      },
      {
        n: 'Comprehensive Legal Support Act',
        j: 'Japan',
        y: '2004',
        w: 'Sets principles for legal support and creates the Japan Legal Support Center.',
        s: 'Information, civil legal aid and court-appointed counsel under one national centre.',
        pit: {
          benefits: 'People who cannot afford a lawyer get information, civil legal aid and court-appointed counsel through one national centre with local offices.',
          pays: 'Public legal support bodies are funded by the state, and the court appoints counsel in serious cases at the court\'s cost.',
          missing: 'The centre handles the cases it can staff, and rural prefectures have fewer of them, so a person far from a city waits longer for the same help.',
        },
      },
    ],
    south: [
      {
        n: 'Legal Services Authorities Act',
        j: 'India',
        y: '1987',
        w: 'Creates legal-services authorities for free legal aid and organises Lok Adalats.',
        s: 'Legal aid plus statutory alternative dispute forums (Lok Adalats) in one architecture.',
        pit: {
          benefits: 'A person with a civil dispute gets free legal aid and a forum outside the courts, and the village Legal Services Committee gives a first hearing without the cost of a suit.',
          pays: 'The state funds the authorities, and the centre and the states fund the Legal Services Fund. The poor pay nothing for representation.',
          missing: 'A lok adalat depends on both sides settling, so a case that needs a ruling is the wrong place for it, and the people the camps never reach get nothing.',
        },
      },
      {
        n: 'Legal Aid South Africa Act',
        j: 'South Africa',
        y: '2014',
        w: 'Establishes Legal Aid South Africa and its governing board.',
        s: 'Independence and impartiality written into the statute that funds the service.',
        pit: {
          benefits: 'People who cannot afford a lawyer get appointed representation in criminal and civil matters, and independence and impartiality are written into the statute that funds the service.',
          pays: 'The state funds Legal Aid South Africa from the national budget and from money recovered in cases. Clients pay nothing.',
          missing: 'The Act does not set how many lawyers are appointed, so the number of people served depends on the budget year, and the criminal matter gets covered first.',
        },
      },
      {
        n: 'Legal Aid Act',
        j: 'Kenya',
        y: '2016',
        w: 'Statutory legal-aid framework with a National Legal Aid Service.',
        s: 'A national service that also accredits private providers to deliver aid.',
        pit: {
          benefits: 'People who cannot afford counsel get a state-funded defence, and the National Legal Aid Service also accredits private lawyers to take cases.',
          pays: 'The state funds the service, and part of the money comes from the savings when cases settle early.',
          missing: 'The service depends on accredited providers in the counties, so someone far from a county town has fewer lawyers to choose from, and the accreditation list stays thin.',
        },
      },
    ],
    diff: [
      ['Delivery model', 'A grant-making nonprofit (US), a statutory scope regime (UK), a national support centre (Japan).', 'Statutory authorities with local forums (India) and national services that accredit providers (Kenya).'],
      ['Scope', 'Mostly civil matters, with eligibility rules narrowing who gets help.', 'Free services for named groups, plus community dispute forums outside the courts.'],
      ['Design intent', 'Equal access framed against economic barriers.', 'Access plus institutional delivery at district level.'],
    ],
  },
  {
    id: 'women-children',
    label: 'Women & children',
    north: [
      {
        n: 'Violence Against Women Act (2022 reauthorisation)',
        j: 'United States',
        y: '2022',
        w: 'Reauthorises VAWA and expands tribal criminal jurisdiction over specified crimes.',
        s: 'Special tribal jurisdiction extended to child violence, sexual violence, trafficking and stalking.',
        pit: {
          benefits: 'Survivors get federal funding for shelters and services, and tribal courts gain jurisdiction over child and sexual violence they did not have before.',
          pays: 'Congress funds the programmes, and the federal grant conditions make the states run them.',
          missing: 'Violence against women outside the categories the law names, and abuse by a partner rather than a family member, sit outside it. The grants reach the states that apply for them.',
        },
      },
      {
        n: 'Act respecting First Nations, Inuit and Métis children',
        j: 'Canada',
        y: '2019',
        w: 'Affirms Indigenous jurisdiction over child and family services.',
        s: 'A child cannot be taken into care solely for poverty or inadequate housing.',
        pit: {
          benefits: 'Indigenous communities gain jurisdiction over their own children, and a child is not taken into care for poverty or bad housing.',
          pays: 'Federal and provincial governments pay for the services, and the communities run them.',
          missing: 'The Act binds the provinces that signed on, and the northern and Inuit services are so thin that the legal right runs ahead of the care available.',
        },
      },
      {
        n: 'Employment Insurance maternity and parental benefits',
        j: 'Canada',
        y: '1996',
        w: 'Income benefits during maternity and parental leave.',
        s: 'Maternity and parental benefits split, with parental leave shareable and extendable.',
        pit: {
          benefits: 'Parents get income replacement through the leave, and the parental share can be taken by either parent, which is what lets a father take it.',
          pays: 'Employers and employees pay into the insurance, and an employer who does not pay in has no scheme, so a worker at a small employer can get nothing.',
          missing: 'The benefit replaces part of the income, and the ceiling makes it a smaller share of a higher salary. Parents in work that is not insurable are outside the scheme entirely.',
        },
      },
    ],
    south: [
      {
        n: "Children's Act 38",
        j: 'South Africa',
        y: '2005',
        w: 'Comprehensive child-law framework: care, protection, parental responsibilities, children’s courts, adoption.',
        s: 'One broad statute gathering all of child law instead of single-issue laws.',
        pit: {
          benefits: 'Children get one statute covering care, protection, adoption and the children\'s court, and the court has to look for the family before placing a child elsewhere.',
          pays: 'The state funds the children\'s courts, the foster care and the social workers, and that budget is under pressure.',
          missing: 'A child in care costs the state far more than supporting the family would, and the Act sets no budget that would make the first option real. The regulation that would make the Act work took years to arrive.',
        },
      },
      {
        n: 'Law on Prevention and Punishment of Gender-Based Violence',
        j: 'Rwanda',
        y: '2008',
        w: 'Standalone legal framework for preventing and punishing gender-based violence.',
        s: 'GBV given its own statute rather than folded into general criminal law.',
        pit: {
          benefits: 'Survivors get a law that names the offences, and the police, the prosecution and the courts are given duties they can be held to.',
          pays: 'The state funds the institutions and the offender bears the penalty. The survivor pays in the time a case takes and in what it costs to be safe while it runs.',
          missing: 'The law reaches the crimes rather than the conditions that produce them, so a woman who is not yet a victim has no protection in it. Household budgets and customary practice stay out of the statute\'s reach.',
        },
      },
      {
        n: 'Maternity Benefit (Amendment) Act',
        j: 'India',
        y: '2017',
        w: 'Amends maternity-benefit law for eligible employees.',
        s: 'Paid maternity leave extended from 12 to 26 weeks.',
        pit: {
          benefits: 'Eligible women get 26 weeks of paid maternity leave instead of 12, and the leave can be taken in two instalments.',
          pays: 'The employer pays the wage, and the state reimburses employers at establishments with fewer than fifty workers. The family gets income that stops when the leave stops.',
          missing: 'The cover stops at a payroll, so the construction worker, the agricultural worker and the home worker are outside it. A woman dismissed in the last trimester has no income while her case runs.',
        },
      },
    ],
    diff: [
      ['Child protection', 'Jurisdiction and principles first: who decides, and on what grounds a child is separated.', 'Comprehensive national child statutes and standalone GBV laws.'],
      ['Family policy', 'Income replacement through insurance systems with shareable parental leave.', 'Longer statutory maternity entitlements tied to employment law.'],
      ['Approach', 'Rights and jurisdiction (tribal, Indigenous) as the lever.', 'Codification and benefit extension as the levers.'],
    ],
  },
  {
    id: 'youth',
    label: 'Youth: jobs & skills',
    north: [
      {
        n: 'Reinforced Youth Guarantee',
        j: 'European Union',
        y: '2020',
        w: 'Commitment to offer under-30s a job, education, apprenticeship or traineeship within four months.',
        s: 'A time-bound offer commitment, implemented through national plans and EU funding.',
        pit: {
          benefits: 'A young person leaving school in the EU gets an offer of a job, education, an apprenticeship or a traineeship within four months, and the offer is supposed to be made.',
          pays: 'Member states pay for the programmes, and the EU funds part of it through the Social Fund Plus. A young person on the offer often gets an allowance.',
          missing: 'An offer is not a job that lasts, and a fifteen-year-old leaving school early in a weak labour market gets a contract and a promise. The deadline is measured and published, which is why it moved.',
        },
      },
      {
        n: 'Vocational Training Act (BBiG)',
        j: 'Germany',
        y: '1969',
        w: 'Legal framework for the dual vocational training system.',
        s: 'Company training governed by recognised occupational regulations with fixed exams.',
        pit: {
          benefits: 'A young person gets a qualification a company cannot award on its own, and the certificate holds across the economy.',
          pays: 'The company pays the wages and the training time, and the state funds the examination and the chambers that hold the standard. The company carries the risk that the apprentice leaves.',
          missing: 'The model needs a company large enough to train, so small firms cannot use it and the young people in them get what the labour market offers. The training is the employer\'s asset, and the apprentice\'s wage sits below the going rate for the work.',
        },
      },
      {
        n: 'Apprenticeship Levy',
        j: 'United Kingdom',
        y: '2017',
        w: 'Levy on qualifying employers to fund apprenticeship training.',
        s: '0.5% of pay bill above a threshold, collected as a hiring-and-training signal.',
        pit: {
          benefits: 'Employers get 25% of their levy back when they take an apprentice, and a new training provider can enter the market without a track record.',
          pays: 'Employers above the pay-bill threshold pay 0.5% of the pay bill into the apprenticeship account that funds the training.',
          missing: 'The levy is charged on the whole pay bill, so a large employer with few apprentices pays for a scheme it does not use, and a small employer below the threshold pays nothing and gets nothing. The money raised is not the money spent, and employers buy training from a market rather than design it.',
        },
      },
    ],
    south: [
      {
        n: 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY)',
        j: 'India',
        y: '2015',
        w: 'Skill training and certification to improve employability, including recognition of prior learning.',
        s: 'Outcome-based national certification that also counts skills people already have.',
        pit: {
          benefits: 'A worker gets a certificate a recruiter can check, and someone who already has the skills can have them recognised instead of repeating the course.',
          pays: 'Government and industry share the cost of the training, and the worker gives up a wage while in the classroom.',
          missing: 'A certificate does not move on its own. Most of the training is government-funded, so the incentive for a provider is enrolment rather than placement, and the people who most need the skill are the ones the scheme reaches least.',
        },
      },
      {
        n: 'Apprenticeship Law (Lei da Aprendizagem)',
        j: 'Brazil',
        y: '2000',
        w: 'Statutory apprenticeship framework requiring larger establishments to hire apprentices.',
        s: 'Mandatory employer quotas of roughly 5% to 15% of the relevant workforce.',
        pit: {
          benefits: 'A young worker gets a job and a qualification, and the company gets a cheaper way to fill entry-level roles.',
          pays: 'The employer pays the apprentice wage and the training, and the state sets what share of the workforce must be apprentices.',
          missing: 'The quota counts every establishment, so a two-person company must take on an apprentice or pay a fine, and the apprentice wage is low enough to replace a worker rather than add one. A quota is not a plan for what the apprentice learns.',
        },
      },
      {
        n: 'Employment Tax Incentive (ETI)',
        j: 'South Africa',
        y: '2013',
        w: 'Tax incentive reducing employers’ payroll tax for hiring young workers, live from January 2014.',
        s: 'The state subsidises the first payslip through the tax system rather than funding training.',
        pit: {
          benefits: 'An employer gets a rebate for hiring a young worker, and the young worker gets a first job with a smaller pay cut than the market would impose.',
          pays: 'The state pays through tax revenue it does not collect, and the employer\'s payroll tax falls for up to two years.',
          missing: 'The incentive pays for the hire and not for the training, so a job can end when the rebate ends, and the young worker has no protection against being made redundant the moment the benefit runs out.',
        },
      },
    ],
    diff: [
      ['Who is obliged', 'Public institutions coordinate offers (EU) or employers fund training via levy (UK).', 'Employers face quotas (Brazil) or receive hiring subsidies (South Africa).'],
      ['What is offered', 'A guaranteed offer within a deadline, or a regulated training pathway.', 'Certification of skills, apprenticeship slots, or cheaper first hires.'],
      ['Philosophy', 'Service guarantee and training standards.', 'Direct pressure or payment on the demand side: the employer.'],
    ],
  },
  {
    id: 'security',
    label: 'Security & defence',
    north: [
      {
        n: 'Strong, Secure, Engaged (defence policy)',
        j: 'Canada',
        y: '2017',
        w: 'Sets defence priorities and planned reforms for the armed forces.',
        s: 'A public defence policy: strong at home, secure in the continent, engaged in the world.',
        pit: {
          benefits: 'The armed forces get a stated direction and a purchase plan, and the public gets a defence policy it can read and argue with.',
          pays: 'The federal budget pays, and the money comes from the same taxpayer who sees the pay rise of the crews.',
          missing: 'A policy is a statement of direction, so the gap between the plan and the procurement is where the spending lands. The communities that host the bases carry the environmental cost without a say.',
        },
      },
      {
        n: 'European Border and Coast Guard Regulation',
        j: 'European Union',
        y: '2019',
        w: 'Legal basis for Frontex and its Standing Corps supporting member states at borders.',
        s: 'A supranational uniformed service of up to 10,000 officers by 2027.',
        pit: {
          benefits: 'Member states get a common border force with equipment and staff they could not buy alone, and the rules for return decisions apply the same way across the bloc.',
          pays: 'Member states pay, and the people who arrive at the external border bear the immediate cost of the search and the return process.',
          missing: 'The regulation does not change the asylum rules, so someone with a right to claim is still held while the claim is decided, and the fundamental rights duties stay with the member state.',
        },
      },
      {
        n: 'Nationality and Borders Act',
        j: 'United Kingdom',
        y: '2022',
        w: 'Changes nationality, asylum and immigration rules.',
        s: 'Asylum claims can be ruled inadmissible after irregular arrival from a safe country.',
        pit: {
          benefits: 'The system gets rules it can apply consistently, and a claim from someone arriving irregularly from a listed safe country can be refused without a full hearing.',
          pays: 'The Home Office and the courts pay, and the person refused bears the cost of the appeal and the detention that goes with it.',
          missing: 'The Act\'s own consultation found the provisions could be applied in a discriminatory way, and it created no case management process to correct that, so the risk sits with the person refused.',
        },
      },
    ],
    south: [
      {
        n: 'Agnipath Scheme',
        j: 'India',
        y: '2022',
        w: 'Recruits young people into the armed forces as Agniveers on fixed terms.',
        s: 'Four-year service tenures instead of career-long recruitment.',
        pit: {
          benefits: 'The army gets a larger intake at lower cost, and a young person gets four years, a uniform and a route into the reserves or the civilian economy.',
          pays: 'The Ministry of Defence pays, and the Agniveer gives four years of service instead of a career, with a pension that starts later and lower.',
          missing: 'A four-year contract is a long time to be locked into, and a recruit who cannot adapt has little way out before the term ends. The families of the dead get a compensation figure and no continuing support.',
        },
      },
      {
        n: 'Border Management Authority Act',
        j: 'South Africa',
        y: '2020',
        w: 'Creates a single Border Management Authority.',
        s: 'Border functions previously scattered across departments, integrated into one body.',
        pit: {
          benefits: 'Border functions sit in one body instead of a dozen departments, so a border post can be run as a system rather than as a queue of vehicles.',
          pays: 'The state funds the authority, and the traveller waits at the post.',
          missing: 'Migration and asylum are not border functions, so someone who arrives without documents falls between the authority and the interior departments. The Act reorganises the vehicle queue and leaves the human queue where it was.',
        },
      },
      {
        n: 'Constitution, Article 12 (abolition of the army)',
        j: 'Costa Rica',
        y: '1949',
        w: 'Proscribes a permanent army; public order is kept by necessary forces.',
        s: 'Security by constitutional demilitarisation.',
        pit: {
          benefits: 'The money a standing army would have taken funds health, education and police instead, and the constitution puts a limit on what any government may do with armed force.',
          pays: 'The budget a military would have absorbed goes to civilian services, and the public works out of the police, which is armed.',
          missing: 'The army is gone and the security apparatus is not. The borders are policed by the same public force that was meant to replace it.',
        },
      },
    ],
    diff: [
      ['Force design', 'Long-term defence planning and standing multinational corps.', 'Fixed-term recruitment reforms, integrated border bodies, or no standing army at all.'],
      ['Borders', 'Supranational corps (EU) and asylum-rule tightening (UK).', 'One national authority per border (South Africa), with defence kept separate from policing.'],
      ['Model', 'Capability, operations and immigration control.', 'Institutional innovation: how forces are raised, merged or abolished.'],
    ],
  },
  {
    id: 'foreign',
    label: 'Foreign policy & cooperation',
    north: [
      {
        n: 'PEPFAR',
        j: 'United States',
        y: '2003',
        w: 'Global HIV/AIDS initiative supporting prevention, care and treatment in partner countries.',
        s: 'Disease-focused aid at massive scale, delivered across many agencies.',
        pit: {
          benefits: 'Millions of people living with HIV get treatment and the clinics that provide it, and the programmes built for the emergency became the health systems that still run.',
          pays: 'The US taxpayer funds it and partner countries now co-finance a large share of the medicines. Volume at scale pushed the cost of older generics down.',
          missing: 'The arithmetic counts the people treated, and it does not count what the programmes crowded out in the health budgets of the countries that host them. Some of the money bought treatment a patient could not reach.',
        },
      },
      {
        n: 'Global Gateway',
        j: 'European Union',
        y: '2021',
        w: 'Investment and cooperation strategy for digital, energy, transport, health and research links.',
        s: '"Team Europe" investment with explicit sustainability and labour standards attached.',
        pit: {
          benefits: 'The EU gets a single investment brand, and partner countries get projects with labour and sustainability conditions attached to them.',
          pays: 'The EU budget and the European Investment Bank pay, and the money moves through Team Europe rather than through the member states.',
          missing: 'The partner carries the debt, and the conditions are written in European law, so a local contractor can be excluded. The money mostly reaches the people who supply the equipment rather than the people who use it.',
        },
      },
      {
        n: 'Partnership for Quality Infrastructure',
        j: 'Japan',
        y: '2015',
        w: 'Infrastructure-financing initiative for partner countries.',
        s: 'Quality of infrastructure as the selling point, not volume of projects.',
        pit: {
          benefits: 'Partner countries get loans that carry the quality and maintenance practice of Japanese infrastructure, with the interest stretched over a long term.',
          pays: 'The borrowing government repays, and Japanese firms build and maintain. The subsidy behind the terms sits with the Japanese taxpayer.',
          missing: 'The loans add to the debt of the countries borrowing them, and the quality standard is set by a Japanese contractor rather than by the people who will use the road. Who builds is settled by the tender, and the local capacity to maintain is left to the borrower.',
        },
      },
    ],
    south: [
      {
        n: 'Development Partnership Administration',
        j: 'India',
        y: '2012',
        w: 'Foreign-ministry division coordinating development partnerships and concessional credit lines.',
        s: 'Infrastructure finance bundled with technical cooperation and capacity building.',
        pit: {
          benefits: 'Partner countries get concessional credit and technical help from one desk instead of a dozen schemes, and Indian firms get the contracts.',
          pays: 'The Indian budget and the lines of credit pay, and the borrowing government repays. The administrative cost falls on the ministry.',
          missing: 'The debt is still debt, and the line of credit is spent through Indian contractors, so the money that comes back is not the money that left. The communities who live with the project are not in the appraisal.',
        },
      },
      {
        n: 'Vaccine Maitri',
        j: 'India',
        y: '2021',
        w: 'COVID-19 vaccine supply abroad through grant, commercial and COVAX channels.',
        s: 'Aid, sales and multilateral distribution in one campaign.',
        pit: {
          benefits: 'Countries with no production got doses quickly, and the manufacturing capacity India built during the pandemic has since made vaccines for other countries.',
          pays: 'India sold at cost to some and at commercial rates to others, and the receipts funded the production. Partner countries paid for their doses, some of them by grant.',
          missing: 'Supply went where the diplomatic relationships were, and most of it did not travel through the multilateral allocation system, so the share went to whoever asked. Domestic vaccination in some donor countries trailed the exports.',
        },
      },
      {
        n: 'Indonesian AID',
        j: 'Indonesia',
        y: '2019',
        w: 'Public-service agency managing Indonesia’s international development cooperation.',
        s: 'A domestic endowment-fund model for financing assistance abroad.',
        pit: {
          benefits: 'Indonesia gets an agency that runs its own aid rather than receiving it, and partner countries get a sovereign fund to draw on without a donor\'s conditions attached.',
          pays: 'The Indonesian budget and the returns on the endowment pay, and the money carries no political conditions from another government.',
          missing: 'The endowment is small next to the needs it is aimed at, and a thin fund makes loans a recipient may not be able to service. The agency also has to serve Indonesia\'s own interests abroad, and the two pull against each other.',
        },
      },
    ],
    diff: [
      ['Instrument', 'Large programme delivery and standards-based investment strategies.', 'Concessional credit, technical cooperation, vaccine supply and aid endowments.'],
      ['Positioning', 'Donor frameworks with quality and sustainability conditions attached.', 'South-South cooperation language, capacity building and patient capital.'],
      ['Delivery', 'Multi-agency programmes and coordinated regional platforms.', 'A foreign-ministry unit, a supply campaign, or a purpose-built aid agency.'],
    ],
  },
  {
    id: 'niche',
    label: 'Niche & innovation',
    north: [
      {
        n: 'e-Residency',
        j: 'Estonia',
        y: '2014',
        w: 'State-issued digital identity letting non-residents use Estonian online services and run EU companies.',
        s: 'A country as a service: citizenship-free access to a state’s digital infrastructure.',
        pit: {
          benefits: 'A person with no Estonian residence gets a digital identity that opens a company bank account, files a tax return and signs documents from another country, and Estonia gains a business and tax base with nobody physically present.',
          pays: 'The state pays for the identity infrastructure and the non-resident pays a fee for the card. A resident who takes an e-Residency hands a private issuer a biometric read of their face.',
          missing: 'A digital identity is not a residence permit, and the scheme gives a foreign business a way to operate in the country without meeting the tax and labour rules a resident company faces. Regulators called it a loophole and the state has since closed parts of it.',
        },
      },
      {
        n: 'vTaiwan',
        j: 'Taiwan',
        y: '2014',
        w: 'Online and offline public consultation process for policy discussions.',
        s: 'Structured online deliberation that actually feeds into lawmaking.',
        pit: {
          benefits: 'A citizen can comment on a draft online, and the government has to show which comments it accepted, which it rejected and why.',
          pays: 'The government pays for the platform and for the staff who read the comments, and participants give their own time.',
          missing: 'The people who are not online are not in the process, and the record of accepted and rejected comments is a record of reasons, not a duty to change the draft.',
        },
      },
      {
        n: 'European Citizens’ Initiative',
        j: 'European Union',
        y: '2012',
        w: 'Lets citizens invite the Commission to consider proposing EU legislation.',
        s: 'One million valid signatures buys a hearing, not an automatic law.',
        pit: {
          benefits: 'A citizen from any member state can ask the Commission to consider a proposal and gets a hearing with the Commission and a written response.',
          pays: 'The Commission and the national organisers pay, and the organisers collect the signatures themselves. The petition costs them money and time.',
          missing: 'One million signatures buy a hearing, not a law, and the Commission can decline to put the initiative forward with a reason. Running a signature drive costs money, and the people with the fewest networks find it hardest to start one.',
        },
      },
    ],
    south: [
      {
        n: 'Unified Payments Interface (UPI)',
        j: 'India',
        y: '2016',
        w: 'Mobile payments interface linking multiple bank accounts for instant transfers.',
        s: 'Interoperable public payment rails that private apps build on top of.',
        pit: {
          benefits: 'Any account holder can send money to any other account in seconds, and a small shop can take a payment without a card machine. The sender pays nothing, and that is what made it spread.',
          pays: 'The banks pay for the settlement system and give the service away, and the merchant pays a cut on every transaction. The Reserve Bank runs the rails.',
          missing: 'Someone without a bank account gets nothing here, and fraud losses land on the account holder until the rules catch up.',
        },
      },
      {
        n: 'Pix',
        j: 'Brazil',
        y: '2020',
        w: 'Central-bank instant-payment scheme.',
        s: 'A central bank building the rail itself and making instant payments free and ubiquitous.',
        pit: {
          benefits: 'Every bank joins one instant-payment rail, so a transfer between any two accounts lands in seconds at no cost to the sender.',
          pays: 'The central bank runs the rail and charges the banks for access, and the banks pass that on to the people who receive more transfers than they make, so a small shop can end up paying more.',
          missing: 'Someone with no bank account has nothing to join, and the system works only because the tax authority can name the money. Fraud and account takeovers rose, and the cost of stopping them lands on the banks and the account holders.',
        },
      },
      {
        n: 'Bolsa Família',
        j: 'Brazil',
        y: '2003',
        w: 'Federal cash-transfer programme reducing poverty while investing in human capital.',
        s: 'Conditional cash transfers as a platform for health and education follow-through.',
        pit: {
          benefits: 'The poorest Brazilian families get a cash floor of one minimum wage, set per family rather than per person, which is why it reached large families more deeply.',
          pays: 'Federal money and municipal administration pay, and the condition on school attendance and health checks is enforced by withholding the benefit, so the cost of non-compliance falls on the family.',
          missing: 'The register that decides the money is the one the state built, so a family that never registered got nothing, and the 2003 benefit was too small to change the poverty it targeted. The conditions fell hardest on the households with the least slack.',
        },
      },
    ],
    diff: [
      ['What is new', 'New interfaces between citizen and state: identity, deliberation, petitions.', 'New public infrastructure for money movement and social protection at population scale.'],
      ['Who builds', 'States offering services to non-residents and structured participation.', 'Central banks and social registries building rails everyone else plugs into.'],
      ['Reach', 'Elegant, small-surface innovations that punch above their weight.', 'Systems measured in hundreds of millions of users.'],
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

// The three questions, in the order the PIT Desk asks them.
export const PIT_ROWS = [
  ['benefits', 'Who benefits?'],
  ['pays', 'Who pays?'],
  ['missing', 'Who is missing?'],
];
