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
  window.NyaxArt = { ready, photo, draw };
})();
