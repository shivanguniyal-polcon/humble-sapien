# RARA: Memo 001 and the pacing-gap tracker

*Internal build plan. 29 October 2026. The scope was settled in the RARA interrogation; this note turns it into work. Nothing below is built unless marked.*

## 1. The job

RARA has one job: given a development in AI, say what Indian law does about it, cite the provision, and say plainly where the law does not reach. The tracker is not a second product. It is the clock on that job: it records when a capability appeared, when a regulator responded, and how many days sit between the two.

The first release proves one thing: a cited memo can change a regulator decision. Not that the scanner is clever, not that the corpus is large. One memo, one recipient, one decision.

RARA is not a general chatbot, not a legal-advice engine, and not a compliance certificate. The deterministic layer finds candidates and refuses to invent a gap. A human decides the finding. The memo carries the citations, the reviewer and the date.

## 2. Memo 001

### 2.1 The capability

Zero-shot voice cloning: a model that reproduces a target speaker from a few seconds of reference audio, distributed as open weights. In the memo it is the audio half of a synthetic identity that also uses a face swap or an injected camera stream to pass remote KYC (V-CIP). A voice clone alone is not enough against a competent video liveness check; the memo must say so, or the regulator will dismiss the case on the first read.

The memo is about the class, not a brand. One named release is fixed at citation freeze because the tracker needs an event date and a primary model card. The legal analysis does not turn on which lab shipped it.

### 2.2 The recipient

The Reserve Bank of India, Department of Regulation, KYC division. Address the office, not the incumbent. Copy MeitY on the provenance point, but do not split the ask across two regulators. One recipient owns the decision.

### 2.3 The finding

Tier 2: law exists but does not reach.

The named general provision is s. 66D of the Information Technology Act, 2000 (cheating by personation using a computer resource), read with s. 66C (identity theft) and s. 319 of the Bharatiya Nyaya Sanhita, 2023. Those provisions reach the person who uses a clone to cheat. They do not:

- place a duty on a regulated entity to test its V-CIP system against synthetic injection;
- place a duty on a distributor of open weights to preserve provenance;
- require an audit trail that distinguishes a live customer from an injected stream.

The gap is not "no law". The criminal provision attaches after the fraud. The onboarding control that the fraud defeats is governed by a process direction that does not name the attack. That is the distinction the memo has to make in plain language, without overstating either side.

The distinction inside the control is between liveness and injection. Liveness asks whether a live person is present. Injection asks whether the frame was synthesized before it reached the camera. A virtual camera can satisfy a liveness prompt with a pre-recorded or generated stream. The direction names the first test; it does not name the second. If the citation freeze finds that it does, the memo is withdrawn.

### 2.4 The ask

A circular amending the RBI Master Direction – Know Your Customer, adding three technology-neutral outcomes to the V-CIP paragraph:

1. **Resistance to synthetic injection.** The V-CIP system must be tested against a defined set of synthetic audio and video injection attacks before deployment and after a material model change. The test method and results are retained.
2. **Provenance and audit.** The system records whether the submitted stream carries a provenance signal, and retains the signal, the decision, and the model version that made it.
3. **Incident reporting.** A detected injection attempt is logged and reported to RBI under the existing incident framework, with a named owner.

The memo asks for a 90-day implementation window and a one-year review. It does not ask for a new Act. It does not ask RBI to certify vendors. It asks for an outcome the regulated entity must demonstrate, which is the kind of clause a regulator can draft.

### 2.5 Why this memo first

- The corpus already returns the provision on the example that ships on the page, so the engine and the memo describe the same case.
- RBI is in the first tranche and has the clearest process hook: V-CIP is already a defined onboarding channel.
- The gap is Tier 2, which exercises the harder half of the framework. A Tier 1 memo would not test the "law exists but does not reach" claim.
- A decision is plausible in one cycle: a circular amendment, not legislation.
- The tracker gets its first real event and its first response, so the pacing-gap metric has a worked example rather than a hypothetical.

