/* Coordinated Grio/Ponta artwork: every body pose shares one atlas and scale. */
(function () {
  'use strict';
  const meta = {"grio":{"frontWalk0":{"bounds":[77,47,158,209],"axis":166},"frontWalk1":{"bounds":[311,48,161,208],"axis":402.5},"frontWalk2":{"bounds":[540,47,160,209],"axis":630},"frontWalk3":{"bounds":[775,47,157,210],"axis":859.5},"backWalk0":{"bounds":[79,271,164,214],"axis":164.5},"backWalk1":{"bounds":[323,270,152,214],"axis":401.5},"backWalk2":{"bounds":[556,271,148,215],"axis":631.5},"backWalk3":{"bounds":[786,270,162,215],"axis":866},"walk0":{"bounds":[66,511,190,208],"axis":195.5},"walk1":{"bounds":[304,512,188,206],"axis":429.5},"walk2":{"bounds":[546,514,176,206],"axis":658.5},"walk3":{"bounds":[773,514,177,207],"axis":888.5},"idle":{"bounds":[66,751,164,217],"axis":156},"serve":{"bounds":[304,749,188,217],"axis":401},"coffee":{"bounds":[553,752,161,218],"axis":644},"clean":{"bounds":[778,751,185,227],"axis":870.5},"sit":{"bounds":[71,1008,159,181],"axis":157.5},"sleepbag":{"bounds":[270,1029,237,162],"axis":388},"box":{"bounds":[546,1020,202,178],"axis":646.5},"surprise":{"bounds":[789,998,170,213],"axis":877.5},"joy":{"bounds":[67,1228,175,233],"axis":158.5},"bow":{"bounds":[308,1253,179,208],"axis":410.5},"jump":{"bounds":[549,1219,180,227],"axis":637},"groom":{"bounds":[766,1259,185,202],"axis":881}},"ponta":{"frontWalk0":{"bounds":[57,33,184,203],"axis":163.5},"frontWalk1":{"bounds":[302,32,181,207],"axis":405},"frontWalk2":{"bounds":[547,32,183,207],"axis":652},"frontWalk3":{"bounds":[789,32,182,207],"axis":892.5},"backWalk0":{"bounds":[71,261,201,216],"axis":164},"backWalk1":{"bounds":[317,262,195,216],"axis":402},"backWalk2":{"bounds":[563,262,197,220],"axis":650.5},"backWalk3":{"bounds":[805,262,193,216],"axis":892},"walk0":{"bounds":[35,496,204,216],"axis":171.5},"walk1":{"bounds":[292,497,199,214],"axis":422.5},"walk2":{"bounds":[541,500,195,212],"axis":669},"walk3":{"bounds":[787,499,196,214],"axis":914.5},"idle":{"bounds":[41,740,190,221],"axis":147},"serve":{"bounds":[292,740,209,223],"axis":402.5},"cake":{"bounds":[543,740,194,221],"axis":648},"clean":{"bounds":[794,740,186,224],"axis":901.5},"sit":{"bounds":[37,991,186,187],"axis":143},"sleepbag":{"bounds":[284,1019,232,156],"axis":399.5},"box":{"bounds":[541,999,220,181],"axis":650.5},"surprise":{"bounds":[795,980,188,207],"axis":895.5},"joy":{"bounds":[42,1208,197,236],"axis":145},"bow":{"bounds":[289,1221,199,220],"axis":404},"jump":{"bounds":[548,1203,202,226],"axis":651},"groom":{"bounds":[766,1227,218,220],"axis":901}}};
  const images = {}, cache = new Map(), width = 128, height = 144;
  const base = document.currentScript?.src || location.href;
  let ready = false;
  const load = Promise.all(['grio', 'ponta'].map(pal => new Promise((resolve, reject) => {
    const image = images[pal] = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error(pal + ' motion artwork could not be loaded'));
    image.src = new URL('./cat-motions-' + pal + '.png?v=' + (pal === 'ponta' ? '20261011-ponta-brown' : '20261011-uniform'), base).href;
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
