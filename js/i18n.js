// Localization. Species names come from the active-locale taxonomy names file
// (French default, English fallback). UI strings live in the STRINGS table.

import { state } from './state.js';

export const getLocale = () => state.locale;

const STRINGS = {
  fr: {
    appName: 'Birdex',
    dex: 'Dex', stats: 'Stats', badges: 'Badges', import: 'Importer',
    region: 'Région', world: 'Monde',
    search: 'Rechercher un oiseau…',
    all: 'Tous', seen: 'Vus', unseen: 'Non vus',
    order: 'Ordre', family: 'Famille', rarity: 'Rareté',
    completion: 'Complétion', species: 'espèces', lifers: 'oiseaux',
    caught: 'Vu', notCaught: 'Jamais vu', outOfRegion: 'Hors région',
    firstSeen: 'Première observation', location: 'Lieu', count: 'Nombre',
    welcomeTitle: 'Bienvenue dans le Birdex',
    welcomeSub: 'Un Pokédex des oiseaux du monde réel, à partir de votre liste eBird.',
    step1: 'Téléchargez votre liste de vie eBird (CSV)',
    step1btn: 'Ouvrir eBird (télécharger le CSV)',
    step2: 'Déposez le fichier ici',
    dropHint: 'Glissez votre CSV ici, ou cliquez pour parcourir',
    skip: 'Explorer le dex d’abord',
    reimport: 'Réimporter',
    newLifer: 'NOUVEAU',
    biggestDay: 'Plus grande journée', shiny: 'Chromatique',
    noMatch: 'Aucun oiseau trouvé', loading: 'Chargement…',
    importDone: (n) => `${n} oiseaux importés`,
    needsReview: (n) => `${n} espèce(s) non reconnue(s) — version taxonomique différente`,
    completeRegion: 'de la région', completeWorld: 'du monde',
    countries: 'Pays', continents: 'Continents', perYear: 'Oiseaux par année',
    topFamilies: 'Familles principales', rarityDist: 'Répartition par rareté',
    extinct: 'Éteint', offline: 'Hors ligne',
  },
  en: {
    appName: 'Birdex',
    dex: 'Dex', stats: 'Stats', badges: 'Badges', import: 'Import',
    region: 'Region', world: 'World',
    search: 'Search a bird…',
    all: 'All', seen: 'Seen', unseen: 'Unseen',
    order: 'Order', family: 'Family', rarity: 'Rarity',
    completion: 'Completion', species: 'species', lifers: 'lifers',
    caught: 'Seen', notCaught: 'Never seen', outOfRegion: 'Out of region',
    firstSeen: 'First seen', location: 'Location', count: 'Count',
    welcomeTitle: 'Welcome to Birdex',
    welcomeSub: 'A Pokédex of real-world birds, built from your eBird life list.',
    step1: 'Download your eBird life list (CSV)',
    step1btn: 'Open eBird (download CSV)',
    step2: 'Drop the file here',
    dropHint: 'Drag your CSV here, or click to browse',
    skip: 'Explore the dex first',
    reimport: 'Re-import',
    newLifer: 'NEW',
    biggestDay: 'Biggest day', shiny: 'Shiny',
    noMatch: 'No birds found', loading: 'Loading…',
    importDone: (n) => `${n} lifers imported`,
    needsReview: (n) => `${n} species not recognized — taxonomy version differs`,
    completeRegion: 'of region', completeWorld: 'of world',
    countries: 'Countries', continents: 'Continents', perYear: 'Lifers per year',
    topFamilies: 'Top families', rarityDist: 'Rarity breakdown',
    extinct: 'Extinct', offline: 'Offline',
  },
};

export function t(key, ...args) {
  const table = STRINGS[state.locale] || STRINGS.en;
  const v = table[key] ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
