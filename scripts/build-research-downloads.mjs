#!/usr/bin/env node
// Writes the real files behind the research-library download buttons.
//
//     node scripts/build-research-downloads.mjs
//
// The old library generated a pointer file in the browser: a text sentence
// saying the data shipped elsewhere. These files carry the artefact itself.
// Where the repository does not hold the raw source (the parliamentary
// question corpus), the library entry carries a gap note instead and no file
// is written here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publications } from '../src/data/publications.js';
import datasets from '../src/data/datasets.json' with { type: 'json' };
import { sectors, sectorSources, atlasNote } from '../src/data/sectors.js';
import {
  LICENSES,
  datasets as openDatasets,
  directorySectors,
  licenseLaw,
} from '../src/data/opendata.js';
import { escalation } from '../src/data/escalation.js';
import { DICTIONARY_VERSION, JURISDICTIONS } from '../src/lib/legal/glossary.js';
import { promises, promiseSources, STATUS_LABELS } from '../src/data/promises.js';
import {
  KINDS,
  JURIS,
  AMENDMENTS,
  RTI,
  STEPS,
  MILESTONES,
  CATALOGUE_NOTE,
} from '../src/data/stateOutput.js';
import { INSTRUMENTS } from '../src/data/stateOutputInstruments.js';
import { csvCell } from '../src/lib/csv.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'public', 'research');
fs.mkdirSync(OUT, { recursive: true });

const byId = new Map(publications.map((pub) => [pub.id, pub]));

const write = (name, contents) => {
  fs.writeFileSync(path.join(OUT, name), contents);
  console.log(`wrote ${name} (${Buffer.byteLength(contents)} bytes)`);
};
const csv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';

const sourceText = (id, title) => {
  const pub = byId.get(id);
  if (!pub) throw new Error(`unknown publication: ${id}`);
  return [
    title,
    '='.repeat(title.length),
    '',
    `${pub.title} — ${pub.author}, ${pub.date}`,
    '',
    'The citations below are the published receipts for this work.',
    '',
    ...pub.citations.map((citation, index) => `${index + 1}. ${citation}`),
    '',
    'This file is the source list itself. No row-level dataset is offered with',
    'it; where one exists, the library entry links it separately.',
    '',
  ].join('\n');
};

// ---------------------------------------------------------------- PM-JAY
{
  const series = datasets.pmjay_series;
  const dates = [...new Set(Object.values(series).flatMap((rows) => rows.map((row) => row.d)))]
    .sort();
  const keys = Object.keys(series);
  const lookup = Object.fromEntries(
    keys.map((key) => [key, new Map(series[key].map((row) => [row.d, row.v]))]),
  );
  write(
    'ths_pmjay_series.csv',
    csv(
      ['date', ...keys],
      dates.map((date) => [date, ...keys.map((key) => lookup[key].get(date) ?? '')]),
    ),
  );
}

{
  write(
    'ths_pmjay_states.csv',
    csv(
      ['state_or_ut', 'financial_year', 'authorised_admissions'],
      datasets.pmjay_states.map((row) => [row.s, row.fy, row.a]),
    ),
  );
}

