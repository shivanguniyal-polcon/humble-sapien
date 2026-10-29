import { useEffect, useMemo, useState } from 'react';
import PageHead from '../components/PageHead';
import DeepTime from '../components/DeepTime';
import ARCHIVE from '../data/archive/index.json';
import { ledgerHistory, parseAmendmentLedger, sortLedger } from '../lib/legal/ledger.js';
import { checkoutSections } from '../lib/legal/versions.js';
import {
  archiveCitation,
  archiveDocMatches,
  archiveFileName,
  archiveRecord,
  archiveRecordJson,
  searchArchive,
  searchTerms,
  sortArchive,
} from '../lib/archive.js';

// Smriti — the public archive — is a separate read-only surface, and it is
// deliberately wider than the Prahari workbench. The workbench reads one
// regulator's instruments for a decision; Smriti holds what the government
// published across Parliament, ministries, regulators and programme owners. A
// record here is an issuer, a title, a date and reference where they exist,
// the part of the text Smriti holds, and a link back to the source.
//
// Browsing is metadata only. The first search loads the archived text, and
// programme pages stay as their summaries and links.

const monitorChunks = import.meta.glob('../data/monitor/instruments/*.json');
const archiveChunks = import.meta.glob('../data/archive/docs/*.json');
const docCache = new Map();
let corpusPromise = null;

function loadDoc(record) {
  if (!record) return Promise.reject(new Error('no archive record'));
  if (docCache.has(record.id)) return docCache.get(record.id);

  let load = null;
  if (record.file) load = monitorChunks[`../data/monitor/${record.file}`];
  else if (record.doc) load = archiveChunks[`../data/archive/${record.doc}`];

  const promise = load
    ? load().then((module) => module.default)
    : Promise.resolve({
        id: record.id,
        text: '',
        sourceUrl: record.sourceUrl || '',
        hash: '',
      });

  docCache.set(record.id, promise);
  return promise;
}

function loadCorpus() {
  if (!corpusPromise) {
    corpusPromise = Promise.all(
      ARCHIVE.records.map(async (meta) => [meta.id, await loadDoc(meta)]),
    ).then((entries) => new Map(entries));
    corpusPromise.catch(() => {
      corpusPromise = null;
    });
  }
  return corpusPromise;
}

