// The Eighth Schedule as a banknote-style ribbon: every language in its own
// script, one continuous band across the top of the home page. Each name is a
// button. It opens the house motto in that language on a paper deck under the
// band, and asks the device to read it in that language's voice.
//
// The ribbon is a toolbar, not 22 tab stops: one button is in the tab order,
// the arrow keys walk the band, and Enter or Space opens the deck. The deck is
// a region with its own controls; the motto is also announced through a live
// status line, so a screen reader hears the language and the text even when
// the browser has no voice for it.

import { useEffect, useRef, useState } from 'react';
import { LANGUAGES, LANGUAGE_BY_CODE } from '../data/languages';
import { MOTTOS, SPEECH_TAGS } from '../data/mottos';

const hasSpeech = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function ScheduleRibbon() {
  const [active, setActive] = useState(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const buttonsRef = useRef([]);
  const speechSeq = useRef(0);

  const entry = active ? LANGUAGE_BY_CODE[active] : null;
  const motto = active ? MOTTOS[active] : null;

  const stopSpeech = () => {
    speechSeq.current += 1;
    if (hasSpeech()) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const close = () => {
    const code = active;
    stopSpeech();
    setActive(null);
    setVoiceNote('');
    // Closing removes the deck under the reader's focus; put the hand back on
    // the name that opened it rather than dropping focus to the document.
    if (code) {
      const index = LANGUAGES.findIndex((language) => language.code === code);
      if (index >= 0) {
        setFocusIndex(index);
        buttonsRef.current[index]?.focus();
      }
    }
  };

  // Leaving Home should not leave a voice talking to the next page.
  useEffect(
    () => () => {
      speechSeq.current += 1;
      if (hasSpeech()) window.speechSynthesis.cancel();
    },
    [],
  );

  const speak = (code) => {
    const text = MOTTOS[code]?.text;
    const language = LANGUAGE_BY_CODE[code];
    if (!text || !language) return;

    setVoiceNote('');
    if (!hasSpeech()) {
      setSpeaking(false);
      setVoiceNote('This browser has no speech engine. The text is above.');
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    const seq = speechSeq.current + 1;
    speechSeq.current = seq;

    const tag = SPEECH_TAGS[code] || code;
    const normalise = (voice) => voice.lang.replace('_', '-').toLowerCase();
    const voices = synth.getVoices();
    const exact = tag.replace('_', '-').toLowerCase();
    const match =
      voices.find((voice) => normalise(voice) === exact) ||
      voices.find((voice) => normalise(voice).startsWith(`${code.toLowerCase()}-`));

    // A device can have a speech engine and still no voice for this language.
    // Saying the words in the wrong voice is worse than saying nothing, so the
    // deck keeps the text and explains the silence.
    if (voices.length > 0 && !match) {
      setSpeaking(false);
      setVoiceNote(
        `No ${language.name} voice is installed on this device. The text is above.`,
      );
      return;
    }

    // The band prints "THS - …"; the voice should hear words, not punctuation.
    // Strip the separator (and any en/em dash) before handing it to the engine.
    const spoken = text.replace(/\s*[-–—]\s*/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = match?.lang || tag;
    if (match) utterance.voice = match;
    utterance.rate = 0.9;

    utterance.onend = () => {
      if (speechSeq.current === seq) setSpeaking(false);
    };
    utterance.onerror = (event) => {
      if (speechSeq.current !== seq) return;
      setSpeaking(false);
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setVoiceNote('The voice could not play. The text is above.');
      }
    };

    synth.speak(utterance);
    setSpeaking(true);
  };

  const choose = (code) => {
    if (active === code) {
      close();
      return;
    }
    setActive(code);
    speak(code);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      close();
      return;
    }

    const last = LANGUAGES.length - 1;
    let next = null;

    if (event.key === 'ArrowRight') next = Math.min(last, focusIndex + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, focusIndex - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;

    event.preventDefault();
    setFocusIndex(next);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div className="schedule-ribbon">
      <div className="schedule-ribbon-inner">
        <span className="schedule-ribbon-seal" aria-hidden="true">
          <span className="schedule-ribbon-ordinal">VIII</span>
          <span className="schedule-ribbon-label">
            Eighth
            <br />
            Schedule
          </span>
        </span>

        <div
          className="schedule-ribbon-list"
          role="toolbar"
          aria-label="The 22 scheduled languages: open the motto in each"
        >
          {LANGUAGES.map(({ code, endonym, name, rtl }, index) => (
            <button
              key={code}
              type="button"
              className="schedule-ribbon-button"
              ref={(node) => {
                buttonsRef.current[index] = node;
              }}
              tabIndex={index === focusIndex ? 0 : -1}
              aria-expanded={active === code}
              aria-label={`${name}: ${active === code ? 'hide' : 'open'} the motto in ${name}`}
              onClick={() => {
                setFocusIndex(index);
                choose(code);
              }}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={onKeyDown}
            >
              <span
                className="schedule-ribbon-name"
                lang={code}
                dir={rtl ? 'rtl' : 'auto'}
              >
                {endonym}
              </span>
              <span className="schedule-ribbon-code">{code}</span>
            </button>
          ))}
        </div>

        <span className="schedule-ribbon-count" aria-hidden="true">
          <strong>22</strong>
          <span>languages</span>
        </span>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {entry && motto ? (
          <>
            <span lang="en">{entry.name}:</span>{' '}
            <span lang={active}>{motto.text}</span>
          </>
        ) : null}
      </p>

      {entry && motto && (
        <div
          className="schedule-motto"
          role="region"
          aria-label={`The motto in ${entry.name}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        >
          <div className="schedule-motto-inner">
            <div className="schedule-motto-copy">
              <span className="schedule-motto-kicker" lang="en">
                {entry.name} · {active.toUpperCase()}
              </span>
              <p className="schedule-motto-text" lang={active} dir={motto.dir}>
                {motto.text}
              </p>
              <span className="schedule-motto-gloss" lang="en">
                The fifth pillar of democracy
              </span>
            </div>

            <div className="schedule-motto-actions">
              <button
                type="button"
                className="schedule-motto-action"
                aria-label={
                  speaking
                    ? `Stop the ${entry.name} voice`
                    : `Hear the motto in ${entry.name}`
                }
                onClick={() => (speaking ? stopSpeech() : speak(active))}
              >
                {speaking ? 'Stop' : 'Hear it'}
              </button>
              <button
                type="button"
                className="schedule-motto-action is-quiet"
                onClick={close}
              >
                Close
              </button>
            </div>

            {voiceNote && (
              <p className="schedule-motto-note" role="status">
                {voiceNote}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
