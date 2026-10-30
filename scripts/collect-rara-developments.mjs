// Collect the AI developments the tracker reads.
//
//   node scripts/collect-rara-developments.mjs
//   node scripts/collect-rara-developments.mjs --days 7 --limit 10
//   node scripts/collect-rara-developments.mjs --source openai
//   node scripts/collect-rara-developments.mjs --push https://… --token …
//
// It writes src/data/rara/developments.json and nothing else. The page reads
// that snapshot, so the tracker works offline; the same payload can also be
// POSTed to the Cloudflare Worker in workers/rara-worker.js, which stores it in
// D1 for a live read.
//
// Requests are paced per host and a rate limit is retried with backoff. If a
// primary source still fails, the run writes nothing and pushes nothing and
// exits non-zero: a thin collection carrying a fresh timestamp would make the
// page claim it was updated today while a feed was missing. Pass
// --allow-partial to publish such a run knowingly.
//
// The feed is primary first. A paper's own abstract, a lab's own release and a
// regulator's own notice are the horses' mouths; a news item is a report about
// one. Sources carry a tier so the page can default to the primary set and say
// what it left out. Place is the publishing institution's base, not the place
// the work was done, and a preprint has no stated affiliation at all, so papers
// are left unplaced rather than guessed.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inferTopics } from '../src/lib/rara/tracker.js';
import { createFetcher } from './lib/rara-fetch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// Two queries rather than one `cat:cs.AI OR cat:cs.CL`. A single heavy query is
// what arXiv throttles, and when it throttles the whole tracker used to freeze.
// Asked separately, one category answering is enough for the source to count as
// read; the other is recorded as partial until it recovers.
const ATOM_AI =
  'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=45';
const ATOM_CL =
  'https://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=45';
const ATOM_SOCIETY =
  'https://export.arxiv.org/api/query?search_query=cat:cs.CY&sortBy=submittedDate&sortOrder=descending&max_results=50';

