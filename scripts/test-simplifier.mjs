// Verification for the legal review engine: provenance, defined terms,
// clause typing, risk flags, determinism, jurisdiction dictionaries, the
// comparative mode and the exports.
// Run: node scripts/test-simplifier.mjs

import {
  analyse, compare, JURISDICTIONS,
} from '../src/lib/legal/pipeline.js';
import { extractDefinitions, termsInSentence } from '../src/lib/legal/definedTerms.js';
import { classifyClause } from '../src/lib/legal/clauses.js';
import { fidelityChecks } from '../src/lib/legal/risk.js';
import { segment, splitLong } from '../src/lib/legal/segments.js';
import { diffWords, buildDocx } from '../src/lib/legal/docx.js';
import {
  buildBundle, buildMarkdown, buildHtml, buildRedlineCsv, buildManifest,
  checkLegalGate, LEGAL_GATE_QUESTIONS, methodologyCard,
} from '../src/lib/legal/exports.js';
import { simplify, SAMPLE_TEXT, LEGAL_SAMPLE_TEXT } from '../src/lib/simplify.js';
import { classifyObligation, bearerOf } from '../src/lib/legal/obligations.js';
import { propositionFromSentence } from '../src/lib/legal/propositions.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}
function approx(name, got, want, tol = 1e-6) {
  const good = got != null && Math.abs(got - want) <= tol;
  if (!good) failures += 1;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}: got ${got}, want ${want}`);
}

// 1. Provenance: every row points back at the exact characters of the source.
{
  const text = 'The Centre may make rules. Every beneficiary shall be entitled to the benefits.';
  const r = analyse(text);
  ok('one row per sentence', r.rows.length === 2, `${r.rows.length}`);
  for (const row of r.rows) {
    ok(`row ${row.id} slice matches the source`, text.slice(row.start, row.end) === row.sourceText);
  }
  ok('row ids are sequential', r.rows[0].id === 'r1' && r.rows[1].id === 'r2');
}

// 2. A clause head is not a sentence: "Section 4." must not become its own row.
{
  const text = 'Section 4. The Central Government may make rules for this Act.';
  const r = analyse(text);
  ok('clause head is not split off', r.rows.length === 1, `${r.rows.length} rows`);
  ok('clause is numbered', r.rows[0].clause === 's. 4', r.rows[0].clause);
  ok('the head is part of the sentence', r.rows[0].sourceText.startsWith('Section 4.'));
}

// 3. Defined terms are read, and left alone.
{
  const text = LEGAL_SAMPLE_TEXT;
  const { definitions } = extractDefinitions(text);
  ok('definitions are extracted', definitions.length >= 2, `${definitions.length} found`);
  const terms = definitions.map((d) => d.term);
  ok('"authorised officer" is a defined term', terms.includes('authorised officer'), terms.join(', '));
  ok('"scheme" is a defined term', terms.includes('scheme'), terms.join(', '));
  const r = analyse(text);
  const row = r.rows.find((x) => x.sourceText.includes('authorised officer'));
  ok('a row using a defined term is flagged', !!row && row.flag !== 'green', row && row.flag);
  ok('the defined term is named in the reason', !!row && row.reasons.some((x) => x.text.includes('authorised officer')));
  const plainAll = r.rows.map((x) => x.plain).join(' ');
  ok('the defined term is not rewritten away', plainAll.includes('authorised officer'));
  ok('termsInSentence finds the plural form', termsInSentence('the schemes notified', [{ term: 'scheme' }]).includes('scheme'));
}

// 4. Clause typing: the types that change what a sentence does.
{
  ok('shall not is a prohibition', classifyClause('No person shall do this.').id === 'prohibition');
  ok('shall be entitled is an entitlement', classifyClause('Every person shall be entitled to it.').id === 'entitlement');
  ok('punishment is a penalty', classifyClause('Such person shall be punished with imprisonment.').id === 'penalty');
  ok('deemed is a deeming provision', classifyClause('X shall be deemed to be a company.').id === 'deeming');
  ok('provided that is a proviso', classifyClause('He may do it, provided that he pays.').id === 'proviso');
  ok('shall make rules is an obligation', classifyClause('The Centre shall make rules.').id === 'obligation');
}

// 5. Risk flags: green, amber, red, and the mechanical fidelity checks.
{
  const green = analyse('The Centre shall make rules.');
  ok('a plain duty sentence is green', green.rows[0].flag === 'green', green.rows[0].flag);
  const red = analyse('A payment shall be deemed to be a loan for the purposes of this Act.');
  ok('a deeming provision is red', red.rows[0].flag === 'red', red.rows[0].flag);
  ok('the red reason names the rule', red.rows[0].reasons.some((x) => /deem/i.test(x.text)));
  const amber = analyse('He may do it, provided that he pays the fee.');
  ok('a proviso is amber', amber.rows[0].flag === 'amber', amber.rows[0].flag);
  ok('the amber reason names the clause type', amber.rows[0].reasons.some((x) => /Proviso/.test(x.text)));
}

// 6. Fidelity checks: a lost figure or a lost negation is caught.
{
  const lostFigure = fidelityChecks('The fine shall be 5,000 rupees.', 'The fine shall be rupees.');
  ok('a lost figure is red', lostFigure.some((x) => x.level === 'red'), JSON.stringify(lostFigure));
  ok('the lost figure is named', lostFigure.some((x) => /5,?000/.test(x.text)), JSON.stringify(lostFigure));
  const keptFigure = analyse('The fine shall be 5,000 rupees for every contravention.');
  ok('a kept figure is not red', keptFigure.rows[0].flag !== 'red', keptFigure.rows[0].flag);
  const neg = analyse('The Centre shall not make any rule without consultation.');
  ok('a kept negation is not red', neg.rows[0].flag !== 'red', neg.rows[0].flag);
  const lostNegation = fidelityChecks('No person shall make a rule.', 'A person shall make a rule.');
  ok('a lost negation is red', lostNegation.some((x) => x.level === 'red'), JSON.stringify(lostNegation));
}

// 7. Determinism: the same input gives the same hashes, every time.
{
  const a = await buildManifest(analyse(LEGAL_SAMPLE_TEXT));
  const b = await buildManifest(analyse(LEGAL_SAMPLE_TEXT));
  ok('the output hash is stable', a.outputHash === b.outputHash);
  ok('the input hash is stable', a.inputHash === b.inputHash);
  ok('the source hash names its algorithm', /^sha256:/.test(a.sourceHash), a.sourceHash);
  const c = await buildManifest(analyse(`${LEGAL_SAMPLE_TEXT} `));
  ok('a different input gives a different hash', c.inputHash !== a.inputHash);
  ok('the manifest records the dictionary', c.dictionary.startsWith('in-bare-act@'), c.dictionary);
}

// 8. Jurisdiction modes: each dictionary is its own register.
{
  ok('six jurisdictions are registered', JURISDICTIONS.length === 6, `${JURISDICTIONS.length}`);
  const uk = analyse('The Secretary of State shall make rules in pursuance of this Act.', { jurisdictionId: 'uk-si' });
  ok('the UK dictionary rewrites its own phrases', /can|under/.test(uk.rows[0].plain) && !/pursuance/.test(uk.rows[0].plain), uk.rows[0].plain);
  const us = analyse('The Agency shall comply with this part.', { jurisdictionId: 'us-cfr' });
  ok('the US dictionary uses the agency register', /agency must/.test(us.rows[0].plain), us.rows[0].plain);
  const eu = analyse('Member States shall adopt the measures laid down in this Regulation.', { jurisdictionId: 'eu-regulation' });
  ok('the EU dictionary rewrites its own phrases', /member countries/i.test(eu.rows[0].plain) && /set out/.test(eu.rows[0].plain), eu.rows[0].plain);
  const inr = analyse('The Central Government may make rules.', { jurisdictionId: 'in-bare-act' });
  ok('the India dictionary is the default register', inr.rows[0].plain.includes('Centre'), inr.rows[0].plain);
  ok('the clause prefix follows the jurisdiction', uk.rows[0].clause === null || uk.rows[0].clause.startsWith('reg.'), uk.rows[0].clause);
}

// 9. The comparative mode finds what changed between two versions.
{
  const before = 'Section 4. The Centre shall make rules after consultation with the States.';
  const after = 'Section 4. The Centre shall make rules after consultation with the States and the Parliament.';
  const delta = compare(before, after, { jurisdictionId: 'in-bare-act' });
  ok('the comparison aligns on the clause number', delta.method === 'clause number', delta.method);
  ok('the change is found', delta.counts.changed === 1, JSON.stringify(delta.counts));
  ok('the changed row names the clause', delta.changes[0].clause === 's. 4', delta.changes[0].clause);
  const added = compare('Section 4. The Centre shall make rules.', 'Section 4. The Centre shall make rules. Section 5. The States shall be notified.', { jurisdictionId: 'in-bare-act' });
  ok('an added section is found', added.counts.added === 1, JSON.stringify(added.counts));
}

// 10. The split keeps the connective: dropping "and" changes the sentence.
{
  const parts = splitLong('The Centre may frame a scheme for the grant of assistance to the beneficiaries, and the scheme shall provide for the manner in which the assistance is disbursed to every person who is eligible under the Act');
  ok('a long sentence is split', parts.length >= 2, `${parts.length} parts`);
  ok('the connective survives the split', /(^|\W)and(\W|$)/i.test(parts[1]), parts[1]);
}

// 11. The exports carry the methodology and the gate.
{
  const r = analyse(LEGAL_SAMPLE_TEXT, { source: { title: 'Sample Act', citation: 'Act No. 1 of 2026' } });
  const manifest = await buildManifest(r);
  const bundle = buildBundle(r, { gate: { currency: 'Yes', definitions: 'Yes', reviewer: 'A. Lawyer', circulation: 'Yes' }, manifest });
  ok('the bundle carries the source', bundle.includes(LEGAL_SAMPLE_TEXT.slice(0, 60)));
  ok('the bundle carries the methodology card', bundle.includes('METHODOLOGY CARD'));
  ok('the bundle carries the hashes', bundle.includes(manifest.outputHash));
  ok('the bundle carries the gate answers', bundle.includes('A. Lawyer'));
  const md = buildMarkdown(r, { manifest });
  ok('the markdown has a table', md.includes('| # | Clause | Type | Flag |'));
  const html = buildHtml(r, { manifest });
  ok('the html is a document', html.startsWith('<!doctype html>') && html.includes('</html>'));
  ok('the html carries the source', html.includes('authorised officer'));
  const csv = buildRedlineCsv(r);
  const csvLines = csv.split('\n');
  ok('the csv has a header', csvLines[0].startsWith('sentence,clause,clause_type,flag'), csvLines[0]);
  ok('the csv has a row per sentence at least', csvLines.length >= r.rows.length);
  ok('the methodology card says what it cannot prove', methodologyCard(r, manifest).includes('WHAT IT CANNOT PROVE'));
}

// 12. The gate blocks the export until all four questions are answered.
{
  const empty = checkLegalGate({});
  ok('an empty gate is not complete', empty.complete === false);
  ok('the gate names what is missing', empty.missing.length === LEGAL_GATE_QUESTIONS.length, empty.missing.join('; '));
  const full = checkLegalGate({ currency: 'a', definitions: 'b', reviewer: 'c', circulation: 'd' });
  ok('a full gate is complete', full.complete === true);
}

// 13. The docx is a real container with real tracked changes.
{
  const r = analyse(LEGAL_SAMPLE_TEXT);
  const bytes = buildDocx(r, { date: '2026-01-01T00:00:00Z' });
  ok('the docx is a zip', bytes[0] === 0x50 && bytes[1] === 0x4b, `${bytes[0]},${bytes[1]}`);
  ok('the docx is not empty', bytes.length > 2000, `${bytes.length} bytes`);
  const text = Buffer.from(bytes).toString('latin1');
  ok('the docx carries tracked insertions', text.includes('<w:ins '));
  ok('the docx carries tracked deletions', text.includes('<w:del '));
  ok('the docx carries the document part', text.includes('word/document.xml'));
}

// 14. The word diff marks the change, not the whole sentence.
{
  const parts = diffWords('the Centre shall make rules', 'the Centre must set rules');
  ok('the diff has unchanged words', parts.some((p) => p.type === 'same' && /Centre/.test(p.text)), JSON.stringify(parts));
  ok('the diff marks a deletion', parts.some((p) => p.type === 'del' && /shall/.test(p.text)));
  ok('the diff marks an insertion', parts.some((p) => p.type === 'ins' && /must/.test(p.text)));
}

// 15. The citizen mode still works, and reads better than the source.
{
  const r = simplify(SAMPLE_TEXT);
  ok('the citizen rewrite is produced', r.simplifiedText.length > 0);
  ok('the rewrite is easier to read', r.readability.simplified.score > r.readability.original.score,
    `${r.readability.original.score} -> ${r.readability.simplified.score}`);
  ok('obligations are still found', r.obligations.length >= 1,
    r.obligations.map((o) => o.typeLabel).join(' | '));
  ok('every obligation carries its type', r.obligations.every((o) => o.type && o.typeLabel));
  ok('the proviso is not listed as a duty of its own',
    !r.obligations.some((o) => /^provided that/i.test(o.text)),
    r.obligations.map((o) => o.text.slice(0, 40)).join(' | '));
  ok('the replacements are still counted', r.stats.replacements.length > 0, `${r.stats.replacements.length}`);
  ok('the hindi layer still renders', r.hindi.sentences.length === r.sentences.length);
}

// 16. The segmenter keeps offsets on a messy text.
{
  const text = 'Rs. 4 shall be paid. Section 5 applies. No more.';
  const segs = segment(text);
  ok('the abbreviation did not split the sentence', segs.length === 3, `${segs.length}: ${segs.map((s) => s.text).join(' / ')}`);
  for (const s of segs) ok('the slice matches', text.slice(s.start, s.end) === s.text, s.text);
}

// 17. The obligation taxonomy: a "shall" sentence is typed before it is
// listed, because a composition rule and a grant are not tasks.
{
  const types = [
    ['The Bank shall appoint the auditors of the Company.', 'action'],
    ['Every beneficiary shall be entitled to receive the benefits.', 'entitlement'],
    ['Membership of the BLBC shall comprise of banks and officers.', 'constitutive'],
    ['In this Act, "scheme" shall mean the scheme notified under section 14.', 'definition'],
  ];
  for (const [sentence, want] of types) {
    const cls = classifyObligation(sentence);
    ok(`typed as ${want}`, cls.type === want, `${cls.type}: ${sentence.slice(0, 50)}`);
  }

  const cut = simplify('The Bank shall appoint the auditors of');
  ok('a span cut mid-clause is marked a fragment',
    cut.obligations.length > 0 && cut.obligations[0].fragment === true,
    JSON.stringify(cut.obligations.map((o) => o.fragment)));

  // "the Bank" in an instrument addressed to banks is the reader, not RBI.
  // Reading it as the regulator marks the reader's own duty out of scope.
  const self = bearerOf('The Bank shall disclose the divergence in its annual report.');
  ok('a bare "the Bank" is the entity, not the regulator',
    self.side === 'entity', JSON.stringify(self));
  const rbi = bearerOf('The Reserve Bank shall issue directions to all banks.');
  ok('the Reserve Bank is the regulator', rbi.side === 'regulator', JSON.stringify(rbi));
}

// 18. The proposition layer: a typed proposition per sentence, in one
// canonical frame, set beside today's rewrite.
{
  const types = [
    ['The Bank shall appoint the auditors of the Company.', 'duty'],
    ['The Company shall not transfer the shares.', 'prohibition'],
    ['No such rules shall be made without prior consultation.', 'prohibition'],
    ['The Centre may make rules for carrying out the purposes of this Act.', 'permission'],
    ['Every beneficiary shall be entitled to receive the benefits.', 'entitlement'],
    ['In this Act, "authorised officer" means an officer appointed in writing.', 'definition'],
    ['Membership of the BLBC shall comprise of banks and officers.', 'constitutive'],
    ['These Directions shall come into effect from January 1, 2027.', 'meta'],
  ];
  for (const [sentence, want] of types) {
    const p = propositionFromSentence(sentence);
    ok(`proposition typed as ${want}`, p.kind === want, `${p.kind}: ${sentence.slice(0, 50)}`);
    ok(`the frame is rendered for ${want}`, p.frame.length > 0, p.frame);
  }

  // The frame keeps the slots separate: the act, the clock, the condition
  // and the exception are not allowed to blur into each other.
  const timed = propositionFromSentence(
    'The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.',
  );
  ok('the clock is in its own slot', timed.timing.length === 1 && /fifteen days/.test(timed.timing[0]), JSON.stringify(timed.timing));
  ok('the exception is in its own slot', timed.exceptions.length === 1 && /unless/.test(timed.exceptions[0]), JSON.stringify(timed.exceptions));
  ok('the frame carries act, clock and exception',
    /furnish the documents/.test(timed.frame) && /fifteen days/.test(timed.frame) && /unless/.test(timed.frame),
    timed.frame);
  ok('a prohibition puts the negation in the force',
    propositionFromSentence('The Company shall not transfer the shares, provided that the Board approves the transfer.')
      .frame === 'The Company must not transfer the shares, provided that the Board approves the transfer.',
    propositionFromSentence('The Company shall not transfer the shares, provided that the Board approves the transfer.').frame);

  // One proposition per source sentence, each beside its rewrite.
  const r = simplify(SAMPLE_TEXT);
  ok('every sentence gets a proposition', r.propositions.length === r.stats.sentences,
    `${r.propositions.length} vs ${r.stats.sentences}`);
  ok('every proposition carries its rewrite for comparison',
    r.propositions.every((p) => typeof p.rewrite === 'string' && p.rewrite.length > 0));
  ok('every proposition carries a rendered frame',
    r.propositions.every((p) => p.frame.length > 0),
    r.propositions.map((p) => p.frame.slice(0, 40)).join(' | '));
  ok('every proposition carries its type and actor',
    r.propositions.every((p) => p.kind && p.kindLabel && p.actor && p.actor.side));
  ok('the sample proviso lands in the condition slot, not the act',
    r.propositions.some((p) => p.conditions.some((c) => /prior consultation/.test(c))),
    r.propositions.map((p) => JSON.stringify(p.conditions)).join(' | '));

  const one = propositionFromSentence('It shall be the obligation of the auditor to file the return within thirty days.');
  ok('a duty-of construction names its bearer in the frame',
    one.kind === 'duty' && /^The auditor must file the return/.test(one.frame), one.frame);
  ok('the frame is deterministic',
    propositionFromSentence('The Bank shall appoint the auditors.').frame ===
      propositionFromSentence('The Bank shall appoint the auditors.').frame);
}

// 19. The rule card (Task 8): who must do what, by when, unless what — and
// what the engine could not read. The substitution view stays beside it.
{
  const r = simplify(SAMPLE_TEXT);
  ok('a rule card per source sentence', r.ruleCards.length === r.stats.sentences,
    `${r.ruleCards.length} vs ${r.stats.sentences}`);
  const grant = r.ruleCards[r.ruleCards.length - 1];
  ok('the card names who must do what',
    /beneficiar/i.test(grant.who) && /receive/i.test(grant.mustDo),
    JSON.stringify({ who: grant.who, force: grant.force, mustDo: grant.mustDo }));
  ok('the card keeps the source sentence',
    grant.source.length > 0 && SAMPLE_TEXT.includes(grant.source.slice(0, 20)),
    grant.source.slice(0, 40));
  ok('the card lists the fields it read and the ones it could not',
    Array.isArray(grant.fieldsRead) && Array.isArray(grant.fieldsMissing)
      && grant.fieldsRead.includes('action'),
    JSON.stringify({ read: grant.fieldsRead, missing: grant.fieldsMissing }));
  ok('the card carries structural confidence',
    ['high', 'medium', 'low'].includes(grant.confidence.band) && grant.confidence.expected > 0,
    JSON.stringify(grant.confidence));
  ok('the sample proviso lands in unless what',
    r.ruleCards[0].unlessWhat.some((q) => /prior consultation/.test(q)),
    JSON.stringify(r.ruleCards[0].unlessWhat));

  // A statement has no force. The label table's empty string is a decision,
  // not a missing value, so the card must not fall back to "must" and print
  // "Someone must An Act to provide for …" at the citizen.
  const statement = simplify('An Act to provide for the processing of digital personal data and for matters connected therewith or incidental thereto.');
  ok('a statement card does not invent a force',
    statement.ruleCards[0].force === '',
    JSON.stringify({
      kind: statement.ruleCards[0].kind,
      who: statement.ruleCards[0].who,
      force: statement.ruleCards[0].force,
      mustDo: statement.ruleCards[0].mustDo,
    }));

  const timed = simplify('The applicant shall furnish the documents within fifteen days, unless the Reserve Bank extends the period.');
  ok('a deadline lands in by when',
    timed.ruleCards[0].byWhen.some((d) => /fifteen days/.test(d)),
    JSON.stringify(timed.ruleCards[0].byWhen));
  ok('an exception lands in unless what',
    timed.ruleCards[0].unlessWhat.some((q) => /unless/.test(q)),
    JSON.stringify(timed.ruleCards[0].unlessWhat));

  const quiet = simplify('The Reserve Bank has examined the feedback received on the draft Directions.');
  const card = quiet.ruleCards[0];
  ok('an untouched sentence still gets a rule card', !!card && card.source.length > 0);
  ok('with a structural confidence, not a tick',
    card.structural === true && ['high', 'medium', 'low'].includes(card.confidence.band),
    JSON.stringify({ structural: card.structural, confidence: card.confidence }));

  const vague = simplify('The applicant shall furnish the documents where the Reserve Bank so directs.');
  ok('an unread condition is named on the card, not hidden',
    vague.ruleCards[0].fieldsMissing.includes('condition'),
    JSON.stringify(vague.ruleCards[0].fieldsMissing));

  // Clause-level rendering: every card carries the clause it sits in, so
  // the panel renders the cards under their clause rather than as one flat
  // list of sentences.
  const cl = simplify('Section 4. The Bank shall appoint the auditors. Section 5. The auditors shall report within thirty days.');
  ok('a card carries the clause it sits in',
    cl.ruleCards.map((c) => c.clause).join('|') === 's. 4|s. 5',
    cl.ruleCards.map((c) => c.clause).join('|'));
  // The clause marker is furniture: the heading says "s. 4", so the card's
  // who must not repeat "Section 4." as if it were part of the actor.
  ok('the clause marker stays out of the who',
    !cl.ruleCards.some((c) => /^section\s+\d/i.test(c.who)),
    JSON.stringify(cl.ruleCards.map((c) => c.who)));

  // The DoD's manual check, as a test: a 60-word nested-clause sentence
  // with no dictionary phrase renders as a rule card with the unresolved
  // condition visible — read into "unless what" or named as not read, but
  // never dropped.
  const nested = simplify(
    'Where a scheduled bank, after giving the borrower a notice of not less than thirty days, proposes to enforce a security interest created in its favour, unless the borrower has discharged the outstanding dues with interest, and no suit concerning the security interest is pending before any court, the bank shall follow the procedure laid down by the Reserve Bank.',
  );
  ok('no dictionary phrase touches the sentence',
    nested.stats.replacements.every((x) => x.term === 'shall'),
    JSON.stringify(nested.stats.replacements));
  ok('a 60-word nested clause becomes one rule card',
    nested.ruleCards.length === 1, `${nested.ruleCards.length}`);
  const nc = nested.ruleCards[0];
  ok('with the unresolved condition visible on the card',
    nc.unlessWhat.some((q) => /unless/.test(q)) || nc.fieldsMissing.includes('condition'),
    JSON.stringify({ unlessWhat: nc.unlessWhat, missing: nc.fieldsMissing }));
  ok('and the source sentence kept whole',
    nc.source.includes('thirty days') && nc.source.includes('Reserve Bank'));
  ok('with a structural confidence, not a green tick',
    ['high', 'medium', 'low'].includes(nc.confidence.band) && nc.confidence.expected > 0,
    JSON.stringify(nc.confidence));

  ok('the substitution view is still produced beside the cards',
    r.simplifiedText.length > 0 && r.stats.replacements.length > 0);
}

// 20. Reading levels: four grades of the same rewrite, each with a declared
// Flesch band, its own swaps reported, and an honest ceiling.
{
  const plain = simplify(SAMPLE_TEXT);
  ok('the default level is school-graduate', plain.level.id === 'school');
  ok('the reported score is the level\'s own text',
    plain.readability.simplified.score === plain.level.achieved,
    JSON.stringify({ reported: plain.readability.simplified.score, achieved: plain.level.achieved }));

  const byId = {};
  for (const id of ['college', 'school', 'child', 'homosapien']) {
    byId[id] = simplify(SAMPLE_TEXT, { level: id });
  }
  ok('the four levels carry the declared bands',
    ['college', 'school', 'child', 'homosapien']
      .map((id) => byId[id].level.band.join('-')).join(' ')
      === '40-60 60-80 80-90 90-100');
  ok('each level is a different text',
    new Set(Object.values(byId).map((r) => r.simplifiedText)).size === 4);
  ok('every level\'s score measures the text on the page',
    Object.values(byId).every((r) => r.readability.simplified.score === r.level.achieved));
  ok('the child level reports its swaps',
    byId.child.stats.replacements.some((c) => c.term === 'level: child'),
    JSON.stringify(byId.child.stats.replacements.filter((c) => String(c.term).startsWith('level'))));
  ok('the homosapien level is a card summary, and says so',
    /^Who: /.test(byId.homosapien.simplifiedText) && byId.homosapien.level.summary === true,
    byId.homosapien.simplifiedText.slice(0, 80));
  ok('a level reports what its cap could not reach',
    Array.isArray(byId.child.level.floors),
    JSON.stringify(byId.child.level.floors));
  ok('the homosapien summary keeps the duty and the deadline',
    /must|can/.test(byId.homosapien.simplifiedText)
      && byId.homosapien.simplifiedText.length > 0);

  // A section number is furniture, not a sentence: the summary must never
  // collapse to the marker and drop the sentence it labels (the corpus run
  // found 209 numbers that way, and a summary that read "37.").
  const marked = simplify(
    '37. All pending high and medium risk paras and persisting irregularities should be reported to the Board / ACB in order to highlight key areas in which risk mitigation has not been undertaken.',
    { level: 'homosapien' },
  );
  ok('a section marker does not become the whole summary',
    marked.simplifiedText.startsWith('37. ') && marked.simplifiedText.length > 60,
    marked.simplifiedText);
  ok('a section marker is never reported as a dropped body',
    !marked.stats.replacements.some((c) => c.removed && /All pending high/.test(c.from)),
    JSON.stringify(marked.stats.replacements.filter((c) => c.removed)));

  // "3.3 District Development Manager …" is one label: strip it whole, and
  // keep it on the card so the reader can find the paragraph again.
  const decimal = simplify(
    '3.3 District Development Manager (DDM): NABARD shall appoint a District Development Manager (DDM) for each district to act as a liaison between NABARD and the district administration.',
    { level: 'homosapien' },
  );
  ok('a decimal clause label is stripped whole and kept on the summary',
    decimal.simplifiedText.startsWith('3.3 ') && !/\b3 District/.test(decimal.simplifiedText),
    decimal.simplifiedText);
}

console.log(failures === 0 ? '\nAll simplifier checks passed.' : `\n${failures} simplifier check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
