# Every Gram Panchayat: the scope for a national passbook

*Internal planning note. Pilot numbers are measured from the three-GP capture on 25 October 2026. Counts are from the 26 October 2026 Local Government Directory snapshot and the 31 State scheme lists read on 30 October 2026. Nothing in sections 6 to 9 is built.*

## 1. The short answer

"Every GP in India" is not one product. It is three, and they differ in cost by four orders of magnitude.

| Layer | What the citizen gets | Requests for all of India | Time at 5 requests a second |
| --- | --- | --- | --- |
| L1 Headline | Opening balance, receipts, payments, closing balance for XV Finance Commission funds | 708 | One night |
| L2 Identity | Sarpanch, secretary, office, completed works, vendor counts | 1,278,275 | Three days |
| L3 Detail | Every scheme's monthly receipts and payments | 15,762,335 | 39 days |

L1 covers all 255,655 Gram Panchayats because the XVFC report is issued per district, not per GP. L2 and L3 are per GP. The full pass is 17.04 million requests, about 64 GB of raw responses, 1.6 GB of published records, and roughly 12 days at 16 requests a second. The binding constraint is not storage or money. It is permission and politeness.

Two facts make this tractable:

1. **The join is exact.** The eGramSwaraj GP code is the LGD local body code. All three pilot codes (23009, 23019, 23027) name the same panchayats in the LGD snapshot, and Dehradun's 409 distinct LGD local bodies match the 409 rows in the district XVFC report. No fuzzy name matching is needed, which was the largest unquantified risk in the current roadmap.
2. **92% of the request load is a probe that mostly returns zeros.** The pilot made 51 scheme requests per GP; three carried money. Remembering which schemes a GP actually uses turns the monthly refresh from 39 days into 2.4 days.

## 2. What "every GP" resolves to

From `gp_mapping.26Oct2026.csv`:

- 255,655 distinct Gram Panchayat codes across 31 States and Union Territories.
- 708 districts hold at least one GP. The remaining districts in the 735-district directory have no GP mapping row.
- 694,614 village-to-local-body rows. 100 GP codes appear under two districts, so the row sum is 255,755.
- GPs per district: median 286, 95th percentile 980, maximum 1,810. 41 districts have 50 or fewer; 35 have more than 1,000.
- The largest blocks of work are Uttar Pradesh (57,694 GPs), Maharashtra (28,090), Madhya Pradesh (23,011), Gujarat (14,607) and Rajasthan (11,344). These five are 52% of the national GP count.

Scheme lists are per State and were read directly from `schemeListByState.do`. They range from 46 to 148, with a GP-weighted average of 61.7. The floor of 46 recurs in ten States, which suggests a common national set plus State additions.

| State | GPs | Schemes | First-pass requests | Share |
| --- | --- | --- | --- | --- |
| Uttar Pradesh | 57,694 | 59 | 3,692,416 | 21.7% |
| Madhya Pradesh | 23,011 | 75 | 1,840,880 | 10.8% |
| Maharashtra | 28,090 | 48 | 1,488,770 | 8.7% |
| Tamil Nadu | 12,571 | 98 | 1,294,813 | 7.6% |
| Chhattisgarh | 11,689 | 82 | 1,016,943 | 6.0% |
| Odisha | 6,733 | 113 | 794,494 | 4.7% |
| Punjab | 13,236 | 55 | 794,160 | 4.7% |
| Telangana | 12,760 | 57 | 791,120 | 4.6% |
| Andhra Pradesh | 13,327 | 52 | 759,639 | 4.5% |
| Gujarat | 14,607 | 46 | 744,957 | 4.4% |
| Rajasthan | 11,344 | 52 | 646,608 | 3.8% |
| Remaining 20 States and UTs | 50,593 | 46–148 | 3,175,810 | 18.6% |
| **Total, per GP** | **255,655** | **61.7 weighted** | **17,040,610** | **100%** |

Add the 708 district-ledger requests and the national pass is 17,041,318. The top five States are 55% of the load and 52% of the GPs. A launch that covers them reaches just over half the country for just over half the work.

## 3. What the pilot measured

Three GPs, one district, 48 seconds, 171 requests, 23 stored source responses.

| Measure | Value |
| --- | --- |
| Requests per GP | 56 |
| of which scheme probes | 51 |
| of which carried money | 3 (5.9%) |
| Published record | 6,329 bytes (5,701–7,270) |
| Raw responses | 187 KB per GP (140–226 KB) |
| Sources cited per GP | 7 (profile, vendors, 2 plan API, 3 monthly) |
| XVFC reconciliation | Exact on 3 of 3 |
| Completed-work report | Refused 3 of 3; plan API fallback worked 3 of 3 |

