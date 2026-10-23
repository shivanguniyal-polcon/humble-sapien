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
import { hindiNote, translateTerms } from '../data/hindi.js';
import {
  classifyObligation, getObligationType, isDutyTrigger, OBLIGATION_ORDER,
} from './legal/obligations.js';
import { extractPropositions } from './legal/propositions.js';

export const simplify = (text) => {
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

  return {
    simplifiedText: result.simplifiedText,
    stats: {
      words: result.stats.words,
      sentences: result.stats.sentences,
      replacements: result.stats.replacements.map((r) => ({ term: r.term, count: r.count })),
    },
    readability: {
      original: result.readability.original,
      simplified: result.readability.simplified,
    },
    sentences: result.rows.map((row) => ({
      id: row.id,
      original: row.sourceText,
      plain: row.plain,
      long: row.sourceText.trim().split(/\s+/).length > 22,
      flag: row.flag,
    })),
    obligations,
    propositions: extractPropositions(result.rows),
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
