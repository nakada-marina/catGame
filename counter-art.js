/* Full seated-on-stool guests, cropped from the original transparent atlas. */
(function () {
  'use strict';
  const image = new Image(), frames = [];
  const load = new Promise(resolve => {
    image.onerror = () => resolve(false);
    image.onload = () => {
      const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight;
      const g = source.getContext('2d'); g.drawImage(image, 0, 0);
      const data = g.getImageData(0, 0, source.width, source.height).data, bounds = [];
      for (let i = 0; i < 4; i++) {
        const x0 = Math.floor(i % 2 * source.width / 2), y0 = Math.floor(Math.floor(i / 2) * source.height / 2);
        const x1 = Math.floor((i % 2 + 1) * source.width / 2), y1 = Math.floor((Math.floor(i / 2) + 1) * source.height / 2);
        let left = x1, top = y1, right = x0, bottom = y0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (data[(y * source.width + x) * 4 + 3] > 16) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        if (right <= left || bottom <= top) { resolve(false); return; }
        bounds.push([left, top, right - left, bottom - top]);
      }
      const scale = Math.min(92 / Math.max(...bounds.map(b => b[2])), 156 / Math.max(...bounds.map(b => b[3])));
      for (const crop of bounds) {
        const c = document.createElement('canvas'); c.width = 96; c.height = 160;
        c.logicalWidth = 48; c.logicalHeight = 80; c.guestDetail = true; c.counterSeated = true;
        const width = Math.round(crop[2] * scale), height = Math.round(crop[3] * scale);
        const placement = [Math.round((96 - width) / 2), 158 - height, width, height];
        const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false; cg.drawImage(image, ...crop, ...placement);
        c.spriteSource = { image, crop, placement, width: 96, height: 160 };
        frames.push(c);
      }
      resolve(true);
    };
    image.src = new URL('./counter-guests.png?v=20261012-seated', document.currentScript.src).href;
  });
  function person(look) {
    const n = Number.isInteger(look?.guest) ? look.guest :
      (parseInt((look?.hair || '#000000').slice(1), 16) + parseInt((look?.shirt || '#000000').slice(1), 16)) % 4;
    return frames[n] || null;
  }
  window.CounterArt = { load, person };
})();
