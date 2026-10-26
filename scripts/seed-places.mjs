// Build the SQL that fills the places D1 database.
//
// The directory already ships with the site as per-State chunks. This script
// reads those chunks once, on the developer's machine, and writes SQL files
// under private/places-seed/ — gitignored, because they are a build product
// and because the village list is 15 MB of names.
//
// It does not touch Cloudflare. Applying the files is a separate, explicit
// command, printed at the end, so a seed can be inspected before it lands.
//
//   node scripts/seed-places.mjs
//
// One file per State keeps each upload small enough to watch, and one base
// file carries the States, districts and captured passbooks.

import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES } from '../src/data/india/indiaAdmin.js';
import { slugify } from '../src/lib/india/hierarchy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(root, 'private/places-seed');
const PASSBOOK = JSON.parse(
  readFileSync(join(root, 'src/data/passbook/index.json'), 'utf8'),
);

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const j = (value) => q(JSON.stringify(value));

const chunkFor = async (name) => {
  try {
    return await import(`../src/data/india/state-${name}.js`);
  } catch {
    return null;
  }
};

const villageChunkFor = async (districtId) => {
  try {
    return await import(`../src/data/india/district-${districtId}-villages.js`);
  } catch {
    return null;
  }
};

const base = [];
const perState = new Map();

// The passbook capture is anchored to a real village in the directory: the
// GP name is matched to a village in its block, case-insensitively. A capture
// that cannot be matched is reported, never guessed onto another village.
const capturedByVillage = new Map();
for (const gp of PASSBOOK.gps) {
  capturedByVillage.set(`${gp.name.toLowerCase()}`, gp);
}

const matched = new Map();
let districtCount = 0;
let blockCount = 0;
let villageCount = 0;
let unmatched = [];

base.push('-- states');
for (const state of STATES) {
  base.push(
    `INSERT OR REPLACE INTO states (id, name, slug) VALUES (${state.id}, ${q(state.name)}, ${q(slugify(state.name))});`,
  );
}

base.push('\n-- districts');
const districtLines = [];
const blockLinesByState = new Map();

for (const state of STATES) {
  const chunk = await chunkFor(slugify(state.name));
  if (!chunk) continue;

  for (const district of chunk.DISTRICTS) {
    districtLines.push(
      `INSERT OR REPLACE INTO districts (id, state_id, name) VALUES (${district.id}, ${state.id}, ${q(district.name)});`,
    );
    districtCount += 1;
  }

  const lines = [];
  const districtsWithBlocks = new Set(chunk.BLOCKS.map((b) => b.district));
  for (const districtId of districtsWithBlocks) {
    const villages = await villageChunkFor(districtId);
    const byBlock = villages ? villages.VILLAGES : {};
    for (const block of chunk.BLOCKS.filter((b) => b.district === districtId)) {
      const names = byBlock[String(block.id)] || [];
      for (const name of names) {
        const gp = capturedByVillage.get(name.toLowerCase());
        if (gp && !matched.has(gp.code)) {
          matched.set(gp.code, { state: state.id, district: districtId, block: block.id, village: name, gp });
        }
      }
      villageCount += names.length;
      blockCount += 1;
      lines.push(
        `INSERT OR REPLACE INTO blocks (id, district_id, name, villages) VALUES (${block.id}, ${districtId}, ${q(block.name)}, ${j(names)});`,
      );
    }
  }
  blockLinesByState.set(state.id, lines);
}

base.push(...districtLines);

// Passbooks, one row each, with the document meta stored once. The payload is
// the exact GP object the page renders; the meta is everything around it.
base.push('\n-- passbooks');
for (const gp of PASSBOOK.gps) {
  const place = matched.get(gp.code);
  if (!place) {
    unmatched.push(gp.name);
    continue;
  }
  base.push(
    `INSERT OR REPLACE INTO passbooks (code, state_id, district_id, block_id, village, name, name_hi, payload, data_hash, generated_at) VALUES (${gp.code}, ${place.state}, ${place.district}, ${place.block}, ${q(place.village)}, ${q(gp.name)}, ${q(gp.nameHi || '')}, ${j(gp)}, ${q(PASSBOOK.dataHash)}, ${q(PASSBOOK.generatedAt)});`,
  );
}

const docMeta = {
  version: PASSBOOK.version,
  generatedAt: PASSBOOK.generatedAt,
  year: PASSBOOK.year,
  planYear: PASSBOOK.planYear,
  window: PASSBOOK.window,
  state: PASSBOOK.state,
  district: PASSBOOK.district,
  block: PASSBOOK.block,
  sources: PASSBOOK.sources,
  caveats: PASSBOOK.caveats,
  collection: PASSBOOK.collection,
  dataHash: PASSBOOK.dataHash,
  captured: PASSBOOK.gps.length,
};
base.push(
  `INSERT OR REPLACE INTO meta (key, value) VALUES ('doc', ${q(JSON.stringify(docMeta))});`,
);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, '00-base.sql'), base.join('\n'), 'utf8');

let stateFiles = 0;
for (const [stateId, lines] of blockLinesByState) {
  writeFileSync(join(outDir, `state-${String(stateId).padStart(2, '0')}.sql`), lines.join('\n'), 'utf8');
  stateFiles += 1;
}

console.log(`states       ${STATES.length}`);
console.log(`districts    ${districtCount}`);
console.log(`blocks       ${blockCount}`);
console.log(`villages     ${villageCount}`);
console.log(`passbooks    ${matched.size} of ${PASSBOOK.gps.length}`);
if (unmatched.length) {
  console.log(`UNMATCHED    ${unmatched.join(', ')}`);
  process.exitCode = 1;
}
console.log(`\nWrote ${stateFiles + 1} files to private/places-seed/`);
console.log('\nApply with:');
console.log('  npx wrangler d1 execute ths-places --remote --file=private/places-seed/00-base.sql');
console.log('  for f in private/places-seed/state-*.sql; do npx wrangler d1 execute ths-places --remote --file="$f" || exit 1; done');
