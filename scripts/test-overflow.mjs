#!/usr/bin/env node
// Horizontal-overflow regression for every route.
//
//     npm run build
//     node scripts/test-overflow.mjs
//
// A mobile browser can widen its layout viewport to fit content, so comparing
// scrollWidth with innerWidth alone misses the bug. Each route is checked at
// 320, 390 and 768 CSS pixels for both: the document must not scroll wider
// than the requested width, and the layout viewport must not expand past it.
//
// Routes are derived from the data, not copied here: a new tool, publication,
// data page, essay, newsletter issue, archive record or Atlas sector is picked
// up automatically. The script starts its own vite preview from dist/ and uses
// a local Chrome, Chromium or Brave through CDP. Set CHROME_PATH if the browser
// is somewhere unusual; set BASE_URL to reuse a running preview instead.
//
// No browser or test-runner dependency is added to the project.

import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOLS } from '../src/data/tools.js';
import { publications } from '../src/data/publications.js';
import { catalog } from '../src/data/catalog.js';
import { ESSAYS } from '../src/data/essays.js';
import { NEWSLETTER } from '../src/data/newsletter.js';
import { sectors } from '../src/data/sectors.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const WIDTHS = [320, 390, 768];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ARCHIVE = JSON.parse(
  readFileSync(new URL('../src/data/archive/index.json', import.meta.url), 'utf8'),
);

// Every hash route the router answers. The path is what follows '#'. Home is
// '/' because that is how the app spells its own door.
const ROUTES = [
  ['/', 'Home'],
  ['/index', 'Index'],
  ['/tools', 'Tools'],
  ['/research', 'Research'],
  ['/data', 'Data'],
  ['/archive', 'Archive'],
  ['/atlas', 'Atlas'],
  ['/pitdesk', 'PIT Desk'],
  ['/rara', 'RARA'],
  ['/rara/tracker', 'RARA tracker'],
  ['/writing', 'Writing'],
  ['/newsletter', 'Newsletter'],
  ['/support', 'Support'],
  ['/licensing', 'Licensing'],
  ['/about', 'About'],
  ...TOOLS.map((tool) => [`/tools/${tool.id}`, `Tool: ${tool.name}`]),
  ...publications.map((pub) => [`/research/${pub.id}`, `Publication: ${pub.id}`]),
  ...catalog.map((dataset) => [`/data/${dataset.id}`, `Data: ${dataset.id}`]),
  ['/data/methods', 'Data methods'],
  ['/data/opendata', 'Data: open directory'],
  ...ESSAYS.map((essay) => [`/writing/${essay.id}`, `Essay: ${essay.id}`]),
  ...NEWSLETTER.map((issue) => [`/newsletter/${issue.id}`, `Newsletter: ${issue.id}`]),
  ...ARCHIVE.records.map((record) => [`/archive/${record.id}`, `Archive: ${record.id}`]),
  ...sectors.map((sector) => [`/atlas/${sector.id}`, `Atlas: ${sector.id}`]),
];

let failures = 0;
let checks = 0;
let browser = null;
let preview = null;
let cdp = null;
let profile = null;

const executable = (path) => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const fromPath = (names) => {
  for (const name of names) {
    for (const dir of (process.env.PATH || '').split(delimiter)) {
      if (dir && executable(join(dir, name))) return join(dir, name);
    }
  }
  return null;
};

const findBrowser = () => {
  const candidatePaths = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/brave-browser',
  ].filter(Boolean);

  const found = candidatePaths.find(executable) || fromPath([
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'brave-browser',
    'brave',
    'microsoft-edge',
    'msedge',
  ]);

  if (!found) {
    throw new Error(
      'No Chrome, Chromium or Brave found. Set CHROME_PATH to the browser executable.',
    );
  }
  return found;
};

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });

const killTree = (child, { group = false } = {}) => {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else if (group) {
      process.kill(-child.pid, 'SIGKILL');
    } else {
      child.kill('SIGKILL');
    }
  } catch {
    // Already gone.
  }
};

const startPreview = async () => {
  if (!existsSync(join(ROOT, 'dist/index.html'))) {
    throw new Error('dist/index.html is missing. Run `npm run build` before this test.');
  }

  const port = await getFreePort();
  const child = spawn(
    process.execPath,
    [
      join(ROOT, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`vite preview exited before it was ready.\n${stderr}`);
    }
    try {
      const response = await fetch(base);
      if (response.ok) return { child, base };
    } catch {
      // Not listening yet.
    }
    await sleep(150);
  }

  throw new Error(`vite preview did not answer on ${base}.\n${stderr}`);
};

const launchBrowser = async () => {
  const path = findBrowser();
  const debugPort = await getFreePort();
  profile = await mkdtemp(join(tmpdir(), 'ths-overflow-'));

  const args = [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-dev-shm-usage',
    '--mute-audio',
    '--hide-scrollbars',
    '--window-size=1200,900',
  ];
  if (process.env.CI) args.push('--no-sandbox');

  browser = spawn(path, args, {
    detached: process.platform !== 'win32',
    stdio: 'ignore',
  });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (browser.exitCode !== null) {
      throw new Error(`${path} exited before its debugging port opened.`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return debugPort;
    } catch {
      // Not up yet.
    }
    await sleep(150);
  }
  throw new Error(`No Chrome DevTools endpoint on port ${debugPort}.`);
};

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.pending = new Map();
    this.nextId = 0;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text || 'page evaluation failed');
    return result.value;
  }

  close() {
    try {
      this.socket.close();
    } catch {
      // Already closed.
    }
  }
}

