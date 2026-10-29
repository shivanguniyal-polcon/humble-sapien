#!/usr/bin/env node
// Data Point figures: five standalone, print-ready SVGs.
//
//     node scripts/datapoint_figures.mjs
//
// Reads   articles/datapoint-ai-policy-readability/data/results.json
// Writes  articles/datapoint-ai-policy-readability/figures/*.svg
//
// The figures are written as plain SVG with no runtime dependency, because
// a newspaper desk should be able to open the file, recolour it, and put
// it in a page without a build step. Each one carries its own title,
// subtitle, source line and note, so it can travel on its own.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DATA_DIR = path.join(ROOT, 'articles', 'datapoint-ai-policy-readability', 'data');
const FIG_DIR = path.join(ROOT, 'articles', 'datapoint-ai-policy-readability', 'figures');
const RESULTS = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'results.json'), 'utf8'));

const INK = '#1f2937';
const MUTED = '#6b7280';
const GRID = '#e5e7eb';
const AXIS = '#9ca3af';
const COLOURS = {
  india: '#b21f24',
  north: '#1c4e80',
  south: '#d98213',
};
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const n = (value, digits = 3) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : 0);

const svgOpen = (width, height) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">`;

const text = (x, y, value, opts = {}) => {
  const {
    size = 14,
    weight = 400,
    fill = INK,
    anchor = 'start',
    opacity = 1,
    spacing = 0,
    style = '',
  } = opts;
  return `<text x="${n(x, 2)}" y="${n(y, 2)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${opacity}"${
    spacing ? ` letter-spacing="${spacing}"` : ''
  }${style ? ` style="${style}"` : ''}>${esc(value)}</text>`;
};

const line = (x1, y1, x2, y2, opts = {}) => {
  const { stroke = GRID, width = 1, dash = '', opacity = 1, cap = 'butt' } = opts;
  return `<line x1="${n(x1, 2)}" y1="${n(y1, 2)}" x2="${n(x2, 2)}" y2="${n(y2, 2)}" stroke="${stroke}" stroke-width="${width}"${
    dash ? ` stroke-dasharray="${dash}"` : ''
  } opacity="${opacity}" stroke-linecap="${cap}"/>`;
};

const rect = (x, y, width, height, opts = {}) => {
  const { fill = 'none', stroke = 'none', rx = 0, opacity = 1, width: sw = 1 } = opts;
  return `<rect x="${n(x, 2)}" y="${n(y, 2)}" width="${n(width, 2)}" height="${n(height, 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}" rx="${rx}"/>`;
};

const circle = (cx, cy, r, opts = {}) => {
  const { fill = INK, stroke = 'none', opacity = 1, sw = 1 } = opts;
  return `<circle cx="${n(cx, 2)}" cy="${n(cy, 2)}" r="${n(r, 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`;
};

const pathEl = (d, opts = {}) => {
  const { fill = 'none', stroke = INK, width = 2, opacity = 1, join = 'round', cap = 'round' } = opts;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" stroke-linejoin="${join}" stroke-linecap="${cap}"/>`;
};

const header = (width, title, subtitle) => {
  const parts = [text(48, 52, title, { size: 25, weight: 700 })];
  if (subtitle) parts.push(text(48, 78, subtitle, { size: 14.5, fill: MUTED }));
  return parts.join('\n');
};

const footer = (width, height, source, note) => {
  const parts = [];
  parts.push(line(48, height - 54, width - 48, height - 54, { stroke: GRID }));
  parts.push(text(48, height - 32, source, { size: 11.5, fill: MUTED }));
  if (note) parts.push(text(48, height - 14, note, { size: 11, fill: MUTED, opacity: 0.85 }));
  return parts.join('\n');
};

const REGION_NAME = { india: 'India', north: 'Global North', south: 'Global South' };

