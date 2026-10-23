# Concept note: PM-JAY fiscal scenario appraisal — a business case for the next envelope

**For:** a state health agency, a foundation funding health financing, or a
multilateral programme team · **From:** The Humble Sapien LLP · 22 October 2026 ·
valid 60 days

---

## The problem

PM-JAY cost questions are answered with whichever projection is on the slide. Cards,
admissions, empanelled hospitals and treatment value move on different curves, and a
budget envelope set on last year's average claim size breaks within two.

The honest version needs a model that is calibrated rather than guessed, published
with its assumptions, and willing to say when no lever works.

## Objective

A costed, reproducible appraisal of PM-JAY fiscal trajectories to 2035 under a fixed
budget envelope, with each scenario's assumptions on the face of the output and the
calibration evidence attached, so a board or a finance ministry can interrogate the
numbers rather than trust them.

## What already exists (this is not a from-scratch build)

THS has a live, calibrated PM-JAY system-dynamics model:

- Calibrated in log space against **28 official anchors** from PIB releases, Lok Sabha
  replies and the NHA Annual Report 2024-25, each carrying its URL.
- **Fit quality:** cards 4.5% MAPE, admissions 4.5%, empanelled hospitals 2.8%,
  treatment value 4.3%.
- Published findings that hold under the calibration: admissions growth is driven by
  enrolment, not by sicker cardholders (utilisation per cardholder is flat at 0.084
  admissions a year); empanelment follows a logistic curve with a 45,000-hospital
  ceiling; average claim size grows about 7.9% a year.
- Four scenarios under one budget envelope already run. **No tested lever restores
  fiscal sustainability.** That is the finding a client needs to hear early.

## Scope of the commission

The model exists. The commission is the appraisal layer your decision needs:

1. **Your envelope, your levers.** The scenario set is rebuilt around the budget
   line, contribution structure and empanelment policy you actually control. Levers
   you cannot pull are not scenarios.
2. **Sensitivity on the assumptions that move the answer.** Claim size growth,
   utilisation, empanelment ceiling — each tested, each printed with its calibration
   anchor.
3. **Distributional read.** Who gains and who pays under each scenario, using the
   distributional CBA module, at state and district granularity where the data allows.
4. **The falsification record.** What would have to be true for the recommendation to
   be wrong, and the check that would show it.

## Method

Battery modules end to end: the PM-JAY reference model for the trajectory, budget
impact for the envelope, distributional CBA for who gains, Monte Carlo for the
uncertainty band. Every run emits the audit manifest — SHA-256 over input, parameters
and output, plus engine version — so a number in your board paper re-runs byte for
byte in three years.

## What you get

- A scenario pack: each scenario one page — assumption set, trajectory, cost, who
  gains, what would falsify it.
- The assumption register, every row carrying its source and verification status.
- The reproducibility pack: input files, parameter files, engine version, manifest.
- A workshop with your team on the recommendation and its weakest assumption.

## Known limits, stated up front

- The live NHA dashboard is geo-blocked outside India, so calibration uses published
  anchors. One stale September 2019 hospital anchor repeats the launch figure in
  official materials; it is flagged in the model.
- The model sees enrolment and admissions. It cannot see people never enumerated into
  the scheme, and no scenario should be read as covering them.

## Timeline and team

6 weeks from scoping call to scenario pack. THS team: founder plus one engineer. You
supply the envelope, the policy levers under your control and one workshop.

## Price band

Support agreement terms: **USD 10,000–40,000**, banded by the days the appraisal
needs. A six-week, three-scenario pack with one workshop sits at the lower middle of
that band. Training and workflow days, if wanted, at USD 400–600 a day.

The model itself remains public. Your scenario pack, your envelope and your
assumption overrides are yours.
