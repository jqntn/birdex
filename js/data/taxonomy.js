import { DATA, DEFAULT_LOCALE } from '../config.js';
import { state } from '../state.js';
import { normSci } from '../util/format.js';

let core = null;
let meta = null;
const names = { fr: null, en: null };
let codeToIdx = null;
let sciToIdx = null;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.json();
}

export async function loadTaxonomy(locale = DEFAULT_LOCALE) {
  const [c, m, primary] = await Promise.all([
    getJSON(DATA.core),
    getJSON(DATA.meta),
    getJSON(locale === 'en' ? DATA.namesEn : DATA.namesFr),
  ]);
  core = c;
  meta = m;
  names[locale] = primary.names;

  codeToIdx = new Map(core.code.map((code, i) => [code, i]));
  sciToIdx = new Map(core.sci.map((s, i) => [normSci(s), i]));

  const other = locale === 'en' ? 'fr' : 'en';
  loadNames(other).catch(() => {});
  return core.count;
}

export async function loadNames(locale) {
  if (names[locale]) return names[locale];
  const data = await getJSON(locale === 'en' ? DATA.namesEn : DATA.namesFr);
  names[locale] = data.names;
  return names[locale];
}

export const count = () => core?.count ?? 0;
export const buildId = () => core?.build ?? '';
export const sciName = (i) => core.sci[i];
export const speciesCode = (i) => core.code[i];
export const dexNumber = (i) => i + 1;
export const isExtinct = (i) => core.extinct[i] === 1;
export const orderIdxOf = (i) => core.orderIdx[i];
export const familyIdxOf = (i) => core.familyIdx[i];

export const idxOfCode = (code) => codeToIdx?.get(code);
export const idxOfSci = (sci) => sciToIdx?.get(normSci(sci));

export const orders = () => meta?.orders ?? [];
export const families = () => meta?.families ?? [];
export const orderName = (oi) => meta.orders[oi]?.name ?? '';
export const family = (fi) => meta.families[fi];

export function commonName(i, locale = state.locale) {
  const primary = names[locale]?.[i];
  if (primary) return primary;
  const other = locale === 'en' ? names.fr?.[i] : names.en?.[i];
  return other || core.sci[i];
}

export function familyName(fi, locale = state.locale) {
  const f = meta.families[fi];
  if (!f) return '';
  return (locale === 'fr' ? f.sci : f.com) || f.sci;
}
