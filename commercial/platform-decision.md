# Platform decision: stay on Cloudflare

**Question.** Cloudflare has a change dated 1 December 2026. Should THS stay, or move to a platform with more liberal terms and a better free tier?

**Answer.** Stay. The 1 December 2026 change is a pricing model for logs and traces, it cannot bill a free account, and on the numbers it improves what THS gets. The more serious compliance problem in THS's stack is somewhere else: the site is deployed to Vercel, whose free plan forbids commercial use.

**Checked.** 30 October 2026, against Cloudflare's own blog and documentation, Vercel's plan documentation, and Deno's announcement.

---

## 1. What the 1 December change actually is

It is not a change to Cloudflare's terms of service, privacy policy, or developer agreement. It is the unification of observability pricing — logs and traces — announced on 2 October 2026.

From the announcement:

> Beginning December 1, 2026, this pricing model will apply across all plans (effective upon renewal for all Enterprise customers) and cover existing Developer Platform logs, including Workers, Containers, AI Gateway, as well as all tracing data.

The model moves from an event count to data volume:

| Plan | Included ingestion | Retention | Overage |
| --- | --- | --- | --- |
| Free | 0.5 GB per day | 7 days | Not available |
| Paid | 50 GB per billing cycle + 10 GB-month storage | 7 days, up to 1 year planned | $0.25/GB in, $0.10/GB-month stored |

The detail that settles the question is in the pricing documentation:

> On Free, Cloudflare stops ingesting new data when the account reaches its daily limit. Ingestion resumes when the allowance resets at 00:00 UTC.

A free account has no overage path. Exceeding the allowance costs nothing because it cannot be charged; logs simply stop for the rest of the day. The downside is silent data loss, not a bill.

The same announcement adds things THS did not have before: 30 days of domain analytics on every plan, and Logpush on self-serve plans with 25 GB a month free to Cloudflare destinations.

The other 1 December 2026 date in Cloudflare's documentation is unrelated: the DNS Analytics and DNS Firewall Analytics REST endpoints reach end of life and must move to GraphQL. THS uses neither.

## 2. What it does to THS

The stack, from the three Wrangler configs:

| Component | What it holds | Free-tier ceiling | THS load |
| --- | --- | --- | --- |
| `ths-monitor-api` | D1 `ths-monitor`, R2 `ths-monitor-files`, cron twice daily | 100k requests/day, 5 GB D1, 10 GB R2 | low |
| `ths-rara-tracker` | D1 `ths-rara` | same | low |
| `ths-legal-simplifier-api` | stateless | 100k requests/day | low |
| Site | static Vite build | — | low |

All three configs have `[observability] enabled = true`, so all three move onto the new model on 1 December. The exposure is arithmetic: at a few thousand requests a day and roughly a kilobyte per event, ingestion lands in single-digit megabytes against a 500 MB daily allowance — about two orders of magnitude of headroom. The collector writes on the order of a hundred rows per run, four runs a day, against a 100k row/day write allowance.

**Cost impact: zero, and structurally so.** The free plan has no mechanism to charge.

## 3. What it is not

No Cloudflare agreement effective 1 December 2026 was found. The documents in force carry other dates — the self-serve subscription agreement 12 September 2025, the developer platform service-specific terms 28 September 2026, the privacy policy 4 November 2025. None is a December change.

For future price changes, the self-serve agreement reserves the right to change fees on **thirty days' notice** (§4.2). That is the clause that matters for planning: any future shift in Cloudflare's free allowance arrives with a month's warning, which is enough to move a static build.

