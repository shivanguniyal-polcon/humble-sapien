// Khata's WhatsApp image flyer.
//
// This is a Hindi handbill, not a second report. It carries the three figures
// a neighbour needs and the first three Gram Sabha questions, then points back
// to the full page. The canvas is fixed at 1080 × 1350 so the image stays
// legible on a phone, and it uses only system fonts and drawn shapes: no web
// font, external image or network request can leave a blank card.

import qrcode from 'qrcode-generator';
import { buildQuestions, dateLabel, placeName, rupees } from './passbook.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 76;

const PAPER = '#f6f5f3';
const CARD = '#ffffff';
const INK = '#1b1815';
const MUTED = '#6f6a63';
const BORDER = '#e0ddd8';
const ACCENT = '#7a1f2b';

// A browser may not have a Devanagari font family with any of these names;
// the generic sans-serif fallback still shapes the text through the system
// text engine, which is why the flyer does not ship a font file.
const BODY = '"Noto Sans Devanagari", "Nirmala UI", "Devanagari Sangam MN", -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const font = (weight, size, family = BODY) => `${weight} ${size}px ${family}`;

// The flyer is Hindi-only on purpose: it is made for the Gram Sabha and the
// village WhatsApp group. The English reading view keeps its own share text.
export const flyerContent = (doc, { url = '' } = {}) => {
  const gp = doc.gp;
  const finance = gp.finance;
  const yearEnd = String(doc.year).slice(-4);
  const block = placeName(doc.block.name, 'hi');
  const district = placeName(doc.district.name, 'hi');
  const state = placeName(doc.state.name, 'hi');
  const englishName = gp.name && gp.name !== gp.nameHi ? gp.name : '';
  const subtitle = [englishName, `${block} प्रखंड`, `${district} जिला`, state]
    .filter(Boolean)
    .join(' · ');

  return {
    brand: 'खाता',
    kicker: 'ग्राम पंचायत का पैसा',
    title: gp.nameHi || gp.name,
    subtitle,
    year: doc.year,
    stats: [
      {
        label: 'इस साल मिला',
        value: rupees(finance.totals.receipts, 'hi'),
        note: `${finance.totals.schemeCount} योजनाओं से`,
      },
      {
        label: 'इस साल खर्च',
        value: rupees(finance.totals.payments, 'hi'),
        note: 'बिल और काम',
      },
      {
        label: '15वें वित्त आयोग का बचा',
        value: rupees(finance.xvfc.closing, 'hi'),
        note: `31 मार्च ${yearEnd}`,
      },
    ],
    questions: buildQuestions(doc, { lang: 'hi' }).slice(0, 3),
    url: String(url || ''),
    source: `स्रोत: eGramSwaraj · ${dateLabel(doc.generatedAt.slice(0, 10), 'hi')} · ${doc.dataHash.replace(/^sha256:/, '').slice(0, 16)}…`,
  };
};

