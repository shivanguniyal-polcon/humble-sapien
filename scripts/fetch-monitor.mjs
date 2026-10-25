// Run the regulatory fetcher locally.
//
//   node scripts/fetch-monitor.mjs                 # discover, no extraction
//   node scripts/fetch-monitor.mjs --drain 3       # discover and extract three
//   node scripts/fetch-monitor.mjs --drain 5 --limit 10 --source rbi-notifications
//
// It writes to a local SQLite file and a local directory, never to
// Cloudflare, so the same modules can be exercised before anything is
// deployed. The Worker runs exactly this code against D1 and R2.

import { resolve } from 'node:path';
import { ensureSchema } from '../workers/src/monitor/schema.js';
import { drainQueue, runFetch, SOURCES } from '../workers/src/monitor/fetch.js';
import { DiskBucket, NodeD1 } from './lib/node-d1.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const skipFetch = args.includes('--skip-fetch');
const dbPath = option('db', 'private/monitor.db');
const filesPath = option('files', 'private/monitor-files');
const limit = Number(option('limit', 10));
const drain = Number(option('drain', 0));
const source = option('source', null);

if (source && !SOURCES.some((entry) => entry.id === source)) {
  console.error(`No such source: ${source}. One of ${SOURCES.map((entry) => entry.id).join(', ')}.`);
  process.exit(2);
}

const db = new NodeD1(resolve(dbPath));
const bucket = new DiskBucket(resolve(filesPath));

try {
  await ensureSchema(db);
  const sources = source ? SOURCES.filter((entry) => entry.id === source) : SOURCES;
  const fetched = skipFetch ? [] : await runFetch({ db, bucket, fetch, limit, sources });
  const drained = drain > 0 ? await drainQueue({ db, bucket, limit: drain }) : [];
  console.log(JSON.stringify({ db: dbPath, files: filesPath, fetched, drained }, null, 2));
} finally {
  db.close();
}
