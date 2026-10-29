import { useState } from 'react';
import { solutions, categories } from '../data/solutions';
import PageHead from '../components/PageHead';

export default function Solutions() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = solutions.filter((s) => {
    if (filter !== 'All' && s.category !== filter) return false;
    if (!needle) return true;
    return [s.name, s.category, s.region, s.touchpoint, s.howItWorks, s.evidence]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  return (
    <section>
      <PageHead
        eyebrow="Local solutions"
        title="Ankur"
        question="Who already solved this somewhere?"
      >
        Grassroots fixes, documented like evidence: what it is, where it lives,
        how it works, and what backs the claim. Search by the problem, not the
        project name, and read what the fix needs before you copy it.
      </PageHead>

      <div className="solution-search">
        <label htmlFor="solution-search" className="visually-hidden">
          Search solutions by problem, category or place
        </label>
        <input
          id="solution-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by problem, category or place"
        />
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

      {shown.length === 0 && (
        <p className="notice notice-warn" role="status">
          No solution matches that search. Try a problem word, a category or a
          place, or clear the filters.
        </p>
      )}

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