// Break a sentence at spaces. Devanagari words do not break internally, so a
// word that is wider than the column is the only case where this overflows.
function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// A URL has no spaces, so it needs its own character-level wrap. The flyer
// only ever prints a link for a human to type or scan, not a click target.
function wrapToken(ctx, text, maxWidth) {
  const chars = [...String(text || '')];
  const lines = [];
  let line = '';
  for (const char of chars) {
    if (line && ctx.measureText(line + char).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Keep a heading to its allotted lines without cutting a Devanagari cluster
// in the middle. If even one word is too wide, the final character trim is the
// only fallback; that case is a very long URL or a very narrow card.
function clipLines(ctx, lines, maxLines, maxWidth) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  const words = last.split(' ');
  while (words.length > 1 && ctx.measureText(`${words.join(' ')}…`).width > maxWidth) {
    words.pop();
  }
  last = words.join(' ');
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Two palettes, one layout. The print variant removes the cream ground and
// every mid-tone so a photocopy keeps black text and black rules instead of
// turning the maroon accent into grey mush.
const THEMES = {
  color: {
    paper: PAPER,
    card: CARD,
    ink: INK,
    muted: MUTED,
    border: BORDER,
    accent: ACCENT,
    ruleWidth: 1.5,
  },
  print: {
    paper: '#ffffff',
    card: '#ffffff',
    ink: '#000000',
    muted: '#000000',
    border: '#000000',
    accent: '#000000',
    ruleWidth: 2.5,
  },
};

export function drawFlyer(ctx, content, width = WIDTH, height = HEIGHT, variant = 'color') {
  const theme = THEMES[variant] || THEMES.color;

  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, width, 12);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Masthead.
  ctx.fillStyle = theme.accent;
  ctx.font = font(800, 32);
  ctx.fillText(content.brand, PAD, 82);

  ctx.fillStyle = theme.muted;
  ctx.font = font(500, 19);
  ctx.textAlign = 'right';
  ctx.fillText(`FY ${content.year}`, width - PAD, 80);
  ctx.textAlign = 'left';

  let y = 130;
  ctx.fillStyle = theme.muted;
  ctx.font = font(600, 21);
  ctx.fillText(content.kicker, PAD, y);
  y += 46;

  // The GP name. Two lines are enough for the longest pilot name; a third is
  // clipped with an ellipsis rather than pushed into the figures.
  ctx.fillStyle = theme.ink;
  ctx.font = font(800, 52);
  const titleMax = width - PAD * 2;
  const titleLines = clipLines(ctx, wrapText(ctx, content.title, titleMax), 2, titleMax);
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y);
    y += 60;
  }

  y += 4;
  ctx.fillStyle = theme.muted;
  ctx.font = font(500, 23);
  // One line keeps the figures and the QR in the same frame. The full place
  // is still in the page title and the QR link, so a clipped suffix costs
  // nothing a reader cannot recover.
  const subtitleLines = clipLines(ctx, wrapText(ctx, content.subtitle, titleMax), 1, titleMax);
  for (const line of subtitleLines) {
    ctx.fillText(line, PAD, y);
    y += 31;
  }

  // Three figures. The cards share a row on purpose: a reader should be able
  // to see receipts, payments and the closing balance without scrolling.
  const statsTop = Math.max(y + 26, 300);
  const gap = 16;
  const cardWidth = (width - PAD * 2 - gap * 2) / 3;
  const cardHeight = 168;
  content.stats.forEach((stat, index) => {
    const x = PAD + index * (cardWidth + gap);
    ctx.fillStyle = theme.card;
    roundedRect(ctx, x, statsTop, cardWidth, cardHeight, 16);
    ctx.fill();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = theme.ruleWidth;
    ctx.stroke();

    ctx.fillStyle = theme.muted;
    ctx.font = font(600, 20);
    let labelY = statsTop + 34;
    const labelMax = cardWidth - 32;
    const labelLines = clipLines(ctx, wrapText(ctx, stat.label, labelMax), 2, labelMax);
    for (const line of labelLines) {
      ctx.fillText(line, x + 16, labelY);
      labelY += 24;
    }

    ctx.fillStyle = theme.ink;
    ctx.font = font(800, 35);
    ctx.fillText(stat.value, x + 16, statsTop + cardHeight - 40);

    ctx.fillStyle = theme.muted;
    ctx.font = font(400, 17);
    ctx.fillText(stat.note, x + 16, statsTop + cardHeight - 16);
  });

  // Questions. The first three are the payment question, the idle XVFC
  // balance and the largest payment month: the three a Sabha can act on.
  let questionY = statsTop + cardHeight + 62;
  ctx.fillStyle = theme.ink;
  ctx.font = font(700, 28);
  ctx.fillText('ग्राम सभा में ये सवाल पूछें', PAD, questionY);
  questionY += 25;
  ctx.fillStyle = theme.muted;
  ctx.font = font(400, 19);
  ctx.fillText('पंचायत के अपने आंकड़ों से', PAD, questionY);
  questionY += 44;

  const questionMax = width - PAD * 2 - 58;
  content.questions.forEach((question, index) => {
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(PAD + 20, questionY - 8, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = font(700, 19);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), PAD + 20, questionY - 7);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = theme.ink;
    ctx.font = font(500, 26);
    const lines = clipLines(ctx, wrapText(ctx, question, questionMax), 4, questionMax);
    let lineY = questionY;
    for (const line of lines) {
      ctx.fillText(line, PAD + 58, lineY);
      lineY += 37;
    }
    questionY = lineY + 20;
  });

  // The footer holds the QR and the written route. The QR is the reliable
  // path for a printed handbill; the URL is the fallback for a reader without
  // a camera. It is stripped of its scheme so the card reads as a place, not
  // a protocol. The worst case (two title lines, one subtitle line and three
  // four-line questions) ends around 1091, well above this rule.
  const footerTop = height - 190;
  const qrSize = 156;
  const qrX = width - PAD - qrSize;
  const textWidth = qrX - PAD - 24;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = theme.ruleWidth;
  ctx.beginPath();
  ctx.moveTo(PAD, footerTop);
  ctx.lineTo(width - PAD, footerTop);
  ctx.stroke();

  ctx.fillStyle = theme.accent;
  ctx.font = font(700, 19);
  ctx.fillText('पूरा रिकॉर्ड और सभी सवाल:', PAD, footerTop + 38);

  const displayUrl = content.url.replace(/^https?:\/\//, '');
  ctx.fillStyle = theme.muted;
  ctx.font = font(400, 15, MONO);
  const urlLines = clipLines(ctx, wrapToken(ctx, displayUrl, textWidth), 2, textWidth);
  let urlY = footerTop + 62;
  for (const line of urlLines) {
    ctx.fillText(line, PAD, urlY);
    urlY += 21;
  }

  ctx.fillStyle = theme.muted;
  ctx.font = font(400, 14);
  ctx.fillText(content.source, PAD, height - 28);

  if (content.url) {
    drawQr(ctx, content.url, qrX, footerTop + 8, qrSize, theme);
    ctx.fillStyle = theme.muted;
    ctx.font = font(600, 14);
    ctx.textAlign = 'center';
    ctx.fillText('स्कैन करें', qrX + qrSize / 2, height - 14);
    ctx.textAlign = 'left';
  }
}

