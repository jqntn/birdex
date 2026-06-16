import { DATA } from '../config.js';

// Per-species photo manifest from Wikimedia Commons (built by tools/makeMedia.js).
// items[i] = { f: filename, h: md5(filename)[0:2], by: photographer, l: license,
//   w: native pixel width, t?: thumb-name template for odd formats (TIFF/video) }.
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

// Direct CDN thumbnail at a standard bucket width (250 grid, 500 detail, 1280 lightbox),
// stepped down to the source width so we never upscale — fast, browser-cached, and not
// rate-limited like the Special:FilePath special page. Odd formats (TIFF/video) carry a name
// template `t` because their thumb name isn't derivable from the extension (lossy/lossless,
// .jpg/.png, double-dash for video); everything else uses the plain {w}px-{f} form.
export function photoUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  const w = bucketWidth(width, m.w);
  const name = m.t ? m.t.replace('{w}', w).replace('{f}', m.f) : `${w}px-${m.f}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m.h[0]}/${m.h}/${m.f}/${name}`;
}

// Fallback when a direct thumb 404s/429s (un-cached): the generating endpoint at the
// same width. Used only for the handful of cache misses, so it never bursts the limit.
export function photoFallbackUrl(i, width) {
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
