import { useEffect, useMemo, useRef, useState } from 'react';
import { STATES, INDIA_VIEWBOX } from '../data/india/indiaAdmin';
import { LGD_SNAPSHOT_LABEL, LGD_SOURCE } from '../data/india/lgd-meta';
import { loadState, loadVillages } from '../lib/india/load';
import {
  buildTree,
  slugify,
  viewBoxFor,
  searchVillages,
  villagesOf,
  villageDetails,
  matches,
  placeFromPath,
  parsePlace,
  directoryCode,
  hierarchyCsv,
  HIERARCHY_NOTE,
  LADDER_RUNG_FOR,
  LADDER_RUNG_NOTE,
} from '../lib/india/hierarchy';

// The drill-down: State, District, Tehsil, Block, Village.
//
// A citizen's question is never "which ministry" at the start. It is "which
// office, near me". So the walk begins on a map of the country and ends on a
// list of village names, and the ladder beside it is pinned to wherever the
// walk stopped.
//
// Two facts the walk has to be honest about:
//
// A tehsil is a revenue division, not a tier of any scheme. The counter may
// sit inside one, but the office that decides sits at the block or the
// district. The tehsil is shown because people are sent there, and it is
// labelled as what it is.
//
// The village names come from the Local Government Directory, and a name can
// repeat. "Rampur" is not one place. So the list always says which block a
// name sits in.

const LEVEL_ORDER = ['india', 'state', 'district', 'tehsil', 'block', 'village'];

const LEVEL_NAME = {
  india: 'India',
  state: 'State',
  district: 'District',
  tehsil: 'Tehsil',
  block: 'Block',
  village: 'Village',
};

const PAGE = 60;

