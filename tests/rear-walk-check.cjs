/* Run: node tests/rear-walk-check.cjs. No external dependencies required. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const rear = fs.readFileSync(path.join(__dirname, '..', 'rear-walk.js'), 'utf8');
const artwork = fs.readFileSync(path.join(__dirname, '..', 'character-art.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(__dirname, '..', 'character-detail.js'), 'utf8');
function canvas() {
  const c = { width: 0, height: 0, operations: [] };
  const g = {
    fillStyle: '', fillRect(x,y,w,h) { c.operations.push([x,y,w,h,this.fillStyle]); },
    drawImage(...args) { c.operations.push(['image', ...args]); }
  };
  c.getContext = () => g; return c;
}
const document = { createElement: () => canvas() }, window = {};
const back = canvas(); back.width = 96; back.height = 108;
const GuestArt = { person: () => back };
class FakeImage {
  set src(value) {
    const file = fs.readFileSync(path.join(__dirname, '..', value.split('?')[0]));
    this.width = file.readUInt32BE(16); this.height = file.readUInt32BE(20); this.onload();
  }
}
new Function('document','window','GuestArt','Image',rear)(document,window,GuestArt,FakeImage);
const moveCode = html.slice(html.indexOf('function moveTo('),html.indexOf('const catNear ='));
const moveTo = new Function(moveCode + '; return moveTo;')();
for (const [dx,dy,expected] of [[0,-10,true],[2,-10,true],[-2,-10,true],[10,-2,true],[-10,-2,true],[0,10,false],[0,-.2,true],[.2,.1,false],[10,0,false],[-10,0,false],[10,-.01,true],[-10,-.01,true]]) {
  const actor = { x:0,y:0,face:1 };
  moveTo(actor,dx,dy,1);
  assert.equal(actor.walkBack,expected,'direction '+dx+','+dy);
  assert.equal(actor.walkFacing,dy < 0 ? 'back' : dy > 0 ? 'front' : 'side','front/back/side '+dx+','+dy);
}
const turning = { x:0,y:0,face:1 };
moveTo(turning,0,-10,1); assert.equal(turning.walkBack,true);
moveTo(turning,10,turning.y,1); assert.equal(turning.walkBack,false); assert.equal(turning.face,1);
moveTo(turning,-10,turning.y,1); assert.equal(turning.face,-1);
const fur = { base:'#8c765a',light:'#a68d6b',shade:'#6a5640',stripe:'#3e3024',line:'#241a12',white:'#f8f4ec',paws:true,tabby:true,chest:true,muzzle:true,ear:'#e2a39c',eye:'#b9bb4a',pupil:'#16140e',nose:'#e7969c' };
const original = canvas(); original.width=128;original.height=144;
const frames = [0,1,2,3].map(f=>window.RearWalk.cat('grio',f,original,fur));
assert.equal(frames[0].width,128); assert.equal(frames[0].height,144);
assert.equal(window.RearWalk.cat('grio',0,original,fur),frames[0],'cached sprite');
assert.notDeepEqual(frames[0].operations,frames[1].operations,'feet animate');
function verifyAtlasFrame(frame) {
  assert(frame.generatedCat || frame.generatedRear, 'generated artwork selected');
  assert.equal(frame.operations.length, 1, 'one complete sprite, without procedural body parts');
  const [type,image,sx,sy,sw,sh,dx,dy,dw,dh] = frame.operations[0];
  assert.equal(type,'image');
  assert(sx>=0&&sy>=0&&sx+sw<=image.width&&sy+sh<=image.height,'crop inside source atlas');
  assert(dx>=0&&dy>=0&&dx+dw<=frame.width&&dy+dh<=frame.height,'sprite inside destination frame');
  assert(Math.abs(dw/sw-dh/sh)<=1/sw+1/sh,'uniform scale with integer rounding');
  assert.equal(dy+dh,frame.footAnchor,'same foot baseline');
}
for(const frame of frames) verifyAtlasFrame(frame);
for(const pal of ['grio','ponta','mike','kuro','shiro','chacha']) for(const [width,height] of [[128,144],[76,53],[81,64]]) {
  const source = { width, height }, reference = window.RearWalk.cat(pal,0,source,fur,'front');
  for(const facing of ['front','back']) for(let f=0;f<4;f++) {
    const im = window.RearWalk.cat(pal,f,source,fur,facing);
    verifyAtlasFrame(im);
    assert.equal(im.spriteScale,reference.spriteScale,'same scale for every front/back frame');
    assert.equal(im.footAnchor,reference.footAnchor,'same baseline for every front/back frame');
  }
}
const frontFrames = [0,1,2,3].map(f=>window.RearWalk.cat('grio',f,original,fur,'front'));
assert.notDeepEqual(frontFrames[0].operations,frames[0].operations,'front and back have distinct faces');
assert.notDeepEqual(frontFrames[0].operations,frontFrames[1].operations,'front feet animate');
for(const frame of frontFrames) verifyAtlasFrame(frame);
const look = { guest:0,pants:'#3a3a44' };
const guests = [0,1,2,3].map(f=>window.RearWalk.guest(look,f));
assert.equal(guests[0].logicalHeight,84); assert.equal(guests[0].logicalWidth,64);
assert.notDeepEqual(guests[0].operations,guests[1].operations,'guest feet animate');
for(let guest=0;guest<4;guest++) for(let frame=0;frame<4;frame++)
  verifyAtlasFrame(window.RearWalk.guest({guest,pants:'#3a3a44'},frame));
assert.equal(guests[0].footAnchor,guests[1].footAnchor,'consistent guest foot anchor');
assert(html.includes('GuestArt.load, RearWalk.load'),'game waits for generated assets');
const catCode = html.slice(html.indexOf('function catImg('),html.indexOf('// Display-scale only:'));
const normal = {};
const catImg = new Function('CHAR_SPR','RearWalk','CAT_LOOK','charPose','CHAR_PENDING','CAT_SPR',catCode+';return catImg;')(
 {grio:{walk0:[original,original],idle:[normal,normal]}},window.RearWalk,{grio:fur},()=> 'idle',{},{}
);
assert.equal(catImg('grio','walk0',1,{walkFacing:'back',anim:0}),frames[0],'walking chooses back');
assert.equal(catImg('grio','sit0',1,{walkFacing:'back',anim:0}),normal,'idle keeps normal pose');
assert.equal(catImg('grio','walk0',1,{walkFacing:'side',anim:0}),normal,'side travel uses normal selector');
assert.equal(catImg('grio','walk0',1,{walkFacing:'front',anim:0}),frontFrames[0],'downward walking chooses front');
const drawCode = html.slice(html.indexOf('function drawCustomer('),html.indexOf('function drawCrown('));
const frontGuest = {}, sideGuest = {}, rearGuest = {};
let drawn;
const drawCustomer = new Function('GuestArt','RearWalk','drawAt','floorShadow','customerPose','drawCrown',drawCode+';return drawCustomer;')(
  {person:()=>frontGuest,walk:()=>sideGuest},{guest:()=>rearGuest},im=>{drawn=im;},()=>{},()=>{},()=>{}
);
for(const [facing,expected] of [['back',rearGuest],['front',frontGuest],['side',sideGuest]])
  { drawCustomer({state:'enter',look,walkFacing:facing,anim:0,x:0,y:0});assert.equal(drawn,expected,'guest facing '+facing); }
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(match[1].trim()) new Function(match[1]);
const artWindow = {};
new Function('window','document',artwork)(artWindow,document);
const displaySize = artWindow.CatArtwork.displaySize;
assert.deepEqual(displaySize('grio',{width:128,height:144}),{width:70,height:79},'smaller Grio');
assert.deepEqual(displaySize('ponta',{width:128,height:144}),{width:67,height:75},'Ponta remains slightly smaller');
assert.deepEqual(displaySize('mike',{width:76,height:53}),{width:59,height:41},'other cats shrink too');
assert.deepEqual(displaySize('stray_1',{width:76,height:53}),{width:59,height:41},'temporary cats shrink too');
const detailMeta = JSON.parse(detailSource.match(/meta:(\{[\s\S]*?\}),src:/)[1]);
for(const [key,[x,y,width,height]] of Object.entries(detailMeta)) {
  const who = key.split('.')[0], size = displaySize(who,{width,height});
  assert.equal(size.height,who==='grio'?79:75,'common scale for '+key);
  assert.equal(size.width,who==='grio'?70:67,'common frame for '+key);
}
assert.equal(displaySize('grio',{width:81,height:64}).height,67,'old-resolution sleeping art is smaller');
assert.equal(displaySize('ponta',{width:81,height:64}).height,63,'Ponta sleeping art is smaller');
const selectorCode = html.slice(html.indexOf('function charPose('),html.indexOf('function catImg('));
const selectPose = new Function('tick','BOX',selectorCode+';return charPose;')(100,{});
for(const [state,pose,expected] of [['idle','sit0','idle'],['visit','sit0','sit'],['pickup','sit0','clean'],['nap','sleep','sleepbag'],['toOrder','walk0','walk0']])
  assert.equal(selectPose({pal:'grio',state,anim:0},pose),expected,'original motion '+state);
assert.equal(selectPose({pal:'grio',state:'idle',carryDish:true},'sit0'),'serve','serving pose retained');
assert.equal(selectPose({pal:'grio',surpriseUntil:120},'sit0'),'surprise','surprised pose retained');
assert.equal(selectPose({pal:'grio',joyUntil:200},'sit0'),'joy','happy pose retained');
for(const frame of frames) {
  const op=frame.operations[0], nativeHeight=op[9];
  assert(nativeHeight<=111,'front/back Grio sized to original walking artwork');
  assert(Math.round(nativeHeight*.55)<=62,'visible cat smaller than human artwork');
}

const pending = [], waitingWindow = {};
class DeferredImage { constructor() { pending.push(this); } set src(value) {} }
new Function('document','window','GuestArt','Image',rear)(document,waitingWindow,GuestArt,DeferredImage);
assert.equal(waitingWindow.RearWalk.cat('grio',0,original,fur,'front'),null,'no incomplete sprites before loading');
pending[0].onload(); pending[1].onload();
assert.equal(waitingWindow.RearWalk.cat('grio',0,original,fur,'front'),null,'wait for all three images');
pending[2].onload();
assert(waitingWindow.RearWalk.cat('grio',0,original,fur,'front'),'sprites ready after all three images');
console.log('PASS smaller cats, all original motion scales and pose selection, matched front/back crops, anchors, direction, loading and syntax');