The 56 requests are: one profile page, one vendor list, 51 scheme probes, one completed-work report, and two plan-API calls when that report refuses. A State with 46 schemes costs 51 requests per GP; Tamil Nadu's 148 costs 153.

What the pilot does not yet prove: that the profile and works pages behave the same way in other States, that the GP code equals the LGD code outside Uttarakhand, and that the plan API covers GPs whose work report is refused. Those are the first three gates in section 8.

## 4. The three maps

### L1: the district ledger

`recExpVpNew.do` takes a State, a district and a scheme, and returns one row per GP. For Dehradun and XVFC it returned 409 rows in 204 KB, with opening balance, direct and automatic receipts, payments and closing balance, split into untied and tied components.

It answers for XVFC only. Probes with scheme codes 2813 and 3109 returned an empty array for the same district, so it cannot be used to bulk-collect other schemes.

National cost: 708 requests, about 127 MB, one night at 5 requests a second. That is the entire country's main untied grant, GP by GP. Each earlier year is another 708 requests and about 127 MB, which is cheap enough to carry three years of trend.

This is the layer to ship first. For most GPs, XVFC is the largest discretionary money they hold, and it is the number a resident asks about.

### L2: identity and works

Per GP: profile page (58 KB, names the sarpanch and secretary, office address, pin), vendor list (8–26 KB, counts only), completed works (the report is refused often; the plan API and physical-progress API answered in every pilot case).

National cost: 766,965 requests if the work report answers, 1.28 million if it always falls back. About 45 GB of raw response, because the plan API returns every approved activity, not just completed ones.

The works data is the most human part of the record and the heaviest per useful row. Keep it, but do not store the raw plan dumps for the whole country: hash them, keep a 1% sample, and store only the parsed rows.

### L3: scheme detail

`getSchemeWiseMonthly.do` is strictly per GP. Passing `localBodyCode=0` returns twelve zero rows, not a district roll-up. There is no GP-level scheme list page to read first: the profile page does not mention schemes.

So the only way to learn which schemes a GP uses is to ask all of them, once. After that, the answer is cached in `gp_schemes` and the monthly refresh asks only those. The pilot's GPs used three schemes each; four is a safe planning number for the refresh.

National cost: 15.76 million requests for the first pass, 19 GB. Monthly refresh: 1.02 million requests, 2.4 days at 5 a second, 7 nights.

### The state summary file

`FileRedirect.jsp?FD=SummaryReport2025-2026&name=StateSummaryReport.html` is a 143 KB HTML file with 85 table rows for Uttarakhand: district totals and a State total, no GP rows. It is cheap and useful for a national landing page, but it cannot substitute for L1.

## 5. The arithmetic

### First pass

| Tier | Requests | Raw bytes | Days at 5/s | Days at 16/s |
| --- | --- | --- | --- | --- |
| L1 | 708 | 127 MB | 0.002 | 0.001 |
| L2 | 1,278,275 | 45 GB | 3.0 | 0.9 |
| L3 | 15,762,335 | 19 GB | 36.5 | 11.4 |
| Total | 17,041,318 | 64 GB | 39.5 | 12.3 |

At 16 a second the whole pass is 12.3 days, or 37 nights of eight hours. 16 requests a second needs about five concurrent connections at the latencies the pilot saw (0.28 s average). 5 a second is the rate this project should defend in public without permission; 16 needs a written answer from the Ministry, and 30 is not worth asking for.

### Steady state

| Job | Cadence | Requests per run | Days at 5/s |
| --- | --- | --- | --- |
| L1 district ledger | Monthly | 708 | 0.002 |
| L3 active schemes (4 per GP) | Monthly | 1,022,620 | 2.4 |
| L2 profile and vendors | Quarterly | 511,310 | 1.2 |
| L3 full rescan, one twelfth of districts | Monthly | 1,420,051 | 3.3 |
| **Total** | | **2.95 million a month** | **6.9** |

That is the honest steady state: about seven nights a month of collection, not a permanent crawler. A monthly full re-capture at a polite rate is impossible (39 days), which is why `gp_schemes` is not an optimisation but a requirement.

### Storage

| Store | Contents | Size | Cost |
| --- | --- | --- | --- |
| D1, one database | 255,655 payloads, search index, active-scheme map | 2.1 GB | $0, inside the 5 GB included |
| R2 | Raw responses, sampled plus every failure | 0.6 GB | $0 |
| R2, optional | Every raw response | 64 GB | $0.81 a month |
| Git | Nothing national; the pilot fixture stays | 28 KB | $0 |

