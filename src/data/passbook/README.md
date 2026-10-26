# Village Passbook data — three-GP pilot

This directory holds one captured file, `index.json`, for the public Village
Passbook page. It covers three Gram Panchayats in Doiwala block, Dehradun,
Uttarakhand, for budget year 2025-26:

| GP code | Gram Panchayat | Sarpanch (as recorded) |
| --- | --- | --- |
| 23009 | Jeevan Wala | GURJEET SINGH |
| 23019 | Markham Grant | PARMINDER SINGH |
| 23027 | Raiwala | SAGAR GIRI |

The file is generated, not hand-edited. Re-run:

```bash
npm run build:passbook
```

That command reads public eGramSwaraj reports and writes the raw responses to
`private/passbook-pilot/raw/` (gitignored). Every published row carries the
SHA-256 of the response it came from, and the file carries a `dataHash` over
the three GP rows.

The page does not read this file in the browser. It is the capture of record:
`scripts/seed-places.mjs` reads it, attaches each GP to its village in the
Local Government Directory, and writes SQL for the `ths-places` D1 database.
The Khata page then asks the places API for the one passbook it is showing.
Re-running the capture means re-running the seed and re-applying the base SQL.

## What is in each row

- `profile` — Sarpanch, secretary, office address and PIN. Mobile numbers and
  email addresses are deliberately not copied.
- `finance.xvfc` — the XV Finance Commission opening balance, receipts,
  payments and closing balance, split into untied and tied components.
- `finance.schemes` — every state scheme with a non-zero receipt or payment,
  with its twelve monthly rows and source id.
- `finance.months` — the sum of the scheme rows for each month, April to March.
- `finance.reconciliation` — the arithmetic check: opening plus receipts minus
  payments against the reported closing balance, and the monthly XVFC return
  against the XVFC ledger.
- `works` — the GP's completed-work register. `worksSource` is `work-report`
  when the public physical-progress report answered, or `plan-api` when the
  collector had to use status-176 activities from the plan API. In the latter
  case the funding scheme is null and the note says so.
- `worksSummary` — counts, recorded cost, priced/unpriced counts and the latest
  completion date.
- `vendors` — registration counts by status and vendor type. No names, no
  payment amounts.

## What the file does not contain

- Phone numbers, email addresses, vendor names, individual bills, bank details
  or Aadhaar numbers.
- A claim that a payment bought a particular work, that a work exists on the
  ground, or that the GP's entry has been audited.
- A closing balance for schemes other than XVFC; eGramSwaraj's public report
  does not publish one.

## Checks

`npm run test:passbook` verifies the ledger arithmetic, the monthly sums, the
works summary, the privacy exclusions, the source references and the data
hash. The golden figures are the captured contract: if a re-collection changes
them, update the test in the same change and explain why.
