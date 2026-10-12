/* Run: node tests/finance-check.cjs. No external dependencies required. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const window={};new Function('window',read('finance.js'))(window);const F=window.CafeFinance;
const fresh=(day=1,money=8000)=>({day,money,pendingCost:0});
const copy=g=>JSON.parse(JSON.stringify(g));
function cashEquation(d){return d.cashStart+d.cashSales+d.cardDeposits-d.cashExpenses-d.investments-d.liabilityPayments;}
let g=fresh();
assert.deepEqual(F.date(10),{month:1,day:10,end:10});
assert.deepEqual(F.date(11),{month:2,day:1,end:20});
assert.deepEqual(F.date(12),{month:2,day:2,end:20});
F.beginDay(g);let payment=F.sale(g,400,'card',0);
assert.equal(payment.fee,12);assert.equal(payment.dueDay,12);assert.equal(g.money,8000);
assert.equal(F.today(g).sales,400);assert.equal(F.today(g).cardSales,400);assert.equal(F.today(g).expenses.cardFees,12);
assert.equal(F.view(g).cardGross,400);assert.equal(F.view(g).cardNet,388);
let closed=F.closeDay(g,{rent:1000,wage:0});
assert.equal(closed.day.profit,-862);assert.equal(g.money,6850);assert.equal(closed.day.cashEnd,cashEquation(closed.day));
const afterClose=g.money,history=g.finance.history.length;
F.closeDay(g);assert.equal(g.money,afterClose);assert.equal(g.finance.history.length,history,'close posts fixed expenses once');
g.day=11;F.beginDay(g);assert.equal(g.money,afterClose,'no early deposit');
g.day=12;F.beginDay(g);assert.equal(g.money,afterClose+388);assert.equal(F.today(g).cardDeposits,388);
assert.equal(F.today(g).cardDepositGross,400);assert.equal(F.today(g).cardDepositFees,12);
assert.equal(F.today(g).sales,0,'settlement is not a second sale');assert.equal(F.today(g).expenses.cardFees||0,0,'fee not charged twice');
assert.equal(F.view(g).cardGross,0);
g=copy(g);const paidMoney=g.money;F.beginDay(g);assert.equal(g.money,paidMoney,'saved settled card cannot pay again');
assert.equal(F.today(g).cardDeposits,388,'same daily record survives reload');

g=fresh();
for(let day=1;day<=10;day++){g.day=day;F.beginDay(g);F.sale(g,2000,'cash',100);F.closeDay(g);}
const month=g.finance.months[0];
assert.equal(month.days,10);assert.equal(month.sales,20000);assert.equal(month.tips,1000);
assert.equal(month.expenses.rent,10000);assert.equal(month.expenses.electricity,1000);
assert.equal(month.expenses.water,300);assert.equal(month.expenses.internet,200);
assert.equal(month.expenses.health,400);assert.equal(month.expenses.pension,600);
assert.equal(month.profit,7500);assert.equal(month.tax,750);assert(month.closed);
assert.equal(g.money,16500,'insurance and income tax wait until due date');
assert.equal(F.view(g).unpaid,1750);
assert(g.finance.bills.every(b=>b.dueDay===13));
const last=g.finance.history.slice(-1)[0];assert.equal(last.taxAccrued,750);assert.equal(last.cashEnd,cashEquation(last));
g.day=12;F.beginDay(g);assert.equal(g.money,16500);
g.day=13;F.beginDay(g);assert.equal(g.money,14750);
assert.equal(F.today(g).liabilityPayments,1750);assert.equal(F.today(g).payments.tax,750);
assert.equal(F.today(g).payments.health,400);assert.equal(F.today(g).payments.pension,600);
assert.equal(F.view(g).unpaid,0);
F.beginDay(g);assert.equal(g.money,14750,'monthly payments occur once');
g=copy(g);F.beginDay(g);assert.equal(g.money,14750,'paid flags survive reload');
closed=F.closeDay(g);assert.equal(closed.day.cashEnd,cashEquation(closed.day));
assert.equal(closed.day.profit,-1250,'last month tax not deducted from this month profit again');

g=fresh();
for(let day=1;day<=10;day++){g.day=day;F.beginDay(g);F.closeDay(g);}
assert.equal(g.finance.months[0].tax,0,'no income tax on monthly losses');
assert(!g.finance.bills.some(b=>b.key==='tax'));

g=fresh();F.beginDay(g);F.sale(g,10000,'cash');
F.spend(g,'materials',600,'豆 ×5');F.spend(g,'catFood',500,'ごはん8回');
F.spend(g,'tempStaff',1600,'サビ2時間');F.spend(g,'menuDevelopment',3000,'ミルクティー');
F.spend(g,'recruitment',1000,'採用');F.spend(g,'catWelcome',500,'ねこ');
F.spend(g,'investment',1500,'クッション');
closed=F.closeDay(g,{wage:2000});
assert.equal(closed.day.investments,1500);assert.equal(closed.day.expenses.staffInsurance,200);
assert.equal(closed.day.expenses.materials,600);assert.equal(closed.day.expenses.catFood,500);
assert.equal(closed.day.expenses.tempStaff,1600);assert.equal(closed.day.expenses.menuDevelopment,3000);
assert.equal(closed.day.expenses.recruitment,1000);assert.equal(closed.day.expenses.catWelcome,500);
assert.equal(closed.day.profit,-650,'investments affect money, not operating profit');
assert.equal(closed.day.cashEnd,cashEquation(closed.day));
assert.equal(closed.day.details.filter(x=>x.key==='materials')[0].label,'豆 ×5');

g=fresh(7,5300);g.pendingCost=700;F.beginDay(g);
assert.equal(g.money,5300,'legacy stock already paid');
assert.equal(F.today(g).cashStart,6000);assert.equal(F.today(g).expenses.materials,700);assert.equal(g.pendingCost,0);
g=copy(g);F.beginDay(g);assert.equal(F.today(g).expenses.materials,700,'legacy cost imported once');
for(let day=7;day<=10;day++){g.day=day;F.beginDay(g);F.sale(g,2000,'cash');F.closeDay(g);}
assert.equal(g.finance.months[0].days,4,'no retroactive costs before migration');
assert.equal(g.finance.months[0].expenses.health,160);assert.equal(g.finance.months[0].expenses.pension,240);
assert(!g.finance.bills.some(b=>b.month<1));
g.day=11;const beforePurchase=g.money;F.spend(g,'materials',200,'粉 ×5');
assert.equal(F.today(g).cashStart,beforePurchase);
F.beginDay(g);assert.equal(F.today(g).cashExpenses,0,'night purchase is payable, not a cash payment');assert.equal(F.view(g).payable,200);
assert.equal(F.today(g).cashStart,beforePurchase);

g=fresh();F.beginDay(g);F.sale(g,500,'card');F.closeDay(g);
g.day=21;const beforeFirstCatchup=g.money;F.beginDay(g);assert.equal(g.money,beforeFirstCatchup+485);F.sale(g,1000,'card');F.closeDay(g);
g.day=43;const beforeCatchup=g.money;F.beginDay(g);
assert.equal(g.money,beforeCatchup+970,'overdue batches settle after skipped days');
assert.equal(F.today(g).sales,0);F.beginDay(g);assert.equal(g.money,beforeCatchup+970);
assert.equal(F.view(g).cardNet,0);

// Exercise actual result formatting with escaped purchase names and monthly rows.
const html=read('index.html');
function source(name){const i=html.indexOf('function '+name+'('),end=html.indexOf('\n}',i)+2;assert(i>=0&&end>i);return html.slice(i,end);}
const format=new Function('G','CafeFinance',['financeEscape','financeYen','financeDate','financeRows','financeResultHtml'].map(source).join('\n')+';return financeResultHtml;');
g=fresh(10,8000);F.beginDay(g);F.sale(g,8000,'cash');F.sale(g,400,'card');
F.spend(g,'materials',100,'豆 <img src=x>');const result=F.closeDay(g);
const report=format(g,F)(result);
for(const label of ['売上と利益','引かれる経費の内訳','実際のお金の増減','カード売掛','税金引当','10日で1か月','健康保険400円','年金600円','2月2日'])assert(report.includes(label),label);
assert(report.includes('&lt;img src=x&gt;'));assert(!report.includes('豆 <img'));
const persisted=copy(g);F.closeDay(persisted);assert.equal(persisted.finance.bills.length,g.finance.bills.length,'no duplicate month bill on reload');

// A multi-month balance check includes pending money and monthly liabilities.
g=fresh(1,100000);let earned=0,operating=0,taxes=0,invested=0;
for(let day=1;day<=40;day++){
  g.day=day;F.beginDay(g);
  for(let i=0;i<5;i++)F.sale(g,600,i<2?'card':'cash',50);
  F.spend(g,'materials',300,'材料');
  if(day%3===0)F.spend(g,'catFood',500,'ごはん');
  if(day===7)F.spend(g,'investment',1500,'家具');
  if(day===12)F.spend(g,'menuDevelopment',3000,'開発');
  const report=F.closeDay(g,{wage:day>=16?2000:0}),d=report.day,v=F.view(g);
  earned+=d.sales;operating+=F.sum(d.expenses);taxes+=d.taxAccrued;invested+=d.investments;
  assert.equal(d.cashEnd,cashEquation(d),'daily money equation '+day);
  assert.equal(100000+earned-operating-taxes-invested,g.money+v.cardNet-v.unpaid,'cash plus receivables less liabilities '+day);
}
g.day=43;F.beginDay(g);
assert.equal(F.view(g).cardNet,0);assert.equal(F.view(g).unpaid,0);
assert.equal(g.money,100000+earned-operating-taxes-invested,'all four months settle to final money balance');

for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new Function(match[1]);
assert(html.includes('src="./finance.js?v=20261012-payables"'));
console.log('PASS ten-day calendar, card receivables/deposits/fees, accruals/tax/payroll, expenses/investment, cash equation, migration, closed-day and reload guards, result formatting and syntax');
