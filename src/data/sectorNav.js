// The Atlas tab's nav dropdown needs fifteen ids and labels — nothing more.
//
// sectors.js carries the full atlas: policies, years, design traits, PIT
// readings and sources, for fifteen sectors. That is ~92 kB of content the
// landing page has no use for, and a static import of it into App.jsx would
// ship all of it on first load. So the nav metadata lives here instead, and
// App.jsx reads this file. Compare.jsx still imports sectors.js directly,
// behind its own lazy chunk, where the content belongs.
//
// The two lists must not drift. scripts/test-atlas.mjs fails if the ids or
// labels here disagree with sectors.js, so a renamed sector cannot silently
// leave a dead nav item behind.

export const SECTOR_NAV = [
  { id: 'tech', label: 'Technology & digital' },
  { id: 'ai', label: 'Artificial intelligence' },
  { id: 'health', label: 'Health coverage' },
  { id: 'industrial', label: 'Industrial policy' },
  { id: 'labour', label: 'Labour & work' },
  { id: 'education', label: 'Education' },
  { id: 'environment', label: 'Environment & biodiversity' },
  { id: 'climate', label: 'Climate & energy transition' },
  { id: 'crime', label: 'Crime & policing' },
  { id: 'justice', label: 'Justice & legal aid' },
  { id: 'women-children', label: 'Women & children' },
  { id: 'youth', label: 'Youth: jobs & skills' },
  { id: 'security', label: 'Security & defence' },
  { id: 'foreign', label: 'Foreign policy & cooperation' },
  { id: 'niche', label: 'Niche & innovation' },
];
