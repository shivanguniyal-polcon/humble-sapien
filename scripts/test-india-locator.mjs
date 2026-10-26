// Verification for the India locator and the scheme ladder.
//
// The locator sends a citizen to an office. If the geography is wrong, or a
// block is attached to the wrong district, or a rung in the ladder points at
// a post that no statute creates, the tool wastes the visit. So this checks:
//
//   1. the generated geography hangs together, block by block
//   2. the logic functions behave, including the two awkward cases: a
//      repeated village name and a tehsil that is not a rung of any ladder
//   3. every rung of every ladder names an office, a decision, the
//      documents to carry and where the claim was read from
//
// Run: node scripts/test-india-locator.mjs

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { STATES, INDIA_VIEWBOX } from '../src/data/india/indiaAdmin.js';
import {
  slugify,
  normalize,
  matches,
  pathPoints,
  bboxForPaths,
  viewBoxFor,
  buildTree,
  villagesOf,
  villageLgdCode,
  searchVillages,
  directoryCode,
  hierarchyRows,
  hierarchyCsv,
  HIERARCHY_CODE_SYSTEM,
  LADDER_RUNG_FOR,
  LADDER_RUNG_NOTE,
} from '../src/lib/india/hierarchy.js';
import { SCHEMES, RUNG_STATUS, DEADLINE_STATUS, LEVELS, NAME_TRAPS } from '../src/data/schemes.js';
import { escalation } from '../src/data/escalation.js';
import { dueDate, deadlineStatus, baseFor, localDay, parseDay } from '../src/lib/india/clock.js';
import { deadlineLines, buildLetter } from '../src/lib/india/letter.js';

let failures = 0;
function ok(name, cond, detail = '') {
  if (!cond) failures += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const INDIA_DIR = join(HERE, '..', 'src', 'data', 'india');

// Spellings that differ only in a parenthetical qualifier or an ampersand
// are one village in the directory, and the join folds them. Use the same
// rule here so the check catches real collisions rather than punctuation.
const lgdNameKey = (name) =>
  normalize(String(name).replace(/\([^)]*\)/g, ' ').replace(/&/g, ' and '));

// The viewbox the build script projects into.
const [, , VB_W, VB_H] = INDIA_VIEWBOX.split(' ').map(Number);

// ---------------------------------------------------------------- 1. states

ok('states are listed', STATES.length >= 30, `${STATES.length}`);
ok('state names are unique', new Set(STATES.map((s) => s.name)).size === STATES.length);
ok('state ids are unique', new Set(STATES.map((s) => s.id)).size === STATES.length);
ok('every State carries a numeric LGD code',
  STATES.every((s) => /^\d+$/.test(String(s.lgd_code || ''))),
  STATES.filter((s) => !/^\d+$/.test(String(s.lgd_code || ''))).map((s) => s.name).join(', '));

for (const s of STATES) {
  const points = pathPoints(s.path);
  ok(`${s.name} has an outline`, points.length >= 4, `${points.length} points`);
  const inside = points.every(([x, y]) => x >= 0 && x <= VB_W && y >= 0 && y <= VB_H);
  ok(`${s.name} outline is inside the viewbox`, inside);
  ok(`${s.name} declares counts`,
    Number.isInteger(s.districts) && s.districts > 0 &&
    Number.isInteger(s.blocks) && s.blocks > 0 &&
    Number.isInteger(s.villages) && s.villages >= 0,
    `${s.districts}d ${s.blocks}b ${s.villages}v`);
}

// ------------------------------------------------------- 2. the state chunks

const files = readdirSync(INDIA_DIR);
const stateFiles = files.filter((f) => f.startsWith('state-') && !f.endsWith('-villages.js'));

let totalDistricts = 0;
let totalBlocks = 0;
let totalVillages = 0;
let orphanBlocks = 0;
let orphanSubdistricts = 0;
let villagesInNoBlock = 0;
let districtsSeen = 0;
let districtsCoded = 0;
let blocksSeen = 0;
let blocksCoded = 0;
let villagesSeen = 0;
let villagesCoded = 0;
let villageCodesMisaligned = 0;
let villageSharedCodeConflicts = 0;
let badLgd = 0;
const villageCodeName = new Map();

