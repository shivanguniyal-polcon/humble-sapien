// Coverage check for the Sampark CSO page.
//
// The page now renders the complete English content model, so a locale must
// carry every string en.js carries. Missing strings are a failure, not an
// English fallback.
import en from '../src/data/cso/en.js';
import hi from '../src/data/cso/hi.js';
import bn from '../src/data/cso/bn.js';
import gu from '../src/data/cso/gu.js';
import ta from '../src/data/cso/ta.js';
import te from '../src/data/cso/te.js';
import kn from '../src/data/cso/kn.js';
import ml from '../src/data/cso/ml.js';
import ur from '../src/data/cso/ur.js';

const LOCALES = { hi, bn, gu, ta, te, kn, ml, ur };


function requiredPaths(node, path = '', out = []) {
  if (typeof node === 'string') {
    out.push(path);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      requiredPaths(item, `${path}[${index}]`, out);
    });
    return out;
  }
  if (node && typeof node === 'object') {
    Object.keys(node).forEach((key) =>
      requiredPaths(node[key], path ? `${path}.${key}` : key, out),
    );
  }
  return out;
}

const required = requiredPaths(en);
const failures = [];

for (const [code, copy] of Object.entries(LOCALES)) {
  for (const path of required) {
    const value = path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .reduce((node, key) => (node == null ? undefined : node[key]), copy);
    if (typeof value !== 'string' || value.trim() === '') {
      failures.push(`${code}: missing or empty ${path}`);
    }
  }
  if (copy.head?.question === en.head.question) {
    failures.push(`${code}: head.question is still English`);
  }
  if (copy.eligible?.caveat === en.eligible.caveat) {
    failures.push(`${code}: eligibility caveat is still English`);
  }
}

if (failures.length) {
  console.error(`CSO locale coverage failed (${failures.length}):`);
  failures.slice(0, 40).forEach((line) => console.error(`  ${line}`));
  process.exit(1);
}

console.log(`CSO locale coverage: ${required.length} required strings × ${Object.keys(LOCALES).length} locales — PASS`);
