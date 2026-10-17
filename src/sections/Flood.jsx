// The deluge: the page opens inside the flood of government output, before
// any finding. Central and state, laws to MoUs to MoAs — every figure carries
// its scope and its date, because several of them count paper, not outcomes.
// The last cell is the one that matters: the total that does not exist.

import { useCountUp } from '../lib/useScrollStep';

const CELLS = [
  {
    t: 15000,
    sfx: '+',
    what: 'state laws estimated in force across India',
    src: 'PRS Legislative Research, 2013 — still the only national estimate anyone holds',
  },
  {
    t: 41299,
    what: 'MoUs for projects at one state investment summit',
    src: 'Vibrant Gujarat, January 2024 — ₹26.33 lakh crore proposed on paper',
  },
  {
    t: 18643,
    what: 'MoUs at another state’s investors’ summit',
    src: 'UP Global Investors Summit, February 2023 — intents, not outcomes',
  },
  {
    t: 236,
    what: 'MoUs signed on prime-ministerial foreign visits since 2021',
    src: 'Rajya Sabha answer, March 2026 — the central level signs too',
  },
  {
    t: 1515,
    what: 'rules, regulations, circulars and schemes laid before the Lok Sabha in three years',
    src: 'PRS: the committee set up to examine them went through 44 — about three per cent',
  },
  {
    t: 1486,
    what: 'Central Acts repealed in eight years',
    src: 'Law Minister, Rajya Sabha reply, 2022 — the statute book churns quietly',
  },
  {
    t: 84,
    what: 'ordinances promulgated by state governments in one year',
    src: 'PRS review of state laws, 2023 — Uttar Pradesh alone: 20',
  },
  {
    t: 500,
    sfx: '+',
    what: 'bills passed by state legislatures in a single year',
    src: 'PRS annual review of state laws, 2024',
  },
  {
    t: 35,
    what: 'MoAs signed with states and UTs under one central housing scheme',
    src: 'PMAY (Urban) programme page, September 2023 — memoranda of agreement, counted scheme by scheme',
  },
  {
    t: 15,
    what: 'parts one state’s ordinary gazette publishes in, every single week',
    src: 'Haryana Gazette description — extraordinary issues printed on top, whenever needed',
  },
  {
    t: 1380509,
    what: 'RTI replies by central public authorities in one year',
    src: 'Parliamentary answer, 2024-25 — 58,501 rejected, 2,80,353 passed to someone else',
  },
  {
    n: '—',
    what: 'annual count of gazette notifications published, central or state',
    src: 'No such total exists anywhere. That absence is the finding.',
    danger: true,
  },
];

const TICKER = [
  'NOTWITHSTANDING ANYTHING CONTAINED IN SECTION 14',
  'PROVIDED THAT NOTHING IN THIS CHAPTER SHALL APPLY',
  'S.O. 1234(E) · NEW DELHI, THE 14TH DAY OF MARCH',
  'WHEREAS IT IS EXPEDIENT TO PROVIDE FOR THE MATTERS',
  'THE AUTHORITY SHALL, IN CONSULTATION WITH THE STATE GOVERNMENT, BY ORDER',
  'SAVE AS OTHERWISE PROVIDED IN THE SCHEDULE',
  'MEMORANDUM OF UNDERSTANDING ENTERED INTO BY THE GOVERNMENT OF',
  'ANNEXURE — SEE RULE 4(2)',
  'SUBJECT TO THE PROVISIONS OF SUB-SECTION (2)',
];

// Figures load the same way the finding's do: count up on entering view,
// en-IN grouping, final value instantly under reduced motion (useCountUp).
// The cell with no number at all never counts — you cannot animate a total
// that nobody ever published.
const Num = ({ target, suffix }) => {
  const [ref, value] = useCountUp(target);
  return (
    <span ref={ref}>
      {value.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

export default function Flood() {
  const strip = TICKER.join('  ·  ');
  return (
    <section className="flood" aria-label="Government output at both levels">
      <div className="flood-ticker" aria-hidden="true">
        <div className="flood-ticker-track">
          <span>{strip}</span>
          <span>{strip}</span>
        </div>
      </div>

      <div className="section-head flood-head">
        <span className="overline">The deluge</span>
        <h2>Government output, both levels, before anyone has read it</h2>
        <p className="section-strap">
          Central and state, Acts to MoUs to MoAs: the state publishes faster
          than any democracy can read. Every figure carries its scope and its
          date — several of them count paper, not outcomes, and the ones that
          can be counted say so.
        </p>
      </div>

      <div className="flood-grid">
        {CELLS.map((c) => (
          <div key={c.what} className={`flood-cell ${c.danger ? 'flood-cell-danger' : ''}`}>
            <div className="flood-num data-num">
              {c.n ?? <Num target={c.t} suffix={c.sfx} />}
            </div>
            <div className="flood-what">{c.what}</div>
            <div className="flood-src">{c.src}</div>
          </div>
        ))}
      </div>

      <p className="flood-foot">
        Sources: PRS Legislative Research state-law reviews (2013, 2023, 2024)
        and its examination of subordinate legislation; Law Minister replies in
        the Rajya Sabha (2022, 2026); the PMAY (Urban) programme page; the
        Haryana Gazette; summit records as reported by The Hindu and The
        Economic Times. Every dataset in the THS commons carries the same
        rule: a number without a scope and a date is a rumour.
      </p>
    </section>
  );
}
