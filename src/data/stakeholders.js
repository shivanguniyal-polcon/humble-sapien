// Stakeholder maps, seeded from the policy atlas. Each record is a distributional
// reading of one policy: who is affected, in which direction, how strongly, and
// through what mechanism. Evidence notes point at public sources; the counters
// carry the strongest published objection so the map does not flatter anyone.

export const stakeholderPolicies = [
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    year: 2018,
    strap: 'Assurance-mode hospital cover of Rs 5 lakh for deprived families, purchased from public and empanelled private hospitals.',
    question: 'Who gains protection, who gains business, and who still pays out of pocket?',
    sources: [
      { label: 'National Health Authority scheme records', url: 'https://pmjay.gov.in/' },
      { label: 'National Health Accounts 2022-23 (MoHFW)', url: 'https://mohfw.gov.in/' },
    ],
    stakeholders: [
      {
        name: 'Eligible deprived households',
        role: 'Intended beneficiaries, identified through SECC deprivation lists',
        effect: 'benefits', magnitude: 5, power: 1,
        mechanism: 'Cashless hospitalisation up to Rs 5 lakh removes the financing step at the point of care.',
        evidence: 'Scheme records show tens of crore cards issued and crore-scale authorised admissions since 2018.',
        counter: 'Cover is hospitalisation-only: outpatient care and medicines, the larger share of out-of-pocket spend, stay outside the package.',
      },
      {
        name: 'Empanelled private hospitals',
        role: 'Supply side, majority of authorised admissions',
        effect: 'benefits', magnitude: 4, power: 4,
        mechanism: 'Publicly financed demand arrives at fixed package rates, filling beds in low-occupancy districts.',
        evidence: 'Private facilities account for the majority of PM-JAY admissions in most state dashboards.',
        counter: 'Package rates and claim settlement delays push hospitals in several states to exit empanelment.',
      },
      {
        name: 'Public hospitals',
        role: 'Supply side, competing at the same package rates',
        effect: 'mixed', magnitude: 3, power: 3,
        mechanism: 'Follow-up demand rises, but the money flows through claims that public facilities are slower to file.',
        evidence: 'Public facilities carry a minority of admissions despite being the first point of contact.',
        counter: 'Where state governments top up rates for public facilities, the gap narrows.',
      },
      {
        name: 'State governments',
        role: 'Co-financier and scheme operator (60:40 cost share with the Centre)',
        effect: 'mixed', magnitude: 3, power: 5,
        mechanism: 'They own implementation, empanelment and grievance design, and carry part of the fiscal risk.',
        evidence: 'Several states run their own overlays on PM-JAY, which is where design variation lives.',
        counter: 'Fiscally weaker states bear costs that grow faster than their health budgets.',
      },
      {
        name: 'Households just above the eligibility line',
        role: 'The excluded near-poor',
        effect: 'restricted', magnitude: 3, power: 1,
        mechanism: 'Eligibility is a static deprivation list, so families that miss it pay entirely out of pocket.',
        evidence: 'Out-of-pocket expenditure as a share of total health spending has fallen but remains large (NHA 2022-23).',
        counter: 'Some states extend cover beyond the central list.',
      },
      {
        name: 'Sanitation and support staff in hospitals',
        role: 'The workforce behind the admissions surge',
        effect: 'mixed', magnitude: 2, power: 1,
        mechanism: 'Higher patient volumes mean more work, with wage and contract conditions set outside the scheme.',
        evidence: 'Contractualisation of hospital support work is documented across state health systems.',
        counter: 'Employment itself expands where admissions grow.',
      },
      {
        name: 'Claims intermediaries and health-tech vendors',
        role: 'Transaction layer: authorisation, claims, fraud control',
        effect: 'benefits', magnitude: 3, power: 3,
        mechanism: 'Every admission generates a claims workflow that the scheme standardises and buys.',
        evidence: 'NHA runs a national claims platform with contracted service providers.',
        counter: 'Fraud-control tightening shrinks margins for weaker operators.',
      },
      {
        name: 'District administration',
        role: 'Grievance redressal and verification on the ground',
        effect: 'mixed', magnitude: 2, power: 2,
        mechanism: 'Complaint volume and empanelment policing land on the district without matching staff.',
        evidence: 'Grievance statistics are published on the PM-JAY portal.',
        counter: 'Digital workflows keep some of the load off the district.',
      },
    ],
  },
  {
    id: 'sbm',
    name: 'Swachh Bharat Mission',
    year: 2014,
    strap: 'The largest toilet-building programme in history, with ODF declarations as its success metric.',
    question: 'Construction is the easy part. Who carries the cost of use, upkeep and cleaning?',
    sources: [
      { label: 'Ministry of Jal Shakti, SBM records', url: 'https://swachhbharatmission.gov.in/' },
      { label: 'Prohibition of Employment as Manual Scavengers Act, 2013', url: 'https://legislative.gov.in/' },
    ],
    stakeholders: [
      {
        name: 'Rural households receiving toilets',
        role: 'Beneficiaries of the construction subsidy',
        effect: 'benefits', magnitude: 4, power: 1,
        mechanism: 'A household asset is built with public money, reducing open defecation where use holds.',
        evidence: 'Independent survey rounds (NFHS) record large gains in household toilet access after 2014.',
        counter: 'Access is not use: water supply and maintenance decide whether the toilet stays functional.',
      },
      {
        name: 'Women and girls',
        role: 'Primary users whose safety case drove the mission',
        effect: 'benefits', magnitude: 4, power: 1,
        mechanism: 'Toilets reduce night-time exposure, one of the stated design motivations.',
        evidence: 'NFHS records large gains in women reporting access to a household toilet.',
        counter: 'Where water is scarce the safety benefit does not arrive.',
      },
      {
        name: 'Sanitation workers',
        role: 'The workforce that empties and cleans what is built',
        effect: 'restricted', magnitude: 5, power: 1,
        mechanism: 'The mission funded construction far more than mechanisation, leaving hazardous cleaning work in place.',
        evidence: 'Manual scavenging deaths continue to be recorded annually despite the 2013 Act banning the practice.',
        counter: 'Some municipal programmes fund mechanised cleaning equipment under SBM 2.0.',
      },
      {
        name: 'Local contractors and masons',
        role: 'Build side of the subsidy pipeline',
        effect: 'benefits', magnitude: 3, power: 2,
        mechanism: 'Construction demand at scale, paid from state and central transfers.',
        evidence: 'SBM expenditure records show construction as the dominant head.',
        counter: 'Payment delays and quality-linked withholdings are widely reported.',
      },
      {
        name: 'Urban local bodies',
        role: 'ODF declaration and maintenance owner',
        effect: 'mixed', magnitude: 3, power: 3,
        mechanism: 'Declarations earn recognition; sludge management then becomes an unfunded municipal duty.',
        evidence: 'ODF and ODF-plus certification records are published by the ministry.',
        counter: 'SBM 2.0 adds a waste-processing component that partly addresses the gap.',
      },
      {
        name: 'Panchayats',
        role: 'Beneficiary selection and verification',
        effect: 'mixed', magnitude: 2, power: 3,
        mechanism: 'They hold the list power: who gets counted, who gets a second unit, who is marked compliant.',
        evidence: 'SBM reporting runs through gram panchayat records.',
        counter: 'Social audits exist on paper in several states.',
      },
      {
        name: 'State governments',
        role: 'Implementer and certification claimant',
        effect: 'benefits', magnitude: 3, power: 5,
        mechanism: 'ODF declarations are a visible performance record tied to central recognition.',
        evidence: 'State ODF declarations preceded independent verification findings in several states.',
        counter: 'Sustainability audits that revisit ODF status expose the gap between declaration and use.',
      },
    ],
  },
  {
    id: 'dpdp',
    name: 'Digital Personal Data Protection Act',
    year: 2023,
    strap: 'India first comprehensive data protection statute: consent, obligations, penalties, and wide state exemptions.',
    question: 'A privacy statute redistributes power over information. From whom, to whom?',
    sources: [
      { label: 'Digital Personal Data Protection Act, 2023', url: 'https://www.meity.gov.in/' },
      { label: 'RTI Act, Section 8(1)(j) as amended', url: 'https://rtionline.gov.in/' },
    ],
    stakeholders: [
      {
        name: 'Data principals (citizens and users)',
        role: 'Whose personal data the statute governs',
        effect: 'mixed', magnitude: 4, power: 1,
        mechanism: 'Consent, notice and grievance rights arrive, enforceable against companies.',
        evidence: 'The Act creates duties on data fiduciaries with penalties up to Rs 250 crore.',
        counter: 'Broad state exemptions for security and public order sit outside the consent framework.',
      },
      {
        name: 'Data fiduciaries (companies)',
        role: 'Firms processing personal data at scale',
        effect: 'mixed', magnitude: 3, power: 4,
        mechanism: 'Compliance costs rise, but a single national statute replaces the litigation-by-case-law regime.',
        evidence: 'Significant data fiduciaries face additional obligations notified by the Centre.',
        counter: 'Penalty exposure is real and named in the statute.',
      },
      {
        name: 'Central government',
        role: 'Rule-maker and appointing authority for the Data Protection Board',
        effect: 'benefits', magnitude: 3, power: 5,
        mechanism: 'Executive rules decide exemptions, thresholds and the Board composition.',
        evidence: 'Multiple sections of the Act delegate design details to executive notification.',
        counter: 'Rule-making remains subject to parliamentary procedures.',
      },
      {
        name: 'Security and law-enforcement agencies',
        role: 'Exempted processors',
        effect: 'benefits', magnitude: 4, power: 4,
        mechanism: 'Processing for security of the state and prevention of offences is carved out of core obligations.',
        evidence: 'The exemption sections of the Act, read with the grounds in Article 19(2).',
        counter: 'Exemptions are conditioned on procedure, proportionality and legality.',
      },
      {
        name: 'Citizens using RTI',
        role: 'Seekers of official records',
        effect: 'restricted', magnitude: 4, power: 1,
        mechanism: 'The Act narrowed the personal-information exemption under RTI Section 8(1)(j), making disclosure harder to claim.',
        evidence: 'Amendment to the RTI Act carried in the DPDP statute.',
        counter: 'Public-interest disclosure arguments survive in part.',
      },
      {
        name: 'Children and parents',
        role: 'A specially protected class under the statute',
        effect: 'mixed', magnitude: 3, power: 1,
        mechanism: 'Verifiable parental consent and limits on tracking and targeted advertising to children.',
        evidence: 'The Act sets duties specific to processing children data.',
        counter: 'Age-gating duties push platforms toward data collection, the opposite of the privacy goal.',
      },
      {
        name: 'Startups and small firms',
        role: 'Low-scale fiduciaries',
        effect: 'mixed', magnitude: 2, power: 2,
        mechanism: 'Compliance burden applies, with exemptions for notified categories of fiduciaries.',
        evidence: 'The Act provides for differential treatment by notification.',
        counter: 'Exemptions can be withdrawn by notification at any time.',
      },
      {
        name: 'Independent researchers and journalists',
        role: 'Users of personal data for public-interest work',
        effect: 'restricted', magnitude: 3, power: 2,
        mechanism: 'Consent obligations reach research uses that the old regime treated as public interest.',
        evidence: 'No general research exemption comparable to the EU regime appears in the Act.',
        counter: 'State notifications can carve out research categories.',
      },
    ],
  },
];

// Direction coding used by the ledger and the matrix.
export const effectLabels = {
  benefits: 'Benefits',
  mixed: 'Mixed',
  restricted: 'Restricted',
  neutral: 'Neutral',
};

export function effectScore(effect, magnitude) {
  if (effect === 'benefits') return magnitude;
  if (effect === 'restricted') return -magnitude;
  return 0;
}
