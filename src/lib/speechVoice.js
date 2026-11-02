// The browser's voice list is inconsistent about region tags: the same Hindi
// voice may arrive as `hi`, `hi-IN`, `hi_IN`, or `hi-Deva-IN`. Prefer the exact
// regional match the deck asked for, then accept any voice for the same base
// language. Never cross languages: a Hindi voice is not a Bengali substitute.
//
// Chrome also fills that list lazily. The first language click is often the call
// that starts the engine, so waiting for the list is part of matching it.

export const VOICE_WAIT_MS = 1200;

export const waitForVoices = (synth, timeoutMs = VOICE_WAIT_MS) => {
  const ready = synth.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);

  return new Promise((resolve) => {
    let settled = false;
    let timer;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices());
    };

    timer = setTimeout(finish, timeoutMs);
    synth.addEventListener?.('voiceschanged', finish);
  });
};

export const normaliseVoiceTag = (lang) =>
  String(lang || '')
    .replace(/_/g, '-')
    .trim()
    .toLowerCase();

export const voiceBaseLanguage = (lang) => normaliseVoiceTag(lang).split('-')[0];

export const findVoiceForLanguage = (voices = [], code, tag) => {
  const wanted = normaliseVoiceTag(tag);
  const base = normaliseVoiceTag(code);

  return (
    voices.find((voice) => normaliseVoiceTag(voice.lang) === wanted) ||
    voices.find((voice) => voiceBaseLanguage(voice.lang) === base) ||
    null
  );
};
