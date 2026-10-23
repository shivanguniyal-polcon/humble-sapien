# Implementation Plan: MSC exhibit build — 22 October 2026

## Overview

Six items that close the gap between what THS is and what a consultancy JD asks for,
ordered easiest to hardest. The earlier product-coherence plan (`tasks/plan.md`,
`tasks/todo.md`) is untouched and stays open; this plan is separate work and none of
its tasks depend on that plan's unchecked items.

**Decisions taken (user, 22 Oct):** concept notes cover ROM, PM-JAY and the DPI
corridor; the gender index is a composite with adjustable weights; the Monitor gets a
standalone page and method note; the DPI corridor covers three corridors — UPI, Pix
and NIP.

**Skills in force:** ponytail (smallest complete change) for code; no-ai-slop and
plain-english for every written artefact.

## Architecture Decisions

- **Documents, not pages, for item 1.** The concept notes and capability statement
  follow the existing `commercial/` convention (rate card, proposal, order form are
  already documents, not site pages). No code.
- **Regulator feeds reuse the pipeline's existing source shape.** Each new source is
  one entry in the SOURCES or PRS_LISTINGS list with a tag and kind; the domain
  bucket list gains "Financial Regulation". Every feed is dry-run verified before it
  is trusted — a feed that returns nothing is worse than no feed, because it looks
  like a quiet day.
- **The gender index is a pure-function tool over data already in the repo.**
  NFHS-5 (anaemia_women, inst_births, women_schooling) plus Census 2011 (sex ratio,
  female literacy), min-max normalised to 0–100 per indicator, weighted sum, ranked
  table, weights adjustable in the UI. No new data files.
- **The Battery business-case front end wraps the CBA module.** The scoping flow
  (question → options → assumptions register → costed recommendation → risks) emits
  the module's own input shape, so the engine, manifest and gate are unchanged. The
  front end is a form, not a second engine.
- **The Monitor page is static and cites the measured numbers.** It prints the
  four-round precision table, the method, a worked sample and the
  not-legal-advice framing. The corpus stays private; the page is the exhibit.
- **The DPI corridor is a research artefact first.** Facts come from regulator and
  operator primary sources (NPCI, BCB, NIBSS annual reports and stats pages), cited
  on the page. Where a number is unavailable it is named as a gap, not estimated.

## Task List

- [ ] Task 1: Capability statement + three concept notes in `commercial/`
- [ ] Task 2: Regulator feeds (RBI, SEBI, NPCI, IRDAI, PFRDA, NABARD) + Financial
      Regulation bucket in `scripts/pit_pipeline.py`, dry-run verified
- [ ] Task 3: Gender inclusion index tool (section + route + tools entry)
- [ ] Task 4: Business-case front end in the Battery
- [ ] Task 5: Regulator Obligation Monitor page + method note
- [ ] Task 6: DPI corridor landscape page (UPI, Pix, NIP), sourced and cited

### Checkpoint: Complete
- [ ] `npm test` (11 suites) and `npm run build` green
- [ ] PIT dry-run shows items from at least four of the six regulators
- [ ] Every written artefact passes the no-ai-slop self-check
- [ ] Worklog entry records what shipped and what was verified

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A regulator feed is dead, blocked or unstructured | Med | Dry-run each feed individually before wiring it; drop the ones that fail and say so on the page rather than shipping a silent gap |
| The gender index over-claims comparability | Med | NFHS-4→5 anaemia is not comparable (the data file says so); the page prints that caveat next to the indicator |
| The business-case front end duplicates the Battery's stages | Med | It only produces module input; the four stages stay the single path to a run |
| The DPI numbers move between reports | Med | Every figure carries its source and as-of date; where sources disagree, both are printed |

## Open Questions

1. **Where the DPI corridor renders.** Compare section, Research publication, or its
   own route. Decided when the research is in hand and the content shape is clear.
2. **Whether the concept notes also become site pages later.** Out of scope now; the
   documents can be lifted into a section whenever the decision is made.
