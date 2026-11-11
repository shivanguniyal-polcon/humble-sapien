import { useEffect, useState } from 'react';
import PageHead from '../components/PageHead';
import LanguagePicker from '../components/LanguagePicker';
import SamparkDisclosure from '../components/SamparkDisclosure';
import SamparkOfferDesk from '../components/SamparkOfferDesk';
import {
  CSO_LOCALES,
  csoCopyFor,
  csoLocaleFrom,
  isCsoRtl,
} from '../data/samparkCsoCopy';

// The institution behind the tool, written as a proposed structure rather
// than a registration certificate: it names what Sampark must own, what THS
// may supply, and where the legal gate sits.
//
// Every string on this page comes from src/data/cso/<locale>.js. The language
// choice is kept in localStorage so a volunteer can hand the same phone back
// and find the page in the citizen's language, and Urdu switches the section
// to right-to-left without changing the site shell.

const SOURCE_LINKS = {
  ijr: 'https://www.tatastrusts.org/india-justice-report-2025',
  cpg: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2117810',
  myscheme: 'https://www.myscheme.gov.in/search',
  telelaw: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2227725',
  csc: 'https://csc.gov.in/',
  cag: 'https://cag.gov.in/uploads/download_audit_report/2023/Report-No.-10-of-2023_NSAP_English_PDF-A-064d229f832dad7.55068084.pdf',
  darpg:
    'https://www.darpg.gov.in/static/uploads/2025/12/098212cb8127fc2dafa2b61f051951e5.pdf',
  haqdarshak: 'https://www.haqdarshak.com/',
  csrFaq: 'https://www.csr.gov.in/content/csr/global/master/home/helpandfaqs.html',
  csrPortal: 'https://www.csr.gov.in',
  meity: 'https://www.meity.gov.in',
  aiGuide: 'https://impact.indiaai.gov.in/IndiaAI_Governance_Guidelines.pdf',
  name: 'https://sampark.org/about-us/',
  myschemeFaq: 'https://www.myscheme.gov.in/faqs',
};

const STORAGE_KEY = 'sampark-cso-lang';

function readStoredLocale() {
  try {
    const fromHash = String(window.location.hash || '').match(/[?&]lang=([a-z]{2})/);
    const candidate = csoLocaleFrom(fromHash ? fromHash[1] : null);
    if (candidate) return candidate;
    const stored = csoLocaleFrom(window.localStorage.getItem(STORAGE_KEY));
    return stored || 'en';
  } catch {
    return 'en';
  }
}

