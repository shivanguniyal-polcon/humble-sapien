// Verification for the amendment graph: every operation in the pinned
// fifty is read from the instrument's own sentence, carries the exact span
// and SHA-256 receipts, and a payload that cannot be read goes to
// `unresolved` instead of becoming an invented edge.
//
// The last section checks the other side of the diff: the base snapshots are
// held beside the pinned fifty, every named base is present, and a DELETE or
// SUBSTITUTE can quote the clause it kills from the snapshot in force before
// the first amendment in its series.
//
// Run: node scripts/test-amendments.mjs

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  AMENDMENT_EXTRACTOR_VERSION,
  AMENDMENT_OPS,
  applyDeleteToRows,
  diedRefsOf,
  diffBornRows,
  extractAmendmentEdges,
  extractAmendmentGraph,
  idFromScope,
  normRef,
  resolveInstrument,
} from '../src/lib/legal/amendments.js';
import { baseExcerpts, baseRefFor } from '../src/lib/legal/base.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const INDEX = readJson('src/data/monitor/index.json');
const COLLECTION = readJson('src/data/monitor/collection.json');
const docs = INDEX.instruments.map((meta) => ({
  meta,
  doc: readJson(`src/data/monitor/${meta.file}`),
}));

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const norm = (text) => String(text || '').replace(/\s+/g, ' ').trim();
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const byId = new Map();

// 1. The corpus and the extractor's own contract.
const bases = INDEX.bases || [];
const baseDocs = bases.map((meta) => ({ meta, doc: readJson(`src/data/monitor/${meta.file}`) }));
const baseById = new Map(baseDocs.map(({ meta, doc }) => [meta.id, { meta, doc }]));

{
  ok('the library is the pinned fifty', docs.length === 50, String(docs.length));
  ok('the base snapshots are held beside the library, not inside it',
    bases.length === 16 && bases.every((entry) => entry.kind === 'base-direction'),
    String(bases.length));
  ok('every base snapshot carries text and a version date',
    baseDocs.every(({ meta, doc }) => doc.text.length > 1000 && /^\d{4}-\d{2}-\d{2}$/.test(meta.versionDate || '')),
    String(baseDocs.length));
  ok('every instrument has text to read',
    docs.every(({ doc }) => typeof doc.text === 'string' && doc.text.length > 1000));
  ok('the extractor version is recorded', /^ths-amendment-edges-/.test(AMENDMENT_EXTRACTOR_VERSION));
  ok('the operation vocabulary is closed',
    AMENDMENT_OPS.join(',') === 'INSERT,DELETE,SUBSTITUTE,RENUMBER,RENAME,REPEAL');
}

// 2. Read every instrument. The first pass collects the graphs and the
//    receipts; nothing is sampled.
const graphs = [];
for (const { meta, doc } of docs) {
  const graph = await extractAmendmentGraph(doc);
  graphs.push({ meta, doc, graph });
  byId.set(meta.id, { meta, doc, graph });
}

const edges = graphs.flatMap(({ graph }) => graph.edges);
const born = graphs.flatMap(({ graph }) => graph.born);
const died = graphs.flatMap(({ graph }) => graph.died);
const unresolved = graphs.flatMap(({ graph }) => graph.unresolved);
const withEdges = graphs.filter(({ graph }) => graph.edges.length > 0);
const amendments = graphs.filter(({ graph }) => graph.instrument.form === 'AMENDMENT');

{
  ok('at least twenty instruments carry amendment operations',
    withEdges.length >= 20, String(withEdges.length));
  ok('the library yields at least seventy operations',
    edges.length >= 70, String(edges.length));
  ok('the library yields at least seven hundred born rows',
    born.reduce((sum, entry) => sum + entry.rows.length, 0) >= 700,
    String(born.reduce((sum, entry) => sum + entry.rows.length, 0)));
  ok('the library yields removed addresses',
    died.reduce((sum, entry) => sum + entry.refs.length, 0) >= 25,
    String(died.reduce((sum, entry) => sum + entry.refs.length, 0)));
}

