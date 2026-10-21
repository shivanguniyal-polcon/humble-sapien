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

export const simplify = (text) => {
  const result = analyse(text, { mode: 'citizen', jurisdictionId: 'in-bare-act' });

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
    // The citizen panel keeps its own, simpler reading of "obligation": any
    // sentence that binds someone by a duty word. The legal review mode shows
    // the full clause taxonomy instead, where a proviso or a prohibition is
    // its own kind rather than an obligation.
    obligations: result.rows
      .filter((row) => /\b(must|required to|is liable to|shall)\b/i.test(row.sourceText))
      .map((row) => row.plain),
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
