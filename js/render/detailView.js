import * as tax from '../data/taxonomy.js';
import { state } from '../state.js';
import { rarityTier } from '../data/rarity.js';
import { isShiny } from '../data/rarity.js';
import { RARITY, EBIRD_SPECIES_URL } from '../config.js';
import { el, clear } from '../util/dom.js';
import { t, getLocale } from '../i18n.js';
import { silhouetteSVG } from './components.js';
import { hasPhoto, photoUrl, photoFallbackUrl, containWidth, photoCredit } from '../data/media.js';
import { regionName } from '../data/regions.js';
import { fmtDate, flagEmoji } from '../util/format.js';
import { COUNTRY_NAMES } from '../data/continents.js';

let overlay, box, lightbox, lightboxImg;

export function mountDetail(rootParent) {
  overlay = el('div', { class: 'overlay', id: 'detail-overlay', style: { display: 'none' } });
  box = el('div', { class: 'detail-box' });
  overlay.append(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  lightbox = el('div', { class: 'lightbox', style: { display: 'none' } });
  lightboxImg = el('img', { class: 'lightbox-img', alt: '' });
  lightbox.append(lightboxImg);
  lightbox.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lightbox.style.display !== 'none') closeLightbox();
    else if (overlay.style.display !== 'none') close();
  });
  window.addEventListener('resize', () => { if (overlay.style.display !== 'none') fitCreditAuthor(); });
  rootParent.append(overlay, lightbox);
}

// Truncate the author to fit on one line, appending our own ellipsis after trimming
// trailing whitespace — so the credit always has exactly one space before the "·"
// (the browser's text-overflow:ellipsis can leave a stray space depending on the cut).
let measureCtx;
function fitCreditAuthor() {
  const credit = box && box.querySelector('.detail-credit');
  const author = credit && credit.querySelector('.credit-author');
  if (!author || !author.dataset.full) return;
  const meta = credit.querySelector('.credit-meta');
  const full = author.dataset.full;
  const cs = getComputedStyle(author);
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const avail = credit.clientWidth - (meta ? meta.offsetWidth : 0) - 6;
  if (avail <= 0 || measureCtx.measureText(full).width <= avail) { author.textContent = full; return; }
  const ellW = measureCtx.measureText('…').width;
  let lo = 1, hi = full.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measureCtx.measureText(full.slice(0, mid)).width + ellW <= avail) lo = mid; else hi = mid - 1;
  }
  author.textContent = full.slice(0, lo).replace(/\s+$/, '') + '…';
}

export function close() {
  if (lightbox.style.display !== 'none') closeLightbox();
  overlay.style.display = 'none';
  if (location.hash.startsWith('#/species/')) history.back();
}

function openLightbox(i, rid) {
  lightbox.className = `lightbox r-${rid}`;
  // Show the already-loaded detail thumb instantly, then swap to the contain-fit thumbnail —
  // longest side ~1280 (so tall portraits aren't fetched at full height), browser-readable.
  lightboxImg.src = photoUrl(i, 500);
  const full = new Image();
  full.onload = () => { if (lightbox.style.display !== 'none') lightboxImg.src = full.src; };
  const fw = containWidth(i, 1280);
  let triedFallback = false;
  full.onerror = () => {
    if (triedFallback) return;          // give up; the 500px placeholder stays
    triedFallback = true;
    full.src = photoFallbackUrl(i, fw); // generating endpoint resolves odd formats (TIFF→.jpg, etc.)
  };
  full.src = photoUrl(i, fw);
  lightbox.style.display = 'flex';
}

function closeLightbox() {
  lightbox.style.display = 'none';
  lightboxImg.removeAttribute('src');
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
  media.innerHTML = `<div class="detail-sil">${silhouetteSVG()}</div>`;
  let credit = null;
  if (hasPhoto(i)) {
    const c = photoCredit(i);
    const meta = [c.license, 'Wikimedia Commons'].filter(Boolean).join(' · ');
    // One line: the author shrinks with an ellipsis if long; license + source stay.
    credit = el('a', { class: 'detail-credit', href: c.fileUrl, target: '_blank', rel: 'noopener' },
      c.by ? el('span', { class: 'credit-author', dataset: { full: `© ${c.by}` } }, `© ${c.by}`) : null,
      el('span', { class: 'credit-meta' }, c.by ? ` · ${meta}` : meta)
    );
    const img = el('img', { class: 'detail-photo', src: photoUrl(i, 500), alt: '', title: t('viewFull') });
    let triedFallback = false;
    img.onerror = () => {
      if (!triedFallback) { triedFallback = true; img.src = photoFallbackUrl(i, 500); }
      else { img.remove(); media.classList.remove('has-photo'); credit.remove(); }
    };
    img.addEventListener('click', () => openLightbox(i, rid));
    media.append(img);
    media.classList.add('has-photo');
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
    caught && rec?.country ? fact(t('location'), `${flagEmoji(rec.country)} ${[regionName(rec.sp), COUNTRY_NAMES[rec.country] || rec.country].filter(Boolean).join(', ')}`) : null,
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
  fitCreditAuthor();
}

function fact(label, value) {
  if (value == null || value === '') return null;
  return el('div', { class: 'fact' }, el('span', { class: 'fact-label' }, label), el('span', { class: 'fact-value' }, value));
}
