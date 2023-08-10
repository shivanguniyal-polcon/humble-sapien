// Generated from public NFHS factsheet extractions. Do not hand-edit.
// Sources:
//   NFHS-5 + NFHS-4 state totals: pratapvardhan/NFHS-5 (community extraction of IIPS state factsheets),
//     https://github.com/pratapvardhan/NFHS-5 (CSV: NFHS-5-States.csv, includes nfhs4_total)
//   NFHS-3 (2005-06) totals: HindustanTimesLabs/nfhs-data (community extraction of IIPS NFHS-4 factsheets,
//     column total_2005-06), https://github.com/HindustanTimesLabs/nfhs-data
//   Primary source for all values: IIPS/DHS NFHS state factsheets (nfhsiips.in, dhsprogram.com).
// Geography note: NFHS-5 uses post-2019 units. Ladakh has no NFHS-4/3 value (created 2019);
//   'Dadra & Nagar Haveli and Daman & Diu' is combined in NFHS-5 but separate in NFHS-4, so no
//   comparable NFHS-4/3 total is joined (values kept null rather than combined without weights).

export const nfhsWaves = [
  { key: 'n3', survey: 'NFHS-3', years: '2005-06' },
  { key: 'n4', survey: 'NFHS-4', years: '2015-16' },
  { key: 'n5', survey: 'NFHS-5', years: '2019-21' },
];

export const nfhsIndicators = [
  { key: 'anaemia_women', label: 'Women 15-49 who are anaemic', unit: '%', wording: 'All women age 15-49 years who are anaemic', note: 'Anaemia measurement and adjustment changed between rounds; read NFHS-4 to NFHS-5 movement with care.' },
  { key: 'stunting', label: 'Children under 5 who are stunted', unit: '%', wording: 'Children under 5 years who are stunted (height-for-age)', note: 'Height-for-age below -2 SD, WHO standard. Comparable across rounds.' },
  { key: 'inst_births', label: 'Institutional births', unit: '%', wording: 'Institutional births (%)', note: 'Comparable across rounds.' },
  { key: 'tfr', label: 'Total fertility rate', unit: 'children per woman', wording: 'Total fertility rate (children per woman)', note: 'Period TFR for the three years before the survey. Comparable across rounds.' },
  { key: 'women_schooling', label: 'Women with 10+ years of schooling', unit: '%', wording: 'Women with 10 or more years of schooling (%)', note: 'Comparable across rounds.' },
];

export const nfhsIndia = {
  "anaemia_women": {
    "n3": null,
    "n4": 53.1,
    "n5": 57.0
  },
  "stunting": {
    "n3": null,
    "n4": 38.4,
    "n5": 35.5
  },
  "inst_births": {
    "n3": null,
    "n4": 78.9,
    "n5": 88.6
  },
  "tfr": {
    "n3": null,
    "n4": 2.2,
    "n5": 2.0
  },
  "women_schooling": {
    "n3": null,
    "n4": 35.7,
    "n5": 41.0
  }
};

