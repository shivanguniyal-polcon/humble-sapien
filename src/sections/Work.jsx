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

const TOOLS = [
  {
    id: 'battery', label: 'Analysis battery',
    question: 'Can your analysis run again tomorrow and give the same answer?',
    blurb: 'Unorganised data in, auditable analysis out: ingestion with a loud validation report, parameters with provenance, deterministic execution with an audit manifest, and a report that cannot be exported until the public interest check is answered.',
  },
  {
    id: 'lab', label: 'Evaluation engine',
    question: 'Does the policy actually change the outcome?',
    blurb: 'Run difference-in-differences, regression discontinuity, synthetic control and matching live, on complete census and health-survey coverage.',
  },
  {
    id: 'stakeholders', label: 'Stakeholder mapper',
    question: 'Who gains, who is restricted, and who decided?',
    blurb: 'A distributional ledger for any policy: direction, magnitude and power per party, with the verdict read back to you.',
  },
  {
    id: 'touchpoints', label: 'Touchpoint maps',
    question: 'Which office owes you the answer?',
    blurb: 'Follow a scheme from eligibility to grievance redressal, with the escalation route at every step.',
  },
  {
    id: 'simplifier', label: 'Policy simplifier',
    question: 'What does this notification actually say?',
    blurb: 'Plain-language rewriting of policy text, with readability scoring you can check.',
  },
  {
    id: 'scorecards', label: 'Promise scorecards',
    question: 'What was promised, what is the record?',
    blurb: 'Manifesto promises against delivered evidence, four years on.',
  },
  {
    id: 'solutions', label: 'Local solutions',
    question: 'Who already solved this somewhere?',
    blurb: 'A knowledge base of grassroots solutions, documented with their conditions.',
  },
  {
    id: 'notes', label: 'Field notes',
    question: 'What did the work teach?',
    blurb: 'The thinking behind the instruments: methods, failures and corrections.',
  },
  {
    id: 'arcade', label: 'Policy arcade',
    question: 'Can policy literacy be a game?',
    blurb: 'The playground corner of the tools floor. Sixty seconds, falling entitlements.',
  },
];

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
