// Splits the village names of every State into one chunk per district.
//
// A State's village chunk is the largest thing this page downloads: Uttar
// Pradesh sends half a megabyte over the wire before a single village is
// picked, and a citizen on a 2G connection in a block office should not wait
// for that to find out which officer to ask for. A district holds a fraction
// of it, so the chunk is cut per district and the browser fetches only the
// district the citizen is in.
//
// This runs after scripts/build-india-admin.mjs, which writes the State-level
// chunk. The State-level files are removed afterwards: leaving them in the
// tree would put them back in the bundle.
//
// Usage: node scripts/split-india-villages.mjs
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { villageChunkBody, villageChunkName } from './lib/village-chunks.mjs';

const OUT_DIR = new URL('../src/data/india/', import.meta.url);

const files = readdirSync(OUT_DIR);
const stateFiles = files.filter((f) => f.startsWith('state-') && !f.endsWith('-villages.js'));
const villageFiles = files.filter((f) => f.startsWith('state-') && f.endsWith('-villages.js'));

if (stateFiles.length === 0) {
  console.error('no state chunks found. Run scripts/build-india-admin.mjs first.');
  process.exit(1);
}

const written = [];
let villageCount = 0;
let districtCount = 0;

for (const stateFile of stateFiles) {
  const slug = stateFile.replace(/^state-/, '').replace(/\.js$/, '');
  const villageFile = `state-${slug}-villages.js`;
  if (!villageFiles.includes(villageFile)) {
    console.error(`missing ${villageFile}`);
    process.exit(1);
  }

  const state = await import(new URL(stateFile, OUT_DIR).href);
  const villages = await import(new URL(villageFile, OUT_DIR).href);

  // The blocks of the State, grouped by the district that owns them.
  const byDistrict = new Map();
  for (const d of state.DISTRICTS) byDistrict.set(d.id, []);
  for (const b of state.BLOCKS) {
    if (!byDistrict.has(b.district)) byDistrict.set(b.district, []);
    byDistrict.get(b.district).push(b);
  }

  for (const [districtId, blocks] of byDistrict) {
    const names = {};
    const kinds = {};
    for (const b of blocks) {
      const list = villages.VILLAGES[b.id];
      if (list && list.length) names[b.id] = list;
      const k = villages.VILLAGE_KINDS[b.id];
      if (k && Object.keys(k).length) kinds[b.id] = k;
    }
    if (Object.keys(names).length === 0) continue;

    const district = state.DISTRICTS.find((d) => d.id === districtId);
    const body = villageChunkBody({
      scope: 'district',
      title: `${district ? district.name : `district ${districtId}`}, ${state.STATE_NAME}`,
      villages: names,
      kinds,
    });
    const name = villageChunkName(`district-${districtId}`);
    writeFileSync(new URL(name, OUT_DIR), body);
    written.push([name, Buffer.byteLength(body)]);
    districtCount += 1;
    villageCount += Object.values(names).reduce((n, l) => n + l.length, 0);
  }
}

// The State-level chunks have done their job. They are removed so they
// cannot be picked up by the bundler and sent to a citizen who never asked
// for them.
for (const f of villageFiles) rmSync(new URL(f, OUT_DIR));

const total = written.reduce((n, [, b]) => n + b, 0);
const biggest = written.slice().sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(
  `wrote ${districtCount} district chunks, ${villageCount} villages, ` +
    `${(total / 1024 / 1024).toFixed(1)} MB on disk`,
);
console.log(`removed ${villageFiles.length} state-level village chunks`);
for (const [name, bytes] of biggest) {
  console.log(`  ${name}: ${(bytes / 1024).toFixed(0)} KB`);
}
