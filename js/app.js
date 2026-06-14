import { state, emit, subscribe } from './state.js';
import { loadSave, patchSave, clearAll } from './persistence.js';
import { t } from './i18n.js';
import { $, el, clear } from './util/dom.js';
import * as tax from './data/taxonomy.js';
import { loadRarity } from './data/rarity.js';
import { loadMedia } from './data/media.js';
import { loadRegionIndex, regionList, loadRegion, regionMeta } from './data/regions.js';
import { buildIndex, search } from './search/search.js';
import { mountGrid } from './render/dexGrid.js';
import { mountFilters, filterPredicate } from './render/filters.js';
import { mountDetail, openDetail, close as closeDetail } from './render/detailView.js';
import { renderStats } from './render/statsPage.js';
import { renderBadges } from './render/achievements.js';
import { setImportCallbacks, importText, renderOnboarding, dropzone, recomputeRegionStats, loadDemo } from './import/importFlow.js';
import { EBIRD_EXPORT_URL } from './config.js';
import { BUILD } from '../version.js';

let baseIndices = [];
let searchTimer = null;

async function bootstrap() {
  const save = loadSave();
  if (save) emit({ save, locale: save.locale, region: save.region });
  document.documentElement.lang = state.locale;

  showSplash();
  await Promise.all([tax.loadTaxonomy(state.locale), loadRarity(), loadRegionIndex(), loadMedia()]);
  baseIndices = Array.from({ length: tax.count() }, (_, i) => i);

  if (save?.species) {
    const caughtSet = new Set();
    for (const code in save.species) {
      const i = tax.idxOfCode(code);
      if (i != null) caughtSet.add(i);
    }
    emit({ caughtSet });
  }
  await switchRegion(state.region, { silent: true });

  (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(() => buildIndex());

  mountShell();
  setImportCallbacks({ onImported: onImported, onSkip: () => go('dex') });

  window.addEventListener('hashchange', route);
  const first = !save || (!save.importedAt && !save.skippedOnboarding);
  if (first && !location.hash) location.hash = '#/welcome';
  route();

  registerSW();
}

function showSplash() {
  $('#view').innerHTML = `<div class="splash"><div class="splash-mark">🪶</div><div>${t('loading')}</div></div>`;
}

let panels = {};
function mountShell() {
  const view = $('#view');
  clear(view);
  panels = {
    dex: el('div', { class: 'panel', id: 'panel-dex' }),
    stats: el('div', { class: 'panel scroll', id: 'panel-stats' }),
    badges: el('div', { class: 'panel scroll', id: 'panel-badges' }),
    onboard: el('div', { class: 'panel scroll', id: 'panel-onboard' }),
  };
  view.append(panels.dex, panels.stats, panels.badges, panels.onboard);
  mountFilters($('#filters'), { onChange: recompute });
  mountGrid(panels.dex, { onSelect: (i) => { location.hash = `#/species/${tax.speciesCode(i)}`; } });
  recompute();

  const search = $('#search');
  search.placeholder = t('search');
  search.value = state.query;
  search.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const v = e.target.value;
    searchTimer = setTimeout(() => { emit({ query: v }); recompute(); }, 140);
  });

  const picker = $('#region-picker');
  clear(picker);
  for (const r of regionList()) {
    const label = (state.locale === 'fr' ? r.fr : r.en) + (r.type === 'country' ? '' : '');
    picker.append(el('option', { value: r.code, selected: r.code === state.region }, label));
  }
  picker.addEventListener('change', (e) => switchRegion(e.target.value));

  $('#lang-btn').addEventListener('click', toggleLocale);
  $('#reimport-btn').addEventListener('click', () => go('import'));

  $('#tabbar').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) go(tab.dataset.route);
  });

  mountDetail($('#overlay-root'));

  subscribe(['locale'], updateChromeText);
}

function updateChromeText() {
  $('#search').placeholder = t('search');
  const picker = $('#region-picker');
  for (const opt of picker.options) {
    const r = regionMeta(opt.value);
    if (r) opt.textContent = state.locale === 'fr' ? r.fr : r.en;
  }
}

