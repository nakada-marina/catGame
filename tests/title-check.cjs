/* Run with Playwright installed; CHROMIUM_PATH and BASE_URL are optional. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.join(__dirname, '..');
const artifacts = path.join(require('node:os').tmpdir(), 'catgame-title-check');
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  let server, browser;
  const base = process.env.BASE_URL || 'http://127.0.0.1:8768/';
  try {
    if (!process.env.BASE_URL) {
      server = http.createServer((req, res) => {
        const name = new URL(req.url, base).pathname;
        const file = path.join(root, name === '/' ? 'index.html' : name);
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        try {
          res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'text/html');
          res.end(fs.readFileSync(file));
        } catch { res.writeHead(404); res.end(); }
      });
      await new Promise(resolve => server.listen(8768, '127.0.0.1', resolve));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-gpu'] } : {}) });
    const errors = [], failures = [];
    for (const [width, height, dpr] of [[320, 568, 2], [393, 852, 3], [430, 932, 3], [1280, 900, 1], [844, 390, 2]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failures.push(r.url()); });
      await page.goto(base); await page.evaluate(() => titleScene.ready);
      assert.equal(await page.locator('#titleScene').getAttribute('data-background'), width < height ? 'portrait' : 'landscape');
      assert.equal(await page.locator('#titleScene').getAttribute('data-background-ready'), 'true');
      assert(await page.locator('#titleScreen').isVisible());
      assert(await page.locator('#modal').isHidden());
      assert(await page.locator('#wrap').isHidden());
      assert.equal(await page.locator('#mCont').count(), 0, 'no resume button without a save');
      const state = await page.evaluate(() => ({ g: G, mode, saved: localStorage.getItem(SAVE_KEY), inert: $('wrap').inert, scroll: document.body.scrollHeight }));
      assert.equal(state.g, null); assert.equal(state.mode, 'title'); assert.equal(state.saved, null); assert(state.inert);
      assert(state.scroll <= height + 1, 'no hidden game scroll behind title');
      const boxes = await page.locator('#mNew,#titleMotion,.title-sign,.title-greeting').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().toJSON()));
      for (const r of boxes) assert(r.left >= 0 && r.top >= 0 && r.right <= width + 1 && r.bottom <= height + 1, 'visible title controls at ' + width + 'x' + height);
      const previous = await page.locator('#titleScene').evaluate(c => ({ frame: c.dataset.frame, pixels: c.toDataURL() }));
      await page.waitForFunction(frame => $('titleScene').dataset.frame !== frame, previous.frame);
      assert.notEqual(await page.locator('#titleScene').evaluate(c => c.toDataURL()), previous.pixels, 'scene actually animates');
      if (width === 393) {
        await page.locator('#titleScene').click({ position: { x: width * .74, y: height * .75 } });
        assert((await page.locator('#titleGreeting').textContent()).includes('なでてくれて'));
      }
      await page.locator('#titleMotion').click();
      assert.equal(await page.locator('#titleMotion').getAttribute('aria-pressed'), 'false');
      const frozen = await page.locator('#titleScene').evaluate(c => c.toDataURL());
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.equal(await page.locator('#titleScene').evaluate(c => c.toDataURL()), frozen, 'motion toggle freezes the scene');
      await page.locator('#titleMotion').click();
      assert.equal(await page.locator('#titleMotion').getAttribute('aria-pressed'), 'true');
      if (width === 393 || width === 1280) await page.screenshot({ path: path.join(artifacts, `title-${width}.png`) });
      const oldCanvas = await page.locator('#titleScene').elementHandle();
      await page.locator('#mNew').click();
      await page.evaluate(() => artworkReady);
      assert(await page.locator('#titleScreen').isHidden()); assert(await page.locator('#wrap').isVisible());
      assert.equal(await page.evaluate(() => $('wrap').inert), false);
      assert.equal(await page.evaluate(() => mode), 'open');
      assert.equal(await page.evaluate(() => G.day), 1);
      assert.equal(await oldCanvas.evaluate(c => c.isConnected), false, 'title animation canvas removed after starting');
      assert((await page.locator('#cafe').boundingBox()).width > 0, 'game canvas refitted after unhiding');
      await page.close();
      console.log(`PASS title layout, actual motion/toggle and new game ${width}x${height} DPR ${dpr}`);
    }
    const resumed = await browser.newPage({ viewport: { width: 320, height: 568 } });
    resumed.on('pageerror', e => errors.push(e.message));
    await resumed.goto(base); await resumed.evaluate(() => titleScene.ready);
    await resumed.evaluate(() => {
      const saved = newSave(); saved.day = 7; saved.money = 12345; saved.pop = 48;
      saved.flags = { intro: true, firstCustomerDone: true }; saved.menu.push('tea');
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    });
    await resumed.reload(); await resumed.evaluate(() => titleScene.ready);
    assert((await resumed.locator('#mCont').textContent()).includes('7日目'));
    const before = await resumed.evaluate(() => localStorage.getItem(SAVE_KEY));
    const frame = await resumed.locator('#titleScene').getAttribute('data-frame');
    await resumed.waitForFunction(f => $('titleScene').dataset.frame !== f, frame);
    assert.equal(await resumed.evaluate(() => localStorage.getItem(SAVE_KEY)), before, 'title animation never advances or rewrites saved progress');
    const menu = await resumed.locator('.title-menu').boundingBox();
    assert(menu.y + menu.height <= 568, 'both start/resume options fit on a short phone');
    await resumed.locator('#mCont').click();
    const progress = await resumed.evaluate(() => ({ day: G.day, money: G.money, pop: G.pop, menu: G.menu }));
    assert.equal(progress.day, 7); assert.equal(progress.money, 12345); assert.equal(progress.pop, 48); assert(progress.menu.includes('tea'));
    console.log('PASS saved-day label, unchanged saved progress while title animates, and resume');
    const layout = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    layout.on('pageerror', e => errors.push(e.message));
    await layout.goto(base); await layout.evaluate(() => titleScene.ready);
    await layout.evaluate(() => {
      const saved = newSave(); saved.day = 2;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    });
    await layout.reload(); await layout.evaluate(() => titleScene.ready);
    await layout.evaluate(() => {
      window.titleCatBoxes = [];
      const draw = SpriteRaster.draw;
      SpriteRaster.draw = function (g, image, x, y, width, height) {
        if (g.canvas.id === 'titleScene') {
          const m = g.getTransform(), ratio = g.canvas.width / g.canvas.clientWidth;
          const a = m.transformPoint({ x, y }), b = m.transformPoint({ x: x + width, y: y + height });
          window.titleCatBoxes.push({ left: Math.min(a.x,b.x)/ratio, top: Math.min(a.y,b.y)/ratio, right: Math.max(a.x,b.x)/ratio, bottom: Math.max(a.y,b.y)/ratio });
          window.titleCatBoxes = window.titleCatBoxes.slice(-2);
        }
        return draw(g, image, x, y, width, height);
      };
    });
    for (const [width,height] of [[1280,720],[1366,768],[900,775],[900,600],[768,600],[604,517],[600,500],[1440,900],[900,1000],[500,650],[640,320],[320,568],[393,852]]) {
      await layout.setViewportSize({ width, height });
      await layout.waitForFunction(() => $('titleScene').dataset.backgroundReady === 'true');
      await layout.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const fits = await layout.evaluate(() => {
        const menu = document.querySelector('.title-menu').getBoundingClientRect();
        return window.titleCatBoxes.length === 2 && window.titleCatBoxes.every(c => c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight && !(c.left < menu.right && c.right > menu.left && c.top < menu.bottom && c.bottom > menu.top));
      });
      assert(fits, 'both cats remain visible without overlapping start/resume buttons at '+width+'x'+height);
      if(width===1280 || width===604 || width===393) await layout.screenshot({ path:path.join(artifacts,'title-saved-'+width+'.png') });
    }
    await layout.close();
    console.log('PASS start/resume menu clears both cats across PC sizes, browser zoom-sized viewports and phones');
    const pinned = await browser.newPage({ viewport: { width: 393, height: 852 } });
    pinned.on('pageerror', e => errors.push(e.message));
    await pinned.clock.install();
    await pinned.goto(base); await pinned.evaluate(() => titleScene.ready);
    await pinned.evaluate(() => {
      window.titleAnchors = [];
      const draw = SpriteRaster.draw;
      SpriteRaster.draw = function (g, ...args) {
        if (g.canvas.id === 'titleScene') {
          const m = g.getTransform(), ratio = g.canvas.width / g.canvas.clientWidth;
          window.titleAnchors.push({ x: m.e / ratio, y: m.f / ratio });
          window.titleAnchors = window.titleAnchors.slice(-2);
        }
        return draw(g, ...args);
      };
    });
    await pinned.clock.runFor(100);
    const position = () => pinned.evaluate(() => ({
      cats: window.titleAnchors,
      bubble: { x: $('titleGreeting').offsetLeft, y: $('titleGreeting').offsetTop, width: $('titleGreeting').offsetWidth, height: $('titleGreeting').offsetHeight },
      tail: $('titleGreeting').getBoundingClientRect().left + parseFloat($('titleGreeting').style.getPropertyValue('--tail-x'))
    }));
    const anchor = await position();
    assert.equal(anchor.cats.length, 2);
    assert(Math.abs(anchor.tail - anchor.cats[0].x) < 3, 'bubble tail points to Grio');
    for (let i = 0; i < 4; i++) {
      await pinned.clock.runFor(6100);
      assert.deepEqual(await position(), anchor, 'both cats and bubble stay fixed through pose and greeting changes');
    }
    await pinned.screenshot({ path: path.join(artifacts, 'title-fixed-cats.png') });
    console.log('PASS both cat positions and speech bubble stay fixed for a complete animation cycle');
    await pinned.close();
    const reduced = await browser.newPage({ reducedMotion: 'reduce' });
    reduced.on('pageerror', e => errors.push(e.message));
    await reduced.goto(base); await reduced.evaluate(() => titleScene.ready);
    assert.equal(await reduced.locator('#titleMotion').getAttribute('aria-pressed'), 'false');
    const staticPixels = await reduced.locator('#titleScene').evaluate(c => c.toDataURL());
    await reduced.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal(await reduced.locator('#titleScene').evaluate(c => c.toDataURL()), staticPixels);
    await reduced.locator('#mNew').click(); assert(await reduced.locator('#wrap').isVisible());
    console.log('PASS reduced motion shows a complete still scene and can start the game');
    const fallback = await browser.newPage();
    fallback.on('pageerror', e => errors.push(e.message));
    await fallback.route('**/title-cafe.png*', route => route.abort());
    await fallback.goto(base); await fallback.evaluate(() => titleScene.ready);
    assert(await fallback.locator('#mNew').isVisible());
    assert(await fallback.locator('#titleScene').evaluate(c => c.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0));
    await fallback.locator('#mNew').click(); assert(await fallback.locator('#wrap').isVisible());
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    console.log('PASS missing background fallback, usable start button, no local asset or runtime errors');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
