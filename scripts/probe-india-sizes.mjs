// Throwaway probe: how big does each admin level get once simplified into
// SVG path strings? Decides what the map can afford to carry.
import { readFileSync } from 'node:fs';
import { geoMercator, geoPath } from 'd3-geo';

const CACHE = new URL('./.cache/india/', import.meta.url);

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
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx > 0 && maxD > eps * eps) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function sink(eps) {
  let out = '';
  let cur = [];
  const flush = () => {
    if (cur.length > 1) {
      const pts = simplify(cur, eps);
      if (pts.length > 1) {
        out += `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
      }
    }
    cur = [];
  };
  return {
    beginPath() { out = ''; cur = []; },
    moveTo(x, y) { flush(); cur = [[x, y]]; },
    lineTo(x, y) { cur.push([x, y]); },
    closePath() { flush(); },
    arc(x, y, r) { flush(); out += `M${(x - r).toFixed(1)},${(y - r).toFixed(1)}h${(2 * r).toFixed(1)}v${(2 * r).toFixed(1)}h${(-2 * r).toFixed(1)}Z`; },
    toString() { flush(); return out; },
  };
}

for (const level of ['ADM1', 'ADM2', 'ADM3', 'ADM4']) {
  const g = JSON.parse(readFileSync(new URL(`IND-${level}.geojson`, CACHE)));
  const projection = geoMercator();
  projection.fitExtent([[0, 0], [1000, 1000]], g);
  for (const eps of [0.5, 1, 2]) {
    const s = sink(eps);
    const p = geoPath(projection, s);
    for (const f of g.features) p(f);
    const d = s.toString();
    console.log(
      `${level} eps=${eps}  features=${g.features.length}  pathBytes=${(Buffer.byteLength(d) / 1024).toFixed(0)}KB`,
    );
  }
}
