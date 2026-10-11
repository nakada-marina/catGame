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
      try { const data = fs.readFileSync(file); res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.webp') ? 'image/webp' : 'text/html'); res.end(data); }
      catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(8765, '127.0.0.1', resolve));
  }
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu']} : {})});
  const errors = [];
  try {
    for (const [width,height,dpr] of [[320,568,2],[375,667,2],[393,852,3],[430,932,3],[1280,900,1]]) {
      const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:width<500,hasTouch:width<500});
      page.on('pageerror', e => {errors.push(e.message);console.error('Runtime error:',e.message);});
      await page.goto(base); await page.evaluate(() => artworkReady);
      await page.locator('#mNew').click();
      await page.waitForFunction(()=>talking!==null);
      const dialogue=await page.evaluate(()=>({bottom:$('talk').getBoundingClientRect().bottom,dockTop:$('dock').getBoundingClientRect().top,top:$('talk').getBoundingClientRect().top}));
      assert(dialogue.top>=0&&dialogue.bottom<=dialogue.dockTop,'dialogue visible above dock');
      await page.evaluate(() => { talking=null; talkQ.length=0; $('talk').hidden=true; fitLayout(); render(); renderKitchen(); });
      const result = await page.evaluate(() => {
        const controls = [...$('actions').querySelectorAll('button'), ...$('sub').querySelectorAll('button')].map(el => el.getBoundingClientRect().toJSON());
        return {controls,width:innerWidth,height:innerHeight,backing:cv.width,physical:cv.getBoundingClientRect().width*devicePixelRatio,atlas:!!CHAR_SPR.grio && !!CHAR_SPR.ponta};
      });
      assert(result.atlas);
      const touch=await page.evaluate(()=>['wrap','talk','actions','sub','btnFood'].map(id=>getComputedStyle($(id)).touchAction));
      assert(touch.every(v=>v==='manipulation'));
      for (const r of result.controls) { assert(r.left>=0&&r.right<=width+1, 'horizontal clipping'); assert(r.top>=0&&r.bottom<=height+1, `vertical clipping ${width}x${height}`); }
      assert(result.backing>=result.physical-1);
      const layout=await page.evaluate(()=>({scene:cv.getBoundingClientRect().width,sceneHeight:cv.getBoundingClientRect().height,wrap:$('wrap').clientWidth,
        grio:catDisplaySize('grio',CHAR_SPR.grio.idle[0]).height, ponta:catDisplaySize('ponta',CHAR_SPR.ponta.idle[0]).height}));
      assert.equal(layout.scene,layout.wrap,'game uses full width instead of height fitting');
      assert(Math.abs(layout.sceneHeight-layout.scene*300/224/2)<2,'cafe height halved without squashing actors');
      assert(layout.grio>64&&layout.ponta<layout.grio,'larger cats; Ponta a little smaller');
      await page.evaluate(()=>{document.body.scrollTop=document.body.scrollHeight;});
      const scrollCheck=await page.evaluate(()=>({bottom:$('dock').getBoundingClientRect().bottom,kitchen:$('kitchenCv').getBoundingClientRect().bottom,top:$('kitchenCv').getBoundingClientRect().top}));
      assert(scrollCheck.bottom<=height+1);assert(scrollCheck.kitchen<=height+1);assert(scrollCheck.top>=0,'kitchen reachable by scrolling');
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
        await page.evaluate(()=>{document.body.scrollTop=0;cats[0].mood=20;mode='open';});
        const catPoint=await page.evaluate(()=>{const r=cv.getBoundingClientRect(),k=cats[0];return {x:r.left+3+k.x/VW*(r.width-6),y:r.top+3+(k.y/2-20)/(VH/2)*(r.height-6)};});
        const before=await page.evaluate(()=>cats[0].mood);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[catPoint]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert((await page.evaluate(()=>cats[0].mood))>before,'cafe tap still pets the enlarged cat');
        const dragBefore=await page.evaluate(()=>cats[0].mood);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[catPoint]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:catPoint.x,y:catPoint.y-90}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert((await page.evaluate(()=>cats[0].mood))<=dragBefore,'scroll must not pet the cat');
        await page.evaluate(()=>{document.body.scrollTop=document.body.scrollHeight;});
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
        console.log('PASS rapid touch buttons execute once; zoom default cancelled; scrolling/pinch preserved');
      }
      console.log(`PASS viewport ${width}x${height} DPR ${dpr}`);
      await page.close();
    }
    const p=await browser.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base);await p.evaluate(()=>artworkReady);
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
        if(!CatDetail.meta[key]&&key!=='ponta.cake'&&!/^walk[123]$/.test(pose)&&colours(raw)!==colours(frames[who][pose]))issues.push(key+' altered or clipped pixels');
      }
      for(const who of ['grio','ponta'])for(const [pose,im] of Object.entries(frames[who])){
        if(pose.startsWith('f_'))continue;
        if(!((im.width===81&&im.height===64)||(im.width===128&&im.height===144)))issues.push(`${who}.${pose} dimensions`);
        const alpha=im.getContext('2d').getImageData(0,im.height-1,im.width,1).data;
        if(!CatDetail.meta[who+'.'+pose]&&!/^walk[123]$/.test(pose)&&!alpha.some((v,i)=>i%4===3&&v>0))issues.push(`${who}.${pose} foot baseline`);
      }
      // Motion maps to all four native steps, even when carrying a dish.
      for(const who of ['grio','ponta']) {
        const face=c=>c.getContext('2d').getImageData(0,0,128,110).data.join(',');
        for(let n=1;n<4;n++)if(face(frames[who].walk0)!==face(frames[who]['walk'+n]))issues.push(who+' walk face changed');
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
    const seatAlignment=await p.evaluate(()=>{const tableY=140,seatY=tableY-8;return {chair:tableY-56+31,faceBottom:seatY-66+36,tableTop:tableY-39+2,person:seatY-CafeArt.person({hair:'#5a3a22',skin:'#f8dcc0',shirt:'#80a890',pants:'#4a4a58'},'sit').height+49};});
    assert.equal(seatAlignment.chair,seatAlignment.person,'seated hips align with chair cushion');
    assert(seatAlignment.faceBottom<=seatAlignment.tableTop,'table must not cover seated mouth');
    assert.deepEqual(newArtwork.furniture,[[88,52],[38,58],[34,34]]);
    console.log('PASS native people all 8 frames; stable walking faces; decor aspect ratios');
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
      const sheet=document.createElement('canvas');sheet.width=448;sheet.height=168*4+64;const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
      g.fillStyle='#f6edda';g.fillRect(0,0,448,64);MENU.forEach((m,i)=>g.drawImage(KitchenArt.food(m.id),i*64,0,64,64));
      G.kitchen={drink:2,stove:2,oven:2};
      for(let phase=0;phase<4;phase++){
        jobs=[];
        for(const [n,u] of kitchenUnits().entries()){
          const items=MENU.filter(m=>m.st===u.st),item=items[u.i%items.length];
          if(phase)jobs.push({id:n,c:{vip:false},item,st:u.st,unit:u.i,state:'cook',dur:item.time,t:item.time*[0,.3,.8,.99][phase],missed:phase===3});
        }
        MENU.slice(0,6).forEach((item,n)=>jobs.push({id:20+n,item,c:{vip:false},state:'ready',readyT:n===5?COLD_AFTER+1:0,q:n===0?'perfect':'normal'}));
        renderKitchen();g.drawImage(kcv,0,64+phase*168,448,168);
      }
      jobs=[];
      return sheet.toDataURL().split(',')[1];
    });
    fs.writeFileSync(path.join(artifacts,'kitchen-art.png'),Buffer.from(kitchenArt,'base64'));
    console.log('PASS all seven food assets; doubled equipment at idle, cooking, timing zone and missed timing');
    await p.goto(new URL('animation-preview.html',base).href);await p.waitForFunction(()=>document.querySelectorAll('.card').length===49);await p.screenshot({path:path.join(artifacts,'gallery.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('PASS all frames, carrying walk, ordering/cooking/delivery, save reload and UI panels; no runtime errors');
  } finally {await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
