// The distributional arithmetic behind Sutra, kept free of React so the
// verdict can be tested on its own.
//
// Two rules matter. Power is weighted by magnitude, because a severe effect on
// a low-power group is not the same claim as a mild effect on a high-power
// group. And a mixed party is not a neutral party: it both gains and bears a
// cost, so it is counted separately rather than folded into either average or
// treated as having no effect.

const STORAGE_KEY = 'ths:sutra:v1';

const asObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const DIRECTIONS = new Set(['benefits', 'mixed', 'restricted', 'neutral']);
const text = (value) => String(value ?? '');
const boundedScore = (value) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(5, Math.max(1, number)) : 1;
};

// Saved rows are untrusted input from localStorage: clamp the scores, keep the
// direction inside the four known values, and never let a missing name become
// an unlabelled row in the ledger.
const cleanAddedRow = (row) => ({
  name: text(row.name).trim() || 'Unnamed party',
  role: text(row.role),
  effect: DIRECTIONS.has(row.effect) ? row.effect : 'neutral',
  magnitude: boundedScore(row.magnitude),
  power: boundedScore(row.power),
  added: true,
  mechanism: text(row.mechanism),
  evidence: text(row.evidence),
  counter: text(row.counter),
});

const asRowsMap = (value) =>
  Object.fromEntries(
    Object.entries(asObject(value))
      .filter(([, rows]) => Array.isArray(rows))
      .map(([policyId, rows]) => [
        policyId,
        rows.filter((row) => row && typeof row === 'object').map(cleanAddedRow),
      ]),
  );

const asEditsMap = (value) =>
  Object.fromEntries(
    Object.entries(asObject(value)).map(([key, patch]) => [key, asObject(patch)]),
  );

const CUSTOM_ID = /^custom-[a-z0-9-]{6,64}$/;
const thisYear = () => new Date().getFullYear();

const cleanYear = (value) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number >= 1900 && number <= 2100
    ? number
    : thisYear();
};

// A reader-built map is metadata plus an empty ledger. Its parties live in the
// same `added` bucket as additions to the seeded maps, so one editing path
// serves both and the published record is never mutated.
const cleanPolicy = (value) => {
  const id = text(value?.id).trim();
  if (!CUSTOM_ID.test(id)) return null;
  return {
    id,
    name: text(value.name).trim() || 'Untitled policy',
    year: cleanYear(value.year),
    strap: text(value.strap),
    question: text(value.question),
    sources: [],
    custom: true,
    stakeholders: [],
  };
};

const asPolicies = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map(cleanPolicy).filter((policy) => {
    if (!policy || seen.has(policy.id)) return false;
    seen.add(policy.id);
    return true;
  });
};

export function createBlankPolicy({ name = 'Untitled policy', year = thisYear() } = {}) {
  const token = (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  )
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 32)
    .toLowerCase();
  return cleanPolicy({ id: `custom-${token}`, name, year });
}

const SHARE_VERSION = 1;
const SHARE_MAX_ROWS = 200;

