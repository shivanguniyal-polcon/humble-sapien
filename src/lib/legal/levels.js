// THS: reading levels — four grades of the same rewrite.
//
// The bands are Flesch Reading Ease, ascending difficulty inverted: the
// simplest level sits near 100. Each level is a different amount of
// rewriting, not a different lie: every phrase a level swaps is reported in
// the same change list as the dictionary's own rules, the source stays on
// the page, and a level that cannot reach its band says so instead of
// quietly claiming it did. Homosapien is a who-does-what summary built from
// the rule cards, and says that on its face.
//
// Nothing here invents a fact: the tiers swap connectives and nominal
// forms, the cap splits at clause joints that already exist, and the
// Homosapien script only assembles fields the engine read from the
// sentence. When a cap cannot be reached (proper nouns, quoted titles, a
// noun stack with no verb), the sentence is kept whole and the ceiling is
// reported.

import { countWords, punctuate, capitalize, splitLong } from './segments.js';
import { escapeRegExp } from './text.js';
import { flesch } from '../flesch.js';

export const LEVELS = [
  {
    id: 'college',
    label: 'College-graduate',
    band: [40, 60],
    cap: 40,
    note: 'Each sentence stays as drafted; only the words are made plain.',
  },
  {
    id: 'school',
    label: 'School-graduate',
    band: [60, 80],
    cap: 22,
    note: 'Long sentences are split at their own clause joints.',
  },
  {
    id: 'child',
    label: 'Child-like',
    band: [80, 90],
    cap: 10,
    note: 'Shorter sentences and simpler connectives. Check the source for anything you will rely on.',
  },
  {
    id: 'homosapien',
    label: 'Homosapien',
    band: [90, 100],
    cap: 8,
    summary: true,
    note: 'A who-does-what summary, not the legal text. Read the source before relying on it.',
  },
];

export const DEFAULT_LEVEL = 'school';

export const getLevel = (id) =>
  LEVELS.find((level) => level.id === id) || LEVELS.find((level) => level.id === DEFAULT_LEVEL);

// The graded tiers. A phrase already swapped by the statutory dictionary
// simply does not match, so the tiers only ever add. Each entry is
// [from, to]; the swap is reported with the level's own tag.
const TIERS = {
  child: [
    ['in the event that', 'if'],
    ['with respect to', 'about'],
    ['in respect of', 'about'],
    ['prior to', 'before'],
    ['subsequent to', 'after'],
    ['is required to', 'must'],
    ['is entitled to', 'can'],
    ['provided that', 'but only if'],
    ['notwithstanding', 'even if'],
    ['pursuant to', 'under'],
    ['hereinafter', 'after this'],
    ['thereof', 'of it'],
    ['therein', 'in it'],
    ['whereof', 'of which'],
    ['commencement', 'start'],
    ['the State Governments', 'the States'],
    ['an official notice', 'a notice'],
    ['the detailed rules', 'rules'],
    ['Even though', 'Although'],
  ],
  homosapien: [
    ['the Central Government', 'the Centre'],
    ['the appropriate Government', 'the government'],
    ['the provisions of this Act', 'this law'],
    ['in accordance with', 'under'],
    ['set the detailed rules for this law', 'make rules for this law'],
    ['carrying out the purposes of this Act', 'running this law'],
    ['the State Governments', 'the States'],
    ['beneficiaries', 'people covered'],
    ['beneficiary', 'person covered'],
    ['is entitled to', 'can'],
    ['entitled to', 'can'],
    ['receive', 'get'],
    ['does not', "doesn't"],
    ['is not', "isn't"],
    ['are not', "aren't"],
  ],
};

const applyTier = (text, tier, tag) => {
  let out = text;
  const changes = [];
  for (const [from, to] of tier) {
    const re = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi');
    const hits = out.match(re);
    if (!hits) continue;
    out = out.replace(re, to);
    changes.push({
      term: `level: ${tag}`, from, to, risk: 'green', removed: false, count: hits.length,
    });
  }
  return { text: out, changes };
};

