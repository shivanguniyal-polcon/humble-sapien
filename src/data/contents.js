// The site's destinations, in one place. The newspaper index page lists
// them; nothing else may invent its own copy of the menu. Every entry names
// the door and what it opens — a menu of labels alone would be a quiz.

import { TOOLS } from './tools';
import { publications } from './publications';

export const CONTENTS = [
  {
    tab: 'work',
    label: 'Tools',
    count: `${TOOLS.length} instruments`,
    what: 'Instruments that run live in your browser, from cost-benefit analysis to the evaluation engine and the village money tool. Every one ends by telling you what it cannot prove.',
  },
  {
    tab: 'research',
    label: 'Research',
    count: `${publications.length} publications`,
    what: 'Reports, briefs and working papers with methods and citations attached, and a distributional block on every one.',
  },
  {
    tab: 'data',
    label: 'Data',
    count: 'Open and Commons',
    what: 'A playground, not a catalogue. Chart any series, pair two datasets, and read who is missing from the result.',
  },
  {
    tab: 'archive',
    label: 'Smriti — The Archive',
    count: 'Public documents',
    what: 'Government documents held with their citations, searchable, with the gap stated where a document is not held.',
  },
  {
    tab: 'compare',
    label: 'Atlas',
    count: '15 sectors, 90 policies',
    what: 'Ninety flagship policies across two hemispheres: what each region built, and where the approaches split.',
  },
  {
    tab: 'writing',
    label: 'Writing',
    count: 'Essays',
    what: 'Plain-language notes from the founder on why policy reading must evolve, and how the work is done.',
  },
  {
    tab: 'newsletter',
    label: 'Newsletter',
    count: 'Regular notes',
    what: 'What THS shipped, what it found, and what is coming — for readers who want the work in their inbox.',
  },
  {
    tab: 'pitdesk',
    label: 'PIT Desk',
    count: 'Public interest test',
    what: 'Policy, read through the public interest test: government releases and bills answered with three questions — who benefits, who pays, who is missing.',
  },
  {
    tab: 'about',
    label: 'About',
    count: 'Who we are',
    what: 'The institution behind the tools: what THS is, how it works, and what it refuses to do.',
  },
  {
    tab: 'support',
    label: 'Support',
    count: 'Keep it free',
    what: 'The tools are free for citizens and civil society. This is how the work gets paid for.',
  },
];
