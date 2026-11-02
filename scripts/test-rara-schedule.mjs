#!/usr/bin/env node
// Tests for the RARA collection scheduler.
//
//     node scripts/test-rara-schedule.mjs
//
// The Worker does not collect the feeds. It dispatches the existing GitHub
// workflow, which owns the collector, the snapshot commit and the D1 ingest.
// These tests pin the request GitHub receives and the two failure modes that
// matter: no token (do not call GitHub) and a 5xx (retry, then fail loudly).

import worker, { dispatchCollection } from '../workers/rara-worker.js';

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

const response = (status, body = '') => new Response(status === 204 ? null : body, { status });

const quietly = async (fn) => {
  const original = console.warn;
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.warn = original;
  }
};

console.log('\nDispatch request');
{
  const calls = [];
  const result = await dispatchCollection(
    { GITHUB_DISPATCH_TOKEN: 'test-token' },
    {
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return response(204);
      },
      wait: async () => {},
    },
  );

  check('a dispatch is reported as sent', result.dispatched === true && result.status === 204);
  check('it calls the workflow dispatch endpoint',
    calls[0]?.url ===
      'https://api.github.com/repos/shivanguniyal-polcon/humble-sapien/actions/workflows/rara-tracker.yml/dispatches',
    calls[0]?.url);
  check('it uses POST', calls[0]?.init.method === 'POST');
  check('it sends the token as a bearer credential',
    calls[0]?.init.headers.authorization === 'Bearer test-token');
  check('it dispatches the default branch', JSON.parse(calls[0]?.init.body).ref === 'main');
  check('it asks for the GitHub JSON API',
    calls[0]?.init.headers.accept === 'application/vnd.github+json');
}

console.log('\nConfiguration');
{
  const calls = [];
  const result = await quietly(() =>
    dispatchCollection(
      {},
      {
        fetchImpl: async () => {
          calls.push(1);
          return response(204);
        },
      },
    ),
  );
  check('a missing token does not call GitHub', calls.length === 0);
  check('a missing token is reported, not thrown',
    result.dispatched === false && result.reason === 'not-configured');
}

{
  const calls = [];
  await dispatchCollection(
    {
      GITHUB_DISPATCH_TOKEN: 'test-token',
      GITHUB_REPO: 'owner/other-repo',
      GITHUB_WORKFLOW: 'other.yml',
      GITHUB_REF: 'release',
    },
    {
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return response(204);
      },
      wait: async () => {},
    },
  );
  check('the repository can be overridden',
    calls[0]?.url ===
      'https://api.github.com/repos/owner/other-repo/actions/workflows/other.yml/dispatches',
    calls[0]?.url);
  check('the ref can be overridden', JSON.parse(calls[0]?.init.body).ref === 'release');
}

console.log('\nFailures');
{
  let attempts = 0;
  let message = '';
  try {
    await dispatchCollection(
      { GITHUB_DISPATCH_TOKEN: 'test-token' },
      {
        fetchImpl: async () => {
          attempts += 1;
          return response(500, 'upstream unavailable');
        },
        wait: async () => {},
      },
    );
  } catch (error) {
    message = error.message;
  }
  check('a 5xx is retried three times', attempts === 3, String(attempts));
  check('a 5xx fails with the status', /HTTP 500/.test(message), message);
}

{
  let attempts = 0;
  let message = '';
  try {
    await dispatchCollection(
      { GITHUB_DISPATCH_TOKEN: 'test-token' },
      {
        fetchImpl: async () => {
          attempts += 1;
          return response(403, 'forbidden');
        },
        wait: async () => {},
      },
    );
  } catch (error) {
    message = error.message;
  }
  check('a 403 is not retried', attempts === 1, String(attempts));
  check('a 403 fails with the status', /HTTP 403/.test(message), message);
}

console.log('\nCron handler');
check('the Worker exports a scheduled handler', typeof worker.scheduled === 'function');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} failed`);
  process.exit(1);
}
