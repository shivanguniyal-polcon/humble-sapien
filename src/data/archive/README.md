# The public archive data

The archive is a government-wide register, not a second copy of the Prahari
library. It holds five kinds of record:

- **Regulatory instruments** — the RBI corpus in `src/data/monitor/`, read
  through the same pinned chunks as the workbench.
- **Acts, rules, guidelines and strategies** — source snapshots in `docs/`,
  each with its own URL, retrieval date, text and SHA-256.
- **Official releases** — PIB texts or summaries, marked as such.
- **Programme pages** — central schemes read from `src/data/schemes.js`. These
  are index entries with a ministry link; the archive does not hold the scheme
  guidelines.

## What the archive is for

Every record here is meant to outlast its source. A ministry moves a PDF, an
act is repealed and its page is retired, a guideline is quietly replaced. The
archive holds its own copy of the text so the record can still be read and
cited after that happens. Three rules follow from it:

- **The copy lives in this repository.** `docs/*.json` carries the text, the
  URL it came from, the retrieval date and a SHA-256 over the exact stored
  text. Nothing is fetched at read time, so a dead link changes nothing.
- **The hash covers the copy, not the live document.** `npm run test:archive`
  re-hashes every stored text against the index, so an edited copy fails the
  build rather than passing silently. A record whose hash does not match says
  so on its own page.
- **A missing official copy is stated, not hidden.** Where the government no
  longer serves the text, the record says which copy was used and what it is
  (a state printing, a labelled reproduction, a machine reading of a scan).

A record that only points at a URL is an index entry, not a preserved
document: programme pages and releases say so in `coverage`, and the page
prints the same warning.

`index.json` is generated. Do not hand-edit it.

```sh
npm run build:archive
```

To add a department, add a snapshot to `docs/` with:

```json
{
  "id": "in-example-act-2026",
  "title": "The Example Act, 2026",
  "issuer": "Parliament of India",
  "source": "parliament",
  "kind": "statute",
  "date": "1 January 2026",
  "dateISO": "2026-01-01",
  "sourceUrl": "https://example.gov.in/act.pdf",
  "status": "In force.",
  "summary": "One sentence on what the instrument does.",
  "coverage": "full-text",
  "note": "What part of the instrument this snapshot holds.",
  "text": "The pinned text.",
  "hash": "sha256:...",
  "words": 1234,
  "retrieved": "2026-10-27"
}
```

A record may also name the records it follows, which is how the archive carries
a chain instead of a shelf:

```json
"follows": ["in-nhp-2002"]
```

The build derives the other direction into `followedBy`, so the two edges can
never disagree. A `follows` id that is not in the register fails the build.

Then run the build. It validates the source, the kind, the coverage, the doc
path and the hash before it writes `index.json`.

## The amendment ledger

A consolidated Indian statute prints its own history in footnotes:

> 1. Subs. by Act 24 of 2019, s. 2, for "for a term of five years from the
>    date on which he enters upon his office" (w.e.f. 24-10-2019).

Each footnote is one patch, and `src/lib/legal/ledger.js` reads them: the
amending instrument, that instrument's section, the operation, the words it
replaced, and the date it took effect. The record page prints the result as an
amendment history, newest first, with the raw footnote behind a disclosure so
the row can be checked against the text.

The parser follows two rules. Every footnote-starting line becomes a row, so a
field it cannot read is a partial row rather than a missing one; and it never
interprets the amendment, so it does not claim to show the statute as it stood
before a patch.

A statute that amends another names it in the doc:

```json
"amends": "in-rti-act-2005"
```

The build refuses an `amends` that points at nothing or at a record that is not
a statute, and derives `amendedBy` on the principal so both directions agree.
When the amending Act is held, the build also stores the section map it prints
("in section 13"), and the ledger row on the principal can then say which
section changed. With the RTI Act the four 2019 patches resolve to sections 13,
16 and 27.

The three wage statutes resolve no targets, and that is deliberate. Their
prints gather footnotes in blocks at the foot of each page, and extraction
strips the reference marks, so a note's position says nothing about the section
it amends. Note 7 of the Payment of Wages print sits under section 5 and amends
section 6 (a Kerala amendment): reading the target off the page would attach a
2017 proviso to the wrong section. Resolving these rows needs a witness outside
the page — the amending Act, whose own text names the section, or an earlier
text of the principal Act, where the words a note quotes can be found in their
section. Neither is held for the wage statutes yet.

## Versions and checkout

An earlier text of the same statute names the record it is a version of, and
the date of its own text:

```json
"versionOf": "in-rti-act-2005",
"asOf": "2011-02-01"
```

`asOf` is the date of the *text*, not of the Act. The RTI Act is dated 15 June
2005, and the archive holds two texts of it: consolidated to 1 February 2011 and
to 18 November 2025. A record's `date` stays the instrument's date, so a
twenty-year-old Act does not read as if it were enacted twice. The build orders
the group by `asOf`, refuses a version dated on or after the text it is a
version of, and gives every member the list, so either page can open the other.

With an earlier text and a ledger that names sections, a record can check out a
section as it stood before the patch. `src/lib/legal/versions.js` finds a
section by taking the occurrence that has text under it — a bare Act prints its
headings twice, once in the contents and once in the body — and the record page
shows the before and after side by side with a vocabulary overlap. The overlap
is not a verdict: the 2011 copy is a scan, so part of the distance is OCR, and
the page says so rather than claiming the law changed where it did not.

Checkout is deliberately scoped to the sections the ledger names. It does not
reconstruct the older text by reversing amendments: two of the 2019 patches
replace whole sub-sections whose earlier wording the consolidation never prints,
so a reconstruction would be a guess. Holding an earlier official text is the
honest alternative, and where the archive has not collected one, the page has
nothing to check out.

## The historical spine

The register holds each document on its own terms, but the useful depth is the
chain: an originating statute, the rules under it, and the instrument that
replaced it. The spine currently carries:

- MGNREGA 2005 → the VB-G RAM G Act, 2025 → the 2026 notification that
  brought it into force. The 2005 Act is held because the programme page it
  sits behind is already a summary of a dead statute, and the government's own
  copies no longer resolve. The successor and the notification that sets the
  repeal date are held too, so the chain does not stop at a claim in prose.
- Payment of Wages 1936, Minimum Wages 1948, Payment of Bonus 1965 and Equal
  Remuneration 1976 → the Code on Wages 2019, which repealed all four.
- National Health Policy 2002 → National Health Policy 2017.
- National Strategy for Artificial Intelligence 2018 → Responsible AI for All
  2021 → India AI Governance Guidelines 2025.

Where a government copy is no longer served, the record says so: the Equal
Remuneration text is a labelled reproduction, and the MGNREGA text is a machine
reading of the Gazette scan, artefacts included.
