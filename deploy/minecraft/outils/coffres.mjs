// Génère VaeloriaCrates/crates.yml : coffres Vote, Rare et Légendaire, 16 lots chacun (format lisible de
// VaeloriaCrates 0.2.0, réencodé en binaire par le plugin à la première sauvegarde).
//
//   node deploy/minecraft/outils/coffres.mjs [crates.yml du serveur]
//
// Le crates.yml du serveur (facultatif) sert à garder l'apparence de la clé Vote déjà distribuée.
// Poids sur 1 000 par coffre : poids 25 = 2,5 %. Valeurs de référence (VaeloriaShop) : débutant 1 500 à 3 000 $/h,
// joueur équipé 6 000 à 12 000 $/h ; clé Vote = 1 par vote (3 par jour), clé Rare = 150 points, Légendaire = 400 points.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../kit/plugins/VaeloriaCrates/crates.yml');
const serverFile = process.argv[2];
const voteKey = serverFile && fs.existsSync(serverFile)
  ? (fs.readFileSync(serverFile, 'utf8').match(/coffre_vote:[\s\S]*?\n {4}key: (\S+)/) ?? [])[1] : null;

// ── Briques ──
const money = (n, mat, w, bc = false) => ({ w, bc, give: false, item: { material: mat, name: `&6&l${n.toLocaleString('fr-FR').replace(/ /g, ' ')} $`, lore: ['&7Versés sur ton compte.'] }, cmd: [`eco give {player} ${n}`] });
const item = (material, amount, name, w, extra = {}) => ({ w, bc: !!extra.bc, give: true, item: { material, amount, name, ...(extra.lore ? { lore: extra.lore } : {}), ...(extra.enchants ? { enchants: extra.enchants } : {}), ...(extra.glow ? { glow: true } : {}) } });
const kit = (id, label, mat, w, bc = false) => ({ w, bc, give: false, item: { material: mat, name: `&e&lKit ${label}`, lore: ['&7Le contenu du kit, une fois.', '&8(l\'accès permanent reste en /boutique)'], glow: true }, cmd: [`kit ${id} {player}`] });
const shopItem = (id, name, mat, w, bc = false, lore = []) => ({ w, bc, give: false, item: { material: mat, name, lore: lore.length ? lore : ['&7L\'objet de la boutique de VÆLORIA.'] }, cmd: [`shop admin give {player} ${id} 1`] });
const spawner = (id, mob, w) => ({ w, bc: true, give: false, item: { material: 'SPAWNER', name: `&c&lGénérateur ${mob}`, lore: ['&7Un vrai générateur de VÆLORIA,', '&7revenu passif pour ta faction.'] }, cmd: [`shop admin give {player} ${id} 1`] });
const key = (crate, label, mat, w) => ({ w, bc: true, give: false, item: { material: mat, name: `&f&lClé ${label}`, glow: true, lore: ['&7Une clé de coffre en plus !'] }, cmd: [`crate give {player} ${crate} 1`] });
const grade = (g, label, w, temp) => ({ w, bc: true, give: false, item: { material: 'NAME_TAG', name: `&d&lGrade ${label}${temp ? ` &7(${temp.replace('d', ' jours')})` : ' &7(définitif)'}`, glow: true, lore: [temp ? '&7Grade temporaire, cumulable.' : '&7Le grade, pour toujours.', '&7Warp farm et avantages du grade.'] }, cmd: [temp ? `lp user {player} parent addtemp ${g} ${temp} accumulate` : `lp user {player} parent add ${g}`] });

