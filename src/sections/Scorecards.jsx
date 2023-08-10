import {
  promises,
  STATUS_LABELS,
  promiseSources,
  corpusFacts,
} from '../data/promises';

const STATUS_ORDER = ['delivered', 'partial', 'announced', 'none'];

export default function Scorecards({ onNavigate, onTool }) {
  const counts = STATUS_ORDER.map((s) => ({
    s,
    n: promises.filter((p) => p.status === s).length,
  })).filter((c) => c.n > 0);

  return (
    <div>
      <div className="card">
        <h3>Promise scorecards</h3>
        <p>
          Every manifesto is written in the future tense. We read it in the past
          tense. Below are four health promises from the BJP Gujarat 2022
          manifesto, checked line by line against public evidence up to October
          2026.
        </p>
        <p style={{ marginBottom: 0 }}>
          The vocabulary is strict on purpose.{' '}
          <strong>No public evidence found</strong> does not mean a thing did
          not happen. It means the promise was made in public and the receipt
          was not. That gap is what this scorecard measures.
        </p>
      </div>

      <div className="scorecard-summary">
        {counts.map(({ s, n }) => (
          <div key={s} className={`score-tile score-${s}`}>
            <span className="score-num data-num">{n}</span>
            <span className="score-label">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {promises.map((p, i) => (
        <div key={p.id} className="card scorecard">
          <div className="scorecard-head">
            <span className="scorecard-index data-num">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className={`score-badge score-${p.status}`}>
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          <p className="scorecard-promise">{p.promise}</p>
          <p className="scorecard-reading">{p.reading}</p>
          <div className="scorecard-evidence">
            <span className="approach-key">Evidence on record</span>
            <ul className="evidence-list">
              {p.evidence.map(([when, what, url]) => (
                <li key={what}>
                  <span className="data-num evidence-when">{when}</span>{' '}
                  <a href={url} target="_blank" rel="noreferrer">
                    {what}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      <div className="card">
        <h3>The corpus behind this</h3>
        <div className="approach-grid">
          {corpusFacts.map(([n, text]) => (
            <div key={n} className="approach-row">
              <span className="approach-key data-num">{n}</span>
              <p className="approach-val">{text}</p>
            </div>
          ))}
        </div>
        <p className="meta" style={{ marginBottom: 0 }}>
          Sources: {promiseSources.join(' · ')}. Status calls are THS judgements
          from the linked evidence, checked October 2026. If you have an official
          record that changes a call, send it and we will update the card.
        </p>
      </div>

      <div className="card tool-ending">
        <h3>Now use it</h3>
        <p>
          A scorecard tells you what to ask next. Take the promise above to the
          touchpoint map and find exactly which office owes you the answer.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onTool('touchpoints')}>
            Find the office that owes you an answer
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('compare')}>
            Compare with promises worldwide
          </button>
        </div>
      </div>
    </div>
  );
}
