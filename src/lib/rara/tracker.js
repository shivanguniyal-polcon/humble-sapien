// The tracker's deterministic read.
//
// It does one thing: take a development's own words and a provision's exact
// words, and report whether the provision names the same subject and whether it
// also carries a control. It is not a legal opinion. "Explicit" here means the
// provision contains both a shared term and a control marker; it does not mean
// the provision applies to the development, reaches the actor, or would survive
// a court.
//
// The topic list is a gazetteer, not a model. It is deliberately small, visible
// and editable. A term matches on word boundaries, so "model" does not fire
// inside "modelled" and "water" does not fire inside "unwatermarked".

export const TOPICS = [
  {
    id: 'identity',
    label: 'Identity',
    terms: [
      'identity', 'identity theft', 'impersonation', 'personation', 'deepfake',
      'face swap', 'voice clone', 'biometric', 'kyc', 'spoof', 'authentication',
      'unique identification', 'electronic signature', 'password',
    ],
  },
  {
    id: 'synthetic-media',
    label: 'Synthetic media',
    terms: [
      'synthetic', 'deepfake', 'face swap', 'voice clone', 'generated image',
      'image generation', 'generative', 'avatar', 'watermark', 'provenance', 'speech synthesis',
    ],
  },
  {
    id: 'personal-data',
    label: 'Personal data',
    terms: [
      'personal data', 'data fiduciary', 'data principal', 'consent', 'privacy',
      'data breach', 'data law', 'data protection', 'processing', 'erase', 'dataset',
      'training data', 'scraping',
    ],
  },
  {
    id: 'children',
    label: 'Children',
    terms: ['child', 'children', 'minor', 'student', 'age'],
  },
  {
    id: 'finance',
    label: 'Finance',
    terms: [
      'credit', 'loan', 'bank', 'insurance', 'pension', 'trading', 'market',
      'payment', 'kyc', 'financial',
    ],
  },
  {
    id: 'autonomy',
    label: 'Autonomy',
    terms: [
      'autonomous', 'agent', 'agentic', 'robot', 'drone', 'self-driving',
      'tool use', 'multi-agent',
    ],
  },
  {
    id: 'ip',
    label: 'Intellectual property',
    terms: [
      'copyright', 'patent', 'training data', 'model training', 'reproduction', 'likeness',
      'fair dealing', 'invention', 'algorithm', 'computer programme',
    ],
  },
  {
    id: 'competition',
    label: 'Competition',
    terms: [
      'price', 'prices', 'pricing', 'collusion', 'cartel', 'dominant position',
      'competition', 'market power',
    ],
  },
  {
    id: 'consumer',
    label: 'Consumer',
    terms: [
      'consumer', 'consumers', 'e-commerce', 'ecommerce', 'dark pattern', 'dark patterns',
      'marketplace', 'seller', 'sellers', 'checkout', 'subscription', 'advertisement',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    terms: [
      'cyber', 'terrorism', 'critical infrastructure', 'exploit', 'malware',
      'breach', 'security',
    ],
  },
  {
    id: 'health',
    label: 'Health',
    terms: ['therapy', 'mental health', 'clinical', 'medical', 'health'],
  },
  {
    id: 'elections',
    label: 'Elections',
    terms: ['voter', 'election', 'campaign', 'political'],
  },
  {
    id: 'labour',
    label: 'Labour',
    terms: ['worker', 'employment', 'hiring', 'job', 'labour'],
  },
  {
    id: 'general-ai',
    label: 'General AI',
    terms: [
      'artificial intelligence', 'ai model', 'ai system', 'ai tool',
      'language model', 'large language model', 'llm', 'foundation model',
      'text-generation', 'text generation', 'machine learning', 'neural network',
      'generative ai',
    ],
  },
];

// A control marker is a word that carries a duty, a prohibition, a penalty or
// an exclusion. It is evidence of a control, not proof that the control reaches
// the development in front of it.
export const CONTROL_TERMS = [
  'shall', 'must', 'prohibited', 'no enterprise', 'no person', 'penalty',
  'imprisonment', 'liable', 'deemed to be infringed', 'not inventions',
  'shall not', 'may restrict',
];

const TOPIC_BY_ID = new Map(TOPICS.map((topic) => [topic.id, topic]));

export const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// A phrase matches on boundaries, and a hyphen is the same separator as a
// space. The escaped phrase is used as a literal, so "3(k)" and "s. 66D" are
// safe if they ever appear in a term.
const hasTerm = (haystack, term) => {
  const phrase = normalize(term);
  if (!phrase) return false;
  const pattern = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\s-]+');
  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, 'i').test(haystack);
};

