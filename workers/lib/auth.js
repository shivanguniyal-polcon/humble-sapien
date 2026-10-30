// Bearer checks for the Workers with a write path.
//
// A plain string comparison stops at the first byte that differs, so its
// running time carries the length of the shared prefix. Against a 256-bit
// random token that leak is too small to walk over a network, but the fix is
// cheap: hash both sides and compare the digests without an early exit.

const encoder = new TextEncoder();

const digest = async (value) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

export const bearerMatches = async (header, token) => {
  if (!token) return false;
  const [presented, expected] = await Promise.all([
    digest(String(header || '')),
    digest(`Bearer ${token}`),
  ]);
  let difference = 0;
  for (let index = 0; index < presented.length; index += 1) {
    difference |= presented[index] ^ expected[index];
  }
  return difference === 0;
};
