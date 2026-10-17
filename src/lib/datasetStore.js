import { useSyncExternalStore } from 'react';

// A tiny dataset store shared between tools. Two tiers, on purpose:
//   unpinned — in memory for this tab only; the list empties when the tab closes.
//   pinned   — persisted in localStorage so they survive closed tabs, until the
//              analyst unpins them. Pinned datasets are the analyst's own data;
//              nothing leaves the browser either way, and sharing is always
//              explicit — a tool only puts a dataset here when asked.
// The storage key is deliberately NOT in the `manifest:` namespace: that
// namespace belongs to the battery's audit-manifest tamper checks, and shared
// datasets must never trip them.

const PIN_STORE_KEY = 'ths-shared-datasets';
const MAX_ENTRIES = 20;

let entries = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadPinned() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PIN_STORE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.id && e.dataset && e.validation) : [];
  } catch {
    return [];
  }
}

function savePinned() {
  try {
    const pinned = entries.filter((e) => e.pinned);
    if (typeof localStorage === 'undefined') return false;
    if (pinned.length === 0) localStorage.removeItem(PIN_STORE_KEY);
    else localStorage.setItem(PIN_STORE_KEY, JSON.stringify(pinned));
    return true;
  } catch {
    // Storage full or blocked: the pin still applies to this session, and the
    // caller is told persistence failed rather than being left to discover it.
    return false;
  }
}

// Pinned entries are restored at load; session-only ones start empty.
entries = loadPinned();
nextId = entries.length + 1;

export function listDatasets() {
  return entries;
}

// Sharing under an existing name replaces the older entry, so the list stays
// short and the latest validated version of a dataset is the one you get.
export function shareDataset({ name, dataset, validation, source }) {
  const entryName = String(name || 'Untitled data');
  const prior = entries.find((e) => e.name === entryName);
  const entry = {
    id: `ds-${Date.now().toString(36)}-${nextId++}`,
    name: entryName,
    dataset,
    validation,
    source: source || 'unknown',
    sharedAt: Date.now(),
    // Re-sharing under a pinned name replaces the data, not the decision to
    // keep it: a pin holds until the analyst unpins, as the UI promises.
    pinned: prior ? prior.pinned : false,
  };
  entries = [...entries.filter((e) => e.name !== entry.name), entry];
  if (entries.length > MAX_ENTRIES) {
    // Evict the oldest unpinned entry first; pinned data is only displaced
    // when every entry is pinned.
    const drop = entries.find((e) => !e.pinned) || entries[0];
    entries = entries.filter((e) => e.id !== drop.id);
  }
  savePinned();
  emit();
  return entry;
}

export function unshareDataset(id) {
  entries = entries.filter((e) => e.id !== id);
  savePinned();
  emit();
}

// Pinning is how a dataset outlives the tab. Returns whether persistence
// actually worked so the UI can say so instead of implying it.
export function togglePin(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return { pinned: false, persisted: false };
  const pinned = !entry.pinned;
  entries = entries.map((e) => (e.id === id ? { ...e, pinned } : e));
  const persisted = savePinned();
  emit();
  return { pinned, persisted: pinned ? persisted : true };
}

export function useSharedDatasets() {
  return useSyncExternalStore(subscribe, listDatasets);
}