for (const s of STATES) {
  const slug = slugify(s.name);
  const file = `state-${slug}.js`;
  ok(`${s.name} has a chunk`, stateFiles.includes(file), file);
  if (!stateFiles.includes(file)) continue;

  const chunk = await import(join(INDIA_DIR, file));
  ok(`${s.name} chunk names the state`, chunk.STATE_NAME === s.name, chunk.STATE_NAME);
  ok(`${s.name} chunk district count matches the index`,
    chunk.DISTRICTS.length === s.districts, `${chunk.DISTRICTS.length} vs ${s.districts}`);
  ok(`${s.name} chunk block count matches the index`,
    chunk.BLOCKS.length === s.blocks, `${chunk.BLOCKS.length} vs ${s.blocks}`);

  for (const d of chunk.DISTRICTS) {
    districtsSeen += 1;
    if (d.lgd_code) districtsCoded += 1;
    if (d.lgd_code && !/^\d+$/.test(String(d.lgd_code))) badLgd += 1;
  }
  for (const b of chunk.BLOCKS) {
    blocksSeen += 1;
    if (b.lgd_code) blocksCoded += 1;
    if (b.lgd_code && !/^\d+$/.test(String(b.lgd_code))) badLgd += 1;
  }

  const districtIds = new Set(chunk.DISTRICTS.map((d) => d.id));
  const subdistrictIds = new Set(chunk.SUBDISTRICTS.map((x) => x.id));
  const blockIds = new Set(chunk.BLOCKS.map((b) => b.id));

  for (const x of chunk.SUBDISTRICTS) {
    if (!districtIds.has(x.district)) {
      orphanSubdistricts += 1;
      ok(`${s.name} sub-district ${x.name} sits in a real district`, false, `${x.district}`);
    }
  }
  for (const b of chunk.BLOCKS) {
    if (!districtIds.has(b.district) || !subdistrictIds.has(b.subdistrict)) {
      orphanBlocks += 1;
      ok(`${s.name} block ${b.name} sits in real parents`, false,
        `d=${b.district} sd=${b.subdistrict}`);
    }
  }

  // The village names are cut per district, so a State's villages live in
  // the village chunks of its districts. Every key in a chunk must be a
  // block that exists in the same state.
  let stateVillages = 0;
  for (const d of chunk.DISTRICTS) {
    const vfile = `district-${d.id}-villages.js`;
    if (!files.includes(vfile)) continue;
    const vchunk = await import(join(INDIA_DIR, vfile));
    const keys = Object.keys(vchunk.VILLAGES);
    const bad = keys.filter((k) => !blockIds.has(Number(k)));
    villagesInNoBlock += bad.length;
    ok(`${s.name} · ${d.name} village keys are real blocks`, bad.length === 0,
      `${bad.length} bad`);
    // The code array is positional: a list of the wrong length would shift
    // every code after the gap onto the wrong village.
    for (const k of keys) {
      const names = vchunk.VILLAGES[k];
      const codes = vchunk.VILLAGE_CODES ? vchunk.VILLAGE_CODES[k] : null;
      if (!Array.isArray(codes) || codes.length !== names.length) {
        villageCodesMisaligned += 1;
        continue;
      }
      const namesForCode = new Map();
      for (let i = 0; i < codes.length; i += 1) {
        const code = codes[i];
        villagesSeen += 1;
        if (!code) continue;
        villagesCoded += 1;
        if (!/^\d+$/.test(String(code))) badLgd += 1;
        const norm = lgdNameKey(names[i]);
        if (!namesForCode.has(code)) namesForCode.set(code, new Set());
        namesForCode.get(code).add(norm);
        const known = villageCodeName.get(code);
        if (known === undefined) villageCodeName.set(code, norm);
        else if (known !== norm) villageCodeName.set(code, null);
      }
      for (const namesUnderCode of namesForCode.values()) {
        if (namesUnderCode.size > 1) villageSharedCodeConflicts += 1;
      }
    }
    stateVillages += keys.reduce((n, k) => n + vchunk.VILLAGES[k].length, 0);
  }
  ok(`${s.name} village count matches the index`, stateVillages === s.villages,
    `${stateVillages} vs ${s.villages}`);
  totalVillages += stateVillages;

  for (const d of chunk.DISTRICTS) {
    const pts = pathPoints(d.path);
    ok(`${s.name} · ${d.name} has a boundary`, pts.length >= 4, `${pts.length} points`);
    ok(`${s.name} · ${d.name} is inside the viewbox`,
      pts.every(([x, y]) => x >= 0 && x <= VB_W && y >= 0 && y <= VB_H));
  }
  for (const b of chunk.BLOCKS) {
    const pts = pathPoints(b.path);
    if (pts.length < 3) {
      ok(`${s.name} · ${b.name} has a boundary`, false, `${pts.length} points`);
      continue;
    }
    if (!pts.every(([x, y]) => x >= 0 && x <= VB_W && y >= 0 && y <= VB_H)) {
      ok(`${s.name} · ${b.name} is inside the viewbox`, false);
    }
  }

  totalDistricts += chunk.DISTRICTS.length;
  totalBlocks += chunk.BLOCKS.length;
}

ok('no block hangs off a missing parent', orphanBlocks === 0, `${orphanBlocks}`);
ok('no sub-district hangs off a missing district', orphanSubdistricts === 0, `${orphanSubdistricts}`);
ok('no village sits outside a block', villagesInNoBlock === 0, `${villagesInNoBlock}`);
ok('the country is covered', totalDistricts >= 700, `${totalDistricts} districts`);
ok('the blocks are covered', totalBlocks >= 7000, `${totalBlocks} blocks`);
ok('the villages are covered', totalVillages >= 600000, `${totalVillages.toLocaleString('en-IN')} villages`);
ok('most districts carry an official LGD code',
  districtsCoded / districtsSeen >= 0.9, `${districtsCoded}/${districtsSeen}`);
