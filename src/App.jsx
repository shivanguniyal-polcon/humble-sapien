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

// Tools sit second: the instruments are the product, not an appendix.
const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Tools' },
  { id: 'research', label: 'Research' },
  { id: 'data', label: 'Data' },
  { id: 'compare', label: 'Atlas' },
  { id: 'writing', label: 'Writing' },
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

  return (
    <div className="app">
      <header className="site-header">
        <div className="shell">
          <button className="brand" onClick={() => go('home')}>
            <Logo />
          </button>
          <nav className="site-nav" aria-label="Primary">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`nav-link ${route.tab === t.id ? 'nav-active' : ''}`}
                aria-current={route.tab === t.id ? 'page' : undefined}
                onClick={() => go(t.id)}
              >
                {t.label}
              </button>
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
          {route.tab === 'data' && <Data onNavigate={go} />}
          {route.tab === 'compare' && <Compare onNavigate={go} />}
          {route.tab === 'writing' && <Writing onNavigate={go} />}
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
