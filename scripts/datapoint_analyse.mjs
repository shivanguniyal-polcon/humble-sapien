#!/usr/bin/env node
// Data Point analysis: readability and vocabulary lineage for the policy
// corpus built by scripts/datapoint_build.py.
//
//     node scripts/datapoint_analyse.mjs
//
// Reads   articles/datapoint-ai-policy-readability/data/corpus.json
// Writes  articles/datapoint-ai-policy-readability/data/results.json
//
// What it computes, and why each piece is here:
//
//   1. Flesch Reading Ease and Flesch-Kincaid grade level per instrument,
//      plus a deontic density (binding verbs per 1,000 words). Readability
//      says how hard a text is; deontic density says how much obligation it
//      carries. A statute can be unreadable and toothless, or plain-spoken
//      and sharp, and the two numbers keep those apart.
//
//   2. TF-IDF cosine similarity between every instrument and the centroid
//      of the Global North corpus and of the Global South corpus. The
//      centroid is the average direction of a region's documents, so
//      "similar to the North" means similar to the North as a body of
//      writing, not to one statute in particular.
//
//   3. A bootstrap interval on the gap (North similarity minus South
//      similarity), resampling provisions, because the gap is the headline
//      claim and it needs an uncertainty attached to it.
//
//   4. A permutation test: shuffle the region labels and recompute the
//      gap. This is the question that decides whether the gap means
//      anything. If legal prose produced this gap anyway, the labels are
//      decoration.
//
//   5. A genre control, because comparing a statute to a strategy measures
//      genre as much as region.
//
//   6. A lineage analysis: for each Indian provision, which region's
//      nearest neighbour is it? And which concepts travel between regions?

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { flesch } from '../src/lib/flesch.js';
import {
  centroid,
  cosine,
  deonticDensity,
  documentVector,
  percentile,
  permutationTest,
  rng,
  tfidf,
  tokenise,
} from '../src/lib/textsim.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DATA_DIR = path.join(ROOT, 'articles', 'datapoint-ai-policy-readability', 'data');
const CORPUS_PATH = path.join(DATA_DIR, 'corpus.json');
const RESULTS_PATH = path.join(DATA_DIR, 'results.json');

const REGIONS = ['india', 'north', 'south'];
const REGION_LABEL = { india: 'India', north: 'Global North', south: 'Global South' };

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const round = (value, digits = 3) =>
  Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : null;

