// The State's Output, 1947–2026 — curated series behind the landing timeline.
//
// The timeline asks one question: how much paper does the state produce, and
// how fast is it growing? The named instruments (every Act, ordinance, rule
// and notification the timeline plots as a dot) live in
// stateOutputInstruments.js, generated from the India Code catalogue by
// scripts/build-state-output.mjs. This file holds what a crawl cannot know:
// the constitutional amendments, the RTI series, the milestone figures, and
// the scope and source for every one of them.
//
// Rule of the house: a number without a scope and a date is a rumour.

// Five of the six kinds are rows in stateOutputInstruments.js (kind index
// 0–4, in this order). The sixth — constitutional amendments — lives in
// AMENDMENTS below because its source is a published list, not the crawl.
// `shade` is the terracotta step each kind takes in the chart's palette.
export const KINDS = [
  {
    id: 'act',
    label: 'Acts',
    shade: 'clay-500',
    what: 'A law enacted by Parliament or a State Legislature, as catalogued by India Code.',
  },
  {
    id: 'amending-act',
    label: 'Amending acts',
    shade: 'clay-600',
    what: 'A law that amends another law. India Code catalogues these apart from the Acts they amend — the churn, counted separately.',
  },
  {
    id: 'ordinance',
    label: 'Ordinances',
    shade: 'clay-700',
    what: 'Law made by the President or a Governor while the legislature is not in session.',
  },
  {
    id: 'rule',
    label: 'Rules',
    shade: 'clay-800',
    what: 'Subordinate legislation: rules and regulations framed under an Act.',
  },
  {
    id: 'notification',
    label: 'Notifications',
    shade: 'clay-900',
    what: 'Executive orders, exemptions and rate changes published in the Gazette.',
  },
  {
    id: 'constitutional-amendment',
    label: 'Constitution amendment Acts',
    shade: 'clay-400',
    what: 'Changes to the Constitution itself, counted by the date each amendment came into force.',
  },
];

export const JURIS = [
  { id: 'central', label: 'Central' },
  { id: 'state', label: 'States and Union Territories' },
];

// The 106 Constitution amendment Acts, numbered, with the date each came
// into force. Source: the Legislative Department's Constitution documents,
// cross-checked against the Wikipedia list of amendments (all 106 rows,
// October 2026). Counted by enforcement date; the Act year and the
// enforcement year differ for a handful of amendments (the 104th, for one).
export const AMENDMENTS = [
  [1, '1951-06-18'],
  [2, '1953-05-01'],
  [3, '1955-02-22'],
  [4, '1955-04-27'],
  [5, '1955-12-24'],
  [6, '1956-09-11'],
  [7, '1956-11-01'],
  [8, '1960-01-05'],
  [9, '1960-12-28'],
  [10, '1961-08-11'],
  [11, '1961-12-19'],
  [12, '1961-12-20'],
  [13, '1962-12-01'],
  [14, '1962-12-28'],
  [15, '1963-10-05'],
  [16, '1963-10-05'],
  [17, '1964-06-20'],
  [18, '1966-08-27'],
  [19, '1966-12-11'],
  [20, '1966-12-22'],
  [21, '1967-04-10'],
  [22, '1969-09-25'],
  [23, '1970-01-23'],
  [24, '1971-11-05'],
  [25, '1971-12-08'],
  [26, '1971-12-28'],
  [27, '1971-12-30'],
  [28, '1972-08-29'],
  [29, '1972-06-09'],
  [30, '1972-06-09'],
  [31, '1973-10-17'],
  [32, '1974-07-01'],
  [33, '1974-05-19'],
  [34, '1974-09-07'],
  [35, '1975-03-01'],
  [36, '1975-04-26'],
  [37, '1975-05-03'],
  [38, '1975-08-01'],
  [39, '1975-08-10'],
  [40, '1976-05-27'],
  [41, '1976-09-07'],
  [42, '1977-04-01'],
  [43, '1978-04-13'],
  [44, '1979-09-06'],
  [45, '1980-01-25'],
  [46, '1983-02-02'],
  [47, '1984-08-26'],
  [48, '1984-04-01'],
  [49, '1984-09-11'],
  [50, '1984-09-11'],
  [51, '1984-06-16'],
  [52, '1985-03-01'],
  [53, '1986-02-20'],
  [54, '1986-04-01'],
  [55, '1987-02-20'],
  [56, '1987-05-30'],
  [57, '1987-09-21'],
  [58, '1987-12-09'],
  [59, '1988-03-30'],
  [60, '1988-12-20'],
  [61, '1989-03-28'],
  [62, '1990-01-25'],
  [63, '1990-01-06'],
  [64, '1990-04-16'],
  [65, '1992-03-12'],
  [66, '1990-06-07'],
  [67, '1990-10-04'],
  [68, '1991-03-12'],
  [69, '1992-02-01'],
  [70, '1991-12-21'],
  [71, '1992-08-31'],
  [72, '1992-12-05'],
  [73, '1993-04-24'],
  [74, '1993-06-01'],
  [75, '1994-05-15'],
  [76, '1994-08-31'],
  [77, '1995-06-17'],
  [78, '1995-08-30'],
  [79, '2000-01-25'],
  [80, '2000-06-09'],
  [81, '2000-06-09'],
  [82, '2000-09-08'],
  [83, '2000-09-08'],
  [84, '2002-02-21'],
  [85, '2002-01-04'],
  [86, '2002-12-12'],
  [87, '2003-06-22'],
  [88, '2004-01-15'],
  [89, '2003-09-28'],
  [90, '2003-09-28'],
  [91, '2004-01-01'],
  [92, '2004-01-07'],
  [93, '2006-01-20'],
  [94, '2006-06-12'],
  [95, '2010-01-25'],
  [96, '2011-09-23'],
  [97, '2012-01-12'],
  [98, '2013-01-01'],
  [99, '2015-04-13'],
  [100, '2015-07-31'],
  [101, '2017-07-01'],
  [102, '2018-08-11'],
  [103, '2019-01-12'],
  [104, '2020-01-25'],
  [105, '2021-08-10'],
  [106, '2023-09-28'],
];