Neither D1 cap is close: 2.1 GB against 10 GB, and 6.3 KB against 2 MB. The record is 6.3 KB at the median; guard at 512 KB and spill works to a second table if a GP ever exceeds it. A GP with 1,810 peers in its district has nothing to do with its own row size.

Serving cost at 5 million passbook views a month: Workers 5 million requests inside the 10 million included, D1 about 10 million rows read inside the 25 billion included, egress free. The bill is the $5 Workers Paid plan and $0.81 of R2. At 50 million views it is about $18.

## 6. Architecture

### Capture

One Node process, not a browser, not a Worker, for the first pass. Four connections, one token bucket, a cursor per district in D1, resume by run id.

- User agent names the project and a contact page. No pretending to be a citizen's browser.
- 45-second timeout, three retries with exponential backoff, then a stored failure and the next GP.
- Stop the entire run on a 403 or three consecutive 429s. Do not rotate addresses, do not solve a CAPTCHA, do not proxy.
- Night window 22:00–06:00 IST.
- Write a per-district capture log: requests, ok, failed, duration, first failure URL.
- Hash every response. Store raw bytes for a 1% sample and every failure; the rest are reproducible from the hash and the URL.

The steady-state refresh can move to a Queue and a Worker consumer if the Ministry is comfortable with Cloudflare's addresses. Do not make that the first move: a stable, contactable address is worth more than the operational convenience.

### Data

Schema v2, replacing the current four-table shape:

```sql
passbooks(code INTEGER PRIMARY KEY, state_id, district_id, block_id, village,
          name, name_hi, tier TEXT, year TEXT, payload TEXT,
          data_hash TEXT, captured_at TEXT, bytes INTEGER);
gp_schemes(gp_code INTEGER, scheme_code INTEGER, last_seen TEXT,
           PRIMARY KEY (gp_code, scheme_code));
gp_names(code INTEGER PRIMARY KEY, name_norm TEXT, state_id, district_id);
districts(id INTEGER PRIMARY KEY, state_id, name, gps, captured, last_capture);
capture_runs(id, district_id, started_at, finished_at, requests, ok, failed, note);
```

Sources stay inside `payload` as JSON. One row per GP keeps a passbook read at one row, and rows read are what D1 bills.

Search does not need a new service: 255,655 rows with an index on `name_norm` and a State filter is a scan of a few hundred rows. A prefix search over the whole country costs 255,655 rows read, which is $0.00026. Cache it for an hour.

### Names

The LGD snapshot is English-only, and the pilot's two Hindi names were typed by hand. A national Hindi-first tool cannot run on three hand-typed names. Two sources exist: the State's own GP name where it publishes one, and transliteration. Take the State name where it exists, transliterate the rest, and put every name through a human review before it appears in a shared flyer. Budget five days for the first pass and treat it as a launch blocker for the Hindi interface, not as polish.

Ingest goes through a Worker with a token, using bound statements in batches of 50. Do not build 255,655 SQL statements and hope `wrangler d1 execute` finishes: the 100 KB statement cap makes it slow and fragile. Bound parameters are not bound by that cap.

### API

Keep the existing routes. Add:

- `GET /v1/passbook?gp=` returns `tier` (`headline`, `identity`, `detail`), `capturedAt`, `year` and an `ETag` from `data_hash`.
- `GET /v1/search?q=&state=` returns up to 20 matches with GP code and district.
- `GET /v1/district?district=` returns the GP count, captured count, last capture and the district total.
- `GET /v1/state?state=` the same at State level.
- `GET /v1/coverage` national counters, public, for the coverage page.

Cache `public, max-age=3600, s-maxage=86400` on passbooks, `max-age=300` on coverage. CORS stays open; there is still nothing to steal.

### Page

The picker already walks village to GP and calls `/v1/passbook?gp=`. Add three states: `headline` (the XVFC card only, with a line saying the detailed ledger is being fetched), `identity`, `detail`. The stale badge reads `capturedAt`, and past 45 days says so.

The flyer and the questions work off whatever tier is present. A headline-only record still answers "how much came in, how much went out, what is left", which is the first question in the Gram Sabha.

## 7. Legal and permission

Checked on 30 October 2026:

- `robots.txt` returns 404. There is no robots file.
- The homepage's Privacy Policy, Terms & Conditions and Cookie Policy links are all `#`. No terms are published.
- The reports used here are public: no login, no CAPTCHA, no payment. They are the pages the portal offers citizens.

