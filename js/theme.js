// Theme = a data-theme attribute on <html>; CSS custom properties do the rest.

import { state, emit } from './state.js';

export function applyTheme(theme = state.theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme() {
  const next = state.theme === 'dex-dark' ? 'dex-dim' : 'dex-dark';
  emit({ theme: next });
  applyTheme(next);
}
