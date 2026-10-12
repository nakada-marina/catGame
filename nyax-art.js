/* Generated pixel-art photographs for customers and Grio. Save only subject metadata. */
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
  const ownerCells = { nap: 0, paw: 1, selfie: 2, break: 3 };
  const ownerImage = new Image(), ownerCache = new Map();
  let ownerLoaded = false;
  const ownerReady = new Promise(resolve => {
    ownerImage.onload = () => { ownerLoaded = true; ownerCache.clear(); resolve(true); };
    ownerImage.onerror = () => resolve(false);
    ownerImage.src = new URL('./nyax-grio-atlas.png?v=20261012-generated', document.baseURI).href;
  });
  function ownerPhoto(kind, sprites, faces) {
    if (!Object.hasOwn(ownerCells, kind)) return null;
    if (ownerCache.has(kind)) return ownerCache.get(kind);
    const c = document.createElement('canvas'); c.width = 192; c.height = 144;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (ownerLoaded) {
      const cell = ownerCells[kind], w = ownerImage.naturalWidth / 2, h = ownerImage.naturalHeight / 2;
      g.drawImage(ownerImage, cell % 2 * w, Math.floor(cell / 2) * h, w, h, 0, 0, c.width, c.height);
    } else {
      // Keep the subject readable even when the generated atlas is unavailable.
      g.fillStyle = '#eddcc1'; g.fillRect(0, 0, c.width, c.height);
      const face = kind === 'nap' ? faces.ponta?.sleep : faces.grio?.happy;
      if (face) g.drawImage(face, 64, 18, 64, 64);
      g.fillStyle = '#674432'; g.font = '12px sans-serif'; g.textAlign = 'center';
      g.fillText(ownerLabels[kind], c.width / 2, 112);
    }
    ownerCache.set(kind, c);
    return c;
  }
  function drawOwner(canvas, kind, sprites, faces) {
    const source = ownerPhoto(kind, sprites, faces); if (!source) return;
    canvas.width = source.width; canvas.height = source.height;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(source, 0, 0);
  }
  window.NyaxArt = { ready, photo, draw, ownerLabels, ownerReady, ownerPhoto, drawOwner };
})();
