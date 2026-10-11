/* Hand-drawn integer-pixel food assets, shared by tickets, tables and serving. */
(function(){
  const cache={};
  function food(id){
    if(cache[id])return cache[id];
    const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');
    const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    const e=(x,y,rx,ry,col)=>{for(let dy=-ry;dy<=ry;dy++){const hw=Math.floor(rx*Math.sqrt(Math.max(0,1-dy*dy/(ry*ry))));r(x-hw,y+dy,hw*2+1,1,col);}};
    const plate=()=>{e(16,26,14,4,'#8daba5');e(16,25,14,3,'#fff4db');e(16,25,10,2,'#ddd8bc');};
    if(id==='coffee'){
      plate();e(25,18,5,5,'#735440');e(25,18,3,3,'#e8c897');e(25,18,2,2,'#00000000');
      r(6,12,18,10,'#8eaea5');e(15,22,8,3,'#70938b');r(7,13,15,9,'#e7efda');r(8,14,3,7,'#fff9e8');
      e(15,12,9,3,'#fff5dc');e(15,12,7,2,'#603a26');e(15,12,4,1,'#bd8b52');r(14,11,3,2,'#f7ddb0');
      r(11,3,1,4,'#b4c2b8');r(12,2,1,2,'#b4c2b8');r(18,5,1,4,'#b4c2b8');
    }else if(id==='tea'){
      e(16,28,9,2,'#adc1b5');r(7,6,18,20,'#8baaa4');r(9,7,14,18,'#deece0');r(10,12,12,12,'#b77231');r(10,12,12,3,'#e7b656');
      r(11,16,4,4,'#edd5a0');r(17,20,3,3,'#eedbb4');r(9,8,2,17,'#fff9dc');r(20,2,2,13,'#b85e56');e(22,10,5,5,'#e4b943');e(22,10,3,3,'#fff1a1');r(22,7,1,7,'#dab75e');
    }else if(id==='cake'){
      plate();r(7,15,20,10,'#bb8449');r(7,16,18,8,'#f1ca80');r(7,19,18,2,'#fff8e2');r(10,19,3,2,'#bf4d46');r(19,19,3,2,'#bf4d46');
      for(let x=6;x<27;x++)r(x,15-Math.floor((x-6)/3),1,3,'#fff9e9');r(25,10,2,14,'#e1b76d');
      e(20,7,4,5,'#ad3f36');e(19,6,3,4,'#e76c50');r(18,4,1,2,'#ffe0a1');r(22,7,1,1,'#ffcd87');r(18,2,5,2,'#557c45');
    }else if(id==='pancake'){
      plate();for(const y of [22,17,12]){e(16,y,11,4,'#995d30');e(16,y-1,11,3,'#e5ac5c');e(15,y-2,9,2,'#f5ce81');}e(16,10,7,2,'#b77535');r(8,11,2,8,'#b77535');r(22,12,2,5,'#b77535');r(13,6,7,4,'#e5b84f');r(13,6,7,2,'#fff1aa');r(13,6,2,3,'#fff8d5');
    }else if(id==='omurice'){
      plate();e(15,20,11,6,'#c58930');e(15,18,11,6,'#edbd43');e(13,16,8,3,'#ffdb6e');e(11,15,4,1,'#fff1ac');
      for(let x=8;x<23;x++)r(x,17+Math.round(Math.sin(x)*1.5),1,2,'#bd4d35');e(26,22,3,2,'#587c43');r(25,20,2,3,'#a3b26a');
    }else if(id==='cookie'){
      plate();e(16,17,10,9,'#aa703b');r(7,6,6,10,'#aa703b');r(20,6,6,10,'#aa703b');e(16,16,9,8,'#e5b670');r(8,8,4,6,'#e5b670');r(21,8,4,6,'#e5b670');
      r(11,15,2,3,'#68412d');r(20,15,2,3,'#68412d');r(15,19,3,1,'#9d543a');r(16,20,1,2,'#68412d');r(13,22,3,1,'#68412d');r(17,22,3,1,'#68412d');r(9,20,2,1,'#fff0c7');r(22,20,2,1,'#fff0c7');
    }else if(id==='parfait'){
      e(16,29,7,2,'#9bb8b0');r(15,24,3,5,'#d1dfd2');
      for(let y=10;y<25;y++){const hw=9-Math.floor((y-10)/3);r(16-hw,y,hw*2+1,1,'#8eaba5');r(17-hw,y,hw*2-1,1,y>21?'#b98c51':y>18?'#e4af8f':y>15?'#c86c61':y>12?'#fff2d4':'#e8a395');r(17-hw,y,1,1,'#f9f4dc');}
      e(16,9,9,3,'#fff0d1');e(15,6,6,3,'#fff8e8');e(16,3,3,2,'#fff8e8');e(22,5,3,4,'#c45243');r(21,3,1,2,'#ffc89a');r(21,1,3,1,'#587c43');r(7,1,3,8,'#b87c41');r(7,2,1,6,'#e8bc76');
    }
    return cache[id]=c;
  }
  window.KitchenArt={food};
})();
