(function(){
  'use strict';
  var rows=[
    ['2026-09-01','周二',8329.46,13695.01,4,13,28,2,0,0,22024.47,22024.47],
    ['2026-09-02','周三',16747.27,62605.00,3,15,27,1,1,1,79352.27,101376.74],
    ['2026-09-03','周四',4710.35,35411.99,0,14,25,0,1,1,40122.34,141499.08],
    ['2026-09-04','周五',31464.50,40703.93,8,24,29,6,2,0,72168.43,213667.51],
    ['2026-09-05','周六',15041.96,39769.70,4,30,31,2,0,0,54811.66,268479.17],
    ['2026-09-06','周日',140116.70,43682.69,9,92,30,3,3,1,183799.39,452278.56],
    ['2026-09-07','周一',20267.31,39148.42,3,16,30,4,4,0,59415.73,511694.29],
    ['2026-09-08','周二',21632.61,36448.39,3,20,30,1,1,0,58081.00,569775.29],
    ['2026-09-09','周三',17044.52,41666.05,3,12,29,1,1,1,58710.57,628485.86],
    ['2026-09-10','周四',10042.88,36522.53,1,12,28,0,1,0,46565.41,675051.27],
    ['2026-09-11','周五',9814.03,38027.06,3,17,30,2,0,0,47841.09,722892.36],
    ['2026-09-12','周六',18029.88,33831.37,4,17,30,0,0,0,51861.25,774753.61],
    ['2026-09-13','周日',133002.16,31013.81,11,108,27,4,4,3,164015.97,938769.58],
    ['2026-09-14','周一',20100.68,15521.66,3,14,24,1,3,1,35622.34,974391.92],
    ['2026-09-15','周二',34846.27,43388.86,8,10,25,1,0,0,78235.13,1052627.05],
    ['2026-09-16','周三',13958.85,28288.75,2,13,25,1,0,1,42247.60,1094874.65],
    ['2026-09-17','周四',34398.72,28935.61,7,13,26,1,0,0,63334.33,1158208.98],
    ['2026-09-18','周五',40570.20,32821.31,3,26,25,2,2,1,73391.51,1231600.49],
    ['2026-09-19','周六',99908.85,37754.86,7,79,28,5,1,1,137663.71,1369264.20],
    ['2026-09-20','周日',27228.16,33779.66,6,17,27,2,3,0,61007.82,1430272.02],
    ['2026-09-21','周一',22568.92,30721.41,3,17,26,1,2,0,53290.33,1483562.35],
    ['2026-09-22','周二',25087.04,30216.77,6,13,26,2,2,0,55303.81,1538866.16],
    ['2026-09-23','周三',25904.97,36553.99,2,7,28,3,1,0,62458.96,1601325.12],
    ['2026-09-24','周四',38082.09,39383.78,6,33,30,4,2,0,77465.87,1678790.99],
    ['2026-09-25','周五',69642.38,31545.11,3,51,31,3,1,1,101187.49,1779978.48]
  ].map(function(r){return {date:r[0],weekday:r[1],outpatient:r[2],inpatient:r[3],first:r[4],repeat:r[5],ward:r[6],admit:r[7],dischargeFirst:r[8],dischargeRepeat:r[9],total:r[10],cumulative:r[11]};});
  var data={
    month:'2026-09',reportRange:'2026-09-01—2026-09-27',updatedThrough:'2026-09-25',updatedAt:'2026-09-25 23:59',goal:2600000,
    source:'销售部每日销售日报截图（2026-09-26汇总）',revision:'9月1—6日采用与9月7—25日连续衔接的后续修订口径',rows:rows
  };
  var storageKey='hospital-september-revenue-v1';
  try{
    var saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(saved&&Array.isArray(saved.rows)&&saved.rows.length){data.rows=saved.rows;data.updatedThrough=saved.updatedThrough||data.updatedThrough;data.updatedAt=saved.updatedAt||data.updatedAt;data.source=saved.source||data.source;}
  }catch(e){}
  function sum(list,key){return list.reduce(function(a,r){return a+Number(r[key]||0);},0);}
  function subset(from,to){return data.rows.filter(function(r){return r.date>=from&&r.date<=to;});}
  function summarize(list){
    var last=list[list.length-1]||{};
    return {days:list.length,total:sum(list,'total'),outpatient:sum(list,'outpatient'),inpatient:sum(list,'inpatient'),first:sum(list,'first'),repeat:sum(list,'repeat'),visits:sum(list,'first')+sum(list,'repeat'),admissions:sum(list,'admit'),discharges:sum(list,'dischargeFirst')+sum(list,'dischargeRepeat'),ward:last.ward||0,average:list.length?sum(list,'total')/list.length:0};
  }
  function derive(){
    var month=summarize(data.rows),current=summarize(subset('2026-09-21','2026-09-27')),previousComparable=summarize(subset('2026-09-14','2026-09-18'));
    var weeks=[['9.1—9.6','2026-09-01','2026-09-06'],['9.7—9.13','2026-09-07','2026-09-13'],['9.14—9.20','2026-09-14','2026-09-20'],['9.21—9.27','2026-09-21','2026-09-27']].map(function(w){var x=summarize(subset(w[1],w[2]));x.label=w[0];return x;});
    var remaining=data.goal-month.total,remainingDays=30-data.rows.length,forecast=month.total+(month.average*remainingDays);
    var sorted=data.rows.slice().sort(function(a,b){return b.total-a.total;});
    var weekend=data.rows.filter(function(r){return r.weekday==='周六'||r.weekday==='周日';}),weekday=data.rows.filter(function(r){return r.weekday!=='周六'&&r.weekday!=='周日';});
    return {month:month,currentWeek:current,previousComparable:previousComparable,weeks:weeks,remaining:remaining,remainingDays:remainingDays,requiredDaily:remaining/remainingDays,forecast:forecast,amountRate:month.total/data.goal*100,timeRate:data.rows.length/30*100,topDays:sorted.slice(0,5),weekend:summarize(weekend),weekday:summarize(weekday)};
  }
  data.subset=subset;data.summarize=summarize;data.derive=derive;
  window.SEPTEMBER_REVENUE_DATA=data;
  window.updateSeptemberRevenueData=function(nextRows,meta){
    if(Array.isArray(nextRows)&&nextRows.length){data.rows=nextRows.slice().sort(function(a,b){return a.date.localeCompare(b.date);});data.updatedThrough=data.rows[data.rows.length-1].date;data.updatedAt=data.updatedThrough+' 23:59';data.source=(meta&&meta.source)||data.source;try{localStorage.setItem(storageKey,JSON.stringify({rows:data.rows,updatedThrough:data.updatedThrough,updatedAt:data.updatedAt,source:data.source,savedAt:new Date().toISOString()}));}catch(e){}}
    window.dispatchEvent(new CustomEvent('september-revenue-updated',{detail:data}));return derive();
  };
  window.resetSeptemberRevenueData=function(){try{localStorage.removeItem(storageKey)}catch(e){};location.reload();};
})();
