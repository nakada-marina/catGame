/* Run: node tests/kitchen-wash-check.cjs. Checks the live sink illustration and kitchen tap handler without dependencies. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'),html=read('index.html'),window={};
new Function('window',read('cafe-service.js'))(window);new Function('window',read('kitchen-wash.js'))(window);
const {CafeService,KitchenWash}=window;
function source(name){const start=html.indexOf('function '+name+'('),line=html.indexOf('\n',start),end=html.slice(start,line).trim().endsWith('}')?line:html.indexOf('\n}',start)+2;assert(start>=0);return html.slice(start,end);}
const dimensions=html.match(/const KW = (\d+), KH = (\d+);/),KW=Number(dimensions[1]),KH=Number(dimensions[2]);
assert.equal(KW,448);assert.equal(KH,256);
let paint=[],labels=[],saved=[];
const ctx={
  imageSmoothingEnabled:true,
  save(){saved.push(this.imageSmoothingEnabled);},
  restore(){this.imageSmoothingEnabled=saved.pop();},
  fillRect(x,y,w,h){assert.equal(this.imageSmoothingEnabled,false);assert([x,y,w,h].every(Number.isInteger));assert(w>=0&&h>=0);assert(x>=0&&x+w<=KW&&y>=166&&y+h<=KH,'sink art stays in lower row');paint.push({color:this.fillStyle,x,y,w,h});},
  fillText(text,x,y){labels.push({text,x,y});}
};
function picture(w){paint=[];labels=[];const before=JSON.stringify(w);KitchenWash.draw(ctx,w);assert.equal(JSON.stringify(w),before,'drawing must not change inventory or washing progress');assert.equal(ctx.imageSmoothingEnabled,true,'draw restores caller smoothing');assert.equal(saved.length,0);return {paint:paint.slice(),labels:labels.slice()};}
for(const count of [0,1,3,6,9,20]){
  const w=CafeService.init({});
  for(const key of CafeService.keys){w.dirty[key]=count;w.clean[key]=0;w.total[key]=count;}
  const p=picture(w);
  assert.equal(p.paint.filter(r=>r.color==='#a06c48').length,Math.min(9,count),'visible plate pile grows with dirty plates');
  assert.equal(p.paint.filter(r=>r.color==='#79513a').length,Math.min(9,count),'cup pile grows with dirty cups');
  assert.equal(p.paint.filter(r=>r.color==='#a47a50').length,Math.min(6,count),'forks reflect their own inventory');
  for(const [key,name]of [['plate','皿'],['cup','コップ'],['fork','フォーク']])assert(p.labels.some(l=>l.text===name+' '+count),'exact counts survive visual caps: '+key);
  assert(p.labels.some(l=>l.text===(count?'タップで洗う':'食器はきれい')));
  assert(!p.paint.some(r=>r.color==='#d7f1e8'),'no running water while idle');
}
const g={},w=CafeService.init(g);
for(const order of [{id:'coffee'},{id:'cake'}])CafeService.soil(g,CafeService.reserve(g,order));
const initial=picture(w);assert(initial.labels.some(l=>l.text==='待ち 3・洗浄 0'));
let starts=0,saves=0;
const wash=new Function('CafeService','G','mode','toast','refreshDishes','save','updateStockInfo',source('washDishes')+';return washDishes;')(
  CafeService,g,'open',()=>{},()=>{},()=>saves++,()=>{});
const tapSource=html.slice(html.indexOf("kcv.addEventListener('pointerdown'"),html.indexOf('\n});',html.indexOf("kcv.addEventListener('pointerdown'"))+4);
function handler(width,mode='open',paused=false,guide=null,ready=[]){
  let tap;const rect={left:12,top:24,width,height:(width-6)*KH/KW+6};
  const kcv={addEventListener:(name,fn)=>tap=fn,getBoundingClientRect:()=>rect};
  const equipment=[],deliveries=[];
  new Function('kcv','initAudio','G','isPaused','mode','KW','KH','KitchenWash','firstGuide','washDishes','passSlots','deliver','kitchenUnits','tapUnit',tapSource)(
    kcv,()=>{},g,()=>paused,mode,KW,KH,KitchenWash,guide,()=>{starts++;wash();},()=>ready,j=>deliveries.push(j),
    ()=>[{st:'drink',i:0,x:34,y:40,w:60,h:72}],u=>equipment.push(u));
  return {tap(x,y){tap({preventDefault(){},clientX:rect.left+3+x/KW*(rect.width-6),clientY:rect.top+3+y/KH*(rect.height-6)});},equipment,deliveries};
}
for(const width of [304,377,624]){
  const h=handler(width);h.tap(64,70);assert.equal(h.equipment.length,1,'coffee tap unchanged across viewport sizes');
  const job={id:'ready'};const pass=handler(width,'open',false,null,[{x:380,y:32,j:job}]);pass.tap(394,28);assert.equal(pass.deliveries[0],job,'ready-food tap unchanged');
  assert(KitchenWash.hit(258,210));assert(KitchenWash.hit(383,195));assert(!KitchenWash.hit(64,70));assert(!KitchenWash.hit(450,200));assert(!KitchenWash.hit(258,160));
}
handler(377,'report').tap(258,210);handler(377,'title').tap(258,210);handler(377,'open',true).tap(258,210);handler(377,'open',false,{step:'brew'}).tap(258,210);
assert.equal(starts,0,'reports, title, pause and tutorial block kitchen washing');
handler(377).tap(258,210);assert.equal(starts,1);assert.equal(saves,1);assert(w.wash,'sink tap starts actual washing');assert.equal(CafeService.sum(w.dirty),0);
const first=picture(w);assert(first.labels.some(l=>l.text==='待ち 0・洗浄 3'));assert(first.labels.some(l=>l.text==='あと 3秒'));
assert(first.paint.some(r=>r.color==='#d7f1e8'),'washing includes falling water');
for(let i=0;i<25;i++)CafeService.tickWash(g);
const next=picture(w);assert.notDeepEqual(first.paint,next.paint,'water and suds animate while washing');
handler(377).tap(383,195);assert.equal(saves,1,'busy tap cannot duplicate batch');
while(w.wash)CafeService.tickWash(g);
const finished=picture(w);assert(finished.labels.some(l=>l.text==='食器はきれい'));assert.deepEqual(w.clean,{cup:6,plate:6,fork:6});assert(!finished.paint.some(r=>r.color==='#d7f1e8'));
handler(377,'closing').tap(258,210);assert.equal(saves,1,'empty sink does not create a wash batch');
assert(html.includes('KitchenWash.draw(kctx,CafeService.init(G))'),'live kitchen draws inventory');
assert(!html.includes('drawWashStation'),'cafe-room illustration removed');
assert(!html.includes('x>=135&&x<=166&&y>=36&&y<=68'),'old cafe wash tap removed');
const units=new Function('G',source('kitchenUnits')+';return kitchenUnits();')({kitchen:{drink:2,stove:2,oven:2}});
for(const u of units)assert(u.y+u.h<KitchenWash.bounds.y,'fully upgraded cooking equipment stays clear of washing row');
assert(read('visual-renewal.css').includes('448 / '+KH),'stylesheet preserves new aspect ratio');
// Execute the real kitchen renderer, including the fully upgraded equipment layout.
let livePaint=[],liveLabels=[],transforms=[],equipmentDraws=[];
const liveCtx={
  imageSmoothingEnabled:false,
  save(){},restore(){},
  setTransform(...m){transforms.push(m);},
  fillRect(x,y,width,height){assert([x,y,width,height].every(Number.isFinite));assert(x>=0&&x<=KW&&y>=0&&y+height<=KH,'complete kitchen stays in vertical bounds');if(y>=166)assert(x+width<=KW,'new lower row fits horizontally');livePaint.push({color:this.fillStyle,x,y,width,height});},
  fillText(s){liveLabels.push(s);},drawImage(){},measureText:s=>({width:s.length*6})
};
const helpers=new Function('kctx',source('K')+'\n'+source('KE')+'\n'+source('KT')+';return {K,KE,KT};')(liveCtx);
const render=new Function('K','KE','KT','kctx','kcv','KW','KH','G','jobs','tick','ICON2','kitchenUnits','unitJob','drawCoffeeUnit','drawStoveUnit','drawOvenUnit','queued','tapHint','ZONE','passSlots','drawFirstGuideKitchenTarget','kfx','clamp','COLD_AFTER','CafeService','KitchenWash',
  source('renderKitchen')+';return renderKitchen;')(
  helpers.K,helpers.KE,helpers.KT,liveCtx,{width:KW*2,height:KH*2},KW,KH,g,[],0,{},()=>units,()=>null,
  u=>equipmentDraws.push(u),u=>equipmentDraws.push(u),u=>equipmentDraws.push(u),()=>[],()=>{},[.68,.86],()=>[],()=>{},[],(n,a,b)=>Math.max(a,Math.min(b,n)),420,CafeService,KitchenWash);
w.dirty.plate=1;w.clean.plate=5;render();
assert.equal(equipmentDraws.length,6);assert.deepEqual(transforms[0],[2,0,0,2,0,0]);
assert(liveLabels.includes('皿 1'),'real render shows washing-row counts');
assert(livePaint.some(p=>p.color==='#a06c48'),'real render includes dirty pile');
w.dirty.plate=0;w.clean.plate=6;livePaint=[];liveLabels=[];render();
assert(!livePaint.some(p=>p.color==='#a06c48'),'next frame clears completed dirty pile');
assert(liveLabels.includes('食器はきれい'),'completed sink appears in live renderer');
for(const file of ['index.html','kitchen-wash.js']){
  const code=read(file);if(file.endsWith('.js'))new Function(code);
  else for(const m of code.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
}
console.log('PASS growing plate/cup/fork piles and exact counts, integer pixel bounds, animated water/foam, inventory-safe rendering, real kitchen sink taps and wash completion, pause/tutorial guards, cooking and serving taps, upgraded equipment clearance and aspect ratio');