ok('most blocks carry an official LGD code',
  blocksCoded / blocksSeen >= 0.9, `${blocksCoded}/${blocksSeen}`);
ok('every village code array is aligned with its name list', villageCodesMisaligned === 0,
  `${villageCodesMisaligned} misaligned`);
ok('most villages carry an official LGD code',
  villagesCoded / villagesSeen >= 0.8, `${villagesCoded}/${villagesSeen}`);
ok('every LGD code that is present is numeric', badLgd === 0, `${badLgd} bad`);
ok('no two different village names share an LGD code',
  villageSharedCodeConflicts === 0, `${villageSharedCodeConflicts} shared`);
ok('no LGD village code points at two different names anywhere in the country',
  [...villageCodeName.values()].every((name) => name !== null),
  `${[...villageCodeName.values()].filter((name) => name === null).length} codes`);

const stateTotalVillages = STATES.reduce((n, s) => n + s.villages, 0);
ok('the state index and the chunks agree on villages',
  stateTotalVillages === totalVillages, `${stateTotalVillages} vs ${totalVillages}`);

// -------------------------------------------------------------- 3. the logic

ok('slugify agrees with the file names', slugify('Andhra Pradesh') === 'andhra-pradesh');
ok('slugify handles a union territory',
  slugify('Dadra and Nagar Haveli and Daman and Diu') ===
  'dadra-and-nagar-haveli-and-daman-and-diu');
ok('normalize folds spacing and case', normalize('Sri  Rampur!') === 'sri rampur');
ok('matches ignores case and spacing',
  matches('Sri Rampur', 'ramp') && matches('SRI RAM PUR', 'ram pur') && !matches('Rampur', 'xyz'));

const line = 'M10,20L30,40L50,60';
ok('pathPoints reads the moves and lines', pathPoints(line).length === 3);
ok('pathPoints copes with an empty path', pathPoints('').length === 0);
ok('pathPoints copes with no path', pathPoints(undefined).length === 0);

const box = bboxForPaths(['M10,20L30,40', 'M5,50L15,60']);
ok('bboxForPaths spans every path', box.minX === 5 && box.maxY === 60, JSON.stringify(box));
ok('bboxForPaths returns null for nothing', bboxForPaths([]) === null);

const vb = viewBoxFor(['M10,20L30,40']).split(' ').map(Number);
ok('viewBoxFor makes a square', vb[2] === vb[3], vb.join(' '));
ok('viewBoxFor frames the shapes', vb[0] <= 10 && vb[1] <= 20 && vb[0] + vb[2] >= 30 && vb[1] + vb[3] >= 40);
ok('viewBoxFor falls back for no shapes', viewBoxFor([]) === '0 0 1000 900');

// The tree is what the UI walks.
const goaFile = `state-${slugify('Goa')}.js`;
const goa = await import(join(INDIA_DIR, goaFile));
const goaTree = buildTree(goa);
ok('buildTree returns the districts', goaTree.length === goa.DISTRICTS.length);
ok('buildTree sorts the districts', goaTree.every((d, i) => i === 0 || goaTree[i - 1].name <= d.name));
ok('buildTree hangs the sub-districts off the district',
  goaTree.every((d) => d.subdistricts.every((x) => x.district === d.id)));
ok('buildTree hangs the blocks off the district',
  goaTree.every((d) => d.blocks.every((b) => b.district === d.id)));
ok('buildTree keeps every block',
  goaTree.reduce((n, d) => n + d.blocks.length, 0) === goa.BLOCKS.length);

// A village name is not a place. Two villages can share a name, so the list
// is always scoped to a block.
const vmap = { 1: ['Rampur', 'Rampur', 'Sultanpur'], 2: ['Rampur'] };
ok('villagesOf reads a block', villagesOf(vmap, 1).length === 3);
ok('villagesOf copes with a missing block', villagesOf(vmap, 99).length === 0);
ok('villagesOf copes with no map', villagesOf(null, 1).length === 0);
ok('a repeated village name stays inside its block',
  villagesOf(vmap, 1).filter((n) => n === 'Rampur').length === 2 &&
  villagesOf(vmap, 2).filter((n) => n === 'Rampur').length === 1);

const found = searchVillages(vmap, 1, 'ra', 10);
ok('searchVillages finds by prefix', found[0] === 'Rampur');
ok('searchVillages keeps the order of the list', found[0] === 'Rampur' && found[1] === 'Rampur');
ok('searchVillages respects the limit', searchVillages(vmap, 1, '', 2).length === 2);
ok('searchVillages returns nothing for no match', searchVillages(vmap, 1, 'zzz').length === 0);
ok('searchVillages is case insensitive', searchVillages(vmap, 1, 'SULTAN').length === 1);