export default function SamparkCSO({ onNavigate }) {
  const [locale, setLocale] = useState(readStoredLocale);
  const t = csoCopyFor(locale);
  const rtl = isCsoRtl(locale);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // A private window may refuse storage; the page still works in memory.
    }
  }, [locale]);

  return (
    <section
      className="sampark-cso-page"
      lang={locale}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <LanguagePicker
        id="cso-lang"
        className="sampark-cso-lang"
        label={t.lang.label}
        note={t.lang.note}
        locales={CSO_LOCALES}
        locale={locale}
        onChange={setLocale}
      />

      <PageHead
        eyebrow={t.head.eyebrow}
        title={t.head.title}
        scriptsFor="Sampark"
        scriptsLabel={t.head.scriptsLabel}
        question={t.head.question}
      >
        {t.head.lead}
      </PageHead>

      <div className="notice notice-warn" role="note">
        <strong>{t.head.statusStrong}</strong> {t.head.statusRest}
      </div>

      <section className="sampark-gap">
        <div className="section-head">
          <span className="overline">{t.gap.eyebrow}</span>
          <h2>{t.gap.title}</h2>
          <p className="section-strap">{t.gap.strap}</p>
        </div>

        <div className="grid grid-2">
          <article className="card">
            <h3>{t.gap.crowdedTitle}</h3>
            <ul>
              {t.gap.actors.map((actor) => (
                <li key={actor.lead}>
                  <strong>{actor.lead}</strong> — {actor.text}
                </li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h3>{t.gap.missingTitle}</h3>
            <ul>
              {t.gap.missing.map((item) => (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.text}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="notice sampark-gap-claim">
          <strong>{t.gap.claimLead}</strong> {t.gap.claimRest}
        </p>

        <div
          className="sampark-gap-stats"
          aria-label={t.gap.statsTitle || t.gap.eyebrow}
        >
          {t.gap.stats.map((stat) => (
            <div className="sampark-gap-stat" key={stat.value}>
              <strong>{stat.value}</strong>
              <span>{stat.text}</span>
            </div>
          ))}
        </div>
        <p className="meta">
          {t.gap.sourcesPrefix}{' '}
          {Object.entries(t.gap.linkLabels).map(([key, label], index) => (
            <span key={key}>
              {index > 0 ? ', ' : ''}
              <a href={SOURCE_LINKS[key]} target="_blank" rel="noreferrer noopener">
                {label}
              </a>
            </span>
          ))}
          . {t.gap.sourcesSuffix}
        </p>
      </section>

      <SamparkDisclosure
        className="sampark-cso-fold"
        title={t.eligible.foldTitle}
        hint={t.eligible.foldHint}
      >
        <div className="section-head">
          <span className="overline">{t.eligible.eyebrow}</span>
          <h2>{t.eligible.title}</h2>
          <p className="section-strap">{t.eligible.strap}</p>
        </div>

        <div className="grid grid-2">
          <article className="card">
            <h3>{t.eligible.mayTitle}</h3>
            <ul>
              {t.eligible.may.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h3>{t.eligible.mayNotTitle}</h3>
            <ul>
              {t.eligible.mayNot.map((item) => (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.text}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="card">
          <h3>{t.eligible.resultsTitle}</h3>
          <ol className="sampark-cso-actions">
            {t.eligible.results.map((item) => (
              <li key={item.lead}>
                <strong>{item.lead}</strong> {item.text}
              </li>
            ))}
          </ol>
          <p className="meta" style={{ marginBottom: 0 }}>
            {t.eligible.errorNote}
          </p>
        </div>

        <div className="notice notice-warn">
          <strong>{t.eligible.caveatStrong}</strong> {t.eligible.caveat}
        </div>
      </SamparkDisclosure>

      <section>
        <div className="section-head">
          <span className="overline">{t.separation.eyebrow}</span>
          <h2>{t.separation.title}</h2>
          <p className="section-strap">{t.separation.strap}</p>
        </div>

        <div className="grid grid-3">
          {t.separation.cards.map((card) => (
            <article className="card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <span className="overline">{t.affiliation.eyebrow}</span>
          <h2>{t.affiliation.title}</h2>
          <p className="section-strap">{t.affiliation.strap}</p>
        </div>

        <div className="table-scroll">
          <table className="data-table sampark-cso-table">
            <thead>
              <tr>
                {t.affiliation.columns.map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.affiliation.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.ths}</td>
                  <td>{row.cso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="meta">{t.affiliation.note}</p>
      </section>

      <SamparkOfferDesk copy={t.offers} />

      <SamparkDisclosure
        className="sampark-cso-fold"
        title={t.legal.foldTitle}
        hint={t.legal.foldHint}
      >
        <div className="section-head">
          <span className="overline">{t.legal.eyebrow}</span>
          <h2>{t.legal.title}</h2>
          <p className="section-strap">{t.legal.strap}</p>
        </div>

        <div className="grid grid-3">
          {t.legal.cards.map((card) => (
            <article className="card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              {card.meta ? <p className="meta">{card.meta}</p> : null}
            </article>
          ))}
        </div>

        <div className="notice notice-warn">
          <strong>{t.legal.nameStrong}</strong> {t.legal.nameBody}
        </div>
      </SamparkDisclosure>

      <section>
        <div className="section-head">
          <span className="overline">{t.agents.eyebrow}</span>
          <h2>{t.agents.title}</h2>
          <p className="section-strap">{t.agents.strap}</p>
        </div>

        <div className="grid grid-2">
          {t.agents.items.map((agent) => (
            <article className="card sampark-agent" key={agent.name}>
              <div className="sampark-agent-head">
                <h3>{agent.name}</h3>
                <span className="chip chip-tag sampark-agent-status">
                  {agent.statusLabel}
                </span>
              </div>
              <p>{agent.role}</p>
              <p className="meta">
                <strong>{t.agents.boundLabel}</strong> {agent.bound}
              </p>
              <p className="meta sampark-agent-gate">
                <strong>{t.agents.gateLabel}</strong> {agent.gate}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <span className="overline">{t.live.eyebrow}</span>
          <h2>{t.live.title}</h2>
          <p className="section-strap">{t.live.strap}</p>
        </div>

        <div className="grid grid-2">
          <article className="card">
            <h3>{t.live.liveTitle}</h3>
            <ul>
              {t.live.liveItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="meta">{t.live.liveNote}</p>
          </article>
          <article className="card">
            <h3>{t.live.stagedTitle}</h3>
            <ul>
              {t.live.stagedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="meta">{t.live.stagedNote}</p>
          </article>
        </div>

        <div className="card sampark-agent-trace">
          <h3>{t.live.traceTitle}</h3>
          <ol>
            {t.live.trace.map((step) => (
              <li key={step.lead}>
                <strong>{step.lead}</strong> {step.text}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="section-head">
          <span className="overline">{t.rules.eyebrow}</span>
          <h2>{t.rules.title}</h2>
        </div>
        <div className="card">
          <ul className="sampark-agent-rules">
            {t.rules.items.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="meta" style={{ marginBottom: 0 }}>
            {t.rules.note}
          </p>
        </div>
      </section>

      <SamparkDisclosure
        className="sampark-cso-fold"
        title={t.money.foldTitle}
        hint={t.money.foldHint}
      >
        <div className="section-head">
          <span className="overline">{t.money.eyebrow}</span>
          <h2>{t.money.title}</h2>
          <p className="section-strap">{t.money.strap}</p>
        </div>

        <div className="table-scroll">
          <table className="data-table sampark-cso-table">
            <caption className="meta">{t.money.caption}</caption>
            <thead>
              <tr>
                {t.money.columns.map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.money.rows.map((row) => (
                <tr key={row[0]}>
                  <th scope="row">{row[0]}</th>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-2">
          {t.money.cards.map((card) => (
            <article className="card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </SamparkDisclosure>

      <SamparkDisclosure
        className="sampark-cso-fold"
        title={t.days.foldTitle}
        hint={t.days.foldHint}
      >
        <div className="section-head">
          <span className="overline">{t.days.eyebrow}</span>
          <h2>{t.days.title}</h2>
        </div>
        <ol className="sampark-cso-actions">
          {t.days.steps.map((step) => (
            <li key={step.lead}>
              <strong>{step.lead}</strong> {step.text}
            </li>
          ))}
        </ol>
      </SamparkDisclosure>

      <SamparkDisclosure
        className="sampark-cso-fold"
        title={t.open.foldTitle}
        hint={t.open.foldHint}
      >
        <div className="section-head">
          <span className="overline">{t.open.eyebrow}</span>
          <h2>{t.open.title}</h2>
        </div>
        <div className="card">
          <ul>
            {t.open.items.map((item) => (
              <li key={item.lead}>
                <strong>{item.lead}</strong> {item.text}
              </li>
            ))}
          </ul>
        </div>
      </SamparkDisclosure>

      <div className="card tool-ending">
        <h3>{t.end.title}</h3>
        <p>{t.end.body}</p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate?.('work', 'touchpoints')}
          >
            {t.end.primary}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate?.('support')}
          >
            {t.end.secondary}
          </button>
        </div>
      </div>

      <SamparkDisclosure
        className="sampark-cso-fold"
        title={t.sources.foldTitle}
        hint={t.sources.foldHint}
      >
        <div className="section-head">
          <span className="overline">{t.sources.eyebrow}</span>
          <h2>{t.sources.title}</h2>
        </div>
        <ul className="sampark-cso-sources">
          {t.sources.links.map((link) => (
            <li key={link.key}>
              <a href={SOURCE_LINKS[link.key]} target="_blank" rel="noreferrer noopener">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="meta">{t.sources.note}</p>
      </SamparkDisclosure>
    </section>
  );
}
