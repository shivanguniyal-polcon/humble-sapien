import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Home from './sections/Home';
import PitAssistant from './components/PitAssistant';
import AmbientField from './components/AmbientField';
import Logo from './components/Logo';
import { PUB_TYPES } from './data/publications';
import { requestRouteFocus } from './lib/routeFocus';

// Every section behind the nav is its own chunk. The shell — header, nav,
// footer, assistant — and Home, the front door, stay eager so the first paint
// has no loading step; everything else loads when its route is opened. This
// keeps the legal engine, the eleven battery modules and the datasets off the
// landing page's critical path.
const Research = lazy(() => import('./sections/Research'));
const Work = lazy(() => import('./sections/Work'));
const Data = lazy(() => import('./sections/Data'));
const Archive = lazy(() => import('./sections/Archive'));
const SolutionIndex = lazy(() => import('./sections/SolutionIndex'));
const Compare = lazy(() => import('./sections/Compare'));
const Rara = lazy(() => import('./sections/Rara'));
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

// The menu is one level, one list. The sections that hold other pages (the
// tools, the library, the playground, the atlas) are indexed on the index
// page, which names every door and what it opens; the menu carries the doors
// themselves, plus the two pages that hold the site together: Home and the
// index. The order is editorial, not alphabetical: the work first, then the
// desks, then the institution. Tools buried at the twelfth row of a menu is
// how a site tells a reader its best rooms do not matter.
const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'index', label: 'Index' },
  { id: 'work', label: 'Tools' },
  { id: 'research', label: 'Research' },
  { id: 'data', label: 'Data' },
  { id: 'archive', label: 'Smriti — The Archive' },
  { id: 'compare', label: 'Atlas' },
  { id: 'pitdesk', label: 'PIT Desk' },
  { id: 'rara', label: 'RARA' },
  { id: 'writing', label: 'Writing' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'about', label: 'About' },
  { id: 'support', label: 'Support' },
];

// The V panel prints TABS in that order. Sub-routes stay out: they belong to
// the page that owns them.
const MENU_TABS = TABS;

// Hash routes give every surface a stable URL: #/tools/lab, #/research/pmjay-model.
const HASH_TO_TAB = {
  home: 'home',
  index: 'index',
  tools: 'work',
  research: 'research',
  data: 'data',
  archive: 'archive',
  atlas: 'compare',
  rara: 'rara',
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
        // The new page's heading takes focus, so the next Tab starts inside
        // the page rather than wherever the old page left the keyboard.
        requestRouteFocus();
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

  // The V panel has no scrim and pushes nothing, so a click on the page behind
  // it must dismiss it whenever the click lands outside .site-float.
  useEffect(() => {
    const onPointerDown = (e) => {
      if (menuRef.current?.open && !menuRef.current.contains(e.target)) {
        menuRef.current.open = false;
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div className="app" data-field="true">
      {/* The paper gets a field of its own behind every route. On Home it waits
          for the timeline to be behind the reader, arriving with the close;
          the timeline is already an instrument, and two animated surfaces
          would compete for the same attention. Archive, Research and the Home
          close get the slower, quieter current because the reading is long. */}
      <AmbientField
        key={route.tab}
        quiet={
          route.tab === 'archive' || route.tab === 'research' || route.tab === 'home'
        }
        gate={route.tab === 'home' ? '.home-close, .site-footer' : null}
      />

      {/* No header bar. The mark floats at the top left and the whole site
          sits behind one V at the top right. The tagline says fifth pillar:
          not another institution beside the legislature, the executive, the
          judiciary and the press, but the public holding the same record. */}
      <div className="site-float">
        <button
          type="button"
          className="brand-float"
          aria-label="THS: The Humble Sapien — home"
          onClick={() => {
            closeMenu();
            go('home');
          }}
        >
          <Logo markOnly />
          <span className="brand-float-word" aria-hidden="true">
            <span className="brand-float-name">The Humble Sapien</span>
            <span className="brand-float-tagline">The fifth pillar of democracy</span>
          </span>
        </button>

        <details
          className="pillar-menu"
          ref={menuRef}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menuRef.current?.open) {
              event.preventDefault();
              closeMenu();
              // Escape is a keyboard exit: return focus to the toggle so the
              // next Tab continues from the control, not the document top.
              menuRef.current?.querySelector('summary')?.focus();
            }
          }}
        >
          <summary
            className="pillar-menu-toggle"
            aria-label="Menu — the fifth pillar of democracy"
          >
            <span className="pillar-menu-mark" aria-hidden="true">V</span>
            <span className="pillar-menu-word" aria-hidden="true">Menu</span>
          </summary>

          {/* One list, one level. The menu is a set of doors, not a
              directory: the forty-odd tool, publication and sector pages
              belong to the pages that own them, and a popover that scrolls
              for two thousand pixels is not a menu. */}
          <nav className="pillar-menu-panel" aria-label="Primary">
            <ul className="pillar-list">
              {MENU_TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={`pillar-item${route.tab === tab.id ? ' pillar-item-active' : ''}`}
                    aria-current={route.tab === tab.id ? 'page' : undefined}
                    onClick={() => {
                      go(tab.id);
                      closeMenu();
                    }}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>

      <main>
        {/* Home is deliberately outside .shell: the timeline is the page and
            runs edge to edge, setting its own measure for the text it
            carries. Every other route keeps the reading column. */}
        {route.tab === 'home' && <Home onNavigate={go} />}
        {route.tab !== 'home' && (
        <div className="shell">
          <Suspense fallback={<RouteFallback />}>
          {route.tab === 'index' && <SolutionIndex onNavigate={go} />}
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
          {route.tab === 'archive' && (
            <Archive
              openId={route.sub}
              onOpen={(id) => go('archive', String(id))}
              onBack={() => go('archive')}
              onNavigate={go}
            />
          )}
          {route.tab === 'compare' && <Compare onNavigate={go} openSub={route.sub} />}
          {route.tab === 'rara' && <Rara />}
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
        )}
      </main>

      <PitAssistant
        route={route}
        flow={route.tab === 'work' && route.sub === 'passbook'}
      />

      <footer className="site-footer">
        <div className="shell">
          <p>
            <strong>THS: The Humble Sapien.</strong> The fifth pillar of
            democracy. A mission-locked public interest technology company: a
            perpetual free tier for individuals and small civil society
            organisations, paid for by the institutions that can afford to pay.
            Evidence with receipts, tools in the open, data you can take apart.
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