// 3. Every edge is a quote, and every quote is the source span it claims.
{
  let badTarget = 0;
  let badQuote = 0;
  let badQuoteHash = 0;
  let badPayload = 0;
  let badPayloadHash = 0;

  for (const { doc, graph } of graphs) {
    for (const edge of graph.edges) {
      if (!edge.targetRef || !edge.evidence?.quote || !AMENDMENT_OPS.includes(edge.op)) {
        badTarget += 1;
        continue;
      }
      const source = doc.text.slice(edge.evidence.start, edge.evidence.end);
      if (norm(source) !== edge.evidence.quote) badQuote += 1;
      if (sha256(source) !== edge.evidence.sha256) badQuoteHash += 1;

      if (edge.op === 'INSERT' || edge.op === 'SUBSTITUTE') {
        if (!edge.payload?.quote) {
          badPayload += 1;
          continue;
        }
        const payload = doc.text.slice(edge.payload.start, edge.payload.end);
        if (norm(payload) !== edge.payload.quote) badPayload += 1;
        if (sha256(payload) !== edge.payload.sha256) badPayloadHash += 1;
      } else if (edge.payload !== null) {
        badPayload += 1;
      }
    }
  }

  ok('every operation names a target and a known operation', badTarget === 0, String(badTarget));
  ok('every operation quote is the exact source span', badQuote === 0, String(badQuote));
  ok('every operation hash covers that span', badQuoteHash === 0, String(badQuoteHash));
  ok('every insert or substitute carries a payload', badPayload === 0, String(badPayload));
  ok('every payload hash covers its span', badPayloadHash === 0, String(badPayloadHash));
}

// 4. The born and died lists pair with the edges that produced them, and
//    every born clause is inside the payload that bore it.
{
  let badPair = 0;
  let badBorn = 0;
  let badDied = 0;

  for (const { graph } of graphs) {
    const bornEdges = graph.edges.filter((edge) => edge.op === 'INSERT' || edge.op === 'SUBSTITUTE');
    const diedEdges = graph.edges.filter((edge) => edge.op === 'DELETE' || edge.op === 'REPEAL');

    graph.born.forEach((entry, index) => {
      if (!bornEdges[index] || entry.targetRef !== bornEdges[index].targetRef) badPair += 1;
      for (const row of entry.rows) {
        if (!row.quote || !row.type) badBorn += 1;
        if (bornEdges[index]?.payload && !norm(bornEdges[index].payload.quote).includes(norm(row.quote))) {
          badBorn += 1;
        }
      }
    });

    graph.died.forEach((entry, index) => {
      if (!diedEdges[index] || entry.targetRef !== diedEdges[index].targetRef) badPair += 1;
      if (!entry.refs.length) badDied += 1;
    });
  }

  ok('born and died entries pair with their operations', badPair === 0, String(badPair));
  ok('every born row is a clause inside its payload', badBorn === 0, String(badBorn));
  ok('every removed entry names at least one address', badDied === 0, String(badDied));
}

