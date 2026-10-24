import {
  FILE_ACCEPT, MAX_FILE_BYTES, decodeEntities, fileKind, htmlToText, unwrapLines,
} from './text.js';

export { FILE_ACCEPT, MAX_FILE_BYTES, decodeEntities, fileKind, htmlToText, unwrapLines };

// Reading a file as an instrument.
//
// The monitor only needs one thing from a file: the instrument's own text.
// PDF and HTML are the two formats a regulator actually publishes, and both
// carry more than their text — page furniture, styles, scripts, navigation.
// This module takes the local file, extracts the text in the browser, and
// leaves it in the paste box, where the reviewer can see it before it is read.
// Nothing is uploaded: extraction happens from the File object in memory.

const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

// A page with no text layer is still a page. This renders it to a JPEG so
// the reader can send exactly that page to OCR, with a hash over the encoded
// image kept beside whatever text comes back.
const renderPage = async (page, number) => {
  if (typeof document === 'undefined') return null;
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, Math.max(1.2, 1200 / Math.max(base.width, 1)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) return null;
  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
  return {
    page: number,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    sha256: await sha256Hex(dataUrl),
  };
};

// PDF text, page by page, with the page number kept so a short or empty page
// can be named rather than silently dropped. A scan has no text layer: this
// reports which pages those are, with an image of each, instead of pretending
// the file was read.
//
// The library is pinned to 4.x: 6.x calls the new Uint8Array hex methods
// unconditionally, and the browsers this page will meet in the field do not
// all have them. 4.x falls back correctly when they are absent.
export const readPdf = async (bytes) => {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  }
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
  const doc = await task.promise;
  const total = doc.numPages;
  const pages = [];
  const empty = [];
  const images = [];
  let skipped = 0;
  try {
    for (let n = 1; n <= total; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const parts = [];
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        parts.push(item.str);
        if (item.hasEOL) parts.push('\n');
      }
      const text = unwrapLines(parts
        .join(' ')
        .replace(/[ \t]+/g, ' ')
        // A word broken across a line is one word again.
        .replace(/-\s*\n\s*(?=[a-z])/g, '')
        .replace(/ ?\n ?/g, '\n'));
      if (text.length < 40) {
        empty.push(n);
        if (images.length < 12) {
          const image = await renderPage(page, n);
          if (image) images.push(image);
        } else {
          skipped += 1;
        }
      }
      pages.push(text);
    }
  } finally {
    await doc.destroy();
  }
  return { text: pages.join('\n\n').trim(), pages: total, empty, images, skipped };
};

// The one entry point the interface calls. Returns the text, its kind, and a
// note worth showing the reviewer: how many pages were read, and whether any
// page looked like a scan. Throws a coded error when there is nothing to read.
export const extractText = async (file, { reader = readPdf } = {}) => {
  const size = Number(file?.size || 0);
  if (size > MAX_FILE_BYTES) {
    const error = new Error('too-big');
    error.code = 'too-big';
    throw error;
  }
  const kind = fileKind(file?.name, file?.type);
  if (kind === 'unsupported') {
    const error = new Error('unsupported');
    error.code = 'unsupported';
    throw error;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (kind === 'pdf') {
    const read = await reader(bytes);
    const images = read.images || [];
    const note = read.text.length < 40
      ? `${read.pages} page${read.pages === 1 ? '' : 's'} with no text layer.${images.length ? ` ${images.length} can be read with OCR.` : ''}`
      : read.empty.length
        ? `${read.pages} pages read; pages ${read.empty.join(', ')} have no text layer.`
        : `${read.pages} page${read.pages === 1 ? '' : 's'} read.`;
    return {
      text: read.text,
      kind,
      note,
      scanPages: images,
      emptyPages: read.empty,
      totalPages: read.pages,
      imagesSkipped: read.skipped || 0,
    };
  }
  const text = new TextDecoder('utf-8').decode(bytes);
  const body = kind === 'html' ? htmlToText(text) : text.replace(/\r\n?/g, '\n').trim();
  if (body.length < 40) {
    const error = new Error('no-text');
    error.code = 'no-text';
    throw error;
  }
  return { text: body, kind, note: kind === 'html' ? 'Page text read; navigation and scripts dropped.' : '' };
};

// The message the interface shows for a failed read.
export const ingestMessage = (error) => {
  if (error?.code === 'too-big') return 'That file is over 15 MB. Open the circular itself and try again.';
  if (error?.code === 'unsupported') return 'That format is not read here. Use PDF, HTML or plain text.';
  if (error?.code === 'no-text') {
    return error.pages
      ? 'That PDF has no text layer — it is a scan. Run it through OCR, or paste the text.'
      : 'That file has no readable text. If it is a scan, paste the text instead.';
  }
  return 'That file could not be read. Try the PDF, or paste the text.';
};