const longDate = (iso) => {
  if (!iso) return '';
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const coverageNote = (meta) => {
  if (meta.coverage === 'programme-page') {
    return 'This record indexes the official programme page, not the legal text. Any full text held by Smriti is listed as a separate record.';
  }
  if (meta.coverage === 'summary') {
    return 'This is a summary held by Smriti, not the published text. Read the release at the source.';
  }
  if (meta.coverage === 'excerpt') {
    return 'This is the text pinned for Smriti, not a full consolidation. Read the published document at the source.';
  }
  return 'This is the text as published, pinned for this library. It is not a legal consolidation and does not claim the instrument is still in force.';
};

const textHeading = (meta) => {
  if (meta.coverage === 'summary') return 'Summary in Smriti';
  if (meta.coverage === 'excerpt') return 'Selected text in Smriti';
  return 'Pinned text';
};

const download = (name, data) => {
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

export default function Archive({ openId = null, onOpen, onBack, onNavigate }) {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [kind, setKind] = useState('all');
  const [corpus, setCorpus] = useState(null);
  const [corpusBusy, setCorpusBusy] = useState(false);
  const [corpusError, setCorpusError] = useState('');
  const [doc, setDoc] = useState(null);
  const [docError, setDocError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [earlier, setEarlier] = useState(null);
  const [earlierBusy, setEarlierBusy] = useState(false);

  const ref = openId ? String(openId) : null;
  const meta = ref ? ARCHIVE.records.find((entry) => entry.id === ref) || null : null;
  const currentDoc = archiveDocMatches(doc, ref) ? doc : null;
  const currentError = docError?.id === ref ? docError.message : '';
  const copiedMessage = copied?.ref === ref ? copied.message : '';

  const open = (id) => onOpen?.(id);
  const back = () => onBack?.();
  const openWorkbench = () => onNavigate?.('work', 'monitor');

  // The amendment ledger is read from the text the page already holds, so the
  // index stays metadata. A patch is tied to the section it changed only when
  // the archive also holds the amending Act.
  const history = useMemo(() => {
    if (!meta || !currentDoc?.text || !meta.amendmentRows) return null;
    const ledger = parseAmendmentLedger(currentDoc.text);
    const patches = [];
    for (const entry of ARCHIVE.records) {
      if (entry.amends === meta.id) patches.push(...(entry.patches || []));
    }
    return { ledger, rows: sortLedger(ledgerHistory(ledger, patches)) };
  }, [meta, currentDoc]);

  // Checkout: the earlier pinned text of this statute, loaded only when the
  // reader asks for it. Browsing the record never pays for the second text.
  const olderVersion = useMemo(() => {
    if (!meta?.versions?.length || !currentDoc?.text) return null;
    const older = meta.versions.filter((version) => version.asOf < meta.asOf).pop();
    return older ? ARCHIVE.records.find((entry) => entry.id === older.id) || null : null;
  }, [meta, currentDoc]);

  const targets = useMemo(
    () => [...new Set((history?.rows || []).map((row) => row.target).filter(Boolean))],
    [history],
  );

  // A loaded earlier text belongs to the record it was loaded for, so opening
  // another record never pairs one statute's text with another's sections.
  const earlierForThis = earlier?.forRef === ref ? earlier : null;

  const comparison = useMemo(() => {
    if (!earlierForThis?.text || !currentDoc?.text || !targets.length) return null;
    return checkoutSections(earlierForThis.text, currentDoc.text, targets);
  }, [earlierForThis, currentDoc, targets]);

  const loadEarlier = async () => {
    if (!olderVersion || earlierBusy) return;
    setEarlierBusy(true);
    try {
      const loaded = await loadDoc(olderVersion);
      setEarlier({ forRef: ref, id: olderVersion.id, text: loaded.text || '' });
    } finally {
      setEarlierBusy(false);
    }
  };

  // A ledger row names an Act by number and year; the register names it by
  // reference. Match the two so the row can open the amending Act itself.
  const actRecord = (label) => {
    const named = String(label || '').match(/Act\s+(?:No\.\s*)?(\d+)\s+of\s+(\d{4})/i);
    if (!named) return null;
    return (
      ARCHIVE.records.find((entry) => {
        const ref = String(entry.refNo || '').match(/Act\s+(?:No\.\s*)?(\d+)\s+of\s+(\d{4})/i);
        return ref && Number(ref[1]) === Number(named[1]) && Number(ref[2]) === Number(named[2]);
      }) || null
    );
  };

  // A lineage edge is another archive record, so it opens in place rather than
  // sending the reader to the issuer's site.
  const lineageList = (ids = []) => (
    <ul className="archive-lineage-list">
      {ids
        .map((id) => ARCHIVE.records.find((entry) => entry.id === id))
        .filter(Boolean)
        .map((entry) => (
          <li key={entry.id}>
            <button type="button" className="linklike" onClick={() => open(entry.id)}>
              {entry.shortTitle || entry.title}
            </button>
            {entry.date ? <span className="meta"> · {entry.date}</span> : null}
          </li>
        ))}
    </ul>
  );

  useEffect(() => {
    if (!meta) return undefined;
    let alive = true;
    loadDoc(meta)
      .then((loaded) => {
        if (!alive) return;
        setDoc(loaded);
        setDocError(null);
      })
      .catch(() => {
        if (alive) {
          setDocError({
            id: meta.id,
            message: 'The archived text for this record could not be loaded.',
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [meta]);

  const ensureCorpus = () => {
    if (corpus || corpusBusy) return;
    setCorpusBusy(true);
    setCorpusError('');
    loadCorpus()
      .then((map) => setCorpus(map))
      .catch(() => {
        setCorpusError('The archived text could not be loaded. Titles, issuers and summaries still search.');
      })
      .finally(() => setCorpusBusy(false));
  };

  const records = useMemo(
    () =>
      ARCHIVE.records.map((entry) =>
        archiveRecord(entry, corpus?.get(entry.id) || null),
      ),
    [corpus],
  );

  const terms = useMemo(() => searchTerms(search), [search]);

  const results = useMemo(() => {
    const scoped = records.filter(
      (record) =>
        (source === 'all' || record.meta.source === source) &&
        (kind === 'all' || record.meta.kind === kind),
    );
    if (!terms.length) {
      return sortArchive(scoped).map((record) => ({ record, snippet: '' }));
    }
    return searchArchive(scoped, search);
  }, [records, source, kind, search, terms]);

  const copyCitation = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ref, message: 'Citation copied.' });
    } catch {
      setCopied({
        ref,
        message: 'The browser would not copy it. Select the citation and copy it by hand.',
      });
    }
  };

  const downloadRecord = () => {
    if (!meta) return;
    download(
      archiveFileName(meta),
      archiveRecordJson(meta, currentDoc || { text: '', sourceUrl: meta.sourceUrl }),
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSource('all');
    setKind('all');
  };

  if (ref && !meta) {
    return (
      <div className="archive">
        <button type="button" className="linklike" onClick={back}>
          ← Smriti
        </button>
        <PageHead eyebrow="Public archive · Government of India" title="Not in Smriti">
          Smriti holds {ARCHIVE.counts.records} records from {ARCHIVE.counts.sources} issuers.
          The id in this link is not one of them.
        </PageHead>
        <button type="button" className="btn btn-secondary" onClick={back}>
          Back to Smriti
        </button>
      </div>
    );
  }

  if (meta) {
    if (currentError) {
      return (
        <div className="archive">
          <button type="button" className="linklike" onClick={back}>
            ← Smriti
          </button>
          <PageHead eyebrow={`Public archive · ${meta.issuerShort}`} title={meta.title} />
          <div className="card monitor-empty">
            <p>{currentError}</p>
            <button type="button" className="btn btn-secondary" onClick={back}>
              Back to Smriti
            </button>
          </div>
        </div>
      );
    }

    if (!currentDoc) {
      return (
        <div className="archive">
          <button type="button" className="linklike" onClick={back}>
            ← Smriti
          </button>
          <div className="card monitor-empty" role="status">
            <p>Reading the record…</p>
          </div>
        </div>
      );
    }

    const sourceUrl = currentDoc.sourceUrl || meta.sourceUrl;
    const citation = archiveCitation({ ...meta, sourceUrl });
    const verified = Boolean(currentDoc.hash && meta.hash && currentDoc.hash === meta.hash);
    const hasText = Boolean(currentDoc.text);

    return (
      <div className="archive">
        <button type="button" className="linklike" onClick={back}>
          ← Smriti
        </button>
        <PageHead eyebrow={`Public archive · ${meta.issuerShort}`} title={meta.title} />

        <div className="card archive-provenance">
          <dl>
            <div>
              <dt>Issuer</dt>
              <dd>{meta.issuer}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{meta.kindLabel}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{meta.coverageLabel}</dd>
            </div>
            {meta.refNo ? (
              <div>
                <dt>Reference</dt>
                <dd className="data-num">{meta.refNo}</dd>
              </div>
            ) : null}
            {meta.date ? (
              <div>
                <dt>Date</dt>
                <dd className="data-num">{meta.date}</dd>
              </div>
            ) : null}
            {meta.words ? (
              <div>
                <dt>Words</dt>
                <dd>{Number(meta.words).toLocaleString('en-IN')}</dd>
              </div>
            ) : null}
            {meta.duties != null && meta.kind === 'instrument' ? (
              <div>
                <dt>Duty sentences</dt>
                <dd>{meta.duties}</dd>
              </div>
            ) : null}
            <div>
              <dt>Snapshot</dt>
              <dd>{longDate(ARCHIVE.generatedAt)}</dd>
            </div>
            {meta.status ? (
              <div className="archive-wide">
                <dt>Status</dt>
                <dd>{meta.status}</dd>
              </div>
            ) : null}
            {meta.hash ? (
              <div className="archive-wide">
                <dt>Text hash</dt>
                <dd>
                  <code>{meta.hash}</code>
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="meta">
            {sourceUrl ? (
              <>
                Source:{' '}
                <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
                  {meta.issuer}
                </a>
              </>
            ) : (
              'No source link is recorded for this record.'
            )}
          </p>
          {meta.hash ? (
            <p className={verified ? 'meta' : 'monitor-error'}>
              {verified
                ? 'The text hash matches the index entry.'
                : 'The text hash does not match the index entry. Treat this copy as unverified.'}
            </p>
          ) : null}
          {hasText ? (
            <p className="meta">
              The text above is Smriti's own copy. The hash checks that copy, not the live
              document, so the record stays citable if the source withdraws, moves or redacts it.
            </p>
          ) : null}
          <p className="meta">{meta.note || coverageNote(meta)}</p>
        </div>

        {meta.versions?.length > 1 ? (
          <div className="card archive-lineage">
            <h3>Versions</h3>
            <p className="meta">
              Pinned texts of this Act, ordered by the date the text was consolidated. Opening one reads
              the law as it stood then; each carries its own hash.
            </p>
            <ul className="archive-lineage-list">
              {meta.versions.map((version) => (
                <li key={version.id}>
                  {version.id === meta.id ? (
                    <span>{version.label} (this record)</span>
                  ) : (
                    <button type="button" className="linklike" onClick={() => open(version.id)}>
                      {version.label}
                    </button>
                  )}
                  <span className="meta">
                    {' '}
                    · text as on {longDate(version.asOf)} · {Number(version.words).toLocaleString('en-IN')} words
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {meta.amends ? (
          <div className="card archive-lineage">
            <h3>Amends</h3>
            <p className="meta">
              This Act changes a statute already in the register, {meta.patches?.length ? 'and names the sections it reaches' : 'by an amendment Smriti does not break down'}.
            </p>
            {lineageList([meta.amends])}
            {meta.patches?.length ? (
              <p className="meta archive-ledger-quote">
                Changes section {meta.patches.map((patch) => patch.target).join(', section ')} of the principal Act.
              </p>
            ) : null}
          </div>
        ) : null}

        {history && history.rows.length ? (
          <div className="card archive-ledger">
            <h3>Amendment history</h3>
            <p className="meta">
              Read from the footnotes this consolidated text prints, not reconstructed. {history.rows.length} patches
              {history.ledger.partial ? `, ${history.ledger.partial} only partly read` : ''}
              {history.rows.filter((row) => row.effective).length
                ? `, ${history.rows.filter((row) => row.effective).length} with a commencement date`
                : ''}
              . Where Smriti also holds the amending Act, the patch opens it and names the section it changed.
            </p>
            <ul className="archive-ledger-list">
              {history.rows.map((row, index) => {
                const record = actRecord(row.instrument);
                return (
                  <li key={`${row.number}-${index}`} className="archive-ledger-row">
                    <p className="archive-ledger-head">
                      {record ? (
                        <button type="button" className="linklike" onClick={() => open(record.id)}>
                          {record.shortTitle || record.title}
                        </button>
                      ) : (
                        <span>{row.instrument || 'Instrument not named in the footnote'}</span>
                      )}
                      {row.amendingSection ? <span className="meta"> · s. {row.amendingSection}</span> : null}
                      {row.target ? <span className="meta"> → section {row.target} of this Act</span> : null}
                    </p>
                    <p className="meta">
                      {row.operation}
                      {row.effective
                        ? ` · in force ${longDate(row.effective)}`
                        : ' · no commencement date printed'}
                    </p>
                    {row.oldText ? <p className="meta archive-ledger-quote">Replaced “{row.oldText}”</p> : null}
                    {!row.oldText && row.oldReference ? (
                      <p className="meta archive-ledger-quote">Replaced {row.oldReference}</p>
                    ) : null}
                    <details className="archive-ledger-raw">
                      <summary className="meta">Printed footnote</summary>
                      <code>{row.raw}</code>
                    </details>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {olderVersion && targets.length ? (
          <div className="card archive-checkout">
            <h3>As it stood before the patch</h3>
            <p className="meta">
              The ledger names section {targets.join(', section ')} of this Act. Smriti also holds an
              earlier text, whose date the record below gives. Loading it shows the words before the
              amending Act reached them.
            </p>
            {!comparison ? (
              <button type="button" className="btn btn-secondary" onClick={loadEarlier} disabled={earlierBusy}>
                {earlierBusy
                  ? 'Loading the earlier text…'
                  : `Read section ${targets.join(', ')} in the ${longDate(olderVersion.asOf).split(' ').pop()} text`}
              </button>
            ) : (
              <>
                {comparison.map((section) => (
                  <div key={section.number} className="archive-section-compare">
                    <p className="archive-ledger-head">
                      Section {section.number} · {section.title}
                    </p>
                    <p className="meta">
                      Vocabulary overlap {section.similarity.toFixed(2)} — a low figure can mean the law changed
                      or the older copy was scanned badly, and this one is a scan.
                    </p>
                    <div className="archive-section-pair">
                      <div>
                        <p className="meta archive-ledger-label">Before · {longDate(olderVersion.asOf)}</p>
                        <p className="archive-section-text">{section.before || 'Not in the earlier text.'}</p>
                      </div>
                      <div>
                        <p className="meta archive-ledger-label">After · {longDate(meta.asOf)}</p>
                        <p className="archive-section-text">{section.after || 'Not in this text.'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="meta">
                  Both texts are Smriti's own copies, hashed. The earlier one is kept as it reads, OCR
                  damage included, rather than corrected to match.
                </p>
              </>
            )}
          </div>
        ) : null}

        {meta.follows?.length || meta.followedBy?.length ? (
          <div className="card archive-lineage">
            <h3>Lineage</h3>
            <p className="meta">
              Where this text sits in Smriti's chain. The record's status says whether a successor
              replaced it.
            </p>
            {meta.follows?.length ? (
              <>
                <p className="meta archive-lineage-label">Follows</p>
                {lineageList(meta.follows)}
              </>
            ) : null}
            {meta.followedBy?.length ? (
              <>
                <p className="meta archive-lineage-label">Followed by</p>
                {lineageList(meta.followedBy)}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="card archive-citation-card">
          <h3>Cite this record</h3>
          <p className="archive-citation">{citation}</p>
          <div className="archive-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => copyCitation(citation)}
            >
              Copy citation
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadRecord}>
              Download the record (.json)
            </button>
            {meta.source === 'rbi' && onNavigate ? (
              <button type="button" className="btn btn-secondary" onClick={openWorkbench}>
                Open the Prahari workbench
              </button>
            ) : null}
          </div>
          {copiedMessage && (
            <p className="sheet-note meta" role="status">
              {copiedMessage}
            </p>
          )}
        </div>

        <div className="card">
          {hasText ? (
            <>
              <h3>{textHeading(meta)}</h3>
              <p className="meta">
                The text the hash covers, with its published line breaks. Smriti does not add
                an interpretation.
              </p>
              <pre className="monitor-source archive-source">{currentDoc.text}</pre>
            </>
          ) : (
            <>
              <h3>What this record holds</h3>
              <p>
                {meta.summary ||
                  'Smriti indexes this record but does not hold its text. Read the official source for the published document.'}
              </p>
              {sourceUrl ? (
                <p className="meta">
                  <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
                    Read it at {meta.issuer} →
                  </a>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  }

  const dates = ARCHIVE.records
    .map((entry) => entry.dateISO)
    .filter(Boolean)
    .sort();
  const range = dates.length ? `${longDate(dates[0])} → ${longDate(dates[dates.length - 1])}` : '';

  return (
    <div className="archive">
      <PageHead
        eyebrow="Public archive · Government of India"
        title="Smriti — The Archive"
        question="What did the government actually publish?"
      >
        Records from Parliament, ministries, the Reserve Bank and programme owners. Where Smriti
        holds the text, it is pinned by SHA-256; where it holds a summary or a programme
        page, the record says so and links to the official source. The RBI workbench remains a
        separate reading surface.
      </PageHead>

      <div className="card archive-summary">
        <p className="meta">
          {ARCHIVE.counts.records} records · {ARCHIVE.counts.sources} issuers ·{' '}
          {ARCHIVE.counts.fullText} with full text · {ARCHIVE.counts.excerpt} selected text ·{' '}
          {ARCHIVE.counts.summary} summary · {ARCHIVE.counts.programmePage} programme pages ·{' '}
          {ARCHIVE.counts.linked} in a chain
          {range ? ` · ${range}` : ''}
        </p>
        <p className="meta">
          Browsing is metadata only. The first search loads the archived text; programme pages stay
          as their summaries and links.
        </p>
      </div>

      {/* The long view, kept above the records: what a reader could reach in
          each era, and the tool built for what that era broke. It sits here
          rather than at the foot of the list because eighty-four records would
          bury it; the archive argues first, then lets the reader search. */}
      <section className="strata" aria-labelledby="deep-time-title">
        <div className="shell">
          <div className="section-head">
            <span className="overline">Deep time</span>
            <h2 id="deep-time-title">Who could read the rules, era by era</h2>
            <p className="section-strap">
              Every era moved the gate. Walk the timeline: each one names who
              held it, and the tool THS built to break it open. Start anywhere,
              or use the arrow keys.
            </p>
          </div>
          <DeepTime onNavigate={onNavigate} />
        </div>
      </section>

      <div className="archive-sources">
        <p className="meta archive-source-label">Browse by issuer</p>
        <div className="filter-row" role="group" aria-label="Filter by issuer">
          <button
            type="button"
            className={`chip ${source === 'all' ? 'chip-active' : ''}`}
            aria-pressed={source === 'all'}
            onClick={() => setSource('all')}
          >
            All issuers ({ARCHIVE.counts.records})
          </button>
          {ARCHIVE.sources.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`chip ${source === entry.id ? 'chip-active' : ''}`}
              aria-pressed={source === entry.id}
              onClick={() => setSource(entry.id)}
            >
              {entry.short} ({entry.count})
            </button>
          ))}
        </div>
      </div>

      <div className="card archive-controls">
        <label>
          Search Smriti
          <input
            type="search"
            value={search}
            placeholder="Title, issuer, reference, or a phrase in the text"
            onChange={(event) => {
              const next = event.target.value;
              setSearch(next);
              if (next.trim().length >= 2) ensureCorpus();
            }}
          />
        </label>
        <label>
          Type
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">All types</option>
            {ARCHIVE.kinds.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label} ({entry.count})
              </option>
            ))}
          </select>
        </label>
        <p className="meta archive-count" role="status">
          {results.length} of {ARCHIVE.counts.records} records
          {corpusBusy ? ' · loading the archived text…' : ''}
          {corpusError ? ` · ${corpusError}` : ''}
        </p>
      </div>

      {results.length ? (
        <ul className="archive-list">
          {results.map(({ record, snippet }) => {
            const entry = record.meta;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className="archive-item"
                  aria-label={`Open ${entry.title} from ${entry.issuer}`}
                  onClick={() => open(entry.id)}
                >
                  <span className="archive-item-date data-num">{entry.date || '—'}</span>
                  <span className="archive-item-title">{entry.title}</span>
                  <span className="archive-item-meta">
                    {entry.issuer} · {entry.kindLabel}
                    {entry.refNo ? ` · ${entry.refNo}` : ''}
                    {entry.words ? ` · ${Number(entry.words).toLocaleString('en-IN')} words` : ''}
                    {entry.coverageLabel && entry.coverageLabel !== entry.kindLabel
                      ? ` · ${entry.coverageLabel}`
                      : ''}
                  </span>
                  {snippet ? <span className="archive-item-snippet">{snippet}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card monitor-empty">
          <h3>No record matches that search</h3>
          <p>
            Try an issuer, a reference, a word from the title, or a shorter phrase. The search
            looks in the archived text once it has loaded.
          </p>
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            Clear the search
          </button>
        </div>
      )}
    </div>
  );
}
