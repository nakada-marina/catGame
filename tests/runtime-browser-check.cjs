/* Run with Playwright installed; CHROMIUM_PATH and BASE_URL are optional. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.join(__dirname, '..');
(async () => {
  let server, browser;
  const base = process.env.BASE_URL || 'http://127.0.0.1:8770/';
  const errors = [];
  try {
    if (!process.env.BASE_URL) {
      server = http.createServer((req, res) => {
        const name = new URL(req.url, base).pathname;
        const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        try {
          res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'text/html');
          res.end(fs.readFileSync(file));
        } catch { res.writeHead(404); res.end(); }
      });
      await new Promise(resolve => server.listen(8770, '127.0.0.1', resolve));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-gpu'] } : {}) });
    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.evaluate(() => artworkReady);
    const invalid = ['not json', 'null', '{}', '[]', 'true', '{"day":1,"cats":null}'];
    const valid = await page.evaluate(() => newSave());
    invalid.push(JSON.stringify({ ...valid, day: -1 }), JSON.stringify({ ...valid, money: '8000' }), JSON.stringify({ ...valid, cats: [] }), JSON.stringify({ ...valid, cats: [null] }), JSON.stringify({ ...valid, menu: null }));
    for (const raw of invalid) {
      await page.evaluate(value => { localStorage.setItem(SAVE_KEY, value); openTitle(); }, raw);
      assert.equal(await page.locator('#mCont').count(), 0, 'invalid save has no unusable resume action');
      assert.equal(await page.evaluate(() => localStorage.getItem(SAVE_KEY)), raw, 'invalid save is preserved for recovery');
      await page.locator('#mNew').click();
      assert.equal(await page.evaluate(() => G.day), 1, 'new game still starts after invalid save');
    }
    const legacy = await page.evaluate(() => {
      const s = newSave(); s.day = 7; s.money = 12345; s.pop = 48;
      delete s.kitchen; delete s.market; delete s.flags; delete s.sns;
      localStorage.setItem(SAVE_KEY, JSON.stringify(s)); openTitle(); return s;
    });
    await page.locator('#mCont').click();
    assert.deepEqual(await page.evaluate(() => ({ day: G.day, money: G.money, pop: G.pop, guide: !!firstGuide })), { day: legacy.day, money: legacy.money, pop: legacy.pop, guide: false });
    console.log('PASS malformed save recovery without deleting stored data; compatible legacy resume');

    const denied = await browser.newPage(); denied.on('pageerror', e => errors.push(e.message));
    await denied.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('Unavailable', 'SecurityError'); }; });
    await denied.goto(base); await denied.evaluate(() => artworkReady); await denied.locator('#mNew').click();
    assert.equal(await denied.evaluate(() => mode), 'open'); await denied.close();
    console.log('PASS unavailable saved-data storage does not prevent a new game');

    for (const [file, selector, count] of [['animation-preview.html', '.card canvas', 56], ['cat-facing-preview.html', '#cats canvas', 12], ['stray-preview.html', '#cats canvas', 6]]) {
      const preview = await browser.newPage(); preview.on('pageerror', e => errors.push(e.message));
      const failures = [];
      preview.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) failures.push(response.url()); });
      await preview.goto(new URL(file, base).href);
      await preview.waitForFunction(([selector, count]) => document.querySelectorAll(selector).length === count, [selector, count]);
      assert(await preview.locator(selector).evaluateAll(canvases => canvases.every(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v))), 'preview frames rendered: ' + file);
      if (file === 'stray-preview.html') for (const value of await preview.locator('#pose option').evaluateAll(options => options.map(o => o.value))) {
        await preview.locator('#pose').selectOption(value);
        assert(await preview.locator(selector).evaluateAll(canvases => canvases.every(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v))), 'stray pose rendered: ' + value);
      }
      assert.deepEqual(failures, []); await preview.close();
    }
    console.log('PASS all three preview pages, 74 cat canvases, every stray pose and local asset requests');

    const totals = await page.evaluate(() => {
      closeModal(); talking = null; talkQ.length = 0; $('talk').hidden = true;
      let seed = 71212; const random = Math.random;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
      const results = [];
      const invariant = () => {
        const w = CafeService.init(G);
        for (const k of CafeService.keys) {
          const counts = [w.clean[k], w.used[k], w.dirty[k], w.wash?.items[k] || 0];
          if (counts.some(n => !Number.isInteger(n) || n < 0) || counts.reduce((a, b) => a + b, 0) !== w.total[k]) throw Error('Tableware conservation failed: ' + k);
        }
        const d = CafeFinance.today(G);
        const expected = d.cashStart + d.cashSales + d.cardDeposits - d.cashExpenses - d.investments - d.liabilityPayments;
        if (G.money !== expected) throw Error('Cash equation failed: ' + G.day);
        if (jobs.some(j => j.c.state !== 'wait' || !customers.includes(j.c))) throw Error('Orphaned kitchen job');
      };
      const finishDialogue = () => {
        if (!talking && talkQ.length) startTalk();
        while (talking) { advanceTalk(); if (!talking && talkQ.length) startTalk(); }
      };
      try {
        G = newSave(); G.money = 500000; G.pop = 100; G.staff = true; G.menu = MENU.map(m => m.id);
        G.furniture = { ...G.furniture, table: 6, stool: 3, cushion: 4, tower: 1, plant: 3, fridge: 2, rack: 2 };
        G.cats.push(...ADOPT.map(a => ({ name: a.name, pal: a.pal, mood: 85, hunger: 0 })));
        G.flags.firstCustomerDone = true; delete G.flags.firstCustomerGuide; buildSeats(); spawnCats();
        for (let day = 1; day <= 14; day++) {
          closeModal(); startDay(); finishDialogue();
          for (const it of INGR) addStock(it.id, Math.max(0, (it.life ? 20 : 40) - stockOf(it.id)), true);
          let steps = 0;
          while (mode !== 'report' && ++steps < 16000) {
            finishDialogue(); update();
            if (G.bowl < 2) $('btnFood').click();
            if (steps % 120 === 0 && mode !== 'report') invariant();
          }
          if (mode !== 'report' || G.day !== day + 1) throw Error('Day failed to close: ' + day);
          const w = CafeService.init(G);
          for (const k of CafeService.keys) if (w.clean[k] + w.used[k] + w.dirty[k] + (w.wash?.items[k] || 0) !== w.total[k]) throw Error('Closing lost tableware');
          const d = G.finance.history.at(-1);
          if (d.cashEnd !== d.cashStart + d.cashSales + d.cardDeposits - d.cashExpenses - d.investments - d.liabilityPayments) throw Error('Closing cash mismatch');
          save(); const saved = loadSave();
          if (saved.day !== G.day || saved.money !== G.money) throw Error('Saved progress mismatch');
          results.push({ day, served: d.customers, deposits: d.cardDeposits, payments: d.liabilityPayments });
        }
        return results;
      } finally { Math.random = random; }
    });
    assert.equal(totals.length, 14);
    assert(totals.reduce((sum, d) => sum + d.served, 0) > 50, 'simulation actually serves customers');
    assert(totals[11].deposits > 0, 'month-one cards deposited on day12');
    assert(totals[12].payments > 0, 'month-one liabilities paid on day13');
    assert.deepEqual(errors, []);
    console.log(`PASS 14 actual full game days, ${totals.reduce((sum, d) => sum + d.served, 0)} checkouts, inventory/cash invariants, card deposits and monthly payments`);
  } finally { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
