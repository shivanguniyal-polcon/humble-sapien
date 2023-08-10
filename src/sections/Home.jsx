import SprawlStory from './SprawlStory';
import DeepTime from '../components/DeepTime';

// Home is the institutional front page: it opens on the finding (the policy
// sprawl in four sourced numbers), then the capability band that makes the
// engine visible, and the deep-time instrument.

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

export default function Home({ onNavigate }) {
  return (
    <section className="home-flow">
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
    </section>
  );
}
