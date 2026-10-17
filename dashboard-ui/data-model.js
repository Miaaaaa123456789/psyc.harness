(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OPSModel=factory();})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const finite=Number.isFinite;
  const iso=/^\d{4}-\d{2}-\d{2}$/;
  const sum=(rs,k)=>rs.length&&rs.every(r=>finite(r[k]))?rs.reduce((a,r)=>a+r[k],0):null;
  const ratio=(a,b)=>finite(a)&&finite(b)&&b!==0?a/b:null;
  const addDays=(d,n)=>{const a=new Date(d+'T12:00:00Z');a.setUTCDate(a.getUTCDate()+n);return a.toISOString().slice(0,10);};
  const days=(a,b)=>Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/864e5)+1;
  const monday=d=>{const v=new Date(d+'T12:00:00Z').getUTCDay();return addDays(d,-(v||7)+1);};
  function validate(data){
    if(data?.schemaVersion!==1)throw Error('不支持的数据版本');
    if(!['deidentified-actual','private-runtime'].includes(data.mode))throw Error('必须声明脱敏真实汇总或私有运行模式');
    if(!Array.isArray(data.revenue)||!data.departments)throw Error('缺少营收或部门对象');
    const keys=new Set();for(const r of data.revenue){if(!iso.test(r.date)||!finite(Date.parse(r.date)))throw Error('日期格式无效');if(keys.has(r.date))throw Error('重复营收日期');keys.add(r.date);for(const k of ['outpatient','inpatient','first','repeat','ward','admit','discharge'])if(r[k]!==null&&!finite(r[k]))throw Error('字段不是数值或null：'+k);}
    for(const [key,d]of Object.entries(data.departments)){if(!iso.test(d.start)||!iso.test(d.end)||d.start>d.end||!Array.isArray(d.rows))throw Error('部门区间或rows无效：'+key);const ids=d.rows.map(r=>r.id);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('部门员工ID缺失或重复：'+key);}
    return data;
  }
  function aggregate(rs){return {days:rs.length,total:sum(rs,'total'),out:sum(rs,'outpatient'),in:sum(rs,'inpatient'),admit:sum(rs,'admit'),discharge:sum(rs,'discharge'),visits:rs.length&&rs.every(r=>finite(r.first)&&finite(r.repeat))?rs.reduce((a,r)=>a+r.first+r.repeat,0):null,ward:rs.at(-1)?.ward??null,rows:rs};}
  function build(data,weekStart){
    validate(data);const rows=data.revenue.map(r=>({...r,total:finite(r.outpatient)&&finite(r.inpatient)?r.outpatient+r.inpatient:null})).sort((a,b)=>a.date.localeCompare(b.date));
    if(!rows.length)return {empty:true,data};
    const last=rows.at(-1).date,month=last.slice(0,7),monthDays=new Date(+month.slice(0,4),+month.slice(5),0).getUTCDate(),elapsed=+last.slice(8),m=aggregate(rows.filter(r=>r.date.startsWith(month)));
    const start=weekStart||monday(last),end=addDays(start,6),actualEnd=end<last?end:last,expected=Math.max(0,Math.min(7,days(start,actualEnd))),w=aggregate(rows.filter(r=>r.date>=start&&r.date<=end));
    const ps=addDays(start,-7),pe=addDays(ps,expected-1),previous=aggregate(rows.filter(r=>r.date>=ps&&r.date<=pe)),comparable=expected>0&&w.days===expected&&previous.days===expected&&finite(w.total)&&finite(previous.total);
    const target=finite(data.targetYuan)&&data.targetYuan>0?data.targetYuan:null,remainDays=monthDays-elapsed,avg=ratio(m.total,m.days),gap=finite(target)&&finite(m.total)?target-m.total:null;
    return {data,rows,last,month,monthDays,elapsed,m,w,start,end,actualEnd,previous,previousStart:ps,previousEnd:pe,comparable,target,completion:ratio(m.total,target),time:elapsed/monthDays,missing:elapsed-m.days,avg,gap,remainDays,need:ratio(gap,remainDays),forecast:finite(avg)?avg*monthDays:null,change:comparable&&previous.total!==0?w.total/previous.total-1:null,net:finite(w.admit)&&finite(w.discharge)?w.admit-w.discharge:null};
  }
  function metric(k,r){return k==='doctor'?r.attributedYuan:k==='nursing'||k==='psychology'?r.score:k==='service'?r.followups:r.contacts;}
  function ranking(data,k){return [...data.departments[k].rows].filter(r=>finite(metric(k,r))).sort((a,b)=>metric(k,b)-metric(k,a));}
  function findings(data){
    const out=[];const doctor=data.departments.doctor,dr=doctor.rows.filter(r=>finite(r.attributedYuan)&&finite(r.load));
    const meanLoad=ratio(sum(dr,'load'),dr.length),meanValue=ratio(sum(dr,'attributedYuan'),dr.length);
    const atRisk=dr.filter(r=>r.load>=meanLoad&&r.attributedYuan<meanValue);
    if(atRisk.length)out.push({dept:'doctor',tone:'amber',title:'高负荷与低结算并存',value:atRisk.length+'人',evidence:atRisk.map(r=>r.name+'：在管'+r.load+'人').join('；'),action:'核对住院周期、病例结构与收费执行，不直接判定低效率。'});
    const nurse=data.departments.nursing,nr=nurse.rows.filter(r=>r.quality===0||r.quality===null),qa=nurse.qualityAnomalies,issues=qa?qa.zeroScoreRecords+qa.score42Records:nr.length;
    out.push({dept:'nursing',tone:issues?'red':'green',title:issues?'先核质控异常，再解读排名':'工作量与质量并列观察',value:issues+'项待核',evidence:qa?'单日0分'+qa.zeroScoreRecords+'条，42分'+qa.score42Records+'条（不是均分0）':nr.map(r=>r.name+'：'+(r.quality===null?'缺记录':'源值0分')).join('；')||'没有检测到0分或缺值',action:'保留源值，复核后按原规则重算。'});
    const p=data.departments.psychology,pv=sum(p.rows,'consults'),diff=finite(p.previousConsults)&&p.previousConsults?pv/p.previousConsults-1:null;
    out.push({dept:'psychology',tone:finite(diff)&&diff<0?'amber':'green',title:'咨询产出与团体登记',value:pv+'人次',evidence:'计划'+p.plannedGroups+'场，实登'+p.registeredGroups+'场',action:'核对取消、未开展与漏登，不把缺登记直接当服务流失。'});
    const s=data.departments.service,sv=ratio(sum(s.rows,'arrived'),sum(s.rows,'followups'));
    out.push({dept:'service',tone:'green',title:'到院结果与付费结果分开',value:sv===null?'待补':(sv*100).toFixed(1)+'%',evidence:'标记到院'+sum(s.rows,'arrived')+' / 回访'+sum(s.rows,'followups'),action:'继续匹配挂号与收费；不是同一人群时不算跨部门转化。'});
    const mk=data.departments.marketing,mv=ratio(sum(mk.rows,'admissions'),sum(mk.rows,'contacts'));
    out.push({dept:'marketing',tone:mk.previousComplete?'green':'amber',title:mk.previousComplete?'逐人展示分母与结果':'基期缺报，不放大总环比',value:mv===null?'待补':(mv*100).toFixed(1)+'%',evidence:'转住院'+sum(mk.rows,'admissions')+' / 对接'+sum(mk.rows,'contacts'),action:'小样本单独标记，接触、转介与实际入院不混用。'});
    return out;
  }
  return {validate,build,aggregate,sum,ratio,addDays,monday,days,ranking,metric,findings};
});
