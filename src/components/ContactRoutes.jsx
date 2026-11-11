import { schemeContacts } from '../lib/contacts';
import { verificationText } from '../lib/verification';
import { copyFor } from '../data/samparkCopy';

// How to reach the office the ladder names.
//
// The rungs say who decides and where to go. This block says how to reach
// them without leaving the page: the scheme's own portal, a verified
// helpline where one exists, and CPGRAMS, plus a pointer to the curated
// helplines where the scheme has them. Where no number is recorded, the gap
// says so instead of leaving the reader to guess.
//
// The helpline carries its own date and source, apart from the scheme-portal
// check, because a phone number rots faster than a portal address.
export default function ContactRoutes({ schemeId, step, t = copyFor('en') }) {
  const routes = schemeContacts(schemeId);
  if (!routes) return null;

  const titleId = `contact-routes-${schemeId}`;

  return (
    <section className="contact-routes" aria-labelledby={titleId}>
      <h3 className="pane-title" id={titleId}>
        {step ? `${step}. ` : ''}{t.step4}
      </h3>
      <ul className="contact-list">
        {routes.channels.map((channel) => (
          <li key={channel.kind}>
            <a
              href={channel.href}
              {...(channel.kind === 'phone'
                ? {}
                : { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {channel.label}
            </a>
            <span className="meta">
              {channel.text}
              {channel.note ? ` · ${channel.note}` : ''}
            </span>
          </li>
        ))}
        {routes.directory && (
          <li>
            <span className="meta contact-directory">{t.contactDirectory}</span>
          </li>
        )}
      </ul>
      {routes.gap && <p className="meta contact-gap">{routes.gap}</p>}
      <p className={`meta verification verification-${routes.check.state}`}>
        {verificationText(t, routes.check)}
      </p>
      {routes.helplineCheck && (
        <p className={`meta verification verification-${routes.helplineCheck.state}`}>
          {verificationText(t, routes.helplineCheck)} {t.sourceLabel}{' '}
          {routes.helplineCheck.source.replace(/^https?:\/\//, '')}
        </p>
      )}
    </section>
  );
}
