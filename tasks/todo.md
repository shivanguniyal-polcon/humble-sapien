# Task List: THS product coherence — 22 October 2026

Plan: [`tasks/plan.md`](plan.md) · Assessment: [`private/2026-10-22-product-gap-assessment.md`](../private/2026-10-22-product-gap-assessment.md)

Verification commands used throughout: `npm test` (11 suites), `npm run build`, `npm run lint`.

---

## Task 1: Replace the keyword obligation grep with the real classifier

**Description:** `src/lib/simplify.js:40` filters the citizen obligation list with a regex on the source text. `src/lib/legal/obligations.js` exists to replace exactly that — its header records that the naive version "could not tell them apart (60.5% duty precision) even though it found 99.5% of binding statements" — and it has no importer anywhere in the repository. Wire it in and surface the type to the reader.

**Acceptance criteria:**
- [x] The citizen obligation list is produced by `classifyObligation` from `obligations.js`, not by a regex on the source string.
- [x] Each obligation carries its type (action / constitutive / entitlement / meta / definition / method / illustration) through `simplify()` and into the citizen panel.
- [x] A sentence flagged `fragment` (span cut mid-clause) is visibly marked as such rather than presented as a standalone duty.
- [x] The regex `/must|required to|is liable to|shall/` no longer appears in `src/lib/simplify.js`.

**Verification:**
- [x] Tests pass: `node scripts/test-simplifier.mjs` — 7 new checks (four types, the fragment flag, the bearer regression, the copy export)
- [x] Build succeeds: `npm run build`
- [x] Manual check: the built-in sample shows `ACTION OBLIGATION OR CONSTRAINT` and `ELIGIBILITY OR PERMISSION`; the proviso is part of the first sentence, not a separate duty (checked in the browser at `#/tools/simplifier`).

**Done 22 Oct 2026.** One entry per source sentence, so a sentence split into parts is not listed three times; `split` marks the ones that were.

**Dependencies:** None

**Files likely touched:**
- `src/lib/simplify.js`
- `src/sections/Simplifier.jsx`
- `scripts/test-simplifier.mjs`

**Estimated scope:** Small: 3 files

---

## Task 2: Wire the applicability filter into the legal review

**Description:** `src/lib/legal/applicability.js` (309 lines, designed in `private/applicability-filter-design.md`) produces in-scope / conditional / dependency / out-of-scope verdicts with reasons. It has no importer. The legal review component currently shows a reviewer the source, the plain text, the risk flags and the confidence, but never answers the question a reviewer actually opens the tool with: *does this bind us?*

