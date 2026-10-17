import SprawlStory from './SprawlStory';
import Flood from './Flood';
import DeepTime from '../components/DeepTime';

// Home is the institutional front page, built as a deliberate arc:
// the flood of government output (you land inside the overwhelm), then the
// finding that names it in four sourced numbers, then the capability band
// that makes the engine visible, deep time for the history, and finally the
// map that routes the reader into the site's sections.

const CAPABILITIES = [
  {
    q: 'Did the policy change anything?',
    a: 'Difference-in-differences with event studies and errors clustered by state, on three waves of the national health survey.',
  },
  {
    q: 'What would have happened anyway?',
    a: 'Synthetic control and propensity-score matching, with the donor pool and every weight on the page.',
  },
  {
    q: 'Does anything jump at the line?',
    a: 'Sharp and fuzzy regression discontinuity, with bandwidth and donut controls you can move and watch the estimate answer.',
  },
  {
    q: 'What if the regressor moves with the outcome?',
    a: 'Two-stage least squares, logit and OLS with robust standard errors, plus the first-stage fit that decides whether to believe any of it.',
  },
];

// The way out: every section of the site, one card each, answering which
// door of the problem it opens. The overwhelm ends in a clear exit.
const DOORS = [
  {
    tab: 'work',
    label: 'Tools',
    count: '9 instruments',
    what: 'Nine instruments that run live in your browser, from cost-benefit analysis to the evaluation engine. Every one ends by telling you what it cannot prove.',
  },
  {
    tab: 'research',
    label: 'Research',
    count: '9 publications',
    what: 'Reports, briefs and working papers with methods and citations attached, and a distributional block on every one.',
  },
  {
    tab: 'data',
    label: 'Data',
    count: '5 datasets, open and Commons',
    what: 'A playground, not a catalogue. Chart any series, pair two datasets, and read who is missing from the result.',
  },
  {
    tab: 'compare',
    label: 'Atlas',
    count: '15 sectors, 90 policies',
    what: 'Ninety flagship policies across two hemispheres: what each region built, and where the approaches split.',
  },
  {
    tab: 'writing',
    label: 'Writing',
    count: '3 essays',
    what: 'Plain-language notes from the founder on why policy reading must evolve, and how the work is done.',
  },
  {
    tab: 'about',
    label: 'About',
    count: 'Who we are',
    what: 'The institution behind the tools: what THS is, how it works, and what it refuses to do.',
  },
  {
    tab: 'support',
    label: 'Support',
    count: 'Keep it free',
    what: 'The tools are free for citizens and civil society. This is how the work gets paid for.',
  },
];

export default function Home({ onNavigate }) {
  return (
    <section className="home-flow">
      <Flood />
      <SprawlStory onNavigate={onNavigate} />

      <div className="capability-band">
        <div className="section-head">
          <span className="overline">The instruments</span>
          <h2>What the engine does</h2>
          <p className="section-strap">
            Policy arguments fail on identification, not passion. The THS engine
            runs the standard designs of causal inference live in your browser,
            on complete census coverage and three waves of the national health
            survey. Every estimator is pinned to hand-computed test cases. Each
            tool ends by telling you what it cannot prove.
          </p>
        </div>
        <div className="capability-grid">
          {CAPABILITIES.map((c) => (
            <article key={c.q} className="capability-card">
              <h3>{c.q}</h3>
              <p style={{ marginBottom: 0 }}>{c.a}</p>
            </article>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate('work', 'lab')}>
            Open the evaluation engine
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('work', 'stakeholders')}>
            Map who a policy moves
          </button>
        </div>
      </div>

      <div className="strata">
        <div className="shell">
          <div className="section-head strata-head">
            <span className="overline">Deep time</span>
            <h2>Who could read the rules, era by era</h2>
            <p className="section-strap">
              Every era moved the gate. Walk the timeline: each one names who
              held it, and the tool THS built to break it open. Start anywhere,
              or use the arrow keys.
            </p>
          </div>
          <DeepTime onNavigate={onNavigate} />
        </div>
      </div>

      <div className="start-map">
        <div className="section-head">
          <span className="overline">Where to start</span>
          <h2>The problem is a flood. Here are the doors.</h2>
          <p className="section-strap">
            You have seen the volume and the finding. Every section of this site
            takes one piece of the problem apart and hands you the instrument
            that does it. Pick a door — they are all free.
          </p>
        </div>
        <div className="start-grid">
          {DOORS.map((d) => (
            <button key={d.tab} className="start-card" onClick={() => onNavigate(d.tab)}>
              <span className="start-count">{d.count}</span>
              <h3>{d.label}</h3>
              <p>{d.what}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