// ------------------------------------------------------- state output
// The State's Output, 1947–2026: every instrument as a named row, per-year
// aggregates derived from those same rows (never maintained twice), and the
// curated RTI and open-data series with their scopes and sources.
{
  const crawledAt = '2026-10-27';
  const rows = [];
  const perYear = new Map();
  for (const [year, kind, juris] of INSTRUMENTS) {
    const id = `${KINDS[kind].id}:${JURIS[juris].id}`;
    const key = `${year}|${id}`;
    perYear.set(key, (perYear.get(key) || 0) + 1);
  }
  for (const [key, value] of [...perYear].sort()) {
    const [year, id] = key.split('|');
    const [kindId, jurisId] = id.split(':');
    const kind = KINDS.find((k) => k.id === kindId);
    const juris = JURIS.find((j) => j.id === jurisId);
    rows.push([
      year,
      id,
      value,
      `${kind.label} issued under ${juris.label} jurisdiction, as catalogued by India Code and deduplicated`,
      'India Code (indiacode.gov.in) catalogue crawl, October 2026',
      crawledAt,
      Number(year) >= 2026 ? 'true' : 'false',
    ]);
  }

  const amendmentYears = new Map();
  for (const [, date] of AMENDMENTS) {
    const year = Number(date.slice(0, 4));
    amendmentYears.set(year, (amendmentYears.get(year) || 0) + 1);
  }
  for (const [year, value] of [...amendmentYears].sort((a, b) => a[0] - b[0])) {
    rows.push([
      year,
      'constitutional-amendment:central',
      value,
      'Constitution amendment Acts by date of enforcement',
      'Legislative Department list of all 106 amendments (checked October 2026)',
      crawledAt,
      'false',
    ]);
  }

  for (const r of RTI) {
    rows.push([Number(r.fy.slice(0, 4)), 'rti:received', r.received, r.scope, r.source, r.fy, 'false']);
    if (r.rejected != null) {
      rows.push([Number(r.fy.slice(0, 4)), 'rti:rejected', r.rejected, r.scope, r.source, r.fy, 'false']);
    }
  }

  for (const s of STEPS) {
    rows.push([Number(s.date.slice(0, 4)), 'open-data:resources', s.value, s.scope, s.source, s.date, 'false']);
  }

  write(
    'ths_state_output_series.csv',
    csv(['year', 'series', 'value', 'scope', 'source', 'date', 'provisional'], rows),
  );
  write(
    'ths_state_output_instruments.csv',
    csv(
      ['year', 'jurisdiction', 'kind', 'name'],
      INSTRUMENTS.map(([year, kind, juris, name]) => [year, JURIS[juris].id, KINDS[kind].id, name]),
    ),
  );
}

// ---------------------------------------------------------------- Atlas
{
  write(
    'ths_policy_atlas.json',
    `${JSON.stringify(
      {
        title: 'THS Policy Atlas',
        note: atlasNote,
        sources: sectorSources,
        sectors,
      },
      null,
      2,
    )}\n`,
  );
}

// ------------------------------------------------------- open data directory
{
  write(
    'ths_open_data_directory.json',
    `${JSON.stringify(
      {
        title: 'THS Open Data Directory',
        licenses: LICENSES,
        datasets: openDatasets,
        sectors: directorySectors,
        licenceLaw: licenseLaw,
      },
      null,
      2,
    )}\n`,
  );
}

// ------------------------------------------------------------ escalation maps
{
  write(
    'ths_escalation_directory.json',
    `${JSON.stringify(
      {
        title: 'THS escalation directory',
        note: 'Each contact carries a verified flag. false means the contact was found in secondary or older material and must be confirmed before reliance.',
        schemes: escalation,
      },
      null,
      2,
    )}\n`,
  );
}

// ------------------------------------------------------------ simplifier rules
{
  write(
    'ths_simplify_rules.json',
    `${JSON.stringify(
      {
        dictionaryVersion: DICTIONARY_VERSION,
        jurisdictions: JURISDICTIONS.map((jurisdiction) => ({
          id: jurisdiction.id,
          label: jurisdiction.label,
          short: jurisdiction.short,
          instrument: jurisdiction.instrument,
          sourceLabel: jurisdiction.sourceLabel,
          readability: jurisdiction.readability,
          phrases: jurisdiction.phrases.map(({ from, to, risk, note }) => ({ from, to, risk, note })),
        })),
      },
      null,
      2,
    )}\n`,
  );
}

