// Génère les 16 parcelles de boutiques de joueurs (VaeloriaShop, /pshop) à partir de la schematic du spawn.
//
//   node deploy/minecraft/outils/parcelles.mjs <spawn.schem> [--node-modules <dossier>]
//
// - <spawn.schem> : vaeloria-spawn-fusionne-noel.schem (projet vaeloria-spawn), collée en 0 100 0 dans « spawn ».
// - Lecture NBT : prismarine-nbt (par défaut celui de C:/Users/addeg/vaeloria-spawn/node_modules, sinon --node-modules).
//
// Écrit dans deploy/minecraft/kit/plugins/VaeloriaShop/data/ :
//   plots.yml        zone, gamme, comptoir et point d'arrivée de chaque boutique (format de PlayerShops.load)
//   plots/<n>.yml    modèle de chaque parcelle (format de PlotTemplate : remise à neuf en fin de bail)
//
// Les zones viennent de minecraft/ile-commerciale/shops.json (intérieur de chaque boutique, relatif au point de
// collage de l'île), décalées du point où l'île est posée dans le spawn fusionné (X +140). Le script vérifie sur la
// schematic que chaque porte porte bien le panneau « Boutique NN » avant d'écrire quoi que ce soit.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const args = process.argv.slice(2);
const schemFile = args.find((a) => !a.startsWith('--'));
const nmIdx = args.indexOf('--node-modules');
const nodeModules = nmIdx >= 0 ? args[nmIdx + 1] : 'C:/Users/addeg/vaeloria-spawn/node_modules';
if (!schemFile) { console.error('Usage : node parcelles.mjs <spawn.schem> [--node-modules <dossier>]'); process.exit(1); }
const nbt = createRequire(path.join(nodeModules, 'x.js'))('prismarine-nbt');

// ── Placement (doit rester aligné sur vaeloria-spawn : compose.mjs et out/points.json → annexes) ──
const WORLD = 'spawn';
const SPAWN_ORIGIN = [0, 100, 0];          // //paste du spawn
const ISLAND_AT = [140, 0, 0];             // « Île Marchande » dans points.json → annexes, relatif au collage du spawn
const TIER = { 'Échoppe': 'standard', 'Boutique': 'premium', 'Grande boutique': 'prestige', 'Enseigne': 'prestige' };

// ── Lecture de la schematic (Sponge v2/v3) ──
const parsed = nbt.parseUncompressed(zlib.gunzipSync(fs.readFileSync(schemFile)), 'big', { noArraySizeCheck: true });
const rootTag = parsed.value.Schematic ? parsed.value.Schematic.value : parsed.value;
const root = nbt.simplify({ type: 'compound', name: '', value: rootTag });
const blocksTag = root.Blocks ?? root;                       // v3 : Blocks { Palette, Data } ; v2 : Palette, BlockData
const W = root.Width, H = root.Height, L = root.Length;
const palette = [];
for (const [k, v] of Object.entries(blocksTag.Palette)) palette[v] = k;
const raw = Uint8Array.from(blocksTag.Data ?? blocksTag.BlockData, (x) => x & 0xff);
const data = new Int32Array(W * H * L);
for (let i = 0, p = 0; i < data.length; i++) { let v = 0, s = 0, b; do { b = raw[p++]; v |= (b & 0x7f) << s; s += 7; } while (b & 0x80); data[i] = v; }
const md = root.Metadata ?? {};
const weOff = [md.WEOffsetX ?? 0, md.WEOffsetY ?? 0, md.WEOffsetZ ?? 0];
const block = (x, y, z) => {
  const sx = x - SPAWN_ORIGIN[0] - weOff[0], sy = y - SPAWN_ORIGIN[1] - weOff[1], sz = z - SPAWN_ORIGIN[2] - weOff[2];
  if (sx < 0 || sy < 0 || sz < 0 || sx >= W || sy >= H || sz >= L) throw new Error(`hors schematic : ${x} ${y} ${z}`);
  return palette[data[sx + sz * W + sy * W * L]];
};
const name = (s) => s.replace('minecraft:', '').split('[')[0];
const signs = new Map();
const beTag = (blocksTag.BlockEntities ?? root.BlockEntities ?? []);
for (const be of beTag) {
  const [sx, sy, sz] = be.Pos;
  const w = [sx + SPAWN_ORIGIN[0] + weOff[0], sy + SPAWN_ORIGIN[1] + weOff[1], sz + SPAWN_ORIGIN[2] + weOff[2]];
  const m = JSON.stringify(be).match(/Boutique (\d{2})/);
  if (m) signs.set(Number(m[1]), w);
}

