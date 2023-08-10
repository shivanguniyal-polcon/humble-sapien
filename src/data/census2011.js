// Census of India 2011, state/UT level key indicators.
// Coverage: the 35 states and union territories as constituted in 2011 (undivided
// Andhra Pradesh including the territory that became Telangana in 2014; Jammu and
// Kashmir as a state; Dadra and Nagar Haveli and Daman and Diu as separate UTs).
// This is a complete-population count, not a sample: the Census enumerates every
// usual resident of India.
//
// Sources (verified October 2026):
//   Population, SC/ST counts: census2011.co.in compilations of the Primary Census
//     Abstract (states.php, scheduled-castes.php, scheduled-tribes.php).
//   Sex ratio: Census 2011 via en.wikipedia.org/wiki/List_of_states_and_union_
//     territories_of_India_by_sex_ratio (females per 1,000 males).
//   Literacy (population age 7+): Census 2011 via en.wikipedia.org/wiki/List_of_
//     Indian_states_and_union_territories_by_literacy_rate.
//   Primary source for all values: Census of India 2011 PCA release,
//     censusindia.gov.in/census.website/data/census-tables.
// Urban share and work participation rate were not verified in this pass and are
// deliberately absent rather than estimated.

export const censusMeta = {
  title: 'Census of India 2011: state and UT key indicators',
  publisher: 'Registrar General and Census Commissioner, India',
  year: 2011,
  coverage: 'All usual residents of India (complete enumeration, 35 states/UTs as in 2011)',
  licence: 'Government Open Data License (GODL) India applies to re-published census tables',
  sources: [
    { label: 'Census tables index (primary)', url: 'https://censusindia.gov.in/census.website/data/census-tables' },
    { label: 'Population and SC/ST counts compilation', url: 'https://www.census2011.co.in/states.php' },
    { label: 'Sex ratio compilation', url: 'https://en.wikipedia.org/wiki/List_of_states_and_union_territories_of_India_by_sex_ratio' },
    { label: 'Literacy compilation', url: 'https://en.wikipedia.org/wiki/List_of_Indian_states_and_union_territories_by_literacy_rate' },
  ],
};

