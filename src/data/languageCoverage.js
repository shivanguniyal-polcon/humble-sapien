// What the language lens can actually prove.
//
// Each row is one instrument in the timeline's catalogue that has an official
// text in a scheduled language, checked against the Legislative Department's
// published texts. A row is evidence of presence only: absence from this file
// means the ledger has no verified text, not that no translation exists. The
// India Code catalogue carries no language field at all, so the timeline
// cannot make the stronger claim without inventing it.
//
// Source: Legislative Department, Ministry of Law and Justice (legislative.gov.in).
// The 21 Tamil Acts are the Department's own PDF texts; the Malayalam Railway
// Property Act is its own PDF text; the Constitution is published in all 22
// scheduled languages.

import { LANGUAGES } from './languages.js';

const ALL_LANGUAGES = LANGUAGES.map((entry) => entry.code);
const TAMIL_SOURCE = 'Legislative Department · official Tamil text';
const MALAYALAM_SOURCE = 'Legislative Department · official Malayalam text';

export const COVERAGE_CHECKED = '2026-10-31';

export const COVERAGE_SOURCE_URL = 'https://www.legislative.gov.in/documents/publications';

export const COVERAGE_NOTE =
  "Verified against the Legislative Department's published official texts. India Code's catalogue records no language field, so a square without a verified text is unrecorded here — not a finding that no translation exists.";

export const COVERAGE_SCOPE =
  'Central Acts and the Constitution. State legislation is outside this ledger.';

// The exact `title` and `year` matter: the lens resolves these rows against
// stateOutputInstruments.js by identity, not by a fuzzy search. A regenerated
// catalogue that renames a record must fail the coverage test rather than
// quietly lighting the wrong square.
export const COVERAGE = [
  {
    year: 1949,
    kind: 0,
    juris: 1,
    title: 'The Constitution of India',
    languages: ALL_LANGUAGES,
    source: 'Legislative Department · official texts in 22 languages',
    url: 'https://www.legislative.gov.in/documents/constitution-of-india-in-regional-languages-2/',
  },
  {
    year: 2006,
    kind: 0,
    juris: 0,
    title: 'The Andhra Pradesh Legislative Council Act, 2005',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/1c1ba2130fea4b9d68cc4cc09379a842.pdf',
  },
  {
    year: 2013,
    kind: 0,
    juris: 0,
    title: 'The National Food Security Act, 2013',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/e01347d4192069cd694c121857feb10e.pdf',
  },
  {
    year: 2012,
    kind: 0,
    juris: 0,
    title: 'The Protection of Children from Sexual Offences Act, 2012',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/76ebc3ff2203fab4b9365fe850f423c5.pdf',
  },
  {
    year: 2007,
    kind: 0,
    juris: 0,
    title: 'The Maintenance and Welfare of Parents and Senior Citizens Act, 2007',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/26e51a50c3d7b0a874af1b374352968c.pdf',
  },
  {
    year: 2005,
    kind: 0,
    juris: 0,
    title: 'The Disaster Management Act, 2005',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/3c3f904d039d78d931cb24f41daf4c90.pdf',
  },
  {
    year: 2005,
    kind: 0,
    juris: 0,
    title: 'The State Emblem of India (Prohibition of Improper Use) Act, 2005',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/585c143d257dbebb046dd4cadf4f1c91.pdf',
  },
  {
    year: 2005,
    kind: 0,
    juris: 0,
    title: 'The Special Economic Zones Act, 2005',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/e4ce0ff7787a5be216dcb54f0321a72a.pdf',
  },
  {
    year: 1999,
    kind: 0,
    juris: 0,
    title: 'The Geographical Indications of Goods (Registration and Protection) Act, 1999',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/ee4df75c1a06d6a36ec2b4eb9d392225.pdf',
  },
  {
    year: 1998,
    kind: 0,
    juris: 0,
    title: 'The Lotteries (Regulation) Act, 1998',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/efc14d6aabb351cd59bf27f13d8b166a.pdf',
  },
  {
    year: 1962,
    kind: 0,
    juris: 0,
    title: 'The Petroleum and Minerals Pipelines (Acquisition of Right of User in Land) Act, 1962',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/cce7cf2066c68ef21a4ea4bc61248a39.pdf',
  },
  {
    year: 2020,
    kind: 0,
    juris: 0,
    title: 'The Transgender Persons (Protection of Rights) Act, 2019.',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/b91e465875d557635e2a340780a2424f.pdf',
  },
  {
    year: 2016,
    kind: 0,
    juris: 0,
    title: 'The Rights of Persons with Disabilities Act, 2016.',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/372ad1b28a7c3a0cc8b17e56ebba4b49.pdf',
  },
  {
    year: 2012,
    kind: 0,
    juris: 0,
    title: 'The Rajiv Gandhi National Institute of Youth Development Act, 2012',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/86e7d46af163be38c0ea25e1dff41a92.pdf',
  },
  {
    year: 2013,
    kind: 0,
    juris: 0,
    title: 'The Rajiv Gandhi National Aviation University Act, 2013',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/0f388d23717e0570744644bedc970270.pdf',
  },
  {
    year: 2018,
    kind: 0,
    juris: 0,
    title: 'The National Sports University Act, 2018',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/33a7f5e70171f9f7290e3c936ce5fa15.pdf',
  },
  {
    year: 2019,
    kind: 0,
    juris: 0,
    title:
      'The National Capital Territory of Delhi (Recognition of Property Rights of Residents in Unauthorised Colonies) Act, 2019',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/8dfe1c3dffd115d6f6bcf04b07e1deb1.pdf',
  },
  {
    year: 2017,
    kind: 0,
    juris: 0,
    title:
      'The Human Immunodeficiency Virus and Acquired Immune Deficiency Syndrome (Prevention and Control) Act, 2017',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/599227d7460a15ebb9f942cb92dd694d.pdf',
  },
  {
    year: 2020,
    kind: 0,
    juris: 0,
    title: 'The Jammu and Kashmir Official Languages Act, 2020.',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/ed1c264e7afd53326eeb28370f791537.pdf',
  },
  {
    year: 2017,
    kind: 0,
    juris: 0,
    title: 'The Footwear Design and Development Institute Act, 2017',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/fc7491b489b881c61e8720fce2c2c70f.pdf',
  },
  {
    year: 2019,
    kind: 0,
    juris: 0,
    title:
      'The Dadra and Nagar Haveli and Daman and Diu (Merger of Union territories) Act, 2019',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/357149ed9470871ee41c50c6716baf90.pdf',
  },
  {
    year: 2019,
    kind: 0,
    juris: 0,
    title:
      'The Prohibition of Electronic Cigarettes (Production, Manufacture, Import, Export, Transport, Sale, Distribution, Storage and Advertisement) Act, 2019',
    languages: ['ta'],
    source: TAMIL_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/7f2d85c41abe67ebe8ba33b790d59295.pdf',
  },
  {
    year: 1966,
    kind: 0,
    juris: 0,
    title: 'The Railway Property (Unlawful Possession) Act, 1966',
    languages: ['ml'],
    source: MALAYALAM_SOURCE,
    url: 'https://www.legislative.gov.in/static/uploads/2025/08/4acacc03edc3bed5ac71ee557b95554f.pdf',
  },
];
