// Génère les déclinaisons raster indispensables (apple-touch-icon, image Open Graph, icône 512)
// à partir des SVG vectoriels de /public/brand. Nécessite Playwright + Chromium (outil de dev).
//   node scripts/render-raster.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = (f) => `data:image/svg+xml;base64,${readFileSync(join(root, "public/brand", f)).toString("base64")}`;

const jobs = [
  { out: "app/apple-icon.png", w: 180, h: 180, html: `<body style="margin:0"><img src="${svg("favicon.svg")}" width="180" height="180"></body>` },
  { out: "public/brand/icone-512.png", w: 512, h: 512, html: `<body style="margin:0"><img src="${svg("favicon.svg")}" width="512" height="512"></body>` },
  { out: "public/brand/icone-reseaux.png", w: 1080, h: 1080, html: `<body style="margin:0"><img src="${svg("icone-reseaux.svg")}" width="1080" height="1080"></body>` },
  {
    out: "public/og-default.png",
    w: 1200,
    h: 630,
    html: `<body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#3a2f27,#191817 70%)"><img src="${svg("logo-vertical-clair.svg")}" style="height:440px"></body>`,
  },
];

// CHROMIUM_PATH : chemin d’un Chromium déjà installé (sinon celui de Playwright).
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
  await page.setContent(j.html);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(root, j.out), omitBackground: false });
  await page.close();
  console.log("✔", j.out);
}
await browser.close();
