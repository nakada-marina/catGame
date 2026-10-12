/* Focused counter-seat browser checks. Playwright, CHROMIUM_PATH and BASE_URL. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.join(__dirname, '..'), artifacts = path.join(require('node:os').tmpdir(), 'catgame-counter-check');
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  let server, browser;
  const base = process.env.BASE_URL || 'http://127.0.0.1:8770/';
  try {
    if (!process.env.BASE_URL) {
      server = http.createServer((req, res) => {
        const name = new URL(req.url, base).pathname, file = path.join(root, name === '/' ? 'index.html' : name);
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        try {
          res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'text/html');
          res.end(fs.readFileSync(file));
        } catch { res.writeHead(404); res.end(); }
      });
      await new Promise(resolve => server.listen(8770, '127.0.0.1', resolve));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-gpu'] } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.evaluate(() => artworkReady);
    assert.equal(await page.evaluate(() => CounterArt.load), true);
    const frames = await page.evaluate(() => [0,1,2,3].map(guest => {
      const c = CounterArt.person({ guest }), data = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      return { seated: c.counterSeated, bottom: data.some((v,i) => i%4===3 && Math.floor(i/4/c.width)>c.height-6 && v), transparent: data[3]===0, image:c.toDataURL() };
    }));
    assert(frames.every(f => f.seated && f.bottom && f.transparent));
    assert.equal(new Set(frames.map(f => f.image)).size, 4);
    await page.locator('#mNew').click();
    await page.evaluate(() => {
      finishFirstGuide(true); talking=null; talkQ.length=0; $('talk').hidden=true; closeModal();
      G = newSave(); G.flags = { intro:true,firstCustomerDone:true,register:true,cook:true };
      G.furniture.table=6; G.furniture.stool=3; G.kitchen={drink:2,stove:2,oven:2};
      buildSeats(); spawnCats(); startDay(); cats=[]; ponta=null; customers=[]; spawnTimer=100000;
      for(const [i,seat]of seats.entries()) {
        const look={...randomLook(),guest:i%4},c={seat,x:seat.x,y:seat.y,state:'eat',order:MENU[0],t:100,pat:760,maxPat:760,look,spr:makePerson(look),anim:0,quality:'normal',receivedItems:[MENU[0]]};
        seat.cust=c; customers.push(c);
      }
      mode='report'; fitLayout(); render();
      window.counterDraws=[];
      const draw=SpriteRaster.draw;
      SpriteRaster.draw=function(g,img,x,y,w,h) {
        if(img.counterSeated && g.canvas===cv) {
          const m=g.getTransform(),unit=cv.width/FW;
          window.counterDraws.push({x:(m.a*x+m.e)/unit,y:(m.d*y+m.f)/unit,w,h,crop:img.spriteSource.crop});
          window.counterDraws=window.counterDraws.slice(-3);
        }
        return draw(g,img,x,y,w,h);
      };
    });
    for(const [width,height]of [[1280,900],[393,852],[320,568],[844,390]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => {fitLayout();render();});
      const drawn=await page.evaluate(()=>({guests:window.counterDraws,height:VH,room:cv.getBoundingClientRect().toJSON()}));
      assert.equal(drawn.guests.length,3);
      for(const c of drawn.guests) {
        assert.equal(c.w,48);assert.equal(c.h,80);
        assert(c.x>=302-.001 && c.x+c.w<=448+.001 && c.y>131 && c.y+c.h<=drawn.height+.001, 'complete seated guest clears appliances and canvas edges');
        assert(c.crop[2]>0&&c.crop[3]>0);
      }
      // Canvas exposes float32 transforms; tolerate less than a thousandth of a pixel.
      for(let i=1;i<3;i++)assert(drawn.guests[i-1].x+drawn.guests[i-1].w<=drawn.guests[i].x+.001,'three guests do not overlap: '+JSON.stringify(drawn.guests));
      assert(drawn.room.bottom<=height+1 && drawn.room.right<=width+1);
      await page.locator('#cafe').screenshot({path:path.join(artifacts,'counter-'+width+'.png')});
    }
    console.log('PASS all four seated-on-stool identities and complete counter guests, maximum furniture, PC/mobile layouts');
    await page.setViewportSize({width:393,height:852});
    await page.evaluate(() => {
      G=newSave();G.flags={intro:true,firstCustomerDone:true,register:true,cook:true};G.furniture.stool=3;
      buildSeats();spawnCats();startDay();cats=[];ponta=null;customers=[];jobs=[];spawnTimer=100000;
      const seat=seats.find(s=>s.counter),look={...randomLook(),guest:3};
      const c={seat,x:seat.x,y:seat.y,state:'order',order:MENU[0],t:31,anim:0,pat:760,maxPat:760,visits:2,paymentMethod:'cash',look,spr:makePerson(look)};
      seat.cust=c;customers=[c];window.counterCustomer=c;window.counterSeat=seat;fitLayout();render();
    });
    async function cafeTap(x,y) {
      const point=await page.evaluate(({x,y})=>{const r=cv.getBoundingClientRect();return{x:r.left+3+x/FW*(r.width-6),y:r.top+3+y/VH*(r.height-6)};},{x,y});
      await page.mouse.click(point.x,point.y);
    }
    async function kitchenTap(x,y) {
      const point=await page.evaluate(({x,y})=>{const r=kcv.getBoundingClientRect();return{x:r.left+3+x/KW*(r.width-6),y:r.top+3+y/KH*(r.height-6)};},{x,y});
      await page.mouse.click(point.x,point.y);
    }
    const orderPoint=await page.evaluate(()=>({x:counterSeat.x*2,y:counterSeat.y-120+15}));
    await cafeTap(orderPoint.x,orderPoint.y);
    assert.equal(await page.evaluate(()=>counterCustomer.state),'wait');
    const machine=await page.evaluate(()=>{const u=kitchenUnits().find(u=>u.st==='drink');return{x:u.x+u.w/2,y:u.y+35};});
    await kitchenTap(machine.x,machine.y);
    assert.equal(await page.evaluate(()=>jobs[0].state),'cook');
    await page.evaluate(()=>{jobs[0].t=jobs[0].dur*.75;});
    await kitchenTap(machine.x,machine.y);
    assert.equal(await page.evaluate(()=>jobs[0].state),'ready');
    const shelf=await page.evaluate(()=>{const s=passSlots()[0];return{x:s.x+14,y:s.y-4};});
    await kitchenTap(shelf.x,shelf.y);
    assert.equal(await page.evaluate(()=>counterCustomer.state),'eat');
    const payment=await page.evaluate(()=>{
      const c=counterCustomer;c.t=420;updateCustomer(c);updateCheckout();
      c.x=REGISTER.queueX;c.y=REGISTER.queueY;c.state='checkout';c.t=0;
      return{money:G.money,total:c.bill.total,x:REGISTER.x*2,y:REGISTER.y};
    });
    await cafeTap(payment.x,payment.y);
    assert.equal(await page.evaluate(()=>G.money),payment.money+payment.total);
    assert(await page.evaluate(()=>counterSeat.dirty));
    await cafeTap(await page.evaluate(()=>counterSeat.itemX*2-15),await page.evaluate(()=>counterSeat.itemY));
    assert.equal(await page.evaluate(()=>counterSeat.dirty),false);
    assert.equal(await page.evaluate(()=>CafeService.init(G).dirty.cup),1);
    await page.evaluate(()=>save());
    await page.reload();await page.evaluate(()=>artworkReady);await page.locator('#mCont').click();
    assert.equal(await page.evaluate(()=>G.furniture.stool),3);
    assert.equal(await page.evaluate(()=>G.money),payment.money+payment.total);
    assert.equal(await page.evaluate(()=>seats.filter(s=>s.counter).length),3);
    assert.deepEqual(errors,[]);
    console.log('PASS real counter order/cook/delivery/payment/dirty-plate taps and save/resume; no runtime errors');
  } finally {
    if(browser)await browser.close();
    if(server)await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
