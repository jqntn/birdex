import { buildTaxonomy } from './fetchTaxonomy.js';
import { buildRegions } from './fetchRegions.js';
import { computeRarity } from './computeRarity.js';
import { stampVersion, makeBuildId } from './stampVersion.js';
import { loadEnv } from './lib/env.js';

const force = process.argv.includes('--force');
const build = makeBuildId();

(async () => {
  await buildTaxonomy(build);

  loadEnv();
  if (process.env.EBIRD_API_KEY) {
    await buildRegions({ force, build });
  } else {
    console.warn(
      '[buildAll] EBIRD_API_KEY not set — skipping country/region lists. ' +
        'World completion still works; rarity will be partial. ' +
        'Set a key (https://ebird.org/api/keygen) in tools/.env and re-run for full data.'
    );
  }

  computeRarity(build);
  stampVersion(build);
  console.log(`[buildAll] done (build ${build})`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
