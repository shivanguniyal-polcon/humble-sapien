import { useEffect, useRef } from 'react';
import OutputTimeline from '../components/OutputTimeline';
import HomeClose from './HomeClose';
import { takeRouteFocus } from '../lib/routeFocus';

// Home is one argument in one scroll: the column draws the state's output, the
// problem is met on the way down and stated once the draw finishes, and the
// page closes on the one ask. The close lives inside the same flow as the
// chart, so there is no seam between the evidence and the claim it supports.

export default function Home({ onNavigate }) {
  const titleRef = useRef(null);

  useEffect(() => {
    document.title = 'THS: The Humble Sapien · The fifth pillar of democracy';
    if (takeRouteFocus()) titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="home-flow">
      {/* The timeline is the page: its heading is the h1, and route focus lands
          on the wrapper so the next Tab starts inside the chart's controls. */}
      <div id="page-title" tabIndex={-1} ref={titleRef}>
        <OutputTimeline />
      </div>

      <HomeClose onNavigate={onNavigate} />
    </section>
  );
}
