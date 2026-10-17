import { useEffect, useRef, useState } from 'react';
import Solutions from './Solutions';
import Simplifier from './Simplifier';
import Touchpoints from './Touchpoints';
import Scorecards from './Scorecards';
import FieldNotes from './FieldNotes';
import EconometricsLab from './EconometricsLab';
import Battery from './Battery';
import Stakeholders from './Stakeholders';
import PolicyGame from '../components/PolicyGame';
import { TOOLS } from '../data/tools';

// Scroll the tool panel into view. The jump is synchronous on purpose: smooth
// scrolling is a no-op or a deferred animation in some embedded and automated
// browsers, while an instant jump is correct everywhere and for every motion
// preference. The 88px offset matches .tool-panel's scroll-margin-top.
function scrollToPanel(el) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo(0, Math.max(0, top));
}

export default function Work({ onNavigate, openTool, onToolChange }) {
  // The URL is the source of truth when present; local state covers the
  // no-hash fallback and keeps clicks instant while the hash catches up.
  const [localTool, setLocalTool] = useState(openTool || 'lab');
  const tool = openTool || localTool;
  const panelRef = useRef(null);

  const selectTool = (id) => {
    setLocalTool(id);
    if (onToolChange) onToolChange(id);
    scrollToPanel(panelRef.current);
  };

  // Landing on a deep link like #/tools/lab should put the tool in view.
  useEffect(() => {
    if (openTool) scrollToPanel(panelRef.current);
  }, [openTool]);

  return (
    <section>
      <div className="section-head">
        <span className="overline">The instruments</span>
        <h2>Public tools for reading the state</h2>
        <p className="section-strap">
          Nine instruments, free to use, running entirely in your browser. Each
          one answers a question a citizen, a reporter or a civil servant
          actually asks. Start there.
        </p>
      </div>

      <div className="tool-cards">
        {TOOLS.map((t) => (
          <article key={t.id} className={`tool-card ${tool === t.id ? 'tool-card-active' : ''}`}>
            <h3>{t.label}</h3>
            <p className="tool-question">{t.question}</p>
            <p className="fine-print">{t.blurb}</p>
            <button
              type="button"
              className={tool === t.id ? 'btn btn-secondary' : 'btn btn-primary'}
              onClick={() => selectTool(t.id)}
            >
              {tool === t.id ? 'Open now' : 'Open'}
            </button>
          </article>
        ))}
      </div>

      <div className="filter-row" role="group" aria-label="THS tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`chip ${tool === t.id ? 'chip-active' : ''}`}
            onClick={() => selectTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div ref={panelRef} className="tool-panel" tabIndex={-1}>
        {tool === 'battery' && <Battery onNavigate={onNavigate} />}
        {tool === 'lab' && <EconometricsLab onNavigate={onNavigate} />}
        {tool === 'stakeholders' && <Stakeholders onNavigate={onNavigate} onTool={selectTool} />}
        {tool === 'solutions' && <Solutions />}
        {tool === 'simplifier' && <Simplifier />}
        {tool === 'touchpoints' && <Touchpoints />}
        {tool === 'scorecards' && (
          <Scorecards onNavigate={onNavigate} onTool={selectTool} />
        )}
        {tool === 'notes' && <FieldNotes />}
        {tool === 'arcade' && (
          <div>
            <div className="card">
              <h3>Catch the Entitlement</h3>
              <p style={{ marginBottom: 0 }}>
                The playground corner of the tools floor. Catch falling
                entitlements, dodge jargon, and remember why any of this matters.
                Arrow keys or pointer, 60 seconds on the clock.
              </p>
            </div>
            <PolicyGame />
          </div>
        )}
      </div>
    </section>
  );
}
