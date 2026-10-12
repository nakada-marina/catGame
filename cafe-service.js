/* Three-day supplies, multi-item orders and conserved clean/used/dirty tableware. */
(function(){
  'use strict';
  const types={cup:{name:'コップ',price:300},plate:{name:'皿',price:350},fork:{name:'フォーク',price:100}};
  const keys=Object.keys(types),empty=()=>({cup:0,plate:0,fork:0}),sum=v=>Object.values(v||{}).reduce((a,b)=>a+b,0);
  function init(g){
    if(!g.tableware)g.tableware={total:{cup:6,plate:6,fork:6},clean:{cup:6,plate:6,fork:6},used:empty(),dirty:empty(),wash:null};
    return g.tableware;
  }
  const supplyDay=day=>(day-1)%3===0;
  const nextSupply=day=>day+((3-(day-1)%3)%3);
  function items(order){return order.items||[order];}
  function bundle(a,b){
    const need={};for(const m of [a,b])for(const [id,n]of Object.entries(m.need))need[id]=(need[id]||0)+n;
    return {id:'set_'+a.id+'_'+b.id,name:a.name+'＋'+b.name,items:[a,b],need,price:a.price+b.price};
  }
  function needs(order){
    const n=empty();for(const m of items(order)){
      if(['coffee','tea'].includes(m.id))n.cup++;
      else if(m.id==='parfait'){n.cup++;n.fork++;}
      else {n.plate++;if(m.id!=='cookie')n.fork++;}
    }return n;
  }
  function available(g,order){const w=init(g),n=needs(order);return keys.every(k=>w.clean[k]>=n[k]);}
  function reserve(g,order){
    if(!available(g,order))return null;const w=init(g),n=needs(order);
    for(const k of keys){w.clean[k]-=n[k];w.used[k]+=n[k];}return n;
  }
  function soil(g,n){
    if(!n)return;const w=init(g);
    for(const k of keys){const take=Math.min(w.used[k],n[k]||0);w.used[k]-=take;w.dirty[k]+=take;}
  }
  function recover(g,reusable=false){const w=init(g);for(const k of keys){w[reusable?'clean':'dirty'][k]+=w.used[k];w.used[k]=0;}}
  function startWash(g){
    const w=init(g);if(w.wash||!sum(w.dirty))return false;
    const n=empty();let capacity=3;
    for(const k of keys){n[k]=Math.min(capacity,w.dirty[k]);capacity-=n[k];w.dirty[k]-=n[k];}
    w.wash={items:n,t:0,duration:180};return true;
  }
  function tickWash(g){
    const w=init(g);if(!w.wash)return false;
    if(++w.wash.t<w.wash.duration)return false;
    for(const k of keys)w.clean[k]+=w.wash.items[k];w.wash=null;return true;
  }
  function expand(g,key,count=2){
    if(!types[key]||!Number.isInteger(count)||count<1)return false;
    const cost=types[key].price*count;if(g.money<cost)return false;
    window.CafeFinance.spend(g,'tableware',cost,types[key].name+' ×'+count);
    const w=init(g);w.total[key]+=count;w.clean[key]+=count;return true;
  }
  window.CafeService={types,keys,sum,init,supplyDay,nextSupply,items,bundle,needs,available,reserve,soil,recover,startWash,tickWash,expand};
})();
