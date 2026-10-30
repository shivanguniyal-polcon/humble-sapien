// Asking the deployment to read a scanned page.
//
// The API key never reaches the browser: the page image goes to the monitor
// Worker, which calls the provider with its own secret. A build without
// VITE_MONITOR_API has no endpoint, and the interface says so rather than
// offering a button that cannot work.

export const MONITOR_API = String(import.meta.env?.VITE_MONITOR_API || '').replace(/\/+$/, '');

export const ocrConfigured = () => Boolean(MONITOR_API);

const messageFor = (body, status) => {
  if (status === 429) {
    return body?.error?.message || 'The daily OCR allowance for this connection is used up. Try again tomorrow, or paste the text.';
  }
  if (status === 503) return 'OCR is not configured on this deployment. Paste the text, or set the provider secret.';
  return body?.error?.message || 'That page could not be read. Try again, or paste the text.';
};

export const ocrPage = async ({ image, mediaType = 'image/jpeg', page, signal, api = MONITOR_API, fetch: fetchImpl = fetch }) => {
  if (!api) {
    const error = new Error('OCR is not configured for this build.');
    error.code = 'not-configured';
    throw error;
  }
  // The endpoint expects the base64 payload, not the data: prefix.
  const payload = String(image).includes(',') ? String(image).slice(String(image).indexOf(',') + 1) : String(image);
  const response = await fetchImpl(`${api}/v1/ocr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: payload, mediaType, page }),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(messageFor(body, response.status));
    error.code = body?.error?.code || `http-${response.status}`;
    error.used = body?.used;
    error.limit = body?.limit;
    throw error;
  }
  return { text: String(body.text || '').trim(), provenance: body.provenance };
};
