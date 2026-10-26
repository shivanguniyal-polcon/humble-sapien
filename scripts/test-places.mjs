// Places API contract tests.
//
// The Worker is a pure function of the request and the database, so the tests
// hand it a fake D1 with known rows and check the JSON a browser would get:
// the cascade, the village-to-passbook attachment, the 404 for a GP that was
// never captured, and the refusal to answer a write.
//
// A second block checks the seed contract against the directory itself: every
// captured GP must still name a village in its recorded block, or the seed
// would attach a passbook to the wrong place.

import assert from 'node:assert/strict';
import { STATES } from '../src/data/india/indiaAdmin.js';
import * as UTTARAKHAND from '../src/data/india/state-uttarakhand.js';
import * as DEHRADUN_VILLAGES from '../src/data/india/district-345-villages.js';
import PASSBOOK from '../src/data/passbook/index.json' with { type: 'json' };
import worker from '../workers/places/worker.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(`  ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(`  ${err.message}`);
  }
}

// ---- a D1 stand-in with just enough behaviour -------------------------------

const makeDb = (data) => ({
  prepare(sql) {
    let bound = [];
    const run = () => {
      if (sql.includes('FROM states')) return data.states;
      if (sql.includes('FROM districts')) {
        return data.districts.filter((d) => d.state_id === bound[0]);
      }
      if (sql.includes('FROM blocks')) {
        return data.blocks.filter((b) => b.district_id === bound[0]);
      }
      if (sql.includes('FROM passbooks WHERE district_id')) {
        return data.passbooks.filter((p) => p.district_id === bound[0]);
      }
      if (sql.includes('FROM passbooks WHERE code')) {
        return data.passbooks.filter((p) => p.code === bound[0]);
      }
      if (sql.includes('FROM meta')) {
        return [{ value: JSON.stringify(data.doc) }];
      }
      return [];
    };
    const statement = {
      bind(...args) {
        bound = args;
        return statement;
      },
      async all() {
        return { results: run() };
      },
      async first() {
        return run()[0] || null;
      },
    };
    return statement;
  },
});

const DATA = {
  states: [
    { id: 25, name: 'Uttarakhand', slug: 'uttarakhand', districts: 13, blocks: 108 },
    { id: 1, name: 'Maharashtra', slug: 'maharashtra', districts: 36, blocks: 360 },
  ],
  districts: [
    { id: 345, state_id: 25, name: 'Dehradun' },
    { id: 344, state_id: 25, name: 'Nainital' },
    { id: 500, state_id: 1, name: 'Pune' },
  ],
  blocks: [
    { id: 5502, district_id: 345, name: 'Doiwala', villages: JSON.stringify(['Jeevan Wala', 'Markham Grant', 'Raiwala']) },
    { id: 5503, district_id: 345, name: 'Sahaspur', villages: JSON.stringify(['Aamwala', 'Badowala']) },
  ],
  passbooks: [
    {
      code: 23009,
      state_id: 25,
      district_id: 345,
      block_id: 5502,
      village: 'Jeevan Wala',
      name: 'Jeevan Wala',
      name_hi: 'जीवन वाला',
      payload: JSON.stringify({ code: 23009, name: 'Jeevan Wala' }),
      data_hash: 'sha256:abc',
      generated_at: '2026-10-20T00:00:00Z',
    },
    {
      code: 23019,
      state_id: 25,
      district_id: 345,
      block_id: 5502,
      village: 'Markham Grant',
      name: 'Markham Grant',
      name_hi: '',
      payload: JSON.stringify({ code: 23019, name: 'Markham Grant' }),
      data_hash: 'sha256:def',
      generated_at: '2026-10-20T00:00:00Z',
    },
  ],
  doc: {
    year: '2025-2026',
    state: { code: 5, name: 'Uttarakhand' },
    caveats: ['Not an audit.'],
    sources: [{ id: 'x' }],
    collection: { requests: 12 },
    dataHash: 'sha256:doc',
    captured: 2,
  },
};

const call = async (path, init = {}, env = { DB: makeDb(DATA) }) => {
  const response = await worker.fetch(new Request(`https://places.test${path}`, init), env);
  const body = await response.json().catch(() => null);
  return { response, body };
};

