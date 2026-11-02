#!/usr/bin/env node
// Tests for the RARA development tracker.
//
//     node scripts/test-rara-tracker.mjs
//
// The tracker's job is not to decide whether a law applies. It is to keep two
// failures visible: a provision that names the subject but carries no control,
// and a provision on the same subject that uses a different word. These tests
// pin both, plus the gate that stops a generic word ("security") from pulling
// in the DPDP Act.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildTracker,
  formatDay,
  inferTopics,
  matchProvision,
  summarizePlaces,
} from '../src/lib/rara/tracker.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEVELOPMENTS = JSON.parse(
  fs.readFileSync(path.join(here, '../src/data/rara/developments.json'), 'utf8'),
);
const LEGAL = JSON.parse(
  fs.readFileSync(path.join(here, '../src/data/rara/legal-texts.json'), 'utf8'),
);
const LEGAL_INSTRUMENTS = JSON.parse(
  fs.readFileSync(path.join(here, '../src/data/rara/legal-instruments.json'), 'utf8'),
);
const DOCUMENTS = JSON.parse(
  fs.readFileSync(path.join(here, '../src/data/rara/legal-documents.json'), 'utf8'),
);
const CASES = JSON.parse(
  fs.readFileSync(path.join(here, '../src/data/rara/legal-cases.json'), 'utf8'),
);

let failures = 0;
let checks = 0;

