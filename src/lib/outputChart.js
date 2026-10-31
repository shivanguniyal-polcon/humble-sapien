// Pure layout helpers for the 1947–2026 output timeline. No DOM here: the
// component owns pixels, these own meaning — what stacks where, and which
// instrument sits under the pointer. Kept separate so the mapping from dot
// position to named instrument is testable without a browser.

import { KINDS } from '../data/stateOutput.js';

export const YEAR_MIN = 1947;
export const YEAR_MAX = 2026;

// Width-only geometry for the vertical column. One jurisdiction at a time,
// so the chart is a single gutter of years beside a field of squares.
// Data-dependent heights are the component's business; everything an axis,
// a marker or a hit test needs lives here so they can never drift apart.
export const columnLayout = (width) => {
  const compact = width < 560;
  // Wider gutters than a boxed chart needs: the canvas now runs to the edge of
  // the window, and the year labels and the cumulative rail want air between
  // themselves and the glass.
  const axis = compact ? 40 : 64;
  const rail = compact ? 26 : 44;
  const plotW = Math.max(120, width - axis - rail);
  // The square's pitch. Big enough that a dot reads as an object rather than
  // a speck on a wide screen, where the column is the page's opening image.
  const unit = compact ? 4 : 6;
  const perRow = Math.max(8, Math.floor(plotW / unit));
  return { width, compact, axis, rail, plotW, unit, perRow };
};

// One band per year, top to bottom. A year's depth is its output: each kind
// starts a fresh line inside the band, so kinds read as strata and the band
// is at least one line deep even when the year wrote almost nothing.
export const yearBands = (stacks, juris, perRow, unit) => {
  const bands = [];
  let top = 0;
  let cumulative = 0;
  for (let year = YEAR_MIN; year <= YEAR_MAX; year += 1) {
    const segments = stacks[juris].get(year) || [];
    let lines = 0;
    let count = 0;
    for (const segment of segments) {
      lines += Math.ceil(segment.count / perRow);
      count += segment.count;
    }
    if (lines === 0) lines = 1;
    bands.push({ year, top, lines, height: lines * unit, count, cumulative });
    top += lines * unit;
    cumulative += count;
  }
  return { bands, height: top, total: cumulative };
};

// What a bracketed period holds: every included instrument from `from` to
// `to`, inclusive, on the selected jurisdiction. The bounds are clamped to
// the catalogue and may be handed over in either order, because a hand can
// drag either handle past the other before the component is asked.
export const spanCount = (stacks, juris, from, to) => {
  const lo = Math.max(YEAR_MIN, Math.min(from, to));
  const hi = Math.min(YEAR_MAX, Math.max(from, to));
  let total = 0;
  for (let year = lo; year <= hi; year += 1) {
    const segments = stacks[juris]?.get(year);
    if (!segments) continue;
    for (const segment of segments) total += segment.count;
  }
  return total;
};

// The band under a y coordinate in chart space (0 = the top of 1947).
export const bandAt = (bands, y) => {
  let lo = 0;
  let hi = bands.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const band = bands[mid];
    if (y < band.top) hi = mid - 1;
    else if (y >= band.top + band.height) lo = mid + 1;
    else return band;
  }
  return null;
};

// The y of a year's band, for pins and deep links.
export const yearTop = (bands, year) => bands.find((band) => band.year === year)?.top ?? 0;

const KIND_INDEX = Object.fromEntries(KINDS.map((kind, index) => [kind.id, index]));

