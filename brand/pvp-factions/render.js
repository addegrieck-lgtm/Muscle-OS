// Rendu PNG des SVG : node render.js  (Playwright)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const files = [
  ["vaeloria-pvp-factions-logo.svg", 1200, false],
  ["vaeloria-pvp-factions-logo-transparent.svg", 1200, true],
  ["vaeloria-pvp-factions-profil.svg", 1080, false],
  ["vaeloria-pvp-factions-pixel-logo.svg", 1200, false],
  ["vaeloria-pvp-factions-pixel-logo-transparent.svg", 1200, true],
  ["vaeloria-pvp-factions-pixel-profil.svg", 1080, false],
];
(async () => {
  const b = await chromium.launch();
  for (const [f, s, transparent] of files) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    const svg = fs.readFileSync(path.join(__dirname, f), "utf8");
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, f.replace(".svg", ".png")), omitBackground: transparent });
    console.log(f.replace(".svg", ".png"));
  }
  await b.close();
})();
