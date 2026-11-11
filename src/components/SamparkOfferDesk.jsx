import { useState } from 'react';

// The tool is one handover. This is the rest of the institution: a desk, a
// partner academy, a referral route, a public record and a small lab.
//
// The copy arrives from the page's locale, so the selector is translated with
// the rest of the page. One service line is open at a time so the page stays
// readable on a phone; the buttons are a selector, not a fake set of links.
export default function SamparkOfferDesk({ copy }) {
  const offers = copy?.items || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const offer = offers[activeIndex] || offers[0];

  if (!offer) return null;

  return (
    <section className="sampark-offers" aria-labelledby="sampark-offers-title">
      <div className="section-head">
        <span className="overline">{copy.eyebrow}</span>
        <h2 id="sampark-offers-title">{copy.title}</h2>
        <p className="section-strap">{copy.strap}</p>
      </div>

      <div className="filter-row" role="group" aria-label={copy.groupLabel}>
        {offers.map((entry, index) => (
          <button
            key={entry.label}
            type="button"
            className={`chip ${index === activeIndex ? 'chip-active' : ''}`}
            aria-pressed={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <article className="card sampark-offer-panel" aria-live="polite">
        <div className="sampark-offer-head">
          <div>
            <span className="overline">{offer.stage}</span>
            <h3>{offer.title}</h3>
          </div>
          <span className="chip chip-tag sampark-offer-stage">{offer.label}</span>
        </div>
        <p className="sampark-offer-summary">{offer.summary}</p>

        <dl className="sampark-offer-facts">
          <div>
            <dt>{copy.whoLabel}</dt>
            <dd>{offer.who}</dd>
          </div>
          <div>
            <dt>{copy.whatLabel}</dt>
            <dd>
              <ul>
                {offer.what.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>{copy.boundaryLabel}</dt>
            <dd>{offer.boundary}</dd>
          </div>
          <div>
            <dt>{copy.moneyLabel}</dt>
            <dd>{offer.money}</dd>
          </div>
        </dl>
      </article>

      <div className="notice sampark-offer-note">
        <p>
          <strong>{copy.freeLabel}</strong> {copy.free.slice(0, 3).join('; ')}.
        </p>
        <p>
          <strong>{copy.notLabel}</strong> {copy.not.slice(0, 4).join('; ')}.
        </p>
      </div>
    </section>
  );
}
