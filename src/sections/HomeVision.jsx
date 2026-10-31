// The frontispiece: the claim the rest of the page argues for, set beside the
// one drawing that makes it concrete. The catalogue below is the evidence;
// this section is the sentence it supports.
//
// The plate is a section through the fifth pillar. Four institutions carry
// separate pieces of the record; the public, the fifth, carries the record
// itself — the data, the information, and the methods to use them. The
// languages live in the ribbon above, once, where they can be heard.

import { TOOLS } from '../data/tools';

const FOUR = [
  { numeral: 'I', name: 'Legislature', act: 'forms the rules.', x: 44, beam: 38 },
  { numeral: 'II', name: 'Executive', act: 'implements them.', x: 118, beam: 112 },
  { numeral: 'III', name: 'Judiciary', act: 'delivers justice and fairness.', x: 192, beam: 186 },
  { numeral: 'IV', name: 'Media', act: 'reports it.', x: 266, beam: 260 },
];

// The heading is the anchor the frontispiece's second door points at. Move
// focus with the scroll so a keyboard reader lands where the page does.
function readCatalogue() {
  const title = document.getElementById('timeline-title');
  if (!title) return;
  // Focus first, with scrolling suppressed. The move is instant rather than
  // smooth: Chromium cancels a smooth scroll when its target takes focus, and
  // an instant move is the one that works for both pointer and keyboard.
  title.focus({ preventScroll: true });
  title.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export default function HomeVision({ onNavigate }) {
  return (
    <section className="home-vision" aria-labelledby="vision-title">
      <div className="shell home-vision-inner">
        <div className="home-vision-copy">
          <p className="overline">The vision</p>
          <h1 id="vision-title" className="home-vision-title">
            THS is the fifth pillar of democracy.
          </h1>

          <p className="home-vision-lede">
            Not a fifth institution added to four. Each of the first four holds
            a piece of the record and speaks to the others; the public is
            spoken about.
          </p>
          <p className="home-vision-body">
            The fifth pillar is a new role, not another seat: the public holding
            the same record, with tools and receipts. That is the contribution
            THS is built to make &mdash; not another publisher with a search
            box, but a reader who can check the claim, count what was never
            counted, and answer with the state&rsquo;s own evidence.
          </p>

          <p className="home-vision-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate?.('work')}
            >
              Explore the {TOOLS.length} instruments
            </button>
            <button type="button" className="linklike" onClick={readCatalogue}>
              Read the catalogue <span aria-hidden="true">&darr;</span>
            </button>
          </p>
        </div>

        <aside className="pillar-plate" aria-labelledby="pillar-plate-title">
          <div className="pillar-plate-head">
            <div>
              <span className="pillar-plate-kicker">The fifth pillar</span>
              <h2 id="pillar-plate-title" className="pillar-plate-title">
                Where THS sits
              </h2>
            </div>
            <span className="pillar-plate-fig" aria-hidden="true">
              Fig. V
            </span>
          </div>

          <figure className="pillar-figure">
            <svg
              className="pillar-drawing"
              viewBox="0 0 420 206"
              role="img"
              aria-labelledby="pillar-drawing-title"
            >
              <title id="pillar-drawing-title">
                Four institutions carry separate pieces of the record. A fifth,
                taller pillar marked THS carries the whole record.
              </title>

              <path className="pillar-ground" d="M16 178H404" />

              {FOUR.map(({ numeral, x, beam }) => (
                <g className="pillar-four" key={numeral}>
                  <rect
                    className="pillar-piece"
                    x={beam}
                    y="72"
                    width="56"
                    height="8"
                  />
                  <rect
                    className="pillar-four-cap"
                    x={x - 4}
                    y="86"
                    width="42"
                    height="6"
                  />
                  <rect
                    className="pillar-four-body"
                    x={x}
                    y="92"
                    width="34"
                    height="84"
                  />
                  <rect
                    className="pillar-four-base"
                    x={x - 4}
                    y="176"
                    width="42"
                    height="4"
                  />
                  <path
                    className="pillar-flute"
                    d={`M${x + 11} 98V170M${x + 23} 98V170`}
                  />
                  <text x={x + 17} y="198" textAnchor="middle">
                    {numeral}
                  </text>
                </g>
              ))}

              <g className="pillar-fifth">
                <rect
                  className="pillar-tablet"
                  x="340"
                  y="26"
                  width="64"
                  height="22"
                />
                <text
                  className="pillar-tablet-word"
                  x="372"
                  y="41"
                  textAnchor="middle"
                >
                  THS
                </text>
                <rect
                  className="pillar-fifth-cap"
                  x="348"
                  y="54"
                  width="48"
                  height="6"
                />
                <rect
                  className="pillar-fifth-body"
                  x="352"
                  y="60"
                  width="40"
                  height="116"
                />
                <rect
                  className="pillar-fifth-base"
                  x="344"
                  y="176"
                  width="56"
                  height="4"
                />
                <text
                  className="pillar-fifth-num"
                  x="372"
                  y="198"
                  textAnchor="middle"
                >
                  V
                </text>
              </g>
            </svg>

            <figcaption className="pillar-caption">
              <ol className="pillar-legend">
                {FOUR.map(({ numeral, name, act }) => (
                  <li key={numeral}>
                    <span className="pillar-legend-num" aria-hidden="true">
                      {numeral}
                    </span>
                    <span>
                      <strong>{name}</strong> {act}
                    </span>
                  </li>
                ))}
                <li className="is-fifth">
                  <span className="pillar-legend-num" aria-hidden="true">
                    V
                  </span>
                  <span>
                    <strong>The public</strong> holds the record: the data, the
                    information, and the methods to exercise power.
                  </span>
                </li>
              </ol>
            </figcaption>
          </figure>

          <p className="pillar-plate-note">
            The first four hold a piece each and speak to one another. None
            hands the record to the public. THS is the fifth: the public holding
            the same record, with the tools and the receipts.
          </p>
        </aside>
      </div>
    </section>
  );
}
