/* Detailed guest sprites. Source generated from the cat reference's warm pixel-art style.
 * Source alpha is preserved; the atlas is cropped, never stretched on one axis. */
(function(){
 const img=new Image(),cache=new Map();let ready=false;
 const bounds=[[[176,39,361,380],[492,15,670,380],[827,43,1021,380],[1154,34,1380,380]],[[175,413,360,705],[493,392,669,705],[826,418,1021,705],[1151,407,1373,705]],[[176,730,368,998],[486,715,677,997],[831,742,1015,998],[1152,727,1376,997]]];
 const load=new Promise((resolve,reject)=>{img.onload=()=>{ready=true;resolve();};img.onerror=()=>reject(Error('Guest atlas failed to load'));});img.src='./guest-atlas.webp?v=20261012-detail';
 function person(look,frame){
  if(!ready)return null;
  const n=Number.isInteger(look.guest)?look.guest:((parseInt(look.hair.slice(1),16)+parseInt(look.shirt.slice(1),16))%4),row=frame==='back'?2:['sit','blink','eat','chew'].includes(frame)?1:0;
  const key=n+':'+frame;if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=96;c.height=(row===0?72:row===1?66:54)*2;c.logicalWidth=48;c.logicalHeight=c.height/2;c.guestDetail=true;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const [x,y,x1,y1]=bounds[row][n],h=c.height-4,w=Math.round((x1-x)/(y1-y)*h),dx=Math.round((96-w)/2);
  g.drawImage(img,x,y,x1-x,y1-y,dx,2,w,h);
  // Keep the original face/body pixel-identical throughout walking; move only shoes.
  if(frame==='b'||frame==='c'){
    const feet=document.createElement('canvas');feet.width=96;feet.height=18;feet.getContext('2d').drawImage(c,0,c.height-18,96,18,0,0,96,18);
    g.clearRect(0,c.height-18,96,18);const step=frame==='b'?2:-2;
    g.drawImage(feet,0,0,48,18,step,c.height-18,48,18);g.drawImage(feet,48,0,48,18,48-step,c.height-18,48,18);
  }
  cache.set(key,c);return c;
 }
 window.GuestArt={load,person};
})();
