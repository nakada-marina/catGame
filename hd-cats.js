/* High-definition transparent cat sprites. Drawn at 2x logical resolution.
   White markings belong to Grio only; Ponta is solid brown tabby. */
(function(){
 const W=72,H=104;
 function build(who,pose,frame){
  const ponta=who==='ponta',moving=pose.startsWith('walk'),sit=['sit','sleepbag','box'].includes(pose);
  const sleep=['sleepbag','box'].includes(pose),jump=pose==='jump';
  const ink='#33271f',fur=ponta?'#74523c':'#8c6547',dark=ponta?'#4d392f':'#5a4336',light=ponta?'#987358':'#b28b68';
  const bib=ponta?'#74523c':'#fff3e6',paw=ponta?'#77563f':'#fff0e4';
  const leg=(frame%2?5:-5),bob=jump?-9:0;
  let s='<svg xmlns="http://www.w3.org/2000/svg" width="72" height="104" viewBox="0 0 72 104">';
  s+='<g stroke-linejoin="round" stroke-linecap="round" transform="translate(0 '+bob+')">';
  // fluffy tail
  s+='<path d="M52 72 Q76 70 66 50 Q58 44 60 59 Q65 72 52 65Z" fill="'+fur+'" stroke="'+ink+'" stroke-width="2.5"/>';
  for(let i=0;i<4;i++)s+='<path d="M'+(58+i*2)+' '+(52+i*4)+' l-6 3" stroke="'+dark+'" stroke-width="2"/>';
  // body and paws
  s+='<path d="M22 55 Q12 70 18 90 Q35 102 54 90 Q59 70 47 54Z" fill="'+fur+'" stroke="'+ink+'" stroke-width="2.8"/>';
  if(!ponta)s+='<path d="M29 57 Q35 53 43 57 L47 86 Q35 92 26 85Z" fill="'+bib+'"/>';
  const step=moving?leg:0;
  s+='<path d="M24 84 Q'+(19+step)+' 91 '+(20+step)+' 98 L34 98 L35 88Z" fill="'+paw+'" stroke="'+ink+'" stroke-width="2.4"/>';
  s+='<path d="M42 86 Q'+(49-step)+' 89 '+(49-step)+' 98 L36 98 L36 88Z" fill="'+paw+'" stroke="'+ink+'" stroke-width="2.4"/>';
  // apron
  s+='<path d="M25 64 L47 64 L50 91 Q36 96 22 91Z" fill="#46342f" stroke="'+ink+'" stroke-width="2"/>';
  s+='<path d="M30 63 L29 54 M43 63 L44 54" stroke="#cf9d6e" stroke-width="3"/>';
  s+='<path d="M28 77 L44 77 L43 88 L29 88Z" fill="#71503b" stroke="#a87854" stroke-width="1.5"/>';
  // arms with walking swing
  s+='<path d="M23 66 Q'+(15+step)+' 70 '+(17+step)+' 82 Q22 87 26 79" fill="'+fur+'" stroke="'+ink+'" stroke-width="2.8"/>';
  s+='<path d="M49 66 Q'+(55-step)+' 70 '+(53-step)+' 82 Q49 87 46 79" fill="'+fur+'" stroke="'+ink+'" stroke-width="2.8"/>';
  if(!ponta)s+='<path d="M17 78 Q19 85 25 81 L25 77Z M47 79 Q51 85 54 79 L53 76Z" fill="'+paw+'"/>';
  // head and ears
  s+='<path d="M13 31 L12 7 Q19 6 27 17 Q36 13 45 17 Q53 5 61 8 L59 32 Q65 50 54 59 Q36 69 18 58 Q7 50 13 31Z" fill="'+fur+'" stroke="'+ink+'" stroke-width="3"/>';
  s+='<path d="M16 25 L16 12 L26 23Z M48 22 L57 12 L57 26Z" fill="#c98680"/>';
  if(ponta){
   for(let i=0;i<6;i++){const y=28+i*5;s+='<path d="M14 '+y+' l-6 4 8 2 M57 '+y+' l7 4 -8 2" stroke="'+dark+'" stroke-width="2.5" fill="none"/>';}
  }
  // stripes
  s+='<path d="M27 20 L31 29 M36 19 L36 29 M44 20 L41 29 M16 36 L25 39 M56 36 L47 39" fill="none" stroke="'+dark+'" stroke-width="3.5"/>';
  if(!ponta)s+='<path d="M24 47 Q36 40 48 47 L50 57 Q36 66 21 57Z" fill="#fff2e7"/>';
  else s+='<path d="M24 48 Q36 44 48 48 L48 57 Q36 62 24 57Z" fill="'+light+'"/>';
  // eyes and highlights
  if(sleep){s+='<path d="M22 41 Q27 46 32 41 M41 41 Q46 46 51 41" stroke="'+ink+'" stroke-width="2.6" fill="none"/>';}
  else {s+='<ellipse cx="27" cy="42" rx="6" ry="7" fill="#e6bb64" stroke="'+ink+'" stroke-width="2"/><ellipse cx="46" cy="42" rx="6" ry="7" fill="#e6bb64" stroke="'+ink+'" stroke-width="2"/><ellipse cx="28" cy="42" rx="2.4" ry="5.2" fill="#272b1d"/><ellipse cx="45" cy="42" rx="2.4" ry="5.2" fill="#272b1d"/><circle cx="29" cy="39" r="1.6" fill="#fff"/><circle cx="46" cy="39" r="1.6" fill="#fff"/>';}
  // nose, mouth and whiskers ALWAYS topmost
  s+='<path d="M33 51 Q36 49 39 51 L36 54Z" fill="#c77c79" stroke="'+ink+'" stroke-width=".8"/>';
  s+='<path d="M36 54 v3 m0 0 q-4 4-7 0 m7 0 q4 4 7 0" fill="none" stroke="'+ink+'" stroke-width="1.5"/>';
  s+='<path d="M21 53 L9 50 M21 56 L9 57 M51 53 L63 50 M51 56 L63 57" stroke="'+ink+'" stroke-width="1"/>';
  s+='</g></svg>';return s;
 }
 const poses=['idle','sit','jump','bow','serve','coffee','cake','clean','surprise','sleepbag','box','walk0','walk1','walk2','walk3'];
 function canvas(svg){const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);return im;}
 window.HD_CAT_SPR={grio:{},ponta:{}};
 for(const who of ['grio','ponta'])for(const pose of poses){
  const frame=pose.startsWith('walk')?Number(pose.slice(-1)):0;
  const im=canvas(build(who,pose,frame));
  window.HD_CAT_SPR[who][pose]=im;
 }
})();