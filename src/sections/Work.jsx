import { lazy, Suspense } from 'react';
import { TOOLS } from '../data/tools';

// One chunk per instrument. The tools index loads on its own; the engine
// behind a tool arrives only when that tool is opened, so the landing page
// never ships the battery, the legal engine or the lab.
const Solutions = lazy(() => import('./Solutions'));
const GenderIndex = lazy(() => import('./GenderIndex'));
const Simplifier = lazy(() => import('./Simplifier'));
const Monitor = lazy(() => import('./Monitor'));
const Touchpoints = lazy(() => import('./Touchpoints'));
const Scorecards = lazy(() => import('./Scorecards'));
const FieldNotes = lazy(() => import('./FieldNotes'));
const EconometricsLab = lazy(() => import('./EconometricsLab'));
const ProjectDesk = lazy(() => import('./ProjectDesk'));
const Battery = lazy(() => import('./Battery'));
const Stakeholders = lazy(() => import('./Stakeholders'));
const PolicyGame = lazy(() => import('../components/PolicyGame'));

// One instrument per screen. Every tool brings its own section head, so the
// page adds only a way back to the index and the instrument itself.
const ToolView = ({ id, onNavigate, onTool, query, onQueryChange }) => {
  let view = null;
  switch (id) {
    case 'battery':
      view = <Battery onNavigate={onNavigate} />;
      break;
    case 'project':
      view = <ProjectDesk />;
      break;
    case 'lab':
      view = <EconometricsLab onNavigate={onNavigate} />;
      break;
    case 'stakeholders':
      view = <Stakeholders onNavigate={onNavigate} onTool={onTool} />;
      break;
    case 'solutions':
      view = <Solutions />;
      break;
    case 'gender-index':
      view = <GenderIndex />;
      break;
    case 'simplifier':
      view = <Simplifier />;
      break;
    case 'monitor':
      view = <Monitor />;
      break;
    case 'touchpoints':
      view = <Touchpoints query={query} onQueryChange={onQueryChange} />;
      break;
    case 'scorecards':
      view = <Scorecards onNavigate={onNavigate} onTool={onTool} />;
      break;
    case 'notes':
      view = <FieldNotes />;
      break;
    case 'arcade':
      view = (
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
      );
      break;
    default:
      view = null;
  }
  return (
    <Suspense
      fallback={
        <p role="status" style={{ padding: '2rem 0', textAlign: 'center' }}>
          Loading…
        </p>
      }
    >
      {view}
    </Suspense>
  );
};

export default function Work({ onNavigate, openTool, onToolChange, query, onQueryChange }) {
  // #/tools/<id> is the tool's own page. A link naming no tool we know falls
  // back to the index rather than a blank screen.
  const tool = TOOLS.find((t) => t.id === openTool);

  if (tool) {
    return (
      <section>
        <button className="linklike" onClick={() => onNavigate('work')}>
          ← All tools
        </button>
        <div className="tool-panel">
          <ToolView
            id={tool.id}
            onNavigate={onNavigate}
            onTool={onToolChange}
            query={query}
            onQueryChange={onQueryChange}
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="section-head">
        <span className="overline">The instruments</span>
        <h2>Public tools for reading the state</h2>
        <p className="section-strap">
          {TOOLS.length} instruments, free to use, running entirely in your browser. Each
          one answers a question a citizen, a reporter or a civil servant
          actually asks. Open one and it takes the page.
        </p>
      </div>

      <div className="tool-cards">
        {TOOLS.map((t) => (
          <article key={t.id} className="tool-card">
            <h3>{t.label}</h3>
            <p className="tool-question">{t.question}</p>
            <p className="fine-print">{t.blurb}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onToolChange(t.id)}
            >
              Open
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
