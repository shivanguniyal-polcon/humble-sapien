import { GENERAL_RULES, MODULE_FORMATS } from '../battery';

// Institutional licensing for the Policy Battery. The principle is simple and
// mission-locked: the instruments are free for the public, institutions pay,
// and the revenue keeps the free tier free. The input-format specification
// lives here too, rendered from the same structure the engine documents
// itself with, so the licence cannot promise what the formats do not accept.

const TIERS = [
  {
    id: 'citizen',
    name: 'Citizens and civil society',
    price: 'Free, permanently',
    priceNote: 'No account, no card, no expiry, no watermark.',
    who: 'Individuals, students, community groups, registered non-profits, trade unions, journalists, panchayat and ward offices, public-interest litigants, classrooms, and anyone answering an RTI or sitting in a public hearing.',
    what: [
      'Every module: decision tree, cost-benefit analysis, multi-criteria ranking, scenario runs.',
      'Unlimited runs on your own data, with the full audit manifest in every report.',
      'Project files that re-run exactly, and print-ready reports you may publish.',
    ],
    tag: 'Free tier',
  },
  {
    id: 'public',
    name: 'Public sector and academia',
    price: 'Free when published in the open; at cost otherwise',
    priceNote: 'A support agreement covers unpublished internal use, training and integration. Rate card on request.',
    who: 'Government departments, public hospitals, panchayati raj institutions, regulators, legislatures, public universities and research institutions.',
    what: [
      'Analysis published in the open stays free: publish the report and the manifest with it.',
      'Support agreements add training sessions, custom module development, and help wiring the engine into internal workflows.',
      'Procurement-friendly: written rate card, tax invoice, no lock-in. The engine keeps working if the agreement lapses.',
    ],
    tag: 'At cost',
  },
  {
    id: 'commercial',
    name: 'Commercial and consulting',
    price: 'Annual institutional licence',
    priceNote: 'Scales with the size of the practice. Rate card on request.',
    who: 'Consultancies, private firms, multilateral organisations and contracted research teams using the battery inside paid engagements or client deliverables.',
    what: [
      'Right to embed battery outputs in paid client deliverables, with attribution and the engine version stated.',
      'The same engine the free tier uses. No private fork, no hidden version: a licence buys rights and support, not a better calculator.',
      'Volume terms for teams, plus invoicing and compliance paperwork procurement desks expect.',
    ],
    tag: 'Licensed',
  },
  {
    id: 'partnership',
    name: 'Commissioned development',
    price: 'Project-based',
    priceNote: 'Funded work buys capacity, never findings.',
    who: 'Institutions funding new modules or reference models, like the PM-JAY scenario engine ported into the battery.',
    what: [
      'New modules enter the public engine by default. The people the policy describes get the instrument too.',
      'Method independence is non-negotiable: funding buys engineering time, not a verdict, and the commissioning terms are published with the module.',
      'Maintenance commitments are written down, so open modules do not rot after delivery.',
    ],
    tag: 'Partnership',
  },
];

const REPRODUCIBILITY = [
  {
    head: 'Every report reproduces exactly',
    body: 'Each run emits an audit manifest: SHA-256 hashes over the canonical input, the parameters and the output, plus the engine version. Re-run the same files on the same version and the three hashes match byte for byte. That is the promise a licence rests on, in every tier.',
  },
  {
    head: 'You own your inputs and your outputs',
    body: 'Publish what you generate. Citizens and civil society need no permission: quote the report, publish the tables, put the manifest on the record. Commercial embedding is covered by the institutional licence. Attribution with the engine version is the only standing request.',
  },
  {
    head: 'Your data never leaves your machine',
    body: 'All computation runs in your browser. No input data is uploaded to THS, stored by THS, or visible to THS. The licence covers use of the instrument, not custody of your data, which is why it can be granted in a day without a data-sharing agreement.',
  },
  {
    head: 'Versions pin; rights do not retract',
    body: 'Results are stamped with the engine version that produced them, and that version keeps its terms. Upgrading is your choice. A licence change never reaches back to restrict work already generated under a published version.',
  },
  {
    head: 'No warranty, stated plainly',
    body: 'These are instruments for public decisions, not certified audits. Parameters carry their verification status and the report prints it. The public interest gate is a methodological discipline, not legal compliance. Where the evidence is weak, the artefact says so.',
  },
  {
    head: 'The free tier is unconditional',
    body: 'No account, no telemetry wall, no trial period, no future reclassification. It is free because the mission says so and the institutional tiers pay for it, not because a growth experiment permits it.',
  },
];

