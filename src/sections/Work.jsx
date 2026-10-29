import { lazy, Suspense } from 'react';
import { TOOLS } from '../data/tools';
import PageHead from '../components/PageHead';

// One chunk per instrument. The tools index loads on its own; the engine
// behind a tool arrives only when that tool is opened, so the landing page
// never ships the battery, the legal engine or the lab.
const Solutions = lazy(() => import('./Solutions'));
const GenderIndex = lazy(() => import('./GenderIndex'));
const Simplifier = lazy(() => import('./Simplifier'));
const Monitor = lazy(() => import('./Monitor'));
const Touchpoints = lazy(() => import('./Touchpoints'));
const VillagePassbook = lazy(() => import('./VillagePassbook'));
const Scorecards = lazy(() => import('./Scorecards'));
const FieldNotes = lazy(() => import('./FieldNotes'));
const EconometricsLab = lazy(() => import('./EconometricsLab'));
const ProjectDesk = lazy(() => import('./ProjectDesk'));
const Battery = lazy(() => import('./Battery'));
const Stakeholders = lazy(() => import('./Stakeholders'));
const PolicyGame = lazy(() => import('../components/PolicyGame'));

// Thirteen cards in one flat grid is a wall, not a floor. The shelves group
// them by the question a reader arrives with: a household's entitlements, a
// professional's reading, or an analyst's estimate. `ids` is the only place the
// assignment lives; any tool added to TOOLS without a shelf still appears below,
// so the page can never lose an instrument.
const SHELVES = [
  {
    id: 'citizens',
    title: 'For citizens and Gram Sabhas',
    note: 'The money a village receives, the office that owes an answer, the entitlements a household can claim, and the promises made for it.',
    ids: ['passbook', 'touchpoints', 'solutions', 'scorecards', 'arcade'],
  },
  {
    id: 'reading',
    title: 'For statutory and regulatory reading',
    note: 'Read a circular as a set of duties, take a notification apart clause by clause, and check what the work taught before trusting it.',
    ids: ['monitor', 'simplifier', 'notes'],
  },
  {
    id: 'analysis',
    title: 'For quantitative and distributional analysis',
    note: 'Run the estimate again, move an index’s weights, and test whether a project can carry its debt.',
    ids: ['battery', 'lab', 'stakeholders', 'gender-index', 'project'],
  },
];

const SHELF_IDS = new Set(SHELVES.flatMap((shelf) => shelf.ids));
const OTHER_TOOLS = TOOLS.filter((tool) => !SHELF_IDS.has(tool.id));

const ToolCard = ({ tool, onToolChange }) => (
  <article className="tool-card">
    <span className="tool-card-label">{tool.label}</span>
    <h3>{tool.name}</h3>
    <p className="tool-question">{tool.question}</p>
    <p className="fine-print">{tool.blurb}</p>
    {tool.how && <p className="fine-print tool-how">{tool.how}</p>}
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => onToolChange(tool.id)}
    >
      Open
    </button>
  </article>
);

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
      view = (
        <EconometricsLab
          onNavigate={onNavigate}
          query={query}
          onQueryChange={onQueryChange}
        />
      );
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
    case 'passbook':
      view = <VillagePassbook query={query} onQueryChange={onQueryChange} />;
      break;
    case 'monitor':
      view = <Monitor query={query} onQueryChange={onQueryChange} />;
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
          <PageHead
            eyebrow="Policy arcade"
            title="Policy arcade"
            question="Can policy literacy be a game?"
          >
            Sixty seconds, falling entitlements. Arrow keys or pointer; it is a
            break, not an argument. Catch the entitlements, dodge the jargon.
          </PageHead>
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
      <PageHead
        eyebrow="Tools"
        title="The instruments"
        question="Which one answers the question you are carrying?"
      >
        {TOOLS.length} instruments, free to use, running entirely in your browser.
        Three shelves, one for the question you are carrying: a household’s
        entitlements, the rules a professional reads, or the estimate an analyst
        runs. The name is the tool; the line under it is the question; the
        paragraph tells you what it does and how to start.
      </PageHead>

      {SHELVES.map((shelf) => {
        const shelfTools = shelf.ids
          .map((id) => TOOLS.find((tool) => tool.id === id))
          .filter(Boolean);
        return (
          <section
            key={shelf.id}
            className="tool-shelf"
            aria-labelledby={`shelf-${shelf.id}`}
          >
            <div className="tool-shelf-head">
              <h2 id={`shelf-${shelf.id}`}>{shelf.title}</h2>
              <p>{shelf.note}</p>
              <span className="tool-shelf-count data-num">
                {shelfTools.length} {shelfTools.length === 1 ? 'instrument' : 'instruments'}
              </span>
            </div>
            <div className="tool-cards">
              {shelfTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onToolChange={onToolChange} />
              ))}
            </div>
          </section>
        );
      })}

      {OTHER_TOOLS.length > 0 && (
        <section className="tool-shelf" aria-labelledby="shelf-other">
          <div className="tool-shelf-head">
            <h2 id="shelf-other">Also on the floor</h2>
            <p>Newer instruments, before they have found a shelf of their own.</p>
            <span className="tool-shelf-count data-num">
              {OTHER_TOOLS.length} {OTHER_TOOLS.length === 1 ? 'instrument' : 'instruments'}
            </span>
          </div>
          <div className="tool-cards">
            {OTHER_TOOLS.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onToolChange={onToolChange} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
