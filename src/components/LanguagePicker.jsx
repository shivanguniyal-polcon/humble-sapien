import { useEffect, useRef, useState } from 'react';

// A keyboard-native replacement for a native <select>.
//
// A native select is not reliably operated by keys in every Chromium shell
// (the project's Playwright run ignored arrows, Space, Alt+Down and F4 on it).
// This keeps the compact select-sized control, but the button and listbox own
// their keys: arrows move, Enter/Space choose, Escape closes and returns focus
// to the button, and Tab leaves without a trap.
export default function LanguagePicker({
  id,
  label,
  note,
  locales,
  locale,
  onChange,
  className = '',
  labelClassName = 'meta',
  noteClassName = 'meta',
}) {
  const [open, setOpen] = useState(false);
  const [activeCode, setActiveCode] = useState(locale);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef({});
  const current = locales.find((entry) => entry.code === locale) || locales[0];
  const labelId = `${id}-label`;
  const currentId = `${id}-current`;
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (open) optionRefs.current[activeCode]?.focus();
  }, [open, activeCode]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !wrapperRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  const openPicker = () => {
    setActiveCode(locale);
    setOpen(true);
  };

  const choose = (code) => {
    onChange(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const moveActive = (step) => {
    const index = locales.findIndex((entry) => entry.code === activeCode);
    const next = (index + step + locales.length) % locales.length;
    setActiveCode(locales[next].code);
  };

  const onButtonKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!open) {
      openPicker();
      return;
    }
    moveActive(event.key === 'ArrowDown' ? 1 : -1);
  };

  const onOptionKeyDown = (event, code) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(code);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveCode(event.key === 'Home' ? locales[0].code : locales[locales.length - 1].code);
    }
  };

  return (
    <div className={className} ref={wrapperRef}>
      <label id={labelId} htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div
        className="sampark-cso-lang-picker"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <button
          id={id}
          ref={buttonRef}
          type="button"
          className="sampark-cso-lang-button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={`${labelId} ${currentId}`}
          onClick={() => (open ? setOpen(false) : openPicker())}
          onKeyDown={onButtonKeyDown}
        >
          <span id={currentId}>
            <span lang={current.code} dir={current.rtl ? 'rtl' : undefined}>
              {current.endonym}
            </span>{' · '}{current.label}
          </span>
          <span className="sampark-cso-lang-chevron" aria-hidden="true">▾</span>
        </button>
        {open && (
          <ul
            id={listboxId}
            className="sampark-cso-lang-listbox"
            role="listbox"
            aria-labelledby={labelId}
          >
            {locales.map((entry) => (
              <li
                key={entry.code}
                ref={(node) => { optionRefs.current[entry.code] = node; }}
                id={`${id}-option-${entry.code}`}
                role="option"
                aria-selected={entry.code === locale}
                tabIndex={-1}
                className="sampark-cso-lang-option"
                onClick={() => choose(entry.code)}
                onKeyDown={(event) => onOptionKeyDown(event, entry.code)}
              >
                <span lang={entry.code} dir={entry.rtl ? 'rtl' : undefined}>
                  {entry.endonym}
                </span>{' · '}{entry.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {note ? <p className={noteClassName}>{note}</p> : null}
    </div>
  );
}
