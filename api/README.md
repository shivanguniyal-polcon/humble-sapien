# THS Legal Simplifier API

**Version `v1`** · engine `ths-legal-simplifier-1.0.0` · manifest `ths-legal-manifest-1.1.0`

Plain-language legal output with a defensible audit trail, over HTTP.

This is the same engine the browser runs. Not a reimplementation, not a wrapper
around a model: `src/lib/legal/` is imported directly, so a request here and a
request in the browser produce **byte-identical output** for the same input. That
identity is tested (`scripts/test-api.mjs`), and it is the only reason the audit
manifest means anything.

The API is **stateless and credential-free**. It holds no data after a request
ends, keeps no accounts, reads no user files, and runs no telemetry. There is no
auth surface because there is nothing to protect: the engine is a pure function
and your text is computed and discarded.

> **Not legal advice.** Not a certification that a source is current or in force.
> Not a guarantee that a rewrite means the same thing in every case. Every export
> carries the source text with the rewrite, and every red-flagged sentence needs a
> qualified lawyer before it leaves the building.

---

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/v1/` | The index. Routes, versions, guarantees, limitations. |
| GET | `/v1/health` | Engine, dictionary and manifest versions. |
| GET | `/v1/jurisdictions` | The source registers and their readability targets. |
| GET | `/v1/gate` | The four questions an export is gated on. |
| POST | `/v1/analyse` | Rewrite a source text sentence by sentence, with flags and confidence. |
| POST | `/v1/manifest` | The audit manifest: four hashes and the review counts. |
| POST | `/v1/export` | A finished artefact, in one of eight formats. |
| POST | `/v1/review-file` | A review file: source, gate answers, sentence decisions, two hashes. |
| POST | `/v1/review-file/parse` | Read a review file back and report what is wrong with it. |
| POST | `/v1/compare` | The plain-language delta between two versions of an instrument. |

---

## `POST /v1/analyse`

```json
{
  "text": "Section 4. The Central Government may, by notification in the Official Gazette, make rules…",
  "jurisdictionId": "in-bare-act",
  "mode": "legal-review",
  "source": {
    "title": "Community Records Act, 2026",
    "citation": "Act No. 00 of 2026",
    "version": "as amended to date",
    "date": "2026-01-15",
    "url": "https://…",
    "reviewer": "A. Reviewer, Advocate"
  }
}
```

`text` is required and must be non-empty. `jurisdictionId` defaults to
`in-bare-act`; `GET /v1/jurisdictions` lists the registers. `source` is optional
but every export reads better with it — a reviewer who cannot name the instrument
cannot defend the rewrite.

The response carries `rows`, and each row carries:

| Field | Meaning |
|---|---|
| `id`, `index` | Sentence identity and order |
| `start`, `end` | Character offsets into `text` — provenance back to the source |
| `clause` | Clause reference where the source carries one |
| `type`, `typeLabel`, `typeNote` | The clause type and what it means |
| `flag` | `green` literal · `amber` interpretive · `red` legal judgement |
| `sourceText`, `plain` | The source sentence and its rewrite |
| `terms` | Defined terms the sentence leans on, left as drafted |
| `blocked` | Rules a defined term stopped from firing |
| `changes` | The dictionary rules that fired, with risk |
| `reasons` | Why the sentence carries that flag |
| `confidence` | `{ level, label, meaning, reasons, unresolved, informational, verify, verifyNote }` |

Plus `summary`, `confidence` (the histogram), `readability` (Flesch before and
after), `definitions`, `currency`, `warnings` and `flagMeaning`.

**Two axes, deliberately independent.** `flag` is legal effect: does the rewrite
change what the clause does. `confidence.level` is engine engagement: how much of
the sentence did the engine actually examine. A penalty clause rewritten
literally is `high` confidence and still `red`. Reading both is the job.

**Determinism.** The same `text`, `jurisdictionId` and dictionary give the same
`outputHash`, always. The `currency` field is the one exception — it asks how old
the source is *today*, so it moves with the clock. The hashes do not.

---

## `POST /v1/manifest`

Same body as `/v1/analyse`, plus optional `gate` and `review`.

```json
{
  "manifestVersion": "ths-legal-manifest-1.1.0",
  "engine": "ths-legal-simplifier-1.0.0",
  "sourceHash": "sha256:…",
  "inputHash": "…",
  "outputHash": "…",
  "signOffHash": "…",
  "confidence": { "high": 2, "medium": 4, "low": 11, "total": 17 },
  "review": { "accepted": 0, "rejected": 1, "pending": 16, "commented": 1, "exported": 16 },
  "reviewGate": { "complete": true, "missing": [] },
  "currency": { "stated": true, "date": "2026-01-15", "ageDays": 279, "stale": true, "statement": "…" }
}
```

**Four hashes, and each covers something different.** `sourceHash` is the source
text. `inputHash` is the text plus the register and dictionary. `outputHash` is
what the engine produced. `signOffHash` is what the *human* did — the four gate
answers and every sentence decision. A buyer can prove a named person signed a
file and not merely that the engine produced it.

---

## `POST /v1/export`

Same body, plus `format` and optional `author` / `date` for the DOCX.

| `format` | Content type | What you get |
|---|---|---|
| `bundle` | `text/plain` | The plain bundle: source, rewrite, flags, reasons, gate, methodology card |
| `markdown` | `text/markdown` | Tables and sections, confidence column included |
| `html` | `text/html` | A standalone, print-ready document with its own stylesheet |
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Real tracked changes — `<w:ins>` / `<w:del>`, accept-or-reject in Word |
| `csv` | `text/csv` | The redline pack: one row per rule that fired |
| `brief` | `text/plain` | The one-page client brief, in plain words |
| `brief-html` | `text/html` | The brief as a print-ready A4 document |
| `method` | `text/plain` | The methodology card on its own |

Response headers:

```
x-ths-engine: ths-legal-simplifier-1.0.0
x-ths-dictionary: in-bare-act@ths-statutory-1.0.0
x-ths-output-hash: 3f2a…
x-ths-signoff-hash: 9c81…
x-ths-gate-complete: true
content-disposition: attachment; filename="ths-review.html"
```

**The gate does not block the API.** An internal tool may export before a
reviewer has signed off — but an unanswered gate is reported in
`x-ths-gate-complete: false`, and the artefact prints `[not answered]` on its
face. Nothing is silently passed off as reviewed.

---

## `POST /v1/review-file` and `/v1/review-file/parse`

A review file is how a review travels between people with no account, no server
and no login. It carries the source text, the gate answers, every sentence
decision and two hashes.

```json
{
  "text": "…",
  "jurisdictionId": "in-bare-act",
  "gate": { "currency": "…", "definitions": "…", "reviewer": "…", "circulation": "…" },
  "review": { "r2": { "state": "rejected", "comment": "The proviso is not carried across." } },
  "matter": { "client": "Acme", "matterRef": "MAT-1", "reviewer": "A. Reviewer" }
}
```

Parsing is the safety net. It does not apply anything — it reports:

- a source text that does not match the hash recorded in the file (the file was
  edited or damaged in transit);
- a sign-off hash that does not match the answers and decisions it contains
  (someone edited one without the other);
- a schema this build does not read.

A tampered file is **caught and warned about**, never silently trusted.

---

## `POST /v1/compare`

```json
{ "previous": "…", "current": "…", "jurisdictionId": "in-bare-act", "source": { "title": "…" } }
```

Returns the alignment method, the counts, readability before and after, each
change with its before/after text in plain words, and a full `report` ready to
print.

---

## Errors

Errors are JSON and they say which field was wrong. A stack trace is never sent
to a caller.

```json
{ "error": { "status": 400, "message": "A non-empty `text` string is required." } }
```

| Status | When |
|---|---|
| 400 | Malformed JSON, a missing or empty `text`, an unknown `jurisdictionId`, an unknown `format`, an unparseable review file |
| 404 | No such route (the message points at `GET /v1/`) |
| 405 | Anything other than GET, POST or OPTIONS |
| 500 | A bug in the engine or a case the validator missed |

---

## Running it

The handler is a plain ES module with a `fetch` method, so it runs anywhere
Workers run, and it runs in Node for tests:

```js
import worker from './api/worker.js';
const res = await worker.fetch(new Request('https://api.example.test/v1/health'));
```

```bash
npm run test:api     # 125 checks against the live handler
npx wrangler deploy  # deploys api/worker.js
```

Local development against the browser site runs on `http://127.0.0.1:5173/`. The
API is a separate surface; it does not serve the site.

## What the API will not do

It will not tell you the law is correct, current, or in force. It will not tell
you the rewrite means the same thing in every case. It does not check the source
against the official gazette, and it does not check the amendment history. A
green flag means the rewrite was literal; it does not mean the sentence was
classified correctly. Every red sentence needs a qualified lawyer.
