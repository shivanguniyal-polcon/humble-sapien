// The Legal Simplifier API.
//
// This is the same engine the browser runs, exposed as an HTTP API. Not a
// reimplementation, not a wrapper around a model: `src/lib/legal/pipeline.js`
// and its neighbours are imported directly, so a request here and a request in
// the browser produce byte-identical output for the same input. That is the
// whole point — the audit manifest only means something if the two surfaces
// are the same surface.
//
// The API is stateless and takes no credentials. It holds no data after a
// request ends, keeps no accounts, and reads no user files. What it computes
// is computed in the request and thrown away. That is why it can be a public
// endpoint with no auth surface at all.
//
// Deploy: wrangler deploy (see wrangler.toml). Every route is under /v1 so
// the contract can move to /v2 without breaking a pinned integration.

import { analyse, compare, JURISDICTIONS, PIPELINE_VERSION, DEFAULT_JURISDICTION } from '../src/lib/legal/pipeline.js';
import { DICTIONARY_VERSION } from '../src/lib/legal/glossary.js';
import {
  buildManifest, buildBundle, buildMarkdown, buildHtml, buildRedlineCsv,
  buildDeltaReport, methodologyCard, LEGAL_GATE_QUESTIONS, checkLegalGate,
  MANIFEST_VERSION,
} from '../src/lib/legal/exports.js';
import { buildDocx, docxFileName } from '../src/lib/legal/docx.js';
import { buildClientBriefText, buildClientBriefHtml } from '../src/lib/legal/clientBrief.js';
import {
  buildReviewFile, parseReviewFile, reviewCounts, exportedRows, rejectedRows,
  REVIEW_FILE_SCHEMA,
} from '../src/lib/legal/review.js';
import { currencyCheck } from '../src/lib/legal/currency.js';

export const API_VERSION = 'v1';

// ---- the response helpers -------------------------------------------------

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      ...extraHeaders,
    },
  });

const error = (status, message, detail = null) =>
  json({ error: { status, message, ...(detail ? { detail } : {}) } }, status);

// ---- the routes -----------------------------------------------------------

const INDEX = {
  name: 'THS Legal Simplifier API',
  version: API_VERSION,
  engine: PIPELINE_VERSION,
  dictionary: DICTIONARY_VERSION,
  manifest: MANIFEST_VERSION,
  description:
    'Plain-language legal output with a defensible audit trail. Stateless, credential-free, and byte-identical to the browser engine.',
  limitations:
    'Not legal advice. Not a certification that a source is current or in force. Not a guarantee that a rewrite means the same thing in every case.',
  routes: {
    'GET /v1/': 'This index.',
    'GET /v1/health': 'Engine, dictionary and manifest versions.',
    'GET /v1/jurisdictions': 'The source registers and their readability targets.',
    'GET /v1/gate': 'The four questions an export is gated on.',
    'POST /v1/analyse': 'Rewrite a source text sentence by sentence, with flags and confidence.',
    'POST /v1/manifest': 'The audit manifest for a run: four hashes and the review counts.',
    'POST /v1/export': 'A finished artefact. format: bundle | markdown | html | docx | csv | brief | brief-html | method.',
    'POST /v1/review-file': 'A review file: source, gate answers, sentence decisions, two hashes.',
    'POST /v1/review-file/parse': 'Read a review file back and report what is wrong with it, if anything.',
    'POST /v1/compare': 'The plain-language delta between two versions of the same instrument.',
  },
  // The engine runs entirely in the request. Nothing is stored, no account is
  // needed, and no input is retained after the response is returned.
  guarantees: [
    'Identical engine across every tier — the same code the browser runs.',
    'Deterministic: the same input, jurisdiction and dictionary give the same output hash.',
    'No telemetry, no retention, no account.',
    'Source text travels with the rewrite in every export.',
  ],
};

const health = () => ({
  status: 'ok',
  version: API_VERSION,
  engine: PIPELINE_VERSION,
  dictionary: DICTIONARY_VERSION,
  manifest: MANIFEST_VERSION,
  jurisdictions: JURISDICTIONS.map((j) => j.id),
});

const jurisdictions = () => ({
  default: DEFAULT_JURISDICTION,
  jurisdictions: JURISDICTIONS.map((j) => ({
    id: j.id,
    label: j.label,
    short: j.short,
    note: j.note,
    citationFormat: j.citationFormat,
    readability: j.readability,
    dictionaryVersion: DICTIONARY_VERSION,
  })),
});

// The request body, read once and validated. Every error is a real message
// rather than a 500: a caller who sends the wrong shape should be told which
// field was wrong.
const readBody = async (request, { requireText = true } = {}) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: 'The request body is not valid JSON.' };
  }
  if (!body || typeof body !== 'object') {
    return { error: 'The request body must be a JSON object.' };
  }
  if (requireText) {
    if (typeof body.text !== 'string' || body.text.trim().length === 0) {
      return { error: 'A non-empty `text` string is required.' };
    }
    if (body.text.length > 2_000_000) {
      return { error: 'That text is too long for one request: the limit is 2,000,000 characters.' };
    }
  }
  return { body };
};

