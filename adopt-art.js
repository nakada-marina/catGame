/* Matched portraits and body poses for the four shop cats. */
(function () {
  'use strict';
  const poses = ['frontWalk0','frontWalk1','backWalk0','backWalk1','walk0','walk1','idle','sit','serve','clean','sleepbag','groom','yawn','stretch','joy','surprise'];
  const groups = [
    { file: 'adopt-cats-mike-kuro.png', pals: ['mike','kuro'] },
    { file: 'adopt-cats-shiro-chacha.png', pals: ['shiro','chacha'] }
  ];
  const records = new Map(), cache = new Map(), base = document.currentScript.src;
  // Generated sheets have small variations in their transparent row gaps.
  // Find separators near each nominal grid boundary to retain every paw/tail.
  function cuts(counts, count) {
    const edges = [0], step = counts.length / count;
    for (let i = 1; i < count; i++) {
      const target = i * step, from = Math.round(target - step * .18), to = Math.round(target + step * .18);
      let best = Math.round(target);
      for (let n = from; n <= to; n++) if (counts[n] < counts[best] || (counts[n] === counts[best] && Math.abs(n-target) < Math.abs(best-target))) best = n;
      edges.push(best);
    }
    return [...edges, counts.length];
  }
  const load = Promise.all(groups.map(group => new Promise(resolve => {
    const image = new Image(); image.onerror = () => resolve(false);
    image.onload = () => {
      const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight;
      const g = source.getContext('2d'); g.drawImage(image, 0, 0);
      const pixels = g.getImageData(0, 0, source.width, source.height).data;
      const alpha = (x,y) => pixels[(y*source.width+x)*4+3] > 16;
      const rowCounts = Array(source.height).fill(0);
      for (let y=0;y<source.height;y++) for(let x=0;x<source.width;x++) if(alpha(x,y))rowCounts[y]++;
      const rows = cuts(rowCounts, 8), authored = [];
      for (let row=0;row<8;row++) {
        const columns = Array(source.width).fill(0);
        for(let y=rows[row];y<rows[row+1];y++)for(let x=0;x<source.width;x++)if(alpha(x,y))columns[x]++;
        const edges = cuts(columns,4);
        for(let col=0;col<4;col++) {
          let left=edges[col+1],top=rows[row+1],right=edges[col],bottom=rows[row];
          for(let y=rows[row];y<rows[row+1];y++)for(let x=edges[col];x<edges[col+1];x++)if(alpha(x,y)){
            left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
          }
          if(right<=left||bottom<=top){resolve(false);return;}
          authored.push([left,top,right-left,bottom-top]);
        }
      }
      group.pals.forEach((pal,i)=>records.set(pal,{image,crops:authored.slice(i*16,i*16+16)}));
      resolve(true);
    };
    image.src = new URL('./'+group.file+'?v=20261012-shop-cats',base).href;
  }))).then(() => {
    const sprites = {};
    for(const pal of records.keys()) {
      const body = sprites[pal] = {};
      for(const pose of poses)body[pose]=frame(pal,pose);
      for(const prefix of ['frontWalk','backWalk','walk'])for(let i=2;i<4;i++)body[prefix+i]=body[prefix+(i%2)];
      body.run=body.walk1;body.jump=body.joy;
    }
    return sprites;
  });
  function frame(pal,pose,width=128,height=144) {
    const record=records.get(pal);if(!record)return null;
    const walking=/^(frontWalk|backWalk|walk)(\d+)$/.exec(pose);
    if(walking)pose=walking[1]+(Number(walking[2])%2);
    if(pose==='jump')pose='joy';
    const index=poses.indexOf(pose);if(index<0)return null;
    const key=[pal,pose,width,height].join(':');if(cache.has(key))return cache.get(key);
    const scale=Math.min(112*width/128/Math.max(...record.crops.map(c=>c[2])),110*height/144/Math.max(...record.crops.map(c=>c[3])));
    const crop=record.crops[index],dw=Math.round(crop[2]*scale),dh=Math.round(crop[3]*scale),placement=[Math.round((width-dw)/2),height-2-dh,dw,dh];
    const c=document.createElement('canvas');c.width=width;c.height=height;
    const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(record.image,...crop,...placement);
    c.spriteSource={image:record.image,crop,placement,width,height};
    c.spriteScale=scale;c.footAnchor=height-2;c.motionArtwork=true;c.motionPose=pose;c.shopCat=true;
    c.artBounds=[0,0,width,height];c.generatedCat=true;c.generatedRear=pose.startsWith('backWalk');
    cache.set(key,c);return c;
  }
  window.AdoptArt={load,frame,poses};
})();
