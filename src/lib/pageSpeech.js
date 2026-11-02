// The page reader speaks the prose a reader can see, not the navigation, form
// fields, data tables or the decorative field. It is deliberately a leaf-block
// reader: a paragraph inside a list item is read once, not twice. A card that
// happens to be a button still carries page prose, so buttons are not skipped
// wholesale; their headings and paragraphs are read like any other block.

const READABLE = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,dd,dt,summary';

const SKIP = [
  '[aria-hidden="true"]',
  '[hidden]',
  'nav',
  'footer',
  '.route-fallback',
  'input',
  'select',
  'textarea',
  'script',
  'style',
  'noscript',
  'svg',
  'table',
  'pre',
  'code',
  '.visually-hidden',
  '.schedule-ribbon',
  '.schedule-motto',
  '.pit-card',
  '.pit-fab',
].join(',');

const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();

export const collectPageText = (root) => {
  if (!root) return '';

  const seen = new Set();
  const blocks = [];

  for (const element of root.querySelectorAll(READABLE)) {
    if (element.closest(SKIP)) continue;
    // Prefer the leaf: a list item with a paragraph is read through the
    // paragraph, and a blockquote through the paragraph it contains.
    if (element.querySelector(READABLE)) continue;
    if (element.getClientRects().length === 0) continue;

    const text = clean(element.innerText || element.textContent);
    if (text.length < 2 || seen.has(text)) continue;

    seen.add(text);
    blocks.push(text);
  }

  return blocks.join('\n\n');
};

// Speech engines cap utterance length differently. Keep each request to a
// handful of sentences, and cut at a sentence or word boundary rather than at
// an arbitrary character.
export const chunkForSpeech = (text, maxChars = 900) => {
  const body = clean(text);
  if (!body) return [];

  const sentences = body.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [body];
  const chunks = [];
  let current = '';

  const flush = () => {
    if (!current) return;
    chunks.push(current);
    current = '';
  };

  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;

    while (sentence.length > maxChars) {
      let cut = sentence.lastIndexOf(' ', maxChars);
      if (cut < maxChars / 2) cut = maxChars;
      const head = sentence.slice(0, cut).trim();
      if (head) chunks.push(head);
      sentence = sentence.slice(cut).trim();
    }

    if (!sentence) continue;
    if (current && current.length + sentence.length + 1 > maxChars) flush();
    current = current ? `${current} ${sentence}` : sentence;
  }

  flush();
  return chunks;
};
