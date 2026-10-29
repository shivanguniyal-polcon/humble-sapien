#!/usr/bin/env node
// Tests for the research library's download buttons.
//
//     node scripts/test-research-downloads.mjs
//
// A download button is a promise. Either it hands over the artefact the
// entry describes, or the entry carries a gap note that says why it cannot.
// It must never hand over a sentence saying the data lives somewhere else.
//
// The files under public/research are generated from the same modules the
// pages render, so these checks are about the shipped bytes: the file exists,
// it is the format the entry claims, and its contents still match the source
// data. The readability study is hashed separately, in test-datapoint.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publications } from '../src/data/publications.js';
import series from '../src/data/datasets.json' with { type: 'json' };
import { sectors } from '../src/data/sectors.js';
import { datasets as openDatasets, LICENSES } from '../src/data/opendata.js';
import { escalation } from '../src/data/escalation.js';
import { JURISDICTIONS } from '../src/lib/legal/glossary.js';
import { promises } from '../src/data/promises.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PUBLIC = path.join(ROOT, 'public');
const RESEARCH = path.join(PUBLIC, 'research');

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

const readText = (file) => fs.readFileSync(file, 'utf8');
const readJson = (file) => JSON.parse(readText(file));

// ---------------------------------------------------------- every download
console.log('download entries');
const linked = new Set();
const withGap = [];

