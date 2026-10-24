// Verification for reading a local instrument file: the format decision, the
// HTML-to-text pass, the PDF page accounting and the coded failures the
// interface turns into a message.
// Run: node scripts/test-ingest.mjs

import {
  MAX_FILE_BYTES,
  decodeEntities,
  extractText,
  fileKind,
  htmlToText,
  ingestMessage,
  unwrapLines,
} from '../src/lib/monitor/ingest.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

// A File-shaped object. The module only touches name, type, size and
// arrayBuffer, which is all a browser File guarantees for this path.
const fakeFile = (name, type, content) => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
};

// --- formats ---------------------------------------------------------------

ok('pdf by extension', fileKind('circular.pdf', '') === 'pdf');
ok('pdf by mime', fileKind('download', 'application/PDF') === 'pdf');
ok('htm is html', fileKind('notification.HTM', '') === 'html');
ok('html by mime', fileKind('notice', 'text/html; charset=utf-8') === 'html');
ok('txt is text', fileKind('circular.txt', '') === 'text');
ok('md is text', fileKind('draft.md', '') === 'text');
ok('docx is not read', fileKind('circular.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') === 'unsupported');
ok('unknown is not read', fileKind('', '') === 'unsupported');

// --- entities --------------------------------------------------------------

ok('named entity', decodeEntities('A &amp; B') === 'A & B');
ok('numeric entity', decodeEntities('&#8377;5 crore') === '₹5 crore');
ok('hex entity', decodeEntities('&#x20B9;') === '₹');
ok('unknown entity stays', decodeEntities('&notareal;') === '&notareal;');

// --- html ------------------------------------------------------------------

const page = `<!doctype html><html><head><title>RBI</title><style>.x{color:red}</style>
<script>window.track = 1;</script></head><body>
<nav><a href="/">Home</a> &rsaquo; Notifications</nav>
<h1>Master Direction &ndash; Know Your Customer</h1>
<p>These directions shall apply to every entity regulated by the Reserve Bank.</p>
<p>A regulated entity shall carry out&nbsp;customer due diligence.</p>
<table><tr><td>NO.</td><td>DOR.AML.REC.1</td></tr></table>
<footer>&copy; Reserve Bank of India</footer></body></html>`;

const text = htmlToText(page);
ok('html keeps the direction', text.includes('These directions shall apply to every entity regulated by the Reserve Bank.'));
ok('html keeps the duty', text.includes('A regulated entity shall carry out customer due diligence.'));
ok('html drops script bodies', !text.includes('window.track'));
ok('html drops style bodies', !text.includes('color:red'));
ok('html drops head title', !text.includes('<title>') && !text.includes('RBI</title>'));
ok('html drops tags', !/[<>]/.test(text));
ok('html decodes entities', text.includes('–') && text.includes('©') && text.includes('›'));
ok('html keeps table cells apart', text.includes('NO. DOR.AML.REC.1'));
ok('html puts navigation on its own line', text.split('\n').some((line) => line === 'Home › Notifications'));
ok('html puts the heading on its own line', text.split('\n').some((line) => line.startsWith('Master Direction –')));
ok('html has no blank runs', !/\n{3}/.test(text));
ok('html is trimmed', text === text.trim());

ok('empty html is empty', htmlToText('') === '');
ok('script only is empty', htmlToText('<script>alert(1)</script>') === '');

// --- pdf line breaks -------------------------------------------------------

