import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

// Builds data/media.json: a per-species photo manifest sourced from Wikipedia /
// Wikimedia Commons. For each species (by scientific name) it finds the article's
// lead image, then pulls the photographer + license for an attribution line.
// Stored as { items: { <speciesIndex>: { f: filename, h: md5[0:2], by, l } } }.
// Images are CC-licensed (reuse OK with credit); the app derives any width from
// the upload.wikimedia.org thumb URL and shows the credit on the detail card.
//
// Usage: node tools/makeMedia.js   (no API key needed)

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'Birdex/1.0 (https://jqntn.github.io/birdex) media-manifest-builder';
const BATCH = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html) => (html ? String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '');

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    } catch (e) {
      if (attempt < 5) { await sleep(800 * 2 ** attempt); continue; }
      throw e;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(800 * 2 ** attempt); continue; }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
}

// Scientific name -> lead-image filename (article main image), batched + redirect-aware.
async function leadImages(sci) {
  const out = new Array(sci.length).fill(null);
  for (let i = 0; i < sci.length; i += BATCH) {
    const slice = sci.slice(i, i + BATCH);
    const q = (await api({ action: 'query', redirects: '1', titles: slice.join('|'), prop: 'pageimages', piprop: 'name' })).query || {};
    const norm = new Map((q.normalized || []).map((n) => [n.from, n.to]));
    const redir = new Map((q.redirects || []).map((r) => [r.from, r.to]));
    const page = new Map((q.pages || []).map((p) => [p.title, p]));
    for (let j = 0; j < slice.length; j++) {
      let t = slice[j];
      if (norm.has(t)) t = norm.get(t);
      if (redir.has(t)) t = redir.get(t);
      const p = page.get(t);
      if (p?.pageimage) out[i + j] = p.pageimage.replace(/ /g, '_');
    }
    if ((i / BATCH) % 20 === 0) console.log(`[media] lead images ${i}/${sci.length}`);
    await sleep(100);
  }
  return out;
}

// Filename -> { by, l, mime } via Commons extmetadata (proxied through en.wikipedia).
async function imageInfo(files) {
  const info = new Map();
  const uniq = [...new Set(files.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += BATCH) {
    const slice = uniq.slice(i, i + BATCH);
    const q = (await api({
      action: 'query', titles: slice.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo', iiprop: 'extmetadata|mime', iiextmetadatafilter: 'Artist|LicenseShortName',
    })).query || {};
    for (const p of q.pages || []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const file = p.title.replace(/^File:/, '').replace(/ /g, '_');
      const m = ii.extmetadata || {};
      info.set(file, { by: strip(m.Artist?.value), l: strip(m.LicenseShortName?.value), mime: ii.mime || '' });
    }
    if ((i / BATCH) % 20 === 0) console.log(`[media] image info ${i}/${uniq.length}`);
    await sleep(100);
  }
  return info;
}

(async () => {
  const core = JSON.parse(readFileSync(join(DATA_DIR, 'taxonomy.core.json'), 'utf8'));
  const sci = core.sci;
  console.log(`[media] resolving lead images for ${sci.length} species…`);
  const files = await leadImages(sci);
  console.log(`[media] ${files.filter(Boolean).length} lead images found; fetching attribution…`);
  const info = await imageInfo(files);

  const items = {};
  let kept = 0, skipped = 0;
  for (let i = 0; i < sci.length; i++) {
    const file = files[i];
    if (!file) continue;
    if (/\.svg$/i.test(file)) { skipped++; continue; }
    const inf = info.get(file);
    if (!inf || inf.mime === 'image/svg+xml') { skipped++; continue; }
    const h = createHash('md5').update(file).digest('hex').slice(0, 2);
    items[i] = { f: file, h, by: inf.by || '', l: inf.l || '' };
    kept++;
  }

  const dest = join(DATA_DIR, 'media.json');
  const text = JSON.stringify({ count: sci.length, items });
  writeFileSync(dest, text);
  const pct = ((kept / sci.length) * 100).toFixed(1);
  console.log(`[media] ${kept} species with photos (${pct}% coverage), ${skipped} skipped → data/media.json (${(text.length / 1024).toFixed(0)} KB)`);
})();
