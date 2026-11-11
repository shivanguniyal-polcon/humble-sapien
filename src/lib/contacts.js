// The contact routes behind a scheme.
//
// Three layers, each with its own provenance:
//
// 1. The scheme's own portal, which the corpus already carries and the test
//    pins to a government host.
// 2. A helpline, but only where an official page was read and printed the
//    digits. Each number carries the page it came from and the day it was
//    read; a number without both does not belong here.
// 3. CPGRAMS, the central grievance route the escalation directory already
//    treats as verified.
//
// A scheme with a curated escalation directory (PM-JAY today) also has phone
// helplines and state grievance officers; the page points at those rather
// than copying them into a second place where they could drift.
//
// No number is invented here. Where no official page printed one, the gap
// note says so.

import { SCHEMES } from '../data/schemes.js';
import { escalation } from '../data/escalation.js';
import { SCHEME_CONTACT_GAPS, SCHEME_HELPLINES } from '../data/contacts.js';
import { helplineKey, verificationFor } from '../data/verification.js';
import { stateFor, verification } from './verification.js';

const CPGRAMS = {
  kind: 'grievance',
  label: 'CPGRAMS',
  href: 'https://pgportal.gov.in',
  text: 'pgportal.gov.in',
  note: 'Tracked central grievance',
};

// A number a phone can dial: digits, with a leading + kept for a country code.
const dialable = (number) => number.replace(/[^\d+]/g, '');

export function schemeContacts(schemeId, now = new Date()) {
  const scheme = SCHEMES.find((s) => s.id === schemeId);
  if (!scheme) return null;

  const directory = Boolean(escalation[schemeId]);
  const helpline = SCHEME_HELPLINES[schemeId] || null;

  const channels = [
    {
      kind: 'portal',
      label: `${scheme.name} portal`,
      href: scheme.portal,
      text: scheme.portal.replace(/^https?:\/\//, ''),
      note: 'Official scheme page',
    },
    ...(helpline
      ? [
          {
            kind: 'phone',
            label: helpline.label,
            href: `tel:${dialable(helpline.numbers[0])}`,
            text: helpline.numbers.join(' · '),
            note: helpline.handles,
          },
        ]
      : []),
    {
      ...CPGRAMS,
      note:
        schemeId === 'ssy'
          ? 'Not for account or bank disputes'
          : CPGRAMS.note,
    },
  ];

  return {
    channels,
    directory,
    helplines: helpline ? [helpline] : [],
    // A phone number rots faster than a portal address, so the helpline is
    // dated against the contact window, not the scheme window.
    helplineCheck: helpline
      ? {
          ...stateFor(verificationFor('schemes', helplineKey(schemeId)), 'contacts', now),
          source: helpline.source,
        }
      : null,
    gap: SCHEME_CONTACT_GAPS[schemeId] || null,
    check: verification('schemes', schemeId, now),
  };
}
