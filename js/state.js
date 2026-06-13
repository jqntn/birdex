import { DEFAULT_LOCALE, DEFAULT_REGION, DEFAULT_THEME } from './config.js';

export const state = {
  locale: DEFAULT_LOCALE,
  region: DEFAULT_REGION,
  theme: DEFAULT_THEME,

  save: null,
  caughtSet: new Set(),
  regionSet: null,

  filters: { seen: 'all', orderIdx: null, familyIdx: null, rarity: null },
  query: '',
  visible: [],

  newLifers: new Set(),
};

const subs = new Map();

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
