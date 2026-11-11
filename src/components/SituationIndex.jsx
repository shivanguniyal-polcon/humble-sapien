import { useMemo, useState } from 'react';
import { SCHEMES } from '../data/schemes';
import { copyFor, fill } from '../data/samparkCopy';
import SamparkDisclosure from './SamparkDisclosure';

// The problem-first index.
//
// A citizen arrives with what happened, not with the name of a scheme. The
// ladder is organised by scheme, so without this strip the first question the
// page asks is one the citizen cannot answer. This flattens every situation
// into one searchable list, matches the words a person would actually use,
// and opens the ladder at the chosen scheme and step.
//
// The chips carry the situation label; the scheme and the citizen's own
// sentence are in the accessible name and the tooltip, so a short chip does
// not hide which scheme it belongs to.
export default function SituationIndex({ onPick, step, t = copyFor('en') }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const all = useMemo(
    () =>
      SCHEMES.flatMap((scheme) =>
        scheme.situations.map((situation) => ({
          key: `${scheme.id}/${situation.id}`,
          schemeId: scheme.id,
          scheme: scheme.name,
          id: situation.id,
          label: situation.label,
          complaint: situation.complaint || '',
          search: [
            scheme.name,
            scheme.full,
            situation.label,
            situation.complaint,
            situation.ask,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        })),
      ),
    [],
  );

  // Every word has to match, in any order. "wages paid" and "paid wages"
  // are the same question.
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = tokens.length
    ? all.filter((s) => tokens.every((token) => s.search.includes(token)))
    : all;

  return (
    <SamparkDisclosure
      className="situation-index"
      title={`${step ? `${step}. ` : ''}${t.step2}`}
      hint={fill(t.foldSituationHint, { n: shown.length })}
      open={open}
      onToggle={setOpen}
    >
      <p className="meta">{fill(t.situationLead, { n: SCHEMES.length })}</p>

      <div className="situation-search">
        <label htmlFor="situation-search" className="visually-hidden">
          {t.situationLabel}
        </label>
        <input
          id="situation-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.situationPlaceholder}
        />
      </div>

      {shown.length === 0 ? (
        <p className="notice notice-warn" role="status">
          {t.situationNone}
        </p>
      ) : (
        <>
          <div className="filter-row" role="group" aria-label={t.situationLabel}>
            {shown.map((s) => (
              <button
                key={s.key}
                type="button"
                className="chip"
                title={`${s.scheme}: ${s.complaint}`}
                aria-label={`${s.label}. ${s.scheme}. ${s.complaint}`}
                onClick={() => {
                  onPick(s.schemeId, s.id);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="meta situation-count" role="status">
            {fill(t.situationCount, { shown: shown.length, total: all.length })}
          </p>
        </>
      )}
    </SamparkDisclosure>
  );
}
