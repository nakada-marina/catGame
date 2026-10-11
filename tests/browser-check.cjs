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
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base); await page.evaluate(() => artworkReady);
      await page.locator('#mNew').click();
      await page.evaluate(() => { talking=null; talkQ.length=0; $('talk').hidden=true; fitLayout(); render(); renderKitchen(); });
      const result = await page.evaluate(() => {
        const controls = [...$('actions').querySelectorAll('button'), ...$('sub').querySelectorAll('button'),$('kitchenCv')].map(el => el.getBoundingClientRect().toJSON());
        return {controls,width:innerWidth,height:innerHeight,backing:cv.width,physical:cv.getBoundingClientRect().width*devicePixelRatio,atlas:!!CHAR_SPR.grio && !!CHAR_SPR.ponta};
      });
      assert(result.atlas);
      const touch=await page.evaluate(()=>['wrap','talk','actions','sub','btnFood'].map(id=>getComputedStyle($(id)).touchAction));
      assert(touch.every(v=>v==='manipulation'));
      for (const r of result.controls) { assert(r.left>=0&&r.right<=width+1, 'horizontal clipping'); assert(r.top>=0&&r.bottom<=height+1, `vertical clipping ${width}x${height}`); }
      assert(result.backing>=result.physical-1);
      if (width===393) await page.screenshot({path:path.join(artifacts,'game.png')});
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
        if(colours(raw)!==colours(frames[who][pose]))issues.push(key+' altered or clipped pixels');
      }
      for(const who of ['grio','ponta'])for(const [pose,im] of Object.entries(frames[who])){
        if(pose.startsWith('f_'))continue;
        if(im.width!==81||im.height!==64)issues.push(`${who}.${pose} dimensions`);
        const alpha=im.getContext('2d').getImageData(0,63,81,1).data;
        if(!alpha.some((v,i)=>i%4===3&&v>0))issues.push(`${who}.${pose} foot baseline`);
      }
      // Motion maps to all four native steps, even when carrying a dish.
      const k={pal:'grio',state:'toServe',carryDish:true,anim:0};
      const walk=[0,9,18,27].map(n=>{k.anim=n;return charPose(k,'walk0');});
      return {issues,walk,portraitCount:Object.keys(frames.grio).filter(k=>k.startsWith('f_')).length};
    });
    assert.deepEqual(spriteChecks.issues,[]);assert.deepEqual(spriteChecks.walk,['walk0','walk1','walk2','walk3']);assert.equal(spriteChecks.portraitCount,8);
    await p.locator('#mNew').click();
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
    await p.goto(new URL('animation-preview.html',base).href);await p.waitForFunction(()=>document.querySelectorAll('.card').length===45);await p.screenshot({path:path.join(artifacts,'gallery.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('PASS all frames, carrying walk, ordering/cooking/delivery, save reload and UI panels; no runtime errors');
  } finally {await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
