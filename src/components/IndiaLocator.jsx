import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATES, INDIA_VIEWBOX } from '../data/india/indiaAdmin';
import { LGD_SNAPSHOT, LGD_SOURCE } from '../data/india/lgd-meta';
import { downloadFile } from '../lib/download.js';
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
  LADDER_RUNG_FOR,
  LADDER_RUNG_NOTE,
} from '../lib/india/hierarchy';
import { copyFor, fill } from '../data/samparkCopy';

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

export default function IndiaLocator({ onChange, place, onPlaceChange, t = copyFor('en') }) {
  const [path, setPath] = useState([]);
  const [chunkState, setChunkState] = useState(null);
  const [villageState, setVillageState] = useState(null);
  const [query, setQuery] = useState('');
  // The list under the map is a tab, not a permanent wall of names. It is
  // mounted only while open, so a closed tab costs neither scroll nor a
  // screen-reader stop for every State.
  const [browseOpen, setBrowseOpen] = useState(false);
  const browseSummaryRef = useRef(null);
  const [limit, setLimit] = useState(PAGE);
  const [problem, setProblem] = useState(null);

  const level = path.length ? path[path.length - 1].level : 'india';
  const levelLabel = (id) =>
    t[`level${id.charAt(0).toUpperCase()}${id.slice(1)}`] || LEVEL_NAME[id];
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

  // Each row is a real link as well as a control. The href carries the place
  // the row would open, so a volunteer can copy it, open it in a new tab, or
  // send it on; the click handler keeps the in-page walk immediate.
  const hrefFor = useCallback((entry) => {
    const [route, query = ''] = String(window.location.hash || '').split('?');
    const params = new URLSearchParams(query);
    const value = placeFromPath([...path, entry]);
    if (value) params.set('p', value);
    const next = params.toString();
    return `${route || '#/tools/touchpoints'}${next ? `?${next}` : ''}`;
  }, [path]);

  // One chunk per State, fetched when a State is first chosen.
  useEffect(() => {
    if (!stateName) return undefined;
    let cancelled = false;
    loadState(slugify(stateName))
      .then((mod) => {
        if (!cancelled) setChunkState({ id: stateId, mod });
      })
      .catch(() => {
        if (!cancelled) setProblem(fill(t.locatorLoadError, { place: stateName }));
      });
    return () => {
      cancelled = true;
    };
  }, [stateId, stateName, t.locatorLoadError]);

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
          title: t.locatorStates,
          items: STATES.filter((s) => !q || matches(s.name, q)).map((s) => ({
            key: `s${s.id}`,
            name: s.name,
            meta: `${s.districts} ${levelLabel('district')} · ${s.blocks} ${levelLabel('block')}`,
            href: hrefFor({ level: 'state', name: s.name, id: s.id, lgd_code: s.lgd_code }),
            pick: () => push({ level: 'state', name: s.name, id: s.id, lgd_code: s.lgd_code }),
          })),
        },
      ];
    }
    if (!chunk) return [];
    if (level === 'state') {
      return [
        {
          title: t.locatorDistricts,
          items: tree
            .filter((d) => !q || matches(d.name, q))
            .map((d) => ({
              key: `d${d.id}`,
              name: d.name,
              meta: `${d.subdistricts.length} ${levelLabel('tehsil')} · ${d.blocks.length} ${levelLabel('block')}`,
              href: hrefFor({ level: 'district', name: d.name, id: d.id, lgd_code: d.lgd_code }),
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
          meta: `${d.blocks.filter((b) => b.subdistrict === t.id).length} ${levelLabel('block')}`,
          href: hrefFor({ level: 'tehsil', name: t.name, id: t.id, lgd_code: t.lgd_code }),
          pick: () => push({ level: 'tehsil', name: t.name, id: t.id, lgd_code: t.lgd_code }),
        }));
      const blocks = d.blocks
        .filter((b) => !q || matches(b.name, q))
        .map((b) => ({
          key: `b${b.id}`,
          name: b.name,
          meta: levelLabel('block'),
          href: hrefFor({ level: 'block', name: b.name, id: b.id, lgd_code: b.lgd_code }),
          pick: () => push({ level: 'block', name: b.name, id: b.id, lgd_code: b.lgd_code }),
        }));
      return [
        { title: t.locatorTehsils, items: tehsils, note: t.locatorTehsilNote },
        { title: t.locatorBlocks, items: blocks },
      ];
    }
    if (level === 'tehsil') {
      const d = tree.find((x) => x.id === (districtEntry && districtEntry.id));
      const blocks = (d ? d.blocks : []).filter((b) => b.subdistrict === (tehsilEntry && tehsilEntry.id));
      return [
        {
          title: t.locatorBlocksInTehsil,
          items: blocks
            .filter((b) => !q || matches(b.name, q))
            .map((b) => ({
              key: `b${b.id}`,
              name: b.name,
              meta: levelLabel('block'),
              href: hrefFor({ level: 'block', name: b.name, id: b.id, lgd_code: b.lgd_code }),
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
          title: t.locatorVillages,
          // A block can hold two villages with the same name. The name is not
          // the identity; the position in the list is what keeps the rows
          // distinct for React.
          items: found.map((name, index) => {
            const entry = {
              level: 'village',
              name,
              id,
              ...villageDetails(villageCodes, villageGpCodes, gps, villages, id, name),
            };
            return {
              key: `v${name}-${index}`,
              name,
              meta: levelLabel('village'),
              href: hrefFor(entry),
              pick: () => push(entry),
            };
          }),
        },
      ];
    }
    return [];
  }, [level, chunk, tree, query, villages, villageCodes, villageGpCodes, gps, limit, districtEntry, tehsilEntry, blockEntry, t, hrefFor]);

  const totalVillages =
    level === 'block' && blockEntry ? villagesOf(villages, blockEntry.id).length : 0;

  // The hierarchy is the smallest useful thing a citizen can hand to a
  // spreadsheet or a colleague. It carries the official LGD code where the
  // directory join found one, and a blank where it refused to guess.
  const downloadHierarchy = () => {
    if (!path.length) return;
    const name = `ths-hierarchy-${slugify(path[path.length - 1].name) || 'place'}.csv`;
    downloadFile(name, hierarchyCsv(path), 'text/csv;charset=utf-8');
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
      <nav className="locator-crumbs" aria-label={t.locatorCrumbs}>
        <button type="button" className="locator-crumb" onClick={() => step(-1)}>
          {t.levelIndia}
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
              <span className="locator-crumb-level">{levelLabel(p.level).toLowerCase()}</span>
            )}
          </span>
        ))}
      </nav>

      {path.length > 0 && (
        <details className="locator-codes">
          <summary className="locator-codes-summary">
            <span className="locator-group-title">{t.locatorDirectoryTitle}</span>
            <span className="meta">{t.locatorDirectoryHint}</span>
          </summary>
          <div className="locator-codes-body">
            <div className="locator-codes-head">
              <span className="meta">{t.locatorDirectoryLead}</span>
              <button type="button" className="btn btn-secondary locator-codes-download" onClick={downloadHierarchy}>
                {t.locatorDirectoryDownload}
              </button>
            </div>
            <ol className="locator-code-list">
              {path.map((p) => (
                <li key={`${p.level}-${p.id}`} className="locator-code-row">
                  <span className="locator-code-level">{levelLabel(p.level)}</span>
                  <span className="locator-code-name">{p.name}</span>
                  <code className="locator-code">
                    {directoryCode(p)}
                    {p.lgd_code ? ` · LGD ${p.lgd_code}` : ` · ${t.locatorNoLgd}`}
                  </code>
                </li>
              ))}
            </ol>
            {villageEntry && (
              <p className="meta locator-gp">
                {villageEntry.gp_name ? (
                  <>
                    {t.locatorGramPanchayat}: <strong>{villageEntry.gp_name}</strong>
                    {villageEntry.gp_code ? ` (GP ${villageEntry.gp_code})` : ''}
                  </>
                ) : (
                  t.locatorNoGp
                )}
              </p>
            )}
            <p className="meta locator-codes-note">{t.locatorHierarchyNote}</p>
            <p className="meta locator-codes-note">
              {fill(t.locatorSourceNote, { source: LGD_SOURCE, date: LGD_SNAPSHOT })}
            </p>
          </div>
        </details>
      )}

      <div className="locator-grid">
        <figure className="locator-figure">
          <svg
            className="locator-svg"
            viewBox={viewBox}
            role="img"
            aria-label={fill(t.locatorMapAria, {
              level: levelLabel(level).toLowerCase(),
              n: shapes.length,
            })}
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
            {t.locatorMapCaption}
          </figcaption>
        </figure>

        <div className="locator-side">
          {/* The list is long, and the map answers most questions on its own.
              It sits behind one tab so the page does not make the reader
              scroll through every State to reach the ladder below. */}
          <div
            className="locator-browse"
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || !browseOpen) return;
              setBrowseOpen(false);
              browseSummaryRef.current?.focus();
            }}
          >
            <button
              type="button"
              className="locator-browse-summary"
              ref={browseSummaryRef}
              aria-expanded={browseOpen}
              aria-controls="locator-browse-body"
              aria-label={`${t.locatorBrowse}. ${busy
                ? t.locatorLoading
                : fill(t.locatorBrowseCount, {
                  n: groups.reduce((count, group) => count + group.items.length, 0),
                })}`}
              onClick={() => setBrowseOpen((open) => !open)}
            >
              <span className="locator-browse-title">{t.locatorBrowse}</span>
              <span className="meta">
                {busy
                  ? t.locatorLoading
                  : fill(t.locatorBrowseCount, {
                      n: groups.reduce((count, group) => count + group.items.length, 0),
                    })}
              </span>
            </button>
            {browseOpen && (
            <div className="locator-browse-body" id="locator-browse-body">
          <div className="locator-search">
            <label htmlFor="locator-q" className="locator-search-label">
              {fill(t.locatorSearch, { level: levelLabel(level).toLowerCase() })}
            </label>
            <input
              id="locator-q"
              type="search"
              value={query}
              placeholder={fill(t.locatorType, {
                level: levelLabel(level === 'block' ? 'village' : level).toLowerCase(),
              })}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>

          {busy && <p className="meta">{t.locatorLoading}</p>}
          {problem && <p className="locator-problem">{problem}</p>}

          {groups.map((g) => (
            <div key={g.title} className="locator-group">
              <h4 className="locator-group-title">{g.title}</h4>
              {g.note && <p className="meta locator-group-note">{g.note}</p>}
              {g.items.length === 0 ? (
                <p className="meta">{t.locatorNothing}</p>
              ) : (
                <ul className="locator-list">
                  {g.items.map((item) => (
                    <li key={item.key}>
                      <a
                        className="locator-item"
                        href={item.href}
                        onClick={(event) => {
                          if (
                            event.button !== 0 ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          ) {
                            return;
                          }
                          event.preventDefault();
                          item.pick();
                        }}
                      >
                        <span className="locator-item-name">{item.name}</span>
                        <span className="locator-item-meta">{item.meta}</span>
                      </a>
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
                  {fill(t.locatorMore, { left: totalVillages - g.items.length })}
                </button>
              )}
            </div>
          ))}

          {level === 'village' && villageEntry && (
            <div className="locator-picked">
              <h4>{fill(t.locatorYouAreAt, { place: villageEntry.name })}</h4>
              <p className="meta">
                {blockEntry ? `${blockEntry.name} ${levelLabel('block').toLowerCase()}` : ''}
                {districtEntry ? `, ${districtEntry.name} ${levelLabel('district').toLowerCase()}` : ''}
                {stateEntry ? `, ${stateEntry.name}` : ''}
              </p>
              <p className="meta locator-picked-code">
                {t.locatorDirectoryKey} <code>{directoryCode(villageEntry)}</code>
              </p>
              <p className="meta locator-picked-gp">
                {villageEntry.gp_name
                  ? `${t.locatorGramPanchayat} ${villageEntry.gp_name}${villageEntry.gp_code ? ` · GP ${villageEntry.gp_code}` : ''}`
                  : t.locatorNoGp}
              </p>
            </div>
          )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
