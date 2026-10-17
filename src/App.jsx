import { useEffect, useRef, useState } from 'react';
import Home from './sections/Home';
import Research from './sections/Research';
import Work from './sections/Work';
import Data from './sections/Data';
import Compare from './sections/Compare';
import Writing from './sections/Writing';
import About from './sections/About';
import Support from './sections/Support';
import Licensing from './sections/Licensing';
import PitAssistant from './components/PitAssistant';
import Logo from './components/Logo';
import { TOOLS } from './data/tools';
import { ESSAYS } from './data/essays';
import { publications } from './data/publications';
import { catalog } from './data/catalog';
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
    children: publications.map((p) => ({ id: p.id, label: p.title })),
  },
  {
    id: 'data',
    label: 'Data',
    children: [
      ...catalog.map((d) => ({ id: d.id, label: d.title })),
      { id: 'methods', label: 'Methods & downloads' },
      { id: 'opendata', label: 'Open data directory' },
    ],
  },
  {
    id: 'compare',
    label: 'Atlas',
    children: sectors.map((s) => ({ id: s.id, label: s.label })),
  },
  {
    id: 'writing',
    label: 'Writing',
    children: ESSAYS.map((e) => ({ id: e.id, label: e.title })),
  },
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
  about: 'about',
  support: 'support',
  licensing: 'licensing',
};
const TAB_TO_HASH = Object.fromEntries(Object.entries(HASH_TO_TAB).map(([k, v]) => [v, k]));

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [head, sub] = raw.split('/');
  const tab = HASH_TO_TAB[head] || 'home';
  return { tab, sub: sub || null };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const prevTab = useRef(route.tab);

  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      // Jump to the top only when the page changes. Within a page (tool to
      // tool, publication to library) the view keeps its own scroll logic.
      if (next.tab !== prevTab.current) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      prevTab.current = next.tab;
      setRoute(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (tab, sub) => {
    const head = TAB_TO_HASH[tab] || 'home';
    const next = `#/${head}${sub ? `/${sub}` : ''}`;
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
                          go(t.id, c.id);
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
              onOpenPub={(id) => go('research', id)}
            />
          )}
          {route.tab === 'work' && (
            <Work onNavigate={go} openTool={route.sub} onToolChange={(id) => go('work', id)} />
          )}
          {route.tab === 'data' && <Data onNavigate={go} openSub={route.sub} />}
          {route.tab === 'compare' && <Compare onNavigate={go} openSub={route.sub} />}
          {route.tab === 'writing' && <Writing onNavigate={go} openSub={route.sub} />}
          {route.tab === 'about' && <About onNavigate={go} />}
          {route.tab === 'support' && <Support />}
          {route.tab === 'licensing' && <Licensing onNavigate={go} />}
        </div>
      </main>

      <PitAssistant route={route} />

      <footer className="site-footer">
        <div className="shell">
          <p>
            <strong>THS: The Humble Sapien.</strong> A public interest
            technology initiative working toward registration as a
            not-for-profit civil society organisation. Evidence with
            receipts, tools in the open, data you can take apart.
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
