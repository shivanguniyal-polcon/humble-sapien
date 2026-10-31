import { useEffect, useRef } from 'react';
import OutputTimeline from '../components/OutputTimeline';
import ScheduleRibbon from '../components/ScheduleRibbon';
import HomeClose from './HomeClose';
import HomeVision from './HomeVision';
import { takeRouteFocus } from '../lib/routeFocus';

// Home is one argument in one scroll: the frontispiece names the claim, the
// column draws the state's output, the problem is met on the way down and
// stated once the draw finishes, and the page closes on the one ask. The close
// lives inside the same flow as the chart, so there is no seam between the
// evidence and the claim it supports.

export default function Home({ onNavigate }) {
  const titleRef = useRef(null);

  useEffect(() => {
    document.title = 'THS: The Humble Sapien · The fifth pillar of democracy';
    if (takeRouteFocus()) titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="home-flow">
      {/* The ribbon is the page's first mark: the Republic's languages in their
          own scripts, before the claim. Each name is a door: it opens the house
          motto in that language, written and spoken. The frontispiece below
          carries the argument the languages belong to. */}
      <ScheduleRibbon />

      {/* The frontispiece carries the h1; the timeline answers it. Route focus
          lands on the frontispiece so a keyboard reader starts at the claim. */}
      <div id="page-title" tabIndex={-1} ref={titleRef}>
        <HomeVision onNavigate={onNavigate} />
      </div>
      <OutputTimeline onNavigate={onNavigate} />

      <HomeClose onNavigate={onNavigate} />
    </section>
  );
}
