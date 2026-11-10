const { chromium } = require("playwright");
const [,, kind, outDir, frames] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("http://localhost:8765/card.html");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => document.getElementById("logo").complete);
  for (let i = 0; i < +frames; i++) {
    await p.evaluate(([t, k]) => window.renderAt(t, k), [i / (frames - 1), kind]);
    await p.screenshot({ path: `${outDir}/f${String(i).padStart(4, "0")}.png` });
  }
  await b.close();
})();