// pop: total population; sexRatio: females per 1,000 males; lit/litM/litF: literacy
// rate (%) of population age 7+; sc/st: Scheduled Caste and Scheduled Tribe counts.
export const census2011 = [
  { s: 'Andaman and Nicobar Islands', pop: 380581, sexRatio: 876, lit: 86.63, litM: 90.27, litF: 82.43, sc: 0, st: 28530 },
  { s: 'Andhra Pradesh', pop: 84580777, sexRatio: 993, lit: 67.02, litM: 74.88, litF: 59.15, sc: 13878078, st: 5918073 },
  { s: 'Arunachal Pradesh', pop: 1383727, sexRatio: 938, lit: 65.38, litM: 72.55, litF: 57.7, sc: 0, st: 951821 },
  { s: 'Assam', pop: 31205576, sexRatio: 958, lit: 72.19, litM: 77.85, litF: 66.27, sc: 2231321, st: 3884371 },
  { s: 'Bihar', pop: 104099452, sexRatio: 918, lit: 61.8, litM: 71.2, litF: 51.5, sc: 16567325, st: 1336573 },
  { s: 'Chandigarh', pop: 1055450, sexRatio: 818, lit: 86.05, litM: 89.99, litF: 81.19, sc: 199086, st: 0 },
  { s: 'Chhattisgarh', pop: 25545198, sexRatio: 991, lit: 70.28, litM: 80.27, litF: 60.24, sc: 3274269, st: 7822902 },
  { s: 'Dadra and Nagar Haveli', pop: 343709, sexRatio: 774, lit: 76.34, litM: 85.17, litF: 64.32, sc: 6186, st: 178564 },
  { s: 'Daman and Diu', pop: 243247, sexRatio: 618, lit: 87.1, litM: 91.54, litF: 79.55, sc: 6124, st: 15363 },
  { s: 'Delhi', pop: 16787941, sexRatio: 868, lit: 86.21, litM: 90.94, litF: 80.76, sc: 2812309, st: 0 },
  { s: 'Goa', pop: 1458545, sexRatio: 973, lit: 88.7, litM: 92.65, litF: 84.66, sc: 25449, st: 149275 },
  { s: 'Gujarat', pop: 60439692, sexRatio: 919, lit: 78.03, litM: 85.75, litF: 69.68, sc: 4074447, st: 8917174 },
  { s: 'Haryana', pop: 25351462, sexRatio: 879, lit: 75.55, litM: 84.06, litF: 65.94, sc: 5113615, st: 0 },
  { s: 'Himachal Pradesh', pop: 6864602, sexRatio: 972, lit: 82.8, litM: 89.53, litF: 75.93, sc: 1729252, st: 392126 },
  { s: 'Jammu and Kashmir', pop: 12541302, sexRatio: 889, lit: 67.16, litM: 76.75, litF: 56.43, sc: 924991, st: 1493299 },
  { s: 'Jharkhand', pop: 32988134, sexRatio: 948, lit: 66.41, litM: 76.84, litF: 55.42, sc: 3985644, st: 8645042 },
  { s: 'Karnataka', pop: 61095297, sexRatio: 973, lit: 75.36, litM: 82.47, litF: 68.08, sc: 10474992, st: 4248987 },
  { s: 'Kerala', pop: 33406061, sexRatio: 1084, lit: 94.0, litM: 96.11, litF: 91.07, sc: 3039573, st: 484839 },
  { s: 'Lakshadweep', pop: 64473, sexRatio: 946, lit: 91.85, litM: 95.56, litF: 87.95, sc: 0, st: 61120 },
  { s: 'Madhya Pradesh', pop: 72626809, sexRatio: 931, lit: 69.32, litM: 78.73, litF: 59.24, sc: 11342320, st: 15316784 },
  { s: 'Maharashtra', pop: 112374333, sexRatio: 929, lit: 82.34, litM: 88.38, litF: 75.87, sc: 13275898, st: 10510213 },
  { s: 'Manipur', pop: 2855794, sexRatio: 992, lit: 76.94, litM: 83.58, litF: 70.26, sc: 97328, st: 1167422 },
  { s: 'Meghalaya', pop: 2966889, sexRatio: 989, lit: 74.43, litM: 75.95, litF: 72.89, sc: 17355, st: 2555861 },
  { s: 'Mizoram', pop: 1097206, sexRatio: 976, lit: 91.33, litM: 93.35, litF: 89.27, sc: 1218, st: 1036115 },
  { s: 'Nagaland', pop: 1978502, sexRatio: 931, lit: 79.55, litM: 82.75, litF: 76.11, sc: 0, st: 1710973 },
  { s: 'Odisha', pop: 41974218, sexRatio: 979, lit: 72.87, litM: 81.59, litF: 64.01, sc: 7188463, st: 9590756 },
  { s: 'Puducherry', pop: 1247953, sexRatio: 1037, lit: 85.85, litM: 91.26, litF: 80.67, sc: 196325, st: 0 },
  { s: 'Punjab', pop: 27743338, sexRatio: 895, lit: 75.84, litM: 80.44, litF: 70.73, sc: 8860179, st: 0 },
  { s: 'Rajasthan', pop: 68548437, sexRatio: 928, lit: 66.11, litM: 79.19, litF: 52.12, sc: 12221593, st: 9238534 },
  { s: 'Sikkim', pop: 610577, sexRatio: 890, lit: 81.42, litM: 86.55, litF: 75.61, sc: 28275, st: 206360 },
  { s: 'Tamil Nadu', pop: 72147030, sexRatio: 996, lit: 80.09, litM: 86.77, litF: 73.44, sc: 14438445, st: 794697 },
  { s: 'Tripura', pop: 3673917, sexRatio: 960, lit: 87.22, litM: 92.53, litF: 82.73, sc: 654918, st: 1166813 },
  { s: 'Uttar Pradesh', pop: 199812341, sexRatio: 912, lit: 67.68, litM: 77.28, litF: 57.18, sc: 41357608, st: 1134273 },
  { s: 'Uttarakhand', pop: 10086292, sexRatio: 963, lit: 78.82, litM: 87.4, litF: 70.01, sc: 1892516, st: 291903 },
  { s: 'West Bengal', pop: 91276115, sexRatio: 950, lit: 76.26, litM: 81.69, litF: 70.54, sc: 21463270, st: 5296953 },
];

// Derived fields used by the econometrics lab: shares are computed from the raw
// counts above so the receipts stay visible.
export function censusDerived(row) {
  return {
    ...row,
    logPop: Math.log(row.pop),
    scShare: (row.sc / row.pop) * 100,
    stShare: (row.st / row.pop) * 100,
    genderGapLit: row.litM - row.litF,
  };
}