export const inferTopics = (text) => {
  const haystack = normalize(text);
  if (!haystack) return [];
  return TOPICS.filter((topic) => topic.terms.some((term) => hasTerm(haystack, term)))
    .map((topic) => topic.id);
};

export const topicLabel = (id) => TOPIC_BY_ID.get(id)?.label || id;

const termsFor = (topics) =>
  [...new Set(topics.flatMap((id) => TOPIC_BY_ID.get(id)?.terms || []))];

// A light plural check. "price" should meet "prices" in the Competition Act,
// and "algorithm" should meet "algorithms" in the Patents Act. This is not a
// stemmer: it adds or removes one trailing "s", and nothing else.
const variantsOf = (term) => {
  const base = normalize(term);
  if (!base) return [];
  return base.endsWith('s')
    ? [base, base.slice(0, -1)]
    : [base, `${base}s`];
};

const matchTerm = (haystack, terms) => {
  const found = [];
  for (const term of terms) {
    if (variantsOf(term).some((variant) => hasTerm(haystack, variant))) found.push(term);
  }
  return [...new Set(found)];
};

// The smallest useful unit of the tracker. It returns a status, the words that
// made it, and the exact provision it read; it does not return a verdict on
// whether the law applies.
//
// The first topic on a provision is its gate. A data-protection provision does
// not become a security provision because its quote contains "security"; the
// development has to reach the provision's own subject first. Without that
// gate, every paper with the word "security" would match the DPDP Act.
export const matchProvision = (development, provision) => {
  const text = normalize(`${development.title || ''} ${development.summary || ''}`);
  const developmentTopics = development.topics?.length
    ? development.topics
    : inferTopics(text);
  const primaryTopic = provision.topics[0];
  const quote = normalize(provision.quote);
  const sharedTopics = provision.topics.filter((topic) => developmentTopics.includes(topic));
  const gated = Boolean(primaryTopic && developmentTopics.includes(primaryTopic));
  const topicTerms = termsFor(sharedTopics);
  // A term has to appear on both sides. Finding "computer programme" in the
  // Copyright Act is not evidence that a paper about model training named it.
  const developmentTerms = matchTerm(text, topicTerms);
  const provisionTerms = matchTerm(quote, topicTerms);
  const namedTerms = gated
    ? developmentTerms.filter((term) => provisionTerms.includes(term))
    : [];
  const controlTerms = matchTerm(quote, CONTROL_TERMS);

  const score =
    Math.round(
      (namedTerms.length * 3 +
        sharedTopics.length * 1.5 +
        (controlTerms.length ? 2 : 0) +
        (gated ? 1 : 0)) *
        100,
    ) / 100;

  const status = namedTerms.length
    ? controlTerms.length
      ? 'explicit'
      : 'mentions'
    : 'silent';

  return {
    provision,
    status,
    score,
    gated,
    sharedTopics,
    developmentTerms,
    provisionTerms,
    namedTerms,
    controlTerms,
    // A provision that is silent is still returned by matchProvision so the
    // build can count what was checked and show the nearest vocabulary gap.
  };
};

export const STATUS_LABEL = {
  explicit: 'Explicit hook',
  mentions: 'Names it, no control',
  silent: 'Silent',
};

export const STATUS_NOTE = {
  explicit: 'The provision names the same subject and carries a control marker. It still has to reach the actor and the conduct.',
  mentions: 'The provision contains a shared term, but no control marker in this excerpt.',
  silent: 'No shared term in this excerpt. That is not proof that no law applies; it is proof that this corpus does not name it.',
};

