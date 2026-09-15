"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, BarChart3, ChevronDown, ClipboardPlus, Database, Info, Lightbulb,
  Network, RefreshCw, ShieldAlert, Siren, Target, Users, type LucideIcon,
} from "lucide-react";
import { useWorkbench } from "@/lib/store";
import { departments } from "@/lib/hospital";
import { LEVEL_LABEL, SEVERITY_LABEL, insightsForRole, type Insight, type InsightSeverity } from "@/lib/insights";
import { PageHeading, useClientGsap } from "./primitives";

const SEVERITY_ICON: Record<InsightSeverity, LucideIcon> = {
  high: AlertTriangle, medium: ShieldAlert, low: Info, info: Lightbulb,
};

/** 自定义记录统计：只统计用户自录数据，不含系统演示种子 */
function CustomStatsPanel({ onReport }: { onReport: () => void }) {
  const { customStats, syncInsights } = useWorkbench();
  if (!customStats) return null;
  const { total, byType, valueSum, recent, reporters } = customStats;
  const max = Math.max(1, ...byType.map((t) => t.count));

  return (
    <section className="insight-panel">
      <header className="panel-head-compact">
        <div><span>MY RECORDS</span><b>我的记录统计</b></div>
        <div className="ip-actions">
          <button onClick={() => { syncInsights(); }} aria-label="刷新统计"><RefreshCw size={13} /></button>
          <button className="primary-action" onClick={onReport}><ClipboardPlus size={13} />新增记录</button>
        </div>
      </header>

      <div className="cs-metrics">
        <div className="cs-metric">
          <span><Database size={16} /></span>
          <div><b>{total}</b><small>自录记录总数</small></div>
        </div>
        <div className="cs-metric">
          <span><BarChart3 size={16} /></span>
          <div><b>{valueSum}</b><small>数值合计</small></div>
        </div>
        <div className="cs-metric">
          <span><Users size={16} /></span>
          <div><b>{reporters.length}</b><small>参与记录人数</small></div>
        </div>
      </div>

      {byType.length > 0 ? (
        <ul className="cs-bars">
          {byType.map((t) => (
            <li key={t.type}>
              <span className="cs-bar-label">{t.type}</span>
              <span className="cs-bar-track"><i style={{ width: `${(t.count / max) * 100}%` }} /></span>
              <span className="cs-bar-value">{t.count} 条{t.sum ? ` · 合计 ${t.sum}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cs-empty">还没有自录记录。点击「新增记录」，统计区域会立刻按你的数据更新。</p>
      )}

      {recent.length > 0 && (
        <div className="cs-recent">
          <h4>最近记录</h4>
          <ul>
            {recent.map((r) => (
              <li key={r.id}>
                <span className="cs-recent-type">{r.type}</span>
                <b>{r.title}</b>
                <small>{r.value !== "—" ? r.value : "—"}</small>
                <em>{r.reporter} · {r.time}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function InsightCard({ item }: { item: Insight }) {
  const [open, setOpen] = useState(item.severity === "high");
  const Icon = SEVERITY_ICON[item.severity];
  return (
    <article className={`insight-card tone-${item.severity}`}>
      <header>
        <span className="ic-scene">{item.scene}</span>
        <span className="ic-level">{LEVEL_LABEL[item.level]}</span>
        <span className="ic-sev"><Icon size={12} />{SEVERITY_LABEL[item.severity]}</span>
        <button className="ic-toggle" onClick={() => setOpen(!open)} aria-label="展开或收起">
          <ChevronDown size={14} className={open ? "rotated" : ""} />
        </button>
      </header>

      <h3>{item.title}</h3>
      <p className="ic-module">{item.module} · 决策问题：{item.question}</p>

      {open && (
        <div className="ic-body">
          <div className="ic-block">
            <h4>洞察与证据</h4>
            <p>{item.finding}</p>
            {item.evidence.length > 0 && (
              <ul>{item.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>
          {item.uncertainty && (
            <div className="ic-block is-warn">
              <h4>降级说明</h4>
              <p>{item.uncertainty}</p>
            </div>
          )}
          <div className="ic-block">
            <h4>建议行动</h4>
            <p>{item.action}</p>
          </div>
          <div className="ic-block">
            <h4>人工边界（系统不会做）</h4>
            <p>{item.boundary}</p>
          </div>
          <footer>责任角色：{item.owner}</footer>
        </div>
      )}
    </article>
  );
}

const DEPARTMENT_ACTION: Record<string, { diagnosis: string; action: string }> = {
  "门诊中心": { diagnosis: "复诊复核依赖医疗部，入口有量、出口受阻。", action: "把复诊前用药不一致设为到诊前必清项，未确认不得进入常规复诊队列。" },
  "住院病区": { diagnosis: "负荷全院最高，且P-042安全事件正在占用一线确认能力。", action: "暂停非紧急新增任务，先完成拒药与情绪波动现场复评，再恢复常规队列。" },
  "医疗部": { diagnosis: "高负荷叠加两类复核：用药冲突与检查回报，医生确认成为主瓶颈。", action: "12:00前合并同患者复核，按风险一次决策，避免重复打开病例。" },
  "护理部": { diagnosis: "护理上报已发生，但现场核查仍在等待，发现速度快于处置速度。", action: "高风险上报后自动进入30分钟倒计时；超时直接升级值班负责人。" },
  "心理治疗中心": { diagnosis: "当前负荷不高，问题在等待患者当日会谈结果，资源尚有承接空间。", action: "承接病区分流的非紧急沟通任务，会谈结束即结构化回传靶点变化。" },
  "检查与药房": { diagnosis: "LIS延迟让医疗部无法完成检查复核，是典型上游数据阻塞。", action: "建立结果回报超时清单；接口未恢复时启用人工回报备用通道。" },
  "健康管理中心": { diagnosis: "P-051连续3天缺院外睡眠数据，随访正在失去判断依据。", action: "18:00前更换合规联络渠道；未接通只标记信息不可得，不直接升高临床风险。" },
  "管家与运营": { diagnosis: "各部门都有等待项，运营目前缺少统一清障节奏。", action: "每日两次只开15分钟清障会，逐项确认等待对象、最晚时间与备用通道。" },
};

function ExecutiveDiagnosis() {
  const { tasks, setView } = useWorkbench();
  const open = tasks.filter((t) => !["已完成", "已驳回"].includes(t.status));
  const high = open.filter((t) => t.risk === "高");
  const waiting = open.filter((t) => t.status === "等待人工确认");
  const overdue = open.filter((t) => t.status === "已超时");
  const business = departments.filter((d) => d.name !== "院领导");
  const maxLoad = Math.max(...business.map((d) => d.load), 1);

  return (
    <section className="ai-command panel">
      <header className="ai-command-head">
        <div><span><Siren size={13} /> AI DIAGNOSIS FIRST</span><h2>先处理红色问题，再谈效率优化</h2><p>任务、部门负荷与跨部门等待三组数据交叉诊断</p></div>
        <div className="ai-critical-count"><b>{high.length}</b><span>重大问题</span></div>
      </header>

      <div className="ai-signal-grid">
        <article className="ai-signal critical"><span>安全风险</span><b>{high.length}</b><p>高风险任务未闭环</p><em>都集中于 P-042</em></article>
        <article className="ai-signal critical"><span>人工闸门</span><b>{waiting.length}</b><p>项等待确认</p><em>发现没有转成行动</em></article>
        <article className={overdue.length ? "ai-signal critical" : "ai-signal"}><span>超时暴露</span><b>{overdue.length}</b><p>项已经超时</p><em>需从常规队列剥离</em></article>
        <article className="ai-signal warning"><span>协作阻塞</span><b>{business.length}</b><p>个部门在等待</p><em>全链路接口性问题</em></article>
      </div>

      <div className="ai-verdict critical">
        <AlertTriangle size={18} />
        <div><b>最危险的不是“数据异常”，而是异常已经被识别、责任人仍未完成确认。</b><p>如果P-042的护理核查和用药复核继续分散处理，系统会持续产出提醒，但临床风险窗口不会缩短。</p></div>
        <button onClick={() => setView("tasks")}>处理高风险任务<ArrowRight size={12} /></button>
      </div>

      <section className="dept-diagnosis">
        <header><div><span>DEPARTMENT DIAGNOSIS</span><b>分部门业务诊断</b></div><small>柱长=负荷 · 数字=未闭环 · 点击展开动作</small></header>
        <div className="dept-diagnosis-list">
          {business.map((d) => {
            const tone = d.load > 70 || d.unclosed >= 3 ? "critical" : d.load > 60 || d.unclosed >= 2 ? "warning" : "watch";
            const copy = DEPARTMENT_ACTION[d.name];
            return (
              <details key={d.name} className={`dept-row ${tone}`} open={tone === "critical"}>
                <summary>
                  <span className="dept-name">{d.name}</span>
                  <span className="dept-load"><i><em style={{ width: `${(d.load / maxLoad) * 100}%` }} /></i><b>{d.load}%</b></span>
                  <span className="dept-open">{d.unclosed} 未闭环</span>
                  <ChevronDown size={14} />
                </summary>
                <div>
                  <p><strong>AI判断</strong>{copy?.diagnosis ?? d.waitingOnOthers[0]}</p>
                  <p><strong>卡点证据</strong>{d.waitingOnOthers.join("；")}</p>
                  <p><strong>必须动作</strong>{copy?.action ?? "明确责任人与完成时限，并在任务中心回写结果。"}</p>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export function InsightsView({ onReport }: { onReport: () => void }) {
  const { role, insights, syncInsights } = useWorkbench();
  const visible = insightsForRole(insights, role.id);
  const ref = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".insight-card") ?? [], { autoAlpha: 0, y: 12, duration: .4, stagger: .05, ease: "power2.out" });
  }, { scope: ref, dependencies: [role.id, visible.length] });

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="INSIGHTS / FROM YOUR DATA"
        title="洞察与统计"
        description="所有洞察只基于你通过填报中心录入的记录计算，系统演示数据不参与统计。"
        action={
          <button className="primary-action" onClick={onReport}>
            <ClipboardPlus size={15} />新增记录
          </button>
        }
      />

      <ExecutiveDiagnosis />

      <CustomStatsPanel onReport={onReport} />

      <section ref={ref} className="insight-panel">
        <header className="panel-head-compact">
          <div><span>INSIGHT MATRIX</span><b>洞察卡（{visible.length} 条）</b></div>
          <button onClick={syncInsights}><RefreshCw size={13} />刷新</button>
        </header>
        <p className="ip-note">下方为人工填报数据生成的临床洞察；上方经营诊断则实时读取仓库任务池与部门协同数据。数据不足时明确降级，不做推测。</p>
        <div className="insight-grid">
          {visible.length
            ? visible.map((i) => <InsightCard key={i.scene} item={i} />)
            : <p className="cs-empty">当前角色暂无可见洞察。</p>}
        </div>
      </section>
    </div>
  );
}
