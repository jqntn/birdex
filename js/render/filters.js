// Filter bar for the dex: seen/unseen, order, family, rarity. Updates
// state.filters and calls onChange so the app recomputes the visible list.

import * as tax from '../data/taxonomy.js';
import { state, emit } from '../state.js';
import { el, clear } from '../util/dom.js';
import { t, getLocale } from '../i18n.js';
import { RARITY } from '../config.js';
import { rarityTier } from '../data/rarity.js';

let onChange = null;

export function mountFilters(root, opts = {}) {
  onChange = opts.onChange;
  render(root);
}

function render(root) {
  clear(root);
  const f = state.filters;

  // Seen segmented control.
  const seen = el('div', { class: 'seg' },
    ...['all', 'seen', 'unseen'].map((v) =>
      el('button', {
        class: `seg-btn${f.seen === v ? ' active' : ''}`,
        type: 'button',
        onclick: () => { emit({ filters: { ...state.filters, seen: v } }); render(root); onChange?.(); },
      }, t(v))
    )
  );

  // Order select.
  const orderSel = el('select', {
    class: 'sel',
    onchange: (e) => {
      const oi = e.target.value === '' ? null : +e.target.value;
      emit({ filters: { ...state.filters, orderIdx: oi, familyIdx: null } });
      render(root);
      onChange?.();
    },
  }, el('option', { value: '' }, t('order')),
    ...tax.orders().map((o, i) => el('option', { value: i, selected: f.orderIdx === i }, o.name)));

  // Family select (scoped to chosen order when set).
  const fams = tax.families()
    .map((fam, i) => ({ fam, i }))
    .filter(({ fam }) => f.orderIdx == null || fam.orderIdx === f.orderIdx)
    .sort((a, b) => tax.familyName(a.i, getLocale()).localeCompare(tax.familyName(b.i, getLocale())));
  const famSel = el('select', {
    class: 'sel',
    onchange: (e) => {
      emit({ filters: { ...state.filters, familyIdx: e.target.value === '' ? null : +e.target.value } });
      onChange?.();
    },
  }, el('option', { value: '' }, t('family')),
    ...fams.map(({ fam, i }) => el('option', { value: i, selected: f.familyIdx === i }, fam.com || fam.sci)));

  // Rarity select.
  const rarSel = el('select', {
    class: 'sel',
    onchange: (e) => {
      emit({ filters: { ...state.filters, rarity: e.target.value === '' ? null : e.target.value } });
      onChange?.();
    },
  }, el('option', { value: '' }, t('rarity')),
    ...RARITY.map((r) => el('option', { value: r.id, selected: f.rarity === r.id }, getLocale() === 'fr' ? r.fr : r.en)));

  root.append(seen, orderSel, famSel, rarSel);
}

// Build a predicate from the current filters (excluding search).
export function filterPredicate() {
  const f = state.filters;
  const caught = state.caughtSet;
  const region = state.regionSet; // null = world
  return (i) => {
    if (region && !region.has(i)) return false;
    if (f.seen === 'seen' && !caught.has(i)) return false;
    if (f.seen === 'unseen' && caught.has(i)) return false;
    if (f.orderIdx != null && tax.orderIdxOf(i) !== f.orderIdx) return false;
    if (f.familyIdx != null && tax.familyIdxOf(i) !== f.familyIdx) return false;
    if (f.rarity != null && RARITY[rarityTier(i)].id !== f.rarity) return false;
    return true;
  };
}