ok(
  'a sentence wrapped over two lines is joined',
  unwrapLines('These directions shall apply to every non-banking financial company\nregistered with the Bank.') ===
    'These directions shall apply to every non-banking financial company registered with the Bank.',
);
ok(
  'a heading is not swallowed by the paragraph after it',
  unwrapLines('Reserve Bank of India\nMaster Direction - Know Your Customer\nThese directions shall apply to every entity.') ===
    'Reserve Bank of India\nMaster Direction - Know Your Customer\nThese directions shall apply to every entity.',
);
ok(
  'a finished sentence is not joined to the next',
  unwrapLines('The entity shall report the transaction.\nthe report is due monthly.') ===
    'The entity shall report the transaction.\nthe report is due monthly.',
);
ok(
  'a numbered clause starts its own line',
  unwrapLines('the following records must be kept\n(a) the ledger;\n(b) the receipts.') ===
    'the following records must be kept\n(a) the ledger;\n(b) the receipts.',
);
ok('blank runs collapse', unwrapLines('a\n\n\n\nb') === 'a\n\nb');
ok('empty stays empty', unwrapLines('') === '');

// --- extraction ------------------------------------------------------------

const txt = await extractText(fakeFile('notice.txt', 'text/plain', 'A regulated entity shall report the transaction within seven days of the close of the month.'));
ok('text file read', txt.kind === 'text' && txt.text.startsWith('A regulated entity shall report'));

const html = await extractText(fakeFile('notice.html', 'text/html', page));
ok('html file read', html.kind === 'html' && html.text.length > 100);
ok('html note names the drop', /navigation and scripts dropped/.test(html.note));

const long = 'Page one text that is long enough to count as a real text layer.';
const pdf = await extractText(fakeFile('circular.pdf', 'application/pdf', new Uint8Array([37, 80, 68, 70])), {
  reader: async () => ({ text: `${long}\n\n${long}`, pages: 2, empty: [] }),
});
ok('pdf read through the reader', pdf.kind === 'pdf' && pdf.text.includes(long));
ok('pdf note counts pages', pdf.note === '2 pages read.');

const partial = await extractText(fakeFile('scan.pdf', 'application/pdf', new Uint8Array([37, 80, 68, 70])), {
  reader: async () => ({ text: long, pages: 3, empty: [2] }),
});
ok('partial scan still reads', partial.text === long);
ok('partial scan note names the page', /pages 2 have no text layer/.test(partial.note));

// --- failures --------------------------------------------------------------

const codeOf = async (promise) => {
  try {
    await promise;
    return 'no-error';
  } catch (error) {
    return error.code || 'unknown';
  }
};

const scan = await extractText(fakeFile('scan.pdf', 'application/pdf', new Uint8Array([37, 80, 68, 70])), {
  reader: async () => ({
    text: '',
    pages: 2,
    empty: [1, 2],
    images: [{ page: 1, dataUrl: 'data:image/jpeg;base64,AA', sha256: 'a'.repeat(64) }],
  }),
});
ok('a scan returns no text', scan.text === '');
ok('a scan offers its pages to OCR', scan.scanPages.length === 1 && scan.scanPages[0].page === 1);
ok('the scan note names the pages and OCR', /no text layer/.test(scan.note) && /OCR/.test(scan.note));

ok('empty text throws no-text', (await codeOf(extractText(fakeFile('empty.txt', 'text/plain', '   ')))) === 'no-text');

ok('docx is refused', (await codeOf(extractText(fakeFile('a.docx', '', 'x')))) === 'unsupported');

const huge = { name: 'huge.pdf', type: 'application/pdf', size: MAX_FILE_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) };
ok('oversize is refused', (await codeOf(extractText(huge))) === 'too-big');

ok('message for a scan', /scan/.test(ingestMessage(Object.assign(new Error(), { code: 'no-text', pages: 2 }))));
ok('message for a format', /PDF, HTML or plain text/.test(ingestMessage(Object.assign(new Error(), { code: 'unsupported' }))));
ok('message for oversize', /15 MB/.test(ingestMessage(Object.assign(new Error(), { code: 'too-big' }))));
ok('message for unknown failure', /could not be read/.test(ingestMessage(new Error('boom'))));

console.log(failures === 0 ? '\nAll ingest checks passed.' : `\n${failures} ingest checks failed.`);
process.exit(failures === 0 ? 0 : 1);
