export default function Support() {
  return (
    <section>
      <div className="section-head">
        <span className="overline">Support THS</span>
        <h2>Fund the evidence, not the influence</h2>
        <p className="section-strap">
          THS is working toward not-for-profit registration, and is
          mission-locked by design.
          Funding of any kind buys no finding, no edit and no access to work
          that belongs in the open. What it buys is capacity: field verification,
          digitised datasets, and tools that stay free.
        </p>
      </div>

      <div className="grid grid-2">
        <article className="card">
          <h3>Where the money comes from</h3>
          <div>
            <div className="fund-row">
              <div>
                <strong>Individual giving</strong>
                <p className="meta" style={{ margin: 0 }}>
                  One-time and recurring donations from people who want their
                  policy evidence in the open.
                </p>
              </div>
              <span className="fund-tag">Unrestricted</span>
            </div>
            <div className="fund-row">
              <div>
                <strong>Grants</strong>
                <p className="meta" style={{ margin: 0 }}>
                  Institutional funding for named programmes in health,
                  sanitation, governance and public interest technology.
                </p>
              </div>
              <span className="fund-tag">Programme</span>
            </div>
            <div className="fund-row">
              <div>
                <strong>THS Data Commons Plus</strong>
                <p className="meta" style={{ margin: 0 }}>
                  Institutional subscriptions to the premium data tier: the
                  revenue engine that cross-subsidises every free tool.
                </p>
              </div>
              <span className="fund-tag">Earned</span>
            </div>
            <div className="fund-row">
              <div>
                <strong>Commissioned analysis</strong>
                <p className="meta" style={{ margin: 0 }}>
                  Methodologically independent studies, published regardless of
                  outcome.
                </p>
              </div>
              <span className="fund-tag">Earned</span>
            </div>
          </div>
        </article>

        <div className="stack">
          <article className="card">
            <h3>Where the money goes</h3>
            <ul>
              <li>Field verification and scheme monitoring across states</li>
              <li>Digitising and sourcing datasets for the open tier</li>
              <li>Keeping the simplifier, maps and knowledge base free</li>
              <li>Research time for work with no funder behind it</li>
            </ul>
            <p className="meta" style={{ marginBottom: 0 }}>
              The long-run goal is deliberate: earned revenue covers the
              operating base, so donations can fund the work markets never will.
            </p>
          </article>
          <article className="card">
            <h3>Talk to us about funding</h3>
            <p>
              Whether you are an individual donor, a foundation or an
              institution that needs the Commons Plus tier: start with an email
              and we will take it from there.
            </p>
            <div className="btn-row">
              <a className="btn btn-primary" href="mailto:shivang.uni@gmail.com?subject=Supporting%20THS">
                Email THS about funding
              </a>
              <a className="btn btn-secondary" href="#/licensing">
                Read the licensing terms
              </a>
            </div>
            <p className="meta" style={{ marginBottom: 0 }}>
              The Policy Battery is free for citizens and civil society,
              permanently, and licensed to institutions to pay for it. The
              tiers and the input formats are set out on the{' '}
              <a href="#/licensing">licensing page</a>.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
