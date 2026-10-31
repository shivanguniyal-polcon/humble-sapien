// THS Research library. Every entry is a durable publication in the
// institutional sense: author, date, abstract, key findings, methods,
// citations, downloads. Types follow research-library conventions:
// report, working paper, brief, dataset, tool, essay, field note.

export const publications = [
  {
    id: 'dpi-corridor',
    type: 'Report',
    domain: 'Governance',
    title: 'The DPI corridor: what UPI, Pix and NIP actually chose',
    date: 'October 2026',
    author: 'THS Research',
    abstract:
      '“Learn from India’s UPI” is repeated in ministerial decks with almost no structural comparison behind it. UPI, Brazil’s Pix and Nigeria’s NIP are three different designs solving three different problems. This puts them on one fixed frame — who runs the rail, what account it rides on, how it is priced, whether it interoperates and works offline, and who it leaves out — so a new adopter can see which choices travel and which only look copyable. Every figure carries its source and its as-of date; where a number is not published, it is named as a gap rather than estimated.',
    findings: [
      'Three governance models, not one: UPI runs on NPCI, a broad-based payments utility owned by member banks; Pix is run directly by Brazil’s central bank (BCB), which also operates the settlement system; NIP runs on NIBSS, owned by Nigerian banks under CBN oversight. The governance choice — industry pool versus central bank — is the first thing a copyist must decide, and it is not the same across the three.',
      'All three are account-based. UPI links an app to an existing bank account; Pix keys and UPI virtual addresses are aliases that resolve to an account, they do not create one; NIP is explicitly account-number-based. None of the three reaches an unbanked user directly — the rail assumes the account layer already exists.',
      'Pricing points three ways: Pix is free for individuals with provider-set business fees; UPI has run at zero merchant discount rate, and the announced 0.4% MDR on select person-to-merchant transactions above ₹2,000 did not take effect on 15 October 2026 — NPCI deferred it on 13 October 2026 to “immediately post Diwali”, date to be notified separately, so no UPI MDR was in force as of 23 October 2026; NIP charges institutions a reported ₦3.75 per transaction, with the current end-user tariff unverifiable against the revised 2026 CBN guide.',
      'The deferred UPI terms are reported, not verified: 0.4% standard rate on P2M above ₹2,000 at medium and large merchants, ₹5 flat for named essential-service categories, 0.02% capped at ₹300 for capital-markets transactions, merchant-paid, with a reported ₹300 cap above ₹75,000. None of this could be read in a primary NPCI circular — the deferral date and terms rest on contemporaneous press reports, and the merchant classification, exemption list and settlement split are named gaps, not facts. Pricing moved after the frame was frozen; the lesson for an adopter is that the pricing row is the most volatile line on it.',
      'Offline and low-connectivity behaviour differs sharply: UPI offers USSD (*99#) and feature-phone 123PAY access, and an offline-capable Lite product; NIP reaches feature phones by USSD but is online and real-time; no general offline or USSD mode for Pix was verifiable in the primary materials.',
      'The inclusion data that would settle the comparison does not exist in public. None of the three operators publishes a current breakdown of rail use by gender, rurality or banked status. National financial-inclusion surveys exist but are country-wide, not rail-specific — a named gap, not a number to guess.',
    ],
    methods:
      'Primary sources only for the numbers: NPCI product statistics and scheme documentation, Brazil’s BCB Pix documentation and management reports, Nigeria’s CBN payment statistics and NIBSS reports. Every figure carries its source and as-of date; where two primary sources disagree both are printed; where a figure is genuinely unpublished the page says so. The comparison is scored on a fixed frame — governance, account model, pricing, interoperability, offline, inclusion — so it is structural rather than narrative. Figures current to 7 October 2026, except the UPI pricing row, re-checked 23 October 2026 after the announced 15 October 2026 MDR start slipped. This is a regulatory and structural landscape with named data gaps, not a market-share study: commercial volume data by private operator is paywalled.',
    citations: [
      'NPCI, UPI product statistics (September 2026) and UPI product documentation, npci.org.in.',
      'Reserve Bank of India, Payment System Report, December 2025 (published 18 May 2026); Digitalisation and Payment Revolution in India (29 July 2024).',
      'Banco Central do Brasil, Pix overview and Pix Management Report 2023–2025 (2026); SPI Annual Report 2024.',
      'Central Bank of Nigeria, Payment Modes and e-Payment Statistics (as of 30 June 2024); NIBSS NIP documentation.',
      'AfricaNenda, State of Instant and Inclusive Payment Systems 2025 — Nigeria case study (12 November 2025); EFInA Nigeria financial inclusion surveys (2020, 2023).',
      'Department of Financial Services, FAQ: Merchant Discount Rate (MDR) on Select UPI (P2M) Transactions (15 September 2026) — listed but not machine-readable at fetch time.',
      'The Hindu (13 October 2026), “UPI MDR on select merchant transactions shall be implemented post-Diwali”; The New Indian Express (13 October 2026), “NPCI defers 0.4% MDR on UPI transactions above ₹2,000 until after Diwali” — press reports of the deferral and reported terms; the underlying NPCI circular text was not publicly readable.',
    ],
    pit: {
      benefits: 'Funders, regulators and operators comparing DPI across regions, and new adopters deciding which design choices to copy given their own account infrastructure.',
      pays: 'THS research time on the two non-India corridors; the India side is grounded in the organisation’s own field record, including a UPI-as-DPI parliamentary question drafted for the 17th Lok Sabha.',
      missing: 'State and municipal rails, and every private-operator commercial volume figure (paywalled). No operator publishes rail use by gender, rurality or banked status, so the inclusion read rests on country-wide surveys that cannot isolate the rail.',
    },
    downloads: [
      {
        name: 'ths_dpi_corridor_sources.txt',
        kind: 'text',
        href: '/research/ths_dpi_corridor_sources.txt',
        note: 'The published source list. This is not a row-level dataset.',
      },
    ],
    related: { label: 'Compare policies on the Atlas', tab: 'compare' },
  },
  {
    id: 'regulator-obligation-monitor',
    type: 'Tool',
    domain: 'Governance',
    title: 'Regulator Obligation Monitor: does the extractor clear the bar?',
    date: 'October 2026',
    author: 'THS Research',
    abstract:
      'A machine reads RBI, SEBI and IRDAI circulars and lists what they oblige a regulated firm to do. The claim a compliance buyer cares about is not "it finds sentences" but "the list is right". This is the accuracy the extractor was measured at, on circulars the classifier had never seen, judged by hand against a fixed rubric.',
    findings: [
      'Duty precision clears 90% on every blind holdout: 92.1%, 94.4% and 95.7% strict across three 50-row holdouts judged without the classifier labels. Strict means a hedged duty or a cut span scores as a miss; lenient it is 97-100%.',
      'Duty recall is 100% on all four holdouts and 31/31 on three hand-coded circulars: the machine does not miss binding sentences that belong on the list.',
      'Type accuracy — telling an action the firm must take apart from a composition rule or an eligibility grant — is 98-100%.',
      'The applicability filter, which decides whose obligation each row is for a named entity profile, passed its hard gate with zero binding obligations silently dropped across 110 judged drops on two buyer profiles.',
      'The one weak claim is the bearer tag at 41-59%: tagging which entity a duty falls on. That is the layer applicability filtering is built to take over, not a failure of finding or typing.',
    ],
    methods:
      '50 of the newest RBI circulars touching the NBFC family (June-October 2026), collected from the circular index with source URLs. The extractor runs the existing legal pipeline (offset-preserving sentence segmentation and clause classification) over a typed obligation schema. Precision is measured on a deterministic 200-row development sample plus three separate 50-row holdouts drawn from rows never judged and judged by hand against a stated rubric, without seeing the classifier labels. Recall is measured on three length-stratified circulars hand-coded in full. Every error class found on a holdout was documented and left unfixed rather than patched against the holdout, so each new number comes from a genuinely unseen set. Scoring is reproducible from the fixed gold in one command. This exhibit reports the measured accuracy of the extraction layer; it is not a shipped product, and the review-gated product shape remains an open founder decision.',
    citations: [
      'THS Regulator Obligation Monitor precision test (22 October 2026), private/verification/2026-10-22-rbi-precision-test/report.md, sections 8-12.',
      'Reserve Bank of India, circular index (NBFC-family circulars, ids 13742-13493, June-October 2026).',
      'THS applicability-filter design and two-round blind evaluation (private/applicability-filter-design.md).',
    ],
    pit: {
      benefits: 'Compliance heads, company secretaries and legal teams at regulated firms — NBFCs, insurers, asset managers — who today hold the obligation register by reading circulars by hand or paying a vendor with no published accuracy figure.',
      pays: 'THS build time for four rounds of classifier work and the holdout judging; a licensee pays for a reviewed deliverable, since human review is retained by design rather than removed.',
      missing: 'State regulators and municipal bylaws are outside this corpus, which is Central-bank circulars only. Duties on forum bodies and third parties are tagged poorly, and the addressee field in the source corpus is scraped HTML — clean extraction is a prerequisite before the filter touches buyer-facing output.',
    },
    downloads: [
      {
        name: 'ths_monitor_precision_summary.txt',
        kind: 'text',
        href: '/research/ths_monitor_precision_summary.txt',
        note: 'The published accuracy summary; the holdout labels remain private.',
      },
    ],
    related: { label: 'Simplify a regulation you bring', tab: 'work' },
  },
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
    downloads: [
      {
        name: 'ths_sprawl_sources.txt',
        kind: 'text',
        href: '/research/ths_sprawl_sources.txt',
        note: 'The source list behind the four figures in the brief.',
      },
      {
        name: 'ths_state_output_series.csv',
        kind: 'csv',
        href: '/research/ths_state_output_series.csv',
        note: 'Per-year counts of every Act, ordinance, rule and notification in the India Code catalogue, 1947–2026, plus the RTI and open-data series. Every row carries its scope and source.',
      },
      {
        name: 'ths_state_output_instruments.csv',
        kind: 'csv',
        href: '/research/ths_state_output_instruments.csv',
        note: 'One row per instrument — the dots behind the timeline — with its catalogue title and, where verified, the scheduled languages with an official text plus the source link.',
      },
      {
        name: 'ths_state_output_sources.txt',
        kind: 'text',
        href: '/research/ths_state_output_sources.txt',
        note: 'Sources, scopes and known gaps — including the Gazette total nobody publishes.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_pmjay_series.csv',
        kind: 'csv',
        href: '/research/ths_pmjay_series.csv',
        note: 'National milestone series, one row per date.',
      },
      {
        name: 'ths_pmjay_states.csv',
        kind: 'csv',
        href: '/research/ths_pmjay_states.csv',
        note: 'State and UT admissions by financial year.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_promise_evidence.txt',
        kind: 'text',
        href: '/research/ths_promise_evidence.txt',
        note: 'Each promise, its status and every dated source with a URL.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_policy_atlas.json',
        kind: 'json',
        href: '/research/ths_policy_atlas.json',
        note: 'All 15 sectors and 90 policies, with PIT readings and sources.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_open_data_directory.json',
        kind: 'json',
        href: '/research/ths_open_data_directory.json',
        note: 'All 29 datasets with licence labels and source URLs.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_escalation_directory.json',
        kind: 'json',
        href: '/research/ths_escalation_directory.json',
        note: 'Every office, contact and verification flag in the directory.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_simplify_rules.json',
        kind: 'json',
        href: '/research/ths_simplify_rules.json',
        note: 'The full substitution dictionary, with risk flags and notes.',
      },
    ],
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
    downloads: [
      {
        name: 'ths_ls_questions.csv',
        kind: 'csv',
        gap: 'The 214-question source corpus is not held in this repository. Only the summary findings and citations are published; no row-level file is offered.',
      },
    ],
    related: { label: 'Read the essay', tab: 'writing' },
  },
  {
    id: 'ai-policy-readability',
    type: 'Report',
    domain: 'Technology',
    title: 'AI rules are written in graduate-level English — and India’s carry more obligation',
    date: 'October 2026',
    author: 'THS Research',
    abstract:
      'A five-figure reading of 18 AI instruments across India, the Global North and the Global South. Every regional corpus writes at graduate level. India’s instruments carry more binding language per 1,000 words than either comparison group, while their vocabulary does not sort cleanly into a Northern or Southern camp. The data point is the obligation density, not a regional lineage.',
    findings: [
      'Every regional corpus writes AI rules at graduate level: mean Flesch Reading Ease is 13.2 for India, 13.0 for the Global North and 10.4 for the Global South, with mean grades clustered around 19–20.',
      'India’s six instruments carry more binding language per 1,000 words (14.7 deontic words) than the Northern (8.6) or Southern (9.0) instruments. The rules are harder to act on, not merely harder to read.',
      'The vocabulary splits rather than converging: four of the six Indian instruments sit closer to the Southern centroid and two closer to the Northern one. The mean North-minus-South gap is -0.017, with a 95% bootstrap interval of -0.028 to 0.006.',
      'The regional gap does not survive 2,000 shuffled labelings (permutation p = 0.72). Nearest-neighbour lineage is equally balanced: 74 provisions are closest to the North, 72 to the South (p = 0.93).',
      'The earlier hypothesis that India’s AI rules sit closer to Northern wording is not supported by the current corpus. What survives is the readability problem and the heavier obligation density.',
    ],
    methods:
      'Eighteen instruments were sampled across India (6), the Global North (7) and the Global South (5): 791 provisions and 119,714 words. Flesch Reading Ease and Flesch-Kincaid grade were computed from sentence and syllable counts. Vocabulary similarity is TF-IDF cosine similarity to each region’s centroid, with 600 bootstrap draws resampling provisions within an instrument. The permutation test shuffles the region labels 2,000 times with a fixed seed. Results were regenerated from the full 791-provision corpus on 26 October 2026; the older 645-provision extract is not used. The corpus is a reading of selected instruments, not a census of every AI rule in force.',
    citations: [
      'THS Data Point corpus and receipts, 18 instruments and 791 provisions, retrieved 20 October 2026.',
      'Rudolf Flesch, “A new readability yardstick”, Journal of Applied Psychology (1948).',
      'Gerard Salton and Christopher Buckley, “Term-weighting approaches in automatic text retrieval”, Information Processing & Management (1988).',
      'THS Data Point analysis, results.json and manifest.json (26 October 2026).',
    ],
    pit: {
      benefits: 'Citizens and civil-society readers who need to know what an AI rule actually requires, and regulators comparing the reading burden they impose.',
      pays: 'THS research time and the public bodies whose instruments were read. No reader is charged, and no source text is withheld behind the page.',
      missing: 'State-level AI rules, instruments published only in languages other than English, and every rule that is implemented through practice rather than text. Eighteen instruments are a sample, not the whole rulebook.',
    },
    downloads: [],
    study: 'readability',
    related: { label: 'Open the policy simplifier', tab: 'work' },
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
