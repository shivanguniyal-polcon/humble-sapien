// The index page: the whole site as a newspaper contents page, ruled and
// numbered. The problem spread hands the reader here; from every entry, one
// line says what the door opens.

import { useEffect, useRef } from 'react';
import { CONTENTS } from '../data/contents';
import { takeRouteFocus } from '../lib/routeFocus';

export default function SolutionIndex({ onNavigate }) {
  const titleRef = useRef(null);

  useEffect(() => {
    document.title = 'Where to start · THS: The Humble Sapien';
    if (takeRouteFocus()) titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="index-page">
      {/* The page a reader most often arrives from is the close of the
          timeline, which hands them here. Send them back to it by name: on
          this page the mark and the V are the only other ways out. */}
      <button
        type="button"
        className="linklike index-back"
        onClick={() => onNavigate('home')}
      >
        <span aria-hidden="true">&larr; </span>The timeline
      </button>

      <div className="index-head">
        <span className="overline">The index</span>
        <h1 id="page-title" tabIndex={-1} ref={titleRef}>
          Where to start
        </h1>
        <p className="section-strap">
          Every section of this site takes one piece of the problem apart and
          hands you the instrument that does it. Pick a door &mdash; they are
          all free.
        </p>
      </div>

      <ol className="index-list">
        {CONTENTS.map((entry, i) => (
          <li key={entry.tab}>
            <button
              type="button"
              className="index-row"
              onClick={() => onNavigate(entry.tab)}
            >
              <span className="index-num data-num">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="index-label">
                {entry.label}
                <span className="index-count">{entry.count}</span>
              </span>
              <span className="index-what">{entry.what}</span>
              <span className="index-arrow" aria-hidden="true">
                &rarr;
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="meta index-foot">
        The menu behind V carries the same doors in this page&rsquo;s order,
        along with the two pages that hold them: the timeline and this index.
        Numbers carry their counts because a menu that overstates is a rumour.
      </p>
    </section>
  );
}
