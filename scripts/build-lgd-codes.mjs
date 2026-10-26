// Joins the locator's locality names to the official Local Government
// Directory codes and writes the codes into the generated chunks.
//
// The locator's geometry and names come from geoBoundaries, which was built
// from an older Census-era LGD extract. The names are close to the directory
// but not identical: districts have been renamed and respelled, and one old
// district may now be two. This script does the join by name, with an
// explicit rename table and a conservative similarity pass. It never assigns
// a code when the evidence is ambiguous.
//
// The output is:
//   * lgd_code on each district, sub-district and block in state-*.js
//   * VILLAGE_CODES in district-*-villages.js, aligned by index with VILLAGES
//   * lgd_code on each state in indiaAdmin.js
//   * lgd-meta.js with the snapshot date and coverage counts
//
// Index alignment matters: a code array shorter than its name list would
// shift every later code onto the wrong village. And one code identifies one
// village, so when two different names claim it, the official spelling keeps
// it and the rest are blanked rather than published under a neighbour's code.
//
// Source cache (gitignored), downloaded from the LGD open-data mirror that
// preserves the directory's own CSV reports:
//
//   https://ramseraph.github.io/opendata/lgd/
//
//   curl -L -o scripts/.cache/lgd/districts.26Oct2026.csv.7z \
//     https://github.com/ramSeraph/opendata/releases/download/lgd-latest/districts.26Oct2026.csv.7z
//   ...and the same for subdistricts, blocks, villages and villages_by_blocks.
//   Extract with `bsdtar -xf` (or 7-Zip).
//
// Usage:
//   node --max-old-space-size=4096 scripts/build-lgd-codes.mjs
//   node --max-old-space-size=4096 scripts/build-lgd-codes.mjs --dry-run
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  LGD_SNAPSHOT,
  LGD_SNAPSHOT_LABEL,
  DISTRICT_ALIASES,
  bestMatch,
  normLgd,
} from './lib/lgd-match.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'data', 'india');
const CACHE = join(HERE, '.cache', 'lgd');
const dryRun = process.argv.includes('--dry-run');

const FILES = {
  districts: `districts.${dateStamp()}.csv`,
  subdistricts: `subdistricts.${dateStamp()}.csv`,
  blocks: `blocks.${dateStamp()}.csv`,
  villages: `villages.${dateStamp()}.csv`,
  villagesByBlocks: `villages_by_blocks.${dateStamp()}.csv`,
};

