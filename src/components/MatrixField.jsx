// The script rain behind Home: columns of letters from the scheduled
// languages, digits and marks falling from the ribbon to the foot of the page.
// It is a ground, not a spectacle — glyphs stay at a tenth of full ink, the
// frame runs at half speed, and the timeline's band is cut out of the canvas so
// the chart keeps its own paper.
//
// The columns are fixed to the window; the ribbon's bottom and the timeline's
// box are read every frame, so the rain starts under the band and resumes once
// the chart has passed. Reduced motion draws one still field.

import { useEffect, useRef, useState } from 'react';
import { themeColors, withAlpha } from '../lib/theme';
import { useReducedMotion } from '../lib/useReducedMotion.js';

const GLYPHS = [
  // Devanagari
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'क', 'ख', 'ग', 'घ', 'च', 'ज', 'ट', 'ड', 'ण',
  'त', 'द', 'न', 'प', 'ब', 'म', 'य', 'र', 'ल', 'व', 'श', 'स', 'ह',
  // Bengali
  'অ', 'আ', 'ই', 'ক', 'খ', 'গ', 'ঘ', 'চ', 'জ', 'ট', 'ড', 'ণ', 'ত', 'দ', 'ন',
  'প', 'ব', 'ম', 'য', 'র', 'ল', 'শ', 'স', 'হ',
  // Gurmukhi
  'ਅ', 'ਆ', 'ਕ', 'ਖ', 'ਗ', 'ਘ', 'ਚ', 'ਜ', 'ਟ', 'ਤ', 'ਦ', 'ਨ', 'ਪ', 'ਬ', 'ਮ',
  'ਯ', 'ਰ', 'ਲ', 'ਵ', 'ਸ', 'ਹ',
  // Gujarati
  'અ', 'આ', 'ક', 'ખ', 'ગ', 'ઘ', 'ચ', 'જ', 'ટ', 'ત', 'દ', 'ન', 'પ', 'બ', 'મ',
  'ય', 'ર', 'લ', 'વ', 'સ', 'હ',
  // Odia
  'ଅ', 'ଆ', 'କ', 'ଖ', 'ଗ', 'ଘ', 'ଚ', 'ଜ', 'ଟ', 'ତ', 'ଦ', 'ନ', 'ପ', 'ବ', 'ମ',
  'ଯ', 'ର', 'ଲ', 'ଵ', 'ସ', 'ହ',
  // Tamil
  'அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'க', 'ங', 'ச', 'ஜ', 'ட', 'ண', 'த', 'ந', 'ப',
  'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன',
  // Telugu
  'అ', 'ఆ', 'ఇ', 'ఈ', 'ఉ', 'ఊ', 'క', 'ఖ', 'గ', 'ఘ', 'చ', 'జ', 'ట', 'డ', 'ణ',
  'త', 'ద', 'న', 'ప', 'బ', 'మ', 'య', 'ర', 'ల', 'వ', 'శ', 'స', 'హ',
  // Kannada
  'ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ', 'ಊ', 'ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಚ', 'ಜ', 'ಟ', 'ಡ', 'ಣ',
  'ತ', 'ದ', 'ನ', 'ಪ', 'ಬ', 'ಮ', 'ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ', 'ಸ', 'ಹ',
  // Malayalam
  'അ', 'ആ', 'ഇ', 'ഈ', 'ഉ', 'ഊ', 'ക', 'ഖ', 'ഗ', 'ഘ', 'ച', 'ജ', 'ട', 'ഡ', 'ണ',
  'ത', 'ദ', 'ന', 'പ', 'ബ', 'മ', 'യ', 'ര', 'ല', 'വ', 'ശ', 'സ', 'ഹ',
  // Urdu
  'ا', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش',
  'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ہ', 'ی',
  // Latin, digits and the marks of a printed page
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '०', '१', '२', '३', '४',
  '௦', '௧', '೦', '೧', '൦', '൧',
  '§', '¶', '†', '‡', '₹', '#', '%', '&', '+', '=', '×', '÷', '→', '∞', '∑',
  '∫', '∆', 'Ω', 'µ', '¬', '±', '≤', '≥', '⟨', '⟩', '/', '\\', '|', '~', '^',
];

const FONT =
  '500 12px "Public Sans", "Noto Sans Devanagari", "Noto Sans Bengali", "Noto Sans Tamil", sans-serif';
const COLUMN = 30;
const TRAIL = 11;
const LINE = 15;
const MAX_ALPHA = 0.2;

const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

export default function MatrixField() {
  const canvasRef = useRef(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const ink = themeColors().text;
    const accent = themeColors().accent;

    let width = 0;
    let height = 0;
    let columns = [];
    let frame = 0;
    let last = 0;
    let acc = 0;

    const makeColumn = (x) => ({
      x,
      y: -Math.random() * window.innerHeight,
      speed: 26 + Math.random() * 46,
      glyphs: Array.from({ length: TRAIL }, pick),
      warm: Math.random() < 0.3,
    });

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = FONT;
      ctx.textBaseline = 'middle';
      const count = Math.max(10, Math.ceil(width / COLUMN));
      columns = Array.from({ length: count }, (_, i) =>
        makeColumn(i * COLUMN + COLUMN / 2),
      );
    };

    const draw = () => {
      const ribbon = document.querySelector('.schedule-ribbon');
      const timeline = document.querySelector('.timeline');
      const ribbonBottom = ribbon?.getBoundingClientRect().bottom;
      const start = Math.max(0, Math.min(ribbonBottom ?? 0, height));
      const band = timeline?.getBoundingClientRect();
      const inBand = (y) =>
        Boolean(band) && band.bottom > 0 && band.top < height && y >= band.top && y <= band.bottom;

      // While the chart fills the window there is nothing to draw.
      if (band && band.top <= 0 && band.bottom >= height) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (const column of columns) {
        const color = column.warm ? accent : ink;
        for (let i = 0; i < TRAIL; i += 1) {
          const y = column.y - i * LINE;
          if (y < start || y > height || inBand(y)) continue;
          const fade = Math.pow(1 - i / TRAIL, 1.7);
          ctx.globalAlpha = Math.min(MAX_ALPHA, fade * MAX_ALPHA);
          ctx.fillStyle = withAlpha(color, 1);
          ctx.fillText(column.glyphs[i], column.x, y);
        }
      }
      ctx.globalAlpha = 1;
    };

    const step = (now) => {
      const delta = last ? Math.min(0.06, (now - last) / 1000) : 0;
      last = now;
      acc += delta;
      // Half a frame budget: the rain is slow, so 24fps is plenty.
      if (acc < 1 / 24) {
        frame = requestAnimationFrame(step);
        return;
      }
      acc = 0;

      for (const column of columns) {
        column.y += column.speed * delta;
        if (column.y - TRAIL * LINE > height) {
          column.y = -Math.random() * height * 0.4;
          column.speed = 26 + Math.random() * 46;
          column.glyphs = Array.from({ length: TRAIL }, pick);
          column.warm = Math.random() < 0.3;
        } else if (Math.random() < 0.08) {
          column.glyphs[Math.floor(Math.random() * TRAIL)] = pick();
        }
      }

      draw();
      frame = requestAnimationFrame(step);
    };

    resize();
    setActive(true);

    if (reduce) {
      draw();
      const onStill = () => draw();
      const onResize = () => {
        resize();
        draw();
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onStill, { passive: true });
      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onStill);
      };
    }

    frame = requestAnimationFrame(step);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [reduce]);

  return (
    <canvas
      className="matrix-field"
      ref={canvasRef}
      data-active={active ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}