// ── Parcelles ──
const shops = JSON.parse(fs.readFileSync(path.join(REPO, 'minecraft/ile-commerciale/shops.json'), 'utf8'));
const add = (a, b) => a.map((v, i) => v + b[i]);
const P = add(SPAWN_ORIGIN, ISLAND_AT);
const plots = [];
for (const s of shops) {
  const r = s.depuis_bout_du_ponton;
  const min = add(r.min, P), max = add(r.max, P), door = add(r.porte, P);
  const north = door[2] < min[2] ? false : true;               // rangée nord : porte au sud de l'intérieur (z max + 1)
  const sign = signs.get(s.id);
  if (!sign || sign[0] !== door[0] || sign[2] !== door[2] + (north ? 1 : -1))
    throw new Error(`Boutique ${s.id} : panneau « Boutique ${String(s.id).padStart(2, '0')} » absent au-dessus de la porte ${door} (trouvé : ${sign})`);
  if (name(block(...door)) !== 'air') throw new Error(`Boutique ${s.id} : porte ${door} bouchée (${block(...door)})`);

  // Comptoir : bloc de comptoir (rondin de chêne pâle écorcé) le plus proche de l'axe de la porte, avec de l'air
  // au-dessus (l'objet en vitrine flotte à +1,35) ; sinon (échoppes) le pot décoré isolé, le long du mur latéral.
  let counter = null, best = Infinity;
  for (let x = min[0]; x <= max[0]; x++) for (let y = min[1]; y <= max[1]; y++) for (let z = min[2]; z <= max[2]; z++) {
    const b = name(block(x, y, z));
    const free = y < max[1] && name(block(x, y + 1, z)) === 'air';
    if (!free) continue;
    const score = b === 'stripped_pale_oak_log' ? Math.abs(x - door[0])
      : b === 'decorated_pot' && z !== (north ? min[2] : max[2]) ? 100 + Math.abs(x - door[0]) : Infinity;
    if (score < best) { best = score; counter = [x, y, z]; }
  }
  if (!counter) throw new Error(`Boutique ${s.id} : aucun comptoir trouvé`);

  // Arrivée : juste derrière la porte, tournée vers le fond de la boutique.
  const spawn = { x: door[0] + 0.5, y: door[1], z: north ? max[2] + 0.5 : min[2] + 0.5, yaw: north ? 180 : 0 };
  if (name(block(door[0], door[1], north ? max[2] : min[2])) !== 'air') throw new Error(`Boutique ${s.id} : arrivée bouchée`);
  plots.push({ id: s.id, name: `Boutique ${String(s.id).padStart(2, '0')}`, type: s.type, tier: TIER[s.type], min, max, counter, spawn });
}

// ── Écriture ──
const OUT = path.join(REPO, 'deploy/minecraft/kit/plugins/VaeloriaShop/data');
fs.mkdirSync(path.join(OUT, 'plots'), { recursive: true });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let y = `# Généré par deploy/minecraft/outils/parcelles.mjs (île marchande du spawn fusionné, X +140). Ne pas éditer à la main :\n`
  + `# relancer le script. install.sh ne l'installe que si le serveur n'a encore aucune parcelle définie.\nplots:\n`;
for (const p of plots) {
  y += `  '${p.id}':\n    name: ${q(p.name)}\n    tier: ${p.tier}\n    world: ${WORLD}\n`
    + `    min: [${p.min.join(', ')}]\n    max: [${p.max.join(', ')}]\n    counter: [${p.counter.join(', ')}]\n`
    + `    spawn:\n      ==: org.bukkit.Location\n      world: ${WORLD}\n      x: ${p.spawn.x}\n      y: ${p.spawn.y.toFixed(1)}\n`
    + `      z: ${p.spawn.z}\n      pitch: 0.0\n      yaw: ${p.spawn.yaw.toFixed(1)}\n    revenue: 0.0\n`;
}
y += 'sales: []\n';
fs.writeFileSync(path.join(OUT, 'plots.yml'), y);

// Modèles : même ordre que PlotTemplate.save (y, puis z, puis x), indices de palette en short big-endian.
for (const p of plots) {
  const pal = [], idx = new Map();
  const vol = (p.max[0] - p.min[0] + 1) * (p.max[1] - p.min[1] + 1) * (p.max[2] - p.min[2] + 1);
  const buf = Buffer.alloc(vol * 2);
  let o = 0;
  for (let yy = p.min[1]; yy <= p.max[1]; yy++) for (let z = p.min[2]; z <= p.max[2]; z++) for (let x = p.min[0]; x <= p.max[0]; x++) {
    const st = block(x, yy, z);
    if (!idx.has(st)) { idx.set(st, pal.length); pal.push(st); }
    buf.writeUInt16BE(idx.get(st), o); o += 2;
  }
  const t = `world: ${WORLD}\nmin:\n${p.min.map((v) => `- ${v}`).join('\n')}\nmax:\n${p.max.map((v) => `- ${v}`).join('\n')}\n`
    + `palette:\n${pal.map((s) => `- ${q(s)}`).join('\n')}\nblocks: ${buf.toString('base64')}\n`;
  fs.writeFileSync(path.join(OUT, 'plots', `${p.id}.yml`), t);
}

for (const p of plots) console.log(`${p.name.padEnd(12)} ${p.type.padEnd(16)} ${p.tier.padEnd(9)} ${p.min.join(',')} → ${p.max.join(',')}  comptoir ${p.counter.join(' ')} (${name(block(...p.counter))})  arrivée ${p.spawn.x} ${p.spawn.y} ${p.spawn.z}`);
console.log(`→ ${path.relative(REPO, OUT)}/plots.yml et plots/1..${plots.length}.yml`);
