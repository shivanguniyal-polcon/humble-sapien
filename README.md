# THS — The Humble Sapien

**The fifth pillar of democracy.**

THS is a public interest technology initiative working toward registration as a not-for-profit civil society organisation, across the whole
policy surface — health, sanitation, governance, technology and beyond — the
way public-interest technology organisations work on tech policy: close to the
systems that shape people's lives, adversarial to weak evidence, useful to the
public.

Run by the learners of today, for the leaders of tomorrow.

## What's inside

Every tool opens with the same three lines: its name, the question it answers,
and what it does plus how to use it.

- **Ankur** (Local solutions) — a knowledge base of grassroots fixes documented
  like evidence: what it is, where it lives, how it works, what backs the claim.
- **Saral** (Policy simplifier) — a client-side pipeline that rewrites statutory
  phrasing into plain language, flags long sentences and extracts obligations
  (who must do what).
- **Sampark** (Touchpoint maps) — major schemes (PM-JAY, Swachh Bharat) broken
  into the citizen's journey, with what to measure at each touchpoint and the
  evidence.
- **Khata** (The village money tool) — every State, district and village in the
  Local Government Directory, with a captured Gram Panchayat passbook where one
  exists: receipts, payments, the 15th Finance Commission balance, completed
  works and plan activities, and the questions a Gram Sabha can ask. Every source
  response is hashed. The directory and the passbooks are served from D1; the
  page ships none of it.
- **THS Data Commons** — a playground, not a catalogue: chart series, pair
  datasets, run correlation and OLS fits yourself. Open tiers are free
  forever; the Commons Plus tier is the mission-locked revenue engine that
  funds the rest.
- **Field notes** — the thinking behind the venture.

## Live site

**https://humble-sapien.vercel.app/** — the only public deployment. The old
Cloudflare Pages site is retired and must not be deployed again.

## Deployment

Vercel builds with `npm run build:vercel`, which bakes the Monitor API URL into
the bundle. `vercel.json` sets that build command and the CSP `connect-src`
entry for the Worker. `npm run smoke:site` checks the deployed bundle, the Vercel
CSP and the Worker's CORS answer.

### Keeping the catalogue count current

The count on the timeline is a dated build snapshot, not a live feed.
`npm run build` runs [`scripts/build-catalogue-snapshot.mjs`](scripts/build-catalogue-snapshot.mjs)
first, deriving the three figures from the same rows the chart draws and
stamping the result with the build time. The header shows that stamp under the
count.

Vercel rebuilds on every push. A weekly GitHub Action
([`.github/workflows/catalogue-rebuild.yml`](.github/workflows/catalogue-rebuild.yml))
also asks Vercel to rebuild every Monday, so the stamp stays within seven days.
It uses a Deploy Hook:

1. In Vercel, open the project → **Settings → Git → Deploy Hooks**, create a
   hook for `main`, and copy its URL.
2. In GitHub, open the repository → **Settings → Secrets and variables →
   Actions**, add `VERCEL_DEPLOY_HOOK` with that URL.

Until the secret exists, the scheduled job logs a warning and does nothing; it
never reports a refresh it did not trigger. A rebuild restamps the date but does
not invent new instruments. To refresh the count itself, re-crawl India Code and
rebuild the exports:

```bash
node scripts/build-state-output.mjs
node scripts/build-research-downloads.mjs
npm run build:catalogue
```

The regulatory monitor and Legal Simplifier Workers live in [`workers/`](workers/),
not under `api/`. Vercel turns every root-level `api/*.js` into a public
Serverless Function, so the Worker source is deliberately outside that path.
Deploy the monitor backend with:

```bash
wrangler deploy -c workers/monitor.wrangler.toml
```

See [`workers/MONITOR.md`](workers/MONITOR.md) for the D1/R2 setup and
[`workers/README.md`](workers/README.md) for the Legal Simplifier API.

The places API behind Khata is its own Worker and D1 database:

```bash
npx wrangler d1 execute ths-places --remote --file=workers/places/schema.sql
node scripts/seed-places.mjs          # writes SQL to private/places-seed/
# apply the files it prints, then:
wrangler deploy -c workers/places/wrangler.toml
```

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
node scripts/check-contrast.mjs   # measure WCAG contrast of the token pairs
```

Everything runs in the browser; no analysis sends data anywhere.

## Design

The interface follows the craft rules in
[jakubkrehel/skills](https://github.com/jakubkrehel/skills): a serif/sans type
pairing on a semantic scale, color ramps where every step has a role, exact
motion values (press 0.96 / 150ms, `cubic-bezier(0.2, 0, 0, 1)`), motion gated
behind `prefers-reduced-motion`, tabular numerals on data, and contrast
measured rather than estimated (`scripts/check-contrast.mjs`).
