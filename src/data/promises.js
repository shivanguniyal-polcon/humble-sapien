// THS Accountability: promise versus record.
//
// Promise text is transcribed from the BJP Gujarat 2022 manifesto, "Agresar
// Gujarat Sankalp Patra 2022". The health chapter runs from printed page 56 to
// 59; the women-and-children pages are printed pages 40 and 41; the geriatric
// promise is on printed page 64. The PDF page numbers differ by two, so both
// are stored: `page` is what a reader sees in the printed manifesto, `pdfPage`
// is what the PDF viewer needs.
//
// Status vocabulary:
//   'delivered'  : the promised thing exists and is documented
//   'partial'    : related activity exists, the promise as written is not verified
//   'announced'  : a decision or recommendation is on record, delivery not verified
//   'none'       : no public evidence found for the promise as written
//   'queued'     : transcribed, not yet checked. This is a stage, not a verdict.
//
// The fourth check, operational output, is the one that separates a file from a
// service. A queue card has no findings at all; it says so rather than borrowing
// the language of a verdict.

export const MANIFESTO = {
  title: 'Agresar Gujarat Sankalp Patra 2022',
  publisher: 'Bharatiya Janata Party, Gujarat',
  year: '2022',
  url: 'https://www.oneindia.com/downloads/2022/11/bjpmanifestoforgujaratassemblyelection2022english.pdf',
};

export const manifestoPageUrl = (pdfPage) => `${MANIFESTO.url}#page=${pdfPage}`;

export const SECTORS = [
  {
    id: 'health',
    label: 'Health',
    short: 'Health',
    description: 'Hospitals, insurance, medicines, public health and the health workforce.',
  },
  {
    id: 'child',
    label: 'Child development',
    short: 'Children',
    description: 'Maternal and newborn care, nutrition, ambulances and Anganwadi services.',
  },
];

export const SECTOR_LABELS = Object.fromEntries(
  SECTORS.map((sector) => [sector.id, sector.label]),
);

export const STATUS_LABELS = {
  delivered: 'Delivered',
  partial: 'Partly evidenced',
  announced: 'Announced only',
  none: 'No public evidence found',
  queued: 'Not yet checked',
};

// The four verdicts a checked card can carry. 'queued' is deliberately outside
// this list: a transcription is not a finding.
export const AUDITED_STATUSES = ['delivered', 'partial', 'announced', 'none'];
export const STATUS_ORDER = [...AUDITED_STATUSES, 'queued'];

// The same four questions are asked of every promise. A reader can compare one
// card with another only if the checks do not change between them. The check is
// about paper: a missing order is a missing receipt, not proof that nothing
// happened.
export const AUDIT_CHECKS = [
  {
    id: 'manifesto',
    label: 'Manifesto text',
    ask: 'Is the promise quoted from the manifesto, with its chapter and page?',
  },
  {
    id: 'order',
    label: 'Government order, notification or scheme guideline',
    ask: 'Is there a dated order, notification or guideline that creates, funds or starts it?',
  },
  {
    id: 'budget',
    label: 'Dedicated budget line',
    ask: 'Is there a line item for this promise, not a department total?',
  },
  {
    id: 'output',
    label: 'Operational output',
    ask: 'Is there a running service, staff, patients or students?',
  },
];

export const CHECK_STATES = {
  found: {
    label: 'Found',
    detail: 'A dated public document shows the thing itself.',
  },
  partial: {
    label: 'Partial',
    detail: 'Something related exists, but the promise as written is not shown.',
  },
  missing: {
    label: 'Not found',
    detail:
      'A public record was searched and the paper was not there. It is not a finding that nothing happened.',
  },
  unchecked: {
    label: 'Not checked',
    detail:
      'The promise is transcribed, but no search for an order, budget line or output has been recorded yet.',
  },
};

const HEALTH_DEPARTMENT = 'Health and Family Welfare Department, Government of Gujarat';
const AYUSH_DEPARTMENT = 'Health and Family Welfare Department (AYUSH), Government of Gujarat';
const WCD_DEPARTMENT = 'Women and Child Development Department, Government of Gujarat';

const uncheckedChecks = () =>
  Object.fromEntries(
    AUDIT_CHECKS.map((check) => [
      check.id,
      { state: 'unchecked', note: 'Not yet searched.' },
    ]),
  );

