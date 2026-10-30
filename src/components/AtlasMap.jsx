import { WORLD_COUNTRIES, INDIA_PATH, WORLD_VIEWBOX } from '../data/worldMap';
import { sectorIsoCodes, atlasIsoCodes, INDIA_ISO } from '../data/atlasMap';

// The atlas, drawn. Countries whose policies the selected sector covers are
// lit; countries covered elsewhere in the atlas sit at half strength; the rest
// of the world is context.
//
// India's path is separate and drawn last, so the fill of the Government of
// India's claimed boundary wins over the de facto shapes of Pakistan and
// China underneath it. It takes its colour from the same sets as every other
// country rather than being pinned to lit.
export default function AtlasMap({ sector, sectors }) {
  const lit = sectorIsoCodes(sector);
  const studied = atlasIsoCodes(sectors);
  const elsewhere = studied.size - lit.size;
  const indiaClass = lit.has(INDIA_ISO)
    ? 'is-lit'
    : studied.has(INDIA_ISO)
      ? 'is-studied'
      : 'is-base';

  return (
    <figure className="atlas-map">
      <svg
        className="atlas-map-svg"
        viewBox={WORLD_VIEWBOX}
        role="img"
        aria-label={`World map. ${lit.size} countries are lit for ${sector.label}; ${elsewhere} more are covered by other sectors of the atlas. India's boundary is drawn as claimed by the Government of India.`}
      >
        <rect className="atlas-map-sea" x="0" y="0" width="100%" height="100%" />
        {WORLD_COUNTRIES.map(([iso, name, d], index) => (
          <path
            key={`${iso}-${index}`}
            className={lit.has(iso) ? 'is-lit' : studied.has(iso) ? 'is-studied' : 'is-base'}
            d={d}
          >
            <title>{name}</title>
          </path>
        ))}
        <path className={`${indiaClass} atlas-map-india`} d={INDIA_PATH}>
          <title>India</title>
        </path>
      </svg>

      <figcaption className="atlas-map-caption">
        <ul className="atlas-map-legend">
          <li>
            <span className="atlas-key atlas-key-lit" aria-hidden="true" />
            {lit.size} covered in {sector.label}
          </li>
          <li>
            <span className="atlas-key atlas-key-studied" aria-hidden="true" />
            {elsewhere} covered in other sectors
          </li>
          <li>
            <span className="atlas-key atlas-key-base" aria-hidden="true" />
            not yet covered
          </li>
        </ul>
        <p className="fine-print">
          India's boundary is drawn as the Government of India claims it,
          including Jammu &amp; Kashmir, Ladakh, Aksai Chin and
          Pakistan-occupied Kashmir. Geometry: Natural Earth and DataMeet,
          public domain and CC0.
        </p>
      </figcaption>
    </figure>
  );
}