const runAnalysis = (body) => {
  const jurisdictionId = typeof body.jurisdictionId === 'string' ? body.jurisdictionId : DEFAULT_JURISDICTION;
  if (!JURISDICTIONS.some((j) => j.id === jurisdictionId)) {
    return { error: `Unknown jurisdictionId "${jurisdictionId}". Use GET /v1/jurisdictions to list the registers.` };
  }
  const source = body.source && typeof body.source === 'object' ? body.source : {};
  return {
    result: analyse(body.text, {
      jurisdictionId,
      mode: typeof body.mode === 'string' ? body.mode : 'legal-review',
      source: {
        title: String(source.title || ''),
        citation: String(source.citation || ''),
        version: String(source.version || ''),
        date: String(source.date || ''),
        url: String(source.url || ''),
        reviewer: String(source.reviewer || ''),
      },
    }),
    jurisdictionId,
    source,
  };
};

// The full analysis payload. This is the shape a client integrates against:
// rows carry the source span, the rewrite, the flag, the confidence and the
// reasons, so a caller can render the same ledger the browser shows.
//
// The currency check is computed here rather than carried on the result,
// because the engine itself does not know what day it is — `analyse` is a
// pure function of the text and the register. The API is the place that
// knows the clock, so the API is the place that asks how old the source is.
const analysePayload = (result) => ({
  engine: result.pipelineVersion,
  dictionaryVersion: result.dictionaryVersion,
  jurisdiction: result.jurisdiction,
  jurisdictionId: result.jurisdictionId,
  mode: result.mode,
  source: result.source,
  stats: result.stats,
  summary: result.summary,
  confidence: result.confidence,
  readability: result.readability,
  definitions: result.definitions,
  currency: currencyCheck(result.source),
  warnings: result.warnings,
  flagMeaning: result.flagMeaning,
  counts: { sentences: result.rows.length, exported: result.rows.length, rejected: 0 },
  rows: result.rows.map((r) => ({
    id: r.id,
    index: r.index,
    start: r.start,
    end: r.end,
    clause: r.clause,
    type: r.type,
    typeLabel: r.typeLabel,
    typeNote: r.typeNote,
    parts: r.parts,
    part: r.part,
    flag: r.flag,
    sourceText: r.sourceText,
    plain: r.plain,
    terms: r.terms,
    blocked: r.blocked,
    changes: r.changes,
    reasons: r.reasons,
    confidence: r.confidence,
  })),
});

// ---- the export formats ---------------------------------------------------

const FORMATS = {
  bundle: { type: 'text/plain; charset=utf-8', ext: 'txt', build: (r, o) => buildBundle(r, o) },
  markdown: { type: 'text/markdown; charset=utf-8', ext: 'md', build: (r, o) => buildMarkdown(r, o) },
  html: { type: 'text/html; charset=utf-8', ext: 'html', build: (r, o) => buildHtml(r, o) },
  docx: {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    build: (r, o) => buildDocx(r, o),
  },
  csv: { type: 'text/csv; charset=utf-8', ext: 'csv', build: (r, o) => buildRedlineCsv(r, o) },
  brief: { type: 'text/plain; charset=utf-8', ext: 'txt', build: (r, o) => buildClientBriefText(r, o) },
  'brief-html': { type: 'text/html; charset=utf-8', ext: 'html', build: (r, o) => buildClientBriefHtml(r, o) },
  method: { type: 'text/plain; charset=utf-8', ext: 'txt', build: (r, o) => methodologyCard(r, o.manifest) },
};