// The PIT read is deliberately topic-level. It answers the project's public
// interest test even where the lexical reader finds no shared word: who could
// benefit, who could pay, and who may be missing. It is not a legal finding and
// it never upgrades a silent match. The wording is cautious because a paper,
// model card or repository is not evidence that a deployment exists in India.
const PIT_READINGS = {
  identity: {
    pathway: 'remote identity checks, impersonation and the evidence needed to challenge a false match',
    benefits: 'People who need to prove identity remotely, and services that can verify them without an in-person visit.',
    pays: 'People whose face, voice or documents are copied, and the platforms that must review and remove impersonation.',
    missing: 'People without a reliable ID, a smartphone, or the time and language to contest a false match.',
    legalRoute: 'identity, impersonation, speech and data-protection provisions',
  },
  'synthetic-media': {
    pathway: 'content provenance, defamation and the cost of removing synthetic images, audio or video',
    benefits: 'Creators and publishers who can label and authenticate their work; platforms that can route trusted content.',
    pays: 'People whose likeness is used, and the moderators, courts and platforms that absorb takedown and defamation costs.',
    missing: 'People without the money, language or documentation to prove that a synthetic record is false.',
    legalRoute: 'IT Rules synthetic-media duties, defamation, personality rights and election directions',
  },
  'personal-data': {
    pathway: 'consent, purpose limitation, breach exposure and redress over personal data',
    benefits: 'People who get faster services, and firms that can personalise without handling cash.',
    pays: 'Data principals whose information is reused or breached, and public systems that carry the harm.',
    missing: 'People who cannot read the notice, refuse consent, or reach a grievance channel in their language.',
    legalRoute: 'DPDP Act and Rules, IT Act and sectoral data rules',
  },
  children: {
    pathway: 'age assurance, parental consent, school use and child-safety moderation',
    benefits: 'Children who get safer accounts and age-appropriate services; parents who can exercise consent.',
    pays: 'Children exposed to profiling or harmful content, and schools or families without the documents to verify age.',
    missing: 'Children without a birth certificate, a guardian who can consent, or a device in their own name.',
    legalRoute: 'DPDP children’s provisions and consumer-protection duties',
  },
  finance: {
    pathway: 'credit scoring, insurance pricing, payment fraud and automated eligibility',
    benefits: 'Borrowers and policyholders who get faster decisions or access they lacked.',
    pays: 'People charged more, refused cover, or wrongly flagged, and the public institutions that absorb exclusion.',
    missing: 'People outside formal credit, without a digital trail, or unable to contest an automated refusal.',
    legalRoute: 'RBI technology and fair-practice directions, SEBI CSCRF, consumer protection and DPDP',
  },
  autonomy: {
    pathway: 'automated decisions, physical safety and liability when an agent or robot acts',
    benefits: 'Firms and users who get cheaper, faster or safer operations; workers who move to higher-value tasks.',
    pays: 'Workers whose tasks are automated, and people injured or stranded by an automated decision.',
    missing: 'Informal workers, people with disabilities, and users outside the operator’s language or map.',
    legalRoute: 'consumer safety, tort and criminal liability, telecom and sectoral safety rules',
  },
  ip: {
    pathway: 'training-data licensing, authorship, likeness and the market for creative work',
    benefits: 'Rights holders who can license, and users who get new tools built on lawful inputs.',
    pays: 'Creators whose work is copied without payment, and smaller studios without litigation capacity.',
    missing: 'Unregistered creators, folk and language communities, and workers whose contribution is not credited.',
    legalRoute: 'Copyright Act, Patents Act, personality rights and contract',
  },
  competition: {
    pathway: 'market concentration, compute access, pricing and algorithmic coordination',
    benefits: 'Consumers who see lower prices or new entrants; firms that can buy cheaper compute.',
    pays: 'Users and suppliers when a dominant platform raises prices or restricts access.',
    missing: 'Small firms, local-language users, and markets too thin to attract a competitor.',
    legalRoute: 'Competition Act, sectoral pricing rules and public-procurement transparency',
  },
  consumer: {
    pathway: 'dark patterns, misleading claims, subscriptions and access to redress',
    benefits: 'Consumers who get convenience, lower prices or better disclosure.',
    pays: 'People who pay for unwanted subscriptions, are misled, or cannot find a human to cancel.',
    missing: 'Low-digital-literacy users, people without a card, and those who cannot read the terms.',
    legalRoute: 'Consumer Protection Act, e-commerce rules and advertising standards',
  },
  security: {
    pathway: 'breach exposure, incident response, critical-infrastructure risk and security costs',
    benefits: 'Users and firms that face fewer successful attacks; vendors that can prove security.',
    pays: 'Victims of breaches, small firms without a security team, and public services that must recover.',
    missing: 'Users who never learn their data was taken, and small vendors outside the audit chain.',
    legalRoute: 'CERT-In directions, IT Act, telecom cyber-security rules and sectoral frameworks',
  },
  health: {
    pathway: 'clinical safety, access, health-data privacy and the cost of automated triage',
    benefits: 'Patients who get earlier or cheaper care; clinicians who can triage at scale.',
    pays: 'Patients harmed by a wrong recommendation, and public hospitals that carry the follow-up cost.',
    missing: 'Rural patients, people without a digital record, and languages absent from the training data.',
    legalRoute: 'health-sector regulation, medical-device rules, DPDP and consumer protection',
  },
  elections: {
    pathway: 'synthetic campaign content, voter deception and the speed of takedown',
    benefits: 'Voters who get faster fact-checks; parties and platforms that can label authentic material.',
    pays: 'Voters exposed to a deepfake, and election officials who must correct the record under time pressure.',
    missing: 'First-time voters, linguistic minorities, and people who see the video after the correction.',
    legalRoute: 'Article 324 ECI election directions, IT Rules synthetic-media duties and speech law',
  },
  labour: {
    pathway: 'hiring, task automation, worker surveillance and the terms of new AI work',
    benefits: 'Workers who get new tools, higher productivity or access to remote work.',
    pays: 'Workers whose tasks are automated or monitored, and households that absorb the transition.',
    missing: 'Informal workers, gig workers, and people whose jobs are not in the training data.',
    legalRoute: 'labour law, occupational safety, social-security and anti-discrimination guarantees',
  },
  'general-ai': {
    pathway: 'information quality, labour, access to compute and the accountability of AI-mediated decisions',
    benefits: 'People who get cheaper or faster services; firms and researchers who can build on the model.',
    pays: 'Workers and users exposed to errors, and the public institutions that must correct them.',
    missing: 'People without digital access, local-language representation, or the ability to contest an automated outcome.',
    legalRoute: 'the AI-relevant stack: IT Rules, DPDP, consumer, competition, labour and sectoral rules',
  },
};

