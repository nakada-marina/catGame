/* Pixel-art food snapshots for customer posts. Save only food/variant metadata. */
(function () {
  const cells = { coffee: 0, cookie: 1, tea: 2, cake: 3, pancake: 4, omurice: 5, parfait: 6 };
  // Authored row edges: preserve each photo's proportions rather than stretching.
  const rows = [[0, 355], [355, 722], [722, 1063], [1063, 1536]];
  const image = new Image(), cache = new Map();
  let loaded = false;
  const ready = new Promise(resolve => {
    image.onload = () => { loaded = true; cache.clear(); resolve(true); };
    image.onerror = () => resolve(false);
    image.src = new URL('./nyax-food-atlas.png?v=20261012', document.baseURI).href;
  });
  function photo(food, variant = 0) {
    if (!Object.hasOwn(cells, food)) return null;
    const cell = food === 'coffee' && variant === 1 ? 7 : cells[food];
    if (cache.has(cell)) return cache.get(cell);
    const [top, bottom] = rows[Math.floor(cell / 2)];
    const canvas = document.createElement('canvas');
    canvas.width = 192; canvas.height = Math.round((bottom - top) * 192 / 512);
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (loaded) {
      g.drawImage(image, cell % 2 * 512, top, 512, bottom - top, 0, 0, canvas.width, canvas.height);
    } else {
      // Keep the photo visible while loading, or when the atlas is unavailable.
      g.fillStyle = '#c99a68'; g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#b58a60';
      for (let y = 16; y < canvas.height; y += 24) g.fillRect(0, y, canvas.width, 2);
      g.fillStyle = '#efe1c4'; g.fillRect(24, 28, 144, 100);
      g.drawImage(window.KitchenArt.food(food), 48, 20, 96, 96);
    }
    cache.set(cell, canvas);
    return canvas;
  }
  function draw(canvas, food, variant) {
    const source = photo(food, variant);
    if (!source) return;
    canvas.width = source.width; canvas.height = source.height;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  const ownerLabels = { nap: 'おひるね中のぽんた', paw: 'ぐりおの肉球', selfie: '店長ぐりおの自撮り', break: 'ぐりおのコーヒー休憩' };
  function ownerPhoto(kind, sprites, faces) {
    if (!Object.hasOwn(ownerLabels, kind)) return null;
    const c = document.createElement('canvas'); c.width = 192; c.height = 144;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const rect = (color, x, y, w, h) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
    const soft = (color, x, y, w, h, r = 4) => {
      rect(color, x + r, y, w - r * 2, h);
      rect(color, x, y + r, w, h - r * 2);
      rect(color, x + 2, y + 2, w - 4, h - 4);
    };
    rect('#eddcc1', 0, 0, 192, 144);
    rect('#f7edda', 12, 12, 64, 72); rect('#acb8a0', 12, 47, 64, 3); rect('#acb8a0', 42, 12, 3, 72);
    rect('#bb8b62', 0, 104, 192, 40);
    for (let y = 112; y < 144; y += 14) rect('#a97854', 0, y, 192, 2);
    const sprite = (image, x, bottom, width) => {
      if (Array.isArray(image)) image = image[0];
      if (!image) return;
      const source = image.spriteSource;
      const [sx, sy, sw, sh] = source ? source.crop : [0, 0, image.width, image.height];
      const height = Math.round(width * sh / sw);
      g.drawImage(source ? source.image : image, sx, sy, sw, sh, x, bottom - height, width, height);
    };
    if (kind === 'nap') {
      rect('#9ea88a', 20, 98, 152, 28); rect('#c6ccac', 24, 98, 144, 20);
      sprite(sprites.ponta?.sleepbag, 35, 117, 122);
      g.fillStyle = '#6c7868'; g.font = 'bold 15px monospace'; g.fillText('z', 144, 57); g.fillText('Z', 158, 40);
    } else if (kind === 'paw') {
      // A close-up of Grio's tabby paw, with four toes and a soft pink pad.
      soft('#674432', 58, 63, 79, 61, 9); soft('#b98c62', 62, 63, 71, 57, 8);
      rect('#674432', 70, 106, 55, 38); rect('#b98c62', 74, 106, 47, 38);
      for (const [x, y] of [[48, 39], [73, 25], [101, 25], [126, 39]]) {
        soft('#674432', x, y, 23, 43, 6); soft('#b98c62', x + 3, y + 3, 17, 37);
        soft('#d89499', x + 6, y + 10, 11, 16, 3); soft('#efb5b1', x + 6, y + 10, 7, 10, 2);
      }
      soft('#c77f89', 76, 72, 41, 30, 7); soft('#c77f89', 70, 86, 53, 21, 6);
      soft('#e8a8ac', 79, 75, 35, 25, 6); soft('#e8a8ac', 74, 88, 45, 15, 5);
      rect('#f4c7bf', 81, 77, 12, 7);
      for (const y of [121, 133]) { rect('#815334', 74, y, 13, 4); rect('#815334', 108, y - 3, 13, 4); }
    } else if (kind === 'selfie') {
      sprite(faces.grio?.happy, 46, 137, 116);
      rect('#f4d588', 170, 22, 4, 16); rect('#f4d588', 164, 28, 16, 4);
    } else {
      sprite(sprites.grio?.coffee, 66, 132, 84);
      rect('#f7edda', 146, 43, 3, 12); rect('#f7edda', 151, 31, 3, 10);
    }
    return c;
  }
  function drawOwner(canvas, kind, sprites, faces) {
    const source = ownerPhoto(kind, sprites, faces); if (!source) return;
    canvas.width = source.width; canvas.height = source.height;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(source, 0, 0);
  }
  window.NyaxArt = { ready, photo, draw, ownerLabels, ownerPhoto, drawOwner };
})();