const check = (name, condition, detail = '') => {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const provision = (id) => {
  const found = LEGAL.texts.find((entry) => entry.id === id);
  if (!found) throw new Error(`No provision ${id}`);
  return found;
};

const read = (title, summary = '') => ({
  title,
  summary,
  topics: inferTopics(`${title} ${summary}`),
});

const match = (title, id, summary = '') => matchProvision(read(title, summary), provision(id));

const bindingInstrumentNames = new Set(
  LEGAL_INSTRUMENTS.instruments
    .filter((entry) => entry.status === 'binding')
    .map((entry) => entry.instrument),
);
const quotedBindingInstrumentNames = new Set(
  LEGAL.texts
    .filter((entry) => bindingInstrumentNames.has(entry.instrument))
    .map((entry) => entry.instrument),
);

// ------------------------------------------------------------------- corpus
console.log('corpus');
check('the legal corpus carries at least 57 exact provisions',
  LEGAL.texts.length >= 57, String(LEGAL.texts.length));
check('the corpus covers at least seventeen binding instruments',
  quotedBindingInstrumentNames.size >= 17, String(quotedBindingInstrumentNames.size));
check('the 2026 synthetic-media rules are in the corpus',
  LEGAL.texts.some((entry) => entry.id.startsWith('IT-RULES-2026-')));
check('the equality and speech floor is in the corpus',
  LEGAL.texts.some((entry) => entry.id === 'CONSTITUTION-ART-14') &&
  LEGAL.texts.some((entry) => entry.id === 'CONSTITUTION-ART-19-1-A'));
check('the SGI prevention duty is in the corpus',
  LEGAL.texts.some((entry) => entry.id === 'IT-RULES-2026-SGI-PREVENT'));
check('the SDF duties and penalty are in the corpus',
  LEGAL.texts.some((entry) => entry.id === 'DPDP-2023-S10') &&
  LEGAL.texts.some((entry) => entry.id === 'DPDP-2023-S33'));
check('the takedown quote explains its amendment marker', (() => {
  const entry = LEGAL.texts.find((text) => text.id === 'IT-RULES-2026-SGI-TAKEDOWN');
  return Boolean(entry && entry.quote.includes('1[three hours]') && entry.quoteNote);
})());
check('the DPDP Rules 2025 are in the corpus',
  LEGAL.texts.some((entry) => entry.instrument === 'Digital Personal Data Protection Rules, 2025'));
check('the Aadhaar, telecom, RBI and SEBI layer is in the corpus',
  ['AADHAAR-2016-S29-1', 'TELECOM-CYBER-2024-R7-1', 'RBI-NBFC-TECH-2026-P6', 'SEBI-CSCRF-2024-GOV']
    .every((id) => LEGAL.texts.some((entry) => entry.id === id)));
check('the ECI deepfake directions are in the corpus',
  ['ECI-AI-2025-LABEL', 'ECI-AI-2025-METADATA', 'ECI-AI-2025-TAKEDOWN', 'ECI-AI-2025-RECORDS']
    .every((id) => LEGAL.texts.some((entry) => entry.id === id)));
check('the ECI direction carries the three-hour takedown',
  LEGAL.texts.find((entry) => entry.id === 'ECI-AI-2025-TAKEDOWN')?.quote.includes('within 3 hours'));
check('the e-commerce amendment is not presented as in force',
  LEGAL.texts.find((entry) => entry.id === 'ECOM-2026-DARK-PATTERNS')?.inForce === 'commences-2027-01-01');
check('the constitutional floor is in the corpus',
  LEGAL.texts.some((entry) => entry.id === 'CONSTITUTION-ART-21'));
check('no instrument repeats a pin cite',
  new Set(LEGAL.texts.map((entry) => `${entry.instrument}|${entry.pinCite}`)).size === LEGAL.texts.length);
{
  const ledger = LEGAL_INSTRUMENTS.instruments;
  const ledgerNames = new Set(ledger.map((entry) => entry.instrument));
  const quotedNames = new Set(LEGAL.texts.map((entry) => entry.instrument));
  const quotedFor = (entry) => LEGAL.texts.filter((text) => text.instrument === entry.instrument).length;
  check('the ledger carries twenty-five instruments', ledger.length === 25, String(ledger.length));
  check('every instrument in the corpus has a ledger entry',
    [...quotedNames].every((name) => ledgerNames.has(name)));
  check('every binding ledger entry carries exact text',
    ledger.filter((entry) => entry.status === 'binding').every((entry) => quotedFor(entry) > 0));
  check('guidance, draft and process instruments carry no exact text',
    ledger.filter((entry) => ['guidance', 'draft', 'process'].includes(entry.status))
      .every((entry) => quotedFor(entry) === 0));
  check('every ledger entry names a type, regulator and scope',
    ledger.every((entry) => entry.type && entry.regulator && entry.scope));
  check('every ledger status is known',
    ledger.every((entry) => ['binding', 'guidance', 'draft', 'process', 'forthcoming'].includes(entry.status)));
  check('the ECI directions are binding, RBI FREE-AI is guidance and IRDAI is process',
    ledger.find((entry) => entry.id === 'ECI-AI-2025')?.status === 'binding' &&
    ledger.find((entry) => entry.id === 'RBI-FREE-AI-2025')?.status === 'guidance' &&
    ledger.find((entry) => entry.id === 'IRDAI-WG-AI-2026')?.status === 'process');
  check('every ledger source is an official host',
    ledger.every((entry) => /(^|\.)(gov\.in|nic\.in|org\.in)$/.test(new URL(entry.sourceUrl).hostname)));
}
check('every provision names its instrument, type and regulator',
  LEGAL.texts.every((entry) => entry.instrument && entry.instrumentType && entry.regulator));
check('no quote carries a doubled space from a PDF extraction',
  LEGAL.texts.every((entry) => !/  /.test(entry.quote)));
check('provision ids are unique',
  new Set(LEGAL.texts.map((entry) => entry.id)).size === LEGAL.texts.length);
check('every provision carries an exact quote of useful length',
  LEGAL.texts.every((entry) => entry.quote.length > 40));
check('every provision names an official source',
  LEGAL.texts.every((entry) => /^https:\/\//.test(entry.sourceUrl)));
check('every source host is an official or government host',
  LEGAL.texts.every((entry) => {
    const host = new URL(entry.sourceUrl).hostname;
    return /(^|\.)(gov\.in|nic\.in|org\.in)$/.test(host);
  }));
check('every provision has a review status and in-force state',
  LEGAL.texts.every((entry) => entry.reviewStatus && entry.inForce));
check('every provision has at least one topic',
  LEGAL.texts.every((entry) => Array.isArray(entry.topics) && entry.topics.length > 0));

console.log('documents');
check('the policy record carries at least thirteen documents',
  DOCUMENTS.documents.length >= 13, String(DOCUMENTS.documents.length));
check('document ids are unique',
  new Set(DOCUMENTS.documents.map((entry) => entry.id)).size === DOCUMENTS.documents.length);
check('every document carries a quote of useful length',
  DOCUMENTS.documents.every((entry) => entry.quote.length > 40));
check('no document quote carries a doubled space',
  DOCUMENTS.documents.every((entry) => !/  /.test(entry.quote)));
check('every document names its issuer, date, type and relevance',
  DOCUMENTS.documents.every((entry) => entry.issuer && entry.date && entry.type && entry.relevance));
check('every document has at least one topic',
  DOCUMENTS.documents.every((entry) => Array.isArray(entry.topics) && entry.topics.length > 0));
check('every document status is known and non-binding',
  DOCUMENTS.documents.every((entry) => ['guidance', 'draft', 'consultation', 'report', 'process'].includes(entry.status)));
check('the RBI FREE-AI report and IRDAI working-group order are in the documents layer',
  ['RBI-FREE-AI-2025', 'IRDAI-WG-AI-2026-ORDER']
    .every((id) => DOCUMENTS.documents.some((entry) => entry.id === id)));
check('the IRDAI document stays a process order, not a report',
  DOCUMENTS.documents.find((entry) => entry.id === 'IRDAI-WG-AI-2026-ORDER')?.status === 'process');
check('every document source is https',
  DOCUMENTS.documents.every((entry) => /^https:\/\//.test(entry.url)));
check('every document source is public or official',
  DOCUMENTS.documents.every((entry) => {
    const host = new URL(entry.url).hostname;
    return /(^|\.)(gov\.in|nic\.in|org\.in)$/.test(host) ||
      host === 'prsindia.org' || host.endsWith('.allahabadhighcourt.in');
  }));
check('the NITI, DPIIT and TRAI layers are present',
  ['NITI-NSAI-2018', 'DPIIT-GENAI-COPYRIGHT-2025', 'TRAI-AI-DRAFT-2026'].every((id) =>
    DOCUMENTS.documents.some((entry) => entry.id === id)));

console.log('cases');
check('the case record carries at least four cases',
  CASES.cases.length >= 4, String(CASES.cases.length));
check('case ids are unique',
  new Set(CASES.cases.map((entry) => entry.id)).size === CASES.cases.length);
check('every case names its court, date, citation and holding',
  CASES.cases.every((entry) => entry.court && entry.date && entry.citation && entry.holding));
check('every case carries a quote of useful length',
  CASES.cases.every((entry) => entry.quote.length > 40));
check('no case quote carries a doubled space',
  CASES.cases.every((entry) => !/  /.test(entry.quote)));
check('every case has a pin cite and topics',
  CASES.cases.every((entry) => entry.pinCite && Array.isArray(entry.topics) && entry.topics.length > 0));
check('every case status is final or interim',
  CASES.cases.every((entry) => ['final', 'interim'].includes(entry.status)));
check('every case source is a court host',
  CASES.cases.every((entry) => /(^|\.)(gov\.in|nic\.in)$/.test(new URL(entry.url).hostname)));
check('the privacy and AI-training cases are present',
  CASES.cases.some((entry) => entry.id === 'PUTTASWAMY-2017') &&
  CASES.cases.some((entry) => entry.id === 'ANI-OPENAI-2026'));
check('the training case stays an interim order',
  CASES.cases.find((entry) => entry.id === 'ANI-OPENAI-2026')?.status === 'interim');

console.log('snapshot');
check('the development snapshot has items', DEVELOPMENTS.items.length >= 50, String(DEVELOPMENTS.items.length));
check('the snapshot records its sources', DEVELOPMENTS.sources.length >= 5);
check('every development has a title, date, URL and source',
  DEVELOPMENTS.items.every((item) => item.title && item.publishedAt && item.url && item.sourceId));
check('every development is tagged primary or secondary',
  DEVELOPMENTS.items.every((item) => item.tier === 'primary' || item.tier === 'secondary'));
check('papers and primary sources are the majority of the feed',
  DEVELOPMENTS.items.filter((item) => item.tier === 'primary').length * 2 > DEVELOPMENTS.items.length,
  `${DEVELOPMENTS.items.filter((item) => item.tier === 'primary').length} of ${DEVELOPMENTS.items.length}`);
check('every development carries a place key, even when it is null',
  DEVELOPMENTS.items.every((item) => 'place' in item));
check('every development has a topic array',
  DEVELOPMENTS.items.every((item) => Array.isArray(item.topics)));
check('development ids are unique',
  new Set(DEVELOPMENTS.items.map((item) => item.id)).size === DEVELOPMENTS.items.length);
check('the source health counts add up to the snapshot',
  DEVELOPMENTS.sources.reduce((sum, source) => sum + source.count, 0) >= DEVELOPMENTS.items.length);

// ------------------------------------------------------------------ matcher
console.log('matcher');
{
  const topics = inferTopics('A zero-shot voice clone used to spoof vKYC verification.');
  check('a voice clone is tagged identity and synthetic media',
    topics.includes('identity') && topics.includes('synthetic-media'),
    topics.join(', '));
  check('a code-security note is not tagged as personal data',
    !inferTopics('A security audit of the codebase.').includes('personal-data'));
  check('a dark-pattern note is tagged consumer',
    inferTopics('A checkout dark pattern').includes('consumer'));
}

{
  const deepfake = match('AI deepfake video of a minister', 'BNS-2023-S319-1');
  check('a deepfake is silent against the word “personation”', deepfake.status === 'silent', deepfake.status);
  check('the deepfake provision is marked gated, so it can be shown as nearest',
    deepfake.gated === true);
  check('the nearest fit names the law’s word, not the development’s',
    deepfake.provisionTerms.includes('personation') && deepfake.developmentTerms.includes('deepfake'),
    `law: ${deepfake.provisionTerms.join(', ')} / dev: ${deepfake.developmentTerms.join(', ')}`);
  check('silence does not manufacture a shared word', deepfake.namedTerms.length === 0);
}

{
  const copyright = match('A copyright dispute over training data', 'COPYRIGHT-1957-S52-1-A');
  check('a copyright development finds the explicit copyright hook',
    copyright.status === 'explicit', copyright.status);
  check('the copyright match names the shared word', copyright.namedTerms.includes('copyright'),
    copyright.namedTerms.join(', '));
  check('the copyright match carries a control marker', copyright.controlTerms.length > 0);
}

{
  const security = match('A security audit of the codebase', 'DPDP-2023-S8-5');
  check('a generic security note does not match the DPDP security safeguard',
    security.status === 'silent' && security.gated === false, security.status);
  check('a non-gated provision carries no named terms', security.namedTerms.length === 0);
}

{
  const breach = match('A personal data breach at a bank', 'DPDP-2023-S8-6');
  check('a personal data breach matches the breach-intimation provision',
    breach.status === 'explicit', breach.status);
  check('the breach match names the shared phrase',
    breach.namedTerms.some((term) => term.includes('personal data') || term.includes('data breach')),
    breach.namedTerms.join(', '));
}

{
  const algorithm = match('A patent claim for a scheduling algorithm', 'PATENTS-1970-S3-K');
  check('an algorithm claim names the patent exclusion', algorithm.status === 'mentions', algorithm.status);
  check('a mention without a control marker is not called explicit',
    algorithm.status === 'mentions' && algorithm.namedTerms.includes('algorithm'));
}

{
  const pricing = match('A cartel that fixes prices for cloud compute', 'COMPETITION-2002-S3-3-A');
  check('a price-fixing development names the price-fixing clause',
    pricing.status === 'mentions', pricing.status);
  check('the price-fixing match names “prices”',
    pricing.namedTerms.includes('prices'), pricing.namedTerms.join(', '));
  check('a clause that names a subject without a control is not called explicit',
    pricing.controlTerms.length === 0);
}

// --------------------------------------------------------------- geography
console.log('geography');
{
  const places = summarizePlaces(DEVELOPMENTS.items);
  check('placed and unplaced account for every development',
    places.placed + places.unplaced === DEVELOPMENTS.items.length,
    `${places.placed} + ${places.unplaced} of ${DEVELOPMENTS.items.length}`);
  check('at least one country is placed', places.placed > 0);
  check('countries are ordered by count',
    places.countries.every((entry, index) => index === 0 || places.countries[index - 1].count >= entry.count));
  check('every placed country carries an ISO code and a country name',
    places.countries.every((entry) => /^[A-Z]{2}$/.test(entry.iso) && entry.country));
  check('papers are not guessed onto the map',
    DEVELOPMENTS.items
      .filter((item) => item.sourceId.startsWith('arxiv-'))
      .every((item) => item.place === null));
}

// ------------------------------------------------------------------- tracker
console.log('tracker');
{
  const tracker = buildTracker(DEVELOPMENTS.items, LEGAL.texts);
  check('the tracker reads every development', tracker.total === DEVELOPMENTS.items.length);
  check('the coverage counts add up',
    tracker.counts.explicit + tracker.counts.mentions + tracker.counts.silent === tracker.total);
  check('every explicit item has an explicit match',
    tracker.items
      .filter((item) => item.coverage === 'explicit')
      .every((item) => item.matches.some((entry) => entry.status === 'explicit')));
  check('every explicit match has a shared word and a control marker',
    tracker.items
      .flatMap((item) => item.matches)
      .filter((entry) => entry.status === 'explicit')
      .every((entry) => entry.namedTerms.length > 0 && entry.controlTerms.length > 0));
  check('no nearest fit claims a shared word',
    tracker.items
      .flatMap((item) => item.nearest)
      .every((entry) => entry.namedTerms.length === 0));
  check('the tracker never returns more than three matches per development',
    tracker.items.every((item) => item.matches.length <= 3));
  check('the tracker never returns more than two nearest provisions',
    tracker.items.every((item) => item.nearest.length <= 2));
}

check('formatDay reads an ISO date', /2026|2025/.test(formatDay('2026-10-29T00:00:00Z')));
check('formatDay does not invent a date for bad input',
  formatDay('not a date') === 'date not stated');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} failed`);
  process.exit(1);
}
