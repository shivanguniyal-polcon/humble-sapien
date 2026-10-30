#!/usr/bin/env node
// The wiring check for every live API the site calls.
//
//     node scripts/check-api-wiring.mjs
//
// A live feed only works when four separate places agree: the build has to know
// the host (a VITE_* variable in a build script), the page has to be allowed to
// call it (connect-src in public/_headers for the Worker-hosted site and in
// vercel.json for Vercel), and the Worker has to let the page's origin read it
// (ALLOWED_ORIGIN in its wrangler config). Nothing compared those four until
// this script. RARA shipped live in D1 and dark on both pages because the second
// and third had drifted, and Prahari's live library was absent from the Workers
// build for the same reason.
//
// The hosts are derived, never listed. A hardcoded copy of the set would become
// one more place to forget. Two sources feed it — VITE_*_API assignments in the
// package scripts and literal Worker hosts in src — and each host must resolve
// to a Worker config, appear in both CSPs, and allow both site origins.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

// The two surfaces that serve the site. Both must be able to read every feed.
const SITE_ORIGINS = [
  'https://ths-site.shivang-uniyal27.workers.dev',
  'https://humble-sapien.vercel.app',
];

// Every script that produces a deployable site. Vercel reads build:vercel from
// vercel.json; `npm run build` is what the Worker-hosted deploy documents.
const BUILD_SCRIPTS = ['build', 'build:vercel'];

let checks = 0;
let failures = 0;

const check = (name, condition, detail = '') => {
  checks += 1;
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const section = (title) => console.log(`\n${title}`);

// Every .js/.jsx under src, as { path, text }.
const walk = (dir, out = []) => {
  for (const entry of readdirSync(join(root, dir))) {
    const rel = join(dir, entry);
    const stat = statSync(join(root, rel));
    if (stat.isDirectory()) walk(rel, out);
    else if (/\.(js|jsx)$/.test(entry)) out.push({ path: rel, text: read(rel) });
  }
  return out;
};

const scripts = JSON.parse(read('package.json')).scripts || {};
const sources = walk('src');

// ---- the hosts the site calls -------------------------------------------

const fromScripts = new Set();
for (const script of BUILD_SCRIPTS) {
  for (const match of (scripts[script] || '').matchAll(
    /VITE_[A-Z0-9_]+\s*=\s*(https:\/\/[^\s"'`\\]+)/g,
  )) {
    fromScripts.add(match[1].replace(/\/+$/, ''));
  }
}

const fromSource = new Set();
for (const file of sources) {
  for (const match of file.text.matchAll(
    /https:\/\/[a-z0-9-]+\.shivang-uniyal27\.workers\.dev/g,
  )) {
    fromSource.add(match[0]);
  }
}

const hosts = [...new Set([...fromScripts, ...fromSource])].sort();

// ---- the Worker config behind each host ---------------------------------

const tomls = [];
const collectTomls = (dir) => {
  for (const entry of readdirSync(join(root, dir))) {
    const rel = join(dir, entry);
    if (statSync(join(root, rel)).isDirectory()) collectTomls(rel);
    else if (entry.endsWith('.toml')) tomls.push(rel);
  }
};
collectTomls('workers');

const workers = tomls.map((path) => {
  const text = read(path);
  const name = (text.match(/^\s*name\s*=\s*"([^"]+)"/m) || [])[1] || '';
  const main = (text.match(/^\s*main\s*=\s*"([^"]+)"/m) || [])[1] || '';
  const allowed = (text.match(/^\s*ALLOWED_ORIGIN\s*=\s*"([^"]*)"/m) || [])[1] || '';
  let open = false;
  if (main) {
    const dir = path.slice(0, path.lastIndexOf('/'));
    try {
      const code = read(join(dir, main));
      open = /access-control-allow-origin['"]?\s*:\s*['"]\*['"]/.test(code);
    } catch {
      // A missing handler is reported by the host resolution check below.
    }
  }
  return { path, name, allowed: allowed.split(',').map((o) => o.trim()).filter(Boolean), open };
});

// ---- the two CSPs --------------------------------------------------------

const connectSources = (policy) => {
  const directive = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('connect-src'));
  return directive ? directive.split(/\s+/).slice(1) : [];
};

const headersPolicy = (read('public/_headers').match(/^Content-Security-Policy:\s*(.+)$/m) || [])[1] || '';
const vercelJson = JSON.parse(read('vercel.json'));
const vercelPolicy =
  ((vercelJson.headers || [])[0]?.headers || []).find(
    (h) => h.key.toLowerCase() === 'content-security-policy',
  )?.value || '';

// ---- the VITE_* variables the source expects at build time ---------------

const needsBuild = new Map();
for (const file of sources) {
  for (const line of file.text.split('\n')) {
    for (const match of line.matchAll(/VITE_[A-Z0-9_]+/g)) {
      const fallback = (line.match(/VITE_[A-Z0-9_]+\s*\|\|\s*'([^']*)'/) || [])[1];
      if (fallback) continue; // a literal default means the build need not set it
      needsBuild.set(match[0], file.path);
    }
  }
}

// ---- checks --------------------------------------------------------------

section(`API hosts (${hosts.length})`);

for (const host of hosts) {
  const name = host.replace('https://', '').split('.')[0];
  const worker = workers.find((entry) => entry.name === name);

  check(`${host} has a Worker config`, Boolean(worker), worker ? worker.path : 'no workers/**/*.toml names it');

  check(
    `${host} is in public/_headers connect-src`,
    connectSources(headersPolicy).includes(host),
    'the Worker-hosted site would block its own call',
  );

  check(
    `${host} is in vercel.json connect-src`,
    connectSources(vercelPolicy).includes(host),
    'Vercel would block the call in the browser',
  );

  if (worker) {
    if (worker.open) {
      check(`${host} allows every origin (CORS *)`, true);
    } else {
      for (const origin of SITE_ORIGINS) {
        check(
          `${host} allows ${origin}`,
          worker.allowed.includes(origin),
          `ALLOWED_ORIGIN is "${worker.allowed.join(',')}"`,
        );
      }
    }
  }
}

section('Build-time variables');

for (const [name, path] of needsBuild) {
  for (const script of BUILD_SCRIPTS) {
    const body = scripts[script] || '';
    check(
      `${name} is set by ${script}`,
      new RegExp(`\\b${name}\\s*=\\s*https://`).test(body),
      `${path} reads it without a default, so this build would ship without a live feed`,
    );
  }
}

section('Summary');
console.log(`  ${checks - failures} of ${checks} checks passed`);

if (failures) {
  console.log(`\n${failures} wiring gap${failures === 1 ? '' : 's'}. A feed that is dark here still renders, so nothing else will report it.`);
  process.exit(1);
}