const connect = (url) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => resolve(new Cdp(socket));
    socket.onerror = () => reject(new Error('Chrome DevTools WebSocket failed'));
  });

const waitFor = async (page, expression, timeout = 20_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await page.evaluate(expression)) return true;
    } catch {
      // The page may be between documents.
    }
    await sleep(100);
  }
  return false;
};

const hashFor = (path) => (path === '/' ? '#/' : `#${path}`);
const keyFor = (value) => value.replace(/^#\/?/, '');

const setRoute = async (page, path) => {
  const hash = hashFor(path);
  const key = keyFor(hash);
  await page.evaluate(`location.hash = ${JSON.stringify(hash)}`);

  const arrived = await waitFor(
    page,
    `location.hash.replace(/^#\\/?/, '') === ${JSON.stringify(key)}`,
    5_000,
  );
  if (!arrived) throw new Error(`hash did not settle on ${hash}`);

  const loaded = await waitFor(page, `!document.querySelector('.route-fallback')`);
  if (!loaded) throw new Error(`route fallback did not clear for ${hash}`);

  // Let the page body settle before measuring. Two identical samples 120ms
  // apart avoid reading a lazy component's first, unlaid-out frame.
  let previous = '';
  let stable = 0;
  for (let i = 0; i < 80; i += 1) {
    const text = await page.evaluate(
      `(document.querySelector('main')?.innerText || '').slice(0, 4000)`,
    );
    if (text && text === previous) stable += 1;
    else stable = 0;
    previous = text;
    if (stable >= 2) break;
    await sleep(120);
  }
  if (stable < 2) throw new Error(`page body did not settle for ${hash}`);

  await page.evaluate(
    'document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true',
  );
};

const measure = (page, width) =>
  page.evaluate(`(() => {
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return {
      requested: ${width},
      innerWidth,
      visualWidth: Math.round(window.visualViewport?.width || 0),
      docClientWidth: document.documentElement.clientWidth,
      scrollWidth,
      overflow: scrollWidth - ${width},
      expanded: innerWidth - ${width},
      heading: (document.querySelector('main h1')?.innerText || '').trim().slice(0, 120),
    };
  })()`);

const offenders = (page, width) =>
  page.evaluate(`(() => {
    const rows = [];
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      if (rect.right <= ${width} + 1 && rect.left >= -1) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        continue;
      }
      const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
      rows.push({
        tag: el.tagName.toLowerCase(),
        cls: cls.slice(0, 80),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        text: (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 100),
      });
    }
    return rows
      .sort((a, b) => Math.max(b.right - ${width}, b.width - ${width}) - Math.max(a.right - ${width}, a.width - ${width}))
      .slice(0, 5);
  })()`);

const closeAll = async () => {
  cdp?.close();
  killTree(browser, { group: true });
  if (preview?.child && preview.child.exitCode === null) {
    preview.child.kill('SIGTERM');
    await sleep(250);
    killTree(preview.child);
  }
  if (profile) {
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
};

process.on('exit', () => {
  killTree(browser, { group: true });
  killTree(preview?.child);
});

try {
  const baseUrl = process.env.BASE_URL
    ? process.env.BASE_URL.replace(/\/$/, '')
    : (preview = await startPreview()).base;
  const debugPort = await launchBrowser();

  const target = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 900,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Page.navigate', { url: `${baseUrl}#/` });

  const booted = await waitFor(
    cdp,
    `!!document.querySelector('.site-head') && !!document.querySelector('main h1')`,
  );
  if (!booted) throw new Error('the app did not boot');

  for (const [path, label] of ROUTES) {
    await setRoute(cdp, path);

    const routeFailures = [];
    for (const width of WIDTHS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await sleep(220);

      const result = await measure(cdp, width);
      checks += 1;
      if (result.overflow > 1 || result.expanded > 1) {
        failures += 1;
        routeFailures.push({ width, result, bad: await offenders(cdp, width) });
      }
    }

    if (routeFailures.length === 0) {
      console.log(`  ok   ${path}`);
      continue;
    }

    for (const failure of routeFailures) {
      const { width, result, bad } = failure;
      console.log(
        `  FAIL ${label} (${path}) @ ${width}px: scroll ${result.overflow > 0 ? '+' : ''}${result.overflow}px, viewport +${result.expanded}px`,
      );
      for (const element of bad) {
        console.log(
          `       <${element.tag}${element.cls ? ` class="${element.cls}"` : ''}> ${element.width}px at x=${element.left}`,
        );
      }
    }
    console.log(`       heading: ${routeFailures[0].result.heading}`);
  }

  console.log(
    `\n${checks - failures}/${checks} checks passed across ${ROUTES.length} routes and ${WIDTHS.join('/')} widths.`,
  );
  if (failures) process.exitCode = 1;
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
} finally {
  await closeAll();
}
