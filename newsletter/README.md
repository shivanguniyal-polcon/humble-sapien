# THS Newsletter — editorial spec

The newsletter is one face of the same work that goes into the research
library, the Data Commons and the tools: evidence with receipts, in plain
language. This file is the contract between the copy and the template.

## Cadence and editions

- **Weekly** (`type: weekly`) — the dispatch. One number worth keeping, the
  finding behind it, a policy term in ordinary words, a chart you can take
  apart, a tool to open, and what to read next. ~600–900 words, a 4–5 minute
  read.
- **Monthly** (`type: monthly`) — the deep-dive. One policy taken apart end to
  end: the citizen's journey through it, the language it is written in, and who
  gains, who pays and who is missing. Published as its own larger edition, not
  squeezed into a weekly issue.

Every issue is a self-contained page on the site (`#/newsletter/<id>`) and a
standalone HTML file in `dist/`.

## Audience and register

Primary reader: **citizens and civil society.** Plain language, minimal
jargon. Receipts are shown, never belaboured. When a term must appear, it is
immediately rewritten in ordinary words. The founding argument holds: policy
the public cannot parse is policy the public cannot claim.

## The slots

Every issue carries, in this order:

| Slot | Weekly | Monthly |
|---|---|---|
| Masthead (number, date, author, edition, tags) | ✓ | ✓ |
| **Data snapshot** — one number, its label and source | ✓ | ✓ |
| **Lead** — framed around a current policy event or development | ✓ | ✓ |
| **Policy term, plainly** — a clause as written, then in plain words | ✓ | — |
| **Chart of the week** — one external/open figure with its takeaway | ✓ | — |
| **The citizen's journey** — touchpoints, eligibility to grievance | — | ✓ |
| **In plain language** — the policy's key clause rewritten | — | ✓ |
| **Who gains, who pays, who is missing** — the stakeholder ledger | — | ✓ |
| **Field note** — a short note from the workshop | ✓ | ✓ |
| **Tool spotlight** — one free instrument, with a live link | ✓ | ✓ |
| **Reading list** — internal and external links to read next | ✓ | ✓ |

## Editorial rules

- **External and open only.** Every data snapshot and chart must cite a
  public, open-access source (PIB, NHA, MoSPI, Lok Sabha, official portals).
  This is the brand. Internal or unpublished work does not go in the data and
  policy slots. `newsletter_prepare.py` flags a source that reads as internal
  (thesis, in-preparation paper, raw file) so it cannot slip in by accident.
- **A promise is not a record.** Keep the strict vocabulary: *delivered*,
  *partly evidenced*, *announced only*, *no public evidence found*. The last is
  a statement about receipts, not about reality — never upgrade it to "it did
  not happen."
- **Lead with the event.** The lead story is usually a live policy process, a
  milestone or a development — not an abstract theme.
- **Both texts always print.** A plain-language rewrite never replaces the
  original clause; they appear together, so the reader can check the work.

## Writing an issue

Author one Markdown file per issue in `issues/`. Frontmatter carries the
structured slots; the body carries the prose under `## ` headings.

```markdown
---
id: issue-005
issue: 5
type: weekly            # or: monthly
date: 2026-11-15
title: "..."
standfirst: "..."
author: Shivang Uniyal
tags: [governance, health]
snapshot:
  value: "5,02,000"
  label: "..."
  note: "..."
  source: "MoSPI (August 2024)"   # external + open, always
  statTab: data
term:                    # weekly: policy term, plainly
  before: "the clause as written"
  after: "the same clause in plain words"
  note: "why the wording matters"
chart:                   # weekly: chart of the week (external source only)
  title: "..."
  takeaway: "one sentence"
  source: "NHA Annual Report 2024-25"
  href: "#/data/pmjay"
tool:
  name: "..."
  href: "#/tools/..."
  blurb: "..."
# monthly-only extras:
policy: "Ayushman Bharat PM-JAY"
source: "..."            # the policy's public source
simplify:
  before: "the entitlement clause as written"
  after: "the same clause in plain words"
  note: "readability before → after"
stakeholders:
  gains: "..."
  pays: "..."
  missing: "..."
---

## Lead

...prose...

## Field note        (optional)

...prose...

## Touchpoints       (monthly only)

- Eligibility: ...detail...
- Delivery: ...detail...

## Reading

- [Label](#/research/...) — note.
```

## Building

```bash
python3 scripts/newsletter_prepare.py   # parse + validate -> src/data/newsletter.js
python3 scripts/newsletter_render.py    # -> newsletter/dist/*.html (self-contained)
```

Both are deterministic: the same sources produce byte-identical output. The
palette is read from the real `src/index.css` tokens and the mark from
`public/favicon.svg`, so the newsletter cannot drift from the site theme.
`prepare` validates every issue against this template and refuses to build a
half-specified one.
