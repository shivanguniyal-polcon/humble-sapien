// The audit manifest: what was run, on what, with which parameters, and what
// came out. Hashes cover the canonical forms so any tampering is visible; the
// timestamp is metadata and is deliberately excluded from the output hash so
// identical runs produce identical stamps.

import { hashObject } from './hash.js';

export const BATTERY_VERSION = 'battery-1.0.0';

export async function buildManifest({ module, input, params, results }) {
  const [inputHash, paramHash, outputHash] = await Promise.all([
    hashObject(input),
    hashObject(params),
    hashObject(results),
  ]);
  return {
    engine: BATTERY_VERSION,
    module,
    createdAt: new Date().toISOString(),
    inputHash,
    paramHash,
    outputHash,
  };
}

// Reproduction check: recompute the three hashes and compare with a stored
// manifest. Returns which legs match.
export async function verifyManifest(manifest, { input, params, results }) {
  const fresh = await buildManifest({
    module: manifest.module,
    input,
    params,
    results,
  });
  return {
    inputMatches: fresh.inputHash === manifest.inputHash,
    paramsMatch: fresh.paramHash === manifest.paramHash,
    outputMatches: fresh.outputHash === manifest.outputHash,
    engineMatches: fresh.engine === manifest.engine,
  };
}
