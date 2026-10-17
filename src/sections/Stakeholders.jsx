import { useState } from 'react';
import { stakeholderPolicies, effectLabels, effectScore } from '../data/stakeholders';
import { PIT_QUESTIONS } from '../battery/report.js';
import { setPitDraft } from '../lib/pitStore';

const EFFECT_COLOR = {
  benefits: 'var(--color-series-2)',
  mixed: 'var(--color-text-muted)',
  restricted: 'var(--color-accent)',
  neutral: 'var(--color-border-strong)',
};

function Matrix({ rows }) {
  // x: power (1-5), y: signed effect (-5..5), bubble: magnitude
  const W = 720;
  const H = 460;
  const M = { top: 28, right: 28, bottom: 56, left: 72 };
  const xScale = (v) => M.left + ((v - 0.5) / 5) * (W - M.left - M.right);
  const yScale = (v) => M.top + ((5.5 - v) / 11) * (H - M.top - M.bottom);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stakeholders by power and net effect">
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
      <text x={W - M.right - 6} y={M.top + 18} textAnchor="end" fontSize="11.5" fill="var(--color-text-secondary)">gains, less power</text>
      <text x={W - M.right - 6} y={H - M.bottom - 10} textAnchor="end" fontSize="11.5" fill="var(--color-text-secondary)">bears the cost</text>
      {rows.map((r, i) => (
        <g key={r.name}>
          <circle
            cx={xScale(r.power)}
            cy={yScale(effectScore(r.effect, r.magnitude))}
            r={7 + r.magnitude * 2.4}
            fill={EFFECT_COLOR[r.effect]}
            fillOpacity="0.28"
            stroke={EFFECT_COLOR[r.effect]}
            strokeWidth="1.8"
          >
            <title>{`${r.name}: ${effectLabels[r.effect]} (magnitude ${r.magnitude}, power ${r.power})`}</title>
          </circle>
          <text
            x={xScale(r.power)}
            y={yScale(effectScore(r.effect, r.magnitude)) + 4}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-text)"
            className="data-num"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Stakeholders({ onNavigate, onTool }) {
  const [policyId, setPolicyId] = useState(stakeholderPolicies[0].id);
  const [edits, setEdits] = useState({});
  const [sentNote, setSentNote] = useState('');
  const policy = stakeholderPolicies.find((p) => p.id === policyId);

  const rows = policy.stakeholders.map((s, i) => ({
    ...s,
    ...edits[`${policyId}:${i}`],
    name: s.name,
    role: s.role,
    mechanism: s.mechanism,
    evidence: s.evidence,
    counter: s.counter,
  }));

  const edit = (i, patch) =>
    setEdits((e) => ({ ...e, [`${policyId}:${i}`]: { ...e[`${policyId}:${i}`], ...patch } }));

  const benefited = rows.filter((r) => r.effect === 'benefits');
  const restricted = rows.filter((r) => r.effect === 'restricted');
  const mixed = rows.filter((r) => r.effect === 'mixed' || r.effect === 'neutral');
  const avgPower = (list) => (list.length ? list.reduce((a, r) => a + r.power, 0) / list.length : null);

  const avgBen = avgPower(benefited);
  const avgRes = avgPower(restricted);
  const verdict =
    benefited.length + restricted.length === 0
      ? 'The map has no directional readings yet. Set a direction in the ledger to generate the verdict.'
      : avgBen != null && avgRes != null
        ? avgBen > avgRes + 0.75
          ? `On this reading the benefits flow to stakeholders with more power over the policy (average power ${avgBen.toFixed(1)}) than those restricted by it (${avgRes.toFixed(1)}). The distribution and the design point the same way.`
          : avgRes > avgBen + 0.75
            ? `On this reading the costs land on the more powerful stakeholders (average power ${avgRes.toFixed(1)}) while those who gain hold less of the design (${avgBen.toFixed(1)}). That is a policy that spends political capital on redistribution.`
            : `On this reading benefits and restrictions are spread across similar levels of power (averages ${avgBen ?? 'n/a'} and ${avgRes ?? 'n/a'}). The distributional story here is about scope, not direction.`
        : `The map is one-sided: ${benefited.length ? 'only gains are recorded' : 'only restrictions are recorded'}. A distributional verdict needs both directions on the page.`;

  // The three public interest answers, drafted from what the ledger computed:
  // the named directions with their power balance, and an honest statement of
  // what the ledger cannot see.
  const pitAnswers = {
    whoBenefits: benefited.length > 0
      ? `Recorded as gaining: ${benefited.map((r) => r.name).join(', ')}.${avgBen != null ? ` Average power over the policy: ${avgBen.toFixed(1)} of 5.` : ''}`
      : 'The ledger records no gains yet: nobody on it is named as benefiting from this policy as designed.',
    whoPays: restricted.length > 0
      ? `Recorded as restricted: ${restricted.map((r) => r.name).join(', ')}.${avgRes != null ? ` Average power over the policy: ${avgRes.toFixed(1)} of 5.` : ''}`
      : 'The ledger records no restrictions yet: nobody on it is named as paying for this policy.',
    whoMissing: `This ledger maps ${rows.length} parties from the published record${mixed.length > 0 ? ` (${mixed.length} mixed or neutral)` : ''}. Anyone absent from it has no direction, magnitude or power reading here, and their absence is unmeasured by construction. ${verdict}`,
  };

  const sendToPit = () => {
    setPitDraft({ ...pitAnswers, source: 'stakeholders', policyName: policy.name });
    setSentNote(
      `Draft sent from "${policy.name}". The battery, the evaluation engine and the simplifier can now fill their public interest check from it.`,
    );
  };

  const copyText = () => {
    const lines = [`Stakeholder map: ${policy.name} (${policy.year})`, '', `${policy.strap}`, ''];
    rows.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.name} | ${effectLabels[r.effect]} | magnitude ${r.magnitude} | power ${r.power}`);
      lines.push(`   Mechanism: ${r.mechanism}`);
      lines.push(`   Counter: ${r.counter}`);
    });
    lines.push('', verdict, '', 'Public interest check (drafted from this ledger):');
    lines.push(`Who benefits? ${pitAnswers.whoBenefits}`);
    lines.push(`Who pays? ${pitAnswers.whoPays}`);
    lines.push(`Who is missing? ${pitAnswers.whoMissing}`);
    lines.push('', 'Source: THS stakeholder maps, seeded from the policy atlas.');
    return lines.join('\n');
  };

  return (
    <section>
      <div className="section-head">
        <span className="overline">Stakeholder mapper</span>
        <h2>Who does this policy move, and in which direction?</h2>
        <p className="section-strap">
          A policy is a distribution: someone gains protection or latitude,
          someone else carries the cost or the restriction. Map the parties,
          set the direction, and read the distribution back.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Policies to map">
        {stakeholderPolicies.map((p) => (
          <button
            key={p.id}
            className={`chip ${policyId === p.id ? 'chip-active' : ''}`}
            onClick={() => setPolicyId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="card">
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
      </div>

      <div className="ledger">
        {rows.map((r, i) => (
          <article key={r.name} className="ledger-row">
            <div className="ledger-head">
              <span className="ledger-index data-num">{i + 1}</span>
              <div>
                <h4>{r.name}</h4>
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
            <p className="ledger-note"><strong>Mechanism.</strong> {r.mechanism}</p>
            <p className="ledger-note"><strong>Evidence.</strong> {r.evidence}</p>
            <p className="ledger-note" style={{ marginBottom: 0 }}><strong>Counter.</strong> {r.counter}</p>
          </article>
        ))}
      </div>

      <div className="lab-grid">
        <div className="card">
          <h3>Power against effect</h3>
          <Matrix rows={rows} />
          <p className="fine-print" style={{ marginBottom: 0 }}>
            Numbered bubbles match the ledger order. Bubble size is magnitude of
            effect; colour is direction.
          </p>
        </div>
        <div className="card verdict-box">
          <h3>Distributional verdict</h3>
          <div className="stat-grid">
            <div className="stat-cell"><span className="stat-label">Benefiting</span><span className="data-num stat-value">{benefited.length}</span></div>
            <div className="stat-cell"><span className="stat-label">Restricted</span><span className="data-num stat-value">{restricted.length}</span></div>
            <div className="stat-cell"><span className="stat-label">Mixed or neutral</span><span className="data-num stat-value">{mixed.length}</span></div>
            <div className="stat-cell"><span className="stat-label">Mapped</span><span className="data-num stat-value">{rows.length}</span></div>
          </div>
          <p>{verdict}</p>
          {benefited.length > 0 && (
            <p className="fine-print">
              <strong>Gains:</strong> {benefited.map((r) => r.name).join(', ')}.
            </p>
          )}
          {restricted.length > 0 && (
            <p className="fine-print">
              <strong>Restricted:</strong> {restricted.map((r) => r.name).join(', ')}.
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEdits((e) => {
                const next = { ...e };
                Object.keys(next).forEach((k) => { if (k.startsWith(`${policyId}:`)) delete next[k]; });
                return next;
              })}
            >
              Reset to the record
            </button>
          </div>
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
