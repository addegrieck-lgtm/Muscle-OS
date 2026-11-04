/**
 * Génère, avant la construction du site, des versions réduites des photos de `public/products`
 * et `public/brand` (largeurs VARIANT_WIDTHS), dans `public/img-w/<largeur>/…`.
 * Sur Cloudflare, l'optimiseur d'images de Next ne redimensionne pas : le chargeur
 * `lib/image-loader.ts` pointe donc directement vers ces fichiers. Dossier non versionné.
 *
 * Ne bloque jamais la construction : si sharp est indisponible, échoue sur une photo ou prend
 * trop de temps, la photo d'origine est copiée à la place (le site reste juste, en moins léger).
 */
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { VARIANT_WIDTHS } from "../../lib/image-widths.mjs";

const PUBLIC = path.resolve(import.meta.dirname, "../../public");
const OUT = path.join(PUBLIC, "img-w");
const DIRS = ["products", "brand"];
/** Au-delà, les photos restantes sont copiées sans réduction. */
const BUDGET_MS = 6 * 60 * 1000;
const WORKERS = 2;

let sharp = null;
try {
  sharp = (await import("sharp")).default;
  sharp.concurrency(1);
  sharp.cache(false);
} catch (e) {
  console.warn(`Images : sharp indisponible (${e.message}) ; copie des originaux.`);
}

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
const stats = { files: 0, made: 0, copied: 0 };
const jobs = [];
for (const d of DIRS) for await (const src of walk(path.join(PUBLIC, d))) jobs.push(src);

async function one(src) {
  const rel = path.relative(PUBLIC, src);
  stats.files++;
  for (const w of VARIANT_WIDTHS) {
    // Toutes les largeurs existent (le chargeur ne connaît pas la taille d'origine) ; une photo
    // plus petite que la largeur demandée est seulement réencodée, jamais agrandie.
    const out = path.join(OUT, String(w), rel).replace(/\.(jpe?g|png)$/i, ".webp");
    if (await newer(out, src)) continue;
    await mkdir(path.dirname(out), { recursive: true });
    const inTime = Date.now() - started < BUDGET_MS;
    try {
      if (!sharp || !inTime) throw new Error(sharp ? "temps dépassé" : "sharp absent");
      await sharp(src)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(out);
      stats.made++;
    } catch (e) {
      if (sharp && inTime)
        console.warn(`Images : ${rel} (${w}px) copiée telle quelle : ${e.message}`);
      await copyFile(src, out);
      stats.copied++;
    }
  }
  if (stats.files % 100 === 0) console.log(`Images : ${stats.files}/${jobs.length}…`);
}

const queue = jobs.slice();
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (queue.length) await one(queue.shift());
  }),
);
console.log(
  `Images : ${stats.files} photos, ${stats.made} versions réduites, ${stats.copied} copies, en ${((Date.now() - started) / 1000).toFixed(1)} s.`,
);
