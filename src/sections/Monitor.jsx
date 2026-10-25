// The regulatory monitor.
//
// Fifty RBI instruments, read rather than listed: each obligation a sentence
// someone has to act on, the profile that decides whether it binds them, and
// what changed since the previous instrument in the same family. The library
// is the precision test's pinned corpus — real circulars, hashed — not a
// pasted demo, and every row carries its source sentence so a reviewer can
// check the read in place.
//
// The page is deliberately a reading aid. The extraction is fixed rules; the
// reviewer can accept, correct or flag every row; the pack says which. It is
// not a compliance system and does not claim the instrument is in force.

import { useEffect, useMemo, useState } from 'react';
import INDEX from '../data/monitor/index.json';
import COLLECTION from '../data/monitor/collection.json';
import {
  ENTITY_TYPES,
  PROFILE_ACTIVITIES,
  PROFILE_FACTS,
  filterObligations,
  scopeTextFromInstrument,
  summarise,
} from '../lib/legal/applicability.js';
import { extractAmendmentGraph } from '../lib/legal/amendments.js';
import { baseExcerpts, baseRefFor } from '../lib/legal/base.js';
import { instrumentFromText } from '../lib/monitor/read.js';
import { diffObligations, diffSentences } from '../lib/monitor/diff.js';
import {
  clearDecision,
  countsOf,
  decisionFor,
  emptyReview,
  loadProfile,
  loadReview,
  saveProfile,
  saveReview,
  setDecision,
  setReviewer,
  textOf,
  trailOf,
} from '../lib/monitor/review.js';
import {
  buildMonitorManifest,
  buildPackDocx,
  buildPackMarkdown,
  packFileName,
  profileLabel,
} from '../lib/monitor/pack.js';
import { FILE_ACCEPT, extractText, ingestMessage } from '../lib/monitor/ingest.js';
import { MONITOR_API, ocrConfigured, ocrPage } from '../lib/monitor/ocr.js';

const chunks = import.meta.glob('../data/monitor/instruments/*.json');

const DEFAULT_PROFILE = {
  version: 'monitor-1',
  entityType: 'NBFC',
  nbfcCategory: 'NBFC-ND',
  depositTaking: 'no',
  layers: 'MIDDLE',
  assetSizeCr: 2000,
  serviceUnits: 120,
  activities: [],
};

