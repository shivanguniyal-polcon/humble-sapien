import { useState } from 'react';
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

// ---- the legal simplifier rate card ---------------------------------------
//
// The Policy Battery tiers above describe who pays for the engine. This is
// the price list for the one instrument that is actually sold: the legal
// simplifier, to law firms and banks, priced per practice size and per seat.
//
// What money buys is rights, curation, time and capacity. Every line says so,
// and every line states what is excluded, because a licence that promises a
// finding is a licence that cannot be defended.

const LEGAL_RATE_CARD = [
  {
    id: 'commercial',
    name: 'Commercial licence',
    basis: 'per year, per practice',
    who: 'Firms and consultancies embedding reviewed plain-language output in paid client deliverables.',
    lines: [
      { line: 'Small practice (1–10 fee earners)', price: 'USD 12,000' },
      { line: 'Mid practice (11–50 fee earners)', price: 'USD 18,000' },
      { line: 'Large practice (50+), volume terms', price: 'USD 25,000' },
    ],
    includes: 'Right to embed reviewed outputs in paid deliverables, with attribution and the engine version stated. The audit manifest in every export. The four-question legal review gate. The methodology card.',
    excludes: 'Findings, previews, feature gates, a private dictionary, a private engine, a legal opinion, and any warranty that a rewrite is correct, current, in force, or equivalent to its source.',
  },
  {
    id: 'curation',
    name: 'Commons Plus',
    basis: 'per year, per seat',
    who: 'Anyone who needs to know when the source moved. A seat is one named person, not a shared login — there are no logins at all.',
    lines: [
      { line: 'Newsroom, non-profit, academic', price: 'USD 2,000' },
      { line: 'Corporate', price: 'USD 4,000' },
      { line: 'Redistribution rights', price: 'USD 6,000' },
    ],
    includes: 'Change alerts when a tracked instrument is amended or commences. The comparative delta mode between two versions of the same instrument. The currency check on every run. Version pinning with written notice before a version is retired.',
    excludes: 'The source of record (the gazette is the source of record), a legal opinion on what an amendment means, automatic updates to filed deliverables.',
  },
  {
    id: 'support',
    name: 'Public sector and academia',
    basis: 'per year, at cost',
    who: 'Government departments, regulators, public universities, legal-aid clinics. Published-in-the-open analysis stays free; this covers internal use, training and integration.',
    lines: [
      { line: 'Support agreement, banded by training days', price: 'USD 10,000 – 40,000' },
      { line: 'Training / implementation day', price: 'USD 400 – 600' },
    ],
    includes: 'Training sessions. Help wiring the engine into an internal workflow. A procurement pack: engine description, reproducibility terms, rate card, no-lock-in statement. A named contact.',
    excludes: 'Custom module development (commissioned development, below), findings, a legal opinion, procurement compliance certification.',
  },
  {
    id: 'commissioned',
    name: 'Commissioned development',
    basis: 'scoped per project',
    who: 'Institutions funding new instruments or reference models. New modules enter the public engine by default.',
    lines: [{ line: 'Commissioned module', price: 'USD 25,000 – 75,000' }],
    includes: 'Scoped engineering time. The module shipped into the public engine. The commissioning terms published with the module. Written maintenance commitments.',
    excludes: 'A finding, a verdict, a methodology that favours the funder, exclusive use of a publicly shipped module. Funding buys engineering time, never a conclusion.',
  },
];

// The order form builds a pre-filled email rather than posting to a payment
// gateway. There is no account to create, no card to store, no PCI surface and
// no third-party checkout: the form is a structured order request, and the
// licence is granted on the reply. That is deliberate. A legal product that
// cannot issue an invoice from a checkout page should not pretend to.
const ORDER_EMAIL = 'shivang.uni@gmail.com';

