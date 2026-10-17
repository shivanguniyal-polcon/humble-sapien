import { useState } from 'react';
import { publications, PUB_TYPES } from '../data/publications';
import { citeAPA, citeBibTeX, citeRIS, citeLine, pubPermalink } from '../lib/cite';

const PIT_ROWS = [
  ['benefits', 'Who benefits?'],
  ['pays', 'Who pays?'],
  ['missing', 'Who is missing?'],
];

const pitAnswered = (pub) =>
  (pub.pit ? PIT_ROWS.filter(([k]) => String(pub.pit[k] || '').trim()).length : 0);

const CopyField = ({ label, text }) => {
  const [done, setDone] = useState(false);
  return (
    <div className="cite-field">
      <div className="cite-field-head">
        <span className="approach-key">{label}</span>
        <button
          type="button"
          className="linklike"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setDone(true);
              setTimeout(() => setDone(false), 1600);
            } catch {
              setDone(false);
            }
          }}
        >
          {done ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="cite-pre">{text}</pre>
    </div>
  );
};

const CiteBlock = ({ pub }) => (
  <section className="pub-section">
    <h3>Cite this work</h3>
    <p className="fine-print">
      Stable link: <a href={pubPermalink(pub)}>{pubPermalink(pub)}</a>
    </p>
    <CopyField label="APA" text={citeAPA(pub)} />
    <CopyField label="BibTeX" text={citeBibTeX(pub)} />
    <CopyField label="RIS" text={citeRIS(pub)} />
    <p className="fine-print" style={{ marginBottom: 0 }}>
      Suggested citation: {citeLine(pub)}
    </p>
  </section>
);

const LibraryCard = ({ pub, onOpen }) => (
  <button
    className="pub-card"
    onClick={() => onOpen(pub.id)}
    title={`Permanent link: #/research/${pub.id}`}
  >
    <span className="pub-kicker">{pub.type} · {pub.domain}</span>
    <h3 className="pub-card-title">{pub.title}</h3>
    <p className="pub-card-abstract">{pub.abstract}</p>
    <span className="pub-meta">{pub.author} · {pub.date}</span>
    {pitAnswered(pub) < 3 && (
      <span className="pit-badge">
        {pub.pit ? `Distributional column incomplete (${pitAnswered(pub)} of 3)` : 'No distributional column'}
      </span>
    )}
  </button>
);

const PubPage = ({ pub, onBack, onNavigate }) => (
  <article className="pub-page">
    <button className="linklike" onClick={onBack}>
      Back to the library
    </button>
    <p className="pub-kicker">
      {pub.type} · {pub.domain} · {pub.date}
    </p>
    <h2 className="pub-title">{pub.title}</h2>
    <p className="pub-byline">{pub.author}</p>

    <p className="pub-abstract">{pub.abstract}</p>

    <section className="pub-section">
      <h3>Key findings</h3>
      <ol className="pub-findings">
        {pub.findings.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ol>
    </section>

    <section className="pub-section">
      <h3>Methods and scope</h3>
      <p>{pub.methods}</p>
    </section>

    <section className="pub-section">
      <h3>Who benefits, who pays, who is missing</h3>
      {!pub.pit && (
        <p className="fine-print">
          This entry declares itself argument, not measurement; it carries no
          distributional columns.
        </p>
      )}
      <dl className="pub-pit">
        {PIT_ROWS.map(([key, label]) => {
          const answer = pub.pit ? String(pub.pit[key] || '').trim() : '';
          return (
            <div key={key} className="pub-pit-row">
              <dt>{label}</dt>
              <dd>{answer || <em>[not answered]</em>}</dd>
            </div>
          );
        })}
      </dl>
    </section>

    <section className="pub-section">
      <h3>References</h3>
      <ol className="pub-citations">
        {pub.citations.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
    </section>

    <CiteBlock pub={pub} />

    {pub.downloads.length > 0 && (
      <section className="pub-section">
        <h3>Data and downloads</h3>
        <div className="btn-row">
          {pub.downloads.map(([name, kind]) => (
            <a
              key={name}
              className="btn btn-secondary"
              href={`data:${kind === 'json' ? 'application/json' : 'text/plain'},${encodeURIComponent(
                `THS research library: ${pub.title}\n${pub.date}\n\nThis download is a pointer file. The full ${kind.toUpperCase()} data ships with the THS Data Commons.\n`,
              )}`}
              download={name}
            >
              {name}
            </a>
          ))}
        </div>
      </section>
    )}

    {pub.related && (
      <div className="tool-ending">
        <h3>Now use it</h3>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate(pub.related.tab)}>
            {pub.related.label}
          </button>
        </div>
      </div>
    )}
  </article>
);

export default function Research({ onNavigate, openPub, onOpenPub }) {
  const [type, setType] = useState('All');
  const [localId, setLocalId] = useState(null);
  const openId = openPub !== undefined ? openPub : localId;
  const setOpenId = onOpenPub || setLocalId;

  const open = publications.find((p) => p.id === openId);
  if (open) {
    return (
      <section>
        <PubPage pub={open} onBack={() => setOpenId(null)} onNavigate={onNavigate} />
      </section>
    );
  }

  const shown = type === 'All' ? publications : publications.filter((p) => p.type === type);

  return (
    <section>
      <div className="section-head">
        <span className="overline">Research library</span>
        <h2>Every finding, with its receipts attached</h2>
        <p className="section-strap">
          Reports, working papers, datasets, tools and essays. Each one carries
          its author, date, methods, citations, downloads and a distributional
          column, so you can check the work instead of trusting the brand.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Filter by type">
        {PUB_TYPES.map((t) => (
          <button
            key={t}
            className={`chip ${type === t ? 'chip-active' : ''}`}
            aria-pressed={type === t}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="pub-grid">
        {shown.map((p) => (
          <LibraryCard key={p.id} pub={p} onOpen={setOpenId} />
        ))}
      </div>
    </section>
  );
}