// ---------------------------------------------------------------------------
// Figure 1 — the readability ladder
// ---------------------------------------------------------------------------
const figure1 = () => {
  const W = 1180;
  const H = 780;
  const rows = RESULTS.instruments.slice().sort((a, b) => a.flesch - b.flesch);
  const left = 330;
  const right = W - 90;
  const top = 128;
  const rowH = Math.min(30, (H - top - 150) / Math.max(1, rows.length));
  const x = (value) => left + ((value - 0) / 100) * (right - left);

  const parts = [svgOpen(W, H), header(W, 'AI rules are written in graduate-level English in every region',
    'Flesch Reading Ease for each instrument; lower is harder. Source: the instrument itself, sampled across the whole document.')];

  // Reading bands across the top.
  const bands = [
    { from: 90, to: 100, label: 'Very easy', fill: '#e8f3ec' },
    { from: 70, to: 90, label: 'Easy', fill: '#eef3f8' },
    { from: 50, to: 70, label: 'Fairly difficult', fill: '#f6f1e8' },
    { from: 30, to: 50, label: 'Difficult', fill: '#f7eaea' },
    { from: 0, to: 30, label: 'Very confusing', fill: '#f2dcdc' },
  ];
  bands.forEach((band) => {
    parts.push(rect(x(band.from), top - 46, x(band.to) - x(band.from), 18, { fill: band.fill }));
    if (band.to - band.from > 40) {
      parts.push(text((x(band.from) + x(band.to)) / 2, top - 33, band.label, { size: 10.5, fill: MUTED, anchor: 'middle' }));
    }
  });

  for (let value = 0; value <= 100; value += 10) {
    parts.push(line(x(value), top - 6, x(value), top + rows.length * rowH + 6, { stroke: GRID }));
    parts.push(text(x(value), top + rows.length * rowH + 26, value, { size: 11, fill: MUTED, anchor: 'middle' }));
  }
  parts.push(text((left + right) / 2, top + rows.length * rowH + 48, 'Flesch Reading Ease', { size: 12, fill: MUTED, anchor: 'middle' }));

  rows.forEach((row, index) => {
    const y = top + index * rowH + rowH / 2;
    const colour = COLOURS[row.region];
    const isIndia = row.region === 'india';
    parts.push(text(left - 16, y + 4, row.short, {
      size: isIndia ? 13 : 12,
      weight: isIndia ? 700 : 400,
      fill: isIndia ? COLOURS.india : INK,
      anchor: 'end',
    }));
    parts.push(line(left, y, right, y, { stroke: GRID, width: 1 }));
    parts.push(circle(x(row.flesch), y, isIndia ? 6.5 : 4.5, { fill: colour }));
    parts.push(text(x(row.flesch) + 12, y + 4, row.flesch.toFixed(0), {
      size: 11.5,
      fill: isIndia ? COLOURS.india : MUTED,
      weight: isIndia ? 700 : 400,
    }));
    if (isIndia) {
      parts.push(text(x(row.flesch) + 34, y + 4, `grade ${row.grade.toFixed(0)}`, { size: 10.5, fill: MUTED }));
    }
  });

  // Legend.
  const legendY = top + rows.length * rowH + 78;
  let lx = 48;
  Object.keys(COLOURS).forEach((region) => {
    parts.push(circle(lx + 5, legendY - 4, 5, { fill: COLOURS[region] }));
    parts.push(text(lx + 16, legendY, REGION_NAME[region], { size: 12, fill: MUTED }));
    lx += 28 + REGION_NAME[region].length * 6.6;
  });

  parts.push(footer(W, H,
    'Source: Data Point analysis of 21 primary instruments (see receipts). Flesch Reading Ease; higher is easier.',
    'Reading bands are the standard Flesch categories. Score computed on provisions sampled at a fixed stride across each document.'));
  parts.push('</svg>');
  return parts.join('\n');
};