// RTI applications with the central government, by financial year. There is
// no single published series: these rows are compiled from CIC annual-report
// analyses (CHRI), press reports of CIC data, and two parliamentary figures
// the site already publishes. Rounded rows say so; years nobody has verified
// are absent, not zero. 2023-24 has a CIC report that this compilation has
// not extracted — the gap is real and stays visible.
export const RTI = [
  {
    fy: '2015-16',
    measure: 'received',
    received: 976000,
    rejected: null,
    scope: 'About 9.76 lakh received (rounded in the source); 6.62% of processed applications were rejected.',
    source: 'CHRI analysis of the CIC Annual Report 2015-16',
    url: 'https://www.humanrightsinitiative.org/blog/revelations-from-central-information-commissions-2016-annual-report.html',
  },
  {
    fy: '2016-17',
    measure: 'received',
    received: 917009,
    rejected: null,
    scope: 'Applications received by central public authorities; 6.59% rejected (the count is not given in the source).',
    source: 'NewsClick, reporting the CIC Annual Report 2016-17',
    url: 'https://www.newsclick.in/over-11-lakh-rti-applications-pending-says-cic-report',
  },
  {
    fy: '2017-18',
    measure: 'received',
    received: 1233000,
    rejected: 63206,
    scope: 'About 12.33 lakh received (rounded in the source); the rejection count is exact.',
    source: 'The Indian Express, reporting CIC data',
    url: 'https://indianexpress.com/article/india/highest-rti-applications-filed-2017-18-lowest-rejections-since-2005-cic-data/',
  },
  {
    fy: '2018-19',
    measure: 'received',
    received: 1370000,
    rejected: null,
    scope: 'About 13.70 lakh received (rounded in the source).',
    source: 'CHRI analysis of the CIC Annual Report 2018-19',
    url: 'http://www.humanrightsinitiative.org/blog/findings-from-a-preliminary-study-of-the-central-information-commissions-latest-annual-report.html',
  },
  {
    fy: '2019-20',
    measure: 'received',
    received: 1374000,
    rejected: null,
    scope: 'About 13.74 lakh including UT administrations (12.39 lakh excluding). The inclusion rule changes the figure; both are the source’s.',
    source: 'CHRI analysis of the CIC Annual Report 2019-20',
    url: 'http://www.humanrightsinitiative.org/blog/findings-from-a-preliminary-study-of-the-central-information-commissions-latest-annual-report.html',
  },
  {
    fy: '2020-21',
    measure: 'received',
    received: 1333000,
    rejected: null,
    scope: 'About 13.33 lakh received (rounded in the source).',
    source: 'CHRI analysis of the CIC Annual Report 2020-21',
    url: 'https://www.humanrightsinitiative.org/blog/rtis-to-goi-rose-by-655-during-the-2nd-year-of-the-pandemic-but-how-reliable-is-the-data-published-in-the-cics-202122-annual-report.html',
  },
  {
    fy: '2021-22',
    measure: 'received',
    received: 1421000,
    rejected: 55124,
    scope: 'About 14.21 lakh including UTs (12.86 lakh excluding). The CIC report states 53,733 rejections in one table and 55,124 in another; CHRI takes 55,124 as correct.',
    source: 'CHRI analysis of the CIC Annual Report 2021-22',
    url: 'https://www.humanrightsinitiative.org/blog/rtis-to-goi-rose-by-655-during-the-2nd-year-of-the-pandemic-but-how-reliable-is-the-data-published-in-the-cics-202122-annual-report.html',
  },
  {
    fy: '2022-23',
    measure: 'received',
    received: 1638784,
    rejected: 52662,
    scope: 'RTI applications filed with the central government; the rejection count is exact. The largest year on record.',
    source: 'Lok Sabha RTI statistics, 2022-23 (published with THS, “The rules exist. The reading does not.”)',
    url: null,
  },
  {
    fy: '2024-25',
    measure: 'replied',
    received: 1380509,
    rejected: 58501,
    scope: 'This figure counts replies by central public authorities, not receipts — a different measure from the rows above. The report elsewhere totals 57,985 exemption-wise rejections.',
    source: 'Parliamentary answer, 2024-25 (published with THS, “Government output at both levels”)',
    url: null,
  },
];

