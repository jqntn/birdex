// Real-world rarity tiers (vendored) + the deterministic shiny layer.

import { DATA, SHINY_SALT, SHINY_ODDS } from '../config.js';
import { fnv1a } from '../util/hash.js';
import { normSci } from '../util/format.js';

let tiers = null; // Uint8-like array, value 0..4
let partial = false;

export async function loadRarity() {
  const res = await fetch(DATA.rarity);
  if (!res.ok) throw new Error(`fetch ${DATA.rarity} → ${res.status}`);
  const data = await res.json();
  tiers = data.tiers;
  partial = !!data.partial;
  return { partial };
}

export const rarityTier = (i) => tiers?.[i] ?? 0;
export const isRarityPartial = () => partial;

// Deterministic, reproducible across imports and users: depends only on the
// scientific name + a fixed salt. ~1/512.
export function isShiny(sci) {
  return fnv1a(SHINY_SALT + normSci(sci)) % SHINY_ODDS === 0;
}
