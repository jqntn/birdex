// Compute real-world rarity tiers from how many COUNTRY lists each species
// appears in. Tiers (0..4): Common, Uncommon, Rare, Endemic, Legendary.
//
//   occ = number of country region files a species appears in
//   Legendary  if extinct || occ === 0 || (monotypicFamily && occ <= 3)
//   Endemic    if occ === 1
//   Rare       if occ <= 4    (>= 2)
//   Uncommon   if occ <= 19   (>= 5)
//   Common     otherwise (>= 20 countries — genuinely widespread)
//
// Bird ranges are heavily right-skewed: most species occur in only a few
// countries, so these cutoffs keep cosmopolitan birds Common while leaving the
// vast majority of the world's localized species as the chase tiers.
//
// If no country region files exist yet (no API key run), falls back to
// extinct -> Legendary, everything else Common, and marks the file partial.

import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deltaUnpack } from './lib/pack.js';
import { COUNTRIES } from './regionCodes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const REGIONS_DIR = join(DATA_DIR, 'regions');

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export function computeRarity(build = new Date().toISOString()) {
  const core = JSON.parse(readFileSync(join(DATA_DIR, 'taxonomy.core.json'), 'utf8'));
  const { count, extinct, familyIdx } = core;

  // Monotypic families: exactly one species.
  const famCounts = new Map();
  for (const fi of familyIdx) famCounts.set(fi, (famCounts.get(fi) || 0) + 1);
  const monotypic = familyIdx.map((fi) => famCounts.get(fi) === 1);

  // Occurrence counts from country files only (continents/world excluded).
  const occ = new Uint16Array(count);
  let countryFiles = 0;
  let files = [];
  try {
    files = readdirSync(REGIONS_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    files = [];
  }
  for (const f of files) {
    const code = f.replace(/\.json$/, '');
    if (!COUNTRY_CODES.has(code)) continue; // skip world, continents, _index
    const region = JSON.parse(readFileSync(join(REGIONS_DIR, f), 'utf8'));
    for (const idx of deltaUnpack(region.deltas)) occ[idx]++;
    countryFiles++;
  }

  const partial = countryFiles === 0;
  const tiers = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    if (partial) {
      tiers[i] = extinct[i] ? 4 : 0;
      continue;
    }
    const o = occ[i];
    if (extinct[i] || o === 0 || (monotypic[i] && o <= 3)) tiers[i] = 4;
    else if (o === 1) tiers[i] = 3;
    else if (o <= 4) tiers[i] = 2;
    else if (o <= 19) tiers[i] = 1;
    else tiers[i] = 0;
  }

  const dist = [0, 0, 0, 0, 0];
  for (const t of tiers) dist[t]++;

  writeFileSync(
    join(DATA_DIR, 'rarity.json'),
    JSON.stringify({ build, partial, countriesUsed: countryFiles, tiers: Array.from(tiers) })
  );
  console.log(
    `[rarity] ${partial ? 'PARTIAL (no country lists; extinct→legendary only) ' : `from ${countryFiles} countries `}` +
      `dist common/uncommon/rare/endemic/legendary = ${dist.join('/')}`
  );
  return { partial, dist };
}

if (process.argv[1]?.endsWith('computeRarity.js')) {
  computeRarity();
}
