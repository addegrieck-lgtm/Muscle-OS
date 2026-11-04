/**
 * Génère, avant la construction du site, des versions réduites des photos de `public/products`
 * et `public/brand` (largeurs VARIANT_WIDTHS), dans `public/img-w/<largeur>/…`.
 * Sur Cloudflare, l'optimiseur d'images de Next ne redimensionne pas : le chargeur
 * `lib/image-loader.ts` pointe donc directement vers ces fichiers. Dossier non versionné.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { VARIANT_WIDTHS } from "../../lib/image-widths.mjs";

const PUBLIC = path.resolve(import.meta.dirname, "../../public");
const OUT = path.join(PUBLIC, "img-w");
const DIRS = ["products", "brand"];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(webp|jpe?g|png)$/i.test(e.name)) yield p;
  }
}

const newer = async (out, src) => {
  try {
    return (await stat(out)).mtimeMs >= (await stat(src)).mtimeMs;
  } catch {
    return false;
  }
};

const started = Date.now();
let made = 0;
let files = 0;
const jobs = [];
for (const d of DIRS) for await (const src of walk(path.join(PUBLIC, d))) jobs.push(src);

async function one(src) {
  const rel = path.relative(PUBLIC, src);
  files++;
  for (const w of VARIANT_WIDTHS) {
    // Toutes les largeurs existent (le chargeur ne connaît pas la taille d'origine) ; une photo
    // plus petite que la largeur demandée est seulement réencodée, jamais agrandie.
    const out = path.join(OUT, String(w), rel).replace(/\.(jpe?g|png)$/i, ".webp");
    if (await newer(out, src)) continue;
    await mkdir(path.dirname(out), { recursive: true });
    await sharp(src)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(out);
    made++;
  }
}

const queue = jobs.slice();
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) await one(queue.shift());
  }),
);
console.log(
  `Images : ${files} photos, ${made} versions réduites créées en ${((Date.now() - started) / 1000).toFixed(1)} s.`,
);