// Dated snapshots of the national open data platform's holdings. These are
// step points, not a curve: reports count resources and catalogs on
// different bases, and the 2024-25 figure is lower than the 2022-23 one.
// Interpolating between them would be a lie.
export const STEPS = [
  {
    date: '2018-02-28',
    value: 160343,
    scope: 'Dataset resources on data.gov.in; 4,240 catalogs, 110 ministries and departments.',
    source: 'MeitY Annual Report 2017-18',
    url: 'https://www.meity.gov.in/static/uploads/2024/02/35-1.pdf',
  },
  {
    date: '2019-03-31',
    value: 266640,
    scope: 'Dataset resources; 4,633 catalogs, 144 ministries and departments.',
    source: 'MeitY Annual Report 2018-19',
    url: 'https://www.meity.gov.in/static/uploads/2024/02/34-1.pdf',
  },
  {
    date: '2020-03-31',
    value: 360095,
    scope: 'Dataset resources; 8,000 catalogs (snapshot as reported in the 2019-20 report).',
    source: 'MeitY Annual Report 2019-20',
    url: 'https://www.meity.gov.in/static/uploads/2024/02/33-1.pdf',
  },
  {
    date: '2020-10-31',
    value: 468527,
    scope: 'Dataset resources; 9,730 catalogs.',
    source: 'MeitY Annual Report 2020-21',
    url: 'https://www.meity.gov.in/static/uploads/2024/02/32-1.pdf',
  },
  {
    date: '2021-10-31',
    value: 512803,
    scope: 'Dataset resources; 11,142 catalogs.',
    source: 'MeitY Annual Report 2021-22',
    url: 'https://www.meity.gov.in/static/uploads/2024/02/31-1.pdf',
  },
  {
    date: '2023-03-31',
    value: 585921,
    scope: 'Dataset resources; 12,917 catalogs (as reported in the 2022-23 report).',
    source: 'MeitY Annual Report 2022-23',
    url: 'https://www.meity.gov.in/static/uploads/2024/02/AR_2022-23_English_24-04-23-1.pdf',
  },
  {
    date: '2024-08-01',
    value: 502000,
    scope: '502,000+ data resources (counting basis not stated in the presentation).',
    source: 'MoSPI presentation to the 28th COCSSO (August 2024)',
    url: null,
  },
  {
    date: '2024-10-09',
    value: 503726,
    scope: 'Dataset resources; 12,734 catalogs. Lower than the 2022-23 reported count — the counting basis changed between reports.',
    source: 'MeitY Annual Report 2024-25',
    url: 'https://www.meity.gov.in/static/uploads/2024/12/10fcadec462c330211502fed3d24ea83.pdf',
  },
];