// A transcribed promise, with no verdict. The four checks are present so the
// card can be copied and filed, but every one of them says it has not been run.
const queued = ({
  id,
  promise,
  sector,
  page,
  pdfPage,
  sourceChapter,
  department,
  reading,
}) => ({
  id,
  promise,
  sector,
  page,
  pdfPage,
  sourceChapter,
  department,
  status: 'queued',
  reading:
    reading ||
    `Transcribed from page ${page}. It has not yet been checked against a dated order, a dedicated budget line or an operational record.`,
  checks: uncheckedChecks(),
  evidence: [
    ['2022', `BJP Gujarat 2022 manifesto, p. ${page}`, manifestoPageUrl(pdfPage)],
  ],
});

export const promises = [
  // ---------- checked against the public record ----------
  {
    id: 'pmjay-cap',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 56,
    pdfPage: 58,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Double the annual cap under the Pradhan Mantri Jan Arogya Yojana (Ayushman Bharat) from ₹5 lakh to ₹10 lakh per family and ensure free-of-cost medical treatment.',
    status: 'partial',
    reading:
      'The national scheme still covers ₹5 lakh per family. A separate ₹5 lakh top-up for senior citizens aged 70 and above began in 2024, but the manifesto promised a doubling for every family, and no Gujarat order does that.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 56.' },
      order: {
        state: 'partial',
        note: 'The 2024 Union decision gives a separate ₹5 lakh top-up to senior citizens aged 70 and above; no Gujarat order doubles the cap for every family.',
      },
      budget: {
        state: 'missing',
        note: 'No Gujarat budget line for a universal doubling was found.',
      },
      output: {
        state: 'partial',
        note: 'The national cover remains ₹5 lakh per family; the 70+ top-up is a separate cover, not a doubling.',
      },
    },
    evidence: [
      ['22 Sep 2026', 'PIB: PM-JAY provides ₹5 lakh annual cover per family', 'https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=160081&ModuleId=3&reg=3&lang=1'],
      ['2024', 'National Portal of India: additional ₹5 lakh top-up for senior citizens aged 70 and above', 'https://www.india.gov.in/spotlight/details/ayushman-bharat-pradhan-mantri-jan-arogya-yojana'],
    ],
  },
  {
    id: 'recruitment-board',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Set up a Health Recruitment Board to recruit doctors and nurses, on the lines of the Police Recruitment Board.',
    status: 'announced',
    reading:
      'A state reforms commission recommended a Medical Services Recruitment Board in December 2025. Recruitment still runs through the Health Department and GPSC. A recommendation is on record; the board itself is not verified.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 57.' },
      order: {
        state: 'missing',
        note: 'No order constitutes the board. A reforms commission recommended it in December 2025.',
      },
      budget: {
        state: 'missing',
        note: 'No separate allocation for a recruitment board was found.',
      },
      output: {
        state: 'missing',
        note: 'Recruitment still runs through GPSC and the Health Department.',
      },
    },
    evidence: [
      ['3 Dec 2025', 'Gujarat CMO: Administrative Reforms Commission recommends a Medical Services Recruitment Board', 'https://cmogujarat.gov.in/en/latest-news/garc-6th-report-recruitment-reforms-cm'],
      ['10 Dec 2025', 'The Secretariat: government signals the board, order expected', 'https://thesecretariat.in/article/gujarat-signals-major-hr-reform-with-medical-recruitment-board'],
    ],
  },
  {
    id: 'health-stack',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Become the first state to launch a Health Stack with a unique Health ID: one-stop appointment booking, medical history and diagnostic reports.',
    status: 'partial',
    reading:
      'Digital IDs exist at scale: 4.23 crore ABHA numbers for Gujarat by January 2024, and about 5.25 crore by mid 2026. But those are national ABDM accounts. We could not verify a Gujarat-specific Health Stack with the full promised one-stop service.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 58.' },
      order: {
        state: 'missing',
        note: 'No Gujarat-specific order or scheme document for the stack was found.',
      },
      budget: {
        state: 'missing',
        note: 'No state budget line for a Gujarat health stack was found.',
      },
      output: {
        state: 'partial',
        note: '4.23 crore ABHA IDs by January 2024 and about 5.25 crore by mid 2026, but under the national ABDM, not a Gujarat stack.',
      },
    },
    evidence: [
      ['6 Feb 2024', 'PIB: 4,22,51,129 ABHA numbers for Gujarat as of 24 Jan 2024', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068'],
      ['31 Jul 2026', 'Lok Sabha answer indexing 5.25 crore ABHAs in Gujarat', 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AS290_mDyURC.pdf?source=lsapps'],
      ['live', 'National ABDM portal and public dashboard', 'https://dashboard.abdm.gov.in/abdm/'],
    ],
  },
  {
    id: 'tb-free',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Make Gujarat TB-free by 2025, and provide ₹1,000 monthly assistance to TB patients.',
    status: 'partial',
    reading:
      'Gujarat notified 1,33,898 TB patients in 2023 and 1,29,465 in 2024, so the 2025 target was not met on the record. No Gujarat-specific ₹1,000 monthly payment was found; the national Ni-kshay nutrition support is a separate programme.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 58.' },
      order: {
        state: 'missing',
        note: 'No Gujarat order for a ₹1,000 monthly payment was found.',
      },
      budget: {
        state: 'missing',
        note: 'No Gujarat budget line for the payment was found.',
      },
      output: {
        state: 'partial',
        note: '1,33,898 patients notified in 2023 and 1,29,465 in 2024; 1,22,604 were treated successfully in 2023.',
      },
    },
    evidence: [
      ['1 Apr 2025', 'Rajya Sabha USQ 3467, Annexure I: state-wise TB patients notified and treated, 2023 and 2024', 'https://sansad.in/getFile/annex/267/AU3467_mVGJLD.pdf?source=pqars'],
      ['2024', 'Central TB Division: India TB Report 2024', 'https://tbcindia.mohfw.gov.in/annual-reports/'],
    ],
  },
  {
    id: 'institutional-deliveries',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 40,
    pdfPage: 42,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise: 'Ensure 100% institutional deliveries in the state.',
    status: 'partial',
    reading:
      'NFHS-5 (2019-21) recorded 94% of births in a health facility, up from 89% in NFHS-4. The promise was 100%, and the last published official survey does not reach it.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 40.' },
      order: {
        state: 'missing',
        note: 'No dated order or scheme document sets a 100% target with a delivery plan.',
      },
      budget: {
        state: 'missing',
        note: 'No dedicated budget line for reaching 100% was found.',
      },
      output: {
        state: 'partial',
        note: '94% of births in a health facility in NFHS-5, up from 89% in NFHS-4.',
      },
    },
    evidence: [
      ['2019-21', 'NFHS-5 Gujarat report: 94% of births in a health facility', 'https://dhsprogram.com/pubs/pdf/FR374/FR374_Gujarat.pdf'],
      ['2019-21', 'NFHS-5 Gujarat state fact sheet: institutional births indicator', 'https://rchiips.org/nfhs/NFHS-5_FCTS/Gujarat.pdf'],
    ],
  },
  {
    id: 'dhanwantari-fund',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Launch the Dhanwantari Preventive Healthcare Fund for public Yoga centres, herbal gardens and a preventive health ecosystem.',
    status: 'none',
    reading:
      'No public confirmation of a fund under that name, and no allocation tied to it. Gujarat spends broadly on health (₹15,141 crore budgeted for 2023-24), but broad spending is not this promise. Separate medicinal-plant schemes exist; they are not the fund.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 59.' },
      order: {
        state: 'missing',
        note: 'No order creates a fund under this name.',
      },
      budget: {
        state: 'missing',
        note: 'The ₹15,141 crore is the whole Health and Family Welfare budget, not a line for this fund.',
      },
      output: {
        state: 'missing',
        note: 'Medicinal-plant schemes exist separately; no preventive health fund is on record.',
      },
    },
    evidence: [
      ['2023-24', 'PRS Gujarat budget analysis: ₹15,141 crore Health and Family Welfare', 'https://prsindia.org/budgets/states/gujarat-budget-analysis-2023-24'],
      ['n/a', 'Gujarat Medicinal Plants Board promotional scheme (separate activity)', 'https://gmpb.gujarat.gov.in/Content/promotional-scheme-137'],
    ],
  },
  {
    id: 'genetics-centre',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Establish a Centre for Genetics and Health in Ahmedabad for genetic diseases, and a hub for prenatal genetic screening.',
    status: 'none',
    reading:
      'No announcement or inauguration of the promised centre. Related genetics work exists: a tribal genome project run by the state biotech centre in 2025, and older prenatal diagnosis work at a private institute. Neither is the promised centre.',
    checks: {
      manifesto: { state: 'found', note: 'Quoted from printed page 59.' },
      order: {
        state: 'missing',
        note: 'No sanction, foundation stone or inauguration of the centre was found.',
      },
      budget: {
        state: 'missing',
        note: 'No allocation tied to the centre was found.',
      },
      output: {
        state: 'missing',
        note: 'A tribal genome project and a private prenatal study exist; neither is the promised centre.',
      },
    },
    evidence: [
      ['8 Nov 2025', 'ETHealthworld: tribal-focused genome sequencing project approved FY 2025-26', 'https://health.economictimes.indiatimes.com/news/policy/gujarat-becomes-first-state-in-india-to-launch-tribal-focused-genome-sequencing-project/125186373'],
      ['14 Sep 2025', 'Indian Express: prenatal genetic diagnosis study at FRIGE, covering 2008-2022', 'https://indianexpress.com/article/cities/ahmedabad/prenatal-diagnosis-foetuses-genetic-anomalies-10248997/'],
    ],
  },

  // ---------- transcribed, waiting for the four checks ----------
  queued({
    id: 'jan-aushadhi',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 56,
    pdfPage: 58,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Ensure the availability of quality medicines at subsidised rates by expanding the network of Pradhan Mantri Jan Aushadhi Kendras from 500 to 1,000 in towns and cities to bring down out-of-pocket expenditure.',
  }),
  queued({
    id: 'free-diagnostics',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 56,
    pdfPage: 58,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Launch the Mukhyamantri Free Diagnostic Scheme with a corpus of ₹110 crore to provide free-of-cost diagnostic services in all government health institutions and empanelled laboratories for EWS households.',
  }),
  queued({
    id: 'aiims-institutes',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 56,
    pdfPage: 58,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Set up 2 more AIIMS-grade institutes.',
  }),
  queued({
    id: 'medicities',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 56,
    pdfPage: 58,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Set up 3 world-class Medicities with facilities like Air Ambulance and Tele-Surgery, focusing on creating dedicated state-of-the-art Centres of Excellence for Cardiology, Neurology and Oncology.',
  }),
  queued({
    id: 'hospital-upgrade',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Build new and upgrade infrastructure of existing healthcare facilities (Hospitals, CHCs and PHCs).',
  }),
  queued({
    id: 'cancer-care',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Launch the Gujarat Cancer Care Programme by establishing accessible Cancer Care Centres in every district in a phased manner.',
  }),
  queued({
    id: 'medical-college-district',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Ensure that one medical college with an attached multispeciality government hospital is there in every district.',
  }),
  queued({
    id: 'medical-seats',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Incorporate a 30% increase in the capacity of medical seats in the state.',
  }),
  queued({
    id: 'midlevel-skills',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Pay special attention to the skill development of mid-level service providers such as nurse practitioners and public health personnel.',
  }),
  queued({
    id: 'mental-health',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 57,
    pdfPage: 59,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Strengthen the Gujarat State Mental Health Authority by taking focused measures to provide quality mental health services to citizens.',
  }),
  queued({
    id: 'als-mmus',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Set up 5 additional Advanced Life-Saving (ALS) Mobile Medical Units in each district to provide quality health services and doorstep distribution of medicine in rural, remote and tribal areas.',
  }),
  queued({
    id: 'air-ambulance',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Connect major medical clusters of Gujarat with a robust network of Air Ambulance services to reduce travel time during medical emergencies.',
  }),
  queued({
    id: 'suposhit-gujarat',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Launch the Suposhit Gujarat Sashakt Gujarat Mission to improve nutritional security for all.',
  }),
  queued({
    id: 'palliative-units',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Dedicate ₹185 crore to establish special units in government hospitals at the district level for the treatment and rehabilitation of patients suffering from palliative illnesses like dementia, neurological diseases, congenital anomalies, etc.',
  }),
  queued({
    id: 'tele-desks',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Set up 1,000 Tele Desks to provide basic diagnosis and prescription.',
  }),
  queued({
    id: 'doorstep-medicine',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Ensure easy access to medicine at the doorstep in rural areas.',
  }),
  queued({
    id: 'first-responders',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 58,
    pdfPage: 60,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Set up a volunteer task force of first responders in a phased manner to provide immediate medical services during accidents.',
  }),
  queued({
    id: 'ayush-hub',
    sector: 'health',
    department: AYUSH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Make Gujarat the AYUSH Hub of India and establish 4 state-of-the-art Institute of Traditional Medicine with the Global Centre for Traditional Medicine, Jamnagar being the central node.',
  }),
  queued({
    id: 'ayurveda-manufacturing',
    sector: 'health',
    department: AYUSH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Promote the manufacturing of Ayurveda medicines.',
  }),
  queued({
    id: 'ayurveda-startups',
    sector: 'health',
    department: AYUSH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Promote Ayurveda Vigyan startups.',
  }),
  queued({
    id: 'ayurveda-rnd',
    sector: 'health',
    department: AYUSH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise: 'Establish Ayurveda Research and Development centres across all major cities.',
  }),
  queued({
    id: 'vaccination',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 59,
    pdfPage: 61,
    sourceChapter: 'Agresar Health chapter',
    promise:
      'Ensure 100% coverage of vaccinations against preventive illnesses like Tuberculosis, Measles, and Hepatitis B on a priority basis.',
  }),
  queued({
    id: 'geriatric-units',
    sector: 'health',
    department: HEALTH_DEPARTMENT,
    page: 64,
    pdfPage: 66,
    sourceChapter: 'Samras Vikaas chapter, Welfare and Development of the Elderly',
    promise:
      'Create a corpus of ₹160 crore and establish separate Geriatric Specialisation Units at every district hospital in the state.',
  }),
  queued({
    id: 'stree-vandana',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 40,
    pdfPage: 42,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Establish 6 Stree Vandana Super Speciality Centres specialising in Gynaecology and Obstetrics.',
  }),
  queued({
    id: 'nand-gopal',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Establish the Nand Gopal Wards constituting neonatal intensive care units in every government hospital in the state.',
  }),
  queued({
    id: 'maa-shishu',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Launch the Maa-Shishu Arogya Yojana to ensure every mother and child undergoes comprehensive health screening post-delivery, to rule out any congenital or long-term complications.',
  }),
  queued({
    id: 'maternity-ambulances',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise: 'Expand a fleet of 200 dedicated ambulances for pregnant women.',
  }),
  queued({
    id: 'suposhit-mata',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Continue providing free-of-cost monthly supplements for proteins, fats and micronutrients to all poor and pregnant EWS women and lactating mothers for 1,000 days under the Suposhit Mata Swasth Bal Yojana.',
  }),
  queued({
    id: 'sanitary-napkins',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Provide free-of-cost sanitary napkins to all female students and set up 25,000 subsidised sanitary napkin vending machines in every community and public toilet across Gujarat.',
  }),
  queued({
    id: 'minal-devi',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Launch a ₹100 crore Minal Devi Mission to modernise Anganwadi Centres in Gujarat as per the guidelines of the Saksham Anganwadi project.',
  }),
  queued({
    id: 'anaemia-mission',
    sector: 'child',
    department: WCD_DEPARTMENT,
    page: 41,
    pdfPage: 43,
    sourceChapter: 'Agresar Women chapter, Providing World-Class Health Services to Women and Children',
    promise:
      'Initiate the Gujarat Anaemia Eradication Mission to conduct mass screening of anaemic children and women and provide them with regular treatment and supplements.',
  }),
];

export const promiseSources = [
  'BJP Gujarat 2022 manifesto, Agresar Health, Women and Samras Vikaas chapters (promise text and page numbers)',
  'PIB, National Portal of India, Rajya Sabha answers, NFHS-5, PRS budget analyses (delivery evidence)',
];

// Context figures from the THS research corpus. Two have a published page to
// read; the third is listed without a link rather than pointed at a page that
// does not hold it.
export const corpusFacts = [
  {
    n: '26%',
    text: 'of the 160 commitments in the Gujarat 2022 manifesto sat in health and women and child development',
    href: '#/research/promise-scorecards',
    link: 'Read the working paper',
  },
  {
    n: '214',
    text: 'parliamentary questions analysed across 24 files to read what gets asked against what gets answered',
    href: '#/research/parliament-questions',
    link: 'Read the essay',
  },
  {
    n: '2018-2023',
    text: 'the window of MPLAD misappropriation cases compiled state by state in Issue Brief 13, which is not held in this repository',
  },
];