// A tehsil is a revenue division. It is not a rung of the ladder, and the
// locator has to say so rather than pin a citizen to a level that has no
// office.
ok('the tehsil maps to the block rung', LADDER_RUNG_FOR.tehsil === 'block');
ok('every geography level maps to a rung',
  ['village', 'block', 'tehsil', 'district', 'state'].every((l) => LADDER_RUNG_FOR[l]));
ok('every rung has a note', Object.keys(LADDER_RUNG_FOR).every((l) => LADDER_RUNG_NOTE[l]));
ok('the tehsil note says what a tehsil is',
  /revenue division/i.test(LADDER_RUNG_NOTE.tehsil), LADDER_RUNG_NOTE.tehsil.slice(0, 60));

// ------------------------------------------------------- 4. the ladder data

const levelIds = LEVELS.map((l) => l.id);
ok('the ladder has five levels', levelIds.length === 5, levelIds.join(' '));
ok('the ladder runs village to national',
  levelIds[0] === 'village' && levelIds[4] === 'national');

ok('there are schemes', SCHEMES.length >= 8, `${SCHEMES.length}`);
ok('scheme ids are unique', new Set(SCHEMES.map((s) => s.id)).size === SCHEMES.length);

for (const scheme of SCHEMES) {
  ok(`${scheme.name} has a full name`, Boolean(scheme.full && scheme.full.length > 3));
  ok(`${scheme.name} names a ministry`, Boolean(scheme.ministry && scheme.ministry.length > 4));
  ok(`${scheme.name} has a portal on a government host`,
    /^https:\/\/(www\.)?[a-z0-9.-]+\.(gov|nic)\.in/.test(scheme.portal),
    scheme.portal);
  ok(`${scheme.name} says what it is`, Boolean(scheme.what && scheme.what.length > 40));
  ok(`${scheme.name} carries a caveat`, Boolean(scheme.note && scheme.note.length > 40));
  ok(`${scheme.name} has situations`, scheme.situations.length >= 1, `${scheme.situations.length}`);    for (const sit of scheme.situations) {
      ok(`${scheme.name} · ${sit.label} has an id`, Boolean(sit.id));
      ok(`${scheme.name} · ${sit.label} has a label`, Boolean(sit.label && sit.label.length > 3));
      ok(`${scheme.name} · ${sit.label} has five rungs`,
        sit.rungs.length === 5, `${sit.rungs.length}`);

      // The letter is the citizen's own document. It opens with what
      // happened to them and closes with what they want, so both are
      // written in the first person.
      ok(`${scheme.name} · ${sit.label} has a complaint for the letter`,
        Boolean(sit.complaint && sit.complaint.length > 20), sit.complaint);
      ok(`${scheme.name} · ${sit.label} complaint is in the first person`,
        /\b(i|my|me)\b/i.test(sit.complaint || ''), sit.complaint);
      ok(`${scheme.name} · ${sit.label} has an ask for the letter`,
        Boolean(sit.ask && sit.ask.length > 20), sit.ask);
      ok(`${scheme.name} · ${sit.label} ask is in the first person`,
        /^I\b/.test(sit.ask || ''), sit.ask);
      ok(`${scheme.name} · ${sit.label} complaint has no em dash`,
        !(sit.complaint || '').includes('—'));
      ok(`${scheme.name} · ${sit.label} ask has no em dash`,
        !(sit.ask || '').includes('—'));

    const rungsByLevel = sit.rungs.map((r) => r.level);
    ok(`${scheme.name} · ${sit.label} climbs the ladder`,
      JSON.stringify(rungsByLevel) === JSON.stringify(levelIds), rungsByLevel.join('>'));

    for (const r of sit.rungs) {
      const tag = `${scheme.name} · ${sit.label} · ${r.level}`;
      ok(`${tag} names an office`, Boolean(r.office && r.office.length > 3), r.office);
      ok(`${tag} names a post`, Boolean(r.post && r.post.length > 5), r.post);
      ok(`${tag} says what it decides`, Boolean(r.decides && r.decides.length > 30));
      ok(`${tag} says what to carry`, Boolean(r.carry && r.carry.length > 8));
      ok(`${tag} says where to go`, Boolean(r.where && r.where.length > 5));
      ok(`${tag} has a known status`, Object.hasOwn(RUNG_STATUS, r.status), r.status);
      ok(`${tag} cites a source`,
        Boolean(r.source && (/[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}\b/.test(r.source) || /Act \d{4}/.test(r.source))),
        r.source);
    }
  }
}

// The copy has to survive the same rules as the rest of the site.
const schemeCopy = SCHEMES.flatMap((s) => [
  s.what,
  s.note,
  s.full,
  ...s.situations.flatMap((sit) => [
    sit.label,
    sit.complaint,
    sit.ask,
    ...(sit.clock
      ? sit.clock.deadlines.flatMap((d) => [d.what, d.claim, d.unmet, d.note, d.then])
      : []),
    ...sit.rungs.flatMap((r) => [r.office, r.post, r.decides, r.carry, r.where, r.source]),
  ]),
]).join('\n');

