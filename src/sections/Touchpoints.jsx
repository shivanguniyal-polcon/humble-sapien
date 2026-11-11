import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { policies } from '../data/policies';
import { escalation } from '../data/escalation';
import { SCHEMES, NAME_TRAPS } from '../data/schemes';
import TouchpointLadder from '../components/TouchpointLadder';
import SituationIndex from '../components/SituationIndex';
import ContactRoutes from '../components/ContactRoutes';
import Documents from '../components/Documents';
import CsoHelp from '../components/CsoHelp';
import Clock from '../components/Clock';
import Sheet from '../components/Sheet';
import PageHead from '../components/PageHead';
import LanguagePicker from '../components/LanguagePicker';
import SamparkDisclosure from '../components/SamparkDisclosure';
import { SAMPARK_LOCALES, copyFor, fill } from '../data/samparkCopy';
import { deadlineLines } from '../lib/india/letter';
import { contactKey } from '../data/verification';
import { verification, verificationText } from '../lib/verification';
import { schemeContacts } from '../lib/contacts';
import { carryItems } from '../lib/documents';

// The map data is a quarter of a megabyte of state outlines. It is only
// needed on this page, so it is loaded when the page is opened rather than
// carried by every other page of the site.
const IndiaLocator = lazy(() => import('../components/IndiaLocator'));

// The link carries the choice: the scheme, the situation and the place on
// the map. A relative, or a volunteer at a help desk, can open the same
// answer without the citizen having to describe where they live.
const readParams = (query) => {
  const out = {};
  for (const part of String(query || '').split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i);
    const value = part.slice(i + 1).replace(/\+/g, ' ');
    try {
      out[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      out[key] = '';
    }
  }
  return out;
};

const buildQuery = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

