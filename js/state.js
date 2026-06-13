// Single mutable state hub with pub/sub — the modern replacement for
// PokéChill's bag of globals. Modules subscribe to keys they care about.

import { DEFAULT_LOCALE, DEFAULT_REGION, DEFAULT_THEME } from './config.js';

export const state = {
  locale: DEFAULT_LOCALE,
  region: DEFAULT_REGION,
  theme: DEFAULT_THEME,

  save: null, // persisted derived state, or null before first import
  caughtSet: new Set(), // species indices the user has caught (any region)
  regionSet: null, // Set<idx> in the selected region, or null = world (all)

  filters: { seen: 'all', orderIdx: null, familyIdx: null, rarity: null },
  query: '',
  visible: [], // current filtered+searched index list driving the grid

  newLifers: new Set(), // indices added by the latest import (for NEW flash)
};

const subs = new Map(); // key -> Set<fn>

export function subscribe(keys, fn) {
  for (const k of [].concat(keys)) {
    if (!subs.has(k)) subs.set(k, new Set());
    subs.get(k).add(fn);
  }
  return () => {
    for (const k of [].concat(keys)) subs.get(k)?.delete(fn);
  };
}

export function emit(patch) {
  Object.assign(state, patch);
  const notified = new Set();
  for (const k of Object.keys(patch)) {
    for (const fn of subs.get(k) || []) {
      if (!notified.has(fn)) {
        notified.add(fn);
        fn(state, k);
      }
    }
  }
}
