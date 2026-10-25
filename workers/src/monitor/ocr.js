// A scanned page, read by a hosted model.
//
// Two providers are supported because two are enough to keep the seam:
//
//   replicate  — Replicate's GLM-OCR, one page per prediction (default)
//   openai     — any OpenAI-compatible vision endpoint, which covers a
//                self-hosted GLM-OCR or Unlimited-OCR behind vLLM
//
// The caller sends a JPEG/PNG data URL. What comes back is text and a
// provenance record: provider, model, version and the image hash. The text is
// machine-read and is labelled as such everywhere it is used.

export const OCR_VERSION = 'monitor-ocr-1';
export const OCR_PROVIDER_DEFAULT = 'replicate';
export const OCR_MODEL_DEFAULT = 'lucataco/glm-ocr';
export const OCR_MAX_BYTES = 2 * 1024 * 1024;
export const OCR_PROMPT = 'Transcribe every word on this document page in reading order. Return the text only, with no commentary and no markdown fences.';

const dataUrl = (image, mediaType) => `data:${mediaType || 'image/jpeg'};base64,${image}`;

const outputText = (output) => {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return output.join('\n');
  if (output && typeof output === 'object') return String(output.text || output.output || '');
  return '';
};

const replicate = async ({ env, image, mediaType, fetchImpl }) => {
  const token = env.REPLICATE_API_TOKEN;
  if (!token) {
    const error = new Error('OCR is not configured on this deployment.');
    error.code = 'ocr-not-configured';
    throw error;
  }
  const model = env.OCR_MODEL || OCR_MODEL_DEFAULT;
  const response = await fetchImpl(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'wait',
    },
    body: JSON.stringify({ input: { image: dataUrl(image, mediaType), mode: 'text' } }),
    signal: AbortSignal.timeout(60000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `OCR provider HTTP ${response.status}`);
  if (body.status && body.status !== 'succeeded') throw new Error(`OCR ${body.status}: ${body.error || 'no output'}`);
  const text = outputText(body.output).trim();
  if (!text) throw new Error('OCR returned no text');
  return { text, model, version: body.version || body.model || model, provider: 'replicate' };
};

const openaiCompatible = async ({ env, image, mediaType, fetchImpl }) => {
  const base = env.OCR_BASE_URL;
  const key = env.OCR_API_KEY;
  const model = env.OCR_MODEL;
  if (!base || !model) {
    const error = new Error('OCR is not configured on this deployment.');
    error.code = 'ocr-not-configured';
    throw error;
  }
  const response = await fetchImpl(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      ...(key ? { authorization: `Bearer ${key}` } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl(image, mediaType) } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(90000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `OCR provider HTTP ${response.status}`);
  const text = String(body.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('OCR returned no text');
  return { text, model, version: env.OCR_VERSION || model, provider: 'openai' };
};

export const ocrProviderConfigured = (env) => {
  const provider = (env.OCR_PROVIDER || OCR_PROVIDER_DEFAULT).toLowerCase();
  if (provider === 'openai') return Boolean(env.OCR_BASE_URL && env.OCR_MODEL);
  return Boolean(env.REPLICATE_API_TOKEN);
};

export const readPage = async ({ env, image, mediaType = 'image/jpeg', fetch: fetchImpl = fetch }) => {
  if (!image) {
    const error = new Error('No page image was sent.');
    error.code = 'no-image';
    throw error;
  }
  const approximate = Math.floor((String(image).length * 3) / 4);
  if (approximate > OCR_MAX_BYTES) {
    const error = new Error('That page image is too large.');
    error.code = 'image-too-large';
    throw error;
  }
  const provider = (env.OCR_PROVIDER || OCR_PROVIDER_DEFAULT).toLowerCase();
  const run = provider === 'openai' ? openaiCompatible : replicate;
  return run({ env, image, mediaType, fetchImpl });
};

// The provenance line the reader and the pack carry. The image is only kept
// when the deployment asks for it: by default the page never lands in R2.
export const storePage = async ({ bucket, env, image, day, sha256, mediaType = 'image/jpeg' }) => {
  if (env.OCR_STORE_IMAGES !== '1' || !bucket) return null;
  const extension = mediaType === 'image/png' ? 'png' : 'jpg';
  const key = `ocr/${day}/${sha256}.${extension}`;
  await bucket.put(key, Uint8Array.from(atob(image), (character) => character.charCodeAt(0)), {
    httpMetadata: { contentType: mediaType },
  });
  return key;
};

export const provenanceOf = ({ read, imageSha256, page, imageKey = null }) => ({
  page,
  provider: read.provider,
  model: read.model,
  version: read.version,
  engine: OCR_VERSION,
  imageSha256,
  imageKey,
  at: new Date().toISOString(),
});
