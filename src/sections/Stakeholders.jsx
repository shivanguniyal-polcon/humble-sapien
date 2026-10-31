import { useEffect, useRef, useState } from 'react';
import { stakeholderPolicies, effectLabels, effectScore } from '../data/stakeholders';
import { PIT_QUESTIONS } from '../battery/report.js';
import { setPitDraft } from '../lib/pitStore';
import {
  buildPitAnswers,
  createBlankPolicy,
  formatPower,
  loadSavedMaps,
  mergeSharedMap,
  parseSharedMap,
  saveMaps,
  serializeSharedMap,
  summarizeRows,
} from '../lib/stakeholders';
import PageHead from '../components/PageHead';

const readShareToken = (query) => {
  try {
    return new URLSearchParams(query || '').get('map') || '';
  } catch {
    return '';
  }
};

// Drop the long link after the map has been imported. Replacing the history
// entry keeps Back on the page the reader came from instead of returning to
// the same map and importing it a second time.
const clearShareParam = (onQueryChange) => {
  if (!onQueryChange) return;
  const clean = window.location.hash.split('?')[0] || '#/tools/stakeholders';
  try {
    if (window.location.hash !== clean) {
      window.history.replaceState(null, '', clean);
    }
  } catch {
    // If the history API is unavailable, the state update below still clears
    // the query in React.
  }
  onQueryChange('');
};

const EFFECT_COLOR = {
  benefits: 'var(--color-series-2)',
  mixed: 'var(--color-text-muted)',
  restricted: 'var(--color-accent)',
  neutral: 'var(--color-border-strong)',
};

const NOTE_FIELDS = [
  { key: 'mechanism', label: 'Mechanism' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'counter', label: 'Counter' },
];