// 5. Known instruments: a substantial amendment, a failed operation that is
//    reported rather than dropped, an unresolved base, a base direction,
//    and a document that is not an RBI Directions instrument at all.
{
  const rbc = byId.get(13493).graph;
  ok('the responsible-business-conduct amendment yields a substantial graph',
    rbc.edges.length >= 10, String(rbc.edges.length));
  ok('its insertions carry payload hashes',
    rbc.edges.some((edge) => edge.payload && /^[0-9a-f]{64}$/.test(edge.payload.sha256)));

  const partial = byId.get(13501).graph;
  ok('an operation that cannot be read is reported, not dropped',
    partial.unresolved.length >= 1, String(partial.unresolved.length));

  const replaced = byId.get(13673).graph;
  ok('a delete-and-substitute is read as one replacement, with its payload',
    replaced.edges.length === 1
      && replaced.edges[0].op === 'SUBSTITUTE'
      && Boolean(replaced.edges[0].payload)
      && replaced.born.some((entry) => entry.rows.length > 0),
    JSON.stringify({ op: replaced.edges[0]?.op, payload: Boolean(replaced.edges[0]?.payload) }));

  const noBase = byId.get(13575).graph;
  ok('an amendment without a base reference stays unresolved',
    noBase.instrument.form === 'AMENDMENT'
      && noBase.instrument.resolved === false
      && /base/i.test(noBase.instrument.reason),
    noBase.instrument.reason);

  const base = byId.get(13552).graph;
  ok('a base direction is recognised as base',
    base.instrument.form === 'BASE' && base.instrument.resolved === true);

  const notDirections = byId.get(13742).graph;
  ok('a non-Directions notification is left unknown',
    notDirections.instrument.form === 'UNKNOWN' && notDirections.instrument.resolved === false,
    notDirections.instrument.reason);
}

// 6. The resolver and the clause-level helpers, on synthetic text.
{
  const synthetic = resolveInstrument({
    id: 'synthetic',
    text: 'Reserve Bank of India (Housing Finance Companies) Third Amendment Directions, 2026\n'
      + 'These amendments to the Reserve Bank of India (Housing Finance Companies) Directions, 2025.',
  });
  ok('an amendment title resolves to the chain and the base',
    synthetic.form === 'AMENDMENT'
      && synthetic.resolved === true
      && synthetic.ordinal === 3
      && /Housing Finance Companies/.test(synthetic.baseTitle || ''),
    JSON.stringify({ form: synthetic.form, ordinal: synthetic.ordinal, baseTitle: synthetic.baseTitle }));
  ok('the chain id is stable', idFromScope('Housing Finance Companies') === 'RBI/HOUSING_FINANCE_COMPANIES');

  const unknown = resolveInstrument({ id: 'unknown', text: 'A press release with no instrument title.' });
  ok('a document without the Directions grammar is unresolved',
    unknown.form === 'UNKNOWN' && unknown.resolved === false && /title/i.test(unknown.reason));

  ok('target addresses drop articles and drafter padding',
    normRef('The paragraph 10(15A) as below') === 'paragraph 1015a');
  ok('a range delete keeps both ranges',
    JSON.stringify(diedRefsOf('the paragraphs 408 to 416 and 442 to 454'))
      === JSON.stringify(['paragraphs 408 to 416', 'paragraphs 442 to 454']));

  const lifespan = diffBornRows(
    'An NBFC shall appoint a grievance officer. '
    + '“specified asset” means an asset specified by the Reserve Bank.',
  );
  ok('a payload yields a duty row and a definition row',
    lifespan.length >= 2
      && lifespan.some((row) => row.type === 'definition')
      && lifespan.every((row) => row.quote && row.bearer),
    String(lifespan.length));

  const baseRows = [
    { id: 1, clause: 'paragraph 10(15A)', clauseNo: '10(15A)', quote: 'A dying clause.' },
    { id: 2, clause: 'paragraph 10(16)', clauseNo: '10(16)', quote: 'A surviving clause.' },
  ];
  const killed = applyDeleteToRows(baseRows, { targetRef: 'paragraph 10(15A)' });
  ok('a delete resolves to the base clause when the base is supplied',
    killed.length === 1 && killed[0].id === 1,
    JSON.stringify(killed.map((row) => row.id)));

  const hybrid = await extractAmendmentEdges({
    id: 'hybrid',
    refNo: 'RBI/TEST/1',
    date: 'January 1, 2027',
    text: 'Reserve Bank of India (Housing Finance Companies) Third Amendment Directions, 2027\n'
      + '(1) Paragraph 5 shall be deleted and substituted with a new paragraph as under:\n'
      + '“5A. An HFC shall appoint a grievance officer.”\n'
      + 'These Directions shall come into effect from January 1, 2027.',
  });
  ok('a hybrid delete-and-substitute keeps the replacement payload',
    hybrid.edges.length === 1
      && hybrid.edges[0].op === 'SUBSTITUTE'
      && /grievance officer/.test(hybrid.edges[0].payload?.quote || ''),
    JSON.stringify({ edges: hybrid.edges.length, op: hybrid.edges[0]?.op }));
}

