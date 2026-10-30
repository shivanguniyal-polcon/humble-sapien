// RARA — the Regulatory Assessment & Resolution Architecture, as a section of
// its own. Ported from the Python prototype that lives outside this repository:
// the same 16-pillar corpus, the same vacuum register, the same severity
// formula, run in the browser with no model call and no server.
//
// The page has two jobs: let a reader put a capability in front of the law, and
// show the counted list of domains where there is no law to put it in front of.

import { useRef, useState } from 'react';
import PageHead from '../components/PageHead';
import RARA from '../data/rara.json';
import DEVELOPMENTS from '../data/rara/developments.json';
import LEGAL from '../data/rara/legal-texts.json';
import { runTriage } from '../lib/rara';

const STATUS_LABEL = {
  RED: 'Red · statutory collision',
  AMBER: 'Amber · the statute lags',
  GREEN: 'Green · safe harbour',
};

const VERDICT = {
  RED: 'A provision answers this capability directly. The question is enforcement, not drafting.',
  AMBER: 'A statute governs the ground, but its definitions do not reach this. The gap is the lag, not the absence.',
  GREEN: 'Nothing in the corpus is broken by this reading. The engine scores evidence in the text, not intent.',
};

// Three openings that exercise the three verdicts, so the instrument can be
// understood before anything is typed into it.
const EXAMPLES = [
  {
    label: 'Voice clone',
    text: 'Real-time zero-shot voice cloning from three seconds of audio, released as unwatermarked open weights that can spoof vKYC verification.',
  },
  {
    label: 'Scraped training set',
    text: 'A large multimodal training set assembled by scraping publicly available Indian profiles, faces and vernacular audio without consent.',
  },
  {
    label: 'Privacy audit',
    text: 'A differential privacy mechanism with an explainable model card and an independent fairness audit.',
  },
];

