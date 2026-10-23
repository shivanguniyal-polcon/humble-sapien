import Solutions from './Solutions';
import GenderIndex from './GenderIndex';
import Simplifier from './Simplifier';
import Touchpoints from './Touchpoints';
import Scorecards from './Scorecards';
import FieldNotes from './FieldNotes';
import EconometricsLab from './EconometricsLab';
import Battery from './Battery';
import Stakeholders from './Stakeholders';
import PolicyGame from '../components/PolicyGame';
import { TOOLS } from '../data/tools';

// One instrument per screen. Every tool brings its own section head, so the
// page adds only a way back to the index and the instrument itself.
const ToolView = ({ id, onNavigate, onTool, query, onQueryChange }) => {
  switch (id) {
    case 'battery':
      return <Battery onNavigate={onNavigate} />;
    case 'lab':
      return <EconometricsLab onNavigate={onNavigate} />;
    case 'stakeholders':
      return <Stakeholders onNavigate={onNavigate} onTool={onTool} />;
    case 'solutions':
      return <Solutions />;
    case 'gender-index':
      return <GenderIndex />;
    case 'simplifier':
      return <Simplifier />;
    case 'touchpoints':
      return <Touchpoints query={query} onQueryChange={onQueryChange} />;
    case 'scorecards':
      return <Scorecards onNavigate={onNavigate} onTool={onTool} />;
    case 'notes':
      return <FieldNotes />;
    case 'arcade':
      return (
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
    default:
      return null;
  }
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
          Nine instruments, free to use, running entirely in your browser. Each
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
