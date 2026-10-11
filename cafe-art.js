/* Native-resolution pixel artwork. Integer pixels; no SVG or scale2x filter. */
(function(){
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function painter(c){const g=c.getContext('2d');return {
    r(x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},
    e(cx,cy,rx,ry,col){g.fillStyle=col;for(let y=-ry;y<=ry;y++){const n=Math.floor(rx*Math.sqrt(Math.max(0,1-y*y/(ry*ry))));g.fillRect(cx-n,cy+y,n*2+1,1);}},
    g
  };}
  function shade(hex,n){return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*n))).toString(16).padStart(2,'0')).join('');}
  function outline(c,col){const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height),out=g.createImageData(c.width,c.height);out.data.set(d.data);const rgb=[1,3,5].map(i=>parseInt(col.slice(i,i+2),16));for(let y=1;y<c.height-1;y++)for(let x=1;x<c.width-1;x++){const i=(y*c.width+x)*4;if(d.data[i+3])continue;if([[0,-1],[-1,0],[1,0],[0,1]].some(([a,b])=>d.data[((y+b)*c.width+x+a)*4+3]))out.data.set([...rgb,255],i);}g.putImageData(out,0,0);return c;}
  function person(look,frame,apron){
    const seated=['sit','blink','eat','chew','back'].includes(frame),back=frame==='back';
    const c=canvas(48,seated?(back?54:66):72),p=painter(c),r=p.r,e=p.e;
    const skin=look.skin,hair=look.hair,shirt=look.shirt,pants=look.pants;
    const dark='#49352c',ss=shade(skin,.83),hs=shade(hair,.72),hl=shade(hair,1.28),cloth=shade(shirt,.76);
    // Back hair, tailored shoulders and softly shaded sleeves.
    if(look.long){e(24,21,17,19,hs);r(8,24,32,23,hs);r(10,29,2,16,hl);r(36,22,2,22,hair);}
    e(24,39,15,9,shirt);r(13,38,23,seated?14:21,shirt);r(33,40,3,seated?12:18,cloth);
    const a=frame==='b'?2:frame==='c'?-2:0;
    r(8,39+a,5,13,cloth);r(9,39+a,2,10,shirt);e(10,53+a,2,3,skin);
    if(frame==='eat'){r(35,38,5,8,cloth);r(31,35,8,5,shirt);e(31,34,3,3,skin);r(29,26,1,9,'#a5a7a0');r(28,25,3,2,'#eee9da');}
    else{r(36,39-a,5,13,cloth);r(36,40-a,2,8,shirt);e(38,53-a,2,3,ss);}
    r(20,32,8,7,ss);r(21,33,5,4,skin);
    // Cream collar, buttons, seam and a pocket give readable clothing detail.
    r(15,38,6,2,'#f8ecd8');r(27,38,6,2,'#f8ecd8');r(20,40,2,2,'#f8ecd8');r(26,40,2,2,'#f8ecd8');
    r(23,42,1,14,cloth);for(let y=44;y<56;y+=4)r(24,y,1,1,'#fff1cf');
    r(28,45,5,5,cloth);r(28,45,5,1,shade(shirt,1.2));r(14,56,19,2,cloth);
    if(apron){r(17,42,15,17,'#89583a');r(17,42,15,2,'#c3905b');r(18,38,2,6,'#89583a');r(29,38,2,6,'#89583a');r(20,50,9,6,'#6a442f');r(20,50,9,1,'#d6aa70');r(17,58,15,1,'#c3905b');}
    if(seated&&!back){
      // Seated hips at row 49; knees bend forward, feet stay below the seat.
      e(24,50,11,4,pants);r(13,49,22,4,pants);r(14,52,8,7,pants);r(27,52,8,7,pants);
      r(14,52,2,6,shade(pants,1.18));r(33,52,2,7,shade(pants,.72));
      r(16,57,6,6,pants);r(27,57,6,6,pants);
      r(14,62,9,3,'#49352c');r(26,62,9,3,'#49352c');r(15,62,6,1,'#987351');r(27,62,6,1,'#987351');
      // Relaxed forearms lie on the tabletop rather than hanging vertically.
      r(8,40,5,8,cloth);r(9,40,2,6,shirt);r(35,40,5,8,cloth);r(35,40,2,6,shirt);
      e(12,47,3,2,skin);e(36,47,3,2,ss);
    }
    if(!seated){r(15,59,18,4,pants);r(23,59,2,4,shade(pants,.7));for(const [x,n] of [[15,a],[26,-a]]){r(x,62,7,7-Math.abs(n),pants);r(x+5,62,2,6-Math.abs(n),shade(pants,.7));r(x-1,68-Math.abs(n),9,3,'#4c3730');r(x,68-Math.abs(n),7,1,'#896853');r(x-1,71-Math.abs(n),9,1,'#dec7a1');}}
    // Stable head anatomy for every walking step; only arms/feet change.
    e(24,20,14,16,skin);e(11,22,2,4,skin);e(37,22,2,4,ss);r(12,21,1,3,ss);r(37,22,1,3,'#c18c70');
    e(24,12,15,10,hair);e(20,7,9,3,hl);r(10,12,4,12,hs);r(35,12,3,13,hs);
    for(let x=13;x<35;x+=4){r(x,13,3,3+(x%3),hair);r(x,10,1,3,hl);}
    if(look.long){r(9,20,3,15,hair);r(37,19,3,18,hair);r(10,24,1,9,hl);}
    if(back){e(24,20,14,15,hair);for(let x=14;x<35;x+=4)r(x,15,1,14,hl);}
    else{
      r(16,19,5,1,hs);r(28,19,5,1,hs);
      if(frame==='blink'){r(16,24,5,1,dark);r(28,24,5,1,dark);}else{r(16,22,5,1,dark);r(28,22,5,1,dark);r(17,23,3,4,dark);r(29,23,3,4,dark);r(17,22,1,2,'#fff6e6');r(29,22,1,2,'#fff6e6');r(17,27,3,1,ss);r(29,27,3,1,ss);}
      r(14,28,5,2,'#e6a58c');r(30,28,5,2,'#e6a58c');r(24,26,2,3,ss);r(24,26,1,2,'#ffe4bf');
      r(22,31,1,1,'#995c50');r(27,31,1,1,'#995c50');r(23,32,4,1,'#995c50');r(23,33,4,1,shade(skin,.92));if(frame==='eat'){r(23,31,4,3,'#80483d');r(24,33,2,1,'#e4a48b');}
    }
    return outline(c,dark);
  }
  const furniture={};
  function table(){
    if(furniture.table)return furniture.table;
    const c=canvas(88,52),p=painter(c),r=p.r,e=p.e;
    // Four tapered walnut legs, mortise joints, curved apron and thick oak top.
    for(const x of [17,64]){r(x,22,5,25,'#503324');r(x+1,23,2,23,'#9b6b43');r(x-1,46,7,3,'#382a22');}
    r(20,27,48,7,'#774b30');r(20,27,48,1,'#c68d59');r(22,30,44,1,'#895c3c');
    e(44,18,39,10,'#513627');e(44,15,39,10,'#a16d43');e(44,12,38,9,'#cf9c64');e(44,10,34,6,'#dfb47b');
    for(let row=0;row<4;row++){const y=7+row*4,w=[49,66,61,37][row];r(44-w/2,y,w,1,'#b78050');r(44-w/2+2,y+1,w-5,1,'#e5bc84');}
    for(const [x,y,w] of [[24,8,13],[49,12,19],[18,15,11],[38,17,13]]){r(x,y,w,1,'#c28f5c');r(x+2,y+1,w-4,1,'#d6a76f');}
    e(60,8,3,1,'#b67d4e');r(9,17,70,1,'#e9bd84');r(15,23,58,1,'#bd8956');
    return furniture.table=outline(c,'#433024');
  }
  function chair(){
    if(furniture.chair)return furniture.chair;
    const c=canvas(38,58),p=painter(c),r=p.r;
    r(5,5,4,49,'#674630');r(29,5,4,49,'#674630');r(6,7,1,46,'#c3915c');r(30,7,1,46,'#bd8956');
    r(7,4,24,7,'#9c6d45');r(7,4,24,1,'#d7ad76');r(10,7,18,1,'#ad7e50');
    for(const x of [12,18,24]){r(x,12,2,20,'#80583a');r(x,12,1,19,'#b78858');}
    r(4,33,30,7,'#51392a');r(5,33,28,4,'#b48a5f');r(8,31,22,4,'#c6a982');r(8,31,22,1,'#ead5ac');r(6,38,26,1,'#d5af7c');
    r(9,41,3,13,'#80583a');r(27,41,3,13,'#80583a');r(9,48,21,2,'#9b704b');r(4,54,6,2,'#473329');r(29,54,6,2,'#473329');
    return furniture.chair=outline(c,'#433024');
  }
  function stool(){if(furniture.stool)return furniture.stool;const c=canvas(34,34),p=painter(c),r=p.r,e=p.e;
    for(const x of [8,24]){r(x,10,2,20,'#645347');r(x,10,1,20,'#c49a66');}r(9,24,16,2,'#8c6d4f');e(17,9,13,5,'#644631');e(17,6,13,5,'#ad8661');e(16,5,11,3,'#cfb18a');r(7,6,20,1,'#e4c99e');return furniture.stool=outline(c,'#433024');}
  window.CafeArt={person,table,chair,stool};
})();