export default function Rara() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const scan = (value) => {
    const next = runTriage(RARA, value);
    setResult(next);
    if (next.empty) return;
    // The verdict is the answer; move the reader to it rather than making them
    // hunt below the fold of their own textarea.
    requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: false }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    scan(text);
  };

  const weak = result && !result.empty && (result.matches[0]?.score ?? 0) < 3;

  return (
    <section className="rara">
      <PageHead
        eyebrow="RARA · AI governance"
        title="RARA"
        question="Where does a capability hit Indian law — and where is there no law at all?"
      >
        The Regulatory Assessment &amp; Resolution Architecture. Paste a
        capability in your own words; it returns the provisions the text
        touches, the gap each one leaves, and the domains where India has no
        statute to test it against. Deterministic, in your browser, no model
        call.
      </PageHead>

      {/* The record comes before the scanner: a reader who wants the current
          picture should not have to type a capability first. */}
      <div className="rara-tracker-callout">
        <div>
          <p className="overline">The live record</p>
          <p>
            {DEVELOPMENTS.items.length} AI developments, read against{' '}
            {LEGAL.texts.length} exact provisions across six Indian instruments.
            Each row shows the words the law uses — or the word it does not have.
          </p>
        </div>
        <a className="btn btn-primary" href="#/rara/tracker">
          Open the tracker
        </a>
      </div>

      {/* The instrument is not the whole argument: it is the checkable layer
          the larger system has to stand on. Saying so before the scanner also
          sets the terms — a model may draft, but not over a record it cannot
          cite. */}
      <section className="rara-framework" aria-labelledby="rara-framework-title">
        <div className="rara-framework-copy">
          <p className="overline">The framework</p>
          <h2 id="rara-framework-title">A design thesis, with a checkable floor.</h2>
          <p>
            RARA AI is a design thesis, not a shipped product: the AI layer will
            regulate, restrict, alert and formulate for safer AI, but only over
            the same corpus, the same citations and the same refusal to invent a
            gap that the scanner already keeps.
          </p>
        </div>
        <dl className="rara-framework-list">
          <div>
            <dt>Regulate</dt>
            <dd>Read a capability against the provision that binds it, and name the regulator that has to act.</dd>
          </div>
          <div>
            <dt>Restrict</dt>
            <dd>Say what a release or a deployment cannot do until the missing rule exists.</dd>
          </div>
          <div>
            <dt>Alert</dt>
            <dd>Watch the statute, the amendment and the vacuum register, and raise the change while it still matters.</dd>
          </div>
          <div>
            <dt>Formulate</dt>
            <dd>Draft the rule the gap calls for &mdash; definition, duty and remedy in one hand.</dd>
          </div>
        </dl>
      </section>

      <form className="rara-scan" onSubmit={onSubmit}>
        <label htmlFor="rara-text">The capability</label>
        <textarea
          id="rara-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="A title or abstract — what the system does, how it is released, and who it acts on."
          spellCheck="true"
        />
        <div className="rara-scan-row">
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            Run the triage
          </button>
          <span className="meta rara-count">
            {RARA.counts.statutes} statutory pillars · {RARA.counts.vacuums} vacuum domains
          </span>
        </div>

        <div className="rara-examples">
          <span className="meta">Or start from one:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              className="rara-chip"
              onClick={() => {
                setText(example.text);
                scan(example.text);
              }}
            >
              {example.label}
            </button>
          ))}
        </div>
      </form>

      {result && !result.empty && (
        <div className="rara-result">
          {weak && (
            <p className="rara-weak">
              No provision is close to this text. The two below are the nearest
              by vocabulary, not by law — read them as a starting list, not a
              finding.
            </p>
          )}

          <div
            className="rara-verdict"
            data-status={result.status}
            ref={resultRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
          >
            <div className="rara-verdict-head">
              <span className="rara-badge" data-status={result.status}>
                {STATUS_LABEL[result.status]}
              </span>
              <span className="rara-severity data-num">
                {result.severity.toFixed(1)}
                <span className="rara-severity-den"> / 10</span>
              </span>
            </div>
            <p className="rara-verdict-line">{VERDICT[result.status]}</p>
            <p className="meta rara-verdict-meta">
              {result.riskHits} risk signal{result.riskHits === 1 ? '' : 's'} and{' '}
              {result.safeHits} safeguard signal{result.safeHits === 1 ? '' : 's'} in the text ·{' '}
              {result.matches.length} provision{result.matches.length === 1 ? '' : 's'} returned ·{' '}
              {result.vacuums.length} vacuum{result.vacuums.length === 1 ? '' : 's'} flagged
            </p>
          </div>

          <ol className="rara-matches">
            {result.matches.map((match) => (
              <li className="rara-match" key={match.entry.id} data-status={match.status}>
                <div className="rara-match-head">
                  <span className="rara-id data-num">{match.entry.id}</span>
                  <span className="rara-pillar">{match.entry.pillar}</span>
                  <span className="rara-match-status" data-status={match.status}>
                    {match.status}
                  </span>
                </div>
                <h3>{match.entry.statute}</h3>
                <p className="rara-clause">{match.entry.title}</p>
                <dl className="rara-facts">
                  <div>
                    <dt>Regulator</dt>
                    <dd>{match.entry.ministryRegulator}</dd>
                  </div>
                  <div>
                    <dt>Why it matched</dt>
                    <dd>
                      {match.evidence}{' '}
                      <span className="rara-score data-num">score {match.score.toFixed(2)}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Where the law lags</dt>
                    <dd>{match.entry.policyLag}</dd>
                  </div>
                  <div>
                    <dt>The remedy</dt>
                    <dd>{match.entry.remedy}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>

          {result.vacuums.length > 0 && (
            <div className="rara-vacuum-block">
              <h3 className="rara-subhead">Where India has no law to test it against</h3>
              {result.vacuums.map((flag) => (
                <article className="rara-vacuum" key={flag.vac.id}>
                  <div className="rara-vacuum-head">
                    <span className="rara-id data-num">{flag.vac.id}</span>
                    <span className="rara-badge rara-badge-vacuum">Zero-policy vacuum</span>
                  </div>
                  <h4>{flag.vac.domain}</h4>
                  <p>{flag.vac.description}</p>
                  <p className="meta">
                    <strong>Indian law:</strong> {flag.vac.status} · <strong>Benchmark:</strong>{' '}
                    {flag.vac.benchmark}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <section className="rara-register" aria-labelledby="rara-register-title">
        <h2 id="rara-register-title">The vacuum register</h2>
        <p className="section-strap">
          Every domain in which India holds no statute and no binding rule. The
          register is the count: nine places where a capability can land with
          nothing to answer it.
        </p>
        <ol className="rara-register-list">
          {RARA.vacuums.map((vac) => (
            <li key={vac.id}>
              <span className="rara-id data-num">{vac.id}</span>
              <div className="rara-register-body">
                <h3>{vac.domain}</h3>
                <p>{vac.description}</p>
                <p className="meta">
                  <strong>Indian law:</strong> {vac.status} · <strong>Benchmark:</strong>{' '}
                  {vac.benchmark}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="meta rara-method">
        Method: BM25 over the {RARA.counts.statutes} statutory pillars, with a
        domain-keyword boost, and a detector over the {RARA.counts.vacuums}{' '}
        registered vacuum domains. The severity formula and the signal lists are
        the prototype&rsquo;s own; the corpus is a snapshot committed with the
        site. It reads the words you give it, so it cannot know intent,
        enforceability, or whether a court would agree — and where it finds no
        vacuum, it says so rather than inventing one. Not legal advice.
      </p>
    </section>
  );
}