// The summary reuses the engine's own fired substitutions, so a card's
// phrase is plain in the same words the sentence beside it is.
const applyRules = (text, rules, tag) => {
  let out = text;
  const changes = [];
  for (const rule of rules) {
    if (!rule || !rule.from || typeof rule.to !== 'string' || !rule.to) continue;
    const re = new RegExp(`\\b${escapeRegExp(rule.from)}\\b`, 'gi');
    const hits = out.match(re);
    if (!hits) continue;
    out = out.replace(re, rule.to);
    changes.push({
      term: `level: ${tag}`, from: rule.from, to: rule.to,
      risk: rule.risk || 'green', removed: false, count: hits.length,
    });
  }
  return { text: out, changes };
};

// A clause or section marker ("37.", "(5)", "3.3", "325K.") is furniture,
// not a sentence of its own. Splitting after it left "37." as the first
// sentence and dropped the sentence it labels as a tail.
const LEAD_MARK = /^\s*\(\d+[A-Za-z]?\)\s+|^\s*\d+[A-Za-z]?(?:\.\d+)+(?=[\s.:)])[\s.:]*|^\s*\d+[A-Za-z]?[.):]\s+/;

const leadOf = (text) => {
  const m = String(text || '').match(LEAD_MARK);
  return m ? m[0].trim() : '';
};

const sentencePieces = (text) => {
  const s = String(text || '');
  const lead = leadOf(s);
  const body = lead ? s.trim().slice(lead.length).trim() : s;
  const parts = body.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!lead || !parts.length) return parts;
  return [`${lead} ${parts[0]}`, ...parts.slice(1)];
};

// Cut a sentence to the level's cap at joints the sentence already has.
// The joints are the clause joints our splitter trusts, plus the
// subordinator commas level rendering adds nothing to. Both sides must be
// more than a couple of words, and a tail that opens on a bare preposition
// ("by an official notice, …") is not a clause and is never cut.
const CLAUSE_TAIL = /^(?:and|but|or|so|unless|if|when|where|while|because|although|though|after|before|which|that|who|it|they|then|the|a|an|this|these|those|no|any|such|every|all|each|he|she|we|you)\b/i;
const BARE_TAIL = /^(?:by|in|of|on|at|with|from|for|to|under|as|per|via)\b/i;
const MODAL_TAIL = /\b(?:may|can|must|shall|will|would|could|should|might|to)\s*$/i;

export const splitToCap = (sentence, cap) => {
  const text = String(sentence || '').trim();
  if (countWords(text) <= cap) return [punctuate(text)];
  const base = splitLong(text, cap);
  if (base.length > 1) return base.flatMap((piece) => splitToCap(piece, cap));
  // A comma before a clause opening: the only joint left when splitLong's
  // four powered joins did not reach.
  let at = text.indexOf(', ');
  while (at > 10) {
    const head = text.slice(0, at).trim();
    let tail = text.slice(at + 2).trim();
    // Only a clause opening can start a new sentence: a comma before a
    // prepositional tail ("can, by an official notice, set …") cuts the
    // main clause in half and turns the verb into an imperative.
    if (!BARE_TAIL.test(tail) && CLAUSE_TAIL.test(tail) && countWords(tail) >= 3
      && !MODAL_TAIL.test(head)) {
      tail = capitalize(tail);
      return [punctuate(head), ...splitToCap(tail, cap)];
    }
    at = text.indexOf(', ', at + 2);
  }
  return [punctuate(text)];
};

// A purpose or basis tail ("for this law", "under this law and its rules") is
// the part that makes a summary sentence long and abstract. Homosapien drops
// it to reach its band, and reports the drop like any other change: the
// source stays on the page, the summary says what it is.
const TRIM_TAIL = /\s+(?:for|under|in accordance with|pursuant to|according to|as per)\s+(?:the|this|that|its|these|those|such|a|an)\b.*$/i;

const trimTail = (text, removed) => {
  const m = String(text || '').match(TRIM_TAIL);
  if (!m) return text;
  const head = text.slice(0, m.index).trim();
  if (countWords(head) < 3) return text;
  removed.push({ term: 'homosapien', from: m[0].trim(), to: '', risk: 'meaning-changing', removed: true, count: 1 });
  return head;
};

