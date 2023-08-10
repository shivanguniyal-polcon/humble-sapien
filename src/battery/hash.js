// Determinism utilities. The audit manifest is only meaningful if the same
// object always produces the same bytes: canonical JSON with sorted keys, and
// SHA-256 over those bytes.

export function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJSON).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .filter((k) => value[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJSON(value[k])}`)
    .join(',')}}`;
}

async function getSubtle() {
  if (globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto.subtle;
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.webcrypto.subtle;
}

export async function sha256Hex(text) {
  const subtle = await getSubtle();
  const bytes = new TextEncoder().encode(text);
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashObject(value) {
  return sha256Hex(canonicalJSON(value));
}
