/* Run: node tests/service-check.cjs. Executes real supply, set-order, cooking, payment and tableware logic. No dependencies. */
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
function data(name){const start=html.indexOf('const '+name+' =');return html.slice(start,html.indexOf('\n];',start)+3);}
const constants=['TABLE_POS','STOOL_POS','stockOf','capOf','usedOf','ingr','unitPrice','canMake','makeCount'].map(name=>html.match(new RegExp('^const '+name+' = [^\\n]+','m'))[0]).join('\n')+'\n'+data('MENU')+'\n'+data('INGR');
const functions=['expireStock','addStock','daysLeft','consume','chooseOrder','serve','deliver','leaveAngry','startCook','cookTap','updateJobs','openStock','buy','clearTable','washDishes','syncCatRoster','makeCat','spawnCats','beginPontaExit','updateShiftAttendance','makePonta','newSave','buildSeats','startDay','moveTo','updateCustomer','pay','earn','update','endDay','save','loadSave','drawCustomer','drawSay','drawRegister','render','canvasPoint','financeResultHtml','financeRows','financeDate','financeYen','financeEscape','showDayResult','nyaxPhotoHtml','drawNyaxPhotos'];
const tapHandler=html.slice(html.indexOf('onCafeTap(e => {'),html.indexOf('\n});',html.indexOf('onCafeTap(e => {'))+4);
const elements={},$=id=>elements[id]||(elements[id]={hidden:true,textContent:'',disabled:false,style:{},querySelectorAll(selector){
  if(selector!=='[data-add]')return [];
  this.stockButtons=[...this.innerHTML.matchAll(/data-add="([^"]+)"([^>]*)>/g)].map(m=>({dataset:{add:m[1]},disabled:m[2].includes('disabled')}));
  return this.stockButtons;
}});
const api=new Function('$','CafeFinance','CafeShifts','CafeService',`
let G,customers=[],jobs=[],cats=[],particles=[],furs=[],seats=[],ponta=null,mode='title',tick=0,speed=1,spawnTimer=100000,staffBusy=0,dayLog,weather,dayFlags,rushUntil,vipNext,bgmOn,firstGuide=null,toastTimer=0,lastResultHtml='';
let moneySounds=0,reviewsSent=0,reports=0,hudCalls=0,ordersTaken=0,lastToast='',memory={},paint=[],cafeAction;
const tone=()=>{},openFinance=()=>{},openShifts=()=>{};
const onCafeTap=fn=>cafeAction=fn,initAudio=()=>{},wakePonta=()=>{},petCat=()=>{};
const PONTA_HOME={x:92,y:108},OPEN=600,CLOSE=1140,RENT=1000,STAFF={wage:2000},SAVE_KEY='grio-cafe-v1',ENTRANCE={x:112,y:312},STRAYS=[],TALKS={},FW=448,FH=600,VW=224,VH=300;
${constants}
const kcv={scrollIntoView(){}},localStorage={setItem:(k,v)=>memory[k]=v,getItem:k=>memory[k]};
const rnd=(a,b)=>(a+b)/2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[0],decor=()=>0,avgMood=()=>70,rollMarket=()=>Object.fromEntries(INGR.map(it=>[it.id,1]));
const toast=t=>lastToast=t,chat=(c,list)=>c.say={text:Array.isArray(list)?list[0]:list,t:0},event=k=>G.flags[k]=true,addFx=(type,x,y,extra={})=>particles.push({type,x,y,t:0,life:50,vy:-.4,...extra});
const catNear=()=>false,beginFirstGuide=()=>firstGuide=null;
const updateFirstGuide=()=>{throw Error('unexpected tutorial update');},updateHud=()=>{hudCalls++;},snsFromCustomer=()=>reviewsSent++;
const updatePonta=()=>{},updateKitchenFx=()=>{},updateCat=()=>{},snsTick=()=>{},checkEvents=()=>{},spawnCustomer=()=>{},endShift=()=>{};
const stars=()=>1,grioDailyPost=()=>({text:'閉店',img:''}),reviewText=()=>'声',say=()=>{};
const sfx={coin:()=>moneySounds++,bell(){},serve(){},angry(){},buy(){},meow(){},clean(){}},clearTimeout=()=>{},openModal=h=>{reports++;$('modal').hidden=false;$('panel').innerHTML=h;},openShop=()=>{},closeModal=()=>{};
const cv={width:448,height:300,getBoundingClientRect:()=>({left:10,top:20,width:454,height:306})};
const ctx={drawImage(){},setTransform(){},save(){},restore(){},translate(){},scale(){},fillRect(...a){paint.push(a);},fillText(){},measureText:t=>({width:String(t).length*7})};
const P=(color,x,y,w=1,h=1)=>{assertFinite(x,y,w,h);paint.push([x,y,w,h]);},ellipse=(...a)=>assertFinite(...a.slice(0,4));
function assertFinite(...a){if(!a.every(Number.isFinite))throw Error('invalid drawing coordinates: '+a);}
const drawAt=(im,x,y)=>{if(!im)throw Error('missing image');assertFinite(x,y);},floorShadow=()=>{},drawCrown=()=>{};
const CounterArt={person:()=>null},SpriteRaster={draw:(g,img,x,y)=>drawAt(img,x,y)},drawDiningCounter=()=>{};
const GuestArt={person:()=>({logicalWidth:58,logicalHeight:84,width:96,height:144}),walk:()=>({logicalWidth:64,logicalHeight:84,width:128,height:168})},RearWalk={guest:()=>({logicalWidth:64,logicalHeight:84,width:128,height:168})};
const customerPose=()=> 'sit',sayBoxes=[],FACES={grio:{happy:{}}},ICON2={coffee:{}},PLATE2={};
const isPaused=()=>!$('modal').hidden,drawRoom=()=>{},drawSunbeam=()=>{},drawPawTrail=()=>{},drawSign=()=>{},drawUmbrella=()=>{},drawBox=()=>{},drawCushion=()=>{},drawPlant=()=>{},drawTower=()=>{},drawBowl=()=>{},drawChair=()=>{},drawTable=()=>{},drawTableItems=()=>{},drawStool=()=>{},drawPonta=()=>{},drawCat=()=>{},drawLighting=()=>{},drawBubble=()=>{},drawParticles=()=>{},drawFirstGuideTarget=()=>{};
const SIGN={y:290},UMBRELLA={y:292},BOX={y:238},BOWL={y:112},TOWER={base:116},CUSHION_POS=[],PLANT_POS=[],FUR2={};
const compactAt=(y,fn)=>{assertFinite(y);fn();};

const ZONE=[.68,.86],COLD_AFTER=420,INGR_IMG={},kfx=[];
let jobSeq=0;
const updateStockInfo=()=>{},refreshFirstGuide=()=>{},finishFirstGuide=()=>{};
const kitchenUnits=()=>['drink','oven','stove'].map((st,i)=>({st,i:0,x:30+i*120,y:40,w:60,h:72}));
const queued=st=>jobs.filter(j=>j.state==='queue'&&j.st===st);
const unitJob=u=>jobs.find(j=>j.state==='cook'&&j.st===u.st&&j.unit===u.i);

${controller}
${functions.map(source).join('\n')}
${tapHandler}
return {
 item(id){return MENU.find(m=>m.id===id);},
 accept(c){return serve(c,false);},
 brew(st){return startCook(kitchenUnits().find(u=>u.st===st),false);},
 dishes(){return CafeService.init(G);},
 deliver(j){return deliver(j,false);},
 wash(){return washDishes();},
 clear(s){clearTable(s);},
 expire(day){return expireStock(day);},
 stock(id,n,daily=false){return addStock(id,n,daily);},
 stockPanel(fromReport=false){openStock(fromReport);return $('panel').innerHTML;},
 stockClick(id,n,fromReport=false){openStock(fromReport);const button=$('panel').stockButtons.find(b=>b.dataset.add===id+':'+n);if(!button||button.disabled)return false;button.onclick();return true;},
 choose(){return chooseOrder();},
 setDay(day){G.day=day;startDay();spawnTimer=100000;},
 purchase(type){buy('buy-w-'+type);},
 checkpoint(){save();},
 cancel(c){leaveAngry(c);},
 reset({tables=2,stools=0,staff=false}={}){G=newSave();G.flags.firstCustomerDone=true;G.stock.egg=[{n:3,day:1}];G.stock.berry=[{n:3,day:1}];G.stock.cream=[{n:3,day:1}];G.menu.push('cake');G.furniture.table=tables;G.furniture.stool=stools;G.staff=staff;buildSeats();startDay();spawnTimer=100000;moneySounds=reviewsSent=reports=hudCalls=0;lastToast='';memory={};paint=[];$('modal').hidden=true;},
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
 snapshot(){return{G,customers,jobs,ponta,seats,dayLog,mode,moneySounds,ordersTaken,reviewsSent,reports,hudCalls,registerFlash,checkoutSeq,staffBusy,lastToast};},
 saved(){return loadSave();},reload(){G=loadSave();startDay();spawnTimer=100000;},
 render(){paint=[];render();return paint;},
 hit(x,y){return registerHit(x,y);},point(e){return canvasPoint(e);},
 staffBusy(n){staffBusy=n;},pause(v){$('modal').hidden=!v;},guide(v){firstGuide=v?{}:null;},
 position(c){return checkoutPosition(c);},bill(c){return makeBill(c);}
};
`)($,CafeFinance,CafeShifts,CafeService);

