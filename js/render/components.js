// Shared UI pieces. Grid entries use inline-SVG silhouettes (no per-species
// image files) tinted by rarity + caught state — crisp, themeable, offline.

import * as tax from '../data/taxonomy.js';
import { rarityTier } from '../data/rarity.js';
import { RARITY } from '../config.js';
import { el } from '../util/dom.js';
import { getLocale } from '../i18n.js';

// A few generic bird silhouettes; pick by order so the grid isn't monotone.
const SIL = {
  perch:
    'M48 22c-6 0-10 3-13 7-3-1-7-1-11 1-6 3-9 9-9 9s7-1 10 0c-4 4-6 9-6 9s6-4 10-4c-1 5 1 12 1 12l4-9c2 6 7 10 7 10s0-7 2-11c3 5 9 7 9 7s-3-6-3-10c4 2 9 1 9 1s-4-4-5-8c5-1 9-5 9-5s-9-2-13-1c2-4 1-9-2-12 1 3-1 6-3 7 0-2 0-7-6-9z',
  raptor:
    'M50 18c-4 0-7 2-9 6-8-6-20-7-20-7s5 7 5 11c-6 0-12 4-12 4s7 3 11 3c-3 4-3 10-3 10s5-5 9-6c0 5 3 11 3 11l3-10c2 4 7 6 7 6s-1-6 0-10c3 3 8 3 8 3s-3-5-3-9c5 0 9-4 9-4s-6-2-10-2c3-3 3-8 1-11-1 3-3 5-5 5 1-3 1-8-4-10z',
  water:
    'M30 30c0-7 6-13 13-13 5 0 9 3 11 7 2-1 5-1 7 1l-3 3c1 2 1 5-1 7 6 2 12 8 12 16 0 2-1 3-3 3H18c-2 0-3-1-3-3 0-7 6-12 13-13-1-3 0-6 2-8z',
  wader:
    'M44 16c-5 0-9 4-9 9 0 3 1 5 3 7-2 2-3 5-3 8l-2 22c0 2 1 3 2 3s2-1 2-3l1-20h2l1 20c0 2 1 3 2 3s2-1 2-3l-1-22c0-3-1-6-3-8 2-2 3-4 3-7 5 1 11-1 11-1s-5-3-8-4c2-2 2-6-1-8-1 2-2 3-4 4z',
};
const ORDER_SHAPE = {
  Passeriformes: 'perch', Piciformes: 'perch', Apodiformes: 'perch', Columbiformes: 'perch',
  Psittaciformes: 'perch', Coraciiformes: 'perch', Cuculiformes: 'perch',
  Accipitriformes: 'raptor', Falconiformes: 'raptor', Strigiformes: 'raptor', Cathartiformes: 'raptor',
  Anseriformes: 'water', Pelecaniformes: 'water', Suliformes: 'water', Podicipediformes: 'water',
  Gaviiformes: 'water', Procellariiformes: 'water', Sphenisciformes: 'water', Phoenicopteriformes: 'wader',
  Charadriiformes: 'wader', Ciconiiformes: 'wader', Gruiformes: 'wader', Phaethontiformes: 'water',
};

export function silhouetteSVG(i) {
  const shape = ORDER_SHAPE[tax.orderName(tax.orderIdxOf(i))] || 'perch';
  return `<svg viewBox="0 0 72 60" class="sil" aria-hidden="true"><path d="${SIL[shape]}"/></svg>`;
}

export const rarityId = (i) => RARITY[rarityTier(i)].id;

// A dex grid card.
export function card(i, { caught, isNew } = {}) {
  const rid = rarityId(i);
  const name = caught ? tax.commonName(i, getLocale()) : tax.commonName(i, getLocale());
  const node = el('button', {
    class: `card r-${rid} ${caught ? 'caught' : 'unseen'}${isNew ? ' is-new' : ''}`,
    dataset: { idx: i },
    type: 'button',
  });
  node.innerHTML =
    `<span class="card-num">#${String(tax.dexNumber(i)).padStart(4, '0')}</span>` +
    `<span class="card-sil">${silhouetteSVG(i)}</span>` +
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