// ---- the handler ----------------------------------------------------------

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    // CORS preflight. There is no auth to negotiate, so this is formality.
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    try {
      // ---- GET ----
      if (method === 'GET') {
        if (path === '/' || path === '/v1') return json(INDEX);
        if (path === '/v1/health') return json(health());
        if (path === '/v1/jurisdictions') return json(jurisdictions());
        if (path === '/v1/gate') {
          return json({
            questions: LEGAL_GATE_QUESTIONS,
            note: 'An export is gated on all four being answered. The API will export anyway if you force it, but the artefact will say so on its face.',
          });
        }
        return error(404, `No route for GET ${path}. See GET /v1/ for the index.`);
      }

      if (method !== 'POST') {
        return error(405, `${method} is not supported. Use GET or POST.`);
      }

      // ---- POST ----
      if (path === '/v1/analyse') {
        const { body, error: err } = await readBody(request);
        if (err) return error(400, err);
        const run = runAnalysis(body);
        if (run.error) return error(400, run.error);
        return json(analysePayload(run.result));
      }

      if (path === '/v1/manifest') {
        const { body, error: err } = await readBody(request);
        if (err) return error(400, err);
        const run = runAnalysis(body);
        if (run.error) return error(400, run.error);
        const gate = body.gate && typeof body.gate === 'object' ? body.gate : null;
        const review = body.review && typeof body.review === 'object' ? body.review : null;
        const manifest = await buildManifest(run.result, { gate, review });
        return json({
          ...manifest,
          reviewGate: checkLegalGate(gate),
          counts: reviewCounts(run.result, review),
          exported: exportedRows(run.result, review).length,
          rejected: rejectedRows(run.result, review).length,
          currency: currencyCheck(run.result.source),
        });
      }

      if (path === '/v1/export') {
        const { body, error: err } = await readBody(request);
        if (err) return error(400, err);
        const format = typeof body.format === 'string' ? body.format : 'bundle';
        const spec = FORMATS[format];
        if (!spec) {
          return error(400, `Unknown format "${format}". Use one of: ${Object.keys(FORMATS).join(', ')}.`);
        }
        const run = runAnalysis(body);
        if (run.error) return error(400, run.error);
        const gate = body.gate && typeof body.gate === 'object' ? body.gate : null;
        const review = body.review && typeof body.review === 'object' ? body.review : null;
        const manifest = await buildManifest(run.result, { gate, review });

        // A review gate that is not answered does not block the API — the
        // caller may be an internal tool — but the artefact must not look
        // like a signed-off document when it is not. Every format carries
        // the gate answers, and a missing answer is printed as unanswered.
        const gateCheck = checkLegalGate(gate);
        const artefact = spec.build(run.result, {
          gate,
          manifest,
          review,
          author: typeof body.author === 'string' ? body.author : 'THS Legal Simplifier API',
          date: body.date,
        });

        const name =
          format === 'docx'
            ? docxFileName(run.result)
            : `ths-review.${spec.ext}`;

        const headers = {
          'content-type': spec.type,
          'access-control-allow-origin': '*',
          'content-disposition': `attachment; filename="${name}"`,
          'x-ths-engine': PIPELINE_VERSION,
          'x-ths-dictionary': `${run.result.jurisdictionId}@${run.result.dictionaryVersion}`,
          'x-ths-output-hash': manifest.outputHash,
          'x-ths-signoff-hash': manifest.signOffHash,
          'x-ths-gate-complete': String(gateCheck.complete),
        };
        if (artefact instanceof Uint8Array) {
          return new Response(artefact, { status: 200, headers });
        }
        return new Response(String(artefact), { status: 200, headers });
      }

      if (path === '/v1/review-file') {
        const { body, error: err } = await readBody(request);
        if (err) return error(400, err);
        const run = runAnalysis(body);
        if (run.error) return error(400, run.error);
        const gate = body.gate && typeof body.gate === 'object' ? body.gate : null;
        const review = body.review && typeof body.review === 'object' ? body.review : null;
        const matter = body.matter && typeof body.matter === 'object' ? body.matter : null;
        const raw = await buildReviewFile(run.result, { gate, review, matter });
        return json(JSON.parse(raw), 200, {
          'x-ths-schema': REVIEW_FILE_SCHEMA,
          'content-disposition': 'attachment; filename="ths-review-file.json"',
        });
      }

      if (path === '/v1/review-file/parse') {
        const { body, error: err } = await readBody(request, { requireText: false });
        if (err) return error(400, err);
        const raw = typeof body.reviewFile === 'string' ? body.reviewFile : JSON.stringify(body.reviewFile ?? body);
        const parsed = await parseReviewFile(raw);
        if (!parsed.ok) return error(400, parsed.error);
        return json({
          ok: true,
          warnings: parsed.warnings,
          source: parsed.source,
          matter: parsed.matter,
          gate: parsed.gate,
          review: parsed.review,
          counts: parsed.counts,
          engine: parsed.engine,
          dictionary: parsed.dictionary,
          exportedAt: parsed.exportedAt,
          sourceHash: parsed.sourceHash,
          signOffHash: parsed.signOffHash,
        });
      }

      if (path === '/v1/compare') {
        const { body, error: err } = await readBody(request, { requireText: false });
        if (err) return error(400, err);
        if (typeof body.previous !== 'string' || typeof body.current !== 'string') {
          return error(400, 'Both `previous` and `current` strings are required.');
        }
        const run = runAnalysis({ ...body, text: body.current });
        if (run.error) return error(400, run.error);
        const delta = compare(body.previous, body.current, {
          jurisdictionId: run.jurisdictionId,
          source: run.source,
        });
        return json({
          method: delta.method,
          counts: delta.counts,
          readability: {
            before: delta.before.readability,
            after: delta.after.readability,
          },
          changes: delta.changes.map((c) => ({
            status: c.status,
            clause: c.clause,
            type: c.type,
            flag: c.flag,
            before: c.before ? { text: c.before.text, plain: c.before.plain } : null,
            after: c.after ? { text: c.after.text, plain: c.after.plain } : null,
            reasons: c.reasons || [],
          })),
          report: buildDeltaReport(delta),
        });
      }

      return error(404, `No route for POST ${path}. See GET /v1/ for the index.`);
    } catch (e) {
      // A thrown error is a bug in the engine or an input the validator
      // missed. Say which, and never leak a stack trace to a caller.
      return error(500, 'The request could not be processed.', e && e.message ? String(e.message) : null);
    }
  },
};

export { INDEX, FORMATS, analysePayload, health, jurisdictions };
