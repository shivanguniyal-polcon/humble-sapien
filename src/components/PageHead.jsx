// One head for every page and every tool.
//
// The order is fixed so the site reads the same way everywhere: the English
// category in small type, the name, the one question the page answers, and a
// paragraph saying what it does and how to use it. The name is the page's h1
// and the question is its h2, so the heading outline opens at the right depth
// for the h3 sections and cards below. A page that cannot fill a line passes
// nothing, and the line is omitted rather than faked.

import { useEffect, useRef } from 'react';
import { takeRouteFocus } from '../lib/routeFocus';

export default function PageHead({
  eyebrow,
  title,
  question,
  children,
  tight = false,
  className = '',
}) {
  const titleRef = useRef(null);

  useEffect(() => {
    if (title) document.title = `${title} · THS: The Humble Sapien`;
    if (takeRouteFocus()) titleRef.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <div className={`section-head page-head${tight ? ' section-head-tight' : ''}${className ? ` ${className}` : ''}`}>
      {eyebrow ? <span className="overline">{eyebrow}</span> : null}
      <h1
        id="page-title"
        className="page-head-title"
        tabIndex={-1}
        ref={titleRef}
      >
        {title}
      </h1>
      {question ? <h2 className="page-head-question">{question}</h2> : null}
      {children ? <p className="section-strap">{children}</p> : null}
    </div>
  );
}
