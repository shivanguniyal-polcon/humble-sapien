// The timeline spread: the state's output, 1947–2026, one square per instrument.
//
// Years run down the page. Each year is a band of unit squares — one per
// instrument, every one named — and a band is as deep as the output that year
// carried. Kinds are strata inside the band, each in its own terracotta. The
// Centre and the States do not share a scale with each other, so the chart
// shows one at a time and the reader switches in the frame.
//
// The reveal is scrubbed, not triggered, exactly as in the reference engine:
// the section is a tall stage with a pinned frame, and progress is a plain
// readout of how far the stage has been scrolled. The frontier moves down the
// catalogue as the reader descends it and retreats on the way back, because
// position — not a one-shot event — is the input.
//
// Paint discipline follows the same source. The whole chart is rasterised once
// per layout; a scroll frame only moves a clip and a camera, so no React state
// and no dot drawing happen on scroll. The year readout is written straight to
// a ref. Four further disciplines keep the raster cheap and the chip honest:
//
//   - the 40k squares are accumulated into one canvas path per kind, so the
//     raster makes five fill calls instead of one per square, and the width is
//     quantised so a dragged window edge cannot re-rasterise every frame;
//   - the hover chip re-renders only when the square under the pointer
//     changes; its position and pointing corner are written straight to the
//     node, the same way the readout is, and its size is measured rather than
//     guessed;
//   - a token change (theme switch, dark-mode flip) and a late webfont each
//     re-run the raster, and a token change drops the chip's colour cache, so
//     the two surfaces re-prime together;
//   - the catalogue rows are heavy (40k named records), so they load on
//     intersection as their own chunk — the landing page's first paint never
//     waits for the paper.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  KINDS,
  JURIS,
  AMENDMENTS,
  RTI,
  STEPS,
  MILESTONES,
  GAZETTE_GAP,
  CATALOGUE_NOTE,
} from '../data/stateOutput.js';
import {
  buildStacks,
  dotAt,
  amendmentTuples,
  columnLayout,
  yearBands,
  bandAt,
  spanCount,
  tooltipFill,
  YEAR_MIN,
  YEAR_MAX,
} from '../lib/outputChart.js';

const ALL_KIND_IDS = KINDS.map((kind) => kind.id);
const KIND_BY_ID = Object.fromEntries(KINDS.map((kind) => [kind.id, kind]));

// How much page the column is given. At 1× a pixel of catalogue costs a pixel
// of scroll, which walks the whole archive past in under two screens; the
// runway stretches the same scrub over several, so the frontier crawls and the
// column reads as the depth it is. Position is still the only input, so this
// changes pacing and nothing else.
const RUN = 4;

// The raster runs once per layout, and a layout only exists at a width. Steps
// of this many pixels mean a dragged window edge re-rasters a handful of times
// per hundred pixels instead of on every resize frame; the sub-step remainder
// shows up as slack beside the rail, where nothing is positioned to miss it.
const W_STEP = 8;

// One marker per year, not per finding: two findings can land in the same
// year, and two pins on the same band would be unreadable.
// The problem, spoken where the column passes the year it happened. A beat
// hangs on a band, appears when the frontier draws past it, and rides the
// scroll away above. The close then states the whole thing at length. Counts
// in the lines are read off the column itself, so a beat can never quote a
// number the chart is not drawing — and switching to the States re-reads them,
// because the States carry a different census. Tokens: {n} is this year's
// count, {total} the whole column, {since} and {share} what was written from
// 2001 on, {peakYear} the deepest band. `year: 'peak'` follows the data
// instead of asserting a date, so the heaviest year is the heaviest whichever
// face is showing.
const PROBLEM_BEATS = [
  {
    year: 1950,
    kicker: 'The writing starts',
    line: 'The Constitution comes into force and the catalogue opens: {n} instruments for the year.',
  },
  {
    year: 1977,
    kicker: 'The rulebook, rewritten',
    line: 'The forty-second amendment takes effect — the most sweeping rewrite of the Constitution — and the year carries {n} instruments.',
  },
  {
    year: 2001,
    kicker: 'The last quarter',
    line: 'From 2001 on the column draws {since} instruments — {share}% of everything it holds, in 26 of its 80 years. The paper is not only old; it is arriving faster.',
  },
  {
    year: 2005,
    kicker: 'The right to ask',
    line: 'The Right to Information Act comes into force: from here a citizen can demand the reasoning behind the paper, and the year carries {n} instruments.',
  },
  {
    year: 'peak',
    kicker: 'The heaviest year',
    line: 'The deepest band in the column: {n} instruments in {peakYear} alone. One square each, every one still binding.',
  },
  {
    year: 2025,
    kicker: 'Nothing counts the year',
    line: 'The catalogue holds what it holds. No authority publishes how much was issued this year, central or state — the gap the column cannot close.',
  },
];

// The tokens a beat line may carry. Unresolved tokens are a data bug, not a
// line of copy, so the resolver leaves nothing behind that reads as one.
const COUNTED = new Set(['n', 'total', 'since']);
const beatText = (line, beat) =>
  line.replace(/\{(n|total|since|share|peakYear)\}/g, (match, token) => {
    const value = beat[token === 'n' ? 'count' : token];
    if (value === undefined) return match;
    // Counts take the Indian grouping; a year or a percentage must not.
    return COUNTED.has(token) ? value.toLocaleString('en-IN') : String(value);
  });

const MILESTONE_YEARS = [...MILESTONES.reduce((byYear, entry) => {
  const entries = byYear.get(entry.year) || [];
  entries.push(entry);
  byYear.set(entry.year, entries);
  return byYear;
}, new Map())].sort((a, b) => a[0] - b[0]);

// Terracotta steps resolved from the token ramps, so the canvas and the CSS
// swatches can never disagree.
const shadeHex = (root) => {
  const styles = getComputedStyle(root);
  const out = {};
  for (const kind of KINDS) {
    out[kind.id] = styles.getPropertyValue(`--${kind.shade}`).trim() || '#7a1f2b';
  }
  return out;
};

const useInView = (margin = '200px') => {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, margin]);
  return [ref, seen];
};

const useReducedMotion = () => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduce(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);
  return reduce;
};

