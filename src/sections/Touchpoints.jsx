import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { policies } from '../data/policies';
import { escalation } from '../data/escalation';
import { SCHEMES, NAME_TRAPS } from '../data/schemes';
import TouchpointLadder from '../components/TouchpointLadder';
import Clock from '../components/Clock';
import Sheet from '../components/Sheet';
import PageHead from '../components/PageHead';
import { deadlineLines } from '../lib/india/letter';

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

  const scheme = SCHEMES.find((s) => s.id === schemeId) || SCHEMES[0];
  const situation =
    scheme.situations.find((s) => s.id === situationId) || scheme.situations[0];

  const writeLink = (next) => {
    if (!onQueryChange) return;
    onQueryChange(buildQuery({ s: next.s, x: next.x, p: next.p }));
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

  // A link a relative can open, and a volunteer at a help desk can read.
  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('The link is on your clipboard. Send it on WhatsApp, or read the address out.');
    } catch {
      setCopied(`Copy this address: ${url}`);
    }
  };

  return (
    <section>
      <PageHead
        eyebrow="Touchpoint maps"
        title="Sampark"
        question="Which office owes you the answer?"
      >
        Delivery fails at touchpoints, not at launch. Start where you are: pick
        your State, walk down to your block or village, and the ladder beside the
        map shows the office that owes you the answer at your own level, and the
        route above it if they do not deliver. Or start from the scheme and
        follow delivery step by step.
      </PageHead>

      <div className="filter-row" role="group" aria-label="Choose scheme">
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

      <div className="locator-ladder">
        <div className="locator-pane">
          <h3 className="pane-title">1. Where are you?</h3>
          <Suspense
            fallback={
              <p className="meta">Loading the map of India…</p>
            }
          >
            <IndiaLocator
              onChange={setPlace}
              place={params.p || ''}
              onPlaceChange={pickPlace}
            />
          </Suspense>
        </div>
        <div className="ladder-pane">
          <h3 className="pane-title">2. Who decides?</h3>
          {place && place.note && <p className="pane-note">{place.note}</p>}
          <TouchpointLadder
            scheme={scheme}
            situation={situation}
            rung={place ? place.rung : null}
            placeLabel={place ? place.label : null}
            addressedLevel={letterRung ? letterRung.level : null}
            onAddress={place ? setAddressLevel : undefined}
            onPickSituation={pickSituation}
          />
          {situation.clock ? (
            <Clock clock={situation.clock} dates={activeDates} onDate={setDate} />
          ) : (
            <div className="clock-empty">
              <p className="meta">
                {situation.clockGap || 'No deadline is recorded for this situation yet.'}
              </p>
              <p className="meta">
                The letter asks for a written reply; it does not claim a date this record cannot
                support.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="section-head section-head-tight">
        <h3>3. The sheet to carry</h3>
        <p className="section-strap">
          One page: the office that owes you the answer, the office above it if
          that one does not deliver, the dates the law sets, and a letter you
          can hand over. Print it, or copy it into WhatsApp. No account, no
          watermark, no expiry.
        </p>
      </div>

      <div className="sheet-bar">
        <button type="button" className="btn btn-secondary" onClick={share}>
          Copy a link to this place
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
      />

      {NAME_TRAPS.length > 0 && (
        <div className="card traps-card">
          <h4>Before you go</h4>
          <p className="meta">
            Names that get people sent to the wrong office, or to a scheme that
            is not the one they mean.
          </p>
          <dl className="traps">
            {NAME_TRAPS.map((t) => (
              <div key={t.confusion} className="trap">
                <dt>{t.confusion}</dt>
                <dd>{t.truth}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* The policy half of the page is a researcher's map. A citizen on a
          phone needs the ladder and the sheet first, so the maps wait behind
          one tap. */}
      <details className="delivery-maps">
        <summary>
          <span className="delivery-maps-title">Delivery maps</span>
          <span className="meta">Where policy delivery fails, and who to reach</span>
        </summary>

        <p className="section-strap">
          For each policy, the steps delivery actually has, what to measure at
          each one, the evidence so far, and when a step fails, exactly which
          office to reach. The maps cover PM-JAY and Swachh Bharat Mission;
          choosing PM-JAY above selects its map here, while SBM is reached from
          the chips below.
        </p>
        <p className="meta delivery-maps-note">
          State-specific numbers appear only for the State you picked. The
          national route is shown for every State.
        </p>

        <div className="filter-row" role="group" aria-label="Choose policy">
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
                  <strong>What to measure:</strong> {policy.strap}
                </p>
                {policy.touchpoints.map((t) => {
                  const stepNo = t.name.split('.')[0];
                  const esc = dir.find((d) => d.touchpoint.split('.')[0] === stepNo);
                  return (
                    <div key={t.name} className="touchpoint-step">
                      <h4>{t.name}</h4>
                      <p className="touchpoint-line">
                        <strong>What to measure:</strong> {t.what}
                      </p>
                      <p className="evidence">
                        <strong>Evidence:</strong> {t.evidence}
                      </p>

                      {esc && (
                        <div className="escalation">
                          <h5>If it fails: who to reach</h5>
                          {esc.steps.map((s, i) => {
                            const example = exampleFor(s);
                            return (
                              <div key={i} className="escalation-step">
                                <div className="escalation-top">
                                  <span className="chip chip-tag">{s.level}</span>
                                  <span
                                    className={`chip chip-tag ${s.verified ? '' : 'chip-locked'}`}
                                    title={s.source}
                                  >
                                    {s.verified
                                      ? 'Verified on official page'
                                      : 'Verify before relying'}
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
                                <p className="meta escalation-source">Source: {s.source}</p>
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
      </details>
    </section>
  );
}
