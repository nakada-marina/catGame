/* Run: node tests/rear-walk-check.cjs. No external dependencies required. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const rear = fs.readFileSync(path.join(__dirname, '..', 'rear-walk.js'), 'utf8');
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
new Function('document','window','GuestArt',rear)(document,window,GuestArt);
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
const upper = c=>c.operations.filter(op=>op[1]<80);
assert.deepEqual(upper(frames[0]),upper(frames[1]),'head remains fixed');
for(const frame of frames) for(const [x,y,w,h] of frame.operations) {
  assert(x>=0&&y>=0&&x+w<=frame.width&&y+h<=frame.height,'pixel inside frame');
}
const frontFrames = [0,1,2,3].map(f=>window.RearWalk.cat('grio',f,original,fur,'front'));
assert.notDeepEqual(frontFrames[0].operations,frames[0].operations,'front and back have distinct faces');
assert.notDeepEqual(frontFrames[0].operations,frontFrames[1].operations,'front feet animate');
assert.deepEqual(upper(frontFrames[0]),upper(frontFrames[1]),'front face remains fixed');
for (const frame of frontFrames) for (const [x,y,w,h] of frame.operations)
  assert(x>=0&&y>=0&&x+w<=frame.width&&y+h<=frame.height,'front pixel inside frame');
const look = { guest:0,pants:'#3a3a44' };
const guests = [0,1,2,3].map(f=>window.RearWalk.guest(look,f));
assert.equal(guests[0].logicalHeight,84); assert.equal(guests[0].logicalWidth,64);
assert.notDeepEqual(guests[0].operations,guests[1].operations,'guest feet animate');
assert.deepEqual(guests[0].operations.at(-1),guests[1].operations.at(-1),'rear head crop stays fixed');
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
console.log('PASS rear direction, turns, arrival, sprite dispatch, cached frames, walking feet, stable head and script syntax');
