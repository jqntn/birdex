import { DATA } from '../config.js';

let index = null;
let subNames = {};
const cache = new Map();

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.json();
}

export async function loadRegionIndex() {
  index = await getJSON(DATA.regionIndex);
  return index.regions;
}

export async function loadRegionNames() {
  try {
    subNames = (await getJSON(DATA.regionNames)).names || {};
  } catch {
    subNames = {};
  }
}

export const regionName = (code) => subNames[code] || null;

export const regionList = () => index?.regions ?? [];
export function regionMeta(code) {
  return index?.regions.find((r) => r.code === code) || null;
}

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
