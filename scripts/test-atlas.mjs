// Verification for the policy atlas: the world map must cover every
// jurisdiction the atlas studies, every policy must carry a full public
// interest test, and the atlas copy must stay out of AI-slop territory.
//
// The no-slop rules are the ones in the no-ai-slop skill, checked by name so
// a failure says which pattern broke rather than "copy is bad".
//
// Run: node scripts/test-atlas.mjs

import { sectors, PIT_ROWS } from '../src/data/sectors.js';
import {
  JURISDICTION_ISO,
  sectorIsoCodes,
  atlasIsoCodes,
  INDIA_ISO,
} from '../src/data/atlasMap.js';
import { MAP_ISO_CODES } from '../src/data/worldMap.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const allPolicies = sectors.flatMap((s) => [
  ...s.north.map((p) => ({ sector: s, side: 'north', p })),
  ...s.south.map((p) => ({ sector: s, side: 'south', p })),
]);

// 1. The atlas holds fifteen sectors, three policies a side.
ok('fifteen sectors', sectors.length === 15, `${sectors.length}`);
ok('three policies a side in every sector',
  sectors.every((s) => s.north.length === 3 && s.south.length === 3),
  sectors.map((s) => `${s.north.length}/${s.south.length}`).join(' '));
ok('ninety policies in all', allPolicies.length === 90, `${allPolicies.length}`);

// 2. Every policy carries the three PIT answers, and none is empty.
const PIT_KEYS = PIT_ROWS.map(([key]) => key);
for (const { sector, p } of allPolicies) {
  for (const key of PIT_KEYS) {
    const answer = p.pit?.[key];
    ok(`${sector.id} · ${p.n} · ${key}`,
      typeof answer === 'string' && answer.trim().length >= 40,
      typeof answer === 'string' ? `${answer.trim().length} chars` : 'missing');
  }
}

// 3. The three answers of a policy must not repeat each other.
for (const { sector, p } of allPolicies) {
  const answers = PIT_KEYS.map((key) => p.pit[key].trim());
  ok(`${sector.id} · ${p.n} · three distinct answers`,
    new Set(answers).size === 3);
}

// 4. No two policies share a PIT answer. Catches a template that was filled
//    in by copying rather than by reading.
for (const key of PIT_KEYS) {
  const seen = new Map();
  for (const { sector, p } of allPolicies) {
    const answer = p.pit[key].trim();
    if (seen.has(answer)) {
      ok(`${key} is not copy-pasted`, false,
        `${sector.id} · ${p.n} repeats ${seen.get(answer)}`);
    }
    seen.set(answer, `${sector.id} · ${p.n}`);
  }
  ok(`${key} is not copy-pasted across policies`, true, `${seen.size} distinct answers`);
}

// 5. The world map covers every jurisdiction the atlas studies. India is
//    drawn from its own path, so the drawable codes come from the generated
//    map module, not from the world layer alone.
const mapCodes = new Set(MAP_ISO_CODES);
ok('the map can draw India', mapCodes.has(INDIA_ISO), INDIA_ISO);
for (const { p } of allPolicies) {
  const codes = JURISDICTION_ISO[p.j];
  ok(`${p.j} maps to ISO codes`, Array.isArray(codes) && codes.length > 0, p.j);
  if (!codes) continue;
  for (const code of codes) {
    ok(`${p.j} · ${code} is on the map`, mapCodes.has(code), code);
  }
}

// 6. Sector and atlas coverage agree with the map.
for (const sector of sectors) {
  const codes = sectorIsoCodes(sector);
  ok(`${sector.id} lights something on the map`, codes.size > 0, `${codes.size} countries`);
  for (const code of codes) {
    ok(`${sector.id} · ${code} is on the map`, mapCodes.has(code), code);
  }
}
ok('the atlas touches more than one country', atlasIsoCodes(sectors).size > 1,
  `${atlasIsoCodes(sectors).size} countries`);

