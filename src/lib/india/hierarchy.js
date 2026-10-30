// The India locator's logic, kept free of React and of the bundler so it can
// be tested on its own.
//
// The geography comes from the Local Government Directory, and it does not
// line up with the way schemes are administered. A district holds several
// sub-districts (tehsils); a tehsil holds blocks; a block holds villages. But
// a scheme's authority sits at the block or the district, not at the tehsil.
// The locator keeps both facts side by side rather than pretending the
// tehsil is a tier of the scheme ladder.

import { csvCell } from '../csv.js';

// A file-name-safe form of a name. The build script writes one chunk per
// state using the same rule, so the two must agree.
export const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Case, spacing and punctuation should not decide whether a search finds a
// place. "srirampur", "Sri Rampur" and "sri rampur" are one name.
export const normalize = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const matches = (name, query) => normalize(name).includes(normalize(query));

// The generated paths are plain SVG path data: absolute move and line
// commands, one subpath per ring. Parsing them back is enough to get a
// bounding box, and the box is what lets the map zoom to the level on screen.
const PATH_POINT = /[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;

export function pathPoints(path) {
  const out = [];
  if (!path) return out;
  let m;
  PATH_POINT.lastIndex = 0;
  while ((m = PATH_POINT.exec(path)) !== null) {
    out.push([Number(m[1]), Number(m[2])]);
  }
  return out;
}

export function bboxForPaths(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of paths) {
    for (const [x, y] of pathPoints(p)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// A viewBox that frames the given paths with a margin, in the same
// coordinates the paths were projected into. A square aspect is kept so the
// map does not stretch.
export function viewBoxFor(paths, pad = 12) {
  const box = bboxForPaths(paths);
  if (!box) return '0 0 1000 900';
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const side = Math.max(w, h, 1);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return [
    (cx - side / 2 - pad).toFixed(1),
    (cy - side / 2 - pad).toFixed(1),
    (side + pad * 2).toFixed(1),
    (side + pad * 2).toFixed(1),
  ].join(' ');
}

// Turns one generated state chunk into a tree a UI can walk:
// districts, each holding its sub-districts and blocks.
export function buildTree(chunk) {
  const districts = chunk.DISTRICTS.map((d) => ({ ...d, subdistricts: [], blocks: [] }));
  const byId = new Map(districts.map((d) => [d.id, d]));

  for (const s of chunk.SUBDISTRICTS) {
    const parent = byId.get(s.district);
    if (parent) parent.subdistricts.push(s);
  }
  for (const b of chunk.BLOCKS) {
    const parent = byId.get(b.district);
    if (parent) parent.blocks.push(b);
  }
  for (const d of districts) {
    d.subdistricts.sort((a, b) => a.name.localeCompare(b.name));
    d.blocks.sort((a, b) => a.name.localeCompare(b.name));
  }
  districts.sort((a, b) => a.name.localeCompare(b.name));
  return districts;
}

// The village chunk is a map from block id to a list of village names. The
// names repeat: two villages in one block can share a name, and a village in
// one block can share a name with one in another.
export function villagesOf(villageMap, blockId) {
  return villageMap?.[String(blockId)] || [];
}

// A village's administrative kind, where the directory records one: a
// census town, a nagar parishad, a municipal corporation, an unsurveyed
// hamlet. The kind tells a citizen whether there is a panchayat at all,
// which decides which office the ladder sends them to.
export function villageKind(villageMap, blockId, name) {
  return villageMap?.[`${blockId}`] && villageMap[`${blockId}`][name];
}

export function searchVillages(villageMap, blockId, query, limit = 60) {
  const all = villagesOf(villageMap, blockId);
  if (!query) return all.slice(0, limit);
  const q = normalize(query);
  const starts = [];
  const contains = [];
  for (const name of all) {
    const n = normalize(name);
    if (n.startsWith(q)) starts.push(name);
    else if (n.includes(q)) contains.push(name);
  }
  return [...starts, ...contains].slice(0, limit);
}

// Counts for the summary line under each level: how many of each thing sit
// below this one.
export function tally(tree) {
  let districts = 0;
  let blocks = 0;
  let subdistricts = 0;
  for (const d of tree) {
    districts += 1;
    blocks += d.blocks.length;
    subdistricts += d.subdistricts.length;
  }
  return { districts, blocks, subdistricts };
}

// The shareable place. The walk is written into the link, so a citizen can
// send the rung for their own village to a relative or to a volunteer at a
// help desk. A missing level is written as a dash, so the positions of the
// ones that are there never shift.
//
// Each part is encoded and the parts are joined with a bar, which the
// encoder turns into %7C. A village name can hold a bar, a slash, an
// ampersand or a full stop, and none of them may be able to break the link
// apart.
export function placeFromPath(path) {
  const state = path.find((p) => p.level === 'state');
  if (!state) return '';
  const at = (level) => {
    const found = path.find((p) => p.level === level);
    return found ? encodeURIComponent(String(found.id)) : '-';
  };
  const village = path.find((p) => p.level === 'village');
  return [
    at('state'),
    at('district'),
    at('tehsil'),
    at('block'),
    village ? encodeURIComponent(village.name) : '-',
  ].join('|');
}

export function parsePlace(place) {
  const segs = String(place || '').split('|');
  const num = (s) => (s && s !== '-' && Number.isFinite(Number(s)) ? Number(s) : null);
  const stateId = num(segs[0]);
  if (!stateId) return null;
  return {
    stateId,
    districtId: num(segs[1]),
    tehsilId: num(segs[2]),
    blockId: num(segs[3]),
    village: segs[4] && segs[4] !== '-' ? decodeURIComponent(segs[4]) : null,
  };
}

// The `code` column is a stable key for this build: the source geography
// carries geoBoundaries feature names and build indices, and those ids are
// not official codes. The `lgd_code` column is the real Local Government
// Directory code, joined by name against the 26 October 2026 snapshot. A
// blank there means the name matched more than one directory entry, or none,
// and the join refuses to guess.
export const HIERARCHY_CODE_SYSTEM = 'ths-geoboundaries-index';

export const HIERARCHY_NOTE =
  'The code column is a directory key for this build. The lgd_code column is the official Local Government Directory code, joined by name against the directory snapshot shipped with this build. The gp_code and gp_name columns name the Gram Panchayat where the directory records one. A blank lgd_code means the name was ambiguous or absent; a blank gp_code means the directory records no panchayat for that village. Neither is guessed.';

// A village's codes are aligned by index with the block's village list. A
// shared link carries only the name, so a name that repeats inside the block
// has no single row and every code stays blank. A GP needs a resolved village
// code first: without one there is no row to point at.
export function villageDetails(codes, gpCodes, gps, villages, blockId, name, index = -1) {
  const key = String(blockId);
  const names = villagesOf(villages, blockId);
  const list = codes?.[key];
  const empty = { lgd_code: '', gp_code: '', gp_name: '' };
  if (!names.length || !Array.isArray(list)) return empty;
  let at = -1;
  if (index >= 0 && names[index] === name) at = index;
  else {
    const matchesForName = [];
    for (let i = 0; i < names.length; i += 1) {
      if (names[i] === name) matchesForName.push(i);
    }
    if (matchesForName.length === 1) at = matchesForName[0];
  }
  if (at < 0) return empty;
  const lgd = list[at] || '';
  if (!lgd) return empty;
  const gp = (gpCodes?.[key] && gpCodes[key][at]) || '';
  return { lgd_code: lgd, gp_code: gp, gp_name: gp ? gps?.[gp] || '' : '' };
}

// The code alone, for callers that do not need the panchayat.
export function villageLgdCode(codes, villages, blockId, name, index = -1) {
  return villageDetails(codes, null, null, villages, blockId, name, index).lgd_code;
}

const CODE_PREFIX = {
  state: 'S',
  district: 'D',
  tehsil: 'T',
  block: 'B',
  village: 'V',
};

// A village id is its block id, and a block can hold two villages with the
// same name, so the village key is the block id plus the slugged name.
export function directoryCode(entry) {
  if (!entry) return '';
  const prefix = CODE_PREFIX[entry.level];
  if (!prefix) return '';
  if (entry.level === 'village') {
    const slug = slugify(entry.name);
    return `${prefix}-${entry.id}${slug ? `-${slug}` : ''}`;
  }
  return `${prefix}-${entry.id}`;
}

// The chosen path as flat rows, in top-down order. Every row names its
// parent so the file can rebuild the tree without a parser.
export function hierarchyRows(path = []) {
  return path.map((entry, index) => {
    const parent = index > 0 ? path[index - 1] : null;
    return {
      level: entry.level,
      name: entry.name,
      code: directoryCode(entry),
      parent_code: parent ? directoryCode(parent) : '',
      parent_name: parent ? parent.name : '',
      code_system: HIERARCHY_CODE_SYSTEM,
      lgd_code: entry.lgd_code || '',
      gp_code: entry.gp_code || '',
      gp_name: entry.gp_name || '',
    };
  });
}

const CSV_HEADERS = [
  'level',
  'name',
  'code',
  'parent_code',
  'parent_name',
  'code_system',
  'lgd_code',
  'gp_code',
  'gp_name',
];

export function hierarchyCsv(path = []) {
  const rows = hierarchyRows(path).map((row) =>
    CSV_HEADERS.map((key) => csvCell(row[key])).join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n') + '\n';
}

// The scheme ladder speaks in five rungs. The geography has five levels too,
// but they are not the same five. A tehsil has no rung of its own: it is
// where a counter often physically sits, while the office with the authority
// is at the block or the district. This maps a chosen location to the rung
// that governs it, and says plainly which case it is.
export const LADDER_RUNG_FOR = {
  village: 'village',
  block: 'block',
  tehsil: 'block',
  district: 'district',
  state: 'state',
};

export const LADDER_RUNG_NOTE = {
  village:
    'Your Gram Panchayat is the first rung. It is the office that creates the job card, records the muster, and hands work out.',
  block:
    'Your block is the rung with the authority. The Programme Officer sits here.',
  tehsil:
    'A tehsil is a revenue division, not a tier of the scheme. The counter may sit inside it, but the office that decides sits at the block or the district.',
  district:
    'Your district is the rung with the authority. The District Programme Coordinator sits here.',
  state:
    'Your State runs the scheme. The State department is where the money and the rules are administered.',
};