**Acceptance criteria:**
- [x] The legal review shows an applicability verdict per clause, with the reasons the module returns.
- [x] The verdict is derived from the actor in the text (the module's `bearerTag` / `bearerOf` path) and is not a client-side guess.
- [x] A conditional verdict names the condition that would change the answer.
- [x] A dependency verdict names the instrument that has to be read next.
- [x] The entity profile the module was designed around is reachable from the review UI.

**Verification:**
- [x] Tests pass: `node scripts/test-legal-review.mjs` — 13 new checks (join coverage, counts, out-of-scope reason, in-scope bearer, dependency bearer + read-next, not-a-duty, conditional + named fact)
- [x] Build succeeds: `npm run build`
- [x] Manual check: with the built-in worked example, all eight rows carry a verdict; the government clause reads "Does not bind you — the duty falls on the government, not on the buyer"; a pasted auditor clause reads "Binds someone you rely on … Read next: the statutory auditor's compliance certificate".

**Done 22 Oct 2026.** While wiring it, found and fixed a false-exclusion bug: a bare "the Bank shall …" was read as a duty on RBI (78 of 118 regulator-side rows in the corpus), which would have marked the reader's own duties out of scope. `the Bank` is no longer a regulator signal in `bearerOf` or `REGULATOR_BEARER`; the Reserve Bank, RBI, NABARD, SEBI and the government still are. Re-ran both applicability evaluations: drops still 100% correct (30/30 and 92/92), conditional recall unchanged.

**Dependencies:** None

**Files likely touched:**
- `src/components/LegalReview.jsx`
- `src/lib/legal/applicability.js` (read-only unless a gap is found)
- `scripts/test-legal-review.mjs`

**Estimated scope:** Small: 2-3 files

---

## Task 3: Route-level code splitting for every section

**Description:** `src/App.jsx` eagerly imports eleven sections and `src/sections/Work.jsx` eagerly imports the eight tool sections behind them, so the landing page ships the legal engine, all eleven battery modules, the econometrics library and 200 kB of datasets in one 1,018 kB chunk. `Compare.jsx` and `Touchpoints.jsx` already `lazy()` their heavy map components correctly; extend the same pattern to the section level, keeping the shell eager.

**Acceptance criteria:**
- [ ] Every section in `src/sections/` is loaded through `React.lazy` + `Suspense`; the shell (nav, footer, logo, sheet) stays eager.
- [ ] The main chunk falls below 500 kB (from 1,018 kB) and the landing page's first load no longer includes the battery modules, the legal engine or `sectors.js`.
- [ ] A `Suspense` fallback is present that does not shift layout, and honours `prefers-reduced-motion`.
- [ ] Every route in the nav and every deep link in the site still resolves.

**Verification:**
- [ ] Build succeeds: `npm run build` — record the new main-chunk size in the commit message
- [ ] Tests pass: `npm test`
- [ ] Manual check: load the landing page, then visit all eleven nav routes plus `#/data/pmjay`, `#/tools/battery` and `#/tools/lab`; each renders without a console error
- [ ] Manual check: the Network panel shows the landing page does not fetch the battery or legal chunks

**Dependencies:** None

**Files likely touched:**
- `src/App.jsx`
- `src/sections/Work.jsx`
- `src/index.css`

**Estimated scope:** Medium: 3 files

---

### Checkpoint: Foundation
- [ ] `npm test` passes (11 suites, exit 0)
- [ ] `npm run build` succeeds
- [ ] Main bundle size drops below 500 kB (from 1,018 kB)
- [ ] The simplifier's obligation list is typed; the legal review shows an in-scope verdict
- [ ] Human review before proceeding

---

## Task 4: Specify the proposition schema and write the design note

**Description:** Before writing code, fix the shape of the meaning layer: what a segment becomes, which fields exist, which are required, how a field is read from source text, and what a renderer may and may not do with it. The schema is the contract that Tasks 5–9 all depend on, so it is written down and agreed first.

**Acceptance criteria:**
- [ ] A design note in `private/` defines the proposition: field list, required vs. optional, per-field reading rules, and the canonical frame per obligation type.
- [ ] The note states explicitly what the renderer may not do — no invention of actors, no added conditions, no dropped negations, no silently dropped numbers.
- [ ] The note names the fields that a sentence without a rule hit must still fill, and the minimum viable subset if the extractor cannot.
- [ ] The note specifies the shadow-mode agreement metric and who signs off on the threshold for switching the citizen panel.

**Verification:**
- [ ] Reviewed by a human before Task 5 starts
- [ ] The field list in the note matches the list used in `src/lib/legal/proposition.js` in Task 5

**Dependencies:** None

**Files likely touched:**
- `private/proposition-layer-design.md` (new)

**Estimated scope:** Small: 1 file

---

## Task 5: Build the proposition extractor

**Description:** `src/lib/legal/proposition.js` reads one segmented sentence and returns a proposition object: actor, action, object, qualifier, condition, exception, consequence, deadline, threshold, authority, obligationType, plus the source span it was read from. It is deterministic and offline, like everything else in `src/lib/legal/`. The obligation type comes from the existing `obligations.js` classifier.

**Acceptance criteria:**
- [ ] `propose(segment, { jurisdiction, definitions })` returns a proposition object with every field of the schema, `null` where a field was not found, and a `source` span that points at the characters the fields were read from.
- [ ] `obligationType` is taken from `classifyObligation` in `obligations.js`, not re-derived.
- [ ] The extractor records what it could not read, so an unresolved condition is visible rather than absent.
- [ ] The extractor is deterministic: the same sentence and dictionary version always produce the same proposition.

**Verification:**
- [ ] Tests pass: a new `scripts/test-proposition.mjs` covering every field, plus the sentences in `scripts/test-simplifier.mjs` that currently have no dictionary rule hit
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run the extractor over `LEGAL_SAMPLE_TEXT` and read the propositions; each field traced back to a real span

**Dependencies:** Task 4

**Files likely touched:**
- `src/lib/legal/proposition.js` (new)
- `scripts/test-proposition.mjs` (new)

**Estimated scope:** Medium: 2 files

---

## Task 6: Build the proposition renderer

**Description:** `src/lib/legal/render.js` takes a proposition and emits plain-language text using a canonical frame per obligation type — "The Central Government may…", "Every beneficiary must…", "You can apply if…". The dictionary moves down a layer: it becomes the vocabulary the renderer uses inside a frame, not the transformation itself.

**Acceptance criteria:**
- [ ] `render(proposition, { jurisdiction })` returns plain text plus the list of dictionary substitutions it used.
- [ ] The renderer emits a frame per obligation type and never emits a frame for a proposition whose type it does not recognise — it returns the source text and marks the sentence unresolved.
- [ ] Every number, date, threshold and negation present in the proposition appears in the output.
- [ ] The renderer cannot introduce a condition that is not in the proposition.

**Verification:**
- [ ] Tests pass: `scripts/test-proposition.mjs` extended with a render suite, including a number-preservation and negation-preservation case per obligation type
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: render the built-in sample; each obligation reads as one sentence a non-lawyer can act on

**Dependencies:** Task 5

**Files likely touched:**
- `src/lib/legal/render.js` (new)
- `scripts/test-proposition.mjs`

**Estimated scope:** Medium: 2 files

---

## Task 7: Shadow mode — run both engines and measure agreement

**Description:** Run the existing substitution pipeline and the new proposition pipeline side by side over the same text and report the agreement, sentence by sentence, with a diff. The report is a product artefact in its own right: "we tested the new engine against the old one and here is the agreement rate" is exactly what a licensing buyer asks for.

**Acceptance criteria:**
- [ ] A `compareEngines(text, options)` function returns both renderings per sentence, a per-sentence agreement verdict, and an overall rate.
- [ ] A written agreement report exists for a fixed corpus of at least 20 real instrument sentences.
- [ ] The report is reproducible: the corpus, the dictionary version and the proposition version are recorded with the result.
- [ ] The report states the threshold and whether the switch is justified.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual check: the agreement report is regenerated from a clean checkout with the same numbers

**Dependencies:** Tasks 5, 6

**Files likely touched:**
- `src/lib/legal/shadow.js` (new)
- `scripts/test-proposition.mjs`
- `private/proposition-shadow-report.md` (new)

**Estimated scope:** Medium: 3 files

---

## Task 8: Switch the citizen panel to the rendered proposition

**Description:** Replace the citizen panel's paragraph of substituted text with a rule card: the rendered obligation, the fields the engine read, the source sentence, and the confidence. The substitution view stays available beside it, so the change is visible and reversible.

**Acceptance criteria:**
- [ ] The citizen panel shows a rule card per obligation: who must do what, by when, unless what.
- [ ] The card lists the fields the engine read and the ones it could not.
- [ ] The substitution view remains available as a second tab.
- [ ] A sentence that no dictionary rule touches now renders as a rule card with a structural confidence — it is no longer presented as a green, unchanged sentence.

**Verification:**
- [ ] Tests pass: `node scripts/test-simplifier.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: paste a 60-word nested-clause sentence with no dictionary phrase; it renders as a rule card with the unresolved condition visible

**Dependencies:** Tasks 6, 7

**Files likely touched:**
- `src/sections/Simplifier.jsx`
- `src/lib/simplify.js`
- `src/components/LegalReview.jsx`

**Estimated scope:** Medium: 3 files

---

## Task 9: Rewire risk, confidence and Hindi onto the proposition

**Description:** Three consumers currently re-parse the source string. Risk scores "which rule fired", confidence scores rule-hit density, and Hindi renders the English string. All three become sharper when they read the proposition: risk becomes "which proposition field was lost in rendering", confidence becomes "fields found ÷ fields expected", and Hindi becomes a second view of one meaning.

**Acceptance criteria:**
- [ ] The risk reason list names the proposition field at issue, not only the dictionary rule.
- [ ] The confidence score is computed as fields found ÷ fields expected, and the UI states which fields were missing.
- [ ] The Hindi rendering is produced from the proposition, and the English and Hindi views are demonstrably the same proposition.
- [ ] The existing `confidence.js` and `risk.js` suites stay green.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: the same sentence's English and Hindi cards name the same actor, action and condition

**Dependencies:** Task 8

**Files likely touched:**
- `src/lib/legal/risk.js`
- `src/lib/legal/confidence.js`
- `src/data/hindi.js`
- `src/sections/Simplifier.jsx`

**Estimated scope:** Medium: 4 files

---

### Checkpoint: Proposition layer
- [ ] Shadow-mode agreement rate recorded and ≥ the threshold set in Task 4
- [ ] `npm test` passes; the existing simplifier suite is unchanged and green
- [ ] A sentence no dictionary rule touches now renders as a rule card with a structural confidence, not a green tick
- [ ] Human review of 20 real instrument sentences before the switch

---

## Task 10: Declare design requirements and make the engine refuse

**Description:** The engine computes some of what it needs — `rddLocal` returns `singular: true, reason: 'too few points inside the bandwidth'` when fewer than six points fall inside, `propensityMatch` refuses when no pairs are inside the caliper — but those requirements are never declared, so the refusal never fires on a design that merely looks bad. Declare the requirements per design and refuse honestly.

**Acceptance criteria:**
- [ ] Each design (logit, DiD, RDD, matching, synthetic control) declares its requirements: minimum units, minimum events, minimum pre-periods, density at the cutoff, and balance.
- [ ] When a requirement is not met, the engine returns a refusal carrying what it would need, and the UI renders that as a distinct state — not an error, not a number.
- [ ] A refusal is never the outcome of the default entry path (Task 11 designs that path to be estimable by construction).
- [ ] The refusal reason uses the same vocabulary as the proposition layer's unresolved fields, so the two tools do not invent two different languages for "we could not tell".

**Verification:**
- [ ] Tests pass: `node scripts/test-econometrics.mjs`, extended with a case per design whose requirements are deliberately unmet
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run the default RDD with a bandwidth of 1 on the built-in data; the result is a refusal that states the unit count it would need

**Dependencies:** Task 4 (for the shared vocabulary)

**Files likely touched:**
- `src/lib/econometrics.js`
- `src/sections/EconometricsLab.jsx`
- `scripts/test-econometrics.mjs`

**Estimated scope:** Medium: 3 files

---

## Task 11: Open the evaluation engine on a question, not an estimator

**Description:** The Lab's first screen is an estimator menu with a default DiD whose treatment group is "states whose baseline NFHS-4 stunting is above 35%" — a threshold the user dragged, not a policy. Open on three or four worked questions, each already computed, each offering "change one thing" as the first interaction. Keep the full control surface as a "Free" path.

**Acceptance criteria:**
- [ ] The Lab's first screen shows three to four worked questions, each pre-computed against the built-in data and each displaying a result.
- [ ] Each question's first interaction is changing one parameter, not filling in a form.
- [ ] A "Guided" path and a "Free" path both exist; the Free path is the current control surface unchanged.
- [ ] The default entry no longer produces a DiD whose treatment group is a user-defined baseline threshold presented as if it were a policy.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: the first screen of the Lab shows a result within one interaction, and a reader can say what the question was and what the number means without opening a method note

**Dependencies:** Task 10

**Files likely touched:**
- `src/sections/EconometricsLab.jsx`
- `src/data/questions.js` (new)

**Estimated scope:** Medium: 2 files

---

## Task 12: Give the evaluation engine an audit manifest

**Description:** The Battery emits a SHA-256 manifest over canonical input, parameters and output with the engine version. The Lab, which makes causal claims, emits nothing. Adopt the same manifest so a Lab number carries the same reproducibility promise as a Battery report — which is the licensing page's actual argument.

**Acceptance criteria:**
- [ ] A Lab run produces a manifest over the canonical input, the design, the parameters and the result, with the estimator version — the same structure `src/battery/manifest.js` uses.
- [ ] The manifest hash is shown in the UI and carried into every export of the result.
- [ ] Re-running the same design on the same data produces the same manifest hash.

**Verification:**
- [ ] Tests pass: `npm test`, with a determinism case for the manifest
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: export a Lab result; the manifest hash in the export matches the one on screen, and matches after a re-run

**Dependencies:** Task 11

**Files likely touched:**
- `src/sections/EconometricsLab.jsx`
- `src/battery/manifest.js` (read-only reference)
- `src/lib/legal/exports.js` (where Lab exports are written, if they share a path)

**Estimated scope:** Medium: 3 files

---

## Task 13: Open the analysis battery on a question, with a module picker

**Description:** The Battery opens on a four-stage wizard whose first input is a JSON editor. It is correct for an auditor and wrong for a visitor. Open on a question, with a picker that maps a reader's problem to one of the eleven modules, and keep the staged path for someone who already knows their module.

**Acceptance criteria:**
- [ ] The Battery's first screen offers worked questions, each pre-computed, each with a result.
- [ ] A question picker maps a plain description to a module, and the mapping is explainable to the user.
- [ ] The staged path (Ingest → Bind → Execute → Report) still exists and is unchanged for a user who goes straight to it.
- [ ] The audit manifest appears on the first screen as a headline, not only in stage 3.

**Verification:**
- [ ] Tests pass: `node scripts/test-battery.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: a first-time visitor reaches a computed result on the Battery without touching the JSON editor, and can still find the staged path

**Dependencies:** None

**Files likely touched:**
- `src/sections/Battery.jsx`
- `src/battery/index.js`
- `scripts/test-battery.mjs`

**Estimated scope:** Medium: 3 files

---

## Task 14: Move the public-interest gate to export

**Description:** The Battery can already render a report whose PIT answers are `[not answered]`; only the *export* blocks. The UI blocks the reading, which puts three typed sentences in front of a user before they have seen the output of a queueing model. The discipline stays; the order changes.

**Acceptance criteria:**
- [ ] The report renders in full with the PIT answers unanswered, marked as such.
- [ ] The export is blocked until the three PIT questions are answered, and the block states why.
- [ ] The Licensing page's language is updated to match ("answer before you publish", not "answer before you can see").
- [ ] The PIT answers travel with the exported file.

**Verification:**
- [ ] Tests pass: `node scripts/test-pit.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run a Battery module, read the full report without answering anything, then attempt the export and see the block

**Dependencies:** None

**Files likely touched:**
- `src/sections/Battery.jsx`
- `src/sections/Licensing.jsx`
- `scripts/test-pit.mjs`

**Estimated scope:** Small: 3 files

---

## Task 15: One workspace across the tools

**Description:** `src/lib/datasetStore.js` already implements sharing a validated dataset from the Lab to the Battery and back, with a Pin that survives the tab. It is filed under "Shared datasets" inside a control panel. Give it a surface: one place where datasets, results and pins live across all tools.

**Acceptance criteria:**
- [ ] A workspace view lists the datasets, results and pins held in `datasetStore` across the Lab, the Battery and the Data section.
- [ ] A result produced by the Lab or the Battery appears in the workspace with its manifest hash.
- [ ] A pin survives a reload and a route change.
- [ ] The workspace is reachable from the nav on every tool route.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: produce a result in the Lab, pin it, navigate to the Battery, reload, and find it in the workspace

**Dependencies:** Tasks 12, 13

**Files likely touched:**
- `src/components/Workspace.jsx` (new)
- `src/lib/datasetStore.js`
- `src/App.jsx`
- `src/sections/Work.jsx`

**Estimated scope:** Medium: 4 files

---

### Checkpoint: Analysis tools
- [ ] A design that cannot be estimated says so and states what it would need
- [ ] Every exported Lab number carries a manifest hash
- [ ] A visitor can get from the Lab's first screen to a result in one interaction
- [ ] `npm test` passes; human review

---

## Task 16: Give Census 2011 and the NFHS panel a catalog entry

**Description:** `src/data/catalog.js` gives five datasets a contract — tier, rows, unit contract, provenance, view, series. The two most policy-relevant datasets on the site, Census 2011 (35 units) and the NFHS state panel (three waves), have no catalog entry at all: no tier, no provenance line, no coverage contract, no download. They are invisible outside the Lab's internals.

**Acceptance criteria:**
- [ ] `census2011` and the NFHS panel each have a catalog entry with tier, row count, unit note, provenance line and a series list.
- [ ] Both appear in the Data section's dataset list and in the Open data directory.
- [ ] Their provenance names the source and the vintage, matching the licence terms of the underlying data.
- [ ] The catalog remains the single registry — no second list of datasets exists anywhere.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: the Data section lists seven datasets, each opening to a detail view with its contract

**Dependencies:** None

**Files likely touched:**
- `src/data/catalog.js`
- `src/data/datasets.json`
- `src/sections/Data.jsx`
- `src/sections/OpenData.jsx`

**Estimated scope:** Medium: 4 files

---

## Task 17: Extract the coverage receipt into a shared library

**Description:** The Data section computes three kinds of absence — pair receipt, panel receipt, coverage against the Census 2011 universe — and prints them. `src/lib/coverage.js` already holds part of it. The Lab has a weaker version tied to the Census 2011 universe only; the Battery has none at all, though `completeCases` drops rows and reports a count. Make the receipt shared and use it everywhere a number is produced.

**Acceptance criteria:**
- [ ] The pair, panel and coverage receipts live in one library and are computed the same way for every consumer.
- [ ] The Lab's outputs carry a coverage receipt alongside the result.
- [ ] The Battery's report carries a coverage receipt, and states which rows were dropped and why.
- [ ] The rule holds everywhere: a missing observation is missing, never a zero, and nothing is imputed.

**Verification:**
- [ ] Tests pass: `npm test`, with a case asserting that a missing observation is reported as missing and never as zero
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: the Lab and the Battery both show a coverage receipt with their results

**Dependencies:** None

**Files likely touched:**
- `src/lib/coverage.js`
- `src/sections/Data.jsx`
- `src/sections/EconometricsLab.jsx`
- `src/sections/Battery.jsx`

**Estimated scope:** Medium: 4 files

---

## Task 18: Hand the Data playground off to the evaluation engine

**Description:** The Data playground's "Relationship" mode is Pearson + OLS on the handful of paired milestone points, with the honest note that "the correlation describes only those". The Lab does the same class of thing properly. The playground should not do inference at all: it should hand the dataset to the Lab, which has the machinery.

**Acceptance criteria:**
- [ ] The playground's relationship mode offers "Analyse this in the evaluation engine" with the dataset pre-loaded.
- [ ] The hand-off carries the dataset, its catalog entry and its coverage receipt into the Lab.
- [ ] The playground's own fit is clearly labelled as a description of the paired points, with the number of pairs shown, and is not presented as an inference.
- [ ] The hand-off works in both directions of the route change without a reload.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: from a dataset in the playground, one click lands in the Lab with the data loaded and the coverage receipt shown

**Dependencies:** Tasks 11, 16, 17

**Files likely touched:**
- `src/sections/Data.jsx`
- `src/sections/EconometricsLab.jsx`
- `src/lib/datasetStore.js`

**Estimated scope:** Medium: 3 files

---

## Task 19: Land tool outputs back in the Commons as result datasets

**Description:** A number a tool produces should land back in the Data Commons as an asset with a receipt and a provenance hash — not as a screenshot. That is what makes the Commons a spine rather than a sibling page.

**Acceptance criteria:**
- [ ] A result exported from the Lab or the Battery is registered as a result dataset in the Commons, with its manifest hash as provenance.
- [ ] A result dataset is listed with its question, the design, the coverage receipt and the date.
- [ ] A result dataset can be opened, re-opened and cited, and the citation carries the manifest hash.
- [ ] Result datasets are distinguishable from source datasets in every list.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: export a Lab result, find it in the Commons, open it, and see the manifest hash and coverage receipt

**Dependencies:** Tasks 12, 16, 17, 19's predecessors

**Files likely touched:**
- `src/data/catalog.js`
- `src/lib/datasetStore.js`
- `src/sections/Data.jsx`
- `src/sections/OpenData.jsx`

**Estimated scope:** Medium: 4 files

---

### Checkpoint: Catalog as the spine
- [ ] Every dataset on the site has a tier, a provenance line and a coverage receipt
- [ ] A number produced by the Lab can be opened from the Commons with its manifest
- [ ] `npm test` passes; human review

---

## Task 20: Direction A — replace the capability band with institutional capabilities

**Description:** The landing page currently leads with the flood of government output, the sprawl, and four causal-inference capabilities. The organisation is now an institution with a legal reading engine, a licensable analysis battery, a Data Commons, a distributional discipline and a field evidence base. Replace the four capabilities with four institutional ones, and keep the earned arc — the flood, the sprawl, the deep time, the seven doors.

**Acceptance criteria:**
- [ ] The capability band names four institutional capabilities: what does this notification require of us, which requirements bind us, is this number defensible, who is missing from this answer.
- [ ] Each capability links to the tool that actually does it, and that tool is one click away.
- [ ] The Data Commons, the licence and the free tier are visible from the landing page, not only from `/licensing`.
- [ ] The causal-inference capability is not deleted — it moves into the tools floor where it belongs, and remains reachable from the front door.
- [ ] The copy makes no claim the product does not deliver.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: every capability link resolves to a live tool with a working first screen
- [ ] Human review of the copy against the product

**Dependencies:** Task 3

**Files likely touched:**
- `src/sections/Home.jsx`
- `src/data/tools.js`
- `src/sections/Work.jsx`

**Estimated scope:** Small: 3 files

---

## Task 21: Landing-page hygiene

**Description:** The landing page is the site's first impression and it is about to carry more. Apply the house rules already established elsewhere in the codebase (`ui-skills` baseline, `vercel-react-best-practices`).

**Acceptance criteria:**
- [ ] Headings use `text-balance` and body copy uses `text-pretty`.
- [ ] Every number on the landing page uses `tabular-nums` (the `data-num` class the Data section already uses).
- [ ] Motion is limited to `transform` and `opacity`, never a layout property, never longer than 200 ms for interaction feedback, and `prefers-reduced-motion` is honoured in `src/index.css`.
- [ ] Every icon-only control has an accessible name; the `meter` pattern (`role="img"` + `aria-label`) is the house rule.
- [ ] Every empty state on the landing page gives one clear next action.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] `npm run lint` passes
- [ ] Manual check: tab through the landing page; every control has a name and a visible focus ring; reduced-motion emulation removes the transitions

**Dependencies:** Task 3

**Files likely touched:**
- `src/sections/Home.jsx`
- `src/index.css`

**Estimated scope:** Small: 2 files

---

## Task 22: Direction C — the evidence desk (deferred until the proposition layer ships)

**Description:** The landing page the organisation can afford: a live worked example as the hero rather than an abstraction. Paste a real circular; the first screen shows the engine's obligation card — the extracted duty, its source span, its risk chip, its confidence and the manifest hash. Then a strip of published outputs, then the products, then the doors. This depends on the proposition layer because the hero *is* the proposition layer's output.

**Acceptance criteria:**
- [ ] The hero is a live worked example on a real instrument, not a static illustration.
- [ ] The hero's obligation card shows the duty, the source span, the risk chip, the confidence and the manifest hash.
- [ ] A strip of published outputs follows the hero.
- [ ] The products band and the doors follow, in that order.
- [ ] The page is no slower to first paint than the current landing page.

**Verification:**
- [ ] Build succeeds: `npm run build` — record the main-chunk size and the first-paint time
- [ ] Manual check: the hero renders the worked example without a page reload and the card's fields are all populated

**Dependencies:** Tasks 8, 20, 21

**Files likely touched:**
- `src/sections/Home.jsx`
- `src/components/HeroExample.jsx` (new)

**Estimated scope:** Medium: 2 files

---

### Checkpoint: Complete
- [ ] All acceptance criteria met across every task
- [ ] `npm test` and `npm run build` green
- [ ] Bundle, proposition, tool and catalog changes reviewed together
