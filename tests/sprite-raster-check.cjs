/* Run: node tests/sprite-raster-check.cjs. No dependencies.
 * Checks the actual atlas-to-screen drawing path; no browser screenshot assertions. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'),html=read('index.html');
const kitchenSize=html.match(/const KW = (\d+), KH = (\d+);/),KW=Number(kitchenSize[1]),KH=Number(kitchenSize[2]);
function multiply(a,b){
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
}
function canvas(width=0,height=0){
  const c={width,height,style:{},operations:[]},stack=[];
  let matrix=[1,0,0,1,0,0];
  const g={
    imageSmoothingEnabled:false,imageSmoothingQuality:'low',
    setTransform(...m){matrix=m;},
    getTransform(){return {a:matrix[0],b:matrix[1],c:matrix[2],d:matrix[3],e:matrix[4],f:matrix[5]};},
    save(){stack.push({matrix:matrix.slice(),smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});},
    restore(){const state=stack.pop();assert(state,'balanced canvas saves');matrix=state.matrix;this.imageSmoothingEnabled=state.smooth;this.imageSmoothingQuality=state.quality;},
    translate(x,y){matrix=multiply(matrix,[1,0,0,1,x,y]);},
    scale(x,y){matrix=multiply(matrix,[x,0,0,y,0,0]);},
    rotate(angle){matrix=multiply(matrix,[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0]);},
    clearRect(){},
    drawImage(image,...args){c.operations.push({image,args,matrix:matrix.slice(),smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});}
  };
  c.getContext=()=>g;return c;
}
const document={createElement:()=>canvas()},location={href:'https://example.test/catGame/'},window={devicePixelRatio:1};
class Image {
  set src(value){
    this.file=new URL(value,location.href).pathname.split('/').pop();
    if(this.file==='chars.webp'){this.width=1013;this.height=196;}
    else {const data=fs.readFileSync(path.join(__dirname,'..',this.file));this.width=data.readUInt32BE(16);this.height=data.readUInt32BE(20);}
    this.onload();
  }
}
for(const file of ['sprite-raster.js','cat-motions.js','stray-art.js','rear-walk.js','character-art.js'])
  new Function('window','document','location','Image','URL',read(file))(window,document,location,Image,URL);
function source(name){
  const start=html.indexOf('function '+name+'('),lineEnd=html.indexOf('\n',start);
  const end=html.slice(start,lineEnd).trim().endsWith('}')?lineEnd:html.indexOf('\n}',start)+2;
  assert(start>=0&&end>start,'function exists: '+name);return html.slice(start,end);
}
const close=(a,b,msg)=>assert(Math.abs(a-b)<1e-8,msg);
(async()=>{
  const [brothers,strays]=await Promise.all([window.CatArtwork.load(),window.StrayArt.load,window.RearWalk.load]);
  const raster=window.SpriteRaster,bodies={...brothers,...strays};let poses=0;
  const flipH=new Function('mk','SpriteRaster',source('flipH')+';return flipH;')(canvas,raster);
  for(const [pal,frames]of Object.entries(bodies)){
    const expected=pal==='grio'?{width:70,height:79}:{width:67,height:75};
    for(const [pose,frame]of Object.entries(frames)){
      if(pose.startsWith('f_'))continue;
      const size=window.CatArtwork.displaySize(pal,frame);assert.deepEqual(size,expected,'display size retained');
      assert(frame.spriteSource,'original atlas descriptor: '+pal+'.'+pose);
      const target=canvas(),g=target.getContext('2d');g.setTransform(2.75,0,0,2.75,0,0);
      raster.draw(g,frame,10,20,size.width,size.height);
      assert.equal(target.operations.length,1,'one draw from original to final canvas');
      const op=target.operations[0],s=frame.spriteSource;
      assert.equal(op.image,s.image,'atlas used instead of reduced frame');assert(op.image instanceof Image);
      assert.deepEqual(op.args.slice(0,4),s.crop,'original crop retained');
      assert(op.smooth&&op.quality==='high','filtered single reduction retains thin details');
      close(op.args[5]+op.args[7],20+size.height*frame.footAnchor/frame.height,'foot baseline retained');
      assert.equal(g.imageSmoothingEnabled,false,'filter does not affect procedural background');
      const mirrored=flipH(frame);
      assert.equal(mirrored.spriteSource.image,s.image,'mirror keeps full-resolution original');assert(mirrored.spriteSource.flipX);
      const left=canvas();raster.draw(left.getContext('2d'),mirrored,10,20,size.width,size.height);
      assert.equal(left.operations.length,1);assert.equal(left.operations[0].image,s.image);assert(left.operations[0].matrix[0]<0,'left facing uses matrix reflection');
      const twice=flipH(mirrored);assert.equal(twice.spriteSource.flipX,false);
      poses++;
    }
  }
  for(const pal of ['mike','kuro','shiro','chacha'])for(const facing of ['front','back'])for(let phase=0;phase<4;phase++){
    const frame=window.RearWalk.cat(pal,phase,{width:76,height:53},null,facing),size=window.CatArtwork.displaySize(pal,frame),target=canvas();
    raster.draw(target.getContext('2d'),frame,0,0,size.width,size.height);
    assert.equal(target.operations[0].image,frame.spriteSource.image,'other cats use original directional atlas');
    assert.deepEqual(size,{width:59,height:41});
  }
  const fallback=canvas(30,40),target=canvas();raster.draw(target.getContext('2d'),fallback,0,0,30,40);
  assert.equal(target.operations[0].image,fallback,'procedural art retains native rendering');assert.equal(target.operations[0].smooth,false);
  const thumb=canvas(52,47);thumb.clientWidth=44;thumb.clientHeight=44*47/52;window.devicePixelRatio=3;
  const drawThumb=new Function('CHAR_SPR','CAT_SPR','SpriteRaster',source('drawCatThumb')+';return drawCatThumb;')(
    {ponta:{idle:[brothers.ponta.idle]}},{},raster);
  drawThumb(thumb,'ponta');
  assert.equal(thumb.width,132);assert.equal(thumb.height,Math.round(thumb.clientHeight*3));
  assert.equal(thumb.rasterLogicalWidth,52);assert.equal(thumb.rasterLogicalHeight,47);
  assert.equal(thumb.operations[0].image,brothers.ponta.idle.spriteSource.image,'thumbnail bypasses intermediate frame');
  drawThumb(thumb,'ponta');assert.equal(thumb.rasterLogicalWidth,52,'repeat render keeps logical size instead of multiplying DPR');
  const keep=thumb.width;window.devicePixelRatio=2;drawThumb(thumb,'ponta');assert(thumb.width<keep,'resolution responds to DPR change');

  // Execute the live layout code with CSS content boxes, including border widths.
  for(const [width,ratio]of [[320,2],[375,2],[393,3],[430,3],[1280,1],[393,2.625]]){
    window.devicePixelRatio=ratio;window.visualViewport={width};
    const wrap={style:{},get clientWidth(){return Number.parseFloat(this.style.width);}};
    const cv=canvas(),kcv=canvas();cv.style={};
    Object.defineProperties(cv,{clientWidth:{get:()=>parseFloat(cv.style.width)-6},clientHeight:{get:()=>parseFloat(cv.style.height)-6}});
    Object.defineProperties(kcv,{clientWidth:{get:()=>wrap.clientWidth-6},clientHeight:{get:()=>(wrap.clientWidth-6)*KH/KW}});
    const fit=new Function('$','window','document','getComputedStyle','innerWidth','cv','kcv','VW','VH','KW','KH','SpriteRaster','positionDialogue',
      source('fitLayout')+';return fitLayout;')(
      ()=>wrap,window,{body:{}},()=>({paddingLeft:'8px',paddingRight:'8px',borderTopWidth:'3px',borderBottomWidth:'3px'}),width,cv,kcv,224,300,KW,KH,raster,()=>{});
    fit();
    assert.equal(wrap.clientWidth,Math.floor(Math.min(width-16,640)),'full-width layout retained');
    assert.equal(cv.width,Math.round(cv.clientWidth*ratio),'backing matches content width in device pixels');
    assert.equal(cv.height,Math.round(cv.clientHeight*ratio),'backing matches content height in device pixels');
    assert.equal(kcv.width,Math.round(kcv.clientWidth*ratio),'kitchen has no second CSS reduction');
    assert.equal(kcv.height,Math.round(kcv.clientWidth*KH/KW*ratio),'extended washing row retains correct physical height');
    const draw=canvas(),ctx=draw.getContext('2d');
    const render=new Function('cv','ctx','FW','FH','G','drawWallAndFloor','OPEN',source('render')+';return render;')(
      cv,ctx,448,600,null,()=>{},600);
    render();const m=ctx.getTransform();close(m.a,cv.width/448,'horizontal physical scale');close(m.a,m.d,'uniform physical scale');assert(Math.abs(m.d*300-cv.height)<=.5,'vertical pixel rounding stays within half a physical pixel');
  }
  const room=canvas(),ctx=room.getContext('2d'),drawArtwork=new Function('ctx','SpriteRaster',
    source('catBowAngle')+'\n'+source('drawCatArtwork')+';return drawCatArtwork;')(ctx,raster);
  const size=window.CatArtwork.displaySize('grio',brothers.grio.idle);
  for(const face of [-1,1])for(const t of [18,9,0]){
    room.operations=[];drawArtwork(brothers.grio.idle,20,30,size,{state:'takeOrder',t,face});
    assert.equal(room.operations.length,1);assert.equal(room.operations[0].image,brothers.grio.idle.spriteSource.image,'bow uses original atlas too');
    assert(Math.abs(room.operations[0].matrix[1])<.2,'shallow bow retained');
  }
  for(const file of ['index.html','animation-preview.html','cat-facing-preview.html','stray-preview.html']){
    const code=read(file);
    assert(code.indexOf('src="./sprite-raster.js')<code.indexOf('src="./cat-motions.js'),'raster loaded before callers');
    assert(code.includes('SpriteRaster.draw'),'screen uses direct drawing');
    for(const m of code.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
  }
  console.log('PASS '+poses+' body frames drawn from original atlases, fixed sizes/baselines, mirrors and bows, retina thumbnails, six viewport/DPR layouts, unchanged procedural art, preview wiring and syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
