import * as tax from '../data/taxonomy.js';
import { state } from '../state.js';
import { rarityTier } from '../data/rarity.js';
import { isShiny } from '../data/rarity.js';
import { RARITY, EBIRD_SPECIES_URL } from '../config.js';
import { el, clear } from '../util/dom.js';
import { t, getLocale } from '../i18n.js';
import { silhouetteSVG } from './components.js';
import { hasPhoto, photoUrl, photoCredit } from '../data/media.js';
import { fmtDate, flagEmoji } from '../util/format.js';
import { COUNTRY_NAMES } from '../data/continents.js';

let overlay, box;

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
  let credit = null;
  if (hasPhoto(i)) {
    const img = el('img', { class: 'detail-photo', src: photoUrl(i, 1280), alt: '' });
    img.onerror = () => { media.classList.remove('has-photo'); media.innerHTML = `<div class="detail-sil">${silhouetteSVG(i)}</div>`; };
    media.append(img);
    media.classList.add('has-photo');
    const c = photoCredit(i);
    const txt = [c.by ? `© ${c.by}` : null, c.license || null, 'Wikimedia Commons'].filter(Boolean).join(' · ');
    credit = el('a', { class: 'detail-credit', href: c.fileUrl, target: '_blank', rel: 'noopener' }, txt);
  } else {
    media.innerHTML = `<div class="detail-sil">${silhouetteSVG(i)}</div>`;
  }
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
    caught && (rec?.totalCount ?? rec?.count) ? fact(t('count'), String(rec?.totalCount ?? rec?.count)) : null,
    el('div', { class: 'detail-status' }, caught ? `✓ ${t('caught')}` : t('notCaught'))
  );

  const ebird = el('a', {
    class: 'detail-ebird', href: EBIRD_SPECIES_URL(tax.speciesCode(i)),
    target: '_blank', rel: 'noopener',
  }, `${t('ebirdPage')} ↗`);

  const close_btn = el('button', { class: 'detail-close', type: 'button', onclick: close }, '✕');
  box.append(close_btn, media);
  if (credit) box.append(credit);
  box.append(header, facts, ebird);

  overlay.style.display = 'flex';
}

function fact(label, value) {
  if (value == null || value === '') return null;
  return el('div', { class: 'fact' }, el('span', { class: 'fact-label' }, label), el('span', { class: 'fact-value' }, value));
}
