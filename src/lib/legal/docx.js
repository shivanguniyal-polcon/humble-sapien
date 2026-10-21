// A dependency-free .docx writer with real tracked changes.
//
// A firm does not want a plain-language PDF. It wants the clause back in
// Word with the rewrite marked up as a tracked change, so the reviewing
// lawyer accepts and rejects it in the review pane they already live in.
//
// That means a genuine WordprocessingML document with <w:ins> and <w:del>
// elements, not a redline that merely looks like one. The container is a ZIP
// file written by hand (stored, not deflated) and the XML is assembled here,
// so the whole export stays in the browser with no dependency and no server.
//
// What it does not do: it does not produce PDF, and it does not pretend to
// be a legal-document formatter. It produces a .docx that Word, LibreOffice
// and Google Docs open, with the changes tracked.

import { exportedRows, rejectedRows, reviewDecision } from './review.js';

const encoder = new TextEncoder();

// ---- CRC-32 (needed by the ZIP container) ---------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

// ---- the ZIP container (stored entries) -----------------------------------

const zip = (files) => {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.data instanceof Uint8Array ? file.data : encoder.encode(file.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(8, 0, true); // stored
    view.setUint16(10, 0, true); // time
    view.setUint16(12, 0x0021, true); // date: 1980-01-01
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    local.set(name, 30);

    chunks.push(local, data);
    central.push({ name, crc, size: data.length, offset });
    offset += local.length + data.length;
  }

  const centralSize = central.reduce(
    (acc, entry) => acc + 46 + entry.name.length,
    0,
  );

  const directory = new Uint8Array(centralSize);
  const view = new DataView(directory.buffer);
  let cursor = 0;
  for (const entry of central) {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true); // version made by
    view.setUint16(cursor + 6, 20, true); // version needed
    view.setUint16(cursor + 8, 0x0800, true);
    view.setUint16(cursor + 10, 0, true);
    view.setUint16(cursor + 12, 0, true);
    view.setUint16(cursor + 14, 0x0021, true);
    view.setUint32(cursor + 16, entry.crc, true);
    view.setUint32(cursor + 20, entry.size, true);
    view.setUint32(cursor + 24, entry.size, true);
    view.setUint16(cursor + 28, entry.name.length, true);
    view.setUint16(cursor + 30, 0, true);
    view.setUint16(cursor + 32, 0, true);
    view.setUint16(cursor + 34, 0, true);
    view.setUint16(cursor + 36, 0, true);
    view.setUint32(cursor + 38, 0, true);
    view.setUint32(cursor + 42, entry.offset, true);
    directory.set(entry.name, cursor + 46);
    cursor += 46 + entry.name.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  out.set(directory, at);
  at += centralSize;
  out.set(end, at);
  return out;
};

// ---- the word-level diff --------------------------------------------------

const tokenise = (text) => String(text || '').match(/\s+|[^\s]+/g) || [];

// A longest-common-subsequence diff over word tokens. Words and the spaces
// between them are both tokens, so the redline keeps the spacing intact.
export const diffWords = (before, after) => {
  const a = tokenise(before);
  const b = tokenise(after);
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  const push = (type, text) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('del', a[i]);
      i += 1;
    } else {
      push('ins', b[j]);
      j += 1;
    }
  }
  while (i < n) {
    push('del', a[i]);
    i += 1;
  }
  while (j < m) {
    push('ins', b[j]);
    j += 1;
  }
  return out;
};

// ---- WordprocessingML -----------------------------------------------------

const xmlEscape = (text) =>
  String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const run = (text, { bold = false, italic = false, size = null, color = null } = {}) => {
  const props = [];
  if (bold) props.push('<w:b/>');
  if (italic) props.push('<w:i/>');
  if (color) props.push(`<w:color w:val="${color}"/>`);
  if (size) props.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
};

const paragraph = (children, { style = null, spacingAfter = null } = {}) => {
  const props = [];
  if (style) props.push(`<w:pStyle w:val="${style}"/>`);
  if (spacingAfter != null) props.push(`<w:spacing w:after="${spacingAfter}"/>`);
  const pPr = props.length ? `<w:pPr>${props.join('')}</w:pPr>` : '';
  return `<w:p>${pPr}${children}</w:p>`;
};

const trackedRuns = (parts, author, date, idStart) => {
  let id = idStart;
  const out = [];
  for (const part of parts) {
    if (part.type === 'same') {
      out.push(run(part.text));
    } else if (part.type === 'del') {
      out.push(
        `<w:del w:id="${id}" w:author="${xmlEscape(author)}" w:date="${date}"><w:r><w:delText xml:space="preserve">${xmlEscape(part.text)}</w:delText></w:r></w:del>`,
      );
      id += 1;
    } else {
      out.push(
        `<w:ins w:id="${id}" w:author="${xmlEscape(author)}" w:date="${date}"><w:r><w:t xml:space="preserve">${xmlEscape(part.text)}</w:t></w:r></w:ins>`,
      );
      id += 1;
    }
  }
  return { xml: out.join(''), nextId: id };
};

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
<w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="240" w:after="160"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="7A1F2B"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
<w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="200" w:after="120"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
</w:styles>`;

const coreProps = (title, author, date) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(title)}</dc:title>
<dc:creator>${xmlEscape(author)}</dc:creator>
<cp:lastModifiedBy>${xmlEscape(author)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${date}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${date}</dcterms:modified>
</cp:coreProperties>`;

