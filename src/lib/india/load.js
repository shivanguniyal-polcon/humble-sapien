// The state chunks are big: the districts, sub-districts, blocks and map
// geometry for one State run to hundreds of kilobytes. They are loaded only
// when someone picks that State, so the first paint of the map costs one
// file.
//
// The village names are a separate chunk again, and it is cut per district.
// Uttar Pradesh alone holds more than a hundred thousand village names, and
// a State-sized village file sent half a megabyte over the wire before the
// citizen had picked anything. A district is a fraction of that, and the
// district is the level the citizen has already chosen by the time they ask
// for a village name.
//
// The glob is resolved by the bundler at build time, which is what keeps the
// chunks split instead of inlined.

const allChunks = import.meta.glob('../../data/india/state-*.js');
const allVillageChunks = import.meta.glob('../../data/india/district-*-villages.js');

const stateChunks = {};
const villageChunks = {};

for (const [path, load] of Object.entries(allChunks)) {
  const name = path.split('/').pop();
  if (name.endsWith('-villages.js')) continue;
  stateChunks[name] = load;
}

for (const [path, load] of Object.entries(allVillageChunks)) {
  const name = path.split('/').pop();
  villageChunks[name] = load;
}

export const hasState = (slug) => Boolean(stateChunks[`state-${slug}.js`]);

export async function loadState(slug) {
  const load = stateChunks[`state-${slug}.js`];
  if (!load) throw new Error(`no chunk for state ${slug}`);
  return load();
}

export async function loadVillages(districtId) {
  const load = villageChunks[`district-${districtId}-villages.js`];
  if (!load) return null;
  return load();
}
