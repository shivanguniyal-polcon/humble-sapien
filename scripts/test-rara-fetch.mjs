#!/usr/bin/env node
// Tests for the collector's paced, retrying fetch.
//
//     node scripts/test-rara-fetch.mjs
//
// The collector must not turn a rate limit into a thin collection, and it must
// not hammer a publisher to avoid one. These tests pin the behaviours that
// guarantee it: a gap between calls to the same host, a bounded retry that
// honours Retry-After, a loud failure once the retry budget is spent, and the
// rule that the gap and the backoff are floors on one interval rather than two
// waits added together.
//
// The clock is fake, so nothing here actually waits.

import { DEFAULT_GAP_MS, createFetcher } from './lib/rara-fetch.mjs';

let checks = 0;
let failures = 0;

const check = (name, condition, detail = '') => {
  checks += 1;
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const section = (title) => console.log(`\n${title}`);

// The parts of the Fetch response the fetcher reads.
const response = (status, body = '', headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
  text: async () => body,
});

// Runs the fetcher against a scripted list of responses and reports every
// delay it asked for.
const run = async (script, options = {}) => {
  let clock = 0;
  const waits = [];
  const calls = [];
  const sleep = async (ms) => {
    waits.push(ms);
    clock += ms;
  };
  const fetchImpl = async (url) => {
    calls.push(url);
    const next = script.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  const fetcher = createFetcher({ fetchImpl, sleep, now: () => clock, ...options });
  let error = null;
  let value = null;
  try {
    value = await fetcher.text(options.url || 'https://export.arxiv.org/api/query?x=1');
  } catch (caught) {
    error = caught;
  }
  return { value, error, waits, calls, stats: fetcher.stats, total: waits.reduce((a, b) => a + b, 0) };
};

section('retry and backoff');

{
  const result = await run([response(200, '<feed/>')]);
  check('a 200 returns the body on the first call', result.value === '<feed/>');
  check('a 200 is not retried', result.calls.length === 1, `made ${result.calls.length} calls`);
  check('a 200 costs no waiting', result.total === 0, `waited ${result.total}ms`);
}

{
  const result = await run([response(429, '', { 'retry-after': '4' }), response(200, 'ok')], { gapMs: 0 });
  check('a 429 is retried rather than thrown', result.value === 'ok' && !result.error);
  check('Retry-After is honoured exactly', result.waits[0] === 4000, `waited ${result.waits[0]}ms`);
  check('the retry is counted', result.stats.retries === 1);
}

{
  const result = await run([response(429), response(429), response(200, 'ok')], { gapMs: 0 });
  check('backoff doubles without Retry-After', result.waits.join(',') === '2000,4000', result.waits.join(','));
}

{
  const result = await run([response(429), response(200, 'ok')]);
  check('the gap floors a shorter backoff', result.waits.join(',') === String(DEFAULT_GAP_MS), result.waits.join(','));
}

{
  const result = await run([response(429), response(500), response(502), response(200, 'ok')], { gapMs: 0 });
  check('a 5xx is retried like a 429', result.value === 'ok', String(result.error));
}

{
  const result = await run([response(429), response(429), response(429), response(429)], { gapMs: 0 });
  check('the retry budget is bounded', result.calls.length === 4, `made ${result.calls.length} calls`);
  check('an exhausted budget throws the status', result.error?.message === 'HTTP 429', String(result.error));
}

{
  const result = await run([response(404)]);
  check('a 404 is not retried', result.calls.length === 1 && result.error?.message === 'HTTP 404');
}

{
  const result = await run([new Error('The operation was aborted due to timeout'), response(200, 'ok')], { gapMs: 0 });
  check('a timeout is retried', result.value === 'ok' && result.calls.length === 2);
}

section('spacing between calls to one host');

{
  // Two arXiv requests, the pair that produced the 429.
  let clock = 0;
  const waits = [];
  const sleep = async (ms) => {
    waits.push(ms);
    clock += ms;
  };
  const fetcher = createFetcher({ fetchImpl: async () => response(200, 'ok'), sleep, now: () => clock });
  await fetcher.text('https://export.arxiv.org/api/query?a=1');
  await fetcher.text('https://export.arxiv.org/api/query?b=1');
  check('a repeated host waits the gap', waits.length === 1 && waits[0] === DEFAULT_GAP_MS, waits.join(','));
}

{
  let clock = 0;
  const waits = [];
  const fetcher = createFetcher({
    fetchImpl: async () => response(200, 'ok'),
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  await fetcher.text('https://openai.com/news/rss.xml');
  await fetcher.text('https://deepmind.google/blog/rss.xml');
  check('different hosts are not delayed', waits.length === 0, `waited ${waits.join(',')}`);
}

{
  // A host that was slow to answer has already spent its gap.
  let clock = 0;
  const waits = [];
  const fetcher = createFetcher({
    fetchImpl: async () => {
      clock += 5000;
      return response(200, 'ok');
    },
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  await fetcher.text('https://export.arxiv.org/api/query?a=1');
  await fetcher.text('https://export.arxiv.org/api/query?b=1');
  check('a slow response counts toward the gap', waits.length === 0, `waited ${waits.join(',')}`);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
