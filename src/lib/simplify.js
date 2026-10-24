// THS: policy simplification pipeline, v3.
//
// The citizen tool and the legal review tool run the same engine. The
// difference is what the engine is asked to do with the result: the citizen
// gets a clean rewrite with readability scores and a public interest gate;
// the reviewer gets provenance, clause types, risk flags and a legal review
// gate. One dictionary, one segmenter, one set of rules — so a rewrite a
// citizen reads and a lawyer signs off on are the same words.
//
// Runs entirely client-side; no data leaves the page.

import { analyse } from './legal/pipeline.js';
import { flesch } from './flesch.js';
import { hindiNote, translateTerms } from '../data/hindi.js';
import {
  classifyObligation, getObligationType, isDutyTrigger, OBLIGATION_ORDER,
} from './legal/obligations.js';
import {
  extractPropositions, getPropositionKind, structuralConfidence,
} from './legal/propositions.js';
import { render } from './legal/render.js';
import { renderGenre } from './legal/glossary.js';
import { renderLevel, DEFAULT_LEVEL } from './legal/levels.js';

// The rule card (Task 8): one card per source sentence — who must do what,
// by when, unless what — with the fields the engine read, the ones it could
// not, and a structural confidence. A sentence no dictionary rule touched
// gets a card like any other: read for structure, not certified green.
const FORCE_LABEL = {
  duty: 'must',
  prohibition: 'must not',
  permission: 'may',
  entitlement: 'is entitled to',
  definition: 'means',
  constitutive: 'is',
  method: 'is computed as',
  meta: '',
  illustration: 'must',
  statement: '',
};

