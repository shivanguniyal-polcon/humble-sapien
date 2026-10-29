#!/usr/bin/env node
// Tests for RARA's ported engine and the committed corpus snapshot.
//
//     node scripts/test-rara.mjs
//
// The engine decides whether a capability is a statutory collision, a lag or
// safe harbour, so its behaviour is pinned here: the triage must fire on the
// capability the corpus describes, must not manufacture a vacuum when nothing
// matches, and must always return provisions in descending relevance.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTriage, detectVacuums, tokenize } from '../src/lib/rara.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const RARA = JSON.parse(fs.readFileSync(path.join(here, '../src/data/rara.json'), 'utf8'));

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

// ---------------------------------------------------------------- the corpus
console.log('corpus');
check('16 statutory pillars ship', RARA.statutes.length === 16, String(RARA.statutes.length));
check('9 vacuum domains ship', RARA.vacuums.length === 9, String(RARA.vacuums.length));
check('the counts in the file agree with the rows',
  RARA.counts.statutes === RARA.statutes.length && RARA.counts.vacuums === RARA.vacuums.length);
check('statute ids are unique', new Set(RARA.statutes.map((s) => s.id)).size === RARA.statutes.length);
check('vacuum ids are unique', new Set(RARA.vacuums.map((v) => v.id)).size === RARA.vacuums.length);
check('every statute carries keywords to match on',
  RARA.statutes.every((s) => Array.isArray(s.keywords) && s.keywords.length >= 6));
check('every statute names its regulator, lag and remedy',
  RARA.statutes.every((s) => s.ministryRegulator && s.policyLag && s.remedy));
check('every vacuum carries triggers and a benchmark',
  RARA.vacuums.every((v) => v.triggers.length > 0 && v.benchmark && v.status));

// ------------------------------------------------------------------ the scan
console.log('triage');
{
  const voice = runTriage(RARA,
    'Real-time zero-shot voice cloning from three seconds of audio, released as unwatermarked open weights that can spoof vKYC verification.');
  check('a voice-cloning capability is a red breach', voice.status === 'RED', voice.status);
  check('its severity clears the red threshold', voice.severity >= 7.5, String(voice.severity));
  check('it surfaces the personation provision',
    voice.matches.some((m) => m.entry.id === 'IT-ACT-2000-S66C-66D'),
    voice.matches.map((m) => m.entry.id).join(', '));
  check('it flags open-weight distribution as a vacuum',
    voice.vacuums.some((v) => v.vac.id === 'VAC-IND-02'),
    voice.vacuums.map((v) => v.vac.id).join(', '));
  check('every match explains itself', voice.matches.every((m) => m.evidence.length > 20));
  check('every match carries the corpus text for its remedy',
    voice.matches.every((m) => m.entry.remedy && m.entry.policyLag));

  const safe = runTriage(RARA,
    'A differential privacy mechanism with an explainable model card and an independent fairness audit.');
  check('a safeguarded capability reads green', safe.status === 'GREEN', safe.status);
  check('a green reading still cites what it checked', safe.matches.length > 0);

  const compute = runTriage(RARA,
    'Pretraining a 405b parameter frontier model on a new cluster, with no pre-deployment evaluation.');
  check('frontier compute flags the compute vacuum',
    compute.vacuums.some((v) => v.vac.id === 'VAC-IND-01'),
    compute.vacuums.map((v) => v.vac.id).join(', '));

  const dull = runTriage(RARA, 'The weather in Pune tomorrow.');
  check('unrelated text is not a red breach', dull.status !== 'RED', dull.status);
  check('unrelated text invents no vacuum', dull.vacuums.length === 0,
    dull.vacuums.map((v) => v.vac.id).join(', '));

  const empty = runTriage(RARA, '   ');
  check('empty input returns nothing rather than a guess', empty.empty === true && empty.matches.length === 0);

  check('never more than two provisions', voice.matches.length <= 2, String(voice.matches.length));
  check('never more than two vacuums', voice.vacuums.length <= 2, String(voice.vacuums.length));
  check('scores descend', voice.matches.every((m, i) => i === 0 || voice.matches[i - 1].score >= m.score));
  check('severity stays inside its floor and ceiling',
    [voice, safe, compute, dull].every((r) => r.severity >= 3 && r.severity <= 9.8));
}

// --------------------------------------------------------------- the anatomy
console.log('engine');
check('tokenizer keeps alphanumerics and drops punctuation',
  tokenize('DPDP §3(c)(ii), 2023!').join(' ') === 'dpdp 3 c ii 2023',
  tokenize('DPDP §3(c)(ii), 2023!').join(' '));
{
  const r = runTriage(RARA, 'A voice clone of a minister endorsing a product.');
  check('a keyword hit is named in the evidence',
    r.matches.some((m) => /voice clon/i.test(m.evidence)),
    r.matches.map((m) => m.evidence).join(' | '));
}
{
  const flagged = detectVacuums(RARA.vacuums, 'An abliterated uncensored model released as open weights.', 5);
  check('the vacuum detector ranks the closest domain first',
    flagged[0]?.vac.id === 'VAC-IND-02', flagged.map((f) => f.vac.id).join(', '));
  check('the detector honours its cap', detectVacuums(RARA.vacuums, 'frontier pretraining abliterated bci', 1).length === 1);
  check('a trigger inside another word does not fire',
    !detectVacuums(RARA.vacuums, 'Unwatermarked audio of a minister.', 5)
      .some((f) => f.vac.id === 'VAC-IND-08'),
    'water matched inside unwatermarked');
  check('a real water-and-cooling text does fire the data-centre vacuum',
    detectVacuums(RARA.vacuums, 'A hyperscale data centre with cooling and water use.', 5)
      .some((f) => f.vac.id === 'VAC-IND-08'));
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} failed`);
  process.exit(1);
}
