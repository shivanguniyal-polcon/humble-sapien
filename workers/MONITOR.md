# Regulatory monitor API and fetcher

One Worker, three jobs:

- discover new RBI instruments twice a day and store the detail-page snapshot in R2;
- extract the instrument text and its duty sentences into D1, from a queue;
- serve a small read API and an OCR endpoint for scanned pages.

The extraction rules are the same modules the monitor page runs in the browser
(`src/lib/monitor/read.js`). No generative model decides what a duty is.

## Why the detail page, not the PDF

`rbidocs.rbi.org.in` sits behind an F5 JavaScript challenge. A plain HTTP
client gets a 200 with a challenge page instead of the PDF, so a server-side
PDF fetcher cannot be relied on. The detail pages on `www.rbi.org.in` carry the
full instrument inline and are served normally, so the fetcher reads those.
The PDF URL is still recorded for a human to open.

This was verified on 24 October 2026: listing and detail pages in, PDFs out
with `bobcmn`/`TSPD_101` challenge HTML.

## Layout

```
workers/monitor-worker.js        routes, cron, admin trigger
workers/monitor.wrangler.toml    D1 + R2 + cron
workers/src/monitor/
  schema.js                      D1 schema (instruments, queue, FTS5, OCR usage)
  parse.js                       listing page -> items (fixtures in workers/test-fixtures)
  article.js                     detail page -> instrument body
  extract.js                     body -> instrument chunk (same reader as the browser)
  fetch.js                       discovery, fingerprints, queue drain
  store.js                       D1 queries
  ocr.js                         Replicate / OpenAI-compatible OCR adapter
```

The source lives outside `api/` on purpose. Vercel turns every root-level
`api/*.js` into a public Serverless Function, and this repository has no Vercel
API surface. The Worker is deployed separately with Wrangler.

## Local

```bash
npm run monitor:api     # wrangler dev on :8788, local D1 and R2
npm run monitor:fetch   # discovery + storage against private/monitor.db
npm run monitor:drain   # extract three queued instruments
```

For OCR in the page, run the site with the API address:

```bash
VITE_MONITOR_API=http://127.0.0.1:8788 npm run dev
```

Without `VITE_MONITOR_API` the OCR button is disabled and says so. Page text
extraction still works: it happens in the browser and uploads nothing.

The committed Worker config points `ALLOWED_ORIGIN` at the Vercel site. For OCR
against a local Worker, start it with `--var ALLOWED_ORIGIN:*` (local only) or
with the local site origin, for example:

```bash
npm run monitor:api -- --var ALLOWED_ORIGIN:http://localhost:5173
```

## Deploy

```bash
wrangler d1 create ths-monitor
wrangler r2 bucket create ths-monitor-files
# put the returned database_id in monitor.wrangler.toml
wrangler secret put ADMIN_TOKEN -c workers/monitor.wrangler.toml
wrangler secret put REPLICATE_API_TOKEN -c workers/monitor.wrangler.toml
wrangler deploy -c workers/monitor.wrangler.toml
```

Set `ALLOWED_ORIGIN` in `[vars]` to the Vercel site origin
(`https://humble-sapien.vercel.app`). `*` is for local work only.

## Deployed

The monitor runs at **https://ths-monitor-api.shivang-uniyal27.workers.dev**
(deployed 24 October 2026) with D1 `ths-monitor`, R2 `ths-monitor-files` and
both cron patterns registered. `ADMIN_TOKEN` is a Worker secret.

The site is on Vercel at **https://humble-sapien.vercel.app** and is the only
public site. `vercel.json` runs `npm run build:vercel` for production, which
bakes the API URL into the Monitor chunk. Use the scripts, not raw commands:

```bash
npm run build:vercel   # vite build with the production API baked in
npm run smoke:site     # check the live bundle, CSP and Worker CORS
```

The API URL is baked in at build time, so a plain `npm run build` produces a
site with no live library and no OCR. Vercel's Build Command is set to
`npm run build:vercel` in `vercel.json` for that reason; do not override it in
the dashboard with `npm run build`. There is no Pages deploy script; Pages is
retired.

`smoke-site.mjs` first calls `/v1/health` and fails unless the API answers
with `status: ok` and an instrument count. It then calls `/v1/instruments`
with the Vercel `Origin` and checks that the Worker returns that origin in
`access-control-allow-origin`, so a CORS regression is a failing smoke, not a
silent one. Next it reads the Vercel `content-security-policy` and requires
`connect-src` to name the API host, then walks the deployed bundle the way the
browser does — root HTML, index chunk, Work chunk, the dependency map that
names the Monitor chunk — and fails with exit 1 if that chunk no longer
contains the API host. It reads the site and the API from its defaults, or
from `SITE_URL` and `MONITOR_API`. Hashed chunk names mean a build-tool rename
fails the check loudly instead of passing it silently. `ALLOWED_ORIGIN` is the
Vercel origin; the read API is open, but OCR returns 403 for any other origin.

The cron is `0 6,18 * * *` for discovery, plus `15 */6 * * *` to drain a
backlog. Free-plan cron invocations get 10 ms of CPU, which will not parse a
long instrument; the drain is capped at 3–5 per run so it fits, and a paid
plan can raise it.

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/` | index, limits, disclaimer |
| GET | `/v1/health` | counts, queue depth, last run |
| GET | `/v1/instruments?q=` | recent, or FTS5 search with a snippet |
| GET | `/v1/instruments/:id` | text, duties, sentences, source URL |
| POST | `/v1/ocr` | `{image, mediaType, page}`; 5 pages/IP/day |
| POST | `/v1/admin/fetch` | bearer `ADMIN_TOKEN`; `{limit, drain, source}` |

OCR providers:

- `OCR_PROVIDER=replicate` (default) with `REPLICATE_API_TOKEN`, model from
  `OCR_MODEL` (default `lucataco/glm-ocr`).
- `OCR_PROVIDER=openai` with `OCR_BASE_URL`, `OCR_MODEL`, optional
  `OCR_API_KEY`. This covers a self-hosted GLM-OCR or Unlimited-OCR behind
  vLLM or SGLang.

Images are not stored by default. `OCR_STORE_IMAGES=1` writes each page to R2
under `ocr/<day>/<hash>.jpg` and returns the key in the provenance.

## Limits, stated plainly

- A change is detected by the listing fingerprint (title, date, PDF URL). A
  master direction edited in place without changing any of those is missed.
- An RBI redesign breaks the parser. The fixtures are excerpts of the live
  pages so the next change is a failing test, not a silent empty library.
- Text is extracted once; an instrument stored as `no-text` is not retried
  unless it is re-queued.
- D1 export does not support FTS5 virtual tables: drop `instruments_fts`,
  export, recreate and rebuild it.
- Nothing here checks that an instrument is still in force. The pack says so.
