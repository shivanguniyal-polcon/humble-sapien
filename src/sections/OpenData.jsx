import { useState } from 'react';
import { LICENSES, licenseLaw } from '../data/opendata';
import { themes, byTheme } from '../data/dataCatalog';

export default function OpenData({ onNavigate, onOpenDataset }) {
  const [theme, setTheme] = useState('all');

  return (
    <div>
      <div className="card">
        <h3>The data commons</h3>
        <p style={{ marginBottom: 0 }}>
          Open data is only open if the licence says so. Every row below carries
          its publisher, coverage and an honest licence label, plus what you can
          do with it here. Where we could not confirm reuse terms, the label
          says so. Take the data, credit the source, build things.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Filter by theme">
        <button
          className={`chip ${theme === 'all' ? 'chip-active' : ''}`}
          aria-pressed={theme === 'all'}
          onClick={() => setTheme('all')}
        >
          All themes
        </button>
        {themes.map((t) => (
          <button
            key={t.id}
            className={`chip ${theme === t.id ? 'chip-active' : ''}`}
            aria-pressed={theme === t.id}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {themes
        .filter((t) => theme === 'all' || t.id === theme)
        .map((t) => {
          const rows = byTheme(t.id);
          if (rows.length === 0) return null;
          return (
            <section key={t.id} className="theme-group">
              <div className="theme-head">
                <h3>{t.label}</h3>
                <p className="fine-print">
                  {t.note} · {rows.length} {rows.length === 1 ? 'dataset' : 'datasets'}
                </p>
              </div>
              <div className="list-rows">
                {rows.map((r) => (
                  <article key={r.name + r.pub} className="list-row">
                    <div className="list-row-main">
                      <h4>{r.name}</h4>
                      <p className="list-row-meta">
                        {r.pub} · {r.coverage}
                      </p>
                      <p className="list-row-what">{r.what}</p>
                      <p className="fine-print" style={{ marginBottom: 0 }}>
                        <strong>Do with it:</strong> {r.canDo}
                      </p>
                    </div>
                    <div className="list-row-side">
                      <span className={`license-badge license-${r.licence}`}>
                        {LICENSES[r.licence] ? LICENSES[r.licence].label : r.licence}
                      </span>
                      <p className="fine-print">{r.terms}</p>
                      <a className="btn btn-secondary" href={r.url} target="_blank" rel="noreferrer">
                        Open source
                      </a>
                      {r.lab && onNavigate && (
                        <button type="button" className="btn btn-primary" onClick={() => onNavigate('work')}>
                          Use in the engine
                        </button>
                      )}
                      {r.run && onOpenDataset && (
                        <button type="button" className="btn btn-primary" onClick={() => onOpenDataset(r.run)}>
                          Open in playground
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

      <div className="card">
        <h3>How to read the licence labels</h3>
        <div className="approach-grid">
          {licenseLaw.map(([k, v]) => (
            <div key={k} className="approach-row">
              <span className="approach-key">{k}</span>
              <p className="approach-val">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