// ---------------------------------------------------------------------------
// Figure 2 — the quadrant
// ---------------------------------------------------------------------------
const figure2 = () => {
  const W = 1180;
  const H = 800;
  const left = 96;
  const right = W - 60;
  const top = 128;
  const bottom = H - 130;

  const xs = RESULTS.instruments.map((row) => row.flesch);
  const ys = RESULTS.instruments.map((row) => row.gap);
  const xMin = Math.max(0, Math.floor(Math.min(...xs) / 5) * 5 - 2);
  const xMax = Math.min(100, Math.ceil(Math.max(...xs) / 5) * 5 + 2);
  const yMin = Math.floor(Math.min(...ys) * 50) / 50 - 0.02;
  const yMax = Math.ceil(Math.max(...ys) * 50) / 50 + 0.02;
  const x = (value) => left + ((value - xMin) / (xMax - xMin)) * (right - left);
  const y = (value) => bottom - ((value - yMin) / (yMax - yMin)) * (bottom - top);

  const median = (values) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const medX = median(xs);
  const medY = median(ys);

  const parts = [svgOpen(W, H), header(W, 'Readability barely separates the regions; the vocabulary gap is mixed',
    'Flesch Reading Ease against the gap in cosine similarity to the Global North and Global South corpora. Above the dashed line is closer to the North.')];

  // Quadrant shading.
  parts.push(rect(x(xMin), y(medY), x(medX) - x(xMin), bottom - y(medY), { fill: '#fbf7f2' }));
  parts.push(rect(x(medX), y(medY), right - x(medX), bottom - y(medY), { fill: '#f7f3f7' }));

  for (let value = Math.ceil(xMin / 10) * 10; value <= xMax; value += 10) {
    parts.push(line(x(value), top, x(value), bottom, { stroke: GRID }));
    parts.push(text(x(value), bottom + 24, value, { size: 11, fill: MUTED, anchor: 'middle' }));
  }
  const yStep = (yMax - yMin) / 6;
  for (let i = 0; i <= 6; i += 1) {
    const value = yMin + i * yStep;
    parts.push(line(left, y(value), right, y(value), { stroke: GRID }));
    parts.push(text(left - 12, y(value) + 4, value.toFixed(2), { size: 11, fill: MUTED, anchor: 'end' }));
  }
  parts.push(line(x(medX), top, x(medX), bottom, { stroke: AXIS, dash: '4 4' }));
  parts.push(line(left, y(medY), right, y(medY), { stroke: AXIS, dash: '4 4' }));

  parts.push(text((left + right) / 2, bottom + 50, 'Flesch Reading Ease  →  easier to read', { size: 12, fill: MUTED, anchor: 'middle' }));
  parts.push(text(left - 52, (top + bottom) / 2, 'Similarity to the North minus similarity to the South  →', { size: 12, fill: MUTED, anchor: 'middle', style: 'transform: rotate(-90);' }));

  parts.push(text(x(medX) + 8, top + 18, 'closer to the North', { size: 11.5, fill: MUTED, opacity: 0.9 }));
  parts.push(text(x(medX) - 8, bottom - 12, 'closer to the South', { size: 11.5, fill: MUTED, anchor: 'end', opacity: 0.9 }));

  const offsets = {
    'in-dpdp-act-2023': [0, -16],
    'in-it-act-2000': [0, 18],
    'in-niti-rai-2021': [0, -16],
    'in-ai-guidelines-2025': [0, 18],
    'in-dpdp-rules-2025': [0, -16],
    'in-indiaai-2024': [0, 18],
  };
  RESULTS.instruments.forEach((row) => {
    const isIndia = row.region === 'india';
    const cx = x(row.flesch);
    const cy = y(row.gap);
    parts.push(circle(cx, cy, isIndia ? 8 : 5.5, { fill: COLOURS[row.region], opacity: isIndia ? 1 : 0.85 }));
    if (isIndia) {
      parts.push(circle(cx, cy, 12, { fill: 'none', stroke: COLOURS.india, opacity: 0.35, sw: 1.5 }));
    }
    const [dx, dy] = offsets[row.id] || [0, -12];
    parts.push(text(cx + dx + (dx >= 0 ? 14 : 14), cy + dy + 4, row.short, {
      size: isIndia ? 12.5 : 11,
      weight: isIndia ? 700 : 400,
      fill: isIndia ? COLOURS.india : MUTED,
      anchor: 'start',
    }));
  });

  const legendY = H - 96;
  let lx = 48;
  Object.keys(COLOURS).forEach((region) => {
    parts.push(circle(lx + 5, legendY - 4, 5, { fill: COLOURS[region] }));
    parts.push(text(lx + 16, legendY, REGION_NAME[region], { size: 12, fill: MUTED }));
    lx += 28 + REGION_NAME[region].length * 6.6;
  });
  parts.push(text(lx + 16, legendY, `median Flesch ${medX.toFixed(0)} · median gap ${medY.toFixed(2)}`, { size: 12, fill: MUTED }));

  parts.push(footer(W, H,
    'Source: Data Point analysis. Cosine similarity over TF-IDF vectors of sampled provisions; centroids by region.',
    'A point on the right is easier to read; a point above the dashed line is closer in wording to the Global North corpus.'));
  parts.push('</svg>');
  return parts.join('\n');
};

