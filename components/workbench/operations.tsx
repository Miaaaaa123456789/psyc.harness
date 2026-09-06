"use client";

import { Activity, Bot, CheckCircle2, Database, Fingerprint, Gauge, ServerCog, ShieldCheck, Timer } from "lucide-react";
import { auditLog, costMeasures, departments, hisInterfaces, techLayers } from "@/lib/hospital";
import { useWorkbench } from "@/lib/store";
import { PageHeading } from "./primitives";

export function OperationsView() {
  const { tasks } = useWorkbench();
  const closed = tasks.filter((t) => t.status === "已完成").length;
  const closureRate = Math.round((closed / tasks.length) * 100);

  const metrics = [
    { label: "今日任务总量", value: String(tasks.length), note: "含机器人处理中", icon: Activity },
    { label: "任务闭环率", value: `${closureRate}%`, note: "闭环 / 全部任务", icon: CheckCircle2 },
    { label: "平均响应时效", value: "6.4 分钟", note: "生成 → 接受", icon: Timer },
    { label: "机器人有效率", value: "91%", note: "人工确认通过 / 全部输出", icon: Bot },
  ];

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="OPERATIONS & AUDIT"
        title="运行与审计"
        description="低成本落地：先把现有系统变成机器人可安全调用的能力，再逐步扩大自动化边界。"
      />
      <div className="ops-metrics">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="panel ops-metric">
              <span><Icon size={16} /></span>
              <p><b>{m.value}</b><small>{m.label}</small></p>
              <em>{m.note}</em>
            </div>
          );
        })}
      </div>

      <div className="ops-columns">
        <section className="panel">
          <header className="panel-head-compact"><div><span>DEPARTMENT LOAD</span><b>部门资源负荷</b></div></header>
          <div className="ops-load-list">
            {departments.filter((d) => d.name !== "院领导").map((d) => (
              <p key={d.name}>
                <span>{d.name}</span>
                <span className={`load-bar ${d.load > 70 ? "hot" : ""}`}><i style={{ width: `${d.load}%` }} /></span>
                <b>{d.load}%</b>
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
