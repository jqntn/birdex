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

// Grid (small): a direct CDN thumbnail at the 250px standard bucket — fast, browser-
// cached, and not subject to the rate limit that throttles the ~20-request grid burst.
// Detail (large): the Special:FilePath render endpoint — a single request per card
// open, so its special-page rate limit is a non-issue, and it serves any width.
export function photoUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  if (width <= 320) {
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m.h[0]}/${m.h}/${m.f}/250px-${m.f}`;
  }
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(m.f)}?width=${width}`;
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
