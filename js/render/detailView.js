import * as tax from '../data/taxonomy.js';
import { state } from '../state.js';
import { rarityTier } from '../data/rarity.js';
import { isShiny } from '../data/rarity.js';
import { RARITY, WIKI_SUMMARY_URL } from '../config.js';
import { el, clear } from '../util/dom.js';
import { t, getLocale } from '../i18n.js';
import { silhouetteSVG } from './components.js';
import { fmtDate, flagEmoji } from '../util/format.js';
import { COUNTRY_NAMES } from '../data/continents.js';

let overlay, box;
const thumbCache = new Map();

export function mountDetail(rootParent) {
  overlay = el('div', { class: 'overlay', id: 'detail-overlay', style: { display: 'none' } });
  box = el('div', { class: 'detail-box' });
  overlay.append(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (overlay.style.display !== 'none' && (e.key === 'Escape')) close();
  });
  rootParent.append(overlay);
}

export function close() {
  overlay.style.display = 'none';
  if (location.hash.startsWith('#/species/')) history.back();
}

export function openDetail(i) {
  const rid = RARITY[rarityTier(i)].id;
  const sci = tax.sciName(i);
  const shiny = state.caughtSet.has(i) && isShiny(sci);
  const caught = state.caughtSet.has(i);
  const rec = caught ? state.save?.species?.[tax.speciesCode(i)] : null;

  clear(box);
  box.className = `detail-box r-${rid}${shiny ? ' shiny' : ''}`;

  const media = el('div', { class: 'detail-media' });
  media.innerHTML = `<div class="detail-sil">${silhouetteSVG(i)}</div>`;
  if (shiny) media.insertAdjacentHTML('beforeend', '<span class="shiny-mark">✦</span>');

  const ext = tax.isExtinct(i) ? el('span', { class: 'tag tag-extinct' }, t('extinct')) : null;
  const oor = rec?.outOfRegion ? el('span', { class: 'tag tag-oor' }, t('outOfRegion')) : null;

  const header = el('div', { class: 'detail-head' },
    el('div', { class: 'detail-num' }, `#${String(tax.dexNumber(i)).padStart(4, '0')}`),
    el('h2', { class: 'detail-name' }, tax.commonName(i, getLocale())),
    el('div', { class: 'detail-sci' }, sci),
    el('div', { class: 'detail-tags' },
      el('span', { class: `tag tag-rarity r-${rid}` }, getLocale() === 'fr' ? RARITY[rarityTier(i)].fr : RARITY[rarityTier(i)].en),
      shiny ? el('span', { class: 'tag tag-shiny' }, `✦ ${t('shiny')}`) : null,
      ext, oor
    )
  );

  const facts = el('div', { class: 'detail-facts' },
    fact(t('order'), tax.orderName(tax.orderIdxOf(i))),
    fact(t('family'), tax.familyName(tax.familyIdxOf(i), getLocale())),
    caught ? fact(t('firstSeen'), rec?.date ? fmtDate(rec.date, getLocale()) : '—') : null,
    caught ? fact(t('lastSeen'), (rec?.lastDate || rec?.date) ? fmtDate(rec.lastDate || rec.date, getLocale()) : '—') : null,
    caught && rec?.country ? fact(t('location'), `${flagEmoji(rec.country)} ${COUNTRY_NAMES[rec.country] || rec.sp || rec.country}`) : null,
    caught && rec?.count ? fact(t('count'), String(rec.count)) : null,
    el('div', { class: 'detail-status' }, caught ? `✓ ${t('caught')}` : t('notCaught'))
  );

  const close_btn = el('button', { class: 'detail-close', type: 'button', onclick: close }, '✕');
  box.append(close_btn, media, header, facts);

  overlay.style.display = 'flex';
  loadThumb(sci, media);
}

function fact(label, value) {
  if (value == null || value === '') return null;
  return el('div', { class: 'fact' }, el('span', { class: 'fact-label' }, label), el('span', { class: 'fact-value' }, value));
}

async function loadThumb(sci, media) {
  if (thumbCache.has(sci)) {
    const url = thumbCache.get(sci);
    if (url) setThumb(media, url);
    return;
  }
  try {
    const res = await fetch(WIKI_SUMMARY_URL(sci));
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const url = data?.thumbnail?.source || null;
    thumbCache.set(sci, url);
    if (url && overlay.style.display !== 'none') setThumb(media, url);
  } catch {
    thumbCache.set(sci, null);
  }
}

function setThumb(media, url) {
  const img = new Image();
  img.className = 'detail-photo';
  img.alt = '';
  img.onload = () => {
    const sil = media.querySelector('.detail-sil');
    if (sil) sil.replaceWith(img);
    else media.prepend(img);
    media.classList.add('has-photo');
  };
  img.src = url;
}
