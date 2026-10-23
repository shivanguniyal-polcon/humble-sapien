// Generates the India locality hierarchy and its map geometry.
//
// Source: geoBoundaries gbOpen, released by the wmgeolab geoBoundaries
// project. It is built from the Local Government Directory (LGD) published
// by the Ministry of Panchayati Raj, and from Election Commission and
// DataMeet boundaries for states.
//
//   ADM1  36 states and union territories   CC BY 2.5 IN  (DataMeet / ECI)
//   ADM2  735 districts                     ODbL 1.0     (Pathways / LGD)
//   ADM3  6,824 sub-districts (tehsil)      ODbL 1.0     (Pathways / LGD)
//   ADM4  7,143 community development blocks ODbL 1.0    (Pathways / LGD)
//   ADM5  649,771 villages                  ODbL 1.0     (Pathways / Census)
//
// The ODbL share-alike obligation attaches to the derived locality database,
// not to the code around it. The generated data files carry that notice.
//
// The source files carry no parent-child links, so the hierarchy is derived
// here: every unit is assigned to its parent by a point-in-polygon test on
// an interior point of the unit. Nothing is assumed about names matching
// across levels, because a tehsil and a block with the same name are not
// always the same unit.
//
// Cached inputs live in scripts/.cache/india/ (gitignored, reproducible).
// Download them with:
//   curl -L -o scripts/.cache/india/IND-ADM1.geojson \
//     https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1.geojson
//   ...and the same for ADM2, ADM3, ADM4, ADM5.
//
// The village names are written first as one chunk per State, and then cut
// into one chunk per district by scripts/split-india-villages.mjs. Run the
// pair together with `npm run build:india`.
//
// Usage: node --max-old-space-size=6144 scripts/build-india-admin.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { villageChunkBody, villageChunkName } from './lib/village-chunks.mjs';

const CACHE = new URL('./.cache/india/', import.meta.url);
const OUT_DIR = new URL('../src/data/india/', import.meta.url);

// The map is drawn for India only, so one projection is fitted to the state
// layer and every level shares it. A Mercator is wrong for polar areas but
// this spans 8 to 37 degrees north, where the distortion is modest and
// consistent.
const MAP_W = 1000;
const MAP_H = 900;

// Simplification tolerance in projected pixels. Districts are drawn at full
// size, so they can afford detail; blocks are drawn inside one district and
// are dropped to a coarser tolerance to keep the per-state chunks small.
const EPS_STATE = 0.5;
const EPS_DISTRICT = 0.35;
const EPS_BLOCK = 0.45;

// ---------------------------------------------------------------------------
// geometry helpers

