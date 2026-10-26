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

// The map is the same drill-down Sampark uses. It is loaded only when the
// reader opens it, and its State chunks arrive one State at a time.
const IndiaLocator = lazy(() => import('../components/IndiaLocator'));

// The pilot's first page: one live GP, so a reader who lands without a link
// sees a real record rather than an empty picker.
const PILOT_STATE = 'Uttarakhand';
const PILOT_DISTRICT = 'Dehradun';

const SCHEME_NAMES = {
  3287: '15th Finance Commission',
  2813: '14th Finance Commission',
  3109: '4th State Finance Commission',
  0: 'Own resources',
};

const rupees = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return 'Not published';
  return `₹${Math.round(Number(value)).toLocaleString('en-IN')}`;
};

const dateLabel = (iso) => {
  if (!iso) return 'Not published';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const shareOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const titleCase = (text) => String(text || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const schemeName = (scheme) => SCHEME_NAMES[scheme.code] || scheme.name;

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
    <section className="passbook">
      <PageHead
        eyebrow="The village money tool"
        title="Khata"
        question="Where did the village’s money go?"
      >
        A Gram Panchayat’s record, read the way a household reads a passbook:
        what came in, what went out, what is left in the 15th Finance Commission
        account, and what the GP says it completed. Choose a State, a district
        and a village; if a passbook has been captured for that village’s Gram
        Panchayat, the record opens below with every source hashed.
      </PageHead>

      <div className="khata-picker card">
        <div className="khata-fields">
          <label className="khata-field" htmlFor="khata-state">
            <span>State</span>
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
            <span>District</span>
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
            <span>Village</span>
            <select
              id="khata-village"
              value={selection.village || ''}
              disabled={!villages.length}
              onChange={(event) => pick({ village: event.target.value })}
            >
              {villages.map((village, index) => (
                <option key={`${village.blockId}-${village.name}-${index}`} value={village.name}>
                  {village.name} — {village.block} block{village.gp ? ' · passbook' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="meta khata-count">
          {stateName && districtName
            ? `${districtName}, ${stateName} · ${villages.length.toLocaleString('en-IN')} villages · ${captured.length} with a captured passbook`
            : 'Reading the directory…'}
        </p>

        {listError && (
          <p className="locator-problem" role="status">
            The directory could not be read: {listError}
          </p>
        )}
      </div>

      <details
        className="khata-map"
        onToggle={(event) => setMapOpen(event.currentTarget.open)}
      >
        <summary>Or find the village on the map</summary>
        {mapOpen && (
          <Suspense fallback={<p className="meta">Loading the map of India…</p>}>
            <IndiaLocator place={mapPlace} onPlaceChange={onMapPlace} />
          </Suspense>
        )}
      </details>

      {captured.length > 0 && (
        <div className="passbook-gps" role="group" aria-label="Gram Panchayats with a captured passbook in this district">
          {captured.map((village) => (
            <button
              key={village.gp.code}
              type="button"
              className="passbook-gp"
              aria-pressed={village.name === selection.village}
              onClick={() => pick({ village: village.name })}
            >
              <span className="passbook-gp-name">{village.gp.name}</span>
              <span className="passbook-gp-hi">{village.name === selection.village ? 'Open now' : 'Gram Panchayat passbook'}</span>
              <span className="passbook-gp-meta">{village.block} block · GP {village.gp.code}</span>
            </button>
          ))}
        </div>
      )}

      {docBusy && (
        <p className="meta khata-busy" role="status">Reading the Gram Panchayat’s record…</p>
      )}

      {docError && (
        <p className="locator-problem" role="status">
          The passbook could not be read: {docError}
        </p>
      )}

      {!docBusy && !doc && !docError && selectedVillage && (
        <div className="card khata-empty">
          <h3>No passbook captured for {selectedVillage.name} yet</h3>
          <p>
            The directory covers every village in the Local Government Directory.
            Passbooks are captured one Gram Panchayat at a time from its public
            eGramSwaraj returns, and there {captured.length === 1 ? 'is' : 'are'}{' '}
            {captured.length} captured in {districtName || 'this district'}.
          </p>
          <p className="meta" style={{ marginBottom: 0 }}>
            Choose one of the captured GPs above, or read the GP’s own profile
            on{' '}
            <a href="https://egramswaraj.gov.in" target="_blank" rel="noreferrer">
              eGramSwaraj
            </a>
            .
          </p>
        </div>
      )}

      {doc && <PassbookRecord doc={doc} />}
    </section>
  );
}

// The record itself. Everything below is the captured document; when the
// picker has none, this is not rendered at all.
function PassbookRecord({ doc }) {
  const [shareNote, setShareNote] = useState('');
  const gp = doc.gp;
  const finance = gp.finance;
  const { totals, xvfc, months, reconciliation } = finance;
  const works = gp.works;
  const hasScheme = works.some((work) => work.scheme);
  // When the official completed-work report is unavailable, the rows are
  // status-176 plan activities. Those include wages and administrative
  // expenses, so the page calls them activities rather than works.
  const planApi = gp.worksSource === 'plan-api';
  const completedNoun = planApi ? 'completed plan activities' : 'completed works';
  const completedOne = planApi ? 'activity' : 'work';

  const maxMonth = Math.max(1, ...months.flatMap((month) => [month.receipts, month.payments]));
  const topReceipt = months.reduce((best, month) => (month.receipts > best.receipts ? month : best), months[0]);
  const topPayment = months.reduce((best, month) => (month.payments > best.payments ? month : best), months[0]);
  const largestScheme = finance.schemes.reduce(
    (best, scheme) => (scheme.payments > best.payments ? scheme : best),
    finance.schemes[0],
  );

  const worksReportUrl = `https://egramswaraj.gov.in/physicalprogressReport.do?statecd=${doc.state.code}&fyear=${doc.year}&gpcd=${gp.code}&wrkstts=176`;
  const worksLink = planApi ? gp.worksUrl : worksReportUrl;
  const worksLinkLabel = planApi ? 'Check the plan API rows' : 'Check the official completed-work list';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareNote('Link copied. Send it to the Sarpanch, the ward member, or the next Gram Sabha.');
    } catch {
      setShareNote(`Copy this address: ${window.location.href}`);
    }
  };

  const questions = [
    `The GP received ${rupees(totals.receipts)} across ${totals.schemeCount} schemes and paid out ${rupees(totals.payments)} in ${doc.year}. Which ${planApi ? 'activities' : 'works'} and bills do those payments cover?`,
    `${rupees(xvfc.closing)} of 15th Finance Commission money was still in the GP's account at 31 March ${String(doc.year).slice(-4)}. What is it committed to, and when will it be spent?`,
    largestScheme && largestScheme.payments > 0
      ? `The largest scheme payment is ${schemeName(largestScheme)} at ${rupees(largestScheme.payments)}. Which ${completedOne} or bill does it settle?`
      : null,
    works.length
      ? `The GP records ${works.length} ${completedNoun} worth ${rupees(gp.worksSummary.approvedCost)}. Can the Sabha see the bills, measurement books and geotags for each?`
      : null,
    gp.vendors.rejected
      ? `${gp.vendors.rejected} vendor registrations were rejected. What was the reason, and was the vendor told in writing?`
      : null,
    `Which of these ${planApi ? 'activities' : 'works'} was approved in the Gram Sabha, and which was added later?`,
  ].filter(Boolean);

  return (
    <>
      <div className="passbook-banner">
        <span className="passbook-kicker">Captured record</span>
        <span>
          {doc.block.name} block, {doc.district.name} district, {doc.state.name} ·
          budget year {doc.year} · captured {dateLabel(doc.generatedAt.slice(0, 10))}
        </span>
      </div>

      <div className="passbook-id">
        <div>
          <h3>
            {gp.name} <span className="passbook-hi">{gp.nameHi}</span>
          </h3>
          <p>
            Gram Panchayat · {doc.block.name} block · {doc.district.name} district,{' '}
            {doc.state.name}
          </p>
          <p className="meta">
            {titleCase(gp.profile.address) || 'Address not published'} · PIN {gp.profile.pin || 'not published'}
            {' · '}Sarpanch {titleCase(gp.profile.sarpanch)} · Secretary {titleCase(gp.profile.secretary)}
          </p>
        </div>
        <div className="passbook-actions">
          <div className="btn-row">
            <a className="btn btn-secondary" href={gp.profileUrl} target="_blank" rel="noreferrer">
              Official GP profile
            </a>
            <button type="button" className="btn btn-secondary" onClick={copyLink}>
              Copy link
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              Print this page
            </button>
          </div>
          {shareNote && <p className="meta passbook-share-note">{shareNote}</p>}
        </div>
      </div>

      <section className="passbook-section" aria-labelledby="passbook-money">
        <h3 id="passbook-money">The money, in one place</h3>
        <p className="section-strap">
          Receipts and payments are cash flows for {doc.year}. They are not
          a budget, and a payment can settle a bill from an earlier year.
        </p>

        <div className="stat-grid passbook-stats">
          <div className="stat">
            <span className="stat-num">{rupees(totals.receipts)}</span>
            <span className="stat-label">Received in {doc.year}</span>
            <span className="passbook-stat-sub">Across {totals.schemeCount} schemes</span>
          </div>
          <div className="stat">
            <span className="stat-num">{rupees(totals.payments)}</span>
            <span className="stat-label">Paid out in {doc.year}</span>
            <span className="passbook-stat-sub">
              {shareOf(totals.payments, totals.receipts)}% of receipts
              {totals.payments > totals.receipts ? ' · more paid than received' : ''}
            </span>
          </div>
          <div className="stat">
            <span className="stat-num">{rupees(xvfc.closing)}</span>
            <span className="stat-label">15th FC balance at 31 March {String(doc.year).slice(-4)}</span>
            <span className="passbook-stat-sub">
              Opening {rupees(xvfc.opening)} + received {rupees(xvfc.receipts)} − paid{' '}
              {rupees(xvfc.payments)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-num">{gp.worksSummary.count}</span>
            <span className="stat-label">
              {planApi ? 'Completed plan activities' : 'Completed works'} on record
            </span>
            <span className="passbook-stat-sub">
              {rupees(gp.worksSummary.approvedCost)} recorded cost
              {gp.worksSummary.latestCompletion
                ? ` · latest ${dateLabel(gp.worksSummary.latestCompletion)}`
                : ''}
            </span>
          </div>
        </div>

        <div className="passbook-table-wrap">
          <table className="data-table passbook-ledger">
            <caption className="visually-hidden">
              Scheme-wise receipts and payments for {gp.name}, {doc.year}
            </caption>
            <thead>
              <tr>
                <th scope="col">Scheme</th>
                <th scope="col">Opening</th>
                <th scope="col">Received</th>
                <th scope="col">Paid out</th>
                <th scope="col">Closing</th>
              </tr>
            </thead>
            <tbody>
              {finance.schemes.map((scheme) => (
                <tr key={scheme.code}>
                  <th scope="row">
                    {schemeName(scheme)}
                    <span className="table-sub">{scheme.abbr || '—'} · scheme code {scheme.code}</span>
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
                <th scope="row">All schemes</th>
                <td>—</td>
                <td className="data-num">{rupees(totals.receipts)}</td>
                <td className="data-num">{rupees(totals.payments)}</td>
                <td>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="fine-print passbook-table-note">
          <span className="passbook-wide-note">
            A dash means the public report does not state an opening or closing
            balance for that scheme. Only the 15th Finance Commission ledger
            publishes one.{' '}
          </span>
          <span className="passbook-mobile-note">
            Opening and closing balances are hidden on small screens; the 15th
            FC balance is shown above.
          </span>
          A negative difference between receipts and payments is not
          overspending: the payments were met from a balance built before this
          year, or the two reports do not line up.
        </p>

        <p className={reconciliation.closingDelta === 0 ? 'passbook-check' : 'passbook-check passbook-check-warn'}>
          {reconciliation.closingDelta === 0
            ? `The 15th FC balance reconciles exactly: ${rupees(xvfc.opening)} opening + ${rupees(xvfc.receipts)} received − ${rupees(xvfc.payments)} paid = ${rupees(xvfc.closing)}.`
            : `The 15th FC balance does not reconcile by ${rupees(Math.abs(reconciliation.closingDelta))}. Read the official ledger before relying on the closing figure.`}
        </p>

        <h4>When the money moved</h4>
        <p className="fine-print">
          The largest receipt month was {topReceipt.label} ({rupees(topReceipt.receipts)});
          the largest payment month was {topPayment.label} ({rupees(topPayment.payments)}).
        </p>
        <div
          className="passbook-chart"
          role="img"
          aria-label={`Monthly receipts and payments for ${gp.name}. ${months
            .map((month) => `${month.label}: received ${rupees(month.receipts)}, paid ${rupees(month.payments)}`)
            .join('. ')}`}
        >
          {months.map((month) => (
            <div className="passbook-chart-month" key={month.label}>
              <div className="passbook-bars">
                <span
                  className="passbook-bar passbook-bar-in"
                  style={{
                    height: `${(month.receipts / maxMonth) * 100}%`,
                    minHeight: month.receipts > 0 ? '1px' : 0,
                  }}
                  title={`${month.label}: received ${rupees(month.receipts)}`}
                />
                <span
                  className="passbook-bar passbook-bar-out"
                  style={{
                    height: `${(month.payments / maxMonth) * 100}%`,
                    minHeight: month.payments > 0 ? '1px' : 0,
                  }}
                  title={`${month.label}: paid ${rupees(month.payments)}`}
                />
              </div>
              <span className="passbook-chart-label">{month.label}</span>
            </div>
          ))}
        </div>
        <div className="passbook-legend" aria-hidden="true">
          <span><i className="passbook-swatch passbook-swatch-in" /> Received</span>
          <span><i className="passbook-swatch passbook-swatch-out" /> Paid out</span>
        </div>
        <details className="passbook-details">
          <summary>Month-by-month table</summary>
          <div className="passbook-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Received</th>
                  <th scope="col">Paid out</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.label}>
                    <th scope="row">{month.label}</th>
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
        <h3 id="passbook-works">What the GP says it completed</h3>
        <p className="section-strap">
          {gp.worksSummary.count} {planApi ? 'activities marked completed' : 'works on the completed register'}, with{' '}
          {rupees(gp.worksSummary.approvedCost)} recorded cost. This is the GP’s
          current list, not a year-end snapshot: a date after 31 March {String(doc.year).slice(-4)}
          {' '}means the {completedOne} was finished later but is still on the list.
        </p>

        {gp.worksSource === 'plan-api' && (
          <p className="passbook-fallback">
            <strong>Source note.</strong> {gp.worksNote} The table therefore
            omits the funding scheme and the approved cost can differ from the
            GP’s completed-work report after technical sanction.
          </p>
        )}

        {works.length ? (
          <div className="passbook-table-wrap">
            <table className="data-table passbook-works">
              <caption className="visually-hidden">
                {planApi ? 'Completed plan activities' : 'Completed works'} reported for {gp.name}, {doc.year}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{planApi ? 'Activity' : 'Work'}</th>
                  {hasScheme && <th scope="col">Scheme</th>}
                  <th scope="col">Recorded cost</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work.activityCode}>
                    <th scope="row">
                      {work.name}
                      <span className="table-sub">
                        Activity {work.activityCode}
                        {work.focusArea ? ` · ${work.focusArea}` : ''}
                      </span>
                    </th>
                    {hasScheme && <td>{work.scheme || 'Not stated'}</td>}
                    <td className="data-num">
                      {work.approvedCost == null ? 'Not stated' : rupees(work.approvedCost)}
                    </td>
                    <td>{dateLabel(work.completedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="passbook-fallback">
            No completed {planApi ? 'plan activities' : 'works'} could be retrieved for this GP at capture time.
          </p>
        )}

        <p className="fine-print passbook-table-note">
          <a href={worksLink} target="_blank" rel="noreferrer">
            {worksLinkLabel}
          </a>{' '}
          · {gp.worksSummary.pricedCount} of {works.length} rows carry a cost.
          The passbook does not verify {planApi ? 'an activity' : 'a work'} on the
          ground, its quality, or its geotag. The exact response read is listed
          in the source records below.
        </p>
      </section>

      <div className="grid grid-2 passbook-ask">
        <article className="card">
          <h3>Questions for the next Gram Sabha</h3>
          <p className="meta">
            A passbook is only useful if it is read aloud. These questions are
            generated from this GP’s own figures.
          </p>
          <ol className="passbook-questions">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </article>

        <article className="card">
          <h3>Who is registered to be paid</h3>
          <p>
            <strong>{gp.vendors.total}</strong> vendor registrations on the GP
            profile: <strong>{gp.vendors.accepted}</strong> accepted and{' '}
            <strong>{gp.vendors.rejected}</strong> rejected.
          </p>
          <ul className="passbook-vendor-list">
            {gp.vendors.byType.map((type) => (
              <li key={type.type}>
                {type.type}: {type.total} ({type.accepted} accepted, {type.rejected} rejected)
              </li>
            ))}
          </ul>
          <p className="fine-print">
            A registration is not a payment. This list does not say who was
            paid, how much, or for which {completedOne}. No vendor names are
            published here.
          </p>
        </article>
      </div>

      <section className="passbook-section" id="passbook-method" aria-labelledby="passbook-method-heading">
        <h3 id="passbook-method-heading">Method, sources and what this cannot tell you</h3>
        <div className="grid grid-2">
          <div>
            <h4>How to read it</h4>
            <ul className="method-list">
              <li>
                Received and paid out are cash flows for {doc.year}, taken
                from the GP’s scheme-wise monthly returns on eGramSwaraj.
              </li>
              <li>
                The 15th Finance Commission balance is the only closing balance
                this public report states. A dash in the ledger means the report
                is silent, not that the balance is zero.
              </li>
              <li>
                Completed rows are the GP’s completed-work register, or
                status-176 plan activities where that report did not answer.
                Cost is the recorded cost, not a bill paid, and the list can
                include an activity finished after the budget year.
              </li>
              <li>
                The record is served from the places database, seeded from the
                capture in <code>src/data/passbook/</code>. Re-run{' '}
                <code>node scripts/collect-passbook.mjs</code> to read the
                public reports again.
              </li>
            </ul>
          </div>
          <div>
            <h4>What it cannot tell you</h4>
            <ul className="method-list">
              {doc.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        </div>

        <details className="passbook-details">
          <summary>Source records and hashes ({doc.sources.length})</summary>
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
          Data hash <code>{doc.dataHash}</code> · collected{' '}
          {dateLabel(doc.generatedAt.slice(0, 10))} · {doc.collection?.requests ?? 0}{' '}
          public requests · {doc.captured ?? 0} Gram Panchayats. This is a
          reading aid, not an audit. It reads what the GP recorded; it does not
          certify what happened on the ground.
        </p>
      </section>
    </>
  );
}
