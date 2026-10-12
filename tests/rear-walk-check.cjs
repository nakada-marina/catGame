/* Run: node tests/rear-walk-check.cjs. No external dependencies required. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const raster=read('sprite-raster.js');
const html = read('index.html'), rear = read('rear-walk.js'), artwork = read('character-art.js'), motions = read('cat-motions.js');
function canvas() {
  const c = { width: 0, height: 0, operations: [] };
  const g = {
    drawImage(...args) { c.operations.push(['image', ...args]); },
    clearRect(...args) { c.operations.push(['clear', ...args]); }
  };
  c.getContext = () => g; return c;
}
const document = { createElement: () => canvas() }, location = { href: 'https://example.test/catGame/' };
class FakeImage {
  set src(value) {
    const name = new URL(value, location.href).pathname.split('/').pop();
    if(name==='chars.webp') { this.width=1013;this.height=196; }
    else { const file=fs.readFileSync(path.join(__dirname, '..', name));this.width=file.readUInt32BE(16);this.height=file.readUInt32BE(20); }
    this.onload();
  }
}
function setup(ImageClass=FakeImage) {
  const window={};
  new Function('window',raster)(window);
  new Function('document','window','Image','URL','location',motions)(document,window,ImageClass,URL,location);
  new Function('document','window','Image',rear)(document,window,ImageClass);
  new Function('document','window','Image','URL','location',artwork)(document,window,ImageClass,URL,location);
  return window;
}
function verifyAtlasFrame(frame) {
  assert(frame.generatedCat || frame.generatedRear, 'authored artwork selected');
  assert.equal(frame.operations.length,1,'one complete sprite');
  const [type,image,sx,sy,sw,sh,dx,dy,dw,dh]=frame.operations[0];
  assert.equal(type,'image');
  assert(sx>=0&&sy>=0&&sx+sw<=image.width&&sy+sh<=image.height,'crop inside atlas');
  assert(dx>=0&&dy>=0&&dx+dw<=frame.width&&dy+dh<=frame.height,'complete sprite fits canvas');
  assert(Math.abs(dw/sw-dh/sh)<=1/sw+1/sh,'uniform scale with integer rounding');
  assert.equal(dy+dh,frame.footAnchor,'shared foot baseline');
}
(async()=>{
  const window=setup();
  const sprites=await window.CatArtwork.load();await window.RearWalk.load;
  assert.equal(window.CatArtwork.load(),window.CatArtwork.load(),'cached artwork loading');
  for(const who of ['grio','ponta']) {
    const body=Object.entries(sprites[who]).filter(([key])=>!key.startsWith('f_'));
    assert.equal(Object.keys(window.CatMotions.meta[who]).length,24,'24 newly drawn cells per cat');
    assert.equal(body.length,25,'all body poses plus running step');
    assert.equal(Object.keys(sprites[who]).filter(key=>key.startsWith('f_')).length,8,'dialogue portraits retained');
    const source=sprites[who].idle.operations[0][1],scale=sprites[who].idle.spriteScale;
    for(const [pose,frame] of body) {
      verifyAtlasFrame(frame);
      assert(frame.motionArtwork,'every body pose uses new artwork: '+who+'.'+pose);
      assert.equal(frame.operations[0][1],source,'all actions share a character atlas');
      assert.equal(frame.spriteScale,scale,'all actions share one scale, including sleep');
      assert.equal(frame.width,128);assert.equal(frame.height,144);
      assert.deepEqual(window.CatArtwork.displaySize(who,frame),who==='grio'?{width:70,height:79}:{width:67,height:75},'smaller display across every motion');
    }
    assert(sprites[who].sleepbag.operations[0][9]<sprites[who].idle.operations[0][9],'sleeping remains naturally shorter');
    assert.notDeepEqual(sprites[who].groom.operations,sprites[who].sit.operations,'dedicated grooming artwork');
    for(const direction of ['front','back'])for(let f=0;f<4;f++) {
      const frame=window.RearWalk.cat(who,f,sprites[who].walk0,null,direction);
      assert.equal(frame,sprites[who][direction+'Walk'+f],'walking uses same full-motion atlas');
      verifyAtlasFrame(frame);
    }
    assert.equal(window.CatMotions.frame(who,'missing'),null);
    assert.equal(window.RearWalk.cat(who,0,sprites[who].walk0,null,'side'),null);
    assert.equal(window.RearWalk.cat(who,-1,sprites[who].walk0,null,'front'),sprites[who].frontWalk3,'negative phase wraps');
    for(const prefix of ['frontWalk','backWalk','walk'])for(let f=1;f<4;f++)
      assert.notDeepEqual(sprites[who][prefix+'0'].operations,sprites[who][prefix+f].operations,'distinct authored walking cells');
  }
  for(const pal of ['grio','ponta','mike','kuro','shiro','chacha'])for(const [width,height] of [[128,144],[76,53],[81,64]]) {
    const source={width,height},reference=window.RearWalk.cat(pal,0,source,null,'front');
    for(const facing of ['front','back'])for(let f=0;f<4;f++) {
      const im=window.RearWalk.cat(pal,f,source,null,facing);verifyAtlasFrame(im);
      assert.equal(im.spriteScale,reference.spriteScale);assert.equal(im.footAnchor,reference.footAnchor);
    }
  }
  for(let guest=0;guest<4;guest++)for(let frame=0;frame<4;frame++) {
    const im=window.RearWalk.guest({guest},frame);verifyAtlasFrame(im);
    assert.equal(im.logicalWidth,64);assert.equal(im.logicalHeight,84);
  }
  const moveCode=html.slice(html.indexOf('function moveTo('),html.indexOf('const catNear ='));
  const moveTo=new Function(moveCode+';return moveTo;')();
  for(const [dx,dy] of [[0,-10],[2,-10],[-2,-10],[10,-2],[-10,-2],[0,10],[.2,.1],[10,0],[-10,0],[10,-.01],[-10,-.01]]) {
    const actor={x:0,y:0,face:1};moveTo(actor,dx,dy,1);
    assert.equal(actor.walkFacing,dy<0?'back':dy>0?'front':'side','direction '+dx+','+dy);
  }
  const selectorCode=html.slice(html.indexOf('function charPose('),html.indexOf('function catImg('));
  const BOX={},selectPose=new Function('tick','BOX',selectorCode+';return charPose;')(100,BOX);
  for(const [state,pose,expected] of [['idle','sit0','idle'],['visit','sit0','sit'],['pickup','sit0','clean'],['clean','sit0','clean'],['nap','sleep','sleepbag'],['slack','groom0','groom'],['toOrder','walk0','walk0']])
    assert.equal(selectPose({pal:'grio',state,anim:0},pose),expected,state+' pose');
  assert.equal(selectPose({pal:'ponta',state:'nap',spot:BOX},'sleep'),'box');
  assert.equal(selectPose({pal:'grio',jump:10},'sit0'),'jump');
  assert.equal(selectPose({pal:'grio',carryDish:true},'sit0'),'serve');
  assert.equal(selectPose({pal:'ponta',carry:true},'sit0'),'cake');
  assert.equal(selectPose({pal:'grio',surpriseUntil:120},'sit0'),'surprise');
  assert.equal(selectPose({pal:'grio',joyUntil:200},'sit0'),'joy');
  const native={};
  for(const who of ['grio','ponta'])native[who]=Object.fromEntries(Object.entries(sprites[who]).map(([pose,im])=>[pose,[im,{mirrorOf:im}]]));
  const catCode=html.slice(html.indexOf('function catImg('),html.indexOf('// Every body action'));
  const catImg=new Function('CHAR_SPR','RearWalk','CAT_LOOK','charPose','CHAR_PENDING','CAT_SPR',catCode+';return catImg;')(native,window.RearWalk,{},selectPose,{},{});
  for(const who of ['grio','ponta']) {
    for(const facing of ['front','back'])assert.equal(catImg(who,'walk0',1,{pal:who,walkFacing:facing,anim:18}),sprites[who][facing+'Walk2']);
    assert.equal(catImg(who,'walk0',-1,{pal:who,walkFacing:'side',anim:9}),native[who].walk1[1],'side walking mirrors correct step');
    assert.equal(catImg(who,'groom0',1,{pal:who,state:'slack',walkFacing:'back'}),sprites[who].groom,'activity uses authored pose even after walking back');
    assert.equal(catImg(who,'sit0',1,{pal:who,state:'clean'}),sprites[who].clean,'cleaning animation selected');
  }
  assert.deepEqual(window.CatArtwork.displaySize('mike',{width:76,height:53}),{width:59,height:41});
  assert.deepEqual(window.CatArtwork.displaySize('stray_1',{width:76,height:53}),{width:59,height:41});
  const pending=[];
  class DeferredImage { constructor(){pending.push(this);}set src(value){} }
  const waiting=setup(DeferredImage);
  assert.equal(pending.length,4,'two motion sheets plus extra-cat and guest sheets');
  assert.equal(waiting.RearWalk.cat('grio',0,{width:128,height:144},null,'front'),null);
  pending[2].onload();pending[3].onload();await Promise.resolve();
  assert.equal(waiting.RearWalk.cat('grio',0,{width:128,height:144},null,'front'),null,'wait for main motions too');
  pending[0].onload();await Promise.resolve();
  assert.equal(waiting.CatMotions.frame('grio','idle'),null,'no partially loaded motion collection');
  pending[1].onload();await waiting.RearWalk.load;
  assert(waiting.RearWalk.cat('grio',0,{width:128,height:144},null,'front'));
  for(const file of ['index.html','animation-preview.html','cat-facing-preview.html']) {
    const source=read(file);
    assert(source.indexOf('src="./cat-motions.js')<source.indexOf('src="./rear-walk.js'),'provider loaded before consumer: '+file);
    for(const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new Function(match[1]);
  }
  console.log('PASS all 48 authored motion cells, uniform scale/atlas/baseline, smaller sizes, sleep and grooming, six cat directions, guests, load ordering and syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
