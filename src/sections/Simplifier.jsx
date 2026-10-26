import { useMemo, useState } from 'react';
import { simplify, SAMPLE_TEXT, LEGAL_SAMPLE_TEXT } from '../lib/simplify.js';
import LegalReview from '../components/LegalReview.jsx';
import { PIT_QUESTIONS, checkPit } from '../battery/report.js';
import { usePitDraft } from '../lib/pitStore.js';
import { LEVELS, DEFAULT_LEVEL } from '../lib/legal/levels.js';
import PageHead from '../components/PageHead';

const Readability = ({ label, data, tone }) => (
  <div className="stat">
    <span className="stat-num">{data.score}</span>
    <span className="stat-label">{label} · Flesch ease</span>
    <span className={`read-band ${tone}`}>{data.band}</span>
    <span className="meta data-num">
      Grade {data.grade} · {data.words} words · {data.sentences} sentences
    </span>
  </div>
);

const ModeSwitch = ({ mode, onChange }) => (
  <div className="filter-row mode-switch" role="group" aria-label="Simplifier mode">
    <button
      type="button"
      className={`chip ${mode === 'citizen' ? 'chip-active' : ''}`}
      onClick={() => onChange('citizen')}
      aria-pressed={mode === 'citizen'}
    >
      Citizen read
    </button>
    <button
      type="button"
      className={`chip ${mode === 'legal' ? 'chip-active' : ''}`}
      onClick={() => onChange('legal')}
      aria-pressed={mode === 'legal'}
    >
      Legal review
    </button>
    <span className="fine-print">
      {mode === 'citizen'
        ? 'A plain-language rewrite for anyone, with a public interest check before it can be copied.'
        : 'The same rewrite, reviewable: source spans, clause types, risk flags, an audit trail and a gate before anything is exported.'}
    </span>
  </div>
);