const F=CafeFinance,S=CafeService,copy=g=>JSON.parse(JSON.stringify(g));
const invariant=g=>{const w=S.init(g);for(const k of S.keys)assert.equal(w.clean[k]+w.used[k]+w.dirty[k]+(w.wash?.items[k]||0),w.total[k],k+' count conserved');};
for(let day=1;day<=30;day++){assert.equal(S.supplyDay(day),(day-1)%3===0);assert(S.nextSupply(day)>=day);assert(S.supplyDay(S.nextSupply(day)));}
let g={day:1,money:10000,pendingCost:0};F.beginDay(g);F.spend(g,'materials',1200,'材料');
assert.equal(g.money,10000);assert.equal(F.view(g).payable,1200);assert.equal(F.today(g).cashExpenses,0);
F.closeDay(g);for(let day=2;day<=9;day++){g.day=day;F.beginDay(g);F.sale(g,5000,'cash');F.closeDay(g);}
g.day=10;F.beginDay(g);const before=g.money;assert.equal(F.view(g).payable,1200,'supplier waits for end of month closing');
F.spend(g,'materials',300,'月末分');const monthEnd=F.closeDay(g);
assert.equal(monthEnd.day.payablePayments,1500);assert.equal(g.money,before-1150-1500);
assert.equal(monthEnd.month.expenses.materials,1500,'payment not booked as a second expense');
assert.equal(F.view(g).payable,0);assert(g.finance.payables.every(b=>b.paid));
g=copy(g);const after=g.money;F.closeDay(g);F.beginDay(g);assert.equal(g.money,after,'month-end payment not repeated after reload');
g={day:7,money:10000,pendingCost:0};F.beginDay(g);F.spend(g,'materials',500,'未払い');g.day=12;F.beginDay(g);
assert.equal(g.money,9500,'overdue payable recovers once');F.beginDay(g);assert.equal(g.money,9500);
g={day:1,money:2000};const coffee={id:'coffee',need:{beans:1},price:400},cake={id:'cake',need:{flour:1},price:800},set=S.bundle(coffee,cake);
assert.deepEqual(set.need,{beans:1,flour:1});assert.equal(set.price,1200);assert.deepEqual(S.needs(set),{cup:1,plate:1,fork:1});
const reservations=[];for(let i=0;i<6;i++)reservations.push(S.reserve(g,coffee));assert.equal(S.reserve(g,coffee),null);invariant(g);
for(const n of reservations)S.soil(g,n);invariant(g);assert(S.startWash(g));assert(!S.startWash(g),'one wash batch at a time');
for(let i=0;i<179;i++)assert.equal(S.tickWash(g),false);assert.equal(S.init(g).clean.cup,0);
g=copy(g);assert(S.tickWash(g),'washing progress survives save');assert.equal(S.init(g).clean.cup,3);invariant(g);
S.startWash(g);for(let i=0;i<180;i++)S.tickWash(g);assert.equal(S.init(g).clean.cup,6);invariant(g);
assert(S.expand(g,'cup',2));assert.equal(g.money,1400);assert.equal(S.init(g).clean.cup,8);assert.equal(S.init(g).total.cup,8);invariant(g);
assert(!S.expand(g,'unknown'));assert(!S.expand(g,'plate',20),'tableware purchase requires available money');

