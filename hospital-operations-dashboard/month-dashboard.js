(function(){
  'use strict';

  /* ⚠ 改造纪律（业主 2026-09-28）：**外观与结构完全保留，只让数字活起来**。
     本模块已监听 september-revenue-updated，但模板里仍有写死的文案数字，此处统一接上口径。 */
  function MDF(){ var d=window.SEPTEMBER_REVENUE_DATA;
    if(d&&typeof d.facts==='function'){ try{ return d.facts(); }catch(e){} } return null; }
  function MDFv(v,dflt){ return (v==null||v===''||(typeof v==='number'&&!isFinite(v)))?dflt:v; }
  function MDFt(){ var f=MDF()||{}; return {
    date: MDFv(f.labelDateShort,'9.30'), dateCN: MDFv(f.labelDate,'9月30日'),
    remain: MDFv(f.remainDays,0), total: MDFv(f.totalWan,'227.17'),
    amt: (f.amountRate!=null?f.amountRate.toFixed(1):'87.4'),
    tim: (f.timeRate!=null?f.timeRate.toFixed(1):'100.0'),
    need: MDFv(f.needDailyWan,'0.00'), remainWan: MDFv(f.remainWan,'32.83'),
    avg: MDFv(f.mtdAvgWan,'7.57')
  }; }
  /* ⭐ 本周标签按**实际有数据的末日**生成：数据至 10.1 →「本周（9.28—10.1）」；
     不写死 10.4，否则会让人以为 10.2—10.4 也有数据。
     ⚠ 下面 WEEK_SUFFIX / WEEK_LABEL_RE 都从 WEEK 派生，改这里即可，勿单独改一处。 */
var WEEK=(function(){
var _d=window.SEPTEMBER_REVENUE_DATA, _r=(_d&&_d.rows)||[];
var _last=_r.length?_r[_r.length-1].date:'';
var _end=_last||'2026-10-04';
/* ⚠ 周一不可硬编码 9.28（原文写死 '本周（9.28—'，进 10 月后一旦数据末日跨到下一周就会错）。
   改为从数据末日反推所在自然周的周一；并给出「本周是否已完整（末日＝周日）」标记。 */
var _dt=new Date(_end+'T00:00:00');
var _mon=new Date(_dt.getTime()-((_dt.getDay()===0?6:_dt.getDay()-1))*86400000);
function _s(o){return o.getFullYear()+'-'+String(o.getMonth()+1).padStart(2,'0')+'-'+String(o.getDate()).padStart(2,'0');}
window.__WEEK_DONE = (_dt.getDay()===0);
/* ⚠ 周一与末日相同（本周才刚开始、只录了 1 天，如 10.5 周一）时不能写成「10.5—10.5」，
   单日周直接写「本周（10.5）」。 */
var _monS=_s(_mon);
var _a=(+_monS.slice(5,7))+'.'+(+_monS.slice(8));
var _b=(+_end.slice(5,7))+'.'+(+_end.slice(8));
return '本周（'+(_monS===_end?_a:_a+'—'+_b)+'）';
})();
  /* 归一化的「排除项」必须是**当前** WEEK 标签本身，否则已带标签的文案会被再追加一次：
     「本周（9.28—10.1）」→「本周（9.28—10.1）（9.28—10.1）」（周窗口滚动后实测命中，部门卡脚注重复）。
     此前把排除项写死成 9.21—9.27，窗口一滚就失效。 */
  /* ⚠ 负向先行断言里放的必须是「本周」**之后**的那段（＝ WEEK 去掉开头的「本周」），
     不是整条 WEEK —— 被匹配的是「本周」，紧随其后的是「（9.28—10.1）」。
     写成整条 WEEK 会让断言恒真 → 每渲染一次就再追加一次标签
     （实测出现「本周（9.28—10.1）（9.28—10.1）期内单日高点」）。 */
  var WEEK_SUFFIX=WEEK.replace(/^本周/,'');
  var WEEK_LABEL_RE=new RegExp('本周(?!'+WEEK_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','g');
  var PWEEK='上周（9.21—9.27）';   /* 各部门源表最新完整周 */
  var baseData={
    meta:{range:'9月1日—9月30日（报告期）',updated:'数据截至 2026年9月30日 23:59'},
    kpis:[
      {label:'9月累计营业额',value:'227.17',unit:'万元',note:'截至 9.30 · 完成目标 87.4%'},
      {label:WEEK+'营业额',value:'24.56',unit:'万元',note:'9.28—9.30 · 日均 8.19 万'},
      {label:'在院人数',value:'34',unit:'人',note:'9.30 日终时点'},
      {label:WEEK+'入院',value:'7',unit:'人',note:'9.28—9.30 已发生'},
      {label:WEEK+'出院',value:'6',unit:'人',note:'营收日报口径（含多次）'},
      {label:'物理治疗',value:'582',unit:'人次',note:'9.20—9.26 项目口径'}
    ],
    target:{closed:true,actual:227.17,goal:260,amountRate:87.4,timeRate:100,gap:12.6,days:0,remaining:32.83,requiredDaily:0,currentDaily:8.19,dailyGap:0},
    alerts:[
      {tone:'red',icon:'↘',tag:'高风险',title:'营收速度不足',copy:'截至'+MDFt().dateCN+'金额完成'+MDFt().amt+'%，落后时间进度12.6个百分点，9 月已收官，缺口 32.83 万元，月度目标未达成。'},
      {tone:'orange',icon:'◆',tag:'结构风险',title:'收入集中在少数高峰日',copy:'9月26日15.69万元为全月单日最高，9月6日14.01万元、9月13日13.30万元次之。'},
      {tone:'purple',icon:'＋',tag:'患者池变化',title:'本周净增1人',copy:'9.28—9.30 入院7人、出院6人，9月30日日终在院34人。'},
      {tone:'blue',icon:'✓',tag:'已核验',title:'30天累计连续勾稽',copy:'9月1—9月30日每日合计与累计连续一致；9月1—6日采用后续修订口径，全月 30 天无缺日。'}
    ],
    daily:[
      {d:'9.23',v:6.245896},{d:'9.24',v:7.746587},{d:'9.25',v:10.118749},{d:'9.26',v:15.687707},{d:'9.27',v:8.928684},{d:'9.28',v:10.202210},{d:'9.29',v:6.735500},{d:'9.30',v:7.622689}
    ],
    weeks:[
      {label:'9.1—9.6',value:45.23},{label:'9.7—9.13',value:48.65},{label:'9.14—9.20',value:49.15},{label:'9.21—9.27',value:59.59},{label:'9.28—9.30',value:24.56,current:true}
    ],
    funnelAdm:7,funnelDis:6,funnelNet:1,funnelWard:34,funnelWardAt:'9.30',
    funnel:[
      {label:'门诊',value:'66人次'},{label:'入院',value:'7人'},{label:'出院',value:'6人'},{label:'在院',value:'34人'}
    ],
    departments:[
      {key:'doctor',cls:'doctor',icon:'医',name:'医生组',desc:'住院规模与管床贡献',metric:'34 人',note:'在院 · 9.30 时点',foot:'本周入院 7 · 出院 6'},
      {key:'nursing',cls:'nursing',icon:'护',name:'护理组',desc:'治疗执行与服务兑现',metric:'95.2%',note:'物理治疗完成率（项目口径 · 9.20—9.26）',foot:'应做 495 · 未做 24'},
      {key:'psychology',cls:'psychology',icon:'心',name:'心理咨询组',desc:'咨询承接与收入结构',metric:'65 人次',note:PWEEK+'患者接触',foot:'9.14—9.20 为 40（+62.5%）'},
      {key:'service',cls:'service',icon:'客',name:'客服服务部',desc:'随访、到院及付费跟踪',metric:'52 条',note:PWEEK+'回访台账（已录至 9.24）',foot:'到院 18 · 34.6%'},
      {key:'marketing',cls:'marketing',icon:'营',name:'营销组',desc:'管家、工娱与渠道归集',metric:'24.56万',note:WEEK+'营业额',foot:'入院 7 · 出院 6'}
    ],
    ranks:{
      doctor:[['康X','医生组','出院费用 19.64 万（8 人次）','出院结帐明细 9.1—9.24','动态试算'],['王X','医生组','出院费用 15.98 万（9 人次）','出院结帐明细 9.1—9.24','动态试算'],['曾X','医生组','出院费用 15.84 万（11 人次，人次第 1）','出院结帐明细 9.1—9.24','动态试算'],['王X2','医生组','出院费用 12.74 万（7 人次）','出院结帐明细 9.1—9.24','动态试算'],['赵X','医生组','出院费用 11.17 万（6 人次）','出院结帐明细 9.1—9.24','动态试算']],
      nursing:[['何X','护理组','综合 0.9432 · 周总 24.93','工作量×质控（源表口径）','动态试算'],['李X','护理组','综合 0.9406 · 周总 25.68','工作量×质控（源表口径）','动态试算'],['沈X','护理组','综合 0.8764','工作量×质控（源表口径）','动态试算'],['刘X','护理组','综合 0.8640','工作量×质控（源表口径）','动态试算'],['赵X2','护理组','综合 0.8596','工作量×质控（源表口径）','动态试算']],
      psychology:[['冯X','心理咨询组','综合 0.9946 · 咨询 47 / 接触 61','累计 8.31—9.26 · 咨询2:接触1','动态试算'],['蔡X','心理咨询组','综合 0.9839 · 咨询 47 / 接触 59','累计 8.31—9.26 · 咨询2:接触1','动态试算'],['杨X4','心理咨询组','综合 0.5177 · 咨询 13 / 接触 62','累计 8.31—9.26 · 咨询2:接触1','动态试算'],['赵X3','心理咨询组','综合 0.3814 · 咨询 14 / 接触 34','累计 8.31—9.26 · 咨询2:接触1','动态试算'],['王X3','心理咨询组','综合 0.2659 · 咨询 7 / 接触 31','累计 8.31—9.26 · 咨询2:接触1','动态试算']],
      service:[['蒋X','客服服务部','日均 281.5 分 · 回访 29 条','日工作量（按日均）','动态试算'],['温X','客服服务部','日均 271.6 分 · 主动服务 9 条','日工作量（按日均）','动态试算'],['陈X3','客服服务部','日均 134.4 分 · 主动服务 9 条','日工作量（按日均）','动态试算'],['黄X','客服服务部','日均 133.5 分 · 主动服务 7 条','日工作量（按日均）','动态试算'],['张X2','客服服务部','日均 104.0 分 · 主动服务 7 条','日工作量（按日均）','动态试算']],
      marketing:[['管家B','营销组','转住院率 29.2%','对接 24 条','趋势参考'],['管家C','营销组','转住院率 21.4%','对接 14 条','趋势参考'],['管家A','营销组','转住院率 13.3%','对接 30 条','趋势参考'],['管家D','营销组','本周无新增对接','—','待核'],['管家E','营销组','本周无新增对接','—','待核']]
    }
  };

  function applyRevenueSnapshot(){
    var source=window.SEPTEMBER_REVENUE_DATA;if(!source||!source.derive)return;
    var x=source.derive(),m=x.month,w=x.currentWeek,last=source.rows[source.rows.length-1],fmt=function(v){return (v/10000).toFixed(2);},dis=w.discharges;
    /* 在院人数取「最近一个有填报的日期」，避免最后一天缺该字段时被显示成 0 */
    var lw=(source.lastWard&&source.lastWard())||{value:last.ward,date:last.date};
    var md=function(d){return d?(+d.slice(5,7))+'月'+(+d.slice(8))+'日':'';};
    var _ing=window.OPS_INGEST_DATE||'';
    var _ingTxt=_ing?(_ing.slice(0,4)+'年'+(+_ing.slice(5,7))+'月'+(+_ing.slice(8))+'日'):'';
/* ⚠ 月口径末日 ≠ 数据末日。9 月已收官（10-05 时数据末日已到 10.4），
   「报告期」与「9月累计」的截止应锁定月口径末日（9.30），
   否则会显示「9月1日—10月4日」这种自相矛盾的区间，并让人以为 9 月还在滚。
   周口径（WEEK 营业额/入院/出院）与在院时点仍跟数据末日走，两者语义不同。 */
var _mLast=(function(){var rr=String(source.reportRange||'');var p=rr.split('—');return (p[1]||'').trim();})()||last.date;
baseData.meta={range:'9月1日—'+md(_mLast)+'（报告期）',
updated:(_ingTxt&&_ing!==source.updatedThrough)?('数据截至 '+_ingTxt+'（营收 '+source.updatedAt+'）'):('数据截至 '+source.updatedAt)};
baseData.kpis=[
{label:'9月累计营业额',value:fmt(m.total),unit:'万元',note:'截至 '+md(_mLast)+' · 完成目标 '+x.amountRate.toFixed(1)+'%'},
      {label:WEEK+'营业额',value:fmt(w.total),unit:'万元',note:'截至 '+md(last.date)+' · 日均 '+fmt(w.average)+' 万'},
      {label:'在院人数',value:String(lw.value==null?'—':lw.value),unit:'人',note:(lw.date?md(lw.date):md(last.date))+' 日终时点'},
      {label:WEEK+'入院',value:String(w.admissions),unit:'人',note:(function(){var m=String(WEEK).match(/（([^—]+)—/);return (m?m[1]:'9.28')+'—'+md(last.date)+' 已发生';})()},
      {label:WEEK+'出院',value:String(dis),unit:'人',note:'营收日报口径（含多次）'},
      {label:'9月门诊人次',value:String(m.visits),unit:'人次',note:'初诊 '+m.first+'＋复诊 '+m.repeat}
    ];
    var _closed=(x.remainingDays===0);
    baseData.target={closed:_closed,actual:Number(fmt(m.total)),goal:260,amountRate:Number(x.amountRate.toFixed(1)),timeRate:Number(x.timeRate.toFixed(1)),gap:Number((x.timeRate-x.amountRate).toFixed(1)),days:x.remainingDays,remaining:Number(fmt(x.remaining)),requiredDaily:Number(fmt(x.requiredDaily)),currentDaily:Number(fmt(w.average)),dailyGap:Number(fmt(x.requiredDaily-w.average))};
    baseData.alerts=[
      {tone:'red',icon:'↘',tag:'高风险',title:'营收速度不足',copy:'截至'+md(last.date)+'金额完成'+x.amountRate.toFixed(1)+'%，落后时间进度'+(x.timeRate-x.amountRate).toFixed(1)+'个百分点，'+(x.remainingDays===0?('9 月已收官，缺口 '+fmt(x.remaining)+' 万元，月度目标未达成。'):('剩余日均需'+fmt(x.requiredDaily)+'万元。'))},
      {tone:'orange',icon:'◆',tag:'结构风险',title:'收入集中在少数高峰日',copy:'9月26日15.69万为全月单日最高（9月6日14.01万、9月13日13.30万次之），周末日均'+fmt(x.weekend.average)+'万元，平日日均'+fmt(x.weekday.average)+'万元。'},
      {tone:'purple',icon:'＋',tag:'患者池变化',title:'本周患者池'+(w.admissions-dis>=0?'净增':'净减')+Math.abs(w.admissions-dis)+'人',copy:'入院'+w.admissions+'人、出院'+dis+'人，'+(lw.date?md(lw.date):'')+'日终在院'+lw.value+'人。'},
      {tone:'blue',icon:'✓',tag:'已核验',title:m.days+'天累计连续勾稽',copy:'9月1—'+md(last.date)+'每日合计与累计连续一致；9月1—6日采用后续修订口径，全月 30 天无缺日。'}
    ];
    /* ⚠ 待补日不能硬编码 9.26/9.27：数据真到 9.26 后会重复出现两根「待更新」柱。
       改为「本周 9.21—9.27 中数据里缺的那几天」，并把日期格式统一成 09.xx（与已有柱一致）。 */
    var _have={};source.rows.forEach(function(r){_have[r.date]=1;});
    /* 逐日柱：9.21—9.30（上周完整周 + 本周进行中 3 天），不预置未来日期 */
    var _pend=[];
    baseData.daily=source.rows.filter(function(r){return r.date>='2026-09-21'&&r.date<='2026-09-30';}).map(function(r){return {d:r.date.slice(5).replace('-','.'),v:r.total/10000};}).concat(_pend);
    /* ⚠ 原按固定数组下标判断本周 —— 周窗口滚动后指向的不是本周。改为用 derive() 给的 current 标记。 */
    baseData.weeks=x.weeks.map(function(q){return {label:q.label,value:q.total/10000,current:!!q.current};});
    baseData.funnelAdm=w.admissions;baseData.funnelDis=dis;baseData.funnelNet=w.admissions-dis;
    baseData.funnelWard=(lw.value==null?'待补':lw.value);
    baseData.funnelWardAt=(lw.date?(+lw.date.slice(5,7))+'.'+(+lw.date.slice(8)):'');
    baseData.funnel=[{label:'门诊',value:w.visits+'人次'},{label:'入院',value:w.admissions+'人'},{label:'出院',value:dis+'人'},{label:'在院',value:(lw.value==null?'待补':lw.value)+'人'}];
    baseData.departments[4].metric=fmt(w.total)+'万';baseData.departments[4].foot='入院 '+w.admissions+' · 出院 '+dis;
    /* ⚠ 医生部门卡此前是静态值，营收数据推进后不跟随（表现为卡上仍写上一个时点的在院/入出院）。
       这里与营销卡一样接入快照，避免每轮都要手改。 */
    if(baseData.departments[0]){
      baseData.departments[0].metric=(lw.value==null?'—':lw.value)+' 人';
      var _ldt=lw.date||last.date;
      baseData.departments[0].note='在院 · '+(+_ldt.slice(5,7))+'.'+(+_ldt.slice(8))+' 时点';
      baseData.departments[0].foot='入院 '+w.admissions+' · 出院 '+dis;
    }
  }
  applyRevenueSnapshot();

  function clone(o){return JSON.parse(JSON.stringify(o));}
  function merge(a,b){Object.keys(b||{}).forEach(function(k){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])) merge(a[k],b[k]);else a[k]=b[k];});return a;}
  var saved={};
  try{saved=JSON.parse(localStorage.getItem('hospital-month-dashboard-v3-20260926')||'{}');}catch(e){}
  var data=merge(clone(baseData),saved);
  window.MONTH_DASHBOARD_DATA=data;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function n(v){return typeof v==='number'?v:parseFloat(v)||0;}
  /* rangeChip 抽成函数：原先只在 mount() 里写一次，导入新数据后仍显示旧营收日。
     现在 mount 与 september-revenue-updated 各调用一次，时间戳随数据同步。 */
  function writeRangeChip(){
    var range=document.getElementById('rangeChip'); if(!range) return;
    var _ig=window.OPS_INGEST_DATE||'', _snap=window.SEPTEMBER_REVENUE_DATA||{},
        _igMd=_ig?((+_ig.slice(5,7))+'月'+(+_ig.slice(8))+'日'):'';
    /* ⚠ 报告期取**结算月**末日（9月30日），不能跟数据末日走
       —— 否则会显示「9月1日—10月1日」，把 10 月并进 9 月报告。
       而「营收数据至」用数据末日（10月1日），两者语义不同，勿混用同一函数。 */
    range.innerHTML='<i>▦</i>'+monthRangeText()+' · '+WEEK+(window.__WEEK_DONE?'已完整':'进行中')+' · '
      +((_igMd&&_ig!==_snap.updatedThrough)?('部门数据至 '+_igMd+' · '):'')
      +'营收数据至 '+(lastDateMd()||'—');
  }
  /* 结算月区间文本（如「9月1日—9月30日」），来源 data.reportRange，数据层已锁结算月 */
  function monthRangeText(){
    var src=window.SEPTEMBER_REVENUE_DATA||{}, r=String(src.reportRange||'');
    var p=r.split('—');
    if(p.length<2||!p[1])return '9月1日—9月30日';
    var f=function(s){return (+s.slice(5,7))+'月'+(+s.slice(8))+'日';};
    return f(p[0])+'—'+f(p[1]);
  }
  function lastDateMd(){var src=window.SEPTEMBER_REVENUE_DATA;if(!src||!src.rows||!src.rows.length)return '';var d=src.rows[src.rows.length-1].date;return (+d.slice(5,7))+'月'+(+d.slice(8))+'日';}
  function mascotSrc(){var x=document.querySelector('.hero-mascot img,.hero-mascot,.mascot img,.mascot,[src*="mascot"],[src*="pet"]');return x&&x.tagName==='IMG'?x.src:'';}
  function oldSection(id){var el=document.getElementById(id);if(el)el.classList.add('md-legacy-hidden');}

  function bars(){
    var vals=data.daily.map(function(x){return n(x.v);}), max=Math.max.apply(null,vals.concat([1]));
    return data.daily.map(function(x,i){var has=x.v!==null&&x.v!==undefined;var h=has?Math.max(7,n(x.v)/max*150):5;return '<div class="md-bar-item"><span class="md-bar-value">'+(has?esc(n(x.v).toFixed(2))+'万':'待更新')+'</span><i class="md-bar '+(i===0||i===6?'peak':'')+'" style="height:'+h+'px;'+(!has?'opacity:.18':'')+'"></i><span class="md-bar-date">'+esc(x.d)+'</span></div>';}).join('');
  }
  function weeks(){var max=Math.max.apply(null,data.weeks.map(function(x){return n(x.value);}).concat([1]));return data.weeks.map(function(x){return '<div class="md-week-row '+(x.current?'current':'')+'"><label>'+esc(x.label)+'</label><span class="md-week-track"><i style="width:'+Math.max(6,n(x.value)/max*100)+'%"></i></span><b>'+esc(n(x.value).toFixed(2))+'万</b></div>';}).join('');}
  function kpis(){return data.kpis.map(function(x,i){return '<button class="md-kpi md-click" type="button" data-md-panel="kpi-'+i+'"><label>'+esc(x.label)+'</label><strong>'+esc(x.value)+'<em>'+esc(x.unit)+'</em></strong><span>'+esc(x.note)+'</span></button>';}).join('');}
  function alerts(){return data.alerts.map(function(x,i){return '<button class="md-card md-alert md-click '+esc(x.tone)+'" type="button" data-md-panel="alert-'+i+'"><span class="md-alert-top"><i class="md-alert-icon">'+esc(x.icon)+'</i><em class="md-severity">'+esc(x.tag)+'</em></span><h3>'+esc(x.title)+'</h3><p>'+esc(x.copy)+'</p></button>';}).join('');}
  function departments(){return data.departments.map(function(x){return '<button class="md-card md-dept md-click '+esc(x.cls)+'" type="button" data-dept="'+esc(x.key)+'"><i class="md-dept-icon">'+esc(x.icon)+'</i><h3>'+esc(x.name)+'</h3><p>'+esc(x.desc)+'</p><div class="md-dept-metric"><strong>'+esc(x.metric)+'</strong><span>'+esc(x.note)+'</span></div><div class="md-dept-foot"><span>'+esc(x.foot)+'</span><b>查看详情 ›</b></div></button>';}).join('');}
  function funnel(){return data.funnel.map(function(x){return '<div class="md-funnel-step"><span>'+esc(x.label)+'</span><b>'+esc(x.value)+'</b></div>';}).join('');}
  function ranking(tab){var rows=(data.ranks[tab]||[]);return '<table class="md-table"><thead><tr><th>排名</th><th>员工</th><th>部门</th><th>核心结果</th><th>当前依据</th><th>状态</th></tr></thead><tbody>'+rows.map(function(r,i){return '<tr><td class="rank">#'+(i+1)+'</td><td><b>'+esc(r[0])+'</b></td><td>'+esc(r[1])+'</td><td class="score">'+esc(r[2])+'</td><td>'+esc(r[3])+'</td><td><span class="status '+(r[4].indexOf('待核')>-1?'warn':'')+'">'+esc(r[4])+'</span></td></tr>';}).join('')+'</tbody></table>';
  }

  function shell(){
    var src=mascotSrc();
    return '<div class="md-dashboard" id="monthCommandCenter">'+
      '<section class="md-hero-grid" aria-label="月累计经营总览">'+
        '<article class="md-card md-summary"><header class="md-card-title"><div><h2>9月经营总览</h2><p>月累计与 '+WEEK+' 关键指标</p></div><span class="md-live"><i></i>每日 09:00 更新</span></header><div class="md-kpis">'+kpis()+'</div></article>'+
        '<article class="md-card md-target md-click" tabindex="0" role="button" data-md-panel="target"><header class="md-card-title"><div><h2>9月营收目标与预测</h2><p>金额进度与时间进度双轨监测</p></div><span class="md-period-pill">9.1—9.30</span></header><div class="md-amount"><strong>'+esc(data.target.actual)+'</strong><span>／'+esc(data.target.goal)+' 万</span></div><div class="md-progress" aria-label="金额完成 '+esc(data.target.amountRate)+'%，时间进度 '+esc(data.target.timeRate)+'%"><i style="width:'+esc(data.target.amountRate)+'%"></i><u style="left:'+esc(data.target.timeRate)+'%"></u></div><div class="md-progress-label"><div><span>金额完成</span><b>'+esc(data.target.amountRate)+'%</b></div><div><span>时间进度</span><b>'+esc(data.target.timeRate)+'%</b></div><div><span>进度差</span><b class="warn">落后 '+esc(data.target.gap)+'pt</b></div></div><p class="md-target-copy">'+(data.target.closed?(('9 月已收官（30 天）：累计 '+esc(data.target.actual)+' 万元，完成目标 '+esc(data.target.amountRate)+'%，<b>缺口 '+esc(data.target.remaining)+' 万元</b>；'+WEEK+'实际日均 '+esc(data.target.currentDaily)+' 万元。')):('剩余 '+esc(data.target.days)+' 天需 '+esc(data.target.remaining)+' 万元，日均需 '+esc(data.target.requiredDaily)+' 万元；'+WEEK+'实际日均 '+esc(data.target.currentDaily)+' 万元，真实缺口 '+esc(data.target.dailyGap)+' 万元。'))+'</p>'+(src?'<img class="md-mascot" src="'+esc(src)+'" alt="医院吉祥物">':'')+'</article>'+
      '</section>'+
      '<section class="md-alerts" aria-label="重点经营问题">'+alerts()+'</section>'+
      '<div class="md-section-head"><div><h2>营业与转化分析</h2><p>从逐日收入、周度趋势到跨部门服务兑现</p></div><button class="md-more" data-md-panel="analysis" type="button">查看完整分析</button></div>'+
      '<section class="md-analysis-grid">'+
        '<article class="md-card md-chart-card md-click" tabindex="0" role="button" data-md-panel="daily"><header class="md-chart-top"><div><h3>'+'9.21—9.30 逐日营业额</h3><p>单位：万元 · 截至 '+(lastDateMd()||'—')+'，本周剩余天数待更新</p></div><span class="md-chart-badge">日均 '+MDFt().avg+' 万</span></header><div class="md-bars">'+bars()+'</div><p class="md-chart-note">截至'+MDFt().dateCN+'累计'+MDFt().total+'万元；本周期内单日高点见柱状图。</p></article>'+
        '<div class="md-side-stack"><article class="md-card md-week-card md-click" tabindex="0" role="button" data-md-panel="weeks"><header class="md-card-title"><div><h3>9月各周营业对比</h3><p>'+WEEK+'为进行中（数据至 '+(lastDateMd()||'—')+'）</p></div><b style="color:#15976c">月累计 '+MDFt().total+' 万</b></header><div class="md-week-list">'+weeks()+'</div></article><article class="md-card md-funnel md-click" tabindex="0" role="button" data-md-panel="funnel"><header class="md-card-title"><div><h3>'+WEEK+'经营流量</h3><p>门诊、入院、出院为同期数量，不直接计算转化率</p></div><span class="md-severity" style="color:#d57e1c">截至'+MDFt().date+'</span></header><div class="md-funnel-steps">'+funnel()+'</div><p class="md-funnel-foot">'+WEEK+'入院'+esc(data.funnelAdm)+'人、出院'+esc(data.funnelDis)+'人，患者池'+(data.funnelNet>=0?'净增':'净减')+Math.abs(data.funnelNet)+'人；'+esc(data.funnelWardAt)+'日终在院'+esc(data.funnelWard)+'人。</p></article></div>'+
      '</section>'+
      '<div class="md-section-head"><div><h2>部门经营</h2><p>点击任一部门，查看完整数据、趋势、排名与行动建议</p></div></div><section class="md-departments">'+departments()+'</section>'+
      '<div class="md-section-head"><div><h2>月累计动态排名</h2><p>新数据进入后自动重算；月末核验后才形成正式排名</p></div><button class="md-more" data-md-panel="rankrule" type="button">查看排名规则</button></div>'+
      '<section class="md-card md-rank"><header class="md-card-title"><div><h3>员工绩效试算</h3><p>业务量、质量、转化与数据完整性分岗计算</p></div><div class="md-rank-tabs"><button class="active" data-rank="doctor">医生</button><button data-rank="nursing">护理</button><button data-rank="psychology">心理</button><button data-rank="service">客服</button><button data-rank="marketing">营销</button></div></header><div class="md-table-wrap" id="mdRankTable">'+ranking('doctor')+'</div></section>'+
      '<button class="md-card md-governance md-click" type="button" data-md-panel="governance"><div class="md-gov-grid"><i class="md-gov-icon">⌘</i><div class="md-gov-copy"><h3>排名数据治理决策</h3><p>当日记录、次日核验、月内动态试算、月末正式锁定；缺失记“待补”，冲突记“待核”，不得静默改榜。</p></div><span class="md-gov-badge">17 项待核验</span></div></button>'+
    '</div>';
  }

  function drawerMarkup(){return '<div class="md-drawer-backdrop" id="mdDrawerBackdrop"></div><aside class="md-drawer" id="mdDrawer" role="dialog" aria-modal="true" aria-labelledby="mdDrawerTitle"><header class="md-drawer-head"><div><h2 id="mdDrawerTitle">经营详情</h2><p id="mdDrawerSub">'+data.meta.updated+'</p></div><button class="md-drawer-close" type="button" aria-label="关闭">×</button></header><div class="md-drawer-body" id="mdDrawerBody"></div></aside><button class="md-fab-update" id="mdUpdateButton" type="button">＋ 更新数据</button>';}
  function detail(type){
    if(type==='target')return ['9月营收目标与预测','<div class="md-detail-grid"><div class="md-detail-kpi"><span>累计营业额</span><b>'+data.target.actual+' 万</b></div><div class="md-detail-kpi"><span>目标完成</span><b>'+data.target.amountRate+'%</b></div><div class="md-detail-kpi"><span>剩余金额</span><b>'+data.target.remaining+' 万</b></div><div class="md-detail-kpi"><span>所需日均</span><b>'+data.target.requiredDaily+' 万</b></div></div><h3>经营判断</h3><p>金额进度落后时间进度 '+data.target.gap+' 个百分点。后续即使恢复上周日均，也难以自然完成目标，需要明确新增收入来源与患者转化动作。</p>'];
    if(type==='daily'||type==='weeks'||type==='analysis')return ['营业趋势分析','<div class="md-detail-list"><div><b>月度进度：</b>截至'+MDFt().dateCN+'累计'+MDFt().total+'万元，完成260万元目标的'+MDFt().amt+'%。</div><div><b>'+WEEK+'：</b>日均'+MDFt().avg+'万元。</div><div><b>收入结构：</b>门诊与住院两端拆分见下方结构图。</div><div><b>行动：</b>9月剩余'+MDFt().remain+'天仍需'+MDFt().remainWan+'万元，日均需'+MDFt().need+'万元。</div></div>'];
    if(type==='funnel')return [WEEK+'经营流量','<div class="md-detail-list"><div><b>门诊：</b>9月1—30日初诊135人次、复诊850人次，合计985人次。</div><div><b>住院流入：</b>本周入院7人。</div><div><b>住院流出：</b>本周出院6人（营收口径，含多次）。</div><div><b>患者池：</b>本周净增1人，9月30日日终在院34人。门诊与入院不是患者级匹配数据，不计算门诊转入院率。</div></div>'];
    if(type==='rankrule'||type==='governance')return ['排名数据治理决策','<div class="md-detail-list"><div><b>月内：</b>每月 1 日重置，新数据通过核验后自动重算，名次仅作动态试算。</div><div><b>准入：</b>完整率 ≥95%、按时率 ≥90%、关键冲突率 ≤2%，否则不进入正式榜。</div><div><b>缺失：</b>未填显示“待补”，冲突显示“待核”，不按 0 分处理。</div><div><b>月末：</b>次月 1 日复核，次月 2 日 12:00 锁定；更正必须留痕并保留原快照。</div></div><button class="md-drawer-action" type="button" onclick="document.getElementById(\'rankGovernance\')?.scrollIntoView()">查看完整治理规则</button>'];
    if(type.indexOf('alert-')===0){var a=data.alerts[+type.split('-')[1]];return [a.title,'<div class="md-detail-kpi"><span>风险等级</span><b>'+esc(a.tag)+'</b></div><h3>问题判断</h3><p>'+esc(a.copy)+'</p><h3>建议动作</h3><div class="md-detail-list"><div>明确唯一数据源、负责人和更新时间。</div><div>把发现的问题转为可核验的患者级或业务级清单。</div><div>次日更新状态，完成后保留处理证据。</div></div>'];}
    if(type.indexOf('kpi-')===0){var k=data.kpis[+type.split('-')[1]];return [k.label,'<div class="md-detail-grid"><div class="md-detail-kpi"><span>当前数值</span><b>'+esc(k.value)+' '+esc(k.unit)+'</b></div><div class="md-detail-kpi"><span>统计说明</span><b style="font-size:13px">'+esc(k.note)+'</b></div></div><h3>更新规则</h3><p>此卡片由统一数据对象驱动；导入并核验新数据后，数值、图表和相关分析同步刷新。</p>'];}
    return ['经营详情','<p>点击部门卡片可查看部门完整数据、趋势、排名与行动建议。</p>'];
  }
  function openDrawer(type){var d=detail(type),drawer=document.getElementById('mdDrawer'),bd=document.getElementById('mdDrawerBackdrop');document.getElementById('mdDrawerTitle').textContent=d[0];document.getElementById('mdDrawerBody').innerHTML=d[1];drawer.classList.add('show');bd.classList.add('show');document.body.style.overflow='hidden';drawer.querySelector('.md-drawer-close').focus();}
  function closeDrawer(){var drawer=document.getElementById('mdDrawer'),bd=document.getElementById('mdDrawerBackdrop');if(drawer)drawer.classList.remove('show');if(bd)bd.classList.remove('show');document.body.style.overflow='';}

  function normalizeNode(root){
    if(!root||root.nodeType!==1)return;
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){var p=node.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.tagName))return NodeFilter.FILTER_REJECT;return node.nodeValue&&node.nodeValue.indexOf('本周')>-1?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}}),nodes=[],x;
    while((x=walker.nextNode()))nodes.push(x);
    nodes.forEach(function(t){t.nodeValue=t.nodeValue.replace(WEEK_LABEL_RE,WEEK);});
  }
  function normalizeAll(){normalizeNode(document.body);document.querySelectorAll('[title],[aria-label]').forEach(function(el){['title','aria-label'].forEach(function(a){var v=el.getAttribute(a);if(v&&v.indexOf('本周')>-1)el.setAttribute(a,v.replace(WEEK_LABEL_RE,WEEK));});});}

  function mount(){
    if(document.getElementById('monthCommandCenter'))return;
    document.body.classList.add('md-mode');
    ['overview','departments','monthSnapshot'].forEach(oldSection);   /* 只隐藏被月面板完全替代的重复区块；
       decisionCore / insights / coreMetrics / nursingItems / comparison / tasks / rankGovernance
       保留 —— 它们承载本项目独有的本周深度呈现（护理分项、经营对比、AI 诊断、协同任务） */
    var title=document.querySelector('.title-row');if(!title)return;
    var h=title.querySelector('h1'),sub=title.querySelector('.subtitle'),range=document.getElementById('rangeChip'),period=document.getElementById('periodBtn');
    if(h)h.textContent='9月经营协同';if(sub)sub.textContent='月累计结果 · '+WEEK+'变化 · 跨部门闭环';/* rangeChip 同时写明月报告期与本周口径（业主：注意保留本周 9.21—9.27 的呈现）；
       periodBtn 交给 data-import.js 统一写抓取日，避免两个模块争抢同一节点 */
    writeRangeChip();
    /* ⚠ 月面板原本固定插在 .title-row 之后 —— 那样会落到「9 月整月经营分析报告」前面。
       业主 2026-10-01 指定报告在最前，故锚点改为：有报告就插在报告之后，否则退回 title-row。 */
    var _mccAnchor=document.getElementById('sepReport')||title;
    _mccAnchor.insertAdjacentHTML('afterend',shell());document.body.insertAdjacentHTML('beforeend',drawerMarkup());
    bind();normalizeAll();
    var observer=new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(node){if(node.nodeType===1)normalizeNode(node);});});});observer.observe(document.body,{childList:true,subtree:true});
  }
  function bind(){
    document.addEventListener('click',function(e){
      var panel=e.target.closest('[data-md-panel]');if(panel){openDrawer(panel.dataset.mdPanel);return;}
      var dept=e.target.closest('[data-dept]');if(dept){if(typeof window.openDeptV2==='function')window.openDeptV2(dept.dataset.dept);return;}
      var tab=e.target.closest('[data-rank]');if(tab){document.querySelectorAll('[data-rank]').forEach(function(b){b.classList.toggle('active',b===tab);});document.getElementById('mdRankTable').innerHTML=ranking(tab.dataset.rank);return;}
    });
    document.getElementById('mdDrawerBackdrop').addEventListener('click',closeDrawer);document.querySelector('.md-drawer-close').addEventListener('click',closeDrawer);
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrawer();if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"][data-md-panel]')){e.preventDefault();openDrawer(e.target.dataset.mdPanel);}});
    document.getElementById('mdUpdateButton').addEventListener('click',function(){var b=document.querySelector('.mkt-import');if(b)b.click();else{var ib=document.getElementById('importBackdrop');if(ib){ib.classList.add('show');ib.hidden=false;}else openDrawer('analysis');}});
  }
  function rerender(){var old=document.getElementById('monthCommandCenter');if(old){old.outerHTML=shell();normalizeAll();}}
  window.updateMonthDashboard=function(patch,options){merge(data,patch||{});window.MONTH_DASHBOARD_DATA=data;if(!options||options.persist!==false){try{localStorage.setItem('hospital-month-dashboard-v3-20260926',JSON.stringify(data));}catch(e){}}rerender();return clone(data);};
  window.resetMonthDashboard=function(){data=clone(baseData);window.MONTH_DASHBOARD_DATA=data;try{localStorage.removeItem('hospital-month-dashboard-v3-20260926');}catch(e){}rerender();return clone(data);};
  window.openMonthDashboardPanel=openDrawer;
  window.addEventListener('september-revenue-updated',function(){applyRevenueSnapshot();data=clone(baseData);window.MONTH_DASHBOARD_DATA=data;rerender();writeRangeChip();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
