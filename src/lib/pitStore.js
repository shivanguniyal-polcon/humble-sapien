import { useSyncExternalStore } from 'react';

// Draft public interest answers, bridged between tools. The stakeholder mapper
// writes a draft derived from its computed distributional verdict; the battery,
// the evaluation engine and the simplifier offer to fill their three PIT fields
// from it, so the analyst edits a computed draft instead of facing blank boxes.
// Session-scoped and in memory like everything else here: nothing persists and
// nothing leaves the browser, and the bridge only fires when asked.

let draft = null;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPitDraft() {
  return draft;
}

export function setPitDraft({ whoBenefits, whoPays, whoMissing, source, policyName }) {
  draft = {
    whoBenefits: String(whoBenefits || ''),
    whoPays: String(whoPays || ''),
    whoMissing: String(whoMissing || ''),
    source: source || 'unknown',
    policyName: String(policyName || ''),
    at: Date.now(),
  };
  emit();
  return draft;
}

export function clearPitDraft() {
  draft = null;
  emit();
}

export function usePitDraft() {
  return useSyncExternalStore(subscribe, getPitDraft);
}
