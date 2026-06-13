import { COUNTABLE_CATEGORIES } from '../config.js';
import { normSci, countryOf, parseEbirdDate } from '../util/format.js';

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = '', q = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { q = false; i++; }
      } else { field += c; i++; }
    } else if (c === '"') { q = true; i++; }
    else if (c === ',') { row.push(field); field = ''; i++; }
    else if (c === '\r') { i++; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else { field += c; i++; }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const parentBinomial = (sci) => sci.trim().split(/\s+/).slice(0, 2).join(' ');

export function parseLifelist(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { sightings: new Map(), rows: 0, countable: 0, skipped: 0 };

  const header = rows[0].map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  const ci = {
    category: col('Category'),
    common: col('Common Name'),
    sci: col('Scientific Name'),
    count: col('Count'),
    loc: col('Location'),
    sp: col('S/P'),
    date: col('Date'),
    exotic: col('Exotic'),
    countable: col('Countable'),
  };

  const sightings = new Map();
  let countable = 0, skipped = 0, dataRows = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0] === '') continue;
    const sciRaw = (cells[ci.sci] || '').trim();
    if (!sciRaw) continue;
    dataRows++;

    const category = (cells[ci.category] || 'species').trim().toLowerCase();
    if (!COUNTABLE_CATEGORIES.has(category)) { skipped++; continue; }
    if (ci.countable >= 0 && (cells[ci.countable] || '').trim() === '0') { skipped++; continue; }

    const joinSci = category === 'issf' ? parentBinomial(sciRaw) : sciRaw;
    const key = normSci(joinSci);
    const d = parseEbirdDate(cells[ci.date]);
    const sp = (cells[ci.sp] || '').trim();
    const rec = {
      sci: joinSci,
      common: (cells[ci.common] || '').trim(),
      count: parseInt(cells[ci.count], 10) || 0,
      sp,
      country: countryOf(sp),
      date: d?.iso || null,
      exotic: (cells[ci.exotic] || '').trim(),
      category,
    };

    const existing = sightings.get(key);
    if (!existing) {
      sightings.set(key, rec);
      countable++;
    } else if (rec.date && (!existing.date || rec.date < existing.date)) {
      sightings.set(key, rec);
    }
  }

  return { sightings, rows: dataRows, countable, skipped };
}
