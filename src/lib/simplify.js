// THS: policy simplification pipeline, v2.
// Turns legal/policy language into speech-level plain language:
//   1. glossary rewrite : statutory phrases -> casual equivalents
//   2. sentence surgery : long sentences split at natural joints
//   3. obligation extraction: "who must do what" bullets
//   4. readability: Flesch Reading Ease + grade, before and after
//   5. hindi: rule-based rendering of recognized clauses
// Runs entirely client-side; no data leaves the page.

import { flesch } from './flesch';
import { renderHindi, hindiNote, translateTerms } from '../data/hindi';

const GLOSSARY = [
  // whole-phrase wins first: longest, most specific patterns at the top
  ['notwithstanding anything contained in any other law for the time being in force', 'even though other laws say otherwise'],
  ['such rules may provide for the manner in which', 'these rules set out how'],
  ['make rules for carrying out the purposes of this Act', 'set the detailed rules for this law'],
  ['in accordance with the provisions of this Act and the rules made thereunder', 'under this law and its rules'],
  ['benefits shall be availed of by the beneficiaries', 'people can use the benefits'],
  ['every beneficiary shall be entitled to receive', 'everyone covered can get'],
  ['the Central Government may', 'the Centre can'],
  ['notwithstanding anything contained in', 'even though other laws say otherwise,'],
  ['notwithstanding anything to the contrary', 'even if anything else says the opposite,'],
  ['notwithstanding', 'even so,'],
  ['in accordance with the provisions of', 'under'],
  ['in accordance with', 'as per'],
  ['the provisions of', 'the rules in'],
  ['for the time being in force', 'in force right now'],
  ['for the purposes of this', 'for this'],
  ['carrying out the purposes of this Act', 'running this law'],
  ['by notification in the Official Gazette', 'by an official notice'],
  ['including but not limited to', 'including'],
  ['shall be deemed to be', 'counts as'],
  ['shall be liable to', 'must'],
  ['shall be entitled to receive', 'can get'],
  ['shall be entitled to', 'can get'],
  ['shall not be construed as', 'does not mean'],
  ['without prejudice to', 'without limiting'],
  ['in the event that', 'if'],
  ['in the event of', 'if'],
  ['with effect from', 'starting'],
  ['prior to', 'before'],
  ['subsequent to', 'after'],
  ['in relation to', 'about'],
  ['pursuant to', 'under'],
  ['at the discretion of', 'decided by'],
  ['provided that', 'but'],
  ['inter alia', 'among other things'],
  ['as the case may be', ''],
  ['and/or', 'or'],
  ['aforesaid', 'earlier'],
  ['thereof', 'of it'],
  ['thereto', 'to it'],
  ['therein', 'in it'],
  ['hereby', ''],
  ['herein', 'here'],
  ['vide', 'through'],
  ['prior consultation', 'talking first'],
  ['no such rules shall be made without', 'these rules can only be made after'],
  ['make rules for', 'set the detailed rules for'],
  ['the manner in which', 'how'],
  ['in order to', 'to'],
  ['at this point in time', 'now'],
  ['a large number of', 'many'],
  ['shall', 'must'],
  // casual contractions
  ['do not', "don't"],
  ['does not', "doesn't"],
  ['cannot', "can't"],
  ['is not', "isn't"],
  ['are not', "aren't"],
  ['will not', "won't"],
  ['it is', "it's"],
  ['that is', "that's"],
];

const LONG_SENTENCE_WORDS = 22;

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

const splitSentences = (text) =>
  (text.match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const applyGlossary = (sentence, tally) => {
  let out = sentence;
  for (const [term, plain] of GLOSSARY) {
    const re = new RegExp(`\\b${term}\\b`, 'gi');
    if (re.test(out)) {
      tally[term] = (tally[term] || 0) + (out.match(re) || []).length;
      out = out.replace(re, plain);
    }
  }
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:)])/g, '$1')
    .replace(/^\s*,\s*/, '')
    .trim();
  return capitalize(out);
};

// Split overlong sentences at natural joints to make them speakable.
const splitLong = (sentence) => {
  if (countWords(sentence) <= LONG_SENTENCE_WORDS) return [sentence];
  const joints = [', and ', ', but ', '; ', ', which ', ', so '];
  for (const joint of joints) {
    const i = sentence.indexOf(joint);
    if (i > 8 && i < sentence.length - 12) {
      const head = sentence.slice(0, i).trim();
      let tail = sentence.slice(i + joint.length).trim();
      const lead = joint.trim().startsWith(',') ? joint.trim().slice(1).trim() : '';
      if (lead === 'and' || lead === 'but' || lead === 'so') tail = capitalize(tail);
      else tail = capitalize(`${lead ? `${lead} ` : ''}${tail}`);
      return [head, tail].flatMap(splitLong);
    }
  }
  return [sentence];
};

const punctuate = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export const simplify = (text) => {
  const original = text.trim();
  const tally = {};
  const raw = splitSentences(original);

  const simplified = raw.flatMap((sentence) => {
    const plain = applyGlossary(sentence, tally);
    return splitLong(plain).map((piece) => ({
      original: sentence,
      plain: punctuate(piece),
      long: countWords(sentence) > LONG_SENTENCE_WORDS,
    }));
  });

  const simplifiedText = simplified.map((s) => s.plain).join(' ');
  const obligations = simplified
    .filter((s) => /\b(must|required to|is liable to|shall)\b/i.test(s.original))
    .map((s) => s.plain);

  const hindiSentences = simplified.map((s) => renderHindi(s.plain));

  return {
    simplifiedText,
    stats: {
      words: countWords(original),
      sentences: raw.length,
      replacements: Object.entries(tally)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count),
    },
    readability: {
      original: flesch(original),
      simplified: flesch(simplifiedText),
    },
    sentences: simplified,
    obligations,
    hindi: {
      note: hindiNote,
      sentences: hindiSentences,
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
