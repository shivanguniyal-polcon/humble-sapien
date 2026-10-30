// The JSON response shape shared by the Workers with an HTTP surface.
//
// Each Worker used to carry its own copy of these helpers. That is not only
// duplicated code: the copies drifted. The RARA store echoed internal error
// messages that the places API refused to, and the token check existed twice.
// A single copy is the only version that a fix reaches everywhere.

export const JSON_TYPE = 'application/json; charset=utf-8';

export const originOf = (env) => env.ALLOWED_ORIGIN || '*';

// A response carries one allowed origin, but a deployment may need several:
// the live site, a workers.dev address, localhost during development.
// ALLOWED_ORIGIN takes a comma-separated list; this picks the caller when it
// is on the list and leaves everyone else on the first entry, so the header is
// never widened to a wildcard.
export const withOrigin = (request, env) => {
  const allowed = String(env.ALLOWED_ORIGIN || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowed.length || allowed.includes('*')) return env;
  const caller = request.headers.get('origin');
  return { ...env, ALLOWED_ORIGIN: caller && allowed.includes(caller) ? caller : allowed[0] };
};

export const headers = (env, extra = {}) => ({
  'content-type': JSON_TYPE,
  'access-control-allow-origin': originOf(env),
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'cache-control': 'no-store',
  ...extra,
});

export const json = (body, status, env, extra) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: headers(env, extra) });

export const failure = (status, code, message, env) => json({ error: { code, message } }, status, env);

// A 5xx belongs to us, not the caller. Its message can name a table, a binding
// or a SQL fragment, so callers get a sentence and the detail goes to the log.
// A 4xx was caused by the request, and its message is the useful part.
export const failureFor = (error, env, message = 'The request failed.') => {
  const status = Number(error?.status) || 500;
  if (status >= 500) return failure(status, 'failed', message, env);
  return failure(status, 'invalid', error?.message || 'The request was not accepted.', env);
};