// ── Coffres ──
const crates = {
  coffre_vote: {
    name: '&e&lCoffre Vote', locations: ['spawn;31;105;-80', 'spawn;27;105;-80'],
    key: voteKey ?? { material: 'TRIPWIRE_HOOK', name: '&e&lClé Vote', lore: ['&7Clic droit sur un coffre Vote', '&7(Trésorerie du spawn).', '&8Gagnée à chaque vote : /vote'], glow: true },
    lots: [
      money(500, 'GOLD_NUGGET', 150),
      money(1000, 'GOLD_INGOT', 110),
      money(2500, 'GOLD_BLOCK', 40),
      item('COOKED_BEEF', 32, '&f32 steaks cuits', 110),
      item('GOLDEN_APPLE', 2, '&f2 pommes dorées', 70),
      item('EXPERIENCE_BOTTLE', 16, '&f16 fioles d\'expérience', 90),
      item('IRON_INGOT', 16, '&f16 lingots de fer', 70),
      item('DIAMOND', 4, '&b4 diamants', 50),
      item('ENDER_PEARL', 16, '&f16 perles de l\'Ender', 50),
      kit('construction', 'Construction', 'BRICKS', 60),
      kit('farmeur', 'Farmeur', 'WHEAT', 50),
      kit('explorateur', 'Explorateur', 'COMPASS', 40),
      item('DIAMOND_PICKAXE', 1, '&bPioche du votant', 40, { enchants: { efficiency: 4, unbreaking: 3 }, lore: ['&7Gagnée au coffre Vote.'] }),
      shopItem('houe_moisson_1', '&fHoue de moisson &cI', 'IRON_HOE', 40),
      key('coffre_rare', 'Rare', 'AMETHYST_SHARD', 25),
      spawner('spawner_zombie', 'Zombie', 5),
    ],
  },
  coffre_rare: {
    name: '&b&lCoffre Rare', locations: ['spawn;27;105;-84', 'spawn;31;105;-84'],
    key: { material: 'AMETHYST_SHARD', name: '&b&lClé Rare', lore: ['&7Clic droit sur un coffre Rare', '&7(Trésorerie du spawn).', '&8/boutique · coffre Vote'], glow: true },
    lots: [
      money(5000, 'GOLD_INGOT', 170),
      money(10000, 'GOLD_BLOCK', 90),
      money(25000, 'GOLD_BLOCK', 30, true),
      item('GOLDEN_APPLE', 6, '&f6 pommes dorées', 90),
      item('EXPERIENCE_BOTTLE', 32, '&f32 fioles d\'expérience', 90),
      item('DIAMOND', 16, '&b16 diamants', 70),
      item('ENCHANTED_BOOK', 1, '&bLivre Protection IV', 60, { enchants: { protection: 4 } }),
      kit('minerais', 'Minerais', 'IRON_PICKAXE', 70),
      kit('alchimiste', 'Alchimiste', 'BREWING_STAND', 60),
      item('DIAMOND_SWORD', 1, '&bLame du coffre Rare', 60, { enchants: { sharpness: 5, unbreaking: 3 }, lore: ['&7Gagnée au coffre Rare.'] }),
      item('DIAMOND_CHESTPLATE', 1, '&bPlastron du coffre Rare', 50, { enchants: { protection: 4, unbreaking: 3 }, lore: ['&7Gagné au coffre Rare.'] }),
      shopItem('hache_bucheron', '&fHache du bûcheron', 'DIAMOND_AXE', 50),
      item('TOTEM_OF_UNDYING', 1, '&6Totem d\'immortalité', 30, { bc: true }),
      spawner('spawner_skeleton', 'Squelette', 25),
      key('coffre_legendaire', 'Légendaire', 'ECHO_SHARD', 25),
      grade('guerrier', 'Guerrier', 30, '7d'),
    ],
  },
  coffre_legendaire: {
    name: '&6&lCoffre Légendaire', locations: ['spawn;29;105;-82'],
    key: { material: 'ECHO_SHARD', name: '&6&lClé Légendaire', lore: ['&7Clic droit sur le coffre royal', '&7(Trésorerie du spawn).', '&8/boutique · coffre Rare'], glow: true },
    lots: [
      money(25000, 'GOLD_BLOCK', 220),
      money(50000, 'GOLD_BLOCK', 100, true),
      money(100000, 'NETHERITE_INGOT', 25, true),
      kit('pvp', 'PvP', 'NETHERITE_SWORD', 90),
      kit('forgeron', 'Forgeron', 'ANVIL', 80),
      kit('sorcier', 'Sorcier', 'ENCHANTING_TABLE', 70),
      item('NETHERITE_SWORD', 1, '&6&lLame légendaire', 60, { bc: true, enchants: { sharpness: 5, unbreaking: 3, fire_aspect: 2 }, lore: ['&7Gagnée au coffre Légendaire.'] }),
      item('NETHERITE_CHESTPLATE', 1, '&6&lPlastron légendaire', 50, { bc: true, enchants: { protection: 4, unbreaking: 3 }, lore: ['&7Gagné au coffre Légendaire.'] }),
      item('ENCHANTED_GOLDEN_APPLE', 2, '&d2 pommes dorées enchantées', 60),
      item('ELYTRA', 1, '&5&lÉlytres', 15, { bc: true }),
      shopItem('pioche_abysses', '&5Pioche des abysses', 'NETHERITE_PICKAXE', 60),
      spawner('spawner_enderman', 'Enderman', 60),
      spawner('spawner_blaze', 'Blaze', 40),
      spawner('spawner_golem', 'Golem de fer', 10),
      grade('guerrier', 'Guerrier', 40, null),
      grade('roi', 'Roi', 20, '30d'),
    ],
  },
};

