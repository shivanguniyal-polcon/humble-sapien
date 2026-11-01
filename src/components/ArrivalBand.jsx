import { useState } from 'react';
import { TOOLS, toolById } from '../data/tools';

// The phone's arrival band. It is not a gate: the page still opens on the
// claim, and the band sits under it with the two doors and four task tiles.
// The public door is the default, the choice is remembered locally, and the
// band is hidden on the desktop, where the full index is already in reach.

const STORAGE_KEY = 'ths-arrival-audience';

const AUDIENCES = {
  public: {
    label: 'For the public',
    note: 'Free, no account.',
    tiles: [
      ['passbook', 'Check the village’s money'],
      ['touchpoints', 'Find the office that owes you'],
      ['simplifier', 'Read a notice in plain words'],
      ['scorecards', 'Check what was promised'],
    ],
    more: { label: `See all ${TOOLS.length} instruments`, tab: 'work' },
  },
  institutions: {
    label: 'For institutions',
    note: 'Public sector at cost; commercial by licence.',
    tiles: [
      ['monitor', 'Track a regulatory change'],
      ['project', 'Screen a project’s debt'],
      ['battery', 'Reproduce the analysis'],
      ['lab', 'Test whether policy worked'],
    ],
    more: { label: 'See licensing', tab: 'licensing' },
  },
};

const savedAudience = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'institutions'
      ? 'institutions'
      : 'public';
  } catch {
    // A browser with storage blocked still gets the public door.
    return 'public';
  }
};

export default function ArrivalBand({ onNavigate }) {
  const [audience, setAudience] = useState(savedAudience);
  const panel = AUDIENCES[audience];

  const choose = (next) => {
    setAudience(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still holds for this page; it just will not persist.
    }
  };

  return (
    <section className="arrival-band" aria-labelledby="arrival-title">
      <p className="overline" id="arrival-title">
        What do you need?
      </p>

      <div className="arrival-doors" role="group" aria-label="Choose what you need">
        {Object.entries(AUDIENCES).map(([id, entry]) => (
          <button
            key={id}
            type="button"
            className="arrival-door"
            aria-pressed={audience === id}
            onClick={() => choose(id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="arrival-note" role="status">
        {panel.note}
      </p>

      <ul className="arrival-tiles">
        {panel.tiles.map(([id, verb]) => {
          const tool = toolById(id);
          if (!tool) return null;
          return (
            <li key={id}>
              <button
                type="button"
                className="arrival-tile"
                onClick={() => onNavigate?.('work', id)}
              >
                <span className="arrival-tile-verb">{verb}</span>
                <span className="arrival-tile-name">{tool.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="linklike arrival-more"
        onClick={() => onNavigate?.(panel.more.tab)}
      >
        {panel.more.label} <span aria-hidden="true">&rarr;</span>
      </button>
    </section>
  );
}

