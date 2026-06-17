import { DATA } from '../config.js';

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

const BUCKETS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

function bucketWidth(want, native) {
  const cap = Math.min(want, native || want);
  let b = BUCKETS[0];
  for (const x of BUCKETS) if (x <= cap) b = x;
  return b;
}

function thumb(m, w) {
  const name = m.t ? m.t.replace('{w}', w).replace('{f}', m.f) : `${w}px-${m.f}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m.h[0]}/${m.h}/${m.f}/${name}`;
}

export function photoUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  return thumb(m, bucketWidth(width, m.w));
}

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

export function photoFallbackUrl(i, width) {
  const m = items[i];
  if (!m) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(m.f)}?width=${bucketWidth(width, m.w)}`;
}

export function photoCredit(i) {
  const m = items[i];
  if (!m) return null;
  return {
    by: m.by || '',
    license: m.l || '',
    fileUrl: `https://commons.wikimedia.org/wiki/File:${m.f}`,
  };
}
