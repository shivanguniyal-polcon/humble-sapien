import { useMemo, useState } from 'react';
import pitData from '../../pit-desk.json';
import PageHead from '../components/PageHead';

// The PIT Desk: policies and public-interest news scraped from the open web
// (PIB, PRS, national press) and read through the public-interest test —
// who benefits, who pays, who is missing — by scripts/pit_pipeline.py.
//
// The data file (pit-desk.json) lives at the repo root so it can be regenerated
// by the pipeline and committed by hand; Vercel rebuilds on push and this
// section reflects it. Every card links to its original source, because a PIT
// read is only as good as the release behind it.

const PIT_ROWS = [
  ['benefits', 'Who benefits?'],
  ['pays', 'Who pays?'],
  ['missing', 'Who is missing?'],
];

const KIND_LABEL = {
  government: 'Government release',
  ministry: 'Ministry',
  legislative: 'Legislative / PRS',
  press: 'Press',
};

export default function PitDesk() {
  const items = useMemo(() => {
    const list = Array.isArray(pitData?.items) ? pitData.items : [];
    // Newest first; items without a date sink to the bottom.
    return [...list].sort((a, b) =>
      String(b.published || b.fetched || '').localeCompare(
        String(a.published || a.fetched || ''),
      ),
    );
  }, []);

  const [domain, setDomain] = useState('All');

  const domains = useMemo(() => {
    const seen = [];
    for (const it of items) {
      if (it.domain && !seen.includes(it.domain)) seen.push(it.domain);
    }
    return ['All', ...seen];
  }, [items]);

  const shown = domain === 'All' ? items : items.filter((i) => i.domain === domain);

  return (
    <section>
      <PageHead
        eyebrow="PIT Desk"
        title="Policy, read through the public interest test"
        question="Who benefits, who pays, who is missing?"
      >
        Government releases, bills and public-interest news scraped from the open
        web, each answered the same three questions: who benefits, who pays, who
        is missing. Automated, sourced to the original release, and refreshed by
        running the pipeline — so the receipts stay attached.
      </PageHead>

      {items.length === 0 ? (
        <div className="card">
          <p className="meta" style={{ marginBottom: 0 }}>
            No items yet. Run <code>python3 scripts/pit_pipeline.py</code> with
            an API key, then upload <code>pit-desk.json</code> to GitHub and
            redeploy.
          </p>
        </div>
      ) : (
        <>
          <div className="filter-row" role="group" aria-label="Filter by domain">
            {domains.map((d) => (
              <button
                key={d}
                className={`chip ${domain === d ? 'chip-active' : ''}`}
                aria-pressed={domain === d}
                onClick={() => setDomain(d)}
              >
                {d}
              </button>
            ))}
          </div>

          <p className="meta pit-desk-count">
            {shown.length} of {items.length} items
            {pitData?.generated ? ` · last run ${pitData.generated}` : ''}
          </p>

          <div className="pit-desk-list">
            {shown.map((it) => (
              <article key={it.id || it.url} className="card pit-card-item">
                <p className="meta">
                  {KIND_LABEL[it.kind] || it.kind} · {it.source}
                  {it.published ? ` · ${it.published}` : ''}
                </p>

                <h3 className="pit-card-title">{it.title}</h3>

                {it.domain && (
                  <p className="pit-card-domain">
                    <span className="nl-tag">{it.domain}</span>
                  </p>
                )}

                {it.explanation && <p className="essay-standfirst">{it.explanation}</p>}

                <h4 className="nl-section-head">The public interest test</h4>
                <dl className="pub-pit">
                  {PIT_ROWS.map(([key, label]) => {
                    const answer = it.pit ? String(it.pit[key] || '').trim() : '';
                    return (
                      <div key={key} className="pub-pit-row">
                        <dt>{label}</dt>
                        <dd>
                          {answer || (
                            <span className="pit-badge">
                              Not answered for this item
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <p className="pit-card-source">
                  <a href={it.url} target="_blank" rel="noreferrer">
                    Read the original source →
                  </a>
                </p>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="card tool-ending">
        <h3>How this works</h3>
        <p>
          A local pipeline pulls from PIB, PRS and the national press, keeps what
          is policy-relevant, and runs each new item through an LLM with this
          exact test. The result is a single JSON file you commit yourself — no
          bot pushes to your repo. The analysis is a starting frame, not a
          verdict: the link back to the source is on every card so you can check
          it.
        </p>
        <div className="btn-row">
          <button
            className="btn btn-secondary"
            onClick={() => {
              window.location.hash = '#/support';
            }}
          >
            Read the method
          </button>
        </div>
      </div>
    </section>
  );
}