function dateStamp() {
  // The mirror names its daily files 26Oct2026.
  const [y, m, d] = LGD_SNAPSHOT.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d}${months[Number(m) - 1]}${y}`;
}

for (const file of Object.values(FILES)) {
  if (!existsSync(join(CACHE, file))) {
    console.error(`missing scripts/.cache/lgd/${file}`);
    console.error('Download the LGD reports listed at the top of this file, then retry.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// CSV

// The reports quote fields that contain commas. No field in these files
// contains a newline, so a line at a time is enough.
function parseCsvLine(line) {
  const out = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out;
}

function forEachCsvRow(name, fn) {
  const text = readFileSync(join(CACHE, name), 'utf8');
  const lines = text.split(/\r?\n/);
  if (!lines.length) return;
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const cells = parseCsvLine(line);
    const row = {};
    for (let j = 0; j < headers.length; j += 1) row[headers[j]] = cells[j] ?? '';
    fn(row, i);
  }
}

function readCsv(name) {
  const rows = [];
  forEachCsvRow(name, (row) => rows.push(row));
  return rows;
}

// ---------------------------------------------------------------------------
// LGD reference

const districtRows = readCsv(FILES.districts);
const subdistrictRows = readCsv(FILES.subdistricts);
const blockRows = readCsv(FILES.blocks);

const lgdStates = new Map();
for (const row of districtRows) {
  const code = Number(row['State Code']);
  if (!lgdStates.has(code)) lgdStates.set(code, row['State Name (In English)']);
}
const statesByNorm = new Map();
for (const [code, name] of lgdStates) {
  const norm = normLgd(name);
  if (!statesByNorm.has(norm)) statesByNorm.set(norm, []);
  statesByNorm.get(norm).push({ code, name });
}

const districts = districtRows.map((row) => ({
  code: String(row['District Code']),
  name: row['District Name(In English)'],
  state: Number(row['State Code']),
  norm: normLgd(row['District Name(In English)']),
}));
const districtsByState = new Map();
for (const d of districts) {
  if (!districtsByState.has(d.state)) districtsByState.set(d.state, []);
  districtsByState.get(d.state).push(d);
}

const subdistricts = subdistrictRows.map((row) => ({
  code: String(row['Sub-district Code']),
  name: row['Sub-district Name'],
  district: String(row['District Code']),
  state: Number(row['State Code']),
  norm: normLgd(row['Sub-district Name']),
}));
const subdistrictsByState = new Map();
for (const s of subdistricts) {
  if (!subdistrictsByState.has(s.state)) subdistrictsByState.set(s.state, []);
  subdistrictsByState.get(s.state).push(s);
}

const blocks = blockRows.map((row) => ({
  code: String(row['Development Block Code']),
  name: row['Development Block Name (In English)'],
  district: String(row['District Code']),
  state: Number(row['State Code']),
  norm: normLgd(row['Development Block Name (In English)']),
}));
const blocksByState = new Map();
for (const b of blocks) {
  if (!blocksByState.has(b.state)) blocksByState.set(b.state, []);
  blocksByState.get(b.state).push(b);
}

// A block can cover more than one sub-district. Its villages are collected
// from every sub-district it touches, not from a single assumed parent.
const blockSubdistricts = new Map();
forEachCsvRow(FILES.villagesByBlocks, (row) => {
  const blockCode = String(row['Development Block Code'] || '');
  const subCode = String(row['Subdistrict Code'] || '');
  if (!blockCode || blockCode === '0' || !subCode || subCode === '0') return;
  if (!blockSubdistricts.has(blockCode)) blockSubdistricts.set(blockCode, new Map());
  const counts = blockSubdistricts.get(blockCode);
  counts.set(subCode, (counts.get(subCode) || 0) + 1);
});

// The village table is the census-facing list. Its names can carry a
// qualifier in parentheses, such as "(Rv)" or "(Efa)"; normLgd removes it.
const villagesBySubdistrict = new Map();
// The official name behind each code, so a fuzzy match that collides with a
// real village can be told apart from a duplicate row of the same village.
// A code listed under two different official names is marked null.
const codeOfficialNorm = new Map();
forEachCsvRow(FILES.villages, (row) => {
  const subCode = String(row['Sub-District Code'] || '');
  const villageCode = String(row['Village Code'] || '');
  const name = row['Village Name (In English)'];
  if (!subCode || !villageCode || villageCode === '0') return;
  const norm = normLgd(name);
  if (!norm) return;
  if (!villagesBySubdistrict.has(subCode)) villagesBySubdistrict.set(subCode, new Map());
  const names = villagesBySubdistrict.get(subCode);
  if (!names.has(norm)) names.set(norm, new Set());
  names.get(norm).add(villageCode);
  const known = codeOfficialNorm.get(villageCode);
  if (known === undefined) codeOfficialNorm.set(villageCode, norm);
  else if (known !== norm) codeOfficialNorm.set(villageCode, null);
});

// ---------------------------------------------------------------------------
// our generated chunks

function parseExports(text) {
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.startsWith('export const ')) continue;
    const eq = line.indexOf(' = ');
    if (eq < 0 || !line.endsWith(';')) continue;
    const name = line.slice('export const '.length, eq);
    const raw = line.slice(eq + 3, -1);
    try {
      out[name] = JSON.parse(raw);
    } catch {
      // INDIA_VIEWBOX is the one single-quoted string in these files.
      if (raw.startsWith("'") && raw.endsWith("'")) out[name] = raw.slice(1, -1);
      else throw new Error(`could not parse export ${name}`);
    }
  }
  return out;
}

function setExport(text, name, value) {
  const prefix = `export const ${name} = `;
  const lines = text.split('\n');
  const index = lines.findIndex((line) => line.startsWith(prefix));
  const next = prefix + JSON.stringify(value) + ';';
  if (index >= 0) {
    lines[index] = next;
  } else {
    const anchor = lines.findIndex((line) => line.startsWith('export const VILLAGE_KINDS = '));
    if (anchor >= 0) lines.splice(anchor + 1, 0, next);
    else lines.push(next);
  }
  return lines.join('\n');
}

const stateFiles = readdirSync(OUT)
  .filter((name) => name.startsWith('state-') && name.endsWith('.js') && !name.endsWith('-villages.js'))
  .sort();

const stateChunks = stateFiles.map((file) => {
  const text = readFileSync(join(OUT, file), 'utf8');
  return { file, text, ...parseExports(text) };
});

const villageFiles = readdirSync(OUT)
  .filter((name) => name.startsWith('district-') && name.endsWith('-villages.js'))
  .sort();

const villageChunks = villageFiles.map((file) => {
  const text = readFileSync(join(OUT, file), 'utf8');
  const parsed = parseExports(text);
  return {
    file,
    text,
    districtId: Number(file.slice('district-'.length, -'-villages.js'.length)),
    villages: parsed.VILLAGES || {},
  };
});

// ---------------------------------------------------------------------------
// matching

function matchDistrict(stateCode, name) {
  const pool = districtsByState.get(stateCode) || [];
  const norm = normLgd(name);
  const exact = pool.filter((d) => d.norm === norm);
  if (exact.length === 1) return { code: exact[0].code, basis: 'exact' };
  if (exact.length > 1) return { code: '', basis: '' };

  const alias = DISTRICT_ALIASES[stateCode]?.[norm];
  if (alias) {
    const target = pool.filter((d) => d.norm === normLgd(alias));
    if (target.length === 1) return { code: target[0].code, basis: 'alias' };
    if (target.length > 1) return { code: '', basis: '' };
  }

  const fuzzy = bestMatch(name, pool, { threshold: 0.9, margin: 0.03 });
  return fuzzy ? { code: fuzzy.candidate.code, basis: 'fuzzy' } : { code: '', basis: '' };
}

function matchInState(pool, name, districtCode) {
  const norm = normLgd(name);
  const exact = pool.filter((x) => x.norm === norm);
  if (exact.length === 1) return { code: exact[0].code, basis: 'exact' };
  if (exact.length > 1) {
    if (districtCode) {
      const inDistrict = exact.filter((x) => x.district === districtCode);
      if (inDistrict.length === 1) return { code: inDistrict[0].code, basis: 'exact+district' };
    }
    return { code: '', basis: '' };
  }

  // A renamed or split district can leave the unit in a different current
  // district. Try the selected district first for precision, then the state.
  if (districtCode) {
    const local = pool.filter((x) => x.district === districtCode);
    const fuzzyLocal = bestMatch(name, local, { threshold: 0.9, margin: 0.03 });
    if (fuzzyLocal) return { code: fuzzyLocal.candidate.code, basis: 'fuzzy' };
  }
  const fuzzy = bestMatch(name, pool, { threshold: 0.89, margin: 0.03 });
  return fuzzy ? { code: fuzzy.candidate.code, basis: 'fuzzy' } : { code: '', basis: '' };
}

function combinedVillages(blockCode) {
  const subCounts = blockSubdistricts.get(blockCode);
  if (!subCounts) return null;
  const combined = new Map();
  // Largest sub-district first, so its name wins when two sub-districts share
  // a village name. Ambiguity is still caught by the Set of codes.
  const subs = [...subCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [subCode] of subs) {
    const names = villagesBySubdistrict.get(subCode);
    if (!names) continue;
    for (const [norm, codes] of names) {
      if (!combined.has(norm)) combined.set(norm, new Set());
      const target = combined.get(norm);
      for (const code of codes) target.add(code);
    }
  }
  return combined;
}

function villageCandidates(combined) {
  return [...combined.entries()].map(([norm, codes]) => ({ name: norm, norm, codes }));
}

// ---------------------------------------------------------------------------
// join

const stats = {
  states: { coded: 0, total: 0 },
  districts: { coded: 0, total: 0, exact: 0, alias: 0, fuzzy: 0 },
  subdistricts: { coded: 0, total: 0, exact: 0, fuzzy: 0 },
  blocks: { coded: 0, total: 0, exact: 0, fuzzy: 0 },
  villages: { coded: 0, blank: 0, noBlock: 0, total: 0, exact: 0, fuzzy: 0, collisions: 0 },
};

const stateCodeByName = new Map();
for (const [code, name] of lgdStates) stateCodeByName.set(normLgd(name), code);

for (const state of stateChunks) {
  const stateCode = stateCodeByName.get(normLgd(state.STATE_NAME));
  const districtMap = new Map();
  stats.states.total += 1;
  if (stateCode) stats.states.coded += 1;

  for (const district of state.DISTRICTS) {
    stats.districts.total += 1;
    const match = stateCode ? matchDistrict(stateCode, district.name) : { code: '', basis: '' };
    districtMap.set(district.id, match.code);
    if (match.code) {
      stats.districts.coded += 1;
      if (match.basis === 'exact') stats.districts.exact += 1;
      else if (match.basis === 'alias') stats.districts.alias += 1;
      else stats.districts.fuzzy += 1;
    }
    district.lgd_code = match.code;
  }

  const subPool = stateCode ? subdistrictsByState.get(stateCode) || [] : [];
  for (const subdistrict of state.SUBDISTRICTS) {
    stats.subdistricts.total += 1;
    const districtCode = districtMap.get(subdistrict.district) || '';
    const match = subPool.length
      ? matchInState(subPool, subdistrict.name, districtCode)
      : { code: '', basis: '' };
    if (match.code) {
      stats.subdistricts.coded += 1;
      if (match.basis === 'fuzzy') stats.subdistricts.fuzzy += 1;
      else stats.subdistricts.exact += 1;
    }
    subdistrict.lgd_code = match.code;
  }

  const blockPool = stateCode ? blocksByState.get(stateCode) || [] : [];
  for (const block of state.BLOCKS) {
    stats.blocks.total += 1;
    const districtCode = districtMap.get(block.district) || '';
    const match = blockPool.length
      ? matchInState(blockPool, block.name, districtCode)
      : { code: '', basis: '' };
    if (match.code) {
      stats.blocks.coded += 1;
      if (match.basis === 'fuzzy') stats.blocks.fuzzy += 1;
      else stats.blocks.exact += 1;
    }
    block.lgd_code = match.code;
  }
}

for (const chunk of villageChunks) {
  const state = stateChunks.find((s) => s.DISTRICTS.some((d) => d.id === chunk.districtId));
  if (!state) continue;
  const districtsById = new Map(state.DISTRICTS.map((d) => [d.id, d]));
  const blocksById = new Map(state.BLOCKS.map((b) => [b.id, b]));

  // The district file's blocks are in the State chunk, not in the district
  // object. Walk the block ids that own a village list.
  const codesByBlock = {};
  for (const [blockKey, names] of Object.entries(chunk.villages)) {
    const blockId = Number(blockKey);
    const block = blocksById.get(blockId);
    const blockCode = block ? block.lgd_code : '';
    const codes = names.map(() => '');
    stats.villages.total += names.length;

    const combined = blockCode ? combinedVillages(blockCode) : null;
    if (!combined) {
      stats.villages.noBlock += names.length;
      codesByBlock[blockKey] = codes;
      continue;
    }

    const candidates = villageCandidates(combined);
    for (let i = 0; i < names.length; i += 1) {
      const norm = normLgd(names[i]);
      const exact = combined.get(norm);
      if (exact && exact.size === 1) {
        codes[i] = [...exact][0];
        stats.villages.coded += 1;
        stats.villages.exact += 1;
        continue;
      }
      if (exact && exact.size > 1) {
        stats.villages.blank += 1;
        continue;
      }
      const fuzzy = bestMatch(names[i], candidates, { threshold: 0.89, margin: 0.03 });
      if (fuzzy && fuzzy.candidate.codes.size === 1) {
        codes[i] = [...fuzzy.candidate.codes][0];
        stats.villages.coded += 1;
        stats.villages.fuzzy += 1;
      } else {
        stats.villages.blank += 1;
      }
    }
    codesByBlock[blockKey] = codes;
  }
  chunk.codesByBlock = codesByBlock;
  chunk.stateName = state.STATE_NAME;
  // Keep the district name for the report; it is not written into the data.
  const district = districtsById.get(chunk.districtId);
  chunk.districtName = district ? district.name : '';
}

// One LGD code identifies one village. A fuzzy match can hand a near name
// the code of the real village, and the source list can repeat a name inside
// a block. Keep a shared code when every claimant is the same name; where
// the names differ, keep the official match if there is one and blank the
// rest rather than publish two villages under one code.
const claims = new Map();
for (const chunk of villageChunks) {
  if (!chunk.codesByBlock) continue;
  for (const [blockKey, codes] of Object.entries(chunk.codesByBlock)) {
    const names = chunk.villages[blockKey] || [];
    codes.forEach((code, index) => {
      if (!code) return;
      if (!claims.has(code)) claims.set(code, []);
      claims.get(code).push({ codes, index, norm: normLgd(names[index]) });
    });
  }
}
for (const [code, list] of claims) {
  if (new Set(list.map((claim) => claim.norm)).size === 1) continue;
  const official = codeOfficialNorm.get(code) || null;
  for (const claim of list) {
    if (official && claim.norm === official) continue;
    claim.codes[claim.index] = '';
    stats.villages.coded -= 1;
    stats.villages.blank += 1;
    stats.villages.collisions += 1;
  }
}

// ---------------------------------------------------------------------------
// write

function coverageLine(label, value) {
  const pct = value.total ? Math.round((value.coded / value.total) * 100) : 0;
  return `${label}: ${value.coded}/${value.total} (${pct}%)`;
}

console.log(`LGD snapshot ${LGD_SNAPSHOT}`);
console.log(coverageLine('states', stats.states));
console.log(coverageLine('districts', stats.districts));
console.log(coverageLine('sub-districts', stats.subdistricts));
console.log(coverageLine('blocks', stats.blocks));
console.log(
  `villages: ${stats.villages.coded}/${stats.villages.total} coded, ` +
    `${stats.villages.blank} blank, ${stats.villages.noBlock} without a mapped block, ` +
    `${stats.villages.collisions} cleared as collisions`,
);
console.log(
  `match basis: districts exact ${stats.districts.exact}, alias ${stats.districts.alias}, ` +
    `fuzzy ${stats.districts.fuzzy}; villages exact ${stats.villages.exact}, fuzzy ${stats.villages.fuzzy}`,
);

if (dryRun) {
  console.log('dry run: no files written');
  process.exit(0);
}

let written = 0;
for (const state of stateChunks) {
  let text = state.text;
  const districtsNext = state.DISTRICTS.map((d) => {
    const { lgd_code: _old, ...rest } = d;
    return d.lgd_code ? { ...rest, lgd_code: d.lgd_code } : rest;
  });
  const subsNext = state.SUBDISTRICTS.map((s) => {
    const { lgd_code: _old, ...rest } = s;
    return s.lgd_code ? { ...rest, lgd_code: s.lgd_code } : rest;
  });
  const blocksNext = state.BLOCKS.map((b) => {
    const { lgd_code: _old, ...rest } = b;
    return b.lgd_code ? { ...rest, lgd_code: b.lgd_code } : rest;
  });
  // Rebuild against the text on disk, not against the in-memory arrays: the
  // join above has already added lgd_code to those, so comparing with them
  // would always look unchanged and skip the write.
  text = setExport(text, 'DISTRICTS', districtsNext);
  text = setExport(text, 'SUBDISTRICTS', subsNext);
  text = setExport(text, 'BLOCKS', blocksNext);
  if (text !== state.text) {
    writeFileSync(join(OUT, state.file), text);
    written += 1;
  }
}

for (const chunk of villageChunks) {
  if (!chunk.codesByBlock) continue;
  const codeLines = chunk.text
    .split('\n')
    .filter((line) => line.startsWith('export const VILLAGE_CODES = '));
  let existing = null;
  if (codeLines.length === 1) {
    try {
      existing = JSON.parse(codeLines[0].slice('export const VILLAGE_CODES = '.length, -1));
    } catch {
      existing = null;
    }
  }
  if (existing && JSON.stringify(existing) === JSON.stringify(chunk.codesByBlock)) continue;
  // Strip any earlier code line first: appending a second export of the same
  // name makes the file fail to load at all.
  const body = chunk.text
    .split('\n')
    .filter((line) => !line.startsWith('export const VILLAGE_CODES = '))
    .join('\n');
  let text = body;
  if (!text.endsWith('\n')) text += '\n';
  text +=
    '// LGD village codes, aligned by index with VILLAGES. An empty string\n' +
    '// means the official name was ambiguous or absent; no code was guessed.\n';
  text += `export const VILLAGE_CODES = ${JSON.stringify(chunk.codesByBlock)};\n`;
  writeFileSync(join(OUT, chunk.file), text);
  written += 1;
}

// State codes on the top-level map.
const adminFile = join(OUT, 'indiaAdmin.js');
const adminText = readFileSync(adminFile, 'utf8');
const admin = parseExports(adminText);
const statesNext = admin.STATES.map((state) => {
  const code = stateCodeByName.get(normLgd(state.name));
  const { lgd_code: _old, ...rest } = state;
  if (!code) return rest;
  return { ...rest, lgd_code: String(code) };
});
if (JSON.stringify(statesNext) !== JSON.stringify(admin.STATES)) {
  writeFileSync(adminFile, setExport(adminText, 'STATES', statesNext));
  written += 1;
}

const meta = `// GENERATED by scripts/build-lgd-codes.mjs — do not edit by hand.
//
// LGD codes: Local Government Directory, Ministry of Panchayati Raj,
// snapshot ${LGD_SNAPSHOT}. Government Open Data License – India.

export const LGD_SNAPSHOT = ${JSON.stringify(LGD_SNAPSHOT)};
export const LGD_SNAPSHOT_LABEL = ${JSON.stringify(LGD_SNAPSHOT_LABEL)};
export const LGD_SOURCE = 'Local Government Directory, Ministry of Panchayati Raj';
export const LGD_COVERAGE = ${JSON.stringify(stats, null, 2)};
`;
writeFileSync(join(OUT, 'lgd-meta.js'), meta);

console.log(`wrote ${written} files and lgd-meta.js`);