// The development's own topics choose the PIT reading. If the text yields no
// topic, the fallback still says that it is a reading gap rather than claiming
// an effect. The lexical match, when one exists, is reported separately.
export const inferImplication = (development, { matches = [], nearest = [], topics } = {}) => {
  const text = `${development?.title || ''} ${development?.summary || ''}`;
  const itemTopics = topics?.length
    ? topics
    : development?.topics?.length
      ? development.topics
      : inferTopics(text);
  const primaryId = itemTopics.find((id) => id !== 'general-ai') || itemTopics[0] || 'general-ai';
  const reading = PIT_READINGS[primaryId] || PIT_READINGS['general-ai'];
  const labels = itemTopics.map(topicLabel).filter(Boolean);
  const firstMatch = matches[0]?.provision;
  const firstNearest = nearest[0]?.provision;
  const cite = (provision) =>
    `${provision.instrumentShort || provision.instrument || 'provision'} ${provision.pinCite || ''}`.trim();
  const legal = firstMatch
    ? `Lexical hook found in ${cite(firstMatch)}.`
    : firstNearest
      ? `Closest legal vocabulary: ${cite(firstNearest)}; no shared word.`
      : 'No provision in this corpus shares the development’s subject; that is a vocabulary gap, not a clearance.';
  const sourceNote = development?.sourceType === 'code'
    ? ' This is repository metadata; deployment in India is not established.'
    : '';

  return {
    topic: primaryId,
    pathway: reading.pathway,
    benefits: reading.benefits,
    pays: reading.pays,
    missing: reading.missing,
    legalRoute: reading.legalRoute,
    legal,
    basis: `India PIT read inferred from the item’s subject (${labels.join(', ') || 'no stable subject'}), not from a legal match.${sourceNote}`,
  };
};