### 2.6 The citation freeze

No memo text is written until this checklist is complete for every cited provision. The legal lead fills it; the build only renders it.

For each provision:

- [ ] exact quote copied from the official text, not from the corpus summary
- [ ] official URL on the regulator's or India Code's own domain
- [ ] in-force status on the memo date
- [ ] amendment history since enactment
- [ ] the pin cite: section, sub-section, clause or paragraph
- [ ] a stored copy in `public/research/rara/` with its sha256
- [ ] reviewer initials and date

The first freeze covers:

| Instrument | What is being verified |
|---|---|
| Information Technology Act, 2000 | s. 66C and s. 66D: exact text, amendment history, in-force date |
| Bharatiya Nyaya Sanhita, 2023 | s. 319: exact text and commencement |
| RBI Master Direction – Know Your Customer | the current consolidated edition; the V-CIP paragraph numbers, verified, not guessed |
| RBI V-CIP circular, if separately operative | whether its requirements are already consolidated or still stand alone |
| RBI incident-reporting framework | the correct reporting route and the current threshold |

If the V-CIP direction already requires synthetic-injection testing, the memo is withdrawn, not softened. That is the first falsifier.

### 2.7 The memo outline

Two pages when printed. No appendix longer than the memo.

| Section | What it says | Length |
|---|---|---|
| To, From, Date, Subject | office, not a named incumbent | 4 lines |
| Decision requested | one sentence | 2 lines |
| Capability | function, release mode, data, harm | 150 words |
| What the law does | two or three provisions, quoted | 250 words |
| Where it does not reach | Tier 2 reason, element by element | 300 words |
| Recommendation | three clauses, 90 days, review | 250 words |
| Risks | acting and not acting | 120 words |
| Provenance | label, reviewer, date, URLs | table |

### 2.8 What would make the memo wrong

- A provision already requires injection testing in V-CIP, and the memo missed it.
- The Master Direction incorporates a standard that already covers synthetic injection.
- RBI has no jurisdiction over the distributor, and the ask is addressed to the wrong actor.
- The harm is not material because the setting already requires a human agent or a second factor.
- The recommended clause is not implementable without a vendor the regulator cannot certify.

Each is a reason to narrow or withdraw, not to soften the language.

## 3. The citation layer

`src/data/rara.json` is a triage corpus: 16 pillars, summaries, policy lag, remedy. It is not a citation database. A memo cannot quote a summary.

Add a second committed file, `src/data/rara-provisions.json`, keyed to the same statute ids. The triage corpus stays as it is, so `runTriage` and its tests do not change. The memo builder joins the two.

This keeps one writer per file. `scripts/build-rara.py` remains the only writer of `rara.json`; the provision layer is maintained by hand, with a validator and a review log. A second script writing the same corpus is how the duplicate-export bug happened elsewhere in this repository.

### 3.1 The record

```json
{
  "id": "IT-ACT-2000-S66D",
  "statuteId": "IT-ACT-2000-S66C-66D",
  "instrument": "Information Technology Act, 2000",
  "instrumentType": "Act",
  "regulator": "MeitY",
  "jurisdiction": "India",
  "pinCite": "s. 66D",
  "quote": "<exact text from the official source>",
  "sourceUrl": "<official URL>",
  "sourceTitle": "<page title>",
  "retrievedAt": "<ISO date>",
  "inForce": "in-force",
  "effectiveFrom": "<ISO date>",
  "lastAmended": "<ISO date or null>",
  "reviewStatus": "source-checked",
  "reviewer": "<name or null>",
  "reviewedAt": "<ISO date or null>",
  "archive": "public/research/rara/it-act-2000-s66d.txt",
  "sha256": "<hash of the archived text>"
}
```

`inForce` is one of `in-force`, `amended`, `repealed`, `not-yet-in-force`, `unverified`. `reviewStatus` is one of `unreviewed`, `source-checked`, `legally-reviewed`.

