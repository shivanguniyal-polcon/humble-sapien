import Logo from '../components/Logo';
import { works } from '../data/works';

export default function About({ onNavigate }) {
  return (
    <section>
      <div className="section-head">
        <span className="overline">About THS</span>
        <h2>Working toward a not-for-profit for public interest technology, in every policy</h2>
        <p className="section-strap">
          The Humble Sapien (THS) works the way organisations like Upturn work on
          technology policy: close to the systems that shape people&apos;s
          lives, adversarial to weak evidence, useful to the public. But we
          work across the whole policy surface: health, sanitation,
          governance, technology and whatever comes next.
        </p>
      </div>

      {/* The identity at size: the brain glows as you scroll past. */}
      <Logo mode="scroll" className="brand-lockup-scroll" />

      <div className="grid grid-2">
        <div className="stack">
          <div className="pillar">
            <h3>Public interest first</h3>
            <p>
              Every project must end with the public holding something it did not
              hold before: a verified number, a readable entitlement, a working
              tool, a dataset it can interrogate. Work that ends in a closed
              briefing is consultancy, not our mission.
            </p>
          </div>
          <div className="pillar">
            <h3>Evidence with receipts</h3>
            <p>
              Claims carry their sources. Where we model, we calibrate against
              official data and publish the fit. Where we verify in the field, we
              say what we checked. Where we don&apos;t know, we say that too.
            </p>
          </div>
          <div className="pillar">
            <h3>Accessible by default</h3>
            <p>
              Policy written in language the public cannot parse is policy the
              public cannot claim. Plain language is a delivery mechanism, not
              a nicety.
            </p>
          </div>
          <div className="pillar">
            <h3>Local for local</h3>
            <p>
              Grassroots solutions are treated as evidence, not folklore:
              documented, attributed and mapped to the touchpoints where policy
              can adopt them.
            </p>
          </div>
        </div>

        <div className="stack">
          <article className="card">
            <h3>The model</h3>
            <p>
              THS is working toward registration as a not-for-profit civil
              society organisation. Grant and donor funding carries research and advocacy; earned
              revenue from the THS Data Commons Plus tier and future data
              products is mission-locked: it funds free public tools and field
              work rather than distribution.
            </p>
            <p style={{ marginBottom: 0 }}>
              Raising funds is a means to independence, not a departure from it:
              no funder buys a finding, and open data stays open regardless of
              who pays.
            </p>
          </article>
          <article className="card">
            <h3>What we build</h3>
            <div className="stack">
              <div>
                <strong>Field evidence programmes</strong>
                <p className="meta" style={{ margin: 0 }}>
                  Scheme delivery monitoring and verification across states and
                  municipalities.
                </p>
              </div>
              <div>
                <strong>Public tools</strong>
                <p className="meta" style={{ margin: 0 }}>
                  The policy simplifier, touchpoint maps and local solutions
                  knowledge base: free to use.
                </p>
              </div>
              <div>
                <strong>THS Data Commons</strong>
                <p className="meta" style={{ margin: 0 }}>
                  An open data platform where anyone can chart, pair and test
                  datasets, with a paid tier that funds the rest.
                </p>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => onNavigate('support')}>
                Support the mission
              </button>
            </div>
          </article>
          <article className="card">
            <h3>Selected work behind the institution</h3>
            <ul className="work-record">
              {works.map((w) => (
                <li key={w.id}>
                  <span className="pub-kicker">
                    {w.era} · {w.years}
                  </span>
                  <strong>{w.title}</strong>
                  <span className="meta">{w.metric}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h3>Who runs it</h3>
            <p>
              THS was founded by <strong>Shivang Uniyal</strong>, a policy and
              economics researcher who has drafted 60 parliamentary questions
              for a Member of the 17th Lok Sabha, monitored scheme delivery
              across five states, and built the PM-JAY fiscal model whose
              assumptions are published on this site. The organisation is the
              instrument; the standard of proof is personal.
            </p>
            <p style={{ marginBottom: 0 }}>
              He writes in the first person in{' '}
              <button className="linklike" onClick={() => onNavigate('writing')}>
                Writing
              </button>
              , and keeps a personal site at{' '}
              <a
                href="https://shivanguniyal-polcon.github.io/"
                target="_blank"
                rel="noreferrer"
              >
                shivanguniyal-polcon.github.io
              </a>
              , where The Humble Sapien began as a blog and podcast. This site
              is the institution it grew into.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
