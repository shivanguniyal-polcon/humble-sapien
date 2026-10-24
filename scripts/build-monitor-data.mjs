// Build the regulatory monitor's instrument library from the pinned corpus.
//
// The monitor has to open on real instruments, not a demo paste box, so the
// 50 RBI circulars the precision test pinned by text hash are the library.
// This script is the only place the library is written: it derives the title
// the listing page never scraped, groups instruments into the family a
// circular belongs to (so "the previous circular" is a fact, not a guess),
// extracts the duty sentences with the same classifier the citizen panel
// uses, and records a hash per instrument. Re-running it on the same corpus
// produces byte-identical output apart from `generatedAt`.
//
// Output:
//   src/data/monitor/index.json                 — 50 metadata rows, families
//   src/data/monitor/instruments/<id>.json      — text + duty rows, one chunk
//
// The per-instrument split is deliberate: the library page must not ship
// 1.1 MB of circular text to render a list of fifty titles.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { analyse } from '../src/lib/legal/pipeline.js';
import { isDutyTrigger, bearerTag, classifyObligation } from '../src/lib/legal/obligations.js';
import { cleanAddressee } from '../src/lib/legal/applicability.js';
import { DICTIONARY_VERSION } from '../src/lib/legal/glossary.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const corpusPath = join(root, 'private/verification/2026-10-22-rbi-precision-test/corpus.jsonl');
const outDir = join(root, 'src/data/monitor');
const instDir = join(outDir, 'instruments');

const sha256 = (text) => `sha256:${createHash('sha256').update(String(text), 'utf8').digest('hex')}`;

// Seventeen documents were fetched with the listing page's furniture at the
// head: an HTML attribute line, "Index To RBI Circulars", a file size. It is
// not the instrument, so the library stores the instrument.
const FURNITURE = /^(?:id="pnlDetails".*|Index To RBI Circulars|\d+\s*kb)$/i;
const stripFurniture = (raw) => {
  const lines = String(raw || '').split('\n');
  let at = 0;
  while (at < lines.length && (lines[at].trim() === '' || FURNITURE.test(lines[at].trim()))) at += 1;
  return lines.slice(at).join('\n').trim();
};

const MONTHS =
  'January|February|March|April|May|June|July|August|September|October|November|December';
const DATE_LINE = new RegExp(`^(?:${MONTHS})\\s+\\d{1,2},\\s+\\d{4}$`, 'i');

