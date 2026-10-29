// The amendment ledger of a consolidated statute.
//
// Indian statutes print their own history. A consolidated text carries
// footnotes like:
//
//   1. Subs. by Act 24 of 2019, s. 2, for "for a term of five years …"
//      (w.e.f. 24-10-2019).
//   2. Ins. by s. 4, ibid. (w.e.f. 24-10-2019).
//
// Each footnote is one patch: an amending instrument, the section of that
// instrument, the operation it performed, the words it replaced where the
// footnote quotes them, and the date it took effect. Read together they are
// the statute's commit log, printed by the publisher rather than reconstructed
// here.
//
// Two rules shape the parser:
//
//   1. Nothing is silently dropped. Every line that starts a footnote becomes
//      a row. A field that cannot be read stays null and the row is marked
//      partial, so the page can say how much of the history it read rather
//      than implying the ledger is complete.
//   2. The raw footnote is kept. A row is an assertion about a printed line,
//      and a reader has to be able to check it against the text the archive
//      holds.
//
// This is a parser of *printed* history, not an interpreter of amendments. It
// does not apply a patch to a text, so it cannot yet show the statute as it
// stood before 2019. That is the next step, and it needs the amending Act,
// which `parseAmendingAct` reads for the section each patch touched.

export const LEDGER_VERSION = 'ths-amendment-ledger-1.0.0';

const OPERATIONS = {
  'subs.': 'substituted',
  'ins.': 'inserted',
  omitted: 'omitted',
  added: 'added',
  repealed: 'repealed',
};

const START = /^(\d+)\.\s+(Subs|Ins|Omitted|Added|Repealed)\.?\s+(?:by\s+)?(.*)$/i;