api.reset();let c=api.diners(1,{state:'order',t:31,order:S.bundle(api.item('coffee'),api.item('cake')),paymentMethod:'cash'})[0],seat=c.seat;
const stockBefore=copy(api.snapshot().G.stock);assert(api.accept(c));assert.equal(api.snapshot().jobs.length,2);
assert.equal(api.snapshot().G.stock.beans[0].n,stockBefore.beans[0].n-1);assert.equal(api.snapshot().G.stock.flour[0].n,stockBefore.flour[0].n-1);
assert.deepEqual(api.dishes().used,{cup:1,plate:1,fork:1});invariant(api.snapshot().G);
assert(api.brew('drink'));assert(api.brew('oven'));api.step(360);
const [drink,baked]=api.snapshot().jobs;assert.equal(drink.state,'ready');assert.equal(baked.state,'ready');
assert(api.deliver(drink));assert.equal(c.state,'wait','wait for both set items');assert.equal(c.receivedItems.length,1);
assert.equal(api.deliver(drink),false,'same set component cannot deliver twice');
assert(api.deliver(baked));assert.equal(c.state,'eat');assert.equal(c.receivedItems.length,2);assert.equal(c.quality,'normal');
c.t=420;api.step();const bill={...c.bill};assert.equal(bill.total,1200+bill.tip);assert.equal(api.snapshot().G.money,8000,'sales wait for register');
api.front();assert(api.receive(c));assert.equal(api.snapshot().G.money,8000+bill.total);assert.equal(api.receive(c),false);
assert.equal(seat.tableware.cup,1);assert.equal(api.dishes().dirty.cup,0,'used ware stays on table until clearing');
api.clear(seat);api.clear(seat);assert.deepEqual(api.dishes().dirty,{cup:1,plate:1,fork:1});assert.deepEqual(api.dishes().used,{cup:0,plate:0,fork:0});invariant(api.snapshot().G);
api.wash();api.step(179);assert.equal(api.dishes().clean.cup,5);api.step();assert.deepEqual(api.dishes().clean,{cup:6,plate:6,fork:6});invariant(api.snapshot().G);
api.checkpoint();api.reload();assert.deepEqual(api.dishes().clean,{cup:6,plate:6,fork:6},'clean inventory remains after reload');

