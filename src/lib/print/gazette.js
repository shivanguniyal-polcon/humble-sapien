// The gazette.
//
// Every printable artefact on the site is set as one gazette: an imprint
// line, a rule, the title and the facts that identify the document, then the
// argument in two columns with the tables full width. A reader who prints the
// battery report on Monday and the client brief on Tuesday should get paper
// from the same press, not two documents that happen to share a colour.
//
// The rules live here, as a string, because the three documents are built as
// standalone HTML files that never load the site's stylesheet. The sheet and
// the passbook are printed from the app instead, so their copy of the same
// treatment is in index.css, under "printing". Keep the two in step by hand:
// they are deliberately small.
//
// Two layout rules matter:
//   · `.gz-columns` is the only place prose runs in two columns. It holds
//     sections and lists, never a table or a pre, so no column is ever asked
//     to squeeze something that cannot reflow.
//   · everything else is full width. A table is a display item in a gazette,
//     not an illustration inside a column.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"]/g, (c) => ESCAPES[c]);

// The masthead. `meta` is a list of [label, value] pairs and is escaped here,
// so callers pass raw strings rather than pre-escaped HTML.
export const gazetteHead = ({ imprint, edition = '', title, standfirst = '', meta = [] }) => {
  const rows = meta.filter((pair) => pair && pair[1] != null && String(pair[1]).trim() !== '');
  return `  <header class="gz-head">
    <p class="gz-imprint"><span>${esc(imprint)}</span>${edition ? `<span>${esc(edition)}</span>` : ''}</p>
    <h1 class="gz-title">${esc(title)}</h1>
    ${standfirst ? `<p class="gz-standfirst">${esc(standfirst)}</p>` : ''}
    ${
      rows.length
        ? `<dl class="gz-meta">
${rows.map(([label, value]) => `      <div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('\n')}
    </dl>`
        : ''
    }
  </header>`;
};

// The colophon. Every document ends with the same rule and the same two
// lines: who set it, and what it is.
export const gazetteFoot = ({ left = 'The Humble Sapien', right = '' }) => `  <footer class="gz-foot"><span>${esc(left)}</span>${right ? `<span>${esc(right)}</span>` : ''}</footer>`;

export const GAZETTE_CSS = `
  @page { size: A4; margin: 16mm 15mm 18mm; }
  .gz { max-width: 58rem; margin: 0 auto; }
  .gz-head { border-top: 3px solid #1b1815; padding-top: 0.4rem; }
  .gz-imprint { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.2rem 1rem; margin: 0; font-family: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, 'Courier New', monospace; font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: #7a1f2b; }
  .gz-imprint span + span { color: #6f6a63; letter-spacing: 0.09em; }
  .gz-title { margin: 0.55rem 0 0.3rem; font-family: 'Newsreader', 'Iowan Old Style', Georgia, 'Times New Roman', serif; font-size: 2.15rem; font-weight: 700; line-height: 1.02; letter-spacing: -0.018em; text-wrap: balance; }
  .gz-standfirst { margin: 0 0 0.7rem; max-width: 58ch; font-family: 'Newsreader', Georgia, 'Times New Roman', serif; font-size: 1.02rem; font-style: italic; line-height: 1.45; color: #4b4640; }
  .gz-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.15rem 0.9rem; margin: 0; padding: 0.4rem 0; border-top: 1px solid #c7c2bb; border-bottom: 3px double #1b1815; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 0.72rem; }
  .gz-meta div { display: flex; gap: 0.35rem; min-width: 0; }
  .gz-meta dt { color: #6f6a63; white-space: nowrap; }
  .gz-meta dd { margin: 0; overflow-wrap: anywhere; }
  .gz-body { margin-top: 1.1rem; }
  .gz h2 { margin: 1.35rem 0 0.4rem; padding-top: 0.3rem; border-top: 1px solid #c7c2bb; font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace; font-size: 0.66rem; font-weight: 600; letter-spacing: 0.13em; text-transform: uppercase; color: #322e29; break-after: avoid; }
  .gz h3 { margin: 1rem 0 0.3rem; font-family: 'Newsreader', Georgia, 'Times New Roman', serif; font-size: 1.02rem; line-height: 1.3; break-after: avoid; }
  .gz p { margin: 0.4rem 0; }
  .gz li { margin-bottom: 0.2rem; }
  .gz p, .gz li { orphans: 3; widows: 3; }
  .gz ul, .gz ol { margin: 0.35rem 0 0.5rem; padding-left: 1.1rem; }
  .gz table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 0.82rem; }
  .gz th, .gz td { text-align: left; padding: 0.4rem 0.6rem 0.4rem 0; border-bottom: 1px solid #eceae6; vertical-align: top; }
  .gz thead th { font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace; font-size: 0.64rem; letter-spacing: 0.08em; text-transform: uppercase; color: #4b4640; border-bottom: 1.5px solid #c7c2bb; }
  .gz .fine-print { font-size: 0.85rem; color: #4b4640; }
  .gz .stamp { font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace; font-size: 0.7rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; background: #f6f5f3; border: 1px solid #eceae6; padding: 0.7rem 0.8rem; }
  .gz-foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.2rem 1rem; margin-top: 1.25rem; padding-top: 0.4rem; border-top: 3px double #1b1815; font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace; font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase; color: #6f6a63; }
  @media screen and (min-width: 56rem) {
    .gz-columns { columns: 2; column-gap: 2.6rem; column-rule: 1px solid #e0ddd8; }
    .gz-columns > :first-child { margin-top: 0; }
  }
  @media print {
    .gz-columns { columns: 2; column-gap: 8mm; column-rule: 1px solid #e0ddd8; }
    .gz-columns > :first-child { margin-top: 0; }
    /* A heading owns the text under it, in a column as on a page. */
    .gz-columns h2, .gz-columns h3 { break-after: avoid-column; }
    .gz p { text-align: justify; hyphens: auto; }
    .gz table { break-inside: auto; }
    .gz tr, .gz .stamp, .gz-foot { break-inside: avoid; }
  }
`;