### 3.2 The validator

`scripts/check-rara-provisions.mjs` runs in CI and fails on:

1. a `statuteId` that does not exist in `rara.json`;
2. a `quote` shorter than 40 characters, or one that repeats the corpus `summary`;
3. a `sourceUrl` that is not https, or whose host is not on the allowlist;
4. an `inForce` or `reviewStatus` value outside the enum;
5. a `legally-reviewed` record with no reviewer or review date;
6. a duplicate `(statuteId, pinCite)`;
7. an archive file whose sha256 does not match, or whose text does not contain the quote.

The allowlist starts with `indiacode.nic.in`, `rbi.org.in`, `sebi.gov.in`, `irdai.gov.in`, `pfrda.org.in`, `meity.gov.in`, `egazette.gov.in` and `sci.gov.in`. A new host is a code change, reviewed on purpose. This is the difference between a citation layer and a link list.

The validator does not fetch the URLs. A separate `npm run check:rara-sources` fetches and compares the archived text; it is run at the citation freeze and quarterly, not on every test run. A network-dependent test that fails when a regulator site is down teaches people to ignore failures.

### 3.3 The labels do work

- **Unreviewed.** Machine-extracted. Cannot appear in a memo.
- **Source-checked.** Exact quote, official URL, in-force status checked by an analyst. Can appear in a source-checked memo. No legal sign-off.
- **Legally-reviewed.** A named legal lead has confirmed the application, not just the quote. Required before a memo is sent.

`draft` is an internal state, not a publication label. A source-checked memo may be generated deterministically and carry no signatory. A legally-reviewed memo must have its citations checked and a named signer. Otherwise "legally reviewed" is a badge without a process. Memo 001 is hand-written, but it follows the same labels: the prose being human does not make it legally reviewed.

## 4. The memo build

### 4.1 File map

| Path | New or edit | Purpose |
|---|---|---|
| `src/data/rara-provisions.json` | new | the citation layer |
| `src/data/rara-memos/memo-001-voice-vkyc.json` | new | Memo 001, structured |
| `src/lib/rara/provisions.js` | new | load, join, validate, index by statute |
| `src/lib/rara/memo.js` | new | build the memo view model; enforce the citation gate |
| `src/components/RaraMemo.jsx` | new | read-only memo, provenance table, print layout |
| `src/sections/Rara.jsx` | edit | add "Open the memo worksheet" after a triage; label the framework block as a design thesis |
| `src/index.css` | edit | memo typography and print rules |
| `src/App.jsx` | edit | route `#/rara/memo/:id` if the memo is a separate page |
| `scripts/test-rara-memo.mjs` | new | schema, citation gate, rendering invariants |
| `scripts/check-rara-provisions.mjs` | new | validator, CI |
| `scripts/check-rara-sources.mjs` | new | manual source check |
| `package.json` | edit | `test:rara-memo`, `check:rara-provisions`, `check:rara-sources` |

### 4.2 The data flow

```
intake -> runTriage -> candidate provisions
       -> analyst confirms the finding and writes the non-reach reason
       -> join rara-provisions.json
       -> memo view model
       -> citation gate
       -> render, print, copy
```

No model call in `runTriage`, the provision join, the memo builder or the gate. The first memo is hand-written. The tool structures it, checks it and renders it. That is deliberate: the first cited memo has to be legally sound before a generator is allowed near the prose. Memo 002 can be drafted by the tool against the same gate; Memo 001 is the gold example.

### 4.3 The worksheet

After a triage result, the button appears only when at least one provision is `source-checked`. The worksheet asks for the mandatory intake:

- function and intended use;
- deployment and release mode;
- data type and source.

Optional for v1, and shown as optional: autonomy, affected population, scale, distribution channel. The first three are the floor; the rest are recorded because the tracker will need them.

Then the analyst selects the finding:

- RED, AMBER or GREEN;
- Tier 1 or Tier 2;
- for Tier 2, the named general provision and a written reason it does not reach;
- the recipient, the instrument type and the ask.

