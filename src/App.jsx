import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Home from './sections/Home';
import PitAssistant from './components/PitAssistant';
import Logo from './components/Logo';
import { TOOLS } from './data/tools';
import { PUB_TYPES } from './data/publications';
import { SECTOR_NAV } from './data/sectorNav';

// Every section behind the nav is its own chunk. The shell — header, nav,
// footer, assistant — and Home, the front door, stay eager so the first paint
// has no loading step; everything else loads when its route is opened. This
// keeps the legal engine, the eleven battery modules and the datasets off the
// landing page's critical path.
const Research = lazy(() => import('./sections/Research'));
const Work = lazy(() => import('./sections/Work'));
const Data = lazy(() => import('./sections/Data'));
const Compare = lazy(() => import('./sections/Compare'));
const Writing = lazy(() => import('./sections/Writing'));
const Newsletter = lazy(() => import('./sections/Newsletter'));
const PitDesk = lazy(() => import('./sections/PitDesk'));
const About = lazy(() => import('./sections/About'));
const Support = lazy(() => import('./sections/Support'));
const Licensing = lazy(() => import('./sections/Licensing'));

// One fallback for every route: the shell stays on screen, the page body
// arrives a moment later.
const RouteFallback = () => (
  <div className="shell" role="status">
    <p style={{ padding: '3rem 0', textAlign: 'center' }}>Loading…</p>
  </div>
);

// Tools sit second: the instruments are the product, not an appendix.
// Tabs with contained pages carry a hover dropdown listing them; clicking the
// heading still opens the tab's own page. The dropdown inverts the site:
// maroon panel, white text — a band of colour across the top of the window.
const TABS = [
  { id: 'home', label: 'Home' },
  {
    id: 'work',
    label: 'Tools',
    // The dropdown carries both lines: the name a reader saw on the card, and
    // the plain-English category that says what it is. A menu of Sanskrit
    // names alone would be a quiz.
    children: TOOLS.map((t) => ({ id: t.id, label: t.name, hint: t.name === t.label ? '' : t.label })),
  },
  {
    id: 'research',
    label: 'Research',
    // The library filters by type on the page itself. The dropdown carries
    // that same filter, so the two controls can never disagree.
    children: PUB_TYPES.map((t) => ({
      id: `type-${t.toLowerCase().replace(/\s+/g, '-')}`,
      label: t,
      sub: '',
      query: t === 'All' ? '' : `type=${encodeURIComponent(t)}`,
    })),
  },
  {
    id: 'data',
    label: 'Data',
    children: [
      { id: 'playground', label: 'Playground', sub: '' },
      { id: 'methods', label: 'Methods & downloads' },
      { id: 'opendata', label: 'Open data directory' },
    ],
  },
  {
    id: 'compare',
    label: 'Atlas',
    // Nav metadata only — the atlas content (sectors.js, ~92 kB) loads with
    // the Compare chunk, not with the landing page.
    children: SECTOR_NAV.map((s) => ({ id: s.id, label: s.label })),
  },
  // Writing and Newsletter are read in one sitting, so they open the page
  // and let the page do the choosing. No dropdown.
  { id: 'writing', label: 'Writing' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'pitdesk', label: 'PIT Desk' },
  { id: 'about', label: 'About' },
  { id: 'support', label: 'Support' },
];

// Hash routes give every surface a stable URL: #/tools/lab, #/research/pmjay-model.
const HASH_TO_TAB = {
  home: 'home',
  tools: 'work',
  research: 'research',
  data: 'data',
  atlas: 'compare',
  writing: 'writing',
  newsletter: 'newsletter',
  pitdesk: 'pitdesk',
  about: 'about',
  support: 'support',
  licensing: 'licensing',
};
const TAB_TO_HASH = Object.fromEntries(Object.entries(HASH_TO_TAB).map(([k, v]) => [v, k]));

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [headRaw, ...rest] = raw.split('/');
  // A query can sit on the head itself (#/research?type=Report) or on the
  // sub path (#/tools/lab?s=1). Both land in one query string.
  const [head, headQuery] = headRaw.split('?');
  const tab = HASH_TO_TAB[head] || 'home';
  // A tool page may carry a query, so a choice inside it can be shared: the
  // scheme, the situation, and the place on the map.
  const [sub, query = ''] = rest.join('/').split('?');
  const full = [headQuery, query].filter(Boolean).join('&');
  return { tab, sub: sub || null, query: full };
}

