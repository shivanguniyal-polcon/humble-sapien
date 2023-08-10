import { useState } from 'react';
import { policies } from '../data/policies';
import { escalation } from '../data/escalation';

export default function Touchpoints() {
  const [active, setActive] = useState(policies[0].id);
  const policy = policies.find((p) => p.id === active);
  const dir = escalation[active] || [];

  return (
    <section>
      <div className="section-head">
        <h2>Touchpoint Maps</h2>
        <p className="section-strap">
          Delivery fails at touchpoints, not at launch. Each step below carries
          what to measure, the evidence so far, and: when it fails: exactly
          which government office to reach, with addresses and contacts.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Choose policy">
        {policies.map((p) => (
          <button
            key={p.id}
            className={`chip ${active === p.id ? 'chip-active' : ''}`}
            onClick={() => setActive(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <p className="section-strap policy-strap">{policy.strap}</p>

      <div className="touchpoint-list">
        {policy.touchpoints.map((t) => {
          const stepNo = t.name.split('.')[0];
          const esc = dir.find((d) => d.touchpoint.split('.')[0] === stepNo);
          return (
            <article key={t.name} className="touchpoint-card">
              <h3>{t.name}</h3>
              <p className="touchpoint-line">
                <strong>What to measure:</strong> {t.what}
              </p>
              <p className="evidence">
                <strong>Evidence:</strong> {t.evidence}
              </p>

              {esc && (
                <div className="escalation">
                  <h4>If it fails: who to reach</h4>
                  {esc.steps.map((s, i) => (
                    <div key={i} className="escalation-step">
                      <div className="escalation-top">
                        <span className="chip chip-tag">{s.level}</span>
                        <span
                          className={`chip chip-tag ${s.verified ? '' : 'chip-locked'}`}
                          title={s.source}
                        >
                          {s.verified ? 'Verified on official page' : 'Verify before relying'}
                        </span>
                      </div>
                      <p className="escalation-office">
                        <strong>{s.office}</strong>
                        <span className="meta">: {s.authority}</span>
                      </p>
                      <p className="escalation-reach data-num">{s.reach}</p>
                      <p className="meta escalation-note">{s.note}</p>
                      <p className="meta escalation-source">Source: {s.source}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
