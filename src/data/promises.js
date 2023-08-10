// THS Accountability: promise versus record.
// Promise text from the BJP Gujarat 2022 manifesto, Agresar Health chapter
// (see BJP_Gujarat_2022_Manifesto_Health_WCD.md in the THS research corpus).
// Status checked against public evidence up to October 2026.
// Status vocabulary:
//   'delivered'  : the promised thing exists and is documented
//   'partial'    : related activity exists, the promise as written is not verified
//   'announced'  : a decision or recommendation is on record, delivery not verified
//   'none'       : no public evidence found for the promise as written

export const STATUS_LABELS = {
  delivered: 'Delivered',
  partial: 'Partly evidenced',
  announced: 'Announced only',
  none: 'No public evidence found',
};

export const promises = [
  {
    id: 'recruitment-board',
    promise:
      'Set up a Health Recruitment Board to recruit doctors and nurses, on the lines of the Police Recruitment Board.',
    status: 'announced',
    reading:
      'A state reforms commission recommended a Medical Services Recruitment Board in December 2025. Recruitment still runs through the Health Department and GPSC. A recommendation is on record; the board itself is not verified.',
    evidence: [
      ['3 Dec 2025', 'Gujarat CMO: Administrative Reforms Commission recommends a Medical Services Recruitment Board', 'https://cmogujarat.gov.in/en/latest-news/garc-6th-report-recruitment-reforms-cm'],
      ['10 Dec 2025', 'The Secretariat: government signals the board, order expected', 'https://thesecretariat.in/article/gujarat-signals-major-hr-reform-with-medical-recruitment-board'],
    ],
  },
  {
    id: 'health-stack',
    promise:
      'Become the first state to launch a Health Stack with a unique Health ID: one-stop appointment booking, medical history and diagnostic reports.',
    status: 'partial',
    reading:
      'Digital IDs exist at scale: 4.23 crore ABHA numbers for Gujarat by January 2024, and about 5.25 crore by mid 2026. But those are national ABDM accounts. We could not verify a Gujarat-specific Health Stack with the full promised one-stop service.',
    evidence: [
      ['6 Feb 2024', 'PIB: 4,22,51,129 ABHA numbers for Gujarat as of 24 Jan 2024', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068'],
      ['31 Jul 2026', 'Lok Sabha answer indexing 5.25 crore ABHAs in Gujarat', 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AS290_mDyURC.pdf?source=lsapps'],
      ['live', 'National ABDM portal and public dashboard', 'https://dashboard.abdm.gov.in/abdm/'],
    ],
  },
  {
    id: 'dhanwantari-fund',
    promise:
      'Launch the Dhanwantari Preventive Healthcare Fund for public Yoga centres, herbal gardens and a preventive health ecosystem.',
    status: 'none',
    reading:
      'No public confirmation of a fund under that name, and no allocation tied to it. Gujarat spends broadly on health (₹15,141 crore budgeted for 2023-24), but broad spending is not this promise. Separate medicinal-plant schemes exist; they are not the fund.',
    evidence: [
      ['2023-24', 'PRS Gujarat budget analysis: ₹15,141 crore Health and Family Welfare', 'https://prsindia.org/budgets/states/gujarat-budget-analysis-2023-24'],
      ['n/a', 'Gujarat Medicinal Plants Board promotional scheme (separate activity)', 'https://gmpb.gujarat.gov.in/Content/promotional-scheme-137'],
    ],
  },
  {
    id: 'genetics-centre',
    promise:
      'Establish a Centre for Genetics and Health in Ahmedabad for genetic diseases, and a hub for prenatal genetic screening.',
    status: 'none',
    reading:
      'No announcement or inauguration of the promised centre. Related genetics work exists: a tribal genome project run by the state biotech centre in 2025, and older prenatal diagnosis work at a private institute. Neither is the promised centre.',
    evidence: [
      ['8 Nov 2025', 'ETHealthworld: tribal-focused genome sequencing project approved FY 2025-26', 'https://health.economictimes.indiatimes.com/news/policy/gujarat-becomes-first-state-in-india-to-launch-tribal-focused-genome-sequencing-project/125186373'],
      ['14 Sep 2025', 'Indian Express: prenatal genetic diagnosis study at FRIGE, covering 2008-2022', 'https://indianexpress.com/article/cities/ahmedabad/prenatal-diagnosis-foetuses-genetic-anomalies-10248997/'],
    ],
  },
];

export const promiseSources = [
  'BJP Gujarat 2022 manifesto, Agresar Health chapter (promise text)',
  'CMO Gujarat, PIB, Lok Sabha answers, PRS budget analyses (delivery evidence)',
];

// Context figures from the THS research corpus.
export const corpusFacts = [
  ['26%', 'of the 160 commitments in the Gujarat 2022 manifesto sat in health and women and child development'],
  ['214', 'parliamentary questions analysed across 24 files to read what gets asked against what gets answered'],
  ['2018-2023', 'the window of MPLAD misappropriation cases compiled state by state in Issue Brief 13'],
];
