const { chromium } = require("playwright");
const [,, outDir, frames, from = 0, to] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("console", m => console.log("page:", m.text())); p.on("pageerror", e => console.log("err:", e.message));
  await p.goto("http://localhost:8765/scene.html");
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  const n = +frames, end = to ? +to : n;
  for (let i = +from; i < end; i++) {
    const t0 = Date.now();
    await p.evaluate(t => window.renderAt(t), i / (n - 1));
    await p.screenshot({ path: `${outDir}/f${String(i).padStart(4, "0")}.png` });
    if (i === +from) console.log("frame ms", Date.now() - t0);
  }
  await b.close();
})();
