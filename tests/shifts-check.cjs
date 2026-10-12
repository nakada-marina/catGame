/* Run: node tests/shifts-check.cjs. No dependencies.
 * Executes the real shift module and game attendance, shop, planner, save and closing code. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),window={};
new Function('window',fs.readFileSync(path.join(__dirname,'..','finance.js'),'utf8'))(window);
new Function('window',fs.readFileSync(path.join(__dirname,'..','cat-shifts.js'),'utf8'))(window);
const {CafeFinance,CafeShifts}=window;
const roster=()=>({day:1,time:600,cats:['grio','mike','kuro','shiro','chacha'].map(pal=>({pal,name:pal,mood:60,hunger:30}))});
const g=roster();CafeShifts.ensure(g,()=>.5);
assert.deepEqual(CafeShifts.workers(g).map(k=>k.pal),['ponta','mike','kuro','shiro','chacha'],'manager and spot workers excluded');
for(const day of [1,3,5,7,9,11])assert.equal(CafeShifts.working(g,'ponta',600,day),false);
for(const day of [2,4,6,8,10,12,20]){assert(CafeShifts.working(g,'ponta',600,day));assert(!CafeShifts.working(g,'ponta',1140,day));}
assert(CafeShifts.working(g,'grio'));
const initial=JSON.stringify(g.shifts);CafeShifts.ensure(g,()=>0);assert.equal(JSON.stringify(g.shifts),initial,'wishes are generated once');
assert(!CafeShifts.edit(g,'ponta',2,600,1140).ok,'no day1 Ponta override');
g.day=2;assert(CafeShifts.edit(g,'ponta',3,720,960).ok);
assert.equal(CafeShifts.entry(g,'ponta',3).wishStart,null,'owner edit preserves original wish');
assert(!CafeShifts.working(g,'ponta',719,3));assert(CafeShifts.working(g,'ponta',720,3));assert(!CafeShifts.working(g,'ponta',960,3));
assert(CafeShifts.reset(g,'ponta',3).ok);assert.equal(CafeShifts.entry(g,'ponta',3).start,null);
for(const args of [['grio',2,600,1140],['sabi',2,600,1140],['ponta',1,600,1140],['mike',2,660,600],['mike',2,599,660],['mike',2,600,1200],['mike',2,610,720],['mike',21,600,720]])assert(!CafeShifts.edit(g,...args).ok,JSON.stringify(args));
assert(CafeShifts.edit(g,'mike',11,780,1080).ok);
const nextMonth=JSON.stringify(g.shifts.days[11]);g.day=11;CafeShifts.ensure(g,()=>0);
assert.equal(JSON.stringify(g.shifts.days[11]),nextMonth,'next month plan survives month rollover');assert.equal(Object.keys(g.shifts.days).length,30);
g.day=31;CafeShifts.ensure(g,()=>.5);assert(!g.shifts.days[11]);assert(g.shifts.days[21]);assert(g.shifts.days[50]);
const off=roster();CafeShifts.ensure(off,()=>0);assert.equal(CafeShifts.entry(off,'kuro').start,null,'rest wish');
CafeShifts.welcome(off,'mike',785);assert.equal(CafeShifts.entry(off,'mike').start,780);assert.equal(CafeShifts.entry(off,'mike').end,1140);

function source(name) {
  const start=html.indexOf('function '+name+'('),lineEnd=html.indexOf('\n',start);
  const end=html.slice(start,lineEnd).trim().endsWith('}')?lineEnd:html.indexOf('\n}',start)+2;
  assert(start>=0&&end>start,'function exists: '+name);return html.slice(start,end);
}
const constants=['STAFF','TABLE_POS','STOOL_POS'].map(name=>html.match(new RegExp('const '+name+' = [^\\n]+'))[0]).join('\n')
  +'\n'+html.slice(html.indexOf('const ADOPT ='),html.indexOf('\n];',html.indexOf('const ADOPT ='))+3);
const functions=['newSave','syncCatRoster','makeCat','spawnCats','makePonta','beginPontaExit','updateShiftAttendance','endShift','dropOrder','updateCat','updatePonta','moveTo','buildSeats','startDay','endDay','showDayResult','save','loadSave','event','buy','openShop','row','openCats','shiftHours','openShifts','financeResultHtml','financeRows','financeDate','financeYen','financeEscape'];
const elements={},$=id=>elements[id]||(elements[id]={value:'',hidden:true,textContent:'',disabled:false,style:{}});

const api=new Function('$','CafeFinance','CafeShifts',String.raw`
${constants}

let G,customers=[],jobs=[],cats=[],particles=[],furs=[],seats=[],ponta=null,mode='title',tick=0,speed=1,spawnTimer=100000,staffBusy=0,dayLog,weather,dayFlags,rushUntil,vipNext,bgmOn,firstGuide=null,toastTimer=0,lastResultHtml='',checkoutSeq=0,registerFlash=0;
let memory={},dialogues=[],lastToast='',reportCount=0;
const OPEN=600,CLOSE=1140,RENT=1000,SAVE_KEY='grio-cafe-v1',ENTRANCE={x:112,y:312},PONTA_HOME={x:92,y:108},PICKUP_X={drink:162,oven:194,stove:213},TOWER={x:12,base:116};
const STRAYS=[{id:'sabi'},{id:'hachi'},{id:'gure'}],FURNITURE=[],STATIONS={},MENU=[],FACES={grio:{happy:{}}},TALKS={day2:['day2'],pontaJoin:['pontaJoin']};
const rollMarket=()=>({}),rnd=(a,b)=>(a+b)/2,pick=a=>a[0],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const localStorage={setItem:(k,v)=>memory[k]=v,getItem:k=>memory[k]};
const toast=t=>lastToast=t,say=lines=>dialogues.push(lines),tone=()=>{},addFx=()=>{},updateHud=()=>{},beginFirstGuide=()=>{};
const catWork=()=>false,catThink=k=>k.t=200,assignClean=()=>false,chat=()=>{},updateFoodLabel=()=>{};
const deliver=j=>{jobs=jobs.filter(x=>x!==j);},serve=()=>true;
const sfx={buy(){},meow(){},bell(){},clean(){}},setTimeout=()=>{},clearTimeout=()=>{};
const expireStock=()=>[],stars=()=>1,decor=()=>0,grioDailyPost=()=>({text:'閉店',img:''}),reviewText=()=>'声',drawCatThumb=()=>{};
const openFinance=()=>{},openStock=()=>{},closeModal=()=>$('modal').hidden=true;
function openModal(markup) {
  $('panel').innerHTML=markup;$('modal').hidden=false;
  for(const m of markup.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const opts=[...m[2].matchAll(/<option value="([^"]+)"([^>]*)>/g)];
    $(m[1]).value=(opts.find(o=>o[2].includes('selected'))||opts[0])?.[1]||'';
  }
  $('panel').querySelectorAll=selector=>{
    const attr=selector.slice(1,-1),list=[];
    if(!attr.startsWith('data-'))return [];
    for(const m of markup.matchAll(new RegExp(attr+'="([^"]+)"','g'))){
      const key=attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      list.push({dataset:{[key]:m[1]},onclick:null,getContext:()=>({drawImage(){}})});
    }
    return list;
  };
  const query=$('panel').querySelectorAll,cache={};
  $('panel').querySelectorAll=selector=>cache[selector]||(cache[selector]=query(selector));
  if(markup===lastResultHtml)reportCount++;
}

${functions.map(source).join('\n')}

return {
 reset(day=1,{money=8000,owned=[],staff=false,legacyPonta=false}={}) {
   cats=[];ponta=null;G=newSave();G.day=day;G.money=money;G.staff=staff;G.ponta=legacyPonta;G.flags.firstCustomerDone=true;
   G.cats.push(...owned.map(pal=>({pal,name:pal,mood:61,hunger:32})));
   CafeShifts.ensure(G,()=>.5);buildSeats();dialogues=[];memory={};reportCount=0;startDay();
 },
 state(){return {G,cats,ponta,jobs,dayLog,dialogues,lastToast,mode,reportCount,html:$('panel').innerHTML};},
 plan(pal,day,start,end){const out=CafeShifts.edit(G,pal,day,start,end);if(out.ok)updateShiftAttendance();return out;},
 time(t){G.time=t;updateShiftAttendance();},
 step(n=1){for(let i=0;i<n;i++){updatePonta();cats.forEach(updateCat);if(cats.some(k=>k.gone&&!k.temp))syncCatRoster();cats=cats.filter(k=>!k.gone);}},
 reserve(pal,kind) {
   const k=pal==='ponta'?ponta:cats.find(k=>k.pal===pal),job={state:'ready',taker:k},seat={dirty:true,cleaner:k},c={state:'order',orderTaker:k};
   jobs.push(job);if(pal==='ponta'){k.job=k.carry=job;k.state='toTable';}
   else {k.dish=job;k.carryDish=true;k.clean=seat;k.orderC=c;k.state='toServe';}
   return {k,job,seat,c};
 },
 save(){save();return loadSave();},reload(){syncCatRoster();save();G=loadSave();cats=[];ponta=null;startDay();},
 next(){endDay();startDay();},end(){endDay();},start(){startDay();},buy(id){buy(id);},
 modal(report=false,month=null,day=G.day){openShifts(report,month,day);},
 cards(){return $('panel').querySelectorAll('[data-shift-card]').map(k=>k.dataset.shiftCard);},
 click(selector,pal){const button=$('panel').querySelectorAll(selector).find(b=>Object.values(b.dataset).includes(pal));if(!button)throw Error('missing '+selector+' '+pal);button.onclick();},
 field(id,value){$(id).value=String(value);},close(){$('mClose').onclick();},
 showCats(){openCats();},showShop(){openShop('family');},
 temp(){const k=makeCat({name:'サビ',pal:'sabi',temp:true,until:720,skill:'serve',mood:75,hunger:0},90,250);cats.push(k);return k;}
};
`)($,CafeFinance,CafeShifts);

api.reset(1,{legacyPonta:true});assert.equal(api.state().ponta,null,'legacy flag cannot add day1 Ponta');assert.equal(api.state().G.money,8000);
api.next();assert(api.state().ponta,'Ponta joins day2 at star1');assert.equal(api.state().G.money,6850,'only rent and utilities paid');
assert.equal(api.state().G.ponta,true);assert.equal(api.state().G.finance.active.expenses.catWelcome||0,0);
assert.equal(api.state().ponta.state,'arrive');api.step();assert.equal(api.state().ponta.walkFacing,'back','arrival walks into cafe facing back');api.step(400);assert.equal(api.state().ponta.state,'idle');
api.next();assert.equal(api.state().ponta,null,'day3 rest');api.next();assert(api.state().ponta,'day4 returns');
api.reset(2,{money:0});assert(api.state().ponta,'free helper even without cash');
const pjob=api.reserve('ponta');assert(api.plan('ponta',2,null,null).ok);assert.equal(pjob.job.taker,null,'Ponta releases dish at shift end');
assert.equal(pjob.k.state,'leaving');api.step();assert.equal(pjob.k.walkFacing,'front','exit walks toward front');api.step(400);assert.equal(api.state().ponta,null);
assert(api.plan('ponta',2,600,1140).ok);assert(api.state().ponta);api.time(1140);assert.equal(api.state().ponta.state,'leaving');
api.reset(3);assert.equal(api.state().ponta,null);assert(api.plan('ponta',3,720,960).ok);assert.equal(api.state().ponta,null);
api.time(720);assert.equal(api.state().ponta.state,'arrive');api.step(280);assert.equal(api.state().ponta.state,'idle');api.time(960);assert.equal(api.state().ponta.state,'leaving');
api.plan('ponta',3,720,1140);assert.equal(api.state().ponta.state,'arrive','reuses leaving helper on same-day extension');
assert(!api.plan('ponta',2,600,1140).ok,'past plan is readonly');
api.reset(2,{owned:['mike','kuro','shiro','chacha'],staff:true});
api.plan('mike',2,600,660);api.plan('kuro',2,null,null);api.plan('shiro',2,null,null);api.plan('chacha',2,null,null);
assert.deepEqual(api.cards(),[],'no planner opened yet');
assert.deepEqual(api.state().cats.filter(k=>k.state!=='leaving').map(k=>k.pal),['grio','mike']);
const reserved=api.reserve('mike');reserved.k.mood=82;reserved.k.hunger=44;
api.time(660);assert.equal(reserved.k.state,'leaving');assert.equal(reserved.job.taker,null);assert.equal(reserved.seat.cleaner,null);assert.equal(reserved.c.orderTaker,null);
api.step(400);assert(!api.state().cats.some(k=>k.pal==='mike'));
let saved=api.save();assert.equal(saved.cats.length,5,'all off-shift cats remain owned');assert.equal(saved.cats.find(k=>k.pal==='mike').mood,82);assert.equal(saved.cats.find(k=>k.pal==='mike').hunger,44);
const beforeMoney=api.state().G.money;api.buy('buy-c-mike');assert.equal(api.state().G.money,beforeMoney,'off-shift cat cannot be repurchased');assert.equal(api.state().G.cats.length,5);
api.reload();assert.equal(api.state().G.cats.length,5);assert.equal(CafeShifts.entry(api.state().G,'kuro').start,null);assert(!api.state().cats.some(k=>k.pal==='kuro'));
api.showCats();assert(api.state().html.includes('kuro'));assert(api.state().html.includes('お休み・勤務時間外'));
api.showShop();assert(api.state().html.includes('シフトを見る'));assert(!api.state().html.includes('¥6,000'));assert(api.state().html.includes('data-buy="buy-c-kuro" disabled'));
const temp=api.temp();api.time(680);assert.equal(temp.state,'idle','spot worker not affected by roster');api.time(720);api.step();assert.equal(temp.state,'leaving','spot worker still uses own end time');
api.modal();assert.deepEqual(api.cards(),['ponta','mike','kuro','shiro','chacha']);
api.field('shift-mike-work','on');api.field('shift-mike-start',720);api.field('shift-mike-end',1080);api.click('[data-shift-save]','mike');
assert.equal(CafeShifts.entry(api.state().G,'mike').start,720,'real planner save handler');
assert.equal(api.state().cats.filter(k=>k.pal==='mike'&&!k.gone).length,1,'one actor after reactivation');
api.field('shift-mike-end',660);api.click('[data-shift-save]','mike');assert.equal(CafeShifts.entry(api.state().G,'mike').end,1080,'invalid end time rejected');
api.click('[data-shift-reset]','mike');assert.equal(CafeShifts.entry(api.state().G,'mike').end,CafeShifts.entry(api.state().G,'mike').wishEnd,'original wish restored');
api.plan('kuro',3,840,1140);saved=api.save();api.reload();assert.deepEqual(api.save().shifts.days[3],saved.shifts.days[3],'wishes and owner edits survive reload');
api.end();const reportDay=api.state().G.day;api.modal(true);api.close();assert.equal(api.state().mode,'report');assert.equal(api.state().G.day,reportDay,'planner closing does not start next day');
assert(api.state().html.includes('けっか'));assert.equal(api.state().G.finance.history.find(d=>d.day===2).expenses.wages,2000,'human payroll unchanged');
assert.equal(api.state().G.finance.history.find(d=>d.day===2).expenses.staffInsurance,200);
api.start();assert(api.state().G.cats.some(k=>k.pal==='kuro'));api.time(840);assert(api.state().cats.some(k=>k.pal==='kuro'&&k.state!=='leaving'));
api.reset(2);api.time(780);api.buy('buy-c-mike');assert.equal(api.state().G.money,5000);assert(api.state().cats.some(k=>k.pal==='mike'));
assert.equal(CafeShifts.entry(api.state().G,'mike').end,1140,'new cat joins remainder of welcome day');
assert.equal(api.save().finance.active.expenses.catWelcome,3000);
assert(!html.includes("CafeFinance.spend(G,'catWelcome',6000,'ぽんた')"));
assert(html.indexOf('finance.js?')<html.indexOf('cat-shifts.js?'),'finance loads before shifts');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Function(m[1]);
console.log('PASS free day2 Ponta and alternate days, persisted wishes/month rollover, owner edits and UI handlers, attendance/task release, owned roster and stats, no duplicate purchase, old saves, report return, Nyaimee and payroll');