api.reset();const cupReservations=[];for(let i=0;i<6;i++)cupReservations.push(S.reserve(api.snapshot().G,api.item('coffee')));
cupReservations.forEach(n=>S.soil(api.snapshot().G,n));
c=api.diners(1,{state:'order',t:31,paymentMethod:'cash'})[0];
const beans=api.snapshot().G.stock.beans[0].n;assert.equal(api.accept(c),false,'unclean cups block actual order acceptance');
assert.equal(api.snapshot().jobs.length,0);assert.equal(api.snapshot().G.stock.beans[0].n,beans,'no ingredients consumed without tableware');
api.wash();api.step(180);assert(api.accept(c),'washed cups allow service again');
api.checkpoint();api.reload();assert.equal(api.dishes().used.cup,0);assert(api.dishes().dirty.cup>=1,'interrupted service returns used ware to dirty, not free clean cups');invariant(api.snapshot().G);

api.reset();c=api.diners(1,{state:'order',t:31,order:S.bundle(api.item('coffee'),api.item('cake'))})[0];
assert(api.accept(c));api.cancel(c);assert.equal(api.snapshot().jobs.length,0,'cancelled set removes both jobs');
assert.equal(api.dishes().dirty.cup,1);assert.equal(api.dishes().dirty.plate,1);assert.equal(api.dishes().dirty.fork,1);invariant(api.snapshot().G);

api.reset({staff:true});const n=S.reserve(api.snapshot().G,S.bundle(api.item('coffee'),api.item('cake')));S.soil(api.snapshot().G,n);
api.step();assert(api.dishes().wash,'human helper starts washing automatically');api.step(179);
assert.deepEqual(api.dishes().clean,{cup:6,plate:6,fork:6});invariant(api.snapshot().G);

