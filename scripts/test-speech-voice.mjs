// Regression test for the language deck's voice matcher and voice-list wait.
//
// Browsers expose the same voice under different tags: `hi`, `hi-IN`, `hi_IN`,
// or `hi-Deva-IN`. These checks hold the matcher to two rules: prefer the exact
// regional tag, but accept a voice for the same base language; never let one
// language stand in for another. They also hold the wait to its contract: use a
// warm list at once, wait for `voiceschanged` when the list is empty, and fall
// back at the timeout rather than hanging forever.
//
// Run: node scripts/test-speech-voice.mjs

import { findVoiceForLanguage, waitForVoices } from '../src/lib/speechVoice.js';

let checks = 0;
let failures = 0;

const ok = (name, condition, detail = '') => {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const voice = (lang, name = lang) => ({ lang, name });

console.log("the language deck's voice matcher");

const hi = voice('hi', 'Base Hindi');
const hiIn = voice('hi-IN', 'Regional Hindi');
ok(
  'an exact regional tag wins over a base-language voice',
  findVoiceForLanguage([hi, hiIn], 'hi', 'hi-IN') === hiIn,
);
ok(
  'a base-language voice satisfies a regional request',
  findVoiceForLanguage([hi], 'hi', 'hi-IN') === hi,
);
ok(
  'an underscore regional tag matches',
  findVoiceForLanguage([voice('hi_IN')], 'hi', 'hi-IN')?.lang === 'hi_IN',
);
ok(
  'a script-tagged voice matches by its base language',
  findVoiceForLanguage([voice('hi-Deva-IN')], 'hi', 'hi-IN')?.lang === 'hi-Deva-IN',
);
ok(
  'case and surrounding whitespace are ignored',
  findVoiceForLanguage([voice(' HI_in ')], 'hi', 'hi-IN')?.lang === ' HI_in ',
);
ok(
  'a voice for another language is refused',
  findVoiceForLanguage([hi], 'bn', 'bn-IN') === null,
);
ok(
  'an empty list decides nothing',
  findVoiceForLanguage([], 'hi', 'hi-IN') === null,
);

console.log("\nthe voice wait");

const fakeSynth = (initial = []) => {
  let voices = initial;
  const listeners = new Set();

  return {
    getVoices: () => voices,
    setVoices: (next) => {
      voices = next;
    },
    addEventListener: (type, fn) => {
      if (type === 'voiceschanged') listeners.add(fn);
    },
    removeEventListener: (type, fn) => {
      if (type === 'voiceschanged') listeners.delete(fn);
    },
    voicesChanged: () => {
      for (const fn of [...listeners]) fn();
    },
    listenerCount: () => listeners.size,
  };
};

const warm = fakeSynth([hi]);
const warmResult = await waitForVoices(warm, 50);
ok('an already-warm list resolves without waiting', warmResult[0] === hi);
ok('a warm list adds no listener', warm.listenerCount() === 0);

const delayed = fakeSynth([]);
const pending = waitForVoices(delayed, 250);
let resolved = false;
pending.then(() => {
  resolved = true;
});
await new Promise((resolve) => setTimeout(resolve, 25));
ok('an empty list does not resolve on its own', resolved === false);
ok('an empty list subscribes to voiceschanged', delayed.listenerCount() === 1);

delayed.setVoices([hi]);
delayed.voicesChanged();
const delayedResult = await pending;
ok('a late voiceschanged resolves with the new list', delayedResult[0] === hi);
ok('the listener is removed after the event', delayed.listenerCount() === 0);

const silent = fakeSynth([]);
const started = Date.now();
const silentResult = await waitForVoices(silent, 50);
const elapsed = Date.now() - started;
ok('a missing event falls back at the timeout', elapsed >= 40, `${elapsed}ms`);
ok('the timeout returns the list it has', Array.isArray(silentResult) && silentResult.length === 0);
ok('the listener is removed after the timeout', silent.listenerCount() === 0);
silent.voicesChanged();
ok('a late event after the timeout is ignored', silent.listenerCount() === 0);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
