/* Run: node tests/sprite-raster-check.cjs. No dependencies.
 * Checks the actual atlas-to-screen drawing path; no browser screenshot assertions. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'),html=read('index.html');
const roomHeight=Number(html.match(/VH = (\d+)/)[1]);
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

  // Execute the live fit with measured HUD/guide/dock space without a checkout bar, borders and safe-area padding.
  const viewports=[[320,568,2],[375,667,2],[393,852,3],[393,640,3],[430,932,3],[1280,900,1],[852,393,3],[640,320,2],[393,724,2.625]];
  for(const [width,height,ratio]of viewports)for(const [guideHeight,dockHeight]of [[0,154],[84,154],[0,111]]){
    window.devicePixelRatio=ratio;window.visualViewport={width,height};
    const padding={left:8,right:width===852?44:8,top:height===724?47:8,bottom:height===724?34:8};
    const hudHeight=height<550?40:54,dockMeasured=width>=600?dockHeight-43:dockHeight;
    const wrap={style:{},get clientWidth(){return Number.parseFloat(this.style.width);},get clientHeight(){return Number.parseFloat(this.style.height);}};
    let wide=false;
    const field={
      classList:{toggle(name,enabled){assert.equal(name,'side-by-side');wide=enabled;}},
      get clientWidth(){return wrap.clientWidth;},
      get clientHeight(){return wrap.clientHeight-hudHeight-guideHeight-dockMeasured-(guideHeight?21:14);}
    };
    const cv=canvas(),kcv=canvas();cv.style={};kcv.style={};
    for(const surface of [cv,kcv])Object.defineProperties(surface,{clientWidth:{get:()=>parseFloat(surface.style.width)-6},clientHeight:{get:()=>parseFloat(surface.style.height)-6}});
    const rootStyle={},body={};
    const styles=el=>el===body?{paddingLeft:padding.left+'px',paddingRight:padding.right+'px',paddingTop:padding.top+'px',paddingBottom:padding.bottom+'px'}
      :el===field?{rowGap:'7px',columnGap:'7px'}:{borderLeftWidth:'3px',borderRightWidth:'3px',borderTopWidth:'3px',borderBottomWidth:'3px'};
    const fit=new Function('$','window','document','getComputedStyle','innerWidth','innerHeight','cv','kcv','VW','VH','KW','KH','SpriteRaster','positionDialogue',
      source('fitLayout')+';return fitLayout;')(
      id=>id==='wrap'?wrap:field,window,{body,documentElement:{style:{setProperty:(name,value)=>rootStyle[name]=value}}},styles,width,height,cv,kcv,224,roomHeight,KW,KH,raster,()=>{});
    fit();
    assert.equal(wrap.clientWidth,Math.floor(Math.min(width-padding.left-padding.right,wide?1040:640)),'controls retain available width');
    assert.equal(wrap.clientHeight,height-padding.top-padding.bottom,'viewport height reserves safe areas');
    assert.equal(rootStyle['--game-height'],height+'px');
    assert(cv.clientWidth===kcv.clientWidth,'both canvases share display scale');
    const drawnWidth=wide?parseFloat(cv.style.width)+7+parseFloat(kcv.style.width):Math.max(parseFloat(cv.style.width),parseFloat(kcv.style.width));
    const drawnHeight=wide?Math.max(parseFloat(cv.style.height),parseFloat(kcv.style.height)):parseFloat(cv.style.height)+7+parseFloat(kcv.style.height);
    assert(drawnWidth<=field.clientWidth&&drawnHeight<=field.clientHeight,'both surfaces fit '+[width,height,guideHeight,dockHeight,drawnWidth,drawnHeight,field.clientWidth,field.clientHeight].join(','));
    assert(Math.abs(cv.clientHeight/cv.clientWidth-roomHeight/448)<1e-8,'cafe keeps aspect ratio');
    assert(Math.abs(kcv.clientHeight/kcv.clientWidth-KH/KW)<1e-8,'kitchen and sink keep aspect ratio');
    assert.equal(cv.width,Math.round(cv.clientWidth*ratio),'cafe backing matches device pixels');
    assert.equal(cv.height,Math.round(cv.clientHeight*ratio),'cafe height matches device pixels');
    assert.equal(kcv.width,Math.round(kcv.clientWidth*ratio),'kitchen backing matches device pixels');
    assert.equal(kcv.height,Math.round(kcv.clientHeight*ratio),'kitchen height matches device pixels');
    const draw=canvas(),ctx=draw.getContext('2d');
    const render=new Function('cv','ctx','FW','FH','G','drawWallAndFloor','OPEN',source('render')+';return render;')(
      cv,ctx,448,roomHeight*2,null,()=>{},600);
    render();const m=ctx.getTransform();close(m.a,cv.width/448,'horizontal physical scale');close(m.a,m.d,'uniform physical scale');
    // Width and height each round by at most half a physical pixel. The
    // width error propagates through the room aspect ratio as well.
    assert(Math.abs(m.d*roomHeight-cv.height)<=.5*(1+roomHeight/448)+1e-8,'uniform drawing stays within the combined pixel rounding bounds');
    const oldWidth=cv.clientWidth;
    window.visualViewport.height=height-40;fit();assert(cv.clientWidth<=oldWidth,'toolbar expansion recomputes available height');
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
  console.log('PASS '+poses+' body frames drawn from original atlases, fixed sizes/baselines, mirrors and bows, retina thumbnails, 27 viewport/guide/dock/DPR layouts and toolbar resize, unchanged procedural art, preview wiring and syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
