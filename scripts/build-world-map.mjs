// Generates src/data/worldMap.js — the Atlas world map.
//
// Sources (both public domain / CC0, no attribution owed):
//   - Natural Earth 50m admin-0 countries (public domain) for the world.
//   - DataMeet india-composite (CC0) for India, because the Natural Earth
//     default draws India's de facto boundary, which omits Aksai Chin and
//     Pakistan-occupied Kashmir. Section 2(2) of the Criminal Law Amendment
//     Act 1961 makes publishing a non-conforming India map an offence, so
//     India's geometry is swapped for the Survey of India claim.
//   India is emitted as a separate path and drawn last, so its fill covers
//   the areas the de facto world layer still shows under Pakistan and China.
//
// The build refuses to emit a map whose India is wrong. Two checks run:
// one against the source geometry, one against the path string actually
// written out, so simplification cannot quietly drop a territory.
//
// Cached inputs live in scripts/.cache/worldmap/ (gitignored, reproducible).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { geoNaturalEarth1, geoPath, geoContains } from 'd3-geo';

const CACHE = new URL('./.cache/worldmap/', import.meta.url);
const OUT = new URL('../src/data/worldMap.js', import.meta.url);

const WIDTH = 1200;
const HEIGHT = 620;
// Anything under half a pixel is invisible on the rendered map; the sources
// carry 1:50m detail that would otherwise bloat the bundle for nothing.
// Overridable so the build can be re-tuned without editing this file.
const EPSILON = Number(process.env.MAP_EPSILON || 0.6);
// Features narrower than this across are simplified more gently. An island
// is one or two pixels wide at world scale; simplifying its outline to the
// normal tolerance erases it, but simplifying it to a hair's breadth keeps
// it on the map for a fraction of the bytes.
const SMALL_RING_PX = Number(process.env.MAP_SMALL_RING || 4);
const SMALL_EPS_FACTOR = Number(process.env.MAP_SMALL_FACTOR || 0.1);

// The territories the Government of India claims, and the neighbours that
// must stay outside the line. Each entry is
// [label, minLon, minLat, maxLon, maxLat, mode].
//
// Boxes, not points: an island in the Andamans is barely a pixel wide on a
// world map, so any point inside it sits on its coastline and a hair of
// simplification moves it out. The build instead works on boxes.
//
//   'point'   the territory has room for an interior point; the build finds
//             the point furthest from the claimed boundary and checks it
//             survives into the path that is actually drawn.
//   'feature' the territory is smaller than a pixel (Lakshadweep's atolls are
//             a fraction of one), so no interior point can be found. The
//             check is instead that the territory is drawn at all: a shape
//             centred in the box must appear in both the source geometry and
//             the drawn path.
//   'outside' a neighbour, which must fall outside the claimed line.
const INDIA_PROBES = [
  ['Aksai Chin', 78.0, 34.6, 79.6, 35.6, 'point'],
  ['Gilgit-Baltistan', 73.6, 35.4, 75.4, 36.4, 'point'],
  ['Pakistan-occupied Kashmir', 73.0, 34.0, 74.0, 35.2, 'point'],
  ['Arunachal Pradesh', 91.0, 27.2, 93.0, 28.2, 'point'],
  ['Jammu & Kashmir', 74.3, 33.6, 75.3, 34.4, 'point'],
  ['Ladakh', 76.8, 33.7, 78.2, 34.6, 'point'],
  ['Andaman & Nicobar', 92.4, 11.2, 93.0, 12.0, 'point'],
  ['Nicobar Islands', 93.6, 6.8, 94.0, 7.2, 'point'],
  ['Lakshadweep', 72.4, 10.3, 73.1, 11.1, 'feature'],
  ['Pakistan', 72.4, 33.4, 73.4, 34.0, 'outside'],
  ['China', 90.6, 29.2, 91.6, 30.1, 'outside'],
  ['Bangladesh', 89.9, 23.4, 90.9, 24.2, 'outside'],
  ['Nepal', 84.8, 27.3, 85.9, 28.1, 'outside'],
  ['Afghanistan', 68.7, 34.1, 69.7, 35.0, 'outside'],
  ['Myanmar', 95.6, 16.3, 96.7, 17.3, 'outside'],
  ['Sri Lanka', 79.4, 6.4, 80.3, 7.5, 'outside'],
];

const load = (f) => {
  const url = new URL(f, CACHE);
  if (!existsSync(url)) {
    console.error(
      `missing ${f}. Fetch the sources first:\n` +
        `  curl -o scripts/.cache/worldmap/ne-50m.geojson \\\n` +
        `    https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson\n` +
        `  curl -o scripts/.cache/worldmap/india-composite.geojson \\\n` +
        `    https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson`,
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(url));
};

// Douglas-Peucker in projected pixel space. Correct at corners where a naive
// distance filter would cut them off.
function simplify(points, eps) {
  if (points.length < 3) return points;
  // A feature a few pixels across is simplified more gently further down: at
  // world scale an island is a single pixel, and the normal tolerance would
  // leave it with no interior at all.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX - minX < SMALL_RING_PX && maxY - minY < SMALL_RING_PX) {
    eps = eps * SMALL_EPS_FACTOR;
  }
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
  // A ring that collapses to a line has no area left, so the feature it
  // describes would vanish from the map entirely.
  return simplified.length < 3 ? points : simplified;
}

