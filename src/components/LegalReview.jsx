import { useEffect, useMemo, useState } from 'react';
import { analyse, compare, JURISDICTIONS } from '../lib/legal/pipeline.js';
import { FLAG_LABELS, FLAG_MEANING } from '../lib/legal/risk.js';
import { CLAUSE_ORDER, getClauseType } from '../lib/legal/clauses.js';
import {
  LEGAL_GATE_QUESTIONS, checkLegalGate, buildManifest, buildBundle,
  buildMarkdown, buildHtml, buildRedlineCsv, buildDeltaReport, methodologyCard,
} from '../lib/legal/exports.js';
import { buildDocx, docxFileName } from '../lib/legal/docx.js';
import { buildClientBriefText, buildClientBriefHtml, printHtml } from '../lib/legal/clientBrief.js';
import { CONFIDENCE_MEANING } from '../lib/legal/confidence.js';
import {
  buildReviewFile, parseReviewFile, reviewDecision, reviewCounts,
  exportedRows, rejectedRows,
} from '../lib/legal/review.js';
import { currencyCheck } from '../lib/legal/currency.js';
import {
  MATTER_FIELDS, emptyMatter, normaliseMatter, matterComplete,
  createRunRecord, appendRun, readRuns, clearRuns,
  exportAuditCsv, exportAuditJson, verifyRun,
} from '../lib/legal/audit.js';

const download = (name, data, type) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const FlagChip = ({ flag }) => (
  <span className={`flag-chip flag-${flag}`}>
    {flag} · {FLAG_LABELS[flag]}
  </span>
);

// The confidence axis is a second reading of the same sentence. It answers
// "can I trust this without going back to the source", which the flag does
// not. Low confidence says so out loud; it is never rounded up.
const ConfidenceChip = ({ confidence }) => {
  if (!confidence) return null;
  return (
    <span
      className={`conf-chip conf-${confidence.level}`}
      title={confidence.meaning}
    >
      {confidence.level} confidence
    </span>
  );
};

const Stat = ({ label, value, tone }) => (
  <div className="stat">
    <span className="stat-num">{value}</span>
    <span className="stat-label">{label}</span>
    {tone ? <span className={`read-band ${tone}`}>{tone === 'read-easy' ? 'target met' : 'over target'}</span> : null}
  </div>
);

