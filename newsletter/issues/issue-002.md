---
id: issue-002
issue: 2
type: weekly
date: 2026-10-25
title: "Is the biggest health assurance scheme in the world affordable? Now there is a number."
standfirst: "The fiscal sustainability question is being asked in earnest this year. India's largest publicly funded health assurance scheme has now been fitted in log space to its own official record — so you can disagree with the numbers rather than with us."
author: THS Research
tags: [health, models, evidence]
snapshot:
  value: "9.19 Cr"
  label: "cumulative authorised hospital admissions under PM-JAY to 31 March 2025"
  note: "Up from 0.17 crore in FY2018-19. The growth is from enrolment, not from sicker cardholders."
  source: "NHA Annual Report 2024-25 (via The Hindu, October 2025); PIB PRID 1813651 and 1928582"
  statTab: research
term:
  before: "Empanelled hospitals are those that have a agreement with the insurance agency to provide cashless treatment to beneficiaries up to a defined package price."
  after: "Hospitals that have signed up to treat PM-JAY patients for a pre-agreed price, with no cash at the counter. If they are not on the list, the card does nothing there."
  note: "Whether a hospital is empanelled decides whether the promise reaches the patient at all."
chart:
  title: "Cards vs admissions: enrolment is doing the work"
  takeaway: "Cards issued and admissions both climb together, while admissions per cardholder stay flat — growth comes from enrolment, not from people getting sicker."
  source: "NHA Annual Report 2024-25; PIB releases PRID 1813651 and PRID 1928582"
  href: "#/data/pmjay"
tool:
  name: "Data Commons"
  href: "#/data/pmjay"
  blurb: "Take the PM-JAY programme trajectories apart yourself: cards, admissions, empanelled hospitals and treatment value at every official milestone, each row sourced to PIB, a Lok Sabha reply or the NHA annual report."
---

## Lead

The question of whether India's largest publicly funded health assurance scheme can keep paying its bills is no longer a hypothetical. Card enrolment has crossed 40 crore, cumulative authorised admissions have crossed nine crore, and the treatment bill has grown from ₹37,606 crore in March 2022 to ₹1,29,386 crore by March 2025. When a programme reaches that size, "is it sustainable" stops being a talking point and becomes arithmetic. So we did the arithmetic, in public.

We built a system-dynamics model of Ayushman Bharat PM-JAY and fitted it in log space to 25 usable official anchor points — not to a target narrative, but to the programme's own reported history from 2018 to 2025.

The fit quality, stated plainly: cards 4.5% mean absolute percentage error, authorised admissions 4.5%, empanelled hospitals 2.8%, treatment value 4.3%. The worst single point is empanelled hospitals at September 2019, off by 13.2% — and that is a known stale data point, because the same launch figure was carried in official materials through year one. We say so rather than smoothing it away.

One finding is worth your attention. Admissions growth is driven by enrolment, not by sicker cardholders. Utilisation per cardholder is flat, at about 0.084 admissions per year. Empanelment follows a logistic curve toward a ceiling near 45,000 hospitals, and average claim size grows roughly 7.9% a year, from a base near ₹10,180 to about ₹14,000 by 2025. That is the real side, and it is stable. The sustainability question lives in the projection window, where rationing would have to happen — not in the history we fitted against.

## Field note

The interesting failure was on the money side, and we want to leave the correction in public. An earlier version of the model converted claims to rupees crore with a divisor of 100 where the dimensionally correct divisor is 10. The result understated claims expenditure tenfold — the source of an old artefact where the fund appeared to grow to ₹1.18 lakh crore out of nowhere. We found it, fixed it, and the model now reproduces the harness exactly.

We also reinterpreted the budget as the combined central and state spending envelope, because that is the level at which the model reproduces what hospitals were actually paid through March 2025. Rationing, if it comes, belongs to the projection window, not to the record.

## Reading

- [PM-JAY fiscal sustainability model](#/research/pmjay-model) — the full report, with methods, citations and downloadable series.
- [THS Data Commons](#/data/pmjay) — the programme trajectories as a chartable series, open tier, free forever.
- [Policy must evolve, and so must the way we read it](#/writing/evolve) — the founding argument, if this is your first issue.
