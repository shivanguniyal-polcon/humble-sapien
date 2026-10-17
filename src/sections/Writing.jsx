import { useState } from 'react';
import { ESSAYS } from '../data/essays';

export default function Writing({ onNavigate, openSub }) {
  // Deep links from the nav dropdown: #/writing/<essay-id>. Seeded from the
  // prop so a fresh load lands on the right essay, then adjusted on change.
  const [open, setOpen] = useState(
    openSub && ESSAYS.some((e) => e.id === openSub) ? openSub : 'evolve',
  );

  const [seenSub, setSeenSub] = useState(openSub);
  if (openSub !== seenSub) {
    setSeenSub(openSub);
    if (openSub && ESSAYS.some((e) => e.id === openSub)) setOpen(openSub);
  }

  const essay = ESSAYS.find((e) => e.id === open);

  return (
    <section>
      <div className="section-head">
        <span className="overline">Writing</span>
        <h2>Notes from the workshop</h2>
        <p className="section-strap">
          Short essays by Shivang Uniyal, founder of THS, on why policy
          consumption must evolve, what the record actually says, and how the
          work is done. Plain words, no jargon, no fine print.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Choose an essay">
        {ESSAYS.map((e) => (
          <button
            key={e.id}
            className={`chip ${open === e.id ? 'chip-active' : ''}`}
            aria-pressed={open === e.id}
            onClick={() => setOpen(e.id)}
          >
            {e.title.split(',')[0].split(':')[0]}
          </button>
        ))}
      </div>

      <article className="card essay">
        <p className="meta">
          Shivang Uniyal · {essay.date} · about {essay.minutes} minutes
        </p>
        <h3 className="essay-title">{essay.title}</h3>
        <p className="essay-standfirst">{essay.standfirst}</p>
        {essay.body.map((para, i) => (
          <p key={i} className="essay-body">
            {para}
          </p>
        ))}
        <p className="meta" style={{ marginBottom: 0 }}>
          Part of the THS voice: one person writing in the open, and the whole
          organisation standing behind the facts.
        </p>
      </article>

      <div className="card tool-ending">
        <h3>Now use it</h3>
        <p>
          Every essay here has a tool behind it. If this one made you want to
          check a promise, read a law or break open a dataset, the instruments
          are free and waiting.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate('work')}>
            Open the promise scorecards
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('data')}>
            Take apart a dataset
          </button>
        </div>
      </div>
    </section>
  );
}
