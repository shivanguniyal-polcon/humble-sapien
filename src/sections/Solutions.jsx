import { useState } from 'react';
import { solutions, categories } from '../data/solutions';

export default function Solutions() {
  const [filter, setFilter] = useState('All');
  const shown = solutions.filter(
    (s) => filter === 'All' || s.category === filter,
  );

  return (
    <section>
      <div className="section-head">
        <h2>Local Solutions</h2>
        <p className="section-strap">
          Grassroots fixes, documented like evidence: what it is, where it
          lives, how it works, and what backs the claim.
        </p>
      </div>

      <div className="filter-row">
        {categories.map((c) => (
          <button
            key={c}
            className={`chip ${filter === c ? 'chip-active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="solution-grid">
        {shown.map((s) => (
          <article key={s.id} className="solution-card">
            <div className="solution-top">
              <span className="chip chip-tag">{s.category}</span>
              <span className="region">{s.region}</span>
            </div>
            <h3>{s.name}</h3>
            <p className="touchpoint-line">
              <strong>Touchpoint:</strong> {s.touchpoint}
            </p>
            <p>{s.howItWorks}</p>
            <p className="evidence">
              <strong>Evidence:</strong> {s.evidence}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