The memo preview is read-only. It shows the provenance table and one of three labels: `draft`, `source-checked`, `legally-reviewed`. The label cannot be changed by a client-side toggle. It is read from the memo record, and a `legally-reviewed` record must have a reviewer and a date.

### 4.4 The memo record

```json
{
  "id": "memo-001-voice-vkyc",
  "status": "draft",
  "capability": "zero-shot voice cloning against V-CIP",
  "intake": {
    "function": "speaker-conditioned speech synthesis",
    "intendedUse": "remote identity verification",
    "deployment": "hosted or local inference",
    "releaseMode": "open weights",
    "dataType": "reference audio",
    "dataSource": "recorded or scraped speech"
  },
  "finding": {
    "verdict": "AMBER",
    "tier": 2,
    "generalProvisionId": "IT-ACT-2000-S66D",
    "nonReachReason": "<the written reason, element by element>",
    "provisionIds": ["IT-ACT-2000-S66C", "IT-ACT-2000-S66D"],
    "vacuumIds": ["VAC-IND-02"],
    "confidence": "medium"
  },
  "recipient": {
    "office": "Chief General Manager, Department of Regulation, Reserve Bank of India",
    "regulator": "RBI"
  },
  "recommendation": {
    "instrument": "circular",
    "ask": "<three clauses>",
    "implementationDays": 90,
    "reviewMonths": 12
  },
  "provenance": {
    "reviewer": null,
    "reviewedAt": null,
    "lastVerified": "<ISO date>"
  }
}
```

The prose is stored separately, in `src/data/rara-memos/memo-001-voice-vkyc.md`, so a lawyer can edit the memo without touching the data that the gate checks. The renderer joins the two and refuses to display a memo whose prose cites a provision that is not in `finding.provisionIds`.

### 4.5 Print

A4, two pages, 11pt, 18mm margins, no site navigation. URLs print in full, not behind link text. The provenance table prints on the second page. A memo that cannot be printed and handed over is not a memo; it is a web page.

### 4.6 The gate

`buildMemo` returns `{ memo, errors }`, not a memo with a warning. A memo fails the gate if:

- any cited provision is `unreviewed`;
- any cited provision is `repealed` or `not-yet-in-force` without an explicit note;
- a Tier 2 finding has no general provision or no non-reach reason;
- a `legally-reviewed` memo has no reviewer or review date;
- the recipient is a person rather than an office;
- the memo has no source URL for a legal claim.

The UI renders the errors, not the memo, when the gate fails. This is the same refusal rule as the scanner: it must not invent a gap, and it must not invent a citation.

### 4.7 Order and effort

| Step | Days | Output |
|---|---|---|
| Citation freeze | 2 | verified provisions; archive files; reviewer sign-off |
| Provision schema and validator | 1 | `rara-provisions.json`, validator, tests |
| Memo schema, builder, print layout | 2 | `memo.js`, `RaraMemo.jsx`, print CSS |
| Memo 001 content and internal review | 2 | complete draft |
| Legal review and revisions | 2 | `legally-reviewed` memo |
| Worksheet and route | 2 | intake form, gate, `#/rara/memo/...` |
| Tests, build, accessibility | 1 | passing checks; printed proof |

Ten working days, with legal review on the critical path. The build can start on the schema while the freeze runs. No memo text before the freeze.

## 5. The tracker

"Real-time" here means six-hourly, not streaming. Legal and release events are daily; the point is to close the gap between a capability and a rule, not to watch a feed.

### 5.1 The unit

A **development** is a dated, primary-source event that changes what AI can do or how it is distributed. Not a think-piece, not a rumour, not a paper with no artifact, not a product marketing page with no release.

Types: `model-release`, `capability-demo`, `open-weights`, `incident`, `procurement`, `standard`, `court`, `regulator`.

Each development carries the mandatory intake fields. If the fields are missing, the development is `unassessed`, not a finding.