// A repaint signal for token changes. The canvas raster reads the tokens once
// per layout and would otherwise carry them forever; a dark-mode media flip or
// a class/data-theme swap on the root ticks this, the raster re-runs, and the
// chip's colour cache is dropped alongside it. Repaints are cheap now that the
// squares are path-batched, so an incidental class change on the root costs
// five fills and nothing else.
const useTokenVersion = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', bump);
    const mutations = new MutationObserver(bump);
    mutations.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => {
      scheme.removeEventListener('change', bump);
      mutations.disconnect();
    };
  }, []);
  return tick;
};

// One dated snapshot series, its own scale, never on the instrument axis.
const StepStrip = ({ title, points, unitNote }) => {
  const width = 600;
  const height = 56;
  const xs = points.map((p) => ((p.year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * width);
  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const y = (v) => height - 8 - ((v - min) / (max - min || 1)) * (height - 20);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');
  return (
    <figure className="timeline-strip">
      <figcaption className="timeline-strip-cap">
        <span>{title}</span>
        <span className="meta">{unitNote}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${title}: ${points.length} dated snapshots, own scale`}>
        <path d={path} fill="none" stroke="var(--clay-600)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={p.label} cx={xs[i]} cy={y(p.value)} r="2.5" fill="var(--clay-700)">
            <title>{p.label}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
};

// A total that counts to its new value instead of jumping. It writes
// textContent from a frame rather than state, so landing a dataset never
// re-renders the catalogue — the number arrives with the squares.
const TickingNumber = ({ value, reduce, className }) => {
  const ref = useRef(null);
  const shown = useRef(value);

  // Layout effect, not a passive one: React has already rendered the new
  // number as this span's child, so without writing the old one back before
  // paint the reader sees the answer, then sees it count to the answer.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const from = shown.current;
    shown.current = value;
    if (reduce || from === value) {
      node.textContent = value.toLocaleString('en-IN');
      return undefined;
    }
    node.textContent = from.toLocaleString('en-IN');
    let raf = 0;
    const started = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - started) / 420);
      const eased = 1 - (1 - t) ** 3;
      node.textContent = Math.round(from + (value - from) * eased).toLocaleString('en-IN');
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString('en-IN')}
    </span>
  );
};

export default function OutputTimeline() {
  const [rootRef, seen] = useInView();
  const reduce = useReducedMotion();
  const tokenTick = useTokenVersion();

  const [rows, setRows] = useState(null);
  const [juris, setJuris] = useState(0);
  const [enabled, setEnabled] = useState(() => new Set(ALL_KIND_IDS));
  const [showRti, setShowRti] = useState(false);
  const [showOpenData, setShowOpenData] = useState(false);
  // A pill in hand: which kind, and where the hand is.
  const [drag, setDrag] = useState(null);
  const [dropZone, setDropZone] = useState(null);
  // The bracketed period, or null for the whole catalogue.
  const [span, setSpan] = useState(null);
  // The reader's stacking order — every kind id, top of the band first, the
  // same left-to-right order the tray shows. KINDS order until they move a
  // pill; the order is theirs from then on.
  const [order, setOrder] = useState(() => [...ALL_KIND_IDS]);
  // The gap a pill in hand would land in, while the hand is over the tray.
  const [dropIndex, setDropIndex] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  // The note follows the pointer (or focus) first, and falls back to the one
  // the reader clicked to keep open.
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const marker = hovered || pinned;

  const [width, setWidth] = useState(0);
  const [frameH, setFrameH] = useState(0);
  const [stickTop, setStickTop] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const windowRef = useRef(null);
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const frontierRef = useRef(null);
  const readoutRef = useRef(null);
  const pinRefs = useRef(new Map());
  const beatRefs = useRef(new Map());
  const haloRefs = useRef(new Map());
  const metaRef = useRef(null);
  const revealRef = useRef(0);
  // Resolved once per raster, never on a pointer move: a hover must not read
  // the stylesheet each time it crosses a square, and a repaint (the tokens
  // changed, or a font arrived) drops the cache so canvas and chip re-prime
  // together.
  const shadeCache = useRef(null);
  // The chip's geometry lives here, not in state: the pointer handler writes
  // it straight to the node, so the chip tracks the pointer at input rate
  // without re-rendering the component per move.
  const tipRef = useRef(null);
  const tipPosRef = useRef(null);
  const lastHitRef = useRef(null);
  const trayInRef = useRef(null);
  const trayOutRef = useRef(null);
  const railRef = useRef(null);
  const skipPillClick = useRef(false);
  const pillDragRef = useRef(false);

  useEffect(() => {
    if (!seen) return undefined;
    let live = true;
    import('../data/stateOutputInstruments.js').then(({ INSTRUMENTS }) => {
      if (live) setRows(INSTRUMENTS);
    });
    return () => {
      live = false;
    };
  }, [seen]);

  const tuples = useMemo(() => {
    if (!rows) return null;
    return [...rows, ...amendmentTuples(AMENDMENTS)];
  }, [rows]);

  const stacks = useMemo(
    () => (tuples ? buildStacks(tuples, enabled, order) : null),
    [tuples, enabled, order],
  );

  const layout = width ? columnLayout(width) : null;

  const column = useMemo(
    () => (stacks && layout ? yearBands(stacks, juris, layout.perRow, layout.unit) : null),
    [stacks, layout, juris],
  );

  const jurisTotals = useMemo(() => {
    if (!stacks) return [0, 0];
    return [0, 1].map((index) => {
      let sum = 0;
      for (const segments of stacks[index].values()) {
        for (const segment of segments) sum += segment.count;
      }
      return sum;
    });
  }, [stacks]);

  // The three figures in the head must describe the same catalogue: the total
  // is the sum of what is actually drawn, not the raw row count, or setting a
  // kind aside would leave the head disagreeing with itself.
  const total = jurisTotals[0] + jurisTotals[1];

  // Each beat, placed on its own band. The last seventh of the column is
  // where the camera clamps at the foot, so a note there is hung above its
  // band instead of below it, where there would be no room left to show it.
  // The column's own totals are read first, so a beat can speak about the
  // whole pile without quoting a figure from copy.
  const beats = useMemo(() => {
    if (!column) return [];
    const total = column.bands.reduce((sum, band) => sum + band.count, 0);
    const since = column.bands.reduce((sum, band) => (band.year >= 2001 ? sum + band.count : sum), 0);
    const peak = column.bands.reduce((best, band) => (band.count > best.count ? band : best), column.bands[0]);
    const share = total ? Math.round((since / total) * 100) : 0;
    return PROBLEM_BEATS.map((beat) => {
      const year = beat.year === 'peak' ? peak.year : beat.year;
      const band = column.bands.find((entry) => entry.year === year);
      if (!band) return null;
      const above = band.top + band.height > column.height * 0.86;
      return {
        ...beat,
        year,
        count: band.count,
        total,
        since,
        share,
        peakYear: peak.year,
        bandTop: band.top,
        bandHeight: band.height,
        side: above ? 'above' : 'below',
        top: above ? band.top - 10 : band.top + band.height + 14,
      };
    })
      .filter(Boolean)
      // One beat speaks at a time — the most recent band drawn — so the list
      // is ordered down the column, whatever order the copy is written in.
      .sort((a, b) => a.bandTop - b.bandTop);
  }, [column]);

  const spanFrom = span?.from ?? YEAR_MIN;
  const spanTo = span?.to ?? YEAR_MAX;
  const spanInfo = useMemo(() => {
    if (!stacks || !span) return null;
    return {
      from: Math.min(spanFrom, spanTo),
      to: Math.max(spanFrom, spanTo),
      count: spanCount(stacks, juris, spanFrom, spanTo),
    };
  }, [stacks, juris, span, spanFrom, spanTo]);

  // The band that shows the bracket on the column itself, so the period is
  // not only a number in the frame. It rides the track and costs no frames.
  const spanBand = useMemo(() => {
    if (!span || !column) return null;
    const a = column.bands.find((band) => band.year === spanFrom);
    const b = column.bands.find((band) => band.year === spanTo);
    if (!a || !b) return null;
    return { top: a.top, height: b.top + b.height - a.top };
  }, [span, column, spanFrom, spanTo]);

  // ---- drawing ----------------------------------------------------------
  // Once per layout: the full column, pinned gutter, cumulative rail and all.
  // Scroll never touches this path again. The squares are accumulated as one
  // path per kind and filled once each — the same coordinates a square at a
  // time would paint, hairline gaps included, at a fraction of the draw calls
  // — and the effect re-runs on a token tick or a font-load so the raster
  // never carries stale colours or glyphs.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !column || !layout) return undefined;
    let live = true;
    const w = layout.width;
    const h = Math.max(1, Math.round(column.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue('--color-text').trim() || '#1b1815';
    const muted = styles.getPropertyValue('--color-text-muted').trim() || '#6f6a63';
    const border = styles.getPropertyValue('--color-border').trim() || '#eceae6';
    const accent = styles.getPropertyValue('--color-accent-solid').trim() || '#7a1f2b';
    const colors = shadeHex(document.documentElement);
    // Dropped with every raster: if the tokens changed and ticked this effect,
    // the chip re-resolves on its next hover and the two surfaces cannot
    // disagree.
    shadeCache.current = null;

    const { axis, plotW, unit, perRow } = layout;
    const segmentsOf = stacks[juris];
    const size = Math.max(unit - 0.6, 1);

    // One rect list per kind, filled as a single path below. The lists hold
    // flat x/y/w/h quadruples in the same order the squares paint in.
    const paths = KINDS.map(() => []);

    // Each band: its rule, its year, then its squares.
    let lastLabel = -Infinity;
    for (const band of column.bands) {
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.moveTo(axis - 4, Math.round(band.top) + 0.5);
      ctx.lineTo(axis + plotW, Math.round(band.top) + 0.5);
      ctx.stroke();

      if (band.top - lastLabel >= 9) {
        ctx.fillStyle = band.year === YEAR_MAX ? accent : muted;
        ctx.font = '9px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(String(band.year), axis - 10, band.top + 1);
        lastLabel = band.top;
      }

      const segments = segmentsOf.get(band.year);
      if (!segments) continue;
      let line = 0;
      for (const segment of segments) {
        const list = paths[segment.kindIndex];
        for (let i = 0; i < segment.count; i += 1) {
          const row = line + Math.floor(i / perRow);
          list.push(axis + (i % perRow) * unit, band.top + row * unit, size, size);
        }
        line += Math.ceil(segment.count / perRow);
      }
    }

    // Five fills stand in for forty thousand fillRect calls. The rects are
    // exactly the squares the per-call painter would have drawn — including
    // the hairline of air between them, which a merged run would have filled
    // over and turned the strata into solid strips.
    for (let kindIndex = 0; kindIndex < KINDS.length; kindIndex += 1) {
      const list = paths[kindIndex];
      if (list.length === 0) continue;
      ctx.fillStyle = colors[KINDS[kindIndex].id];
      ctx.beginPath();
      for (let i = 0; i < list.length; i += 4) {
        ctx.rect(list[i], list[i + 1], list[i + 2], list[i + 3]);
      }
      ctx.fill();
    }

    // Cumulative rail: the climb, read as position rather than a curve.
    const railX = axis + plotW + 7;
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(railX + 0.5, 0);
    ctx.lineTo(railX + 0.5, h);
    ctx.stroke();

    ctx.font = '8px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const marks = 5000;
    for (let value = marks; value <= column.total; value += marks) {
      const band = column.bands.find(
        (b) => b.count > 0 && value >= b.cumulative && value < b.cumulative + b.count,
      );
      if (!band) continue;
      const y = band.top + ((value - band.cumulative) / band.count) * band.height;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(railX + 1, Math.round(y) + 0.5);
      ctx.lineTo(railX + 5, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillStyle = muted;
      if (value % 10000 === 0) {
        ctx.fillText(`${value / 1000}k`, railX + 7, y);
      }
    }

    // The band under the reading line, for the readout in the frame.
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;

    // The axis glyphs use Plex Mono: if the raster ran before the webfont
    // arrived, redraw once it has, so the years never settle on the fallback
    // face. fonts.ready fires once, and the guard keeps the already-loaded
    // case from subscribing at all.
    if (!fontsReady && document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready
        .then(() => {
          if (live) setFontsReady(true);
        })
        .catch(() => {});
    }

    return () => {
      live = false;
    };
  }, [column, layout, stacks, juris, tokenTick, fontsReady]);

  // ---- the scrub ---------------------------------------------------------
  const applyProgress = useCallback(() => {
    const stage = stageRef.current;
    const win = windowRef.current;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!stage || !win || !track || !canvas || !column) return;

    const h = column.height;
    let reveal = h;
    if (!reduce) {
      const rect = stage.getBoundingClientRect();
      const travel = Math.max(1, rect.height - win.clientHeight);
      const scrolled = Math.min(Math.max(stickTop - rect.top, 0), travel);
      // The first screen is drawn before the reader touches anything: a
      // screenful of blank paper above a chart is not an opening image. The
      // rest of the column is still scrubbed over the same travel, so this
      // changes where the reveal starts, not how it advances.
      const start = Math.min(h, win.clientHeight * 0.55);
      reveal = start + (scrolled / travel) * Math.max(0, h - start);
      reveal = Math.min(h, reveal);
    }
    revealRef.current = reveal;

    canvas.style.clipPath = reduce ? 'none' : `inset(0 0 ${Math.max(0, h - reveal)}px 0)`;

    const winH = win.clientHeight;
    const camera = reduce
      ? 0
      : Math.min(Math.max(reveal - winH * 0.72, 0), Math.max(0, h - winH));
    track.style.transform = `translate3d(0, ${-camera}px, 0)`;

    const band = bandAt(column.bands, Math.max(0, reveal - 1));
    if (frontierRef.current) {
      frontierRef.current.style.transform = `translateY(${reveal}px)`;
      frontierRef.current.dataset.year = band ? String(band.year) : '';
    }
    if (readoutRef.current) {
      readoutRef.current.textContent = band ? String(band.year) : String(YEAR_MAX);
    }

    // A pin exists only once its band has been drawn.
    for (const [year, node] of pinRefs.current) {
      const top = column.bands.find((b) => b.year === Number(year))?.top ?? Infinity;
      node.style.visibility = top <= reveal + 0.5 ? 'visible' : 'hidden';
    }
    if (pinRefs.current.has('gap')) {
      pinRefs.current.get('gap').style.visibility =
        reveal > h - 1 ? 'visible' : 'hidden';
    }

    // When the column is complete the controls have nothing left to do, so
    // they stand down and the last note has the foot of the window to itself.
    if (frameRef.current) {
      // Not the last pixel: the camera clamps at the foot, so the frontier
      // travels down through the overlay over the last sixth of a screen.
      const complete = reveal > h - winH * 0.16 ? 'true' : 'false';
      if (frameRef.current.dataset.complete !== complete) {
        frameRef.current.dataset.complete = complete;
      }
    }

    // One beat speaks at a time: the most recent year the frontier has drawn
    // past. Written as a data attribute so the fade is CSS, not a render.
    let speaking = null;
    for (const beat of beats) {
      if (beat.bandTop <= reveal + 0.5) speaking = beat.year;
    }
    const speak = (map) => {
      for (const [year, node] of map.current) {
        const on = String(year) === String(speaking) ? 'true' : 'false';
        if (node.dataset.on !== on) node.dataset.on = on;
      }
    };
    speak(beatRefs);
    speak(haloRefs);
  }, [column, reduce, stickTop, beats]);

  useEffect(() => {
    if (!column || reduce) {
      applyProgress();
      return undefined;
    }
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        applyProgress();
      });
    };
    applyProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [applyProgress, column, reduce]);

  // Measure the window and the floating chrome it must clear. There is no
  // header bar any more: the mark's plate is the only thing at the top of the
  // window, and its box — padding included — is what the frame pins below.
  useEffect(() => {
    const win = windowRef.current;
    if (!win) return undefined;
    const read = () => {
      // Quantised before it becomes a layout: a re-raster is the most expensive
      // thing this component does, and a dragged window edge fires resize
      // frames far faster than the raster needs to care about. The step's
      // remainder shows up as slack beside the rail, where nothing sits near
      // enough to the edge to miss it.
      setWidth((prev) => {
        const next = Math.max(W_STEP, Math.floor(win.clientWidth / W_STEP) * W_STEP);
        return prev === next ? prev : next;
      });
      setFrameH(win.closest('.timeline-frame')?.clientHeight ?? 0);
      setStickTop(
        Math.round(
          document.querySelector('.site-float')?.getBoundingClientRect().bottom ?? 0,
        ),
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(win);
    const float = document.querySelector('.site-float');
    if (float) observer.observe(float);
    return () => observer.disconnect();
  }, [seen]);

  // The pointer needs the current geometry without re-rendering on scroll.
  useLayoutEffect(() => {
    metaRef.current = { layout, column, stacks, juris };
  }, [layout, column, stacks, juris]);

  // ---- pointer: name the square under the cursor ------------------------
  // The chip re-renders only when the square under the pointer changes; where
  // it sits is written straight to the node, the same discipline as the
  // readout, so tracking the pointer costs no renders at all.
  const clearTooltip = useCallback(() => {
    lastHitRef.current = null;
    setTooltip(null);
  }, []);

  // Place the chip against the frame, measuring the node it will actually be:
  // a long instrument name wraps to three or four lines, and the fixed
  // estimates this used to size itself from left the squared corner pointing
  // at nothing. The corner nearest the square stays square; it flips only
  // when the far side genuinely has more room — on a narrow window neither
  // side fits, and flipping there would carry the chip's near corner away
  // from the square, so it stays put and is clamped instead.
  const placeTip = useCallback(() => {
    const node = tipRef.current;
    const win = windowRef.current;
    const at = tipPosRef.current;
    if (!node || !win || !at) return;
    const box = win.getBoundingClientRect();
    const gap = 18;
    const chipW = Math.min(node.offsetWidth || 252, box.width - 16);
    const chipH = node.offsetHeight || 104;
    const roomRight = box.width - (at.x + gap);
    const roomLeft = at.x - gap - 8;
    const roomBelow = box.height - (at.y + gap);
    const roomAbove = at.y - gap - 8;
    const flipX = chipW > roomRight && roomLeft > roomRight;
    const flipY = chipH > roomBelow && roomAbove > roomBelow;
    node.style.left = `${Math.max(8, Math.min(flipX ? at.x - gap - chipW : at.x + gap, box.width - chipW - 8))}px`;
    node.style.top = `${Math.max(8, Math.min(flipY ? at.y - gap - chipH : at.y + gap, box.height - chipH - 8))}px`;
    node.dataset.corner = flipY ? (flipX ? 'br' : 'bl') : (flipX ? 'tr' : 'tl');
  }, []);

  // After a content change commits, the chip's size follows its name; place it
  // again before paint so the reader never sees it at its old place.
  useLayoutEffect(() => {
    if (tooltip) placeTip();
  }, [tooltip, placeTip]);

  // A measured box can still change without its text changing: a webfont that
  // lands mid-hover re-wraps the same name on fewer lines, and the chip would
  // keep the room it asked for while it was taller. Following the node's own
  // size makes the placement self-correcting instead of one-shot.
  useEffect(() => {
    const node = tipRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => placeTip());
    observer.observe(node);
    return () => observer.disconnect();
  }, [tooltip, placeTip]);

  const onPointerMove = (event) => {
    // A pill in hand is not a reader at the column: without this the squares
    // under the drag would keep opening their chips.
    if (pillDragRef.current) return;
    const meta = metaRef.current;
    if (!meta?.column || !meta.layout) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const miss = () => {
      if (lastHitRef.current !== null) {
        lastHitRef.current = null;
        setTooltip(null);
      }
    };
    if (y > revealRef.current) {
      miss();
      return;
    }
    const { axis, plotW, unit, perRow } = meta.layout;
    if (x < axis || x > axis + plotW) {
      miss();
      return;
    }
    const band = bandAt(meta.column.bands, y);
    if (!band) {
      miss();
      return;
    }
    const col = Math.floor((x - axis) / unit);
    const line = Math.floor((y - band.top) / unit);
    const hit = dotAt(meta.stacks[meta.juris].get(band.year), perRow, line, col);
    if (!hit) {
      miss();
      return;
    }
    // The chip is filled with the square's own colour, its text is white, and
    // the corner nearest the square is left square — so it points back at the
    // square instead of floating beside it. The frame keeps the colour the
    // fill had to move away from; when nothing had to move, they match.
    const win = windowRef.current.getBoundingClientRect();
    if (!shadeCache.current) shadeCache.current = shadeHex(document.documentElement);
    const truth = shadeCache.current[KINDS[hit.kindIndex].id];
    const key = `${hit.kindIndex}|${band.year}|${hit.name}`;
    const moved = lastHitRef.current !== key;
    lastHitRef.current = key;
    // The place is written, not rendered: the node is positioned whether or
    // not this move changed the square under the pointer, and the layout effect
    // above re-places it once a content change commits.
    tipPosRef.current = { x: event.clientX - win.left, y: event.clientY - win.top };
    if (!moved) {
      placeTip();
      return;
    }
    setTooltip({
      name: hit.name,
      kindLabel: KINDS[hit.kindIndex].label,
      where: `${JURIS[meta.juris].label} · ${band.year}`,
      fill: tooltipFill(truth),
      truth,
    });
  };

  // ---- milestone markers ------------------------------------------------
  const isPinned = Boolean(pinned) && marker === pinned;
  const markerOpen = Boolean(marker);

  useEffect(() => {
    if (!markerOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setHovered(null);
      setPinned(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [markerOpen]);

  const sameMarker = (a, b) =>
    Boolean(a) && a.kind === b.kind && a.year === b.year;

  const previewMarker = (next) => setHovered(next);
  const releaseMarker = () => setHovered(null);
  // A click keeps the note open, so it can be read (and its source used)
  // without holding the pointer on a marker. A second click closes it.
  const keepMarker = (next) => setPinned((prev) => (sameMarker(prev, next) ? null : next));

  const toggle = (id) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setKind = (id, on) => {
    setEnabled((prev) => {
      if (prev.has(id) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const overNode = (node, x, y) => {
    if (!node) return false;
    const r = node.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  // Which well the hand is over: the column itself, the “in” tray, the “out”
  // tray, or nothing. Read on the move, not from state, so a drop can never
  // land in a stale zone.
  const zoneAt = (x, y) => {
    if (overNode(windowRef.current, x, y) || overNode(trayInRef.current, x, y)) return 'in';
    if (overNode(trayOutRef.current, x, y)) return 'out';
    return null;
  };

  // Move a kind to a slot in the visible order. The order holds every kind,
  // so the slot is named by an anchor — insert before the kind that is there
  // now, or at the end. Kinds set aside keep their place in the full order
  // without taking a slot in the tray.
  const moveKind = (id, index) => {
    setOrder((prev) => {
      const rest = prev.filter((key) => key !== id);
      const visible = rest.filter((key) => enabled.has(key));
      const anchor = visible[index] ?? null;
      if (!anchor) return [...rest, id];
      const at = rest.indexOf(anchor);
      return [...rest.slice(0, at), id, ...rest.slice(at)];
    });
  };

  // A pointer is over a gap in the row as it stands, with the pill still in
  // it. Removing that pill shifts every gap to its right one place left, so
  // the slot is adjusted before it becomes an anchor.
  const moveToSlot = (id, slot) => {
    const from = inKinds.findIndex((kind) => kind.id === id);
    const visible = inKinds.filter((kind) => kind.id !== id);
    const target = from >= 0 && from < slot ? slot - 1 : slot;
    moveKind(id, Math.max(0, Math.min(visible.length, target)));
  };

  // The gap a drop would land in, counted between the pills as drawn. The
  // pill in hand stays in the row (dimmed) for exactly this reason: taking it
  // out would shrink the tray mid-drag and slide the other well under the
  // pointer, so a reader dragging inside the tray could drop into Set aside.
  const insertionAt = (x) => {
    const tray = trayInRef.current;
    if (!tray) return 0;
    let index = 0;
    for (const node of tray.querySelectorAll('.timeline-pill')) {
      const r = node.getBoundingClientRect();
      if (x < r.left + r.width / 2) break;
      index += 1;
    }
    return index;
  };

  const inKinds = order.filter((id) => enabled.has(id)).map((id) => KIND_BY_ID[id]);
  const outKinds = order.filter((id) => !enabled.has(id)).map((id) => KIND_BY_ID[id]);

  // Alt+arrow reorders without a pointer. The slot arithmetic is the same as
  // a drop's: the visible list is everything but the pill being moved.
  const pillKey = (event, kind) => {
    if (!event.altKey) return;
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!delta) return;
    const from = inKinds.findIndex((entry) => entry.id === kind.id);
    if (from < 0) return;
    event.preventDefault();
    const visible = inKinds.filter((entry) => entry.id !== kind.id);
    moveKind(kind.id, Math.max(0, Math.min(visible.length, from + delta)));
  };

  // A pill is a button first: click and the keyboard still toggle it. The drag
  // is the second way in — pick one up, drop it in the column to count it,
  // drop it in the tray to set it aside or to put it in that slot. Five
  // pixels separates a click from a drag.
  const pillDown = (event, kind) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (reduce) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const id = event.pointerId;
    let active = false;
    let slot = null;

    const move = (e) => {
      if (e.pointerId !== id) return;
      if (!active) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
        active = true;
        pillDragRef.current = true;
      }
      const zone = zoneAt(e.clientX, e.clientY);
      setDropZone(zone);
      const overTray = zone === 'in' && overNode(trayInRef.current, e.clientX, e.clientY);
      slot = overTray ? insertionAt(e.clientX) : null;
      setDropIndex(slot);
      setDrag({ id: kind.id, label: kind.label, shade: kind.shade, x: e.clientX, y: e.clientY });
    };
    const up = (e) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      pillDragRef.current = false;
      if (!active) return;
      const zone = zoneAt(e.clientX, e.clientY);
      if (zone) {
        setKind(kind.id, zone === 'in');
        if (zone === 'in' && slot !== null) moveToSlot(kind.id, slot);
        // The drop ends in a click on some browsers; swallow that one.
        skipPillClick.current = true;
        window.setTimeout(() => {
          skipPillClick.current = false;
        }, 0);
      }
      setDrag(null);
      setDropZone(null);
      setDropIndex(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onPillClick = (kind) => {
    if (skipPillClick.current) return;
    toggle(kind.id);
  };

  const yearAt = (clientX) => {
    const rail = railRef.current;
    if (!rail) return YEAR_MIN;
    const r = rail.getBoundingClientRect();
    if (!r.width) return YEAR_MIN;
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round(YEAR_MIN + t * (YEAR_MAX - YEAR_MIN));
  };

  const spanDown = (which) => (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can be gone by the time capture is asked for; the window
      // listeners below carry the drag either way.
    }
    const id = event.pointerId;
    const move = (e) => {
      if (e.pointerId !== id) return;
      const year = yearAt(e.clientX);
      setSpan((prev) => {
        const base = prev ?? { from: YEAR_MIN, to: YEAR_MAX };
        return which === 'from'
          ? { from: Math.min(year, base.to - 1), to: base.to }
          : { from: base.from, to: Math.max(year, base.from + 1) };
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const spanKey = (which) => (event) => {
    const step = event.shiftKey ? 10 : 1;
    const delta =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -step
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? step
          : 0;
    if (!delta) return;
    event.preventDefault();
    setSpan((prev) => {
      const base = prev ?? { from: YEAR_MIN, to: YEAR_MAX };
      return which === 'from'
        ? { from: Math.max(YEAR_MIN, Math.min(base.to - 1, base.from + delta)), to: base.to }
        : { from: base.from, to: Math.min(YEAR_MAX, Math.max(base.from + 1, base.to + delta)) };
    });
  };

  const yearPct = (year) => ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;

  const rtiPoints = RTI.map((r) => ({
    year: Number(r.fy.slice(0, 4)),
    value: r.received,
    label: `${r.fy}: ${r.received.toLocaleString('en-IN')} (${r.measure})`,
  }));
  const openDataPoints = STEPS.map((s) => ({
    year: Number(s.date.slice(0, 4)) + Number(s.date.slice(5, 7)) / 12,
    value: s.value,
    label: `${s.date}: ${s.value.toLocaleString('en-IN')} resources`,
  }));

  const pinTop = (year) => column?.bands.find((band) => band.year === year)?.top ?? 0;
  const markerEntries =
    marker?.kind === 'year'
      ? MILESTONE_YEARS.find(([year]) => year === marker.year)?.[1]
      : null;

  return (
    <section
      className="timeline"
      ref={rootRef}
      aria-labelledby="timeline-title"
      data-motion={reduce ? 'static' : 'scrub'}
      style={{ '--timeline-stick': `${stickTop}px` }}
    >
      {/* The section runs edge to edge; every line of text keeps the site's
          reading measure inside it. */}
      <div className="shell">
      <div className="section-head">
        <span className="overline">The timeline</span>
        <h1 id="timeline-title" className="timeline-title">
          The State writes a lot, how much have you read?
        </h1>
        <p className="section-strap">
          Every Act, amending Act, ordinance, rule and notification in the
          India Code catalogue &mdash; one named square each, one jurisdiction
          at a time. Scroll to draw it.
        </p>
        {rows && (
          <p className="timeline-total">
            <TickingNumber value={jurisTotals[0]} reduce={reduce} className="data-num" />
            {' '}central ·{' '}
            <TickingNumber value={jurisTotals[1]} reduce={reduce} className="data-num" />
            {' '}state ·{' '}
            <TickingNumber value={total} reduce={reduce} className="data-num" /> in all
          </p>
        )}
      </div>
      </div>

      <div className="shell">
      {showRti && (
        <StepStrip
          title="RTI applications with the central government"
          points={rtiPoints}
          unitNote="own scale · 2015-16 to 2024-25 · gaps are unverified years"
        />
      )}
      {showOpenData && (
        <StepStrip
          title="Resources published on data.gov.in"
          points={openDataPoints}
          unitNote="own scale · dated snapshots on differing counting bases"
        />
      )}
      </div>

      <div
        className="timeline-stage"
        ref={stageRef}
        style={column && !reduce ? { height: column.height * RUN + frameH } : undefined}
      >
        <div className="timeline-frame" ref={frameRef}>
          <div className="timeline-overlay">
          <div className="timeline-frame-bar">
            <div className="timeline-switch" role="group" aria-label="Which jurisdiction the timeline shows">
              {JURIS.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  className="timeline-switch-btn"
                  aria-pressed={juris === index}
                  aria-label={`${entry.label}: ${rows ? jurisTotals[index].toLocaleString('en-IN') : 'loading'} instruments`}
                  onClick={() => setJuris(index)}
                >
                  <span>{index === 0 ? 'Centre' : 'States'}</span>
                  {rows ? (
                    <TickingNumber
                      value={jurisTotals[index]}
                      reduce={reduce}
                      className="timeline-switch-count data-num"
                    />
                  ) : (
                    <span className="timeline-switch-count data-num">—</span>
                  )}
                </button>
              ))}
            </div>
            <div className="timeline-span">
              <span className="timeline-span-label" aria-hidden="true">
                Span
              </span>
              <div className="timeline-rail" ref={railRef} data-active={span ? 'true' : undefined}>
                <span
                  className="timeline-rail-fill"
                  aria-hidden="true"
                  style={{
                    left: `${yearPct(spanFrom)}%`,
                    width: `${yearPct(spanTo) - yearPct(spanFrom)}%`,
                  }}
                />
                <div
                  className="timeline-rail-handle"
                  role="slider"
                  tabIndex={0}
                  aria-label="Span start year"
                  aria-valuemin={YEAR_MIN}
                  aria-valuemax={Math.max(YEAR_MIN + 1, spanTo - 1)}
                  aria-valuenow={spanFrom}
                  aria-valuetext={`${spanFrom}`}
                  style={{ left: `${yearPct(spanFrom)}%` }}
                  onPointerDown={spanDown('from')}
                  onKeyDown={spanKey('from')}
                />
                <div
                  className="timeline-rail-handle"
                  role="slider"
                  tabIndex={0}
                  aria-label="Span end year"
                  aria-valuemin={Math.min(YEAR_MAX - 1, spanFrom + 1)}
                  aria-valuemax={YEAR_MAX}
                  aria-valuenow={spanTo}
                  aria-valuetext={`${spanTo}`}
                  style={{ left: `${yearPct(spanTo)}%` }}
                  onPointerDown={spanDown('to')}
                  onKeyDown={spanKey('to')}
                />
              </div>
              <span className="timeline-span-readout">
                {spanInfo ? (
                  <span className="data-num">
                    {spanInfo.from}&ndash;{spanInfo.to} ·{' '}
                    <TickingNumber value={spanInfo.count} reduce={reduce} />
                  </span>
                ) : (
                  <span className="meta">drag the handles</span>
                )}
              </span>
              {span && (
                <button
                  type="button"
                  className="timeline-span-clear"
                  aria-label="Clear the span and show the whole catalogue"
                  onClick={() => setSpan(null)}
                >
                  &times;
                </button>
              )}
            </div>
            <p className="timeline-readout" aria-live="off">
              <span className="meta">Reading</span>{' '}
              <strong ref={readoutRef} className="data-num">
                {YEAR_MIN}
              </strong>
            </p>
          </div>

          <div className="timeline-controls">
            <div
              className="timeline-tray"
              ref={trayInRef}
              data-over={dropZone === 'in' ? 'true' : undefined}
              role="group"
              aria-label="Kinds counted in the column, top of each band first"
              data-order={inKinds.map((kind) => kind.id).join(' ')}
            >
              <span className="timeline-tray-label">In the column</span>
              {inKinds.map((kind, index) => {
                // The slot bar is painted in the gap, not inserted into the
                // row: a new flex item would widen the tray mid-drag and shift
                // the pills (and the other well) under the pointer.
                let insert;
                if (drag && dropIndex === index) insert = 'before';
                else if (drag && dropIndex === inKinds.length && index === inKinds.length - 1) {
                  insert = 'after';
                }
                return (
                  <button
                    key={kind.id}
                    type="button"
                    className={`timeline-pill${drag?.id === kind.id ? ' is-dragging' : ''}`}
                    data-kind={kind.id}
                    data-insert={insert}
                    aria-pressed="true"
                    onPointerDown={(event) => pillDown(event, kind)}
                    onKeyDown={(event) => pillKey(event, kind)}
                    onClick={() => onPillClick(kind)}
                  >
                    <span className="toggle-swatch" style={{ background: `var(--${kind.shade})` }} aria-hidden="true" />
                    {kind.label}
                  </button>
                );
              })}
              {enabled.size === 0 && (
                <span className="timeline-tray-hint">
                  {reduce ? 'click a kind to count it' : 'drop a kind here to count it'}
                </span>
              )}
            </div>

            <div
              className="timeline-tray"
              ref={trayOutRef}
              data-over={dropZone === 'out' ? 'true' : undefined}
              role="group"
              aria-label="Kinds left out of the column"
            >
              <span className="timeline-tray-label">Set aside</span>
              {outKinds.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  className={`timeline-pill${drag?.id === kind.id ? ' is-dragging' : ''}`}
                  data-kind={kind.id}
                  aria-pressed="false"
                  onPointerDown={(event) => pillDown(event, kind)}
                  onKeyDown={(event) => pillKey(event, kind)}
                  onClick={() => onPillClick(kind)}
                >
                  <span className="toggle-swatch" style={{ background: `var(--${kind.shade})` }} aria-hidden="true" />
                  {kind.label}
                </button>
              ))}
              {enabled.size === KINDS.length && (
                <span className="timeline-tray-hint">
                  {reduce ? 'click a kind to leave it out' : 'drag one out to leave it out'}
                </span>
              )}
            </div>
          </div>
          </div>

          <div className="timeline-window" ref={windowRef}>
            {column && layout ? (
              <div className="timeline-track" ref={trackRef}>
                <canvas
                  ref={canvasRef}
                  className="timeline-canvas"
                  role="img"
                  aria-label={`Vertical unit chart of ${column.total.toLocaleString('en-IN')} ${JURIS[juris].label} instruments catalogued by India Code, ${YEAR_MIN} to ${YEAR_MAX}, one square per instrument. Every year is a band; band depth is that year's output. The full record is in the instruments CSV below.`}
                  onPointerMove={onPointerMove}
                  onPointerDown={onPointerMove}
                  onPointerLeave={clearTooltip}
                  onPointerCancel={clearTooltip}
                />

                {spanBand && (
                  <div
                    className="timeline-span-band"
                    aria-hidden="true"
                    style={{
                      top: spanBand.top,
                      height: spanBand.height,
                      left: layout.axis,
                      width: layout.plotW,
                    }}
                  />
                )}

                <div className="timeline-frontier" ref={frontierRef} aria-hidden="true" />

                <div className="timeline-markers">
                  {MILESTONE_YEARS.map(([year, entries]) => {
                    const open = marker?.kind === 'year' && marker.year === year;
                    return (
                      <button
                        key={year}
                        type="button"
                        className={`timeline-marker${open ? ' is-open' : ''}`}
                        ref={(node) => {
                          if (node) pinRefs.current.set(String(year), node);
                          else pinRefs.current.delete(String(year));
                        }}
                        style={{ top: pinTop(year) }}
                        aria-label={`${year}: ${entries.map((entry) => entry.label).join('; ')}`}
                        aria-expanded={open}
                        onPointerEnter={() => previewMarker({ kind: 'year', year })}
                        onPointerLeave={releaseMarker}
                        onFocus={() => previewMarker({ kind: 'year', year })}
                        onBlur={releaseMarker}
                        onClick={() => keepMarker({ kind: 'year', year })}
                      />
                    );
                  })}
                  {/* One undated marker, at the foot of the column: the total
                      that would sit there does not exist. */}
                  <button
                    type="button"
                    className={`timeline-marker timeline-marker-gap${marker?.kind === 'gap' ? ' is-open' : ''}`}
                    ref={(node) => {
                      if (node) pinRefs.current.set('gap', node);
                      else pinRefs.current.delete('gap');
                    }}
                    style={{ top: column.height - 9, left: layout.axis + layout.plotW }}
                    aria-label={`${GAZETTE_GAP.label}. ${GAZETTE_GAP.scope}`}
                    aria-expanded={marker?.kind === 'gap'}
                    onPointerEnter={() => previewMarker({ kind: 'gap' })}
                    onPointerLeave={releaseMarker}
                    onFocus={() => previewMarker({ kind: 'gap' })}
                    onBlur={releaseMarker}
                    onClick={() => keepMarker({ kind: 'gap' })}
                  />
                </div>

                <div className="timeline-beats">
                  {/* A blob of accent over the band each note is about, sized
                      to that year's output: the note explains how much paper
                      there is, the blob shows how much of the column it is. */}
                  {beats.map((beat) => (
                    <span
                      key={`halo-${beat.year}`}
                      className="timeline-beat-halo"
                      data-on="false"
                      ref={(node) => {
                        if (node) haloRefs.current.set(String(beat.year), node);
                        else haloRefs.current.delete(String(beat.year));
                      }}
                      style={{
                        top: beat.bandTop - 5,
                        height: Math.max(beat.bandHeight + 10, 48),
                        left: layout.axis - 12,
                      }}
                      aria-hidden="true"
                    />
                  ))}

                  {beats.map((beat) => (
                    <aside
                      key={beat.year}
                      className="timeline-beat"
                      data-side={beat.side}
                      data-on="false"
                      ref={(node) => {
                        if (node) beatRefs.current.set(String(beat.year), node);
                        else beatRefs.current.delete(String(beat.year));
                      }}
                      style={{ top: beat.top }}
                    >
                      <span className="timeline-beat-year data-num">{beat.year}</span>
                      <p className="timeline-beat-kicker">{beat.kicker}</p>
                      <p className="timeline-beat-line">{beatText(beat.line, beat)}</p>
                    </aside>
                  ))}
                </div>
              </div>
            ) : (
              <p className="timeline-loading" role="status">
                Bringing the catalogue to the table&hellip;
              </p>
            )}

            {tooltip && (
              <div
                className="timeline-tooltip"
                ref={tipRef}
                style={{
                  '--tip-fill': tooltip.fill,
                  '--tip-true': tooltip.truth,
                }}
              >
                <span className="timeline-tooltip-kind">{tooltip.kindLabel}</span>
                <strong>{tooltip.name}</strong>
                <span className="meta">{tooltip.where}</span>
              </div>
            )}

            {marker && (
              <div className={`timeline-callout${marker.kind === 'gap' ? ' timeline-callout-gap' : ''}`} role="note">
                {isPinned && (
                  <button
                    type="button"
                    className="timeline-callout-close"
                    aria-label="Close the callout"
                    onClick={() => setPinned(null)}
                  >
                    &times;
                  </button>
                )}
                {marker.kind === 'gap' ? (
                  <>
                    <span className="timeline-callout-year">No annual total</span>
                    <p className="timeline-callout-label">{GAZETTE_GAP.label}</p>
                    <p className="timeline-callout-scope">{GAZETTE_GAP.scope}</p>
                    <p className="timeline-callout-source">{GAZETTE_GAP.source}</p>
                  </>
                ) : (
                  <>
                    <span className="timeline-callout-year data-num">{marker.year}</span>
                    {markerEntries?.map((entry) => (
                      <div key={entry.label} className="timeline-callout-entry">
                        <p className="timeline-callout-label">{entry.label}</p>
                        <p className="timeline-callout-scope">{entry.scope}</p>
                        {entry.url ? (
                          <a
                            className="timeline-callout-source"
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {entry.source}
                          </a>
                        ) : (
                          <p className="timeline-callout-source">{entry.source}</p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shell">
      <div className="timeline-toggles" role="group" aria-label="Snapshot series shown above the timeline">
        <span className="timeline-tray-label">Snapshot series</span>
        <button
          type="button"
          className={`toggle-chip ${showRti ? '' : 'toggle-off'}`}
          aria-pressed={showRti}
          onClick={() => setShowRti((v) => !v)}
        >
          RTI applications
        </button>
        <button
          type="button"
          className={`toggle-chip ${showOpenData ? '' : 'toggle-off'}`}
          aria-pressed={showOpenData}
          onClick={() => setShowOpenData((v) => !v)}
        >
          Open data resources
        </button>
      </div>

      <details className="timeline-method-details">
        <summary>Data &amp; methodology</summary>
      <p className="meta timeline-hint">
        The column counts the kinds you put in it, in the order you put them:
        drag a pill sideways to set the order the strata stack in, or press
        Alt with the arrow keys on a focused pill. Click a pill to move it
        between the column and Set aside; with a pointer you can pick one up
        and drop it just as well, and Enter or Space works on the focused
        pill. Drag the span handles to bound a period and the frame counts
        what that period carried. Hover a square to name the instrument, or a
        pin for what was counted that year; click a pin to keep the note open.
      </p>

      <div className="timeline-method">
        <p>{CATALOGUE_NOTE}</p>
        <p>
          One row per instrument in{' '}
          <a href="/research/ths_state_output_instruments.csv">the instruments CSV</a>; per-year
          aggregates in <a href="/research/ths_state_output_series.csv">the series CSV</a>;
          every scope and source in{' '}
          <a href="/research/ths_state_output_sources.txt">the source list</a>.
          Bands are ordered by year, not scaled to it: a band is as deep as the
          number of instruments that year carried, so the column doubles as the
          cumulative record. The RTI and open-data strips are dated snapshots on
          their own scales &mdash; they never share the instrument axis.
        </p>
      </div>
      </details>
      </div>

      {/* The pill in hand. Fixed to the viewport so the frame's own overflow
          cannot clip it mid-drag; pointer-events off so a drop lands on the
          well underneath, not on the pill. */}
      {drag && (
        <span
          className="timeline-pill timeline-pill-ghost"
          aria-hidden="true"
          style={{ left: drag.x, top: drag.y }}
        >
          <span className="toggle-swatch" style={{ background: `var(--${drag.shade})` }} />
          {drag.label}
        </span>
      )}
    </section>
  );
}
