/* Front- and rear-facing walking frames. Pixel drawing keeps the foot anchor fixed. */
(function () {
  'use strict';
  const cats = new Map(), guests = new Map();
  const phase = frame => [0, -2, 0, 2][((frame % 4) + 4) % 4];
  function cat(pal, frame, source, fur, facing = 'back') {
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
    const rear = GuestArt.person(look, 'back');
    if (!rear) return null;
    const step = phase(frame), key = JSON.stringify(look) + ':' + step;
    if (guests.has(key)) return guests.get(key);
    const c = document.createElement('canvas'); c.width = 128; c.height = 168;
    c.logicalWidth = 64; c.logicalHeight = 84; c.guestDetail = true;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    // Reuse the actual rear head and clothing; replace seated hips with walking legs.
    for (const [x, lift] of [[40, Math.max(0, step)], [70, Math.max(0, -step)]]) {
      g.fillStyle = look.pants; g.fillRect(x, 104, 18, 55 - lift);
      g.fillStyle = '#49352c'; g.fillRect(x - 2, 156 - lift, 22, 7);
      g.fillStyle = '#987351'; g.fillRect(x, 157 - lift, 18, 2);
    }
    const sh = rear.height - 22, dh = 102, dw = Math.round(rear.width * dh / sh);
    g.drawImage(rear, 0, 0, rear.width, sh, Math.round((128 - dw) / 2), 8, dw, dh);
    guests.set(key, c); return c;
  }
  window.RearWalk = { cat, guest };
})();
