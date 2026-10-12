/* Run with Playwright installed, optionally CHROMIUM_PATH=/path/to/chromium.
 * BASE_URL can target GitHub Pages instead of the built-in local server. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const artifacts = path.join(require('node:os').tmpdir(), 'catgame-check');
fs.mkdirSync(artifacts, {recursive:true});
(async () => {
  let server;
  const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';
  if (!process.env.BASE_URL) {
    server = http.createServer((req, res) => {
      const name = new URL(req.url, base).pathname;
      const file = path.join(__dirname, '..', name === '/' ? 'index.html' : name);
      try { const data = fs.readFileSync(file); res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.png') ? 'image/png' : 'text/html'); res.end(data); }
      catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(8765, '127.0.0.1', resolve));
  }
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu']} : {})});
  const errors = [];
  try {
    for (const [width,height,dpr] of [[320,568,2],[375,667,2],[393,852,3],[393,640,3],[430,932,3],[852,393,3],[640,320,2],[1280,900,1]]) {
      const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:width<500,hasTouch:width<500});
      page.on('pageerror', e => {errors.push(e.message);console.error('Runtime error:',e.message);});
      await page.goto(base); await page.evaluate(() => artworkReady);
      await page.locator('#mNew').click();
      await page.evaluate(()=>finishFirstGuide(true));
      await page.waitForFunction(()=>talking!==null);
      const dialogue=await page.evaluate(()=>({bottom:$('talk').getBoundingClientRect().bottom,dockTop:$('dock').getBoundingClientRect().top,top:$('talk').getBoundingClientRect().top}));
      assert(dialogue.top>=0&&dialogue.bottom<=dialogue.dockTop,'dialogue visible above dock');
      await page.evaluate(() => { talking=null; talkQ.length=0; $('talk').hidden=true; fitLayout(); render(); renderKitchen(); });
      const result = await page.evaluate(() => {
        const controls = [...$('actions').querySelectorAll('button'), ...$('sub').querySelectorAll('button')].map(el => el.getBoundingClientRect().toJSON());
        return {controls,width:innerWidth,height:innerHeight,backing:cv.width,physical:cv.clientWidth*devicePixelRatio,atlas:!!CHAR_SPR.grio && !!CHAR_SPR.ponta};
      });
      assert(result.atlas);
      const touch=await page.evaluate(()=>['wrap','talk','actions','sub','btnFood'].map(id=>getComputedStyle($(id)).touchAction));
      assert(touch.every(v=>v==='manipulation'));
      for (const r of result.controls) { assert(r.left>=0&&r.right<=width+1, 'horizontal clipping'); assert(r.top>=0&&r.bottom<=height+1, `vertical clipping ${width}x${height}`); }
      assert(result.backing>=result.physical-1);
      const layout=await page.evaluate(()=>({scene:cv.getBoundingClientRect().width,sceneHeight:cv.getBoundingClientRect().height,wrap:$('wrap').clientWidth,
        grio:catDisplaySize('grio',CHAR_SPR.grio.idle[0]).height, ponta:catDisplaySize('ponta',CHAR_SPR.ponta.idle[0]).height,
        cafe:cv.getBoundingClientRect().toJSON(),kitchen:kcv.getBoundingClientRect().toJSON(),field:$('playfield').getBoundingClientRect().toJSON(),
        bodyHeight:document.body.clientHeight,bodyScroll:document.body.scrollHeight,scrollY:scrollY,wide:$('playfield').classList.contains('side-by-side'),kitchenRatio:KH/KW}));
      assert(layout.scene<=layout.wrap,'drawing surfaces fit inside full-width controls');
      assert(Math.abs((layout.sceneHeight-6)/(layout.scene-6)-300/448)<.01,'cafe retains aspect ratio');
      assert(Math.abs((layout.kitchen.height-6)/(layout.kitchen.width-6)-layout.kitchenRatio)<.01,'kitchen retains aspect ratio');
      for(const box of [layout.cafe,layout.kitchen])assert(box.top>=layout.field.top-1&&box.bottom<=layout.field.bottom+1&&box.left>=layout.field.left-1&&box.right<=layout.field.right+1,'both canvases visible together');
      assert(layout.bodyScroll<=layout.bodyHeight+1,'page content does not require scrolling');
      assert.equal(layout.scrollY,0);assert.equal(layout.wide,width>=600&&width>height);
      assert.equal(layout.grio,79,'Grio reduced across all poses');assert.equal(layout.ponta,75,'Ponta reduced across all poses');
      const fitWithExtra=await page.evaluate(()=>{
        const guide=$('firstGuide'),bar=$('registerBar'),wasGuide=guide.hidden,wasBar=bar.hidden,results=[];
        for(const extra of [{guide:true,bar:false},{guide:false,bar:true}]){
          guide.hidden=!extra.guide;$('firstGuideStep').textContent='2 / 3 コーヒーをつくる';$('firstGuideText').textContent='下のキッチンで、光っているコーヒーマシンをタップしてね。';
          bar.hidden=!extra.bar;$('registerInfo').textContent='お会計待ち 1人・コーヒー ¥500';fitLayout();
          const boxes=['hud','firstGuide','cafe','kitchenCv','dock'].filter(id=>!$(id).hidden).map(id=>$(id).getBoundingClientRect().toJSON());
          results.push({boxes,body:document.body.scrollHeight,visible:document.body.clientHeight});
        }
        guide.hidden=wasGuide;bar.hidden=wasBar;fitLayout();return results;
      });
      for(const extra of fitWithExtra){
        for(const box of extra.boxes)assert(box.top>=-1&&box.bottom<=height+1&&box.left>=-1&&box.right<=width+1,'guide or checkout still fit screen');
        assert(extra.body<=extra.visible+1,'checkout/guide do not introduce page scrolling');
      }
      if (width===393) await page.screenshot({path:path.join(artifacts,'game.png')});
      if(width===393){
        const cdp=await page.context().newCDPSession(page);
        const target=await page.locator('#btnSpeed').boundingBox();
        for(const expected of [2,3,1]){
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x+target.width/2,y:target.y+target.height/2}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          assert.equal(await page.evaluate(()=>speed),expected,'one action for each rapid button tap');
        }
        assert.equal(await page.evaluate(()=>visualViewport.scale),1,'rapid taps must not zoom');
        await page.evaluate(()=>{cats[0].mood=20;mode='open';});
        const catPoint=await page.evaluate(()=>{const r=cv.getBoundingClientRect(),k=cats[0];return {x:r.left+3+k.x/VW*(r.width-6),y:r.top+3+(k.y/2-20)/(VH/2)*(r.height-6)};});
        const before=await page.evaluate(()=>cats[0].mood);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[catPoint]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert((await page.evaluate(()=>cats[0].mood))>before,'cafe tap still pets the enlarged cat');
        const dragBefore=await page.evaluate(()=>cats[0].mood);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[catPoint]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:catPoint.x,y:catPoint.y-90}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert((await page.evaluate(()=>cats[0].mood))<=dragBefore,'drag must not pet the cat');
        assert.equal(await page.evaluate(()=>scrollY),0,'dragging does not scroll the fitted game');
        // A second native tap is cancelled, while drags and two-finger gestures are left intact.
        const gestures=await page.evaluate(()=>{
          const target=$('btnSpeed');
          const make=(type,touches,changed)=>new TouchEvent(type,{bubbles:true,cancelable:true,touches,changedTouches:changed});
          const t=new Touch({identifier:1,target,clientX:30,clientY:30});
          target.dispatchEvent(make('touchstart',[t],[t]));
          const end=make('touchend',[],[t]);target.dispatchEvent(end);
          target.dispatchEvent(make('touchstart',[t],[t]));
          const moved=new Touch({identifier:1,target,clientX:30,clientY:80});target.dispatchEvent(make('touchmove',[moved],[moved]));
          const drag=make('touchend',[],[moved]);target.dispatchEvent(drag);
          const second=new Touch({identifier:2,target,clientX:70,clientY:30});target.dispatchEvent(make('touchstart',[t,second],[t,second]));
          const pinch=make('touchend',[],[t,second]);target.dispatchEvent(pinch);
          return {tap:end.defaultPrevented,drag:drag.defaultPrevented,pinch:pinch.defaultPrevented};
        });
        assert.deepEqual(gestures,{tap:true,drag:false,pinch:false});
        console.log('PASS rapid touch buttons execute once; zoom default cancelled; drags do not pet cats or scroll the fitted game');
      }

      await page.locator('#btnShift').click();
      assert.equal(await page.locator('[data-shift-card]').count(),1,'day1 planner shows upcoming Ponta');
      assert(await page.locator('[data-shift-save="ponta"]').isDisabled());
      const shiftLayout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,scroll:$('panel').querySelector('.shift-scroll').clientWidth,table:$('panel').querySelector('.shift-table').scrollWidth}));
      assert(shiftLayout.width<=width+1,'planner stays inside viewport');
      assert(shiftLayout.table>shiftLayout.scroll,'ten-day table scrolls within panel');
      await page.locator('#mClose').click();

      console.log(`PASS viewport ${width}x${height} DPR ${dpr}`);
      await page.close();
    }
    const guided=await browser.newPage({viewport:{width:393,height:852}});
    guided.on('pageerror',e=>errors.push(e.message));
    await guided.goto(base);await guided.evaluate(()=>artworkReady);
    await guided.locator('#mNew').click();
    await guided.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;});
    await guided.waitForFunction(()=>firstGuide?.step==='order');
    const initial=await guided.evaluate(()=>({time:G.time,pat:customers[0].pat}));
    async function clickGuidedCafe(){
      const point=await guided.evaluate(()=>{
        const s=firstGuide.customer.seat,r=cv.getBoundingClientRect();
        return {x:r.left+3+s.x/VW*(r.width-6),y:r.top+3+(s.y/2-(s.counter?51:55)+8)/(VH/2)*(r.height-6)};
      });await guided.mouse.click(point.x,point.y);
    }
    async function clickGuidedKitchen(ready=false){
      await guided.locator('#kitchenCv').scrollIntoViewIfNeeded();
      const point=await guided.evaluate(ready=>{
        const r=kcv.getBoundingClientRect();
        const slot=ready?passSlots()[0]:null,u=kitchenUnits().find(u=>u.st==='drink');
        return {x:r.left+3+(slot?slot.x+14:u.x+u.w/2)/KW*(r.width-6),y:r.top+3+(slot?slot.y-4:u.y+35)/KH*(r.height-6)};
      },ready);await guided.mouse.click(point.x,point.y);
    }
    await clickGuidedCafe();await guided.waitForFunction(()=>firstGuide?.step==='start');
    assert(await guided.locator('#btnShop').isDisabled());
    await clickGuidedKitchen();await guided.waitForFunction(()=>firstGuide?.step==='brew'||firstGuide?.step==='finish');
    await guided.waitForFunction(()=>firstGuide?.step==='finish');
    await guided.waitForTimeout(1200);
    const held=await guided.evaluate(()=>({time:G.time,pat:customers[0].pat,count:customers.length,ratio:firstGuide.job.t/firstGuide.job.dur}));
    assert.equal(held.time,initial.time);assert.equal(held.pat,initial.pat);assert.equal(held.count,1);assert(held.ratio>=.68&&held.ratio<=.86);
    await clickGuidedKitchen();await guided.waitForFunction(()=>firstGuide?.step==='deliver');
    await guided.waitForTimeout(1200);
    assert.equal(await guided.evaluate(()=>firstGuide.job.readyT),0);
    await clickGuidedKitchen(true);await guided.waitForFunction(()=>!firstGuide&&G.flags.firstCustomerDone);
    assert(await guided.locator('#firstGuide').isHidden());assert(await guided.locator('#btnShop').isEnabled());
    await guided.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;});
    await guided.waitForFunction(()=>G.time>600);
    await guided.reload();await guided.evaluate(()=>artworkReady);await guided.locator('#mCont').click();
    assert.equal(await guided.evaluate(()=>firstGuide),null,'completed guide does not repeat');
    await guided.close();
    console.log('PASS guided first customer with real cafe/kitchen taps, held perfect timing, normal resume and save reload');


    const shiftsPage=await browser.newPage({viewport:{width:320,height:568}});
    shiftsPage.on('pageerror',e=>errors.push(e.message));
    await shiftsPage.goto(base);await shiftsPage.evaluate(()=>artworkReady);
    await shiftsPage.locator('#mNew').click();
    assert.equal(await shiftsPage.evaluate(()=>ponta),null);
    await shiftsPage.evaluate(()=>{
      finishFirstGuide(true);talking=null;talkQ.length=0;$('talk').hidden=true;
      G.day=2;G.money=0;G.pop=0;startDay();talking=null;talkQ.length=0;$('talk').hidden=true;spawnTimer=100000;
      G.cats.push({pal:'mike',name:'ミケ',mood:61,hunger:32},{pal:'kuro',name:'クロ',mood:65,hunger:20});
      CafeShifts.ensure(G);CafeShifts.edit(G,'mike',2,780,1080);CafeShifts.edit(G,'kuro',2,null,null);updateShiftAttendance();save();
    });
    assert(await shiftsPage.evaluate(()=>!!ponta),'Ponta joins day2 without money or stars');
    assert.equal(await shiftsPage.evaluate(()=>G.money),0,'no Ponta fee');
    await shiftsPage.locator('#btnShift').click();
    assert.equal(await shiftsPage.locator('[data-shift-card]').count(),3);
    await shiftsPage.locator('#shift-mike-work').selectOption('on');
    await shiftsPage.locator('#shift-mike-start').selectOption('600');
    await shiftsPage.locator('#shift-mike-end').selectOption('660');
    await shiftsPage.locator('[data-shift-save="mike"]').click();
    assert.equal(await shiftsPage.evaluate(()=>cats.filter(k=>k.pal==='mike'&&k.state!=='leaving').length),1);
    await shiftsPage.locator('#shiftDay').selectOption('3');
    await shiftsPage.locator('#shift-ponta-work').selectOption('on');
    await shiftsPage.locator('#shift-ponta-start').selectOption('660');
    await shiftsPage.locator('#shift-ponta-end').selectOption('780');
    await shiftsPage.locator('[data-shift-save="ponta"]').click();
    assert.equal(await shiftsPage.evaluate(()=>CafeShifts.entry(G,'ponta',3).start),660);
    await shiftsPage.locator('[data-shift-reset="ponta"]').click();
    assert.equal(await shiftsPage.evaluate(()=>CafeShifts.entry(G,'ponta',3).start),null,'restore day3 rest wish');
    await shiftsPage.locator('#shift-ponta-work').selectOption('on');
    await shiftsPage.locator('#shift-ponta-start').selectOption('660');
    await shiftsPage.locator('#shift-ponta-end').selectOption('780');
    await shiftsPage.locator('[data-shift-save="ponta"]').click();
    await shiftsPage.screenshot({path:path.join(artifacts,'cat-shifts.png'),fullPage:true});
    await shiftsPage.locator('#mClose').click();
    const departed=await shiftsPage.evaluate(()=>{
      G.time=660;spawnTimer=100000;updateShiftAttendance();
      for(let i=0;i<500;i++)update();
      save();return {active:cats.filter(k=>k.pal==='mike'&&k.state!=='leaving').length,owned:G.cats.map(k=>k.pal),saved:loadSave().shifts.days[3]};
    });
    assert.equal(departed.active,0);assert.deepEqual(departed.owned,['grio','mike','kuro']);
    await shiftsPage.locator('#btnCats').click();
    assert((await shiftsPage.locator('#panel').innerText()).includes('クロ'),'off-shift cat remains in roster');
    await shiftsPage.locator('#mClose').click();
    await shiftsPage.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;endDay();});
    await shiftsPage.locator('#mShift').click();
    assert.equal(await shiftsPage.locator('#shiftDay').inputValue(),'3');
    await shiftsPage.locator('#mClose').click();
    assert(await shiftsPage.locator('#mNext').isVisible());assert.equal(await shiftsPage.evaluate(()=>G.day),3,'report round trip does not advance day');
    await shiftsPage.locator('#mNext').click();
    assert.equal(await shiftsPage.evaluate(()=>ponta),null,'owner changed day3 begins at11, not10');
    await shiftsPage.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;save();});
    await shiftsPage.reload();await shiftsPage.evaluate(()=>artworkReady);await shiftsPage.locator('#mCont').click();
    const shiftRestored=await shiftsPage.evaluate(()=>({ponta:!!ponta,roster:G.cats.map(k=>k.pal),plan:G.shifts.days[3]}));
    assert.equal(shiftRestored.ponta,false);assert.deepEqual(shiftRestored.roster,departed.owned);assert.deepEqual(shiftRestored.plan,departed.saved);
    const arrival=await shiftsPage.evaluate(()=>{
      talking=null;talkQ.length=0;$('talk').hidden=true;G.time=660;updateShiftAttendance();
      for(let i=0;i<300;i++)updatePonta();
      const joined=ponta?.state==='idle';G.time=780;updateShiftAttendance();return {joined,leaving:ponta?.state==='leaving'};
    });
    assert(arrival.joined&&arrival.leaving,'custom Ponta start and end apply');
    await shiftsPage.close();
    console.log('PASS real shift controls, free day2 Ponta, owner override/reset, timed attendance, off-shift roster, save reload and report return');


    const servicePage=await browser.newPage({viewport:{width:393,height:852}});
    servicePage.on('pageerror',e=>errors.push(e.message));
    await servicePage.goto(base);await servicePage.evaluate(()=>artworkReady);await servicePage.locator('#mNew').click();
    await servicePage.evaluate(()=>{
      finishFirstGuide(true);talking=null;talkQ.length=0;$('talk').hidden=true;closeModal();
      G.money=0;for(const it of INGR)G.market[it.id]=1;customers=[];jobs=[];seats.forEach(s=>s.cust=null);spawnTimer=100000;save();
    });
    await servicePage.locator('#btnStock').click();
    assert(await servicePage.locator('[data-add="beans:5"]').isEnabled(),'credit supplies need no immediate cash');
    await servicePage.locator('[data-add="beans:5"]').click();
    assert.equal(await servicePage.evaluate(()=>G.money),0);assert.equal(await servicePage.evaluate(()=>CafeFinance.view(G).payable),400);
    await servicePage.locator('#mClose').click();
    await servicePage.evaluate(()=>{G.day=2;startDay();spawnTimer=100000;talking=null;talkQ.length=0;$('talk').hidden=true;});
    await servicePage.locator('#btnStock').click();assert(await servicePage.locator('[data-add="beans:5"]').isDisabled(),'only every third day');
    assert((await servicePage.locator('#panel').innerText()).includes('通算4日目'));
    await servicePage.locator('#mClose').click();await servicePage.locator('#btnFinance').click();
    assert((await servicePage.locator('#panel').innerText()).includes('仕入れ買掛'));
    assert((await servicePage.locator('#panel').innerText()).includes('1月10日'));
    await servicePage.locator('#mClose').click();
    const supplierPaid=await servicePage.evaluate(()=>{
      G.day=10;G.money=5000;startDay();talking=null;talkQ.length=0;$('talk').hidden=true;customers=[];endDay();
      return {money:G.money,payable:CafeFinance.view(G).payable,payments:G.finance.history.slice(-1)[0].payablePayments};
    });
    assert.equal(supplierPaid.money,3450);assert.equal(supplierPaid.payable,0);assert.equal(supplierPaid.payments,400);
    await servicePage.locator('#mDishes').click();
    await servicePage.evaluate(()=>{const n=CafeService.reserve(G,CafeService.bundle(MENU[0],MENU.find(m=>m.id==='cake')));CafeService.soil(G,n);openDishes(true);});
    await servicePage.locator('#mWash').click();assert.equal(await servicePage.evaluate(()=>CafeService.sum(G.tableware.dirty)),0,'wash during report does not advance day');
    assert.equal(await servicePage.evaluate(()=>G.day),11);
    await servicePage.locator('#mWareShop').click();
    await servicePage.locator('[data-buy="buy-w-cup"]').click();
    assert.equal(await servicePage.evaluate(()=>G.tableware.total.cup),8);
    assert.equal(await servicePage.evaluate(()=>G.money),2850);await servicePage.locator('#mClose').click();
    await servicePage.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;save();});
    await servicePage.reload();await servicePage.evaluate(()=>artworkReady);await servicePage.locator('#mCont').click();
    assert.equal(await servicePage.evaluate(()=>G.tableware.total.cup),8);assert.equal(await servicePage.evaluate(()=>G.money),2850,'paid supplier and tableware purchase do not repeat');
    const setSetup=await servicePage.evaluate(()=>{
      talking=null;talkQ.length=0;$('talk').hidden=true;closeModal();cats=[];ponta=null;G.staff=false;customers=[];jobs=[];spawnTimer=100000;
      seats.forEach(s=>{s.cust=null;clearTable(s);});
      for(const id of ['beans','flour','egg','berry','cream'])G.stock[id]=[{n:20,day:G.day}];
      G.menu.push('cake');spawnCustomer();const c=customers[0];c.state='order';c.t=31;c.order=CafeService.bundle(MENU[0],MENU.find(m=>m.id==='cake'));c.pat=c.maxPat=760;c.paymentMethod='cash';
      render();return {clean:{...G.tableware.clean},seat:{...c.seat,cust:null}};
    });
    const orderPoint=await servicePage.evaluate(()=>{
      const s=customers[0].seat,r=cv.getBoundingClientRect();return{x:r.left+3+s.x/VW*(r.width-6),y:r.top+3+(s.y/2-47)/(VH/2)*(r.height-6)};
    });
    await servicePage.mouse.click(orderPoint.x,orderPoint.y);
    assert.equal(await servicePage.evaluate(()=>jobs.length),2,'one set creates two actual cooking jobs');
    const setBill=await servicePage.evaluate(()=>{
      talking=null;talkQ.length=0;$('talk').hidden=true;
      const c=customers[0],a=jobs[0],b=jobs[1];a.state=b.state='ready';a.q=b.q='normal';deliver(a,false);
      if(c.state!=='wait'||c.receivedItems.length!==1)throw Error('set completed before both dishes');
      deliver(b,false);if(c.state!=='eat')throw Error('complete set never begins eating');
      c.t=420;updateCustomer(c);updateCheckout();c.x=REGISTER.queueX;c.y=REGISTER.queueY;c.state='checkout';c.t=0;refreshRegister();render();
      return{total:c.bill.total,money:G.money};
    });
    await servicePage.locator('#btnRegister').click();assert.equal(await servicePage.evaluate(()=>G.money),setBill.money+setBill.total);
    const dirtyPoint=await servicePage.evaluate(()=>{
      const s=seats.find(s=>s.dirty),r=cv.getBoundingClientRect();return{x:r.left+3+s.itemX/VW*(r.width-6),y:r.top+3+(s.itemY/2)/(VH/2)*(r.height-6)};
    });
    await servicePage.mouse.click(dirtyPoint.x,dirtyPoint.y);
    assert.deepEqual(await servicePage.evaluate(()=>({...G.tableware.dirty})),{cup:1,plate:1,fork:1});
    await servicePage.locator('#kitchenCv').scrollIntoViewIfNeeded();
    const sinkPoint=await servicePage.evaluate(()=>{
      const r=kcv.getBoundingClientRect();return{x:r.left+3+258/KW*(r.width-6),y:r.top+3+210/KH*(r.height-6)};
    });
    await servicePage.mouse.click(sinkPoint.x,sinkPoint.y);
    assert(await servicePage.locator('#modal').isHidden(),'sink washing keeps the game running');
    assert(await servicePage.evaluate(()=>!!G.tableware.wash),'real sink tap starts a wash batch');
    await servicePage.waitForFunction(()=>!G.tableware.wash);
    assert.deepEqual(await servicePage.evaluate(()=>({...G.tableware.clean})),setSetup.clean);
    await servicePage.evaluate(()=>{Object.assign(G.furniture,{table:6,stool:3,cushion:4,plant:3,tower:1});buildSeats();render();});
    await servicePage.screenshot({path:path.join(artifacts,'entrance-register-and-kitchen-sink.png'),fullPage:true});
    const sinkFrames=await servicePage.evaluate(()=>{
      const saved=JSON.parse(JSON.stringify(G.tableware)),beforeMode=mode;mode='report';
      const sheet=document.createElement('canvas');sheet.width=KW;sheet.height=88*6;
      const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;const frames=[];
      try{
        for(const [n,count]of [0,1,3,6,12].entries()){
          for(const key of CafeService.keys){G.tableware.dirty[key]=count;G.tableware.total[key]=count;G.tableware.clean[key]=0;G.tableware.used[key]=0;}
          G.tableware.wash=null;renderKitchen();
          const lower=document.createElement('canvas');lower.width=KW;lower.height=88;
          lower.getContext('2d').drawImage(kcv,0,168/KH*kcv.height,kcv.width,88/KH*kcv.height,0,0,KW,88);
          frames.push(lower.toDataURL());g.drawImage(lower,0,n*88);
        }
        G.tableware.dirty={cup:3,plate:3,fork:3};G.tableware.total={cup:3,plate:3,fork:3};CafeService.startWash(G);G.tableware.wash.t=42;
        renderKitchen();g.drawImage(kcv,0,168/KH*kcv.height,kcv.width,88/KH*kcv.height,0,5*88,KW,88);
        return{distinct:new Set(frames).size,image:sheet.toDataURL().split(',')[1]};
      }finally{G.tableware=saved;mode=beforeMode;renderKitchen();}
    });
    assert.equal(sinkFrames.distinct,5,'dirty piles visibly change from empty through increased inventory');
    fs.writeFileSync(path.join(artifacts,'kitchen-sink-piles.png'),Buffer.from(sinkFrames.image,'base64'));
    await servicePage.close();
    console.log('PASS supply-day and credit UI, month-end supplier payment, wash and extra tableware, persisted inventory, real set order and combined bill, kitchen sink tap and growing dirty piles');

    const straysPage=await browser.newPage({viewport:{width:393,height:852}});
    straysPage.on('pageerror',e=>errors.push(e.message));
    await straysPage.goto(base);await straysPage.evaluate(()=>artworkReady);
    await straysPage.locator('#mNew').click();
    const fees=await straysPage.evaluate(()=>{
      finishFirstGuide(true);talking=null;talkQ.length=0;$('talk').hidden=true;
      G.money=40000;G.time=OPEN;mode='open';
      G.nyaimee=STRAYS.map(st=>({id:st.id,hours:2,hired:false}));
      return STRAYS.reduce((n,st)=>n+st.rate*2,0);
    });
    await straysPage.locator('#btnNyaimee').click();
    assert.equal(await straysPage.locator('[data-stray]').count(),6);
    const thumbs=await straysPage.evaluate(()=>[...$('panel').querySelectorAll('[data-stray]')].map(cv=>({
      id:cv.dataset.stray,width:cv.rasterLogicalWidth,height:cv.rasterLogicalHeight,physical:cv.width,expected:Math.round(cv.clientWidth*devicePixelRatio),
      visible:cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data.some((v,i)=>i%4===3&&v>16)
    })));
    for(const t of thumbs){assert.equal(t.width,112);assert.equal(t.height,126);assert(t.visible,t.id+' thumbnail');assert.equal(t.physical,t.expected,'thumbnail matches display density');}
    for(const id of ['sabi','hachi','gure','milk','boss','kotetsu'])await straysPage.locator('[data-hire="'+id+'"]').click();
    const hired=await straysPage.evaluate(()=>({
      money:G.money,fee:dayLog.nyaimee,pals:cats.filter(k=>k.temp).map(k=>k.pal),stored:loadSave().nyaimee.every(o=>o.hired),
      frames:Object.keys(StrayArt.meta).map(pal=>({pal,poses:Object.keys(StrayArt.meta[pal]).map(pose=>{
        const im=StrayArt.frame(pal,pose),pixels=im.getContext('2d').getImageData(0,0,128,144).data;
        return pixels.some((v,i)=>i%4===3&&v>16);
      })}))
    }));
    assert.equal(hired.money,40000-fees);assert.equal(hired.fee,fees);assert.equal(hired.pals.length,6);assert(hired.stored);
    for(const actor of hired.frames)assert(actor.poses.every(Boolean),actor.pal+' all cells visible');
    await straysPage.evaluate(()=>{
      closeModal();talking=null;talkQ.length=0;$('talk').hidden=true;mode='report';
      cats.filter(k=>k.temp).forEach((k,i)=>{k.x=38+i*34;k.y=210;k.state='idle';k.act=null;});render();
    });
    await straysPage.screenshot({path:path.join(artifacts,'nyaimee-workers.png')});
    await straysPage.goto(new URL('stray-preview.html',base).href);
    await straysPage.waitForFunction(()=>document.querySelectorAll('#cats article').length===6);
    for(const pose of ['idle','frontWalk','backWalk','walk','leftWalk','sit','serve','clean','sleepbag','groom','yawn','stretch','joy','surprise']){
      await straysPage.locator('#pose').selectOption(pose);
      assert(await straysPage.evaluate(()=>[...document.querySelectorAll('#cats canvas')].every(cv=>
        cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data.some((v,i)=>i%4===3&&v>16)
      )),pose+' visible for all six cats');
    }
    await straysPage.locator('#pose').selectOption('frontWalk');
    await straysPage.screenshot({path:path.join(artifacts,'nyaimee-gallery.png'),fullPage:true});
    await straysPage.close();
    console.log('PASS six Nyaimee cards, real hiring, payment/save, all96 visible sprites and preview motions');

    const cashPage=await browser.newPage({viewport:{width:393,height:852}});
    cashPage.on('pageerror',e=>errors.push(e.message));
    await cashPage.goto(base);await cashPage.evaluate(()=>artworkReady);await cashPage.locator('#mNew').click();
    const prepareCash=async(method='cash')=>cashPage.evaluate(method=>{
      finishFirstGuide(true);talking=null;talkQ.length=0;$('talk').hidden=true;closeModal();
      G=newSave();G.flags={intro:true,firstCustomerDone:true,register:true};buildSeats();spawnCats();startDay();
      spawnTimer=100000;cats=[];ponta=null;
      const seat=seats[0],look=randomLook(),c={seat,x:seat.x,y:seat.y,state:'eat',t:420,anim:0,order:MENU[0],patAtServe:700,maxPat:760,pat:700,visits:2,quality:'perfect',paymentMethod:method,look,spr:makePerson(look)};
      seat.cust=c;customers=[c];updateCustomer(c);updateCheckout();
      // Freeze only the travel setup, then exercise actual UI payment and animation.
      c.x=REGISTER.queueX;c.y=REGISTER.queueY;c.state='checkout';c.t=0;c.walkFacing='back';
      refreshRegister();render();return{money:G.money,total:c.bill.total};
    },method);
    let cash=await prepareCash();
    assert(await cashPage.locator('#btnRegister').isEnabled());
    assert((await cashPage.locator('#btnRegister').textContent()).includes('¥'+cash.total));
    await cashPage.locator('#cafe').scrollIntoViewIfNeeded();
    const registerPoint=await cashPage.evaluate(()=>{
      const r=cv.getBoundingClientRect();return{x:r.left+3+REGISTER.x/VW*(r.width-6),y:r.top+3+(REGISTER.y/2)/(VH/2)*(r.height-6)};
    });
    await cashPage.mouse.click(registerPoint.x,registerPoint.y);
    let payment=await cashPage.evaluate(()=>({money:G.money,sales:dayLog.sales,served:G.served,saved:loadSave().money}));
    assert.equal(payment.money,cash.money+cash.total);assert.equal(payment.sales,cash.total);assert.equal(payment.served,1);assert.equal(payment.saved,payment.money);
    await cashPage.mouse.click(registerPoint.x,registerPoint.y);assert.equal(await cashPage.evaluate(()=>G.money),payment.money,'repeat canvas tap pays once');
    await cashPage.screenshot({path:path.join(artifacts,'cash-register-paid.png')});
    cash=await prepareCash();await cashPage.setViewportSize({width:320,height:568});
    const registerBounds=await cashPage.locator('#btnRegister').boundingBox();
    assert(registerBounds.x>=0&&registerBounds.x+registerBounds.width<=321&&registerBounds.height>=44,'mobile checkout control fits');
    await cashPage.locator('#btnRegister').click();
    assert.equal(await cashPage.evaluate(()=>G.money),cash.money+cash.total,'button uses same payment');
    await cashPage.reload();await cashPage.evaluate(()=>artworkReady);await cashPage.locator('#mCont').click();
    assert.equal(await cashPage.evaluate(()=>G.money),cash.money+cash.total,'collected money persists');
    const cardPayment=await prepareCash('card');
    assert((await cashPage.locator('#btnRegister').textContent()).includes('カード会計'));
    await cashPage.locator('#btnRegister').click();
    const cardState=await cashPage.evaluate(()=>({money:G.money,gross:CafeFinance.view(G).cardGross,net:CafeFinance.view(G).cardNet,saved:loadSave().finance.cards[0]}));
    assert.equal(cardState.money,cardPayment.money);assert.equal(cardState.gross,cardPayment.total);
    assert.equal(cardState.net,cardPayment.total-Math.round(cardPayment.total*.03));assert.equal(cardState.saved.gross,cardPayment.total);
    await cashPage.locator('#btnFinance').click();
    assert((await cashPage.locator('#panel').textContent()).includes('2月2日'));
    await cashPage.locator('#mClose').click();
    await cashPage.close();
    console.log('PASS cash register canvas tap and checkout button, repeat tap, mobile control and saved income');

    const financePage=await browser.newPage({viewport:{width:393,height:852}});
    financePage.on('pageerror',e=>errors.push(e.message));
    await financePage.goto(base);await financePage.evaluate(()=>artworkReady);await financePage.locator('#mNew').click();
    const ledger=await financePage.evaluate(()=>{
      finishFirstGuide(true);talking=null;talkQ.length=0;$('talk').hidden=true;closeModal();
      G=newSave();G.flags={intro:true,firstCustomerDone:true,register:true};buildSeats();spawnCats();
      for(let day=1;day<10;day++){G.day=day;CafeFinance.beginDay(G);CafeFinance.sale(G,2000,'cash');CafeFinance.sale(G,400,'card');CafeFinance.closeDay(G);}
      G.day=10;startDay();spawnTimer=100000;
      CafeFinance.sale(G,2000,'cash');CafeFinance.sale(G,400,'card');dayLog.sales=2400;dayLog.served=2;
      customers=[];endDay();
      return{money:G.money,month:G.finance.months[0],gross:CafeFinance.view(G).cardGross,net:CafeFinance.view(G).cardNet,bills:G.finance.bills.reduce((n,b)=>n+b.amount,0)};
    });
    assert.equal(ledger.gross,4000);assert.equal(ledger.net,3880);assert.equal(ledger.month.days,10);assert(ledger.month.closed);
    const reportText=await financePage.locator('#panel').textContent();
    for(const label of ['1月10日','引かれる経費の内訳','営業利益','使えるお金（閉店時）','カード売掛','2月2日','2月3日'])assert(reportText.includes(label),label);
    await financePage.screenshot({path:path.join(artifacts,'finance-month-result.png'),fullPage:true});
    await financePage.locator('#mFinance').click();assert((await financePage.locator('#panel').textContent()).includes('お店の帳簿'));
    await financePage.locator('#mClose').click();assert((await financePage.locator('#panel').textContent()).includes('1月10日'));
    assert.equal(await financePage.evaluate(()=>G.day),11,'ledger return does not advance the day');
    await financePage.evaluate(()=>{closeModal();G.day=12;startDay();spawnTimer=100000;});
    assert.equal(await financePage.evaluate(()=>G.money),ledger.money+ledger.net);
    assert(await financePage.evaluate(()=>loadSave().finance.cards[0].settled));
    await financePage.reload();await financePage.evaluate(()=>artworkReady);await financePage.locator('#mCont').click();
    assert.equal(await financePage.evaluate(()=>G.money),ledger.money+ledger.net,'card payout survives reload once');
    await financePage.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;customers=[];endDay();});
    const beforeTax=await financePage.evaluate(()=>G.money);
    await financePage.locator('#mNext').click();
    assert.equal(await financePage.evaluate(()=>G.money),beforeTax-ledger.bills,'next month day3 pays old tax and insurance');
    assert(await financePage.evaluate(()=>G.finance.bills.filter(b=>b.month===1).every(b=>b.paid)));
    await financePage.close();
    console.log('PASS card customer, ledger/result navigation, ten-day month, card payout, monthly bills and reload');
    const p=await browser.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base);await p.evaluate(()=>artworkReady);

    const directDrawing=await p.evaluate(()=>{
      const comparison=document.createElement('canvas');comparison.width=448;comparison.height=184;
      const g=comparison.getContext('2d');g.fillStyle='#f6ecdb';g.fillRect(0,0,448,184);
      const chosen=[['grio',CHAR_SPR.grio.idle[0]],['ponta',CHAR_SPR.ponta.idle[0]],['stray_sabi',CHAR_SPR.stray_sabi.idle[0]]];
      const results=[];
      for(const [n,[pal,image]]of chosen.entries()){
        const size=catDisplaySize(pal,image),record=image.spriteSource;
        if(!record)throw Error('missing original sprite '+pal);
        const trace=[],native=g.drawImage.bind(g);
        g.drawImage=(...args)=>{trace.push({image:args[0]===record.image,smooth:g.imageSmoothingEnabled,quality:g.imageSmoothingQuality});native(...args);};
        g.imageSmoothingEnabled=false;g.drawImage(image,20+n*140,80-size.height,size.width,size.height);
        trace.length=0;SpriteRaster.draw(g,image,20+n*140,174-size.height,size.width,size.height);
        results.push({pal,original:trace.length===1&&trace[0].image,filtered:trace[0].smooth&&trace[0].quality==='high',width:size.width,height:size.height});
        g.drawImage=native;
      }
      const measure=canvas=>({actual:canvas.width,expected:Math.round(canvas.clientWidth*devicePixelRatio)});
      return {results,room:measure(cv),kitchen:measure(kcv),comparison:comparison.toDataURL().split(',')[1]};
    });
    assert(directDrawing.results.every(r=>r.original&&r.filtered));
    assert.deepEqual(directDrawing.results.map(r=>[r.width,r.height]),[[70,79],[67,75],[67,75]]);
    assert.equal(directDrawing.room.actual,directDrawing.room.expected);assert.equal(directDrawing.kitchen.actual,directDrawing.kitchen.expected);
    fs.writeFileSync(path.join(artifacts,'sprite-reduction-comparison.png'),Buffer.from(directDrawing.comparison,'base64'));
    const spriteChecks=await p.evaluate(async()=>{
      const frames=await CatArtwork.load(); const issues=[];
      const atlas=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.src=new URL('chars.webp',location.href).href;});
      const colours=c=>{
        const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,counts={};
        for(let i=0;i<data.length;i+=4)if(data[i+3]){const key=[...data.slice(i,i+4)].join(',');counts[key]=(counts[key]||0)+1;}
        return JSON.stringify(Object.entries(counts).sort());
      };
      for(const [key,[x,y,w,h]] of Object.entries(CatArtwork.meta)){
        const raw=document.createElement('canvas');raw.width=w;raw.height=h;raw.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);
        if(key==='grio.f_normal'){
          const [sx,sy]=CatArtwork.meta['grio.f_sleepy'],g=raw.getContext('2d');
          g.clearRect(0,32,64,32);g.drawImage(atlas,sx,sy+32,64,32,0,32,64,32);
          g.clearRect(25,26,14,6);g.drawImage(atlas,sx+25,sy+26,14,6,25,26,14,6);
        }
        const [who,pose]=key.split('.');
        if(pose.startsWith('f_')&&colours(raw)!==colours(frames[who][pose]))issues.push(key+' altered portrait pixels');
      }
      for(const who of ['grio','ponta']) {
        const reference=frames[who].idle;
        for(const [pose,im] of Object.entries(frames[who])){
          if(pose.startsWith('f_'))continue;
          if(im.width!==128||im.height!==144||!im.motionArtwork)issues.push(who+'.'+pose+' not uniform artwork');
          if(im.spriteScale!==reference.spriteScale||im.footAnchor!==reference.footAnchor)issues.push(who+'.'+pose+' scale/baseline');
          const alpha=im.getContext('2d').getImageData(0,im.height-6,im.width,6).data;
          if(!alpha.some((v,i)=>i%4===3&&v>128))issues.push(who+'.'+pose+' empty feet');
        }
        for(const direction of ['front','back'])for(let f=0;f<4;f++)
          if(RearWalk.cat(who,f,frames[who].walk0,null,direction)!==frames[who][direction+'Walk'+f])issues.push(who+' mismatched directional artwork');
        const pixels=pose=>frames[who][pose].getContext('2d').getImageData(0,0,128,144).data.join(',');
        if(pixels('groom')===pixels('sit'))issues.push(who+' grooming not replaced');
        if(charPose({pal:who,state:'slack'},'groom0')!=='groom')issues.push(who+' grooming not selected');
        if(charPose({pal:who,state:'clean'},'sit0')!=='clean')issues.push(who+' cleaning not selected');
        if(charPose({pal:who,state:'idle',jump:10},'sit0')!=='jump')issues.push(who+' jump not selected');
        for(const prefix of ['walk','frontWalk','backWalk']) {
          const a=pixels(prefix+'0');
          for(let f=1;f<4;f++)if(a===pixels(prefix+f))issues.push(who+' repeated walking cell '+prefix+f);
        }
      }
      for(const who of ['grio','ponta']) {
        for(const state of ['walk','toServe','toCounter','toTable']) {
          const moving={pal:who,state,anim:0,carryDish:true,x:50,y:100};
          moveTo(moving,100,100,1);
          if(moving.face!==1||catImg(who,'walk0',moving.face,moving)!==CHAR_SPR[who].walk0[0])issues.push(who+' right movement reversed');
          moveTo(moving,0,100,1);
          if(moving.face!==-1||catImg(who,'walk0',moving.face,moving)!==CHAR_SPR[who].walk0[1])issues.push(who+' left movement reversed');
        }
        if(charPose({pal:who,state:'takeOrder',t:50},'sit0')!=='idle')issues.push(who+' bows throughout order');
        if(charPose({pal:who,state:'takeOrder',t:9},'sit0')!=='idle')issues.push(who+' bow swaps standing artwork');
        const bow=t=>catBowAngle({state:'takeOrder',t,face:1});
        if(bow(18)!==0||bow(0)!==0||Math.abs(bow(9)-Math.PI/30)>1e-9)issues.push(who+' bow endpoints/peak');
        if(Math.abs(bow(3)-bow(15))>1e-9)issues.push(who+' asymmetric bow easing');
        if(catBowAngle({state:'takeOrder',t:9,face:-1})!==-bow(9))issues.push(who+' bow facing wrong way');
        if(catBowAngle({state:'idle',t:9,face:1})!==0)issues.push(who+' bow continues in idle');
        if(charPose({pal:who,state:'idle',t:60},'sit0')!=='idle')issues.push(who+' bow does not return to idle');
        if(charPose({pal:who,state:'idle'},'stretch')==='bow')issues.push(who+' stretch uses deep bow');
      }
      const k={pal:'grio',state:'toServe',carryDish:true,anim:0};
      const walk=[0,9,18,27].map(n=>{k.anim=n;return charPose(k,'walk0');});
      return {issues,walk,portraitCount:Object.keys(frames.grio).filter(k=>k.startsWith('f_')).length};
    });
    assert.deepEqual(spriteChecks.issues,[]);assert.deepEqual(spriteChecks.walk,['walk0','walk1','walk2','walk3']);assert.equal(spriteChecks.portraitCount,8);
    const newArtwork=await p.evaluate(()=>{
      const look={hair:'#5a3a22',skin:'#f8dcc0',shirt:'#80a890',pants:'#4a4a58',long:true};
      const im=PERSON_FRAMES.map(f=>CafeArt.person(look,f));
      const head=c=>c.getContext('2d').getImageData(0,0,48,35).data.join(',');
      const sheet=document.createElement('canvas');sheet.width=480;sheet.height=210;const sg=sheet.getContext('2d');sg.fillStyle='#fff0d8';sg.fillRect(0,0,480,210);
      for(let n=0;n<im.length;n++)sg.drawImage(im[n],n*58+5,72-im[n].height);
      const short={...look,hair:'#342a24',skin:'#c8936a',shirt:'#ce8e78',long:false};PERSON_FRAMES.forEach((f,n)=>{const c=CafeArt.person(short,f);sg.drawImage(c,n*58+5,150-c.height);});
      sg.drawImage(CafeArt.table(),10,156);sg.drawImage(CafeArt.chair(),110,151);sg.drawImage(CafeArt.stool(),164,175);
      const transforms=[];sceneAsset(.85,0,0,()=>{const m=ctx.getTransform();transforms.push([m.a,m.d]);});
      sceneAsset(.68,143,0,()=>{const m=ctx.getTransform();transforms.push([m.a,m.d]);});
      return {sheet:sheet.toDataURL().split(',')[1],frames:im.map(c=>[c.width,c.height]),heads:[head(im[0])===head(im[1]),head(im[0])===head(im[2])],transforms,
        furniture:[CafeArt.table(),CafeArt.chair(),CafeArt.stool()].map(c=>[c.width,c.height])};
    });
    fs.writeFileSync(path.join(artifacts,'cafe-assets.png'),Buffer.from(newArtwork.sheet,'base64'));
    assert(newArtwork.heads.every(Boolean),'walking people keep identical face');
    assert(newArtwork.transforms.every(([x,y])=>x===y),'decor uniformly scaled');
    assert.deepEqual(newArtwork.frames,[[48,72],[48,72],[48,72],[48,66],[48,66],[48,66],[48,66],[48,54]]);
    const seatAlignment=await p.evaluate(()=>{const tableY=140,seatY=tableY-8;return {chair:tableY-56+31,faceBottom:seatY-66+36,tableTop:tableY-32+2,person:seatY-CafeArt.person({hair:'#5a3a22',skin:'#f8dcc0',shirt:'#80a890',pants:'#4a4a58'},'sit').height+49};});
    assert.equal(seatAlignment.chair,seatAlignment.person,'seated hips align with chair cushion');
    assert(seatAlignment.faceBottom<=seatAlignment.tableTop,'table must not cover seated mouth');
    assert.deepEqual(newArtwork.furniture,[[88,52],[38,58],[34,34]]);
    console.log('PASS native people all 8 frames; stable walking faces; decor aspect ratios');
    const detailedGuests=await p.evaluate(()=>{
      const sheet=document.createElement('canvas');sheet.width=768;sheet.height=576;const g=sheet.getContext('2d');g.fillStyle='#fff0d8';g.fillRect(0,0,768,576);
      for(let n=0;n<4;n++){
        const look={guest:n};const frames=PERSON_FRAMES.map(f=>GuestArt.person(look,f));
        if(frames.some(f=>!f||!f.guestDetail))throw Error('Missing detailed guest');
        const face=c=>c.getContext('2d').getImageData(0,0,96,80).data.join(',');
        if(face(frames[0])!==face(frames[1])||face(frames[0])!==face(frames[2]))throw Error('Walking face changed');
        frames.forEach((f,i)=>g.drawImage(f,i*96,n*144+144-f.height));
      }
      return sheet.toDataURL().split(',')[1];
    });
    fs.writeFileSync(path.join(artifacts,'detailed-guests.png'),Buffer.from(detailedGuests,'base64'));
    console.log('PASS four detailed guests all eight states, walking faces stable');
    const walkGuests=await p.evaluate(()=>{
      const sheet=document.createElement('canvas');sheet.width=1024;sheet.height=672;const g=sheet.getContext('2d');g.fillStyle='#fff0d8';g.fillRect(0,0,1024,672);
      for(let n=0;n<4;n++)for(let f=0;f<4;f++){
        const right=GuestArt.walk({guest:n},f,1),left=GuestArt.walk({guest:n},f,-1);
        const r=right.getContext('2d').getImageData(0,0,128,168).data,l=left.getContext('2d').getImageData(0,0,128,168).data;
        for(let y=0;y<168;y++)for(let x=0;x<128;x++)for(let k=0;k<4;k++)if(r[(y*128+x)*4+k]!==l[(y*128+127-x)*4+k])throw Error('Guest facing mismatch');
        if(right.logicalHeight!==84)throw Error('Walking guest scale');
        g.drawImage(right,f*128,n*168);g.drawImage(left,512+f*128,n*168);
      }
      const c={x:10,y:10};moveTo(c,20,10,1);if(c.face!==1)throw Error('Right motion');moveTo(c,0,10,1);if(c.face!==-1)throw Error('Left motion');
      return sheet.toDataURL().split(',')[1];
    });
    fs.writeFileSync(path.join(artifacts,'walking-guests.png'),Buffer.from(walkGuests,'base64'));
    console.log('PASS all 16 walking frames both directions and enlarged scale');
    const bowSheet=await p.evaluate(()=>{
      const sheet=document.createElement('canvas');sheet.width=720;sheet.height=520;
      const g=sheet.getContext('2d'),keep=ctx;ctx=g;
      try {
        for(const [row,who,face] of [[0,'grio',1],[1,'grio',-1],[2,'ponta',1],[3,'ponta',-1]]) {
          for(const [col,t] of [[0,18],[1,12],[2,9],[3,0]]) {
            g.save();g.translate(col*180,row*130);
            g.fillStyle='#fff4df';g.fillRect(0,0,180,130);
            const im=CHAR_SPR[who].idle[face>0?0:1],size=catDisplaySize(who,im);
            drawCatArtwork(im,90-size.width/2,115-size.height,size,{state:'takeOrder',t,face});
            g.fillStyle='#8a5a32';g.fillRect(0,115,180,1);
            g.restore();
          }
        }
      } finally {ctx=keep;}
      return sheet.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(artifacts,'bow-motion.png'),Buffer.from(bowSheet,'base64'));
    await p.locator('#mNew').click();
    await p.evaluate(()=>finishFirstGuide(true));
    // No manual serve(): the manager must walk to the guest and create a job,
    // including while visiting/napping and while the human helper is hired.
    const autoOrders=await p.evaluate(()=>{
      talking=null;talkQ.length=0;$('talk').hidden=true;const results=[];
      for(const state of ['idle','walk','visit','toVisit','toSpot','nap']) {
        G=newSave();G.staff=true;buildSeats();spawnCats();customers=[];jobs=[];ponta=null;mode='open';staffBusy=0;
        const k=cats[0],seat=seats[0];k.state=state;k.t=900;k.tx=210;k.ty=288;
        if(state==='nap'){k.spot=TOWER;k.x=TOWER.x+10;k.y=TOWER.top+2;}
        const c={seat,x:seat.x,y:seat.y,state:'order',t:31,order:MENU.find(m=>m.id==='coffee'),pat:760,maxPat:760,spr:makePerson(randomLook()),anim:0};
        seat.cust=c;customers=[c];let sawMove=false,sawOrder=false;
        for(let i=0;i<650&&c.state==='order';i++){
          updateCustomer(c);updateCat(k);
          sawMove ||= k.state==='toOrder';sawOrder ||= k.state==='takeOrder';
          if(i%30===0)render();
        }
        results.push({state,sawMove,sawOrder,received:c.state==='wait'&&jobs.length===1,released:!c.orderTaker&&!k.orderC});
      }
      G=newSave();buildSeats();spawnCats();customers=[];jobs=[];mode='open';
      return results;
    });
    for(const r of autoOrders)assert(r.sawMove&&r.sawOrder&&r.received&&r.released,JSON.stringify(r));
    console.log('PASS automatic cat orders from idle/walk/visit/nap, with human helper; reservation released');
    // Exercise the live simulation, including ordering, kitchen, and delivery.
    const simulation=await p.evaluate(()=>{
      talking=null;talkQ.length=0;$('talk').hidden=true;G.flags.intro=true;
      G.ponta=true;G.staff=true;G.pop=35;ponta=makePonta();
      for(const it of INGR)G.stock[it.id]=[{n:30,day:G.day}];
      let ordered=0,cooked=0,delivered=0;
      for(let i=0;i<8000;i++){
        update();talking=null;talkQ.length=0;$('talk').hidden=true;
        for(const c of customers)if(c.state==='order'){const before=jobs.length;serve(c,false);if(jobs.length>before)ordered++;}
        for(const u of kitchenUnits()){
          if(!unitJob(u))startCook(u,false);
          const j=jobs.find(j=>j.st===u.st&&j.unit===u.i&&j.state==='cook');
          if(j&&j.t/j.dur>=ZONE[0]&&j.t/j.dur<=ZONE[1]){cookTap(j,u);cooked++;}
        }
        delivered=Math.max(delivered,customers.filter(c=>c.state==='eat').length);
        if(i%50===0){render();renderKitchen();}
        if(ordered>2&&cooked>2&&delivered>0)break;
      }
      G.money=12345;G.day=7;save();return {ordered,cooked,delivered,saved:loadSave()};
    });
    console.log('Simulation', {ordered:simulation.ordered,cooked:simulation.cooked,delivered:simulation.delivered});
    assert(simulation.ordered>0);assert(simulation.cooked>0);assert(simulation.delivered>0);
    await p.reload();await p.evaluate(()=>artworkReady);await p.locator('#mCont').click();
    const restored=await p.evaluate(()=>({money:G.money,day:G.day,ponta:G.ponta,stock:G.stock,menu:G.menu,key:SAVE_KEY}));
    assert.equal(restored.money,12345);assert.equal(restored.day,7);assert.equal(restored.ponta,true);assert.deepEqual(restored.menu,simulation.saved.menu);assert.deepEqual(restored.stock,simulation.saved.stock);assert.equal(restored.key,'grio-cafe-v1');
    for(const id of ['btnShop','btnCats','btnStock','btnNyaimee','btnNyax']){
      await p.evaluate(()=>{talking=null;talkQ.length=0;$('talk').hidden=true;closeModal();});await p.locator('#'+id).click();assert(await p.locator('#modal').isVisible());
    }
    await p.evaluate(()=>{
      closeModal();talking=null;talkQ.length=0;$('talk').hidden=true;
      Object.assign(G.furniture,{table:6,stool:3,plant:3,cushion:4,tower:1,shelf:1,rug:1,lamp:1});
      G.staff=true;buildSeats();customers=[];
      for(const [n,seat] of seats.entries()){
        if(seat.counter&&n%2)continue;const c={seat,x:seat.x,y:seat.y,state:n%4?'order':'eat',order:MENU[0],t:100,pat:600,maxPat:760,spr:makePerson(randomLook()),anim:0,quality:'normal'};
        seat.cust=c;customers.push(c);
      }
      render();renderKitchen();
    });
    await p.screenshot({path:path.join(artifacts,'renewed-cafe.png')});
    const kitchenArt = await p.evaluate(() => {
      for (const m of MENU) { const im=KitchenArt.food(m.id); if(im.width!==32||im.height!==32||!im.getContext('2d').getImageData(0,0,32,32).data.some((v,i)=>i%4===3&&v)) throw Error('Missing food '+m.id); }
      const sheet=document.createElement('canvas');sheet.width=KW;sheet.height=KH*4+64;const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
      g.fillStyle='#f6edda';g.fillRect(0,0,448,64);MENU.forEach((m,i)=>g.drawImage(KitchenArt.food(m.id),i*64,0,64,64));
      G.kitchen={drink:2,stove:2,oven:2};
      for(let phase=0;phase<4;phase++){
        jobs=[];
        for(const [n,u] of kitchenUnits().entries()){
          const items=MENU.filter(m=>m.st===u.st),item=items[u.i%items.length];
          if(phase)jobs.push({id:n,c:{vip:false},item,st:u.st,unit:u.i,state:'cook',dur:item.time,t:item.time*[0,.3,.8,.99][phase],missed:phase===3});
        }
        MENU.slice(0,6).forEach((item,n)=>jobs.push({id:20+n,item,c:{vip:false},state:'ready',readyT:n===5?COLD_AFTER+1:0,q:n===0?'perfect':'normal'}));
        renderKitchen();g.drawImage(kcv,0,64+phase*KH,KW,KH);
      }
      jobs=[];
      return sheet.toDataURL().split(',')[1];
    });
    fs.writeFileSync(path.join(artifacts,'kitchen-art.png'),Buffer.from(kitchenArt,'base64'));
    console.log('PASS all seven food assets; doubled equipment at idle, cooking, timing zone and missed timing');
    await p.goto(new URL('animation-preview.html',base).href);await p.waitForFunction(()=>document.querySelectorAll('.card').length===56);await p.screenshot({path:path.join(artifacts,'gallery.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('PASS all frames, carrying walk, ordering/cooking/delivery, save reload and UI panels; no runtime errors');
  } finally {await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
