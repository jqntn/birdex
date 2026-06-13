import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ICONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icons');

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}

function drawIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const S = size;
  const radius = maskable ? 0 : S * 0.19;
  const k = S / 512;
  const lensX = S * 0.5, lensY = S * 0.527, lensR = 150 * k, ringR = 132 * k;
  const lights = [
    { x: 150 * k, y: 96 * k, r: 26 * k, c: [255, 210, 63] },
    { x: 216 * k, y: 96 * k, r: 16 * k, c: [255, 91, 91] },
    { x: 262 * k, y: 96 * k, r: 16 * k, c: [91, 208, 106] },
  ];
  const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let col = null, a = 255;

      let inside = true;
      if (!maskable) {
        const rx = Math.min(x, S - 1 - x), ry = Math.min(y, S - 1 - y);
        if (rx < radius && ry < radius) inside = dist(rx, ry, radius, radius) <= radius;
      }
      if (!inside) { a = 0; }
      else {
        col = mix([208, 67, 47], [142, 41, 32], y / S);
        const dl = dist(x, y, lensX, lensY);
        if (dl <= lensR) col = [255, 255, 255];
        if (dl <= ringR) {
          const hx = lensX - ringR * 0.24, hy = lensY - ringR * 0.36;
          const dh = dist(x, y, hx, hy) / (ringR * 1.5);
          col = dh < 0.55 ? mix([214, 239, 255], [74, 163, 224], dh / 0.55) : mix([74, 163, 224], [21, 49, 74], Math.min(1, (dh - 0.55) / 0.45));
        }
        for (const lt of lights) {
          if (dist(x, y, lt.x, lt.y) <= lt.r) col = lt.c;
        }
      }

      const o = (y * S + x) * 4;
      if (a === 0) { buf[o] = buf[o + 1] = buf[o + 2] = 0; buf[o + 3] = 0; }
      else { buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; buf[o + 3] = 255; }
    }
  }
  return encodePNG(S, S, buf);
}

mkdirSync(ICONS_DIR, { recursive: true });
writeFileSync(join(ICONS_DIR, 'icon-192.png'), drawIcon(192));
writeFileSync(join(ICONS_DIR, 'icon-512.png'), drawIcon(512));
writeFileSync(join(ICONS_DIR, 'maskable-512.png'), drawIcon(512, { maskable: true }));
console.log('icons written: icon-192.png, icon-512.png, maskable-512.png');
