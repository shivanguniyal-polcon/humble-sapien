import { useState } from 'react';
import {
  promises,
  STATUS_LABELS,
  AUDIT_CHECKS,
  CHECK_STATES,
  SECTOR_LABELS,
  promiseSources,
  corpusFacts,
  manifestoPageUrl,
} from '../data/promises';
import {
  countByStatus,
  countBySector,
  filterPromises,
  buildScorecardText,
  buildPromiseRti,
} from '../lib/scorecards';
import PageHead from '../components/PageHead';

const CONTACT = 'shivang.uni@gmail.com';

export default function Scorecards({ onNavigate }) {
  const [sector, setSector] = useState(null);
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState('');

  const sectorPool = sector
    ? promises.filter((promise) => promise.sector === sector)
    : promises;
  const counts = countByStatus(sectorPool);
  const sectorCounts = countBySector(promises);
  const shown = filterPromises(promises, { sector, status });
  const audited = promises.filter((promise) => promise.status !== 'queued').length;
  const queued = promises.length - audited;

  const copy = async (id, kind, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${id}:${kind}`);
    } catch {
      setCopied(`${id}:failed`);
    }
  };

  const clear = () => {
    setSector(null);
    setStatus(null);
  };

  return (
    <div>
      <PageHead
        eyebrow="Promise scorecards"
        title="Sankalp"
        question="What was promised, what is the record?"
      >
        Every manifesto is written in the future tense; we read it in the past
        tense. All {promises.length} commitments in the health chapter, the
        women-and-children health block and the geriatric pledge of the BJP
        Gujarat 2022 manifesto, transcribed with their page numbers. {' '}{audited} are
        checked against public evidence up to October 2026. The other {queued}{' '}
        are queued: a card gets a verdict only when there is a receipt to read.
      </PageHead>
      <p className="fine-print">
        The vocabulary is strict on purpose.{' '}
        <strong>No public evidence found</strong> does not mean a thing did not
        happen. It means the promise was made in public and the receipt was
        not. That gap is what this scorecard measures.
      </p>
      <p className="fine-print">
        <strong>Not yet checked</strong> is a stage, not a verdict. The promise
        is transcribed and waiting for the same four checks. The queue is public
        because a blank card is more honest than a verdict without a paper trail.
      </p>

      <div
        className="scorecard-sectors"
        role="group"
        aria-label="Filter by sector"
      >
        <button
          type="button"
          className={`scorecard-sector${sector === null ? ' is-active' : ''}`}
          aria-pressed={sector === null}
          onClick={() => setSector(null)}
        >
          All sectors <span className="data-num">{promises.length}</span>
        </button>
        {sectorCounts.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`scorecard-sector${sector === entry.id ? ' is-active' : ''}`}
            aria-pressed={sector === entry.id}
            onClick={() => setSector(sector === entry.id ? null : entry.id)}
            title={entry.description}
          >
            {entry.label} <span className="data-num">{entry.count}</span>
          </button>
        ))}
      </div>

      <div className="scorecard-summary">
        {counts.map(({ status: state, count }) => (
          <button
            key={state}
            type="button"
            className={`score-tile score-${state}${status === state ? ' is-active' : ''}`}
            aria-pressed={status === state}
            onClick={() => setStatus(status === state ? null : state)}
          >
            <span className="score-num data-num">{count}</span>
            <span className="score-label">{STATUS_LABELS[state]}</span>
          </button>
        ))}
      </div>

      <div className="scorecard-filter">
        <p className="meta" role="status">
          Showing {shown.length} of {promises.length}
          {sector ? ` · ${SECTOR_LABELS[sector]}` : ' · all sectors'}
          {status ? ` · ${STATUS_LABELS[status]}` : ' · all verdicts'}
        </p>
        {(sector || status) && (
          <button type="button" className="scorecard-reset" onClick={clear}>
            Show all
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <div className="card scorecard-empty">
          <p>
            No card matches these filters. That can be a reading in itself: this
            sector has nothing in this state. Clear the filters to see the whole
            set.
          </p>
          <button type="button" className="btn btn-secondary" onClick={clear}>
            Clear both filters
          </button>
        </div>
      )}

      {shown.map((p) => {
        const isQueued = p.status === 'queued';
        return (
          <div
            key={p.id}
            className={`card scorecard${isQueued ? ' is-queued' : ''}`}
          >
            <div className="scorecard-head">
              <span className="scorecard-index data-num">
                {String(shown.indexOf(p) + 1).padStart(2, '0')}
              </span>
              <span className={`score-badge score-${p.status}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </div>
            <p className="scorecard-promise">{p.promise}</p>
            {!isQueued && <p className="scorecard-reading">{p.reading}</p>}

            <p className="scorecard-source meta">
              <a
                href={manifestoPageUrl(p.pdfPage)}
                target="_blank"
                rel="noreferrer"
              >
                {p.sourceChapter}, p. {p.page}
              </a>
              {' · '}
              {p.department}
            </p>

            {isQueued ? (
              <div className="scorecard-queue">
                <span className="approach-key">Not checked</span>
                <p>
                  No order, budget line or operational record has been searched
                  for this promise. It carries no finding.
                </p>
              </div>
            ) : (
              <>
                <div className="scorecard-rubric">
                  <div className="scorecard-rubric-head">
                    <span className="approach-key">The four checks</span>
                    <span className="meta">
                      The same four on every card. “Not found” is about the
                      paper, not reality.
                    </span>
                  </div>
                  <dl className="rubric-list">
                    {AUDIT_CHECKS.map((check) => {
                      const found = p.checks[check.id];
                      const state = CHECK_STATES[found.state];
                      return (
                        <div key={check.id} className="rubric-row">
                          <dt>
                            {check.label}
                            <span className="rubric-ask">{check.ask}</span>
                          </dt>
                          <dd>
                            <span
                              className={`rubric-state is-${found.state}`}
                              title={state.detail}
                            >
                              {state.label}
                            </span>
                            {found.note && (
                              <span className="rubric-note">{found.note}</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>

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
              </>
            )}

            <div className="btn-row scorecard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copy(p.id, 'card', buildScorecardText(p))}
              >
                {isQueued ? 'Copy this promise' : 'Copy this card'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copy(p.id, 'rti', buildPromiseRti(p))}
              >
                Copy an RTI for this promise
              </button>
            </div>
            {copied.startsWith(`${p.id}:`) && (
              <p className="meta scorecard-copy" role="status">
                {copied === `${p.id}:card` &&
                  (isQueued
                    ? 'Promise copied with its page, sector and the four checks still to run.'
                    : 'Card copied with its verdict, checks and links.')}
                {copied === `${p.id}:rti` &&
                  'RTI application copied. Fill the bracketed fields before you file it.'}
                {copied === `${p.id}:failed` &&
                  'The browser would not copy it. Select the text and copy it by hand.'}
              </p>
            )}
          </div>
        );
      })}

      <div className="card">
        <h3>The corpus behind this</h3>
        <div className="approach-grid">
          {corpusFacts.map((fact) => (
            <div key={fact.n} className="approach-row">
              <span className="approach-key data-num">{fact.n}</span>
              <p className="approach-val">
                {fact.text}.{' '}
                {fact.href && <a href={fact.href}>{fact.link}</a>}
              </p>
            </div>
          ))}
        </div>
        <p className="meta">
          Page numbers are from the printed manifesto. Each card links to the
          PDF page it quotes. The promise text is transcribed, not paraphrased:
          if a line does not match the page, that is a bug, not a reading.
        </p>
        <p className="meta" style={{ marginBottom: 0 }}>
          Sources: {promiseSources.join(' · ')}. Status calls are THS judgements
          from the linked evidence, checked October 2026. If you have an official
          record that changes a call,{' '}
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Record for a promise scorecard')}`}>
            send it
          </a>{' '}
          and we will update the card.
        </p>
      </div>

      <div className="card tool-ending">
        <h3>Now use it</h3>
        <p>
          A scorecard tells you what to ask next. Every card carries a ready RTI
          application for the department that holds the file, including the
          cards still waiting for a check. Copy it, fill the bracketed fields,
          and file it. The evidence file puts every dated source in one place.
        </p>
        <div className="btn-row">
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('research', 'promise-scorecards')}
          >
            Read the working paper
          </button>
          <a
            className="btn btn-secondary"
            href="/research/ths_promise_evidence.txt"
            download
          >
            Download the evidence file
          </a>
          <button className="btn btn-secondary" onClick={() => onNavigate('compare')}>
            Compare with promises worldwide
          </button>
        </div>
      </div>
    </div>
  );
}
