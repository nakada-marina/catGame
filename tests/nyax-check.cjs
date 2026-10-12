/* Run with Playwright installed; CHROMIUM_PATH and BASE_URL are optional. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.join(__dirname, '..');
const artifacts = path.join(require('node:os').tmpdir(), 'catgame-nyax-check');
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  let server, browser;
  const base = process.env.BASE_URL || 'http://127.0.0.1:8766/';
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
      await new Promise(resolve => server.listen(8766, '127.0.0.1', resolve));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-gpu'] } : {}) });
    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.evaluate(() => artworkReady);
    assert.equal(await page.evaluate(() => NyaxArt.ready), true, 'authored food atlas loaded');
    await page.locator('#mNew').click();
    await page.evaluate(() => {
      finishFirstGuide(true); talking = null; talkQ.length = 0; $('talk').hidden = true;
      G = newSave(); G.flags = { intro: true, firstCustomerDone: true, register: true };
      buildSeats(); spawnCats(); startDay(); spawnTimer = 100000; cats.forEach(c => { c.mood = 100; }); ponta = null;
    });
    const foods = await page.evaluate(() => [...MENU.map(m => ({ id: m.id, name: m.name })), { id: 'set_coffee_cake', name: 'コーヒー＋いちごケーキ', photo: 'coffee' }]);
    for (const food of foods) {
      const result = await page.evaluate(id => {
        customers = []; jobs = []; seats.forEach(s => { s.cust = null; s.dirty = false; });
        const item = id === 'set_coffee_cake' ? CafeService.bundle(MENU[0], MENU.find(m => m.id === 'cake')) : MENU.find(m => m.id === id), seat = seats[0], look = randomLook();
        const c = { seat, x: seat.x, y: seat.y, state: 'eat', t: 420, anim: 0, order: item, patAtServe: 760, maxPat: 760, pat: 760, visits: 3, quality: 'perfect', paymentMethod: 'cash', look, spr: makePerson(look) };
        seat.cust = c; customers = [c]; updateCustomer(c); updateCheckout();
        c.x = REGISTER.queueX; c.y = REGISTER.queueY; c.state = 'checkout'; c.t = 0;
        const random = Math.random;
        try {
          Math.random = () => 0;
          const before = G.sns.posts.length, paid = pay(c), duplicate = pay(c);
          return { paid, duplicate, added: G.sns.posts.length - before, post: G.sns.posts[0] };
        } finally { Math.random = random; }
      }, food.id);
      assert(result.paid && !result.duplicate, 'real checkout only pays once');
      assert.equal(result.added, 1, 'one customer post per checkout');
      assert.equal(result.post.photo.food, food.photo || food.id, 'photograph matches the eaten dish');
      assert(result.post.text.includes(food.name));
      assert.equal(result.post.mine, false);
    }
    console.log('PASS real checkout creates matching food photo posts for all seven dishes and set orders; no duplicate posts');
    const legacy = await page.evaluate(() => {
      const sns = snsState(), before = sns.posts.length, random = Math.random;
      try {
        Math.random = () => 0;
        snsFromCustomer({ order: MENU[0] }, 50, MENU[0].name);
        const noNeutral = sns.posts.length === before;
        Math.random = () => 0.9;
        snsFromCustomer({ order: MENU[0] }, 90, MENU[0].name);
        const noUnchosen = sns.posts.length === before;
        Math.random = () => 0;
        snsFromCustomer({ order: MENU[0] }, 10, MENU[0].name);
        const complaint = sns.posts[0];
        sns.posts.unshift({ id: ++sns.seq, mine: true, name: 'ぐりおのねこカフェ', handle: 'guriocafe', text: 'お店の写真', img: snapCafe(), day: 1, t: 1140, likes: 2, rts: 0, replies: [] });
        sns.posts.unshift({ id: ++sns.seq, mine: false, name: '以前のお客さん', handle: 'old_guest', text: 'また来たい！', day: 1, t: 600, likes: 1, rts: 0, replies: [] });
        save(); return { noNeutral, noUnchosen, complaint, saved: loadSave().sns.posts };
      } finally { Math.random = random; }
    });
    assert(legacy.noNeutral && legacy.noUnchosen, 'existing posting chances preserved');
    assert(legacy.complaint.bad && !legacy.complaint.photo, 'unserved customer does not photograph uneaten food');
    assert.equal(legacy.saved.filter(p => p.photo).length, 8, 'photos beyond newest five survive saving');
    assert(legacy.saved.some(p => p.img && p.mine), 'existing cafe snapshot retained');
    await page.reload(); await page.evaluate(() => artworkReady); await page.locator('#mCont').click();
    await page.evaluate(() => { talking = null; talkQ.length = 0; $('talk').hidden = true; });
    await page.locator('#btnNyax').click(); await page.evaluate(() => NyaxArt.ready);
    assert.equal(await page.locator('[data-food-photo]').count(), 8);
    assert.equal(await page.locator('.nx-body img').count(), 1);
    assert((await page.locator('#panel').textContent()).includes('以前のお客さん'));
    const pixels = await page.locator('[data-food-photo]').evaluateAll(canvases => canvases.map(c => ({ food: c.dataset.foodPhoto, rendered: c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v), label: c.getAttribute('aria-label'), image: c.toDataURL() })));
    assert(pixels.every(p => p.rendered && p.label.includes('ドット絵写真')));
    assert.equal(new Set(pixels.map(p => p.image)).size, 8, 'seven dishes and a second coffee composition');
    assert(await page.evaluate(() => NyaxArt.photo('coffee', 0).toDataURL() !== NyaxArt.photo('coffee', 1).toDataURL()), 'coffee has two compositions');
    for (const width of [320, 393, 1280]) {
      await page.setViewportSize({ width, height: 852 });
      const fits = await page.locator('.nx-photo canvas').evaluateAll(canvases => canvases.every(c => {
        const r = c.getBoundingClientRect(), parent = c.closest('.nx-body').getBoundingClientRect();
        return r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.right <= parent.right + 1 && Math.abs(r.width / r.height - c.width / c.height) < .02;
      }));
      assert(fits, 'photos fit and preserve proportions at width ' + width);
    }
    await page.setViewportSize({ width: 393, height: 852 });
    // Show food photos first for the review screenshot; saved-data checks used the original order.
    await page.evaluate(() => { G.sns.posts = G.sns.posts.filter(p => p.photo).reverse(); openNyax(); });
    await page.screenshot({ path: path.join(artifacts, 'nyax-mobile.png') });
    console.log('PASS photo display, eight distinct images, legacy text/cafe posts, save/resume and 320/393/1280px layouts');
    const retained = await page.evaluate(() => {
      const random = Math.random;
      try {
        Math.random = () => 0;
        for (let i = 0; i < 45; i++) snsFromCustomer({ order: MENU[i % MENU.length] }, 90, MENU[i % MENU.length].name);
        save(); const posts = loadSave().sns.posts;
        return { count: posts.length, photos: posts.filter(p => p.photo).length, size: JSON.stringify(posts).length };
      } finally { Math.random = random; }
    });
    assert.equal(retained.count, 40); assert.equal(retained.photos, 40);
    assert(retained.size < 30000, 'save stores compact metadata instead of image payloads');
    console.log('PASS all 40 retained customer photos survive save without embedding large image data');
    const ownerPosts = await page.evaluate(() => {
      closeModal(); talking = null; talkQ.length = 0; $('talk').hidden = true;
      const food = MENU.find(m => m.id === 'cake');
      const job = { item: food, c: { seat: seats[0] }, state: 'cook', t: food.time * (ZONE[0] + ZONE[1]) / 2, dur: food.time };
      dayLog.perfectFoods = [];
      cookTap(job); cookTap({ ...job, state: 'cook' });
      const recorded = [...dayLog.perfectFoods];
      const log = { served: 3, reviews: [], perfect: 1, perfectFoods: recorded, pontaNaps: 2 };
      const random = Math.random;
      try {
        const noEvents = [];
        for (const n of [0, .26, .51, .99]) { Math.random = () => n; noEvents.push(grioPostPhoto({ reviews: [] }, { posts: [] }).photo); }
        const selected = [];
        for (const n of [0, .18, .35, .51, .68, .99]) {
          Math.random = () => n;
          const shot = grioPostPhoto(log, { posts: [] });
          selected.push(shot);
        }
        const key = p => p.photo?.food || p.photo?.kind || 'cafe';
        const sequence = [];
        for (let i = 0; i < 12; i++) { Math.random = () => 0; sequence.push(key(grioDailyPost(1, log))); }
        // Display one actual daily post for each new subject.
        G.sns.posts = [];
        for (const n of [0, .18, .35, .51, .68, .99]) {
          Math.random = () => n;
          const post = grioDailyPost(1, log);
          // Clearing only between selections keeps the full six-choice pool.
          G.sns.posts = []; selected.push({ post });
        }
        G.sns.posts = selected.filter(s => s.post).map(s => s.post);
        save(); openNyax();
        return { recorded, noEvents, selected: selected.filter(s => s.photo || s.text), sequence, saved: loadSave().sns.posts };
      } finally { Math.random = random; }
    });
    assert.deepEqual(ownerPosts.recorded, ['cake'], 'perfect cooking records the actual dish once');
    assert(ownerPosts.noEvents.every(p => !p || (!p.food && p.kind !== 'nap')), 'no invented perfect dish or nap on quiet days');
    assert.deepEqual(new Set(ownerPosts.selected.map(s => s.photo?.food || s.photo?.kind || 'cafe')), new Set(['paw', 'selfie', 'break', 'cafe', 'nap', 'cake']));
    assert(ownerPosts.sequence.every((key, i, all) => !i || key !== all[i - 1]), 'owner avoids consecutive identical subjects');
    assert(ownerPosts.saved.some(p => p.photo?.kind === 'nap' && p.text.includes('ぽんた')));
    assert(ownerPosts.saved.some(p => p.photo?.food === 'cake' && p.text.includes('パーフェクト')));
    const ownerImages = await page.locator('[data-owner-photo]').evaluateAll(canvases => canvases.map(c => ({ kind: c.dataset.ownerPhoto, image: c.toDataURL(), label: c.getAttribute('aria-label') })));
    assert.equal(ownerImages.length, 4);
    assert.equal(new Set(ownerImages.map(c => c.image)).size, 4, 'four distinct cat photographs render');
    assert(ownerImages.every(c => c.label.includes('ドット絵写真')));
    assert((await page.locator('[data-food-photo]').locator('..').textContent()).includes('ぐりおの一枚'));
    await page.screenshot({ path: path.join(artifacts, 'grio-photos.png'), fullPage: true });
    await page.reload(); await page.evaluate(() => artworkReady); await page.locator('#mCont').click();
    await page.evaluate(() => { talking = null; talkQ.length = 0; $('talk').hidden = true; openNyax(); });
    assert.equal(await page.locator('[data-owner-photo]').count(), 4, 'owner photographs survive save and reload');
    console.log('PASS actual perfect dish capture, event-matched owner photos/text, six subjects, repeat avoidance, rendering and save/reload');
    assert.deepEqual(errors, []);
    // A missing asset still leaves usable food pictures and a working timeline.
    const fallback = await browser.newPage();
    const fallbackErrors = []; fallback.on('pageerror', e => fallbackErrors.push(e.message));
    await fallback.route('**/nyax-food-atlas.png*', route => route.abort());
    await fallback.goto(base); await fallback.evaluate(() => artworkReady);
    assert.equal(await fallback.evaluate(() => NyaxArt.ready), false);
    const fallbackPhotos = await fallback.evaluate(() => MENU.every(m => {
      const c = NyaxArt.photo(m.id);
      return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v);
    }));
    assert(fallbackPhotos); assert.deepEqual(fallbackErrors, []);
    console.log('PASS readable fallback photos if the atlas fails to load; no runtime errors');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
