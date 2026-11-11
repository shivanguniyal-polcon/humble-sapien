// Canonical English content for the Sampark CSO page.
//
// The page is rendered from this object so a locale is a data file, not a
// forest of inline conditionals. Keys are stable; adding a locale means
// copying this shape and translating every value. Legal names, statute names
// and scheme names stay in Latin script inside the translations.

const en = {
  lang: {
    label: 'Page language',
    note: 'Labels and body copy are translated. Scheme names, office names, statute names and source titles stay in their official form.',
  },

  head: {
    eyebrow: 'Independent CSO · in formation',
    title: 'THS Sampark',
    scriptsLabel: 'Sampark in Indian scripts',
    question: 'Can a citizen-access institution be independent of its technology founder?',
    lead:
      'Sampark is becoming a separate Section 8 company with its own board, bank, grants and data governance. THS remains the technology affiliate, not the owner. The agents prepare the case; a person keeps the decision.',
    statusStrong: 'Status: proposed structure, not a registration.',
    statusRest:
      'This page describes the entity Sampark is being set up as. It does not claim that a company, 12A, 80G, CSR-1 or FCRA registration already exists. Those are legal steps for counsel and the first board, and the name must be cleared before any filing.',
  },

  gap: {
    eyebrow: 'The gap',
    title: 'India has scheme discovery. It does not have case continuity.',
    strap:
      'myScheme can find a scheme. A CSC can submit a form. Tele-Law can give legal advice. CPGRAMS can register a complaint. None of them owns the question that decides whether the citizen actually gets the entitlement: which office, by when, and who follows up when the office does not answer.',
    crowdedTitle: 'The chain is already crowded',
    actors: [
      {
        lead: 'myScheme',
        text: '5,102 schemes, discovery and eligibility filters; it then redirects the citizen to the department.',
      },
      {
        lead: 'CSC / Tele-Law',
        text: '5.27 lakh functional centres and 1.12 crore+ pre-litigation advices; a transaction and advice network, not a case-continuity desk.',
      },
      {
        lead: 'NALSA / DLSAs',
        text: 'free legal aid and representation; 15.5 lakh beneficiaries in 2023–24, with broad eligibility and thin reach.',
      },
      {
        lead: 'CPGRAMS',
        text: '26.15 lakh grievances in 2024; a complaint and disposal system, not a case-preparation or benefit-verification system.',
      },
      {
        lead: 'Haqdarshak',
        text: '7.6 million+ families and 52,000+ agents; assisted applications at scale through a private social enterprise, not a neutral public correction ledger.',
      },
    ],
    missingTitle: 'The missing link',
    missing: [
      {
        lead: 'One owner per case.',
        text: 'Not a directory: a named desk that stays with the problem through the handoff.',
      },
      {
        lead: 'One office and one deadline.',
        text: 'A source-dated answer to “where does this go, and by when?”',
      },
      {
        lead: 'A warm referral.',
        text: 'Legal aid, a worker helpline or a district clinic, with confirmation that it landed.',
      },
      {
        lead: 'A public record.',
        text: 'A correction log and aggregate evidence without publishing the citizen.',
      },
    ],
    claimLead: 'Sampark fits here:',
    claimRest:
      'the case-continuity layer between discovery, advice, complaint and outcome. It does not replace myScheme, a CSC, Tele-Law, NALSA, CPGRAMS or Haqdarshak. It makes the handoffs work and owns the follow-up. It can also test a household against the scheme’s own published criteria and show which clause fails — the department still decides.',
    stats: [
      {
        value: '15.5 lakh',
        text: 'legal-aid beneficiaries in 2023–24, in a system where about 80% of the population is eligible.',
      },
      {
        value: '26.15 lakh',
        text: 'CPGRAMS grievances in 2024; 2.77 lakh were still pending at year-end.',
      },
      {
        value: '5,102',
        text: 'schemes on myScheme; the citizen is then sent to the department to apply and follow up.',
      },
    ],
    sourcesPrefix: 'Sources:',
    sourcesSuffix:
      'The full landscape is in the research memo; the page states the narrow claim.',
    linkLabels: {
      ijr: 'India Justice Report 2025',
      cpg: 'DARPG / CPGRAMS 2024',
      myscheme: 'myScheme',
      telelaw: 'PIB / Tele-Law',
      csc: 'CSC',
      cag: 'CAG NSAP audit',
    },
  },

  eligible: {
    foldTitle: 'Eligibility from first principles',
    foldHint: 'Assess against the published criteria; never determine',
    eyebrow: 'The first handoff',
    title: 'Help the citizen test the rule, not guess at the scheme',
    strap:
      'Most exclusion happens before the form. The CAG found eligible households left out of NSAP because delivery was demand-driven: the scheme waited for an application and never tested the household against its own criteria. That test is the first act of case continuity, not a separate product.',
    mayTitle: 'What the desk may do',
    may: [
      'Read the scheme’s published criteria, not its summary: age, income, household, land, employment days, residence and the exclusion list.',
      'Test each criterion against the facts the citizen gives, and show the exact clause that fails.',
      'Name the document that would resolve an unknown, and the office that holds the list.',
      'Print the source and the last-checked date beside every test, so the citizen can check the claim at the counter.',
    ],
    mayNotTitle: 'What it may not do',
    mayNot: [
      {
        lead: 'Determine eligibility.',
        text: 'The department, the list or the sanctioning office decides. Sampark has no authority to confer or refuse a benefit.',
      },
      {
        lead: 'Issue a denial.',
        text: 'A failed criterion is reported as “on these facts”, with the route to correct the fact or the list.',
      },
      {
        lead: 'Guess at a list it cannot see.',
        text: 'SECC 2011, NFSA and state BPL lists are not public lookups everywhere. It says “cannot tell” and names the office.',
      },
      {
        lead: 'Interpret a household or family definition.',
        text: 'That is a legal-aid question, and it is referred.',
      },
    ],
    resultsTitle: 'Four results, never a yes or a no',
    results: [
      {
        lead: 'Meets every published criterion on the facts given.',
        text: 'Apply, with the pack and the named office.',
      },
      {
        lead: 'Unmet but fixable.',
        text: 'A missing document, a name mismatch or an unseeded bank account: fix this first, then apply.',
      },
      {
        lead: 'Unmet and not fixable.',
        text: 'This scheme is not for this household on these facts; here are the three closest alternatives. That is still not a denial.',
      },
      {
        lead: 'List-based, ambiguous or unreadable.',
        text: 'Cannot tell; here is the office that holds the list and the letter that asks for the entry.',
      },
    ],
    errorNote:
      'The error that matters is a false no. A false no costs the citizen an entitlement; a false yes costs a trip. So an uncertain case defaults to preparing the application, never to talking the citizen out of it.',
    caveatStrong: 'Not built yet.',
    caveat:
      'The live tool carries offices, deadlines and documents, not a criteria table. Each scheme needs one — field, threshold, exclusion, the guideline paragraph, the document that proves it and a last-checked date — plus a native-language question set and a reviewed false-negative audit before the check runs in public. Until then this section describes the method, not a working check: Sampark assesses against published criteria and never determines eligibility.',
  },

  separation: {
    eyebrow: 'The separation',
    title: 'An entity that can say no to its founder',
    strap:
      'Independence is not a logo or a footnote. It is who appoints the board, who signs the cheque, who controls the case data, and who can end the technology arrangement.',
    cards: [
      {
        title: 'What Sampark owns',
        body:
          'The citizen mandate, programme design, grants, the public correction log and the governance of case data. The CSO appoints its own chief executive and keeps its own books.',
      },
      {
        title: 'What THS supplies',
        body:
          'The Sampark engine, source-ledger tooling, security support and a time-boxed shared-services desk, supplied at arm’s length and priced into the CSO’s budget. THS does not receive citizen data as a condition of the service.',
      },
      {
        title: 'What the citizen keeps',
        body:
          'No account, no compelled disclosure, and an exit at every step. The citizen decides whether a case is stored, whether a reminder is sent, and whether a letter leaves the page.',
      },
    ],
  },

  affiliation: {
    eyebrow: 'Affiliated, not dependent',
    title: 'One affiliation agreement, six tests',
    strap:
      '“Affiliated” is not a legal status. It has to be written into a charter, a shareholding-free relationship and a set of contracts that a stranger can inspect.',
    columns: ['Decision', 'THS', 'Sampark CSO'],
    rows: [
      {
        label: 'Board',
        ths: 'One non-executive nominee for the first three years.',
        cso: 'Independent majority; appoints the CEO; no founder or funder veto.',
      },
      {
        label: 'Money',
        ths: 'A founder grant or in-kind technology at cost, capped and disclosed.',
        cso: 'Own bank account, own audit, own grant agreements, no THS guarantee.',
      },
      {
        label: 'Brand and IP',
        ths: 'Licences or assigns the Sampark name and code only after clearance.',
        cso: 'Owns the citizen-facing brand and the programme record once assigned.',
      },
      {
        label: 'Technology',
        ths: 'Supplies the engine and security support under a service agreement.',
        cso: 'Controls the roadmap, the procurement and the exit; source and data escrow.',
      },
      {
        label: 'Case data',
        ths: 'Processes a defined service only; no reuse for products or model training.',
        cso: 'Decides purpose, retention, access, correction and grievance handling.',
      },
      {
        label: 'Exit',
        ths: 'Moves to market rate after 24 months; no automatic renewal.',
        cso: 'May terminate on 90 days, keep the citizen record and continue the service.',
      },
    ],
    note:
      'The independence test is not “does THS like the board?” It is whether the CSO can refuse a THS request, publish a correction THS dislikes, and still pay its staff next month.',
  },

  offers: {
    eyebrow: 'Beyond the tool',
    title: 'The CSO is a desk, a network and a record',
    strap:
      'A page can hand a citizen the right paper. A CSO has to sit with them, train the helper, make the referral, keep the correction log and tell a funder the truth about what happened. These are the five things Sampark can offer that a website cannot.',
    groupLabel: 'Sampark service lines',
    whoLabel: 'Who it serves',
    whatLabel: 'What the desk does',
    boundaryLabel: 'Boundary',
    moneyLabel: 'How it is paid for',
    freeLabel: 'What stays free:',
    notLabel: 'What Sampark will not do:',
    free: [
      'The citizen route: the page, the office map, the document list and the letter',
      'The eligibility test against the published criteria, with the clause and the source',
      'The public correction log and the basic source ledger',
      'A starter desk kit for a small CSO or panchayat',
    ],
    not: [
      'Act as a law firm, sign a vakalatnama or promise representation',
      'Determine eligibility, sanction a benefit or deny one on the department’s behalf',
      'Publish a paid ranking of offices, officials or schemes',
      'Let a funder approve a finding, a correction or a citizen’s letter',
    ],
    items: [
      {
        label: 'Citizen desk',
        stage: 'Pilot',
        title: 'A person at the end of the letter',
        summary:
          'The page prepares the paper; a trained helper reads it with the citizen, checks the facts, prints it and makes the follow-up call. The desk is the unit of service, not the web session.',
        who: 'Citizens who arrive through a CSO, CSC, panchayat, legal-aid clinic or worker helpline.',
        what: [
          'A 30–45 minute assisted session, in the citizen’s language',
          'An eligibility test against the published criteria, with the failed clause shown',
          'Document check and a printed handover pack',
          'A case reference and a next-step sheet',
          'One follow-up call or message after 7–14 days',
          'An escalation packet if the office does not respond',
        ],
        boundary:
          'Not legal representation, not an eligibility determination and not a promise of a benefit. The desk may show which published criterion fails; the department decides. A legal-aid referral when the issue needs a lawyer.',
        money:
          'Free to the citizen. Partner desks are funded by programme grants, not by a fee charged to the person seeking help.',
      },
      {
        label: 'Partner academy',
        stage: 'Next',
        title: 'Train the helper, not just the citizen',
        summary:
          'A short curriculum and desk kit for the people who already sit with citizens: how to use the map, how to avoid overpromising, how to record a correction and how to refer.',
        who: 'Frontline staff and supervisors in CSOs, CSCs, panchayats, worker helplines and legal-aid clinics.',
        what: [
          'A two-day core course and a quarterly refresher',
          'Desk kit: script, checklist, poster, print pack and case log',
          'Source-update alerts when an office or deadline changes',
          'A monthly case-review clinic with a Sampark reviewer',
          'A peer network across districts, not a franchise',
        ],
        boundary:
          'Training does not certify anyone as a lawyer or a government agent. The employing organisation remains responsible for its own conduct; Sampark can withdraw the kit or the listing.',
        money:
          'Free for small CSOs; a published cohort fee for institutional partners. Training revenue is capped so it cannot become the main business.',
      },
      {
        label: 'Referral network',
        stage: 'Next',
        title: 'A warm handoff, not a signpost',
        summary:
          'When a case crosses from information into representation, Sampark routes it to a named person and records whether it landed. The citizen should not have to retell the story at every door.',
        who: 'Citizens whose problem needs a lawyer, a worker helpline, a mental-health service or a district grievance clinic.',
        what: [
          'A district and issue map of named referral partners',
          'A consent-based referral note the citizen can carry',
          'A warm handoff to a named person, not a generic email',
          'Closed-loop confirmation that the referral was received',
          'A quarterly review of refused, lost and repeat referrals',
        ],
        boundary:
          'Sampark does not take over the legal case, charge a referral fee or promise representation. The partner remains responsible for its own advice.',
        money:
          'Free. Funded as part of the access programme. No commission and no paid placement in the referral directory.',
      },
      {
        label: 'Evidence commons',
        stage: 'Live base',
        title: 'A public record of where the answer lives',
        summary:
          'The office graph, source ledger and correction log are public goods. Sampark also publishes delivery-failure research and district evidence packs, with the method and its limits attached.',
        who: 'CSOs, journalists, researchers, panchayats, state programme teams and funders.',
        what: [
          'The office and touchpoint map, with a last-checked date',
          'A public correction log, including the answers that changed',
          'Scheme and district delivery-failure briefs',
          'A custom district evidence pack for a programme or evaluation',
          'A method note and data dictionary for every public release',
        ],
        boundary:
          'No paid ranking, no funder approval of findings and no publication of citizen-identifying data. A funder may pay for a study; it does not buy the result.',
        money:
          'The public layer stays free. Custom research and evidence packs are paid work, with the method published and the funder disclosed.',
      },
      {
        label: 'Institutional lab',
        stage: 'Later',
        title: 'Programme design, evaluation and AI assurance',
        summary:
          'A small independent lab for public-interest teams that want a citizen-access pilot, an outcome evaluation or a source-bound AI agent a human can audit. It is built from Sampark’s own operating stack, not sold as a generic chatbot.',
        who: 'CSR foundations, state missions, national CSOs and public-interest technology teams.',
        what: [
          'District access programme design and costing',
          'Independent process and outcome evaluation',
          'Agent source-boundness, bias and human-gate review',
          'DPIA and model-procurement support',
          'A public method note and a management response',
        ],
        boundary:
          'No paid favourable finding, no vendor selection for a fee and no build that automates eligibility denial or sends a case without a human. The lab cannot audit its own work.',
        money:
          'Paid, at published day rates. Earned work is capped and disclosed; the lab does not become the master of the access programme.',
      },
    ],
  },

  legal: {
    foldTitle: 'The legal route: Section 8, CSR-1 and the name risk',
    foldHint: 'The eligibility gate, the fiscal bridge and the name conflict',
    eyebrow: 'The legal route',
    title: 'A Section 8 company, with a bridge before CSR-1',
    strap:
      'A separate company is the right destination. It is not an instant CSR receipt. The eligibility rule is the part most entity plans get wrong, so it is stated here before the fundraising table.',
    cards: [
      {
        title: 'Why a Section 8 company',
        body:
          'It is a separate legal person with limited liability, no share capital and objects locked to public benefit. It can hold its own bank account, employ staff, sign grants and apply for 12A/80G and CSR-1 without exposing THS to programme liabilities.',
      },
      {
        title: 'The CSR gate',
        body:
          'An independent Section 8 needs 12A and 80G, and an established three-year track record in similar activities, to file CSR-1. A newly incorporated company does not have that record on day one.',
        meta: 'Source: CSR Rules, Rule 4(1)(d) and Form CSR-1. Counsel to confirm the current form and facts.',
      },
      {
        title: 'The bridge',
        body:
          'Apply for 12A and 80G immediately after incorporation; run the first 24–36 months through a CSR-1 registered fiscal sponsor; build the programme record; then file CSR-1 in Sampark’s own name.',
        meta:
          'A corporate founder could establish the Section 8 under Rule 4(1)(a), but that trades independence for speed. Do not take that route without a governance reason.',
      },
    ],
    nameStrong: 'Name risk, checked before incorporation.',
    nameBody:
      'An established Bengaluru NGO has used the name Sampark since 1991 and reports 80G, 12A, CSR-1 and FCRA registrations at sampark.org. It is not affiliated with this project. Do not file “Sampark” as the legal name until a trademark search, an MCA name check and, if needed, consent are complete. The working name in this plan is THS Sampark; it is not cleared. The full name carries THS, so the name must be licensed from THS on arm’s-length terms and the affiliation agreement must state that the name grants no board control.',
  },

  agents: {
    eyebrow: 'Agentic back office · human front office',
    title: 'The agents are a desk, not a chatbot',
    strap:
      'Sampark does not need a machine that talks to a frightened person. It needs a back office that reads the form, finds the office, checks the date, drafts the paper and leaves the judgment to a human. That is a more useful differentiator, and it is harder to fake.',
    boundLabel: 'Bound to:',
    gateLabel: 'Human gate:',
    items: [
      {
        name: 'Intake agent',
        statusLabel: 'Staged · model',
        role:
          'Turns a sentence such as “my wages have not come for 47 days” into a structured request, and asks only for the one missing fact.',
        bound:
          'The citizen’s own words, the chosen language, and the minimum facts needed to route the case. No inferred caste, religion, disability or income.',
        gate:
          'A person confirms the facts before a route is chosen. The agent may show which published criterion fails, and what would resolve it; it never issues a determination.',
      },
      {
        name: 'Route agent',
        statusLabel: 'Live · deterministic',
        role:
          'Maps the situation, scheme and place to the office that owes the answer, the rung above it, and the contact route for that state.',
        bound:
          'The published scheme, touchpoint and verification tables. Every rung carries its source and the date it was last checked.',
        gate:
          'A person can move the addressed rung. The agent does not invent an office or a telephone number when the table has no row.',
      },
      {
        name: 'Evidence agent',
        statusLabel: 'Live ledger · monitor staged',
        role:
          'Keeps the source ledger, flags a stale office or deadline, and prepares a correction packet when a rule or address changes.',
        bound:
          'The primary notification, the official directory and the recorded verification date. A source that cannot be opened is shown as unknown.',
        gate:
          'A named reviewer clears every correction before it becomes public. The agent may flag; it may not overwrite a verified row.',
      },
      {
        name: 'Drafting agent',
        statusLabel: 'Live · template; model staged',
        role:
          'Assembles the printable sheet, the addressed letter, the document list and the case reference from the choices the citizen has made.',
        bound:
          'The selected scheme, situation and office; the citizen’s dates; the published document list. It does not give legal advice or predict an outcome.',
        gate:
          'The citizen reads and chooses to share, print or hand over the letter. There is no auto-send, no email from a model, and no signature in the citizen’s name.',
      },
      {
        name: 'Follow-up agent',
        statusLabel: 'Staged · consent required',
        role:
          'Schedules a reminder, prepares an escalation packet if a deadline passes, and records the office response in the case file.',
        bound:
          'Only the contact route the citizen explicitly chose, and only the case facts the citizen allowed to be stored.',
        gate:
          'A human reviews every outgoing message. The citizen can stop reminders with one action, and the default is no message at all.',
      },
      {
        name: 'Steward agent',
        statusLabel: 'Staged · back office',
        role:
          'Finds duplicate cases, checks translation consistency, prepares funder reporting and watches for a source that has changed.',
        bound:
          'Aggregate or de-identified data only. No citizen case narrative, name, phone number or document appears in a fundraising report.',
        gate:
          'A native-language reviewer signs off translation, and a programme lead signs off every public claim. The agent cannot approve its own work.',
      },
    ],
  },

  live: {
    eyebrow: 'What is actually running',
    title: 'Live automation now; model agents behind a gate',
    strap:
      'The distinction is the product promise. The page already automates the deterministic parts. The model-assisted parts are a funded build, not a line in a pitch deck.',
    liveTitle: 'Live now on this site',
    liveItems: [
      '14 schemes in the citizen shelf, with two built deeply enough to draft a case',
      '21 situations across those schemes',
      'A five-rung office ladder, from village to state',
      'Four deadline rules and an addressed letter template',
      'A verification ledger with a last-checked date',
      'Nine languages, including Urdu in right-to-left layout',
      'No account, no server-side case file, nothing sent until the citizen chooses',
    ],
    liveNote:
      'No language model is called. The routing, document list, deadlines and letter are deterministic and can be inspected.',
    stagedTitle: 'Staged, not claimed',
    stagedItems: [
      'An intake summariser that asks one missing question at a time and tests the published criteria without issuing a determination',
      'A source monitor that proposes corrections for a human reviewer',
      'A translation QA pass that flags drift; a native reviewer signs off',
      'A consent-bound follow-up service with a one-tap stop',
      'A de-identified steward that prepares funder reporting from aggregate outcomes',
    ],
    stagedNote:
      'Each staged service needs a data-protection impact assessment, a human-reviewed evaluation set, a named owner and a kill switch before it is visible to a citizen.',
    traceTitle: 'One case, five handoffs',
    trace: [
      {
        lead: 'Citizen:',
        text:
          '“My wages have not come for 47 days.” The intake agent structures the statement; it does not decide eligibility.',
      },
      {
        lead: 'Route agent:',
        text:
          'finds the MGNREGA office for the chosen place, and prints the source and last-checked date on the rung.',
      },
      {
        lead: 'Evidence agent:',
        text:
          'assembles the document list and flags an address whose check is stale instead of hiding it.',
      },
      {
        lead: 'Drafting agent:',
        text:
          'prepares the addressed letter and the printable sheet. It does not send.',
      },
      {
        lead: 'Human:',
        text:
          'the citizen, or a volunteer with recorded consent, reads the letter and chooses the next action. The case reference stays with them.',
      },
    ],
  },

  rules: {
    eyebrow: 'The guardrails',
    title: 'What an agent may never do',
    items: [
      'An agent may prepare and test published criteria against the facts a person confirms. No eligibility determination, no denial, no legal conclusion and no case closure is automated.',
      'No source, no sentence. Every address, deadline and document rule carries a source and a last-checked date.',
      'No send without a human. The citizen, or a named staff member acting on a recorded consent, presses the final action.',
      'Every run leaves a trace: input, source, model and prompt version, output, reviewer and timestamp.',
      'Citizen data is not training data. A model provider may not reuse a Sampark case to improve a general model.',
      'A correction changes the ledger and the agent. The old answer is kept in the public correction log.',
    ],
    note:
      'These are product constraints, not model prompts. They belong in the service contract, the access controls and the audit log.',
  },

  money: {
    foldTitle: 'What independence costs',
    foldHint: 'Year 1 and 18-month planning envelopes',
    eyebrow: 'The money',
    title: 'What independence costs',
    strap:
      'These are planning envelopes, not quotes or commitments. A lean secretariat can start smaller; two district pilots make the first year larger and the evidence stronger.',
    caption: 'Indicative Year 1 envelope, INR',
    columns: ['Line', 'Lean secretariat', 'With two district pilots'],
    rows: [
      ['Incorporation, counsel, 12A/80G, audit setup', '₹8–15 lakh', '₹8–15 lakh'],
      ['Core team (4 FTE, fractional finance and legal)', '₹50–70 lakh', '₹70–1.1 crore'],
      ['Technology licence and shared services from THS', '₹25–35 lakh', '₹35–60 lakh'],
      ['District pilots, partner training, print and follow-up', '₹15–25 lakh', '₹80–1.5 crore'],
      ['Evaluation, native-language review, DPIA and red-team', '₹10–15 lakh', '₹15–25 lakh'],
      ['Total', '₹1.1–1.6 crore', '₹2.1–3.6 crore'],
    ],
    cards: [
      {
        title: 'The first 18 months',
        body:
          'Raise ₹3–5 crore, not a five-year endowment. That buys the incorporation, a four-person secretariat, the 12A/80G work, two district pilots and an independent evaluation. The next raise is justified by the case record, not by the size of the map.',
      },
      {
        title: 'No single dependency',
        body:
          'No funder above roughly 40% by Year 3; THS shared services capped at 15% of the Year 1 budget, 8% in Year 2 and zero by Year 3; the CSO may terminate the technology agreement and keep the citizen record. CSR arrives through a fiscal sponsor until Sampark can hold CSR-1 itself.',
      },
    ],
  },

  days: {
    foldTitle: 'The first 90 days',
    foldHint: 'Seven steps before a funder is asked',
    eyebrow: 'The first 90 days',
    title: 'What must happen before a funder is asked',
    steps: [
      {
        lead: 'Clear the name.',
        text:
          'Trademark search, MCA name check and a decision on the working name. Do not incorporate first and argue later.',
      },
      {
        lead: 'Incorporate the Section 8 company.',
        text:
          'Objects broad enough for access, research, training and public-interest technology; independent directors named; no share capital.',
      },
      {
        lead: 'Open the compliance file.',
        text:
          'PAN, bank, accounting, 12A and 80G applications, GST advice, FCRA only if foreign money is actually planned.',
      },
      {
        lead: 'Sign the affiliation agreement.',
        text:
          'Board seat, IP licence or assignment, shared-services scope, data-processing terms, exit and escrow.',
      },
      {
        lead: 'Select the fiscal sponsor.',
        text:
          'A CSR-1 registered partner with a clean audit and a written programme MOU for the bridge period.',
      },
      {
        lead: 'Run the AI gate.',
        text:
          'DPIA, human-review protocol, translation review, red-team the intake and drafting agents, and publish the first agent trace.',
      },
    ],
  },

  open: {
    foldTitle: 'What is still open',
    foldHint: 'Name, board, fiscal sponsor, AI provider',
    eyebrow: 'What is still open',
    title: 'Decisions this page does not pretend to make',
    items: [
      {
        lead: 'Legal form:',
        text:
          'Section 8 is recommended, but a public trust or society is a live alternative if the first board or the state registration route favours it.',
      },
      {
        lead: 'Name:',
        text:
          'the existing Bengaluru Sampark organisation and any other prior user must be cleared. “THS Sampark” is a working name, not a cleared one.',
      },
      {
        lead: 'Fiscal sponsor:',
        text:
          'the partner, the programme perimeter, the fee and the data responsibilities need a written MOU before a CSR proposal goes out.',
      },
      {
        lead: 'Board:',
        text:
          'a majority-independent board with a citizen or field perspective, a finance/audit chair and a named data-protection owner. THS gets one seat, not control.',
      },
      {
        lead: 'AI provider:',
        text:
          'no model provider is selected. A provider must accept no-training terms, data residency, retention limits, audit access and a kill switch.',
      },
      {
        lead: 'FCRA and foreign funding:',
        text:
          'only after counsel confirms eligibility and the compliance load. Do not make foreign money the first plan.',
      },
      {
        lead: 'State and district:',
        text:
          'two districts with a real partner and a measurable case record beat a thin national map.',
      },
    ],
  },

  end: {
    title: 'Use the tool this institution exists to carry',
    body:
      'The live page is the proof of the method: a citizen names the harm, gets the office, the papers, the letter and the next rung. The CSO is being built so that the method outlives its founder and its funders.',
    primary: 'Open the Sampark tool',
    secondary: 'Support the work',
  },

  sources: {
    foldTitle: 'Sources and further reading',
    foldHint: 'Official links and the name check',
    eyebrow: 'Sources',
    title: 'What this page rests on',
    links: [
      {
        key: 'csrFaq',
        label: 'MCA / National CSR Portal: CSR FAQs and implementing-agency rules',
      },
      { key: 'csrPortal', label: 'MCA / National CSR Portal: Form CSR-1 and CSR Rules' },
      { key: 'meity', label: 'MeitY: Digital Personal Data Protection Act, 2023 and rules' },
      {
        key: 'aiGuide',
        label:
          'India AI Governance Guidelines (MeitY, 2025): human oversight, audit trails and accountability',
      },
      { key: 'name', label: 'Existing Sampark NGO, Bengaluru: name and registration check' },
      { key: 'myschemeFaq', label: 'myScheme FAQ: discovery, then redirect to the department' },
      {
        key: 'ijr',
        label: 'India Justice Report 2025: legal-aid beneficiaries and capacity',
      },
      {
        key: 'cag',
        label: 'CAG, Performance Audit of NSAP (2023): eligible applicants left out in a demand-driven scheme',
      },
      { key: 'darpg', label: 'DARPG, CPGRAMS monthly report (November 2025)' },
      { key: 'csc', label: 'CSC official data: functional centres and transactions' },
      { key: 'haqdarshak', label: 'Haqdarshak: assisted scheme access at scale' },
    ],
    note:
      'This page is not legal, tax or investment advice. The entity design, the name clearance and the CSR route must be confirmed by a chartered accountant and counsel before a filing or a funder commitment.',
  },
};

export default en;
