// THS works atlas: the evidence strata.
// Each entry: era of the work, what it was, the measurable output, and the
// raw data file behind it where one exists in the THS research files.

export const works = [
  {
    id: 'lamp',
    era: 'Legislature',
    title: 'LAMP Fellowship: Parliament',
    years: '2021–2022',
    metric: '60 Parliamentary Questions',
    detail:
      'One in five of the MP’s 269 questions across three sessions; two Private Member’s Bills; budget and regulatory briefings distilled daily.',
    artifact: 'LS_Questions_Verma extract (60 questions, ministry × session matrix)',
  },
  {
    id: 'namo',
    era: 'Delivery',
    title: 'Scheme monitoring across five states',
    years: '2022–2023',
    metric: '5 states · 4 verticals',
    detail:
      'Health, WCD, infrastructure and governance delivery tracked against field-verified outcomes; a consolidation layer normalised state definitions so indicators meant the same thing everywhere.',
    artifact: 'ETL pipelines, decision-ready briefs',
  },
  {
    id: 'manifesto',
    era: 'Civic tech',
    title: 'The manifesto engine',
    years: '2024',
    metric: '6 manifestos · 17-category taxonomy',
    detail:
      'An LLM pipeline coding election-manifesto promises across BJP and INC (2014–2024) into a 17-category taxonomy, with audited validation workbooks.',
    artifact: 'README_manifesto-analysis (pipeline + validation audit)',
  },
  {
    id: 'vidhi',
    era: 'Civic tech',
    title: "A Voter's Guide to Reading a Manifesto",
    years: '2024',
    metric: '1,500+ promises coded',
    detail:
      'Co-authored for Vidhi Centre for Legal Policy: scoring BJP and INC manifestos on development content and vulnerable-section inclusion.',
    artifact: 'Published brief, Vidhi Centre',
  },
  {
    id: 'evm',
    era: 'Research',
    title: 'EVMs and the gender turnout gap',
    years: '2025–2026',
    metric: '434-district panel · 46 PCs',
    detail:
      'Continuous-dose difference-in-differences on the 1999 EVM Phase-1 rollout, with state fixed effects, placebo tests and clustered, randomisation-inference and wild-bootstrap inference.',
    artifact: 'evm_diagnostic_outputs/ (raw regression output in the Data Commons)',
  },
  {
    id: 'pmjay',
    era: 'Research',
    title: 'PM-JAY fiscal sustainability model',
    years: '2026',
    metric: '25 anchors · MAPE ≤ 4.5%',
    detail:
      'System-dynamics projection of the world’s largest government-funded health insurance scheme to 2035; four scenarios under one budget envelope. No tested lever restores fiscal sustainability.',
    artifact: 'pmjay_official_series.csv + calibrated model (in the Data Commons)',
  },
  {
    id: 'minerals',
    era: 'Research',
    title: 'Critical minerals disruption prediction',
    years: '2026',
    metric: '48,780 records · ROC-AUC 0.855',
    detail:
      'India Foundation Issue Brief 13: a machine-learning framework for disruption prediction and strategic reserve sizing: $633M CapEx against $910M lifecycle for the National Critical Minerals Mission.',
    artifact: 'Published issue brief, India Foundation',
  },
  {
    id: 'cities',
    era: 'Accountability',
    title: 'Digital cities & algorithmic accountability',
    years: '2026',
    metric: '25 indicators · costed pilot',
    detail:
      'A Digital Technology Impact Assessment pilot: settlement-footprint layers with service-use-only rules, pre-registered equity metrics (informal reach ≥ 90% of formal), and a costed cycle at ₹1.2–1.8 crore from existing AMRUT 2.0 heads.',
    artifact: 'portfolio-v2/DIGITAL_CITIES_FULL_REPORT.md',
  },
];