// The tool answers two different questions, and it keeps them apart.
//
// "Which office do I go to?" is a question about a place. It is answered by
// walking down the map until the citizen's own village is on screen, and then
// reading the ladder from that rung up.
//
// "Where does delivery fail?" is a question about a policy. It is answered by
// the delivery steps, the evidence and the escalation route.
//
// The first is new; the second is what the page already did. Both are here
// because a citizen who has just been turned away at a counter needs both.
export default function Touchpoints({ query, onQueryChange }) {
  const params = useMemo(() => readParams(query), [query]);
  // The place as the link holds it. The ref is what a write to the link
  // reads, so a second click in the same moment cannot drop the place the
  // citizen has just chosen.
  const placeRef = useRef(params.p || '');

  const [schemeId, setSchemeId] = useState(() => {
    const found = SCHEMES.find((s) => s.id === params.s);
    return found ? found.id : SCHEMES[0].id;
  });
  const [situationId, setSituationId] = useState(() => {
    const scheme = SCHEMES.find((s) => s.id === params.s) || SCHEMES[0];
    const found = scheme.situations.find((s) => s.id === params.x);
    return found ? found.id : scheme.situations[0].id;
  });
  const [place, setPlace] = useState(null);
  const [dates, setDates] = useState({});
  const [addressLevel, setAddressLevel] = useState('');
  const [copied, setCopied] = useState(null);
  const [policyId, setPolicyId] = useState(policies[0].id);
  const [locale, setLocale] = useState(() =>
    SAMPARK_LOCALES.some((entry) => entry.code === params.lang) ? params.lang : 'en'
  );
  const t = copyFor(locale);
  const levelLabel = (value) => {
    const key = `level${String(value).charAt(0).toUpperCase()}${String(value).slice(1).toLowerCase()}`;
    return t[key] || value;
  };

  const scheme = SCHEMES.find((s) => s.id === schemeId) || SCHEMES[0];
  const situation =
    scheme.situations.find((s) => s.id === situationId) || scheme.situations[0];

  const writeLink = (next) => {
    if (!onQueryChange) return;
    onQueryChange(buildQuery({ s: next.s, x: next.x, p: next.p, lang: next.lang ?? locale }));
  };

  const pickScheme = (id) => {
    const next = SCHEMES.find((s) => s.id === id);
    setSchemeId(id);
    setSituationId(next.situations[0].id);
    // PM-JAY appears in both halves of the page. Choosing it here should
    // move the delivery map below to the same policy, not leave the reader
    // comparing two different schemes under one page title.
    if (policies.some((p) => p.id === id)) setPolicyId(id);
    writeLink({ s: id, x: next.situations[0].id, p: placeRef.current });
  };

  const pickSituation = (id) => {
    setSituationId(id);
    writeLink({ s: schemeId, x: id, p: placeRef.current });
  };

  // The problem-first index picks the scheme and the situation together, then
  // puts the ladder under the reader's eye. Without the move, the click
  // changes a section that may be a screen below the chip they pressed.
  const openSituation = (nextSchemeId, nextSituationId) => {
    const next = SCHEMES.find((s) => s.id === nextSchemeId);
    if (!next) return;
    setSchemeId(next.id);
    setSituationId(nextSituationId);
    setAddressLevel('');
    if (policies.some((p) => p.id === next.id)) setPolicyId(next.id);
    writeLink({ s: next.id, x: nextSituationId, p: placeRef.current });
    const placeStep = document.getElementById('sampark-place');
    if (placeStep) placeStep.scrollIntoView({ block: 'start' });
  };

  const pickPlace = (placeString) => {
    placeRef.current = placeString;
    // A new place means a new ladder; an address chosen for the old one
    // should not survive the move.
    setAddressLevel('');
    writeLink({ s: schemeId, x: situationId, p: placeString });
  };

  // The dates are kept per situation. Two situations can ask the same
  // question with the same anchor name ("the day you complained to the
  // office" under MGNREGA, "the day you complained at the hospital" under
  // PM-JAY), and a date typed for one of them must not turn up in the other.
  // A stale date in the letter is a date the citizen never gave.
  const dateKey = (id) => `${schemeId}/${situationId}/${id}`;

  const activeDates = useMemo(() => {
    const out = {};
    const anchors = situation.clock ? situation.clock.anchors : [];
    for (const a of anchors) {
      const v = dates[dateKey(a.id)];
      if (v) out[a.id] = v;
    }
    return out;
  }, [dates, schemeId, situationId, situation]);

  const setDate = (id, value) => {
    setDates((prev) => ({ ...prev, [dateKey(id)]: value }));
  };

  // The letter goes to the citizen's own rung by default. Once a deadline on
  // that rung has passed, the default moves up one rung, because the law
  // itself says the next office is the one to ask. The citizen can move it
  // again, and the village stays in the letter whichever rung is chosen.
  const anyPassed = useMemo(
    () => deadlineLines(situation.clock, activeDates).some((l) => l.passed),
    [situation, activeDates]
  );
  const homeLevel = place ? place.rung : null;
  const escalated = homeLevel === 'village' && anyPassed;
  const rungs = situation.rungs || [];
  const chosenLevel =
    addressLevel && rungs.some((r) => r.level === addressLevel)
      ? addressLevel
      : escalated
        ? 'block'
        : homeLevel;
  const letterRung = rungs.find((r) => r.level === chosenLevel) || null;
  const stateName =
    place && Array.isArray(place.path) && place.path.length
      ? place.path[place.path.length - 1]
      : '';
  const contactRoutes = schemeContacts(scheme.id);
  const contactCount = contactRoutes
    ? contactRoutes.channels.length + (contactRoutes.directory ? 1 : 0)
    : 0;
  const documentCount = carryItems(letterRung ? letterRung.carry : '').length + 3;
  const deadlineCount = situation.clock ? situation.clock.deadlines.length : 0;

  // A link a relative can open, and a volunteer at a help desk can read.
  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(t.shareCopied);
    } catch {
      setCopied(fill(t.shareFallback, { url }));
    }
  };

  return (
    <section className="sampark-page" lang={locale} dir={locale === 'ur' ? 'rtl' : 'ltr'}>
      <div className="sampark-top">
        <PageHead
          eyebrow={t.eyebrow}
          title={t.title}
          scriptsFor="Sampark"
          scriptsLabel={t.scriptSpecimenLabel}
          question={t.question}
        >
          {t.guideLead}
        </PageHead>

        {/* The language sits in the link, so a volunteer can send a page that
            opens in the citizen's language without re-picking it. */}
        <LanguagePicker
          id="sampark-lang"
          className="sampark-language"
          labelClassName="meta sampark-language-label"
          noteClassName="meta sampark-language-note"
          label={t.languageLabel}
          note={t.note}
          locales={SAMPARK_LOCALES}
          locale={locale}
          onChange={(code) => {
            setLocale(code);
            writeLink({ s: schemeId, x: situationId, p: placeRef.current, lang: code });
          }}
        />
      </div>

      <p className="meta sampark-cso-affiliation">
        <a href="#/sampark">{t.csoAffiliation}</a>
      </p>

      {/* A citizen arrives with a problem, not a place on a map. The guide
          names the three actions before the page asks for anything, and the
          situation comes before the place so the first question is one the
          citizen can answer. */}
      <section className="sampark-guide" aria-labelledby="sampark-guide-title">
        <span className="overline">{t.guideEyebrow}</span>
        <h2 id="sampark-guide-title">{t.guideTitle}</h2>
        <ol className="sampark-guide-steps">
          <li>{t.step2}</li>
          <li>{t.step1}</li>
          <li>{t.step6}</li>
        </ol>
        <p className="meta sampark-guide-promise">{t.guidePromise}</p>
      </section>

      <div id="sampark-situation">
        <SituationIndex onPick={openSituation} step={1} t={t} />
      </div>

      <div className="locator-ladder locator-map-only" id="sampark-place">
        <div className="locator-pane">
          <h3 className="pane-title">2. {t.step1}</h3>
          <Suspense
            fallback={
              <p className="meta">{t.mapLoading}</p>
            }
          >
            <IndiaLocator
              onChange={setPlace}
              place={params.p || ''}
              onPlaceChange={pickPlace}
              t={t}
            />
          </Suspense>
        </div>
      </div>

      <SamparkDisclosure
        className="sampark-scheme-fold"
        title={`3. ${t.step3}`}
        hint={fill(t.foldSchemeHint, { schemes: SCHEMES.length, routes: contactCount })}
      >
        <p className="section-strap sampark-copy">{t.chooseScheme}</p>

        <div className="filter-row" role="group" aria-label={t.schemeGroup}>
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              className={`chip ${scheme.id === s.id ? 'chip-active' : ''}`}
              onClick={() => pickScheme(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="sampark-step-pair">
          <div className="card scheme-card">
            <h3>{scheme.full}</h3>
            <p className="scheme-what">{scheme.what}</p>
            <p className="meta">
              {scheme.ministry} ·{' '}
              <a href={scheme.portal} target="_blank" rel="noreferrer noopener">
                {scheme.portal.replace(/^https?:\/\//, '')}
              </a>
            </p>
            <p className="scheme-note">{scheme.note}</p>
          </div>

          <ContactRoutes schemeId={scheme.id} step={4} t={t} />
        </div>
      </SamparkDisclosure>

      <SamparkDisclosure
        className="sampark-documents-fold"
        title={`5. ${t.step5}`}
        hint={fill(t.foldDocumentsHint, { n: documentCount })}
      >
        <Documents
          key={letterRung ? letterRung.level : 'none'}
          rung={letterRung}
          t={t}
          showHeading={false}
        />
      </SamparkDisclosure>

      <SamparkDisclosure
        className="sampark-office-fold"
        id="sampark-ladder"
        title={t.ladder}
        hint={fill(t.foldOfficeHint, {
          offices: rungs.length,
          deadlines: deadlineCount,
        })}
      >
        <div className="ladder-pane">
          {place && place.note && <p className="pane-note">{place.note}</p>}
          <TouchpointLadder
            scheme={scheme}
            situation={situation}
            rung={place ? place.rung : null}
            placeLabel={place ? place.label : null}
            addressedLevel={letterRung ? letterRung.level : null}
            onAddress={place ? setAddressLevel : undefined}
            onPickSituation={pickSituation}
            t={t}
          />
          {situation.clock ? (
            <Clock
              clock={situation.clock}
              dates={activeDates}
              onDate={setDate}
              locale={locale}
              t={t}
            />
          ) : (
            <div className="clock-empty">
              <p className="meta">
                {situation.clockGap || t.clockNoDeadline}
              </p>
              <p className="meta">
                {t.clockNoDate}
              </p>
            </div>
          )}
        </div>
      </SamparkDisclosure>

      <SamparkDisclosure
        className="sampark-sheet-fold"
        title={`6. ${t.step6}`}
        hint={fill(t.foldSheetHint, { n: rungs.length })}
      >
        <p className="section-strap">{t.step6Body}</p>

        <div className="sheet-bar">
          <button type="button" className="btn btn-secondary" onClick={share}>
            {t.shareLink}
          </button>
          {copied && <p className="sheet-note meta">{copied}</p>}
        </div>

        <Sheet
          scheme={scheme}
          situation={situation}
          place={place}
          rung={letterRung}
          rungs={rungs}
          homeLevel={homeLevel}
          escalated={escalated}
          onAddress={setAddressLevel}
          clock={situation.clock}
          dates={activeDates}
          locale={locale}
          t={t}
        />
      </SamparkDisclosure>

      <div className="sampark-tail-grid">
        <SamparkDisclosure
          className="sampark-help-fold"
          title={`7. ${t.step7}`}
          hint={fill(t.foldHelpHint, { n: 3 })}
        >
          <CsoHelp
            scheme={scheme}
            situation={situation}
            place={place}
            rung={letterRung}
            clock={situation.clock}
            dates={activeDates}
            t={t}
            showHeading={false}
          />
        </SamparkDisclosure>

        {NAME_TRAPS.length > 0 && (
          <SamparkDisclosure
            className="sampark-traps-fold"
            title={t.trapsTitle}
            hint={fill(t.foldTrapsHint, { n: NAME_TRAPS.length })}
          >
            <div className="traps-card">
              <p className="meta">{t.trapsLead}</p>
              <p className="meta traps-note">{t.trapsNote}</p>
              <dl className="traps">
                {NAME_TRAPS.map((trap) => (
                  <div key={trap.confusion} className="trap">
                    <dt>{trap.confusion}</dt>
                    <dd>{trap.truth}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </SamparkDisclosure>
        )}
      </div>

      {/* The policy half of the page is a researcher's map. A citizen on a
          phone needs the ladder and the sheet first, so the maps wait behind
          one tap. */}
      <SamparkDisclosure
        className="delivery-maps"
        title={t.deliveryTitle}
        hint={fill(t.foldDeliveryHint, { n: policies.length })}
      >

        <p className="section-strap">{t.deliveryLead}</p>
        <p className="meta delivery-maps-note">{t.deliveryNote}</p>

        <div className="filter-row" role="group" aria-label={t.policyGroup}>
          {policies.map((p) => (
            <button
              key={p.id}
              className={`chip ${policyId === p.id ? 'chip-active' : ''}`}
              onClick={() => setPolicyId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="touchpoint-list">
          {(() => {
            const policy = policies.find((p) => p.id === policyId) || policies[0];
            const dir = escalation[policy.id] || [];
            const exampleFor = (s) =>
              s.example &&
              stateName &&
              s.example.state.toLowerCase() === stateName.toLowerCase()
                ? s.example
                : null;
            return (
              <article key={policy.id} className="touchpoint-card">
                <h3>{policy.name}</h3>
                <p className="touchpoint-line">
                  <strong>{t.measureLabel}</strong> {policy.strap}
                </p>
                {policy.touchpoints.map((touchpoint) => {
                  const stepNo = touchpoint.name.split('.')[0];
                  const esc = dir.find((d) => d.touchpoint.split('.')[0] === stepNo);
                  const dirIndex = dir.indexOf(esc);
                  return (
                    <div key={touchpoint.name} className="touchpoint-step">
                      <h4>{touchpoint.name}</h4>
                      <p className="touchpoint-line">
                        <strong>{t.measureLabel}</strong> {touchpoint.what}
                      </p>
                      <p className="evidence">
                        <strong>{t.evidenceLabel}</strong> {touchpoint.evidence}
                      </p>

                      {esc && (
                        <div className="escalation">
                          <h5>{t.failureLabel}</h5>
                          {esc.steps.map((s, i) => {
                            const example = exampleFor(s);
                            const check = verification(
                              'contacts',
                              contactKey(policy.id, dirIndex, i)
                            );
                            return (
                              <div key={i} className="escalation-step">
                                <div className="escalation-top">
                                  <span className="chip chip-tag">{levelLabel(s.level)}</span>
                                  <span
                                    className={`chip chip-tag ${s.verified ? '' : 'chip-locked'}`}
                                    title={s.source}
                                  >
                                    {s.verified
                                      ? t.verifiedLabel
                                      : t.verifyLabel}
                                  </span>
                                </div>
                                <p className="escalation-office">
                                  <strong>{s.office}</strong>
                                  <span className="meta">: {s.authority}</span>
                                </p>
                                <p className="escalation-reach data-num">{s.reach}</p>
                                {example && (
                                  <p className="escalation-reach data-num escalation-example">
                                    {example.reach}
                                  </p>
                                )}
                                <p className="meta escalation-note">{s.note}</p>
                                <p className="meta escalation-source">
                                  {t.sourceLabel} {s.source}
                                </p>
                                <p className={`meta escalation-verified verification verification-${check.state}`}>
                                  {verificationText(t, check)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </article>
            );
          })()}
        </div>
      </SamparkDisclosure>
    </section>
  );
}
