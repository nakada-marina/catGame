/* Original approved atlas. No generated artwork or resampling.
 * Both the game and inspection gallery use this exact loader. */
(function () {
  'use strict';
  const meta = {"grio.walk0":[0,0,39,58],"grio.walk1":[41,0,39,58],"grio.walk2":[82,0,39,58],"grio.walk3":[123,0,42,58],"grio.idle":[167,0,32,53],"grio.sit":[201,0,46,40],"grio.jump":[249,0,38,52],"grio.bow":[289,0,38,43],"grio.serve":[329,0,39,52],"grio.coffee":[370,0,36,57],"grio.clean":[408,0,39,52],"grio.surprise":[449,0,34,48],"grio.f_normal":[485,0,64,64],"grio.f_happy":[551,0,64,64],"grio.f_kiri":[617,0,64,64],"grio.f_surprise":[683,0,64,64],"grio.f_sleepy":[749,0,64,64],"grio.f_angry":[815,0,64,64],"grio.f_tehe":[881,0,64,64],"grio.f_amae":[947,0,64,64],"grio.sleepbag":[0,66,73,39],"ponta.walk0":[75,66,46,58],"ponta.walk1":[123,66,48,57],"ponta.walk2":[173,66,43,57],"ponta.walk3":[218,66,44,57],"ponta.idle":[264,66,38,56],"ponta.sit":[304,66,40,37],"ponta.jump":[346,66,37,50],"ponta.bow":[385,66,44,46],"ponta.serve":[431,66,43,56],"ponta.cake":[476,66,43,56],"ponta.clean":[521,66,45,58],"ponta.surprise":[568,66,40,51],"ponta.f_normal":[610,66,64,64],"ponta.f_happy":[676,66,64,64],"ponta.f_kiri":[742,66,64,64],"ponta.f_surprise":[808,66,64,64],"ponta.f_sleepy":[874,66,64,64],"ponta.f_angry":[940,66,64,64],"ponta.f_tehe":[0,132,64,64],"ponta.f_amae":[66,132,64,64],"ponta.sleepbag":[132,132,58,41],"ponta.box":[192,132,44,38]};
  const WIDTH = 81, HEIGHT = 64;
  function frame(image, key) {
    const [x, y, w, h] = meta[key], portrait = key.includes('.f_');
    const raw = document.createElement('canvas'); raw.width = w; raw.height = h;
    const rg = raw.getContext('2d'); rg.drawImage(image, x, y, w, h, 0, 0, w, h);
    if (key === 'grio.f_normal') {
      // The original normal portrait has a damaged nose/muzzle (vertical smear).
      // Restore only that region from the approved sleepy portrait of the same
      // character. Keep the normal eyes, ears, head shape and fur pattern.
      const [sx, sy] = meta['grio.f_sleepy'];
      rg.clearRect(0, 32, w, h - 32);
      rg.drawImage(image, sx, sy + 32, w, h - 32, 0, 32, w, h - 32);
      rg.clearRect(25, 26, 14, 6);
      rg.drawImage(image, sx + 25, sy + 26, 14, 6, 25, 26, 14, 6);
    }
    if (portrait) return raw;
    // Centre on the head/body, rather than the tail or carried prop.
    // Top-band alpha bounds provide a stable body axis for all four steps.
    let left = w, right = -1;
    const pixels = rg.getImageData(0, 0, w, h).data;
    const lowPose = /sleepbag|box|sit$/.test(key);
    if (!lowPose) for (let yy = 2; yy < Math.floor(h * .42); yy++) for (let xx = 0; xx < w; xx++) {
      if (pixels[(yy * w + xx) * 4 + 3] > 128) { left = Math.min(left, xx); right = Math.max(right, xx); }
    }
    const axis = right < left ? Math.floor(w / 2) : Math.round((left + right) / 2);
    const c = document.createElement('canvas'); c.width = WIDTH; c.height = HEIGHT;
    const dx = Math.floor(WIDTH / 2) - axis;
    c.getContext('2d').drawImage(raw, dx, HEIGHT - h);
    c.artBounds = [dx, HEIGHT - h, w, h];
    return c;
  }
  function load() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const sprites = { grio: {}, ponta: {} };
        for (const key of Object.keys(meta)) {
          const [who, pose] = key.split('.'); sprites[who][pose] = frame(image, key);
        }
        resolve(sprites);
      };
      image.onerror = () => reject(new Error('chars.webp could not be loaded'));
      image.src = new URL('chars.webp', document.currentScript?.src || location.href).href;
    });
  }
  window.CatArtwork = { meta, width: WIDTH, height: HEIGHT, load };
})();
