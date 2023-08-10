// The THS lockup: an abstract top-down brain — one soft silhouette split by a
// wavy central fissure, contour-arc folds echoing the outline in each
// hemisphere — drawn as simple line art beside the wordmark. No stem, no
// motion choreography: the mark is a vector that lights up. Moving the cursor
// over the brain makes it glow a little; the About-page instance ramps the
// same glow as you scroll past it.

import { useEffect, useRef } from 'react';

const OUTLINE =
  'M 32 11 C 27 6 19.5 4.5 14 7 C 7.5 10 4.5 16 4.5 23 C 4.5 31 7.5 39 13 43.5 C 18 47.5 25 48 30 45 L 32 41.5 L 34 45 C 39 48 46 47.5 51 43.5 C 56.5 39 59.5 31 59.5 23 C 59.5 16 56.5 10 50 7 C 44.5 4.5 37 6 32 11 Z';
const FISSURE = 'M 32 12.5 C 29.8 17 34.2 22 32 26.5 C 29.8 31 34.2 36 32 40.5';
const FOLDS = [
  'M 10.5 18 C 13 13.5 17.5 11.5 21.5 13',
  'M 9.5 26 C 10 31.5 12.5 36.5 16.5 40',
];
const MIRROR = 'translate(64 0) scale(-1 1)';

const glowFilter = (p) =>
  p < 0.02
    ? 'none'
    : `drop-shadow(0 0 ${(2 + p * 7).toFixed(1)}px rgba(122, 31, 43, ${(0.14 + p * 0.36).toFixed(2)})) drop-shadow(0 0 ${(6 + p * 14).toFixed(1)}px rgba(122, 31, 43, ${(0.08 + p * 0.2).toFixed(2)}))`;

export default function Logo({
  className = '',
  label = 'The Humble Sapien',
  mode = 'interactive', // 'interactive' (glow on hover) | 'scroll' (glow scrubs with scroll)
}) {
  const svgRef = useRef(null);
  const markRef = useRef(null);

  useEffect(() => {
    if (mode !== 'scroll') return undefined;
    const svg = svgRef.current;
    const mark = markRef.current;
    if (!svg || !mark) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) {
      mark.style.filter = glowFilter(0.55);
      return undefined;
    }

    mark.style.transition = 'none'; // the scroll drives the glow directly

    const progress = () => {
      const r = svg.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    };
    let current = progress();
    let target = current;
    let raf = 0;
    let lastTick = 0;
    const tick = () => {
      lastTick = performance.now();
      current += (target - current) * 0.18;
      if (Math.abs(target - current) < 0.002) current = target;
      mark.style.filter = glowFilter(current);
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };
    const start = () => {
      // Re-arm if no frame is pending, or if a pending frame has stalled —
      // never let the loop wedge.
      if (raf && performance.now() - lastTick < 250) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      target = progress();
      start();
    };
    mark.style.filter = glowFilter(current);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);

  return (
    <svg
      ref={svgRef}
      className={`brand-lockup ${className}`.trim()}
      viewBox="0 0 300 64"
      role="img"
      aria-label={label}
    >
      <g transform="translate(0 6)">
        <g
          ref={markRef}
          className="brand-mark"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={OUTLINE} strokeWidth="2.4" />
          <path d={FISSURE} strokeWidth="1.8" />
          {FOLDS.map((f) => (
            <g key={f}>
              <path d={f} strokeWidth="1.7" />
              <path d={f} transform={MIRROR} strokeWidth="1.7" />
            </g>
          ))}
        </g>
      </g>
      <text className="brand-word" x="82" y="40">
        The Humble Sapien
      </text>
    </svg>
  );
}