### 5.2 Tables

Added to the existing monitor D1, not a separate database. The monitor already has the cron, the R2 bucket, the fetch runs and the source health pattern.

```sql
CREATE TABLE developments (
  id TEXT PRIMARY KEY,
  event_date TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  capability TEXT NOT NULL,
  function TEXT,
  release_mode TEXT,
  data_type TEXT,
  actor TEXT,
  jurisdiction TEXT,
  evidence_grade TEXT NOT NULL, -- primary | secondary
  status TEXT NOT NULL           -- new | assessed | published | rejected
);

CREATE TABLE assessments (
  development_id TEXT PRIMARY KEY,
  assessed_at TEXT NOT NULL,
  analyst TEXT NOT NULL,
  verdict TEXT NOT NULL,         -- RED | AMBER | GREEN | UNASSESSED
  tier INTEGER,                  -- 1 | 2 | null
  general_provision_id TEXT,
  non_reach_reason TEXT,
  provision_ids TEXT NOT NULL,   -- JSON array
  vacuum_ids TEXT NOT NULL,      -- JSON array
  confidence TEXT NOT NULL,      -- high | medium | low
  memo_id TEXT
);

CREATE TABLE responses (
  id TEXT PRIMARY KEY,
  development_id TEXT NOT NULL,
  regulator TEXT NOT NULL,
  instrument_type TEXT NOT NULL, -- act | rule | regulation | master-direction | circular | guidance | press-release | court-order
  instrument_id TEXT,
  published_at TEXT NOT NULL,
  effective_at TEXT,
  binding INTEGER NOT NULL,      -- 1 | 0
  source_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verified_at TEXT NOT NULL
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  cadence TEXT NOT NULL,
  parser TEXT NOT NULL,
  last_checked TEXT,
  last_ok TEXT,
  last_error TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);
```

### 5.3 The pacing gap

Two numbers, not one:

- `first_response_days`: the earliest official response after the event. A press release, a speech, a committee report or a consultation paper counts here.
- `binding_closure_days`: the first binding instrument in force that names the capability or its control. A press release does not count.

If there is no response, the development is `open` and `days_open` is today minus the event date. Every aggregate shows `n`. No average delay without the count behind it.

### 5.4 What counts as closure

Only a binding instrument in force: an Act, a rule, a regulation, a Master Direction or a circular with an effective date. Guidance, a draft bill, a consultation paper, a speech and a press release are responses, not closure. This is the rule that keeps the tracker from congratulating itself.

Coverage status is one of:

- `vacuum`: no provision at all;
- `non-reach`: a named general provision, with a written reason it does not reach;
- `covered`: a binding instrument names the capability or its control;
- `partial`: guidance or a press release only.

### 5.5 The pipeline

1. **Fetch.** The existing monitor cron runs every six hours. The source registry is extended with the first tranche: RBI, SEBI, IRDAI, PFRDA, MeitY, India Code, the Gazette, CERT-In, and the official lab release pages and model cards. Store the raw item in R2 and the hash in D1. Dedupe by URL and hash. Watching a regulator's feed is not the same as adding its corpus: the corpus stays RBI-only until Memo 001 is reviewed.
2. **Classify.** Source type, event date, capability. Deterministic rules. If the event date is ambiguous, queue it for a human; do not guess.
3. **Assess.** The analyst fills the intake, runs triage, confirms or rejects the candidate provisions, and writes the non-reach reason for Tier 2.
4. **Link.** Match official responses by regulator, date, provision and title. A human confirms the link. No automatic closure.
5. **Publish.** A static snapshot in `src/data/rara-tracker.json` for the site, plus the API for fresh reads. The page shows `last checked` and `next check`.
6. **Alert.** A daily internal digest of new `unassessed` items with a primary source and a capability. No alert for a press release alone.

### 5.6 Source rules

