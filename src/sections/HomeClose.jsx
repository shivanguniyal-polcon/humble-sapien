// The close, still inside the timeline's section: the column has just drawn
// forty thousand instruments, so the problem is stated as a reading of what the
// reader watched, the answer is what the engine does about it, and the page
// ends on one ask. No cards, no side panel: rules and type, the same paper the
// chart is drawn on.

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
      <section className="close-beat" aria-labelledby="problem-title">
        <div className="shell">
          <p className="overline">The problem</p>
          <h2 id="problem-title" className="close-title">
            The rules exist. The reading does not.
          </h2>

          <p className="close-lede">
            You have just watched the paper grow: forty thousand instruments in
            one catalogue, and the line still climbing. Publication is not
            comprehension. The state writes at a scale no citizen can read
            alone, and the gap between what is written and what is understood
            is where power quietly moves.
          </p>

          <dl className="close-stats">
            <div className="close-stat">
              <dt className="data-num">16,38,784</dt>
              <dd>
                Right to Information requests filed with the central government
                in 2022-23 alone &mdash; and 52,662 rejected. Each one is a
                citizen asking the state to explain what it already wrote down.
                It is the largest readability complaint in the world.
              </dd>
            </div>
            <div className="close-stat close-stat-danger">
              <dt className="data-num">&mdash;</dt>
              <dd>
                The annual count of Gazette notifications published, central or
                state. No such total exists anywhere. That absence is the
                finding: nobody holds the number, so nobody can say how much
                rule-making there has been.
              </dd>
            </div>
            <div className="close-stat">
              <dt className="data-num">890</dt>
              <dd>
                Central Acts in force &mdash; a reported count from the Law
                Ministry, May 2025, not an audited total. Add state laws, rules
                and notifications and nobody has the full number.
              </dd>
            </div>
          </dl>

          <p className="close-body">
            Not more data. Not another portal. Comprehension: evidence you can
            take apart, tools you can use, and language written for the people
            it describes. THS builds all three, and publishes its receipts.
          </p>
          <p className="meta close-source">
            Sources: Lok Sabha RTI statistics 2022-23; Law Ministry reported
            count, May 2025; the timeline&rsquo;s own catalogue note on the
            missing Gazette total. Numbers carry their dates because policies
            move.
          </p>
        </div>
      </section>

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