const SOURCES = [
  // ---------------------------------------------------------- primary: labs
  {
    id: 'openai',
    label: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    type: 'lab',
    tier: 'primary',
    place: { city: 'San Francisco', country: 'United States', iso: 'US' },
    note: 'Official release and research posts.',
  },
  {
    id: 'deepmind',
    label: 'Google DeepMind',
    url: 'https://deepmind.google/blog/rss.xml',
    type: 'lab',
    tier: 'primary',
    place: { city: 'London', country: 'United Kingdom', iso: 'GB' },
    note: 'Official release and research posts.',
  },
  {
    id: 'huggingface-blog',
    label: 'Hugging Face',
    url: 'https://huggingface.co/blog/feed.xml',
    type: 'lab',
    tier: 'primary',
    place: { city: 'Paris', country: 'France', iso: 'FR' },
    note: 'Model releases and engineering notes.',
  },
  // ------------------------------------------------------ primary: research
  {
    id: 'microsoft-research',
    label: 'Microsoft Research',
    url: 'https://www.microsoft.com/en-us/research/feed/',
    type: 'research',
    tier: 'primary',
    place: { city: 'Redmond', country: 'United States', iso: 'US' },
    note: 'Research blog.',
  },
  {
    id: 'google-research',
    label: 'Google Research',
    url: 'https://research.google/blog/rss/',
    type: 'research',
    tier: 'primary',
    place: { city: 'Mountain View', country: 'United States', iso: 'US' },
    note: 'Research blog.',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA',
    url: 'https://blogs.nvidia.com/feed/',
    type: 'research',
    tier: 'primary',
    place: { city: 'Santa Clara', country: 'United States', iso: 'US' },
    note: 'Hardware and model announcements; filtered to AI terms.',
    filter: /\b(ai|artificial intelligence|model|inference|gpu|agent|robot)\b/i,
  },
  {
    id: 'vector-institute',
    label: 'Vector Institute',
    url: 'https://vectorinstitute.ai/feed/',
    type: 'research',
    tier: 'primary',
    place: { city: 'Toronto', country: 'Canada', iso: 'CA' },
    note: 'Research institute news and publications.',
  },
  {
    id: 'arxiv-ai',
    label: 'arXiv cs.AI / cs.CL',
    url: ATOM_AI,
    queries: [
      { id: 'cs.AI', url: ATOM_AI },
      { id: 'cs.CL', url: ATOM_CL },
    ],
    type: 'research',
    tier: 'primary',
    place: null,
    cap: 45,
    note: 'Preprints. The abstract is the paper’s own words; affiliation is not in the feed, so papers are not placed on the map.',
    atom: true,
  },
  {
    id: 'arxiv-society',
    label: 'arXiv cs.CY · computers and society',
    url: ATOM_SOCIETY,
    type: 'research',
    tier: 'primary',
    place: null,
    cap: 25,
    note: 'Preprints on governance, law and the social study of computing.',
    atom: true,
  },
  // ----------------------------------------------------- primary: regulators
  {
    id: 'rbi-press',
    label: 'RBI press releases',
    url: 'https://www.rbi.org.in/pressreleases_rss.xml',
    type: 'policy',
    tier: 'primary',
    place: { city: 'Mumbai', country: 'India', iso: 'IN' },
    note: 'Official RBI releases; filtered to digital, fraud, KYC and AI terms.',
    filter: /\b(ai|artificial intelligence|digital|fraud|kyc|deepfake|cyber|fintech|payment|algorithm)\b/i,
  },
  {
    id: 'iiit-hyderabad',
    label: 'IIIT Hyderabad',
    url: 'https://www.iiit.ac.in/feed/',
    type: 'research',
    tier: 'primary',
    place: { city: 'Hyderabad', country: 'India', iso: 'IN' },
    note: 'Institute news; filtered to computing, AI and data terms.',
    filter: /\b(ai|artificial intelligence|machine learning|computing|data|robot|language|vision)\b/i,
  },
  {
    id: 'trai',
    label: 'TRAI',
    url: 'https://trai.gov.in/rss.xml',
    type: 'policy',
    tier: 'primary',
    place: { city: 'New Delhi', country: 'India', iso: 'IN' },
    note: 'Consultation papers and recommendations; the site feed also carries events and QoS reports, so it is filtered to AI terms.',
    filter: /\b(artificial intelligence|machine learning|algorithmic|deepfake|ai model|generative ai)\b/i,
  },
  // ------------------------------------------- secondary: reported coverage
  {
    id: 'medianama-ai',
    label: 'Medianama · AI',
    url: 'https://www.medianama.com/tag/artificial-intelligence/feed/',
    type: 'news',
    tier: 'secondary',
    place: { city: 'New Delhi', country: 'India', iso: 'IN' },
    note: 'Indian technology policy reporting. Discovery only; never a legal citation.',
  },
  {
    id: 'google-news-ai-policy',
    label: 'Google News · India AI policy',
    url: 'https://news.google.com/rss/search?q=India+AI+law+OR+regulation+OR+deepfake&hl=en-IN&gl=IN&ceid=IN:en',
    type: 'news',
    tier: 'secondary',
    place: null,
    note: 'A discovery query, not a source. The publisher varies, and the link is opened before anything is cited.',
  },
];

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const days = Math.max(1, Number(option('days', 14)));
const limit = Math.max(1, Number(option('limit', 12)));
const only = option('source', null);
const out = path.resolve(root, option('out', 'src/data/rara/developments.json'));
const pushUrl = option('push', null);
const pushToken = option('token', process.env.RARA_INGEST_TOKEN || '');
const dry = args.includes('--dry');
// Push the snapshot already on disk instead of fetching the feeds again, so a
// scheduled run does not hit every source twice.
const pushOnly = args.includes('--push-only');
// Publishing a collection with a missing primary source is allowed, but only
// when asked for explicitly: silence is the failure mode being fixed here.
const allowPartial = args.includes('--allow-partial');

