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

    return {
      ...development,
      matches,
      nearest,
      coverage: explicit ? 'explicit' : mentions ? 'mentions' : 'silent',
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