// Dated findings that annotate the timeline but are not series: scheme
// counts (which change definition every few years) and the few law totals
// anyone has ever published.
export const MILESTONES = [
  {
    year: 2013,
    label: '137 centrally sponsored schemes and 5 scheme-based ACA (2013-14 Budget Estimates) restructured into 66 schemes, including 17 flagship programmes',
    scope: 'Cabinet decision of 20 June 2013. The familiar “147 merged into 66” line is not what the official explainer says.',
    source: 'Indian Economic Service (Arthapedia); PIB release relid=113231',
    url: 'https://ies.gov.in/arthapedia/concept/central-sector-and-centrally-sponsored-schemes',
  },
  {
    year: 2017,
    label: '28 umbrella programmes covering 950 central sector and centrally sponsored sub-schemes',
    scope: 'A count of sub-schemes under umbrella programmes: one programme on paper, many interventions underneath.',
    source: 'Centre for Policy Research analysis of the 2016-17 Budget',
    url: 'https://cprindia.org/towards-cooperative-social-policy-financing-in-india/',
  },
  {
    year: 2025,
    label: '314 central schemes (54 centrally sponsored, 260 central sector) with approval terminal dates up to 31 March 2026, likely to be submitted for re-appraisal',
    scope: 'One review cohort — not a total of all schemes in operation.',
    source: 'PIB (29 May 2025), Department of Expenditure',
    url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2132416',
  },
  {
    year: 2013,
    label: '15,000+ state laws estimated in force across India',
    scope: 'A reported estimate — still the only national estimate anyone holds.',
    source: 'PRS Legislative Research (2013), as published with THS “Government output at both levels”',
    url: null,
  },
  {
    year: 2022,
    label: '1,486 Central Acts repealed in eight years',
    scope: 'Law Minister, Rajya Sabha reply (2022). The statute book churns quietly.',
    source: 'Rajya Sabha reply (2022), as published with THS “Government output at both levels”',
    url: null,
  },
  {
    year: 2025,
    label: '890 Central Acts in force',
    scope: 'A reported count from the Law Ministry (May 2025), not an audited total.',
    source: 'Law Ministry (May 2025), as published with THS “The rules exist. The reading does not.”',
    url: null,
  },
];

// The one marker on the spread with no year, because it has no number. No
// authority publishes an annual count of Gazette notifications, so the
// timeline can show the notifications it holds and still not know the total.
// It is kept apart from MILESTONES because every milestone is dated and
// counted; this is the absence of a count.
export const GAZETTE_GAP = {
  label: 'The annual Gazette total does not exist',
  scope:
    'No authority publishes how many notifications were issued in a year, central or state. The dots are what the catalogue holds, not what was issued.',
  source: 'India Code catalogue crawl, October 2026; no official annual series found.',
};

// What the instrument counts measure — and what they do not. This note is
// printed with the chart and in the sources file, because the honest part of
// the timeline is the part it cannot draw.
export const CATALOGUE_NOTE =
  'The instrument counts come from the India Code catalogue (indiacode.gov.in), crawled in October 2026 and ' +
  'deduplicated by Act number, rule or notification id, or normalised title. They measure the paper India has ' +
  'digitised, not the state’s true output. For many years the catalogue holds fewer Central Acts than that ' +
  'year’s highest Act number proves were enacted; state coverage varies by year; 2026 is partial and marked ' +
  'provisional. And the annual count of Gazette notifications — central or state — exists nowhere at all: ' +
  'that gap is part of the finding, not a missing row.';