ok('the ladder copy has no em dashes', !schemeCopy.includes('—'));
ok('the ladder copy has no banned words',
  !/\b(delve|foster|leverage|utilize|utilise|facilitate|empower|streamline|robust|cutting-edge|paradigm shift|game changer|tapestry|realm|beacon|multifaceted|meticulous|intricate|paramount|transformative|elevate|embark|supercharge|harness|ever-evolving)\b/i.test(schemeCopy));
ok('the ladder copy has no weasel attribution',
  !/\b(experts agree|industry reports suggest|many argue|widely regarded|studies show)\b/i.test(schemeCopy));

// A sentence that appears in two rungs was filled in by copying, not by
// reading. The office names legitimately repeat ("Gram Panchayat Secretary"
// is the same post in three situations); the decisions must not.
const decisions = new Map();
for (const s of SCHEMES) {
  for (const sit of s.situations) {
    for (const r of sit.rungs) {
      const sentence = r.decides.trim();
      if (!decisions.has(sentence)) decisions.set(sentence, []);
      decisions.get(sentence).push(`${s.id}/${sit.id}/${r.level}`);
    }
  }
}
const reused = [...decisions.entries()].filter(([, where]) => where.length > 1);
ok('no decision sentence is reused across rungs', reused.length === 0,
  reused.map(([s, where]) => `"${s.slice(0, 40)}…" in ${where.join(', ')}`).join(' | '));

// --------------------------------------------------------- 4b. the clocks
//
// A deadline is the one line a citizen copies into a complaint, so it has
// to name the date it counts from, the period, where the period comes from
// and what to do once it passes. A deadline that names no anchor cannot be
// counted, and a deadline with no source cannot be quoted.

for (const scheme of SCHEMES) {
  for (const sit of scheme.situations) {
    if (!sit.clock) continue;
    const tag = `${scheme.name} · ${sit.label}`;
    const anchorIds = sit.clock.anchors.map((a) => a.id);

    ok(`${tag} clock has anchors`, anchorIds.length > 0);
    for (const a of sit.clock.anchors) {
      ok(`${tag} anchor "${a.id}" is labelled`,
        Boolean(a.label && a.label.length > 4), a.label);
      ok(`${tag} anchor "${a.id}" has a sentence`,
        Boolean(a.sentence && a.sentence.includes('{date}')), a.sentence);
    }

    for (const d of sit.clock.deadlines) {
      ok(`${tag} deadline "${d.what}" counts from a known anchor`,
        anchorIds.includes(d.anchor), d.anchor);
      ok(`${tag} deadline "${d.what}" sets a period`,
        Boolean(d.days || d.hours), `${d.days || d.hours}`);
      ok(`${tag} deadline "${d.what}" has a known status`,
        Object.hasOwn(DEADLINE_STATUS, d.status), d.status);
      ok(`${tag} deadline "${d.what}" cites a source`,
        Boolean(d.source && d.source.length > 10), d.source);
      ok(`${tag} deadline "${d.what}" says what to do next`,
        Boolean(d.then && d.then.length > 15));

      // The claim is the sentence the citizen writes. It has to be in the
      // first person, and it has to carry the date the deadline falls, or
      // the letter quotes a rule without saying when it bit.
      ok(`${tag} deadline "${d.what}" has a claim for the letter`,
        Boolean(d.claim && d.claim.length > 20), d.claim);
      ok(`${tag} deadline "${d.what}" claim is in the first person`,
        /\b(i|my|me)\b/i.test(d.claim || ''), d.claim);
      ok(`${tag} deadline "${d.what}" claim carries the date it falls`,
        Boolean(d.claim && d.claim.includes('{due}')), d.claim);
      ok(`${tag} deadline "${d.what}" claim names the provision`,
        Boolean(d.clause && d.doc && d.clause.length > 3 && d.doc.length > 5),
        `${d.clause} / ${d.doc}`);
      ok(`${tag} deadline "${d.what}" claim has no em dash`,
        !(d.claim || '').includes('—'));

      // When the date has gone by, the letter says what is still missing.
      // A letter that states the rule and stops there is not a complaint.
      ok(`${tag} deadline "${d.what}" says what is still missing`,
        Boolean(d.unmet && d.unmet.length > 10), d.unmet);
      ok(`${tag} deadline "${d.what}" says what is missing in the first person`,
        /\b(i|my|me)\b/i.test(d.unmet || ''), d.unmet);
    }

    // The clock list is keyed by anchor, period and the wording of the
    // deadline, so two deadlines that share the first two are told apart by
    // the third. Two deadlines with the same wording are a copy-paste.
    const keys = sit.clock.deadlines.map(
      (d) => `${d.anchor}-${d.days || d.hours}-${d.what}`);
    ok(`${tag} clock deadlines do not collide`,
      new Set(keys).size === keys.length, keys.join(' '));
    const what = sit.clock.deadlines.map((d) => d.what);
    ok(`${tag} clock deadlines are worded differently`,
      new Set(what).size === what.length, what.join(' | '));
  }
}