// Homosapien: the card's slots as label-and-value sentences — who, what,
// by when. This is the one level that is a summary by genre: a condition
// or exception is not carried here (it makes the sentence long again), it
// is reported as removed and it still sits on the rule card beside the
// summary. A sentence with no force keeps its own words.
const QUALIFIER_LEAD = /^(?:notwithstanding|subject to|save as otherwise|without prejudice|for the purposes of|in the case of)[^,]{4,},\s*/i;

const caveman = (cards) => {
  const lines = [];
  const drops = [];
  for (const card of cards) {
    // The section or clause number is the reader's way back to the source, so
    // the summary keeps it. The card's who has it stripped as furniture; the
    // summary puts it back in front of the block.
    const mark = leadOf(card.source || '');
    const withLead = (line) => (mark && !line.startsWith(mark) ? `${mark} ${line}` : line);
    if (!card.force) {
      lines.push(withLead(String(card.rewrite || card.mustDo || card.source || '')));
      continue;
    }
    let who = card.who || 'Someone';
    const lead = who.match(QUALIFIER_LEAD);
    if (lead) who = who.slice(lead[0].length);
    who = capitalize(who);
    const force = card.force === 'may' ? 'can' : card.force;
    lines.push(withLead(`Who: ${who}.`));
    lines.push(`What: ${force} ${card.mustDo}.`);
    if (card.byWhen && card.byWhen.length) {
      lines.push(`By when: ${card.byWhen.join('; ')}.`);
    }
    for (const clause of [...(card.unlessWhat || [])]) {
      drops.push({
        term: 'homosapien', from: clause, to: '', risk: 'meaning-changing', removed: true, count: 1,
      });
    }
  }
  return { lines, drops };
};

// Render one level. Inputs: the engine's capped rewrite, its uncapped
// per-source-sentence form (college keeps sentences as drafted), and the
// rule cards (Homosapien). Returns the text, the level's swaps, and the
// ceilings it could not clear.
export const renderLevel = ({ text, unsplit, cards = [], rules = [], levelId = DEFAULT_LEVEL }) => {
  const level = getLevel(levelId);
  const changes = [];
  const ceilings = [];
  let base = text;
  let pieces;

  if (level.id === 'college') {
    // Keep each sentence as drafted: plain words, no extra splitting.
    base = unsplit || text;
    pieces = sentencePieces(base).map(punctuate);
  } else if (level.id === 'homosapien') {
    // The card summary, then the engine's own substitutions and this
    // level's tier, so it reads in the same words as the rewrite beside it.
    const script = caveman(cards);
    changes.push(...script.drops);
    // One sentence per slot: a fired substitution can itself carry a second
    // sentence, so each line keeps its operative first sentence and the tail
    // is reported as removed.
    const lines = script.lines.map((line) => {
      const ruled = applyRules(line, rules, level.id);
      const tiered = applyTier(ruled.text, TIERS.homosapien, level.id);
      changes.push(...ruled.changes, ...tiered.changes);
      const [first, ...rest] = sentencePieces(tiered.text);
      for (const extra of rest) {
        changes.push({
          term: 'homosapien', from: extra, to: '', risk: 'meaning-changing', removed: true, count: 1,
        });
      }
      return capitalize(trimTail(first || '', changes));
    });
    pieces = lines.filter(Boolean).flatMap((line) => splitToCap(line, level.cap));
  } else {
    const tier = TIERS[level.id];
    if (tier) {
      const swapped = applyTier(base, tier, level.id);
      base = swapped.text;
      changes.push(...swapped.changes);
    }
    pieces = sentencePieces(base).flatMap((sentence) => splitToCap(sentence, level.cap));
  }

  // Report what the cap could not reach, rather than pretending it did.
  if (level.id !== 'college') {
    for (const piece of pieces) {
      const words = countWords(piece);
      if (words > level.cap) ceilings.push({ sentence: piece, words, cap: level.cap });
    }
  }

  const finalText = pieces.filter(Boolean).join(' ');
  const achieved = flesch(finalText);
  const [lo, hi] = level.band;
  return {
    level: {
      id: level.id,
      label: level.label,
      band: level.band,
      cap: level.cap,
      note: level.note,
      summary: !!level.summary,
      achieved: achieved.score,
      grade: achieved.grade,
      reached: achieved.score >= lo && achieved.score <= hi,
      floors: ceilings.map((c) => c.sentence),
    },
    text: finalText,
    changes,
    ceilings,
  };
};