// The QR is generated from the same URL printed beside it. Error correction
// M tolerates a fold or a phone camera at an angle without making the modules
// too small for the 156 px tile.
function drawQr(ctx, url, x, y, size, theme) {
  const qr = qrcode(0, 'M');
  qr.addData(String(url));
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 8;
  const moduleSize = Math.max(1, Math.floor((size - quiet * 2) / count));
  const codeSize = moduleSize * count;
  const left = x + Math.round((size - codeSize) / 2);
  const top = y + Math.round((size - codeSize) / 2);

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, x, y, size, size, 12);
  ctx.fill();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = theme.ruleWidth;
  ctx.stroke();

  ctx.fillStyle = theme.ink;
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) {
        ctx.fillRect(
          left + column * moduleSize,
          top + row * moduleSize,
          moduleSize,
          moduleSize,
        );
      }
    }
  }
}

// Exposed for the contract test: the flyer must encode the exact share URL,
// not a shortened or canonicalised version of it.
export function qrMatrix(url) {
  const qr = qrcode(0, 'M');
  qr.addData(String(url));
  qr.make();
  const count = qr.getModuleCount();
  return {
    count,
    isDark: (row, column) => qr.isDark(row, column),
  };
}

export const buildFlyerPng = (doc, { url = '', width = WIDTH, height = HEIGHT, variant = 'color' } = {}) =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('The flyer needs a browser canvas.'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('The browser did not provide a canvas context.'));
      return;
    }
    drawFlyer(ctx, flyerContent(doc, { url }), width, height, variant);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The flyer image could not be encoded.'));
    }, 'image/png');
  });