// ---------------------------------------------------------------------------
// Figure 3 — the dumbbell
// ---------------------------------------------------------------------------
const figure3 = () => {
  const W = 1180;
  const H = 720;
  const rows = RESULTS.instruments.filter((row) => row.region === 'india');
  const left = 330;
  const right = W - 120;
  const top = 140;
  const rowH = 74;
  const all = rows.flatMap((row) => [row.toNorth, row.toSouth, row.northBand.lo, row.northBand.hi, row.southBand.lo, row.southBand.hi]);
  const xMin = Math.floor(Math.min(...all) * 20) / 20 - 0.01;
  const xMax = Math.ceil(Math.max(...all) * 20) / 20 + 0.01;
  const x = (value) => left + ((value - xMin) / (xMax - xMin)) * (right - left);

  const northCount = rows.filter((row) => row.gap > 0).length;
  const southCount = rows.length - northCount;
  const parts = [svgOpen(W, H), header(W, `India’s AI instruments split ${northCount}–${southCount} between the two vocabularies`,
    'Cosine similarity of each Indian instrument to the Global North and Global South centroids. Bars are 95% bootstrap intervals.')];

  for (let value = Math.ceil(xMin * 20) / 20; value <= xMax; value += 0.05) {
    parts.push(line(x(value), top - 24, x(value), top + rows.length * rowH, { stroke: GRID }));
    parts.push(text(x(value), top + rows.length * rowH + 26, value.toFixed(2), { size: 11, fill: MUTED, anchor: 'middle' }));
  }
  parts.push(text((left + right) / 2, top + rows.length * rowH + 50, 'Cosine similarity to the regional centroid', { size: 12, fill: MUTED, anchor: 'middle' }));

  rows.forEach((row, index) => {
    const y = top + index * rowH + rowH / 2;
    const isIndia = row.region === 'india';
    parts.push(text(left - 18, y - 4, row.short, { size: 13, weight: 700, fill: COLOURS.india, anchor: 'end' }));
    parts.push(text(left - 18, y + 14, `${row.jurisdiction} · ${row.year} · ${row.genre}`, { size: 10.5, fill: MUTED, anchor: 'end' }));

    parts.push(line(x(row.northBand.lo), y, x(row.northBand.hi), y, { stroke: COLOURS.north, width: 2, opacity: 0.45 }));
    parts.push(line(x(row.southBand.lo), y, x(row.southBand.hi), y, { stroke: COLOURS.south, width: 2, opacity: 0.45 }));
    parts.push(line(x(row.toSouth), y, x(row.toNorth), y, { stroke: MUTED, width: 2, opacity: 0.55, dash: '0' }));
    parts.push(circle(x(row.toSouth), y, 8, { fill: COLOURS.south }));
    parts.push(circle(x(row.toNorth), y, 8, { fill: COLOURS.north }));
    parts.push(text(x(row.toNorth) + 14, y + 4, row.toNorth.toFixed(3), { size: 11.5, fill: COLOURS.north, weight: 700 }));
    parts.push(text(x(row.toSouth) - 14, y + 4, row.toSouth.toFixed(3), { size: 11.5, fill: COLOURS.south, weight: 700, anchor: 'end' }));
    parts.push(text(right + 26, y + 4, `${row.gap >= 0 ? '+' : '−'}${Math.abs(row.gap).toFixed(2)}`, { size: 12, fill: COLOURS.india, weight: 700 }));
  });

  const legendY = H - 92;
  let lx = 48;
  [['north', 'Global North centroid'], ['south', 'Global South centroid']].forEach(([region, label]) => {
    parts.push(circle(lx + 5, legendY - 4, 6, { fill: COLOURS[region] }));
    parts.push(text(lx + 18, legendY, label, { size: 12, fill: MUTED }));
    lx += 34 + label.length * 6.6;
  });
  parts.push(text(lx + 10, legendY, 'gap on the right', { size: 12, fill: COLOURS.india, weight: 700 }));

  parts.push(footer(W, H,
    'Source: Data Point analysis. 600 bootstrap draws, resampling provisions within each instrument.',
    'Centroid = the average TF-IDF direction of the region’s instruments. A positive gap means wording closer to the North; a negative gap closer to the South.'));
  parts.push('</svg>');
  return parts.join('\n');
};

