// Which countries the policy atlas studies.
//
// The atlas records a jurisdiction per policy ("European Union", "England and
// Wales", "California, United States"). This maps those to ISO 3166-1 alpha-2
// codes so the world map can light the right countries. Sub-national
// jurisdictions map to the state that legislates them.
//
// scripts/test-world-map.mjs fails if a jurisdiction appears in sectors.js
// that is missing here, so the map cannot silently stop covering a country.

// The 27 member states of the European Union. An EU regulation binds across
// the bloc, so the bloc's policies light all of them.
export const EU_MEMBER_STATES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
];

// India's ISO code. The map draws India from its own path rather than from
// the world layer, so the code lives here and the geometry module knows
// nothing about the atlas.
export const INDIA_ISO = 'IN';

export const JURISDICTION_ISO = {
  'India': [INDIA_ISO],
  'European Union': EU_MEMBER_STATES,
  'United States': ['US'],
  'California, United States': ['US'],
  'Brazil': ['BR'],
  'South Africa': ['ZA'],
  'Canada': ['CA'],
  'United Kingdom': ['GB'],
  'England, United Kingdom': ['GB'],
  'England and Wales': ['GB'],
  'Japan': ['JP'],
  'Indonesia': ['ID'],
  'Kenya': ['KE'],
  'Costa Rica': ['CR'],
  'Thailand': ['TH'],
  'Taiwan': ['TW'],
  'Rwanda': ['RW'],
  'Germany': ['DE'],
  'Finland': ['FI'],
  'Estonia': ['EE'],
};

// The countries whose policies a single sector covers.
export const sectorIsoCodes = (sector) => {
  const codes = new Set();
  for (const policy of [...sector.north, ...sector.south]) {
    for (const code of JURISDICTION_ISO[policy.j] || []) codes.add(code);
  }
  return codes;
};

// Every country the atlas touches, across all sectors.
export const atlasIsoCodes = (sectors) => {
  const codes = new Set();
  for (const sector of sectors) {
    for (const code of sectorIsoCodes(sector)) codes.add(code);
  }
  return codes;
};