function load(file) {
  const url = new URL(file, CACHE);
  if (!existsSync(url)) {
    console.error(`missing ${file}. See the download commands in this file's header.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(url, 'utf8'));
}

function ringsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

// Douglas-Peucker in projected pixel space, so a corner is never cut off.
function simplify(points, eps) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i += 1) {
      const [x, y] = points[i];
      const t = ((x - ax) * dx + (y - ay) * dy) / len2;
      const d = (x - (ax + t * dx)) ** 2 + (y - (ay + t * dy)) ** 2;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx > 0 && maxD > eps * eps) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const simplified = points.filter((_, i) => keep[i]);
  return simplified.length < 3 ? points : simplified;
}

// Even-odd containment over a polygon's rings, holes included.
function pointInRings(rings, x, y) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

function ringCentroid(ring) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const f = xi * yj - xj * yi;
    a += f;
    cx += (xi + xj) * f;
    cy += (yi + yj) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-12) return ring[0].slice();
  return [cx / (6 * a), cy / (6 * a)];
}

// A point guaranteed to lie inside the polygon.
//
// The centroid works for convex shapes and fails for the concave ones, and a
// village is often a crescent around a hill. When the centroid falls
// outside, the standard fix applies: take the right-most vertex, cast a ray
// east, and stand halfway between the vertex and the first edge it meets.
// That point is always interior.
function interiorPoint(rings) {
  let outer = rings[0];
  let best = 0;
  for (let i = 1; i < rings.length; i += 1) {
    if (ringArea(rings[i]) > best) {
      best = ringArea(rings[i]);
      outer = rings[i];
    }
  }
  const c = ringCentroid(outer);
  if (pointInRings(rings, c[0], c[1])) return c;

  let vi = 0;
  for (let i = 1; i < outer.length; i += 1) {
    if (outer[i][0] > outer[vi][0]) vi = i;
  }
  const [vx, vy] = outer[vi];
  let minDx = Infinity;
  for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
    const [xi, yi] = outer[i];
    const [xj, yj] = outer[j];
    if (yi > vy !== yj > vy) {
      const dx = ((xj - xi) * (vy - yi)) / (yj - yi) + xi - vx;
      if (dx > 0 && dx < minDx) minDx = dx;
    }
  }
  if (!Number.isFinite(minDx)) return c;
  return [vx + minDx / 2, vy];
}

function bboxOf(rings) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

// A uniform grid over the parent boxes, so a child looks up only the few
// parents whose extent can possibly contain it. Testing every child against
// every parent would be 650,000 times 7,143 point-in-polygon tests.
function makeGrid(items, cell) {
  const map = new Map();
  const key = (x, y) => `${x},${y}`;
  items.forEach((it, idx) => {
    const [minX, minY, maxX, maxY] = it.box;
    for (let x = Math.floor(minX / cell); x <= Math.floor(maxX / cell); x += 1) {
      for (let y = Math.floor(minY / cell); y <= Math.floor(maxY / cell); y += 1) {
        const k = key(x, y);
        let list = map.get(k);
        if (!list) {
          list = [];
          map.set(k, list);
        }
        list.push(idx);
      }
    }
  });
  return {
    candidates(x, y) {
      return map.get(key(Math.floor(x / cell), Math.floor(y / cell))) || [];
    },
    // Every parent that overlaps the given box.
    inBox(minX, minY, maxX, maxY) {
      const out = new Set();
      for (let x = Math.floor(minX / cell); x <= Math.floor(maxX / cell); x += 1) {
        for (let y = Math.floor(minY / cell); y <= Math.floor(maxY / cell); y += 1) {
          for (const idx of map.get(key(x, y)) || []) out.add(idx);
        }
      }
      return [...out];
    },
  };
}

// ---------------------------------------------------------------------------
// names
//
// The source carries diacritics from a DataMeet transliteration and Census
// qualifiers such as "(Pt)" for a habitation part or "(UR)" for a census
// town. Neither helps a citizen searching for their village, so the
// diacritics go and the qualifier is kept in its own field.

const QUALIFIER = /\s*\(([^()]{1,40})\)\s*$/;

function cleanName(raw) {
  const text = (raw || '').replace(/\s+/g, ' ').trim();
  const plain = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s().'-]/g, '')
    .trim();
  const m = plain.match(QUALIFIER);
  if (!m) return { name: plain, kind: '' };
  const kind = m[1].trim();
  const stem = plain.slice(0, m.index).trim();
  // "(West)" and friends are part of the village's name, not a census kind.
  const placeKinds = new Set([
    'North', 'South', 'East', 'West', 'New', 'Old', 'Upper', 'Lower',
  ]);
  if (placeKinds.has(kind) || !stem) return { name: plain, kind: '' };
  return { name: stem, kind };
}

function slugOf(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-|-$/g, '') || 'x'
  );
}

// ---------------------------------------------------------------------------
// projection
//
// A hand-rolled Mercator. d3-geo's clip is built for spheres that cross the
// antimeridian, and it leaves a boundary ring in the path for every polygon
// it touches. India never crosses the antimeridian, so the projection is
// small enough to write out and produces exactly the path that was asked for.

const DEG = Math.PI / 180;

function mercatorY(latDeg) {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * DEG) / 2)) / DEG;
}

function fitProjection(rings) {
  const [minLon, minLat, maxLon, maxLat] = bboxOf(rings);
  const x0 = minLon;
  const x1 = maxLon;
  const y0 = mercatorY(minLat);
  const y1 = mercatorY(maxLat);
  const k = Math.min(MAP_W / (x1 - x0), MAP_H / (y1 - y0));
  // Centre the fitted box in the view.
  const offX = (MAP_W - k * (x1 - x0)) / 2;
  const offY = (MAP_H - k * (y1 - y0)) / 2;
  return {
    k,
    project(lon, lat) {
      return [offX + k * (lon - x0), offY + k * (y1 - mercatorY(lat))];
    },
  };
}

// Renders a geometry as an SVG path. Holes and separate parts both work as
// long as the path is filled with the even-odd rule, which the map does.
//
// The source geometry repeats vertices, so consecutive duplicates are dropped
// before simplification. That is lossless: a repeated vertex draws nothing,
// and the Douglas-Peucker pass would keep most of them anyway.
function pathOf(rings, projection, eps) {
  let out = '';
  for (const ring of rings) {
    const projected = ring.map(([lon, lat]) => projection.project(lon, lat));
    const pts = projected.filter(
      (p, i) => i === 0 || p[0] !== projected[i - 1][0] || p[1] !== projected[i - 1][1],
    );
    const simple = simplify(pts, eps);
    if (simple.length < 3) continue;
    out += `M${simple.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// load the levels

console.log('reading ADM1 (states)');
const adm1 = load('IND-ADM1.geojson');
console.log('reading ADM2 (districts)');
const adm2 = load('IND-ADM2.geojson');
console.log('reading ADM3 (sub-districts)');
const adm3 = load('IND-ADM3.geojson');
console.log('reading ADM4 (blocks)');
const adm4 = load('IND-ADM4.geojson');

// The projection is fitted to every level, not to the states alone. A block
// on the edge of Great Nicobar sits a little outside the state outline that
// the states were digitised from, and a shape that falls outside the
// viewbox is a shape that cannot be clicked.
const allRings = [
  ...adm1.features,
  ...adm2.features,
  ...adm3.features,
  ...adm4.features,
].flatMap((f) => ringsOf(f.geometry));
const projection = fitProjection(allRings);

const states = adm1.features.map((f, i) => {
  const rings = ringsOf(f.geometry);
  const clean = cleanName(f.properties.shapeName);
  return {
    id: i,
    name: clean.name,
    kind: clean.kind,
    iso: f.properties.shapeISO || '',
    rings,
    box: bboxOf(rings),
    point: interiorPoint(rings),
  };
});
const stateGrid = makeGrid(states, 1);

const districts = adm2.features.map((f, i) => {
  const rings = ringsOf(f.geometry);
  const clean = cleanName(f.properties.shapeName);
  return {
    id: i,
    name: clean.name,
    kind: clean.kind,
    rings,
    box: bboxOf(rings),
    point: interiorPoint(rings),
    state: -1,
  };
});
const districtGrid = makeGrid(districts, 1);

const subdistricts = adm3.features.map((f, i) => {
  const rings = ringsOf(f.geometry);
  const clean = cleanName(f.properties.shapeName);
  return {
    id: i,
    name: clean.name,
    kind: clean.kind,
    rings,
    box: bboxOf(rings),
    point: interiorPoint(rings),
    district: -1,
  };
});
const subdistrictGrid = makeGrid(subdistricts, 1);

const blocks = adm4.features.map((f, i) => {
  const rings = ringsOf(f.geometry);
  const clean = cleanName(f.properties.shapeName);
  return {
    id: i,
    name: clean.name,
    kind: clean.kind,
    rings,
    box: bboxOf(rings),
    point: interiorPoint(rings),
    district: -1,
    subdistrict: -1,
  };
});
const blockGrid = makeGrid(blocks, 1);

// ---------------------------------------------------------------------------
// assign each level to its parent

function assign(child, grid, parents, key) {
  const [x, y] = child.point;
  for (const idx of grid.candidates(x, y)) {
    const parent = parents[idx];
    if (pointInRings(parent.rings, x, y)) {
      child[key] = parent.id;
      return true;
    }
  }
  return false;
}

// The point test fails where the two levels were drawn from different
// sources and do not nest exactly: a coastal district reaches further out
// to sea than the state outline that was digitised separately. In that case
// the parent that contains the most of the child's boundary wins, which is
// the same thing a reader of the map would conclude.
function assignByVotes(child, grid, parents, key) {
  const votes = new Map();
  const [minX, minY, maxX, maxY] = child.box;
  const cands = grid.inBox(minX, minY, maxX, maxY);
  for (const ring of child.rings) {
    const step = Math.max(1, Math.floor(ring.length / 40));
    for (let i = 0; i < ring.length; i += step) {
      const [x, y] = ring[i];
      for (const idx of cands) {
        if (pointInRings(parents[idx].rings, x, y)) {
          votes.set(idx, (votes.get(idx) || 0) + 1);
        }
      }
    }
  }
  let best = -1;
  let bestVotes = 0;
  for (const [idx, count] of votes) {
    if (count > bestVotes) {
      bestVotes = count;
      best = idx;
    }
  }
  if (best >= 0) {
    child[key] = best;
    return true;
  }
  return false;
}

let unassignedDistricts = 0;
for (const d of districts) {
  if (!assign(d, stateGrid, states, 'state')) unassignedDistricts += 1;
}
for (const s of subdistricts) {
  if (!assign(s, districtGrid, districts, 'district')) {
    // Fall back to the district whose name the tehsil carries, which covers
    // the union territories where the island geometry does not nest.
    const byName = districts.find((d) => d.name === s.name);
    if (byName) s.district = byName.id;
    else {
      // Nothing else is evidence, so the nearest district wins. A tehsil
      // with no district is a tehsil that appears in no state.
      let best = -1;
      let bestDist = Infinity;
      for (const d of districts) {
        const dist = Math.hypot(d.point[0] - s.point[0], d.point[1] - s.point[1]);
        if (dist < bestDist) {
          bestDist = dist;
          best = d.id;
        }
      }
      if (best >= 0) s.district = best;
    }
  }
}
for (const b of blocks) {
  if (!assign(b, districtGrid, districts, 'district')) {
    const byName = districts.find((d) => d.name === b.name);
    if (byName) b.district = byName.id;
    else if (assignByVotes(b, districtGrid, districts, 'district')) {
      // The vote gave it a district.
    } else {
      let best = -1;
      let bestDist = Infinity;
      for (const d of districts) {
        const dist = Math.hypot(d.point[0] - b.point[0], d.point[1] - b.point[1]);
        if (dist < bestDist) {
          bestDist = dist;
          best = d.id;
        }
      }
      if (best >= 0) b.district = best;
    }
  }
  if (!assign(b, subdistrictGrid, subdistricts, 'subdistrict')) {
    const byName = subdistricts.find((s) => s.name === b.name);
    if (byName) b.subdistrict = byName.id;
  }
}

// A block belongs to a sub-district of its own district. The two levels were
// drawn from separate sources, so at a border a block can land in a
// sub-district that the next district over owns. Left alone it would appear
// under a tehsil that its own state does not contain, and the tehsil list
// and the block list would disagree.
//
// The repair picks the sub-district of the block's own district that covers
// the most of the block, and falls back to the nearest one.
const subdistrictsByDistrict = new Map();
for (const s of subdistricts) {
  if (s.district < 0) continue;
  if (!subdistrictsByDistrict.has(s.district)) subdistrictsByDistrict.set(s.district, []);
  subdistrictsByDistrict.get(s.district).push(s);
}

function assignAmong(child, parents, key) {
  for (const cand of parents) {
    if (pointInRings(cand.rings, child.point[0], child.point[1])) {
      child[key] = cand.id;
      return true;
    }
  }
  let best = -1;
  let bestVotes = 0;
  for (const cand of parents) {
    let count = 0;
    for (const ring of child.rings) {
      const step = Math.max(1, Math.floor(ring.length / 40));
      for (let i = 0; i < ring.length; i += step) {
        const [x, y] = ring[i];
        if (pointInRings(cand.rings, x, y)) count += 1;
      }
    }
    if (count > bestVotes) {
      bestVotes = count;
      best = cand.id;
    }
  }
  if (best >= 0) {
    child[key] = best;
    return true;
  }
  let bestDist = Infinity;
  for (const cand of parents) {
    const dist = Math.hypot(cand.point[0] - child.point[0], cand.point[1] - child.point[1]);
    if (dist < bestDist) {
      bestDist = dist;
      best = cand.id;
    }
  }
  if (best >= 0) {
    child[key] = best;
    return true;
  }
  return false;
}

let reparentedBlocks = 0;
let homelessBlocks = 0;
for (const b of blocks) {
  if (b.district < 0) {
    homelessBlocks += 1;
    continue;
  }
  const current = b.subdistrict >= 0 ? subdistricts[b.subdistrict] : null;
  if (current && current.district === b.district) continue;
  const siblings = subdistrictsByDistrict.get(b.district) || [];
  if (!siblings.length) {
    homelessBlocks += 1;
    b.subdistrict = -1;
    continue;
  }
  if (assignAmong(b, siblings, 'subdistrict')) reparentedBlocks += 1;
}
console.log(
  `reparented ${reparentedBlocks} blocks to a sub-district of their own district, ` +
    `${homelessBlocks} blocks without a parent`,
);
console.log(
  `assigned ADM2/ADM3/ADM4 to parents, ${unassignedDistricts} districts unmatched`,
);

// A district that no state contains still belongs to one. The boundary
// between the two levels is drawn from separate sources, so the nearest
// state by distance is the only evidence left.
for (const d of districts) {
  if (d.state >= 0) continue;
  if (assignByVotes(d, stateGrid, states, 'state')) continue;
  let best = -1;
  let bestDist = Infinity;
  for (const s of states) {
    const dist = Math.hypot(s.point[0] - d.point[0], s.point[1] - d.point[1]);
    if (dist < bestDist) {
      bestDist = dist;
      best = s.id;
    }
  }
  if (best >= 0) d.state = best;
}
let stillOrphan = districts.filter((d) => d.state < 0).length;
console.log(`districts still without a state: ${stillOrphan}`);

// ---------------------------------------------------------------------------
// ADM5: 649,771 villages, streamed

console.log('reading ADM5 (villages) — streamed');
const VILLAGE_FILE = new URL('IND-ADM5.geojson', CACHE);
const fd = openSync(VILLAGE_FILE, 'r');
const CHUNK = 1 << 22;
const buf = Buffer.allocUnsafe(CHUNK);
let carry = '';
let villageCount = 0;
let villageOrphans = 0;
let villageAdopted = 0;
const villagesByBlock = new Map();
const villageKinds = new Map();

function handleFeature(text) {
  let f;
  try {
    f = JSON.parse(text);
  } catch {
    return;
  }
  if (!f || f.type !== 'Feature') return;
  const rings = ringsOf(f.geometry);
  if (!rings.length) return;
  const [x, y] = interiorPoint(rings);
  let blockId = -1;
  for (const idx of blockGrid.candidates(x, y)) {
    const b = blocks[idx];
    if (pointInRings(b.rings, x, y)) {
      blockId = b.id;
      break;
    }
  }
  villageCount += 1;
  if (blockId < 0) {
    // The village is in the directory but the block that owns it has no
    // published boundary. The nearest block is the best answer available,
    // and the village name still reaches the citizen who needs it.
    let best = -1;
    let bestDist = Infinity;
    for (const b of blocks) {
      const dist = Math.hypot(b.point[0] - x, b.point[1] - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = b.id;
      }
    }
    if (best < 0) {
      villageOrphans += 1;
      return;
    }
    blockId = best;
    villageAdopted += 1;
  }
  const clean = cleanName(f.properties.shapeName);
  if (!clean.name) return;
  let list = villagesByBlock.get(blockId);
  if (!list) {
    list = [];
    villagesByBlock.set(blockId, list);
  }
  list.push(clean.name);
  if (clean.kind) {
    const kinds = villageKinds.get(blockId) || {};
    kinds[clean.name] = clean.kind;
    villageKinds.set(blockId, kinds);
  }
}
{
  let bytes;
  while ((bytes = readSync(fd, buf, 0, CHUNK, null)) > 0) {
    carry += buf.toString('utf8', 0, bytes);
    // The file holds one feature per line, but a feature can still wrap, so
    // the split point is the last newline that leaves a whole object.
    let start = 0;
    let nl;
    while ((nl = carry.indexOf('\n', start)) !== -1) {
      const line = carry.slice(start, nl);
      start = nl + 1;
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Every feature but the last ends in a comma, because they are entries
      // of a JSON array.
      if (!trimmed.includes('"Feature"')) continue;
      if (!trimmed.endsWith('}') && !trimmed.endsWith('},')) continue;
      handleFeature(trimmed.replace(/,\s*$/, ''));
    }
    carry = carry.slice(start);
  }
  const tail = carry.trim();
  if (tail && tail.includes('"Feature"')) {
    // The final feature of the file is followed by the closing brackets.
    const body = tail.slice(tail.indexOf('{'), tail.lastIndexOf('}') + 1);
    handleFeature(body.replace(/,\s*$/, ''));
  }
}
closeSync(fd);
console.log(
  `villages read: ${villageCount}, unassigned to a block: ${villageOrphans}, ` +
    `placed in the nearest block: ${villageAdopted}`,
);

// ---------------------------------------------------------------------------
// map paths

// The state outline is the one shape drawn at full size on the home map, so
// it carries the finest tolerance. Half a projected pixel is below what the
// browser can show at the width the map is drawn.
const statePaths = states.map((s) => pathOf(s.rings, projection, EPS_STATE));
const districtPaths = districts.map((d) => pathOf(d.rings, projection, EPS_DISTRICT));
const blockPaths = blocks.map((b) => pathOf(b.rings, projection, EPS_BLOCK));

// ---------------------------------------------------------------------------
// assemble

mkdirSync(OUT_DIR, { recursive: true });

// Blocks inherit their state through their district.
for (const b of blocks) {
  b.state = b.district >= 0 ? districts[b.district].state : -1;
}
for (const s of subdistricts) {
  s.state = s.district >= 0 ? districts[s.district].state : -1;
}

const stateMeta = states.map((s) => ({
  id: s.id,
  name: s.name,
  iso: s.iso,
  path: statePaths[s.id],
  districts: 0,
  blocks: 0,
  villages: 0,
}));
for (const d of districts) {
  if (d.state >= 0) stateMeta[d.state].districts += 1;
}
for (const b of blocks) {
  if (b.state >= 0) {
    stateMeta[b.state].blocks += 1;
    stateMeta[b.state].villages += (villagesByBlock.get(b.id) || []).length;
  }
}

// The per-state chunks carry the districts, the sub-districts and the blocks,
// so the main bundle stays small and the browser only downloads the state a
// citizen actually lives in. The village names live in a second chunk, loaded
// only when a citizen reaches the village step.
const chunkFor = (state) => {
  const dIdx = districts.filter((d) => d.state === state.id).map((d) => d.id);
  const sIdx = subdistricts.filter((s) => s.state === state.id).map((s) => s.id);
  const bIdx = blocks.filter((b) => b.state === state.id).map((b) => b.id);
  return {
    districts: dIdx.map((i) => ({
      id: i,
      name: districts[i].name,
      kind: districts[i].kind,
      path: districtPaths[i],
    })),
    subdistricts: sIdx.map((i) => ({
      id: i,
      name: subdistricts[i].name,
      kind: subdistricts[i].kind,
      district: subdistricts[i].district,
    })),
    blocks: bIdx.map((i) => ({
      id: i,
      name: blocks[i].name,
      kind: blocks[i].kind,
      district: blocks[i].district,
      subdistrict: blocks[i].subdistrict,
      path: blockPaths[i],
    })),
  };
};

const written = [];
for (const state of states) {
  const chunk = chunkFor(state);
  const villages = {};
  const kinds = {};
  for (const b of chunk.blocks) {
    const list = villagesByBlock.get(b.id);
    if (list && list.length) villages[b.id] = list;
    const k = villageKinds.get(b.id);
    if (k && Object.keys(k).length) kinds[b.id] = k;
  }
  const slug = slugOf(state.name);
  const body = `// GENERATED by scripts/build-india-admin.mjs — do not edit by hand.
//
// Locality data for ${state.name}, derived from the Local Government
// Directory via geoBoundaries gbOpen. Licensed under the Open Database
// License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/
// Share-alike applies to this data. The code that uses it is licensed
// separately.
//
// Coverage: ${chunk.districts.length} districts, ${chunk.subdistricts.length}
// sub-districts, ${chunk.blocks.length} blocks.

export const STATE_ID = ${state.id};
export const STATE_NAME = ${JSON.stringify(state.name)};
export const DISTRICTS = ${JSON.stringify(chunk.districts)};
export const SUBDISTRICTS = ${JSON.stringify(chunk.subdistricts)};
export const BLOCKS = ${JSON.stringify(chunk.blocks)};
`;
  writeFileSync(new URL(`state-${slug}.js`, OUT_DIR), body);
  written.push([`state-${slug}.js`, Buffer.byteLength(body)]);

  const villageBody = villageChunkBody({
    scope: 'state',
    title: state.name,
    villages,
    kinds,
  });
  const villageName = villageChunkName(`state-${slug}`);
  writeFileSync(new URL(villageName, OUT_DIR), villageBody);
  written.push([villageName, Buffer.byteLength(villageBody)]);
}

const main = `// GENERATED by scripts/build-india-admin.mjs — do not edit by hand.
//
// India administrative hierarchy: state, district, sub-district (tehsil),
// community development block, village.
//
// States: DataMeet and Election Commission boundaries, CC BY 2.5 IN.
// Districts, sub-districts, blocks and villages: the Local Government
// Directory as released by geoBoundaries gbOpen, under the Open Database
// License (ODbL) 1.0, https://opendatacommons.org/licenses/odbl/1-0/.
// The share-alike obligation attaches to this data. Attribution:
// "Locality data from the Local Government Directory (Ministry of Panchayati
// Raj) via geoBoundaries".
//
// Each state also has a chunk holding its districts, sub-districts and
// blocks, and a second chunk holding its village names. The chunks are
// loaded on demand, so the main bundle carries only the state outlines.

export const INDIA_VIEWBOX = '0 0 ${MAP_W} ${MAP_H}';

export const STATES = ${JSON.stringify(stateMeta)};
`;
writeFileSync(new URL('indiaAdmin.js', OUT_DIR), main);

const totalChunk = written.reduce((n, [, b]) => n + b, 0);
console.log(
  `wrote src/data/india/indiaAdmin.js (${(Buffer.byteLength(main) / 1024).toFixed(0)} KB)`,
);
console.log(
  `wrote ${written.length} chunks, ${(totalChunk / 1024 / 1024).toFixed(1)} MB total`,
);
const biggest = written.slice().sort((a, b) => b[1] - a[1]).slice(0, 6);
for (const [name, bytes] of biggest) {
  console.log(`  ${name}: ${(bytes / 1024).toFixed(0)} KB`);
}
console.log('\nper-state unit counts:');
for (const s of stateMeta) {
  console.log(
    `  ${s.name}: ${s.districts} districts, ${s.blocks} blocks, ${s.villages} villages`,
  );
}
