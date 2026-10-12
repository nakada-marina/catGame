/* Run: node tests/first-customer-check.cjs. No dependencies. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function source(name) {
  const start=html.indexOf('function '+name+'('),lineEnd=html.indexOf('\n',start);
  const end=html.slice(start,lineEnd).trim().endsWith('}')?lineEnd:html.indexOf('\n}',start)+2;
  assert(start>=0&&end>start,'function exists: '+name);return html.slice(start,end);
}
const guide=html.slice(html.indexOf('// ================= 最初のお客さんの操作案内 ================='),html.indexOf('// ================= 最初のお客さんの操作案内ここまで ================='));
const functions=['newSave','spawnCustomer','moveTo','serve','cookTap','deliver','updateCustomer','updateJobs','startCook','startDay','update','updateCheckout','checkoutLine','checkoutWaiting','admitCheckout','checkoutPosition','refreshRegister','beginCheckout','makeBill','save','loadSave'];
const elements={};
const $=id=>elements[id]||(elements[id]={hidden:true,textContent:'',disabled:false,scrollIntoView(){}});
const api=new Function('$','assert',`
let G,customers=[],jobs=[],cats=[],particles=[],furs=[],seats=[],ponta=null,mode='title',tick=0,speed=3,spawnTimer=0,staffBusy=0,dayLog,weather,dayFlags,rushUntil,vipNext,bgmOn;
let jobSeq=0,normalCatTicks=0,dialogues=[],memory={},checkoutSeq=0,registerFlash=0;
const REGISTER={x:158,y:128,queueX:146,queueY:154,spacing:42,capacity:3,autoAfter:240,staffAfter:90,paymentTime:36};
const OPEN=600,CLOSE=1140,ZONE=[.68,.86],COLD_AFTER=420,SAVE_KEY='grio-cafe-v1',STRAYS=[],ENTRANCE={x:112,y:312};
const MENU=[{id:'coffee',st:'drink',need:{beans:1},time:150},{id:'cookie',st:'oven',need:{flour:1},time:260}];
const kcv={scrollIntoView(){}},kfx=[];
const localStorage={setItem:(key,value)=>memory[key]=value,getItem:key=>memory[key]};
const sfx={doorbell(){},serve(){}};
const rollMarket=()=>({}),rnd=(a,b)=>(a+b)/2,pick=a=>a[0],randomLook=()=>({}),makePerson=()=>({});
const freeSeats=()=>seats.filter(s=>!s.cust),tone=()=>{},addFx=()=>{},chat=()=>{},catNear=()=>false,decor=()=>0;
const toast=()=>{},updateHud=()=>{},updateStockInfo=()=>{},event=()=>{},say=lines=>dialogues.push(lines);
const canMake=item=>Object.entries(item.need).every(([id,n])=>(G.stock[id]||[]).reduce((sum,lot)=>sum+lot.n,0)>=n);
const consume=item=>{for(const [id,n]of Object.entries(item.need))G.stock[id][0].n-=n;};
const queued=st=>jobs.filter(j=>j.state==='queue'&&j.st===st);
const kitchenUnits=()=>[{st:'drink',i:0,x:34,y:40,w:60,h:72}],unitJob=u=>jobs.find(j=>j.state==='cook'&&j.st===u.st&&j.unit===u.i);
const snsTick=()=>{},updatePonta=()=>{},makePonta=()=>null,updateKitchenFx=()=>{},checkEvents=()=>{},updateCat=()=>normalCatTicks++;
const endDay=()=>{},leaveAngry=()=>{throw Error('tutorial customer lost patience');},pay=c=>{c.state='leave';};
${guide}
${functions.map(source).join('\n')}
return {
 reset(kind='fresh') {
  G=newSave();if(kind==='legacy')G.flags={intro:true};if(kind==='completed')G.flags.firstCustomerDone=true;
  seats=[0,1,2,3].map(i=>({x:44+i*20,y:132,catX:44+i*20,catY:146,side:1}));
  cats=[{state:'idle',mood:70,hunger:20}];normalCatTicks=0;dialogues=[];startDay();
 },
 step(n=1){for(let i=0;i<n;i++)update();},
 order(staff=false){return serve(customers[0],staff);},
 brew(staff=false){return startCook(kitchenUnits()[0],staff);},
 finish(){cookTap(jobs[0],kitchenUnits()[0]);},
 deliver(staff=false){deliver(jobs[0],staff);},
 skip(){finishFirstGuide(true);},
 checkpoint(){save();},
 resume(){G=loadSave();startDay();},
 state(){return {G,customers,jobs,firstGuide,speed,normalCatTicks,dialogues};}
};
`)($,assert);
api.reset();assert.equal(api.state().speed,1);
assert(!elements.firstGuide.hidden);assert(elements.btnSpeed.disabled);
api.step(800);
let s=api.state();assert.equal(s.customers.length,1);assert.equal(s.customers[0].order.id,'coffee');assert.equal(s.firstGuide.step,'order');
const patience=s.customers[0].pat,clock=s.G.time;
api.step(3000);s=api.state();
assert.equal(s.customers.length,1);assert.equal(s.G.time,clock);assert.equal(s.customers[0].pat,patience);assert.equal(s.normalCatTicks,0);
assert.equal(api.order(true),false,'cat cannot take tutorial order');
api.order();assert.equal(api.state().firstGuide.step,'start');
assert.equal(api.state().G.stock.beans[0].n,15,'real recipe consumes one bean');
api.step(3000);assert.equal(api.state().jobs[0].state,'queue','no automated cooking');
assert.equal(api.brew(true),false);
api.brew();assert.equal(api.state().firstGuide.step,'brew');
api.finish();assert.equal(api.state().jobs[0].missed,false,'early tap can be retried');
api.step(3000);s=api.state();assert.equal(s.firstGuide.step,'finish');assert(s.jobs[0].t/s.jobs[0].dur>=.68);
assert.equal(s.jobs[0].state,'cook','perfect timing waits for player');
api.finish();assert.equal(api.state().firstGuide.step,'deliver');assert.equal(api.state().jobs[0].q,'perfect');
api.step(3000);assert.equal(api.state().jobs[0].readyT,0,'tutorial coffee stays warm');
api.deliver(true);assert.equal(api.state().jobs.length,1,'cat cannot deliver tutorial coffee');
api.deliver();s=api.state();assert.equal(s.firstGuide,null);assert.equal(s.G.flags.firstCustomerDone,true);
assert.equal(s.customers[0].state,'eat');assert.equal(s.jobs.length,0);assert(elements.firstGuide.hidden);assert(!elements.btnSpeed.disabled);
api.step(30);assert(api.state().G.time>clock,'ordinary clock resumes');assert(api.state().normalCatTicks>0,'ordinary cats resume');
api.resume();assert.equal(api.state().firstGuide,null,'finished guide stays finished after save/reload');
for(const kind of ['legacy','completed']){api.reset(kind);assert.equal(api.state().firstGuide,null,kind+' skips introduction');api.step(30);assert(api.state().G.time>600);}
api.reset();api.step(800);api.order();api.checkpoint();api.resume();
assert.equal(api.state().firstGuide.step,'arrival','unfinished guide restarts safely');
api.step(800);assert.equal(api.state().firstGuide.step,'order');
for(const stage of ['arrival','order','queue','cook','ready']){
 api.reset();if(stage!=='arrival')api.step(800);
 if(!['arrival','order'].includes(stage))api.order();
 if(stage==='cook'||stage==='ready')api.brew();
 if(stage==='ready'){api.step(300);api.finish();}
 const before=api.state().jobs.length;
 api.skip();assert.equal(api.state().firstGuide,null);assert.equal(api.state().jobs.length,before,'skip preserves work: '+stage);
 api.step(30);assert(api.state().G.time>600);api.resume();assert.equal(api.state().firstGuide,null);
}
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new Function(match[1]);
console.log('PASS first customer workflow, frozen clock/patience, retries, manual work, save compatibility, skip at every phase, normal resume and syntax');