// ---------------------------------------------------------------------------
// Figure 4 — the permutation null
// ---------------------------------------------------------------------------
const figure4 = () => {
  const W = 1180;
  const H = 700;
  const left = 96;
  const right = W - 60;
  const top = 130;
  const bottom = H - 150;
  const values = RESULTS.headline.nullValues;
  const observed = RESULTS.headline.meanGap;
  const bins = 40;
  const min = Math.min(...values, observed);
  const max = Math.max(...values, observed);
  const lo = min - (max - min) * 0.05;
  const hi = max + (max - min) * 0.05;
  const x = (value) => left + ((value - lo) / (hi - lo)) * (right - left);
  const counts = new Array(bins).fill(0);
  values.forEach((value) => {
    const slot = Math.min(bins - 1, Math.max(0, Math.floor(((value - lo) / (hi - lo)) * bins)));
    counts[slot] += 1;
  });
  const tallest = Math.max(...counts);
  const y = (count) => bottom - (count / (tallest * 1.12)) * (bottom - top);

  const survives = RESULTS.headline.permutationP < 0.05;
  const parts = [svgOpen(W, H), header(W, survives
    ? 'The regional gap survives shuffled labels'
    : 'The regional gap does not survive shuffled labels',
  'The observed gap in similarity between Indian instruments and the two regional corpora, against 2,000 shuffled labelings.')];

  counts.forEach((count, index) => {
    const x0 = x(lo + ((hi - lo) * index) / bins);
    const x1 = x(lo + ((hi - lo) * (index + 1)) / bins);
    const isTail = index === 0 || index === bins - 1;
    parts.push(rect(x0 + 1, y(count), x1 - x0 - 2, bottom - y(count), {
      fill: isTail ? '#e6ecf3' : '#c9d6e3',
    }));
  });

  parts.push(line(x(observed), top - 14, x(observed), bottom + 8, { stroke: COLOURS.india, width: 3 }));
  parts.push(text(x(observed) + 10, top - 20, `observed ${observed.toFixed(3)}`, { size: 13, weight: 700, fill: COLOURS.india }));
  parts.push(text(x(observed) + 10, top - 4, `p = ${RESULTS.headline.permutationP}`, { size: 12, fill: COLOURS.india }));

  const nullMean = RESULTS.headline.nullMean;
  parts.push(line(x(nullMean), top, x(nullMean), bottom, { stroke: MUTED, width: 1.5, dash: '5 4' }));
  parts.push(text(x(nullMean) + 8, bottom - 12, `shuffled mean ${nullMean.toFixed(3)}`, { size: 11.5, fill: MUTED }));

  for (let i = 0; i <= 6; i += 1) {
    const value = lo + ((hi - lo) * i) / 6;
    parts.push(line(x(value), bottom, x(value), bottom + 6, { stroke: AXIS }));
    parts.push(text(x(value), bottom + 24, value.toFixed(2), { size: 11, fill: MUTED, anchor: 'middle' }));
  }
  parts.push(text((left + right) / 2, bottom + 50, 'Mean similarity gap for the instruments labelled “India”', { size: 12, fill: MUTED, anchor: 'middle' }));
  parts.push(text(left - 56, (top + bottom) / 2, 'Shuffled labelings  →', { size: 12, fill: MUTED, anchor: 'middle', style: 'transform: rotate(-90);' }));

  parts.push(footer(W, H,
    'Source: Data Point analysis. 2,000 permutations of the region labels, seed fixed.',
    survives
      ? 'Under the null the region labels carry no information about vocabulary. The observed gap sits outside the shuffled distribution.'
      : 'Under the null the region labels carry no information about vocabulary. The observed gap sits inside the shuffled distribution, so the labels do not carry the signal.'));
  parts.push('</svg>');
  return parts.join('\n');
};