// instruments: rows of [year, kindIndex, jurisIndex, name].
// enabled: Set of kind ids to include.
// order: kind ids, top of the band first. KINDS order by default; the
// reader's order, when they set one, is what puts the strata in place.
// lens: optional { language, coverage } — the selected scheduled-language
// code and a Map from row object to its coverage record. When present, each
// segment carries a parallel `covered` array so the raster can paint verified
// rows without re-running the lookup per square.
// Returns { 0: Map<year, segments>, 1: Map<year, segments> } where each
// segment is { kindIndex, count, names, covered } and names sit in draw order.
export const buildStacks = (
  instruments,
  enabled,
  order = KINDS.map((kind) => kind.id),
  lens = null,
) => {
  // Resolved once, not per comparison: a reorder re-runs this over 40k rows.
  const rank = new Map();
  for (const id of order) {
    const index = KIND_INDEX[id];
    if (index !== undefined && !rank.has(index)) rank.set(index, rank.size);
  }
  // A kind absent from the order (an order saved by an older build) stacks
  // after the rest instead of vanishing, so the picture and the total agree.
  const rankOf = (kindIndex) => rank.get(kindIndex) ?? 1000 + kindIndex;

  const buckets = new Map();
  for (const row of instruments) {
    const [year, kindIndex, jurisIndex, name] = row;
    if (!enabled.has(KINDS[kindIndex].id)) continue;
    const key = `${jurisIndex}|${year}`;
    let segments = buckets.get(key);
    if (!segments) {
      segments = new Map();
      buckets.set(key, segments);
    }
    let segment = segments.get(kindIndex);
    if (!segment) {
      segment = { kindIndex, count: 0, names: [], covered: lens ? [] : null };
      segments.set(kindIndex, segment);
    }
    segment.count += 1;
    segment.names.push(name);
    if (lens) {
      const record = lens.coverage?.get(row);
      segment.covered.push(
        Boolean(record && lens.language && record.languages.includes(lens.language)),
      );
    }
  }

  const out = { 0: new Map(), 1: new Map() };
  for (const [key, segments] of buckets) {
    const [jurisIndex, year] = key.split('|').map(Number);
    out[jurisIndex].set(
      year,
      [...segments.values()].sort((a, b) => rankOf(a.kindIndex) - rankOf(b.kindIndex)),
    );
  }
  return out;
};

// Within one year column the dots fill segment by segment (bottom of the
// stack upward), each segment row-major from the bottom-left. row and col
// are counted from the bottom-left of the whole column. Returns the
// instrument at that dot, or null when the dot does not exist.
export const dotAt = (segments, perRow, row, col) => {
  if (!segments || row < 0 || col < 0 || col >= perRow) return null;
  let rowsBefore = 0;
  for (const segment of segments) {
    const rows = Math.ceil(segment.count / perRow);
    if (row < rowsBefore + rows) {
      const index = (row - rowsBefore) * perRow + col;
      return index < segment.count
        ? {
            kindIndex: segment.kindIndex,
            name: segment.names[index],
            covered: segment.covered ? Boolean(segment.covered[index]) : false,
          }
        : null;
    }
    rowsBefore += rows;
  }
  return null;
};

// ---- the hover chip's fill ---------------------------------------------
// The chip is filled with the colour of the square it names and its text is
// white, so a pale colour has to be darkened until white clears the floor.
// The palette is never touched — only the chip. (The reference engine's
// core.js tooltipFill stops at 3.2:1; the floor here is 4.5:1 because this
// chip carries body-sized text, not a large label.)

const hexToRgb = (hex) => {
  const value = hex.trim().replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const n = Number.parseInt(full, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};

// sRGB → linear, the transfer function WCAG's ratio is defined over.
const linear = (channel) => {
  const v = channel / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

// White is luminance 1, so the ratio collapses to 1.05 / (L + 0.05).
export const contrastVsWhite = ([r, g, b]) =>
  1.05 / (0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b) + 0.05);

export const tooltipFill = (hex, floor = 4.5) => {
  const [r0, g0, b0] = hexToRgb(hex);
  if (!Number.isFinite(r0)) return hex;
  if (contrastVsWhite([r0, g0, b0]) >= floor) return hex;
  let r = r0;
  let g = g0;
  let b = b0;
  // 0.94 a step, the reference's own rate. The cap only stops a bad token
  // from spinning forever; a real colour reaches any sane floor well before it.
  for (let step = 0; step < 80 && contrastVsWhite([r, g, b]) < floor; step += 1) {
    r *= 0.94;
    g *= 0.94;
    b *= 0.94;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

// "42nd", with the 11–13 exception every ordinal formatter forgets.
export const ordinal = (n) => {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suffix}`;
};

// The amendments are not crawl rows; give them dot labels in the same shape
// as the instrument rows so one tooltip code path serves every kind.
export const amendmentTuples = (amendments) =>
  amendments.map(([n, date]) => [
    Number(date.slice(0, 4)),
    KIND_INDEX['constitutional-amendment'],
    0,
    `The Constitution (${ordinal(n)} Amendment) Act`,
  ]);
