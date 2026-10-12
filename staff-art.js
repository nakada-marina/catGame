/* Generated cafe worker poses, using the same original-atlas drawing as cats. */
(function () {
  'use strict';
  const poses = ['idle', 'cook', 'wash', 'greet'], frames = new Map(), image = new Image();
  const base = document.currentScript.src;
  const load = new Promise(resolve => {
    image.onerror = () => resolve(false);
    image.onload = () => {
      const atlas = document.createElement('canvas'); atlas.width = image.naturalWidth; atlas.height = image.naturalHeight;
      const g = atlas.getContext('2d'); g.drawImage(image, 0, 0);
      const pixels = g.getImageData(0, 0, atlas.width, atlas.height).data, crops = [];
      for (let i = 0; i < poses.length; i++) {
        const x0 = Math.floor(i % 2 * atlas.width / 2), y0 = Math.floor(Math.floor(i / 2) * atlas.height / 2);
        const x1 = Math.floor((i % 2 + 1) * atlas.width / 2), y1 = Math.floor((Math.floor(i / 2) + 1) * atlas.height / 2);
        let left = x1, top = y1, right = x0, bottom = y0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (pixels[(y * atlas.width + x) * 4 + 3] > 16) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        if (right <= left || bottom <= top) { resolve(false); return; }
        crops.push([left, top, right - left, bottom - top]);
      }
      const scale = Math.min(112 / Math.max(...crops.map(c => c[2])), 140 / Math.max(...crops.map(c => c[3])));
      crops.forEach((crop, i) => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 144;
        const width = Math.round(crop[2] * scale), height = Math.round(crop[3] * scale);
        const placement = [Math.round((128 - width) / 2), 142 - height, width, height];
        c.getContext('2d').drawImage(image, ...crop, ...placement);
        c.spriteSource = { image, crop, placement, width: 128, height: 144 };
        c.staffPose = poses[i]; c.spriteScale = scale; c.footAnchor = 142;
        frames.set(poses[i], c);
      });
      resolve(true);
    };
    image.src = new URL('./staff-atlas.png?v=20261012-cafe-worker', base).href;
  });
  function frame(pose = 'idle') { return frames.get(pose) || frames.get('idle') || null; }
  function pose({ busy, washing, cooking }) {
    return busy > 0 ? washing ? 'wash' : cooking ? 'cook' : 'greet' : 'idle';
  }
  window.StaffArt = { load, frame, pose, poses };
})();
