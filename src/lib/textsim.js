// Text similarity for policy corpora.
//
// Two things live here, and both are deliberately simple so that a reader
// can check them by hand:
//
//   1. Readability and bindingness. `deonticDensity` counts the modal
//      verbs that make a sentence binding ("shall", "must", "may"). Flesch
//      says how hard a text is to read; deontic density says how much
//      obligation it carries. A document can be unreadable and toothless,
//      or plain-spoken and sharp, and the two numbers separate those cases.
//
//   2. Vocabulary overlap. `tfidf` weights every term in a provision by how
//      rare it is across the whole corpus, `cosine` compares two documents
//      by the angle between those weighted vectors, and `centroid` averages
//      a group of documents so a single document can be compared with "the
//      Global North" as a body of writing rather than with one text.
//
// The uncertainty helpers matter as much as the estimates. `bootstrap`
// resamples provisions to get an interval on a statistic, and
// `permutationTest` asks the only question that matters about a similarity
// gap: would a corpus of legal text produce this gap anyway, if the region
// labels were shuffled? Without that test, "India is more similar to the
// North" is a statement about vocabulary, not about evidence.
//
// Everything runs in the browser or in Node. No network, no dependencies.

// Words that carry no signal about what a rule says.
export const STOPWORDS = new Set(
  `a about above after again against all also am an and any are as at be because been
   before being below between both but by can cannot could did do does doing done down
   during each few for from further had has have having he her here hers herself him
   himself his how i if in into is it its itself just me more most my myself no nor not
   now of off on once only or other our ours ourselves out over own same she should so
   some such than that the their theirs them themselves then there these they this those
   through to too under until up very was we were what when where which while who whom
   why will with would you your yours yourself yourselves shall may must upon therein
   hereby therein provided however whether whom said such same aforementioned
   purposes purpose section act regulation rule rules article paragraph subsection`
    .split(/\s+/)
    .filter(Boolean),
);

// Binding language. Each entry is a phrase; a phrase counts once, however
// many times it appears.
export const DEONTIC = [
  'shall', 'must', 'should', 'may', 'is required to', 'are required to',
  'is obliged to', 'are obliged to', 'is authorised to', 'are authorised to',
  'is entitled to', 'are entitled to', 'is prohibited', 'are prohibited',
  'is liable to', 'are liable to', 'it is the duty of', 'has the duty',
];

// Light stemming: enough to collapse inflections that would otherwise
// split a term across two documents ("controllers" and "controller").
export const stem = (word) => {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('sses')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('es') && !/[aeiou]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed') && !/[aeiou]ed$/.test(w)) w = w.slice(0, -2);
  return w;
};

// Words of three letters or more, lowercased and stemmed, stopwords out.
export const tokenise = (text) => {
  const out = [];
  const words = String(text).toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  for (const w of words) {
    if (w.length < 3) continue;
    if (STOPWORDS.has(w)) continue;
    out.push(stem(w));
  }
  return out;
};

export const termFrequencies = (text) => {
  const tf = new Map();
  for (const t of tokenise(text)) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
};

// Binding verbs per 1,000 words. Returns null when there is no text.
export const deonticDensity = (text) => {
  const words = (String(text).match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  if (!words) return null;
  const lower = ` ${String(text).toLowerCase()} `;
  let hits = 0;
  for (const phrase of DEONTIC) {
    let from = 0;
    let count = 0;
    for (;;) {
      const at = lower.indexOf(phrase, from);
      if (at === -1) break;
      count += 1;
      from = at + phrase.length;
    }
    hits += count;
  }
  return (hits / words) * 1000;
};

// TF-IDF over a set of documents (here: provisions). Returns the idf table
// and a vector per document. The idf is held separately so a bootstrap can
// resample documents while keeping the term weights fixed, which is what
// "how much does this estimate move if the text were different" means.
export const tfidf = (documents) => {
  const tfs = documents.map((d) => termFrequencies(d));
  const df = new Map();
  for (const tf of tfs) {
    for (const term of tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  }
  const n = documents.length || 1;
  const idf = new Map();
  for (const [term, count] of df) idf.set(term, Math.log((n + 1) / (count + 0.5)));
  const vectors = tfs.map((tf) => {
    const vec = new Map();
    let norm = 0;
    for (const [term, count] of tf) {
      const w = (1 + Math.log(count)) * (idf.get(term) || 0);
      if (w <= 0) continue;
      vec.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of vec) vec.set(term, w / norm);
    return vec;
  });
  return { idf, vectors, tfs };
};

export const cosine = (a, b) => {
  let dot = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, w] of small) {
    const other = large.get(term);
    if (other) dot += w * other;
  }
  return dot;
};

// Sum a document's provision vectors into one document vector, then
// renormalise so that length does not drive similarity.
export const documentVector = (vectors) => {
  const out = new Map();
  for (const vec of vectors) {
    for (const [term, w] of vec) out.set(term, (out.get(term) || 0) + w);
  }
  let norm = 0;
  for (const w of out.values()) norm += w * w;
  norm = Math.sqrt(norm) || 1;
  for (const [term, w] of out) out.set(term, w / norm);
  return out;
};

// The average direction of a group of documents.
export const centroid = (vectors) => {
  const out = new Map();
  for (const vec of vectors) {
    for (const [term, w] of vec) out.set(term, (out.get(term) || 0) + w);
  }
  let norm = 0;
  for (const w of out.values()) norm += w * w;
  norm = Math.sqrt(norm) || 1;
  for (const [term, w] of out) out.set(term, w / norm);
  return out;
};

// A deterministic pseudo-random generator, so a bootstrap or a permutation
// test can be reproduced exactly from its seed.
export const rng = (seed) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};

export const percentile = (sorted, p) => {
  if (!sorted.length) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

// Resample documents with replacement and re-run the statistic. `statistic`
// receives a function that maps a resampled index list to a number.
export const bootstrap = (count, statistic, { seed = 42, draws = 600 } = {}) => {
  const rand = rng(seed);
  const out = [];
  for (let b = 0; b < draws; b += 1) {
    const idx = [];
    for (let i = 0; i < count; i += 1) idx.push(Math.floor(rand() * count));
    out.push(statistic(idx));
  }
  const sorted = out.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  return {
    draws: sorted.length,
    mean: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : NaN,
    lo: percentile(sorted, 0.025),
    hi: percentile(sorted, 0.975),
    values: sorted,
  };
};

// Shuffle the group labels and re-run the statistic. The result is the
// distribution the statistic would have if the grouping carried no
// information, which is the null the headline claim has to beat.
export const permutationTest = (statistic, { seed = 7, draws = 2000 } = {}) => {
  const rand = rng(seed);
  const observed = statistic();
  const nullValues = [];
  for (let b = 0; b < draws; b += 1) nullValues.push(statistic(true));
  const extreme = nullValues.filter((v) => Math.abs(v) >= Math.abs(observed) - 1e-12).length;
  const sorted = nullValues.slice().sort((a, b) => a - b);
  return {
    observed,
    nullValues: sorted,
    p: (extreme + 1) / (draws + 1),
    lo: percentile(sorted, 0.025),
    hi: percentile(sorted, 0.975),
  };
};

// The best-matching provision of a target document for a given provision.
export const bestMatch = (vector, targetVectors) => {
  let best = -1;
  let at = -1;
  for (let i = 0; i < targetVectors.length; i += 1) {
    const score = cosine(vector, targetVectors[i]);
    if (score > best) {
      best = score;
      at = i;
    }
  }
  return { score: best, index: at };
};
