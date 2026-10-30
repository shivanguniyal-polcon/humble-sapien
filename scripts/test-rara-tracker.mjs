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

// ------------------------------------------------------------------- corpus
console.log('corpus');
check('the legal corpus is not empty', LEGAL.texts.length >= 18, String(LEGAL.texts.length));
check('the corpus covers at least six instruments',
  new Set(LEGAL.texts.map((entry) => entry.instrument)).size >= 6);
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