- Primary only for a legal claim: the regulator's own site, India Code, the Gazette, a court, an official model card or release note.
- Secondary sources are for discovery, never for a citation.
- No scraping behind a login or against terms. No X or LinkedIn firehose.
- Every source has an owner, a cadence and a health check. A dead source is disabled and shown as disabled, not silently treated as "no news".
- Store the source text and hash. A live URL that changes is not a citation.

### 5.7 The page

A section on `#/rara`, or `#/rara/tracker` if the memo page takes the main route.

Top: four counters — open gaps, non-reach, covered, median binding closure days with `n`.

Then a timeline: development → assessment → memo → response. Color by coverage status, not by severity alone.

Then a table: event date, development, regulator, status, days open, citation. Filter by regulator, domain, status and source type. Fifty rows, pagination, no infinite scroll.

"What changed this week" is a list of rows, not a generated paragraph.

### 5.8 Order and effort

| Step | Days | Output |
|---|---|---|
| D1 migration and source registry | 2 | four tables; ten sources; health check |
| Fetch, dedupe, classify | 2 | six-hourly run; raw items in R2 |
| Assessment queue and finding link | 2 | human queue; no auto-publish |
| Tracker page and pacing gap | 2 | counters, timeline, table |
| Response linker and closure rule | 2 | binding vs guidance; closure tests |
| Seed ten developments | 1 | the first real snapshot |
| Tests and build | 1 | `test:rara-tracker`, `build` |

Twelve working days. It starts after Memo 001 is sent, because Memo 001 is the first development in the tracker and the first proof that the record has a use.

## 6. Evaluation

The expert-labelled set is built before the corpus widens. Otherwise every new regulator entry is an unmeasured claim.

### 6.1 The set

Thirty capabilities, five domains, six each. Domains: synthetic identity and fraud, data and training, financial AI, safety and autonomy, speech and political persuasion.

Each record has the mandatory intake, a gold verdict, gold provision ids, a gold tier, a gold non-reach reason for Tier 2, and a label `clear` or `borderline`. Two independent labellers; the legal lead adjudicates.

### 6.2 The metrics

- **Citation precision.** Cited provisions that exist, are in force, and actually apply, over all cited provisions. Gate: 1.0 for any legal claim. One fabricated citation fails the release.
- **Verdict precision on RED.** True RED over predicted RED. Target: at least 0.9.
- **Tier accuracy.** Tier 1 versus Tier 2 versus covered. Target: at least 0.85.
- **Recall.** Reported, not gated in v1. A miss is visible; it is not hidden by a high precision number.
- **Abstention.** When confidence is low, the system must return `unassessed` rather than a guess. Target: at least 0.8 of low-confidence cases abstain.

A false legal claim is a citation that does not exist, is repealed, is misquoted, or is applied outside its text. A wrong verdict is a miss, not a fabricated citation. Report them separately. The first is a release blocker; the second is a calibration problem.

### 6.3 The runner

`src/data/rara-eval.json` is committed. `scripts/test-rara-eval.mjs` runs the same `runTriage` and memo functions the UI runs. No model call. The test prints the confusion matrix and the citation failures, and exits non-zero on a fabricated citation or a missed gate.

The first run will be poor. That is the point of running it before the corpus grows.

## 7. The operating model

**Legal lead.** Named in the repository and on the page. Signs every `legally-reviewed` memo. Forty-eight-hour review SLA. Chairs the quarterly review.

**External counsel.** Spot-checks three memos or ten per cent per quarter, whichever is greater. Named only with consent.

**Analyst.** Source-checks provisions, writes the intake, runs triage, drafts the memo, maintains the tracker queue.

**Engineer.** Owns the corpus, the validator, the tracker and the tests.

**Quarterly review.** Re-check the in-force status and amendment history of every cited provision. Publish a dated changelog. Expire any memo whose provision has changed. A published memo gets an erratum, not a silent edit.

**Sending.** The tool never sends. A human sends from an official address after the legal lead signs. The memo carries the recipient's office, not a personal name.

## 8. Acceptance

