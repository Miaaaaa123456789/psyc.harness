"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, ChevronDown, ClipboardPlus, Database, Info, Lightbulb,
  RefreshCw, ShieldAlert, Users, type LucideIcon,
} from "lucide-react";
import { useWorkbench } from "@/lib/store";
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

      <CustomStatsPanel onReport={onReport} />

      <section ref={ref} className="insight-panel">
        <header className="panel-head-compact">
          <div><span>INSIGHT MATRIX</span><b>洞察卡（{visible.length} 条）</b></div>
          <button onClick={syncInsights}><RefreshCw size={13} />刷新</button>
        </header>
        <p className="ip-note">按《洞察行动矩阵》D/H 场景生成：洞察与证据 → 建议行动 → 人工边界；数据不足时给出降级说明，不做推测。</p>
        <div className="insight-grid">
          {visible.length
            ? visible.map((i) => <InsightCard key={i.scene} item={i} />)
            : <p className="cs-empty">当前角色暂无可见洞察。</p>}
        </div>
      </section>
    </div>
  );
}
