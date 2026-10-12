/* Simple cafe accounting. Ten game days per month; all rates are game rules. */
(function(){
  'use strict';
  const rules=Object.freeze({daysPerMonth:10,cardShare:.4,cardFeeRate:.03,cardDepositDelay:2,monthlyPaymentDelay:3,taxRate:.1,ownerHealth:400,ownerPension:600,staffInsuranceRate:.1,electricity:100,water:30,internet:20});
  const labels={materials:'仕入れ代',tableware:'食器購入費',catFood:'ねこのごはん',rent:'家賃',electricity:'電気代',water:'水道代',internet:'通信費',wages:'アルバイト給与',tempStaff:'ニャイミー報酬',recruitment:'採用費',menuDevelopment:'メニュー開発費',catWelcome:'ねこを迎える費用',cardFees:'カード手数料',health:'店長の健康保険',pension:'店長の年金',staffInsurance:'スタッフ社会保険（お店負担）'};
  const amount=v=>Math.max(0,Math.round(Number(v)||0));
  const sum=o=>Object.values(o||{}).reduce((n,v)=>n+v,0);
  function date(day){
    const n=Math.max(1,Math.floor(Number(day)||1));
    return {month:Math.floor((n-1)/rules.daysPerMonth)+1,day:(n-1)%rules.daysPerMonth+1,end:Math.ceil(n/rules.daysPerMonth)*rules.daysPerMonth};
  }
  function init(g){
    if(!g.finance||g.finance.version!==1)g.finance={version:1,startedDay:g.day,cards:[],bills:[],months:[],history:[],active:null};
    if(!g.finance.payables)g.finance.payables=[];
    return g.finance;
  }
  function today(g){
    const f=init(g);
    if(f.active?.day===g.day)return f.active;
    const d=f.active={day:g.day,cashStart:g.money,sales:0,tips:0,customers:0,cashSales:0,cardSales:0,expenses:{},cashExpenses:0,details:[],investments:0,cardDepositGross:0,cardDepositFees:0,cardDeposits:0,liabilityPayments:0,payments:{},taxAccrued:0,closed:false,opened:false};
    // Existing pending stock purchases were already paid. Import them once.
    const legacy=amount(g.pendingCost);
    if(legacy){d.cashStart+=legacy;d.expenses.materials=legacy;d.cashExpenses=legacy;d.details.push({key:'materials',amount:legacy,label:'更新前の仕入れ'});}
    g.pendingCost=0;
    return d;
  }
  function expense(g,key,value,label,cash=true){
    const n=amount(value);if(!n)return 0;
    const d=today(g);if(d.closed)throw Error('This finance day is closed');
    d.expenses[key]=(d.expenses[key]||0)+n;
    if(cash){g.money-=n;d.cashExpenses+=n;}
    if(label)d.details.push({key,amount:n,label:String(label)});
    return n;
  }
  function spend(g,key,value,label){
    if(key==='materials'){
      const n=expense(g,key,value,label,false);if(!n)return 0;
      const f=init(g),when=date(g.day);let bill=f.payables.find(b=>b.month===when.month&&!b.paid);
      if(!bill){bill={month:when.month,dueDay:when.end,amount:0,paid:false};f.payables.push(bill);}
      bill.amount+=n;const d=today(g);d.payablePurchases=(d.payablePurchases||0)+n;return n;
    }
    if(key!=='investment')return expense(g,key,value,label,true);
    const n=amount(value),d=today(g);if(d.closed)throw Error('This finance day is closed');
    g.money-=n;d.investments+=n;if(n)d.details.push({key,amount:n,label:String(label||'設備・家具')});return n;
  }
  function sale(g,value,method='cash',tip=0){
    const n=amount(value),d=today(g);if(!n||d.closed)return null;
    d.sales+=n;d.tips+=amount(tip);d.customers++;
    if(method!=='card'){g.money+=n;d.cashSales+=n;return {method:'cash',gross:n,fee:0,net:n};}
    const fee=Math.round(n*rules.cardFeeRate),when=date(g.day),f=init(g);
    let batch=f.cards.find(b=>b.month===when.month);
    if(!batch){batch={month:when.month,closeDay:when.end,dueDay:when.end+rules.cardDepositDelay,gross:0,fee:0,settled:false};f.cards.push(batch);}
    batch.gross+=n;batch.fee+=fee;d.cardSales+=n;expense(g,'cardFees',fee,null,false);
    return {method:'card',gross:n,fee,net:n-fee,dueDay:batch.dueDay};
  }
  function settlePayables(g,includeToday=false){
    const f=init(g),d=today(g);
    for(const b of f.payables)if(!b.paid&&(b.dueDay<g.day||(includeToday&&b.dueDay===g.day))){
      b.paid=true;g.money-=b.amount;d.liabilityPayments+=b.amount;
      d.payablePayments=(d.payablePayments||0)+b.amount;d.payments.materials=(d.payments.materials||0)+b.amount;
    }
    return d;
  }
  function settleDue(g){
    const f=init(g),d=today(g);
    for(const b of f.cards)if(!b.settled&&b.dueDay<=g.day){
      const net=b.gross-b.fee;b.settled=true;g.money+=net;
      d.cardDepositGross+=b.gross;d.cardDepositFees+=b.fee;d.cardDeposits+=net;
    }
    for(const b of f.bills)if(!b.paid&&b.dueDay<=g.day){
      b.paid=true;g.money-=b.amount;d.liabilityPayments+=b.amount;
      d.payments[b.key]=(d.payments[b.key]||0)+b.amount;
    }
    settlePayables(g);
    return d;
  }
  function beginDay(g){
    const d=today(g);if(d.closed)return d;
    settleDue(g);d.opened=true;return d;
  }
  function month(g,number){
    const f=init(g);let m=f.months.find(m=>m.month===number);
    if(!m){m={month:number,days:0,sales:0,cashSales:0,cardSales:0,tips:0,expenses:{},investments:0,profit:0,tax:0,closed:false};f.months.push(m);}
    return m;
  }
  function closeDay(g,{rent=1000,wage=0}={}){
    const d=today(g),when=date(g.day),m=month(g,when.month);
    if(d.closed)return {day:d,month:m};
    expense(g,'rent',rent);
    expense(g,'electricity',rules.electricity);expense(g,'water',rules.water);expense(g,'internet',rules.internet);
    expense(g,'wages',wage);
    expense(g,'health',rules.ownerHealth/rules.daysPerMonth,null,false);
    expense(g,'pension',rules.ownerPension/rules.daysPerMonth,null,false);
    expense(g,'staffInsurance',wage*rules.staffInsuranceRate,null,false);
    m.days++;m.sales+=d.sales;m.cashSales+=d.cashSales;m.cardSales+=d.cardSales;m.tips+=d.tips;m.investments+=d.investments;
    for(const [key,value]of Object.entries(d.expenses))m.expenses[key]=(m.expenses[key]||0)+value;
    m.profit=m.sales-sum(m.expenses);
    if(when.day===rules.daysPerMonth&&!m.closed){
      m.closed=true;m.tax=Math.round(Math.max(0,m.profit)*rules.taxRate);d.taxAccrued=m.tax;
      const f=init(g),dueDay=when.end+rules.monthlyPaymentDelay;
      for(const [key,n]of [['tax',m.tax],['health',m.expenses.health||0],['pension',m.expenses.pension||0],['staffInsurance',m.expenses.staffInsurance||0]])
        if(n)f.bills.push({month:when.month,key,amount:n,dueDay,paid:false});
    }
    if(when.day===rules.daysPerMonth)settlePayables(g,true);
    d.profit=d.sales-sum(d.expenses);d.cashEnd=g.money;d.closed=true;
    const f=init(g);f.history.push(JSON.parse(JSON.stringify(d)));f.history=f.history.slice(-30);
    // Keep recent summaries, while never removing unpaid money.
    f.cards=f.cards.filter(b=>!b.settled||b.month>=when.month-12);
    f.bills=f.bills.filter(b=>!b.paid||b.month>=when.month-12);
    f.months=f.months.filter(m=>m.month>=when.month-24);
    f.payables=f.payables.filter(b=>!b.paid||b.month>=when.month-12);
    return {day:d,month:m};
  }
  function view(g){
    const f=init(g),cards=f.cards.filter(b=>!b.settled),bills=f.bills.filter(b=>!b.paid),payables=f.payables.filter(b=>!b.paid);
    const payable=payables.reduce((n,b)=>n+b.amount,0);
    const current=date(g.day),m=f.months.find(m=>m.month===current.month);
    const openInsurance=m&&!m.closed?(m.expenses.health||0)+(m.expenses.pension||0)+(m.expenses.staffInsurance||0):0;
    return {cash:g.money,cardGross:cards.reduce((n,b)=>n+b.gross,0),cardFees:cards.reduce((n,b)=>n+b.fee,0),cardNet:cards.reduce((n,b)=>n+b.gross-b.fee,0),unpaid:bills.reduce((n,b)=>n+b.amount,0)+openInsurance+payable,payable,payables,cards,bills,month:m||null,date:current};
  }
  window.CafeFinance={rules,labels,sum,date,init,today,spend,sale,settleDue,beginDay,closeDay,view};
})();