const VERDICT = {
  'in-scope': { label: 'Binds you', tone: 'in' },
  conditional: { label: 'Conditional', tone: 'conditional' },
  dependency: { label: 'Someone you rely on', tone: 'dependency' },
  'out-of-scope': { label: 'Out of scope', tone: 'out' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in-scope', label: 'Binds you' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'dependency', label: 'Someone you rely on' },
  { id: 'out-of-scope', label: 'Out of scope' },
];

const download = (name, data, type) => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking straight away cancels the download in Safari and older Firefox;
  // the click has only queued it at that point.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

const metaById = (id) => INDEX.instruments.find((entry) => entry.id === id) || null;

const ProfileFields = ({ profile, onChange }) => {
  const isBankLike = ['NBFC', 'HFC'].includes(profile.entityType);
  return (
    <div className="monitor-profile-grid">
      <label>
        Entity
        <select
          value={profile.entityType}
          onChange={(event) => onChange({ ...profile, entityType: event.target.value })}
        >
          {ENTITY_TYPES.map((entity) => (
            <option key={entity.id} value={entity.id}>{entity.label}</option>
          ))}
        </select>
      </label>
      {isBankLike ? (
        <>
          <label>
            Category
            <select
              value={profile.nbfcCategory || ''}
              onChange={(event) => onChange({ ...profile, nbfcCategory: event.target.value || null })}
            >
              <option value="">Not stated</option>
              <option value="NBFC-D">NBFC-D (deposit-taking)</option>
              <option value="NBFC-ND">NBFC-ND (not deposit-taking)</option>
              <option value="NBFC-ICC">NBFC-ICC</option>
              <option value="NBFC-MFI">NBFC-MFI</option>
              <option value="NBFC-CIC">NBFC-CIC</option>
            </select>
          </label>
          <label>
            Layer
            <select
              value={profile.layers || ''}
              onChange={(event) => onChange({ ...profile, layers: event.target.value || null })}
            >
              <option value="">Not stated</option>
              <option value="UPPER">Upper layer</option>
              <option value="MIDDLE">Middle layer</option>
              <option value="LOWER">Lower layer</option>
              <option value="BASE">Base layer</option>
            </select>
          </label>
        </>
      ) : null}
      <label>
        Asset size (₹ crore)
        <input
          type="number"
          min="0"
          value={profile.assetSizeCr ?? ''}
          onChange={(event) => onChange({ ...profile, assetSizeCr: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <label>
        Service delivery units
        <input
          type="number"
          min="0"
          value={profile.serviceUnits ?? ''}
          onChange={(event) => onChange({ ...profile, serviceUnits: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <fieldset className="monitor-activities">
        <legend>Facts you assert</legend>
        {PROFILE_FACTS.filter((fact) => fact.key === 'depositTaking').map((fact) => (
          <label key={fact.key}>
            {fact.label}
            <select
              value={profile[fact.key] || ''}
              onChange={(event) => onChange({ ...profile, [fact.key]: event.target.value || null })}
            >
              {fact.options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        ))}
        {PROFILE_ACTIVITIES.map((activity) => (
          <label className="monitor-check" key={activity.id}>
            <input
              type="checkbox"
              checked={(profile.activities || []).includes(activity.id)}
              onChange={(event) => {
                const set = new Set(profile.activities || []);
                if (event.target.checked) set.add(activity.id);
                else set.delete(activity.id);
                onChange({ ...profile, activities: [...set] });
              }}
            />
            {activity.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
};

const Changes = ({ changes, previous, expected }) => {
  if (!previous) {
    return (
      <div className="card monitor-empty">
        {expected ? (
          <p>Reading the previous instrument in this series…</p>
        ) : (
          <>
            <h4>No earlier instrument in this family</h4>
            <p>
              This is the earliest circular of its series in the library. The monitor only
              claims a change against an instrument it has actually read, so it shows
              nothing here rather than guessing from a title.
            </p>
          </>
        )}
      </div>
    );
  }
  const { obligations, sentences } = changes;
  return (
    <div className="monitor-changes">
      <div className="card">
        <h4>Compared with {previous.refNo} · {previous.date}</h4>
        <p className="meta">
          {obligations.summary.added} added · {obligations.summary.removed} dropped ·{' '}
          {obligations.summary.changed} changed · {obligations.summary.unchanged} unchanged.
          Text: {sentences.summary.added} sentences added, {sentences.summary.removed} removed.
        </p>
      </div>
      {obligations.added.length ? (
        <div className="card">
          <h4>New obligations</h4>
          <ul className="monitor-change-list">
            {obligations.added.map((entry) => (
              <li key={`add-${entry.current.id}`} className="change-add">{entry.current.quote}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {obligations.changed.length ? (
        <div className="card">
          <h4>Changed figures</h4>
          <ul className="monitor-change-list">
            {obligations.changed.map((entry) => (
              <li key={`chg-${entry.current.id}`} className="change-chg">
                <span className="data-num">{entry.figures.gained.join(', ') || '—'}</span>
                {' '}now,{' '}
                <span className="data-num change-old">{entry.figures.lost.join(', ') || '—'}</span>
                {' '}before
                <p className="monitor-change-quote">{entry.current.quote}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {obligations.removed.length ? (
        <div className="card">
          <h4>Dropped obligations</h4>
          <ul className="monitor-change-list">
            {obligations.removed.map((entry) => (
              <li key={`rem-${entry.previous.id}`} className="change-rem">{entry.previous.quote}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="card">
        <h4>Text added since the previous instrument</h4>
        {sentences.added.length ? (
          <ul className="monitor-change-list">
            {sentences.added.slice(0, 25).map((sentence, index) => (
              <li key={`txt-${index}-${sentence.slice(0, 40)}`} className="change-add">{sentence}</li>
            ))}
          </ul>
        ) : <p className="meta">No new sentences.</p>}
        {sentences.added.length > 25 ? <p className="meta">…and {sentences.added.length - 25} more.</p> : null}
      </div>
      <div className="card">
        <h4>Text gone since the previous instrument</h4>
        {sentences.removed.length ? (
          <ul className="monitor-change-list">
            {sentences.removed.slice(0, 25).map((sentence, index) => (
              <li key={`gone-${index}-${sentence.slice(0, 40)}`} className="change-rem">{sentence}</li>
            ))}
          </ul>
        ) : <p className="meta">No sentences removed.</p>}
        {sentences.removed.length > 25 ? <p className="meta">…and {sentences.removed.length - 25} more.</p> : null}
      </div>
    </div>
  );
};

const Pack = ({
  loaded,
  rows,
  review,
  onReview,
  manifest,
  onPack,
  busy,
  error,
}) => {
  const counts = countsOf(rows, review);
  const trail = trailOf(review);
  return (
    <div className="monitor-pack">
      <div className="card">
        <h4>Review and sign-off</h4>
        <label className="monitor-reviewer">
          Reviewer
          <input
            type="text"
            placeholder="Name as it should appear on the pack"
            value={review.reviewer || ''}
            onChange={(event) => onReview(setReviewer(review, event.target.value))}
          />
        </label>
        <p className="meta">
          {counts.accepted} accepted · {counts.edited} corrected · {counts.flagged} flagged ·{' '}
          {counts.pending} not reviewed of {counts.total}.
        </p>
        <p className="meta" style={{ marginBottom: 0 }}>
          Decisions are stored in this browser against the instrument&apos;s text hash
          ({loaded.hash.slice(7, 19)}…). They travel in the pack, not to a server.
        </p>
      </div>
      {trail.length ? (
        <div className="card">
          <h4>Reviewer trail</h4>
          <ul className="monitor-trail">
            {trail.slice(0, 20).map((entry) => (
              <li key={entry.id}>
                Row <span className="data-num">{entry.id}</span> — {entry.state}
                {entry.at ? ` · ${String(entry.at).slice(0, 10)}` : ''}
                {entry.note ? ` — ${entry.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="card">
        <h4>Board pack</h4>
        <p>
          The pack prints every obligation that binds the profile, the source sentence
          behind it, the reviewer&apos;s decisions and a manifest over the whole set. The DOCX
          carries the same manifest in its header block.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={busy} onClick={() => onPack('md')}>
            {busy ? 'Building…' : 'Download pack (.md)'}
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => onPack('docx')}>
            Download pack (.docx)
          </button>
        </div>
        {manifest ? (
          <p className="meta monitor-manifest" style={{ marginBottom: 0 }}>
            Manifest · input <code>{manifest.inputHash.slice(0, 23)}…</code> · output{' '}
            <code>{manifest.outputHash.slice(0, 23)}…</code>
          </p>
        ) : null}
        {error ? <p className="monitor-error" role="alert">{error}</p> : null}
      </div>
      <div className="card">
        <h4>What this pack does not say</h4>
        <p style={{ marginBottom: 0 }}>
          It is not legal advice, and it is not a certificate of compliance. The rules
          read fifty instruments; a duty they did not recognise is absent. The tool does
          not check that an instrument is still in force, and it cannot see an amendment
          it has not read. Every row quotes its source so that a reviewer can check the
          read before it leaves the building.
        </p>
      </div>
    </div>
  );
};

// The excerpt starts at the numbered clause, so its label is already the
// first token. Do not print it twice ("19 19. A Government NBFC…").
const dyingTextOf = (excerpt) => {
  const label = String(excerpt.label || '');
  if (label && excerpt.text.startsWith(`${label}.`)) {
    return excerpt.text.slice(label.length + 1).trimStart();
  }
  // "15(4)" already names the child marker, so do not print "(4)" again.
  const child = /\(([0-9A-Za-z]+)\)$/.exec(label);
  if (child && excerpt.text.startsWith(`(${child[1]})`)) {
    return excerpt.text.slice(child[0].length).trimStart();
  }
  return excerpt.text;
};

const baseMetaFor = (baseTitle) => {
  const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const wanted = normalise(baseTitle);
  if (!wanted) return null;
  return (INDEX.bases || []).find((entry) => {
    const candidate = normalise(entry.title);
    return candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate);
  }) || null;
};

// The clause-level version diff. The graph is the extractor's own output:
// every operation keeps the sentence that states it and the exact span hash;
// insertions keep the clauses they create. A DELETE names the address it
// removes; where the base snapshot holds that address, the dying text is
// quoted from it, and where it does not, the interface says so.
const AmendmentDiff = ({ graph, busy, error, instrument, meta, base, onOpen }) => {
  if (busy) {
    return (
      <div className="card monitor-empty">
        <p>Reading the amendment operations…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card monitor-empty">
        <p className="monitor-error" role="alert">{error}</p>
      </div>
    );
  }
  if (!graph) {
    return (
      <div className="card monitor-empty">
        <p>The amendment graph has not been read yet.</p>
      </div>
    );
  }

  const resolved = graph.instrument;
  const bornByEdge = new Map();
  const diedByEdge = new Map();
  graph.edges
    .filter((edge) => edge.op === 'INSERT' || edge.op === 'SUBSTITUTE')
    .forEach((edge, index) => bornByEdge.set(edge, graph.born[index]?.rows || []));
  graph.edges
    .filter((edge) => edge.op === 'DELETE' || edge.op === 'REPEAL')
    .forEach((edge, index) => diedByEdge.set(edge, graph.died[index]?.refs || []));

  const bornCount = graph.born.reduce((sum, entry) => sum + entry.rows.length, 0);
  const diedCount = graph.died.reduce((sum, entry) => sum + entry.refs.length, 0);
  const baseMeta = baseMetaFor(resolved.baseTitle);
  const family = meta?.family ? INDEX.families.find((group) => group.id === meta.family) : null;
  const members = family
    ? family.members.map(metaById).filter(Boolean).sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
    : [];

  // The addresses an operation kills, with a bare sub-paragraph joined to
  // the paragraph its context names. INSERT operations kill nothing.
  const deadRefsOf = (edge) => {
    const refs = diedByEdge.get(edge) || [];
    return (edge.op === 'DELETE' || edge.op === 'REPEAL'
      ? (refs.length ? refs : [edge.targetRef])
      : edge.op === 'SUBSTITUTE'
        ? [edge.targetRef]
        : []).map((ref) => baseRefFor(edge, ref));
  };
  const excerptsOf = (edge) => {
    const refs = deadRefsOf(edge);
    return { refs, excerpts: base && refs.length ? baseExcerpts(base.text, refs) : [] };
  };

  const downloadDiff = () => {
    const slug = String(resolved.refNo || instrument?.refNo || resolved.docId || 'instrument')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const dying = graph.edges
      .map((edge) => {
        const { refs, excerpts } = excerptsOf(edge);
        return refs.length ? { op: edge.op, targetRef: edge.targetRef, addresses: refs, excerpts } : null;
      })
      .filter(Boolean);
    download(
      `amendment-diff-${slug}.json`,
      JSON.stringify({
        extractor: graph.version,
        instrument: resolved,
        library: {
          corpusHash: INDEX.corpusHash,
          instruments: INDEX.instruments.length,
          instrumentHash: instrument?.hash || null,
        },
        base: baseMeta
          ? {
            id: baseMeta.id,
            refNo: baseMeta.refNo,
            versionDate: baseMeta.versionDate || baseMeta.date,
            hash: baseMeta.hash,
            loaded: Boolean(base),
          }
          : null,
        edges: graph.edges,
        born: graph.born,
        died: graph.died,
        dying,
        unresolved: graph.unresolved,
      }, null, 2),
      'application/json',
    );
  };

  const formLabel = resolved.form === 'AMENDMENT'
    ? 'Amendment'
    : resolved.form === 'BASE'
      ? 'Base direction'
      : 'Form unresolved';

  const empty = !graph.edges.length ? (
    <div className="card monitor-empty">
      {resolved.form === 'BASE' ? (
        <>
          <h4>This is a base direction</h4>
          <p>
            The instrument is the baseline, not an amendment. Its changes against the
            previous circular in the library are in the Changes tab; there is no earlier
            version in its own text to diff against.
          </p>
        </>
      ) : resolved.form === 'UNKNOWN' ? (
        <>
          <h4>The form could not be resolved</h4>
          <p>
            The title does not read as an RBI Directions instrument, so no amendment
            operation was attempted. Notifications, lists and press releases live in the
            source tab unchanged.
          </p>
        </>
      ) : (
        <>
          <h4>No operation sentence was recognised</h4>
          <p>
            The title reads as an amendment, but the fixed rules found no insert, delete,
            substitute, renumber, rename or repeal sentence. Anything that looked like an
            operation but could not be addressed is listed below rather than guessed.
          </p>
        </>
      )}
    </div>
  ) : null;

  return (
    <div className="monitor-amendments">
      <div className="card monitor-amendment-summary">
        <div className="monitor-row-head">
          <span className="monitor-badge">{formLabel}</span>
          <span className="monitor-clause">
            {graph.edges.length} operation{graph.edges.length === 1 ? '' : 's'}
          </span>
          <span className="monitor-review-state">
            {bornCount} born · {diedCount} removed
          </span>
        </div>
        <h4>Version diff: what this instrument changes</h4>
        <p className="meta">
          Every operation below is quoted from the instrument and hashed at its exact
          source span. The extractor never rewrites the instrument.
        </p>
        {resolved.baseTitle ? (
          <p className="monitor-head-meta">
            Base instrument: {resolved.baseTitle}
            {baseMeta
              ? ` · ${baseMeta.refNo} as on ${baseMeta.versionDate || baseMeta.date}`
              : ' · not in this library'}
          </p>
        ) : resolved.reason ? (
          <p className="monitor-head-meta">
            Base instrument: not resolved — {resolved.reason}
          </p>
        ) : null}
        <p className="monitor-head-meta">
          Effective: {resolved.effectiveDate || resolved.date || 'not stated'} · extractor{' '}
          <code>{graph.version}</code>
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={downloadDiff}>
            Download the diff (.json)
          </button>
        </div>
      </div>

      {empty}

      {graph.edges.length ? (
        <div className="monitor-amendment-ops">
          {graph.edges.map((edge, index) => {
            const rows = bornByEdge.get(edge) || [];
            const { refs: baseRefs, excerpts } = excerptsOf(edge);
            return (
              <article className="card monitor-amendment-op" key={`${edge.op}-${edge.targetRef}-${index}`}>
                <div className="monitor-row-head">
                  <span className={`monitor-op monitor-op-${edge.op.toLowerCase()}`}>{edge.op}</span>
                  <span className="monitor-clause">{edge.targetRef}</span>
                  {edge.anchor ? <span className="meta">anchor: {edge.anchor}</span> : null}
                  {edge.context ? <span className="meta">{edge.context}</span> : null}
                </div>

                <p className="monitor-amendment-label">Operation</p>
                <blockquote className="monitor-quote">{edge.evidence.quote}</blockquote>
                <p className="monitor-hash">
                  SHA-256 <code>{edge.evidence.sha256}</code>
                </p>

                {edge.payload ? (
                  <details className="monitor-payload">
                    <summary>
                      Payload · {edge.payload.quote.length.toLocaleString()} characters
                    </summary>
                    <blockquote className="monitor-quote">{edge.payload.quote}</blockquote>
                    <p className="monitor-hash">
                      SHA-256 <code>{edge.payload.sha256}</code>
                    </p>
                  </details>
                ) : null}

                {rows.length ? (
                  <div className="monitor-amendment-born">
                    <p className="monitor-amendment-label">Clauses born ({rows.length})</p>
                    <ul className="monitor-born-list">
                      {rows.slice(0, 8).map((row, bornIndex) => (
                        <li key={`${edge.targetRef}-born-${bornIndex}`}>
                          <span className="monitor-born-type">{row.type}</span>{' '}
                          <span className="meta">{row.bearer?.label || row.bearer || 'bearer unclear'}</span>
                          <p>{row.quote}</p>
                        </li>
                      ))}
                    </ul>
                    {rows.length > 8 ? (
                      <p className="meta">…and {rows.length - 8} more in the downloaded diff.</p>
                    ) : null}
                  </div>
                ) : edge.op === 'INSERT' || edge.op === 'SUBSTITUTE' ? (
                  <p className="meta">No binding or definition sentence was recognised in the payload.</p>
                ) : null}

                {baseRefs.length ? (
                  <div className="monitor-amendment-died">
                    <p className="monitor-amendment-label">
                      {edge.op === 'SUBSTITUTE' ? 'Clause replaced' : 'Addresses removed'}
                    </p>
                    <ul className="monitor-born-list">
                      {baseRefs.map((ref) => <li key={ref}>{ref}</li>)}
                    </ul>

                    {excerpts.length ? (
                      <>
                        <p className="monitor-amendment-label">Text that dies</p>
                        {excerpts.map((excerpt) => (
                          <blockquote
                            className="monitor-quote monitor-dead-quote"
                            key={`${edge.targetRef}-died-${excerpt.label}`}
                          >
                            <span className="monitor-clause">{excerpt.label}</span>{' '}
                            {dyingTextOf(excerpt)}
                          </blockquote>
                        ))}
                        <p className="monitor-hash">
                          From {baseMeta.refNo} as on {baseMeta.versionDate || baseMeta.date} · SHA-256{' '}
                          <code>{String(baseMeta.hash).replace('sha256:', '').slice(0, 16)}…</code>
                        </p>
                      </>
                    ) : !base ? (
                      <p className="meta">Reading the base snapshot…</p>
                    ) : (
                      <p className="meta">
                        The snapshot does not hold this address verbatim. The address is quoted
                        from the operation; the text is not inferred.
                      </p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {graph.unresolved.length ? (
        <div className="card">
          <h4>Operations not paired ({graph.unresolved.length})</h4>
          <p className="meta">
            These sentences read as operations, but the target address or payload could not
            be read. They are listed rather than turned into an invented edge.
          </p>
          <ul className="monitor-change-list">
            {graph.unresolved.map((entry, index) => (
              <li key={`unresolved-${index}`} className="change-rem">
                <p>{entry.quote}</p>
                <p className="meta">{entry.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card monitor-amendment-coverage">
        <h4>What this diff can see</h4>
        <p>
          This is a clause-level record of the operations the instrument itself states.
          Insertions carry the clauses they create; deletions and substitutions quote
          the text they remove from the base snapshot. It is not a consolidated version
          of the base direction.
        </p>
        {resolved.baseTitle ? (
          <p className="meta">
            Base instrument: {resolved.baseTitle} ·{' '}
            {baseMeta
              ? `${baseMeta.refNo}, snapshot of ${baseMeta.versionDate || baseMeta.date}`
              : 'snapshot not in this library'}.
          </p>
        ) : null}
        {family ? (
          <>
            <p className="meta">
              Series: {family.label} · {members.length} instrument{members.length === 1 ? '' : 's'} in this library.
            </p>
            <ul className="monitor-amendment-family">
              {members.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`linklike ${entry.id === instrument?.id ? 'monitor-amendment-current' : ''}`}
                    onClick={() => onOpen?.(entry.id)}
                    disabled={entry.id === instrument?.id}
                  >
                    {entry.refNo} · {entry.date}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="meta">
          The library is a pinned corpus of {INDEX.instruments.length} instruments. An
          operation in a circular the library has not collected is invisible here. A full
          before/after needs every base direction in the series, from the date the series
          began.
        </p>
      </div>
    </div>
  );
};

// The corpus-wide collection plan. A clause-level diff needs both sides of
// every operation. The library holds the amendments and, beside them, the
// base snapshots they amend; this panel names any base still missing, the
// window it has to be harvested from, and the amendments that stay one-sided
// until it arrives. It is corpus-wide because a reviewer needs to know
// whether the gap is one instrument or the whole shelf.
const CollectionPlan = ({ plan, onOpen }) => {
  if (!plan?.bases?.length) return null;
  const totals = plan.totals;
  const downloadPlan = () => {
    download(
      'amendment-collection-plan.json',
      JSON.stringify(plan, null, 2),
      'application/json',
    );
  };

  return (
    <details className="card monitor-collection" id="collection-plan">
      <summary>
        <span className="monitor-collection-title">
          {totals.missingBases
            ? `Collection plan · ${totals.missingBases} base direction${totals.missingBases === 1 ? '' : 's'} missing`
            : `Collection plan · all ${totals.baseDirections} base directions in the library`}
        </span>
        <span className="meta">
          {plan.window.from} → {plan.window.to} · {totals.amendments} amendment{totals.amendments === 1 ? '' : 's'} need a base
        </span>
      </summary>
      <p>
        {totals.missingBases ? (
          <>
            The Version diff reads each amendment's own operations, but the clauses a
            deletion removes live in the base direction. {totals.missingBases} of the{' '}
            {totals.baseDirections} base directions named by this library are absent, so the diff
            shows the address that dies, not the text that dies. Collecting every RBI instrument
            published in the window above closes the gap; the named bases are the minimum.
          </>
        ) : (
          <>
            Every base direction named by this library is present. Each is held at the
            version in force immediately before the first amendment in its series, so a
            clause changed by an earlier amendment in the same series may not read as it
            stood on the day. The address is always quoted from the operation; the text
            is shown only where it matches that snapshot.
          </>
        )}
      </p>
      <div className="monitor-collection-scroll">
        <table className="monitor-collection-table">
          <thead>
            <tr>
              <th scope="col">Base direction</th>
              <th scope="col">Amendments</th>
              <th scope="col">First needed</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {plan.bases.map((entry) => (
              <tr key={entry.key}>
                <th scope="row">{entry.title}</th>
                <td>
                  {entry.amendments.map((amendment, index) => (
                    <span key={amendment.id}>
                      {index ? ' · ' : ''}
                      <button
                        type="button"
                        className="linklike"
                        onClick={() => onOpen?.(amendment.id)}
                      >
                        {amendment.refNo}
                      </button>
                    </span>
                  ))}
                </td>
                <td className="monitor-collection-date">{entry.firstDate}</td>
                <td>
                  <span className={entry.inLibrary ? 'monitor-collection-have' : 'monitor-collection-need'}>
                    {entry.inLibrary ? 'In library' : 'Collect'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {plan.unresolved.length ? (
        <div className="monitor-collection-unresolved">
          <p className="monitor-amendment-label">Amendments with no readable base title</p>
          <p className="meta">
            These may name a base older than the harvest window. They are listed so the
            window can be widened by hand instead of silently missing a predecessor.
          </p>
          <ul className="monitor-change-list">
            {plan.unresolved.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="linklike" onClick={() => onOpen?.(entry.id)}>
                  {entry.refNo} · {entry.dateISO}
                </button>{' '}
                <span className="meta">{entry.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={downloadPlan}>
          Download the collection plan (.json)
        </button>
      </div>
      <p className="meta">
        Window: {plan.window.from} → {plan.window.to} · {totals.operations} operations ·{' '}
        {totals.born} born rows · {totals.removed} removed addresses ·{' '}
        {totals.unresolvedOperations} operation{totals.unresolvedOperations === 1 ? '' : 's'} unpaired
      </p>
    </details>
  );
};

export default function Monitor() {
  const [profile, setProfile] = useState(() => ({ ...DEFAULT_PROFILE, ...(loadProfile() || {}) }));
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [selectedId, setSelectedId] = useState(INDEX.instruments[0]?.id ?? null);
  const [loaded, setLoaded] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [amendmentGraph, setAmendmentGraph] = useState(null);
  const [amendmentBusy, setAmendmentBusy] = useState(false);
  const [amendmentError, setAmendmentError] = useState('');
  const [baseLoaded, setBaseLoaded] = useState(null);
  const [tab, setTab] = useState('duties');
  const [review, setReview] = useState(emptyReview());
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [manifest, setManifest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pasted, setPasted] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteError, setPasteError] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteRef, setPasteRef] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasteNote, setPasteNote] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const [scanPages, setScanPages] = useState([]);
  const [pasteOcr, setPasteOcr] = useState([]);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [live, setLive] = useState(null);
  const [liveBusy, setLiveBusy] = useState(false);

  useEffect(() => saveProfile(profile), [profile]);

  // The fetched library, when this build has an API. The pinned fifty stay:
  // the live list is what the fetcher has added since, and each row opens
  // with the same reader and pack path.
  useEffect(() => {
    if (!MONITOR_API) return undefined;
    let alive = true;
    fetch(`${MONITOR_API}/v1/instruments?limit=40`)
      .then((response) => (response.ok ? response.json() : { instruments: [] }))
      .then((body) => {
        if (alive) setLive(Array.isArray(body.instruments) ? body.instruments : []);
      })
      .catch(() => {
        if (alive) setLive([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (selectedId === 'paste') return undefined;
    const meta = metaById(selectedId);
    if (!meta) return undefined;
    let live = true;
    const load = chunks[`../data/monitor/instruments/${meta.id}.json`];
    if (!load) return undefined;
    load()
      .then((module) => {
        if (!live) return;
        setError('');
        setLoaded(module.default);
        setReview(loadReview(module.default.hash));
      })
      .catch(() => {
        if (live) setError('The instrument could not be read from the library.');
      });
    return () => {
      live = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!loaded) return undefined;
    const meta = metaById(loaded.id);
    if (!meta?.predecessor) return undefined;
    let live = true;
    const load = chunks[`../data/monitor/instruments/${meta.predecessor}.json`];
    if (!load) return undefined;
    load()
      .then((module) => {
        if (live) setPrevious(module.default);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [loaded]);

  // The amendment graph is read from the instrument's own operation
  // sentences. It is recomputed for a pasted or live instrument too, so the
  // same tab answers the same question outside the pinned corpus.
  useEffect(() => {
    if (!loaded?.text) {
      setAmendmentGraph(null);
      setAmendmentBusy(false);
      setAmendmentError('');
      return undefined;
    }
    let live = true;
    setAmendmentBusy(true);
    setAmendmentError('');
    extractAmendmentGraph(loaded)
      .then((graph) => {
        if (!live) return;
        setAmendmentGraph(graph);
        setAmendmentBusy(false);
      })
      .catch(() => {
        if (!live) return;
        setAmendmentGraph(null);
        setAmendmentError('The amendment operations could not be read in this browser.');
        setAmendmentBusy(false);
      });
    return () => {
      live = false;
    };
  }, [loaded]);

  // The base direction is a second chunk. It is loaded only when the
  // amendment graph names one, and kept separate from the "previous
  // instrument" used by the Changes tab: the previous instrument is the
  // last amendment, the base is the consolidated text being amended.
  const amendmentBaseMeta = amendmentGraph?.instrument?.baseTitle
    ? baseMetaFor(amendmentGraph.instrument.baseTitle)
    : null;
  const amendmentBaseId = amendmentBaseMeta?.id ?? null;
  useEffect(() => {
    if (!amendmentBaseId) {
      setBaseLoaded(null);
      return undefined;
    }
    let live = true;
    const load = chunks[`../data/monitor/instruments/${amendmentBaseId}.json`];
    if (!load) return undefined;
    load()
      .then((module) => {
        if (live) setBaseLoaded(module.default);
      })
      .catch(() => {
        if (live) setBaseLoaded(null);
      });
    return () => {
      live = false;
    };
  }, [amendmentBaseId]);

  const instrumentMeta = loaded ? metaById(loaded.id) : metaById(selectedId);
  const predecessorId = instrumentMeta?.predecessor || null;
  const predecessor = previous && previous.id === predecessorId ? previous : null;

  const rows = useMemo(() => {
    if (!loaded) return [];
    const prepared = loaded.duties.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      clause: row.clause,
      quote: loaded.sentences[row.sourceId] || '',
      prev: loaded.sentences[row.sourceId - 1] || '',
      plain: row.plain,
      type: row.type,
      typeLabel: row.typeLabel,
      bearer: row.bearer,
      circularId: loaded.id,
    }));
    return filterObligations(prepared, profile, {
      addresseeByCircular: { [loaded.id]: loaded.addressee || '' },
      scopeTextByCircular: { [loaded.id]: scopeTextFromInstrument(loaded.text) },
    });
  }, [loaded, profile]);

  const counts = useMemo(() => summarise(rows), [rows]);

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((row) => row.applicability.verdict === filter)),
    [rows, filter],
  );

  const changes = useMemo(() => {
    if (!loaded || !predecessor) return null;
    const current = loaded.duties.map((row) => ({
      id: row.id,
      clause: row.clause,
      quote: loaded.sentences[row.sourceId] || '',
      plain: row.plain,
    }));
    const before = predecessor.duties.map((row) => ({
      id: row.id,
      clause: row.clause,
      quote: predecessor.sentences[row.sourceId] || '',
      plain: row.plain,
    }));
    const furniture = [
      loaded.title, loaded.refNo, loaded.date,
      predecessor.title, predecessor.refNo, predecessor.date,
    ];
    return {
      obligations: diffObligations(before, current),
      sentences: diffSentences(predecessor.text, loaded.text, { exclude: furniture }),
    };
  }, [loaded, predecessor]);

  const instruments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return INDEX.instruments.filter((entry) => {
      if (family !== 'all' && entry.family !== family) return false;
      if (!query) return true;
      return `${entry.title} ${entry.refNo} ${entry.date}`.toLowerCase().includes(query);
    });
  }, [search, family]);

  const updateReview = (next) => {
    if (!loaded) return;
    setReview(next);
    saveReview(loaded.hash, next);
  };

  const buildPack = async (kind) => {
    if (!loaded) return;
    setBusy(true);
    setError('');
    try {
      const ocr = loaded.ocr || [];
      const built = await buildMonitorManifest({ instrument: loaded, profile, rows, review, ocr });
      setManifest(built);
      if (kind === 'md') {
        const markdown = buildPackMarkdown({ instrument: loaded, profile, rows, review, manifest: built, changes, ocr });
        download(packFileName(loaded, 'md'), markdown, 'text/markdown');
      } else {
        const pack = buildPackDocx({ instrument: loaded, profile, rows, review, manifest: built, ocr });
        download(pack.name, pack.bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
    } catch {
      setError('The pack could not be built in this browser.');
    }
    setBusy(false);
  };

  const openLive = async (id) => {
    setLiveBusy(true);
    setError('');
    try {
      const response = await fetch(`${MONITOR_API}/v1/instruments/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error('not found');
      const row = await response.json();
      const chunk = {
        id: row.id,
        title: row.title,
        refNo: row.ref_no || 'no reference',
        date: row.published_at || String(row.fetched_at || '').slice(0, 10),
        sourceUrl: row.source_url || '',
        hash: row.text_hash || `sha256:${row.id}`,
        text: row.text || '',
        sentences: row.sentences || {},
        duties: Array.isArray(row.duties) ? row.duties : [],
        live: true,
      };
      setSelectedId(chunk.id);
      setLoaded(chunk);
      setReview(loadReview(chunk.hash));
      setScanPages([]);
      setPasteOcr([]);
      setOcrError('');
    } catch {
      setError('That fetched instrument could not be read from the API.');
    }
    setLiveBusy(false);
  };

  const openPasted = () => {
    if (!pasted) return;
    setSelectedId('paste');
    setLoaded(pasted);
    setReview(loadReview(pasted.hash));
    setScanPages([]);
    setPasteOcr([]);
    setOcrError('');
  };

  // A local file is read in the browser and dropped into the box below, so
  // the reviewer sees exactly what the rules will read before pressing read.
  const readFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileBusy(true);
    setPasteError('');
    setPasteNote('');
    try {
      const { text, note, scanPages: pages = [] } = await extractText(file);
      setPasteText(text);
      setPasteNote(note || `${file.name} read.`);
      setScanPages(pages);
      setPasteOcr([]);
      setOcrError('');
      if (!pasteTitle.trim()) {
        setPasteTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim());
      }
    } catch (err) {
      setPasteError(ingestMessage(err));
    }
    setFileBusy(false);
  };

  // Read the pages with no text layer, one at a time. Each page's text is
  // appended with a marker naming the model, and its provenance travels with
  // the instrument into the pack.
  const runOcr = async () => {
    if (!scanPages.length) return;
    setOcrBusy(true);
    setOcrError('');
    const collected = [];
    let nextText = pasteText;
    for (const page of scanPages) {
      try {
        const { text, provenance } = await ocrPage({ image: page.dataUrl, page: page.page });
        collected.push({ ...provenance, page: page.page, dataUrl: page.dataUrl });
        const marker = `[page ${page.page} — read by ${provenance.model}; check against the page image]`;
        nextText = `${nextText.trim()}\n\n${marker}\n${text}`.trim();
        setPasteText(nextText);
        setPasteOcr([...collected]);
      } catch (err) {
        setOcrError(err.message);
        break;
      }
    }
    setOcrBusy(false);
    if (collected.length) {
      setPasteNote(`${collected.length} page${collected.length === 1 ? '' : 's'} read by OCR. Check the text against the page image before reading the instrument.`);
    }
  };

  const submitPaste = async () => {
    setPasteBusy(true);
    setPasteError('');
    try {
      const chunk = await instrumentFromText({ title: pasteTitle, refNo: pasteRef, text: pasteText, id: 'paste' });
      if (pasteOcr.length) chunk.ocr = pasteOcr;
      if (!chunk.duties.length) {
        setPasteError('No duty sentence was found in that text. Check that it contains the instrument, not a summary of it.');
      } else {
        setPasted(chunk);
        setSelectedId('paste');
        setLoaded(chunk);
        setReview(loadReview(chunk.hash));
        setPasteOpen(false);
        setPasteText('');
        setScanPages([]);
        setPasteOcr([]);
        setOcrError('');
      }
    } catch {
      setPasteError('The text could not be read in this browser.');
    }
    setPasteBusy(false);
  };

  const saveEdit = (row) => {
    if (!String(draft).trim()) return;
    updateReview(setDecision(review, row.id, { state: 'edited', text: draft.trim() }));
    setEditing(null);
    setDraft('');
  };

  return (
    <div>
      <div className="card monitor-intro">
        <p className="eyebrow">Reserve Bank of India · obligation monitor</p>
        <h3>What changed, who it binds, and what it asks you to do</h3>
        <p>
          Fifty RBI instruments pinned here, read as obligations rather than circulated
          as PDFs. A live library beside them checks the RBI twice a day for new
          notifications and master directions and reads each one with the same rules.
          Each duty is one sentence, its source is beside it, and the profile you state
          decides whether it binds you, waits on a fact, or sits with someone else.
          Where the library holds an earlier circular of the same series, the page shows
          what changed.
        </p>
        <p className="meta" style={{ marginBottom: 0 }}>
          Library: {INDEX.instruments.length} instruments pinned by text hash ·{' '}
          {INDEX.instruments.reduce((sum, entry) => sum + entry.duties, 0).toLocaleString('en-IN')} duty
          sentences · {INDEX.bases?.length || 0} base snapshots for the version diff · last
          instrument {INDEX.instruments[0]?.date} · corpus{' '}
          <code>{INDEX.corpusHash.replace('sha256:', '').slice(0, 16)}…</code>
        </p>
      </div>

      <CollectionPlan plan={COLLECTION} onOpen={setSelectedId} />

      <div className="monitor">
        <aside className="monitor-list" aria-label="Instruments">
          <div className="monitor-controls">
            <label className="monitor-search">
              Search
              <input
                type="search"
                value={search}
                placeholder="Title, reference or date"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Series
              <select value={family} onChange={(event) => setFamily(event.target.value)}>
                <option value="all">All instruments</option>
                {INDEX.families.filter((group) => group.size > 1).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label.slice(0, 70)} ({group.size})
                  </option>
                ))}
              </select>
            </label>
            <p className="meta monitor-count">{instruments.length} shown</p>
            <details
              className="monitor-paste"
              open={pasteOpen}
              onToggle={(event) => setPasteOpen(event.currentTarget.open)}
            >
              <summary>Paste or open an instrument</summary>
              <label className="monitor-file">
                Instrument file
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  disabled={fileBusy}
                  onChange={readFile}
                />
              </label>
              <p className="meta monitor-file-note">
                {fileBusy
                  ? 'Reading the file in this browser…'
                  : pasteNote || 'PDF, HTML or text, up to 15 MB. The file is not uploaded.'}
              </p>
              {scanPages.length ? (
                <div className="monitor-ocr">
                  <p className="meta">
                    Pages {scanPages.map((page) => page.page).join(', ')} have no text layer.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={ocrBusy || !ocrConfigured()}
                    onClick={runOcr}
                  >
                    {ocrBusy
                      ? 'Reading the pages…'
                      : `Read ${scanPages.length} page${scanPages.length === 1 ? '' : 's'} with OCR`}
                  </button>
                  {!ocrConfigured() ? (
                    <p className="meta">
                      OCR is not configured for this build. Paste the text, or set VITE_MONITOR_API.
                    </p>
                  ) : (
                    <p className="meta">
                      Only these page images are sent to the OCR service. The text is marked
                      machine-read in the pack.
                    </p>
                  )}
                  {ocrError ? <p className="monitor-error" role="alert">{ocrError}</p> : null}
                  {pasteOcr.length ? (
                    <ul className="monitor-ocr-trail">
                      {pasteOcr.map((entry) => (
                        <li key={entry.page}>
                          <a href={entry.dataUrl} target="_blank" rel="noreferrer">Page {entry.page} image</a>
                          <span> · {entry.model} · {String(entry.imageSha256).slice(0, 12)}…</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <label>
                Title
                <input type="text" value={pasteTitle} placeholder="Optional" onChange={(event) => setPasteTitle(event.target.value)} />
              </label>
              <label>
                Reference
                <input type="text" value={pasteRef} placeholder="Optional" onChange={(event) => setPasteRef(event.target.value)} />
              </label>
              <label>
                Text
                <textarea
                  rows={5}
                  value={pasteText}
                  placeholder="Paste the circular's own text"
                  onChange={(event) => setPasteText(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pasteBusy || !pasteText.trim()}
                onClick={submitPaste}
              >
                {pasteBusy ? 'Reading…' : 'Read this text'}
              </button>
              {pasteError ? <p className="monitor-error" role="alert">{pasteError}</p> : null}
            </details>
            {pasted ? (
              <button type="button" className="linklike" onClick={openPasted}>
                Open the pasted instrument
              </button>
            ) : null}
            {live ? (
              <div className="monitor-live">
                <p className="meta">
                  Live from the fetcher · {live.filter((entry) => entry.text_status === 'extracted').length} read
                  {live.some((entry) => entry.text_status === 'pending')
                    ? ` · ${live.filter((entry) => entry.text_status === 'pending').length} queued`
                    : ''}
                </p>
                <ul>
                  {live.slice(0, 12).map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={entry.id === selectedId ? 'monitor-live-item monitor-live-active' : 'monitor-live-item'}
                        disabled={liveBusy || entry.text_status !== 'extracted'}
                        title={entry.text_status === 'extracted' ? entry.title : 'Queued for extraction'}
                        onClick={() => openLive(entry.id)}
                      >
                        <span className="data-num">{entry.published_at || '—'}</span>
                        <span>{entry.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <ul className="monitor-instruments">
            {instruments.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={entry.id === selectedId ? 'monitor-item monitor-item-active' : 'monitor-item'}
                  aria-current={entry.id === selectedId ? 'true' : undefined}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className="monitor-item-date data-num">{entry.date}</span>
                  <span className="monitor-item-title">{entry.title}</span>
                  <span className="monitor-item-meta">
                    {entry.refNo} · {entry.duties} {entry.duties === 1 ? 'duty' : 'duties'}
                    {entry.predecessor ? ' · compared' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="monitor-main">
          {!loaded ? (
            <div className="card monitor-empty">
              <p>{error || 'Reading the instrument…'}</p>
            </div>
          ) : (
            <>
              <header className="card monitor-head">
                {loaded.id === 'paste' ? (
                  <p className="eyebrow">Pasted text · not from the library</p>
                ) : loaded.live ? (
                  <p className="eyebrow">Live · fetched from the RBI site</p>
                ) : (
                  <p className="eyebrow">
                    Series · {INDEX.families.find((group) => group.id === instrumentMeta?.family)?.label?.slice(0, 70)}
                  </p>
                )}
                <h3>{loaded.title}</h3>
                <p className="monitor-head-meta">
                  <span className="data-num">{loaded.refNo}</span> · <span className="data-num">{loaded.date}</span>
                  {loaded.sourceUrl ? (
                    <>
                      {' · '}
                      <a href={loaded.sourceUrl} target="_blank" rel="noreferrer">RBI source</a>
                    </>
                  ) : null}
                  {' · '}
                  <code>{loaded.hash.slice(7, 19)}…</code>
                </p>
                <p className="monitor-head-meta">
                  {loaded.duties.length} duty sentences · profile: {profileLabel(profile)}
                </p>
                {/* The pack is the deliverable. Keep it one click from the
                    instrument instead of two tabs deep. */}
                <div className="monitor-head-actions">
                  <span className="meta">Board pack</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => buildPack('md')}
                  >
                    {busy ? 'Building…' : 'Download .md'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => buildPack('docx')}
                  >
                    Download .docx
                  </button>
                </div>
                {loaded.ocr?.length ? (
                  <p className="monitor-head-meta monitor-ocr-badge">
                    Machine-read pages: {loaded.ocr.map((entry) => entry.page).join(', ')} · {loaded.ocr[0].model} · check against the page images
                  </p>
                ) : null}
                {loaded.id === 'paste' ? (
                  <p className="monitor-head-meta">
                    Read with the same rules as the library. It has no earlier version here and
                    no regulator feed behind it.
                  </p>
                ) : loaded.live ? (
                  <p className="monitor-head-meta">
                    Fetched by the monitor's own crawler. No earlier version is in the fetched set yet.
                  </p>
                ) : instrumentMeta?.predecessor ? (
                  <p className="monitor-head-meta">
                    Previous in this series:{' '}
                    <button
                      type="button"
                      className="linklike"
                      onClick={() => setSelectedId(instrumentMeta.predecessor)}
                    >
                      {predecessor ? `${predecessor.refNo} · ${predecessor.date}` : 'the previous instrument'}
                    </button>
                  </p>
                ) : (
                  <p className="monitor-head-meta">Earliest instrument of its series in the library.</p>
                )}
              </header>

              <div className="card monitor-profile">
                <div className="monitor-profile-head">
                  <h4>Who is reading</h4>
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => setProfile({ ...DEFAULT_PROFILE })}
                  >
                    Reset profile
                  </button>
                </div>
                <ProfileFields profile={profile} onChange={setProfile} />
              </div>

              <div className="monitor-tabs" role="tablist" aria-label="Instrument views">
                {[
                  ['duties', `Obligations (${rows.length})`],
                  ['changes', changes ? `Changes (${changes.obligations.summary.added + changes.obligations.summary.removed + changes.obligations.summary.changed})` : 'Changes'],
                  ['amendments', amendmentGraph ? `Version diff (${amendmentGraph.edges.length})` : 'Version diff'],
                  ['pack', 'Review & pack'],
                  ['source', 'Source'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    className={tab === id ? 'monitor-tab monitor-tab-active' : 'monitor-tab'}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'duties' ? (
                <div className="monitor-duties">
                  <div className="monitor-verdicts">
                    {FILTERS.map((entry) => {
                      const count = entry.id === 'all' ? rows.length : counts[entry.id] || 0;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={filter === entry.id ? 'monitor-verdict monitor-verdict-active' : 'monitor-verdict'}
                          onClick={() => setFilter(entry.id)}
                        >
                          {entry.label} <span className="data-num">{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {!visible.length ? (
                    <div className="card monitor-empty">
                      {rows.length === 0 ? (
                        <>
                          <h4>No duty sentence was recognised</h4>
                          <p>
                            This instrument amends another, or its binding language is a form the
                            rules did not read. The source tab still holds the whole text, and the
                            pack says the list is empty instead of inventing a duty.
                          </p>
                        </>
                      ) : (
                        <p>No obligation in this instrument matches that verdict for this profile.</p>
                      )}
                    </div>
                  ) : null}

                  {visible.map((row) => {
                    const verdict = VERDICT[row.applicability.verdict] || { label: row.applicability.verdict, tone: 'out' };
                    const decision = decisionFor(review, row.id);
                    return (
                      <article key={row.id} className={`card monitor-row monitor-row-${verdict.tone}`}>
                        <div className="monitor-row-head">
                          <span className={`monitor-badge monitor-badge-${verdict.tone}`}>{verdict.label}</span>
                          <span className="monitor-clause">{row.clause || `row ${row.id}`}</span>
                          <span className="monitor-review-state">
                            {decision ? decision.state : 'not reviewed'}
                          </span>
                        </div>
                        <p className="monitor-obligation">{textOf(row, review)}</p>
                        <blockquote className="monitor-quote">{row.quote}</blockquote>
                        {row.applicability.reasons.length ? (
                          <p className="monitor-reason">{row.applicability.reasons.join(' · ')}</p>
                        ) : null}
                        {row.applicability.nextRead ? (
                          <p className="meta">Read next: {row.applicability.nextRead}</p>
                        ) : null}
                        {decision?.state === 'edited' ? (
                          <p className="meta">Engine read: {row.plain}</p>
                        ) : null}
                        {decision?.note ? <p className="meta">Note: {decision.note}</p> : null}
                        <div className="monitor-row-actions">
                          <button
                            type="button"
                            className="chip"
                            onClick={() => updateReview(setDecision(review, row.id, { state: 'accepted' }))}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="chip"
                            onClick={() => {
                              setEditing(row.id);
                              setDraft(textOf(row, review));
                            }}
                          >
                            Correct
                          </button>
                          <button
                            type="button"
                            className="chip"
                            onClick={() => updateReview(setDecision(review, row.id, { state: 'flagged' }))}
                          >
                            Flag
                          </button>
                          <button
                            type="button"
                            className="linklike"
                            onClick={() => updateReview(clearDecision(review, row.id))}
                          >
                            Clear
                          </button>
                        </div>
                        {editing === row.id ? (
                          <div className="monitor-edit">
                            <label htmlFor={`edit-${row.id}`}>Your correction</label>
                            <textarea
                              id={`edit-${row.id}`}
                              rows={3}
                              value={draft}
                              onChange={(event) => setDraft(event.target.value)}
                            />
                            <div className="btn-row">
                              <button type="button" className="btn btn-primary" onClick={() => saveEdit(row)}>
                                Save correction
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                  setEditing(null);
                                  setDraft('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {tab === 'changes' ? (
                loaded.id === 'paste' ? (
                  <div className="card monitor-empty">
                    <h4>No earlier version</h4>
                    <p>A pasted instrument is not part of a series in this library, so there is nothing to compare it with.</p>
                  </div>
                ) : (
                  <Changes changes={changes} previous={predecessor} expected={!!predecessorId} />
                )
              ) : null}

              {tab === 'amendments' ? (
                <AmendmentDiff
                  graph={amendmentGraph}
                  busy={amendmentBusy}
                  error={amendmentError}
                  instrument={loaded}
                  meta={instrumentMeta}
                  base={baseLoaded}
                  onOpen={setSelectedId}
                />
              ) : null}

              {tab === 'pack' ? (
                <Pack
                  loaded={loaded}
                  rows={rows}
                  review={review}
                  onReview={updateReview}
                  manifest={manifest}
                  onPack={buildPack}
                  busy={busy}
                  error={error}
                />
              ) : null}

              {tab === 'source' ? (
                <div className="card">
                  <p className="meta">
                    The instrument as published, for checking any read. The extractor never
                    edits this text; the duty sentence on a row is copied from it.
                  </p>
                  <pre className="monitor-source">{loaded.text}</pre>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