// ── Contrôles ──
for (const [id, c] of Object.entries(crates)) {
  if (c.lots.length !== 16) throw new Error(`${id} : ${c.lots.length} lots au lieu de 16`);
  const total = c.lots.reduce((s, l) => s + l.w, 0);
  if (total !== 1000) throw new Error(`${id} : poids total ${total} au lieu de 1000`);
}

// ── YAML ──
const q = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const itemYaml = (it, ind) => {
  const p = ' '.repeat(ind);
  let y = `${p}material: ${it.material}\n`;
  if (it.amount && it.amount > 1) y += `${p}amount: ${it.amount}\n`;
  if (it.name) y += `${p}name: ${q(it.name)}\n`;
  if (it.lore) y += `${p}lore: [${it.lore.map(q).join(', ')}]\n`;
  if (it.enchants) y += `${p}enchants: {${Object.entries(it.enchants).map(([k, v]) => `${k}: ${v}`).join(', ')}}\n`;
  if (it.glow) y += `${p}glow: true\n`;
  return y;
};
let y = `# Coffres VaeloriaCrates — généré par deploy/minecraft/outils/coffres.mjs (Vote, Rare, Légendaire : 16 lots chacun).
# Format lisible de VaeloriaCrates 0.2.0 : le plugin le réencode en binaire à la première modification en jeu.
# install.sh ne le pose que si le serveur n'a pas encore les coffres Rare et Légendaire (les réglages faits en jeu
# avec /crate admin ne sont jamais écrasés). Chances : poids ÷ 1000.
crates:
`;
for (const [id, c] of Object.entries(crates)) {
  y += `  ${id}:\n    name: ${q(c.name)}\n    animation: true\n`;
  y += typeof c.key === 'string' ? `    key: ${c.key}\n` : `    key:\n${itemYaml(c.key, 6)}`;
  y += `    locations: [${c.locations.map(q).join(', ')}]\n    rewards:\n`;
  c.lots.forEach((l, i) => {
    y += `      '${i}':\n        weight: ${l.w}\n        give-item: ${l.give}\n        broadcast: ${l.bc}\n`;
    if (l.cmd) y += `        commands: [${l.cmd.map(q).join(', ')}]\n`;
    y += `        item:\n${itemYaml(l.item, 10)}`;
  });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, y);

const strip = (s) => s.replace(/&[0-9a-fk-or]/g, '');
for (const [id, c] of Object.entries(crates)) {
  console.log(`\n${strip(c.name)} — clé : ${typeof c.key === 'string' ? 'clé Vote existante conservée' : strip(c.key.name)} — ${c.locations.join(' · ')}`);
  for (const l of c.lots) console.log(`  ${(l.w / 10).toFixed(1).padStart(5)} %  ${strip(l.item.name)}${l.bc ? '  (annoncé)' : ''}`);
}
console.log(`\n→ ${path.relative(process.cwd(), OUT)}`);
