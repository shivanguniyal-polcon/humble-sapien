// RARA's deterministic engine, ported from the Python prototype (engine.py)
// that lives outside this repository. Same maths, same signals, no model call:
// BM25 over the 16-pillar statutory corpus, a domain-keyword boost, a
// zero-policy-vacuum detector, and the severity formula that decides whether a
// capability is a breach, a lag or safe harbour.
//
// Two deliberate differences from the prototype. First, when nothing in the
// registry is triggered it reports no vacuum rather than falling back to the
// first entry: an instrument that invents a gap is worse than one that says
// none. Second, a trigger matches whole words, not substrings, and the
// denominator of the overlap score ignores short words and stopwords — the
// prototype flagged the data-centre vacuum on the word "unwatermarked"
// because it contains "water".

export const tokenize = (text) => (text.toLowerCase().match(/[a-z0-9_]+/g) || []);

// The words the prototype treats as evidence of harm, and of care. They are
// part of the score, so they live here in the open rather than in prose.
export const HIGH_RISK_SIGNALS = [
  'zero-shot', 'voice clon', 'deepfake', 'abliterated', 'uncensored',
  'exploit', '0-day', 'zero-day', 'autonomous', 'scraping', 'scraped',
  'personation', 'bypass', 'unaligned', 'collusion', 'supra-competitive',
  'malware', 'biometric', 'spoofing', 'zero acoustic watermark', 'unwatermarked',
  'viral', 'protein', 'retrosynthesis', 'parasocial', 'therapy', 'bci', 'eeg', 'sentencing',
];

export const SAFE_SIGNALS = [
  'differential privacy', 'explainable ai', 'fairness audit',
  'safety alignment', 'guardrail', 'compliant with',
];

export const buildIndex = (statutes) => {
  const docs = statutes.map((entry) =>
    tokenize(
      [
        entry.title,
        entry.statute,
        entry.pillar,
        entry.summary,
        entry.policyLag,
        // The prototype triples the keyword block so domain words outweigh
        // prose that happens to share a token.
        `${entry.keywords.join(' ')} ${entry.keywords.join(' ')} ${entry.keywords.join(' ')}`,
      ].join(' '),
    ),
  );

  const df = new Map();
  let total = 0;
  for (const doc of docs) {
    total += doc.length;
    for (const token of new Set(doc)) df.set(token, (df.get(token) || 0) + 1);
  }

  return { statutes, docs, df, avgdl: total / Math.max(statutes.length, 1) };
};

const bm25 = (index, docTokens, queryTokens) => {
  const n = index.statutes.length;
  const k1 = 1.5;
  const b = 0.75;
  const tf = new Map();
  for (const token of docTokens) tf.set(token, (tf.get(token) || 0) + 1);

  let score = 0;
  for (const token of new Set(queryTokens)) {
    const frequency = tf.get(token);
    if (!frequency) continue;
    const docFreq = index.df.get(token) || 0;
    const idf = Math.log(1 + (n - docFreq + 0.5) / (docFreq + 0.5));
    const denominator = frequency + k1 * (1 - b + (b * docTokens.length) / index.avgdl);
    score += idf * ((frequency * (k1 + 1)) / denominator);
  }
  return score;
};

// Two provisions, as in the prototype: the primary exposure and the one that
// catches the same capability from another side.
export const search = (index, query, topK = 2) => {
  const queryTokens = tokenize(query);
  const lower = query.toLowerCase();

  const scored = index.statutes.map((entry, i) => {
    const lexical = bm25(index, index.docs[i], queryTokens);
    const keywords = entry.keywords.filter((word) => lower.includes(word.toLowerCase()));
    return {
      entry,
      score: Math.round((lexical + keywords.length * 3.2) * 100) / 100,
      keywords: keywords.slice(0, 5),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter((item) => item.score > 0).slice(0, topK);
  return positive.length ? positive : scored.slice(0, 2);
};

// Words that carry no evidence of a domain. Without this list the overlap
// score is driven by "of", "can", "that" and "from".
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'these', 'those', 'into',
  'over', 'under', 'between', 'their', 'its', 'are', 'was', 'were', 'has', 'have',
  'had', 'not', 'but', 'can', 'may', 'any', 'all', 'out', 'off', 'own', 'per',
  'via', 'who', 'whom', 'whose', 'which', 'when', 'where', 'why', 'how', 'also',
  'such', 'than', 'then', 'they', 'them', 'there', 'here', 'been', 'being', 'does',
  'did', 'doing', 'more', 'most', 'some', 'only', 'other', 'same', 'very', 'just',
  'will', 'would', 'should', 'could', 'about', 'after', 'before', 'during', 'each',
  'few', 'both', 'because', 'while', 'within', 'without', 'across', 'against',
  'among', 'around', 'through', 'upon', 'onto', 'yet', 'nor', 'either', 'neither',
]);

const carriesWeight = (token) => token.length > 2 && !STOPWORDS.has(token);

// A trigger is a word or a phrase, so it matches on boundaries — "water" must
// not fire inside "unwatermarked" — while a hyphen and a space are the same
// separator, because the corpus writes both.
const hasTrigger = (haystack, needle) => {
  const pattern = needle
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[\s-]+/g, '[\\s-]+');
  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, 'i').test(haystack);
};

export const detectVacuums = (vacuums, query, max = 2) => {
  const lower = query.toLowerCase();
  const tokens = tokenize(query).filter(carriesWeight);

  const flagged = [];
  for (const vac of vacuums) {
    const triggers = vac.triggers.filter((word) => hasTrigger(lower, word));
    let score = triggers.length * 3.5;

    const domainTokens = new Set(tokenize(`${vac.domain} ${vac.description}`).filter(carriesWeight));
    let overlap = 0;
    for (const token of new Set(tokens)) if (domainTokens.has(token)) overlap += 1;
    score += overlap * 0.45;

    if (triggers.length || score >= 3) {
      flagged.push({
        vac,
        score: Math.round(score * 100) / 100,
        triggers: triggers.slice(0, 5),
      });
    }
  }

  flagged.sort((a, b) => b.score - a.score);
  return flagged.slice(0, max);
};

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const runTriage = ({ statutes, vacuums }, text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return { empty: true, severity: 0, status: null, matches: [], vacuums: [] };
  }

  const index = buildIndex(statutes);
  const matches = search(index, trimmed, 2);
  const flagged = detectVacuums(vacuums, trimmed, 2);

  const lower = trimmed.toLowerCase();
  const riskHits = HIGH_RISK_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const safeHits = SAFE_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const topScore = matches[0]?.score ?? 1;

  const severity = Math.round(
    clamp(
      4.2 + riskHits * 1.05 + Math.min(topScore * 0.16, 2.4) + 0.65 * flagged.length - safeHits * 0.9,
      3,
      9.8,
    ) * 10,
  ) / 10;

  const highlights = matches.map((match, i) => {
    const status = severity >= 7.5 && i === 0 ? 'RED' : severity >= 5 || i >= 1 ? 'AMBER' : 'GREEN';
    return {
      status,
      entry: match.entry,
      score: match.score,
      evidence: match.keywords.length
        ? `Matched on its own words: ${match.keywords.join(', ')}`
        : 'Matched by statutory domain, with no exact phrase in the text.',
    };
  });

  return {
    empty: false,
    severity,
    status: highlights[0]?.status ?? 'AMBER',
    matches: highlights,
    vacuums: flagged,
    riskHits,
    safeHits,
  };
};