// The corpus's `subject` is empty for 37 of 50 instruments because the listing
// page's title cell was never scraped. The title is in the text, between the
// reference block and the body: the first substantial line that is not a
// reference number, a date, a salutation or an addressee block.
const cleanTitle = (raw) =>
  String(raw || '')
    .replace(/\s*\(Updated as on [^)]+\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const titleFrom = (doc) => {
  const subject = String(doc.subject || '').replace(/\s+/g, ' ').trim();
  if (subject.length > 12) return cleanTitle(subject);
  const lines = String(doc.text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // Master directions are fetched with the page furniture at the head
  // ("id=pnlDetails…", "Index To RBI Circulars", "2297 kb"). The title sits
  // immediately after it and names the instrument: "Reserve Bank of India
  // (Commercial Banks – Statutory Audit) Directions, 2026".
  const named = lines.find((line) => /^Reserve Bank of India \(/.test(line) && line.length > 40);
  if (named) return cleanTitle(named);

  for (const line of lines.slice(0, 20)) {
    if (/^(?:id=|index to rbi|previous versions|table of contents|chapter\b)/i.test(line)) continue;
    if (/^\d+\s*kb$/i.test(line)) continue;
    if (/^RBI\//i.test(line)) continue;
    if (/^[A-Z]{2,}\.[A-Z]/.test(line)) continue; // the file-number line
    if (DATE_LINE.test(line)) continue;
    if (/^(madam|dear|sir|to$)/i.test(line)) continue;
    if (/^(the reserve bank has|the reserve bank has issued)$/i.test(line)) continue;
    if (/^(all |the chairpersons?|the chief executive|the chairman|the managing director)/i.test(line)) continue;
    if (line.split(/\s+/).length < 4) continue;
    if (!/^[A-Z(‘"]/.test(line)) continue;
    return cleanTitle(line);
  }
  return `RBI circular ${doc.refNo}`;
};

// A family is the instrument series a circular reissues. The title's first
// four content words are the stable part: all nine UAPA sanction updates
// share "implementation section uapa", whatever list they amend.
const STOP = new Set(
  'a an and are as at be by for from has have in into is it its of on or that the their them then there these this those to under was were will with within without'.split(
    ' ',
  ),
);
const stem = (word) =>
  word
    .replace(/(?:ies|es|s)$/i, '')
    .replace(/(?:ing|ed)$/i, '')
    .replace(/[^a-z0-9]/gi, '');

// Every master direction's title begins "Reserve Bank of India (…)", so the
// first words of the title are the boilerplate, not the series. The family is
// the entity class plus the subject inside the parentheses: "Commercial Banks
// – Statutory Audit" and "Small Finance Banks – Statutory Audit" are two
// series, and diffing one against the other would be a false diff.
const ENTITY = [
  [/^non[-\s]?banking/i, 'nbfc'],
  [/^urban/i, 'ucb'],
  [/^rural/i, 'rural-coop'],
  [/^commercial/i, 'commercial'],
  [/^small/i, 'small'],
  [/^housing/i, 'housing'],
  [/^local/i, 'lab'],
  [/^regional/i, 'rrb'],
  [/^all[-\s]?india/i, 'aifi'],
  [/^payment/i, 'payments'],
  [/^scheduled/i, 'commercial'],
];

const wordsOf = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !STOP.has(w) &&
        !/^(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|amendments?|directions?|20\d\d)$/.test(w),
    )
    .map(stem)
    .filter(Boolean);

const familyKey = (title) => {
  const clean = String(title).replace(/\s+/g, ' ').trim();
  if (/section 51a of uapa/i.test(clean)) return 'uapa-51a-sanctions';
  if (/^Designation of\b/i.test(clean)) return 'uapa-designation';
  const master = clean.match(/^Reserve Bank of India\s*\(([^)]+)\)\s*(.*)$/i);
  if (master) {
    // Split on a spaced en/em dash only: "Non-Banking" is one word, and
    // splitting every hyphen made 21 NBFC instruments a single family.
    const parts = master[1].split(/\s+[–—]\s+|\s+-\s+/);
    const entityRaw = parts[0] || '';
    const entity = ENTITY.find(([re]) => re.test(entityRaw))?.[1] || wordsOf(entityRaw)[0] || 'entity';
    const subject = parts.length > 1 ? parts.slice(1).join(' ') : master[2] || entityRaw;
    const key = wordsOf(subject).slice(0, 3).join('-');
    return `${entity}-${key || 'directions'}`;
  }
  return wordsOf(clean).slice(0, 4).join('-') || 'misc';
};

// Seventeen instruments have an empty `refNo` in the corpus: the listing
// page's reference cell was not scraped. The number is in the text, so it is
// read from there rather than left blank on the instrument page.
const refFrom = (doc) => {
  const scraped = String(doc.refNo || '').trim();
  if (/^RBI\//i.test(scraped)) return scraped;
  const hit = String(doc.text || '').match(/\bRBI\/[^\s]*\d[^\s]*/i);
  return hit ? hit[0].replace(/[.,;:]+$/, '') : (scraped || `RBI circular ${doc.id}`);
};

const dateISO = (date) => {
  const parsed = new Date(`${String(date || '').replace(/\s+/g, ' ').trim()} UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

// ---- read the corpus -------------------------------------------------------

const docs = readFileSync(corpusPath, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));
const corpusHash = sha256(readFileSync(corpusPath, 'utf8'));

rmSync(instDir, { recursive: true, force: true });
mkdirSync(instDir, { recursive: true });

const instruments = docs.map((doc) => {
  const text = stripFurniture(doc.text);
  const title = titleFrom(doc);
  const ihash = sha256(text);

  // One row per source sentence, as the monitor's unit of work. The same
  // trigger the citizen panel uses decides what is a duty; a heading, a
  // reference line and a salutation bind nobody and are not rows.
  const { rows } = analyse(text, { mode: 'citizen', jurisdictionId: 'in-bare-act' });
  const bySource = new Map();
  for (const row of rows) {
    if (!bySource.has(row.sourceId)) bySource.set(row.sourceId, row);
  }
  const ordered = [...bySource.values()].sort((a, b) => a.sourceId - b.sourceId);
  const sentences = {};
  const duties = [];
  for (const row of ordered) {
    const quote = String(row.sourceText || '').replace(/\s+/g, ' ').trim();
    if (quote.split(/\s+/).filter(Boolean).length < 6) continue;
    if (!isDutyTrigger(quote)) continue;
    const prev = String(bySource.get(row.sourceId - 1)?.sourceText || '').replace(/\s+/g, ' ').trim();
    const cls = classifyObligation(quote, { prev });
    // "These Directions shall be called …" and a definition carry a "shall"
    // but ask nobody to do anything. The monitor is a duty list, so they are
    // not rows; the instrument's own text still holds them.
    if (cls.type === 'meta' || cls.type === 'definition') continue;
    sentences[row.sourceId] = quote;
    if (prev) sentences[row.sourceId - 1] = prev;
    duties.push({
      id: duties.length + 1,
      sourceId: row.sourceId,
      clause: row.clause || null,
      clauseNo: row.clauseNo || null,
      plain: String(row.plain || row.fullPlain || quote).trim(),
      type: cls.type,
      typeLabel: row.typeLabel || cls.type,
      bearer: bearerTag(quote),
      numbers: [...new Set((quote.match(/\b\d[\d,.]*[A-Za-z]*\b/g) || []).map((n) => n.replace(/,/g, '')))],
    });
  }

  const refNo = refFrom(doc);
  writeFileSync(
    join(instDir, `${doc.id}.json`),
    `${JSON.stringify({
      id: doc.id,
      title,
      refNo,
      date: doc.date,
      sourceUrl: doc.sourceUrl,
      addressee: cleanAddressee(doc.addressee, text),
      hash: ihash,
      text,
      sentences,
      duties,
    })}\n`,
  );

  return {
    id: doc.id,
    refNo,
    date: doc.date,
    dateISO: dateISO(doc.date),
    title,
    family: familyKey(title),
    hash: ihash,
    file: `instruments/${doc.id}.json`,
    duties: duties.length,
    words: text.split(/\s+/).filter(Boolean).length,
  };
});

// ---- families and predecessors --------------------------------------------

const byFamily = new Map();
for (const instrument of instruments) {
  if (!byFamily.has(instrument.family)) byFamily.set(instrument.family, []);
  byFamily.get(instrument.family).push(instrument);
}

const families = [];
const predecessor = new Map();
for (const [id, members] of byFamily) {
  members.sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
  // Two instruments can share a date. Neither is "the previous version" of
  // the other, so a predecessor is only claimed across distinct dates.
  for (let i = 1; i < members.length; i += 1) {
    if (members[i].dateISO !== members[i - 1].dateISO) predecessor.set(members[i].id, members[i - 1].id);
  }
  families.push({
    id,
    label: members[members.length - 1].title,
    members: members.map((m) => m.id).reverse(),
    size: members.length,
  });
}

for (const instrument of instruments) {
  instrument.predecessor = predecessor.get(instrument.id) || null;
}
instruments.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
families.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));

writeFileSync(
  join(outDir, 'index.json'),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    corpusHash,
    dictionaryVersion: DICTIONARY_VERSION,
    regulator: 'Reserve Bank of India',
    corpus: 'private/verification/2026-10-22-rbi-precision-test/corpus.jsonl',
    instruments,
    families,
  })}\n`,
);

const totalDuties = instruments.reduce((a, i) => a + i.duties, 0);
const multi = families.filter((f) => f.size > 1);
console.log(`instruments: ${instruments.length}, duties: ${totalDuties}, families: ${families.length} (${multi.length} with a predecessor)`);
for (const instrument of instruments.slice(0, 6)) {
  console.log(`  ${instrument.id} | ${instrument.dateISO} | ${instrument.duties} duties | ${instrument.title.slice(0, 90)}`);
}
console.log(`multi-member families:`);
for (const family of multi.slice(0, 6)) {
  console.log(`  ${family.size} × ${family.label.slice(0, 90)}`);
}
console.log(`wrote ${outDir}`);
