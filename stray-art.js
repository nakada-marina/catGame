/* Six Nyaimee workers: sixteen authored body cells per cat, one scale per cat. */
(function () {
  'use strict';
  const meta = {"stray_sabi":{"frontWalk0":{"bounds":[83,29,146,190],"axis":163.5},"frontWalk1":{"bounds":[277,29,143,189],"axis":356.5},"backWalk0":{"bounds":[477,30,137,188],"axis":540.5},"backWalk1":{"bounds":[665,29,126,191],"axis":728},"walk0":{"bounds":[61,232,170,193],"axis":173},"walk1":{"bounds":[264,233,164,192],"axis":370},"idle":{"bounds":[478,237,127,183],"axis":541},"sit":{"bounds":[662,251,145,166],"axis":742.5},"serve":{"bounds":[75,440,135,188],"axis":142.5},"clean":{"bounds":[271,440,147,201],"axis":335},"sleepbag":{"bounds":[459,491,173,114],"axis":545.5},"groom":{"bounds":[671,446,144,180],"axis":748.5},"yawn":{"bounds":[64,648,150,179],"axis":145},"stretch":{"bounds":[260,645,177,181],"axis":348.5},"joy":{"bounds":[466,642,161,191],"axis":546.5},"surprise":{"bounds":[675,641,145,195],"axis":747.5}},"stray_hachi":{"frontWalk0":{"bounds":[76,881,146,200],"axis":154.5},"frontWalk1":{"bounds":[273,881,145,198],"axis":351.5},"backWalk0":{"bounds":[476,882,136,196],"axis":539},"backWalk1":{"bounds":[667,882,128,200],"axis":730},"walk0":{"bounds":[63,1094,168,199],"axis":172.5},"walk1":{"bounds":[263,1095,165,198],"axis":370},"idle":{"bounds":[476,1103,130,193],"axis":541.5},"sit":{"bounds":[661,1117,148,169],"axis":743.5},"serve":{"bounds":[77,1310,132,197],"axis":143},"clean":{"bounds":[270,1310,148,208],"axis":336.5},"sleepbag":{"bounds":[453,1366,182,121],"axis":544},"groom":{"bounds":[671,1319,145,187],"axis":748.5},"yawn":{"bounds":[65,1530,149,185],"axis":146},"stretch":{"bounds":[262,1528,175,187],"axis":349.5},"joy":{"bounds":[463,1527,166,197],"axis":545.5},"surprise":{"bounds":[676,1527,144,198],"axis":748}},"stray_gure":{"frontWalk0":{"bounds":[60,33,151,194],"axis":141.5},"frontWalk1":{"bounds":[270,33,153,194],"axis":353.5},"backWalk0":{"bounds":[484,34,137,191],"axis":553.5},"backWalk1":{"bounds":[690,34,142,192],"axis":756.5},"walk0":{"bounds":[51,246,165,195],"axis":157.5},"walk1":{"bounds":[265,245,159,196],"axis":364},"idle":{"bounds":[482,245,140,197],"axis":551.5},"sit":{"bounds":[682,258,146,181],"axis":758.5},"serve":{"bounds":[66,456,148,198],"axis":135},"clean":{"bounds":[257,455,167,219],"axis":342.5},"sleepbag":{"bounds":[448,504,196,139],"axis":546},"groom":{"bounds":[685,468,153,187],"axis":773.5},"yawn":{"bounds":[47,673,162,193],"axis":137.5},"stretch":{"bounds":[257,675,188,195],"axis":351},"joy":{"bounds":[464,677,177,194],"axis":552.5},"surprise":{"bounds":[682,677,156,194],"axis":769.5}},"stray_milk":{"frontWalk0":{"bounds":[60,908,153,196],"axis":143.5},"frontWalk1":{"bounds":[270,909,153,195],"axis":353.5},"backWalk0":{"bounds":[485,911,138,190],"axis":554},"backWalk1":{"bounds":[691,911,141,191],"axis":757.5},"walk0":{"bounds":[53,1126,164,195],"axis":157.5},"walk1":{"bounds":[265,1127,160,193],"axis":365},"idle":{"bounds":[482,1123,141,199],"axis":552},"sit":{"bounds":[682,1136,146,183],"axis":758.5},"serve":{"bounds":[64,1336,148,197],"axis":133},"clean":{"bounds":[259,1336,165,219],"axis":342},"sleepbag":{"bounds":[444,1385,200,139],"axis":544},"groom":{"bounds":[686,1349,154,186],"axis":775},"yawn":{"bounds":[47,1556,163,193],"axis":138},"stretch":{"bounds":[257,1557,189,194],"axis":351.5},"joy":{"bounds":[464,1556,176,196],"axis":552},"surprise":{"bounds":[682,1558,156,194],"axis":768.5}},"stray_boss":{"frontWalk0":{"bounds":[50,67,146,162],"axis":137.5},"frontWalk1":{"bounds":[268,69,133,159],"axis":342},"backWalk0":{"bounds":[482,67,125,160],"axis":549},"backWalk1":{"bounds":[697,67,133,157],"axis":754.5},"walk0":{"bounds":[44,269,155,157],"axis":146},"walk1":{"bounds":[260,269,150,157],"axis":356.5},"idle":{"bounds":[490,267,121,158],"axis":550.5},"sit":{"bounds":[699,270,130,150],"axis":759.5},"serve":{"bounds":[60,470,134,162],"axis":123.5},"clean":{"bounds":[267,471,146,176],"axis":343},"sleepbag":{"bounds":[475,507,162,114],"axis":556},"groom":{"bounds":[694,472,136,151],"axis":767},"yawn":{"bounds":[50,679,134,157],"axis":123},"stretch":{"bounds":[274,685,148,150],"axis":348},"joy":{"bounds":[476,679,148,168],"axis":550},"surprise":{"bounds":[689,679,141,167],"axis":762}},"stray_kotetsu":{"frontWalk0":{"bounds":[51,913,147,170],"axis":138.5},"frontWalk1":{"bounds":[271,916,133,166],"axis":344},"backWalk0":{"bounds":[483,915,129,166],"axis":551},"backWalk1":{"bounds":[694,914,136,164],"axis":753},"walk0":{"bounds":[45,1123,155,160],"axis":146.5},"walk1":{"bounds":[260,1122,152,160],"axis":359},"idle":{"bounds":[489,1121,124,162],"axis":551},"sit":{"bounds":[697,1123,131,156],"axis":758.5},"serve":{"bounds":[63,1330,134,164],"axis":125.5},"clean":{"bounds":[269,1334,147,175],"axis":345},"sleepbag":{"bounds":[475,1371,163,113],"axis":556.5},"groom":{"bounds":[694,1334,134,156],"axis":766.5},"yawn":{"bounds":[51,1542,137,160],"axis":126.5},"stretch":{"bounds":[276,1551,149,151],"axis":350.5},"joy":{"bounds":[477,1544,147,165],"axis":551},"surprise":{"bounds":[689,1542,142,164],"axis":763.5}}};
  const names = {"stray_sabi":"サビ","stray_hachi":"ハチ","stray_gure":"グレ","stray_milk":"ミルク","stray_boss":"ボス","stray_kotetsu":"コテツ"};
  const groups = [
    { file: 'stray-cats-sabi-hachi.png', pals: ['stray_sabi', 'stray_hachi'] },
    { file: 'stray-cats-gure-milk.png', pals: ['stray_gure', 'stray_milk'] },
    { file: 'stray-cats-boss-kotetsu.png', pals: ['stray_boss', 'stray_kotetsu'] }
  ];
  const images = {}, cache = new Map(), width = 128, height = 144;
  const base = document.currentScript?.src || location.href;
  let ready = false;
  const load = Promise.all(groups.map(group => new Promise((resolve, reject) => {
    const image = new Image();
    for (const pal of group.pals) images[pal] = image;
    image.onload = resolve;
    image.onerror = () => reject(new Error(group.file + ' could not be loaded'));
    image.src = new URL('./' + group.file + '?v=20261011-nyaimee', base).href;
  }))).then(() => {
    ready = true;
    const sprites = {};
    for (const pal of Object.keys(meta)) {
      const poses = sprites[pal] = {};
      for (const pose of Object.keys(meta[pal])) poses[pose] = frame(pal, pose);
      // A two-step gait repeats over the same four phases used by the game.
      for (const prefix of ['frontWalk', 'backWalk', 'walk'])
        for (let i = 2; i < 4; i++) poses[prefix + i] = poses[prefix + (i % 2)];
      poses.run = poses.walk1;
      poses.jump = poses.joy;
    }
    return sprites;
  });
  function frame(pal, pose, frameWidth = width, frameHeight = height) {
    if (!ready || !meta[pal]) return null;
    const walking = /^(frontWalk|backWalk|walk)(\d+)$/.exec(pose);
    if (walking) pose = walking[1] + (Number(walking[2]) % 2);
    if (pose === 'jump') pose = 'joy';
    const record = meta[pal][pose];
    if (!record) return null;
    const key = pal + ':' + pose + ':' + frameWidth + ':' + frameHeight;
    if (cache.has(key)) return cache.get(key);
    const records = Object.values(meta[pal]);
    const scale = Math.min(104 * frameHeight / height / Math.max(...records.map(r => r.bounds[3])),
      ...records.map(r => (frameWidth / 2 - 3) /
        Math.max(r.axis - r.bounds[0], r.bounds[0] + r.bounds[2] - r.axis)));
    const [x, y, w, h] = record.bounds, dw = Math.round(w * scale), dh = Math.round(h * scale);
    const dx = Math.round(frameWidth / 2 - (record.axis - x) * scale), dy = frameHeight - 2 - dh;
    const canvas = document.createElement('canvas'); canvas.width = frameWidth; canvas.height = frameHeight;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(images[pal], x, y, w, h, dx, dy, dw, dh);
    canvas.spriteSource={image:images[pal],crop:[x,y,w,h],placement:[dx,dy,dw,dh],width:frameWidth,height:frameHeight};
    canvas.artBounds = [0, 0, frameWidth, frameHeight];
    canvas.motionArtwork = true; canvas.motionPose = pose; canvas.spriteScale = scale;
    canvas.footAnchor = frameHeight - 2; canvas.generatedCat = true;
    canvas.generatedRear = pose.startsWith('backWalk'); canvas.strayArtwork = true;
    cache.set(key, canvas); return canvas;
  }
  window.StrayArt = { meta, names, width, height, load, frame };
})();
