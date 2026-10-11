/* Coordinated Grio/Ponta artwork: every body pose shares one atlas and scale. */
(function () {
  'use strict';
  const meta = {"grio":{"frontWalk0":{"bounds":[77,47,158,209],"axis":166},"frontWalk1":{"bounds":[311,48,161,208],"axis":402.5},"frontWalk2":{"bounds":[540,47,160,209],"axis":630},"frontWalk3":{"bounds":[775,47,157,210],"axis":859.5},"backWalk0":{"bounds":[79,271,164,214],"axis":164.5},"backWalk1":{"bounds":[323,270,152,214],"axis":401.5},"backWalk2":{"bounds":[556,271,148,215],"axis":631.5},"backWalk3":{"bounds":[786,270,162,215],"axis":866},"walk0":{"bounds":[66,511,190,208],"axis":195.5},"walk1":{"bounds":[304,512,188,206],"axis":429.5},"walk2":{"bounds":[546,514,176,206],"axis":658.5},"walk3":{"bounds":[773,514,177,207],"axis":888.5},"idle":{"bounds":[66,751,164,217],"axis":156},"serve":{"bounds":[304,749,188,217],"axis":401},"coffee":{"bounds":[553,752,161,218],"axis":644},"clean":{"bounds":[778,751,185,227],"axis":870.5},"sit":{"bounds":[71,1008,159,181],"axis":157.5},"sleepbag":{"bounds":[270,1029,237,162],"axis":388},"box":{"bounds":[546,1020,202,178],"axis":646.5},"surprise":{"bounds":[789,998,170,213],"axis":877.5},"joy":{"bounds":[67,1228,175,233],"axis":158.5},"bow":{"bounds":[308,1253,179,208],"axis":410.5},"jump":{"bounds":[549,1219,180,227],"axis":637},"groom":{"bounds":[766,1259,185,202],"axis":881}},"ponta":{"frontWalk0":{"bounds":[45,12,208,233],"axis":166},"frontWalk1":{"bounds":[288,12,205,236],"axis":405},"frontWalk2":{"bounds":[539,12,207,236],"axis":659.5},"frontWalk3":{"bounds":[792,12,205,236],"axis":910},"backWalk0":{"bounds":[65,250,209,240],"axis":162},"backWalk1":{"bounds":[312,250,209,238],"axis":406},"backWalk2":{"bounds":[562,250,211,241],"axis":657},"backWalk3":{"bounds":[812,250,208,241],"axis":909},"walk0":{"bounds":[28,494,224,236],"axis":178.5},"walk1":{"bounds":[277,494,222,234],"axis":425},"walk2":{"bounds":[533,495,215,235],"axis":674.5},"walk3":{"bounds":[778,494,217,236],"axis":920.5},"idle":{"bounds":[32,739,203,239],"axis":146},"serve":{"bounds":[282,739,221,239],"axis":400},"cake":{"bounds":[535,739,207,238],"axis":647.5},"clean":{"bounds":[789,736,213,255],"axis":904},"sit":{"bounds":[27,1001,198,200],"axis":138},"sleepbag":{"bounds":[268,1029,264,173],"axis":399.5},"box":{"bounds":[538,1021,236,190],"axis":655.5},"surprise":{"bounds":[795,989,207,228],"axis":906},"joy":{"bounds":[39,1223,211,257],"axis":148.5},"bow":{"bounds":[274,1244,217,233],"axis":392},"jump":{"bounds":[538,1214,218,245],"axis":647},"groom":{"bounds":[756,1244,237,236],"axis":906.5}}};
  const images = {}, cache = new Map(), width = 128, height = 144;
  const base = document.currentScript?.src || location.href;
  let ready = false;
  const load = Promise.all(['grio', 'ponta'].map(pal => new Promise((resolve, reject) => {
    const image = images[pal] = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error(pal + ' motion artwork could not be loaded'));
    image.src = new URL('./cat-motions-' + pal + '.png?v=20261011-uniform', base).href;
  }))).then(() => {
    ready = true;
    const sprites = {};
    for (const pal of Object.keys(meta)) {
      sprites[pal] = {};
      for (const pose of Object.keys(meta[pal])) sprites[pal][pose] = frame(pal, pose);
      // The running preview uses the authored raised-foot side step.
      sprites[pal].run = sprites[pal].walk1;
    }
    return sprites;
  });
  function frame(pal, pose, frameWidth = width, frameHeight = height) {
    if (!ready || !meta[pal]?.[pose]) return null;
    const key = pal + ':' + pose + ':' + frameWidth + ':' + frameHeight;
    if (cache.has(key)) return cache.get(key);
    const records = Object.values(meta[pal]), record = meta[pal][pose];
    // Include props and low poses when fitting, but never enlarge a single pose.
    const scale = Math.min((pal === 'grio' ? 111 : 107) * frameHeight / height /
      Math.max(...records.map(r => r.bounds[3])),
      ...records.map(r => (frameWidth / 2 - 3) /
        Math.max(r.axis - r.bounds[0], r.bounds[0] + r.bounds[2] - r.axis)));
    const [x, y, w, h] = record.bounds, dw = Math.round(w * scale), dh = Math.round(h * scale);
    const dx = Math.round(frameWidth / 2 - (record.axis - x) * scale), dy = frameHeight - 2 - dh;
    const canvas = document.createElement('canvas'); canvas.width = frameWidth; canvas.height = frameHeight;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(images[pal], x, y, w, h, dx, dy, dw, dh);
    canvas.artBounds = [0, 0, frameWidth, frameHeight];
    canvas.motionArtwork = true; canvas.motionPose = pose; canvas.spriteScale = scale;
    canvas.footAnchor = frameHeight - 2;
    canvas.generatedCat = true; canvas.generatedRear = pose.startsWith('backWalk');
    cache.set(key, canvas); return canvas;
  }
  window.CatMotions = { meta, width, height, load, frame };
})();