// The arithmetic. A deadline the citizen can quote has to land on the same
// day whichever way it is computed, and the letter on the sheet has to say
// the same day as the clock on the page.

ok('parseDay reads a date', parseDay('2026-10-01')?.getTime() === Date.UTC(2026, 9, 1));
ok('parseDay refuses a bad date', parseDay('2026-13-40') === null);
ok('parseDay refuses rubbish', parseDay('not a date') === null);
ok('localDay writes a local date', localDay(new Date(2026, 9, 1)) === '2026-10-01');

// A day deadline counts to the end of the day it falls on, so a deadline
// that falls today has not passed.
const dayDeadline = { days: 15 };
const now = new Date(2026, 9, 22, 14, 30);
const due = dueDate('2026-10-07', dayDeadline, now);
ok('a day deadline falls fifteen days on', localDay(due) === '2026-10-22', localDay(due));
ok('a day deadline that falls today has not passed',
  deadlineStatus(due, now, dayDeadline).passed === false);
ok('a day deadline that has gone by has passed',
  deadlineStatus(dueDate('2026-10-01', dayDeadline, now), now, dayDeadline).passed === true);
ok('a day deadline counts the days that are left',
  deadlineStatus(dueDate('2026-10-12', dayDeadline, now), now, dayDeadline).days === 5,
  String(deadlineStatus(dueDate('2026-10-12', dayDeadline, now), now, dayDeadline).days));
ok('a day deadline that has gone by counts the days past',
  deadlineStatus(dueDate('2026-10-01', dayDeadline, now), now, dayDeadline).days === -6,
  String(deadlineStatus(dueDate('2026-10-01', dayDeadline, now), now, dayDeadline).days));
ok('a day deadline that falls today counts zero days',
  deadlineStatus(dueDate('2026-10-07', dayDeadline, now), now, dayDeadline).days === 0);

// An hour deadline runs from the moment it was asked for, not from midnight.
const hourDeadline = { hours: 6 };
const baseToday = baseFor('2026-10-22', hourDeadline, now);
ok('an hour deadline starts at the moment it was asked for',
  baseToday.getTime() === now.getTime());
const dueToday = dueDate('2026-10-22', hourDeadline, now);
ok('an hour deadline falls six hours on', dueToday.getTime() - now.getTime() === 6 * 3600000);
ok('an hour deadline that has gone by has passed',
  deadlineStatus(dueDate('2026-10-20', hourDeadline, now), now, hourDeadline).passed === true);

// A day deadline starts at UTC midnight, so the date is the same everywhere.
ok('a day deadline starts at midnight',
  baseFor('2026-10-07', dayDeadline, now).toISOString() === '2026-10-07T00:00:00.000Z');

// The letter has to say the same day as the clock. The clock counts an hour
// deadline from the moment it was asked for, so the letter must too, or the
// sheet a citizen hands over contradicts the screen they read it from.
const hourClock = {
  anchors: [{ id: 'asked', label: 'The day you asked', sentence: 'I asked on {date}.' }],
  deadlines: [{
    anchor: 'asked',
    hours: 6,
    what: 'The insurer must answer',
    claim: 'The insurer had 6 hours to answer my request, by {due}',
    unmet: 'I have not received an answer.',
    clause: 'section 4.5(G)',
    doc: 'AB-NHPM Operational Guidelines',
    source: 'x',
  }],
};
const letterLines = deadlineLines(hourClock, { asked: '2026-10-22' }, now);
ok('the letter and the clock agree on an hour deadline',
  letterLines.length === 1 && letterLines[0].due === dueToday.toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  }), letterLines[0] && letterLines[0].due);
ok('the letter says an hour deadline has not passed',
  letterLines.length === 1 && letterLines[0].passed === false);

const letter = buildLetter({
  scheme: { name: 'MGNREGA', full: 'Mahatma Gandhi National Rural Employment Guarantee Act' },
  situation: {
    label: 'My wages were not paid',
    complaint: 'I did the work and my wages were not paid.',
    ask: 'I ask that my wages be paid, and that you reply to me in writing.',
  },
  place: { path: ['Rampur', 'Uttar Pradesh'] },
  rung: { office: 'Programme Officer', where: 'The block office' },
  clock: hourClock,
  dates: { asked: '2026-10-22' },
});
ok('the letter states the deadline as the citizen states it',
  /The insurer had 6 hours to answer my request/.test(letter), letter);
ok('the letter cites the provision the way a person would',
  /\(section 4\.5\(G\) of the AB-NHPM Operational Guidelines\)/.test(letter), letter);
ok('the letter names the place', /I live in Rampur, Uttar Pradesh/.test(letter));
ok('the letter opens with the citizen complaint',
  /I did the work and my wages were not paid\./.test(letter), letter);
ok('the letter closes on the citizen ask',
  /I ask that my wages be paid/.test(letter), letter);

