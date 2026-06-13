// Single-key localStorage persistence (one key, like PokéChill's save.js, but
// storing only derived join state). The full save object is the source of truth
// for the CSV→species join + settings; taxonomy/rarity/shiny are recomputed.

import { LS_KEY, DEFAULT_LOCALE, DEFAULT_REGION, DEFAULT_THEME } from './config.js';

const blankSave = () => ({
  version: 1,
  importedAt: null,
  locale: DEFAULT_LOCALE,
  region: DEFAULT_REGION,
  theme: DEFAULT_THEME,
  skippedOnboarding: false,
  species: {}, // code -> { count, sp, country, date, exotic, category }
  agg: null,
  achievements: {}, // id -> earnedAt epoch
  prevSnapshot: [], // species codes from prior import, for new-lifer diff
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return { ...blankSave(), ...obj };
  } catch {
    return null;
  }
}

export function saveAll(save) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(save));
  } catch (e) {
    console.warn('[persistence] save failed', e);
  }
}

// Ensure a save object exists (creating a settings-only one if needed),
// apply a patch, persist, and return it.
export function patchSave(current, patch) {
  const save = current || blankSave();
  Object.assign(save, patch);
  saveAll(save);
  return save;
}

export function clearAll() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export { blankSave };