function CitizenPanel({ text, setText }) {
  const [levelId, setLevelId] = useState(DEFAULT_LEVEL);
  const result = useMemo(() => simplify(text, { level: levelId }), [text, levelId]);
  const [pit, setPit] = useState({ whoBenefits: '', whoPays: '', whoMissing: '' });
  const [view, setView] = useState('cards');
  const [copied, setCopied] = useState(false);
  const pitDraft = usePitDraft();
  const pitCheck = checkPit(pit);

  // The rewrite only travels with the people it binds named. The gate is the
  // same three questions the battery asks, and the answers ride in the copied
  // text beside the obligations they describe.
  const copyText = () => {
    const lines = [
      'THS Policy Simplifier: plain-language rewrite',
      '',
      `Original: Flesch reading ease ${result.readability.original.score} (${result.readability.original.band}), grade ${result.readability.original.grade}.`,
      `Plain version: Flesch reading ease ${result.readability.simplified.score} (${result.readability.simplified.band}), grade ${result.readability.simplified.grade}.`,
      '',
      '--- Plain-language version ---',
      result.simplifiedText,
    ];
    if (result.obligations.length > 0) {
      lines.push(
        '',
        '--- Obligations found: who must do what ---',
        ...result.obligations.map((o, i) => {
          const flags = [
            o.fragment ? 'fragment' : null,
            o.split ? 'part of a longer sentence' : null,
            o.hedged ? 'hedged' : null,
          ].filter(Boolean);
          return `${i + 1}. [${o.typeLabel}] ${o.text}${flags.length ? ` (${flags.join('; ')})` : ''}`;
        }),
      );
    }
    if (result.hindi.sentences.length > 0) {
      lines.push('', '--- Hindi plain version ---', ...result.hindi.sentences.map((h) => h.text));
    }
    lines.push('', '--- Public interest check ---');
    for (const q of PIT_QUESTIONS) {
      lines.push(`${q.label} ${String(pit[q.key] || '').trim() || '[not answered]'}`);
    }
    lines.push(
      '',
      'Both texts travel together: the rewrite never replaces the original. The Hindi layer is rule-based and needs translator review before formal use.',
      result.hindi.note,
    );
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="simplifier-layout">
      <div className="simplifier-input">
        <label htmlFor="policy-text">Policy or legal text</label>
        <textarea
          id="policy-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
        />
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => setText(SAMPLE_TEXT)}>
            Load sample
          </button>
          <button className="btn btn-secondary" onClick={() => setText('')}>
            Clear
          </button>
        </div>

        <div className="stat-grid">
          <Readability
            label="Original"
            data={result.readability.original}
            tone="read-hard"
          />
          <Readability
            label="Plain version"
            data={result.readability.simplified}
            tone="read-easy"
          />
        </div>
        <p className="meta">
          Flesch Reading Ease runs 0–100 (higher is easier); the grade is the
          US school year needed to read it comfortably.
        </p>
      </div>

      <div className="simplifier-output">
        <div className="filter-row mode-switch" role="group" aria-label="Reading level">
          {[...LEVELS].reverse().map((level) => (
            <button
              key={level.id}
              type="button"
              className={`chip ${levelId === level.id ? 'chip-active' : ''}`}
              onClick={() => setLevelId(level.id)}
              aria-pressed={levelId === level.id}
            >
              {level.label}
            </button>
          ))}
          <span className="fine-print">
            {result.level.note}
          </span>
        </div>
        <p className="meta" aria-live="polite">
          Target ease {result.level.band[0]}–{result.level.band[1]} · this text scores{' '}
          <strong>{result.level.achieved}</strong>{' '}
          {result.level.reached ? '— in band.' : '— below band.'}
          {result.level.floors.length > 0
            ? ` The cap of ${result.level.cap} words could not be reached in ${result.level.floors.length} sentence${result.level.floors.length > 1 ? 's' : ''}: names and quoted references set the floor.`
            : ''}
        </p>
        <div className="filter-row mode-switch" role="group" aria-label="Output view">
          <button
            type="button"
            className={`chip ${view === 'cards' ? 'chip-active' : ''}`}
            onClick={() => setView('cards')}
            aria-pressed={view === 'cards'}
          >
            Rule cards
          </button>
          <button
            type="button"
            className={`chip ${view === 'substitution' ? 'chip-active' : ''}`}
            onClick={() => setView('substitution')}
            aria-pressed={view === 'substitution'}
          >
            Substitution view
          </button>
          <span className="fine-print">
            {view === 'cards'
              ? 'One card per sentence: who must do what, by when, unless what — and what the engine could not read.'
              : 'The rewritten paragraph as it stands today, with every phrase the dictionary replaced.'}
          </span>
        </div>

        {view === 'cards' && (
          <div className="output-sub">
            <label>Rule cards: who must do what, by when, unless what</label>
            <p className="meta">
              Every sentence becomes a card, read for structure and grouped
              under the clause it sits in. The chips say which fields the
              engine read and which it could not. A sentence no rule
              touched is still read — its confidence is structural, never a
              green tick.
            </p>
            {result.ruleCards
              .reduce((groups, card) => {
                const key = card.clause || '';
                const last = groups[groups.length - 1];
                if (last && last.clause === key) last.cards.push(card);
                else groups.push({ clause: key, cards: [card] });
                return groups;
              }, [])
              .map((group, i) => (
                <section key={`clause-${i}`} className="clause-group">
                  {group.clause ? <h3 className="card-heading">{group.clause}</h3> : null}
                  <ul className="obligation-list rule-card-list">
                    {group.cards.map((card) => (
                      <li key={card.id}>
                        <span
                          className={`obligation-type${card.kind === 'duty' ? ' obligation-action' : ''}`}
                          title={card.kindNote}
                        >
                          {card.kindLabel}
                        </span>
                        <span className="obligation-text">
                          {card.who ? <strong>{card.who}</strong> : null}
                          {card.who ? ' ' : ''}
                          {card.force ? `${card.force} ` : ''}
                          {card.mustDo}
                          {card.byWhen.length > 0 ? `; by when: ${card.byWhen.join(', ')}` : ''}
                          {card.unlessWhat.length > 0 ? `; unless: ${card.unlessWhat.join('; ')}` : ''}
                        </span>
                        <span
                          className="obligation-flag"
                          title={`Structural confidence: needs ${card.confidence.expected} expected slots; has ${card.confidence.found}.${card.confidence.missing.length ? ` Missing: ${card.confidence.missing.join(', ')}.` : ''}`}
                        >
                          {card.structural ? 'structural read' : 'frame read'} · {card.confidence.band}
                        </span>
                        <span className="obligation-flag" title="What the engine read, and what it could not.">
                          read: {card.fieldsRead.join(', ') || 'the sentence itself'}
                          {card.fieldsMissing.length > 0 ? ` · not read: ${card.fieldsMissing.join(', ')}` : ''}
                        </span>
                        <p className="meta">Source: {card.source}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}

        {view === 'substitution' && (
          <>
        <label>Plain-language version</label>
        <div className="output-box">
          {result.simplifiedText || (
            <em className="placeholder">Nothing to simplify yet.</em>
          )}
        </div>

        {result.propositions.length > 0 && (
          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h3 className="card-heading">Propositions: the frame beside the rewrite</h3>
            <p className="meta">
              Every sentence is typed and slotted into one canonical frame —
              who, with what force, does what, when, and unless what. The
              frame sits beside today&apos;s rewrite so the two can be
              compared: a dropped condition, a lost deadline or a softened
              duty shows up here even when both sentences read well.
            </p>
            <ul className="proposition-list">
              {result.propositions.map((p) => (
                <li key={p.id}>
                  <span
                    className={`obligation-type${p.kind === 'duty' ? ' obligation-action' : ''}`}
                    title={p.kindNote}
                  >
                    {p.kindLabel}
                  </span>
                  <div className="proposition-compare">
                    <div>
                      <span className="proposition-side">Today&apos;s rewrite</span>
                      <p className="proposition-rewrite">{p.rewrite}</p>
                    </div>
                    <div>
                      <span className="proposition-side">Canonical frame</span>
                      <p className="proposition-frame">{p.frame}</p>
                    </div>
                  </div>
                  {(p.flags.fragment || p.flags.hedged || p.split) && (
                    <span className="obligation-flag">
                      {[
                        p.flags.fragment ? 'fragment' : null,
                        p.split ? 'part of a longer sentence' : null,
                        p.flags.hedged ? 'hedged' : null,
                      ]
                        .filter(Boolean)
                        .join('; ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.stats.replacements.length > 0 && (
          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h3 className="card-heading">Statutory phrases replaced</h3>
            <ul className="replace-list">
              {result.stats.replacements.map((r) => (
                <li key={`${r.from ?? r.term}-${r.to ?? ''}`}>
                  <code>{r.from ?? r.term}</code> <span>× {r.count}</span>
                  <span>{' → '}{r.removed ? 'removed' : <code>{r.to}</code>}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
          </>
        )}

        {result.obligations.length > 0 && (
          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h3 className="card-heading">Obligations found: who must do what</h3>
            <p className="meta">
              Every line is typed. A duty is something someone has to do. A
              grant is something they may claim. A composition rule says who
              sits where. Only the first is a task, so the types are what
              separates a task list from a list of sentences.
            </p>
            <ul className="obligation-list">
              {result.obligations.map((o) => (
                <li key={o.id}>
                  <span className={`obligation-type obligation-${o.type}`}>
                    {o.typeLabel}
                  </span>
                  <span className="obligation-text">{o.text}</span>
                  {o.fragment && (
                    <span className="obligation-flag" title="This sentence is cut off in the source. Read it with the sentence around it.">
                      fragment
                    </span>
                  )}
                  {o.split && (
                    <span className="obligation-flag" title="This is one part of a sentence that was too long to say in one breath. Read it with the other part.">
                      part of a longer sentence
                    </span>
                  )}
                  {o.hedged && (
                    <span className="obligation-flag" title="The source hedges: preferably, endeavour, as far as possible.">
                      hedged
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.definitions.length > 0 && (
          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h3 className="card-heading">Definitions read, and left alone</h3>
            <ul>
              {result.definitions.map((d) => (
                <li key={d.term}>
                  <code>{d.term}</code> — {d.definition || '[definition not read]'}
                </li>
              ))}
            </ul>
            <p className="meta">
              Terms the instrument defines for itself are never rewritten. A
              word the Act gives its own meaning is the one word a plain
              rewrite must not touch.
            </p>
          </div>
        )}

        <div className="hindi-panel">
          <h3 className="card-heading">हिंदी सरल सारांश · Hindi plain version</h3>
          {result.hindi.sentences.map((h, i) => (
            <p key={i} className={`hindi-line ${h.template ? 'hindi-tpl' : ''}`}>
              {h.text}
            </p>
          ))}
          <table className="data-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Term</th>
                <th>हिंदी</th>
              </tr>
            </thead>
            <tbody>
              {result.hindi.glossary.map(([en, hi]) => (
                <tr key={en}>
                  <td>{en}</td>
                  <td>{hi}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="meta" style={{ marginTop: '0.75rem' }}>
            {result.hindi.note}
          </p>
        </div>

        <div className="output-sub" style={{ marginTop: '1.5rem' }}>
          <h3 className="card-heading">Public interest check (required to copy)</h3>
          <p className="meta">
            Every exported rewrite names who the obligations bind. All three
            answers travel in the copied text; the gate opens when they are in.
          </p>
          {PIT_QUESTIONS.map((q) => (
            <div key={q.key} className="control">
              <label>{q.label}</label>
              <textarea
                value={pit[q.key]}
                onChange={(e) => setPit({ ...pit, [q.key]: e.target.value })}
                rows={2}
                aria-describedby="simplifier-pit-hint"
              />
            </div>
          ))}
          {pitDraft && (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPit({
                  whoBenefits: pitDraft.whoBenefits,
                  whoPays: pitDraft.whoPays,
                  whoMissing: pitDraft.whoMissing,
                })}
              >
                Fill from the stakeholder map{pitDraft.policyName ? ` (${pitDraft.policyName})` : ''}
              </button>
            </div>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCopy}
              disabled={!pitCheck.complete || !result.simplifiedText}
              aria-describedby="simplifier-pit-hint"
            >
              {copied ? 'Copied' : 'Copy the rewrite'}
            </button>
            <p id="simplifier-pit-hint" className="fine-print">
              {!result.simplifiedText
                ? 'There is nothing to copy yet: paste or load a text.'
                : !pitCheck.complete
                  ? `Answer all three to unlock the copy: still needed — ${pitCheck.missing.join('; ')}.`
                  : 'Both texts and all three answers travel in the copied text.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Simplifier() {
  const [mode, setMode] = useState('citizen');
  const [text, setText] = useState(SAMPLE_TEXT);

  const switchMode = (next) => {
    setMode(next);
    if (next === 'legal' && text === SAMPLE_TEXT) setText(LEGAL_SAMPLE_TEXT);
    if (next === 'citizen' && text === LEGAL_SAMPLE_TEXT) setText(SAMPLE_TEXT);
  };

  return (
    <section>
      <PageHead
        eyebrow="Policy simplifier"
        title="Saral"
        question="What does this notification actually say?"
      >
        Paste any policy or legal text. The pipeline rewrites statutory phrasing
        into plain, almost spoken language, splits what&apos;s too long to say
        in one breath, scores readability before and after, and renders
        recognised clauses in Hindi. Read it sentence by sentence, note the
        flags that need a lawyer, and export the review file with the source
        text attached. Everything runs in your browser.
      </PageHead>

      <ModeSwitch mode={mode} onChange={switchMode} />

      {mode === 'citizen' ? (
        <CitizenPanel text={text} setText={setText} />
      ) : (
        <LegalReview text={text} onTextChange={setText} />
      )}
    </section>
  );
}