const isoDate = (value) => {
  // A PDF line break can land inside the date: "24-10-\n2019".
  const match = String(value).match(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// The footnote text often continues onto the next line: a quoted old phrase,
// an open bracket or a hyphen at the end all mean the sentence is unfinished.
const isUnfinished = (text) => {
  const quotes = (text.match(/[“"]/g) || []).length;
  const closes = (text.match(/[”"]/g) || []).length;
  const open = (text.match(/\(/g) || []).length - (text.match(/\)/g) || []).length;
  return closes < quotes || open > 0 || /[-–—]$/.test(text.trim()) || !/[.)]$/.test(text.trim());
};

function instrumentOf(raw) {
  // G.S.R. and S.O. are the two gazette series a ministry uses to amend
  // subordinate text, with or without the word "notification" in front.
  const notification = raw.match(/(?:notification\s+)?(No\.\s*)?((?:G\.\s?S\.\s?R\.|S\.\s?O\.)\s*[\d/A-Za-z()]+(?:\s*,?\s*dated\s*[\d-]+)?)/i);
  if (notification) {
    const label = notification[2].replace(/\s+/g, ' ').replace(/[.,]$/, '').trim();
    return { label: `Notification ${label}`, kind: 'notification' };
  }
  const adaptation = raw.match(/the\s+(A\.\s?O\.\s?(\d{4}))/i);
  if (adaptation) return { label: `A.O. ${adaptation[2]}`, kind: 'order' };
  // The Act number and year, wherever the phrase sits: "Act 24 of 2019",
  // "Act No. 24 of 2019" and "Act 24 of 2019, s. 2" are the same instrument.
  const act = raw.match(/\bAct\s+(?:No\.\s*)?(\d+)\s+of\s+(\d{4})\b/i);
  if (act) return { label: `Act ${act[1]} of ${act[2]}`, act: Number(act[1]), year: Number(act[2]), kind: 'act' };
  if (/ibid/i.test(raw)) return { label: null, kind: 'ibid' };
  return { label: null, kind: 'unknown' };
}

function readRow(raw, operation, number) {
  const instrument = instrumentOf(raw);
  const sectionOfAmendment = raw.match(/\bs\.\s*([\dA-Za-z()]+)/);
  // "for sub-section (5)" names the target; "for “the words”" quotes the old
  // text. The two are different kinds of evidence and are kept apart.
  const quoted = raw.match(/for,?\s+[“"]([^”"]+)[”"]/);
  const reference0 = quoted
    ? null
    : raw.match(
        /for,?\s+((?:sub-section|clause|section|sub-clause|the long title|the title|the preamble)\s*[^,()]*(?:\([^)]*\))?)/i,
      );
  const date = raw.match(/w\.e\.f\.\s*([^)]+)/i);
  const reference = reference0 ? reference0[1].replace(/\s*\(w\.e\.f\.[^)]*\)/i, '').replace(/[\s,]+$/, '').replace(/\s+/g, ' ').trim() : null;
  return {
    number,
    operation,
    instrument: instrument.label,
    instrumentKind: instrument.kind,
    act: instrument.act ?? null,
    year: instrument.year ?? null,
    amendingSection: sectionOfAmendment ? sectionOfAmendment[1] : null,
    oldText: quoted ? quoted[1].replace(/\s+/g, ' ').trim() : null,
    oldReference: reference,
    effective: date ? isoDate(date[1]) : null,
    raw: raw.replace(/\s+/g, ' ').trim(),
  };
}

// A footnote's printed position is not evidence of the section it amends. The
// wage statutes print their footnotes in blocks at the foot of each page with
// the reference marks stripped by extraction, so the nearest heading above a
// footnote is the last section on the page, not the section the note belongs
// to: in the Payment of Wages print, note 7 ("Subs. by Act 1 of 2017 … for
// section 6") sits under section 5 but belongs to a Kerala amendment of
// section 6. Targets are therefore read from the amending Act's own text, and
// from nothing else. See README, "The amendment ledger".
export function parseAmendmentLedger(text = '') {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim());
  const rows = [];
  let footnotes = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(START);
    if (!match) continue;
    footnotes += 1;
    let raw = lines[i];
    const line = i;
    // Join continuation lines, but never swallow the next footnote: a row is
    // one printed footnote, not a paragraph.
    while (isUnfinished(raw) && i + 1 < lines.length && !START.test(lines[i + 1])) {
      i += 1;
      raw += ` ${lines[i]}`;
    }
    const row = readRow(raw, OPERATIONS[`${match[2].toLowerCase()}.`] || OPERATIONS[match[2].toLowerCase()], Number(match[1]));
    row.line = line;
    rows.push(row);
  }

  // "ibid." and a bare "by s. 2" refer to the instrument named in the row
  // above. Resolve after reading, so the row keeps its own printed text.
  let lastAct = null;
  for (const row of rows) {
    if (row.instrumentKind === 'ibid' || (!row.instrument && row.amendingSection)) {
      if (lastAct) {
        row.instrument = lastAct.instrument;
        row.instrumentKind = lastAct.instrumentKind;
        row.act = lastAct.act;
        row.year = lastAct.year;
        row.resolved = 'ibid';
      }
    } else if (row.instrument) {
      lastAct = row;
    }
    row.parsed = Boolean(row.operation && row.instrument);
  }

  return {
    version: LEDGER_VERSION,
    footnotes,
    rows,
    parsed: rows.filter((row) => row.parsed).length,
    partial: rows.length - rows.filter((row) => row.parsed).length,
  };
}

// An amending Act says which section of the principal Act it changes: "2. In
// the Right to Information Act, 2005 …, in section 13,—". Reading that gives
// every ledger row a target, which the footnote alone does not carry.
export function parseAmendingAct(text = '') {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim());
  const patches = [];
  for (let i = 0; i < lines.length; i += 1) {
    const start = lines[i].match(/^(\d+)\.\s+(.*)$/);
    if (!start) continue;
    let body = start[2];
    const heading = lines[i + 1] || '';
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j += 1) {
      if (/^only be|^\d+\.\s/.test(lines[j])) break;
      body += ` ${lines[j]}`;
    }
    // Two printed forms: "In the Right to Information Act, 2005 …, in section
    // 13" for the first patch, and "In section 16 of the principal Act" for
    // every one after it.
    const long = body.match(/In the (.+?),.*?in section (\d+)/i);
    const short = body.match(/In section (\d+) of the principal Act/i);
    if (!long && !short) continue;
    patches.push({
      section: start[1],
      principal: long ? long[1].replace(/\s+/g, ' ').trim() : null,
      target: Number(long ? long[2] : short[1]),
      heading: /^Amendment of/.test(heading) ? heading : null,
      body: body.replace(/\s+/g, ' ').trim(),
    });
  }
  // The principal Act is named in the first patch only; carry it down so
  // every row can say what it amends.
  const named = patches.find((patch) => patch.principal);
  if (named) for (const patch of patches) patch.principal ||= named.principal;
  return patches;
}

// A ledger row names the amending Act and its section; the patch table names
// the target. Joining the two answers "which section of this statute changed",
// which neither document answers alone.
export function ledgerHistory(ledger, patches = []) {
  if (!ledger || !ledger.rows?.length) return [];
  const bySection = new Map(patches.map((patch) => [String(patch.section), patch]));
  return ledger.rows.map((row) => {
    const patch = row.amendingSection ? bySection.get(String(row.amendingSection)) : null;
    return {
      ...row,
      target: patch ? patch.target : null,
      targetHeading: patch ? patch.heading : null,
      targetSource: patch ? 'amending-act' : null,
    };
  });
}

// Newest first, then by the section of the amending Act. An undated row keeps
// its printed order rather than being pushed to the end, because the footnote
// order is the only order it has.
export function sortLedger(rows = []) {
  return [...rows].sort((a, b) => {
    if (a.effective && b.effective) return b.effective.localeCompare(a.effective);
    if (a.effective) return -1;
    if (b.effective) return 1;
    return a.number - b.number;
  });
}
