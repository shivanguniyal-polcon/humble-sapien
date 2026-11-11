import { useState } from 'react';
import { carryItems } from '../lib/documents';
import { copyFor, fill } from '../data/samparkCopy';

// Documents to carry.
//
// The list is not a second corpus. It is the `carry` line of the ladder entry
// for the office the sheet is addressed to, split into items and shown with
// the same source that rung carries. The office can ask for more; the page
// says so instead of pretending the list is complete.
//
// The enclosures under it come from the letter itself, so a citizen knows
// what to put in the envelope, not only what to show at the counter.

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Documents({ rung, t = copyFor('en'), showHeading = true }) {
  const [checked, setChecked] = useState([]);
  const items = carryItems(rung && rung.carry);

  const toggle = (item) => {
    setChecked((prev) =>
      prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]
    );
  };

  return (
    <section
      className="documents"
      aria-labelledby={showHeading ? 'documents-title' : undefined}
      aria-label={showHeading ? undefined : t.step5}
    >
      {showHeading && (
        <h3 className="pane-title" id="documents-title">
          5. {t.step5}
        </h3>
      )}

      {rung ? (
        <>
          <p className="meta doc-lead">
            {fill(t.documentsLead, { office: rung.office, post: rung.post })}
          </p>
          <ul className="doc-list">
            {items.map((item, index) => (
              <li key={`${slug(item)}-${index}`}>
                <input
                  type="checkbox"
                  id={`doc-${slug(item)}-${index}`}
                  checked={checked.includes(item)}
                  onChange={() => toggle(item)}
                />
                <label htmlFor={`doc-${slug(item)}-${index}`}>{item}</label>
              </li>
            ))}
          </ul>
          <p className="meta doc-source">{t.documentsSource} {rung.source}</p>
        </>
      ) : (
        <p className="meta">{t.documentsNoPlace}</p>
      )}

      <h4>{t.documentsEnvelope}</h4>
      <ul className="doc-list doc-enclosures">
        {[t.documentsEnclosure1, t.documentsEnclosure2, t.documentsEnclosure3].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <p className="meta doc-caveat">{t.documentsCaveat}</p>
    </section>
  );
}