### Memo 001

- [ ] Every citation has an exact quote, official URL, in-force date, reviewer and archive hash.
- [ ] The finding is Tier 2, with a named general provision and a written non-reach reason.
- [ ] The memo is two pages when printed, with no clipped URLs.
- [ ] The provenance block shows `legally-reviewed`, the reviewer and the date.
- [ ] The RARA framework block is labelled a design thesis, not a claim that RARA AI is built.
- [ ] `npm run test:rara` and `npm run test:rara-memo` pass.
- [ ] `npm run build` passes.
- [ ] A named legal lead has signed. If not, the memo is `source-checked` and is not sent.
- [ ] The recipient's office has acknowledged receipt, with a follow-up date.

The release gate is receipt and acknowledgement, not a decision. A decision is not fully in our control. The 90-day success gate is a documented step by the regulator: a request for follow-up, a consultation, a circular, or a written response. If none arrives, the memo did not change a decision, and the tracker says so.

### Tracker

- [ ] Ten developments seeded from primary sources, each with an event date and a source hash.
- [ ] Three responses linked, at least one binding and one guidance, to prove the distinction.
- [ ] Pacing gap computed and displayed with `n`.
- [ ] A dead source shows as disabled, not as "no news".
- [ ] The page works from the static snapshot with the API offline.

### Not in the first release

- No widening to SEBI, IRDAI or PFRDA until Memo 001 is reviewed. The current combined RBI/SEBI corpus entry is split at that point, not before.
- No model-generated verdict.
- No public submission of capabilities.
- No SMS or email alerts beyond the internal digest.
- No "RARA AI" product claim. The page keeps the design-thesis label.

## 9. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| The corpus is a summary | A memo that quotes a summary is not cited | Separate provision layer; quote gate; archive hash |
| Lexical triage overstates | BM25 is not legal analysis | Candidate-only output; human confirms; confidence and abstention |
| Legal review bottleneck | The memo stalls and the tracker waits | One named lead; 48-hour SLA; freeze the scope to one memo |
| The regulator is not interested | The first proof fails | Pick a process hook and a specific ask; pre-brief the division; keep the memo to two pages |
| The tracker becomes a news feed | It loses the pacing gap | Unit is a development with a primary source; no think-pieces; closure is binding-only |
| False closure | A press release counted as a rule | Effective date required; `binding = 1`; human verification |
| Source drift | Dead links and changed pages | Archive, hash, quarterly re-check, source health |
| Scope creep | Sixteen pillars, four regulators, thirty features | One memo, one capability, one recipient, one decision |

## 10. Build order

| Week | Work | Output |
|---|---|---|
| 1 | Citation freeze; provision schema and validator; memo schema and print layout | Verified citations; `rara-provisions.json`; memo renderer |
| 2 | Memo 001 content; legal review; worksheet and route; tests and build | Signed Memo 001, sent to RBI |
| 3 | Tracker schema; source registry; fetch and dedupe | Six-hourly development feed |
| 4 | Assessment queue; finding link; tracker page and pacing gap | First ten developments, first gap table |
| 5 | Response linker; closure rule; evaluation set; tracker tests | Binding vs guidance proved; 30 labelled capabilities |
| 6 | Buffer; accessibility; print proof; quarterly review template | Release candidate |

The memo is first because it is the proof. The tracker is second because it is the clock. Neither is useful without the other: a memo with no tracker is a one-off letter, and a tracker with no memo is a news page.

## 11. The first three actions

1. **Name the legal lead and freeze the citations.** Without a named reviewer, the memo cannot pass `legally-reviewed`, and the tracker has no standard to inherit.
2. **Write the provision layer, not the memo.** The corpus has summaries; the memo needs exact text. The schema and validator are one day and they prevent the most expensive failure.
3. **Draft Memo 001 against the freeze, then send it before building the tracker UI.** The first proof is a sent memo, not a dashboard. The dashboard starts with that memo as its first row.
