# Concept note: Regulator Obligation Monitor — standing compliance coverage

**For:** a regulated entity's compliance function (bank, NBFC, HFC or UCB) ·
**From:** The Humble Sapien LLP · 22 October 2026 · valid 60 days

---

## The problem

A compliance team reads circulars two at a time. What it cannot see is the chain:
which paragraph of which master direction a fresh circular substitutes, which
obligation that kills, and what was actually in force on the day a decision was taken.

No regulator publishes machine-readable supersession status. The status field on a
regulator's own site is not reliable: we found circulars titled "Repeal of…" listed as
non-archived. Status cannot be sourced. It has to be reconstructed, with evidence.

## Objective

A maintained, auditable record of what a named set of regulators requires of your
institution, at provision granularity, with every claim quoted back to the regulator's
own sentence and every status change carrying its evidence.

## Scope

- **Regulator:** RBI to start (the corpus and classifier are built and measured on
  50 RBI circulars). SEBI, IRDAI, PFRDA and NABARD added on the same rails.
- **Coverage:** the instruments that bind you — master directions, circulars and
  notifications touching your registered activity, plus the amendment chain behind
  them.
- **Unit:** provision, not document. An amendment circular that substitutes a
  paragraph is a provision-to-provision relation with two quoted spans, not a line
  saying "A amends B".
- **Cadence:** a run against the regulator's feed each cycle, with a reviewer pass on
  every extracted relation before it reaches you.

## Method

1. **Ingest.** Each circular is fetched, archived (content-addressed, so a pulled page
   does not break the record) and segmented into offset-preserving sentences.
2. **Type.** A seven-way obligation classifier types every binding statement — action,
   constitutive, entitlement, meta, definition, method, illustration. Measured at
   92.1% strict duty precision, 98.0% type accuracy, 100% duty recall on blind
  holdouts.
3. **Join.** The applicability filter reads each obligation against your stated
  entity profile and returns one of five verdicts: binds you, binds someone you rely
  on, turns on a fact you have not stated, does not bind you, or is not a duty. In
  110 hand-judged drops across two profiles, it dropped zero binding obligations.
4. **Link.** Amendment operations (insert, substitute, delete, renumber, repeal) are
   extracted with quoted evidence spans for both the operation sentence and the
   payload. Unevidenced links are reported unresolved, never guessed.
5. **Review.** A reviewer pass on every extracted relation. The two error classes that
   matter most — a wrong "this paragraph died" and a silently dropped duty — are the
   ones the reviewer time is spent on.

## What you get

- **A current-state register:** every obligation in force for your entity class,
  with provision-level source quotes, its bearer, its conditions and the instrument it
  came from.
- **An as-of view:** "what was in force on 1 January 2025" answered by a query, not
  by archaeology.
- **A change log per cycle:** what a new circular inserted, substituted, repealed —
  in plain words, with the before and after quoted.
- **The receipts:** archived source documents, extraction hashes, the reviewed
  corpus and the change log, exportable.

## What it is not

It is not legal advice and it is not an authoritative status. It is an audit aid that
shows its evidence: every verdict carries the sentence it came from, so your counsel
can check the reading against the regulator's words in seconds.

## Timeline and team

12 weeks to first maintained register on RBI, then monthly cycles. THS team: founder
plus one engineer, with a two-reviewer pass on extracted relations. You supply the
entity profile and one 60-minute scoping call.

## Price band

Commissioned module terms: **USD 25,000–75,000**, scoped. A 12-week first register on
one regulator with monthly maintenance sits in the middle of that band; a second
regulator and a standing review retainer are quoted against the support agreement
(USD 10,000–40,000 a year, days at USD 400–600).

Under the mission lock, the classifier and the applicability filter enter the public
engine by default. Your entity profile, your corpus selections and your review queue
are yours and are never published.