export const nfhsStates = [
  { state: "Andaman & Nicobar Islands", v: {"anaemia_women":{"n3":null,"n4":65.7,"n5":57.5},"stunting":{"n3":null,"n4":23.3,"n5":22.5},"inst_births":{"n3":null,"n4":96.4,"n5":99.0},"tfr":{"n3":null,"n4":1.4,"n5":1.3},"women_schooling":{"n3":null,"n4":49.1,"n5":52.5}}, ur: {"anaemia_women":{"u":57.2,"r":57.6},"stunting":{"u":18.2,"r":26.4},"inst_births":{"u":99.2,"r":98.7},"tfr":{"u":1.4,"r":1.2},"women_schooling":{"u":59.7,"r":47.6}} },
  { state: "Andhra Pradesh", v: {"anaemia_women":{"n3":null,"n4":60.0,"n5":58.8},"stunting":{"n3":null,"n4":31.4,"n5":31.2},"inst_births":{"n3":null,"n4":91.5,"n5":96.5},"tfr":{"n3":null,"n4":1.8,"n5":1.7},"women_schooling":{"n3":null,"n4":34.3,"n5":39.6}}, ur: {"anaemia_women":{"u":57.8,"r":59.3},"stunting":{"u":23.1,"r":34.2},"inst_births":{"u":98.6,"r":95.7},"tfr":{"u":1.5,"r":1.8},"women_schooling":{"u":51.2,"r":34.3}} },
  { state: "Arunachal Pradesh", v: {"anaemia_women":{"n3":50.5,"n4":43.2,"n5":40.3},"stunting":{"n3":43.3,"n4":29.4,"n5":28.0},"inst_births":{"n3":28.5,"n4":52.2,"n5":79.2},"tfr":{"n3":3.0,"n4":2.1,"n5":1.8},"women_schooling":{"n3":15.1,"n4":31.0,"n5":39.4}}, ur: {"anaemia_women":{"u":36.5,"r":41.0},"stunting":{"u":28.4,"r":27.9},"inst_births":{"u":90.6,"r":77.3},"tfr":{"u":1.4,"r":1.9},"women_schooling":{"u":55.4,"r":36.2}} },
  { state: "Assam", v: {"anaemia_women":{"n3":69.3,"n4":46.0,"n5":65.9},"stunting":{"n3":46.5,"n4":36.4,"n5":35.3},"inst_births":{"n3":22.4,"n4":70.6,"n5":84.1},"tfr":{"n3":2.4,"n4":2.2,"n5":1.9},"women_schooling":{"n3":19.3,"n4":26.2,"n5":29.6}}, ur: {"anaemia_women":{"u":65.2,"r":66.0},"stunting":{"u":29.8,"r":36.0},"inst_births":{"u":93.5,"r":82.9},"tfr":{"u":1.5,"r":1.9},"women_schooling":{"u":49.0,"r":26.2}} },
  { state: "Bihar", v: {"anaemia_women":{"n3":67.4,"n4":60.3,"n5":63.5},"stunting":{"n3":55.6,"n4":48.3,"n5":42.9},"inst_births":{"n3":19.9,"n4":63.8,"n5":76.2},"tfr":{"n3":4.0,"n4":3.4,"n5":3.0},"women_schooling":{"n3":13.2,"n4":22.8,"n5":28.8}}, ur: {"anaemia_women":{"u":65.6,"r":63.1},"stunting":{"u":36.8,"r":43.9},"inst_births":{"u":84.1,"r":75.0},"tfr":{"u":2.4,"r":3.1},"women_schooling":{"u":48.0,"r":25.2}} },
  { state: "Chandigarh", v: {"anaemia_women":{"n3":null,"n4":75.9,"n5":60.3},"stunting":{"n3":null,"n4":28.7,"n5":25.3},"inst_births":{"n3":null,"n4":91.6,"n5":96.9},"tfr":{"n3":null,"n4":1.6,"n5":1.4},"women_schooling":{"n3":null,"n4":59.2,"n5":59.6}}, ur: {"anaemia_women":{"u":60.3,"r":64.0},"stunting":{"u":25.2,"r":null},"inst_births":{"u":97.0,"r":null},"tfr":{"u":1.4,"r":null},"women_schooling":{"u":59.9,"r":30.8}} },
  { state: "Chhattisgarh", v: {"anaemia_women":{"n3":57.5,"n4":47.0,"n5":60.8},"stunting":{"n3":52.9,"n4":37.6,"n5":34.6},"inst_births":{"n3":14.3,"n4":70.2,"n5":85.7},"tfr":{"n3":2.6,"n4":2.2,"n5":1.8},"women_schooling":{"n3":12.3,"n4":26.5,"n5":36.9}}, ur: {"anaemia_women":{"u":56.5,"r":62.2},"stunting":{"u":30.0,"r":35.7},"inst_births":{"u":93.1,"r":83.9},"tfr":{"u":1.4,"r":1.9},"women_schooling":{"u":52.4,"r":32.1}} },
  { state: "Dadra & Nagar Haveli and Daman & Diu", v: {"anaemia_women":{"n3":null,"n4":72.9,"n5":62.5},"stunting":{"n3":null,"n4":37.2,"n5":39.4},"inst_births":{"n3":null,"n4":88.5,"n5":96.5},"tfr":{"n3":null,"n4":2.1,"n5":1.8},"women_schooling":{"n3":null,"n4":40.3,"n5":35.8}}, ur: {"anaemia_women":{"u":60.5,"r":64.4},"stunting":{"u":32.9,"r":45.7},"inst_births":{"u":96.4,"r":96.7},"tfr":{"u":1.7,"r":1.9},"women_schooling":{"u":48.6,"r":24.2}} },
  { state: "Goa", v: {"anaemia_women":{"n3":38.0,"n4":31.3,"n5":39.0},"stunting":{"n3":25.6,"n4":20.1,"n5":25.8},"inst_births":{"n3":92.3,"n4":96.9,"n5":99.7},"tfr":{"n3":1.8,"n4":1.7,"n5":1.3},"women_schooling":{"n3":48.9,"n4":58.2,"n5":71.5}}, ur: {"anaemia_women":{"u":40.0,"r":37.4},"stunting":{"u":24.3,"r":28.2},"inst_births":{"u":99.6,"r":100.0},"tfr":{"u":1.3,"r":1.4},"women_schooling":{"u":73.0,"r":69.3}} },
  { state: "Gujarat", v: {"anaemia_women":{"n3":55.3,"n4":54.9,"n5":65.0},"stunting":{"n3":51.7,"n4":38.5,"n5":39.0},"inst_births":{"n3":52.7,"n4":88.5,"n5":94.3},"tfr":{"n3":2.4,"n4":2.0,"n5":1.9},"women_schooling":{"n3":23.5,"n4":33.0,"n5":33.8}}, ur: {"anaemia_women":{"u":61.3,"r":67.6},"stunting":{"u":32.4,"r":43.0},"inst_births":{"u":97.8,"r":92.2},"tfr":{"u":1.7,"r":2.0},"women_schooling":{"u":47.9,"r":23.6}} },
  { state: "Haryana", v: {"anaemia_women":{"n3":56.1,"n4":62.7,"n5":60.4},"stunting":{"n3":45.7,"n4":34.0,"n5":27.5},"inst_births":{"n3":35.7,"n4":80.4,"n5":94.9},"tfr":{"n3":2.7,"n4":2.1,"n5":1.9},"women_schooling":{"n3":29.6,"n4":45.8,"n5":49.5}}, ur: {"anaemia_women":{"u":57.4,"r":61.9},"stunting":{"u":26.1,"r":28.1},"inst_births":{"u":96.1,"r":94.4},"tfr":{"u":1.7,"r":2.0},"women_schooling":{"u":60.1,"r":44.1}} },
  { state: "Himachal Pradesh", v: {"anaemia_women":{"n3":43.0,"n4":53.5,"n5":53.0},"stunting":{"n3":38.6,"n4":26.3,"n5":30.8},"inst_births":{"n3":43.1,"n4":76.4,"n5":88.2},"tfr":{"n3":1.9,"n4":1.9,"n5":1.7},"women_schooling":{"n3":44.7,"n4":59.4,"n5":65.9}}, ur: {"anaemia_women":{"u":51.0,"r":53.3},"stunting":{"u":27.0,"r":31.3},"inst_births":{"u":93.1,"r":87.6},"tfr":{"u":1.4,"r":1.7},"women_schooling":{"u":79.8,"r":63.8}} },
  { state: "Jammu & Kashmir", v: {"anaemia_women":{"n3":52.0,"n4":48.9,"n5":65.9},"stunting":{"n3":35.0,"n4":27.4,"n5":26.9},"inst_births":{"n3":50.2,"n4":85.5,"n5":92.4},"tfr":{"n3":2.4,"n4":2.0,"n5":1.4},"women_schooling":{"n3":26.5,"n4":37.1,"n5":51.3}}, ur: {"anaemia_women":{"u":61.4,"r":67.5},"stunting":{"u":30.1,"r":25.9},"inst_births":{"u":98.6,"r":90.5},"tfr":{"u":1.2,"r":1.5},"women_schooling":{"u":65.1,"r":46.2}} },
  { state: "Jharkhand", v: {"anaemia_women":{"n3":69.5,"n4":65.2,"n5":65.3},"stunting":{"n3":49.8,"n4":45.3,"n5":39.6},"inst_births":{"n3":18.3,"n4":61.9,"n5":75.8},"tfr":{"n3":3.3,"n4":2.6,"n5":2.3},"women_schooling":{"n3":15.1,"n4":28.7,"n5":33.2}}, ur: {"anaemia_women":{"u":61.1,"r":66.7},"stunting":{"u":26.8,"r":42.3},"inst_births":{"u":89.1,"r":73.1},"tfr":{"u":1.6,"r":2.5},"women_schooling":{"u":54.4,"r":26.3}} },
  { state: "Karnataka", v: {"anaemia_women":{"n3":51.2,"n4":44.8,"n5":47.8},"stunting":{"n3":43.7,"n4":36.2,"n5":35.4},"inst_births":{"n3":64.7,"n4":94.0,"n5":97.0},"tfr":{"n3":2.1,"n4":1.8,"n5":1.7},"women_schooling":{"n3":27.8,"n4":45.5,"n5":50.2}}, ur: {"anaemia_women":{"u":43.9,"r":50.3},"stunting":{"u":32.2,"r":37.2},"inst_births":{"u":98.3,"r":96.2},"tfr":{"u":1.5,"r":1.8},"women_schooling":{"u":62.3,"r":42.0}} },
  { state: "Kerala", v: {"anaemia_women":{"n3":32.8,"n4":34.3,"n5":36.3},"stunting":{"n3":24.5,"n4":19.7,"n5":23.4},"inst_births":{"n3":99.3,"n4":99.8,"n5":99.8},"tfr":{"n3":1.9,"n4":1.6,"n5":1.8},"women_schooling":{"n3":48.7,"n4":72.2,"n5":77.0}}, ur: {"anaemia_women":{"u":37.0,"r":35.8},"stunting":{"u":20.1,"r":26.4},"inst_births":{"u":99.7,"r":99.8},"tfr":{"u":1.8,"r":1.8},"women_schooling":{"u":78.8,"r":75.3}} },
  { state: "Ladakh", v: {"anaemia_women":{"n3":null,"n4":78.4,"n5":92.8},"stunting":{"n3":null,"n4":30.9,"n5":30.5},"inst_births":{"n3":null,"n4":90.8,"n5":95.1},"tfr":{"n3":null,"n4":2.3,"n5":1.3},"women_schooling":{"n3":null,"n4":44.6,"n5":50.0}}, ur: {"anaemia_women":{"u":89.5,"r":93.5},"stunting":{"u":28.2,"r":31.1},"inst_births":{"u":99.1,"r":94.0},"tfr":{"u":1.4,"r":1.3},"women_schooling":{"u":53.8,"r":49.2}} },
  { state: "Lakshadweep", v: {"anaemia_women":{"n3":null,"n4":46.0,"n5":25.8},"stunting":{"n3":null,"n4":26.8,"n5":32.0},"inst_births":{"n3":null,"n4":99.3,"n5":99.6},"tfr":{"n3":null,"n4":1.8,"n5":1.4},"women_schooling":{"n3":null,"n4":56.8,"n5":67.8}}, ur: {"anaemia_women":{"u":26.4,"r":23.7},"stunting":{"u":30.7,"r":35.6},"inst_births":{"u":99.5,"r":100.0},"tfr":{"u":1.4,"r":1.6},"women_schooling":{"u":68.2,"r":66.3}} },
  { state: "Madhya Pradesh", v: {"anaemia_women":{"n3":55.9,"n4":52.5,"n5":54.7},"stunting":{"n3":50.0,"n4":42.0,"n5":35.7},"inst_births":{"n3":26.2,"n4":80.8,"n5":90.7},"tfr":{"n3":3.1,"n4":2.3,"n5":2.0},"women_schooling":{"n3":14.0,"n4":23.2,"n5":29.3}}, ur: {"anaemia_women":{"u":51.5,"r":55.8},"stunting":{"u":30.1,"r":37.3},"inst_births":{"u":95.8,"r":89.2},"tfr":{"u":1.6,"r":2.1},"women_schooling":{"u":49.1,"r":21.7}} },
  { state: "Maharashtra", v: {"anaemia_women":{"n3":48.4,"n4":48.0,"n5":54.2},"stunting":{"n3":46.3,"n4":34.4,"n5":35.2},"inst_births":{"n3":64.6,"n4":90.3,"n5":94.7},"tfr":{"n3":2.1,"n4":1.9,"n5":1.7},"women_schooling":{"n3":30.7,"n4":42.0,"n5":50.4}}, ur: {"anaemia_women":{"u":52.0,"r":56.1},"stunting":{"u":34.9,"r":35.5},"inst_births":{"u":96.7,"r":93.1},"tfr":{"u":1.5,"r":1.9},"women_schooling":{"u":61.1,"r":40.7}} },
  { state: "Manipur", v: {"anaemia_women":{"n3":35.7,"n4":26.4,"n5":29.4},"stunting":{"n3":35.6,"n4":28.9,"n5":23.4},"inst_births":{"n3":45.9,"n4":69.1,"n5":79.9},"tfr":{"n3":2.8,"n4":2.6,"n5":2.2},"women_schooling":{"n3":33.8,"n4":45.9,"n5":48.1}}, ur: {"anaemia_women":{"u":30.5,"r":28.8},"stunting":{"u":20.1,"r":25.1},"inst_births":{"u":92.5,"r":73.9},"tfr":{"u":1.8,"r":2.4},"women_schooling":{"u":60.0,"r":40.6}} },
  { state: "Meghalaya", v: {"anaemia_women":{"n3":46.2,"n4":56.2,"n5":53.8},"stunting":{"n3":55.1,"n4":43.8,"n5":46.5},"inst_births":{"n3":29.0,"n4":51.4,"n5":58.1},"tfr":{"n3":3.8,"n4":3.0,"n5":2.9},"women_schooling":{"n3":22.9,"n4":33.6,"n5":35.1}}, ur: {"anaemia_women":{"u":51.8,"r":54.3},"stunting":{"u":35.1,"r":48.2},"inst_births":{"u":82.7,"r":54.3},"tfr":{"u":1.6,"r":3.3},"women_schooling":{"u":61.4,"r":27.3}} },
  { state: "Mizoram", v: {"anaemia_women":{"n3":38.1,"n4":24.8,"n5":34.8},"stunting":{"n3":39.8,"n4":28.1,"n5":28.9},"inst_births":{"n3":59.8,"n4":79.7,"n5":85.8},"tfr":{"n3":2.9,"n4":2.3,"n5":1.9},"women_schooling":{"n3":27.5,"n4":39.9,"n5":50.0}}, ur: {"anaemia_women":{"u":30.8,"r":39.9},"stunting":{"u":25.5,"r":31.9},"inst_births":{"u":98.8,"r":72.5},"tfr":{"u":1.6,"r":2.2},"women_schooling":{"u":62.3,"r":32.7}} },
  { state: "NCT Delhi", v: {"anaemia_women":{"n3":44.3,"n4":54.3,"n5":49.9},"stunting":{"n3":42.2,"n4":31.9,"n5":30.9},"inst_births":{"n3":59.0,"n4":84.4,"n5":91.8},"tfr":{"n3":2.1,"n4":1.8,"n5":1.6},"women_schooling":{"n3":53.2,"n4":54.2,"n5":59.7}}, ur: {"anaemia_women":{"u":49.7,"r":58.6},"stunting":{"u":31.0,"r":26.3},"inst_births":{"u":91.8,"r":90.4},"tfr":{"u":1.6,"r":2.5},"women_schooling":{"u":59.5,"r":68.7}} },
  { state: "Nagaland", v: {"anaemia_women":{"n3":null,"n4":27.9,"n5":28.9},"stunting":{"n3":38.8,"n4":28.6,"n5":32.7},"inst_births":{"n3":11.6,"n4":32.8,"n5":45.7},"tfr":{"n3":3.7,"n4":2.7,"n5":1.7},"women_schooling":{"n3":21.5,"n4":33.3,"n5":44.4}}, ur: {"anaemia_women":{"u":27.3,"r":29.8},"stunting":{"u":27.1,"r":34.7},"inst_births":{"u":65.0,"r":38.8},"tfr":{"u":1.2,"r":2.0},"women_schooling":{"u":63.7,"r":34.1}} },
  { state: "Odisha", v: {"anaemia_women":{"n3":61.1,"n4":51.0,"n5":64.3},"stunting":{"n3":45.0,"n4":34.1,"n5":31.0},"inst_births":{"n3":35.6,"n4":85.3,"n5":92.2},"tfr":{"n3":2.4,"n4":2.1,"n5":1.8},"women_schooling":{"n3":15.6,"n4":26.7,"n5":33.0}}, ur: {"anaemia_women":{"u":61.5,"r":64.9},"stunting":{"u":24.9,"r":32.0},"inst_births":{"u":97.5,"r":91.3},"tfr":{"u":1.5,"r":1.9},"women_schooling":{"u":47.9,"r":29.6}} },
  { state: "Puducherry", v: {"anaemia_women":{"n3":null,"n4":52.4,"n5":55.1},"stunting":{"n3":null,"n4":23.7,"n5":20.0},"inst_births":{"n3":null,"n4":99.9,"n5":99.6},"tfr":{"n3":null,"n4":1.7,"n5":1.5},"women_schooling":{"n3":null,"n4":60.3,"n5":65.4}}, ur: {"anaemia_women":{"u":52.3,"r":61.4},"stunting":{"u":21.7,"r":15.6},"inst_births":{"u":99.5,"r":99.7},"tfr":{"u":1.6,"r":1.2},"women_schooling":{"u":68.9,"r":57.8}} },
  { state: "Punjab", v: {"anaemia_women":{"n3":38.0,"n4":53.5,"n5":58.7},"stunting":{"n3":36.7,"n4":25.7,"n5":24.5},"inst_births":{"n3":51.3,"n4":90.5,"n5":94.3},"tfr":{"n3":2.0,"n4":1.6,"n5":1.6},"women_schooling":{"n3":38.4,"n4":55.1,"n5":56.0}}, ur: {"anaemia_women":{"u":59.0,"r":58.5},"stunting":{"u":25.7,"r":23.9},"inst_births":{"u":92.0,"r":95.5},"tfr":{"u":1.6,"r":1.7},"women_schooling":{"u":62.4,"r":52.2}} },
  { state: "Rajasthan", v: {"anaemia_women":{"n3":53.1,"n4":46.8,"n5":54.4},"stunting":{"n3":43.7,"n4":39.1,"n5":31.8},"inst_births":{"n3":29.6,"n4":84.0,"n5":94.9},"tfr":{"n3":3.2,"n4":2.4,"n5":2.0},"women_schooling":{"n3":11.7,"n4":25.1,"n5":33.4}}, ur: {"anaemia_women":{"u":49.9,"r":55.7},"stunting":{"u":28.3,"r":32.6},"inst_births":{"u":97.5,"r":94.2},"tfr":{"u":1.7,"r":2.1},"women_schooling":{"u":51.2,"r":27.8}} },
  { state: "Sikkim", v: {"anaemia_women":{"n3":59.5,"n4":34.9,"n5":42.1},"stunting":{"n3":38.3,"n4":29.6,"n5":22.3},"inst_births":{"n3":47.2,"n4":94.7,"n5":94.7},"tfr":{"n3":2.0,"n4":1.2,"n5":1.1},"women_schooling":{"n3":22.5,"n4":40.7,"n5":49.0}}, ur: {"anaemia_women":{"u":42.4,"r":41.9},"stunting":{"u":15.1,"r":25.6},"inst_births":{"u":92.0,"r":96.3},"tfr":{"u":0.7,"r":1.3},"women_schooling":{"u":60.2,"r":41.2}} },
  { state: "Tamil Nadu", v: {"anaemia_women":{"n3":53.2,"n4":55.0,"n5":53.4},"stunting":{"n3":30.9,"n4":27.1,"n5":25.0},"inst_births":{"n3":87.8,"n4":98.9,"n5":99.6},"tfr":{"n3":1.8,"n4":1.7,"n5":1.8},"women_schooling":{"n3":31.8,"n4":50.9,"n5":56.6}}, ur: {"anaemia_women":{"u":51.3,"r":55.3},"stunting":{"u":22.2,"r":27.2},"inst_births":{"u":99.8,"r":99.4},"tfr":{"u":1.6,"r":1.9},"women_schooling":{"u":63.7,"r":49.9}} },
  { state: "Telangana", v: {"anaemia_women":{"n3":null,"n4":56.6,"n5":57.6},"stunting":{"n3":null,"n4":28.0,"n5":33.1},"inst_births":{"n3":null,"n4":91.5,"n5":97.0},"tfr":{"n3":null,"n4":1.8,"n5":1.8},"women_schooling":{"n3":null,"n4":43.6,"n5":45.5}}, ur: {"anaemia_women":{"u":55.2,"r":58.9},"stunting":{"u":28.1,"r":35.7},"inst_births":{"u":97.7,"r":96.6},"tfr":{"u":1.8,"r":1.7},"women_schooling":{"u":60.9,"r":36.3}} },
  { state: "Tripura", v: {"anaemia_women":{"n3":65.1,"n4":54.5,"n5":67.2},"stunting":{"n3":35.7,"n4":24.3,"n5":32.3},"inst_births":{"n3":46.9,"n4":79.9,"n5":89.2},"tfr":{"n3":2.2,"n4":1.7,"n5":1.7},"women_schooling":{"n3":15.3,"n4":23.4,"n5":23.2}}, ur: {"anaemia_women":{"u":66.1,"r":67.6},"stunting":{"u":27.1,"r":33.9},"inst_births":{"u":94.8,"r":87.5},"tfr":{"u":1.4,"r":1.8},"women_schooling":{"u":36.6,"r":17.9}} },
  { state: "Uttar Pradesh", v: {"anaemia_women":{"n3":49.9,"n4":52.4,"n5":50.4},"stunting":{"n3":56.8,"n4":46.3,"n5":39.7},"inst_births":{"n3":20.6,"n4":67.8,"n5":83.4},"tfr":{"n3":3.8,"n4":2.7,"n5":2.4},"women_schooling":{"n3":18.3,"n4":32.9,"n5":39.3}}, ur: {"anaemia_women":{"u":50.1,"r":50.5},"stunting":{"u":33.0,"r":41.3},"inst_births":{"u":85.5,"r":82.9},"tfr":{"u":1.9,"r":2.5},"women_schooling":{"u":51.9,"r":35.0}} },
  { state: "Uttarakhand", v: {"anaemia_women":{"n3":54.7,"n4":45.2,"n5":42.6},"stunting":{"n3":44.4,"n4":33.5,"n5":27.0},"inst_births":{"n3":32.6,"n4":68.6,"n5":83.2},"tfr":{"n3":2.6,"n4":2.1,"n5":1.9},"women_schooling":{"n3":33.5,"n4":44.6,"n5":50.4}}, ur: {"anaemia_women":{"u":45.8,"r":41.1},"stunting":{"u":24.3,"r":28.2},"inst_births":{"u":89.4,"r":80.4},"tfr":{"u":1.8,"r":1.9},"women_schooling":{"u":59.4,"r":46.0}} },
  { state: "West Bengal", v: {"anaemia_women":{"n3":63.2,"n4":62.5,"n5":71.4},"stunting":{"n3":44.6,"n4":32.5,"n5":33.8},"inst_births":{"n3":42.0,"n4":75.2,"n5":91.7},"tfr":{"n3":2.3,"n4":1.8,"n5":1.6},"women_schooling":{"n3":15.7,"n4":26.5,"n5":32.9}}, ur: {"anaemia_women":{"u":65.1,"r":74.4},"stunting":{"u":32.1,"r":34.4},"inst_births":{"u":92.3,"r":91.6},"tfr":{"u":1.4,"r":1.7},"women_schooling":{"u":47.6,"r":25.9}} },
];
