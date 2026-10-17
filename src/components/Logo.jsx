// The THS lockup: the brain/face mark — a brain silhouette behind, a human
// profile in front, cut from one shape — beside the wordmark. The silhouette
// is a vector traced from the approved raster master and recoloured to the
// palette maroon wherever it renders. The mark lights up: the cursor makes
// it glow a little; the About-page instance ramps the same glow as you
// scroll past it.

import { useEffect, useRef } from 'react';
import { LOGO_MARK_PATH } from './logo-mark';

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
      viewBox="0 0 280 64"
      role="img"
      aria-label={label}
    >
      <g transform="translate(6 9) scale(0.46)">
        <path
          ref={markRef}
          className="brand-mark"
          d={LOGO_MARK_PATH}
          fill="var(--color-accent-solid)"
          fillRule="evenodd"
        />
      </g>
      <text className="brand-word" x="62" y="40">
        The Humble Sapien
      </text>
    </svg>
  );
}