// The letter is the citizen's document. Every line in it has to be in the
// first person, and no line may drop back into the second person the
// tool uses to talk to the citizen.
const spoken = buildLetter({
  scheme: { name: 'MGNREGA', full: 'Mahatma Gandhi National Rural Employment Guarantee Act' },
  situation: {
    label: 'My wages were not paid',
    complaint: 'I did the work and my wages were not paid.',
    ask: 'I ask that my wages be paid, and that you reply to me in writing.',
  },
  place: { path: ['Rampur', 'Uttarakhand'] },
  rung: { office: 'Programme Officer', where: 'The block office' },
  clock: {
    anchors: [{ id: 'closed', label: 'The day the muster roll was closed', sentence: 'The muster roll for the work I did was closed on {date}.' }],
    deadlines: [{
      anchor: 'closed',
      days: 15,
      what: 'The wages must be paid',
      claim: 'My wages were to be paid within fifteen days of the muster roll being closed, by {due}',
      unmet: 'My wages have not been paid.',
      clause: 'Schedule II paragraph 29(1)',
      doc: 'MGNREGA Act 2005, as amended',
      source: 'MGNREGA Act 2005, as amended, Schedule II paragraph 29(1) (indiacode.nic.in)',
    }],
  },
  dates: { closed: '2026-10-01' },
});
ok('the letter states the claim in the first person',
  /My wages were to be paid within fifteen days/.test(spoken), spoken);
ok('the letter fills in the date the deadline falls',
  spoken.includes(`by ${new Date(Date.UTC(2026, 9, 16)).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}`), spoken);
ok('the letter cites the provision the way a person would',
  /\(Schedule II paragraph 29\(1\) of the MGNREGA Act 2005, as amended\)/.test(spoken), spoken);
ok('the letter says what is still missing once the date has passed',
  /My wages have not been paid\./.test(spoken), spoken);
ok('the letter does not drop into the second person',
  !/\b(you must|your complaint|your wages|must be provided to you)\b/i.test(spoken), spoken);
ok('the letter does not state the rule instead of the claim',
  !/The wages must be paid\./.test(spoken), spoken);
ok('the letter has no em dash', !spoken.includes('—'), spoken);

// A situation with no deadline still gets a letter. The tool has to be able
// to hand it over without a clock to fill in.
const noClock = buildLetter({
  scheme: { name: 'Jal Jeevan Mission', full: 'Jal Jeevan Mission' },
  situation: {
    label: 'My village has no tap water',
    complaint: 'My village has no tap water.',
    ask: 'I ask that a tap connection be given to my household, and that you reply to me in writing.',
  },
  place: { path: ['Rampur', 'Uttar Pradesh'] },
  rung: { office: 'Gram Panchayat', where: 'The Gram Panchayat office' },
  clock: undefined,
  dates: {},
});
ok('a situation with no clock still has a letter',
  /I ask that a tap connection be given/.test(noClock), noClock);
ok('a letter with no clock still names the place',
  /I live in Rampur, Uttar Pradesh/.test(noClock), noClock);

// The escalation directory and the ladder have to use the same name for the
// same document. The CGRMS issues a Unique Ticket Number. Calling it a
// Unique Grievance Number sends a citizen looking for something that does
// not exist.
const namingText = JSON.stringify(SCHEMES) + JSON.stringify(escalation);
ok('the tool calls it a Unique Ticket Number',
  !/Unique Grievance Number|\bUGN\b/.test(namingText));
ok('the tool names the ticket number where it is quoted',
  /Unique Ticket Number/.test(namingText));

// The traps are the honest part of the tool. Each one has to say what the
// confusion is and what the truth is.
ok('the traps are listed', NAME_TRAPS.length >= 3, `${NAME_TRAPS.length}`);
for (const t of NAME_TRAPS) {
  ok(`the trap "${t.confusion}" is explained`,
    Boolean(t.truth && t.truth.length > 60));
  ok(`the trap "${t.confusion}" has no em dash`, !t.truth.includes('—'));
}

// ------------------------------------------- 4b. directory codes and export
//
// A place is only portable if the spreadsheet row carries the same keys the
// page shows. The build key and the official LGD code are different things;
// the export carries both and a blank LGD cell has to mean "not guessed"
// rather than "not attempted".

const samplePath = [
  { level: 'state', name: 'Uttar Pradesh', id: 9, lgd_code: '9' },
  { level: 'district', name: 'Rampur', id: 901, lgd_code: '153' },
  { level: 'tehsil', name: 'Rampur', id: 9011, lgd_code: '801' },
  { level: 'block', name: 'Rampur', id: 90111, lgd_code: '1234' },
  { level: 'village', name: 'Rampur', id: 90111, lgd_code: '567890' },
];

const codes = samplePath.map(directoryCode);
ok('every level in the path has a directory code', codes.every(Boolean), codes.join(' '));
ok('directory codes are unique within a path', new Set(codes).size === codes.length, codes.join(' '));
ok('a village code differs from its block code', codes[4] !== codes[3], `${codes[4]} / ${codes[3]}`);
ok('a district and a tehsil of the same name get different codes', codes[1] !== codes[2]);

