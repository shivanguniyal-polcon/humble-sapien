// The field behind the page: a lattice of survey ticks on the paper, drifting
// in a slow two-wave current. Move the pointer and ticks inside a reading
// radius lean toward it, lengthen, and warm from rule ink to the house maroon.
// No particles, no trails, no model: the whole thing is one fixed canvas and
// three draw calls a frame, behind every route's content.
//
// The restraint is the point. It is a survey sheet, not an aquarium: the ticks
// stay at a tenth of full ink so prose keeps its ground, and the field is not
// rendered at all on Home (the timeline is its own instrument) or on touch
// screens, where the paper has less room and no pointer to answer.

import { useEffect, useRef, useState } from 'react';
import { themeColors, withAlpha } from '../lib/theme';

const LATTICE = 54;
const RADIUS = 172;
const TICK = 4.6;

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

// A pointer the field can actually answer, and enough width for margins. The
// CSS hides the canvas at the same breakpoint; this guard keeps the frame loop
// from running where nothing is visible.
const useFieldWanted = () => {
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(
      '(min-width: 48rem) and (hover: hover) and (pointer: fine)',
    );
    const read = () => setWanted(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);
  return wanted;
};

export default function AmbientField({ quiet = false, gate = null }) {
  const canvasRef = useRef(null);
  const reduce = useReducedMotion();
  const wanted = useFieldWanted();
  // Home carries the field only after the timeline: the gate is a selector for
  // the close (and the footer after it). Elsewhere there is no gate and the
  // field is present from the first paint.
  const [active, setActive] = useState(gate === null);

  useEffect(() => {
    if (!gate) return undefined;
    const targets = [...document.querySelectorAll(gate)];
    if (targets.length === 0) return undefined;
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setActive(visible.size > 0);
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [gate]);

  useEffect(() => {
    if (!wanted || !active) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, active: false };
    const accent = themeColors().accent;
    const ink = themeColors().text;
    const speed = quiet ? 0.34 : 1;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    const started = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now) => {
      const t = (now - started) * speed;
      if (pointer.active) {
        // First contact should not sweep in from the last pointer's corner.
        if (pointer.x < -1000) {
          pointer.x = pointer.tx;
          pointer.y = pointer.ty;
        } else {
          pointer.x += (pointer.tx - pointer.x) * 0.16;
          pointer.y += (pointer.ty - pointer.y) * 0.16;
        }
      } else {
        pointer.x += (-1e4 - pointer.x) * 0.1;
        pointer.y += (-1e4 - pointer.y) * 0.1;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;

      const neutral = new Path2D();
      const warm = new Path2D();
      const cols = Math.ceil(width / LATTICE) + 1;
      const rows = Math.ceil(height / LATTICE) + 1;
      const live = pointer.active && pointer.x > -1000;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * LATTICE + LATTICE * 0.5;
          const y = row * LATTICE + LATTICE * 0.5;

          // Two slow waves crossing at different frequencies keep the lattice
          // from reading as a repeating pattern.
          const wave =
            Math.sin(x * 0.0052 + y * 0.0041 + t * 0.00007) +
            0.55 * Math.sin(y * 0.0068 + x * 0.0016 - t * 0.00005);
          let ax = Math.cos(Math.PI / 2 + wave * 0.6);
          let ay = Math.sin(Math.PI / 2 + wave * 0.6);
          let len = TICK + 1.15 * Math.sin(x * 0.011 - t * 0.00009);

          let lean = 0;
          if (live) {
            const dx = pointer.x - x;
            const dy = pointer.y - y;
            const dist = Math.hypot(dx, dy);
            if (dist < RADIUS) {
              const pull = (1 - dist / RADIUS) ** 2;
              lean = pull;
              const mix = 0.88 * pull;
              const px = dx / (dist || 1);
              const py = dy / (dist || 1);
              const bx = ax * (1 - mix) + px * mix;
              const by = ay * (1 - mix) + py * mix;
              const norm = Math.hypot(bx, by) || 1;
              ax = bx / norm;
              ay = by / norm;
              len += 5.8 * pull;
            }
          }

          // Ticks sit centred on their lattice node, so the field breathes in
          // both directions rather than growing a comb.
          const half = len / 2;
          const path = lean > 0.08 ? warm : neutral;
          path.moveTo(x - ax * half, y - ay * half);
          path.lineTo(x + ax * half, y + ay * half);
        }
      }

      ctx.strokeStyle = withAlpha(ink, 0.11);
      ctx.stroke(neutral);

      if (live) {
        const glow = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, RADIUS,
        );
        glow.addColorStop(0, withAlpha(accent, 0.08));
        glow.addColorStop(0.6, withAlpha(accent, 0.028));
        glow.addColorStop(1, withAlpha(accent, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const warmth = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, RADIUS,
        );
        warmth.addColorStop(0, withAlpha(accent, 0.58));
        warmth.addColorStop(0.55, withAlpha(accent, 0.24));
        warmth.addColorStop(1, withAlpha(accent, 0));
        ctx.strokeStyle = warmth;
        ctx.stroke(warm);
      }
    };

    resize();
    draw(performance.now());

    if (reduce) {
      const onResize = () => {
        resize();
        draw(performance.now());
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const onMove = (event) => {
      if (event.pointerType === 'touch') return;
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.tx = -1e4;
      pointer.ty = -1e4;
    };

    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      // A survey sheet does not need sixty frames a second.
      if (now - last < 32) return;
      last = now;
      draw(now);
    };

    const onResize = () => {
      resize();
      draw(performance.now());
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        frame = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    // pointerout bubbles for every element the pointer crosses; pointerleave
    // on the document root fires only when the pointer actually leaves the page.
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, quiet, reduce, wanted]);

  if (!wanted) return null;
  return (
    <canvas
      ref={canvasRef}
      className={`ambient-field${quiet ? ' ambient-field-quiet' : ''}`}
      data-active={active ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}