// A canvas-shaped sink that simplifies each subpath as it goes. Handing d3 a
// context keeps its spherical clipping, so Russia and Fiji are not smeared
// across the antimeridian the way a naive lon/lat loop would smear them.
function simplifyingSink(eps) {
  let out = '';
  let cur = [];
  const flush = (close) => {
    if (cur.length) {
      const pts = simplify(cur, eps);
      if (pts.length > 1) {
        out += `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;
        if (close) out += 'Z';
      }
    }
    cur = [];
  };
  return {
    beginPath() {
      out = '';
      cur = [];
    },
    moveTo(x, y) {
      flush(true);
      cur = [[x, y]];
    },
    lineTo(x, y) {
      cur.push([x, y]);
    },
    closePath() {
      flush(true);
    },
    arc(x, y, r) {
      // Point features: a tiny square is enough at this scale.
      flush(true);
      out += `M${(x - r).toFixed(1)},${(y - r).toFixed(1)}h${(2 * r).toFixed(1)}v${(2 * r).toFixed(1)}h${(-2 * r).toFixed(1)}Z`;
    },
    toString() {
      flush(true);
      return out;
    },
  };
}

// Read an SVG path back into rings of pixel points, so the shipped string can
// be tested rather than only the geometry that produced it.
function parseRings(d) {
  const rings = [];
  for (const chunk of d.split('M').filter(Boolean)) {
    const body = chunk.replace(/Z/g, '');
    const nums = body.split(/[L,]/).map(Number).filter((n) => !Number.isNaN(n));
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    if (pts.length > 2) rings.push(pts);
  }
  return rings;
}

// Even-odd containment: a point is inside when it crosses an odd number of
// ring edges. Holes fall out of the rule for free.
function pointInRings(rings, [x, y]) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

// ---- finding a probe point that is genuinely inside a territory ----------
// A territory like the Andamans is a fraction of a pixel wide, so a probe
// placed by hand sits on its coastline and a hair of simplification pushes it
// out. Instead, start from the middle of the territory's box and walk
// towards the point furthest from the claimed boundary.

const ringsOf = (geometry) =>
  geometry.coordinates.flatMap((polygon) => polygon.map((ring) => ring));

// A coarse edge list for measuring how far a point sits from the boundary.
// The exact answer comes from d3's own containment test; this only guides
// the search, so sampling the long mainland ring is fine.
function sampledEdges(rings) {
  const edges = [];
  for (const ring of rings) {
    const step = Math.max(1, Math.floor(ring.length / 1200));
    for (let i = 0; i < ring.length; i += step) {
      const a = ring[i];
      const b = ring[(i + step) % ring.length];
      edges.push([a[0], a[1], b[0], b[1]]);
    }
  }
  return edges;
}

function distanceToEdges(edges, x, y) {
  let best = Infinity;
  for (const [ax, ay, bx, by] of edges) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const ex = x - (ax + t * dx);
    const ey = y - (ay + t * dy);
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Does a ring's centre fall inside the given box?
function centreInBox(ring, box) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const [lo1, la1, lo2, la2] = box;
  return cx >= lo1 && cx <= lo2 && cy >= la1 && cy <= la2;
}

// The point inside `box` that lies furthest from the claimed boundary.
function deepestPoint(box, geometry, edges) {
  const [lo1, la1, lo2, la2] = box;
  const w = lo2 - lo1;
  const h = la2 - la1;
  let radius = Math.min(w, h) / 2;
  let best = null;
  const consider = (x, y) => {
    if (!geoContains(geometry, [x, y])) return;
    const d = distanceToEdges(edges, x, y);
    if (!best || d > best.d) best = { x, y, d };
  };
  // Eight neighbours around the centre, then tighten the step.
  for (const angle of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const a = (angle * Math.PI) / 4;
    consider(lo1 + w / 2 + Math.cos(a) * radius, la1 + h / 2 + Math.sin(a) * radius);
  }
  consider(lo1 + w / 2, la1 + h / 2);
  for (let round = 0; round < 3 && radius > 1e-4; round += 1) {
    radius /= 4;
    const cx = best ? best.x : lo1 + w / 2;
    const cy = best ? best.y : la1 + h / 2;
    for (const angle of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const a = (angle * Math.PI) / 4;
      consider(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
  }
  return best;
}

const world = load('ne-50m.geojson');
const indiaClaim = load('india-composite.geojson');

const projection = geoNaturalEarth1();
// Fit to the whole world first so India's swap cannot change the framing.
projection.fitExtent(
  [
    [0, 0],
    [WIDTH, HEIGHT],
  ],
  world,
);

const isoOf = (f) => {
  const p = f.properties || {};
  const code = [p.ISO_A2, p.WB_A2, p.POSTAL].find((c) => c && c !== '-99');
  if (!code) return null;
  // Natural Earth codes Taiwan "CN-TW" to reflect a point of view; the ISO
  // alpha-2 the rest of the world uses is TW.
  const bare = code.includes('-') ? code.split('-').pop() : code;
  return bare.toUpperCase();
};

const rows = [];
const unknown = [];
for (const f of world.features) {
  const iso = isoOf(f);
  if (!iso) {
    unknown.push(f.properties?.NAME);
    continue;
  }
  // India is drawn from the claim geometry instead.
  if (iso === 'IN') continue;
  const sink = simplifyingSink(EPSILON);
  geoPath(projection, sink)(f);
  const d = sink.toString();
  if (d) rows.push([iso, f.properties?.NAME || iso, d]);
}

rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));

const indiaSink = simplifyingSink(EPSILON);
geoPath(projection, indiaSink)(indiaClaim);
const indiaPath = indiaSink.toString();

// ---- verification -------------------------------------------------------
// Check 1: the source geometry, with d3's own spherical containment.
// Check 2: the path string about to be written, so simplification and the
//          sink cannot have dropped a territory on the way out.
const indiaRings = parseRings(indiaPath);
const claimRings = ringsOf(indiaClaim.features[0].geometry);
const claimEdges = sampledEdges(claimRings);
const probes = {};
const failures = [];

for (const [label, lo1, la1, lo2, la2, mode] of INDIA_PROBES) {
  const box = [lo1, la1, lo2, la2];
  if (mode === 'feature') {
    // The territory is drawn if a shape centred in its box survives. The
    // same test runs against the source geometry, so a territory that the
    // source does not draw is a fault in the box, not in the map.
    const inSource = claimRings.some((ring) => centreInBox(ring, box));
    const inPath = indiaRings.some((ring) => {
      const back = ring.map(([x, y]) => projection.invert([x, y])).filter(Boolean);
      return back.length > 2 && centreInBox(back, box);
    });
    probes[label] = { mode, drawn: inPath };
    if (!inSource) failures.push(`${label}: the source geometry draws no shape in this box`);
    if (!inPath) failures.push(`${label}: the drawn map drops the territory entirely`);
    continue;
  }

  const expected = mode === 'point';
  let point;
  if (expected) {
    // Look for the point of the territory that is furthest from its border.
    const found = deepestPoint(box, indiaClaim, claimEdges);
    if (!found) {
      failures.push(`${label}: no point of the claimed boundary lies inside its own box`);
      continue;
    }
    point = [found.x, found.y];
  } else {
    // A neighbour: the middle of its box must fall outside the claim.
    point = [(lo1 + lo2) / 2, (la1 + la2) / 2];
  }
  const inSource = geoContains(indiaClaim, point);
  const px = projection(point);
  const inPath = px ? pointInRings(indiaRings, px) : false;
  probes[label] = { mode, point: point.map((n) => Number(n.toFixed(4))), inside: inPath };
  if (inSource !== expected) {
    failures.push(
      `${label}: source geometry says ${inSource ? 'inside' : 'outside'}, expected ${expected ? 'inside' : 'outside'}`,
    );
  }
  if (inPath !== inSource) {
    failures.push(
      `${label}: source says ${inSource ? 'inside' : 'outside'} but the drawn path says ${inPath ? 'inside' : 'outside'}`,
    );
  }
}

if (failures.length) {
  console.error('India boundary check failed:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

mkdirSync(new URL('./.cache/worldmap/', import.meta.url), { recursive: true });

const js = `// GENERATED by scripts/build-world-map.mjs — do not edit by hand.
//
// World geometry: Natural Earth 50m admin-0 (public domain).
// India geometry: DataMeet india-composite (CC0), drawn from the Survey of
// India claim rather than the de facto boundary — see the build script.
// Both sources are public domain or CC0; no attribution is owed, though the
// provenance is recorded here because the India boundary is a legal matter.

export const WORLD_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}';

// [ISO 3166-1 alpha-2, name, SVG path] for every country except India.
export const WORLD_COUNTRIES = ${JSON.stringify(rows)};

// Every ISO code the map can light. India is drawn from its own path, so it
// is not in WORLD_COUNTRIES, but it is on the map all the same.
export const MAP_ISO_CODES = ${JSON.stringify([...new Set([...rows.map(([iso]) => iso), 'IN'])].sort())};

// India's claimed boundary, including Aksai Chin and Pakistan-occupied
// Kashmir. Rendered after the other countries so its fill wins.
export const INDIA_PATH = ${JSON.stringify(indiaPath)};

// Which probe points fall inside the drawn India boundary, verified by the
// build against both the source geometry and this exact path string.
export const INDIA_CONTAINS = ${JSON.stringify(probes)};
`;

writeFileSync(OUT, js);

const kb = (Buffer.byteLength(js) / 1024).toFixed(1);
console.log(`wrote src/data/worldMap.js — ${rows.length + 1} countries, ${kb} KB`);
console.log(`india boundary verified: ${INDIA_PROBES.length}/${INDIA_PROBES.length} probes`);
if (unknown.length) console.log(`no ISO code for: ${unknown.join(', ')}`);
