// node shoot.js <shot> <dossier> <nbImages> [debut] [fin] [scale]
const { chromium } = require("playwright");
const [,, shot, outDir, frames, from = 0, to, scale = 1] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1080 * scale, height: 1920 * scale } });
  p.on("pageerror", e => console.log("err:", e.message));
  await p.goto(`http://localhost:8765/scene.html?shot=${shot}&scale=${scale}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  const n = +frames, end = to ? +to : n;
  for (let i = +from; i < end; i++) {
    await p.evaluate(t => window.renderAt(t), i / (n - 1));
    await p.screenshot({ path: `${outDir}/f${String(i).padStart(4, "0")}.png` });
  }
  await b.close();
})();
