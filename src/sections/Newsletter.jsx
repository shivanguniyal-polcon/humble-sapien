import { useState } from 'react';
import { NEWSLETTER } from '../data/newsletter';
import PageHead from '../components/PageHead';

// The Newsletter: a fixed branded template rendered from issues authored as
// Markdown (newsletter/issues/*.md) and compiled by scripts/newsletter_prepare
// into ../data/newsletter.js. Every issue carries the same slots — masthead,
// data snapshot, lead, field note, tool spotlight, reading list — so the
// design reproduces identically no matter who writes the copy.
export default function Newsletter({ onNavigate, openSub }) {
  // Deep links from the nav dropdown: #/newsletter/<issue-id>. Newest first.
  const [open, setOpen] = useState(
    openSub && NEWSLETTER.some((n) => n.id === openSub)
      ? openSub
      : NEWSLETTER[0].id,
  );

  const [seenSub, setSeenSub] = useState(openSub);
  if (openSub !== seenSub) {
    setSeenSub(openSub);
    if (openSub && NEWSLETTER.some((n) => n.id === openSub)) setOpen(openSub);
  }

  const issue = NEWSLETTER.find((n) => n.id === open);
  const isMonthly = issue.type === 'monthly';

  return (
    <section>
      <PageHead
        eyebrow="Newsletter"
        title="Evidence with receipts, in your inbox"
        question="How do I follow the work?"
      >
        The same work that goes into the research library and the tools, written
        weekly in plain language: one number worth keeping, the finding behind
        it, a policy term in ordinary words, a chart you can take apart, and what
        to read next. Once a month we go deeper — one policy taken apart end to
        end, from the citizen's journey to who gains, who pays and who is
        missing. Every issue is a page you can keep.
      </PageHead>

      <div className="filter-row" role="group" aria-label="Choose an issue">
        {NEWSLETTER.map((n) => (
          <button
            key={n.id}
            className={`chip ${open === n.id ? 'chip-active' : ''}`}
            aria-pressed={open === n.id}
            onClick={() => setOpen(n.id)}
          >
            №{n.issue} · {n.title.split('.')[0].split(':')[0]}
          </button>
        ))}
      </div>

      <article className="card newsletter">
        <header className="nl-masthead">
          <p className="meta">
            Issue {issue.issue} · {issue.dateLabel} · {issue.author} · about{' '}
            {issue.minutes} minutes
          </p>
          <p className="nl-edition">
            <span className="nl-edition-badge">
              {isMonthly ? 'Monthly deep-dive' : 'Weekly'}
            </span>
            {issue.policy && (
              <span className="nl-edition-policy">
                Under the lens: {issue.policy}
              </span>
            )}
          </p>
          <h3 className="essay-title">{issue.title}</h3>
          <p className="essay-standfirst">{issue.standfirst}</p>
          <div className="nl-tags">
            {issue.tags.map((t) => (
              <span key={t} className="nl-tag">
                {t}
              </span>
            ))}
          </div>
        </header>

        <div className="nl-snapshot" role="group" aria-label="The number">
          <p className="nl-snap-value">{issue.snapshot.value}</p>
          <p className="nl-snap-label">{issue.snapshot.label}</p>
          {issue.snapshot.note && (
            <p className="nl-snap-note">{issue.snapshot.note}</p>
          )}
          <p className="nl-snap-source">Source: {issue.snapshot.source}</p>
        </div>

        <h4 className="nl-section-head">Lead</h4>
        {issue.lead.map((para, i) => (
          <p key={i} className="essay-body">
            {para}
          </p>
        ))}

        {issue.term && (
          <>
            <h4 className="nl-section-head">Policy term, plainly</h4>
            <div className="nl-plain">
              <p className="nl-plain-before">
                <span className="nl-plain-tag">As written</span>
                {issue.term.before}
              </p>
              <p className="nl-plain-after">
                <span className="nl-plain-tag nl-plain-tag-after">
                  In plain words
                </span>
                {issue.term.after}
              </p>
              {issue.term.note && (
                <p className="nl-plain-note">{issue.term.note}</p>
              )}
            </div>
          </>
        )}

        {issue.chart && (
          <>
            <h4 className="nl-section-head">Chart of the week</h4>
            <div className="nl-chart">
              <p className="nl-chart-title">{issue.chart.title}</p>
              <p className="nl-chart-take">{issue.chart.takeaway}</p>
              <p className="nl-chart-source">Source: {issue.chart.source}</p>
              {issue.chart.href && (
                <button
                  className="nl-chart-link linklike"
                  onClick={() => {
                    const [tab, sub] = issue.chart.href
                      .replace('#/', '')
                      .split('/');
                    onNavigate(tab, sub);
                  }}
                >
                  Explore the data →
                </button>
              )}
            </div>
          </>
        )}

        {isMonthly && issue.touchpoints && (
          <>
            <h4 className="nl-section-head">The citizen's journey</h4>
            <ol className="nl-touchpoints">
              {issue.touchpoints.map((tp, i) => (
                <li key={i} className="nl-tp-item">
                  <span className="nl-tp-step">{tp.step}</span>
                  {tp.detail && (
                    <span className="nl-tp-detail">{tp.detail}</span>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}

        {isMonthly && issue.simplify && (
          <>
            <h4 className="nl-section-head">In plain language</h4>
            <div className="nl-plain">
              <p className="nl-plain-before">
                <span className="nl-plain-tag">As written</span>
                {issue.simplify.before}
              </p>
              <p className="nl-plain-after">
                <span className="nl-plain-tag nl-plain-tag-after">
                  In plain words
                </span>
                {issue.simplify.after}
              </p>
              {issue.simplify.note && (
                <p className="nl-plain-note">{issue.simplify.note}</p>
              )}
            </div>
          </>
        )}

        {isMonthly && issue.stakeholders && (
          <>
            <h4 className="nl-section-head">Who gains, who pays, who is missing</h4>
            <div className="nl-stake">
              <p className="nl-stake-row">
                <span className="nl-stake-k">Gains</span>
                {issue.stakeholders.gains}
              </p>
              <p className="nl-stake-row">
                <span className="nl-stake-k">Pays</span>
                {issue.stakeholders.pays}
              </p>
              <p className="nl-stake-row nl-stake-missing">
                <span className="nl-stake-k">Missing</span>
                {issue.stakeholders.missing}
              </p>
            </div>
          </>
        )}

        <h4 className="nl-section-head">Field note</h4>
        {issue.fieldnote.map((para, i) => (
          <p key={i} className="essay-body">
            {para}
          </p>
        ))}

        <div className="nl-tool">
          <h4>{issue.tool.name}</h4>
          <p>{issue.tool.blurb}</p>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                const [tab, sub] = issue.tool.href.replace('#/', '').split('/');
                onNavigate(tab, sub);
              }}
            >
              Open {issue.tool.name}
            </button>
          </div>
        </div>

        <h4 className="nl-section-head">Reading</h4>
        <ul className="nl-reads">
          {issue.reading.map((r, i) => (
            <li key={i} className="nl-read-item">
              {r.href.startsWith('#') ? (
                <button
                  className="nl-read-link linklike"
                  onClick={() => {
                    const [tab, sub] = r.href.replace('#/', '').split('/');
                    onNavigate(tab, sub);
                  }}
                >
                  {r.label}
                </button>
              ) : (
                <a
                  className="nl-read-link"
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.label}
                </a>
              )}
              {r.note && <span className="nl-read-note">{r.note}</span>}
            </li>
          ))}
        </ul>

        <p className="meta" style={{ marginBottom: 0 }}>
          Every issue is generated from a Markdown file in the open, so the
          archive, this page and the shareable HTML stay in step.
        </p>
      </article>

      <div className="card tool-ending">
        <h3>Get the next one</h3>
        <p>
          The newsletter is one face of the same work. If an issue made you want
          to check a promise, run a model or take apart a dataset, the
          instruments are free and waiting.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate('work')}>
            Open the tools
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('research')}>
            Read the research
          </button>
        </div>
      </div>
    </section>
  );
}