if (only && !SOURCES.some((source) => source.id === only)) {
  console.error(`No such source: ${only}. One of ${SOURCES.map((source) => source.id).join(', ')}.`);
  process.exit(2);
}

const decodeEntities = (value) =>
  String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

const clean = (value) => {
  const stripped = String(value || '')
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/<[^>]+>/g, ' ');
  // Decode after stripping, then strip once more: some feeds double-encode
  // their anchors, so the first strip leaves a literal <a href="…"> behind.
  return decodeEntities(stripped)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const firstTag = (xml, names) => {
  for (const name of names) {
    const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(xml);
    if (match) return clean(match[1]);
  }
  return '';
};

const atomLink = (entry) => {
  const alternate = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(entry);
  if (alternate) return alternate[1];
  const href = /<link[^>]*href=["']([^"']+)["']/i.exec(entry);
  if (href) return href[1];
  return firstTag(entry, ['link']);
};

const rssLink = (item) => {
  const text = firstTag(item, ['link']);
  if (text) return text;
  const href = /<link[^>]*href=["']([^"']+)["']/i.exec(item);
  return href ? href[1] : '';
};

const canonicalUrl = (raw) => {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(raw || '').trim();
  }
};

const stableId = (value) =>
  `dev-${crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)}`;

// arXiv asks for a pause between calls and answers 429 when it does not get
// one. The fetcher paces per host and retries a rate limit, so a limit becomes
// a few seconds of waiting rather than a missing feed.
const fetcher = createFetcher({
  headers: {
    'user-agent': 'RARA/0.2 (+https://humble-sapien.vercel.app)',
    accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});
const fetchText = fetcher.text;

const parseFeed = (xml, source) => {
  const blocks = source.atom
    ? [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((match) => match[0])
    : [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((match) => match[0]);

  return blocks
    .map((block) => {
      const title = firstTag(block, ['title']);
      const summary = firstTag(block, ['description', 'summary', 'content:encoded']);
      const rawLink = source.atom ? atomLink(block) : rssLink(block);
      const link = canonicalUrl(rawLink);
      const dateText = firstTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
      const publishedAt = new Date(dateText);
      const categories = [...block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
        .map((match) => clean(match[1]))
        .filter(Boolean);
      const publisher = firstTag(block, ['source']);

      if (source.filter && !source.filter.test(`${title} ${summary}`)) return null;

      return {
        title,
        summary: summary.slice(0, 700),
        url: link,
        publishedAt: Number.isNaN(publishedAt.getTime()) ? null : publishedAt.toISOString(),
        sourceId: source.id,
        sourceLabel: source.label,
        sourceType: source.type,
        tier: source.tier,
        place: source.place || null,
        publisher: publisher || null,
        categories: [...new Set(categories)].slice(0, 6),
      };
    })
    .filter((item) => item && item.title && item.url && item.publishedAt);
};

const startedAt = new Date();
const since = new Date(startedAt.getTime() - days * 24 * 60 * 60 * 1000);
const collected = [];
const health = [];

for (const source of pushOnly ? [] : SOURCES.filter((entry) => !only || entry.id === only)) {
  const fetchedAt = new Date().toISOString();
  const meta = {
    id: source.id,
    label: source.label,
    url: source.url,
    type: source.type,
    tier: source.tier,
    place: source.place || null,
    fetchedAt,
  };

  // A source may ask several questions. One answer is enough to read it; the
  // ones that failed are carried as `partial` so a half-covered source is
  // visible rather than indistinguishable from a quiet week.
  const queries = source.queries || [{ id: source.id, url: source.url }];
  const xmls = [];
  const partial = [];
  for (const query of queries) {
    try {
      xmls.push(await fetchText(query.url));
    } catch (error) {
      partial.push({ id: query.id, error: String(error?.message || error).slice(0, 120) });
      console.error(`FAIL ${source.label} · ${query.id}: ${error?.message || error}`);
    }
  }

  if (!xmls.length) {
    health.push({
      ...meta,
      ok: false,
      count: 0,
      error: partial.map((entry) => `${entry.id}: ${entry.error}`).join('; ').slice(0, 240),
    });
    continue;
  }

  // Papers are the spine of the feed, so they get a larger share; a lab blog
  // does not need to out-shout them.
  const cap = source.cap ?? (source.type === 'lab' || source.type === 'research' ? 6 : limit);
  const items = xmls
    .flatMap((xml) => parseFeed(xml, source))
    .filter((item) => new Date(item.publishedAt) >= since)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, cap)
    .map((item) => {
      const text = `${item.title}. ${item.summary}`;
      return {
        ...item,
        id: stableId(item.url || item.title),
        topics: inferTopics(text),
        fetchedAt,
      };
    });

  collected.push(...items);
  health.push({
    ...meta,
    ok: true,
    count: items.length,
    ...(partial.length ? { partial } : {}),
  });
  console.log(
    `ok   ${source.label}: ${items.length} item${items.length === 1 ? '' : 's'}` +
      (partial.length ? ` (partial — ${partial.map((entry) => entry.id).join(', ')} unavailable)` : ''),
  );
}

const failedPrimary = health.filter((entry) => !entry.ok && entry.tier === 'primary');
const complete = failedPrimary.length === 0;

if (fetcher.stats.retries) {
  console.log(
    `paced ${fetcher.stats.requests} requests, ${fetcher.stats.retries} retries, ` +
      `${Math.round(fetcher.stats.waitedMs / 1000)}s spent waiting on rate limits`,
  );
}

// A thin collection with a fresh timestamp is worse than an old complete one:
// the page would claim it was updated today while a feed was missing. So an
// incomplete run writes nothing and pushes nothing, and the store keeps its
// last complete collection.
if (!pushOnly && !complete && !allowPartial) {
  const names = failedPrimary.map((entry) => `${entry.label} (${entry.error || 'failed'})`).join('; ');
  console.error(`\nIncomplete collection — ${names}`);
  console.error('Nothing was written or pushed, so the store keeps its last complete run.');
  console.error('Re-run when the source recovers, or pass --allow-partial to publish it knowingly.');
  process.exit(1);
}

if (!pushOnly && !complete) {
  console.warn(`\nPartial collection — ${failedPrimary.map((entry) => entry.id).join(', ')} failed. Publishes because --allow-partial was passed.`);
}

const seen = new Set();
const items = collected
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .filter((item) => {
    const key = item.url || item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

const payload = pushOnly
  ? JSON.parse(fs.readFileSync(out, 'utf8'))
  : {
      generatedAt: startedAt.toISOString(),
      windowDays: days,
      complete,
      failedSources: failedPrimary.map((entry) => entry.id),
      degradedSources: health.filter((entry) => entry.partial).map((entry) => entry.id),
      sourceCount: health.filter((entry) => entry.ok).length,
      primaryCount: items.filter((item) => item.tier === 'primary').length,
      sources: health,
      items,
    };

if (!dry && !pushOnly) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote ${path.relative(root, out)} — ${items.length} developments, ${payload.primaryCount} primary, from ${payload.sourceCount} sources`);
}

if (pushUrl) {
  if (!pushToken) {
    console.error('No --token and no RARA_INGEST_TOKEN; the snapshot was not pushed.');
    process.exitCode = 2;
  } else {
    const endpoint = `${pushUrl.replace(/\/$/, '')}/ingest`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${pushToken}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.text();
      if (!response.ok) {
        console.error(`push failed: HTTP ${response.status} ${body.slice(0, 200)}`);
        process.exitCode = 1;
      } else {
        console.log(`pushed ${payload.items.length} developments to ${endpoint} — ${body.slice(0, 120)}`);
      }
    } catch (error) {
      console.error(`push failed: ${error?.message || error}`);
      process.exitCode = 1;
    }
  }
}

if (!pushOnly && !health.some((entry) => entry.ok)) process.exit(1);