export default function IndiaLocator({ onChange, place, onPlaceChange }) {
  const [path, setPath] = useState([]);
  const [chunkState, setChunkState] = useState(null);
  const [villageState, setVillageState] = useState(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [problem, setProblem] = useState(null);

  const level = path.length ? path[path.length - 1].level : 'india';
  const stateEntry = path.find((p) => p.level === 'state');
  const districtEntry = path.find((p) => p.level === 'district');
  const tehsilEntry = path.find((p) => p.level === 'tehsil');
  const blockEntry = path.find((p) => p.level === 'block');
  const villageEntry = path.find((p) => p.level === 'village');

  const stateId = stateEntry ? stateEntry.id : null;
  const stateName = stateEntry ? stateEntry.name : null;
  const districtId = districtEntry ? districtEntry.id : null;

  // A chunk is only the chunk of the State that is on screen. Holding the
  // State id alongside it means a walk back to the country drops the old
  // chunk without a separate clearing step.
  const chunk = chunkState && chunkState.id === stateId ? chunkState.mod : null;
  const villages =
    villageState && villageState.districtId === districtId ? villageState.mod : null;
  const villageCodes =
    villageState && villageState.districtId === districtId ? villageState.codes : null;
  const villageGpCodes =
    villageState && villageState.districtId === districtId ? villageState.gpCodes : null;
  const gps = villageState && villageState.districtId === districtId ? villageState.gps : null;
  const busy = Boolean(stateId) && !chunk;

  // One chunk per State, fetched when a State is first chosen.
  useEffect(() => {
    if (!stateName) return undefined;
    let cancelled = false;
    loadState(slugify(stateName))
      .then((mod) => {
        if (!cancelled) setChunkState({ id: stateId, mod });
      })
      .catch((err) => {
        if (!cancelled) setProblem(`Could not load ${stateName}: ${err.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [stateId, stateName]);

  // The village names are a second chunk, and it is cut per district. It is
  // fetched when a district is chosen, because a district holds the villages
  // of every block inside it and the citizen has already chosen the district
  // by the time they can pick a village.
  useEffect(() => {
    if (!districtId) return undefined;
    let cancelled = false;
    loadVillages(districtId)
      .then((mod) => {
        if (!cancelled) {
          setVillageState({
            districtId,
            mod: mod ? mod.VILLAGES : null,
            codes: mod ? mod.VILLAGE_CODES : null,
            gpCodes: mod ? mod.GP_CODES : null,
            gps: mod ? mod.GPS : null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setVillageState({ districtId, mod: null });
      });
    return () => {
      cancelled = true;
    };
  }, [districtId]);

  const tree = useMemo(() => (chunk ? buildTree(chunk) : []), [chunk]);
  // Selecting a level replaces everything below it, so the walk never forks.
  const push = (entry) => {
    const depth = LEVEL_ORDER.indexOf(entry.level);
    const next = [...path.slice(0, depth), entry];
    setPath(next);
    setQuery('');
    setLimit(PAGE);
    setProblem(null);
    if (onPlaceChange) onPlaceChange(placeFromPath(next));
  };

  const step = (index) => {
    const next = path.slice(0, index + 1);
    setPath(next);
    setProblem(null);
    if (onPlaceChange) onPlaceChange(placeFromPath(next));
  };

  // A shared link carries the walk. It is rebuilt here once the State chunk
  // has arrived, and a village is only accepted if it is still in that block:
  // the directory lags, and a village that has been renamed should stop the
  // walk at the block rather than lie about it.
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!place) return undefined;
    const want = parsePlace(place);
    if (!want) return undefined;
    if (placeFromPath(pathRef.current) === place) return undefined;
    const state = STATES.find((s) => s.id === want.stateId);
    if (!state) return undefined;

    let cancelled = false;
    (async () => {
      const mod = await loadState(slugify(state.name));
      if (cancelled) return;
      const next = [{ level: 'state', name: state.name, id: state.id, lgd_code: state.lgd_code }];
      // An id of 0 is a real district in this build, so a null check is the
      // only one that may stand in for "this level is missing".
      const district =
        want.districtId !== null && mod.DISTRICTS.find((d) => d.id === want.districtId);
      if (district) {
        next.push({ level: 'district', name: district.name, id: district.id, lgd_code: district.lgd_code });
      }
      const tehsil =
        want.tehsilId !== null && mod.SUBDISTRICTS.find((t) => t.id === want.tehsilId);
      if (tehsil) {
        next.push({ level: 'tehsil', name: tehsil.name, id: tehsil.id, lgd_code: tehsil.lgd_code });
      }
      const block =
        want.blockId !== null && mod.BLOCKS.find((b) => b.id === want.blockId);
      if (block) {
        next.push({ level: 'block', name: block.name, id: block.id, lgd_code: block.lgd_code });
      }
      if (block && want.village && want.districtId !== null) {
        const vmod = await loadVillages(want.districtId);
        if (cancelled) return;
        const list = vmod && vmod.VILLAGES ? vmod.VILLAGES[String(block.id)] : null;
        if (list && list.includes(want.village)) {
          const details = villageDetails(
            vmod.VILLAGE_CODES,
            vmod.GP_CODES,
            vmod.GPS,
            vmod.VILLAGES,
            block.id,
            want.village,
          );
          next.push({ level: 'village', name: want.village, id: block.id, ...details });
        }
      }
      setPath(next);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [place]);

  // Report the chosen place to whoever is holding the ladder.
  useEffect(() => {
    if (!onChange) return;
    const rung = LADDER_RUNG_FOR[level];
    const label = path.length ? path[path.length - 1].name : null;
    let note = LADDER_RUNG_NOTE[level];
    if (level === 'village' && villageEntry) {
      note = villageEntry.gp_name
        ? `${note} This village is in ${villageEntry.gp_name} Gram Panchayat (GP ${villageEntry.gp_code}).`
        : `${note} No Gram Panchayat is recorded for this village in the directory.`;
    }
    onChange({
      level,
      rung,
      label,
      note,
      // The letter reads as an address, so the chain runs from the village
      // outwards. The walk itself still runs State first.
      path: [...path].reverse().map((p) => p.name),
      gp: villageEntry
        ? { code: villageEntry.gp_code || '', name: villageEntry.gp_name || '' }
        : null,
      codes: path.map((p) => ({
        level: p.level,
        name: p.name,
        code: directoryCode(p),
        lgd_code: p.lgd_code || '',
        gp_code: p.gp_code || '',
        gp_name: p.gp_name || '',
      })),
    });
  }, [level, path, villageEntry, onChange]);

  // The polygons on screen, and the box that frames them.
  const shapes = useMemo(() => {
    if (level === 'india') {
      return STATES.map((s) => ({ key: s.id, name: s.name, path: s.path }));
    }
    if (!chunk) return [];
    if (level === 'state') {
      return chunk.DISTRICTS.map((d) => ({ key: d.id, name: d.name, path: d.path }));
    }
    if (level === 'district' || level === 'tehsil') {
      const want = level === 'district' ? districtEntry && districtEntry.id : tehsilEntry && tehsilEntry.id;
      return chunk.BLOCKS.filter((b) => b[level === 'district' ? 'district' : 'subdistrict'] === want).map((b) => ({
        key: b.id,
        name: b.name,
        path: b.path,
      }));
    }
    if (level === 'block' || level === 'village') {
      const b = chunk.BLOCKS.find((x) => x.id === (blockEntry && blockEntry.id));
      return b ? [{ key: b.id, name: b.name, path: b.path }] : [];
    }
    return [];
  }, [level, chunk, districtEntry, tehsilEntry, blockEntry]);

  const viewBox = level === 'india' ? INDIA_VIEWBOX : viewBoxFor(shapes.map((s) => s.path));

  // The list beside the map. It is the same information, and it is the part
  // a keyboard or a screen reader uses, so nothing is reachable only by
  // clicking a shape.
  const groups = useMemo(() => {
    const q = query;
    if (level === 'india') {
      return [
        {
          title: 'States and union territories',
          items: STATES.filter((s) => !q || matches(s.name, q)).map((s) => ({
            key: `s${s.id}`,
            name: s.name,
            meta: `${s.districts} districts · ${s.blocks} blocks`,
            pick: () => push({ level: 'state', name: s.name, id: s.id, lgd_code: s.lgd_code }),
          })),
        },
      ];
    }
    if (!chunk) return [];
    if (level === 'state') {
      return [
        {
          title: 'Districts',
          items: tree
            .filter((d) => !q || matches(d.name, q))
            .map((d) => ({
              key: `d${d.id}`,
              name: d.name,
              meta: `${d.subdistricts.length} tehsils · ${d.blocks.length} blocks`,
              pick: () => push({ level: 'district', name: d.name, id: d.id, lgd_code: d.lgd_code }),
            })),
        },
      ];
    }
    if (level === 'district') {
      const d = tree.find((x) => x.id === (districtEntry && districtEntry.id));
      if (!d) return [];
      const tehsils = d.subdistricts
        .filter((t) => !q || matches(t.name, q))
        .map((t) => ({
          key: `t${t.id}`,
          name: t.name,
          meta: `${d.blocks.filter((b) => b.subdistrict === t.id).length} blocks`,
          pick: () => push({ level: 'tehsil', name: t.name, id: t.id, lgd_code: t.lgd_code }),
        }));
      const blocks = d.blocks
        .filter((b) => !q || matches(b.name, q))
        .map((b) => ({
          key: `b${b.id}`,
          name: b.name,
          meta: 'block',
          pick: () => push({ level: 'block', name: b.name, id: b.id, lgd_code: b.lgd_code }),
        }));
      return [
        { title: 'Tehsils', items: tehsils, note: 'A revenue division. The office that decides sits at the block or the district, not here.' },
        { title: 'Blocks', items: blocks },
      ];
    }
    if (level === 'tehsil') {
      const d = tree.find((x) => x.id === (districtEntry && districtEntry.id));
      const blocks = (d ? d.blocks : []).filter((b) => b.subdistrict === (tehsilEntry && tehsilEntry.id));
      return [
        {
          title: 'Blocks in this tehsil',
          items: blocks
            .filter((b) => !q || matches(b.name, q))
            .map((b) => ({
              key: `b${b.id}`,
              name: b.name,
              meta: 'block',
              pick: () => push({ level: 'block', name: b.name, id: b.id, lgd_code: b.lgd_code }),
            })),
        },
      ];
    }
    if (level === 'block') {
      const id = blockEntry && blockEntry.id;
      const found = searchVillages(villages, id, q, limit);
      return [
        {
          title: 'Villages',
          // A block can hold two villages with the same name. The name is not
          // the identity; the position in the list is what keeps the rows
          // distinct for React.
          items: found.map((name, index) => ({
            key: `v${name}-${index}`,
            name,
            meta: 'village',
            pick: () =>
              push({
                level: 'village',
                name,
                id,
                ...villageDetails(villageCodes, villageGpCodes, gps, villages, id, name),
              }),
          })),
        },
      ];
    }
    return [];
  }, [level, chunk, tree, query, villages, villageCodes, villageGpCodes, gps, limit, districtEntry, tehsilEntry, blockEntry]);

  const totalVillages =
    level === 'block' && blockEntry ? villagesOf(villages, blockEntry.id).length : 0;

  // The hierarchy is the smallest useful thing a citizen can hand to a
  // spreadsheet or a colleague. It carries the official LGD code where the
  // directory join found one, and a blank where it refused to guess.
  const downloadHierarchy = () => {
    if (!path.length) return;
    const blob = new Blob([hierarchyCsv(path)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ths-hierarchy-${slugify(path[path.length - 1].name) || 'place'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleShape = (shape) => {
    if (level === 'india') {
      const s = STATES.find((x) => x.id === shape.key);
      if (s) push({ level: 'state', name: s.name, id: s.id, lgd_code: s.lgd_code });
    } else if (level === 'state' && chunk) {
      const d = chunk.DISTRICTS.find((x) => x.id === shape.key);
      push({ level: 'district', name: shape.name, id: shape.key, lgd_code: d && d.lgd_code });
    } else if ((level === 'district' || level === 'tehsil') && chunk) {
      const b = chunk.BLOCKS.find((x) => x.id === shape.key);
      push({ level: 'block', name: shape.name, id: shape.key, lgd_code: b && b.lgd_code });
    }
  };

  return (
    <div className="locator">
      <nav className="locator-crumbs" aria-label="Where you are">
        <button type="button" className="locator-crumb" onClick={() => step(-1)}>
          India
        </button>
        {path.map((p, i) => (
          <span key={`${p.level}-${p.id}-${i}`} className="locator-crumb-wrap">
            <span aria-hidden="true" className="locator-crumb-sep">
              ›
            </span>
            <button
              type="button"
              className={`locator-crumb ${i === path.length - 1 ? 'is-current' : ''}`}
              onClick={() => step(i)}
            >
              {p.name}
            </button>
            {/* A district and a tehsil can share a name, so the crumb says
                which one it is. */}
            {p.level !== 'state' && (
              <span className="locator-crumb-level">{LEVEL_NAME[p.level].toLowerCase()}</span>
            )}
          </span>
        ))}
      </nav>

      {path.length > 0 && (
        <section className="locator-codes" aria-label="Directory codes for this place">
          <div className="locator-codes-head">
            <h4 className="locator-group-title">Directory and LGD codes</h4>
            <button type="button" className="btn btn-secondary locator-codes-download" onClick={downloadHierarchy}>
              Download hierarchy (CSV)
            </button>
          </div>
          <ol className="locator-code-list">
            {path.map((p) => (
              <li key={`${p.level}-${p.id}`} className="locator-code-row">
                <span className="locator-code-level">{LEVEL_NAME[p.level]}</span>
                <span className="locator-code-name">{p.name}</span>
                <code className="locator-code">
                  {directoryCode(p)}
                  {p.lgd_code ? ` · LGD ${p.lgd_code}` : ' · no LGD'}
                </code>
              </li>
            ))}
          </ol>
          {villageEntry && (
            <p className="meta locator-gp">
              {villageEntry.gp_name ? (
                <>
                  Gram Panchayat: <strong>{villageEntry.gp_name}</strong>
                  {villageEntry.gp_code ? ` (GP ${villageEntry.gp_code})` : ''}
                </>
              ) : (
                'No Gram Panchayat recorded in the directory for this village.'
              )}
            </p>
          )}
          <p className="meta locator-codes-note">{HIERARCHY_NOTE}</p>
          <p className="meta locator-codes-note">
            Source: {LGD_SOURCE}, snapshot {LGD_SNAPSHOT_LABEL}.
          </p>
        </section>
      )}

      <div className="locator-grid">
        <figure className="locator-figure">
          <svg
            className="locator-svg"
            viewBox={viewBox}
            role="img"
            aria-label={`Map of ${LEVEL_NAME[level].toLowerCase()} level: ${shapes.length} shapes. The list beside the map carries the same names.`}
          >
            {shapes.map((s) => (
              <path
                key={s.key}
                className="locator-shape"
                d={s.path}
                onClick={() => handleShape(s)}
              >
                <title>{s.name}</title>
              </path>
            ))}
          </svg>
          <figcaption className="locator-caption">
            {level === 'india'
              ? 'State outlines. Pick one, then pick your district.'
              : level === 'state'
                ? 'Districts in this State.'
                : level === 'district'
                  ? 'Blocks in this district.'
                  : level === 'tehsil'
                    ? 'Blocks in this tehsil.'
                    : 'The block you are in.'}
          </figcaption>
        </figure>

        <div className="locator-side">
          <div className="locator-search">
            <label htmlFor="locator-q" className="locator-search-label">
              Search {LEVEL_NAME[level].toLowerCase()} names
            </label>
            <input
              id="locator-q"
              type="search"
              value={query}
              placeholder={level === 'block' ? 'Type a village name' : `Type a ${LEVEL_NAME[level].toLowerCase()} name`}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>

          {busy && <p className="meta">Loading…</p>}
          {problem && <p className="locator-problem">{problem}</p>}

          {groups.map((g) => (
            <div key={g.title} className="locator-group">
              <h4 className="locator-group-title">{g.title}</h4>
              {g.note && <p className="meta locator-group-note">{g.note}</p>}
              {g.items.length === 0 ? (
                <p className="meta">Nothing matches that name here.</p>
              ) : (
                <ul className="locator-list">
                  {g.items.map((item) => (
                    <li key={item.key}>
                      <button type="button" className="locator-item" onClick={item.pick}>
                        <span className="locator-item-name">{item.name}</span>
                        <span className="locator-item-meta">{item.meta}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {level === 'block' && totalVillages > g.items.length && (
                <button
                  type="button"
                  className="btn btn-secondary locator-more"
                  onClick={() => setLimit((n) => n + PAGE * 2)}
                >
                  Show more ({totalVillages - g.items.length} left)
                </button>
              )}
            </div>
          ))}

          {level === 'village' && villageEntry && (
            <div className="locator-picked">
              <h4>You are at {villageEntry.name}</h4>
              <p className="meta">
                {blockEntry ? `${blockEntry.name} block` : ''}
                {districtEntry ? `, ${districtEntry.name} district` : ''}
                {stateEntry ? `, ${stateEntry.name}` : ''}
              </p>
              <p className="meta locator-picked-code">
                Directory key <code>{directoryCode(villageEntry)}</code>
              </p>
              <p className="meta locator-picked-gp">
                {villageEntry.gp_name
                  ? `Gram Panchayat ${villageEntry.gp_name}${villageEntry.gp_code ? ` · GP ${villageEntry.gp_code}` : ''}`
                  : 'No Gram Panchayat recorded for this village.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