function setActiveTab(route) {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.route === route);
  }
}

async function switchRegion(code, { silent } = {}) {
  const regionSet = await loadRegion(code).catch(() => null);
  emit({ region: code, regionSet });
  if (state.save) {
    recomputeRegionStats(state.save, regionSet);
    patchSave(state.save, { region: code });
  } else {
    patchSave(null, { region: code });
  }
  if (!silent) {
    recompute();
    rerenderCurrent();
  }
}

function toggleLocale() {
  const next = state.locale === 'fr' ? 'en' : 'fr';
  emit({ locale: next });
  document.documentElement.lang = next;
  patchSave(state.save, { locale: next });
  updateChromeText();
  recompute();
  rerenderCurrent();
}

function recompute() {
  const pred = filterPredicate();
  const hits = search(state.query);
  const source = hits ?? baseIndices;
  emit({ visible: source.filter(pred) });
}

function go(route) { location.hash = `#/${route}`; }

function showPanel(name) {
  for (const [k, p] of Object.entries(panels)) p.style.display = k === name ? '' : 'none';
}

function route() {
  const hash = location.hash || '#/dex';
  const filters = $('#filters');

  const sp = hash.match(/^#\/species\/(.+)$/);
  if (sp) {
    const i = tax.idxOfCode(sp[1]);
    if (i != null) { openDetail(i); return; }
  } else {
    closeDetailIfOpen();
  }

  if (hash.startsWith('#/welcome') || hash.startsWith('#/import')) {
    filters.style.display = 'none';
    setActiveTab(null);
    showPanel('onboard');
    clear(panels.onboard);
    if (hash.startsWith('#/welcome')) renderOnboarding(panels.onboard);
    else renderImport(panels.onboard);
    return;
  }

  if (hash.startsWith('#/stats')) { filters.style.display = 'none'; setActiveTab('stats'); showPanel('stats'); renderStats(panels.stats); return; }
  if (hash.startsWith('#/badges')) { filters.style.display = 'none'; setActiveTab('badges'); showPanel('badges'); renderBadges(panels.badges); return; }

  filters.style.display = '';
  setActiveTab('dex');
  showPanel('dex');
}

function closeDetailIfOpen() {
  const ov = $('#detail-overlay');
  if (ov && ov.style.display !== 'none') ov.style.display = 'none';
}

function rerenderCurrent() {
  const hash = location.hash || '#/dex';
  if (hash.startsWith('#/stats')) renderStats(panels.stats);
  else if (hash.startsWith('#/badges')) renderBadges(panels.badges);
}

function renderImport(view) {
  view.append(
    el('div', { class: 'onboard' },
      el('h1', { class: 'onboard-title' }, t('reimport')),
      el('a', { class: 'btn primary', href: EBIRD_EXPORT_URL, target: '_blank', rel: 'noopener' }, t('step1btn')),
      dropzone(),
      el('button', { class: 'btn demo', type: 'button', onclick: () => loadDemo() }, t('demoBtn')),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => go('dex') }, '←')
    )
  );
}

function onImported(summary) {
  let msg = t('importDone', summary.countable);
  if (summary.newLifers) msg += ` · +${summary.newLifers} ${t('newLifer')}`;
  toast(msg);
  if (summary.unmatched) toast(t('needsReview', summary.unmatched), 6000);
  go('dex');
}

let toastTimer = null;
function toast(msg, ms = 3500) {
  const node = $('#toast');
  node.textContent = msg;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), ms);
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    toast('↻ ' + (state.locale === 'fr' ? 'Nouvelle version' : 'New version'));
  });
}

bootstrap().catch((e) => {
  console.error(e);
  $('#view').innerHTML = `<div class="splash">⚠ ${e.message}</div>`;
});

window.birdex = { state, reset: () => { clearAll(); location.reload(); }, build: BUILD };
