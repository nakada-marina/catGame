/* Playwright checks for the hired cafe worker; CHROMIUM_PATH and BASE_URL optional. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.join(__dirname, '..'), artifacts = path.join(require('node:os').tmpdir(), 'catgame-staff-check');
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  let server, browser, base = process.env.BASE_URL || 'http://127.0.0.1/';
  try {
    if (!process.env.BASE_URL) {
      server = http.createServer((req, res) => {
        const name = new URL(req.url, base).pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        try {
          res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'text/html');
          res.end(fs.readFileSync(file));
        } catch { res.writeHead(404); res.end(); }
      });
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      base = `http://127.0.0.1:${server.address().port}/`;
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-gpu'] } : {}) });
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.evaluate(() => artworkReady);
    assert.equal(await page.evaluate(() => StaffArt.load), true);
    const frames = await page.evaluate(() => StaffArt.poses.map(pose => {
      const c = StaffArt.frame(pose), data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      return { pose, scale: c.spriteScale, foot: c.footAnchor, transparent: data[3] === 0, rendered: data.some((v, i) => i % 4 === 3 && v), image: c.toDataURL() };
    }));
    assert.equal(new Set(frames.map(f => f.image)).size, 4);
    assert.equal(new Set(frames.map(f => f.scale)).size, 1);
    assert(frames.every(f => f.rendered && f.transparent && f.foot === 142));
    await page.locator('#mNew').click();
    await page.evaluate(() => { finishFirstGuide(true); talking = null; talkQ.length = 0; $('talk').hidden = true; G.money = 20000; G.pop = 20; openShop('family'); });
    const button = page.locator('[data-buy="buy-s-x"]');
    assert(await button.isEnabled());
    const preview = page.locator('[data-staff-preview]');
    assert(await preview.evaluate(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v)));
    for (const width of [320, 393, 1280]) {
      await page.setViewportSize({ width, height: 852 });
      const bounds = await page.locator('.staffrow').evaluate(row => [...row.children].map(el => el.getBoundingClientRect().toJSON()));
      assert(bounds.every(r => r.left >= 0 && r.right <= width + 1), 'worker preview and hiring controls fit ' + width);
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await preview.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(artifacts, 'staff-shop.png') });
    await button.click();
    assert.deepEqual(await page.evaluate(() => ({ hired: G.staff, money: G.money, saved: loadSave().staff })), { hired: true, money: 10000, saved: true });
    assert(await button.isDisabled());
    const poses = await page.evaluate(() => {
      const results = [], draw = ctx.drawImage.bind(ctx);
      try {
        for (const [pose, busy, washing, cooking] of [['idle', 0, false, false], ['cook', 30, false, true], ['wash', 180, true, false], ['greet', 36, false, false]]) {
          staffBusy = busy; G.tableware.wash = washing ? { items: { cup: 1, plate: 0, fork: 0 }, t: 0, duration: 180 } : null;
          jobs = cooking ? [{ state: 'cook' }] : [];
          const source = StaffArt.frame(pose).spriteSource, calls = [];
          ctx.drawImage = (...args) => { if (args[0] === source.image) calls.push(args.slice(1, 5)); draw(...args); };
          drawCounter(); results.push({ pose, matches: calls.length === 1 && calls[0].every((v, i) => v === source.crop[i]) });
        }
      } finally { ctx.drawImage = draw; jobs = []; staffBusy = 0; G.tableware.wash = null; }
      closeModal(); render(); return results;
    });
    assert(poses.every(p => p.matches), 'real counter draws each pose from its original generated atlas');
    await page.screenshot({ path: path.join(artifacts, 'staff-cafe.png') });
    await page.reload(); await page.evaluate(() => artworkReady); await page.locator('#mCont').click();
    assert.equal(await page.evaluate(() => G.staff), true);
    console.log('PASS four generated poses, original-atlas rendering, shop preview/layout, real hiring price and saved worker');
    const fallback = await browser.newPage(); fallback.on('pageerror', e => errors.push(e.message));
    await fallback.route('**/staff-atlas.png*', route => route.abort());
    await fallback.goto(base); await fallback.evaluate(() => artworkReady);
    assert.equal(await fallback.evaluate(() => StaffArt.load), false);
    await fallback.locator('#mNew').click();
    await fallback.evaluate(() => { finishFirstGuide(true); talking = null; talkQ.length = 0; $('talk').hidden = true; G.staff = true; render(); openShop('family'); });
    assert(await fallback.locator('[data-staff-preview]').evaluate(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v)));
    assert.deepEqual(errors, []);
    console.log('PASS worker asset failure keeps the game and shop usable without runtime errors');
  } finally { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
