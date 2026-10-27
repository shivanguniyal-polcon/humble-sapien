import { useEffect, useMemo, useState } from 'react';
import PageHead from '../components/PageHead';
import ARCHIVE from '../data/archive/index.json';
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

// The public archive is a separate read-only surface, and it is deliberately
// wider than the Prahari workbench. The workbench reads one regulator's
// instruments for a decision; the archive holds what the government published
// across Parliament, ministries, regulators and programme owners. A record
// here is an issuer, a title, a date and reference where they exist, the part
// of the text the archive holds, and a link back to the source.
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
    return 'This record indexes the official programme page, not the legal text. Any full text held by the archive is listed as a separate record.';
  }
  if (meta.coverage === 'summary') {
    return 'This is a summary held by the archive, not the published text. Read the release at the source.';
  }
  if (meta.coverage === 'excerpt') {
    return 'This is the text pinned for the archive, not a full consolidation. Read the published document at the source.';
  }
  return 'This is the text as published, pinned for this library. It is not a legal consolidation and does not claim the instrument is still in force.';
};

const textHeading = (meta) => {
  if (meta.coverage === 'summary') return 'Summary in the archive';
  if (meta.coverage === 'excerpt') return 'Selected text in the archive';
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

  const ref = openId ? String(openId) : null;
  const meta = ref ? ARCHIVE.records.find((entry) => entry.id === ref) || null : null;
  const currentDoc = archiveDocMatches(doc, ref) ? doc : null;
  const currentError = docError?.id === ref ? docError.message : '';
  const copiedMessage = copied?.ref === ref ? copied.message : '';

  const open = (id) => onOpen?.(id);
  const back = () => onBack?.();
  const openWorkbench = () => onNavigate?.('work', 'monitor');

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
          ← The archive
        </button>
        <PageHead eyebrow="Public archive · Government of India" title="Not in the archive">
          The archive holds {ARCHIVE.counts.records} records from {ARCHIVE.counts.sources} issuers.
          The id in this link is not one of them.
        </PageHead>
        <button type="button" className="btn btn-secondary" onClick={back}>
          Back to the archive
        </button>
      </div>
    );
  }

  if (meta) {
    if (currentError) {
      return (
        <div className="archive">
          <button type="button" className="linklike" onClick={back}>
            ← The archive
          </button>
          <PageHead eyebrow={`Public archive · ${meta.issuerShort}`} title={meta.title} />
          <div className="card monitor-empty">
            <p>{currentError}</p>
            <button type="button" className="btn btn-secondary" onClick={back}>
              Back to the archive
            </button>
          </div>
        </div>
      );
    }

    if (!currentDoc) {
      return (
        <div className="archive">
          <button type="button" className="linklike" onClick={back}>
            ← The archive
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
          ← The archive
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
                ? 'The text hash matches the archive index.'
                : 'The text hash does not match the archive index. Treat this copy as unverified.'}
            </p>
          ) : null}
          {hasText ? (
            <p className="meta">
              The text above is the archive's own copy. The hash checks that copy, not the live
              document, so the record stays citable if the source withdraws, moves or redacts it.
            </p>
          ) : null}
          <p className="meta">{meta.note || coverageNote(meta)}</p>
        </div>

        {meta.follows?.length || meta.followedBy?.length ? (
          <div className="card archive-lineage">
            <h3>Lineage</h3>
            <p className="meta">
              Where this text sits in the archive's chain. The record's status says whether a successor
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
                The text the hash covers, with its published line breaks. The archive does not add
                an interpretation.
              </p>
              <pre className="monitor-source archive-source">{currentDoc.text}</pre>
            </>
          ) : (
            <>
              <h3>What this record holds</h3>
              <p>
                {meta.summary ||
                  'The archive indexes this record but does not hold its text. Read the official source for the published document.'}
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
        title="The public archive"
        question="What did the government actually publish?"
      >
        Records from Parliament, ministries, the Reserve Bank and programme owners. Where the
        archive holds the text, it is pinned by SHA-256; where it holds a summary or a programme
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
          Search the archive
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
