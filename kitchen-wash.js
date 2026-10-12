/* Integer-pixel washing station for the lower kitchen counter. */
(function(){
  'use strict';
  const bounds=Object.freeze({x:8,y:168,w:432,h:88});
  const sum=n=>Object.values(n).reduce((a,b)=>a+b,0);
  function hit(x,y){return x>=bounds.x&&x<bounds.x+bounds.w&&y>=bounds.y&&y<bounds.y+bounds.h;}
  function draw(ctx,w){
    const waiting=sum(w.dirty),washing=w.wash?sum(w.wash.items):0;
    const t=w.wash?w.wash.t:0;
    const r=(col,x,y,width=1,height=1)=>{ctx.fillStyle=col;ctx.fillRect(x,y,width,height);};
    const text=(s,x,y,size=10,col='#f9efd8')=>{
      ctx.font=size+'px "DotGothic16", monospace';ctx.textAlign='center';ctx.textBaseline='top';
      ctx.fillStyle='#3b3027';ctx.fillText(s,x+1,y+1);ctx.fillStyle=col;ctx.fillText(s,x,y);
    };
    const plate=(x,y,dirty=true)=>{
      r('#688d86',x+3,y,28,1);r('#688d86',x,y+1,34,3);r('#e8edda',x+1,y+1,32,2);
      r('#fff7e3',x+4,y+1,26,1);r('#9db7a6',x+3,y+3,28,1);
      if(dirty){r('#a06c48',x+13,y+1,5,1);r('#bd8f55',x+23,y+2,3,1);}
    };
    const cup=(x,y,dirty=true)=>{
      r('#71968d',x,y,11,12);r('#e5edda',x+1,y+2,9,9);r('#fff6df',x+2,y+3,2,6);
      r('#fff3d8',x+1,y,9,2);r(dirty?'#79513a':'#b5d6d0',x+2,y+1,7,1);
      r('#71968d',x+11,y+3,3,6);r('#e5edda',x+11,y+4,2,4);r('#9eb4a4',x+1,y+11,9,1);
      if(dirty)r('#b88c59',x+7,y+6,2,3);
    };
    const fork=(x,y,dirty=true)=>{
      r('#687f80',x+1,y+6,2,15);r('#b9c9c1',x+1,y+6,1,14);
      r('#687f80',x,y+4,4,3);for(let i=0;i<4;i+=2)r('#d8e3d8',x+i,y,1,5);
      if(dirty)r('#a47a50',x+2,y+4,2,2);
    };
    ctx.save();ctx.imageSmoothingEnabled=false;
    // A separate lower counter keeps the sink clear of every cooking unit.
    r('#513d2c',0,166,448,2);r('#eee3cc',0,168,448,44);
    for(let y=170;y<211;y+=14){r('#d7c9ae',0,y+13,448,1);for(let x=(y===184?16:0);x<448;x+=32)r('#d7c9ae',x,y,1,13);}
    r('#d1c6ac',0,212,448,9);r('#fff0d3',0,212,448,2);r('#927555',0,220,448,1);
    r('#805c40',0,221,448,35);r('#b28a60',0,222,448,2);
    for(let x=8;x<448;x+=56){r('#67462e',x,228,48,23);r('#99704b',x+1,229,46,1);r('#c9a675',x+20,231,8,2);}
    text('洗い場',29,170,11,'#f9f1db');
    // Dirty stacks grow independently. Labels retain the exact count above the visual cap.
    r('#b4c6b4',48,211,144,2);
    for(let i=0;i<Math.min(9,w.dirty.plate);i++)plate(54,207-i*4);
    for(let i=0;i<Math.min(9,w.dirty.cup);i++)cup(106+(i%3)*15,198-Math.floor(i/3)*13);
    for(let i=0;i<Math.min(6,w.dirty.fork);i++)fork(160+i*5,190+(i%2)*2);
    text('皿 '+w.dirty.plate,71,239);text('コップ '+w.dirty.cup,128,239);text('フォーク '+w.dirty.fork,179,239,9);
    // Sage metal basin, drain and faucet, drawn with whole-pixel rectangles.
    r('#526f70',198,196,120,32);r('#b9cbc1',200,198,116,27);r('#edf1dd',200,198,116,2);
    r('#7e9b98',204,202,108,20);r('#60817e',205,203,106,2);r('#94b4ac',206,205,104,15);
    r('#bad0c2',207,219,103,2);r('#5a7977',254,215,10,4);r('#c8d6c9',256,215,6,1);
    r('#657f7e',260,174,5,26);r('#c4d3c6',261,175,2,23);
    r('#657f7e',235,173,30,5);r('#e0e6d5',236,174,27,2);r('#657f7e',235,177,5,7);
    r('#d3dfcf',236,178,2,5);r('#658781',268,194,8,4);r('#d6e0cb',269,194,6,1);
    // Soap and sponge stay beside the sink.
    r('#b2c2a5',307,184,9,12);r('#e3ecd1',308,185,7,9);r('#719887',309,181,5,4);r('#719887',306,181,7,2);
    r('#e2c26b',310,211,7,5);r('#f5dda1',310,211,7,2);
    if(w.wash){
      const batch=[];
      for(const key of ['cup','plate','fork'])for(let i=0;i<w.wash.items[key];i++)batch.push(key);
      batch.forEach((key,i)=>{const x=211+i*32;if(key==='cup')cup(x+9,207,false);else if(key==='plate')plate(x,213,false);else fork(x+14,200,false);});
      // Falling water, ripples and suds use wash time, so pausing freezes the illustration.
      for(let i=0;i<6;i++)r(i%2?'#d7f1e8':'#a4d7d9',236,184+((t+i*5)%28),2,4);
      for(let i=0;i<12;i++){
        const x=211+(i*17+Math.floor(t/8)*3)%94,y=210+(i*7+Math.floor(t/6))%10;
        r('#dff2e7',x,y,4,2);r('#fff9e6',x+1,y-1,2,1);
      }
      r('#c1e4db',214+Math.floor(t/5)%15,218,23,1);
    }
    text('シンク',258,239,11);
    // State and remaining time are visible without opening the inventory panel.
    const edge=w.wash?'#6c9485':waiting?'#77925b':'#b29771';
    r('#614932',328,170,110,65);r(edge,330,172,106,61);r('#3f5748',333,175,100,55);
    text(w.wash?'洗っています':waiting?'タップで洗う':'食器はきれい',383,179,11);
    text('待ち '+waiting+'・洗浄 '+washing,383,198,10,'#e7e4c4');
    text(w.wash?'あと '+Math.ceil((w.wash.duration-t)/60)+'秒':waiting?'3個ずつ洗えます':'すべて洗浄済み',383,212,10);
    if(w.wash){
      r('#263e35',336,226,94,4);r('#c8d4b3',337,227,92,2);
      r('#83b6a1',337,227,Math.round(92*Math.min(1,t/w.wash.duration)),2);
    }
    text('食器の追加はショップへ',383,242,9);
    ctx.restore();
  }
  window.KitchenWash={bounds,hit,draw};
})();
