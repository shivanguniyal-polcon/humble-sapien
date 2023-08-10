// THS escalation directory: who to reach when delivery fails, per touchpoint.
// Every contact carries a verification flag: true = found on an official page
// during THS research; false = found in secondary/older material: confirm
// before relying. Source URLs included for re-checking.

export const escalation = {
  pmjay: [
    {
      touchpoint: '1. Eligibility identification',
      steps: [
        {
          level: 'First stop',
          office: 'PM-JAY / Ayushman Mitra helpdesk at any empanelled hospital',
          authority: 'Hospital PM-JAY nodal officer',
          reach: 'In person at the hospital helpdesk',
          note: 'Ask for your eligibility status and the written reason for any rejection.',
          verified: true,
          source: 'support.pmjay.gov.in',
        },
        {
          level: 'Escalate',
          office: 'Common Service Centre (CSC) assistance',
          authority: 'CSC support desk (card creation and technical help)',
          reach: '1800 3000 3468 · ayushmanbharat.csc@gmail.com',
          note: 'CSC handles card-creation and technical assistance, not claim grievances.',
          verified: true,
          source: 'support.pmjay.gov.in',
        },
        {
          level: 'Formal grievance',
          office: 'Central Grievance Redressal Management System (CGRMS)',
          authority: 'Grievance portal: issues a Unique Grievance Number (UGN)',
          reach: 'cgrms.pmjay.gov.in · helpline 14555 / 1800 111 565',
          note: 'Save the UGN; it is the reference for every follow-up.',
          verified: true,
          source: 'cgrms.pmjay.gov.in',
        },
      ],
    },
    {
      touchpoint: '2. Card creation & enrolment',
      steps: [
        {
          level: 'First stop',
          office: 'CSC / Jan Aushadhi or empanelled hospital enrolment desk',
          authority: 'Enrolment operator',
          reach: '1800 3000 3468 · ayushmanbharat.csc@gmail.com',
          note: 'Carry Aadhaar and ration/SECC references.',
          verified: true,
          source: 'support.pmjay.gov.in',
        },
        {
          level: 'Escalate',
          office: 'State Health Agency (SHA): e.g. Gujarat PMJAY-MA',
          authority: 'Project Director / CEO (PMJAY)',
          reach: 'Gujarat: 1800 233 1022 · cohealth@gujarat.gov.in · Grievance Manager: GRIEVMAN1-PMJAY-GNR@GUJARAT.GOV.IN',
          note: 'Each state runs its own SHA; ask 14555 for your state grievance nodal officer.',
          verified: true,
          source: 'ma.gujarat.gov.in/Contact%20SNC%20Officials.html',
        },
      ],
    },
    {
      touchpoint: '3. Hospital empanelment & access',
      steps: [
        {
          level: 'First stop',
          office: 'District Nodal Officer / District Health Officer',
          authority: 'District administration (empanelment and access gaps)',
          reach: 'Through the district health office or the SHA portal of your state',
          note: 'Report hospitals refusing PM-JAY patients with the date and ward.',
          verified: false,
          source: 'cgrms.pmjay.gov.in grievance guidelines (roles at district level)',
        },
        {
          level: 'Escalate',
          office: 'State Health Agency',
          authority: 'State Grievance Nodal Officer',
          reach: 'UP example: Swasthya Bhawan, Lucknow · support@dgmhup.in · 1800 180 5145 / 1800 180 5146',
          note: 'Ask for the empanelment desk if the gap is geographic access.',
          verified: true,
          source: 'dgmh.up.gov.in/en/Contactus',
        },
      ],
    },
    {
      touchpoint: '4. Admission & pre-authorisation',
      steps: [
        {
          level: 'First stop',
          office: 'Hospital PM-JAY helpdesk (Ayushman Mitra)',
          authority: 'Hospital nodal officer',
          reach: 'In person; request the pre-authorisation reference and a written denial reason',
          note: 'A denial must be recorded: insist on paper.',
          verified: true,
          source: 'support.pmjay.gov.in',
        },
        {
          level: 'Escalate',
          office: 'CGRMS + State Health Agency',
          authority: 'State Grievance Nodal Officer',
          reach: 'cgrms.pmjay.gov.in · 14555',
          note: 'Attach the pre-auth number and the written denial.',
          verified: true,
          source: 'cgrms.pmjay.gov.in',
        },
      ],
    },
    {
      touchpoint: '5. Claim settlement (hospital-side disputes)',
      steps: [
        {
          level: 'First stop',
          office: 'Empanelled hospital billing desk / state insurer or TPA claims desk',
          authority: 'Claims manager (arrangement varies by state)',
          reach: 'As printed on your state scheme or hospital paperwork',
          note: 'Keep receipts, claim numbers and every written response.',
          verified: false,
          source: 'State scheme paperwork (varies)',
        },
        {
          level: 'Formal grievance',
          office: 'CGRMS',
          authority: 'Grievance portal with UGN tracking',
          reach: 'cgrms.pmjay.gov.in · 14555 / 1800 111 565',
          note: 'File here in parallel with the insurer dispute.',
          verified: true,
          source: 'cgrms.pmjay.gov.in',
        },
      ],
    },
    {
      touchpoint: '6. Grievance redressal (if nothing else works)',
      steps: [
        {
          level: 'Top of the chain',
          office: 'National Health Authority (NHA)',
          authority: 'Chief Executive Officer, NHA: mark the envelope “PM-JAY grievance”',
          reach: 'Via CGRMS escalation or 14555 (NHA postal address: confirm on nha.gov.in before posting)',
          note: 'THS research could not verify a public NHA grievance email: use the portal trail.',
          verified: false,
          source: 'nha.gov.in (About NHA)',
        },
        {
          level: 'Parallel route',
          office: 'CPGRAMS: central public grievance portal',
          authority: 'Department of Health & Family Welfare / state authority',
          reach: 'pgportal.gov.in',
          note: 'Email grievances are not accepted on CPGRAMS; file online and track.',
          verified: true,
          source: 'pgportal.gov.in',
        },
      ],
    },
  ],
  sbm: [
    {
      touchpoint: '1. Toilet construction (rural)',
      steps: [
        {
          level: 'First stop',
          office: 'Gram Panchayat / Block office',
          authority: 'Gram Panchayat Secretary, then Block Development Officer (BDO)',
          reach: 'Block panchayat office; escalate to the District Panchayat CEO',
          note: 'Put the complaint in writing and keep the acknowledgement.',
          verified: true,
          source: 'swachhbharatmission.ddws.gov.in (SBM-G Phase-II guidelines)',
        },
        {
          level: 'Escalate',
          office: 'Office of Joint Secretary (Sanitation), Department of Drinking Water & Sanitation',
          authority: 'Joint Secretary & Mission Director, SBM-Gramin',
          reach: '4th Floor, Pt. Deendayal Antyodaya Bhawan, CGO Complex, Lodhi Road, New Delhi 110003 · js-sbm@gov.in · 011-24362192 (confirm current lines)',
          note: 'Postal address verified on the mission contact page; email/phone from older publications: re-check.',
          verified: false,
          source: 'swachhbharatmission.ddws.gov.in/contact-us',
        },
      ],
    },
    {
      touchpoint: '2. Use verification & behaviour (rural)',
      steps: [
        {
          level: 'First stop',
          office: 'Gram Panchayat / village Swachhagrahi',
          authority: 'GP convenor of the swachhata committee',
          reach: 'Village-level; record findings with photographs where safe',
          note: 'Use verification is a GP record: ask for the ODF status declaration.',
          verified: true,
          source: 'swachhbharatmission.ddws.gov.in',
        },
        {
          level: 'Formal grievance',
          office: 'CPGRAMS',
          authority: 'Rural development / state authority routing',
          reach: 'pgportal.gov.in',
          note: 'If the GP route stalls, CPGRAMS gives a tracked central route.',
          verified: true,
          source: 'pgportal.gov.in',
        },
      ],
    },
    {
      touchpoint: '3. Water & maintenance (urban)',
      steps: [
        {
          level: 'First stop',
          office: 'Ward office → Municipal Corporation complaint centre',
          authority: 'Ward officer, then the Municipal Commissioner’s grievance channel',
          reach: 'Ahmedabad example: CCRS 155303 · WhatsApp +91 75678 55303 · ccrs@ahmedabadcity.gov.in · Commissioner: mc@ahmedabadcity.gov.in · 079-25391811',
          note: 'AMC’s CCRS accepts complaints by phone, WhatsApp, email, SMS and at ward offices; escalates to the Deputy Commissioner.',
          verified: true,
          source: 'amccrs.apphost.in/AMCPortal',
        },
        {
          level: 'Escalate',
          office: 'SBM-Urban Mission, Ministry of Housing & Urban Affairs',
          authority: 'Mission Director, SBM-Urban / MoHUA Secretary',
          reach: 'Sankalp Bhawan, Pandit Ravi Shankar Shukla Lane, K.G. Marg, New Delhi 110001 · support@sbmurban.org · Swachhata helpline 1969 (confirm current status)',
          note: 'Address verified on the mission contact page; the email serves policy and data queries. For complaints, also file on CPGRAMS.',
          verified: false,
          source: 'sbmurban.org/contact-us',
        },
      ],
    },
    {
      touchpoint: '4. ODF sustainability & slippage',
      steps: [
        {
          level: 'First stop',
          office: 'Municipal Corporation / District Panchayat (as applicable)',
          authority: 'Municipal Commissioner or CEO, Zila Panchayat',
          reach: 'Delhi (MCD) example: 155305 · Dr. S.P.M. Civic Centre, Minto Road, New Delhi 110002 · mcd-ithelpdesk@mcd.nic.in',
          note: 'Report slippage with the declared ODF status date and current evidence.',
          verified: true,
          source: 'mcdonline.nic.in/portal/contactUs',
        },
        {
          level: 'Formal grievance',
          office: 'CPGRAMS: central public grievance portal',
          authority: 'Route to the relevant ministry/department or state authority',
          reach: 'pgportal.gov.in',
          note: 'Track the CPGRAMS number; appeal is available after closure in eligible cases.',
          verified: true,
          source: 'pgportal.gov.in',
        },
      ],
    },
  ],
};
