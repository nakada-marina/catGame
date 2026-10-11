/* Front- and rear-facing walking frames. Pixel drawing keeps the foot anchor fixed. */
(function () {
  'use strict';
  const cats = new Map();
  // Generated rear walking atlas: Grio, Ponta, then the four original guests.
  const atlas = new Image(), extraAtlas = new Image(), atlasCache = new Map();
  const rearMeta = [[{"bounds":[98,41,138,202],"axis":158},{"bounds":[325,42,140,203],"axis":384.5},{"bounds":[577,41,139,204],"axis":636},{"bounds":[805,42,139,203],"axis":864.5}],[{"bounds":[86,265,146,206],"axis":157.5},{"bounds":[315,265,157,206],"axis":385.5},{"bounds":[563,265,152,206],"axis":635},{"bounds":[796,265,155,206],"axis":866.5}],[{"bounds":[80,490,149,256],"axis":154},{"bounds":[320,490,148,256],"axis":393.5},{"bounds":[558,490,150,256],"axis":632.5},{"bounds":[800,490,148,256],"axis":873.5}],[{"bounds":[88,759,134,266],"axis":154.5},{"bounds":[323,759,135,266],"axis":390},{"bounds":[566,759,135,266],"axis":633},{"bounds":[806,759,135,266],"axis":873}],[{"bounds":[75,1039,150,241],"axis":149.5},{"bounds":[312,1039,150,240],"axis":386.5},{"bounds":[558,1039,150,241],"axis":632.5},{"bounds":[794,1039,149,240],"axis":868}],[{"bounds":[68,1288,170,236],"axis":152.5},{"bounds":[303,1288,170,237],"axis":388.5},{"bounds":[547,1287,170,238],"axis":632},{"bounds":[785,1288,171,236],"axis":871}],[{"bounds":[111,12,194,273],"axis":195},{"bounds":[414,11,194,276],"axis":498.5},{"bounds":[713,11,194,273],"axis":797.5},{"bounds":[1013,11,191,274],"axis":1097}],[{"bounds":[107,309,198,278],"axis":193},{"bounds":[409,307,199,282],"axis":495.5},{"bounds":[709,307,198,280],"axis":795.5},{"bounds":[1010,308,194,279],"axis":1096.5}],[{"bounds":[108,615,200,280],"axis":195},{"bounds":[411,615,199,283],"axis":498.5},{"bounds":[709,615,198,279],"axis":796.5},{"bounds":[1010,614,195,281],"axis":1097}],[{"bounds":[105,913,201,290],"axis":193.5},{"bounds":[409,914,201,292],"axis":497.5},{"bounds":[709,914,199,288],"axis":797},{"bounds":[1011,914,198,288],"axis":1099.5}]];
  let atlasReady = false;
  const load = new Promise((resolve, reject) => {
    let loaded = 0;
    for (const image of [atlas, extraAtlas]) {
      image.onload = () => { if (++loaded === 2) { atlasReady = true; resolve(); } };
      image.onerror = () => reject(new Error('Rear walking atlas failed to load'));
    }
  });
  atlas.src = './rear-walk-atlas.png?v=20261011-generated-rear';
  extraAtlas.src = './rear-cats-atlas.png?v=20261011-generated-rear';
  function atlasFrame(row, frame, width, height) {
    if (!atlasReady) return null;
    const f = ((frame % 4) + 4) % 4, key = row + ':' + f + ':' + width + ':' + height;
    if (atlasCache.has(key)) return atlasCache.get(key);
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const record = rearMeta[row][f], [x, y, w, h] = record.bounds;
    const maxHeight = Math.max(...rearMeta[row].map(item => item.bounds[3]));
    const scale = Math.min((height - 10) / maxHeight,
      ...rearMeta[row].map(item => (width / 2 - 3) / Math.max(item.axis - item.bounds[0], item.bounds[0] + item.bounds[2] - item.axis)));
    // Centre on the head/body axis, not on a cat's tail. Keep one scale per loop.
    const dx = Math.round(width / 2 - (record.axis - x) * scale);
    const dy = Math.round(height - 2 - maxHeight * scale);
    g.drawImage(row < 6 ? atlas : extraAtlas, x, y, w, h, dx, dy, Math.round(w * scale), Math.round(h * scale));
    c.artBounds = [0, 0, width, height]; c.generatedRear = true;
    if (row >= 2 && row < 6) { c.logicalWidth = width / 2; c.logicalHeight = height / 2; c.guestDetail = true; }
    atlasCache.set(key, c); return c;
  }

  const phase = frame => [0, -2, 0, 2][((frame % 4) + 4) % 4];
  function cat(pal, frame, source, fur, facing = 'back') {
    const row = { grio: 0, ponta: 1, mike: 6, kuro: 7, shiro: 8, chacha: 9 }[pal];
    if (facing === 'back' && row !== undefined) {
      const generated = atlasFrame(row, frame, source.width, source.height);
      if (generated) return generated;
    }
    const step = phase(frame), key = pal + ':' + facing + ':' + step + ':' + source.width + ':' + source.height;
    if (cats.has(key)) return cats.get(key);
    const c = document.createElement('canvas'); c.width = source.width; c.height = source.height;
    const g = c.getContext('2d'), scale = Math.min(c.width / 64, c.height / 72);
    const ox = (c.width - 64 * scale) / 2, oy = c.height - 72 * scale;
    function pixel(x, y, color) { g.fillStyle = color; g.fillRect(Math.round(ox + x * scale), Math.round(oy + y * scale), Math.ceil(scale), Math.ceil(scale)); }
    function ellipse(cx, cy, rx, ry, color) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) pixel(x, y, color);
    }
    function line(x0, y0, x1, y1, radius, color) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let i = 0; i <= n; i++) ellipse(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, radius, radius, color);
    }
    const fluffy = !!fur.long;
    // Hind paws alternate; head and torso remain identical in every frame.
    for (const [x, lift] of [[24, Math.max(0, step)], [40, Math.max(0, -step)]]) {
      ellipse(x, 63 - lift, 5, 7, fur.line);
      ellipse(x, 63 - lift, 4, 6, fur.shade);
      ellipse(x, 68 - lift, 4, 2, fur.paws ? fur.white : fur.light);
    }
    ellipse(32, 46, fluffy ? 16 : 14, 20, fur.line);
    ellipse(32, 45, fluffy ? 15 : 13, 19, fur.base);
    ellipse(29, 42, 9, 15, fur.light);
    ellipse(39, 48, 4, 14, fur.shade);
    // The tail grows from the back and has tabby bands.
    line(34, 57, 46, 54, fluffy ? 4 : 3, fur.line);
    line(46, 54, 49, 38, fluffy ? 4 : 3, fur.line);
    line(34, 57, 46, 54, fluffy ? 3 : 2, fur.base);
    line(46, 54, 49, 38, fluffy ? 3 : 2, fur.base);
    if (fur.tabby) for (const y of [41, 47, 53]) line(46, y, 50, y, 1, fur.stripe);
    for (const [cx, tip] of [[22, 17], [42, 47]]) {
      for (let y = 3; y <= 18; y++) {
        const t = (y - 3) / 15, left = tip + (cx - 7 - tip) * t, right = tip + (cx + 7 - tip) * t;
        for (let x = Math.ceil(left); x <= right; x++) pixel(x, y, fur.line);
      }
      line(tip, 6, cx, 16, 3, fur.base);
    }
    ellipse(32, 21, fluffy ? 18 : 16, 15, fur.line);
    ellipse(32, 20, fluffy ? 17 : 15, 14, fur.base);
    ellipse(28, 17, 10, 10, fur.light);
    if (fur.tabby) {
      for (const x of [27, 32, 37]) line(x, 8, x, 14, 1, fur.stripe);
      for (const y of [37, 43, 49]) { line(21, y, 27, y + 2, 1, fur.stripe); line(37, y + 2, 42, y, 1, fur.stripe); }
    }
    if (fur.patches) { ellipse(22, 19, 6, 10, fur.patches[0]); ellipse(38, 46, 6, 10, fur.patches[1]); }
    if (facing === 'front') {
      // Front view has a chest, inner ears and face instead of the back of the head.
      if (fur.chest || fur.chin) ellipse(32, 42, 7, 10, fur.white);
      line(18, 9, 22, 16, 1, fur.ear);
      line(46, 9, 42, 16, 1, fur.ear);
      if (fur.muzzle || fur.chin) ellipse(32, 27, 9, 5, fur.white);
      for (const x of [25, 39]) {
        ellipse(x, 21, 3, 3, fur.line);
        ellipse(x, 21, 2, 2, fur.eye);
        line(x, 20, x, 22, 0.7, fur.pupil);
        pixel(x - 1, 20, '#ffffff');
      }
      ellipse(32, 26, 2, 1, fur.nose);
      line(32, 27, 32, 29, 0.7, fur.line);
      line(32, 29, 29, 30, 0.7, fur.line);
      line(32, 29, 35, 30, 0.7, fur.line);
      line(17, 27, 24, 28, 0.7, fur.white);
      line(40, 28, 47, 27, 0.7, fur.white);
    }
    if (fur.scarf) { line(20, 33, 44, 33, 2, '#a3553d'); line(33, 34, 36, 43, 2, '#a3553d'); }
    c.artBounds = [0, 0, c.width, c.height];
    cats.set(key, c); return c;
  }
  function guest(look, frame) {
    const identity = Number.isInteger(look.guest) ? look.guest :
      ((parseInt(look.hair.slice(1), 16) + parseInt(look.shirt.slice(1), 16)) % 4);
    return atlasFrame(identity + 2, frame, 128, 168);
  }
  window.RearWalk = { cat, guest, load };
})();
