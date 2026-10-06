(function(){
  'use strict';
  var shell=document.querySelector('.mkt-v2'),source=window.SEPTEMBER_REVENUE_DATA;if(!shell||!source)return;
  var goal=source.goal;
  /* ⭐⭐ 结算月标签（2026-10-06 改造：主面板切 10 月）
     原先通篇写死「9月」「9.1」「9月1—6日口径说明」，切月就必须满页找。
     现统一从数据层 SETTLED_MONTH 派生；下次切月只改数据层一处。 */
  var M_MONTH=source.SETTLED_MONTH||'2026-10';
  var M_NUM=+M_MONTH.slice(5,7);
  var M_LAB=M_NUM+'月';         // '10月'
  var M_LAB_SP=M_NUM+' 月';     // '10 月'
  var M_DOT=M_NUM+'.1';         // '10.1'
  function wan(v,d){return (Number(v||0)/10000).toFixed(d==null?2:d)}
  function pct(v){return (Number(v||0)*100).toFixed(1)+'%'}
  function sum(list,key){return list.reduce(function(a,r){return a+Number(r[key]||0)},0)}
  function shortDate(d){return d.slice(5).replace('-','.')}
  function weekday(date){return ['周日','周一','周二','周三','周四','周五','周六'][new Date(date+'T12:00:00').getDay()]}
  function maxOf(rows){return Math.max.apply(null,rows.map(function(r){return r.total}).concat([1]))}
  function delta(a,b){return b?((a/b)-1)*100:0}
  function signed(v){return (v>=0?'+':'')+v.toFixed(1)+'%'}
  function bars(rows,cls){var max=maxOf(rows);return '<div class="'+cls+'">'+rows.map(function(r){var h=Math.max(6,r.total/max*154);return '<div class="mcr-day '+(r.total===max?'peak':'')+'"><em>'+wan(r.total)+'万</em><i style="height:'+h+'px"></i><span>'+shortDate(r.date)+'<br>'+r.weekday+'</span></div>'}).join('')+'</div>'}
  /* 待补柱由「本周缺哪几天」推出，不硬编码 —— 否则数据到 9.26 后会重复一根待更新柱 */
  function pendingWeekBars(rows){var max=maxOf(rows),have={};rows.forEach(function(r){have[r.date]=1;});
    var pend=[];for(var d=21;d<=27;d++){var k='2026-09-'+String(d).padStart(2,'0');if(!have[k])pend.push(shortDate(k)+' '+weekday(k));}
    return '<div class="mcr-daily-bars">'+rows.map(function(r){return '<div class="mcr-day '+(r.total===max?'peak':'')+'"><em>'+wan(r.total)+'万</em><i style="height:'+Math.max(7,r.total/max*160)+'px"></i><span>'+shortDate(r.date)+'<br>'+r.weekday+'</span></div>'}).join('')+pend.map(function(x){return '<div class="mcr-day pending"><em>待更新</em><i style="height:5px"></i><span>'+x.replace(' ','<br>')+'</span></div>'}).join('')+'</div>'}
  function weekCards(x){return x.weeks.map(function(w,i){var share=w.total/x.month.total;return '<div class="mcr-week-card '+(w.current?'current':'')+'"><span>'+w.label+(w.current?' · 进行中':'')+'</span><strong>'+wan(w.total)+'万</strong><i><u style="width:'+Math.max(4,share*100)+'%"></u></i><small>'+w.days+'天 · 日均'+wan(w.average)+'万 · 占月累计'+pct(share)+'</small></div>'}).join('')}
  function rowsHtml(rows){return rows.map(function(r){var dis=r.dischargeFirst+r.dischargeRepeat;return '<tr><td>'+shortDate(r.date)+' '+r.weekday+'</td><td>'+wan(r.outpatient)+'万</td><td>'+wan(r.inpatient)+'万</td><td>'+r.first+'</td><td>'+r.repeat+'</td><td>'+r.admit+'</td><td>'+dis+'</td><td>'+r.ward+'</td><td><b>'+wan(r.total)+'万</b></td><td>'+wan(r.cumulative)+'万</td></tr>'}).join('')}
  function quality(m,last,rows){
    /* ⚠ 原为硬编码的三格「N／N天 · 缺 X 天」文案 —— 数据补到 9.30 后全部失真，
       会当着业主的面说「9.26—9.27 没有日报」（其实早录了）。
       改为按实际覆盖天数与缺日动态生成，数据一更新就自动跟随。 */
    var have={}; rows.forEach(function(r){have[r.date]=1;});
    /* ⚠ 起点原写死 2026-09-01 —— 结算月切到 10 月后必须跟着走，
       否则会去扫 9 月的缺失日，把 9 月的问题当成 10 月报告的口径问题。 */
    var d0=new Date(+M_MONTH.slice(0,4), +M_MONTH.slice(5,7)-1, 1), d1=new Date(last.date), miss=[];
    for(var d=new Date(d0); d<=d1; d.setDate(d.getDate()+1)){
      var s=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
      if(!have[s]) miss.push(s);
    }
    var mdS=function(d){return (+d.slice(5,7))+'.'+(+d.slice(8));};
    var q1='<div class="ok"><b>'+m.days+'／'+m.days+'天</b><span>日合计与累计连续勾稽</span></div>';
    var q2='<div class="ok"><b>100%</b><span>门诊＋住院＝当日合计</span></div>';
    /* ⚠「9.1—9.6 曾有旧值/修订」是 **9 月专用**的数据源说明。
       结算月切到 10 月后继续显示会误导（10 月无此问题）→ 仅 9 月显示。 */
    var q3=(M_NUM===9)
      ? '<div class="warn"><b>1次修订</b><span>9.1—9.6采用后续口径</span></div>'
      : '<div class="ok"><b>无修订</b><span>'+M_LAB+'逐日为日报原值</span></div>';
    var q4=miss.length
      ? '<div class="pending"><b>'+miss.length+'天待补</b><span>'+miss.map(mdS).join('、')+' 尚无日报</span></div>'
      : '<div class="ok"><b>无缺日</b><span>'+M_DOT+'—'+mdS(last.date)+' 逐日齐全</span></div>';
    return '<div class="mcr-quality-grid">'+q1+q2+q3+q4+'</div>';
  }
  function render(){
    var all=source.rows.slice(),x=source.derive(),m=x.month,w=x.currentWeek,prev=x.previousComparable,last=all[all.length-1],
      /* ⚠ 原来把 wrows 与 WEEK 都写死成 9.21—9.27；周窗口一滚就错。
         这里取「非本周的最后一个完整周」作为对照周。 */
      /* ⚠⚠ 2026-10-06 修：原取「最后一个非本周的周」——9 月时恰好等于上一完整周，
     但 10 月的 weeks 里有 10.26—10.31 这种**尚未发生**的周，取末项会得到未来周。
     改为取「本周在数组中的前一项」（＝紧邻的上一周），并在本周不在数组时退回末项。 */
      _ci=(function(){var k=-1;(x.weeks||[]).forEach(function(q,i){if(q.current)k=i;});return k;})(),
      _pw=(_ci>0)?x.weeks[_ci-1]:((_ci<0&&(x.weeks||[]).length)?x.weeks[x.weeks.length-1]:null),
      WEEK=_pw?('上周（'+_pw.label+'）'):'上周',
      /* ⚠ 用「本期」而非「本周」：month-dashboard 的 normalizeAll 会把裸「本周」
          替换成它自己的周标签（当前是「本周（10.5）」），若这里再写「本周（10.5—10.11）」
          就会变成「本周（10.5）（10.5—10.11）」——区间重复。 */
      WEEK_CUR='本期（'+((x.currentWeek&&x.currentWeek.label)||M_DOT)+'）',
      wrows=_pw?source.subset(_pw.from,_pw.to):[],weekGrowth=delta(w.total,prev.total),forecast=x.forecast,top3=x.topDays.slice(0,3),top3Total=sum(top3,'total');
    /* 在院取「最近一个有填报的日期」（缺字段自动回退，口径与月面板一致） */
    var lw=(source.lastWard&&source.lastWard())||{value:last.ward,date:last.date};
    var mdOf=function(d){return d?((+d.slice(5,7))+'月'+(+d.slice(8))+'日'):'';};
    window.MARKETING_REPORT_DATA={period:source.reportRange,updated:source.updatedAt,monthRevenue:m.total,weekRevenue:w.total,goal:goal,admissions:w.admissions,discharges:w.discharges,inpatients:lw.value,wardAt:lw.date,rows:all};
    var content=shell.querySelector('.mkt-content');if(!content)return;
    shell.querySelector('.mkt-title h1').textContent=M_LAB+'营业与营销分析报告';shell.querySelector('.mkt-title p').textContent=M_DOT+'—'+((+last.date.slice(5,7))+'.'+(+last.date.slice(8)))+'报告期 · 日报明细、财务进度、患者流动与经营判断';
    content.innerHTML='<div class="mcr-scope"><strong>2026年'+M_LAB+'1日—'+mdOf(last.date)+'经营报告</strong><span><b>●</b> 实际数据截至 '+source.updatedAt+' · '+(x.remainingDays?('剩余 '+x.remainingDays+' 天待更新'):'报告期已结束')+'</span></div>'+
      '<section class="mcr-summary-grid"><article class="mcr-summary blue"><div class="mcr-summary-head"><div><h2>'+M_LAB+'累计营业额</h2><p>'+m.days+'天实际发生 · 门诊与住院收入合计</p></div><span class="mkt-badge">已勾稽</span></div><div class="mcr-big"><strong>¥'+wan(m.total)+'</strong><span>万元</span></div><div class="mcr-progress"><i style="width:'+x.amountRate.toFixed(1)+'%"></i><b style="left:'+x.timeRate.toFixed(1)+'%"></b></div><div class="mcr-progress-meta"><span>金额进度 '+x.amountRate.toFixed(1)+'%</span><span>时间进度 '+x.timeRate.toFixed(1)+'% · '+((x.timeRate-x.amountRate)>=0?'落后 ':'领先 ')+Math.abs(x.timeRate-x.amountRate).toFixed(1)+'pt</span></div></article><article class="mcr-summary"><div class="mcr-summary-head"><div><h2>财务进度与月末预测</h2><p>目标260万元 · 按月累计日均推演</p></div><span class="mkt-badge">经营测算</span></div><div class="mcr-financial"><div><span>月累计日均</span><b>'+wan(m.average)+'万</b></div><div><span>剩余目标</span><b class="bad">'+wan(x.remaining)+'万</b></div><div><span>'+((x.remainingDays===0)?'目标达成率':('未来'+x.remainingDays+'日达标日均'))+'</span><b class="'+((x.remainingDays===0)?'':'bad')+'">'+((x.remainingDays===0)?pct(m.total/goal):wan(x.requiredDaily)+'万')+'</b></div><div><span>按当前均速预测</span><b>'+wan(forecast)+'万</b></div></div></article></section>'+
      '<section class="mcr-week-snapshot"><header><div><span>本期经营快照</span><h2>'+WEEK_CUR+'</h2><p>截至'+mdOf(last.date)+'23:59 · '+(x.remainingDays?('剩余 '+x.remainingDays+' 天待更新'):'报告期已结束')+'</p></div><b>进行中</b></header><div class="mcr-week-total"><label>本周营业额</label><strong>¥'+wan(w.total)+'万</strong><span>'+w.days+'天日均 ¥'+wan(w.average)+'万 · 较上周同期 '+signed(weekGrowth)+'</span></div><div class="mcr-week-metrics"><article class="revenue"><i>诊</i><span>门诊人次</span><strong>'+w.visits+'<em>人次</em></strong><small>初诊'+w.first+' · 复诊'+w.repeat+'</small></article><article class="admit"><i>入</i><span>入院</span><strong>'+w.admissions+'<em>人</em></strong><small>'+M_DOT+'—'+mdOf(last.date)+'累计</small></article><article class="discharge"><i>出</i><span>出院</span><strong>'+w.discharges+'<em>人</em></strong><small>营收日报口径（含多次）</small></article><article class="ward"><i>院</i><span>在院</span><strong>'+(lw.value==null?'待补':lw.value)+'<em>人</em></strong><small>'+mdOf(lw.date)+'日终</small></article></div></section>'+
      '<section class="mcr-kpis"><article class="mcr-kpi"><label>'+M_LAB+'累计营业额</label><strong>¥'+wan(m.total)+'万</strong><small>完成目标'+x.amountRate.toFixed(1)+'%</small></article><article class="mcr-kpi"><label>'+M_LAB+'门诊收入</label><strong>¥'+wan(m.outpatient)+'万</strong><small>'+pct(m.outpatient/m.total)+' · '+m.visits+'人次</small></article><article class="mcr-kpi"><label>'+M_LAB+'住院收入</label><strong>¥'+wan(m.inpatient)+'万</strong><small>'+pct(m.inpatient/m.total)+' · 期末在院'+(lw.value==null?'待补':lw.value)+'人</small></article><article class="mcr-kpi"><label>'+M_LAB+'入院</label><strong>'+m.admissions+'人</strong><small>'+M_DOT+'—'+mdOf(last.date).replace('月','.').replace('日','')+'累计</small></article><article class="mcr-kpi"><label>'+M_LAB+'出院</label><strong>'+m.discharges+'人</strong><small>营收日报口径（含多次）</small></article><article class="mcr-kpi"><label>患者池净变化</label><strong>+'+(m.admissions-m.discharges)+'人</strong><small>入院'+m.admissions+'－出院'+m.discharges+'</small></article></section>'+
      '<section class="mcr-analysis-first"><article class="mkt-card"><div class="mkt-card-head"><div><h2>环比分析</h2><p>'+((x.currentWeek&&x.currentWeek.label)||'本期')+'（'+w.days+' 天）vs 上周同期'+(prev.days?('（'+prev.days+' 天）'):'')+'</p></div><span class="mkt-badge">同天数口径</span></div><div class="mcr-compare"><div class="mcr-compare-row"><b>营业额</b><span>'+wan(prev.total)+'万 → '+wan(w.total)+'万</span><em class="'+(weekGrowth>=0?'good':'bad')+'">'+signed(weekGrowth)+'</em></div><div class="mcr-compare-row"><b>日均收入</b><span>'+wan(prev.average)+'万 → '+wan(w.average)+'万</span><em class="'+(weekGrowth>=0?'good':'bad')+'">'+signed(weekGrowth)+'</em></div><div class="mcr-compare-row"><b>门诊收入</b><span>'+wan(prev.outpatient)+'万 → '+wan(w.outpatient)+'万</span><em class="good">'+signed(delta(w.outpatient,prev.outpatient))+'</em></div><div class="mcr-compare-row"><b>住院收入</b><span>'+wan(prev.inpatient)+'万 → '+wan(w.inpatient)+'万</span><em class="good">'+signed(delta(w.inpatient,prev.inpatient))+'</em></div><div class="mcr-compare-row"><b>月目标进度</b><span>金额'+x.amountRate.toFixed(1)+'% vs 时间'+x.timeRate.toFixed(1)+'%</span><em class="'+(((x.timeRate-x.amountRate)>=0)?'bad':'good')+'">'+(((x.timeRate-x.amountRate)>=0)?'落后':'领先')+Math.abs(x.timeRate-x.amountRate).toFixed(1)+'pt</em></div></div></article><article class="mkt-card"><div class="mkt-card-head"><div><h2>AI经营判断</h2><p>财务、结构、患者流动与数据质量综合判断</p></div></div><ul class="mcr-ai-list"><li><i>1</i><span>'+((x.remainingDays===0)?('<b>'+M_LAB_SP+'已收官</b>：累计 '+wan(m.total)+' 万元（'+m.days+' 天），完成目标 260 万的 '+pct(m.total/goal)+'，缺口 '+wan(goal-m.total)+' 万元，月度目标未达成。'):('月累计'+wan(m.total)+'万元，若按'+m.days+'天平均速度推演，月末约'+wan(forecast)+'万元，预计缺口'+wan(goal-forecast)+'万元；达标需未来'+x.remainingDays+'天日均'+wan(x.requiredDaily)+'万元。'))+'</span></li><li><i>2</i><span>本周前'+w.days+'天较上周同期增长'+weekGrowth.toFixed(1)+'%，'+((x.remainingDays===0)?('日均'+wan(w.average)+'万元，较全月日均'+wan(m.average)+'万元高'+pct(w.average/m.average-1)+'。'):('但本周日均'+wan(w.average)+'万元仅为达标所需速度的'+pct(w.average/x.requiredDaily)+'。'))+'</span></li><li><i>3</i><span>'+M_LAB+'单日高点 '+top3.map(function(r){return shortDate(r.date)}).join('、')+' 合计'+wan(top3Total)+'万元，占月累计'+pct(top3Total/m.total)+'；营收对周末与单日峰值依赖较高。</span></li><li><i>4</i><span>'+M_LAB+'累计入院'+m.admissions+'、出院'+m.discharges+'，净增'+(m.admissions-m.discharges)+'人；本周净增'+(w.admissions-w.discharges)+'人，需继续核验新增患者后续治疗与收费兑现。</span></li></ul></article></section>'+
      '<section class="mcr-month-main"><article class="mkt-card"><div class="mkt-card-head"><div><h2>'+M_DOT+'—'+((+last.date.slice(8)))+'日逐日营业额</h2><p>单位：万元 · 黄色为全月最高日</p></div><span class="mkt-badge">峰值 '+shortDate(x.topDays[0].date)+' · '+wan(x.topDays[0].total)+'万</span></div>'+bars(all,'mcr-month-bars')+'<p class="mcr-note">周末6天贡献'+wan(x.weekend.total)+'万元，占月累计'+pct(x.weekend.total/m.total)+'；周末日均'+wan(x.weekend.average)+'万元，较工作日日均'+wan(x.weekday.average)+'万元高'+delta(x.weekend.average,x.weekday.average).toFixed(1)+'%。</p></article></section>'+
      '<section class="mcr-main"><article class="mkt-card"><div class="mkt-card-head"><div><h2>'+WEEK+'逐日营业额</h2><p>'+(_pw?('已完成 '+_pw.days+' 天 · 逐日齐全'):'')+'</p></div><span class="mkt-badge">'+(_pw?('共 '+_pw.days+' 天'):'')+'</span></div>'+pendingWeekBars(wrows)+'<p class="mcr-note">该周合计 <b>'+(_pw?wan(_pw.total):'—')+'万</b>、日均 '+(_pw?wan(_pw.average):'—')+'万；单日高点见柱状图。</p></article><div class="mcr-side"><article class="mkt-card"><div class="mkt-card-head"><div><h2>'+M_LAB+'收入结构</h2><p>门诊与住院基本均衡</p></div></div><div class="mcr-ring-row"><div class="mcr-ring month" style="--out:'+(m.outpatient/m.total*100).toFixed(1)+'%"><span>'+wan(m.total)+'万<small>月累计</small></span></div><div class="mcr-legend"><span><b>门诊 '+wan(m.outpatient)+'万</b>'+pct(m.outpatient/m.total)+'</span><span><b>住院 '+wan(m.inpatient)+'万</b>'+pct(m.inpatient/m.total)+'</span></div></div></article><article class="mkt-card"><div class="mkt-card-head"><div><h2>'+M_LAB+'患者流动</h2><p>同期数量，不作为患者级转化率</p></div></div><div class="mcr-flow"><div>门诊人次<b>'+m.visits+'</b></div><div>入院<b>'+m.admissions+'</b></div><div>出院<b>'+m.discharges+'</b></div></div><p class="mcr-note">初诊'+m.first+'、复诊'+m.repeat+'；期末在院'+(lw.value==null?'待补':lw.value)+'人（'+mdOf(lw.date)+'）。门诊与入院未做患者ID匹配，不直接计算转化率。</p></article></div></section>'+
      '<section class="mcr-two"><article class="mkt-card"><div class="mkt-card-head"><div><h2>周度经营拆分</h2><p>收入、日均与月累计贡献</p></div></div><div class="mcr-week-grid">'+weekCards(x)+'</div></article><article class="mkt-card"><div class="mkt-card-head"><div><h2>收入集中度与风险</h2><p>识别峰值依赖和收入波动</p></div></div><div class="mcr-risk-list"><div><b>TOP 3日贡献</b><strong>'+pct(top3Total/m.total)+'</strong><span>'+top3.map(function(r){return shortDate(r.date)}).join('、')+'</span></div><div><b>周末贡献</b><strong>'+pct(x.weekend.total/m.total)+'</strong><span>6天贡献'+wan(x.weekend.total)+'万元</span></div><div><b>复诊占门诊人次</b><strong>'+pct(m.repeat/m.visits)+'</strong><span>复诊'+m.repeat+'／门诊'+m.visits+'人次</span></div><div><b>'+((x.remainingDays===0)?(M_LAB_SP+'收官缺口'):'月末达标压力')+'</b><strong class="bad">'+((x.remainingDays===0)?(wan(x.remaining)+'万'):(wan(x.requiredDaily)+'万/日'))+'</strong><span>'+((x.remainingDays===0)?('完成目标 '+pct(m.total/goal)):('为本周日均的'+(x.requiredDaily/w.average).toFixed(2)+'倍'))+'</span></div></div></article></section>'+
      '<details class="mkt-card mcr-detail" open><summary><span><b>'+WEEK+'逐日经营明细</b><small>门诊、住院、患者流动与累计收入同表核对</small></span><em>展开／收起</em></summary><div class="mcr-table-wrap"><table class="mcr-table"><thead><tr><th>日期</th><th>门诊收入</th><th>住院收入</th><th>初诊</th><th>复诊</th><th>入院</th><th>出院</th><th>在院</th><th>当日合计</th><th>当月累计</th></tr></thead><tbody>'+rowsHtml(wrows)+'</tbody><tfoot><tr><td>'+WEEK_CUR+'合计</td><td>'+wan(w.outpatient)+'万</td><td>'+wan(w.inpatient)+'万</td><td>'+w.first+'</td><td>'+w.repeat+'</td><td>'+w.admissions+'</td><td>'+w.discharges+'</td><td>期末'+(lw.value==null?'—':lw.value)+'</td><td>'+wan(w.total)+'万</td><td>'+wan(m.total)+'万</td></tr></tfoot></table></div></details>'+
      '<details class="mkt-card mcr-detail"><summary><span><b>'+M_DOT+'—'+((+last.date.slice(8)))+'日完整日报</b><small>'+m.days+'天、10个字段、可横向滚动核对</small></span><em>展开／收起</em></summary><div class="mcr-table-wrap"><table class="mcr-table"><thead><tr><th>日期</th><th>门诊收入</th><th>住院收入</th><th>初诊</th><th>复诊</th><th>入院</th><th>出院</th><th>在院</th><th>当日合计</th><th>当月累计</th></tr></thead><tbody>'+rowsHtml(all)+'</tbody><tfoot><tr><td>'+M_DOT+'—'+mdOf(last.date).replace('月','.').replace('日','')+'合计</td><td>'+wan(m.outpatient)+'万</td><td>'+wan(m.inpatient)+'万</td><td>'+m.first+'</td><td>'+m.repeat+'</td><td>'+m.admissions+'</td><td>'+m.discharges+'</td><td>期末'+(lw.value==null?'—':lw.value)+'</td><td>'+wan(m.total)+'万</td><td>'+wan(m.total)+'万</td></tr></tfoot></table></div></details>'+
      '<article class="mkt-card mcr-quality"><div class="mkt-card-head"><div><h2>数据完整性与口径</h2><p>计算结果可用于经营观察；绩效结算仍需患者级和收费流水复核</p></div><span class="mkt-badge">口径透明</span></div>'+quality(m,last,all)+'<p class="mcr-note">'+(M_NUM===9?'9月1—6日截图存在旧值与后续修订值，本报告采用与 9月7 日起累计连续衔接的后续修订口径。':'本报告逐日取自营收日报原值，未做跨期分摊；门诊＋住院＝当日合计。')+'出院＝出院初次＋出院多次；报告期内逐日齐全，无待补日，不以 0 计入。</p></article>'+
      '<p class="mkt-source">数据源：'+source.source+'。报告范围：2026年'+M_LAB+'1日—'+mdOf(last.date)+'；实际数据截至'+source.updatedAt+'。财务预测为经营测算，不替代财务结账；门诊、入院、出院未做患者级ID串联，不将同期数量直接解释为转化率。</p>';
  }
  render();window.addEventListener('september-revenue-updated',render);
  window.updateMarketingReport=function(patch){if(patch&&Array.isArray(patch.rows))window.updateSeptemberRevenueData(patch.rows);else render();return window.MARKETING_REPORT_DATA};
})();
