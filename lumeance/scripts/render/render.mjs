// Rendus 3D des versions de Céleste -> public/products/celeste/rendu-<code>.webp
// Usage : node scripts/render/render.mjs   (CHROMIUM_PATH facultatif)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const types = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path === "/" ? join(root, `scripts/render/${process.env.SCENE || "scene"}.html`) : join(root, path);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  let body;
  try { body = await readFile(file); } catch { return res.writeHead(404).end(); }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(body);
}).listen(0);
const port = server.address().port;

// [code, forme, sphères, largeur cm, profondeur cm, hauteur m]
const versions = (process.argv[2] ? JSON.parse(process.argv[2]) : [
  ["r3", "round", 3, 15, 15, 1.5], ["r5", "round", 5, 20, 20, 2], ["r7", "round", 7, 30, 30, 2.5],
  ["r14", "round", 14, 40, 40, 3], ["r26", "round", 26, 50, 50, 4], ["r36", "round", 36, 60, 60, 5],
  ["r46", "round", 46, 100, 100, 5],
  ["c18", "square", 18, 50, 50, 3.5], ["c26", "square", 26, 50, 50, 4], ["c36", "square", 36, 75, 75, 5],
  ["c46", "square", 46, 100, 100, 5],
  ["l5", "rect", 5, 50, 5, 2], ["l7", "rect", 7, 70, 5, 2.5], ["l14", "rect", 14, 85, 28, 3],
  ["l18", "rect", 18, 85, 28, 3.5], ["l36", "rect", 36, 110, 37, 5],
]);

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 1500 } });
page.on("pageerror", (e) => console.error("Erreur page :", e.message));
for (const entry of versions) {
  // Entrée [code, requête] (scènes génériques) ou [code, forme, n, w, d, h] (Céleste).
  const [code, shape, n, w, d, h] = entry;
  const extra = process.env.EXTRA || "";
  const query = entry.length === 2 ? shape : `shape=${shape}&n=${n}&w=${w}&d=${d}&h=${h}&seed=${n * 7 + w}`;
  await page.goto(`http://127.0.0.1:${port}/?${query}${extra}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 3_600_000, polling: 2000 });
  console.log(code, "rendu en", Math.round((await page.evaluate(() => window.__ms ?? 0)) / 1000), "s");
  // Lecture directe du canevas (rendu en 2×), puis réduction : anticrénelage par suréchantillonnage.
  const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  const out = resolve(root, process.env.OUT_DIR || "public/products/celeste", `${process.env.PREFIX || "rendu-"}${code}.webp`);
  const size = process.env.OUT_SIZE ? process.env.OUT_SIZE.split("x").map(Number) : [1200, 1500];
  await sharp(png).resize(size[0], size[1], { kernel: "lanczos3" }).webp({ quality: 86 }).toFile(out);
  console.log("✔", out);
}
await browser.close();
server.close();