// 7. The other side of the diff. Every named base is held at the version in
//    force before the first amendment in its series, and each DELETE or
//    SUBSTITUTE that can be addressed quotes its dying clause from it.
{
  const amendmentForms = amendments.length;
  const withBase = amendments.filter(({ graph }) => graph.instrument.baseTitle).length;
  // Fold dashes and punctuation on both sides: a title prints an en dash in
  // one document and a hyphen in another, and that is the same instrument.
  const titleKey = (value) => norm(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const baseInLibrary = amendments.filter(({ graph }) => {
    const wanted = titleKey(graph.instrument.baseTitle);
    if (!wanted) return false;
    return bases.some((entry) => {
      const candidate = titleKey(entry.title);
      return candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate);
    });
  }).length;
  const distinctBases = new Set(
    amendments
      .map(({ graph }) => titleKey(graph.instrument.baseTitle))
      .filter(Boolean),
  );

  console.log('');
  console.log(
    `Coverage: ${INDEX.instruments.length} instruments · ${amendmentForms} amendment forms · `
    + `${withBase} base references · ${baseInLibrary} base snapshots present · `
    + `${unresolved.length} unresolved operations.`,
  );
  console.log(
    `Operations: ${edges.length} · ${born.reduce((sum, entry) => sum + entry.rows.length, 0)} born rows · `
    + `${died.reduce((sum, entry) => sum + entry.refs.length, 0)} removed addresses.`,
  );
  ok('every base named by an amendment is held as a snapshot',
    baseInLibrary === withBase
      && bases.length === distinctBases.size
      && bases.length === COLLECTION.bases.length,
    `${baseInLibrary}/${withBase} present, ${bases.length} snapshots for ${distinctBases.size} distinct bases`);

  // Each snapshot must predate the first amendment in its series: a later
  // consolidation would already contain the change being diffed.
  const wrongVersion = bases.filter((entry) => {
    const plan = COLLECTION.bases.find((candidate) =>
      norm(candidate.title).toLowerCase() === norm(entry.title).toLowerCase());
    return plan?.firstDate && String(entry.versionDate) >= String(plan.firstDate);
  });
  ok('every snapshot is the version in force before the first amendment',
    wrongVersion.length === 0,
    wrongVersion.map((entry) => `${entry.id}:${entry.versionDate}`).join(', '));

  // The dying text is read from the snapshot, not inferred. Count the
  // operations that can be addressed in it, and check the known replacement.
  let addressed = 0;
  let quoted = 0;
  for (const { meta, graph } of graphs) {
    if (graph.instrument.form !== 'AMENDMENT') continue;
    const wanted = titleKey(graph.instrument.baseTitle);
    const baseMeta = bases.find((entry) => {
      const candidate = titleKey(entry.title);
      return candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate);
    });
    if (!baseMeta) continue;
    const baseDoc = baseById.get(baseMeta.id)?.doc;
    const diedEdges = graph.edges.filter((edge) => edge.op === 'DELETE' || edge.op === 'REPEAL');
    for (const edge of graph.edges) {
      if (!['DELETE', 'REPEAL', 'SUBSTITUTE'].includes(edge.op)) continue;
      const refs = (edge.op === 'SUBSTITUTE'
        ? [edge.targetRef]
        : (graph.died[diedEdges.indexOf(edge)]?.refs || [])).map((ref) => baseRefFor(edge, ref));
      if (!refs.length) continue;
      addressed += 1;
      if (baseExcerpts(baseDoc.text, refs).length) quoted += 1;
    }
    // A title that resolves to another instrument is the failure the scope
    // preference in resolveInstrument exists to prevent.
    if (meta.id === 13493) {
      ok('an amendment resolves its own base, not a cross-reference in the opening',
        /Responsible Business Conduct/.test(graph.instrument.baseTitle || ''),
        graph.instrument.baseTitle);
    }
  }
  ok('the snapshot quotes almost every dying address rather than inferring it',
    quoted >= 30 && quoted <= addressed,
    `${quoted}/${addressed} addressed operations quoted`);

  const replacedText = baseExcerpts(
    baseById.get(12939).doc.text,
    ['paragraphs 155 to 157)'],
  );
  ok('a known substitution quotes the clause it replaces',
    replacedText.length > 0 && /code of conduct/i.test(replacedText[0].text),
    replacedText[0]?.label);

  // "In paragraph 15, sub-paragraph (4) shall be deleted" has no parent in
  // the target address itself; the operation's context supplies it.
  const subEdge = byId.get(13539).graph.edges.find((edge) => edge.targetRef === 'sub-paragraph (4)');
  const subRefs = (byId.get(13539).graph.died[
    byId.get(13539).graph.edges.filter((edge) => edge.op === 'DELETE' || edge.op === 'REPEAL').indexOf(subEdge)
  ]?.refs || []).map((ref) => baseRefFor(subEdge, ref));
  const subText = baseExcerpts(baseById.get(12965).doc.text, subRefs);
  ok('a sub-paragraph without a parent quotes the clause the context names',
    subText.length > 0 && subText[0].label === '15(4)' && /^\s*\(4\)/.test(subText[0].text),
    JSON.stringify({ refs: subRefs, label: subText[0]?.label }));

  const deletedChild = baseExcerpts(baseById.get(12942).doc.text, ['paragraph 5(1)']);
  ok('a dying sub-paragraph quotes only itself, not its surviving siblings',
    deletedChild.length === 1
      && /Mortgage Guarantee/.test(deletedChild[0].text)
      && /Core Investment Company/.test(deletedChild[0].text) === false,
    JSON.stringify({ label: deletedChild[0]?.label, text: deletedChild[0]?.text?.slice(0, 80) }));

  ok('two known impossible addresses are reported as not found, not guessed',
    baseExcerpts(baseById.get(12942).doc.text, ['the Section I']).length === 0
      && baseExcerpts(baseById.get(12942).doc.text, ['the following']).length === 0);

  const planned = COLLECTION;
  const namedBases = COLLECTION.bases.reduce((sum, entry) => sum + entry.amendments.length, 0);
  ok('the collection plan matches the corpus window',
    planned.window.from === '2025-01-01'
      && planned.window.to === INDEX.instruments.map((entry) => entry.dateISO).sort().at(-1),
    JSON.stringify(planned.window));
  ok('the plan names every amendment that has a base',
    namedBases === amendments.filter(({ graph }) => graph.instrument.baseTitle).length,
    `${namedBases} planned, ${amendments.filter(({ graph }) => graph.instrument.baseTitle).length} with a base`);
  ok('the plan lists those amendments exactly once',
    new Set(planned.bases.flatMap((entry) => entry.amendments.map((amendment) => amendment.id))).size === namedBases);
  ok('every planned base is now present',
    planned.bases.every((entry) => entry.inLibrary)
      && planned.totals.missingBases === 0);
  ok('the plan reports the same operation totals as the extractor',
    planned.totals.operations === edges.length
      && planned.totals.born === born.reduce((sum, entry) => sum + entry.rows.length, 0)
      && planned.totals.removed === died.reduce((sum, entry) => sum + entry.refs.length, 0));
  ok('the plan lists every amendment whose base title cannot be read',
    planned.unresolved.length === amendments.filter(({ graph }) => !graph.instrument.baseTitle).length,
    String(planned.unresolved.length));
}

console.log(failures === 0 ? '\nAll amendment checks passed.' : `\n${failures} amendment check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
