// Génère les icônes PWA et les écrans de démarrage iOS en PNG, sans dépendance (zlib natif).
// Usage : node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [5, 5, 6];
const FG = [244, 244, 245];
const ACCENT = [255, 90, 54];

// Logo en coordonnées normalisées (carré 0..1) : un « M » géométrique + trait accent.
const M = [
  [0.22, 0.72], [0.22, 0.3], [0.32, 0.3], [0.5, 0.52], [0.68, 0.3], [0.78, 0.3],
  [0.78, 0.72], [0.68, 0.72], [0.68, 0.47], [0.5, 0.68], [0.32, 0.47], [0.32, 0.72],
];
const BAR = [0.22, 0.77, 0.78, 0.8];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function crc32(buf) {
  let c;
  const table = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 2; // RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Dessine le logo centré, de taille `logo` px, avec suréchantillonnage 4× (anticrénelage). */
function render(w, h, logo, glow = true) {
  const ox = (w - logo) / 2;
  const oy = (h - logo) / 2;
  const S = [0.125, 0.375, 0.625, 0.875];
  return png(w, h, (x, y) => {
    // léger halo radial derrière le logo
    let base = BG;
    if (glow) {
      const dx = (x - w / 2) / logo;
      const dy = (y - h / 2) / logo;
      const d = Math.sqrt(dx * dx + dy * dy);
      const k = Math.max(0, 0.09 - d * 0.1);
      base = [BG[0] + (ACCENT[0] - BG[0]) * k, BG[1] + (ACCENT[1] - BG[1]) * k, BG[2] + (ACCENT[2] - BG[2]) * k];
    }
    const u0 = (x - ox) / logo;
    const v0 = (y - oy) / logo;
    if (u0 < 0.1 || u0 > 0.9 || v0 < 0.2 || v0 > 0.9) return base.map(Math.round);
    let fg = 0;
    let ac = 0;
    for (const sx of S)
      for (const sy of S) {
        const u = (x + sx - ox) / logo;
        const v = (y + sy - oy) / logo;
        if (inPoly(u, v, M)) fg++;
        else if (u >= BAR[0] && u <= BAR[2] && v >= BAR[1] && v <= BAR[3]) ac++;
      }
    const a = fg / 16;
    const b = ac / 16;
    return [0, 1, 2].map((i) => Math.round(base[i] * (1 - a - b) + FG[i] * a + ACCENT[i] * b));
  });
}

const icons = [
  ['icon-192.png', 192, 192, 192],
  ['icon-512.png', 512, 512, 512],
  ['icon-maskable-512.png', 512, 512, 380], // zone sûre des icônes masquables
  ['apple-touch-icon.png', 180, 180, 180],
  ['favicon-32.png', 32, 32, 32],
];
for (const [name, w, h, logo] of icons) {
  writeFileSync(join(OUT, name), render(w, h, logo, w > 64));
  console.log('✓', name);
}

// Écrans de démarrage iOS (portrait) : [largeur, hauteur, densité]
const splashes = [
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1170, 2532],
  [1179, 2556],
  [1242, 2688],
  [1284, 2778],
  [1290, 2796],
];
for (const [w, h] of splashes) {
  const name = `splash-${w}x${h}.png`;
  writeFileSync(join(OUT, name), render(w, h, Math.round(w * 0.36)));
  console.log('✓', name);
}
