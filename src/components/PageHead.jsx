// One head for every page and every tool.
//
// The order is fixed so the site reads the same way everywhere: the English
// category in small type, the name, the one question the page answers, and a
// paragraph saying what it does and how to use it. A page that cannot fill a
// line passes nothing, and the line is omitted rather than faked.

export default function PageHead({
  eyebrow,
  title,
  question,
  children,
  tight = false,
  className = '',
}) {
  return (
    <div className={`section-head page-head${tight ? ' section-head-tight' : ''}${className ? ` ${className}` : ''}`}>
      {eyebrow ? <span className="overline">{eyebrow}</span> : null}
      <h2 className="page-head-title">{title}</h2>
      {question ? <p className="page-head-question">{question}</p> : null}
      {children ? <p className="section-strap">{children}</p> : null}
    </div>
  );
}
