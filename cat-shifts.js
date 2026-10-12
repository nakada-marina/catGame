/* Persisted self-proposed shifts for Ponta and adopted cafe cats. */
(function(){
  'use strict';
  const daysPerMonth=window.CafeFinance?.rules.daysPerMonth||10,open=600,close=1140;
  const known=new Set(['mike','kuro','shiro','chacha']);
  const pick=(a,rng)=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
  function workers(g){
    return [{pal:'ponta',name:'ぽんた'},...(g.cats||[]).filter(c=>known.has(c.pal)).map(c=>({pal:c.pal,name:c.name}))];
  }
  function wish(pal,day,rng){
    if(pal==='ponta')return day>=2&&day%2===0?{start:open,end:close}:{start:null,end:null};
    if(rng()<.25)return {start:null,end:null};
    const preferences={mike:[600,660,720],kuro:[780,840,900],shiro:[660,720,840],chacha:[600,720,780]};
    const start=pick(preferences[pal]||[600,720,780],rng),end=Math.min(close,start+pick([240,360,540],rng));
    return {start,end};
  }
  function ensure(g,rng=Math.random){
    if(!g.shifts||g.shifts.version!==1)g.shifts={version:1,days:{}};
    const first=Math.floor((g.day-1)/daysPerMonth)*daysPerMonth+1,last=first+daysPerMonth*2-1,roster=workers(g);
    for(let day=first;day<=last;day++){
      const entries=g.shifts.days[day]||(g.shifts.days[day]={});
      for(const {pal}of roster)if(!entries[pal]){
        const proposed=wish(pal,day,rng);entries[pal]={wishStart:proposed.start,wishEnd:proposed.end,start:proposed.start,end:proposed.end};
      }
    }
    for(const day of Object.keys(g.shifts.days))if(+day<first-daysPerMonth||+day>last)delete g.shifts.days[day];
    return g.shifts;
  }
  function entry(g,pal,day=g.day){
    ensure(g);return g.shifts.days[day]?.[pal]||null;
  }
  function working(g,pal,time=g.time??open,day=g.day){
    if(pal==='grio')return true;
    if(pal==='ponta'&&day<2)return false;
    const row=entry(g,pal,day);return !!row&&row.start!==null&&time>=row.start&&time<row.end;
  }
  function validate(g,pal,day,start,end){
    const first=Math.floor((g.day-1)/daysPerMonth)*daysPerMonth+1,last=first+daysPerMonth*2-1;
    if(!workers(g).some(w=>w.pal===pal))return 'このねこはシフトの対象ではありません';
    if(!Number.isInteger(day)||day<g.day||day>last)return '過去の日は変更できません';
    if(pal==='ponta'&&(g.day<2||day<2))return 'ぽんたは2日目からシフトを調整できます';
    if(start===null&&end===null)return '';
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<open||end>close||end<=start||start%60||end%60)return '10:00〜19:00で、終了を開始より後にしてください';
    return '';
  }
  function edit(g,pal,day,start,end){
    const error=validate(g,pal,day,start,end);if(error)return {ok:false,error};
    const row=entry(g,pal,day);if(!row)return {ok:false,error:'予定がありません'};
    row.start=start;row.end=end;return {ok:true,row};
  }
  function reset(g,pal,day){
    const row=entry(g,pal,day);if(!row)return {ok:false,error:'予定がありません'};
    return edit(g,pal,day,row.wishStart,row.wishEnd);
  }
  function welcome(g,pal,time){
    const row=entry(g,pal);if(!row||!known.has(pal)||time<open||time>=close)return;
    const start=Math.max(open,Math.floor(time/60)*60);
    Object.assign(row,{wishStart:start,wishEnd:close,start,end:close});
  }
  window.CafeShifts={daysPerMonth,workers,ensure,entry,working,edit,reset,welcome};
})();