// 7. The atlas copy stays out of AI-slop territory. Terms that are the law's
//    own vocabulary rather than the writer's are allowed through.
const BANNED = [
  'delve', 'foster', 'leverage', 'utilize', 'utilise', 'facilitate', 'empower',
  'streamline', 'robust', 'cutting-edge', 'paradigm shift', 'game changer',
  'tapestry', 'realm', 'beacon', 'multifaceted', 'meticulous', 'intricate',
  'paramount', 'transformative', 'elevate', 'embark', 'supercharge', 'harness',
  'ever-evolving', 'seamless', 'holistic', 'synergy', 'pivotal', 'testament',
];
const BANNED_EXCEPTIONS = ['foster care'];
const FILLER = [
  "it's worth noting", 'it is worth noting', 'at the end of the day',
  'when it comes to', 'at its core', "in today's world", 'the reality is',
  'the truth is', 'in order to', 'going forward', "let's dive in",
  'plays a vital role', 'stands as a testament', 'marks a pivotal moment',
  'underscores its significance', 'experts agree', 'studies show',
  'widely regarded', 'industry reports suggest', 'many argue',
];
// Patterns, each named after the rule in the skill that bans it. The first
// three apply to every word on the card. The rest apply to the PIT copy,
// which is the writing this atlas added and owns end to end.
const CARD_PATTERNS = [
  [/not (?:just|only)[^.]*\bbut\b/i, 'not X but Y'],
  [/\bisn['’]t\b[^.]*\b(?:it['’]s|it is)\b/i, "isn't X, it's Y"],
  [/\bthis is (?:not|more than)\b/i, 'binary contrast'],
];
const PIT_PATTERNS = [
  [/:\s[a-z]/, 'colon reveal'],
  [/\b(just|literally|honestly|simply|actually|truly|fundamentally|importantly|crucially|inherently|inevitably)\b/i, 'often-empty adverb'],
  [/\b(highlighting|underscoring|reflecting|showcasing)\b/i, 'superficial -ing clause'],
  [/\b(serves as|acts as|stands as|functions as)\b/i, 'fake-strong verb'],
  [/\b(here'?s the thing|here'?s what i mean|let me be clear|i'?ll be honest|the uncomfortable truth is|the hard truth)\b/i, 'throat-clearing opener'],
  [/\b(this is the part most people skip|what most people get wrong|here'?s what nobody tells you|the part everyone misses)\b/i, 'faux-insight setup'],
  [/\b(that last part matters|the key point is|as you can see|this distinction matters|in other words)\b/i, 'interpretive metadiscourse'],
  [/\b(experts agree|industry reports suggest|many argue|widely regarded|studies show)\b/i, 'weasel attribution'],
  [/\.\s+(And|But|So)\s+[A-Z]/, 'dramatic fragmentation'],
  [/\bnot a [^.]+\.\s+not a /i, 'negative listing'],
  [/\b(what if i told you|think about it|plot twist)\b/i, 'rhetorical setup'],
  [/\b(in conclusion|ultimately|overall|in summary|to sum up)\b/i, 'summary-recap ending'],
  [/\b(stands as a testament|marks a pivotal moment|plays a vital role|solidifies its position|underscores its significance)\b/i, 'importance puffery'],
];

const cardText = [];
const pitText = [];
for (const { sector, p } of allPolicies) {
  const pit = PIT_KEYS.map((key) => p.pit[key]).join(' ');
  pitText.push(pit);
  cardText.push([sector.label, p.n, p.w, p.s, pit].join(' '));
}
const haystack = cardText.join('\n');
const lowerHaystack = haystack.toLowerCase();

for (const word of BANNED) {
  const hits = [];
  for (const line of lowerHaystack.split('\n')) {
    for (const match of line.matchAll(new RegExp(`\\b${word}\\b`, 'g'))) {
      const context = line.slice(Math.max(0, match.index - 40), match.index + 40);
      if (!BANNED_EXCEPTIONS.some((e) => context.includes(e))) {
        hits.push(`…${context.trim()}…`);
      }
    }
  }
  ok(`no "${word}" in the atlas copy`, hits.length === 0, hits.slice(0, 2).join(' | '));
}

for (const phrase of FILLER) {
  ok(`no "${phrase}" in the atlas copy`, !lowerHaystack.includes(phrase));
}

for (const [pattern, label] of CARD_PATTERNS) {
  const hits = cardText.filter((text) => pattern.test(text));
  ok(`no ${label} in the atlas copy`, hits.length === 0, hits[0]?.slice(0, 90));
}

for (const [pattern, label] of PIT_PATTERNS) {
  const hits = pitText.filter((text) => pattern.test(text));
  ok(`no ${label} in the PIT copy`, hits.length === 0, hits[0]?.slice(0, 110));
}

// 8. Em dashes are a rhythm crutch, not a tool. None in the atlas copy.
ok('no em dashes in the atlas copy', !haystack.includes('—'));

// 9. The portability test, mechanically. The failure mode is a template: the
//    answers differ but reuse the same sentences. No sentence may appear in
//    two answers.
const sentences = new Map();
for (const { sector, side, p } of allPolicies) {
  for (const key of PIT_KEYS) {
    for (const raw of p.pit[key].split(/(?<=[.?])\s+/)) {
      const sentence = raw.trim();
      if (!sentence) continue;
      if (!sentences.has(sentence)) sentences.set(sentence, []);
      sentences.get(sentence).push(`${sector.id}/${side}/${p.n}/${key}`);
    }
  }
}
const reused = [...sentences.entries()].filter(([, where]) => where.length > 1);
ok('no sentence is reused across PIT answers', reused.length === 0,
  reused.map(([s, where]) => `"${s}" in ${where.join(', ')}`).join(' | '));
ok('the PIT copy is long enough to be written',
  sentences.size > 350, `${sentences.size} distinct sentences`);

console.log(failures === 0 ? '\nAll atlas checks passed.' : `\n${failures} atlas check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
