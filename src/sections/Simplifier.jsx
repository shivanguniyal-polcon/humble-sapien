import { useMemo, useState } from 'react';
import { simplify, SAMPLE_TEXT } from '../lib/simplify';

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

export default function Simplifier() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const result = useMemo(() => simplify(text), [text]);

  return (
    <section>
      <div className="section-head">
        <h2>Policy Simplifier</h2>
        <p className="section-strap">
          Paste any policy or legal text. The pipeline rewrites statutory
          phrasing into plain, almost spoken language, splits what&apos;s too
          long to say in one breath, scores readability before and after, and
          renders recognized clauses in Hindi. Everything runs in your browser.
        </p>
      </div>

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
          <label>Plain-language version</label>
          <div className="output-box">
            {result.simplifiedText || (
              <em className="placeholder">Nothing to simplify yet.</em>
            )}
          </div>

          {result.stats.replacements.length > 0 && (
            <div className="output-sub" style={{ marginTop: '1.5rem' }}>
              <h4>Statutory phrases replaced</h4>
              <ul className="replace-list">
                {result.stats.replacements.map((r) => (
                  <li key={r.term}>
                    <code>{r.term}</code> <span>× {r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.obligations.length > 0 && (
            <div className="output-sub" style={{ marginTop: '1.5rem' }}>
              <h4>Obligations found: who must do what</h4>
              <ul>
                {result.obligations.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="hindi-panel">
            <h4>हिंदी सरल सारांश · Hindi plain version</h4>
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
        </div>
      </div>
    </section>
  );
}