for (const pub of publications) {
  for (const download of pub.downloads || []) {
    if (download.gap) {
      withGap.push({ pub, download });
      check(`${pub.id}: the gap for ${download.name} is a real explanation`, download.gap.length >= 60);
      check(`${pub.id}: the gap for ${download.name} has no dead link`, !download.href);
      continue;
    }

    check(`${pub.id}: ${download.name} has an href`, typeof download.href === 'string' && download.href.length > 0);
    if (!download.href) continue;

    check(`${pub.id}: ${download.name} stays inside the site`, download.href.startsWith('/research/'), download.href);
    const file = path.join(PUBLIC, download.href.replace(/^\//, ''));
    check(`${pub.id}: ${download.name} exists on disk`, fs.existsSync(file), download.href);
    if (!fs.existsSync(file)) continue;

    linked.add(path.resolve(file));
    const bytes = fs.statSync(file).size;
    check(`${pub.id}: ${download.name} is not an empty placeholder`, bytes > 200, `${bytes} bytes`);
    check(
      `${pub.id}: ${download.name} uses the extension its kind claims`,
      (download.kind === 'json' && file.endsWith('.json')) ||
        (download.kind === 'csv' && file.endsWith('.csv')) ||
        (download.kind === 'text' && file.endsWith('.txt')),
      `${download.kind} / ${path.basename(file)}`,
    );
    check(
      `${pub.id}: ${download.name} is named after the file it serves`,
      path.basename(file) === download.name,
      `${download.name} / ${path.basename(file)}`,
    );

    const text = readText(file);
    check(
      `${pub.id}: ${download.name} is not a pointer note`,
      !/ships with the THS Data Commons|this is a pointer|placeholder download|available on request/i.test(text),
    );
  }
}

check('at least one entry uses a gap note instead of a fake file', withGap.length >= 1, `${withGap.length}`);

const onDisk = fs.existsSync(RESEARCH)
  ? fs.readdirSync(RESEARCH).map((name) => path.resolve(RESEARCH, name))
  : [];
check('every generated research file is linked from an entry', onDisk.every((file) => linked.has(file)), onDisk.filter((f) => !linked.has(f)).join(', '));
check('no download link is missing its file', linked.size === onDisk.length, `${linked.size} linked, ${onDisk.length} on disk`);

// --------------------------------------------------------------- the files
console.log('file contents');
const asset = (name) => path.join(RESEARCH, name);

{
  const file = readJson(asset('ths_policy_atlas.json'));
  const total = file.sectors.reduce((n, sector) => n + sector.north.length + sector.south.length, 0);
  check('the atlas file carries 15 sectors', file.sectors.length === sectors.length, `${file.sectors.length}`);
  check('the atlas file carries all 90 policies', total === 90, `${total}`);
  check(
    'the atlas file matches the current sector data',
    JSON.stringify(file.sectors) === JSON.stringify(sectors),
    'run npm run build:research to regenerate it',
  );
  check(
    'every atlas policy still carries all three distributional answers',
    file.sectors.every((sector) =>
      [...sector.north, ...sector.south].every(
        (policy) => policy.pit?.benefits && policy.pit?.pays && policy.pit?.missing,
      ),
    ),
  );
  check('the atlas file names its sources', Array.isArray(file.sources) && file.sources.length >= 5);
}

{
  const file = readJson(asset('ths_open_data_directory.json'));
  check('the open-data file carries all 29 datasets', file.datasets.length === openDatasets.length, `${file.datasets.length}`);
  check(
    'the open-data file matches the current directory',
    JSON.stringify(file.datasets) === JSON.stringify(openDatasets),
    'run npm run build:research to regenerate it',
  );
  check(
    'the open-data file carries a valid licence label on every row',
    file.datasets.every((row) => Object.hasOwn(LICENSES, row.license)),
  );
  check('the open-data file carries the 15 sector filters', file.sectors.length === 16, `${file.sectors.length}`);
}

{
  const file = readJson(asset('ths_escalation_directory.json'));
  const keys = Object.keys(file.schemes);
  const steps = Object.values(file.schemes).reduce(
    (n, touchpoints) => n + touchpoints.reduce((m, t) => m + t.steps.length, 0),
    0,
  );
  check('the escalation file carries both schemes', keys.includes('pmjay') && keys.includes('sbm'), keys.join(', '));
  check('the escalation file carries all 21 steps', steps === 21, `${steps}`);
  check(
    'the escalation file matches the current directory',
    JSON.stringify(file.schemes) === JSON.stringify(escalation),
    'run npm run build:research to regenerate it',
  );
  check(
    'every escalation step says whether its contact was verified',
    Object.values(file.schemes).every((touchpoints) =>
      touchpoints.every((touchpoint) =>
        touchpoint.steps.every((step) => typeof step.verified === 'boolean' && step.source),
      ),
    ),
  );
}

{
  const file = readJson(asset('ths_simplify_rules.json'));
  const phrases = file.jurisdictions.reduce((n, jurisdiction) => n + jurisdiction.phrases.length, 0);
  check('the simplifier file carries all six jurisdictions', file.jurisdictions.length === JURISDICTIONS.length, `${file.jurisdictions.length}`);
  check('the simplifier file carries the whole substitution dictionary', phrases === 475, `${phrases}`);
  check(
    'every simplification phrase has a source phrase, a replacement field and a risk flag',
    file.jurisdictions.every((jurisdiction) =>
      jurisdiction.phrases.every(
        (phrase) =>
          typeof phrase.from === 'string' &&
          phrase.from.length > 0 &&
          typeof phrase.to === 'string' &&
          Boolean(phrase.risk),
      ),
    ),
  );
}

{
  const text = readText(asset('ths_pmjay_series.csv'));
  const lines = text.trim().split('\n');
  const header = lines[0];
  check('the PM-JAY series has a header', header === 'date,admissions_crore,cards_crore,hospitals_count,treatment_value_crore', header);
  check('the PM-JAY series has every milestone date', lines.length === 12, `${lines.length} lines`);
  check(
    'the PM-JAY series keeps five columns on every row',
    lines.every((line) => line.split(',').length === 5),
  );

  const seriesKeys = Object.keys(series.pmjay_series);
  const dates = [...new Set(Object.values(series.pmjay_series).flatMap((rows) => rows.map((row) => row.d)))].sort();
  const lookup = Object.fromEntries(
    seriesKeys.map((key) => [key, new Map(series.pmjay_series[key].map((row) => [row.d, row.v]))]),
  );
  const expected = dates.map((date) => [date, ...seriesKeys.map((key) => lookup[key].get(date) ?? '')].map(String));
  const actual = lines.slice(1).map((line) => line.split(','));
  check(
    'the PM-JAY series values match the current dataset',
    JSON.stringify(actual) === JSON.stringify(expected),
    'run npm run build:research to regenerate it',
  );
}

{
  const text = readText(asset('ths_pmjay_states.csv'));
  const lines = text.trim().split('\n');
  check('the state admissions file has a header', lines[0] === 'state_or_ut,financial_year,authorised_admissions', lines[0]);
  check(
    'the state admissions file carries every row',
    lines.length === series.pmjay_states.length + 1,
    `${lines.length} lines, ${series.pmjay_states.length} rows expected`,
  );
  check(
    'every state admissions row has three columns',
    lines.every((line) => line.split(',').length === 3),
  );
  check(
    'the state admissions values match the current dataset',
    JSON.stringify(lines.slice(1).map((line) => line.split(','))) ===
      JSON.stringify(series.pmjay_states.map((row) => [row.s, row.fy, String(row.a)])),
    'run npm run build:research to regenerate it',
  );
}

{
  const text = readText(asset('ths_promise_evidence.txt'));
  check('the promise file states the status vocabulary', text.includes('Status vocabulary:'));
  for (const promise of promises) {
    check(`the promise file carries “${promise.promise.slice(0, 42)}…”`, text.includes(promise.promise));
  }
  const urls = promises.flatMap((promise) => promise.evidence.map(([, , url]) => url));
  check('the promise file carries every evidence URL', urls.filter((url) => !text.includes(url)).length === 0);
}

{
  const dpi = readText(asset('ths_dpi_corridor_sources.txt'));
  const sprawl = readText(asset('ths_sprawl_sources.txt'));
  check('the DPI source list carries its first source', dpi.includes('NPCI, UPI product statistics'));
  check('the sprawl source list carries its first source', sprawl.includes('PIB (29 May 2025)'));
  check('the source lists say what they are not', dpi.includes('not a promise that an uncollected dataset is available') || dpi.includes('source list itself'));
}

{
  const monitor = readText(asset('ths_monitor_precision_summary.txt'));
  check('the monitor summary carries the measured precision', monitor.includes('92.1%'));
  check('the monitor summary names the withheld layer', monitor.includes('row-level holdout labels are') && monitor.includes('not offered'));
}

// -------------------------------------------------------- special entries
console.log('special entries');
const byId = new Map(publications.map((pub) => [pub.id, pub]));
const parliament = byId.get('parliament-questions');
check('the parliamentary-questions entry has no fake download button', parliament.downloads.every((download) => download.gap));
check('the gap says the corpus is not held here', /not held in this repository/i.test(parliament.downloads[0].gap));

const study = byId.get('ai-policy-readability');
check('the readability study is routed to its own page', study.study === 'readability');
check(
  'the readability study downloads are real files, not entry-level links',
  study.downloads.length === 0,
  'the study page owns its downloads',
);
const studyManifest = path.join(ROOT, 'articles', 'datapoint-ai-policy-readability', 'data', 'manifest.json');
check('the readability study manifest exists', fs.existsSync(studyManifest));
if (fs.existsSync(studyManifest)) {
  const manifest = readJson(studyManifest);
  check('the study manifest hashes every file the page offers', manifest.files.length === 8, `${manifest.files.length}`);
  check(
    'every study file listed by the manifest is on disk',
    manifest.files.every((file) =>
      fs.existsSync(path.join(ROOT, 'articles', 'datapoint-ai-policy-readability', file.path)),
    ),
  );
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
