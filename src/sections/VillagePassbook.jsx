// Khata: the village money tool.
//
// A Gram Panchayat's own records, read as a household would read a passbook:
// what came in, what went out, what is left in the 15th Finance Commission
// account, what the GP says it completed, and the questions a Gram Sabha can
// put to the record.
//
// The page is deliberately a reading aid. It does not audit the GP, verify a
// work on the ground, or claim that a payment bought a particular asset. Every
// number links back to a public eGramSwaraj response and its hash.
//
// The directory and the captured passbooks come from the places API (see
// workers/places). Nothing about a village or a rupee figure ships in this
// bundle, so the picker can offer every State, district and village without
// growing the JavaScript.

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import PageHead from '../components/PageHead';
import {
  fetchDistricts,
  fetchPassbook,
  fetchStates,
  fetchVillages,
} from '../lib/places';
import { parsePlace } from '../lib/india/hierarchy';
import { downloadFile } from '../lib/download.js';
import {
  buildQuestions,
  buildRtiText,
  buildShareText,
  compactRupees as formatCompactRupees,
  dateLabel as formatDate,
  monthLong,
  monthName,
  PILOT_CONTACTS,
  rupees as formatRupees,
  schemeName as formatScheme,
  shareOf,
  titleCase,
} from '../lib/passbook.js';
import { copyFor } from '../lib/passbookCopy.js';
import { buildFlyerPng } from '../lib/passbookFlyer.js';

// The map is the same drill-down Sampark uses. It is loaded only when the
// reader opens it, and its State chunks arrive one State at a time.
const IndiaLocator = lazy(() => import('../components/IndiaLocator'));

// The pilot's first page: one live GP, so a reader who lands without a link
// sees a real record rather than an empty picker.
const PILOT_STATE = 'Uttarakhand';
const PILOT_DISTRICT = 'Dehradun';

// The language choice is a reading preference, not a route: it survives a
// reload but never changes the URL a resident shares.
const LANGUAGE_KEY = 'khata.lang';

const initialLanguage = () => {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'hi' || saved === 'en') return saved;
  } catch {
    // Private mode or a blocked storage API: fall through to the browser language.
  }
  return String(navigator.language || '').toLowerCase().startsWith('hi') ? 'hi' : 'en';
};

const rememberLanguage = (lang) => {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // The page still switches; only persistence is unavailable.
  }
};