The [Website and Online Services Terms](https://www.cloudflare.com/website-terms/) contain a broad content licence and a California jurisdiction clause, but the same page excludes products supplied under the subscription agreements — which is what Workers, D1 and R2 are. Reading that clause as a licence over hosted articles would be a misreading.

## 4. The finding that inverts the premise

The site is not on Cloudflare. It is on Vercel: `build:vercel` deploys the Vite output, and the monitor Worker pins `ALLOWED_ORIGIN = "https://humble-sapien.vercel.app"`.

Vercel's Hobby plan documentation, last updated 14 September 2026, says:

> As stated in the fair use guidelines, the Hobby plan restricts users to non-commercial, personal use only.

THS is a publication with a commercial arm — `commercial/` holds a roadmap and a memo build plan. On a `.vercel.app` domain the free plan is the default, so this needs confirming against the actual billing record; the plan is not visible from the repo. If it is Hobby, it is a live terms problem, and it sits on the *hosting* layer, not the API layer. Cloudflare Pages has no equivalent restriction: static asset requests are free and unlimited, and commercial use is not excluded.

So the migration worth doing is the one that was never on the table: move the static site from Vercel to Cloudflare Pages, which also collapses two vendors into one.

## 5. The alternatives, judged on this workload

| Option | Verdict for THS |
| --- | --- |
| **Cloudflare** Workers + Pages + D1 + R2 | Best fit. Static unlimited, 100k requests/day, 5 GB D1, 10 GB R2 with free egress. No commercial-use bar. |
| **Vercel** Hobby | Disqualified by the non-commercial clause above. Pro is $20/seat/month to fix a hosting problem that Pages solves for nothing. |
| **Deno Deploy** | Off the table. Deno joined Cloudflare on 9 October 2026; Deploy "will continue operating for six months before shutting down" — roughly April 2027. The runtime gets a year of fixes and then development ends. |
| **Netlify** | Free plan is 300 credits/month with a hard stop when exhausted, and database storage pricing after 1 July 2026 was not resolvable from the docs. Weaker than what THS already has. |
| **Turso** | Nearest SQLite fit, but the published terms restrict use to non-commercial, they predate its October 2026 Supabase acquisition, and it replaces only the database. |
| **Supabase / Neon** | Postgres, so a schema and query rewrite for no capability THS currently needs. Reasonable later if auth or relational reporting arrives. |
| **GitHub Pages** | Static only, and the terms exclude sites that primarily facilitate commercial transactions or commercial SaaS. |
| **Hetzner / Fly / Railway** | Paid, and they trade a managed platform for patching, backups and uptime. Wrong trade at this size. |

The pattern across the alternatives is that the ones advertising generosity on the free tier — Vercel, Turso, Deno — carry a use restriction or a wind-down that disqualifies them for a commercial publication. Cloudflare's free tier is the one that is both large and unrestricted.

## 6. What to do

1. **Stay on Cloudflare.** No platform migration. Go live on D1 as planned.
2. **Move the site to Cloudflare Pages.** Removes the Vercel terms problem and the second vendor. The build is already static, so this is configuration, not rewriting.
3. **Keep observability on, and treat 500 MB/day as a ceiling to watch, not a cost.** If a chatty Worker ever starts dropping logs, sample before storage rather than paying.
4. **Export D1 monthly.** The lock-in in this stack is the data, not the code. A scheduled `wrangler d1 export` into the repo or R2 makes the database portable and costs nothing.
5. **Re-read the terms on a schedule.** The 30-day fee-notice clause is the tripwire; a calendar entry before any renewal is enough.

## 7. What would change this answer

- D1's 100k row writes/day or 5 GB becoming a real constraint — then Postgres, and Neon or Supabase.
- Needing per-user auth and relational reporting — the same move.
- A Cloudflare terms change that restricts commercial use or claims content rights. None exists today; the trigger is a notice under §4.2.
- Sustained traffic above 100k requests/day, where the free ceiling rather than the terms becomes the binding constraint.

## Sources

- [8 major updates to Cloudflare Observability](https://blog.cloudflare.com/one-observability-platform/) — Cloudflare Blog, 2 October 2026
- [Observability pricing](https://developers.cloudflare.com/observability/pricing/) — Cloudflare docs
- [API deprecations](https://developers.cloudflare.com/fundamentals/api/reference/deprecations/) — Cloudflare docs
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) — last updated 14 September 2026
- [Deno is joining Cloudflare](https://deno.com/blog/cloudflare) — Ryan Dahl, 9 October 2026
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/), [Developer Platform terms](https://www.cloudflare.com/service-specific-terms-developer-platform/)
