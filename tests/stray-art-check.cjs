/* Run: node tests/stray-art-check.cjs. No external dependencies required. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const raster=read('sprite-raster.js');
const html = read('index.html'), stray = read('stray-art.js'), rear = read('rear-walk.js'), artwork = read('character-art.js');
function canvas(width = 0, height = 0) {
  const c = { width, height, operations: [] };
  const g = {
    drawImage(...args) { c.operations.push(['image', ...args]); },
    clearRect(...args) { c.operations.push(['clear', ...args]); },
    translate(...args) { c.operations.push(['translate', ...args]); },
    scale(...args) { c.operations.push(['scale', ...args]); },
    save(){this.saved={enabled:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality};},
    restore(){this.imageSmoothingEnabled=this.saved.enabled;this.imageSmoothingQuality=this.saved.quality;},
    setTransform(){}
  };
  c.getContext = () => g; return c;
}
const document = { createElement: () => canvas() }, location = { href: 'https://example.test/catGame/' };
class FakeImage {
  set src(value) {
    const name = new URL(value, location.href).pathname.split('/').pop();
    this.file = name;
    if (name === 'chars.webp') { this.width = 1013; this.height = 196; }
    else { const data = fs.readFileSync(path.join(__dirname, '..', name)); this.width = data.readUInt32BE(16); this.height = data.readUInt32BE(20); }
    this.onload();
  }
}
function setup() {
  const body = () => ({ idle: canvas(128,144), walk0: canvas(128,144) });
  const window = { CatMotions: { load: Promise.resolve({ grio: body(), ponta: body() }) } };
  new Function('window',raster)(window);
  for (const source of [stray, rear, artwork])
    new Function('document','window','Image','URL','location',source)(document,window,FakeImage,URL,location);
  return window;
}
function verify(frame) {
  assert(frame.strayArtwork, 'new stray artwork');
  assert.equal(frame.operations.length,1,'one full sprite');
  const [type,image,sx,sy,sw,sh,dx,dy,dw,dh] = frame.operations[0];
  assert.equal(type,'image');
  assert(sx>=0 && sy>=0 && sx+sw<=image.width && sy+sh<=image.height,'crop inside source');
  assert(dx>=0 && dy>=0 && dx+dw<=frame.width && dy+dh<=frame.height,'tail and props fit frame');
  assert(Math.abs(dw/sw-dh/sh)<=1/sw+1/sh,'same horizontal and vertical scale');
  assert.equal(dy+dh,frame.footAnchor,'same foot baseline');
  assert.equal(frame.getContext('2d').imageSmoothingEnabled,false,'pixel rendering');
}
(async()=>{
  const window=setup(),sprites=await window.StrayArt.load;await window.RearWalk.load;
  const names=['stray_sabi','stray_hachi','stray_gure','stray_milk','stray_boss','stray_kotetsu'];
  assert.deepEqual(Object.keys(sprites),names,'existing worker IDs retained');
  const sources=new Map();let cells=0;
  for(const pal of names){
    assert.equal(Object.keys(window.StrayArt.meta[pal]).length,16,'sixteen authored poses');
    const scale=sprites[pal].idle.spriteScale,image=sprites[pal].idle.operations[0][1];
    assert.equal(image.width,887);assert.equal(image.height,1774);
    for(const pose of Object.keys(window.StrayArt.meta[pal])){
      const frame=sprites[pal][pose];verify(frame);cells++;
      assert.equal(frame.width,128);assert.equal(frame.height,144);
      assert.equal(frame.operations[0][1],image,'same cat source across activities');
      assert.equal(frame.spriteScale,scale,'no per-pose enlargement');
      assert.equal(frame,window.StrayArt.frame(pal,pose),'cached full frame');
      assert.deepEqual(window.CatArtwork.displaySize(pal,frame),{width:67,height:75},'small display in every state');
      if(!sources.has(image))sources.set(image,[]);
      sources.get(image).push(window.StrayArt.meta[pal][pose].bounds);
    }
    for(const pose of ['sleepbag','stretch'])assert(sprites[pal][pose].operations[0][9]<sprites[pal].idle.operations[0][9],'low poses stay low');
    for(const prefix of ['frontWalk','backWalk','walk']){
      assert.notDeepEqual(sprites[pal][prefix+'0'].operations,sprites[pal][prefix+'1'].operations,'two different walking steps');
      for(let i=0;i<4;i++)assert.equal(sprites[pal][prefix+i],window.StrayArt.frame(pal,prefix+i),'four-phase aliases');
    }
    for(const facing of ['front','back'])for(let i=0;i<4;i++){
      const frame=window.RearWalk.cat(pal,i,sprites[pal].walk0,null,facing);
      assert.equal(frame,sprites[pal][facing+'Walk'+i],'same front/back source');verify(frame);
    }
    assert.equal(window.RearWalk.cat(pal,-1,sprites[pal].walk0,null,'back'),sprites[pal].backWalk1,'negative phase wrap');
    assert.equal(window.StrayArt.frame(pal,'missing'),null);
  }
  assert.equal(cells,96);assert.equal(sources.size,3);
  for(const bounds of sources.values())for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){
    const a=bounds[i],b=bounds[j];
    assert(!(a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3]),'neighboring sprites never enter a crop');
  }
  const initCode=html.slice(html.indexOf('const CHAR_SPR ='),html.indexOf('// ゲームの ポーズ名'));
  const flipCode=html.slice(html.indexOf('function flipH('),html.indexOf('\n',html.indexOf('function flipH(')));
  const flipH=new Function('mk','SpriteRaster',flipCode+';return flipH;')(canvas,window.SpriteRaster);
  const errors=[],faces={grio:{},ponta:{}};
  const native=new Function('mk','CatArtwork','GuestArt','RearWalk','StrayArt','CounterArt','StaffArt','AdoptArt','flipH','FACES','console','$',initCode+';return {CHAR_SPR,artworkReady};')(
    canvas,window.CatArtwork,{load:Promise.resolve()},window.RearWalk,window.StrayArt,{load:Promise.resolve(true)},{load:Promise.resolve(true)},{load:Promise.resolve({})},flipH,faces,
    {error:e=>errors.push(e)},()=>({}));
  await native.artworkReady;assert.equal(errors.length,0);assert.equal(Object.keys(native.CHAR_SPR).length,8,'brothers plus all six workers loaded');
  const selectorCode=html.slice(html.indexOf('function charPose('),html.indexOf('function catImg('));
  const select=new Function('tick','BOX',selectorCode+';return charPose;')(100,{});
  const catCode=html.slice(html.indexOf('function catImg('),html.indexOf('// Every body action'));
  const catImg=new Function('CHAR_SPR','RearWalk','CAT_LOOK','charPose','CHAR_PENDING','CAT_SPR',catCode+';return catImg;')(
    native.CHAR_SPR,window.RearWalk,{},select,{},new Proxy({},{get(){throw Error('legacy body used');}}));
  for(const pal of names){
    for(const facing of ['front','back','side'])for(const face of [1,-1]){
      const actor={pal,state:'walk',walkFacing:facing,anim:9},im=catImg(pal,'walk0',face,actor);
      assert.deepEqual(window.CatArtwork.displaySize(pal,im),{width:67,height:75},'left and right remain same size');
      assert.equal(im,facing==='side'?native.CHAR_SPR[pal].walk1[face>0?0:1]:sprites[pal][facing+'Walk1'],'direction chosen');
    }
    for(const [state,pose,expected]of [['idle','sit0','idle'],['visit','sit0','sit'],['eat','sit0','sit'],['pickup','sit0','clean'],['clean','sit0','clean'],['nap','sleep1','sleepbag'],['idle','groomA','groom'],['idle','yawn1','yawn'],['idle','stretchM','stretch']])
      assert.equal(catImg(pal,pose,1,{pal,state,walkFacing:'back'}),sprites[pal][expected],'current activity replaces prior walking direction');
    assert.equal(catImg(pal,'sit0',1,{pal,carryDish:true}),sprites[pal].serve,'serving pose');
  }
  const thumbCode=html.slice(html.indexOf('function drawCatThumb('),html.indexOf('// あとで使うコマ'));
  const drawThumb=new Function('CHAR_SPR','CAT_SPR','CatArtwork','SpriteRaster',thumbCode+';return drawCatThumb;')(native.CHAR_SPR,{},window.CatArtwork,window.SpriteRaster);
  for(const pal of names)for(const [w,h]of [[112,126],[52,47]]){
    const c=canvas(w,h);drawThumb(c,pal);
    const op=c.operations.find(o=>o[0]==='image');
    assert.equal(op[1],sprites[pal].idle.spriteSource.image,'thumbnail paints original atlas directly');
    assert(op[6]>=0&&op[7]>=0&&op[6]+op[8]<=w&&op[7]+op[9]<=h,'thumb fits with no clipping');
  }
  const pending=[];
  class DeferredImage{constructor(){pending.push(this);}set src(value){}}
  const waiting={};
  new Function('document','window','Image','URL','location',stray)(document,waiting,DeferredImage,URL,location);
  assert.equal(pending.length,3);assert.equal(waiting.StrayArt.frame(names[0],'idle'),null);
  pending[0].onload();pending[1].onload();await Promise.resolve();
  assert.equal(waiting.StrayArt.frame(names[0],'idle'),null,'all sheets load before rendering');
  pending[2].onload();await waiting.StrayArt.load;assert(waiting.StrayArt.frame(names[0],'idle'));
  class BrokenImage{set src(value){this.onerror();}}
  const failed={};
  new Function('document','window','Image','URL','location',stray)(document,failed,BrokenImage,URL,location);
  let rejected=false;try{await failed.StrayArt.load;}catch{rejected=true;}assert(rejected,'failed sheet reports failure');
  for(const file of ['index.html','stray-preview.html']){
    const source=read(file);
    assert(source.includes('src="./stray-art.js?v=20261012-single-pass"'),'cache-busted provider');
    for(const m of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
  }
  console.log('PASS 96 cells, six worker IDs, three sheets, crops, scale, baseline, left/right and diagonals, activities, shared thumbnails, loading and syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
