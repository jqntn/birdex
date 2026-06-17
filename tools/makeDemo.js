import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCSV, binomial, NON_SPECIES } from '../js/csv/ebirdParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const KEEP = ['Common Name', 'Scientific Name', 'Count', 'State/Province', 'Date'];

const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function makeDemo(srcPath) {
  const rows = parseCSV(readFileSync(srcPath, 'utf8'));
  const header = rows[0].map((h) => h.trim());
  const col = Object.fromEntries(KEEP.map((name) => [name, header.indexOf(name)]));
  const missing = KEEP.filter((name) => col[name] < 0);
  if (missing.length) throw new Error(`source is missing columns: ${missing.join(', ')}`);

  const out = [KEEP.join(',')];
  let kept = 0, dropped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0] === '') continue;
    const sci = (cells[col['Scientific Name']] || '').trim();
    if (!sci) continue;
    if (NON_SPECIES.test(sci) || binomial(sci).split(' ').length < 2) { dropped++; continue; }
    out.push(KEEP.map((name) => esc(cells[col[name]])).join(','));
    kept++;
  }

  const dest = join(ROOT, 'data', 'demo.csv');
  const text = out.join('\n') + '\n';
  writeFileSync(dest, text);
  console.log(`[demo] ${kept} rows kept, ${dropped} dropped → data/demo.csv (${(text.length / 1024).toFixed(1)} KB)`);
}

const src = process.argv[2] || join(__dirname, 'MyEBirdData.csv');
makeDemo(src);