const readParams = (query) => {
  const out = {};
  for (const part of String(query || '').split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    if (i < 0) continue;
    try {
      out[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
    } catch {
      // A malformed pair is ignored; the picker falls back to the pilot.
    }
  }
  return out;
};

const buildQuery = (selection) => {
  const parts = [];
  if (selection.stateId) parts.push(`s=${selection.stateId}`);
  if (selection.districtId) parts.push(`d=${selection.districtId}`);
  if (selection.village) parts.push(`v=${encodeURIComponent(selection.village)}`);
  return parts.join('&');
};

const sameSelection = (a, b) =>
  a.stateId === b.stateId && a.districtId === b.districtId && a.village === b.village;

export default function VillagePassbook({ query, onQueryChange }) {
  const params = useMemo(() => readParams(query), [query]);
  const [lang, setLang] = useState(initialLanguage);
  const t = copyFor(lang);

  const changeLanguage = (next) => {
    setLang(next);
    rememberLanguage(next);
  };

  const [selection, setSelection] = useState(() => ({
    stateId: Number(params.s) || null,
    districtId: Number(params.d) || null,
    village: params.v || null,
  }));
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [listError, setListError] = useState('');
  const [doc, setDoc] = useState(null);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState('');
  const [mapOpen, setMapOpen] = useState(false);

  // Only a change made *here* may write the URL. Without this flag a shared
  // link opened while the page is already mounted would be overwritten by the
  // selection it replaced, before the new one could load.
  const internalChange = useRef(false);
  const updateSelection = (updater) => {
    internalChange.current = true;
    setSelection(updater);
  };

  // The country list is one call. Everything after it is a cascade.
  useEffect(() => {
    const controller = new AbortController();
    fetchStates(controller.signal)
      .then(setStates)
      .catch((err) => {
        if (!controller.signal.aborted) setListError(err.message);
      });
    return () => controller.abort();
  }, []);

  // Land on a real place when the link names none.
  useEffect(() => {
    if (!states.length) return;
    updateSelection((prev) => {
      if (prev.stateId && states.some((s) => s.id === prev.stateId)) return prev;
      const wanted = states.find((s) => s.name === PILOT_STATE) || states[0];
      return { ...prev, stateId: wanted.id, districtId: null, village: null };
    });
  }, [states]);

  useEffect(() => {
    if (!selection.stateId) {
      setDistricts([]);
      return undefined;
    }
    const controller = new AbortController();
    setListError('');
    setDistricts([]);
    fetchDistricts(selection.stateId, controller.signal)
      .then(setDistricts)
      .catch((err) => {
        if (!controller.signal.aborted) setListError(err.message);
      });
    return () => controller.abort();
  }, [selection.stateId]);

  useEffect(() => {
    if (!selection.districtId) {
      setVillages([]);
      return undefined;
    }
    const controller = new AbortController();
    setListError('');
    setVillages([]);
    fetchVillages(selection.districtId, controller.signal)
      .then(setVillages)
      .catch((err) => {
        if (!controller.signal.aborted) setListError(err.message);
      });
    return () => controller.abort();
  }, [selection.districtId]);

  // Whenever a list arrives, make sure the choice inside it is real. This also
  // covers a map walk that stops above the village level: the picker falls
  // back to a captured GP rather than leaving an empty select on screen.
  useEffect(() => {
    if (!districts.length) return;
    updateSelection((prev) => {
      if (prev.districtId && districts.some((d) => d.id === prev.districtId)) return prev;
      const wanted = districts.find((d) => d.name === PILOT_DISTRICT) || districts[0];
      return { ...prev, districtId: wanted.id, village: null };
    });
  }, [districts]);

  useEffect(() => {
    if (!villages.length) return;
    updateSelection((prev) => {
      if (prev.village && villages.some((v) => v.name === prev.village)) return prev;
      const wanted = villages.find((v) => v.gp) || villages[0];
      return { ...prev, village: wanted.name };
    });
  }, [villages, selection.village]);

  // A link carries the choice. It is written only for a change made here, and
  // only when the string actually differs, so a write never bounces back
  // through the effect below.
  useEffect(() => {
    if (!internalChange.current) return;
    if (!onQueryChange || !selection.stateId || !selection.districtId) return;
    internalChange.current = false;
    const next = buildQuery(selection);
    if (next !== (query || '')) onQueryChange(next);
  }, [selection, onQueryChange, query]);

  // Back and forward move the picker with the URL.
  useEffect(() => {
    const next = {
      stateId: Number(params.s) || null,
      districtId: Number(params.d) || null,
      village: params.v || null,
    };
    if (!next.stateId) return;
    setSelection((prev) => (sameSelection(prev, next) ? prev : next));
  }, [params]);

  const selectedVillage = villages.find((v) => v.name === selection.village) || null;
  const gpCode = selectedVillage?.gp?.code || null;
  const captured = villages.filter((v) => v.gp);

  // One record at a time. The old one is cleared before the new request so a
  // slow answer cannot leave the previous GP's figures under a new heading.
  useEffect(() => {
    if (!gpCode) {
      setDoc(null);
      setDocError('');
      setDocBusy(false);
      return undefined;
    }
    const controller = new AbortController();
    setDoc(null);
    setDocBusy(true);
    setDocError('');
    fetchPassbook(gpCode, controller.signal)
      .then(setDoc)
      .catch((err) => {
        if (!controller.signal.aborted) setDocError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDocBusy(false);
      });
    return () => controller.abort();
  }, [gpCode]);

  const mapPlace = useMemo(() => {
    if (!selection.stateId) return '';
    return [
      selection.stateId,
      selection.districtId || '-',
      '-',
      selectedVillage?.blockId || '-',
      selection.village ? encodeURIComponent(selection.village) : '-',
    ].join('|');
  }, [selection, selectedVillage]);

  const onMapPlace = (value) => {
    const next = parsePlace(value);
    if (!next) return;
    updateSelection((prev) => ({
      stateId: next.stateId,
      districtId: next.districtId ?? prev.districtId,
      village: next.village ?? null,
    }));
  };

  const pick = (patch) => updateSelection((prev) => ({ ...prev, ...patch }));

  const stateName = states.find((s) => s.id === selection.stateId)?.name || '';
  const districtName = districts.find((d) => d.id === selection.districtId)?.name || '';

  return (
    <section className="passbook" lang={lang}>
      <PageHead eyebrow={t.eyebrow} title={t.title} question={t.question}>
        {t.intro}
      </PageHead>

      <div className="khata-language" role="group" aria-label={t.languageAria}>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={lang === 'hi'}
          onClick={() => changeLanguage('hi')}
        >
          हिंदी
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={lang === 'en'}
          onClick={() => changeLanguage('en')}
        >
          English
        </button>
      </div>

      <div className="khata-picker card">
        <div className="khata-fields">
          <label className="khata-field" htmlFor="khata-state">
            <span>{t.state}</span>
            <select
              id="khata-state"
              value={selection.stateId || ''}
              onChange={(event) => pick({ stateId: Number(event.target.value), districtId: null, village: null })}
            >
              {states.map((state) => (
                <option key={state.id} value={state.id}>{state.name}</option>
              ))}
            </select>
          </label>

          <label className="khata-field" htmlFor="khata-district">
            <span>{t.district}</span>
            <select
              id="khata-district"
              value={selection.districtId || ''}
              disabled={!districts.length}
              onChange={(event) => pick({ districtId: Number(event.target.value), village: null })}
            >
              {districts.map((district) => (
                <option key={district.id} value={district.id}>{district.name}</option>
              ))}
            </select>
          </label>

          <label className="khata-field" htmlFor="khata-village">
            <span>{t.village}</span>
            <select
              id="khata-village"
              value={selection.village || ''}
              disabled={!villages.length}
              onChange={(event) => pick({ village: event.target.value })}
            >
              {villages.map((village, index) => (
                <option key={`${village.blockId}-${village.name}-${index}`} value={village.name}>
                  {village.name} — {village.block} {t.blockWord}{village.gp ? ` · ${t.passbookShort}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="meta khata-count">
          {stateName && districtName
            ? t.directoryLine(districtName, stateName, villages.length.toLocaleString('en-IN'), captured.length)
            : t.directoryReading}
        </p>

        {listError && (
          <p className="locator-problem" role="status">
            {t.directoryError(listError)}
          </p>
        )}
      </div>

      <details
        className="khata-map"
        onToggle={(event) => setMapOpen(event.currentTarget.open)}
      >
        <summary>{t.mapSummary}</summary>
        {mapOpen && (
          <Suspense fallback={<p className="meta">{t.mapLoading}</p>}>
            <IndiaLocator place={mapPlace} onPlaceChange={onMapPlace} />
          </Suspense>
        )}
      </details>

      {captured.length > 0 && (
        <div className="passbook-gps" role="group" aria-label={t.gpGroup}>
          {captured.map((village) => (
            <button
              key={village.gp.code}
              type="button"
              className="passbook-gp"
              aria-pressed={village.name === selection.village}
              onClick={() => pick({ village: village.name })}
            >
              <span className="passbook-gp-name">{village.gp.name}</span>
              <span className="passbook-gp-hi">{village.name === selection.village ? t.gpOpen : t.gpPassbook}</span>
              <span className="passbook-gp-meta">{t.gpMeta(village.block, village.gp.code)}</span>
            </button>
          ))}
        </div>
      )}

      {docBusy && (
        <p className="meta khata-busy" role="status">{t.recordReading}</p>
      )}

      {docError && (
        <p className="locator-problem" role="status">
          {t.recordError(docError)}
        </p>
      )}

      {!docBusy && !doc && !docError && selectedVillage && (
        <div className="card khata-empty">
          <h3>{t.emptyTitle(selectedVillage.name)}</h3>
          <p>{t.emptyBody(captured.length, districtName)}</p>
          <p className="meta" style={{ marginBottom: 0 }}>
            {t.emptyChoose}{' '}
            <a href="https://egramswaraj.gov.in" target="_blank" rel="noreferrer">
              eGramSwaraj
            </a>
          </p>
        </div>
      )}

      {doc && <PassbookRecord doc={doc} lang={lang} />}
    </section>
  );
}

// The record itself. Everything below is the captured document; when the
// picker has none, this is not rendered at all.
function PassbookRecord({ doc, lang }) {
  const [shareNote, setShareNote] = useState('');
  const [questionNote, setQuestionNote] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [flyerBusy, setFlyerBusy] = useState(false);
  const t = copyFor(lang);
  // The record is one language at a time. These wrappers keep every figure and
  // date on the same locale without threading `lang` through each call site.
  const rupees = (value) => formatRupees(value, lang);
  const dateLabel = (iso) => formatDate(iso, lang);
  const schemeName = (scheme) => formatScheme(scheme, lang);
  const compactRupees = (value) => formatCompactRupees(value, lang);
  const gp = doc.gp;
  const finance = gp.finance;
  const { totals, xvfc, months, reconciliation } = finance;
  const works = gp.works;
  const hasScheme = works.some((work) => work.scheme);
  // When the official completed-work report is unavailable, the rows are
  // status-176 plan activities. Those include wages and administrative
  // expenses, so the page calls them activities rather than works.
  const planApi = gp.worksSource === 'plan-api';
  // The contact card is specific to the pilot block. When the capture grows,
  // this must become a lookup rather than a copy of this condition.
  const pilotContacts = doc.block.name === 'Doiwala' && doc.district.name === 'Dehradun';
  const maxMonth = Math.max(1, ...months.flatMap((month) => [month.receipts, month.payments]));
  const topReceipt = months.reduce((best, month) => (month.receipts > best.receipts ? month : best), months[0]);
  const topPayment = months.reduce((best, month) => (month.payments > best.payments ? month : best), months[0]);
  const worksReportUrl = `https://egramswaraj.gov.in/physicalprogressReport.do?statecd=${doc.state.code}&fyear=${doc.year}&gpcd=${gp.code}&wrkstts=176`;
  const worksLink = planApi ? gp.worksUrl : worksReportUrl;
  const worksLinkLabel = t.checkWorks(planApi);

  const questions = buildQuestions(doc, { lang });
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
  const shareText = buildShareText(doc, { url: shareUrl, lang });
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const rtiText = buildRtiText(doc, { lang });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareNote(t.linkCopied);
    } catch {
      setShareNote(t.copyThis(shareUrl));
    }
  };

  const copyQuestions = async () => {
    try {
      await navigator.clipboard.writeText(questions.map((question, index) => `${index + 1}. ${question}`).join('\n'));
      setQuestionNote(t.questionsCopied);
    } catch {
      setQuestionNote(t.copyThis(questions.join(' ')));
    }
  };

  const copyRti = async () => {
    try {
      await navigator.clipboard.writeText(rtiText);
      setQuestionNote(t.rtiCopied);
    } catch {
      setQuestionNote(t.copyThis(rtiText));
    }
  };

  // The flyer is always Hindi, even when the page is being read in English:
  // it is made for the village WhatsApp group. The button sits with the
  // questions because the image carries the first three of them.
  const downloadFlyer = async (variant = 'color') => {
    if (flyerBusy) return;
    setFlyerBusy(true);
    setQuestionNote(t.flyerBusy);
    try {
      const blob = await buildFlyerPng(doc, { url: shareUrl, variant });
      const suffix = variant === 'print' ? 'print' : 'flyer';
      downloadFile(`khata-${gp.code}-${suffix}.png`, blob, 'image/png');
      setQuestionNote(variant === 'print' ? t.printFlyerReady : t.flyerReady);
    } catch {
      setQuestionNote(t.flyerFailed);
    } finally {
      setFlyerBusy(false);
    }
  };

  // Speech is an enhancement, not the only way to read the page. The button
  // says so when the browser has no speech engine, and the questions stay on
  // screen either way.
  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setQuestionNote(t.listenUnsupported);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(questions.join('. '));
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return (
    <>
      <div className="passbook-banner">
        <span className="passbook-kicker">{t.capturedRecord}</span>
        <span>
          {t.recordMeta(
            doc.block.name,
            doc.district.name,
            doc.state.name,
            doc.year,
            dateLabel(doc.generatedAt.slice(0, 10)),
          )}
        </span>
      </div>

      <div className="passbook-id">
        <div>
          <h3>
            {gp.name} <span className="passbook-hi" lang="hi">{gp.nameHi}</span>
          </h3>
          <p>{t.gpLine(doc.block.name, doc.district.name, doc.state.name)}</p>
          <p className="meta">
            {titleCase(gp.profile.address) || `${t.address} ${t.notPublished}`} · {t.pin} {gp.profile.pin || t.notPublished}
            {' · '}{t.sarpanch} {titleCase(gp.profile.sarpanch)} · {t.secretary} {titleCase(gp.profile.secretary)}
          </p>
        </div>
        <div className="passbook-actions">
          <div className="btn-row">
            <a className="btn btn-secondary" href={gp.profileUrl} target="_blank" rel="noreferrer">
              {t.officialProfile}
            </a>
            <button type="button" className="btn btn-secondary" onClick={copyLink}>
              {t.copyLink}
            </button>
            <a
              className="btn btn-secondary"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              {t.whatsapp}
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              {t.print}
            </button>
          </div>
          {shareNote && <p className="meta passbook-share-note">{shareNote}</p>}
        </div>
      </div>

      <section className="passbook-section" aria-labelledby="passbook-money">
        <h3 id="passbook-money">{t.moneyHeading}</h3>
        <p className="section-strap">{t.moneyStrap(doc.year)}</p>

        <div className="stat-grid passbook-stats">
          <div className="stat">
            <span className="stat-num">{rupees(totals.receipts)}</span>
            <span className="stat-label">{t.received(doc.year)}</span>
            <span className="passbook-stat-sub">{t.receivedSub(totals.schemeCount)}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{rupees(totals.payments)}</span>
            <span className="stat-label">{t.paid(doc.year)}</span>
            <span className="passbook-stat-sub">
              {t.paidSub(shareOf(totals.payments, totals.receipts), totals.payments > totals.receipts)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-num">{rupees(xvfc.closing)}</span>
            <span className="stat-label">{t.xvfcBalance(String(doc.year).slice(-4))}</span>
            <span className="passbook-stat-sub">
              {t.xvfcSub(rupees(xvfc.opening), rupees(xvfc.receipts), rupees(xvfc.payments))}
            </span>
          </div>
          <div className="stat">
            <span className="stat-num">{gp.worksSummary.count}</span>
            <span className="stat-label">{t.completed(planApi)}</span>
            <span className="passbook-stat-sub">
              {t.completedSub(
                rupees(gp.worksSummary.approvedCost),
                gp.worksSummary.latestCompletion ? dateLabel(gp.worksSummary.latestCompletion) : '',
              )}
            </span>
          </div>
        </div>

        {/* The four rows use XVFC because it is the only scheme whose opening
            balance is published. The gap line explains the all-scheme cash
            flow without inventing an opening balance for the other schemes. */}
        <div className="passbook-plain">
          <h4>{t.plainHeading}</h4>
          <p className="fine-print">{t.plainIntro}</p>
          <dl className="passbook-plain-grid">
            <div><dt>{t.plainEarlier}</dt><dd>{rupees(xvfc.opening)}</dd></div>
            <div><dt>{t.plainCame}</dt><dd>{rupees(xvfc.receipts)}</dd></div>
            <div><dt>{t.plainPaid}</dt><dd>− {rupees(xvfc.payments)}</dd></div>
            <div><dt>{t.plainLeft}</dt><dd>{rupees(xvfc.closing)}</dd></div>
          </dl>
          {totals.payments > totals.receipts && (
            <p className="fine-print passbook-plain-gap">
              {t.plainGap(rupees(totals.payments - totals.receipts))}
            </p>
          )}
        </div>

        <div className="passbook-table-wrap">
          <table className="data-table passbook-ledger">
            <caption className="visually-hidden">
              {t.tableCaption(gp.name, doc.year)}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t.tableScheme}</th>
                <th scope="col" className="data-num">{t.tableOpening}</th>
                <th scope="col" className="data-num">{t.tableReceived}</th>
                <th scope="col" className="data-num">{t.tablePaid}</th>
                <th scope="col" className="data-num">{t.tableClosing}</th>
              </tr>
            </thead>
            <tbody>
              {finance.schemes.map((scheme) => (
                <tr key={scheme.code}>
                  <th scope="row">
                    {schemeName(scheme)}
                    <span className="table-sub">{scheme.abbr || '—'} · {t.schemeCode} {scheme.code}</span>
                  </th>
                  <td className="data-num">{scheme.opening == null ? '—' : rupees(scheme.opening)}</td>
                  <td className="data-num">{rupees(scheme.receipts)}</td>
                  <td className="data-num">{rupees(scheme.payments)}</td>
                  <td className="data-num">{scheme.closing == null ? '—' : rupees(scheme.closing)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t.allSchemes}</th>
                <td>—</td>
                <td className="data-num">{rupees(totals.receipts)}</td>
                <td className="data-num">{rupees(totals.payments)}</td>
                <td>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="fine-print passbook-table-note">
          <span className="passbook-wide-note">{t.tableNoteWide}{' '}</span>
          <span className="passbook-mobile-note">{t.tableNoteMobile}{' '}</span>
          {t.tableNoteNegative}
        </p>

        <p className={reconciliation.closingDelta === 0 ? 'passbook-check' : 'passbook-check passbook-check-warn'}>
          {reconciliation.closingDelta === 0
            ? t.reconciles(rupees(xvfc.opening), rupees(xvfc.receipts), rupees(xvfc.payments), rupees(xvfc.closing))
            : t.reconcileWarn(rupees(Math.abs(reconciliation.closingDelta)))}
        </p>

        <h4>{t.whenMoved}</h4>
        <p className="fine-print">
          {t.whenMovedText(
            monthLong(topReceipt.label, lang),
            rupees(topReceipt.receipts),
            monthLong(topPayment.label, lang),
            rupees(topPayment.payments),
          )}
        </p>
        <div className="passbook-chart-frame">
          <div className="passbook-chart-scale" aria-hidden="true">
            <span>{compactRupees(maxMonth)}</span>
            <span>{compactRupees(maxMonth / 2)}</span>
            <span>₹0</span>
          </div>
          <div
            className="passbook-chart"
            role="img"
            aria-label={t.chartAria(gp.name, months
              .map((month) => `${monthName(month.label, lang)}: ${t.receivedShort} ${rupees(month.receipts)}, ${t.paidShort} ${rupees(month.payments)}`)
              .join('. '))}
          >
            {months.map((month) => (
              <div className="passbook-chart-month" key={month.label}>
                <div className="passbook-bars">
                  <span
                    className="passbook-bar passbook-bar-in"
                    style={{
                      height: `${(month.receipts / maxMonth) * 100}%`,
                      minHeight: month.receipts > 0 ? '2px' : 0,
                    }}
                    title={`${monthName(month.label, lang)}: ${t.receivedShort} ${rupees(month.receipts)}`}
                  />
                  <span
                    className="passbook-bar passbook-bar-out"
                    style={{
                      height: `${(month.payments / maxMonth) * 100}%`,
                      minHeight: month.payments > 0 ? '2px' : 0,
                    }}
                    title={`${monthName(month.label, lang)}: ${t.paidShort} ${rupees(month.payments)}`}
                  />
                </div>
                <span className="passbook-chart-label">{monthName(month.label, lang)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="passbook-legend" aria-hidden="true">
          <span><i className="passbook-swatch passbook-swatch-in" /> {t.receivedShort}</span>
          <span><i className="passbook-swatch passbook-swatch-out" /> {t.paidShort}</span>
        </div>
        <details className="passbook-details">
          <summary>{t.monthTable}</summary>
          <div className="passbook-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t.month}</th>
                  <th scope="col" className="data-num">{t.receivedShort}</th>
                  <th scope="col" className="data-num">{t.paidShort}</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.label}>
                    <th scope="row">{monthName(month.label, lang)}</th>
                    <td className="data-num">{rupees(month.receipts)}</td>
                    <td className="data-num">{rupees(month.payments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="passbook-section" aria-labelledby="passbook-works">
        <h3 id="passbook-works">{t.worksHeading}</h3>
        <p className="section-strap">
          {t.worksStrap(
            gp.worksSummary.count,
            rupees(gp.worksSummary.approvedCost),
            String(doc.year).slice(-4),
            t.completedNoun(planApi),
            t.completedOne(planApi),
          )}
        </p>

        {gp.worksSource === 'plan-api' && (
          <p className="passbook-fallback">
            <strong>{t.worksSourceNote}</strong>{' '}
            <span lang="en">{gp.worksNote}</span> {t.worksSourceTail}
          </p>
        )}

        {works.length ? (
          <div className="passbook-table-wrap">
            <table className="data-table passbook-works">
              <caption className="visually-hidden">
                {t.worksCaption(planApi, gp.name, doc.year)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{planApi ? t.worksActivity : t.worksWork}</th>
                  {hasScheme && <th scope="col">{t.worksScheme}</th>}
                  <th scope="col" className="data-num">{t.worksCost}</th>
                  <th scope="col">{t.worksCompleted}</th>
                </tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work.activityCode}>
                    <th scope="row">
                      <span lang="en">{work.name}</span>
                      <span className="table-sub">
                        {t.activityCode} {work.activityCode}
                        {work.focusArea ? ` · ${work.focusArea}` : ''}
                      </span>
                    </th>
                    {hasScheme && <td>{work.scheme || t.worksNotStated}</td>}
                    <td className="data-num">
                      {work.approvedCost == null ? t.worksNotStated : rupees(work.approvedCost)}
                    </td>
                    <td>{dateLabel(work.completedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="passbook-fallback">
            {t.worksNone(planApi ? t.worksActivity : t.worksWork)}
          </p>
        )}

        <p className="fine-print passbook-table-note">
          <a href={worksLink} target="_blank" rel="noreferrer">
            {worksLinkLabel}
          </a>{' '}
          · {t.worksFine(gp.worksSummary.pricedCount, works.length)}
        </p>
        <p className="fine-print passbook-location-note">{t.worksLocation}</p>
      </section>

      <div className="grid grid-2 passbook-ask">
        <article className="card">
          <h3>{t.questionsHeading}</h3>
          <p className="meta">{t.questionsStrap}</p>
          <ol className="passbook-questions">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
          <div className="passbook-question-actions">
            <button type="button" className="btn btn-secondary" onClick={toggleSpeech} aria-pressed={speaking}>
              {speaking ? t.stopListening : t.listen}
            </button>
            <button type="button" className="btn btn-secondary" onClick={copyQuestions}>
              {t.copyQuestions}
            </button>
            <a className="btn btn-secondary" href={whatsappHref} target="_blank" rel="noreferrer">
              {t.whatsappShare}
            </a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadFlyer('color')}
              disabled={flyerBusy}
              aria-busy={flyerBusy}
            >
              {t.flyerButton}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadFlyer('print')}
              disabled={flyerBusy}
              aria-busy={flyerBusy}
            >
              {t.printFlyerButton}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadFile('khata-rti.txt', rtiText, 'text/plain;charset=utf-8')}
            >
              {t.rtiButton}
            </button>
            <button type="button" className="btn btn-secondary" onClick={copyRti}>
              {t.copyRti}
            </button>
          </div>
          {questionNote && <p className="meta passbook-question-note" role="status">{questionNote}</p>}
        </article>

        <article className="card">
          <h3>{t.vendorsHeading}</h3>
          <p>{t.vendorsBody(gp.vendors.total, gp.vendors.accepted, gp.vendors.rejected)}</p>
          <ul className="passbook-vendor-list">
            {gp.vendors.byType.map((type) => (
              <li key={type.type}>
                {t.vendorTypes[type.type] || type.type}: {t.vendorLine(type.total, type.accepted, type.rejected)}
              </li>
            ))}
          </ul>
          <p className="fine-print">{t.vendorsFine}</p>
          <p className="fine-print">{t.vendorNames}</p>
        </article>
      </div>

      <section className="passbook-section" aria-labelledby="passbook-escalation">
        <h3 id="passbook-escalation">{t.escalationHeading}</h3>
        <p className="section-strap">{t.escalationStrap}</p>
        <ol className="passbook-steps">
          <li>{t.escalationStep1}</li>
          <li>{t.escalationStep2}</li>
          <li>{t.escalationStep3}</li>
          <li>{t.escalationStep4}</li>
        </ol>
        <div className="passbook-contacts">
          {pilotContacts && (
            <article className="card passbook-contact">
              <h4>{t.blockRole}</h4>
              <p>{PILOT_CONTACTS.block.address}</p>
              <p>
                {t.email}:{' '}
                <a href={`mailto:${PILOT_CONTACTS.block.email}`}>{PILOT_CONTACTS.block.email}</a>
              </p>
            </article>
          )}
          {pilotContacts && (
            <article className="card passbook-contact">
              <h4>{t.districtRole}</h4>
              <p>{PILOT_CONTACTS.district.address}</p>
              <p>
                {t.email}:{' '}
                <a href={`mailto:${PILOT_CONTACTS.district.email}`}>{PILOT_CONTACTS.district.email}</a>
              </p>
              <p>
                {t.phone}:{' '}
                <a href={`tel:${PILOT_CONTACTS.district.phone}`}>{PILOT_CONTACTS.district.phone}</a>
                {' · '}
                <a href={`tel:${PILOT_CONTACTS.district.mobile}`}>{PILOT_CONTACTS.district.mobile}</a>
              </p>
            </article>
          )}
          <article className="card passbook-contact">
            <h4>{t.helplineRole}</h4>
            <p><a href={`tel:${PILOT_CONTACTS.helpline.phone}`}>{PILOT_CONTACTS.helpline.phone}</a></p>
            <p><a href={PILOT_CONTACTS.helpline.url} target="_blank" rel="noreferrer">{PILOT_CONTACTS.helpline.url}</a></p>
          </article>
          <article className="card passbook-contact">
            <h4>{t.rtiRole}</h4>
            <p><a href={PILOT_CONTACTS.rti.url} target="_blank" rel="noreferrer">{PILOT_CONTACTS.rti.url}</a></p>
          </article>
        </div>
        <p className="fine-print">
          {t.escalationSource}{' '}
          <a href={PILOT_CONTACTS.directory} target="_blank" rel="noreferrer">{t.openDirectory}</a>
        </p>
      </section>

      <section className="passbook-section" id="passbook-method" aria-labelledby="passbook-method-heading">
        <h3 id="passbook-method-heading">{t.methodHeading}</h3>
        <div className="grid grid-2">
          <div>
            <h4>{t.howToRead}</h4>
            <ul className="method-list">
              <li>{t.method1(doc.year)}</li>
              <li>{t.method2}</li>
              <li>{t.method3}</li>
              <li>{t.method4}</li>
            </ul>
          </div>
          <div>
            <h4>{t.cannotHeading}</h4>
            {lang === 'hi' && <p className="fine-print">{t.caveatsNote}</p>}
            <ul className="method-list" lang="en">
              {doc.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        </div>

        <details className="passbook-details">
          <summary>{t.sourcesSummary(doc.sources.length)}</summary>
          <ul className="passbook-source-list">
            {doc.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
                <span className="meta">
                  {' '}· {source.retrievedAt.slice(0, 10)} · {Math.max(1, Math.round(source.bytes / 1024))} KB
                </span>
                <br />
                <code>{source.sha256}</code>
              </li>
            ))}
          </ul>
        </details>

        <p className="fine-print passbook-provenance">
          {t.provenance(
            doc.dataHash,
            dateLabel(doc.generatedAt.slice(0, 10)),
            doc.collection?.requests ?? 0,
            doc.captured ?? 0,
          )}
        </p>
      </section>
    </>
  );
}