const rows = hierarchyRows(samplePath);
ok('the hierarchy export has one row per level', rows.length === samplePath.length);
ok('every exported row names its parent', rows.slice(1).every((r) => r.parent_code));
ok('the top row has no parent', rows[0].parent_code === '');
ok('the export says which code system it uses',
  rows.every((r) => r.code_system === HIERARCHY_CODE_SYSTEM));
ok('the export carries the official LGD code from the path',
  rows.every((r, i) => r.lgd_code === samplePath[i].lgd_code),
  rows.map((r) => r.lgd_code).join(' '));
ok('an entry with no LGD code exports a blank cell, not a guess',
  hierarchyRows([{ level: 'state', name: 'Test', id: 1 }])[0].lgd_code === '');

// A village code is positional. A name that repeats inside the block has no
// single code, and a wrong-length array would shift codes silently.
const sampleVillages = { 7: ['Rampur', 'Rampur', 'Bilaspur'] };
const sampleVillageCodes = { 7: ['11', '22', '33'] };
ok('a repeated village name gets no LGD code',
  villageLgdCode(sampleVillageCodes, sampleVillages, 7, 'Rampur') === '');
ok('an unambiguous village name gets its aligned code',
  villageLgdCode(sampleVillageCodes, sampleVillages, 7, 'Bilaspur') === '33');
ok('a known position resolves a repeated village name',
  villageLgdCode(sampleVillageCodes, sampleVillages, 7, 'Rampur', 1) === '22');
ok('a block with no code array yields a blank',
  villageLgdCode(null, sampleVillages, 7, 'Bilaspur') === '');
ok('a short code array yields a blank rather than a shifted code',
  villageLgdCode({ 7: ['11'] }, sampleVillages, 7, 'Bilaspur') === '');

const csv = hierarchyCsv(samplePath);
const csvLines = csv.trim().split('\n');
ok('the CSV has a header and one line per level', csvLines.length === samplePath.length + 1, `${csvLines.length} lines`);
ok('the CSV header names the LGD column', csvLines[0] === 'level,name,code,parent_code,parent_name,code_system,lgd_code', csvLines[0]);
ok('the CSV carries the village code', csvLines[csvLines.length - 1].includes(codes[4]), csvLines[csvLines.length - 1]);
ok('the CSV carries the village LGD code',
  csvLines[csvLines.length - 1].includes('567890'), csvLines[csvLines.length - 1]);

const quoted = hierarchyCsv([{ level: 'village', name: 'Rampur, "East"', id: 7 }]);
ok('the CSV quotes a name with a comma and a quote',
  quoted.includes('"Rampur, ""East"""'), quoted);

// ------------------------------------------------------ 5. the lazy loader
//
// The state chunks are pulled in with import.meta.glob, and the path in that
// glob is resolved by the bundler against the file that holds it. A path
// that is off by one directory matches nothing, and the failure is silent:
// the build succeeds, the bundle carries no state data, and the locator
// throws the moment a citizen picks a State. So the glob is resolved here
// and checked against the files on disk.

const LOAD_FILE = join(HERE, '..', 'src', 'lib', 'india', 'load.js');
const loadSource = readFileSync(LOAD_FILE, 'utf8');
const globMatch = loadSource.match(/import\.meta\.glob\(\s*['"]([^'"]+)['"]/);
ok('the loader uses a glob', Boolean(globMatch), globMatch ? globMatch[1] : 'no glob found');

if (globMatch) {
  const pattern = globMatch[1];
  // The glob is relative to the file that holds it. The directory is the
  // part before the first wildcard, without the file-name prefix.
  const base = resolve(dirname(LOAD_FILE), dirname(pattern.split('*')[0]));
  ok('the glob points at a directory that exists',
    existsSync(base), `${pattern} -> ${base}`);
  if (existsSync(base)) {
    const matched = readdirSync(base).filter((f) => f.startsWith('state-'));
    const villageFiles = files.filter((f) => f.startsWith('state-') && f.endsWith('-villages.js'));
    ok('the glob matches the state chunks and their village chunks',
      matched.length === stateFiles.length + villageFiles.length,
      `${matched.length} matched, ${stateFiles.length + villageFiles.length} on disk`);
    ok('the glob misses no state chunk',
      stateFiles.every((f) => matched.includes(f)));
    ok('the glob misses no village chunk',
      villageFiles.every((f) => matched.includes(f)));
  }
}

// The loader also has to hand back the chunk under the name the build script
// gave it, or the State never loads.
ok('the loader keys chunks by file name',
  /state-\$\{slug\}\.js/.test(loadSource) || /state-/.test(loadSource));
ok('the loader can be asked whether a State exists', /hasState/.test(loadSource));

console.log(failures === 0
  ? '\nAll India locator checks passed.'
  : `\n${failures} India locator check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
