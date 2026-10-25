// The single owner of public-mode visibility.
//
// Field definitions do not carry a second visibility list. A field is public
// exactly when its key appears in one of these sector allowlists, so the form,
// the templates and the tests all read the same decision.

export const PUBLIC_FIELDS = Object.freeze({
  'ham-road': Object.freeze([
    'projectName',
    'sector',
    'state',
    'capexCr',
    'constructionYears',
    'assetLifeYears',
    'hamSupportPct',
    'annualRevenueCr',
  ]),
  solar: Object.freeze([
    'projectName',
    'sector',
    'state',
    'capexCr',
    'capacity',
    'constructionYears',
    'assetLifeYears',
    'tariff',
    'cufPct',
    'liquiditySupport',
  ]),
});

const PUBLIC_KEYS = new Set(Object.values(PUBLIC_FIELDS).flat());

export function publicFieldKeys(sector = 'ham-road') {
  return PUBLIC_FIELDS[sector] || [];
}

export function isPublicField(key) {
  return PUBLIC_KEYS.has(key);
}
