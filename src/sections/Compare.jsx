import { useState } from 'react';
import { sectors, sectorSources, atlasNote } from '../data/sectors';
import { schemes, featureRows, sources as healthSources } from '../data/comparison';

const TABS = [
  { id: 'north', label: 'Global North' },
  { id: 'south', label: 'Global South' },
];

// Hand-read groupings for the health deep-dive matrix (see sources below).
const GROUPINGS = {
  covered: 'Scheme targets (India) · resident populations (UK, Brazil) · enrolled membership (Indonesia, US)',
  eligibility:
    'Vulnerability-tested (India) · residence-based (UK) · citizenship residual (Thailand) · mandatory residency (Indonesia) · community membership (Rwanda) · universal (Brazil) · means + category tested (US)',
  financing:
    'Tax-funded: UK, Thailand, Brazil · government budget: India · social insurance: Indonesia · premiums + subsidy: Rwanda · federal–state mix: US',
  benefits:
    'Inpatient only (India) · comprehensive (UK, Thailand, Indonesia, Brazil, US) · referral-pathway package (Rwanda)',
  providers:
    'Empanelled mixed (India) · public-dominant (Thailand) · contracted mixed (Indonesia, Brazil, US) · tiered public (Rwanda)',
  portability:
    'National (India, Indonesia) · devolved (UK) · network-registered (Thailand) · referral-bound (Rwanda) · decentralised (Brazil) · state-bound (US)',
  digital:
    'Aadhaar-linked (India) · patient ID only (UK, Brazil) · unverified or state-run (Thailand, Indonesia, Rwanda, US)',
};

const PolicyCard = ({ p, region }) => (
  <div className="card policy-card">
    <div className="policy-card-head">
      <span className={`policy-region policy-${region}`}>{region === 'north' ? 'Global North' : 'Global South'}</span>
      <span className="policy-year data-num">{p.y}</span>
    </div>
    <h3 className="policy-name">{p.n}</h3>
    <p className="meta policy-juris">{p.j}{p.y2 ? ` · ${p.y2}` : ''}</p>
    <p className="policy-what">{p.w}</p>
    <p className="policy-sig">
      <span className="approach-key">Signature</span> {p.s}
    </p>
  </div>
);

export default function Compare({ onNavigate, openSub }) {
  // Deep links from the nav dropdown: #/atlas/<sector-id>. Seeded from the
  // prop so a fresh load lands on the right sector, then adjusted on change.
  const [sectorId, setSectorId] = useState(
    openSub && sectors.some((s) => s.id === openSub) ? openSub : 'tech',
  );
  const [tab, setTab] = useState('north');

  const [seenSub, setSeenSub] = useState(openSub);
  if (openSub !== seenSub) {
    setSeenSub(openSub);
    if (openSub && sectors.some((s) => s.id === openSub)) setSectorId(openSub);
  }

  const sector = sectors.find((s) => s.id === sectorId);
  const shown = sector[tab];

  return (
    <section>
      <div className="section-head">
        <span className="overline">Global policy lab</span>
        <h2>The policy atlas: 15 sectors, two hemispheres</h2>
        <p className="section-strap">
          Ninety flagship policies, from data protection to defence. Pick a
          sector, read what each region built, then see where the two
          approaches split.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Choose sector">
        {sectors.map((s) => (
          <button
            key={s.id}
            className={`chip ${sectorId === s.id ? 'chip-active' : ''}`}
            aria-pressed={sectorId === s.id}
            onClick={() => setSectorId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="filter-row" role="group" aria-label="Choose region">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`chip ${tab === t.id ? 'chip-active' : ''}`}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="policy-grid">
        {shown.map((p) => (
          <PolicyCard key={p.n} p={p} region={tab} />
        ))}
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Where the approaches split: {sector.label}</h3>
        <p className="meta">
          The same problem, two playbooks. This is what each region tends to
          reach for first.
        </p>
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Global North</th>
                <th scope="col">Global South</th>
              </tr>
            </thead>
            <tbody>
              {sector.diff.map(([q, n, s]) => (
                <tr key={q}>
                  <th scope="row">{q}</th>
                  <td>{n}</td>
                  <td>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sectorId === 'health' && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3>Health deep dive: the seven schemes side by side</h3>
          <p className="meta">
            The full feature matrix behind the health cards. Pick any two to
            four schemes from the cards above and read across.
          </p>
          <div className="compare-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  {schemes.map((s) => (
                    <th scope="col" key={s.id}>
                      {s.flag} {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">
                      {row.label}
                      <span className="compare-grouping">{GROUPINGS[row.key]}</span>
                    </th>
                    {schemes.map((s) => (
                      <td key={s.id}>{s[row.key]}</td>
                    ))}
                  </tr>
                ))}
                <tr className="compare-signature">
                  <th scope="row">
                    What&apos;s unique here
                    <span className="compare-grouping">
                      A signature design trait, not a claim that no one else does anything similar.
                    </span>
                  </th>
                  {schemes.map((s) => (
                    <td key={s.id}>{s.signature}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="meta" style={{ marginBottom: 0 }}>
            {healthSources.join(' · ')} — figures carry their years and
            definitions as published; coverage counts are not directly
            comparable across schemes.
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>How to read this atlas</h3>
        <p className="meta">{atlasNote}</p>
        <p className="meta" style={{ marginBottom: 0 }}>
          Sources: {sectorSources.join(' · ')}. Where a primary text was not
          readable during research, the card keeps to what the source supports.
          If you have a correction with a source, send it and the card changes.
        </p>
      </div>

      <div className="card tool-ending">
        <h3>Now use it</h3>
        <p>
          Comparison is where questions start. Take any policy above into the
          simplifier and read it in plain words, or take apart the datasets
          behind these designs in the Data Commons.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate('work')}>
            Simplify a policy text
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('data')}>
            Open the Data Commons
          </button>
        </div>
      </div>
    </section>
  );
}