function Matrix({ rows }) {
  // x: power (1-5), y: signed effect (-5..5), bubble: magnitude
  const W = 720;
  const H = 460;
  const M = { top: 28, right: 28, bottom: 56, left: 72 };
  const xScale = (v) => M.left + ((v - 0.5) / 5) * (W - M.left - M.right);
  const yScale = (v) => M.top + ((5.5 - v) / 11) * (H - M.top - M.bottom);

  // Power, effect and magnitude are integers, so distinct parties can share a
  // coordinate. Offset each collision around its base point on a golden angle
  // so the bubbles and their numbers stay readable instead of stacking.
  const seen = new Map();
  const placed = rows.map((r) => {
    const baseX = xScale(r.power);
    const baseY = yScale(effectScore(r.effect, r.magnitude));
    const slot = `${r.power}:${r.magnitude}:${r.effect}`;
    const n = seen.get(slot) ?? 0;
    seen.set(slot, n + 1);
    if (n === 0) return { ...r, x: baseX, y: baseY };
    const angle = n * 2.39996;
    const radius = n * (12 + r.magnitude * 2);
    return {
      ...r,
      x: baseX + Math.cos(angle) * radius,
      y: baseY + Math.sin(angle) * radius,
    };
  });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stakeholders by power and net effect">
        <defs>
          <linearGradient id="mixed-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="50%" stopColor="var(--color-series-2)" />
            <stop offset="50%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <rect x={M.left} y={M.top} width={W - M.left - M.right} height={yScale(0) - M.top} fill="var(--color-series-2)" fillOpacity="0.05" />
        <rect x={M.left} y={yScale(0)} width={W - M.left - M.right} height={H - M.bottom - yScale(0)} fill="var(--color-accent)" fillOpacity="0.05" />
        <line x1={M.left} x2={W - M.right} y1={yScale(0)} y2={yScale(0)} stroke="var(--color-text-muted)" strokeWidth="1.5" />
        <line x1={xScale(3)} x2={xScale(3)} y1={M.top} y2={H - M.bottom} stroke="var(--color-border)" strokeDasharray="6 5" />
        {[1, 2, 3, 4, 5].map((v) => (
          <text key={`x${v}`} x={xScale(v)} y={H - M.bottom + 22} textAnchor="middle" fontSize="12" fill="var(--color-text-muted)" className="data-num">{v}</text>
        ))}
        {[-5, -3, 0, 3, 5].map((v) => (
          <text key={`y${v}`} x={M.left - 10} y={yScale(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-text-muted)" className="data-num">{v > 0 ? `+${v}` : v}</text>
        ))}
        <text x={(M.left + W - M.right) / 2} y={H - 8} textAnchor="middle" fontSize="12.5" fill="var(--color-text-secondary)">
          Power over the policy (1 marginal, 5 decisive)
        </text>
        <text x={18} y={(M.top + H - M.bottom) / 2} textAnchor="middle" fontSize="12.5" fill="var(--color-text-secondary)" transform={`rotate(-90 18 ${(M.top + H - M.bottom) / 2})`}>
          Net effect (benefits above, restricted below)
        </text>
        <text x={M.left + 8} y={M.top + 16} textAnchor="start" fontSize="11" fill="var(--color-text-secondary)">gains, less power</text>
        <text x={W - M.right - 8} y={M.top + 16} textAnchor="end" fontSize="11" fill="var(--color-text-secondary)">gains, more power</text>
        <text x={M.left + 8} y={H - M.bottom - 10} textAnchor="start" fontSize="11" fill="var(--color-text-secondary)">bears the cost, less power</text>
        <text x={W - M.right - 8} y={H - M.bottom - 10} textAnchor="end" fontSize="11" fill="var(--color-text-secondary)">bears the cost, more power</text>
        {placed.map((r, i) => {
          const mixed = r.effect === 'mixed';
          return (
            <g key={`${r.name}-${i}`}>
              <circle
                cx={r.x}
                cy={r.y}
                r={7 + r.magnitude * 2.4}
                fill={mixed ? 'url(#mixed-fill)' : EFFECT_COLOR[r.effect]}
                fillOpacity={mixed ? 0.5 : r.effect === 'neutral' ? 0.12 : 0.28}
                stroke={mixed ? 'var(--color-text-muted)' : EFFECT_COLOR[r.effect]}
                strokeWidth="1.8"
                strokeDasharray={mixed ? '3 3' : r.effect === 'neutral' ? '2 4' : undefined}
              >
                <title>{`${r.name}: ${effectLabels[r.effect]} (magnitude ${r.magnitude}, power ${r.power})`}</title>
              </circle>
              <text
                x={r.x}
                y={r.y + 4}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-text)"
                className="data-num"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="matrix-legend" aria-label="Direction colours">
        {Object.entries(effectLabels).map(([key, label]) => (
          <li key={key}>
            <span className={`matrix-swatch is-${key}`} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Stakeholders({ onNavigate, onTool, query = '', onQueryChange }) {
  const [initial] = useState(() => {
    const saved = loadSavedMaps();
    const token = readShareToken(query);
    if (!token) {
      return { saved, policyId: stakeholderPolicies[0].id, notice: '' };
    }
    const shared = parseSharedMap(token);
    if (!shared) {
      return {
        saved,
        policyId: stakeholderPolicies[0].id,
        notice: 'This shared map link could not be read. It may be incomplete or from a newer version.',
      };
    }
    return {
      saved: mergeSharedMap(saved, shared),
      policyId: shared.policy.id,
      notice: `Opened the shared map "${shared.policy.name}". It is now a reader-built copy in this browser.`,
    };
  });
  const [policyId, setPolicyId] = useState(initial.policyId);
  const [saved, setSaved] = useState(initial.saved);
  const [draft, setDraft] = useState({ name: '', role: '' });
  const [sentNote, setSentNote] = useState('');
  const [shareNote, setShareNote] = useState(initial.notice);
  const [shareUrl, setShareUrl] = useState('');
  const policies = [...stakeholderPolicies, ...(saved.policies ?? [])];
  const policy = policies.find((p) => p.id === policyId) ?? policies[0];
  const policyName = (policy.name || '').trim() || 'Untitled policy';
  const isCustom = Boolean(policy.custom);
  const initialShareToken = useRef(readShareToken(query));
  // The shell rebuilds this callback on every route change. Keeping it in a
  // ref lets the listener be mounted once, so the shell's own hashchange
  // render cannot detach it before this listener gets its turn.
  const queryChangeRef = useRef(onQueryChange);

  useEffect(() => {
    saveMaps(saved);
  }, [saved]);

  useEffect(() => {
    queryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  // A link can arrive on a fresh page or while the tool is already open. The
  // first case is handled by the initial state above. This mount effect drops
  // the long parameter after that import; the hashchange handler below covers
  // a second link opened in the same tab.
  useEffect(() => {
    if (!initialShareToken.current) return;
    initialShareToken.current = '';
    clearShareParam(queryChangeRef.current);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const token = readShareToken(window.location.hash.split('?')[1] || '');
      if (!token) return;
      const shared = parseSharedMap(token);
      if (!shared) {
        setShareUrl('');
        setShareNote('This shared map link could not be read. It may be incomplete or from a newer version.');
      } else {
        setSaved((prev) => mergeSharedMap(prev, shared));
        setPolicyId(shared.policy.id);
        setShareUrl('');
        setShareNote(`Opened the shared map "${shared.policy.name}". It is now a reader-built copy in this browser.`);
      }
      clearShareParam(queryChangeRef.current);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const clearShareLink = () => {
    setShareUrl('');
    setShareNote('');
  };

  const extraRows = saved.added[policy.id] ?? [];
  const rows = [...policy.stakeholders, ...extraRows].map((s, i) => {
    const patch = saved.edits[`${policy.id}:${i}`] ?? {};
    const merged = { ...s, ...patch, name: s.name, role: s.role };
    // Notes on the seeded rows are the published reading; only reader-added
    // rows get editable notes.
    if (!s.added) {
      merged.mechanism = s.mechanism;
      merged.evidence = s.evidence;
      merged.counter = s.counter;
    }
    return merged;
  });

  const summary = summarizeRows(rows);
  const { benefited, restricted, mixed, neutral, avgBen, avgRes, avgMixed, verdict } = summary;
  const pitAnswers = buildPitAnswers(rows, {
    extraCount: extraRows.length,
    summary,
    custom: isCustom,
  });

  const edit = (i, patch) => {
    clearShareLink();
    setSaved((prev) => ({
      ...prev,
      edits: {
        ...prev.edits,
        [`${policy.id}:${i}`]: { ...prev.edits[`${policy.id}:${i}`], ...patch },
      },
    }));
  };

  const updatePolicy = (patch) => {
    if (!isCustom) return;
    clearShareLink();
    setSaved((prev) => ({
      ...prev,
      policies: (prev.policies ?? []).map((p) =>
        p.id === policy.id ? { ...p, ...patch } : p,
      ),
    }));
  };

  const addBlankPolicy = () => {
    clearShareLink();
    const next = createBlankPolicy();
    setSaved((prev) => ({ ...prev, policies: [...(prev.policies ?? []), next] }));
    setPolicyId(next.id);
    setDraft({ name: '', role: '' });
    setSentNote('');
  };

  const deletePolicy = () => {
    if (!isCustom) return;
    clearShareLink();
    const id = policy.id;
    setSaved((prev) => {
      const edits = { ...prev.edits };
      Object.keys(edits).forEach((key) => {
        if (key.startsWith(`${id}:`)) delete edits[key];
      });
      const added = { ...prev.added };
      delete added[id];
      return {
        ...prev,
        policies: (prev.policies ?? []).filter((p) => p.id !== id),
        edits,
        added,
      };
    });
    setPolicyId(stakeholderPolicies[0].id);
    setSentNote('');
  };

  const addStakeholder = () => {
    const name = draft.name.trim();
    if (!name) return;
    clearShareLink();
    const role = draft.role.trim() || 'Added by the reader';
    setSaved((prev) => ({
      ...prev,
      added: {
        ...prev.added,
        [policy.id]: [
          ...(prev.added[policy.id] ?? []),
          {
            name,
            role,
            effect: 'neutral',
            magnitude: 1,
            power: 1,
            added: true,
            mechanism:
              'Reader-added party. State the mechanism in the row below.',
            evidence:
              'No citation yet. Add the public record you are relying on.',
            counter:
              'State the strongest objection to this reading.',
          },
        ],
      },
    }));
    setDraft({ name: '', role: '' });
  };

  const resetToRecord = () => {
    clearShareLink();
    setSaved((prev) => {
      const nextEdits = { ...prev.edits };
      Object.keys(nextEdits).forEach((k) => {
        if (k.startsWith(`${policy.id}:`)) delete nextEdits[k];
      });
      const nextAdded = { ...prev.added };
      delete nextAdded[policy.id];
      return { ...prev, edits: nextEdits, added: nextAdded };
    });
    setSentNote('');
  };

  const sendToPit = () => {
    setPitDraft({ ...pitAnswers, source: 'stakeholders', policyName });
    setSentNote(
      `Draft sent from "${policyName}". The battery, the evaluation engine and the simplifier can now fill their public interest check from it.`,
    );
  };

  const copyText = () => {
    const lines = [`Stakeholder map: ${policyName} (${policy.year})`, '', `${policy.strap}`, ''];
    rows.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.name}${r.added ? ' (added in this browser)' : ''} | ${effectLabels[r.effect]} | magnitude ${r.magnitude} | power ${r.power}`);
      lines.push(`   Mechanism: ${r.mechanism}`);
      lines.push(`   Evidence: ${r.evidence}`);
      lines.push(`   Counter: ${r.counter}`);
    });
    if (extraRows.length > 0) {
      lines.push('', `Added in this browser (not in the published record): ${extraRows.map((r) => r.name).join(', ')}.`);
    }
    lines.push('', verdict, '', 'Public interest check (drafted from this ledger):');
    lines.push(`Who benefits? ${pitAnswers.whoBenefits}`);
    lines.push(`Who pays? ${pitAnswers.whoPays}`);
    lines.push(`Who is missing? ${pitAnswers.whoMissing}`);
    lines.push(
      '',
      isCustom
        ? 'Source: reader-built map. Not part of the published record.'
        : 'Source: THS stakeholder maps, seeded from the policy atlas.',
    );
    return lines.join('\n');
  };

  const copyShareLink = async () => {
    setShareUrl('');
    setShareNote('');
    const token = serializeSharedMap(policy, rows);
    if (!token) {
      setShareNote(
        rows.length > 200
          ? `This map has ${rows.length} parties. A link can carry up to 200, so copy the map text instead.`
          : 'This map could not be packed into a link.',
      );
      return;
    }
    const url = `${window.location.href.split('#')[0]}#/tools/stakeholders?map=${token}`;
    setShareUrl(url);
    const long = url.length > 8000;
    const copied = long
      ? `Link copied. It is ${url.length.toLocaleString()} characters, so some chat apps may truncate it.`
      : 'Link copied. It opens as a reader-built copy of this map.';
    const ready = long
      ? `Link ready below. It is ${url.length.toLocaleString()} characters, so some chat apps may truncate it.`
      : 'Link ready below. It opens as a reader-built copy of this map.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setShareNote(copied);
    } catch {
      setShareNote(ready);
    }
  };

  return (
    <section>
      <PageHead
        eyebrow="Stakeholder mapper"
        title="Sutra"
        question="Who gains, who is restricted, and who decided?"
      >
        A policy is a distribution: someone gains protection or latitude,
        someone else carries the cost or the restriction. Start from a seeded
        map or a blank bill, add each party, set the direction and size of the
        effect, record who held the decision, and read the verdict back before a
        policy is announced.
      </PageHead>

      {shareNote && !shareUrl && (
        <p className="fine-print" role="status">{shareNote}</p>
      )}

      <div className="filter-row" role="group" aria-label="Policies to map">
        {policies.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip ${policyId === p.id ? 'chip-active' : ''}`}
            onClick={() => {
              clearShareLink();
              setPolicyId(p.id);
              setDraft({ name: '', role: '' });
              setSentNote('');
            }}
          >
            {(p.name || '').trim() || 'Untitled policy'}
          </button>
        ))}
        <button type="button" className="chip chip-add" onClick={addBlankPolicy}>
          + Blank policy map
        </button>
      </div>

      <div className="card">
        {isCustom ? (
          <>
            <div className="policy-editor-head">
              <h3>
                {policyName} <span className="ledger-added">Reader-built</span>
              </h3>
              <button type="button" className="btn btn-secondary" onClick={deletePolicy}>
                Delete this map
              </button>
            </div>
            <div className="policy-editor">
              <div className="policy-editor-grid">
                <label>
                  Policy name
                  <input
                    type="text"
                    value={policy.name}
                    onChange={(event) => updatePolicy({ name: event.target.value })}
                    placeholder="e.g. Draft Digital Competition Bill"
                  />
                </label>
                <label>
                  Year
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={policy.year}
                    onChange={(event) =>
                      updatePolicy({
                        year: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label>
                One-line summary
                <textarea
                  rows={2}
                  value={policy.strap}
                  onChange={(event) => updatePolicy({ strap: event.target.value })}
                  placeholder="What does the draft do, in one sentence?"
                />
              </label>
              <label>
                The question
                <textarea
                  rows={2}
                  value={policy.question}
                  onChange={(event) => updatePolicy({ question: event.target.value })}
                  placeholder="Who gains, who is restricted, and who decided?"
                />
              </label>
              <p className="fine-print" style={{ marginBottom: 0 }}>
                This map starts empty and is saved in this browser only. Use
                Copy share link to send a snapshot; it is not part of the
                published record.
              </p>
            </div>
          </>
        ) : (
          <>
            <h3>{policy.name} <span className="data-num">{policy.year}</span></h3>
            <p>{policy.strap}</p>
            <p className="fine-print" style={{ marginBottom: 0 }}>
              <strong>The question.</strong> {policy.question}{' '}
              {policy.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 ? ' · ' : 'Source: '}
                  <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                </span>
              ))}
            </p>
          </>
        )}
      </div>

      <div className="ledger-add">
        <div>
          <h3 className="card-heading">Add a party</h3>
          <p className="meta" style={{ marginBottom: 0 }}>
            {isCustom
              ? 'This map starts empty. Add each party the draft touches, then record why they gain or pay in the mechanism, evidence and counter fields. Everything here is saved in this browser only.'
              : 'The seeded map is a starting reading, not a closed list. Add a stakeholder it missed, then set their direction, magnitude and power in the ledger below. Additions and edits are saved in this browser only; they are not part of the published record.'}
          </p>
        </div>
        <div className="ledger-add-fields">
          <label>
            Name
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Who is missing?"
            />
          </label>
          <label>
            Role
            <input
              type="text"
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value })}
              placeholder="What part do they play?"
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addStakeholder}
            disabled={!draft.name.trim()}
          >
            + Add stakeholder
          </button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="ledger-empty">
          No parties yet. Add the first one above; the verdict needs at least one
          gain and one restriction before it can read the distribution.
        </p>
      )}

      <div className="ledger">
        {rows.map((r, i) => (
          <article key={`${r.name}-${i}`} className="ledger-row">
            <div className="ledger-head">
              <span className="ledger-index data-num">{i + 1}</span>
              <div>
                <h4>
                  {r.name}
                  {r.added && <span className="ledger-added">Added in this browser</span>}
                </h4>
                <p className="fine-print" style={{ marginBottom: 0 }}>{r.role}</p>
              </div>
              <div className="ledger-controls">
                <label>
                  Direction
                  <select value={r.effect} onChange={(e) => edit(i, { effect: e.target.value })}>
                    {Object.entries(effectLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Magnitude
                  <select value={r.magnitude} onChange={(e) => edit(i, { magnitude: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label>
                  Power
                  <select value={r.power} onChange={(e) => edit(i, { power: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {r.added ? (
              <div className="ledger-notes-edit">
                {NOTE_FIELDS.map(({ key, label }) => (
                  <label key={key}>
                    {label}
                    <textarea
                      rows={2}
                      value={r[key] || ''}
                      onChange={(event) => edit(i, { [key]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <>
                <p className="ledger-note"><strong>Mechanism.</strong> {r.mechanism}</p>
                <p className="ledger-note"><strong>Evidence.</strong> {r.evidence}</p>
                <p className="ledger-note" style={{ marginBottom: 0 }}><strong>Counter.</strong> {r.counter}</p>
              </>
            )}
          </article>
        ))}
      </div>

      <div className="lab-grid">
        <div className="card">
          <h3>Power against effect</h3>
          <Matrix rows={rows} />
          <p className="fine-print" style={{ marginBottom: 0 }}>
            Numbered bubbles match the ledger order. Bubble size is magnitude of
            effect; colour is direction. A split, dashed bubble is mixed: gains
            and costs net to zero, but both are present. The verdict averages
            are weighted by magnitude.
          </p>
        </div>
        <div className="card verdict-box">
          <h3>Distributional verdict</h3>
          <div className="stat-grid">
            <div className="stat-cell">
              <span className="stat-label">Benefiting</span>
              <span className="data-num stat-value">{benefited.length}</span>
              <span className="stat-note">wt. power {formatPower(avgBen)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Restricted</span>
              <span className="data-num stat-value">{restricted.length}</span>
              <span className="stat-note">wt. power {formatPower(avgRes)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Mixed</span>
              <span className="data-num stat-value">{mixed.length}</span>
              <span className="stat-note">wt. power {formatPower(avgMixed)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Neutral</span>
              <span className="data-num stat-value">{neutral.length}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Mapped</span>
              <span className="data-num stat-value">{rows.length}</span>
            </div>
          </div>
          <p>{verdict}</p>
          <p className="fine-print">
            <strong>Reading the scores.</strong> Magnitude 1 is a small effect,
            5 a life-changing one. Power 1 is no influence over the design, 5
            decisive influence. The directional averages are weighted by
            magnitude, so a severe effect on a low-power group moves the verdict
            more than a mild effect on a high-power group.
          </p>
          {extraRows.length > 0 && (
            <p className="fine-print">
              {extraRows.length} {extraRows.length === 1 ? 'party was' : 'parties were'}{' '}
              added in this browser and {extraRows.length === 1 ? 'is' : 'are'} not
              part of the published record.
            </p>
          )}
          {benefited.length > 0 && (
            <p className="fine-print">
              <strong>Gains:</strong> {benefited.map((r) => r.name).join(', ')}.
              {' '}Weighted power {formatPower(avgBen)}.
            </p>
          )}
          {restricted.length > 0 && (
            <p className="fine-print">
              <strong>Restricted:</strong> {restricted.map((r) => r.name).join(', ')}.
              {' '}Weighted power {formatPower(avgRes)}.
            </p>
          )}
          {mixed.length > 0 && (
            <p className="fine-print">
              <strong>Mixed:</strong> {mixed.map((r) => r.name).join(', ')}.
              {' '}Weighted power {formatPower(avgMixed)}. Counted separately.
            </p>
          )}
          <dl className="pub-pit" style={{ marginTop: '0.75rem' }}>
            {PIT_QUESTIONS.map((q) => (
              <div key={q.key} className="pub-pit-row">
                <dt>{q.label}</dt>
                <dd>{pitAnswers[q.key]}</dd>
              </div>
            ))}
          </dl>
          {sentNote && <p className="fine-print">{sentNote}</p>}
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={sendToPit}>
              Send to the public interest check
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigator.clipboard && navigator.clipboard.writeText(copyText())}
            >
              Copy the map
            </button>
            {isCustom && (
              <button type="button" className="btn btn-secondary" onClick={copyShareLink}>
                Copy share link
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetToRecord}
              disabled={isCustom && rows.length === 0}
            >
              {isCustom ? 'Clear all parties' : 'Reset to the record'}
            </button>
          </div>
          {shareUrl && (
            <div className="share-link">
              <label>
                Share link
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              {shareNote && (
                <p className="fine-print" role="status" style={{ marginBottom: 0 }}>
                  {shareNote}
                </p>
              )}
            </div>
          )}
          <div className="btn-row">
            {onTool && (
              <button type="button" className="btn btn-primary" onClick={() => onTool('touchpoints')}>
                Follow the delivery chain
              </button>
            )}
            {onNavigate && (
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate('compare')}>
                Compare across systems
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
