// Post-deploy smoke check.
//
// The live site is only useful if its Monitor chunk knows where the fetcher
// lives. That URL is baked in at build time, so a deploy from a stale `dist`
// or a plain `npm run build` ships a page with no live library — silently,
// because the page still renders. This check walks the deployed bundle and
// fails when the URL is gone. It also asks the API's health endpoint, because
// a bundle pointing at a dead fetcher is no better than one pointing nowhere.
//
// Run: npm run smoke:site
//      node scripts/smoke-site.mjs [site-url]
//
// The chunk names are hashed, so it follows the same path the browser does:
// index.html -> index chunk -> Work chunk -> the dependency map that names
// the Monitor chunk. A Vite/rolldown change that renames these breaks the
// check loudly rather than passing it by accident.

const site = (process.argv[2] || process.env.SITE_URL || 'https://the-humble-sapien.pages.dev').replace(/\/+$/, '');
const api = (process.env.MONITOR_API || 'https://ths-monitor-api.shivang-uniyal27.workers.dev').replace(/\/+$/, '');
const apiHost = new URL(api).host;

const fail = (message) => {
  console.error(`FAIL  ${message}`);
  process.exit(1);
};

const pass = (message) => console.log(`PASS  ${message}`);

const get = async (url, attempts = 1) => {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      last = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw last;
};

const main = async () => {
  // The bundle can be perfect while the fetcher behind it is down. Ask the
  // API first, and treat a non-200, bad JSON or non-ok status as a failure.
  let health;
  try {
    health = JSON.parse(await get(`${api}/v1/health?smoke=${Date.now()}`, 2));
  } catch (error) {
    fail(`${api}/v1/health did not answer: ${error?.message || error}`);
  }
  if (health.status !== 'ok') fail(`${api}/v1/health says ${String(health.status)}`);
  if (typeof health.instruments !== 'number') fail(`${api}/v1/health has no instrument count`);
  pass(`API answers: ${health.instruments} instruments, fetcher ${health.fetcher || 'unstated'}`);

  const html = await get(`${site}/?smoke=${Date.now()}`, 4);
  const indexMatch = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
  if (!indexMatch) fail(`no index chunk in ${site}/`);
  pass(`site serves ${indexMatch[0]}`);

  const index = await get(`${site}/${indexMatch[0]}`);
  const workMatch = index.match(/(?:\.\/|\/)Work-[A-Za-z0-9_-]+\.js/);
  if (!workMatch) fail('the index chunk no longer names the Work chunk');
  const workPath = `assets/${workMatch[0].replace(/^\.?\//, '')}`;
  pass(`index names ${workPath}`);

  const work = await get(`${site}/${workPath}`);
  const monitorMatch = work.match(/assets\/(Monitor-[A-Za-z0-9_-]+\.js)/);
  if (!monitorMatch) fail('the Work chunk no longer names the Monitor chunk');
  const monitorPath = `assets/${monitorMatch[1]}`;

  const monitor = await get(`${site}/${monitorPath}`);
  pass(`Monitor chunk ${monitorPath} is ${monitor.length} bytes`);

  if (!monitor.includes(apiHost)) {
    fail(`${monitorPath} does not contain ${apiHost} — this deploy would ship a dead live library`);
  }
  pass(`Monitor chunk carries ${apiHost}`);

  console.log(`\nSmoke check passed for ${site} against ${api}.`);
};

main().catch((error) => fail(String(error?.message || error)));