// ---------------------------------------------------------------------------
// Figure 5 — the vocabulary heatmap
// ---------------------------------------------------------------------------
const figure5 = () => {
  const W = 1180;
  const H = 800;
  const concepts = RESULTS.lineage.concepts.slice(0, 14);
  const phrases = RESULTS.lineage.phrases.filter((row) => row.india > 0 || row.north > 0.15);
  const rows = [
    ...concepts.map((row) => ({
      label: row.term,
      india: row.indiaShare,
      north: row.northShare,
      south: row.southShare,
      kind: 'word',
    })),
    ...phrases.map((row) => ({
      label: row.phrase,
      india: row.india,
      north: row.north,
      south: row.south,
      kind: 'phrase',
    })),
  ];
  const left = 340;
  const cellW = 150;
  const top = 190;
  const rowH = 30;
  const columns = [
    { key: 'india', label: 'India' },
    { key: 'north', label: 'Global North' },
    { key: 'south', label: 'Global South' },
  ];

  const parts = [svgOpen(W, H), header(W, 'Which vocabulary travelled',
    'Share of provisions in each region that use the term. Words are the most common vocabulary of the Northern corpus; phrases are matched as written.')];

  columns.forEach((column, index) => {
    const cx = left + index * cellW + cellW / 2;
    parts.push(text(cx, top - 18, column.label, { size: 13.5, weight: 700, fill: COLOURS[column.key] || INK, anchor: 'middle' }));
  });

  rows.forEach((row, index) => {
    const y = top + index * rowH;
    parts.push(text(left - 16, y + rowH / 2 + 4, row.label, {
      size: 12.5,
      fill: INK,
      anchor: 'end',
      style: row.kind === 'phrase' ? 'font-style: italic;' : '',
    }));
    columns.forEach((column, index) => {
      const value = row[column.key] || 0;
      const cx = left + index * cellW;
      const alpha = Math.min(0.92, 0.06 + value * 1.9);
      parts.push(rect(cx + 2, y + 2, cellW - 8, rowH - 6, {
        fill: COLOURS[column.key],
        opacity: alpha,
        rx: 2,
      }));
      parts.push(text(cx + cellW / 2 - 3, y + rowH / 2 + 4, `${Math.round(value * 100)}%`, {
        size: 11.5,
        weight: value > 0.35 ? 700 : 400,
        fill: value > 0.35 ? '#ffffff' : INK,
        anchor: 'middle',
      }));
    });
  });

  const y2 = top + rows.length * rowH + 34;
  parts.push(text(48, y2, 'Nearest-neighbour check', { size: 13, weight: 700 }));
  const test = RESULTS.lineage.test;
  parts.push(text(48, y2 + 22,
    `For ${test.n} Indian provisions, the closest provision in the whole non-Indian corpus sits in the North ${test.nearestNorth} times and in the South ${test.nearestSouth} times (exact binomial p = ${test.p}).`,
    { size: 12.5, fill: INK }));
  parts.push(text(48, y2 + 42,
    'A nearest neighbour is not proof of copying: two legal systems can use the same words for different reasons. It is evidence of shared legal vocabulary, and nothing more.',
    { size: 11.5, fill: MUTED }));

  parts.push(footer(W, H,
    'Source: Data Point analysis. Share = provisions in the region whose text contains the term (stemmed for single words).',
    'Word rows are the highest-share Northern vocabulary that also appears in India. Phrase rows are matched as written.'));
  parts.push('</svg>');
  return parts.join('\n');
};

const figures = {
  'fig1-readability.svg': figure1,
  'fig2-quadrant.svg': figure2,
  'fig3-dumbbell.svg': figure3,
  'fig4-permutation.svg': figure4,
  'fig5-vocabulary.svg': figure5,
};

fs.mkdirSync(FIG_DIR, { recursive: true });
for (const [name, draw] of Object.entries(figures)) {
  const file = path.join(FIG_DIR, name);
  fs.writeFileSync(file, `${draw()}\n`);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}
