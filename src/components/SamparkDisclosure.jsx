import { useId, useState } from 'react';

// One disclosure for the long Sampark results.
//
// The map's list already uses this pattern: a real button, aria-expanded,
// aria-controls, and a body that is absent when closed. Keeping one component
// means a keyboard user gets the same behaviour on every block, and a closed
// block cannot keep hundreds of hidden rows in the accessibility tree.
//
// The body is mounted only while open. That is deliberate: the point is not
// merely to hide pixels, it is to make the closed page short.
export default function SamparkDisclosure({
  title,
  hint,
  children,
  className = '',
  id,
  open,
  defaultOpen = false,
  onToggle,
}) {
  const autoId = useId().replace(/:/g, '');
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = open !== undefined;
  const expanded = controlled ? open : internalOpen;
  const bodyId = id ? `${id}-body` : `sampark-fold-${autoId}`;

  const toggle = () => {
    if (controlled) {
      if (onToggle) onToggle(!expanded);
      return;
    }
    setInternalOpen((value) => !value);
  };

  return (
    <section className={`sampark-fold ${className}`.trim()} id={id}>
      <button
        type="button"
        className="sampark-fold-summary"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span className="sampark-fold-title">{title}</span>
        {hint ? <span className="meta sampark-fold-hint">{hint}</span> : null}
      </button>
      {expanded && (
        <div className="sampark-fold-body" id={bodyId}>
          {children}
        </div>
      )}
    </section>
  );
}
