/* Run: node tests/register-check.cjs. No external dependencies required. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const financeWindow={};new Function('window',fs.readFileSync(path.join(__dirname,'..','finance.js'),'utf8'))(financeWindow);const CafeFinance=financeWindow.CafeFinance;
new Function('window',fs.readFileSync(path.join(__dirname,'..','cat-shifts.js'),'utf8'))(financeWindow);const CafeShifts=financeWindow.CafeShifts;
new Function('window',fs.readFileSync(path.join(__dirname,'..','cafe-service.js'),'utf8'))(financeWindow);const CafeService=financeWindow.CafeService;

function source(name){
  const start=html.indexOf('function '+name+'('),lineEnd=html.indexOf('\n',start);
  const end=html.slice(start,lineEnd).trim().endsWith('}')?lineEnd:html.indexOf('\n}',start)+2;
  assert(start>=0&&end>start,'function exists: '+name);return html.slice(start,end);
}
const controller=html.slice(html.indexOf('// ================= レジでのお会計 ================='),html.indexOf('// ================= レジでのお会計ここまで ================='));
const constants=['TABLE_POS','STOOL_POS'].map(name=>html.match(new RegExp('const '+name+' = [^\\n]+'))[0]).join('\n');
const functions=['clearTable','refreshDishes','washDishes','syncCatRoster','makeCat','spawnCats','beginPontaExit','updateShiftAttendance','makePonta','newSave','buildSeats','startDay','moveTo','updateCustomer','pay','earn','update','endDay','save','loadSave','drawCustomer','drawSay','drawRegister','render','canvasPoint','financeResultHtml','financeRows','financeDate','financeYen','financeEscape','showDayResult'];
const tapHandler=html.slice(html.indexOf('onCafeTap(e => {'),html.indexOf('\n});',html.indexOf('onCafeTap(e => {'))+4);
const elements={},$=id=>elements[id]||(elements[id]={hidden:true,textContent:'',disabled:false,style:{},querySelectorAll:()=>[]});
const api=new Function('$','CafeFinance','CafeShifts','CafeService',`
let G,customers=[],jobs=[],cats=[],particles=[],furs=[],seats=[],ponta=null,mode='title',tick=0,speed=1,spawnTimer=100000,staffBusy=0,dayLog,weather,dayFlags,rushUntil,vipNext,bgmOn,firstGuide=null,toastTimer=0,lastResultHtml='';
let moneySounds=0,reviewsSent=0,reports=0,hudCalls=0,ordersTaken=0,lastToast='',memory={},paint=[],cafeAction;
const tone=()=>{},openFinance=()=>{},openShifts=()=>{};
const onCafeTap=fn=>cafeAction=fn,initAudio=()=>{},wakePonta=()=>{},petCat=()=>{};
const PONTA_HOME={x:92,y:108},OPEN=600,CLOSE=1140,RENT=1000,STAFF={wage:2000},SAVE_KEY='grio-cafe-v1',ENTRANCE={x:112,y:312},STRAYS=[],TALKS={},FW=448,FH=600,VW=224,VH=300;
const MENU=[{id:'coffee',name:'コーヒー',price:400,time:150,need:{beans:1},st:'drink'},{id:'cookie',name:'ねこクッキー',price:300,time:260,need:{flour:1},st:'oven'}];
${constants}
const kcv={scrollIntoView(){}},localStorage={setItem:(k,v)=>memory[k]=v,getItem:k=>memory[k]};
const rnd=(a,b)=>(a+b)/2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[0],decor=()=>0,avgMood=()=>70,rollMarket=()=>({});
const toast=t=>lastToast=t,chat=(c,list)=>c.say={text:Array.isArray(list)?list[0]:list,t:0},event=k=>G.flags[k]=true,addFx=(type,x,y,extra={})=>particles.push({type,x,y,t:0,life:50,vy:-.4,...extra});
const catNear=()=>false,canMake=()=>true,chooseOrder=()=>MENU[0],serve=c=>{ordersTaken++;c.state='wait';},leaveAngry=()=>{throw Error('unexpected angry departure');},beginFirstGuide=()=>firstGuide=null;
const updateFirstGuide=()=>{throw Error('unexpected tutorial update');},updateHud=()=>{hudCalls++;refreshRegister();},snsFromCustomer=()=>reviewsSent++;
const updateJobs=()=>{},updatePonta=()=>{},updateKitchenFx=()=>{},updateCat=()=>{},snsTick=()=>{},checkEvents=()=>{},spawnCustomer=()=>{},endShift=()=>{};
const expireStock=()=>[],stars=()=>1,grioDailyPost=()=>({text:'閉店',img:''}),reviewText=()=>'声',say=()=>{};
const sfx={coin:()=>moneySounds++,bell(){}},clearTimeout=()=>{},openModal=()=>{reports++;$('modal').hidden=false;},openShop=()=>{},openStock=()=>{},closeModal=()=>{};
const cv={width:448,height:300,getBoundingClientRect:()=>({left:10,top:20,width:454,height:306})};
const ctx={drawImage(){},setTransform(){},save(){},restore(){},translate(){},scale(){},fillRect(...a){paint.push(a);},fillText(){},measureText:t=>({width:String(t).length*7})};
const P=(color,x,y,w=1,h=1)=>{assertFinite(x,y,w,h);paint.push([x,y,w,h]);},ellipse=(...a)=>assertFinite(...a.slice(0,4));
function assertFinite(...a){if(!a.every(Number.isFinite))throw Error('invalid drawing coordinates: '+a);}
const drawAt=(im,x,y)=>{if(!im)throw Error('missing image');assertFinite(x,y);},floorShadow=()=>{},drawCrown=()=>{};
const GuestArt={person:()=>({logicalWidth:58,logicalHeight:84,width:96,height:144}),walk:()=>({logicalWidth:64,logicalHeight:84,width:128,height:168})},RearWalk={guest:()=>({logicalWidth:64,logicalHeight:84,width:128,height:168})};
const customerPose=()=> 'sit',sayBoxes=[],FACES={grio:{happy:{}}},ICON2={coffee:{}},PLATE2={};
const isPaused=()=>!$('modal').hidden,drawRoom=()=>{},drawSunbeam=()=>{},drawPawTrail=()=>{},drawSign=()=>{},drawUmbrella=()=>{},drawBox=()=>{},drawCushion=()=>{},drawPlant=()=>{},drawTower=()=>{},drawBowl=()=>{},drawChair=()=>{},drawTable=()=>{},drawTableItems=()=>{},drawStool=()=>{},drawPonta=()=>{},drawCat=()=>{},drawLighting=()=>{},drawBubble=()=>{},drawParticles=()=>{},drawFirstGuideTarget=()=>{};
const SIGN={y:290},UMBRELLA={y:292},BOX={y:238},BOWL={y:112},TOWER={base:116},CUSHION_POS=[],PLANT_POS=[],FUR2={};
const compactAt=(y,fn)=>{assertFinite(y);fn();};
${controller}
${functions.map(source).join('\n')}
${tapHandler}
return {
 reset({tables=2,stools=0,staff=false}={}){G=newSave();G.furniture.table=tables;G.furniture.stool=stools;G.staff=staff;buildSeats();startDay();spawnTimer=100000;moneySounds=reviewsSent=reports=hudCalls=0;lastToast='';memory={};paint=[];$('modal').hidden=true;},
 diners(count=1,props={}){for(let i=0;i<count;i++){const seat=seats.find(s=>!s.cust);if(!seat)throw Error('no seat');
  const c={seat,x:seat.x,y:seat.y,state:'eat',t:420,anim:0,order:MENU[0],patAtServe:760,maxPat:760,pat:760,visits:0,quality:'normal',look:{},spr:{a:{width:96,height:144,logicalHeight:84},sit:{width:96,height:132,logicalHeight:72},back:{width:96,height:108,logicalHeight:60}},...props};
  seat.cust=c;customers.push(c);}return customers.slice(-count);},
 step(n=1){for(let i=0;i<n;i++)update();},
 receive(c){return pay(c||checkoutLine()[0]);},tap(){return tapRegister();},
 line(){return checkoutLine();},waiting(){return checkoutWaiting();},
 front(limit=1000){for(let i=0;i<limit;i++){if(checkoutLine()[0]?.state==='checkout')return checkoutLine()[0];update();}throw Error('front never reaches register');},
 close(){G.time=CLOSE;mode='closing';},cleanSeats(){seats.forEach(s=>{if(s.dirty)s.dirty=false;});},
 canvasTap(x,y){return cafeAction({preventDefault(){},clientX:13+x*2,clientY:23+y*2});},
 edgeOrder(){const seat=seats.find(s=>s.ti===5&&s.side===1);const c={seat,state:'order',order:MENU[0],pat:760,maxPat:760,t:31};seat.cust=c;customers.push(c);return c;},
 snapshot(){return{G,customers,seats,dayLog,mode,moneySounds,ordersTaken,reviewsSent,reports,hudCalls,registerFlash,checkoutSeq,staffBusy,lastToast};},
 saved(){return loadSave();},reload(){G=loadSave();startDay();spawnTimer=100000;},
 render(){paint=[];render();return paint;},
 hit(x,y){return registerHit(x,y);},point(e){return canvasPoint(e);},
 staffBusy(n){staffBusy=n;},pause(v){$('modal').hidden=!v;},guide(v){firstGuide=v?{}:null;},
 position(c){return checkoutPosition(c);},bill(c){return makeBill(c);}
};
`)($,CafeFinance,CafeShifts,CafeService);
api.reset();
const [one]=api.diners(),seat=one.seat;
assert.equal(api.receive(one),false,'cannot collect while seated');
api.step();let s=api.snapshot();
assert.equal(s.G.money,8000,'food completion does not credit sales');
assert.equal(s.dayLog.sales,0);assert.equal(s.dayLog.served,0);
assert.equal(one.state,'toRegister');assert.equal(one.seat,null,'released seat detached');
assert.equal(seat.cust,null);assert(seat.dirty,'plate remains for cleaning');
assert.equal(one.bill.total,400);assert.equal(api.tap(),false,'tap waits for arrival');
assert(elements.registerBar.hidden===false);assert(elements.btnRegister.disabled);
api.render();
api.front();assert.equal(one.state,'checkout');assert.equal(elements.btnRegister.disabled,false);
assert(elements.btnRegister.textContent.includes('¥400'));
assert(api.tap());s=api.snapshot();
assert.equal(s.G.money,8400);assert.equal(s.dayLog.sales,400);assert.equal(s.G.served,1);assert.equal(s.dayLog.served,1);
assert.equal(s.moneySounds,1);assert.equal(s.reviewsSent,1);assert.equal(s.dayLog.reviews.length,1);
assert.equal(one.state,'paying');assert.equal(api.receive(one),false);assert.equal(api.tap(),false);
assert.equal(api.snapshot().G.money,8400,'repeat tap never pays twice');
assert.equal(api.saved().money,8400,'income saved immediately');assert.equal(api.saved().served,1);
api.render();api.step(35);assert.equal(one.state,'paying');api.step();assert.equal(one.state,'leave');
api.render();api.step(300);assert.equal(api.snapshot().customers.length,0);
api.reload();assert.equal(api.snapshot().G.money,8400);assert.equal(api.snapshot().checkoutSeq,0);assert(elements.registerBar.hidden);
assert.equal(api.receive(one),false,'old paid object cannot be reused after reload');

api.reset();const crowd=api.diners(4);api.step();
assert.equal(api.line().length,3);assert.equal(api.waiting().length,1);
assert.equal(crowd[3].state,'checkoutSeat');assert(crowd[3].seat.cust===crowd[3]);
api.render();api.front();
assert.equal(api.receive(crowd[1]),false,'only the first customer can pay');
const reusedSeat=api.snapshot().seats.find(x=>x.dirty);api.cleanSeats();
const [newDiner]=api.diners();newDiner.t=0;
assert.equal(api.receive(crowd[0]),true);
assert.equal(reusedSeat.cust,newDiner,'paying does not clear a reused seat');assert.equal(reusedSeat.dirty,false);
api.step(37);assert.equal(api.line().length,3,'waiting seated customer joins after payment');
assert.equal(crowd[1].state,'toRegister','next customer advances');
api.render();

api.reset();const [automatic]=api.diners();api.step();api.front();
api.step(239);assert.equal(automatic.state,'checkout');assert.equal(api.snapshot().G.money,8000);
api.step();assert.equal(automatic.state,'paying');assert.equal(api.snapshot().G.money,8400,'automatic payment');
api.reset({staff:true});const [staffed]=api.diners();api.step();api.front();api.step(89);
assert.equal(staffed.state,'checkout');api.step();assert.equal(staffed.state,'paying');assert.equal(api.snapshot().staffBusy,36);
api.reset({staff:true});const [busy]=api.diners();api.step();api.front();api.staffBusy(1000);api.step(240);
assert.equal(busy.state,'paying','busy staff cannot block automatic payment');

api.reset();const [vip]=api.diners(1,{vip:true,quality:'perfect',visits:2});
api.step();const bill={...vip.bill},before=api.snapshot().G.pop;
assert(bill.vipBonus);assert(bill.tip>=500);assert.equal(api.snapshot().G.pop,before,'VIP bonus waits for payment');
vip.visits=0;vip.patAtServe=0;api.front();
assert.deepEqual(vip.bill,bill,'bill stays fixed during checkout wait');
assert(api.receive(vip));assert.equal(api.snapshot().G.money,8000+bill.total);
assert.equal(api.snapshot().dayLog.tips,bill.tip);assert.equal(api.snapshot().dayLog.perfect,1);

api.reset();api.diners();api.step();api.front();api.pause(true);
assert.equal(api.tap(),false,'modal blocks tap');api.pause(false);api.guide(true);
assert.equal(api.tap(),false,'intro blocks tap');api.guide(false);assert(api.tap());
assert(api.hit(204,140));assert(api.hit(204,145));assert(!api.hit(112,100));
const pt=api.point({clientX:13+204*2,clientY:23+140*2});
assert.equal(pt.x,204);assert.equal(pt.y,140);assert(api.hit(pt.x,pt.y),'visible register and tap coordinates match');

api.reset({tables:6});api.diners();api.step();api.front();const edge=api.edgeOrder();
api.canvasTap(188,120);assert.equal(edge.state,'wait','overlapping order keeps tap priority');assert.equal(api.snapshot().ordersTaken,1);assert.equal(api.snapshot().G.money,8000);
api.canvasTap(204,140);assert.equal(api.snapshot().G.money,8400,'visible register tap pays');

api.reset();const [card]=api.diners(1,{paymentMethod:'card'});api.step();api.front();
assert(elements.btnRegister.textContent.includes('カード会計'));assert(api.receive(card));
assert.equal(api.snapshot().G.money,8000,'card payment stays receivable');
assert.equal(api.snapshot().dayLog.sales,400);assert.equal(api.saved().finance.cards[0].gross,400);
assert.equal(api.saved().finance.cards[0].fee,12);assert.equal(api.receive(card),false,'card cannot post twice');api.render();

api.reset({tables:6,stools:3});api.diners(15);api.step();
assert.equal(api.line().length,3);assert.equal(api.waiting().length,12);
for(const c of api.line()){const p=api.position(c);assert.equal(p.y,286);assert(p.x>=0&&p.x<=224);}
api.render();api.close();api.step(8000);s=api.snapshot();
assert.equal(s.G.served,15);assert.equal(s.dayLog.served,15);assert.equal(s.dayLog.sales,6000);
assert.equal(s.G.money,12850,'all cash payments collected before rent and utilities');assert.equal(s.reports,1,'day closes only after queue and exit');
assert.equal(s.mode,'report');assert.equal(s.customers.length,0);
api.step(100);assert.equal(api.snapshot().reports,1);assert.equal(api.snapshot().dayLog.sales,6000);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
console.log('PASS register arrival, manual and auto payment, duplicate guard, tips/VIP, seat reuse, queue capacity, all15 diners, closing, save reload, UI and draw coordinates');