// -------------------------------------------------------------- source notes
{
  write(
    'ths_dpi_corridor_sources.txt',
    sourceText('dpi-corridor', 'DPI corridor: published sources'),
  );
  write(
    'ths_sprawl_sources.txt',
    sourceText('rules-reading', 'The rules exist. The reading does not: sources'),
  );
  write(
    'ths_state_output_sources.txt',
    [
      "The State's Output, 1947–2026: sources",
      '=====================================',
      '',
      'One row per instrument in ths_state_output_instruments.csv; per-year',
      'aggregates in ths_state_output_series.csv. The timeline plots every',
      'instrument as one dot.',
      '',
      'Catalogue note',
      '--------------',
      CATALOGUE_NOTE,
      '',
      'Series and sources',
      '------------------',
      'Acts, amending acts, ordinances, rules and notifications: India Code',
      '(indiacode.gov.in), the Government of India corpus, crawled October',
      '2026. Every instrument is kept under its catalogue title and',
      'deduplicated by Act number, rule or notification id, or normalised',
      'title.',
      '',
      'Constitution amendment Acts (106, 1951–2023): the Legislative',
      'Department list of amendments, cross-checked row by row against the',
      'published list of all 106 amendments (October 2026). Counted by date of',
      'enforcement.',
      '',
      'RTI applications with the central government: compiled from Central',
      'Information Commission annual-report analyses (CHRI), press reports of',
      'CIC data, and two parliamentary figures already published by THS. Each',
      'row carries its own source and scope; years nobody has verified are',
      'absent, not zero.',
      '',
      'Open data resources on data.gov.in: MeitY annual reports 2017-18',
      'through 2024-25, plus the MoSPI presentation to the 28th COCSSO',
      '(August 2024). These are dated snapshots on different counting bases,',
      'not a curve.',
      '',
      'Milestones',
      '----------',
      ...MILESTONES.map(
        (m) =>
          `  ${m.year} — ${m.label}\n      scope: ${m.scope}\n      source: ${m.source}${m.url ? ` — ${m.url}` : ''}`,
      ),
      '',
      'RTI rows',
      '--------',
      ...RTI.map(
        (r) =>
          `  ${r.fy} — ${r.measure}: ${r.received}${r.rejected != null ? `, rejected ${r.rejected}` : ''}\n      scope: ${r.scope}\n      source: ${r.source}${r.url ? ` — ${r.url}` : ''}`,
      ),
      '',
      'Open data snapshots',
      '-------------------',
      ...STEPS.map(
        (s) =>
          `  ${s.date} — ${s.value.toLocaleString('en-IN')} resources\n      scope: ${s.scope}\n      source: ${s.source}${s.url ? ` — ${s.url}` : ''}`,
      ),
      '',
      'Known gaps',
      '----------',
      'No national total of Gazette notifications published per year exists,',
      'central or state. The timeline shows that gap instead of a number.',
      'The 2023-24 RTI figure has not been extracted from the CIC report and',
      'is absent, not zero. Central Act counts per year are catalogue',
      'holdings and undercount the Act numbers of their years. 2026 is a',
      'partial year and every 2026 row is marked provisional.',
      '',
    ].join('\n'),
  );

  const monitor = byId.get('regulator-obligation-monitor');
  write(
    'ths_monitor_precision_summary.txt',
    [
      'Regulator Obligation Monitor: published precision summary',
      '==========================================================',
      '',
      `${monitor.title} — ${monitor.author}, ${monitor.date}`,
      '',
      'Findings as published:',
      ...monitor.findings.map((finding, index) => `${index + 1}. ${finding}`),
      '',
      'Method:',
      monitor.methods,
      '',
      'Sources:',
      ...monitor.citations.map((citation, index) => `${index + 1}. ${citation}`),
      '',
      'This is the summary the library publishes. The row-level holdout labels are',
      'not offered as a download; the verification report cited above is the',
      'authoritative record.',
      '',
    ].join('\n'),
  );

  write(
    'ths_promise_evidence.txt',
    [
      'Gujarat 2022 health promises: promise, status and evidence',
      '==========================================================',
      '',
      'Status vocabulary:',
      ...Object.entries(STATUS_LABELS).map(([key, label]) => `  ${key}: ${label}`),
      '',
      ...promises.flatMap((promise) => [
        promise.promise,
        `Status: ${STATUS_LABELS[promise.status] || promise.status}`,
        `Reading: ${promise.reading}`,
        'Evidence:',
        ...promise.evidence.map(([date, source, url]) => `  - ${date} — ${source} — ${url}`),
        '',
      ]),
      'Sources:',
      ...promiseSources.map((source) => `  - ${source}`),
      '',
    ].join('\n'),
  );
}

console.log(`\nwrote research downloads to ${path.relative(ROOT, OUT)}`);
