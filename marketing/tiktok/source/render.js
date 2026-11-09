const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const [,, out, fpsArg, durArg, stills] = process.argv;
(async () => {
  const fps = +fpsArg || 30, dur = +durArg || 24;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(__dirname, 'video.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  if (stills) {
    for (const t of stills.split(',')) { await p.evaluate(t => render(t), +t); await p.screenshot({ path: `${out}-${t}.png` }); }
    await b.close(); return;
  }
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-',
    '-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-shortest',
    '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-profile:v','high','-movflags','+faststart','-c:a','aac','-b:a','128k', out], { stdio: ['pipe','inherit','inherit'] });
  const n = Math.round(fps * dur);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => render(t), i / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
})();
