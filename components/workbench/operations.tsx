"use client";

import { Activity, AlertTriangle, CheckCircle2, Database, Fingerprint, Gauge, Network, ServerCog, ShieldCheck, Timer } from "lucide-react";
import { auditLog, costMeasures, departments, hisInterfaces, techLayers } from "@/lib/hospital";
import { useWorkbench } from "@/lib/store";
import { PageHeading } from "./primitives";

export function OperationsView() {
  const { tasks } = useWorkbench();
  const closed = tasks.filter((t) => t.status === "已完成").length;
  const closureRate = Math.round((closed / tasks.length) * 100);
  const waiting = tasks.filter((t) => t.status === "等待人工确认").length;
  const overdue = tasks.filter((t) => t.status === "已超时").length;
  const operatingDepts = departments.filter((d) => d.name !== "院领导");
  const blocked = operatingDepts.filter((d) => d.waitingOnOthers.length > 0).length;

  const metrics = [
    { label: "今日任务总量", value: String(tasks.length), note: "当前任务池", icon: Activity, hot: false },
    { label: "任务闭环率", value: `${closureRate}%`, note: `${closed}项完成 / ${tasks.length}项`, icon: CheckCircle2, hot: closureRate < 50 },
    { label: "等待人工确认", value: String(waiting), note: `${overdue}项已经超时`, icon: Timer, hot: waiting > 0 },
    { label: "跨部门阻塞", value: `${blocked}/${operatingDepts.length}`, note: "存在明确等待对象", icon: Network, hot: blocked === operatingDepts.length },
  ];

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="OPERATIONS & AUDIT"
        title="运行与审计"
        description="先看风险是否闭环，再看资源是否高效。所有指标均从当前任务池与部门数据实时计算。"
      />
      <div className="ops-metrics">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`panel ops-metric ${m.hot ? "is-critical" : ""}`}>
              <span><Icon size={16} /></span>
              <p><b>{m.value}</b><small>{m.label}</small></p>
              <em>{m.note}</em>
            </div>
          );
        })}
      </div>

      <section className="ops-alert panel">
        <AlertTriangle size={20} />
        <div><span>AI 经营判断</span><b>闭环率 {closureRate}% 且 {blocked} 个部门全部存在等待：继续增加机器人提示，只会扩大待办堆积。</b><p>本周经营动作应从“增加发现量”切换为“压缩人工确认时长”：高风险30分钟接收、超时单独升级、跨部门等待每日两次清障。</p></div>
      </section>

      <div className="ops-columns">
        <section className="panel">
          <header className="panel-head-compact"><div><span>DEPARTMENT LOAD</span><b>部门资源负荷</b></div></header>
          <div className="ops-load-list">
            {departments.filter((d) => d.name !== "院领导").map((d) => (
              <p key={d.name}>
                <span>{d.name}</span>
                <span className={`load-bar ${d.load > 70 ? "hot" : ""}`}><i style={{ width: `${d.load}%` }} /></span>
                <b>{d.load}% · {d.unclosed}未闭环</b>
              </p>
            ))}
          </div>
        </section>
        <section className="panel">
          <header className="panel-head-compact"><div><span>AUDIT LOG</span><b>审计日志（最近）</b></div><ShieldCheck size={16} /></header>
          <ol className="audit-list">
            {auditLog.map((entry, i) => (
              <li key={i}><i /><div><b>{entry.actor}</b><p>{entry.action}</p><small>{entry.time} · {entry.target}</small></div></li>
            ))}
          </ol>
        </section>
      </div>

      <section className="panel">
        <header className="panel-head-compact"><div><span>TECH LAYERS</span><b>技术分层</b></div><ServerCog size={16} /></header>
        <div className="tech-stack">
          {techLayers.map((layer, i) => (
            <div className="tech-layer" key={layer.layer}>
              <header><b>{layer.layer}</b><small>{layer.note}</small></header>
              <div>{layer.items.map((item) => <span key={item}>{item}</span>)}</div>
              {i < techLayers.length - 1 && <em />}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head-compact"><div><span>COST CONTROL</span><b>低成本运行策略</b></div><Gauge size={16} /></header>
        <ol className="cost-list">
          {costMeasures.map((c, i) => <li key={c}><em>{String(i + 1).padStart(2, "0")}</em>{c}</li>)}
        </ol>
      </section>

      <section className="panel">
        <header className="panel-head-compact"><div><span>HIS INTEGRATION</span><b>后续接入 HIS 需要的接口清单</b></div><Database size={16} /></header>
        <div className="his-table">
          <header><b>系统</b><b>接口</b><b>阶段</b></header>
          {hisInterfaces.map((row) => (
            <p key={row.interface}><span>{row.system}</span><span>{row.interface}</span><b>{row.phase}</b></p>
          ))}
        </div>
        <p className="his-note"><Fingerprint size={12} />第一阶段全部只读；唯一写入口为统一任务中心，且回写前必须人工确认。</p>
      </section>
    </div>
  );
}