export default function LegalReview({ text, onTextChange }) {
  const [jurisdictionId, setJurisdictionId] = useState('in-bare-act');
  const [meta, setMeta] = useState({
    title: '', citation: '', version: '', date: '', url: '', reviewer: '',
  });
  const [gate, setGate] = useState({
    currency: '', definitions: '', reviewer: '', circulation: '',
  });
  const [matter, setMatter] = useState(emptyMatter());
  const [review, setReview] = useState({});
  const [reviewText, setReviewText] = useState('');
  const [filter, setFilter] = useState('all');
  const [confFilter, setConfFilter] = useState('all');
  const [openRow, setOpenRow] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [copied, setCopied] = useState(false);
  const [compareText, setCompareText] = useState('');
  const [delta, setDelta] = useState(null);
  const [showMethod, setShowMethod] = useState(false);
  const [notice, setNotice] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runCheck, setRunCheck] = useState(null);

  const result = useMemo(
    () => analyse(text, { jurisdictionId, mode: 'legal-review', source: meta }),
    [text, jurisdictionId, meta],
  );

  const gateCheck = checkLegalGate(gate);
  const targetMet = result.readability.simplified.grade <= result.jurisdiction.readability.grade;
  const counts = useMemo(() => reviewCounts(result, review), [result, review]);
  const currency = useMemo(() => currencyCheck(result.source), [result.source]);
  const matterFields = useMemo(() => normaliseMatter(matter), [matter]);
  const matterOk = matterComplete(matter);
  const reviewStale = Boolean(Object.keys(review).length) && reviewText !== text;

  useEffect(() => {
    let live = true;
    buildManifest(result, { gate, review }).then((m) => {
      if (live) setManifest(m);
    });
    return () => {
      live = false;
    };
  }, [result, gate, review]);

  useEffect(() => {
    setRuns(readRuns());
  }, []);

  const visibleRows = useMemo(
    () =>
      result.rows.filter((r) => {
        if (filter !== 'all' && r.flag !== filter) return false;
        if (confFilter !== 'all' && (!r.confidence || r.confidence.level !== confFilter)) return false;
        return true;
      }),
    [result.rows, filter, confFilter],
  );

  const setMetaField = (key) => (event) => setMeta({ ...meta, [key]: event.target.value });
  const setMatterField = (key) => (event) => setMatter({ ...matter, [key]: event.target.value });

  // A decision is a person's judgement about one sentence. It is recorded
  // with their comment, and it is never applied silently: a rejected
  // sentence leaves every export, but it stays in the record with the
  // reason it was removed.
  const applyDecision = (id, state) => {
    setReview((prev) => {
      const current = prev[id] || { state: 'pending', comment: '' };
      const next = { ...current, state };
      const out = { ...prev };
      if (next.state === 'pending' && !next.comment) delete out[id];
      else out[id] = next;
      return out;
    });
    setReviewText(text);
  };

  const setComment = (id, comment) => {
    setReview((prev) => {
      const current = prev[id] || { state: 'pending', comment: '' };
      const out = { ...prev };
      if (current.state === 'pending' && !comment.trim()) delete out[id];
      else out[id] = { ...current, comment };
      return out;
    });
    setReviewText(text);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (!openRow) return;
      const tag = (event.target && event.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        applyDecision(openRow, 'accepted');
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        applyDecision(openRow, 'rejected');
      } else if (event.key === 'Escape') {
        setOpenRow(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // The run log. It is append-only and it never leaves the device unless
  // the reviewer exports it on purpose.
  const recordRun = async (action) => {
    try {
      const record = await createRunRecord(result, {
        manifest, gate, matter: matterFields, review, action,
      });
      const { runs: kept, dropped } = appendRun(record);
      setRuns(kept);
      setNotice(
        dropped > 0
          ? {
              tone: 'warn',
              text: `Run recorded. ${dropped} older run${dropped > 1 ? 's' : ''} fell off the end of the on-device log, which holds ${kept.length}.`,
            }
          : { tone: 'ok', text: `Run recorded in the on-device log (${kept.length} run${kept.length === 1 ? '' : 's'}).` },
      );
    } catch {
      setNotice({ tone: 'warn', text: 'The run could not be written to the log. The export itself is unaffected.' });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildBundle(result, { gate, manifest, review }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      recordRun('copy-bundle');
    } catch {
      setCopied(false);
    }
  };

  const handleCompare = () => {
    if (!compareText.trim()) {
      setDelta(null);
      return;
    }
    setDelta(compare(compareText, text, { jurisdictionId, source: meta }));
  };

  const handleReviewExport = async () => {
    const raw = await buildReviewFile(result, { gate, review, matter: matterFields });
    download('ths-review-file.json', raw, 'application/json');
    recordRun('review-file');
    setNotice({
      tone: 'ok',
      text: 'The review file is downloaded. It carries the source, the gate answers, every sentence decision and two hashes — hand it to a colleague and it opens with no account and no server.',
    });
  };

  const handleReviewImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = await parseReviewFile(raw);
      if (!parsed.ok) {
        setNotice({ tone: 'error', text: parsed.error });
        event.target.value = '';
        return;
      }
      if (parsed.text) onTextChange(parsed.text);
      setGate(parsed.gate);
      setReview(parsed.review);
      setReviewText(parsed.text);
      setNotice(
        parsed.warnings.length
          ? { tone: 'warn', text: `The review file was loaded, with ${parsed.warnings.length} warning${parsed.warnings.length > 1 ? 's' : ''}: ${parsed.warnings.join(' ')}` }
          : { tone: 'ok', text: 'Review file loaded. The source, the gate answers and every sentence decision came back, and the hashes check out.' },
      );
    } catch {
      setNotice({ tone: 'error', text: 'That file could not be read.' });
    }
    event.target.value = '';
  };

  const handleVerify = async (record) => {
    setRunCheck({ id: record.id, status: 'checking', detail: 'Re-running the recorded text under the current engine…' });
    const outcome = await verifyRun(record);
    setRunCheck({ id: record.id, ...outcome });
  };

  const gateHint = !result.rows.length
    ? 'There is nothing to review yet: paste a source text.'
    : !gateCheck.complete
      ? `Answer all four to unlock the export: still needed — ${gateCheck.missing.join('; ')}.`
      : 'The bundle, the HTML, the DOCX redline and the CSV all carry the source, the flags, the confidence, the gate answers, your sentence decisions and the methodology card.';

  return (
    <>
      <div className="legal-grid">
        <div className="legal-source">
          <div className="control">
            <label htmlFor="legal-jurisdiction">Jurisdiction and source register</label>
            <select
              id="legal-jurisdiction"
              value={jurisdictionId}
              onChange={(e) => setJurisdictionId(e.target.value)}
            >
              {JURISDICTIONS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
            <p className="meta">
              {result.jurisdiction.note} {result.jurisdiction.citationFormat}.{' '}
              {result.jurisdiction.readability.label}.
            </p>
          </div>

          <div className="control">
            <label htmlFor="policy-text-legal">Source text</label>
            <textarea
              id="policy-text-legal"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              rows={12}
            />
          </div>

          <div className="stat-grid">
            <Stat label="Literal (green)" value={result.summary.green} />
            <Stat label="Interpretive (amber)" value={result.summary.amber} />
            <Stat label="Legal judgement (red)" value={result.summary.red} />
            <Stat
              label={`Grade after rewrite · target ${result.jurisdiction.readability.grade}`}
              value={result.readability.simplified.grade}
              tone={targetMet ? 'read-easy' : 'read-hard'}
            />
          </div>

          <div className="stat-grid">
            <Stat label="High confidence" value={result.confidence.high} />
            <Stat label="Medium confidence" value={result.confidence.medium} />
            <Stat label="Verify against source" value={result.confidence.low} />
          </div>

          <div className="card legal-meta">
            <h3>Source record</h3>
            <p className="meta">
              The method card, the DOCX and the audit manifest all carry these.
              A reviewer who cannot name the instrument cannot defend the
              rewrite.
            </p>
            <div className="meta-grid">
              <div className="control">
                <label htmlFor="meta-title">Instrument</label>
                <input id="meta-title" type="text" value={meta.title} onChange={setMetaField('title')} />
              </div>
              <div className="control">
                <label htmlFor="meta-citation">Citation</label>
                <input id="meta-citation" type="text" value={meta.citation} onChange={setMetaField('citation')} placeholder={result.jurisdiction.citationFormat} />
              </div>
              <div className="control">
                <label htmlFor="meta-version">Version</label>
                <input id="meta-version" type="text" value={meta.version} onChange={setMetaField('version')} />
              </div>
              <div className="control">
                <label htmlFor="meta-date">Source date</label>
                <input id="meta-date" type="text" value={meta.date} onChange={setMetaField('date')} />
              </div>
              <div className="control">
                <label htmlFor="meta-url">Source URL</label>
                <input id="meta-url" type="text" value={meta.url} onChange={setMetaField('url')} />
              </div>
              <div className="control">
                <label htmlFor="meta-reviewer">Reviewer</label>
                <input id="meta-reviewer" type="text" value={meta.reviewer} onChange={setMetaField('reviewer')} />
              </div>
            </div>
            <p className="fine-print">{currency.statement}</p>
          </div>

          <div className="card legal-meta">
            <h3>Matter</h3>
            <p className="meta">
              The client brief and the run log carry these. A rewrite that
              cannot be tied to a matter cannot be filed.
            </p>
            <div className="meta-grid">
              {MATTER_FIELDS.map((field) => (
                <div className="control" key={field.key}>
                  <label htmlFor={`matter-${field.key}`}>{field.label}</label>
                  <input
                    id={`matter-${field.key}`}
                    type="text"
                    value={matter[field.key]}
                    placeholder={field.placeholder}
                    onChange={setMatterField(field.key)}
                  />
                </div>
              ))}
            </div>
            <p className="fine-print">
              {matterOk
                ? 'The matter is complete: the brief and the log can name the client, the matter and the reviewer.'
                : 'Client, matter reference and reviewing lawyer are needed before the client brief can be issued.'}
            </p>
          </div>

          {result.warnings.length > 0 && (
            <div className="card legal-warnings">
              <h3>What this run found</h3>
              <ul>
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="legal-output">
          <div className="filter-row" role="group" aria-label="Filter by risk flag">
            {['all', 'green', 'amber', 'red'].map((f) => (
              <button
                key={f}
                type="button"
                className={`chip ${filter === f ? 'chip-active' : ''}`}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f === 'all' ? `All ${result.rows.length}` : `${f} ${result.summary[f]}`}
              </button>
            ))}
          </div>

          <div className="filter-row" role="group" aria-label="Filter by confidence">
            {['all', 'low', 'medium', 'high'].map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${confFilter === c ? 'chip-active' : ''}`}
                onClick={() => setConfFilter(c)}
                aria-pressed={confFilter === c}
              >
                {c === 'all'
                  ? 'Any confidence'
                  : `${c} confidence ${result.confidence[c]}`}
              </button>
            ))}
          </div>

          {notice && (
            <p className={`notice notice-${notice.tone}`} role="status">{notice.text}</p>
          )}

          {reviewStale && (
            <p className="notice notice-warn" role="status">
              The source text has changed since these decisions were made, so
              they may no longer refer to the same sentences. Re-check them
              against the text, or discard the review and start again.
            </p>
          )}

          <div className="review-summary">
            <span>
              <strong>{counts.accepted}</strong> accepted
            </span>
            <span>
              <strong>{counts.rejected}</strong> rejected
            </span>
            <span>
              <strong>{counts.pending}</strong> pending
            </span>
            <span>
              <strong>{exportedRows(result, review).length}</strong> will be exported
            </span>
            {Object.keys(review).length > 0 && (
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  setReview({});
                  setReviewText('');
                }}
              >
                Discard the review
              </button>
            )}
          </div>

          <div className="output-box ledger">
            {visibleRows.length === 0 ? (
              <em className="placeholder">No sentences match that filter.</em>
            ) : (
              visibleRows.map((row) => {
                const open = openRow === row.id;
                const decision = reviewDecision(review, row.id);
                return (
                  <div key={row.id} className={`ledger-row ledger-${row.flag}`}>
                    <button
                      type="button"
                      className="ledger-head ledger-head-review"
                      onClick={() => setOpenRow(open ? null : row.id)}
                      aria-expanded={open}
                    >
                      <FlagChip flag={row.flag} />
                      <ConfidenceChip confidence={row.confidence} />
                      <span className="ledger-meta">
                        {row.clause ? `${row.clause} · ` : ''}
                        {row.typeLabel}
                        {row.parts > 1 ? ` · part ${row.part + 1} of ${row.parts}` : ''}
                        {decision.state !== 'pending' ? ` · ${decision.state}` : ''}
                      </span>
                      <span className="ledger-plain">{row.plain}</span>
                    </button>
                    {open && (
                      <div className="ledger-detail">
                        <div className="decision-bar">
                          <button
                            type="button"
                            className={`decision-btn ${decision.state === 'accepted' ? 'decision-on' : ''}`}
                            aria-pressed={decision.state === 'accepted'}
                            onClick={() => applyDecision(row.id, 'accepted')}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className={`decision-btn ${decision.state === 'rejected' ? 'decision-reject' : ''}`}
                            aria-pressed={decision.state === 'rejected'}
                            onClick={() => applyDecision(row.id, 'rejected')}
                          >
                            Reject
                          </button>
                          {decision.state !== 'pending' && (
                            <button
                              type="button"
                              className="decision-btn"
                              onClick={() => applyDecision(row.id, 'pending')}
                            >
                              Reset
                            </button>
                          )}
                          <span className="decision-hint">
                            A rejected sentence is left out of every export and
                            kept in the record with your reason. Keys: a accepts,
                            r rejects, Escape closes.
                          </span>
                        </div>

                        {row.confidence && (
                          <p className="meta">
                            <span className="ledger-label">Confidence</span>{' '}
                            {row.confidence.meaning}
                          </p>
                        )}
                        {row.confidence && row.confidence.verify && (
                          <p className="meta verify-note">
                            <span className="ledger-label">Needs you</span>{' '}
                            {row.confidence.verifyNote}
                          </p>
                        )}

                        <p className="ledger-source">
                          <span className="ledger-label">Source</span> {row.sourceText}
                        </p>
                        <p className="meta">
                          <span className="ledger-label">Source span</span> characters {row.start}–{row.end} of the
                          input · sentence {row.id} · {row.typeLabel}: {row.typeNote}
                        </p>
                        {row.terms.length > 0 && (
                          <p className="meta">
                            <span className="ledger-label">Defined terms</span>{' '}
                            {row.terms.join(', ')} — left exactly as the instrument defines them.
                          </p>
                        )}
                        <ul className="ledger-reasons">
                          {row.reasons.map((reason, i) => (
                            <li key={i} className={`reason-${reason.level}`}>
                              {reason.text}
                            </li>
                          ))}
                        </ul>
                        {row.confidence && row.confidence.reasons.length > 0 && (
                          <ul className="ledger-reasons">
                            {row.confidence.reasons.map((reason, i) => (
                              <li key={`c${i}`}>{reason}</li>
                            ))}
                          </ul>
                        )}
                        {row.changes.length > 0 && (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Replaced</th>
                                <th>With</th>
                                <th>Risk</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.changes.map((change, i) => (
                                <tr key={i}>
                                  <td><code>{change.from}</code></td>
                                  <td>{change.to}</td>
                                  <td>{change.risk}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <div className="control">
                          <label htmlFor={`comment-${row.id}`}>Reviewer&apos;s note</label>
                          <textarea
                            id={`comment-${row.id}`}
                            value={decision.comment}
                            placeholder="Why this sentence was accepted, or why it was rejected."
                            rows={2}
                            onChange={(e) => setComment(row.id, e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h4>What the clause types found</h4>
            <div className="clause-grid">
              {CLAUSE_ORDER.filter((id) => result.groups[id] && result.groups[id].length > 0).map((id) => {
                const type = getClauseType(id);
                return (
                  <div key={id} className="clause-card">
                    <h5>
                      {type.label} <span className="clause-count">{result.groups[id].length}</span>
                    </h5>
                    <p className="meta">{type.note}</p>
                    <ul>
                      {result.groups[id].slice(0, 3).map((row) => (
                        <li key={row.id}>{row.plain}</li>
                      ))}
                    </ul>
                    {result.groups[id].length > 3 && (
                      <p className="meta">and {result.groups[id].length - 3} more in the ledger above.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {result.definitions.definitions.length > 0 && (
            <div className="output-sub" style={{ marginTop: '1.5rem' }}>
              <h4>Definitions read, and left alone</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>As the instrument defines it</th>
                  </tr>
                </thead>
                <tbody>
                  {result.definitions.definitions.map((def) => (
                    <tr key={def.term}>
                      <td><code>{def.term}</code></td>
                      <td>{def.definition || '[definition not read]'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.definitions.leadIns.length > 0 && (
                <p className="meta">
                  The definitions carry the “{result.definitions.leadIns[0]}” carve-out. A definition is
                  never the only reading of a term.
                </p>
              )}
            </div>
          )}

          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h4>Hand the review on</h4>
            <p className="meta">
              The review file is the whole review: the source text, the gate
              answers, every sentence decision and the two hashes that prove
              nothing was edited in transit. Your colleague opens it with no
              account, no server and no login.
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReviewExport}
                disabled={!result.rows.length}
              >
                Export the review file
              </button>
              <label className="btn btn-secondary file-button" htmlFor="review-import">
                Import a review file
              </label>
              <input
                id="review-import"
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                onChange={handleReviewImport}
              />
            </div>
          </div>

          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h4>Legal review gate (required to export)</h4>
            <p className="meta">
              The public interest check asks who the policy binds. This gate
              asks the four questions a reviewer has to answer before a file
              goes to a client.
            </p>
            {LEGAL_GATE_QUESTIONS.map((q) => (
              <div key={q.key} className="control">
                <label htmlFor={`gate-${q.key}`}>{q.label}</label>
                <input
                  id={`gate-${q.key}`}
                  type="text"
                  value={gate[q.key]}
                  onChange={(e) => setGate({ ...gate, [q.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopy}
                disabled={!gateCheck.complete || !result.rows.length}
                aria-describedby="legal-gate-hint"
              >
                {copied ? 'Copied' : 'Copy the bundle'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  download('ths-review.md', buildMarkdown(result, { gate, manifest, review }), 'text/markdown');
                  recordRun('markdown');
                }}
                disabled={!gateCheck.complete || !result.rows.length}
              >
                Download Markdown
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  download('ths-review.html', buildHtml(result, { gate, manifest, review }), 'text/html');
                  recordRun('html');
                }}
                disabled={!gateCheck.complete || !result.rows.length}
              >
                Download HTML
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  download(docxFileName(result), buildDocx(result, { review }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                  recordRun('docx');
                }}
                disabled={!gateCheck.complete || !result.rows.length}
              >
                Download DOCX redline
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  download('ths-redline-pack.csv', buildRedlineCsv(result, { review }), 'text/csv');
                  recordRun('csv');
                }}
                disabled={!gateCheck.complete || !result.rows.length}
              >
                Download redline pack
              </button>
              <p id="legal-gate-hint" className="fine-print">
                {gateHint}
              </p>
            </div>
            <p className="fine-print">
              The DOCX carries the rewrite as a real tracked change: the
              statutory wording is struck through and the plain wording is
              inserted, so the reviewer accepts or rejects it in Word.
            </p>
          </div>

          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h4>Client brief</h4>
            <p className="meta">
              One page, plain words, no flags and no ledger. It says what the
              instrument does, what a lawyer still has to look at, how the
              reading was produced, and it carries the sign-off. Rejected
              sentences are not in it.
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  printHtml(buildClientBriefHtml(result, { gate, manifest, matter: matterFields, review }));
                  recordRun('client-brief');
                }}
                disabled={!result.rows.length}
              >
                Open the client brief
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  download('ths-client-brief.html', buildClientBriefHtml(result, { gate, manifest, matter: matterFields, review }), 'text/html');
                  recordRun('client-brief-file');
                }}
                disabled={!result.rows.length}
              >
                Download the brief
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  download('ths-client-brief.txt', buildClientBriefText(result, { gate, manifest, matter: matterFields, review }), 'text/plain');
                  recordRun('client-brief-text');
                }}
                disabled={!result.rows.length}
              >
                Download the brief as text
              </button>
            </div>
          </div>

          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h4>Methodology card</h4>
            <button
              type="button"
              className="linklike"
              onClick={() => setShowMethod(!showMethod)}
              aria-expanded={showMethod}
            >
              {showMethod ? 'Hide the card' : 'Show the card'}
            </button>
            {showMethod && manifest && (
              <>
                <pre className="method-card">{methodologyCard(result, manifest)}</pre>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => download('ths-methodology.txt', methodologyCard(result, manifest), 'text/plain')}
                  >
                    Download the card
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => download('ths-manifest.json', JSON.stringify(manifest, null, 2), 'application/json')}
                  >
                    Download the manifest
                  </button>
                </div>
                <p className="fine-print">
                  Same source, same dictionary, same output hash. The manifest
                  is the receipt: it lets a firm reproduce this run years
                  later, and it shows whether anybody touched the file in
                  between. The sign-off hash covers the four gate answers and
                  every sentence decision, so it proves a named person signed
                  this file and not merely that the engine produced it.
                </p>
              </>
            )}
          </div>

          <div className="output-sub" style={{ marginTop: '1.5rem' }}>
            <h4>Run log</h4>
            <p className="meta">
              Append-only, on this device, never uploaded. Each record keeps
              the source it ran on, so any run can be re-executed later and
              checked against the hash it wrote down.
            </p>
            {runs.length === 0 ? (
              <p className="fine-print">No runs recorded yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Instrument</th>
                    <th>Output hash</th>
                    <th>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice().reverse().map((run) => (
                    <tr key={run.id}>
                      <td>{new Date(run.at).toLocaleString()}</td>
                      <td>{run.action}</td>
                      <td>{run.instrument || '—'}</td>
                      <td><code>{String(run.outputHash).slice(0, 12)}</code></td>
                      <td>
                        <button
                          type="button"
                          className="linklike"
                          onClick={() => handleVerify(run)}
                        >
                          Re-run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {runCheck && (
              <p className={`notice notice-${runCheck.status === 'reproduced' ? 'ok' : 'warn'}`}>
                {runCheck.detail}
              </p>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => download('ths-run-log.csv', exportAuditCsv(runs), 'text/csv')}
                disabled={!runs.length}
              >
                Export the log as CSV
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => download('ths-run-log.json', exportAuditJson(runs), 'application/json')}
                disabled={!runs.length}
              >
                Export the log with sources
              </button>
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  setRuns(clearRuns());
                  setRunCheck(null);
                }}
                disabled={!runs.length}
              >
                Clear the log
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card compare-card">
        <h3>Compare two versions</h3>
        <p className="meta">
          The plain-language delta between an earlier text and this one. Paste
          the earlier version below: the tool aligns the two on clause numbers
          where both carry them, and says what changed in plain words.
        </p>
        <div className="compare-grid">
          <div className="control">
            <label htmlFor="compare-text">Earlier version</label>
            <textarea
              id="compare-text"
              value={compareText}
              onChange={(e) => setCompareText(e.target.value)}
              rows={8}
            />
          </div>
          <div className="control">
            <label>Current version</label>
            <div className="output-box compare-current">{text || <em className="placeholder">The current text.</em>}</div>
          </div>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCompare}
            disabled={!compareText.trim()}
          >
            Compare the versions
          </button>
          {delta && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => download('ths-comparison.txt', buildDeltaReport(delta), 'text/plain')}
            >
              Download the comparison
            </button>
          )}
        </div>
        {delta && (
          <div className="delta">
            <p className="meta">
              Aligned on {delta.method}. {delta.counts.changed} changed, {delta.counts.added} added,{' '}
              {delta.counts.removed} removed, {delta.counts.unchanged} unchanged. Reading ease{' '}
              {delta.before.readability.simplified.score} → {delta.after.readability.simplified.score}.
            </p>
            {delta.changes
              .filter((c) => c.status !== 'unchanged')
              .map((c, i) => (
                <div key={i} className={`delta-row delta-${c.status}`}>
                  <div className="delta-head">
                    <span className="ledger-meta">
                      {c.clause ? `${c.clause} · ` : ''}
                      {c.status} · {c.type}
                    </span>
                    <FlagChip flag={c.flag} />
                  </div>
                  {c.before && (
                    <p className="delta-line">
                      <span className="ledger-label">Before</span> {c.before.text}
                    </p>
                  )}
                  {c.after && (
                    <p className="delta-line">
                      <span className="ledger-label">After</span> {c.after.text}
                    </p>
                  )}
                  {(c.reasons || []).length > 0 && (
                    <ul className="ledger-reasons">
                      {c.reasons.map((r, j) => (
                        <li key={j} className={`reason-${r.level}`}>{r.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="fine-print legal-disclaimer">
        A draft simplification, not legal advice. The tool does not check that
        the source is current or in force, and it does not certify that the
        rewrite means the same thing in every case. {FLAG_MEANING.red}
      </p>
    </>
  );
}
