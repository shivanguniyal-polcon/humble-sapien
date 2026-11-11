// The CSO page's copy, one module per locale.
//
// This follows the same rule as samparkCopy.js: a locale is a data file, the
// page reads one object, and copyFor() never fills a missing string from
// English. The coverage test (scripts/test-cso-locales.mjs) fails if a locale
// is missing a key the page renders, so a half-translated page cannot ship.
//
// Legal names, statute names, scheme names and source titles stay in Latin
// script inside every translation. Everything else is translated.
import en from './cso/en.js';
import hi from './cso/hi.js';
import bn from './cso/bn.js';
import gu from './cso/gu.js';
import ta from './cso/ta.js';
import te from './cso/te.js';
import kn from './cso/kn.js';
import ml from './cso/ml.js';
import ur from './cso/ur.js';

export const CSO_LOCALES = [
  { code: 'en', label: 'English', endonym: 'English' },
  { code: 'hi', label: 'Hindi', endonym: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', endonym: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', endonym: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', endonym: 'தமிழ்' },
  { code: 'te', label: 'Telugu', endonym: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', endonym: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', endonym: 'മലയാളം' },
  { code: 'ur', label: 'Urdu', endonym: 'اردو', rtl: true },
];

const COPY = { en, hi, bn, gu, ta, te, kn, ml, ur };

export function csoCopyFor(code) {
  return COPY[code] || COPY.en;
}

export function isCsoRtl(code) {
  return code === 'ur';
}

export function csoLocaleFrom(value) {
  return CSO_LOCALES.some((entry) => entry.code === value) ? value : null;
}
