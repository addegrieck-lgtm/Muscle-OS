/**
 * Vérification de bout en bout des pages publiques (SEO) : statut HTTP, une seule balise h1,
 * titre et description, données structurées JSON-LD valides, erreurs du navigateur, poids des
 * images chargées. Usage : node scripts/smoke.mjs [adresse du site] (défaut http://localhost:3100).
 */
import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const PAGES = [
  "/",
  "/collections",
  "/collections/lustres",
  "/luminaires/escalier",
  "/luminaires/salle-a-manger",
  "/produit/organza",
  "/produit/ondee",
  "/journal",
  "/journal/choisir-un-lustre-pour-un-grand-salon",
];
const RAW = ["/sitemap.xml", "/robots.txt", "/flux/google-shopping.xml"];

const problems = [];
// CHROMIUM_PATH : navigateur déjà installé (sinon celui de Playwright).
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
for (const path of PAGES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  let imageBytes = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("response", async (r) => {
    if (r.request().resourceType() === "image") {
      const len = Number(r.headers()["content-length"] ?? 0);
      imageBytes += len || (await r.body().catch(() => Buffer.alloc(0))).length;
    }
  });
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
  const info = await page.evaluate(() => ({
    h1: document.querySelectorAll("h1").length,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  const types = [];
  for (const raw of info.ld) {
    try {
      const d = JSON.parse(raw);
      for (const x of Array.isArray(d) ? d : [d]) types.push(x["@type"]);
    } catch {
      problems.push(`${path} : JSON-LD illisible`);
    }
  }
  const status = res?.status() ?? 0;
  if (status !== 200) problems.push(`${path} : HTTP ${status}`);
  if (info.h1 !== 1) problems.push(`${path} : ${info.h1} balise(s) h1`);
  if (!info.title || info.description.length < 50) problems.push(`${path} : titre ou description manquant`);
  if (!info.canonical) problems.push(`${path} : pas d'adresse canonique`);
  if (info.overflow) problems.push(`${path} : défilement horizontal sur mobile`);
  for (const e of errors) problems.push(`${path} : erreur navigateur « ${e.slice(0, 120)} »`);
  console.log(
    `${status} ${path} — ${types.join(", ") || "sans JSON-LD"} — images ${(imageBytes / 1024).toFixed(0)} Ko`,
  );
  await page.close();
}
for (const path of RAW) {
  const r = await fetch(BASE + path);
  if (r.status !== 200) problems.push(`${path} : HTTP ${r.status}`);
  console.log(`${r.status} ${path} — ${(await r.text()).length} octets`);
}
await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} problème(s) :\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\n✔ Pages publiques conformes.");