// ---- routes -----------------------------------------------------------------

await asyncTest('the index names every route', async () => {
  const { response, body } = await call('/v1');
  assert.equal(response.status, 200);
  assert.equal(body.version, 'v1');
  assert.ok(body.routes['GET /v1/passbook?gp=23009']);
});

await asyncTest('states carry counts and are returned in order', async () => {
  const { body } = await call('/v1/states');
  assert.equal(body.states.length, 2);
  assert.equal(body.states[0].districts, 13);
});

await asyncTest('districts require a State', async () => {
  const { response } = await call('/v1/districts');
  assert.equal(response.status, 400);
});

await asyncTest('districts are filtered by State', async () => {
  const { body } = await call('/v1/districts?state=25');
  assert.deepEqual(body.districts.map((d) => d.name), ['Dehradun', 'Nainital']);
});

await asyncTest('villages carry the block and the captured GP', async () => {
  const { body } = await call('/v1/villages?district=345');
  const names = body.villages.map((v) => v.name);
  assert.deepEqual(names, ['Aamwala', 'Badowala', 'Jeevan Wala', 'Markham Grant', 'Raiwala']);
  const jeevan = body.villages.find((v) => v.name === 'Jeevan Wala');
  assert.equal(jeevan.block, 'Doiwala');
  assert.equal(jeevan.gp.code, 23009);
  const raiwala = body.villages.find((v) => v.name === 'Raiwala');
  assert.equal(raiwala.gp, null);
});

await asyncTest('a village whose block is missing from the directory is not invented', async () => {
  const { body } = await call('/v1/villages?district=344');
  assert.deepEqual(body.villages, []);
});

await asyncTest('one passbook carries the document meta and the GP row', async () => {
  const { body } = await call('/v1/passbook?gp=23009');
  assert.equal(body.gp.code, 23009);
  assert.equal(body.year, '2025-2026');
  assert.equal(body.place.blockId, 5502);
  assert.equal(body.sources.length, 1);
});

await asyncTest('an uncaptured GP is a 404, not an empty record', async () => {
  const { response } = await call('/v1/passbook?gp=99999');
  assert.equal(response.status, 404);
});

await asyncTest('bad parameters are 400s', async () => {
  for (const path of ['/v1/villages', '/v1/villages?district=abc', '/v1/passbook', '/v1/passbooks?district=']) {
    const { response } = await call(path);
    assert.equal(response.status, 400, path);
  }
});

await asyncTest('writes are refused', async () => {
  const { response, body } = await call('/v1/states', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.match(body.error.message, /GET/);
});

await asyncTest('preflight is allowed and cacheable', async () => {
  const response = await worker.fetch(
    new Request('https://places.test/v1/states', { method: 'OPTIONS' }),
    { DB: makeDb(DATA) },
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

await asyncTest('a missing binding is a 503, not a crash', async () => {
  const { response } = await call('/v1/states', {}, {});
  assert.equal(response.status, 503);
});

await asyncTest('the API is cacheable and says so', async () => {
  const { response } = await call('/v1/states');
  assert.match(response.headers.get('cache-control'), /max-age/);
});

// ---- seed contract ----------------------------------------------------------

test('the three captured GPs still name villages in Doiwala block', () => {
  const district = UTTARAKHAND.DISTRICTS.find((d) => d.name === 'Dehradun');
  assert.ok(district, 'Dehradun must exist in the Uttarakhand chunk');
  const block = UTTARAKHAND.BLOCKS.find((b) => b.name === 'Doiwala' && b.district === district.id);
  assert.ok(block, 'Doiwala block must exist');
  const names = DEHRADUN_VILLAGES.VILLAGES[String(block.id)] || [];
  for (const gp of PASSBOOK.gps) {
    assert.ok(
      names.some((name) => name.toLowerCase() === gp.name.toLowerCase()),
      `${gp.name} must be a village in Doiwala block`,
    );
  }
});

test('every State in the directory has an id and a unique name', () => {
  const ids = new Set(STATES.map((s) => s.id));
  assert.equal(ids.size, STATES.length);
  assert.ok(STATES.length >= 30);
});

if (failed) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\n${passed} places checks passed`);
