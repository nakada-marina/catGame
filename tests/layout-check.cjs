/* Run: node tests/layout-check.cjs. No dependencies. Checks real drawing transforms and floor furniture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'('),ln=html.indexOf('\n',start),end=html.slice(start,ln).trim().endsWith('}')?ln:html.indexOf('\n}',start)+2;assert(start>=0);return html.slice(start,end);}
function value(name){return new Function('return '+html.match(new RegExp('const '+name+' = ([^\\n]+)'))[1])();}
const tables=value('TABLE_POS'),stools=value('STOOL_POS'),REGISTER=value('REGISTER');
const roomHeight=Number(html.match(/VH = (\d+)/)[1]);
function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
let matrix=[1,0,0,1,0,0],paint=[],images=[];const stack=[];
const point=(x,y)=>({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
const rectangle=(x,y,w,h)=>{const a=point(x,y),b=point(x+w,y+h);paint.push({x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y});};
const ctx={save:()=>stack.push(matrix.slice()),restore:()=>matrix=stack.pop(),translate:(x,y)=>matrix=multiply(matrix,[1,0,0,1,x,y]),scale:(x,y)=>matrix=multiply(matrix,[x,0,0,y,0,0]),fillText(){},drawImage(image,sx,sy,sw,sh,x,y,w,h){images.push({image,sx,sy,sw,sh,...point(x,y),w,h});}};
const P=(color,x,y,w=1,h=1)=>rectangle(x,y,w,h),ellipse=(x,y,rx,ry)=>rectangle(x-rx,y-ry,rx*2,ry*2);
const compact=new Function('ctx',source('compactAt')+';return compactAt;')(ctx);
const bounds=list=>({x:Math.min(...list.map(p=>p.x)),y:Math.min(...list.map(p=>p.y)),right:Math.max(...list.map(p=>p.x+p.w)),bottom:Math.max(...list.map(p=>p.y+p.h))});
const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
const boxes=tables.map(([x,y])=>({x:x*2-44,right:x*2+44,y:y-56,bottom:y+20}));
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!overlap(boxes[i],boxes[j]),'table/chair groups overlap '+i+' '+j);
const counter={x:302,right:448,y:162,bottom:210},kitchen={x:350,right:448,y:0,bottom:131};
assert(!overlap(counter,kitchen),'dining counter stays below kitchen appliances');
for(const box of boxes){assert(!overlap(box,counter),'tables clear counter');assert(box.x>=0&&box.right<=448&&box.y>=0&&box.bottom<=roomHeight,'floor furniture in room');}
for(const state of ['empty','checkout','paying']){
  paint=[];matrix=[1,0,0,1,0,0];
  const head=state==='empty'?null:{state,bill:{total:1200},t:18,x:REGISTER.queueX,y:REGISTER.queueY,paymentMethod:'card'};
  const draw=new Function('REGISTER','ctx','P','ellipse','checkoutLine','registerFlash','tick',source('drawRegister')+';return drawRegister;')(REGISTER,ctx,P,ellipse,()=>head?[head]:[],36,60);
  compact(REGISTER.y,draw);const box=bounds(paint);
  assert(box.x>=0&&box.right<=448&&box.y>=0&&box.bottom<=roomHeight,'register and payment art fit room');
  assert(box.x>224&&box.y>200,'register at screen-right entrance');
  for(const table of boxes)assert(!overlap(table,box),'register clear of tables');
}
const fakeCustomers=[0,1,2].map(checkoutSeq=>({state:'checkout',checkoutSeq})),controller=html.slice(html.indexOf('// ================= レジでのお会計 ================='),html.indexOf('// ================= レジでのお会計ここまで ================='));
const positions=new Function('customers',controller+';return customers.map(checkoutPosition);')(fakeCustomers);
for(const p of positions){assert.equal(p.y,286);assert(p.x>0&&p.x<224);}
assert(positions[0].x>positions[1].x&&positions[1].x>positions[2].x,'queue extends towards entrance horizontally');
const hit=new Function('REGISTER',source('registerHit')+';return registerHit;')(REGISTER);assert(hit(204,140));assert(hit(204,120));assert(!hit(158,64),'old counter position no longer takes payment');

const seated={width:96,height:160,logicalWidth:48,logicalHeight:80,guestDetail:true};
const seatedBoxes=[],raster={draw:(g,img,x,y,w,h)=>g.drawImage(img,0,0,img.width,img.height,x,y,w,h)};
const drawSeated=new Function('ctx','customerOnFloor','customerPose','drawAt','drawCrown','floorShadow','GuestArt','RearWalk','CounterArt','SpriteRaster',
  source('drawCustomer')+';return drawCustomer;')(ctx,()=>false,()=>'sit',()=>{throw Error('counter uses the complete seated-on-stool artwork');},()=>{},()=>{},null,null,{person:()=>seated},raster);
for(const [x,y]of stools){
  images=[];matrix=[1,0,0,1,0,0];
  compact(y,()=>drawSeated({state:'eat',seat:{x,y,counter:true},spr:{back:seated}}));
  assert.equal(images.length,1,'counter customer remains visible');const im=images[0];
  assert.equal(im.sh,seated.height,'draws the complete person and stool without cropping');
  const box={x:im.x,y:im.y,right:im.x+im.w,bottom:im.y+im.h};
  assert(box.y>kitchen.bottom&&box.bottom<=roomHeight,'full guest clears kitchen and room edges');
  for(const table of boxes)assert(!overlap(box,table),'counter guest clears floor furniture');
  for(const other of seatedBoxes)assert(!overlap(box,other),'counter guests have separate seats');
  seatedBoxes.push(box);
}
const serviceWindow={};new Function('window',fs.readFileSync(path.join(__dirname,'..','cafe-service.js'),'utf8'))(serviceWindow);
const food=[],drawFood=new Function('ctx','CafeService','ICON2','PLATE2','drawAt','P','tick',source('drawTableItems')+';return drawTableItems;')(
  ctx,serviceWindow.CafeService,{coffee:{id:'coffee'},cake:{id:'cake'}},{id:'plate'},(im,x,y,size)=>food.push({id:im.id,x,y,size}),P,60);
const [x,y]=tables[1];
for(const side of [-1,1])compact(y,()=>drawFood({tx:x,ty:y,side,itemX:x+side*6,cust:{state:'eat',receivedItems:[{id:'coffee'},{id:'cake'}]}}));
assert.equal(food.length,4,'both set items drawn for both table seats');
for(const item of food)assert(item.x>=x*2-44&&item.x+item.size<=x*2+44,'set stays on its half of table');
assert(food[1].x+food[1].size<food[2].x,'opposite customers sets do not overlap');
food.length=0;drawFood({counter:true,itemX:stools[0][0],cust:{state:'eat',receivedItems:[{id:'coffee'},{id:'cake'}]}});
assert.equal(food.length,2);assert(food.every(item=>item.y===152&&item.size===14),'counter food drawn on the new countertop, not compacted twice');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
console.log('PASS floor tables/chairs, separate dining counter and kitchen, complete seated guests, counter/register clearance, horizontal queue and food placement');
