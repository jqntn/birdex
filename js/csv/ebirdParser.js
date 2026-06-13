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

const binomial = (sci) => sci.trim().split(/\s+/).slice(0, 2).join(' ');

// Markers of non-countable eBird taxa in the full data export: spuh ("Anas sp."),
// slashes ("Anas crecca/carolinensis"), hybrids ("... x ..." / "×"), and
// domestic/feral forms or group brackets ("(Domestic type)", "[Group]").
const NON_SPECIES = /\bsp\.|\/| x |×|\(|\[/i;

// Parses an eBird CSV (the full "Download My Data" export, or a life list) and
// aggregates every observation down to one record per species, tracking the
// earliest sighting (first seen / lifer) and the latest (last seen).
export function parseEbirdData(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { sightings: new Map(), rows: 0, countable: 0, skipped: 0 };

  const header = rows[0].map((h) => h.trim());
  const find = (...names) => {
    for (const name of names) { const i = header.indexOf(name); if (i >= 0) return i; }
    return -1;
  };
  const ci = {
    common: find('Common Name'),
    sci: find('Scientific Name'),
    count: find('Count'),
    region: find('State/Province', 'S/P', 'State'),
    date: find('Date'),
    sub: find('Submission ID', 'SubID'),
    category: find('Category'),
    countable: find('Countable'),
  };

  const agg = new Map();
  let dataRows = 0, countable = 0, skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0] === '') continue;
    const sciRaw = (cells[ci.sci] || '').trim();
    if (!sciRaw) continue;
    dataRows++;

    if (ci.category >= 0) {
      const cat = (cells[ci.category] || '').trim().toLowerCase();
      if (cat && cat !== 'issf' && !COUNTABLE_CATEGORIES.has(cat)) { skipped++; continue; }
    }
    if (ci.countable >= 0 && (cells[ci.countable] || '').trim() === '0') { skipped++; continue; }
    if (NON_SPECIES.test(sciRaw)) { skipped++; continue; }

    const bin = binomial(sciRaw);
    if (bin.split(' ').length < 2) { skipped++; continue; }

    const key = normSci(bin);
    const iso = parseEbirdDate(cells[ci.date])?.iso || null;
    const region = (cells[ci.region] || '').trim();
    const country = countryOf(region);
    // Every eBird row is a presence; "X" (present, uncounted) and blanks count as 1.
    const rawCount = parseInt((cells[ci.count] || '').trim(), 10);
    const cnt = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
    const sub = ci.sub >= 0 ? (cells[ci.sub] || '').trim() : '';

    let a = agg.get(key);
    if (!a) {
      a = {
        sci: bin, common: (cells[ci.common] || '').trim(),
        firstDate: null, firstSp: region, firstCountry: country, firstCount: cnt,
        lastDate: null, lastSp: region, lastCountry: country,
        totalCount: 0, subs: new Set(), rowCount: 0,
      };
      agg.set(key, a);
      countable++;
    }
    a.totalCount += cnt;
    a.rowCount++;
    if (sub) a.subs.add(sub);
    if (!a.common && cells[ci.common]) a.common = (cells[ci.common] || '').trim();
    if (iso && (!a.firstDate || iso < a.firstDate)) {
      a.firstDate = iso; a.firstSp = region; a.firstCountry = country; a.firstCount = cnt;
    }
    if (iso && (!a.lastDate || iso > a.lastDate)) {
      a.lastDate = iso; a.lastSp = region; a.lastCountry = country;
    }
  }

  const sightings = new Map();
  for (const [key, a] of agg) {
    sightings.set(key, {
      sci: a.sci,
      common: a.common,
      count: a.firstCount,
      totalCount: a.totalCount,
      timesSeen: a.subs.size || a.rowCount,
      sp: a.firstSp,
      country: a.firstCountry,
      date: a.firstDate,
      lastDate: a.lastDate,
      lastSp: a.lastSp,
      lastCountry: a.lastCountry,
      exotic: '',
      category: 'species',
    });
  }

  return { sightings, rows: dataRows, countable, skipped };
}