export default function Licensing({ onNavigate }) {
  return (
    <section>
      <div className="section-head">
        <span className="overline">Institutional licensing</span>
        <h2>Free for the public. Paid for institutions.</h2>
        <p className="section-strap">
          The Policy Battery is licensed in four tiers. Citizens and civil
          society use it free, forever, without an account. Institutions that
          sell analysis or run administrations pay for it, and that revenue is
          what keeps the first tier unconditional.
        </p>
      </div>

      <div className="grid grid-2">
        {TIERS.map((t) => (
          <article key={t.id} className="card">
            <div className="fund-row">
              <h3 style={{ margin: 0 }}>{t.name}</h3>
              <span className="fund-tag">{t.tag}</span>
            </div>
            <p>
              <strong>{t.price}</strong>
            </p>
            <p className="meta" style={{ marginTop: 0 }}>{t.priceNote}</p>
            <p className="fine-print">{t.who}</p>
            <ul>
              {t.what.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>What every tier gets</h3>
        <p style={{ marginBottom: 0 }}>
          The identical engine. There is no premium calculator: the district
          collector answering an RTI and the consultancy billing a ministry run
          the same code, produce the same hashes, and face the same public
          interest gate that will not release a report until the three
          questions are answered. What money buys is rights, support and
          engineering time. It never buys a different answer.
        </p>
      </div>

      <div className="section-head" style={{ marginTop: '2.5rem' }}>
        <span className="overline">Reproducibility terms</span>
        <h2>What the licence promises</h2>
      </div>
      <div className="grid grid-2">
        {REPRODUCIBILITY.map((r) => (
          <article key={r.head} className="card">
            <h3>{r.head}</h3>
            <p className="fine-print" style={{ marginBottom: 0 }}>{r.body}</p>
          </article>
        ))}
      </div>

      <div className="section-head" style={{ marginTop: '2.5rem' }}>
        <span className="overline">Input formats</span>
        <h2>Does the data need to be in a particular format?</h2>
        <p className="section-strap">
          Yes. The engine reads structured text: CSV or JSON, UTF-8. It does not
          read PDFs or photographs of tables. Anything it cannot parse is
          reported out loud in the validation report rather than guessed at,
          which is the whole point of stage one.
        </p>
      </div>

      <div className="card">
        <h3>Rules that apply to every module</h3>
        <ul>
          {GENERAL_RULES.map((g) => <li key={g}>{g}</li>)}
        </ul>
      </div>

      <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>
        {MODULE_FORMATS.map((m) => (
          <article key={m.id} className="card">
            <h3>{m.module}</h3>
            <p><strong>Accepted input:</strong> {m.answer}</p>
            <table className="result-table">
              <thead>
                <tr>
                  <th scope="col">Column or field</th>
                  <th scope="col">Required</th>
                  <th scope="col">Example</th>
                  <th scope="col">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {m.columns.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">{c.name}</th>
                    <td>{c.required ? 'yes' : 'optional'}</td>
                    <td className="data-num">{c.example}</td>
                    <td>{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {m.notes.map((n) => <p key={n} className="fine-print">{n}</p>)}
          </article>
        ))}
      </div>

      <div className="tool-ending">
        <h3>Start with a tier</h3>
        <p className="fine-print">
          Citizens and civil society need nothing from us: open the battery and
          run it. Everyone else, write with the tier name in the subject line
          and we will send the rate card or the partnership terms.
        </p>
        <div className="btn-row">
          {onNavigate && (
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('work', 'battery')}>
              Open the Policy Battery
            </button>
          )}
          <a className="btn btn-secondary" href="mailto:shivang.uni@gmail.com?subject=THS%20Policy%20Battery%20licensing">
            Email about a licence
          </a>
        </div>
      </div>
    </section>
  );
}
