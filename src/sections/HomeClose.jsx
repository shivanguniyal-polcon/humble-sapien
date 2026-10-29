// The close, still inside the timeline's section. The problem and the mission
// now stand in the timeline's own coda, where the reader meets them while the
// column is still in view; the close begins at the answer — what the engine
// does about it — and the page ends on one ask. No cards, no side panel: rules
// and type, the same paper the chart is drawn on.

const METHODS = [
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

export default function HomeClose({ onNavigate }) {
  return (
    <div className="home-close">
      <section className="close-beat close-beat-answer" aria-labelledby="answer-title">
        <div className="shell">
          <p className="overline">The answer</p>
          <h2 id="answer-title" className="close-title">
            What the engine does
          </h2>
          <p className="close-lede">
            Policy arguments fail on identification, not passion. The THS engine
            runs the standard designs of causal inference live in your browser,
            on complete census coverage and three waves of the national health
            survey. Every estimator is pinned to hand-computed test cases. Each
            tool ends by telling you what it cannot prove.
          </p>

          <ol className="close-methods">
            {METHODS.map((method, index) => (
              <li key={method.q}>
                <span className="close-method-num data-num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{method.q}</h3>
                <p>{method.a}</p>
              </li>
            ))}
          </ol>

          {/* The engine is one door. The index is the set of all of them:
              every tool, publication and sector page, in one place. */}
          <p className="close-next">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('index')}
            >
              Take me to the index
            </button>
            <span className="meta">
              Every tool, publication and sector page, listed in one place.
            </span>
          </p>
        </div>
      </section>

      <section className="close-ask" aria-labelledby="ask-title">
        <div className="shell">
          <h2 id="ask-title" className="close-ask-title">
            Who gets to read the rules?
          </h2>
          <p className="close-ask-lede">
            The tools are free for citizens and civil society. This is how the
            work gets paid for.
          </p>
          <button
            type="button"
            className="btn close-ask-btn"
            onClick={() => onNavigate('support')}
          >
            Back the mission
          </button>
        </div>
      </section>
    </div>
  );
}