// A route is a page: #/tools and #/tools/lab are different screens, not two
// positions on one long page.
//
// The query is not part of the key. The query holds the choice made inside a
// tool — the scheme, the situation, the place on the map — and changing it
// must not throw the reader back to the top of the page they are reading.
const pageKey = (r) => `${r.tab}/${r.sub || ''}`;

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const prevPage = useRef(pageKey(route));
  const menuRef = useRef(null);

  // The research library filters by publication type. The filter rides in the
  // URL, so the nav dropdown and the chips on the page are one control.
  const researchType = (() => {
    const t = new URLSearchParams(route.query).get('type');
    return t && PUB_TYPES.includes(t) ? t : null;
  })();

  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      // Jump to the top whenever the screen itself changes, so a tool page
      // opens at its own top rather than wherever the index left off.
      if (pageKey(next) !== prevPage.current) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      prevPage.current = pageKey(next);
      setRoute(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (tab, sub, query) => {
    const head = TAB_TO_HASH[tab] || 'home';
    const next = `#/${head}${sub ? `/${sub}` : ''}${query ? `?${query}` : ''}`;
    if (window.location.hash === next) {
      setRoute(parseHash());
    } else {
      window.location.hash = next;
    }
  };

  // The phone menu is a disclosure, not a separate route state. Close it
  // whenever navigation lands anywhere, including a browser Back.
  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [route.tab, route.sub]);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  // Keep an open dropdown inside the viewport: measure the panel as if open,
  // and flip it to right-anchored when it would hang past the edge. Measured
  // on every open rather than guessed from tab order, because the nav wraps
  // and nth-child position says nothing about horizontal room.
  const alignMenu = (e) => {
    const menu = e.currentTarget.querySelector('.nav-menu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    const overflow =
      menu.getBoundingClientRect().right >
      document.documentElement.clientWidth - 8;
    menu.style.display = '';
    menu.style.visibility = '';
    menu.classList.toggle('nav-menu-flip', overflow);
  };

  return (
    <div className="app">
      <header className="site-header">
        <div className="shell">
          <button className="brand" onClick={() => { closeMenu(); go('home'); }}>
            <Logo />
          </button>
          {/* The desktop tabs wrap into three rows on a phone. Below the
              tablet breakpoint they are replaced by one disclosure, so the
              header stays a single brand row and no tab is parked on a
              second line. */}
          <details
            className="mobile-menu"
            ref={menuRef}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && menuRef.current?.open) {
                event.preventDefault();
                closeMenu();
                // Escape is a keyboard exit: return focus to the toggle so the
                // next Tab continues from the header, not from the document top.
                menuRef.current?.querySelector('summary')?.focus();
              }
            }}
          >
            <summary className="mobile-menu-toggle">
              Menu
              <span aria-hidden="true">▾</span>
            </summary>
            <nav className="mobile-menu-panel" aria-label="Primary">
              {TABS.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={route.tab === t.id ? 'mobile-menu-active' : ''}
                  aria-current={route.tab === t.id ? 'page' : undefined}
                  onClick={() => {
                    go(t.id);
                    closeMenu();
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </details>
          <nav className="site-nav" aria-label="Primary">
            {TABS.map((t) => (
              <div
                className="nav-item"
                key={t.id}
                onPointerEnter={alignMenu}
                onFocus={alignMenu}
                onClick={alignMenu}
              >
                <button
                  className={`nav-link ${route.tab === t.id ? 'nav-active' : ''}`}
                  aria-current={route.tab === t.id ? 'page' : undefined}
                  onClick={(e) => {
                    go(t.id);
                    // Release focus so :focus-within does not pin the menu
                    // open after the pointer has left the tab.
                    e.currentTarget.blur();
                  }}
                >
                  {t.label}
                </button>
                {t.children && (
                  <div className="nav-menu">
                    {t.children.map((c) => (
                      <button
                        key={c.id}
                        className="nav-menu-item"
                        onClick={(e) => {
                          go(
                            t.id,
                            c.sub !== undefined ? c.sub : c.id,
                            c.query,
                          );
                          // Same release after choosing an item: navigation
                          // happened, the panel must not linger over the page.
                          e.currentTarget.blur();
                        }}
                      >
                        <span className="nav-menu-label">{c.label}</span>
                        {c.hint && <span className="nav-menu-hint">{c.hint}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <div className="shell">
          <Suspense fallback={<RouteFallback />}>
          {route.tab === 'home' && <Home onNavigate={go} />}
          {route.tab === 'research' && (
            <Research
              onNavigate={go}
              openPub={route.sub}
              onOpenPub={(id) =>
                go(
                  'research',
                  id,
                  researchType ? `type=${encodeURIComponent(researchType)}` : '',
                )
              }
              openType={researchType}
              onTypeChange={(t) =>
                go('research', '', t === 'All' ? '' : `type=${encodeURIComponent(t)}`)
              }
            />
          )}
          {route.tab === 'work' && (
            <Work
              onNavigate={go}
              openTool={route.sub}
              onToolChange={(id) => go('work', id)}
              query={route.query}
              onQueryChange={(q) => go('work', route.sub, q)}
            />
          )}
          {route.tab === 'data' && <Data onNavigate={go} openSub={route.sub} />}
          {route.tab === 'compare' && <Compare onNavigate={go} openSub={route.sub} />}
          {route.tab === 'writing' && <Writing onNavigate={go} openSub={route.sub} />}
          {route.tab === 'newsletter' && (
            <Newsletter onNavigate={go} openSub={route.sub} />
          )}
          {route.tab === 'pitdesk' && <PitDesk />}
          {route.tab === 'about' && <About onNavigate={go} />}
          {route.tab === 'support' && <Support />}
          {route.tab === 'licensing' && <Licensing onNavigate={go} />}
          </Suspense>
        </div>
      </main>

      <PitAssistant
        route={route}
        flow={route.tab === 'work' && route.sub === 'passbook'}
      />

      <footer className="site-footer">
        <div className="shell">
          <p>
            <strong>THS: The Humble Sapien.</strong> A mission-locked public
            interest technology company: a perpetual free tier for individuals
            and small civil society organisations, paid for by the institutions
            that can afford to pay. Evidence with receipts, tools in the open,
            data you can take apart.
          </p>
          <p style={{ marginBottom: 0 }}>
            Datasets on this site are sourced to public releases; analysis runs
            entirely in your browser. The tools are free for citizens and civil
            society: read the{' '}
            <button type="button" className="linklike" onClick={() => go('licensing')}>
              licensing terms and input formats
            </button>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
