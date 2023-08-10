import { useEffect, useRef, useState } from 'react';
import { themeColors, withAlpha } from '../lib/theme';

// "Catch the Entitlement": a small policy arcade.
// Entitlement cards fall (catch them, +10). Jargon blobs fall too (let them
// pass, -10 if caught). 60 seconds. Pointer or arrow keys.

const ENTITLEMENTS = [
  'PM-JAY cover',
  'Ration card',
  'Old-age pension',
  'Toilet subsidy',
  'Maternity benefit',
  'Scholarship',
  'Free medicines',
  'Job card (MGNREGA)',
];

const JARGON = [
  'notwithstanding',
  'thereof',
  'inter alia',
  'aforesaid',
  'hereinafter',
  'vide',
  'pursuant to',
  'proviso',
];

export default function PolicyGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef({ items: [], basket: 0.5, score: 0, time: 60, running: false, spawn: 0 });
  const [ui, setUi] = useState({ score: 0, time: 60, best: 0, over: true });

  const start = () => {
    const s = stateRef.current;
    s.items = [];
    s.score = 0;
    s.time = 60;
    s.running = true;
    s.spawn = 0;
    setUi((u) => ({ ...u, score: 0, time: 60, over: false }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    let raf;
    let last = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (s.running) {
        s.time -= dt;
        s.spawn -= dt;
        if (s.spawn <= 0) {
          s.spawn = 0.85 + Math.random() * 0.8;
          const good = Math.random() > 0.42;
          const pool = good ? ENTITLEMENTS : JARGON;
          s.items.push({
            x: 0.08 + Math.random() * 0.84,
            y: -0.05,
            vy: 0.14 + Math.random() * 0.12,
            label: pool[Math.floor(Math.random() * pool.length)],
            good,
          });
        }
        for (const it of s.items) it.y += it.vy * dt;
        // catches
        s.items = s.items.filter((it) => {
          if (it.y > 0.86 && it.y < 1.02 && Math.abs(it.x - s.basket) < 0.14) {
            s.score += it.good ? 10 : -10;
            setUi((u) => ({ ...u, score: s.score, best: Math.max(u.best, s.score) }));
            return false;
          }
          return it.y <= 1.05;
        });
        if (s.time <= 0) {
          s.time = 0;
          s.running = false;
          setUi((u) => ({ ...u, time: 0, over: true }));
        } else if (Math.abs(s.time - Math.round(s.time)) < dt) {
          setUi((u) => ({ ...u, time: Math.round(s.time) }));
        }
      }

      // render
      ctx.clearRect(0, 0, w, h);
      const t = themeColors();
      ctx.fillStyle = withAlpha(t.accent, 0.08);
      ctx.fillRect(0, 0, w, h);
      for (const it of s.items) {
        const x = it.x * w;
        const y = it.y * h;
        ctx.font = '600 15px "Public Sans", sans-serif';
        const tw = ctx.measureText(it.label).width;
        ctx.fillStyle = it.good ? 'rgba(77, 124, 84, 0.92)' : 'rgba(180, 85, 45, 0.92)';
        const bx = x - tw / 2 - 10;
        ctx.beginPath();
        ctx.roundRect(bx, y - 15, tw + 20, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.label, x, y);
      }
      // basket
      const bx = s.basket * w;
      ctx.fillStyle = withAlpha(t.text, 0.85);
      ctx.beginPath();
      ctx.roundRect(bx - w * 0.07, h * 0.92, w * 0.14, 22, 11);
      ctx.fill();
      ctx.font = '600 11px "Public Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('catch', bx, h * 0.92 + 11);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (e) => {
      if (e.key === 'ArrowLeft') s.basket = Math.max(0.07, s.basket - 0.05);
      if (e.key === 'ArrowRight') s.basket = Math.min(0.93, s.basket + 0.05);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span className="data-num">Score {ui.score}</span>
        <span className="data-num">Time {ui.time}s</span>
        <span className="data-num">Best {ui.best}</span>
        <button className="btn btn-primary" onClick={start}>
          {ui.over ? 'Start game' : 'Restart'}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Catch the Entitlement game: move the basket to catch falling entitlement cards and avoid jargon"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          stateRef.current.basket = Math.min(0.93, Math.max(0.07, (e.clientX - r.left) / r.width));
        }}
      />
      <p className="meta">
        Move the basket with your pointer or arrow keys. Catch{' '}
        <strong>entitlements</strong> (+10). Let <strong>jargon</strong> fall
        (−10 if you catch it). This is how policy should feel: legible.
      </p>
    </div>
  );
}
