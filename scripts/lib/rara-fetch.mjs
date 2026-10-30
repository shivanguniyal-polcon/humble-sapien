// Paced, retrying text fetch for the RARA collector.
//
// Two failures made this a module. arXiv answers slowly and rate-limits: the
// collector asks it two questions back to back, and under a scheduled job the
// second one can come back 429. A single 30-second attempt with no retry turns
// that into a thin collection — and a thin collection still carried a fresh
// timestamp, so the page said "last collected today" while a feed was missing.
//
// So: a minimum gap between requests to the same host, a bounded retry that
// honours Retry-After, and a stats object the caller can print so the waiting
// is visible rather than magic.
//
// The gap and the backoff are two floors on the same interval, not two waits
// added together: the time before a request is max(remaining gap, backoff).
// Adding them would produce 2s, then 1s, then 4s on a burst — neither polite
// nor predictable.
//
// Everything is injectable (fetch, sleep, clock) so the tests can assert the
// delays without actually waiting for them.

export const DEFAULT_GAP_MS = 3_000;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_BASE_DELAY_MS = 2_000;

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createFetcher({
  fetchImpl = (...args) => fetch(...args),
  sleep = realSleep,
  now = Date.now,
  gapMs = DEFAULT_GAP_MS,
  retries = DEFAULT_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  timeoutMs = 30_000,
  headers = {},
} = {}) {
  const lastByHost = new Map();
  const stats = { requests: 0, retries: 0, waitedMs: 0 };

  const pause = async (ms) => {
    if (ms <= 0) return;
    stats.waitedMs += ms;
    await sleep(ms);
  };

  // Per host, not global: the collector talks to fourteen different publishers,
  // and only a repeated host needs the gap. `floor` lets a retry ask for its
  // backoff through the same gate.
  const waitFor = async (host, floor = 0) => {
    const last = lastByHost.get(host);
    const gapLeft = last === undefined ? 0 : gapMs - (now() - last);
    await pause(Math.max(gapLeft, floor));
    lastByHost.set(host, now());
  };

  const text = async (url) => {
    const host = new URL(url).host;
    // Once per request. A retry waits through the same gate below, so pacing
    // here as well would charge the gap twice for one attempt.
    await waitFor(host);
    for (let attempt = 0; ; attempt += 1) {
      stats.requests += 1;

      let response;
      try {
        response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      } catch (error) {
        // A timeout is the failure that started this: retry it like a 429.
        if (attempt >= retries) throw new Error(`network: ${error?.message || error}`);
        stats.retries += 1;
        await waitFor(host, baseDelayMs * 2 ** attempt);
        continue;
      }

      if (response.ok) return response.text();

      const status = response.status;
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt >= retries) throw new Error(`HTTP ${status}`);
      stats.retries += 1;
      const after = Number(response.headers?.get?.('retry-after'));
      await waitFor(host, Number.isFinite(after) && after > 0 ? after * 1000 : baseDelayMs * 2 ** attempt);
    }
  };

  return { text, stats };
}
