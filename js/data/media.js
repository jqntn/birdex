import { DATA } from '../config.js';

// Per-species photo manifest from Wikimedia Commons (built by tools/makeMedia.js).
// items[i] = { f: filename, by: photographer, l: license }.
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

// Wikimedia's supported sized-image endpoint (redirects to a generated thumb at
// the requested width). Works for arbitrary widths, unlike direct upload.* hotlinks.
export function photoUrl(i, width) {
  const m = items[i];
  if (!m) return null;
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
