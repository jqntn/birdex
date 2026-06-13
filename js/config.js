export const LS_KEY = 'birdex:v1';

export const EBIRD_EXPORT_URL = 'https://ebird.org/downloadMyData';
export const EBIRD_SPECIES_URL = (code) => `https://ebird.org/species/${code}`;
export const WIKI_SUMMARY_URL = (sci) =>
  `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sci.replace(/ /g, '_'))}`;

export const DATA = {
  core: 'data/taxonomy.core.json',
  meta: 'data/taxonomy.meta.json',
  namesFr: 'data/taxonomy.names.fr.json',
  namesEn: 'data/taxonomy.names.en.json',
  rarity: 'data/rarity.json',
  regionIndex: 'data/regions/_index.json',
  region: (code) => `data/regions/${code}.json`,
};

export const DEFAULT_LOCALE = 'fr';
export const DEFAULT_REGION = 'world';

export const SHINY_SALT = 'birdex-v1';
export const SHINY_ODDS = 512;

export const RARITY = [
  { id: 'common', en: 'Common', fr: 'Commun' },
  { id: 'uncommon', en: 'Uncommon', fr: 'Peu commun' },
  { id: 'rare', en: 'Rare', fr: 'Rare' },
  { id: 'endemic', en: 'Endemic', fr: 'Endémique' },
  { id: 'legendary', en: 'Legendary', fr: 'Légendaire' },
];

export const COUNTABLE_CATEGORIES = new Set(['species', 'issf']);
