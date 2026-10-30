// RARA's development tracker.
//
// The page is a reading aid over two committed snapshots: a feed of AI
// developments and a small corpus of exact legal excerpts. It does not decide
// that a law applies. It answers a narrower, checkable question: does the
// provision use the same words as the development, and does it carry a control?
//
// The silence is the point. Most developments will not share a word with a
// statute, and the nearest provision is shown beside them so the reader can see
// the vocabulary gap rather than an empty card.

import { useEffect, useMemo, useState } from 'react';
import DevelopmentMap from '../components/DevelopmentMap';
import PageHead from '../components/PageHead';
import DEVELOPMENTS from '../data/rara/developments.json';
import LEGAL from '../data/rara/legal-texts.json';
import {
  STATUS_LABEL,
  STATUS_NOTE,
  buildTracker,
  formatDay,
  topicLabel,
} from '../lib/rara/tracker';

const SOURCE_TYPE = {
  lab: 'Lab',
  research: 'Research',
  news: 'News',
  policy: 'Policy',
  regulator: 'Regulator',
};

const COVERAGE = {
  explicit: 'Explicit hook',
  mentions: 'Names only',
  silent: 'No shared word',
};

// When the Cloudflare store is configured at build time, the page reads the
// newest collection from D1 and falls back to the committed snapshot without
// saying so: a tracker that breaks when an API is down is worse than a tracker
// that is six hours old.
const LIVE_API = import.meta.env?.VITE_RARA_API || '';

const publisherOf = (item) => item.publisher || item.sourceLabel;

const Status = ({ status }) => (
  <span className="rara-status" data-status={status}>
    {COVERAGE[status] || STATUS_LABEL[status]}
  </span>
);

const Quote = ({ provision }) => (
  <blockquote className="rara-tracker-quote">
    {provision.quote}
    {provision.excerpt ? <span className="rara-excerpt"> · excerpt</span> : null}
  </blockquote>
);

