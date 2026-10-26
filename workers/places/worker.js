// THS Places API.
//
// The directory behind Khata: State, district and village, plus the Gram
// Panchayat passbooks that have actually been captured. The shapes are small
// and stable because the page has three selects and one record to render.
//
// Everything here is public data with a public source, so every route is a
// GET, there is no credential, and there is no write path. The CORS wildcard
// is deliberate for the same reason: there is nothing to steal.
//
// Deploy: wrangler deploy -c workers/places/wrangler.toml

const API_VERSION = 'v1';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      ...cors,
      ...headers,
    },
  });

const error = (status, message) =>
  json({ error: { status, message } }, status, { 'cache-control': 'no-store' });

const intParam = (value) => {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const INDEX = {
  name: 'THS Places API',
  version: API_VERSION,
  description:
    'State, district and village directory for the Khata village money tool, plus every captured Gram Panchayat passbook.',
  routes: {
    'GET /v1/': 'This index.',
    'GET /v1/states': 'States and union territories with district and block counts.',
    'GET /v1/districts?state=25': 'Districts of one State.',
    'GET /v1/villages?district=345': 'Every village in a district, with its block and any captured GP.',
    'GET /v1/passbooks?district=345': 'Gram Panchayats in the district that have a captured passbook.',
    'GET /v1/passbook?gp=23009': 'One Gram Panchayat passbook, with the document meta and its sources.',
  },
  source:
    'Village and district names: Local Government Directory via geoBoundaries gbOpen, ODbL 1.0. Passbooks: public eGramSwaraj returns, hashed at capture.',
};

async function states(db) {
  const rows = await db
    .prepare(
      `SELECT s.id, s.name, s.slug,
              (SELECT COUNT(*) FROM districts d WHERE d.state_id = s.id) AS districts,
              (SELECT COUNT(*) FROM blocks b
                 JOIN districts d ON d.id = b.district_id
                WHERE d.state_id = s.id) AS blocks
         FROM states s
        ORDER BY s.name`,
    )
    .all();
  return rows.results || [];
}

async function districts(db, stateId) {
  if (stateId === null) return null;
  const rows = await db
    .prepare('SELECT id, name FROM districts WHERE state_id = ? ORDER BY name')
    .bind(stateId)
    .all();
  return rows.results || [];
}

// One block row holds its village names as a JSON array. The passbooks are
// attached here, in the Worker, because SQL cannot read inside that array;
// three captured GPs do not justify a second table of six hundred thousand
// rows.
async function villages(db, districtId) {
  if (districtId === null) return null;
  const [blockRows, gpRows] = await Promise.all([
    db
      .prepare('SELECT id, name, villages FROM blocks WHERE district_id = ? ORDER BY name')
      .bind(districtId)
      .all(),
    db
      .prepare('SELECT code, block_id, village, name FROM passbooks WHERE district_id = ?')
      .bind(districtId)
      .all(),
  ]);

  const captured = new Map();
  for (const gp of gpRows.results || []) {
    captured.set(`${gp.block_id}|${String(gp.village).toLowerCase()}`, gp);
  }

  const out = [];
  for (const block of blockRows.results || []) {
    let names = [];
    try {
      names = JSON.parse(block.villages);
    } catch {
      names = [];
    }
    for (const name of names) {
      const gp = captured.get(`${block.id}|${String(name).toLowerCase()}`) || null;
      out.push({
        name,
        blockId: block.id,
        block: block.name,
        gp: gp ? { code: gp.code, name: gp.name } : null,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

async function passbook(db, code) {
  if (code === null) return null;
  const row = await db
    .prepare('SELECT * FROM passbooks WHERE code = ?')
    .bind(code)
    .first();
  if (!row) return null;
  const metaRow = await db
    .prepare("SELECT value FROM meta WHERE key = 'doc'")
    .first();
  let doc = {};
  try {
    doc = metaRow ? JSON.parse(metaRow.value) : {};
  } catch {
    doc = {};
  }
  let gp = null;
  try {
    gp = JSON.parse(row.payload);
  } catch {
    gp = null;
  }
  if (!gp) return null;
  return {
    ...doc,
    gp,
    gpCode: row.code,
    place: {
      stateId: row.state_id,
      districtId: row.district_id,
      blockId: row.block_id,
      village: row.village,
    },
  };
}

async function capturedGps(db, districtId) {
  if (districtId === null) return null;
  const rows = await db
    .prepare('SELECT code, name, name_hi FROM passbooks WHERE district_id = ? ORDER BY name')
    .bind(districtId)
    .all();
  return rows.results || [];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...cors, 'access-control-max-age': '86400' },
      });
    }

    if (method !== 'GET') {
      return error(405, `${method} is not supported. Every route here is a GET.`);
    }

    if (!env || !env.DB) {
      return error(503, 'The places database is not bound to this Worker.');
    }

    try {
      if (path === '/' || path === '/v1') return json(INDEX);

      if (path === '/v1/states') {
        return json({ states: await states(env.DB) });
      }

      if (path === '/v1/districts') {
        const stateId = intParam(url.searchParams.get('state'));
        if (stateId === null) {
          return error(400, 'A numeric `state` parameter is required.');
        }
        return json({ districts: await districts(env.DB, stateId) });
      }

      if (path === '/v1/villages') {
        const districtId = intParam(url.searchParams.get('district'));
        if (districtId === null) {
          return error(400, 'A numeric `district` parameter is required.');
        }
        return json({ villages: await villages(env.DB, districtId) });
      }

      if (path === '/v1/passbooks') {
        const districtId = intParam(url.searchParams.get('district'));
        if (districtId === null) {
          return error(400, 'A numeric `district` parameter is required.');
        }
        return json({ passbooks: await capturedGps(env.DB, districtId) });
      }

      if (path === '/v1/passbook') {
        const code = intParam(url.searchParams.get('gp'));
        if (code === null) {
          return error(400, 'A numeric `gp` parameter is required.');
        }
        const doc = await passbook(env.DB, code);
        if (!doc) {
          return error(404, 'No passbook has been captured for that Gram Panchayat.');
        }
        return json(doc);
      }

      return error(404, `No route for GET ${path}. See GET /v1/ for the index.`);
    } catch (err) {
      return error(500, 'The request could not be read from the database.');
    }
  },
};

export { INDEX, states, districts, villages, passbook, capturedGps };
