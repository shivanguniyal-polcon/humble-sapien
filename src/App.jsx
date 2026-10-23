import { useEffect, useRef, useState } from 'react';
import Home from './sections/Home';
import Research from './sections/Research';
import Work from './sections/Work';
import Data from './sections/Data';
import Compare from './sections/Compare';
import Writing from './sections/Writing';
import Newsletter from './sections/Newsletter';
import PitDesk from './sections/PitDesk';
import About from './sections/About';
import Support from './sections/Support';
import Licensing from './sections/Licensing';
import PitAssistant from './components/PitAssistant';
import Logo from './components/Logo';
import { TOOLS } from './data/tools';
import { PUB_TYPES } from './data/publications';
import { sectors } from './data/sectors';

// Tools sit second: the instruments are the product, not an appendix.
// Tabs with contained pages carry a hover dropdown listing them; clicking the
// heading still opens the tab's own page. The dropdown inverts the site:
// maroon panel, white text — a band of colour across the top of the window.
const TABS = [
  { id: 'home', label: 'Home' },
  {
    id: 'work',
    label: 'Tools',
    children: TOOLS.map((t) => ({ id: t.id, label: t.label })),
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
    children: sectors.map((s) => ({ id: s.id, label: s.label })),
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
          <button className="brand" onClick={() => go('home')}>
            <Logo />
          </button>
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
                        {c.label}
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
        </div>
      </main>

      <PitAssistant route={route} />

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