function LegalOrderForm() {
  const [form, setForm] = useState({
    entity: '',
    entityType: 'Law firm',
    contact: '',
    email: '',
    tier: 'Commercial licence — mid practice (USD 18,000)',
    seats: '',
    startDate: '',
    notes: '',
  });

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const body = [
    'THS Legal Simplifier — order request',
    '',
    `Legal entity: ${form.entity || '[not stated]'}`,
    `Entity type: ${form.entityType}`,
    `Named contact: ${form.contact || '[not stated]'}`,
    `Contact email: ${form.email || '[not stated]'}`,
    `Tier: ${form.tier}`,
    `Seats: ${form.seats || 'n/a'}`,
    `Preferred start date: ${form.startDate || '[not stated]'}`,
    `Notes: ${form.notes || 'none'}`,
    '',
    'I understand this buys rights, curation, time and capacity, and none of the following: a finding, conclusion or preview; a private dictionary or engine; a warranty that any output is correct, current, in force or legally equivalent to its source; custody of my data; or legal advice.',
  ].join('\n');

  const href =
    `mailto:${ORDER_EMAIL}` +
    `?subject=${encodeURIComponent('THS Legal Simplifier — order request')}` +
    `&body=${encodeURIComponent(body)}`;

  return (
    <form className="card" onSubmit={(e) => e.preventDefault()}>
      <h3>Order form</h3>
      <p className="meta">
        Fill in what you can and send it. There is no account, no card and no
        checkout: the form builds a structured order request, and the licence
        is granted on our reply with an invoice. For a single self-serve seat,
        the fastest route is the payment link below.
      </p>
      <div className="meta-grid">
        <div className="control">
          <label htmlFor="order-entity">Legal entity</label>
          <input id="order-entity" type="text" value={form.entity} onChange={set('entity')} />
        </div>
        <div className="control">
          <label htmlFor="order-type">Entity type</label>
          <select id="order-type" value={form.entityType} onChange={set('entityType')}>
            <option>Law firm</option>
            <option>Chambers</option>
            <option>Bank or financial institution</option>
            <option>Company in-house team</option>
            <option>Government department or regulator</option>
            <option>Non-profit or legal-aid clinic</option>
            <option>University or research institution</option>
            <option>Individual advocate</option>
          </select>
        </div>
        <div className="control">
          <label htmlFor="order-contact">Named contact</label>
          <input id="order-contact" type="text" value={form.contact} onChange={set('contact')} />
        </div>
        <div className="control">
          <label htmlFor="order-email">Contact email</label>
          <input id="order-email" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="control">
          <label htmlFor="order-tier">Tier</label>
          <select id="order-tier" value={form.tier} onChange={set('tier')}>
            {LEGAL_RATE_CARD.flatMap((t) =>
              t.lines.map((l) => (
                <option key={`${t.id}-${l.line}`}>{`${t.name} — ${l.line} (${l.price})`}</option>
              )),
            )}
            <option>Not sure — please advise on the right tier</option>
          </select>
        </div>
        <div className="control">
          <label htmlFor="order-seats">Seats (Commons Plus only)</label>
          <input id="order-seats" type="text" value={form.seats} onChange={set('seats')} placeholder="n/a" />
        </div>
        <div className="control">
          <label htmlFor="order-start">Preferred start date</label>
          <input id="order-start" type="text" value={form.startDate} onChange={set('startDate')} placeholder="YYYY-MM-DD" />
        </div>
        <div className="control">
          <label htmlFor="order-notes">Notes</label>
          <input id="order-notes" type="text" value={form.notes} onChange={set('notes')} />
        </div>
      </div>
      <p className="fine-print">
        By sending this you acknowledge that this order buys rights, curation,
        time and capacity — not a finding, not a preview, not a private engine,
        not a warranty, not custody of your data, and not legal advice.
      </p>
      <div className="btn-row">
        <a className="btn btn-primary" href={href}>
          Send the order request
        </a>
      </div>
    </form>
  );
}

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
        <span className="overline">Legal Simplifier — rate card</span>
        <h2>What the instrument costs</h2>
        <p className="section-strap">
          The Policy Battery is licensed on the tiers above. The Legal
          Simplifier is the instrument that is actually sold to law firms and
          banks, and this is its price list. Everything is priced per year in
          USD, exclusive of taxes. Every line states what is excluded, because
          a licence that promises a finding is a licence that cannot be
          defended.
        </p>
      </div>

      <div className="grid grid-2">
        {LEGAL_RATE_CARD.map((t) => (
          <article key={t.id} className="card">
            <div className="fund-row">
              <h3 style={{ margin: 0 }}>{t.name}</h3>
              <span className="fund-tag">{t.basis}</span>
            </div>
            <p className="fine-print">{t.who}</p>
            <table className="result-table">
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {t.lines.map((l) => (
                  <tr key={l.line}>
                    <th scope="row">{l.line}</th>
                    <td className="data-num">{l.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="meta"><strong>Included:</strong> {t.includes}</p>
            <p className="meta"><strong>Not included:</strong> {t.excludes}</p>
          </article>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Two routes to a licence, and one of them is deliberately slow</h3>
        <p>
          If you are a single advocate or a small chamber and you want one seat
          today, use the payment link below. No invoice, no account, no
          onboarding call.
        </p>
        <p>
          If you are a firm, a bank or a department and you need a GST invoice,
          a named contact and a signed order form, use the order form below.
          That route is slower because it produces a document your finance team
          can file. A payment link cannot do that, and we are not going to
          pretend otherwise.
        </p>
        <div className="btn-row">
          <a
            className="btn btn-secondary"
            href="https://www.buymeacoffee.com/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Buy a single seat (payment link)
          </a>
          <a className="btn btn-secondary" href={`mailto:${ORDER_EMAIL}?subject=THS%20Legal%20Simplifier%20—%20order%20request`}>
            Email about an institutional order
          </a>
        </div>
        <p className="fine-print" style={{ marginBottom: 0 }}>
          The payment link is for individuals and small chambers only. It does
          not issue a GST invoice and it does not grant an institutional
          licence. Institutional orders go through the order form so the licence
          and the invoice match.
        </p>
      </div>

      <LegalOrderForm />

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