const APP_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>THS Legal Simplifier</Application>
</Properties>`;

// Build the document body: the source with the rewrite marked as a tracked
// change, one paragraph per reviewed sentence.
const buildDocument = (result, { author, date, review = null }) => {
  const body = [];
  body.push(paragraph(run(result.source.title || 'Reviewed plain-language rewrite', { bold: true, size: 32 }), { style: 'Heading1' }));

  const meta = [
    ['Citation', result.source.citation],
    ['Version', result.source.version],
    ['Source date', result.source.date],
    ['Source', result.source.url],
    ['Reviewer', result.source.reviewer],
    ['Jurisdiction', result.jurisdiction.label],
    ['Dictionary', `${result.jurisdictionId}@${result.dictionaryVersion}`],
  ].filter(([, value]) => value);
  for (const [key, value] of meta) {
    body.push(paragraph(`${key}: ${value}`, { style: 'Normal' }));
  }

  body.push(paragraph(run('How to read this document', { bold: true, size: 26 }), { style: 'Heading2' }));
  body.push(
    paragraph(
      'Each numbered paragraph is one sentence of the source. The struck-through words are the statutory phrasing; the underlined words are the plain-language replacement, marked as a tracked change so you can accept or reject it. The note under each paragraph gives the flag and the reason for it.',
    ),
  );

  let id = 1;
  const kept = exportedRows(result, review);
  const dropped = rejectedRows(result, review);
  for (const row of kept) {
    const label = row.clause ? `${row.clause} · ` : '';
    const confidence = row.confidence ? row.confidence.level : 'not scored';
    body.push(
      paragraph(
        run(`${label}[${row.id}] `, { bold: true, color: '7A1F2B' }) +
          run(`${row.typeLabel} — flag: ${row.flag} — confidence: ${confidence}`, { italic: true, size: 18 }),
        { style: 'Heading2' },
      ),
    );
    const tracked = trackedRuns(diffWords(row.sourceText, row.plain), author, date, id);
    id = tracked.nextId;
    body.push(paragraph(tracked.xml));
    const reason = row.reasons.map((r) => r.text).join(' ');
    body.push(paragraph(run(`Flag ${row.flag}: ${reason}`, { italic: true, size: 18, color: '6F6A63' })));
    if (row.confidence && row.confidence.verify) {
      body.push(
        paragraph(
          run(row.confidence.verifyNote, {
            italic: true,
            size: 18,
            color: '7A1F2B',
          }),
        ),
      );
    }
  }

  if (dropped.length > 0) {
    body.push(paragraph(run('Sentences rejected in review', { bold: true, size: 26 }), { style: 'Heading2' }));
    body.push(
      paragraph(
        'These sentences were rejected by the reviewer and are not part of the rewrite above. They are listed so the record shows what was removed and why.',
      ),
    );
    for (const row of dropped) {
      const { comment } = reviewDecision(review, row.id);
      const label = row.clause ? `${row.clause} · ` : '';
      body.push(
        paragraph(
          run(`${label}[${row.id}] `, { bold: true, color: '6F6A63' }) +
            run(`${row.typeLabel} — rejected: ${comment || 'no reason recorded'}`, { italic: true, size: 18, color: '6F6A63' }),
          { style: 'Heading2' },
        ),
      );
    }
  }

  body.push(paragraph(run('Limitations', { bold: true, size: 26 }), { style: 'Heading2' }));
  body.push(
    paragraph(
      'This document is a draft simplification produced by rule-based rewriting, not legal advice. It does not check that the source is current or in force, and it does not certify that the rewrite means the same thing in every case. Red-flagged sentences need a qualified lawyer before they leave the building.',
    ),
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
};

// Build the .docx. Returns a Uint8Array.
export const buildDocx = (result, { author = 'THS Legal Simplifier', date = null, review = null } = {}) => {
  const stamp = date || new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const title = result.source.title || 'Reviewed plain-language rewrite';
  const files = [
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: ROOT_RELS },
    { name: 'docProps/core.xml', data: coreProps(title, author, stamp) },
    { name: 'docProps/app.xml', data: APP_PROPS },
    { name: 'word/_rels/document.xml.rels', data: DOC_RELS },
    { name: 'word/styles.xml', data: STYLES },
    { name: 'word/document.xml', data: buildDocument(result, { author, date: stamp, review }) },
  ];
  return zip(files);
};

export const docxFileName = (result) => {
  const base = (result.source.title || 'rewrite')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'rewrite'}-redline.docx`;
};