// Text normalised for phrase matching: lower case, punctuation to spaces.
const normalise = (text) =>
  ` ${String(text)
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

// Exact two-sided binomial test, for the nearest-neighbour counts.
const binomialTwoSided = (successes, trials, p = 0.5) => {
  if (!trials) return 1;
  const logChoose = (n, k) => {
    let total = 0;
    for (let i = 0; i < k; i += 1) total += Math.log(n - i) - Math.log(i + 1);
    return total;
  };
  const prob = (k) => Math.exp(logChoose(trials, k) + k * Math.log(p) + (trials - k) * Math.log(1 - p));
  const observed = prob(successes);
  let total = 0;
  for (let k = 0; k <= trials; k += 1) {
    if (prob(k) <= observed + 1e-12) total += prob(k);
  }
  return Math.min(1, total);
};

const main = () => {
  const corpus = readJson(CORPUS_PATH);
  const instruments = corpus.instruments;
  if (!instruments.length) {
    console.error('corpus.json has no instruments; run scripts/datapoint_build.py first');
    process.exit(1);
  }

  // ---------------------------------------------------------------- text
  const provisions = [];
  instruments.forEach((ins, index) => {
    ins.provisions.forEach((prov) => {
      provisions.push({
        instrument: index,
        id: ins.id,
        region: ins.region,
        heading: prov.heading,
        text: prov.text,
        words: prov.words ?? prov.text.split(/\s+/).filter(Boolean).length,
      });
    });
  });

  // --------------------------------------------------- per instrument
  const byInstrument = instruments.map((ins, index) => {
    const own = provisions.filter((p) => p.instrument === index);
    const text = own.map((p) => p.text).join('\n');
    const read = flesch(text);
    const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
    const words = own.reduce((a, p) => a + p.words, 0);
    return {
      id: ins.id,
      short: ins.short,
      title: ins.title,
      jurisdiction: ins.jurisdiction,
      region: ins.region,
      genre: ins.genre,
      year: ins.year,
      status: ins.status,
      publisher: ins.publisher,
      url: ins.url,
      retrieved: ins.retrieved,
      words,
      provisions: own.length,
      flesch: read.score,
      grade: read.grade,
      band: read.band,
      deontic: round(deonticDensity(text), 2),
      wordsPerSentence: round(words / sentences, 1),
      wordsPerProvision: round(words / Math.max(1, own.length), 1),
    };
  });

  // ------------------------------------------------------- similarity
  const { vectors } = tfidf(provisions.map((p) => p.text));
  const offsets = [];
  let cursor = 0;
  instruments.forEach((ins) => {
    offsets.push([cursor, cursor + ins.provisions.length]);
    cursor += ins.provisions.length;
  });

  const instrumentVectors = offsets.map(([start, end]) => documentVector(vectors.slice(start, end)));

  const regionCentroids = (assignment = instruments.map((i) => i.region)) => {
    const out = {};
    for (const region of REGIONS) {
      const members = [];
      assignment.forEach((label, index) => {
        if (label === region) members.push(instrumentVectors[index]);
      });
      out[region] = members.length ? centroid(members) : new Map();
    }
    return out;
  };

  const similarityRows = byInstrument.map((row, index) => {
    const cent = regionCentroids();
    const own = cent[row.region];
    const other = REGIONS.filter((r) => r !== row.region).map((r) => ({
      region: r,
      cos: round(cosine(instrumentVectors[index], cent[r])),
    }));
    return {
      ...row,
      toNorth: round(cosine(instrumentVectors[index], cent.north)),
      toSouth: round(cosine(instrumentVectors[index], cent.south)),
      toOwnRegion: round(cosine(instrumentVectors[index], own)),
      gap: round(cosine(instrumentVectors[index], cent.north) - cosine(instrumentVectors[index], cent.south)),
      neighbours: other,
    };
  });

  // ------------------------------------------------- bootstrap on gap
  // Resample the provisions inside every instrument, rebuild the document
  // vectors and the regional centroids, and recompute the gap. The idf
  // table is held fixed: the question is how much the answer moves if the
  // text were different, not how much it moves if the corpus were
  // different.
  const indiaIndexes = instruments
    .map((ins, index) => [ins, index])
    .filter(([ins]) => ins.region === 'india')
    .map(([, index]) => index);

  const gapFromResample = (rand) => {
    const resampled = instrumentVectors.map((_, index) => {
      const [start, end] = offsets[index];
      const own = vectors.slice(start, end);
      const picked = [];
      for (let i = 0; i < own.length; i += 1) {
        picked.push(own[Math.floor(rand() * own.length)]);
      }
      return documentVector(picked);
    });
    const northVecs = resampled.filter((_, index) => instruments[index].region === 'north');
    const southVecs = resampled.filter((_, index) => instruments[index].region === 'south');
    const centNorth = centroid(northVecs);
    const centSouth = centroid(southVecs);
    const perInstrument = resampled.map((vec, index) => ({
      index,
      north: cosine(vec, centNorth),
      south: cosine(vec, centSouth),
    }));
    const gaps = indiaIndexes.map(
      (index) => perInstrument[index].north - perInstrument[index].south,
    );
    return {
      gap: gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length),
      perInstrument,
    };
  };

  const BOOT_DRAWS = 600;
  const bootRand = rng(20260120);
  const bootValues = [];
  const bootByInstrument = instruments.map(() => []);
  for (let b = 0; b < BOOT_DRAWS; b += 1) {
    const draw = gapFromResample(bootRand);
    bootValues.push(draw.gap);
    draw.perInstrument.forEach((row) => {
      bootByInstrument[row.index].push({ north: row.north, south: row.south });
    });
  }
  const bootSorted = bootValues.slice().sort((a, b) => a - b);
  const gapBoot = {
    draws: bootSorted.length,
    mean: bootSorted.reduce((a, b) => a + b, 0) / bootSorted.length,
    lo: percentile(bootSorted, 0.025),
    hi: percentile(bootSorted, 0.975),
    values: bootSorted,
  };
  const band = (values, key) => {
    const sorted = values.map((v) => v[key]).sort((a, b) => a - b);
    return { lo: percentile(sorted, 0.025), hi: percentile(sorted, 0.975) };
  };

  const gapStatistic = () => {
    const cent = regionCentroids();
    const gaps = indiaIndexes.map(
      (index) =>
        cosine(instrumentVectors[index], cent.north) - cosine(instrumentVectors[index], cent.south),
    );
    return gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
  };

  // --------------------------------------------- permutation test
  // The null: the region labels carry no information about vocabulary.
  const observedGap = gapStatistic();
  const labels = instruments.map((i) => i.region);
  // One generator for the whole run: rebuilding it inside the callback would
  // shuffle into the same order on every draw, which turns the null into a
  // point mass and makes the p-value meaningless.
  const permRand = rng(7);
  const perm = permutationTest(
    (shuffled) => {
      let assignment = labels;
      if (shuffled) {
        const pool = labels.slice();
        for (let i = pool.length - 1; i > 0; i -= 1) {
          const j = Math.floor(permRand() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        assignment = pool;
      }
      const cent = regionCentroids(assignment);
      let total = 0;
      let count = 0;
      assignment.forEach((label, index) => {
        if (label !== 'india') return;
        total += cosine(instrumentVectors[index], cent.north) - cosine(instrumentVectors[index], cent.south);
        count += 1;
      });
      return count ? total / count : 0;
    },
    { seed: 7, draws: 2000 },
  );

  // --------------------------------------------- genre control
  const genres = [...new Set(instruments.map((i) => i.genre))];
  const genreRows = genres
    .map((genre) => {
      const members = similarityRows.filter((row) => row.genre === genre);
      const india = members.filter((row) => row.region === 'india');
      if (!india.length) return null;
      return {
        genre,
        india: india.map((row) => row.short),
        north: members.filter((row) => row.region === 'north').map((row) => row.short),
        south: members.filter((row) => row.region === 'south').map((row) => row.short),
        meanGap: round(india.reduce((a, row) => a + row.gap, 0) / india.length),
        meanFlesch: round(india.reduce((a, row) => a + row.flesch, 0) / india.length, 1),
        likeForLike: india.map((row) => {
          const peers = members.filter((m) => m.region !== 'india' && m.genre === genre);
          if (!peers.length) return { short: row.short, gap: row.gap, peers: 0 };
          const northPeers = peers.filter((p) => p.region === 'north');
          const southPeers = peers.filter((p) => p.region === 'south');
          const mean = (list, key) =>
            list.length ? list.reduce((a, p) => a + p[key], 0) / list.length : null;
          return {
            short: row.short,
            gap: row.gap,
            gapVsNorthPeers: round(mean(northPeers, 'gap')),
            gapVsSouthPeers: round(mean(southPeers, 'gap')),
          };
        }),
      };
    })
    .filter(Boolean);

  // --------------------------------------------- lineage: neighbours
  const indiaProvisions = provisions
    .map((p, index) => ({ ...p, index }))
    .filter((p) => p.region === 'india');
  const northProvisions = provisions.map((p, index) => ({ ...p, index })).filter((p) => p.region === 'north');
  const southProvisions = provisions.map((p, index) => ({ ...p, index })).filter((p) => p.region === 'south');

  const bestIn = (vector, pool) => {
    let best = { score: -1, index: -1 };
    for (const candidate of pool) {
      const score = cosine(vector, vectors[candidate.index]);
      if (score > best.score) best = { score, index: candidate.index };
    }
    return best;
  };

  const lineageRows = indiaProvisions.map((p) => {
    const vec = vectors[p.index];
    const north = bestIn(vec, northProvisions);
    const south = bestIn(vec, southProvisions);
    const nearest = north.score >= south.score ? 'north' : 'south';
    return {
      id: p.id,
      heading: p.heading,
      northScore: round(north.score),
      southScore: round(south.score),
      nearest,
      margin: round(Math.abs(north.score - south.score)),
      bestNorth: northProvisions.find((c) => c.index === north.index)?.heading || null,
      bestSouth: southProvisions.find((c) => c.index === south.index)?.heading || null,
    };
  });

  const nearestCounts = { north: 0, south: 0 };
  lineageRows.forEach((row) => {
    nearestCounts[row.nearest] += 1;
  });
  const lineageTest = {
    n: lineageRows.length,
    nearestNorth: nearestCounts.north,
    nearestSouth: nearestCounts.south,
    p: round(binomialTwoSided(nearestCounts.north, lineageRows.length), 4),
  };

  // --------------------------------------------- lineage: concepts
  // Terms that dominate the North corpus and also appear in India. These
  // are the vocabulary that travelled.
  const df = new Map();
  provisions.forEach((p) => {
    for (const term of new Set(tokenise(p.text))) df.set(term, (df.get(term) || 0) + 1);
  });
  const shareIn = (region, term) => {
    const pool = provisions.filter((p) => p.region === region);
    if (!pool.length) return 0;
    const hits = pool.filter((p) => new Set(tokenise(p.text)).has(term)).length;
    return hits / pool.length;
  };
  const northPool = provisions.filter((p) => p.region === 'north');
  const northShare = (term) => {
    if (!northPool.length) return 0;
    const hits = northPool.filter((p) => new Set(tokenise(p.text)).has(term)).length;
    return hits / northPool.length;
  };
  const indiaPool = provisions.filter((p) => p.region === 'india');
  const indiaShare = (term) => {
    if (!indiaPool.length) return 0;
    const hits = indiaPool.filter((p) => new Set(tokenise(p.text)).has(term)).length;
    return hits / indiaPool.length;
  };

  const conceptTerms = [...df.entries()]
    .filter(([term, count]) => count >= 4 && term.length > 4 && /^[a-z]/.test(term))
    .map(([term, count]) => ({
      term,
      northShare: northShare(term),
      indiaShare: indiaShare(term),
      southShare: shareIn('south', term),
      count,
    }))
    .filter((row) => row.northShare >= 0.08 && row.indiaShare > 0)
    .sort((a, b) => b.northShare - a.northShare)
    .slice(0, 16);

  // Phrase-level concepts, matched on the raw text.
  const PHRASES = [
    'risk management system',
    'data protection impact assessment',
    'high-risk system',
    'supervisory authority',
    'automated decision',
    'personal data',
    'data subject',
    'impact assessment',
    'human oversight',
    'transparency obligation',
    'compliance obligation',
  ];
  const phraseShare = (region, phrase) => {
    const pool = provisions.filter((p) => p.region === region);
    if (!pool.length) return 0;
    const hits = pool.filter((p) => normalise(p.text).includes(phrase)).length;
    return hits / pool.length;
  };
  const phraseRows = PHRASES.map((phrase) => ({
    phrase,
    india: round(phraseShare('india', phrase)),
    north: round(phraseShare('north', phrase)),
    south: round(phraseShare('south', phrase)),
  }));

  // --------------------------------------------- outputs
  const indiaRows = similarityRows.filter((row) => row.region === 'india');
  const regionFlesch = REGIONS.map((region) => {
    const rows = similarityRows.filter((row) => row.region === region);
    return {
      region,
      label: REGION_LABEL[region],
      instruments: rows.length,
      meanFlesch: round(rows.reduce((a, row) => a + row.flesch, 0) / Math.max(1, rows.length), 1),
      meanGrade: round(rows.reduce((a, row) => a + row.grade, 0) / Math.max(1, rows.length), 1),
      meanDeontic: round(rows.reduce((a, row) => a + row.deontic, 0) / Math.max(1, rows.length), 1),
    };
  });

  // Per-instrument uncertainty, attached to the rows the figures read.
  similarityRows.forEach((row, index) => {
    const draws = bootByInstrument[index];
    row.northBand = { lo: round(band(draws, 'north').lo), hi: round(band(draws, 'north').hi) };
    row.southBand = { lo: round(band(draws, 'south').lo), hi: round(band(draws, 'south').hi) };
    const gaps = draws.map((d) => d.north - d.south).sort((a, b) => a - b);
    row.gapBand = { lo: round(percentile(gaps, 0.025)), hi: round(percentile(gaps, 0.975)) };
  });

  const results = {
    generated: corpus.generated,
    corpusFile: path.relative(ROOT, CORPUS_PATH),
    corpusWords: provisions.reduce((a, p) => a + p.words, 0),
    provisions: provisions.length,
    instruments: similarityRows,
    regions: regionFlesch,
    headline: {
      meanGap: round(observedGap),
      gapLow: round(gapBoot.lo),
      gapHigh: round(gapBoot.hi),
      bootstrapDraws: gapBoot.draws,
      permutationP: round(perm.p, 4),
      nullLow: round(perm.lo),
      nullHigh: round(perm.hi),
      nullMean: round(perm.nullValues.reduce((a, b) => a + b, 0) / perm.nullValues.length),
      nullValues: perm.nullValues.map((v) => round(v)),
      indiaMeanFlesch: round(indiaRows.reduce((a, row) => a + row.flesch, 0) / indiaRows.length, 1),
      northMeanFlesch: round(regionFlesch.find((r) => r.region === 'north').meanFlesch, 1),
      southMeanFlesch: round(regionFlesch.find((r) => r.region === 'south').meanFlesch, 1),
      indiaMeanDeontic: round(indiaRows.reduce((a, row) => a + row.deontic, 0) / indiaRows.length, 1),
      northMeanDeontic: round(regionFlesch.find((r) => r.region === 'north').meanDeontic, 1),
      southMeanDeontic: round(regionFlesch.find((r) => r.region === 'south').meanDeontic, 1),
    },
    genreControl: genreRows,
    lineage: {
      test: lineageTest,
      rows: lineageRows,
      concepts: conceptTerms,
      phrases: phraseRows,
    },
    excludedNonEnglish: corpus.excludedNonEnglish || [],
    failures: corpus.failures || [],
  };

  fs.writeFileSync(RESULTS_PATH, `${JSON.stringify(results, null, 1)}\n`);

  console.log(`instruments: ${instruments.length}  provisions: ${provisions.length}`);
  console.log(
    `mean gap (North - South) for Indian instruments: ${results.headline.meanGap}` +
      ` [${results.headline.gapLow}, ${results.headline.gapHigh}]`,
  );
  console.log(`permutation p: ${results.headline.permutationP}`);
  console.log(
    `Flesch — India ${results.headline.indiaMeanFlesch}, North ${results.headline.northMeanFlesch}, South ${results.headline.southMeanFlesch}`,
  );
  console.log(
    `deontic per 1k words — India ${results.headline.indiaMeanDeontic}, North ${results.headline.northMeanDeontic}, South ${results.headline.southMeanDeontic}`,
  );
  console.log(
    `nearest neighbour: North ${lineageTest.nearestNorth}, South ${lineageTest.nearestSouth} (p = ${lineageTest.p})`,
  );
  console.log(`wrote ${path.relative(ROOT, RESULTS_PATH)}`);
};

main();
