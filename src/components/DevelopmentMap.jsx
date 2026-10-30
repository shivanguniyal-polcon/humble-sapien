// Where the feed is being published from.
//
// This is a map of institutions, not of work: the pin is the base of the lab,
// institute or regulator that published the item. A preprint carries no stated
// affiliation in the arXiv feed, so papers are counted as unplaced rather than
// pinned to a country the data never gave. The map therefore shows the tracked
// publishers' footprint, not a census of world AI.

import { WORLD_COUNTRIES, INDIA_PATH, WORLD_VIEWBOX } from '../data/worldMap';
import { summarizePlaces } from '../lib/rara/tracker';

const heatFor = (count, max) => {
  if (!count) return null;
  const share = count / max;
  if (share > 0.75) return '4';
  if (share > 0.45) return '3';
  if (share > 0.2) return '2';
  return '1';
};

export default function DevelopmentMap({ items }) {
  const { countries, placed, unplaced } = summarizePlaces(items);
  const max = countries.reduce((top, entry) => Math.max(top, entry.count), 1);
  const counts = new Map(countries.map((entry) => [entry.iso, entry.count]));
  const hubs = countries.slice(0, 6);

  if (!placed) {
    return (
      <figure className="tracker-map">
        <p className="tracker-map-empty">
          Nothing in this view has a placed publisher. Papers and the discovery
          feed carry no institution, so there is nothing to put on the map.
        </p>
      </figure>
    );
  }

  return (
    <figure className="tracker-map">
      <svg
        className="tracker-map-svg"
        viewBox={WORLD_VIEWBOX}
        role="img"
        aria-label={`World map of publishing institutions. ${placed} developments come from ${countries.length} countries; the largest is ${hubs[0].country} with ${hubs[0].count}. ${unplaced} developments are unplaced.`}
      >
        <rect className="tracker-map-sea" x="0" y="0" width="100%" height="100%" />
        {WORLD_COUNTRIES.map(([iso, name, d], index) => (
          <path
            key={`${iso}-${index}`}
            className="tracker-map-country"
            data-heat={heatFor(counts.get(iso), max) || undefined}
            d={d}
          >
            <title>{counts.get(iso) ? `${name} — ${counts.get(iso)}` : name}</title>
          </path>
        ))}
        <path
          className="tracker-map-country tracker-map-india"
          data-heat={heatFor(counts.get('IN'), max) || undefined}
          d={INDIA_PATH}
        >
          <title>India{counts.get('IN') ? ` — ${counts.get('IN')}` : ''}</title>
        </path>
      </svg>

      <figcaption className="tracker-map-caption">
        <div>
          <p className="overline">Where the publishers sit</p>
          {hubs.map((hub) => (
            <p className="tracker-hub" key={hub.iso}>
              <span className="tracker-hub-country">{hub.country}</span>
              <span className="tracker-hub-city">{hub.cities.join(' · ')}</span>
              <span className="data-num tracker-hub-count">{hub.count}</span>
            </p>
          ))}
        </div>
        <div className="tracker-map-note">
          <ul className="tracker-map-legend" aria-label="Developments per country">
            <li>
              <span className="tracker-key" data-heat="1" aria-hidden="true" /> few
            </li>
            <li>
              <span className="tracker-key" data-heat="3" aria-hidden="true" /> more
            </li>
            <li>
              <span className="tracker-key" data-heat="4" aria-hidden="true" /> most
            </li>
          </ul>
          <p>
            {placed} of {placed + unplaced} developments are placed: the map uses
            the publishing institution's base, not the place the work was done.
            Papers state no affiliation in the feed, so {unplaced} are unplaced
            rather than guessed.
          </p>
          <p>
            Darker is more items, not more importance. Countries with no tracked
            publisher are left at base colour and are not a claim that nothing
            is happening there.
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