const Match = ({ match }) => (
  <article className="rara-tracker-match" data-status={match.status}>
    <div className="rara-tracker-match-head">
      <span className="rara-tracker-cite">
        {match.provision.instrumentShort} · {match.provision.pinCite}
      </span>
      <Status status={match.status} />
    </div>
    <p className="rara-tracker-match-title">{match.provision.title}</p>
    <p className="rara-tracker-words">
      Shared words: <strong>{match.namedTerms.join(', ')}</strong>
      {match.controlTerms.length ? (
        <>
          {' '}· control words: <strong>{match.controlTerms.join(', ')}</strong>
        </>
      ) : null}
    </p>
    <Quote provision={match.provision} />
    <p className="rara-tracker-note">{STATUS_NOTE[match.status]}</p>
    <a
      className="rara-tracker-source"
      href={match.provision.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      Read the provision at {new URL(match.provision.sourceUrl).hostname}
    </a>
  </article>
);

const Nearest = ({ match }) => (
  <article className="rara-tracker-nearest">
    <p className="rara-tracker-nearest-label">Nearest provision · no shared word</p>
    <p className="rara-tracker-match-title">
      {match.provision.instrumentShort} · {match.provision.pinCite} — {match.provision.title}
    </p>
    <p className="rara-tracker-words">
      The development says <strong>{match.developmentTerms.join(', ') || 'this subject'}</strong>.
      The provision says <strong>{match.provisionTerms.join(', ') || 'something else'}</strong>.
    </p>
    <Quote provision={match.provision} />
    <a
      className="rara-tracker-source"
      href={match.provision.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      Read the provision at {new URL(match.provision.sourceUrl).hostname}
    </a>
  </article>
);

const Development = ({ item }) => (
  <li className="rara-tracker-item">
    <div className="rara-tracker-date">
      <time dateTime={item.publishedAt}>{formatDay(item.publishedAt)}</time>
      <span>{SOURCE_TYPE[item.sourceType] || item.sourceType}</span>
    </div>
    <div className="rara-tracker-body">
      <div className="rara-tracker-item-head">
        <span className="rara-tracker-publisher">{publisherOf(item)}</span>
        <Status status={item.coverage} />
      </div>
      <h3>
        <a href={item.url} target="_blank" rel="noreferrer">
          {item.title}
        </a>
      </h3>
      {item.summary ? <p className="rara-tracker-summary">{item.summary}</p> : null}
      {item.topics.length ? (
        <ul className="rara-tracker-topics" aria-label="Topics">
          {item.topics.map((topic) => (
            <li key={topic}>{topicLabel(topic)}</li>
          ))}
        </ul>
      ) : null}

      {item.matches.length ? (
        <div className="rara-tracker-matches">
          {item.matches.map((match) => (
            <Match match={match} key={`${item.id}-${match.provision.id}`} />
          ))}
        </div>
      ) : item.nearest.length ? (
        <div className="rara-tracker-near">
          {item.nearest.map((match) => (
            <Nearest match={match} key={`${item.id}-nearest-${match.provision.id}`} />
          ))}
        </div>
      ) : (
        <p className="rara-tracker-empty">
          No provision in this corpus shares a subject with this development.
        </p>
      )}
    </div>
  </li>
);

export default function RaraTracker() {
  const [live, setLive] = useState(null);

  useEffect(() => {
    if (!LIVE_API) return undefined;
    const controller = new AbortController();
    fetch(`${LIVE_API.replace(/\/$/, '')}/developments?limit=300`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        if (Array.isArray(data.items) && data.items.length) {
          setLive({
            generatedAt: data.generatedAt,
            items: data.items,
            sources: Array.isArray(data.sources) ? data.sources : [],
          });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const feed = useMemo(
    () => live || {
      generatedAt: DEVELOPMENTS.generatedAt,
      items: DEVELOPMENTS.items,
      sources: DEVELOPMENTS.sources,
    },
    [live],
  );
  const tracker = useMemo(() => buildTracker(feed.items, LEGAL.texts), [feed.items]);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [coverage, setCoverage] = useState('all');
  const [tier, setTier] = useState('primary');
  const [order, setOrder] = useState('newest');

  // The source picker follows the feed picker: offering a news feed while the
  // page is set to primary sources only would be a filter that cannot return
  // anything.
  const sources = useMemo(() => {
    const pool = feed.items.filter((item) => tier === 'all' || item.tier === tier);
    return [...new Set(pool.map((item) => item.sourceId))]
      .map((id) => {
        const item = pool.find((entry) => entry.sourceId === id);
        const health = feed.sources?.find((entry) => entry.id === id);
        const count = pool.filter((entry) => entry.sourceId === id).length;
        return { id, label: health?.label || item?.sourceLabel || id, count };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [feed, tier]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = tracker.items.filter((item) => {
      if (tier !== 'all' && item.tier !== tier) return false;
      if (source !== 'all' && item.sourceId !== source) return false;
      if (coverage !== 'all' && item.coverage !== coverage) return false;
      if (!needle) return true;
      return `${item.title} ${item.summary} ${item.topics.join(' ')}`.toLowerCase().includes(needle);
    });
    return filtered.sort((a, b) =>
      order === 'newest'
        ? b.publishedAt.localeCompare(a.publishedAt)
        : a.publishedAt.localeCompare(b.publishedAt),
    );
  }, [tracker.items, query, source, coverage, tier, order]);

  const nearestCount = tracker.items.filter((item) => !item.matches.length && item.nearest.length).length;
  const instruments = useMemo(() => new Set(LEGAL.texts.map((text) => text.instrument)), []);
  const primaryCount = tracker.items.filter((item) => item.tier === 'primary').length;

  return (
    <section className="rara-tracker">
      <PageHead
        eyebrow="RARA · Development tracker"
        title="What changed, and what the law names"
        question="Which AI developments have an explicit hook in Indian law — and which are met with silence, or a different word?"
      >
        A dated feed built from primary sources — arXiv preprints, lab
        releases, regulator notices — read against a corpus of exact legal
        excerpts. The check is lexical: it reports shared words and control
        markers, not whether a provision applies. A silent result is a
        vocabulary gap, not a clearance.
      </PageHead>

      <div className="rara-tracker-callout">
        <div>
          <p className="overline">Snapshot</p>
          <p>
            {tracker.total} developments, {primaryCount} of them from primary sources,
            read against {tracker.checked} provisions from {instruments.size} instruments.
            Last collected {formatDay(feed.generatedAt)}. A scheduled run refreshes this
            every six hours; the page reads the newest collection when the store is
            configured, and the committed copy otherwise.
          </p>
        </div>
        <a className="btn btn-secondary" href="#/rara">
          Open the capability scanner
        </a>
      </div>

      <dl className="rara-tracker-stats">
        <div>
          <dt>Developments</dt>
          <dd className="data-num">{tracker.total}</dd>
        </div>
        <div>
          <dt>Explicit hook</dt>
          <dd className="data-num">{tracker.counts.explicit}</dd>
        </div>
        <div>
          <dt>Nearest, no shared word</dt>
          <dd className="data-num">{nearestCount}</dd>
        </div>
        <div>
          <dt>No subject match</dt>
          <dd className="data-num">{tracker.counts.silent - nearestCount}</dd>
        </div>
      </dl>

      <div className="rara-tracker-controls">
        <label>
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="voice, deepfake, training, data…"
          />
        </label>
        <label>
          <span>Source</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">All sources</option>
            {sources.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.label} ({entry.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Law match</span>
          <select value={coverage} onChange={(event) => setCoverage(event.target.value)}>
            <option value="all">All developments</option>
            <option value="explicit">Explicit hook</option>
            <option value="mentions">Names only</option>
            <option value="silent">No shared word</option>
          </select>
        </label>
        <label>
          <span>Feed</span>
          <select value={tier} onChange={(event) => setTier(event.target.value)}>
            <option value="primary">Primary sources</option>
            <option value="all">All sources</option>
          </select>
        </label>
        <label>
          <span>Order</span>
          <select value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <p className="meta rara-tracker-count" role="status" aria-live="polite">
        Showing {visible.length} of {tracker.total}. An explicit hook means the provision uses the
        same word and carries a control marker; it is not a legal conclusion.
      </p>

      <DevelopmentMap items={visible} />

      {visible.length ? (
        <ol className="rara-tracker-list">
          {visible.map((item) => (
            <Development item={item} key={item.id} />
          ))}
        </ol>
      ) : (
        <p className="card rara-tracker-noresults">
          Nothing in this snapshot matches that filter. Clear the search or choose another source.
        </p>
      )}

      <section className="rara-tracker-legal" aria-labelledby="rara-tracker-legal-title">
        <h2 id="rara-tracker-legal-title">The legal text it read</h2>
        <p className="section-strap">
          Exact excerpts from {instruments.size} instruments. The quote is the
          evidence; the tracker never paraphrases a provision into a finding.
        </p>
        <div className="rara-tracker-legal-grid">
          {[...new Set(LEGAL.texts.map((text) => text.instrument))].map((instrument) => {
            const texts = LEGAL.texts.filter((text) => text.instrument === instrument);
            return (
              <details className="rara-tracker-law" key={instrument}>
                <summary>
                  <span>{instrument}</span>
                  <span className="meta">{texts.length} provisions</span>
                </summary>
                {texts.map((text) => (
                  <article className="rara-tracker-law-row" key={text.id}>
                    <div className="rara-tracker-law-head">
                      <span className="rara-tracker-cite">{text.pinCite}</span>
                      <span className="meta">{text.regulator}</span>
                    </div>
                    <h3>{text.title}</h3>
                    <Quote provision={text} />
                    <p className="meta">
                      {text.inForce} · {text.reviewStatus} · retrieved {text.retrievedAt}
                    </p>
                    <a
                      className="rara-tracker-source"
                      href={text.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source: {text.sourceTitle}
                    </a>
                  </article>
                ))}
              </details>
            );
          })}
        </div>
      </section>

      <section className="rara-tracker-sources" aria-labelledby="rara-tracker-sources-title">
        <h2 id="rara-tracker-sources-title">Sources in this snapshot</h2>
        <p className="section-strap">
          Primary release pages first. News feeds are discovery only and are labelled as such.
        </p>
        <ul className="rara-tracker-source-list">
          {(feed.sources || []).map((entry) => (
            <li key={entry.id}>
              <span className={entry.ok ? 'rara-source-ok' : 'rara-source-fail'}>
                {entry.ok ? `${entry.count} items` : 'failed'}
              </span>
              <span>{entry.label}</span>
              <span className="meta">{SOURCE_TYPE[entry.type] || entry.type}</span>
              {entry.error ? <span className="meta">{entry.error}</span> : null}
            </li>
          ))}
        </ul>
        <p className="meta">
          A failed source is shown as failed. It is never read as “no news”.
        </p>
      </section>

      <p className="meta rara-method">
        Method: a topic gazetteer over the development's title and summary, a
        word-boundary match against the provision's exact text, and a fixed list
        of control markers. The first topic on a provision is its gate, so a
        data-protection provision does not match a development merely because
        both say “security”. This is a reading aid, not legal advice, and the
        corpus is deliberately small: {LEGAL.texts.length} provisions across{' '}
        {instruments.size} instruments. Silence here means the corpus did not use
        the development's words, not that no law applies.
      </p>
    </section>
  );
}