Absence of a robots file is not permission, and a missing terms page is not a licence. The safe reading is that this is a permission question, not a settled right. The plan should treat it that way.

What to ask the Ministry of Panchayati Raj, through the eGramSwaraj helpdesk and NIC:

1. Whether non-commercial republication of GP-level figures, with attribution and a link to the source, is permitted.
2. Whether a bulk export or a data-sharing arrangement exists for research and civic use. If it does, it replaces most of section 5.
3. A named contact for corrections and removal.

Until there is an answer: L1 only, 5 requests a second, nights, identified user agent, no raw bulk redistribution, and a published removal route. Publish the method page with the capture date and the hash, so any figure can be traced to a source response.

Never: solve a CAPTCHA, rotate addresses, resell raw responses, publish vendor names, mobile numbers or email addresses. The pilot already collects vendor counts only, and that should stay true at national scale.

If the Ministry says stop, stop and remove. The dataset is not worth a fight with the body that publishes it.

## 8. Gates

Each gate is a stop, not a warning.

| Gate | Test | Pass |
| --- | --- | --- |
| G1 Join | Every captured GP resolves to an LGD local body code; 100 duplicate codes assigned one canonical district | 100%, duplicates listed |
| G2 Parse | 500 random GPs across 10 States and 5 scheme-count bands | 97% complete record |
| G3 Reconcile | Closing equals opening plus receipts minus payments | 98% within ₹1, rest carry the delta |
| G4 Size | p99 payload | 512 KB or less |
| G5 Privacy | Automated scan of every stored payload for mobile, email, vendor name fields | Zero |
| G6 Politeness | Failed requests; 403s | Under 1%; zero unresolved 403 |
| G7 Freshness | GPs captured in the last 45 days | 90% |
| G8 Cost | Monthly bill at 100,000 views a day | $25 or less |

Kill conditions: a CAPTCHA or WAF challenge appears; a written objection arrives; parse success stays under 90% after two parser revisions; D1 passes 5 GB before sharding is designed.

G2 is the gate that decides whether the national product is honest. The pilot's three GPs are one block in one district; the failure modes in Rajasthan or West Bengal will not look like Doiwala's.

## 9. Build plan

| Phase | Work | Days | Gate |
| --- | --- | --- | --- |
| 0 | Target list: 255,655 GPs, 708 districts, 31 scheme lists, into D1; 93-GP canary (3 per State) | 3 | G1, G2 on the canary |
| 1 | L1 capture in every district; district and State summary routes; coverage page; headline tier in the page | 5 | 95% of GPs have an XVFC row; G3 |
| 2 | L2 capture; profile and works tables; name search; freshness fields and stale badge; Hindi names from State sources, transliteration and review | 8 | G2 on 500 GPs; G4, G5 |
| 3 | Queue-driven L3 capture on demand; `gp_schemes` memory; monthly refresh; full rescan scheduler | 8 | On-demand p95 under 20 seconds; G6, G7 |
| 4 | Method and coverage pages, removal route, permission pack, cost check | 4 | G8, sign-off |

Twenty-eight working days, one engineer, assuming the pilot parser survives contact with other States. Add a week of contingency for the work report and the plan API behaving differently outside Uttarakhand.

Order matters. L1 is a week and it makes every GP answerable. Do not start L3 before L1 ships; a country with detailed ledgers for three GPs and nothing for 255,652 is the current state, and it is the wrong shape.

### Before national: ten districts

Run ten districts across five States — one large (Maharashtra or UP), one small, one with a 100+ scheme list (Odisha or Tamil Nadu), one hill State, one with poor connectivity — and measure parse success, work-report refusal rate, plan API coverage, and payload size. That is 3,000 to 15,000 GPs and about two nights. It is cheaper than discovering in Phase 3 that a third of the country needs a different parser.

## 10. What changes in this repo

| File | Change |
| --- | --- |
| `scripts/collect-passbook.mjs` | Generalise to district and State targets, tier flags, resume, `gp_schemes` memory, hash-only raw by default; the current three-GP constants become fixtures |
| `workers/places/schema.sql` | Schema v2 in section 6; keep the directory tables as they are |
| `workers/places/worker.js` | Search, district, State and coverage routes; tier and freshness in the passbook response |
| `scripts/seed-places.mjs` | Batch upsert through the ingest Worker; the pilot fixture still seeds locally |
| `src/lib/places.js` | Search and coverage calls |
| `src/sections/VillagePassbook.jsx` | Tier states, stale badge, headline-only card |
| `src/data/passbook/index.json` | Stays as the three-GP fixture and the parser's golden file |

