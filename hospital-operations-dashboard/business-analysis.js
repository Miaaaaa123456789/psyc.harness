(function(){
  /* ============================================================================
     经营问题总览（#decisionCore）
     ----------------------------------------------------------------------------
     ⚠ 改造纪律（业主 2026-09-28）：**外观与结构完全保留，只让数字活起来**。
     DOM 结构、class 名、文案排版一字不动；只把会变的数字换成变量插值。

     两类数据分开处理：
       · 营收类（累计 / 缺口 / 剩余天数 / 时间进度 / 落后 / 日均 / 达标日均 / 预测）
         → 一律取自 window.SEPTEMBER_REVENUE_DATA.facts()，随拖入数据实时变化。
       · 非营收类（护理 / 客服 / 营销 / 心理）
         → 收进下方 SEC 常量集中管理；它们来自别的数据源，改一处即可，模板结构不动。
     ========================================================================== */
  /* ---- 非营收口径（来自护理 / 客服 / 营销各源；集中在此便于单独更新） ---- */
  var SEC = {
    nurseShould: 1278, nurseDone: 1177, nurseMiss: 101, nurseRate: '92.1', nurseDrop: '25.4',
    nurseWeek: '9.20—9.26',
    svcCallback: 52, svcArrived: 18, svcRate: '34.6', svcRatePrev: '37.0',
    mktContacts: 28, mktAdmit: 8, mktRate: '28.6', mktRatePrev: '16.7',
    mktDeals: 119, mktDealsPrev: 80, mktHosp: 22, mktHospPrev: 15,
    mktConvertRate: '18.5', mktConvertPrev: '18.8',
    inHouse: 31, inHousePrev: 27
  };

  function F() {
    var d = window.SEPTEMBER_REVENUE_DATA;
    if (d && typeof d.facts === 'function') { try { return d.facts(); } catch (e) { } }
    return null;
  }
  function txt(v, dflt) { return (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) ? dflt : v; }

  /* ⭐ 结算月标签（2026-10-06 主面板切 10 月）—— 别再写死「9月」 */
  var BA_MONTH=(window.SEPTEMBER_REVENUE_DATA&&window.SEPTEMBER_REVENUE_DATA.SETTLED_MONTH)||'2026-10';
  var BA_NUM=+BA_MONTH.slice(5,7), BA_LAB=BA_NUM+'月', BA_LAB_SP=BA_NUM+' 月', BA_DOT=BA_NUM+'.1';
  function buildHTML() {
    var f = F() || {};
    var lastShort = txt(f.labelDateShort, '10.6');            // 10.5
    var remainDays = txt(f.remainDays, 25);
    var totalWan = txt(f.totalWan, '57.15');
    var amountRate = (f.amountRate != null) ? f.amountRate.toFixed(1) : '22.0';
    var timeRate = (f.timeRate != null) ? f.timeRate.toFixed(1) : '19.4';
    var lagPt = (f.lagPt != null) ? f.lagPt.toFixed(1) : '-2.6';
    var remainWan = txt(f.remainWan, '202.85');
    var needDailyWan = txt(f.needDailyWan, '8.11');
    var mtdAvgWan = txt(f.mtdAvgWan, '9.53');
    var gapDailyWan = txt(f.gapDailyWan, '0.00');
    var forecastWan = txt(f.forecastWan, '227.17');
    var forecastGapWan = txt(f.forecastGapWan, '32.83');
    var weekAvgWan = txt(f.weekAvgWan, '8.19');
    var monthClosed = !!f.monthClosed;
    /* ⚠ 「上周同期区间 / 同期日均 / 环比增幅」三项原为硬编码 ——
       周窗口一滚就全错（天数、区间、日均、增幅都会变）。
       改为从 derive() 实时算。 */
    var _dv=(window.SEPTEMBER_REVENUE_DATA&&window.SEPTEMBER_REVENUE_DATA.derive)?window.SEPTEMBER_REVENUE_DATA.derive():null;
    var _pc=_dv&&_dv.previousComparable?_dv.previousComparable:null;
    var _cw=_dv&&_dv.currentWeek?_dv.currentWeek:null;
    var _periodLab=(_dv&&_dv.period&&_dv.period.label)?_dv.period.label:'';
    var pcDays=(_pc&&_pc.days)?_pc.days:'—';
    var pcAvgWan=(_pc&&_pc.days)?(_pc.total/_pc.days/10000).toFixed(2):'—';
    /* ⚠⚠ 同期区间**必须**直接用数据层给的 label。
       原先从 _dv.weeks 的「最后一个非本周周」反推 —— 本期改成两周窗口后，
       数组里未发生的周（10.26—10.31）会被取到，算出「上周同期 10.19—10.26」这种未来区间。 */
    var pcLabel=(_pc&&_pc.label)?_pc.label:'上一期同期';
    var _g=(_cw&&_pc&&_pc.total)?((_cw.total/_pc.total-1)*100):null;
    var growthTxt=(_g!=null)?('上升 <b>'+_g.toFixed(1)+'%</b>'):'环比待算';

    var analysisHTML=`<section class="decision-core" id="decisionCore"><header class="dc-head"><div><h2>经营问题总览</h2><p>当前不是单一部门表现不好，而是“营收速度不足、转化链条断点、服务兑现流失、数据口径混乱”同时存在。月度营收进度只是最终表现，根本问题是跨部门转化链没有闭合。</p></div><span class="dc-scope">本期 ${_periodLab} · 数据截至 ${lastShort}（营收 ${lastShort}）</span></header><div class="dc-system"><div class="dc-chain"><div class="dc-node"><i>前端</i><b>触达增加</b><span>客服随访${SEC.svcCallback}条、到院${SEC.svcArrived}人，但收入未同步增长</span></div><div class="dc-node"><i>转化</i><b>有效入院不足</b><span>营销接触${SEC.mktContacts}人、入院${SEC.mktAdmit}人，转化回升但仍待观察</span></div><div class="dc-node"><i>服务</i><b>承接与兑现流失</b><span>心理业务回落，护理存在${SEC.nurseMiss}人次应做未做</span></div><div class="dc-node"><i>结果</i><b>营收速度不足</b><span>营收日报日均${mtdAvgWan}万（${lastShort} 止），${monthClosed?`全月收官 · 缺口 ${remainWan} 万`:`达标需${needDailyWan}万`}</span></div></div></div><div class="dc-risks"><article class="dc-risk red"><label>月目标风险</label><strong>${(parseFloat(lagPt)>=0?'落后 ':'领先 ')}${Math.abs(parseFloat(lagPt)).toFixed(1)}pt</strong><p>累计${totalWan}万（${BA_DOT}—${lastShort}），${monthClosed?`<b>${BA_LAB_SP}已收官</b>，缺口 <b>${remainWan} 万</b>，月度目标未达成`:`剩余${remainDays}天还需${remainWan}万，日均缺口${gapDailyWan}万`}。</p></article><article class="dc-risk orange"><label>前端未变现</label><strong>到院率${SEC.svcRate}%</strong><p>随访 +13.0%、到院 +5.9%，营业额 +13.3% 同步增长；但到院率由 ${SEC.svcRatePrev}% 降到 ${SEC.svcRate}%，付费转化效率待提高。</p></article><article class="dc-risk blue"><label>营销转化</label><strong>${SEC.mktDealsPrev}条 → ${SEC.mktDeals}条</strong><p>管家转住院 ${SEC.mktHospPrev}→${SEC.mktHosp} 人、率值 ${SEC.mktConvertPrev}%→${SEC.mktConvertRate}%，对接量上量而转化率持平，仍需患者级去重与收费归因后才能定论。</p></article><article class="dc-risk purple"><label>数据可用性</label><strong>5组口径冲突</strong><p>趋势可用，但暂不能支持精确绩效排名或奖金结算。</p></article></div><div class="dc-detail-grid">
  <details class="dc-item" open><summary><span class="dc-no">1</span>月度营收节奏达标、但依赖单日高点</summary><p>完成率<b>${amountRate}%</b>${(parseFloat(amountRate)>=parseFloat(timeRate)?'高于':'低于')}时间进度${timeRate}%。本期日均<b>${weekAvgWan} 万</b>，较上一期同期（${pcLabel}，同为 ${pcDays} 天）的 <b>${pcAvgWan} 万</b>${growthTxt}；按当前节奏推演，月末约 ${forecastWan} 万：${(parseFloat(forecastGapWan)>0)?('仍差约 '+forecastGapWan+' 万，必须明确新增收入来源。'):('已可覆盖 260 万目标、超出 '+Math.abs(parseFloat(forecastWan)-parseFloat(txt(f.goalWan,260))).toFixed(2)+' 万；但仍需盯住单日高点依赖与初诊补充。')}</p></details>
  <details class="dc-item" open><summary><span class="dc-no">2</span>触达与收入同向增长，但到院率在下降</summary><p>客服随访${SEC.svcCallback}条、到院${SEC.svcArrived}人；上周同期46条、到院17人。随访 <b>+13.0%</b>、到院 <b>+5.9%</b>、营业额 <b>+13.3%</b> 同向增长，未出现「触达涨、收入跌」；<b>但到院率从 ${SEC.svcRatePrev}% 降到 ${SEC.svcRate}%</b>。后续仍须追踪<b>挂号—检查—治疗—入院—实际收入</b>，不能只考核随访量和到院量。</p></details>
  <details class="dc-item"><summary><span class="dc-no">3</span>营销转化率上升不能解释为效率改善</summary><p>营销对接${SEC.mktContacts}条、入院${SEC.mktAdmit}人，转化率${SEC.mktRate}%；上一期24条、入院4人，${SEC.mktRatePrev}%。入院与对接同步上升，但样本仍小，且心理转介减少，存在服务结构失衡风险。</p></details>
  <details class="dc-item"><summary><span class="dc-no">4</span>心理咨询组已从断点转为回升</summary><p>完整周（9.21—9.27，7 天）患者接触 65 人次（9.14—9.20 为 40，<b>+62.5%</b>）、咨询工作量 45 人次（26，<b>+73.1%</b>），六人全员填报。仍需核验转介是否进入服务、项目组合、登记计费、团体与家属工作漏记及排班承接能力。</p></details>
  <details class="dc-item"><summary><span class="dc-no">5</span>住院规模没有形成增长</summary><p>上一期（9.14—9.27，14 天）入院 32 人、出院 27 人，净增 5 人；本期（9.28—10.5，8 天）入院 18 人、出院 14 人，净增 4 人，10.5 日终在院 37 人。住院端基本进出平衡，难以单独承担剩余营收缺口；医生表还存在「在管 35 人」与「在院」口径差异及入院日期缺失。</p></details>
  <details class="dc-item"><summary><span class="dc-no">6</span>护理与物理治疗存在兑现损失</summary><p>应执行${SEC.nurseShould}人次、完成${SEC.nurseDone}人次，仍有<b>${SEC.nurseMiss}人次未执行</b>；治疗应做量较参考期上升约${SEC.nurseDrop}%。当前缺少改期、替代项目、再次沟通、计费与退费的完整闭环。</p></details>
  <details class="dc-item"><summary><span class="dc-no">7</span>业务集中在少数人员和日期</summary><p>客服单人负担上升、在院患者集中于少数管床医生、心理记录集中于少数人员和单日、营收依赖周末和高收入日。按总量排名容易奖励资源集中，而非效率与质量。</p></details>
  <details class="dc-item"><summary><span class="dc-no">8</span>数据口径不统一是最大管理障碍</summary><p>仍存在客服67/68、营销78/80、心理34/40、医生在院${SEC.inHouse}人（营收日报）对医生表在管 35 人；客服台账与线上表、营销汇总与逐条等差异仍待统一。医生组与护理组台账尚未滚动到本期，必须明确区分“本期”与“上一期完整”。</p></details></div><p class="dc-note"><b>管理结论：</b>优先修复患者级跨部门追踪和“医嘱—排程—执行—计费—退费”闭环；绩效排名只作月内动态试算，待口径冲突、缺失和归因完成后再在月末锁定。</p></section>`;
    return analysisHTML;
  }

  /* 覆盖营销面板里的营收数字（结构不动，只改数值） */
  function decorateShell() {
    var f = F() || {};
    var shell=document.querySelector('.mkt-v2');if(!shell)return;
    var lastShort = txt(f.labelDateShort, '10.6');
    var remainDays = txt(f.remainDays, 25);
    var totalWan = txt(f.totalWan, '57.15');
    var amountRate = (f.amountRate!=null)?f.amountRate.toFixed(1):'22.0';
    var remainWan = txt(f.remainWan, '202.85');
    var needDailyWan = txt(f.needDailyWan, '8.11');
    var mtdAvgWan = txt(f.mtdAvgWan, '9.53');
    var gapDailyWan = txt(f.gapDailyWan, '0.00');
    var weekVal = shell.querySelector('.mkt-amount');
    if(weekVal){
      var cw = f.currentWeek || null;
      /* ⚠ 兜底值原写死一个过期周额、日均与环比百分比，数据到 9.30 后全部过时。
         环比改为从 source.derive() 实时算，兜底值同步到当前口径。 */
      var _x=(window.SEPTEMBER_REVENUE_DATA&&window.SEPTEMBER_REVENUE_DATA.derive)?window.SEPTEMBER_REVENUE_DATA.derive():null;
      var _pv=_x&&_x.previousComparable?_x.previousComparable:null;
      var _cw=_x&&_x.currentWeek?_x.currentWeek:(cw||null);
      var _growth=(_cw&&_pv&&_pv.total)?((_cw.total/_pv.total-1)*100):null;
      var wkTotalWan = (f.weekAvgWan!=null && f.weekDays) ? (parseFloat(f.weekAvgWan)*f.weekDays).toFixed(2) : '24.56';
      weekVal.innerHTML='¥'+wkTotalWan+'<i>万</i>';
      var sub = shell.querySelector('.mkt-sub');
      if(sub) sub.textContent=(function(){try{var _d=window.SEPTEMBER_REVENUE_DATA;if(_d&&_d.derive){var _s=((_d.derive().currentWeek||{}).from)||'';if(_s)return (+_s.slice(5,7))+'.'+(+_s.slice(8))+'—';}}catch(e){}return BA_DOT+'—';})()+lastShort+' · 日均 ¥'+txt(f.weekAvgWan,'7.08')+'万'
        +(_growth!=null?(' · 较上周同期 '+(_growth>=0?'+':'')+_growth.toFixed(1)+'%（同为 '+((_cw&&_cw.days)||'—')+' 天）'):'');
    }
    var k=shell.querySelector('.mkt-kpis');if(k)k.innerHTML=`<article class="mkt-kpi"><div class="mkt-kpi-head"><i class="mkt-ico">☎</i>客服随访</div><strong>${SEC.svcCallback}条</strong><span>较上周同期 +13.0%（9.14—9.17）</span></article><article class="mkt-kpi green"><div class="mkt-kpi-head"><i class="mkt-ico">◎</i>标记到院</div><strong>${SEC.svcArrived}人</strong><span>到院率 ${SEC.svcRate}%</span></article><article class="mkt-kpi"><div class="mkt-kpi-head"><i class="mkt-ico">♧</i>营销接触</div><strong>${SEC.mktContacts}人</strong><span>较上周同期 +16.7%</span></article><article class="mkt-kpi green"><div class="mkt-kpi-head"><i class="mkt-ico">↗</i>营销入院</div><strong>${SEC.mktAdmit}人</strong><span>较上周同期 +100%</span></article><article class="mkt-kpi purple"><div class="mkt-kpi-head"><i class="mkt-ico">％</i>营销转化</div><strong>${SEC.mktConvertRate}%</strong><span>小样本，不判定改善</span></article><article class="mkt-kpi"><div class="mkt-kpi-head"><i class="mkt-ico">▥</i>在院参考</div><strong>${SEC.inHouse}人</strong><span>${lastShort} 日终时点</span></article>`;
    var oldBanner = shell.querySelector('.mkt-analysis-banner'); if(oldBanner) oldBanner.remove();
    var oldGrid = shell.querySelector('.mkt-analysis-grid'); if(oldGrid) oldGrid.remove();
    if(k)k.insertAdjacentHTML('afterend',`<div class="mkt-analysis-banner"><i>!</i><div><b>月度营收已进入高风险区</b><span>累计${totalWan}万，完成${amountRate}%；剩余${remainDays}天需${remainWan}万。当前日均${mtdAvgWan}万，距离达标所需日均${needDailyWan}万仍差${gapDailyWan}万。</span></div></div><div class="mkt-analysis-grid"><article class="mkt-analysis-card"><label>客服触达</label><strong>触达与收入同向</strong><p>到院 17→${SEC.svcArrived} 人、回访 +13.0%、营业额 +13.3%；但到院率 ${SEC.svcRatePrev}%→${SEC.svcRate}%，转化效率待提高。</p></article><article class="mkt-analysis-card"><label>营销转化</label><strong>本期明显回升</strong><p>对接 24→${SEC.mktContacts} 条、入院 4→${SEC.mktAdmit} 人，转化率 ${SEC.mktRate}%，待患者级归因确认。</p></article><article class="mkt-analysis-card"><label>服务承接</label><strong>心理组断点</strong><p>接触、家属工作和收入均明显回落。</p></article><article class="mkt-analysis-card"><label>治疗兑现</label><strong>${SEC.nurseMiss}人次未完成</strong><p>缺少改期、替代、计费与退费闭环。</p></article></div>`);
    var charts=shell.querySelectorAll('.mkt-card');for(const c of charts){if(c.querySelector('h2')?.textContent==='每日营业收入'||c.querySelector('h2')?.textContent==='营收速度缺口'){c.querySelector('.mkt-card-head').innerHTML='<div><h2>营收速度缺口</h2><p>日均万元 · 当前速度不足达标所需的一半</p></div><span class="mkt-badge">缺口 '+gapDailyWan+'万/日</span>';var bars=c.querySelector('.mkt-bars')||c.querySelector('.gap-bars');if(bars){var mtdNum=parseFloat(mtdAvgWan), needNum=parseFloat(needDailyWan);var prevAvg=parseFloat('8.51');var h1=needNum?Math.round(mtdNum/needNum*100):51;var h2=needNum?Math.round(prevAvg/needNum*100):42;bars.outerHTML='<div class="gap-bars"><div class="gap-bar"><em>'+mtdAvgWan+'万</em><i style="--h:'+h1+'%"></i><span>本周实际日均</span></div><div class="gap-bar"><em>'+prevAvg.toFixed(2)+'万</em><i style="--h:'+h2+'%"></i><span>上周日均</span></div><div class="gap-bar required"><em>'+needDailyWan+'万</em><i style="--h:100%"></i><span>达标所需日均</span></div></div>';}break}}
    var bottom=shell.querySelector('.mkt-bottom');
    if(bottom){
      var oldWarn=shell.querySelector('.mkt-data-warning'); if(oldWarn) oldWarn.remove();
      bottom.insertAdjacentHTML('afterend',`<section class="mkt-data-warning"><h2>数据口径风险：当前看板可发现趋势，但暂不能用于奖金结算</h2><p>客服回访存在<b>${SEC.svcCallback} / 67</b>（台账已录 9.21—9.27 对上期完整）、管家对接存在<b>${SEC.mktDeals} / ${SEC.mktDealsPrev}</b>（逐条记录对业主汇总表）、心理接触存在<b>60 / 40</b>（V4 逐条对表头口径）、医生在院存在<b>${SEC.inHouse} / 35</b>（营收日报对医生工作量表「在管」口径）等差异；医生组 / 护理组 / 心理组主表均已滚动到 9.21—9.27，营收日报真实数据已到 ${txt(f.labelDateShort,'9.26')}。所有排名需保留“数据期、来源、冲突状态”，月末核验后再锁定。</p></section>`);
    }
  }

  /* 首次渲染 + 数据更新后重绘（结构不变，只更新数字） */
  function mount(){
    var overview=document.getElementById('overview');
    var old=document.getElementById('decisionCore');
    if(old) old.remove();
    if(overview) overview.insertAdjacentHTML('afterend', buildHTML());
    var rank=document.getElementById('rankGovernance'),workspace=document.querySelector('.workspace');
    if(rank&&workspace&&rank.parentNode!==workspace)workspace.appendChild(rank);
    decorateShell();
  }
  function boot(){
    var rank=document.getElementById('rankGovernance'),workspace=document.querySelector('.workspace');if(rank&&workspace)workspace.appendChild(rank);
    mount();
    /* 数据更新后重绘本区块（结构不变，只刷新数字）。
       'ops:core-refresh' 是 data-import.js 的 renderRevenue 在每次写入后派发的专用事件。 */
    ['ops:revenue-updated','september-revenue-updated','ops:core-refresh'].forEach(function(ev){
      window.addEventListener(ev,function(){ try{ mount(); }catch(e){} });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
