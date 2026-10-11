/* Matched front/back cat walking sprites, with authored rear guest artwork. */
(function () {
  'use strict';
  const extraCats = new Image(), guestAtlas = new Image(), cache = new Map();
  const extraMeta = [[{"bounds":[62,9,164,215],"axis":132},{"bounds":[275,9,161,215],"axis":344.5},{"bounds":[477,9,166,215],"axis":547},{"bounds":[685,9,163,215],"axis":754}],[{"bounds":[64,225,163,204],"axis":132.5},{"bounds":[277,224,163,208],"axis":346},{"bounds":[481,225,166,205],"axis":549.5},{"bounds":[688,224,164,208],"axis":756}],[{"bounds":[62,442,165,216],"axis":132.5},{"bounds":[274,442,162,218],"axis":343},{"bounds":[479,441,166,217],"axis":548},{"bounds":[685,442,163,218],"axis":754.5}],[{"bounds":[65,661,161,215],"axis":133.5},{"bounds":[275,661,164,216],"axis":343.5},{"bounds":[480,661,167,215],"axis":550},{"bounds":[687,661,164,216],"axis":755.5}],[{"bounds":[61,890,166,218],"axis":133.5},{"bounds":[273,890,164,220],"axis":345.5},{"bounds":[478,890,166,218],"axis":549},{"bounds":[684,890,164,219],"axis":755}],[{"bounds":[63,1114,163,211],"axis":132},{"bounds":[275,1114,165,213],"axis":344.5},{"bounds":[479,1114,167,211],"axis":549.5},{"bounds":[687,1114,164,212],"axis":756}],[{"bounds":[59,1334,167,219],"axis":131.5},{"bounds":[273,1334,165,220],"axis":344.5},{"bounds":[478,1334,167,218],"axis":550},{"bounds":[685,1334,164,220],"axis":756.5}],[{"bounds":[64,1557,163,206],"axis":133},{"bounds":[277,1557,163,207],"axis":345.5},{"bounds":[481,1557,166,206],"axis":551.5},{"bounds":[688,1557,164,207],"axis":757}]];
  const guestMeta = [[{"bounds":[80,490,149,256],"axis":154},{"bounds":[320,490,148,256],"axis":393.5},{"bounds":[558,490,150,256],"axis":632.5},{"bounds":[800,490,148,256],"axis":873.5}],[{"bounds":[88,759,134,266],"axis":154.5},{"bounds":[323,759,135,266],"axis":390},{"bounds":[566,759,135,266],"axis":633},{"bounds":[806,759,135,266],"axis":873}],[{"bounds":[75,1039,150,241],"axis":149.5},{"bounds":[312,1039,150,240],"axis":386.5},{"bounds":[558,1039,150,241],"axis":632.5},{"bounds":[794,1039,149,240],"axis":868}],[{"bounds":[68,1288,170,236],"axis":152.5},{"bounds":[303,1288,170,237],"axis":388.5},{"bounds":[547,1287,170,238],"axis":632},{"bounds":[785,1288,171,236],"axis":871}]];
  const catRows = { mike: [extraCats, extraMeta, 0], kuro: [extraCats, extraMeta, 2],
    shiro: [extraCats, extraMeta, 4], chacha: [extraCats, extraMeta, 6] };
  let ready = false;
  const load = Promise.all([window.CatMotions.load, new Promise((resolve, reject) => {
    let loaded = 0;
    for (const image of [extraCats, guestAtlas]) {
      image.onload = () => { if (++loaded === 2) resolve(); };
      image.onerror = () => reject(new Error('Character facing atlas failed to load'));
    }
  })]).then(() => { ready = true; });
  extraCats.src = './cat-facing-extra.png?v=20261011-matched';
  guestAtlas.src = './rear-walk-atlas.png?v=20261011-generated-rear';
  function sprite(key, image, record, group, width, height, bodyHeight = height - 10) {
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const [x, y, w, h] = record.bounds;
    // One uniform scale across both directions and all eight frames of a cat.
    const scale = Math.min(bodyHeight / Math.max(...group.map(item => item.bounds[3])),
      ...group.map(item => (width / 2 - 3) / Math.max(item.axis - item.bounds[0], item.bounds[0] + item.bounds[2] - item.axis)));
    const dx = Math.round(width / 2 - (record.axis - x) * scale);
    // Align soles to the same foot anchor in front and back views.
    const dh = Math.round(h * scale), dy = height - 2 - dh;
    g.drawImage(image, x, y, w, h, dx, dy, Math.round(w * scale), dh);
    c.artBounds = [0, 0, width, height]; c.spriteScale = scale; c.footAnchor = height - 2;
    cache.set(key, c); return c;
  }
  function cat(pal, frame, source, fur, facing = 'back') {
    if (!ready || !['front', 'back'].includes(facing)) return null;
    if (pal === 'grio' || pal === 'ponta') return window.CatMotions.frame(pal,
      facing + 'Walk' + (((frame % 4) + 4) % 4), source.width, source.height);
    if (pal.startsWith('stray_')) return window.StrayArt?.frame(pal,
      facing + 'Walk' + (((frame % 4) + 4) % 4), source.width, source.height) || null;
    if (!catRows[pal]) return null;
    const [image, meta, first] = catRows[pal], row = first + (facing === 'back' ? 1 : 0);
    const f = ((frame % 4) + 4) % 4;
    const group = [...meta[first], ...meta[first + 1]];
    const bodyHeight = source.height - 10;
    const c = sprite(pal + ':' + facing + ':' + f + ':' + source.width + ':' + source.height,
      image, meta[row][f], group, source.width, source.height, Math.min(source.height - 2, bodyHeight));
    c.generatedCat = true; c.generatedRear = facing === 'back'; return c;
  }
  function guest(look, frame) {
    if (!ready) return null;
    const identity = Number.isInteger(look.guest) ? look.guest :
      ((parseInt(look.hair.slice(1), 16) + parseInt(look.shirt.slice(1), 16)) % 4);
    const f = ((frame % 4) + 4) % 4, row = guestMeta[identity];
    const c = sprite('guest:' + identity + ':' + f, guestAtlas, row[f], row, 128, 168);
    c.logicalWidth = 64; c.logicalHeight = 84; c.guestDetail = true; c.generatedRear = true;
    return c;
  }
  window.RearWalk = { cat, guest, load };
})();
