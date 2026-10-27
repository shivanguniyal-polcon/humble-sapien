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