export const buildTracker = (developments, legalTexts, { limit = 3 } = {}) => {
  const items = (developments || []).map((development) => {
    const candidates = (legalTexts || []).map((provision) =>
      matchProvision(development, provision),
    );
    const matches = candidates
      .filter((match) => match.status !== 'silent')
      .sort((a, b) => b.score - a.score || a.provision.id.localeCompare(b.provision.id))
      .slice(0, limit);
    const nearest = candidates
      .filter((match) => match.status === 'silent' && match.gated && match.sharedTopics.length)
      .sort((a, b) => b.score - a.score || a.provision.id.localeCompare(b.provision.id))
      .slice(0, 2);

    const explicit = matches.filter((match) => match.status === 'explicit').length;
    const mentions = matches.filter((match) => match.status === 'mentions').length;
    const coverage = explicit ? 'explicit' : mentions ? 'mentions' : 'silent';

    return {
      ...development,
      matches,
      nearest,
      coverage,
      implication: inferImplication(development, {
        matches,
        nearest,
        topics: development.topics,
      }),
    };
  });

  const counts = items.reduce(
    (totals, item) => {
      totals[item.coverage] += 1;
      return totals;
    },
    { explicit: 0, mentions: 0, silent: 0 },
  );

  return {
    items,
    counts,
    total: items.length,
    checked: (legalTexts || []).length,
  };
};

// Where the publishing institution sits. This is not where the work was done,
// and a preprint has no stated affiliation at all: those are counted as
// unplaced rather than pinned to a country the feed never gave.
export const summarizePlaces = (items) => {
  const byCountry = new Map();
  let unplaced = 0;

  for (const item of items || []) {
    const place = item.place;
    if (!place?.iso) {
      unplaced += 1;
      continue;
    }
    const entry = byCountry.get(place.iso) || {
      iso: place.iso,
      country: place.country || place.iso,
      cities: [],
      publishers: [],
      count: 0,
    };
    entry.count += 1;
    if (place.city && !entry.cities.includes(place.city)) entry.cities.push(place.city);
    if (item.sourceLabel && !entry.publishers.includes(item.sourceLabel)) {
      entry.publishers.push(item.sourceLabel);
    }
    byCountry.set(place.iso, entry);
  }

  const countries = [...byCountry.values()].sort(
    (a, b) => b.count - a.count || a.country.localeCompare(b.country),
  );

  return {
    countries,
    placed: countries.reduce((total, entry) => total + entry.count, 0),
    unplaced,
  };
};

export const formatDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'date not stated';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// A page is a reading unit, not a data limit: the tracker still builds every
// item and the map still sees the filtered set. Ten is enough for one sitting
// without turning the list into an endless scroll.
export const PAGE_SIZE = 10;

export const paginate = (items, page = 1, pageSize = PAGE_SIZE) => {
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Math.floor(Number(pageSize) || PAGE_SIZE));
  const pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), pages);
  const offset = (current - 1) * size;

  return {
    items: list.slice(offset, offset + size),
    page: current,
    pages,
    pageSize: size,
    start: list.length ? offset + 1 : 0,
    end: Math.min(offset + size, list.length),
    total: list.length,
  };
};

// Keep the first and last page visible while limiting the middle to the pages
// around the current one. `null` is a visual gap, not a page number.
export const pageWindow = (page, pages, span = 2) => {
  const total = Math.max(1, Math.floor(Number(pages) || 1));
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), total);
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const values = new Set([1, total]);
  for (let offset = -span; offset <= span; offset += 1) {
    const value = current + offset;
    if (value >= 1 && value <= total) values.add(value);
  }

  const sorted = [...values].sort((a, b) => a - b);
  return sorted.flatMap((value, index) => {
    if (index === 0) return [value];
    return value - sorted[index - 1] > 1 ? [null, value] : [value];
  });
};
