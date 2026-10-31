// The name of a tool set in Indian scripts. The page head prints all eight;
// the index card prints four and keeps the other four behind a small +4
// toggle. Hover and keyboard focus still preview the second strip, but the
// toggle pins it open until it is dismissed. It is a specimen, not a language
// menu: each word carries its own lang attribute, and the separators are
// hidden from assistive technology so the words are read without punctuation.

import { useEffect, useId, useRef, useState } from 'react';

export default function ScriptSpecimen({
  scripts,
  label,
  className = '',
  collapsedCount = 0,
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef(null);

  // A pinned specimen closes when the reader moves on. The check runs on
  // pointerdown, so a tap on another card dismisses this one before that
  // card's own control sees the click.
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [open]);

  if (!scripts?.length) return null;
  const split = collapsedCount > 0 && collapsedCount < scripts.length;
  const visible = split ? scripts.slice(0, collapsedCount) : scripts;
  const extra = split ? scripts.slice(collapsedCount) : [];

  const words = (entries, offset) =>
    entries.map(([lang, text], index) => {
      const beforeToggle = split && offset + index === visible.length - 1;
      return (
        <span key={lang} lang={lang}>
          {text}
          {!beforeToggle && offset + index < scripts.length - 1 ? (
            <span className="script-specimen-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
        </span>
      );
    });

  return (
    <div
      ref={rootRef}
      className={`script-specimen${open && split ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={label}
    >
      {words(visible, 0)}
      {extra.length > 0 ? (
        <>
          <button
            type="button"
            className="script-specimen-more"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? 'Hide' : 'Show'} ${extra.length} more scripts: ${label}`}
            onClick={() => setOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && open) {
                event.preventDefault();
                setOpen(false);
              }
            }}
          >
            {open ? '−' : '+'}{extra.length}
          </button>
          <span
            className="script-specimen-extra"
            id={panelId}
            aria-hidden={!open}
          >
            {words(extra, visible.length)}
          </span>
        </>
      ) : null}
    </div>
  );
}
