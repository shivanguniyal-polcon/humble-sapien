# Implementation Plan: THS product coherence — 22 October 2026

## Overview

The assessment in [`private/2026-10-22-product-gap-assessment.md`](../private/2026-10-22-product-gap-assessment.md) found five related gaps: the Data section holds a dataset contract and absence receipts that no tool uses; the policy simplifier is a phrase-substitution engine with no meaning layer, so unhit sentences are certified green; the evaluation engine and the analysis battery open on machinery instead of on a question; the landing page sells a capability the organisation has moved past; and the whole app ships as one 1,018 kB bundle. This plan turns that into ordered, verifiable work in five phases. Every task is a vertical slice that leaves the app working.

## Architecture Decisions

- **Additive, never a rewrite.** The legal pipeline's determinism promise is the commercial asset. The proposition layer sits *between* segmentation and rendering, behind its own version string, and the old path stays green throughout. Nothing a customer depends on changes behaviour until the shadow-mode agreement rate justifies the switch.
- **The proposition is the unit of meaning.** A segment becomes `{actor, action, object, qualifier, condition, exception, consequence, deadline, threshold, authority, obligationType}`. Every downstream consumer — obligation typing, applicability, risk, confidence, Hindi rendering, the citizen rule card — reads that object instead of re-parsing the source string. This is the single change that makes the other four gaps closeable.
- **The catalog is the single dataset registry.** One contract for every dataset, including the two that currently have none (Census 2011, the NFHS panel). A tool's output is a result dataset whose provenance is a run manifest hash, so numbers flow back into the Commons as assets rather than as screenshots.
- **Tools refuse, they do not merely warn.** Each design declares its requirements (N, events, pre-periods, density at the cutoff). When the data does not meet them the tool says what it would need. The refusal machinery already exists in `rddLocal`, `syntheticControl` and `propensityMatch`; this plan makes it declared rather than incidental.
- **One manifest for every number.** The Lab adopts the Battery's audit manifest: input hash, design hash, estimator version, result hash. This is what the licensing page's reproducibility argument rests on, and today only the Battery has it.
- **The PIT gate moves to export.** The distribution check still blocks publication; it stops blocking the *reading* of a result. A user should see the output before being asked the three questions.

## Dependency Graph

```
Catalog as single registry ──┐
                              ├── Data playground hands off to the Lab
Tool output → result dataset ┘

Proposition schema
   ├── Proposition extractor (proposition.js)
   │      ├── Proposition renderer (render.js)
   │      │      ├── Citizen rule card
   │      │      └── Hindi rendering from the proposition
   │      ├── Obligation typing (obligations.js) re-derives from the proposition
   │      ├── Applicability joins on the actor field
   │      ├── Risk = which proposition field was lost in rendering
   │      └── Confidence = fields found ÷ fields expected
   └── Shadow-mode agreement report

Design requirements (econometrics.js) ── shared by ── Lab question-first entry
                                                          └── Lab manifest

Question-first entry ── shared by ── Lab
                          └── Battery

Route-level code splitting (App.jsx, Work.jsx) ── prerequisite for every
                                                   landing-page change
```

## Task List

### Phase 1: Foundation — wire what is already written

- [ ] **Task 1: Replace the keyword obligation grep with the real classifier**
- [ ] **Task 2: Wire the applicability filter into the legal review**
- [x] **Task 3: Route-level code splitting for every section**

### Checkpoint: Foundation
- [x] `npm test` passes (11 suites, exit 0) — evidence: exit 0, 5,597 PASS assertions (2026-10-23)
- [x] `npm run build` succeeds — evidence: exit 0
- [x] Main bundle size drops below 500 kB (from 1,018 kB) — evidence: 312.56 kB minified (gzip 99 kB); landing first load fetches only the index chunk — battery, legal and atlas chunks all behind routes
- [x] The simplifier's obligation list is typed; the legal review shows an in-scope verdict — evidence: worklog Entries for Tasks 1–2 (`classifyObligation` types every line; `assessApplicability` verdict chip per row)
- [ ] Human review before proceeding (Founder)

### Phase 2: The proposition layer — the simplifier's missing centre

- [x] **Task 4: Specify the proposition schema and write the design note** — note: `private/proposition-schema-design.md`; verification gates (human review, Task 5 field cross-check) remain open
- [ ] **Task 5: Build the proposition extractor**
- [ ] **Task 6: Build the proposition renderer**
- [ ] **Task 7: Shadow mode — run both engines and measure agreement**
- [ ] **Task 8: Switch the citizen panel to the rendered proposition**
- [ ] **Task 9: Rewire risk, confidence and Hindi onto the proposition**

### Checkpoint: Proposition layer
- [ ] Shadow-mode agreement rate recorded and ≥ the threshold set in Task 4
- [ ] `npm test` passes; the existing simplifier suite is unchanged and green
- [ ] A sentence no dictionary rule touches now renders as a rule card with a structural confidence, not a green tick
- [ ] Human review of 20 real instrument sentences before the switch

