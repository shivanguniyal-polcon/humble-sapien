// THS Research library. Every entry is a durable publication in the
// institutional sense: author, date, abstract, key findings, methods,
// citations, downloads. Types follow research-library conventions:
// report, working paper, brief, dataset, tool, essay, field note.

export const publications = [
  {
    id: 'rules-reading',
    type: 'Brief',
    domain: 'Governance',
    title: 'The rules exist. The reading does not.',
    date: 'October 2026',
    author: 'Shivang Uniyal',
    abstract:
      'India publishes more policy and more data than almost any democracy on earth, and very little of it is written for the people it describes. This brief sets out the scale of the gap in four sourced numbers and defines the problem THS exists to close.',
    findings: [
      'About 890 Central Acts are in force (reported count, May 2025), and no official total exists for state laws, rules and notifications. Nobody holds the full number.',
      'One review cohort alone contained 314 central schemes (54 centrally sponsored, 260 central sector) due for re-appraisal by March 2026.',
      'The national open data platform passed 5,02,000 data resources by August 2024, published for everyone and readable by almost no one.',
      'In 2023-24, 83 Central Acts were authenticated in regional languages. The rules are in force in a language most people cannot read.',
    ],
    methods:
      'Figures are taken from official releases only: PIB, MoSPI and Legislative Department publications, each carrying its date. Where a figure is a reported count rather than an audited total, the text says so. Claims that could not be verified against a readable primary source were left out rather than estimated.',
    citations: [
      'PIB (29 May 2025). Schemes due for re-appraisal by 31 March 2026.',
      'MoSPI, presentation to the 28th COCSSO (August 2024). Open data resources and Chief Data Officers.',
      'Legislative Department, Annual Report 2023-24. Acts authenticated in regional languages.',
      'Lok Sabha RTI statistics, 2022-23: 16,38,784 applications filed; 52,662 rejected.',
    ],
    pit: {
      benefits: 'Readers who already hold a degree, a connection and the time to read 890 Acts. Policy the public cannot parse transfers power to those who can.',
      pays: 'Everyone bound by rules they cannot read, in time, travel, bribes and forfeited entitlements. The figures here are counts, not costs: the bill itself is unmeasured.',
      missing: 'Nobody holds the total. State laws, rules and notifications are counted nowhere, and people who never file an RTI application or reach a portal appear in none of these statistics.',
    },
    downloads: [['ths_sprawl_sources.txt', 'text']],
    related: { label: 'Take apart a dataset', tab: 'data' },
  },
  {
    id: 'pmjay-model',
    type: 'Report',
    domain: 'Health',
    title: 'PM-JAY fiscal sustainability model: calibrated, not guessed',
    date: 'June 2024',
    author: 'THS Research',
    abstract:
      'A system-dynamics model of India’s largest publicly funded health assurance scheme, calibrated in log space to official programme trajectories and published with its full assumption set and fit quality.',
    findings: [
      'Fit quality against official anchors: cards 4.5% MAPE, admissions 4.5%, empanelled hospitals 2.8%, treatment value 4.3%.',
      'Admissions growth is driven by enrolment, not by sicker cardholders: utilisation per cardholder is flat at 0.084 admissions per year.',
      'Empanelment follows a logistic curve with a 45,000 hospital ceiling; average claim size grows about 7.9% per year.',
    ],
    methods:
      '28 anchor rows from PIB releases, Lok Sabha replies and the NHA Annual Report 2024-25, each carrying its URL. Differential evolution for global search, bounded least squares for polish. The live NHA dashboard is geo-blocked outside India, so published anchors were used. Known weak point: one stale September 2019 hospital anchor repeats the launch figure in official materials.',
    citations: [
      'National Health Authority, Annual Report 2024-25.',
      'PIB releases PRID 1813651 and PRID 1928582 (admissions annexures).',
      'THS PM-JAY Model Calibration Report (4 September 2026).',
    ],
    pit: {
      benefits: 'PM-JAY cardholders: households holding an eligible card, whose admissions are cashless at the point of care.',
      pays: 'Central and state budgets — general taxpayers — through per-admission claims and the empanelment network; hospitals carry the cost of slow settlement.',
      missing: 'People who never got a card, and cardholders who never use one. The model sees enrolment and admissions; it cannot see the population never enumerated into the scheme.',
    },
    downloads: [['ths_pmjay_series.csv', 'csv'], ['ths_pmjay_states.csv', 'csv']],
    related: { label: 'Run the relationship yourself', tab: 'data' },
  },
  {
    id: 'promise-scorecards',
    type: 'Working paper',
    domain: 'Governance',
    title: 'Promise scorecards: what the record says four years on',
    date: 'October 2026',
    author: 'THS Research',
    abstract:
      'Four health promises from the BJP Gujarat 2022 manifesto, checked line by line against public evidence up to October 2026, with a strict vocabulary for what the record does and does not show.',
    findings: [
      'Health Recruitment Board: announced only. A reforms commission recommended it in December 2025; constitution not verified.',
      'Health Stack with a unique Health ID: partly evidenced. 5.25 crore ABHA accounts exist in Gujarat, but no Gujarat-specific one-stop stack is verified.',
      'The Dhanwantari Preventive Healthcare Fund and the Ahmedabad genetics centre: no public evidence found for either as promised.',
    ],
    methods:
      'Promise text transcribed from the manifesto. Delivery evidence searched across CMO Gujarat, PIB, Lok Sabha answers, PRS budget analyses and reputable press. Status vocabulary: delivered, partly evidenced, announced only, no public evidence found. The last is a statement about receipts, not about reality.',
    citations: [
      'BJP Gujarat 2022 manifesto, Agresar Health chapter.',
      'CMO Gujarat (3 Dec 2025), GARC recruitment recommendations.',
      'PIB (6 Feb 2024), ABHA issuance figures for Gujarat.',
    ],
    pit: {
      benefits: 'Gujarat residents the four promises describe: job seekers waiting on the Health Recruitment Board, patients who would use the health stack.',
      pays: 'State finances for the boards, funds and centres promised, and staff hours for whoever must answer these checks.',
      missing: 'The strictest status here is "no public evidence found", which is a statement about receipts, not about reality. Anyone served by something that was never documented is missing from this paper by construction.',
    },
    downloads: [['ths_promise_evidence.txt', 'text']],
    related: { label: 'Open the scorecards', tab: 'work' },
  },
  {
    id: 'policy-atlas',
    type: 'Dataset',
    domain: 'Comparative',
    title: 'The policy atlas: 90 flagship policies across 15 sectors',
    date: 'January 2025',
    author: 'THS Research',
    abstract:
      'A structured comparison of flagship public policies in the Global North and Global South across 15 sectors, from technology regulation to defence, with per-sector approach contrasts and sources.',
    findings: [
      'Northern instruments lean on binding regulation and broad tax bases; Southern instruments lean on strategies, missions and targeted entry.',
      'The same word means different work in the two regions: coverage in the North debates what to include, in the South it debates who gets in at all.',
      'Signature designs cluster: single-payer consolidation, statutory quotas and public payment rails appear almost exclusively in the South.',
    ],
    methods:
      'Policy names, years and design traits checked against official law portals, ministries and authoritative databases. Entries whose primary texts were not machine-readable stay within what their sources support. Regional grouping is an analytic choice, not an official classification.',
    citations: [
      'EUR-Lex, legislation.gov.uk, Congress.gov, PRS Legislative Research, Kenya Law, Planalto, BPK, Japan Law Translation.',
      'World Bank, ILO, OECD and IEA policy databases.',
    ],
    pit: {
      benefits: 'Readers who need a structured comparison quickly, and policy designers in the South looking for instruments that have been tried elsewhere.',
      pays: 'Nobody is charged; the unpaid cost sits with the ministries and archives whose texts were read and restructured.',
      missing: 'Policies whose primary texts are not machine-readable stay understated, which skews toward older, English-language, Northern law. Regional grouping is an analytic choice and hides within-region inequality.',
    },
    downloads: [['ths_policy_atlas.json', 'json']],
    related: { label: 'Open the atlas', tab: 'compare' },
  },
  {
    id: 'open-data-directory',
    type: 'Dataset',
    domain: 'Data',
    title: 'Open data directory: government data you can actually reuse',
    date: 'October 2023',
    author: 'THS Research',
    abstract:
      '29 government datasets across 15 sectors with honest licence labels, because free to download is not the same as free to reuse.',
    findings: [
      'Strongest tier: public domain and CC0 (US federal data), named open licences (CC BY 4.0, OGL v3.0, GODL, CC BY-SA 4.0).',
      'Several high-value datasets (WHO GHO, FBI UCR, UNODC, Indian survey microdata) are free to access with unverified reuse terms, and are labelled accordingly.',
    ],
    methods:
      'Licence statements read from the portals where possible. Portal-wide policies were not applied blindly to individual items. Unverified means unverified, not forbidden.',
    citations: [
      'World Bank data catalogue licence records; UNESCO UIS terms; ILO rights and permissions; UK OGL v3.0; EPA data licence.',
    ],
    pit: {
      benefits: 'Reusers who can now tell free to download from free to reuse: journalists, researchers, civic technologists.',
      pays: 'The agencies that publish and maintain the portals, and reusers who carry the risk wherever reuse terms are unverified.',
      missing: 'People who cannot use a portal at all: without connectivity, without English, without a device. A licence is a permission slip for those who already have access.',
    },
    downloads: [['ths_open_data_directory.json', 'json']],
    related: { label: 'Browse the directory', tab: 'data' },
  },
  {
    id: 'escalation-maps',
    type: 'Tool',
    domain: 'Delivery',
    title: 'Escalation maps: which office owes you the answer',
    date: 'October 2026',
    author: 'THS Research',
    abstract:
      'Touchpoint-by-touchpoint escalation directories for PM-JAY and Swachh Bharat: the office, the authority, the address, the email and the helpline for every step where delivery can fail.',
    findings: [
      'Every touchpoint of both schemes carries a named escalation route with verified and unverified contact badges.',
      'The pattern across schemes: the local desk solves most cases, the portal (CGRMS or CPGRAMS) creates the receipt, and the state authority holds the real lever.',
    ],
    methods:
      'Contacts collected from official scheme and ministry pages with dedicated research passes. Each contact carries a verification badge; ones that could not be confirmed on a current official page say so on the card.',
    citations: ['pmjay.gov.in and nha.gov.in contact pages; DDWS and MoHUA contact pages; CPGRAMS.'],
    pit: {
      benefits: 'People whose PM-JAY or Swachh Bharat case is stuck: every touchpoint names the office that owes the answer.',
      pays: 'The receiving offices in staff hours, and the complainant in unpaid time, travel and paperwork at every step a case drags through.',
      missing: 'People whose cases never reach a portal: no phone, no documents, no time to escalate. Complaint statistics count the persistent, not the excluded.',
    },
    downloads: [['ths_escalation_directory.json', 'json']],
    related: { label: 'Open the touchpoint maps', tab: 'work' },
  },
  {
    id: 'simplifier-methods',
    type: 'Tool',
    domain: 'Language',
    title: 'Policy simplifier: plain language as a delivery mechanism',
    date: 'October 2026',
    author: 'Shivang Uniyal',
    abstract:
      'A readability instrument that scores statutory text with Flesch formulas and rewrites it in near-casual language, with a rule-based Hindi layer, built on the claim that policy the public cannot parse is policy the public cannot claim.',
    findings: [
      'On the sample statutory text: Flesch Reading Ease 18.9 (graduate level) becomes 63.7 (standard, 8th to 9th grade) after rewriting.',
      'Rewrites run on whole-phrase substitutions and clause splitting; both texts are scored so the improvement is measured, not asserted.',
    ],
    methods:
      'Flesch Reading Ease and Flesch-Kincaid grade from sentence length and a vowel-group syllable heuristic, accurate to a couple of points. The Hindi layer is rule-based over statutory terms and clause templates and is labelled as needing translator review before formal use.',
    citations: ['Flesch (1948); Flesch-Kincaid grade formula; THS simplifier rule tables.'],
    pit: {
      benefits: 'Readers who can parse a statutory clause in one pass, and frontline workers who explain rules for a living.',
      pays: 'Nobody in money. The cost is accuracy risk: simplification can smooth a nuance, which is why both texts always print together.',
      missing: 'Speakers of languages other than Hindi and English. The Hindi layer is rule-based and needs translator review; the remaining official languages have no layer at all.',
    },
    downloads: [['ths_simplify_rules.json', 'json']],
    related: { label: 'Simplify a policy text', tab: 'work' },
  },
  {
    id: 'parliament-questions',
    type: 'Working paper',
    domain: 'Governance',
    title: 'What 214 parliamentary questions teach about asking',
    date: 'September 2026',
    author: 'Shivang Uniyal',
    abstract:
      'A read of the parliamentary question record from the 17th Lok Sabha as data: what gets asked, what gets answered, and why the unstarred question is infrastructure while the starred question is politics.',
    findings: [
      '60 questions drafted for a Member across three sessions (about one in five of a full-term total), later analysed against 214 questions across 24 files.',
      'The question map of the country appears in the subjects: out-of-pocket health spending, drug prices, migrant labour databases, gender gaps.',
    ],
    methods:
      'Question records compiled by session, ministry and type (starred versus unstarred). Sector clusters read from ministry distribution rather than asserted.',
    citations: ['Lok Sabha question records, sessions VI to VIII, 17th Lok Sabha; THS research corpus.'],
    pit: {
      benefits: 'Citizens whose concerns reach a Member\u2019s question list, and anyone studying what gets asked.',
      pays: 'The answering ministries in reply work, and the MP\u2019s office in drafting time: 60 questions drafted across three sessions.',
      missing: 'People who never reach an MP\u2019s office. Their concerns appear only when a Member chooses them; the question map is a map of representation, and representation is uneven.',
    },
    downloads: [['ths_ls_questions.csv', 'csv']],
    related: { label: 'Read the essay', tab: 'writing' },
  },
  {
    id: 'evolution-thesis',
    type: 'Essay',
    domain: 'Institution',
    title: 'Policy must evolve, and so must the way we read it',
    date: 'November 2024',
    author: 'Shivang Uniyal',
    abstract:
      'The founding argument of THS: humans evolved, the way we consume policy did not, and closing that gap is a dignity problem, not a design problem.',
    findings: [
      'Every information technology change in history redrew who could participate in governance. Policy consumption never got that upgrade.',
      'When a scheme is written in language only an officer can parse, the citizen is not a citizen. She is a supplicant.',
    ],
    methods: 'Argument, not measurement. The measurements live in the rest of the library.',
    citations: ['THS field notes and research corpus.'],
    // An essay arguing, not measuring: it declares no distributional columns,
    // and the library says so on its card instead of papering over the gap.
    pit: null,
    downloads: [],
    related: { label: 'Read the writing', tab: 'writing' },
  },
];

export const PUB_TYPES = ['All', 'Report', 'Working paper', 'Brief', 'Dataset', 'Tool', 'Essay'];
