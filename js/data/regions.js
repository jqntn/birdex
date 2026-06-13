// Region index + lazy per-region species sets. A region file stores ascending
// deltas; we reconstruct a Set<idx> for O(1) membership. Only regions with a
// vendored file appear in the picker (graceful when country lists aren't built).

import { DATA } from '../config.js';

let index = null; // { build, regions: [{code,type,en,fr,count,continent}] }
const cache = new Map(); // code -> Set<idx>

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.json();
}

export async function loadRegionIndex() {
  index = await getJSON(DATA.regionIndex);
  return index.regions;
}

export const regionList = () => index?.regions ?? [];
export function regionMeta(code) {
  return index?.regions.find((r) => r.code === code) || null;
}

// Returns Set<idx> for the region, or null for "world" (means all species).
export async function loadRegion(code) {
  if (code === 'world') return null;
  if (cache.has(code)) return cache.get(code);
  const data = await getJSON(DATA.region(code));
  const set = new Set();
  let acc = 0;
  for (const d of data.deltas) {
    acc += d;
    set.add(acc);
  }
  cache.set(code, set);
  return set;
}

export function regionSpeciesCount(code, totalCount) {
  if (code === 'world') return totalCount;
  return regionMeta(code)?.count ?? totalCount;
}