// A decimal clause label ("3.3 District Development Manager …") is furniture
// all the way through: strip "3.3", not "3." and leave a stray "3".
const CLAUSE_MARK = /^(?:\d+[A-Za-z]?(?:\.\d+)+\s+(?=[A-Z(‘"])|(?:(?:section|sec|article|regulation|rule|part|chapter|schedule)\s+\d+[A-Za-z]?(?:\.\d+)*|\d+[A-Za-z]?(?:\.\d+)*)\s*[.:]\s*)/i;

const ruleCardFor = (p) => {
  const kind = getPropositionKind(p.obligationType);
  const confidence = structuralConfidence(p);
  // A statement or an illustration carries no force. The label table's empty
  // string is a decision, not a missing value: falling through to "must"
  // would print "Someone must An Act to provide for …" at the citizen.
  const force = p.modality || (FORCE_LABEL[p.obligationType] ?? 'must');
  // The clause marker ("Section 4.") is furniture: it labels the group the
  // card sits under, so it is not part of who the sentence binds.
  const who = (p.subject || (p.actor && p.actor.known ? p.actor.label : force ? 'Someone' : ''))
    .replace(CLAUSE_MARK, '')
  const rendered = render(p);
  const fieldsRead = [];
  if (p.actor && p.actor.known) fieldsRead.push('actor');
  if (p.action) fieldsRead.push('action');
  if (p.object) fieldsRead.push('object');
  if (p.qualifier) fieldsRead.push('qualifier');
  if (p.condition.length) fieldsRead.push('condition');
  if (p.exception.length) fieldsRead.push('exception');
  if (p.consequence) fieldsRead.push('consequence');
  if (p.deadline.length) fieldsRead.push('deadline');
  if (p.threshold.length) fieldsRead.push('threshold');
  if (p.authority) fieldsRead.push('authority');
  return {
    id: p.id,
    clause: p.clause,
    kind: p.obligationType,
    kindLabel: kind.label,
    kindNote: kind.note,
    who,
    force,
    mustDo: [p.action, p.object].filter(Boolean).join(' '),
    byWhen: p.deadline,
    unlessWhat: [...p.condition, ...p.exception],
    fieldsRead,
    fieldsMissing: [...new Set([...(p.unreadable || []), ...confidence.missing])],
    source: p.sourceText,
    frame: p.frame,
    rewrite: p.rewrite,
    substitutions: rendered.substitutions,
    structural: p.obligationType === 'statement' || rendered.substitutions.length === 0,
    confidence,
    flags: p.flags,
  };
};

export const simplify = (text, { level = DEFAULT_LEVEL } = {}) => {
  const result = analyse(text, { mode: 'citizen', jurisdictionId: 'in-bare-act' });

  // The previous source sentence, so a sentence that inherits its sense from
  // the one before it ("Illustratively:" tells the next sentence what it is)
  // is typed against that context rather than in the dark.
  const sourceTextById = new Map();
  for (const row of result.rows) {
    if (!sourceTextById.has(row.sourceId)) sourceTextById.set(row.sourceId, row.sourceText);
  }

  // A binding sentence, typed. The type is what makes this a task list
  // rather than a list of sentences with a duty word in them: a duty is
  // something someone has to do, a grant is something they may claim, a
  // composition rule says who sits where. A sentence that carries binding
  // language but was cut out of a longer sentence is marked as a fragment,
  // because a fragment read on its own reads as a duty it may not be.
  //
  // One entry per source sentence, not per row. A sentence too long to say
  // in one breath becomes several rows, and listing each of them separately
  // would put the same duty on the list three times.
  const obligations = [];
  const seenSource = new Set();
  for (const row of result.rows) {
    if (seenSource.has(row.sourceId)) continue;
    seenSource.add(row.sourceId);
    if (!isDutyTrigger(row.sourceText)) continue;
    const cls = classifyObligation(row.sourceText, {
      prev: sourceTextById.get(row.sourceId - 1) || '',
    });
    const type = getObligationType(cls.type);
    const parts = result.rows.filter((r) => r.sourceId === row.sourceId);
    obligations.push({
      id: row.id,
      text: row.fullPlain,
      clause: row.clause,
      type: cls.type,
      typeLabel: type.label,
      typeNote: type.note,
      fragment: cls.fragment,
      split: parts.length > 1,
      hedged: cls.hedged,
      bearer: cls.bearer,
    });
  }
  obligations.sort(
    (a, b) =>
      OBLIGATION_ORDER.indexOf(a.type) - OBLIGATION_ORDER.indexOf(b.type) ||
      a.id.localeCompare(b.id, 'en', { numeric: true }),
  );

  const propositions = extractPropositions(result.rows);

  // Genre rendering: a long title or a circular's letterhead cannot reach
  // ease 60 by substitution alone, so those inputs are rendered as short
  // sentences by the genre path (glossary.js). Ordinary prose keeps the
  // engine's output untouched; every genre rewrite is appended to the
  // change list beside the dictionary's own rules.
  const items = [];
  const seenIds = new Set();
  for (const row of result.rows) {
    if (seenIds.has(row.sourceId)) continue;
    seenIds.add(row.sourceId);
    const rows = result.rows.filter((r) => r.sourceId === row.sourceId);
    items.push({
      source: row.sourceText,
      plain: rows.map((r) => r.plain).join(' '),
      fullPlain: rows[0].fullPlain || rows.map((r) => r.plain).join(' '),
    });
  }
  const genre = renderGenre(items);
  const simplifiedText = genre
    ? [genre.plain, ...items.slice(genre.consumed).map((it) => it.plain)]
        .filter(Boolean)
        .join(' ')
    : result.simplifiedText;
  const genreChanges = genre ? genre.changes.map((c) => ({
    term: 'genre rendering', from: c.from, to: c.to, risk: c.risk,
    removed: c.removed, count: c.count,
  })) : [];

  // The reading level renders the rewrite. College keeps each sentence as
  // drafted, so it needs the substituted sentence before the splitter cut
  // it; Homosapien is built from the rule cards.
  const cards = propositions.map(ruleCardFor);
  const unsplitText = [
    genre ? genre.plain : '',
    ...items.slice(genre ? genre.consumed : 0).map((it) => it.fullPlain || it.plain),
  ].filter(Boolean).join(' ');
  const rendered = renderLevel({
    text: simplifiedText,
    unsplit: unsplitText,
    cards,
    rules: result.stats.replacements,
    levelId: level,
  });
  const finalText = rendered.text;

  return {
    simplifiedText: finalText,
    level: rendered.level,
    stats: {
      words: result.stats.words,
      sentences: result.stats.sentences,
      replacements: [
        ...result.stats.replacements.map((r) => ({
          term: r.term, from: r.from, to: r.to, risk: r.risk,
          removed: r.removed, count: r.count,
        })),
        ...genreChanges,
        ...rendered.changes,
      ],
    },
    // The panel's number must measure the text on the page — the level's
    // text, not the engine's pre-level output.
    readability: {
      original: result.readability.original,
      simplified: flesch(finalText),
    },
    sentences: result.rows.map((row) => ({
      id: row.id,
      original: row.sourceText,
      plain: row.plain,
      long: row.sourceText.trim().split(/\s+/).length > 22,
      flag: row.flag,
    })),
    obligations,
    propositions,
    ruleCards: cards,
    definitions: result.definitions.definitions,
    hindi: {
      note: hindiNote,
      sentences: result.hindi.sentences,
      glossary: [
        ['Central Government', 'केंद्र सरकार'],
        ['State Governments', 'राज्य सरकारें'],
        ['beneficiaries', 'लाभार्थी'],
        ['benefits', 'लाभ'],
        ['rules', 'नियम'],
        ['Act', 'अधिनियम'],
        ['must', 'को अनिवार्य रूप से'],
        ['may', 'कर सकती है'],
        ['Official Gazette', 'राजपत्र'],
      ],
    },
  };
};

export { translateTerms };

export const SAMPLE_TEXT = `Notwithstanding anything contained in any other law for the time being in force, the Central Government may, by notification in the Official Gazette, make rules for carrying out the purposes of this Act, and such rules may provide for the manner in which benefits shall be availed of by the beneficiaries, provided that no such rules shall be made without prior consultation with the State Governments. Every beneficiary shall be entitled to receive the benefits in accordance with the provisions of this Act and the rules made thereunder.`;

// A worked example for the legal review mode: sections, a definition, a
// proviso, a penalty and a cross-reference, so the ledger has something to
// show on first run.
export const LEGAL_SAMPLE_TEXT = `Section 2. In this Act, unless the context otherwise requires,— (1) "authorised officer" means an officer appointed in writing by the appropriate Government; (2) "scheme" means the scheme notified under section 14.

Section 14. The appropriate Government may, by notification in the Official Gazette, frame a scheme for the grant of financial assistance to the beneficiaries, provided that no scheme shall be framed without prior consultation with the State Governments. Every beneficiary shall be entitled to receive the assistance in accordance with the provisions of this Act and the rules made thereunder.

Section 21. Where an authorised officer contravenes the provisions of this Act, such person shall be punished with imprisonment for a term which may extend to six months, and every such contravention shall also be an offence punishable with a fine of five thousand rupees for every such contravention.

Section 24. The provisions of section 21 shall not apply to any person who proves that he or she exercised all due diligence to prevent the commission of the contravention.`;