// The link carries the map itself, not a pointer to a server. Base64url keeps
// it inside one query value without escaping, and TextEncoder handles notes in
// any language.
const toBase64Url = (value) => {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return globalThis.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const fromBase64Url = (value) => {
  const raw = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error('Not a share token');
  const standard = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  const binary = globalThis.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
};

// A shared link is a snapshot of the whole map: metadata, parties and their
// notes. Only reader-built maps can travel this way; the seeded record stays
// published and unchanged.
export function serializeSharedMap(policy, rows) {
  if (!policy?.custom || !Array.isArray(rows) || rows.length > SHARE_MAX_ROWS) {
    return null;
  }
  try {
    return toBase64Url(JSON.stringify({
      v: SHARE_VERSION,
      policy: {
        id: policy.id,
        name: policy.name,
        year: policy.year,
        strap: policy.strap,
        question: policy.question,
      },
      rows: rows.map((row) => ({
        name: row.name,
        role: row.role,
        effect: row.effect,
        magnitude: row.magnitude,
        power: row.power,
        mechanism: row.mechanism,
        evidence: row.evidence,
        counter: row.counter,
      })),
    }));
  } catch {
    return null;
  }
}

// A link is untrusted input. The same cleaning used for saved rows applies here,
// and a bad version, id, payload or row count is rejected rather than guessed
// at.
export function parseSharedMap(value) {
  if (!value) return null;
  try {
    const data = JSON.parse(fromBase64Url(value));
    if (data?.v !== SHARE_VERSION) return null;
    const policy = cleanPolicy(data.policy);
    if (!policy) return null;
    if (data.rows != null && !Array.isArray(data.rows)) return null;
    const inputRows = data.rows ?? [];
    if (inputRows.length > SHARE_MAX_ROWS) return null;
    return {
      policy,
      rows: inputRows
        .filter((row) => row && typeof row === 'object')
        .map(cleanAddedRow),
    };
  } catch {
    return null;
  }
}

// Importing a link is idempotent: the same shared id replaces the earlier
// import instead of adding a second copy. Local edits made on top of an earlier
// import are discarded, because the link is the version being opened.
export function mergeSharedMap(saved, shared) {
  if (!shared?.policy) return saved;
  const policies = saved?.policies ?? [];
  const exists = policies.some((policy) => policy.id === shared.policy.id);
  const edits = { ...(saved?.edits ?? {}) };
  Object.keys(edits).forEach((key) => {
    if (key.startsWith(`${shared.policy.id}:`)) delete edits[key];
  });
  return {
    ...saved,
    policies: exists
      ? policies.map((policy) => (
        policy.id === shared.policy.id ? shared.policy : policy
      ))
      : [...policies, shared.policy],
    edits,
    added: { ...(saved?.added ?? {}), [shared.policy.id]: shared.rows ?? [] },
  };
}

// The magnitude-weighted average power of a set of rows. Returns null for an
// empty set, not zero: no reading is not the same as a reading of zero.
export function weightedPower(rows) {
  const totalMagnitude = rows.reduce((sum, row) => sum + Number(row.magnitude || 0), 0);
  if (!totalMagnitude) return null;
  return rows.reduce(
    (sum, row) => sum + Number(row.power || 0) * Number(row.magnitude || 0),
    0,
  ) / totalMagnitude;
}

export const formatPower = (value) =>
  value == null || Number.isNaN(value) ? 'n/a' : Number(value).toFixed(1);

const mixedNote = (mixed) =>
  mixed.length
    ? ` ${mixed.length} mixed ${mixed.length === 1 ? 'party is' : 'parties are'} counted separately, because ${mixed.length === 1 ? 'it both gains and bears a cost' : 'they both gain and bear a cost'}.`
    : '';

const neutralNote = (neutral) =>
  neutral.length
    ? ` ${neutral.length} neutral ${neutral.length === 1 ? 'party has' : 'parties have'} no direction.`
    : '';

// The verdict compares magnitude-weighted power, not headcount and not raw
// averages. Mixed and neutral parties are named, never silently dropped.
export function summarizeRows(rows) {
  const benefited = rows.filter((row) => row.effect === 'benefits');
  const restricted = rows.filter((row) => row.effect === 'restricted');
  const mixed = rows.filter((row) => row.effect === 'mixed');
  const neutral = rows.filter((row) => row.effect === 'neutral');
  const avgBen = weightedPower(benefited);
  const avgRes = weightedPower(restricted);
  const avgMixed = weightedPower(mixed);
  const tail = mixedNote(mixed) + neutralNote(neutral);

  let verdict;
  if (benefited.length + restricted.length === 0) {
    verdict = `The map has no directional readings yet. Set a direction in the ledger to generate the verdict.${tail}`;
  } else if (!benefited.length || !restricted.length) {
    verdict = `The map is one-sided: ${benefited.length ? 'only gains are recorded' : 'only restrictions are recorded'}. A distributional verdict needs both directions on the page.${tail}`;
  } else if (avgBen > avgRes + 0.75) {
    verdict = `On this reading the benefits flow to stakeholders with more power over the policy (magnitude-weighted average power ${formatPower(avgBen)} of 5) than those restricted by it (${formatPower(avgRes)}). The distribution and the design point the same way.${tail}`;
  } else if (avgRes > avgBen + 0.75) {
    verdict = `On this reading the costs land on the more powerful stakeholders (magnitude-weighted average power ${formatPower(avgRes)} of 5) while those who gain hold less of the design (${formatPower(avgBen)}). That is a policy that spends political capital on redistribution.${tail}`;
  } else {
    verdict = `On this reading benefits and restrictions are spread across similar levels of power (magnitude-weighted averages ${formatPower(avgBen)} and ${formatPower(avgRes)} of 5). The distributional story here is about scope, not direction.${tail}`;
  }

  return { benefited, restricted, mixed, neutral, avgBen, avgRes, avgMixed, verdict };
}

// The three public interest answers, drafted from what the ledger computed.
// They carry the weighting rule in the sentence, so a reader cannot mistake the
// average for a simple headcount.
export function buildPitAnswers(rows, {
  extraCount = 0,
  summary = summarizeRows(rows),
  custom = false,
} = {}) {
  const { benefited, restricted, mixed, neutral, avgBen, avgRes, verdict } = summary;

  const separate = [
    mixed.length ? `${mixed.length} mixed` : '',
    neutral.length ? `${neutral.length} neutral` : '',
  ].filter(Boolean).join(' and ');

  const sizeLine = custom
    ? `This reader-built map records ${rows.length} ${rows.length === 1 ? 'party' : 'parties'}.`
    : `This ledger maps ${rows.length} parties${extraCount > 0 ? `, of which ${extraCount} ${extraCount === 1 ? 'was' : 'were'} added in this browser` : ' from the published record'}.`;

  return {
    whoBenefits: benefited.length
      ? `Recorded as gaining: ${benefited.map((row) => row.name).join(', ')}.${avgBen != null ? ` Magnitude-weighted power over the policy: ${formatPower(avgBen)} of 5.` : ''}`
      : 'The ledger records no gains yet: nobody on it is named as benefiting from this policy as designed.',
    whoPays: restricted.length
      ? `Recorded as restricted: ${restricted.map((row) => row.name).join(', ')}.${avgRes != null ? ` Magnitude-weighted power over the policy: ${formatPower(avgRes)} of 5.` : ''}`
      : 'The ledger records no restrictions yet: nobody on it is named as paying for this policy.',
    whoMissing: `${sizeLine} ${separate ? `Counted separately from the directional averages: ${separate}. ` : ''}Anyone absent from it has no direction, magnitude or power reading here, and their absence is unmeasured by construction. ${verdict}`,
  };
}

// Saved edits and additions are a convenience, not a record: they live in this
// browser only. Corrupt or partially written storage falls back to the seeds
// rather than breaking the page.
export function loadSavedMaps(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { edits: {}, added: {}, policies: [] };
    const parsed = JSON.parse(raw);
    return {
      edits: asEditsMap(parsed?.edits),
      added: asRowsMap(parsed?.added),
      policies: asPolicies(parsed?.policies),
    };
  } catch {
    return { edits: {}, added: {}, policies: [] };
  }
}

export function saveMaps(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        edits: asEditsMap(state?.edits),
        added: asRowsMap(state?.added),
        policies: asPolicies(state?.policies),
      }),
    );
  } catch {
    // Storage can be full or blocked. The map still works for this visit.
  }
}

export function clearSavedMaps(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
