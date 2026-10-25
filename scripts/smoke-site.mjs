// Post-deploy smoke check for the single Vercel site.
//
// The live site is only useful if its Monitor chunk knows where the API lives
// and the API accepts the Vercel origin. That URL is baked in at build time, so
// a deploy from a stale dist/ or a plain `npm run build` ships a page with no
// live library — silently, because the page still renders. This check walks the
// deployed bundle the way the browser does, verifies the Vercel CSP and the
// Worker's CORS answer, and fails if any link is missing.
//
// Run: npm run smoke:site
//      node scripts/smoke-site.mjs [site-url]
//
// The chunk names are hashed, so it follows: index.html -> index chunk -> Work
// chunk -> the dependency map that names the Monitor chunk. A Vite/rolldown
// change that renames these breaks the check loudly rather than passing it by
// accident.

const site = (process.argv[2] || process.env.SITE_URL || 'https://humble-sapien.vercel.app').replace(/\/+$/, '');
const api = (process.env.MONITOR_API || 'https://ths-monitor-api.shivang-uniyal27.workers.dev').replace(/\/+$/, '');
const apiHost = new URL(api).host;
const siteOrigin = new URL(site).origin;

const fail = (message) => {
  console.error(`FAIL  ${message}`);
  process.exit(1);
};

const pass = (message) => console.log(`PASS  ${message}`);

const request = async (url, { attempts = 1, origin } = {}) => {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'cache-control': 'no-cache',
          ...(origin ? { origin } : {}),
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      last = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw last;
};

const text = async (url, options) => (await request(url, options)).text();

const json = async (url, options) => {
  const response = await request(url, options);
  const body = await response.json();
  return { response, body };
};

const main = async () => {
  // The bundle can be perfect while the fetcher behind it is down or hostile
  // to the site origin. Ask both read endpoints with the browser's Origin.
  const health = await json(`${api}/v1/health?smoke=${Date.now()}`, { attempts: 2, origin: siteOrigin }).catch((error) => {
    fail(`${api}/v1/health did not answer from ${siteOrigin}: ${error?.message || error}`);
  });
  if (health.body.status !== 'ok') fail(`${api}/v1/health says ${String(health.body.status)}`);
  if (typeof health.body.instruments !== 'number') fail(`${api}/v1/health has no instrument count`);

  const healthCors = health.response.headers.get('access-control-allow-origin');
  if (healthCors !== siteOrigin && healthCors !== '*') {
    fail(`${api}/v1/health allows ${String(healthCors)}, not ${siteOrigin}; ALLOWED_ORIGIN is stale`);
  }
  pass(`API health answers ${health.body.instruments} instruments; CORS allows ${siteOrigin}`);

  const list = await json(`${api}/v1/instruments?limit=1&smoke=${Date.now()}`, {
    attempts: 2,
    origin: siteOrigin,
  }).catch((error) => {
    fail(`${api}/v1/instruments did not answer from ${siteOrigin}: ${error?.message || error}`);
  });
  if (!Array.isArray(list.body.instruments)) fail(`${api}/v1/instruments has no instruments array`);
  const listCors = list.response.headers.get('access-control-allow-origin');
  if (listCors !== siteOrigin && listCors !== '*') {
    fail(`${api}/v1/instruments allows ${String(listCors)}, not ${siteOrigin}`);
  }
  pass(`API instruments answers with ${list.body.instruments.length} row(s); CORS allows ${siteOrigin}`);

  const htmlResponse = await request(`${site}/?smoke=${Date.now()}`, { attempts: 4 });
  const csp = htmlResponse.headers.get('content-security-policy') || '';
  const connectSrc = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith('connect-src '));
  if (!connectSrc) fail(`the Vercel response has no connect-src CSP directive`);
  if (!connectSrc.includes(apiHost)) {
    fail(`CSP ${connectSrc} does not name ${apiHost}; the browser would block the live library`);
  }
  pass(`CSP connect-src allows ${apiHost}`);

  const html = await htmlResponse.text();
  const indexMatch = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
  if (!indexMatch) fail(`no index chunk in ${site}/`);
  pass(`site serves ${indexMatch[0]}`);

  const index = await text(`${site}/${indexMatch[0]}`);
  const workMatch = index.match(/(?:\.\/|\/)Work-[A-Za-z0-9_-]+\.js/);
  if (!workMatch) fail('the index chunk no longer names the Work chunk');
  const workPath = `assets/${workMatch[0].replace(/^\.?\//, '')}`;
  pass(`index names ${workPath}`);

  const work = await text(`${site}/${workPath}`);
  const monitorMatch = work.match(/assets\/(Monitor-[A-Za-z0-9_-]+\.js)/);
  if (!monitorMatch) fail('the Work chunk no longer names the Monitor chunk');
  const monitorPath = `assets/${monitorMatch[1]}`;

  const monitor = await text(`${site}/${monitorPath}`);
  pass(`Monitor chunk ${monitorPath} is ${monitor.length} bytes`);

  if (!monitor.includes(apiHost)) {
    fail(`${monitorPath} does not contain ${apiHost} — this deploy would ship a dead live library`);
  }
  pass(`Monitor chunk carries ${apiHost}`);

  console.log(`\nSmoke check passed for ${site} against ${api}.`);
};

main().catch((error) => fail(String(error?.message || error)));
