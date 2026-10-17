import { useState } from 'react';

const parse = (s) => {
  const t = String(s).trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// A number input that never silently coerces. The draft text is kept exactly
// as typed (so a half-typed "-" is not a NaN smuggled into the run), the
// parent receives a number or null — never NaN, never a blank read as 0 — and
// an unparseable or out-of-range draft is reported inline instead of guessed.
export default function NumInput({ id, value, onChange, min, max, step }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [lastValue, setLastValue] = useState(value);

  const inRange = (n) => (min == null || n >= min) && (max == null || n <= max);
  const parsed = parse(draft);
  const emitted = parsed != null && inRange(parsed) ? parsed : null;

  // Adopt outside changes (presets, loaded project files) without stomping on
  // what the user is currently typing.
  if (value !== lastValue && value !== emitted) {
    setLastValue(value);
    setDraft(value == null ? '' : String(value));
  }

  const showError = draft.trim() !== '' && emitted === null;

  return (
    <>
      <input
        id={id}
        type="number"
        step={step}
        value={draft}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? `${id}-num-error` : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          const p = parse(e.target.value);
          onChange(p != null && inRange(p) ? p : null);
        }}
      />
      {showError && (
        <span id={`${id}-num-error`} className="input-error" role="alert">
          {parsed == null
            ? 'Enter a number.'
            : `Enter a number between ${min} and ${max}.`}
        </span>
      )}
    </>
  );
}
