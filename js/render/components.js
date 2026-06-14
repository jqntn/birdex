import * as tax from '../data/taxonomy.js';
import { rarityTier } from '../data/rarity.js';
import { RARITY } from '../config.js';
import { el } from '../util/dom.js';
import { getLocale } from '../i18n.js';
import { hasPhoto, photoUrl, photoFallbackUrl } from '../data/media.js';

// A single egg-shaped silhouette for every species without a photo: pointed top,
// rounded wider bottom, widest in the lower half.
const EGG = 'M36 8C47 8 55 24 55 37C55 46 47 53 36 53C25 53 17 46 17 37C17 24 25 8 36 8Z';

export function silhouetteSVG() {
  return `<svg viewBox="0 0 72 60" class="sil" aria-hidden="true"><path d="${EGG}"/></svg>`;
}

export const rarityId = (i) => RARITY[rarityTier(i)].id;

export function card(i, { caught, isNew } = {}) {
  const rid = rarityId(i);
  const name = tax.commonName(i, getLocale());
  const photo = hasPhoto(i);
  const node = el('button', {
    class: `card r-${rid} ${caught ? 'caught' : 'unseen'}${isNew ? ' is-new' : ''}${photo ? ' has-photo' : ''}`,
    dataset: { idx: i },
    type: 'button',
  });
  node.innerHTML =
    `<span class="card-sil">${silhouetteSVG(i)}</span>` +
    (photo ? `<img class="card-photo" src="${photoUrl(i, 250)}" alt="" data-fb="${photoFallbackUrl(i, 250)}" onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.removeAttribute('data-fb')}else{this.remove()}">` : '') +
    `<span class="card-num">#${String(tax.dexNumber(i)).padStart(4, '0')}</span>` +
    `<span class="card-name">${escapeHtml(name)}</span>`;
  if (isNew) node.insertAdjacentHTML('beforeend', '<span class="card-new">NEW</span>');
  return node;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function progressBar(done, total, label) {
  const p = total ? (done / total) * 100 : 0;
  return el('div', { class: 'progress' },
    label ? el('div', { class: 'progress-label' }, label) : null,
    el('div', { class: 'progress-track' }, el('div', { class: 'progress-fill', style: { width: `${p}%` } })),
    el('div', { class: 'progress-val' }, `${done} / ${total} · ${Math.round(p * 10) / 10}%`)
  );
}
