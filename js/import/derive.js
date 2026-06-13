// Pure aggregation: turn parsed sightings + taxonomy/region/rarity into the
// persisted species map, the caught index set, and the precomputed `agg` block.

import * as tax from '../data/taxonomy.js';
import { rarityTier, isShiny } from '../data/rarity.js';
import { RARITY } from '../config.js';
import { COUNTRY_CONTINENT } from '../data/continents.js';

// sightings: Map<normSci, rec>; regionSet: Set<idx> | null (world)
export function deriveFromSightings(sightings, regionSet) {
  const species = {}; // code -> stored record
  const caughtSet = new Set();
  const byRarity = Object.fromEntries(RARITY.map((r) => [r.id, 0]));
  const byYear = {};
  const byCountry = {};
  const byDate = {};
  const continents = new Set();
  const shinies = [];
  const unmatched = [];

  let seenInRegion = 0;

  for (const [, rec] of sightings) {
    const idx = tax.idxOfSci(rec.sci);
    if (idx === undefined) {
      unmatched.push(rec);
      continue;
    }
    const code = tax.speciesCode(idx);
    caughtSet.add(idx);

    const inRegion = regionSet ? regionSet.has(idx) : true;
    if (inRegion) seenInRegion++;

    const tier = RARITY[rarityTier(idx)].id;
    const shiny = isShiny(rec.sci);
    if (shiny) shinies.push(code);
    byRarity[tier]++;

    if (rec.date) {
      const y = rec.date.slice(0, 4);
      byYear[y] = (byYear[y] || 0) + 1;
      byDate[rec.date] = (byDate[rec.date] || 0) + 1;
    }
    if (rec.country) {
      byCountry[rec.country] = (byCountry[rec.country] || 0) + 1;
      const cont = COUNTRY_CONTINENT[rec.country];
      if (cont) continents.add(cont);
    }

    species[code] = {
      count: rec.count,
      sp: rec.sp,
      country: rec.country,
      date: rec.date,
      exotic: rec.exotic,
      category: rec.category,
      shiny,
      rarity: tier,
      outOfRegion: !inRegion,
    };
  }

  // Biggest single-day haul.
  let biggestDay = null;
  for (const [date, c] of Object.entries(byDate)) {
    if (!biggestDay || c > biggestDay.count) biggestDay = { date, count: c };
  }

  const agg = {
    liferCount: caughtSet.size,
    seenInRegion,
    byRarity,
    byYear,
    byCountry,
    continents: [...continents],
    biggestDay,
    shinies,
  };

  return { species, caughtSet, agg, unmatched };
}
