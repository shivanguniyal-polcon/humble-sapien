// THS: policy touchpoint maps.
// Each policy is broken into its citizen-facing touchpoints, with what to
// measure at each one and the evidence available so far.

export const policies = [
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    strap: 'National health assurance: touchpoints from eligibility to grievance redressal',
    touchpoints: [
      {
        name: '1. Eligibility identification',
        what: 'Whether the intended households know they are eligible and can prove it.',
        evidence:
          'Eligibility is drawn from SECC deprivation criteria with Aadhaar verification; the eligible pool is roughly 50 crore people, but awareness of entitlement lags registration.',
      },
      {
        name: '2. Card creation & enrolment',
        what: 'Whether eligible people actually hold a live card.',
        evidence:
          'Cards grew from 10.39 crore (Sep 2019) to 40.45 crore (Mar 2025), yet modelling of the same series shows steady card churn: coverage and active coverage are not the same number.',
      },
      {
        name: '3. Hospital empanelment',
        what: 'Whether a cardholder can reach an empanelled hospital.',
        evidence:
          'Empanelled hospitals rose from 18,236 (2018) to 31,005 (Mar 2025); the growth curve saturates well before universal geographic access, so distance remains a live gap.',
      },
      {
        name: '4. Admission & pre-authorisation',
        what: 'Whether care at the hospital is actually authorised and delivered.',
        evidence:
          'Authorised admissions reached 9.19 crore cumulative by Mar 2025; utilisation runs near 8 per cent of cardholders a year: admission growth tracks enrolment, not rising use per card.',
      },
      {
        name: '5. Claim settlement',
        what: 'Whether hospitals are paid, on time and in full.',
        evidence:
          'Treatment value grew from ₹37,606 crore (Mar 2022) to ₹1,29,386 crore (Mar 2025); average claim size rose from about ₹10,200 to about ₹14,000 as the case mix shifted.',
      },
      {
        name: '6. Grievance redressal',
        what: 'Whether the citizen has anywhere to go when the chain fails.',
        evidence:
          'The least-evidenced touchpoint in the data: scenario modelling finds fraud control is the highest-value lever available, which makes grievance and audit data the sharpest missing evidence.',
      },
    ],
  },
  {
    id: 'sbm',
    name: 'Swachh Bharat Mission',
    strap: 'Sanitation: the touchpoints between reported coverage and verified use',
    touchpoints: [
      {
        name: '1. Toilet construction',
        what: 'Whether the toilet was built to standard.',
        evidence:
          'The best-documented touchpoint in every reporting system: and the only one where counts and reality routinely agree.',
      },
      {
        name: '2. Use verification',
        what: 'Whether the household actually uses what was built.',
        evidence:
          'Ward-level field checks for the Ahmedabad Municipal Corporation found the decisive gap: reported counts and verified use diverge. Measurement of use, not construction, separated reported success from real success.',
      },
      {
        name: '3. Water & maintenance',
        what: 'Whether the facility has water and stays usable.',
        evidence:
          'Site condition and water availability are the two checks that predict sustained use; both are under-recorded in summary dashboards.',
      },
      {
        name: '4. ODF sustainability',
        what: 'Whether open-defecation-free status holds after the campaign phase.',
        evidence:
          'Slippage concentrates where verification stopped at declaration; the local fix is continuous, community-level verification rather than one-time surveys.',
      },
    ],
  },
];