The directory (649,708 village names, 708 districts with GPs) already ships and does not change.

## 11. What not to build

- A 1.6 GB bundle of national passbooks. The page asks the API for one GP; keep it that way.
- Live scraping on page view. A cold GP is 56 upstream requests; a page load cannot wait for that, and a reader cannot cause it.
- 255,655 pre-rendered pages or a subdomain per panchayat.
- A ranking or score for GPs. It would become the thing the tool is known for, and it would be wrong.
- Vendor-level payments. They are not published; that is an RTI question, not a scraping one.
- A mobile app, an account, or a paywall on the public record.
- Scraping State portals with different terms. eGramSwaraj is national and public; the State accounting systems are not.

## 12. Money

The public tool stays free: no account, no card, no watermark, no ads. What a national dataset changes is who pays for the maintenance and what an institution can buy.

- The national coverage page is the sales asset. "This many GPs, this fresh, this traceable" is the sentence a State department or a CSR fund can defend internally.
- A State edition sells the State's own slices, its scheme names and its helpline, at the published Tier 2 price. The public answer stays identical.
- The API sells district and GP summaries to a grievance desk or a research group, metered, at the published rate card.
- Coverage cost is about $6 a month at 5 million views. The cost that matters is the 28 days of engineering and the permission work, not infrastructure.

Do not price per GP. A per-GP price invites a comparison with the Ministry's free portal and makes the public promise look like a trial.

## 13. What would sink it

1. **A CAPTCHA.** The portal is already slow and citizen-facing; a challenge layer would end bulk collection and leave only a permissioned feed. This is the most likely single failure.
2. **A written objection.** Handled by stopping, not arguing.
3. **A portal redesign.** The parser is HTML-shape-specific. Golden fixtures per source and a canary run before every release are the mitigation, not a rewrite.
4. **The completed-work report staying refused.** The plan API carries the works, but without the funding scheme. The record would say "scheme not stated", which is honest and weaker.
5. **GP code churn.** Mergers and renumbering happen. The LGD snapshot is dated; the passbook should store the code it captured and the code in the current snapshot, and say when they differ.
6. **The 100 duplicate codes.** Small, but it will produce at least one wrong district pairing if it is not handled explicitly.

## 14. Decisions needed

1. Ask the Ministry now, in writing, or ship L1 first and ask in parallel? Recommendation: ask now, ship L1 in the same week, stop if the answer is no.
2. Is the public promise "every GP, headline" or "every GP, full ledger"? Recommendation: headline for all, full ledger on demand and for the districts people actually open.
3. Does the first national pass cover 31 States or the top five? Recommendation: all 31 for L1 (708 requests is nothing), top ten districts for L2 and L3 before the national run.
4. Who signs off on the removal route and the privacy scan? Recommendation: the same person who signs the method page, before Phase 2 ships.

## Sources

- Pilot capture: `src/data/passbook/index.json`, 25 October 2026, 171 requests, three GPs.
- GP counts, districts and duplicate codes: `scripts/.cache/lgd/gp_mapping.26Oct2026.csv`, 26 October 2026 snapshot.
- Scheme counts: `https://egramswaraj.gov.in/schemeListByState.do?stateId=<1..38>`, read 30 October 2026, 31 States returned a list.
- District ledger: `https://egramswaraj.gov.in/recExpVpNew.do?finYear=2025-2026&schemeCode=3287&stateCode=5&districtCode=49`, 409 rows, 204,157 bytes, 30 October 2026. Scheme codes 2813 and 3109 returned `[]` for the same district.
- Scheme detail: `https://egramswaraj.gov.in/getSchemeWiseMonthly.do`, twelve rows per GP; `localBodyCode=0` returns zeros, not a district roll-up, 30 October 2026.
- State summary: `https://egramswaraj.gov.in/FileRedirect.jsp?FD=SummaryReport2025-2026&name=StateSummaryReport.html`, 142,827 bytes, 85 table rows, district totals only.
- Robots and terms: `https://egramswaraj.gov.in/robots.txt` returns 404; homepage policy links are `#`, 30 October 2026.
- Platform limits: Cloudflare D1 limits and pricing (10 GB database, 5 GB included storage, 2 MB row, 25 billion rows read and 50 million rows written a month included on Workers Paid); R2 pricing (10 GB-month free, $0.015/GB-month, egress free); Workers Paid $5 a month with 10 million requests included. Read 30 October 2026.
