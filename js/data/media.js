import { DATA } from '../config.js';

// Per-species photo manifest from Wikimedia Commons (built by tools/makeMedia.js).
// items[i] = { f: filename, h: md5(filename)[0:2], by: photographer, l: license,
//   w: native pixel width, ph?: native pixel height (portrait items only),
//   t?: thumb-name template for odd formats (TIFF/video) }.
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

// Wikimedia only generates these standard thumbnail widths; any other width 400s.
// https://www.mediawiki.org/wiki/Common_thumbnail_sizes
const BUCKETS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

// Largest standard bucket that exceeds neither the wanted width nor the source width: never
// upscales (mirrors Wikimedia's own bucketing) and never requests a width the CDN rejects.
function bucketWidth(want, native) {
  const cap = Math.min(want, native || want);
  let b = BUCKETS[0];
  for (const x of BUCKETS) if (x <= cap) b = x;
  return b;
}

// Build the CDN thumb URL at an already-chosen bucket width. Odd formats (TIFF/video) carry a
// name template `t` because their thumb name isn't derivable from the extension (lossy/lossless,
// .jpg/.png, double-dash for video); everything else uses the plain {w}px-{f} form.
function thumb(m, w) {
  const name = m.t ? m.t.replace('{w}', w).replace('{f}', m.f) : `${w}px-${m.f}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m.h[0]}/${m.h}/${m.f}/${name}`;
}

// Direct CDN thumbnail by width (250 grid, 500 detail), stepped down to the source width so we
// never upscale — fast, browser-cached, not rate-limited like Special:FilePath. For the
// object-fit:cover grid/detail images, where width is the dimension that must be filled.
export function photoUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  return thumb(m, bucketWidth(width, m.w));
}

// Request width for the object-fit:contain lightbox (height-constrained): keeps the LONGEST
// side near `budget`. Landscape → budget on width; portrait (m.ph set) → budget on height, so
// width = budget·w/h. Snapped to the nearest bucket that doesn't exceed the source width.
export function containWidth(i, budget) {
  const m = items[i];
  if (!m) return budget;
  const fit = m.ph ? (budget * m.w) / m.ph : budget;
  let best = BUCKETS[0];
  for (const x of BUCKETS) {
    if (m.w && x > m.w) break;
    if (Math.abs(x - fit) < Math.abs(best - fit)) best = x;
  }
  return best;
}

// Fallback when a direct thumb 404s/429s (un-cached): the generating endpoint at the same
// bucketed width — so it never upscales and targets the exact thumb photoUrl wanted, rather
// than pulling the full original. Used only for the handful of cache misses, never bursting.
export function photoFallbackUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(m.f)}?width=${bucketWidth(width, m.w)}`;
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