### Phase 3: The analysis tools

- [ ] **Task 10: Declare design requirements and make the engine refuse**
- [ ] **Task 11: Open the evaluation engine on a question, not an estimator**
- [ ] **Task 12: Give the evaluation engine an audit manifest**
- [ ] **Task 13: Open the analysis battery on a question, with a module picker**
- [ ] **Task 14: Move the public-interest gate to export**
- [ ] **Task 15: One workspace across the tools**

### Checkpoint: Analysis tools
- [ ] A design that cannot be estimated says so and states what it would need
- [ ] Every exported Lab number carries a manifest hash
- [ ] A visitor can get from the Lab's first screen to a result in one interaction
- [ ] `npm test` passes; human review

### Phase 4: The catalog as the spine

- [ ] **Task 16: Give Census 2011 and the NFHS panel a catalog entry**
- [ ] **Task 17: Extract the coverage receipt into a shared library**
- [ ] **Task 18: Hand the Data playground off to the evaluation engine**
- [ ] **Task 19: Land tool outputs back in the Commons as result datasets**

### Checkpoint: Catalog as the spine
- [ ] Every dataset on the site has a tier, a provenance line and a coverage receipt
- [ ] A number produced by the Lab can be opened from the Commons with its manifest
- [ ] `npm test` passes; human review

### Phase 5: The landing page

- [ ] **Task 20: Direction A — replace the capability band with institutional capabilities**
- [ ] **Task 21: Landing-page hygiene**
- [ ] **Task 22: Direction C — the evidence desk (deferred until the proposition layer ships)**

### Checkpoint: Complete
- [ ] All acceptance criteria met across every task
- [ ] `npm test` and `npm run build` green
- [ ] Bundle, proposition, tool and catalog changes reviewed together

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The proposition layer is over-ambitious and does not finish | High | Task 4 fixes a scope: 11 fields, one jurisdiction, one instrument family. Tasks 5–6 are individually shippable behind a flag. The old path stays live throughout, so a partial proposition layer is still a product improvement. |
| The shadow-mode agreement rate is low and the switch is not justified | Med | That is a valid finding, not a failure. The agreement report is itself a publishable artefact. The switch is a separate task and can be declined without unwinding Tasks 5–7. |
| Route splitting breaks a deep link or the nav | Med | Keep the shell (`App.jsx`, nav, footer) eager. Split at the section boundary, not inside it. Task 3's verification enumerates every route in the nav and deep-link set and loads each one. |
| Refusing designs makes the Lab look broken | Med | Every refusal states what it would need ("this design needs ≥ 40 units inside the bandwidth; you have 12"). Refusal is a different visual state from error, and it never appears on the default entry — Task 11's question path is designed to be estimable by construction. |
| The catalog grows and the bundle grows with it | Med | Task 3 lands before Phase 4, and the coverage receipt moves into a shared library rather than being duplicated. `datasets.json` stays a static import behind the route that needs it. |
| The PIT gate at export is read as removing the discipline | Med | The gate stays. The copy changes from "answer before you can see anything" to "answer before you can publish", and the report still prints the unanswered answers. The Licensing page's language is updated in the same task. |
| The landing page direction is not decided | Med | Direction A is recommended and is independent of the decision. Direction C depends on the proposition layer and is deferred to Task 22. The plan does not block on the decision. |

## Parallelization Opportunities

**Safe to parallelize:** Task 1 and Task 2 (different modules, different surfaces). Task 11 and Task 13 (different tools). Task 16 and Task 17 (catalog entries vs. the shared receipt library — Task 17 is the dependency, but the two catalog entries in Task 16 do not need it).

**Must be sequential:** Task 3 before Task 20 and Task 21 (bundle measurement). Task 4 before Tasks 5–9. Task 5 before Task 6. Task 6 before Task 7. Task 7 before Task 8. Task 8 before Task 9. Task 10 before Task 11. Task 11 before Task 12.

**Needs coordination:** Tasks 4 and 10 both define a shared vocabulary of "requirement not met" and "confidence". Agree that vocabulary in Task 4 and reuse it in Task 10 rather than inventing a second one.

## Open Questions

1. **Landing-page direction.** A (method first, recommended and independent), B (three products, one method), C (evidence desk, deferred until the proposition layer ships), D (institution first). This decision blocks Task 20's content and Task 22's existence — nothing else.
2. **Proposition scope.** The full 11-field schema, or a 6-field minimum (actor, action, object, condition, consequence, obligationType) shipped first? Recommendation: build the schema with all 11 fields but make six of them optional, so the renderer degrades gracefully.
3. **Who signs off on the shadow-mode agreement threshold.** The threshold that justifies switching the citizen panel from substitution to proposition rendering is a judgement about reader comprehension, not a technical constant. It needs a name against it.
