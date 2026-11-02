// A page reader, not a player: it collects the prose on the current screen and
// speaks it in the device's English voice. It stops on route changes, and it
// queues short utterances so a long report does not hit a browser's speech cap.

import { useEffect, useRef, useState } from 'react';
import { collectPageText, chunkForSpeech } from '../lib/pageSpeech';
import { findVoiceForLanguage, waitForVoices } from '../lib/speechVoice';

const hasSpeech = () =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window;

// A route chunk arrives after the masthead. Give the page body a moment to
// replace the route fallback so the reader does not announce "Loading…".
const waitForRouteContent = async (timeoutMs = 6000) => {
  const deadline = Date.now() + timeoutMs;
  while (document.querySelector('.route-fallback')) {
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return true;
};

export default function PageVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const runRef = useRef(0);
  const supported = hasSpeech();

  useEffect(
    () => () => {
      runRef.current += 1;
      if (hasSpeech()) window.speechSynthesis.cancel();
    },
    [],
  );

  if (!supported) return null;

  const stop = () => {
    runRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setNotice('Reading stopped.');
  };

  const start = async () => {
    const synth = window.speechSynthesis;
    runRef.current += 1;
    const run = runRef.current;
    synth.cancel();
    setSpeaking(true);
    setNotice('Preparing to read this page.');

    const pageReady = await waitForRouteContent();
    if (runRef.current !== run) return;
    if (!pageReady) {
      setSpeaking(false);
      setNotice('This page is still loading. Try again in a moment.');
      return;
    }

    const text = collectPageText(document.querySelector('main'));
    const chunks = chunkForSpeech(text);

    if (chunks.length === 0) {
      setSpeaking(false);
      setNotice('This page has no readable text.');
      return;
    }

    const voices = await waitForVoices(synth);
    if (runRef.current !== run) return;

    const voice = findVoiceForLanguage(voices, 'en', 'en-IN');
    if (voices.length > 0 && !voice) {
      setSpeaking(false);
      setNotice('No English voice is installed on this device.');
      return;
    }

    let index = 0;

    const readNext = () => {
      if (runRef.current !== run) return;
      if (index >= chunks.length) {
        setSpeaking(false);
        setNotice('Finished reading.');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      index += 1;
      utterance.lang = voice?.lang || 'en-IN';
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;

      utterance.onend = () => {
        if (runRef.current === run) readNext();
      };
      utterance.onerror = (event) => {
        if (runRef.current !== run) return;
        // The deck may cancel this voice when another language starts, and a
        // stop already invalidated the run. Either way, the control must not
        // keep saying Stop after the voice has gone.
        setSpeaking(false);
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          setNotice('The page voice could not play.');
        }
      };

      synth.speak(utterance);
    };

    setNotice('Reading this page.');
    readNext();
  };

  return (
    <>
      <button
        type="button"
        className="site-listen"
        aria-pressed={speaking}
        aria-label={speaking ? 'Stop reading this page' : 'Listen to this page'}
        title={speaking ? 'Stop reading this page' : 'Listen to this page'}
        onClick={() => (speaking ? stop() : start())}
      >
        <span className="site-listen-mark" aria-hidden="true">
          {speaking ? '■' : '▶'}
        </span>
        <span className="site-listen-text">{speaking ? 'Stop' : 'Listen'}</span>
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {notice}
      </span>
    </>
  );
}
