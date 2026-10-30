#!/usr/bin/env node
// Tests for the shared Worker helpers: bearer checks, CORS resolution and the
// rule that a server error never describes the server.
//
//     node scripts/test-worker-hardening.mjs
//
// These three helpers are the reason the Workers stopped carrying their own
// copies. The copies had drifted: one echoed database errors to callers, the
// other did not, and both compared tokens with `===`, which returns early on
// the first differing character.

import { bearerMatches } from '../workers/lib/auth.js';
import { failureFor, withOrigin } from '../workers/lib/http.js';

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

const env = { ALLOWED_ORIGIN: 'https://a.test,https://b.test' };
const request = (origin) =>
  new Request('https://worker.test/', origin ? { headers: { origin } } : {});
const body = async (response) => ({ status: response.status, json: await response.json() });

console.log('\nBearer token');
check('the right token passes', await bearerMatches('Bearer abc123', 'abc123'));
check('a wrong token fails', !(await bearerMatches('Bearer abc124', 'abc123')));
check('a prefix fails', !(await bearerMatches('Bearer abc12', 'abc123')));
check('trailing whitespace fails', !(await bearerMatches('Bearer abc123 ', 'abc123')));
check('a different scheme fails', !(await bearerMatches('bearer abc123', 'abc123')));
check('no header fails', !(await bearerMatches(null, 'abc123')));
check('an unset token refuses everything', !(await bearerMatches('Bearer anything', '')));
check('an undefined token refuses everything', !(await bearerMatches('Bearer anything', undefined)));

console.log('\nAllowed origin');
check('a listed caller is echoed', withOrigin(request('https://b.test'), env).ALLOWED_ORIGIN === 'https://b.test');
check(
  'an unlisted caller gets the first entry',
  withOrigin(request('https://evil.test'), env).ALLOWED_ORIGIN === 'https://a.test',
);
check('no origin gets the first entry', withOrigin(request(null), env).ALLOWED_ORIGIN === 'https://a.test');
check(
  'a wildcard deployment stays a wildcard',
  withOrigin(request('https://evil.test'), { ALLOWED_ORIGIN: '*' }).ALLOWED_ORIGIN === '*',
);

console.log('\nError responses');
const clientError = await body(
  failureFor(Object.assign(new Error('A numeric `state` parameter is required.'), { status: 400 }), env),
);
check('a 4xx keeps the message that explains it', clientError.status === 400 && /numeric/.test(clientError.json.error.message));

const serverError = await body(
  failureFor(new Error('D1_ERROR: no such table: developments at SELECT * FROM runs'), env),
);
check(
  'a 5xx does not name a table, a binding or a query',
  serverError.status === 500 && !/D1_ERROR|developments|SELECT|runs/.test(serverError.json.error.message),
  serverError.json.error.message,
);

const unknown = await body(failureFor(null, env));
check('an unknown failure is a generic 500', unknown.status === 500 && unknown.json.error.message === 'The request failed.');

console.log(`\n${checks - failures} of ${checks} checks passed`);
if (failures) {
  console.log(`${failures} hardening check${failures === 1 ? '' : 's'} failed.`);
  process.exit(1);
}