api.reset();api.snapshot().G.money=0;assert.equal(api.stock('beans',5),5,'supplies can be received on credit without cash');
assert.equal(api.snapshot().G.money,0);assert.equal(F.view(api.snapshot().G).payable,400);
api.setDay(2);assert.equal(api.stock('beans',5),0,'regular report purchases stay on three-day schedule');
assert(api.stockPanel(true).includes('data-add="beans:5" disabled'),'off-day report buttons disabled');assert(!api.stockClick('beans',5,true));
assert(!api.stockPanel().includes('data-add="beans:5" disabled'),'manual button permits every day');
assert(api.stockClick('beans',5),'real manual add-button handler buys on day2');assert.equal(F.view(api.snapshot().G).payable,800);
api.setDay(3);assert(api.stockClick('beans',5),'manual purchases also allowed on day3');assert.equal(F.view(api.snapshot().G).payable,1200);
api.setDay(4);assert(api.stockClick('beans',5,true),'regular report purchases allowed on day4');assert.equal(F.view(api.snapshot().G).payable,1600);
api.checkpoint();api.reload();assert.equal(F.view(api.snapshot().G).payable,1600,'supplier debt persists');assert.equal(api.snapshot().G.money,0);
api.snapshot().G.money=1000;const cups=api.dishes().total.cup;api.purchase('cup');assert.equal(api.dishes().total.cup,cups+2);assert.equal(api.snapshot().G.money,400);invariant(api.snapshot().G);
api.reset();assert.equal(api.expire(1).length,0);assert.equal(api.expire(2).length,0,'three-day ingredients last until next supply');
const spoiled=api.expire(3).map(row=>row[0]);assert(spoiled.includes('いちご')&&spoiled.includes('生クリーム'),'unused perishables expire after third trading day');
assert.equal(api.snapshot().G.stock.berry.length,0);assert.equal(api.snapshot().G.stock.cream.length,0);
// Real menu selection excludes missing ingredients, including shared ingredients across set components.
api.reset();let shop=api.snapshot().G;shop.menu=['coffee','cookie'];shop.stock.beans=[];
for(let i=0;i<80;i++)assert.equal(api.choose().id,'cookie','sold-out coffee never ordered');
shop.menu=['tea','parfait'];shop.stock={leaf:[{n:1,day:1}],milk:[{n:1,day:1}],berry:[{n:1,day:1}],cream:[{n:1,day:1}]};
for(let i=0;i<80;i++){const order=api.choose();assert(!order.items,'set needing two milks excluded when only one remains');}
const oldRandom=Math.random;
try{Math.random=()=>0;shop.stock.milk[0].n=2;assert.equal(api.choose().need.milk,2,'set allowed when aggregate recipe is in stock');}finally{Math.random=oldRandom;}
shop.stock={};assert.equal(api.choose(),null,'empty menu has no order');
c=api.diners(1,{state:'sit',t:70})[0];api.step();assert.equal(c.state,'menuWait');assert.equal(c.order,null);assert.equal(api.snapshot().jobs.length,0);api.render();
assert(api.stockClick('leaf',5),'manual restock from empty menu');assert(api.stockClick('milk',5));api.pause(false);api.step();
assert.equal(c.state,'order');assert.equal(c.order.id,'tea','customer can order again after restocking');assert(api.accept(c));

api.reset();shop=api.snapshot().G;shop.menu=['coffee','cookie'];shop.stock.beans=[{n:1,day:1}];
const pending=api.diners(2,{state:'order',t:31});assert(api.accept(pending[0]));
api.step();assert.equal(pending[1].order.id,'cookie','pending sold-out request switches to an in-stock item');
assert.equal(pending[1].state,'order');assert.equal(api.snapshot().jobs.length,1,'reselection does not accept/consume automatically');
assert.equal(api.snapshot().jobs[0].item.id,'coffee','accepted order keeps its reserved recipe');

api.reset();shop=api.snapshot().G;shop.menu=['coffee','cookie'];shop.stock.beans=[];
c=api.diners(1,{state:'order',t:31})[0];const flourBefore=shop.stock.flour[0].n;
assert.equal(api.accept(c),false,'last-moment sold-out order is not accepted');assert.equal(c.order.id,'cookie');
assert.equal(api.snapshot().jobs.length,0);assert.equal(shop.stock.flour[0].n,flourBefore,'reselection consumes nothing');assert(api.accept(c));assert.equal(shop.stock.flour[0].n,flourBefore-1);

api.reset();shop=api.snapshot().G;shop.stock={};c=api.diners(1,{state:'sit',t:70})[0];
api.step();assert.equal(c.state,'menuWait');api.step(180);assert.equal(c.state,'leave','all-sold-out guest politely leaves without an order');
assert.equal(api.snapshot().dayLog.angry,0);assert.equal(api.snapshot().dayLog.sales,0);assert.equal(shop.pop,10);
api.reset();shop=api.snapshot().G;shop.stock={};c=api.diners(1,{state:'sit',t:70})[0];api.step();api.close();api.step(1000);
assert.equal(api.snapshot().mode,'report','sold-out guests do not block closing');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
console.log('PASS three-day report and daily manual supply UI/handlers, sold-out recipes and aggregate sets, pending reselection/empty menu/restock/closing, credit purchases, month-end and overdue payables, no double expense/payment, multi-item cooking/delivery and one bill, tableware conservation, wash and shortage, cancelled/reloaded orders, automatic helper and extra dishes');
