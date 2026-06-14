import { DATA } from '../config.js';

// Per-species photo manifest from Wikimedia Commons (built by tools/makeMedia.js).
// items[i] = { f: filename, h: md5(filename)[0:2], by: photographer, l: license }.
let items = {};

export async function loadMedia() {
  try {
    const res = await fetch(DATA.media);
    if (!res.ok) throw new Error(String(res.status));
    items = (await res.json()).items || {};
  } catch {
    items = {};
  }
}

export const hasPhoto = (i) => !!items[i];

// Direct CDN thumbnail at a standard bucket width (250 grid, 960 detail) — fast,
// browser-cached, and not rate-limited like the Special:FilePath special page.
export function photoUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m.h[0]}/${m.h}/${m.f}/${width}px-${m.f}`;
}

// Fallback when a direct thumb 404s/429s (un-cached): the generating endpoint at the
// same width. Used only for the handful of cache misses, so it never bursts the limit.
export function photoFallbackUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(m.f)}?width=${width}`;
}

// The original full-resolution image (no thumbnail), for the click-to-zoom view.
export function originalUrl(i) {
  const m = items[i];
  if (!m) return null;
  return `https://upload.wikimedia.org/wikipedia/commons/${m.h[0]}/${m.h}/${m.f}`;
}

// Attribution for the detail caption.
export function photoCredit(i) {
  const m = items[i];
  if (!m) return null;
  return {
    by: m.by || '',
    license: m.l || '',
    fileUrl: `https://commons.wikimedia.org/wiki/File:${m.f}`,
  };
}
