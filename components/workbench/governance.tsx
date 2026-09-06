"use client";

import { useRef, useState } from "react";
import {
  Activity, AlertTriangle, Bot, CheckCircle2, ChevronRight, Crown, Database, Gauge, HeartPulse,
  Lightbulb, ShieldCheck, TrendingUp, UsersRound, Workflow,
} from "lucide-react";
import {
  INFO_CONFLICTS, MANAGEMENT_INSIGHTS, NURSES, DOCTORS, DOCTOR_NAMES, THERAPISTS, BUTLERS,
  OUTCOME_REVIEWS, PATIENT_CHANGES,
  STRATIFICATIONS, WORKLOAD_LEDGER, type WorkloadEntry,
} from "@/lib/copilot";
import { useWorkbench } from "@/lib/store";
import { EmptyState, PageHeading, useClientGsap } from "./primitives";
import { useEffect } from "react";

/* ---------- 医院脉冲：只保留有行动意义的指标 ---------- */
function HospitalPulseBoard() {
  const { tasks } = useWorkbench();
  const inpatient = 86;
  const highRisk = STRATIFICATIONS.filter((s) => s.risk === "高").length;
  const openAbnormal = PATIENT_CHANGES.length + INFO_CONFLICTS.filter((c) => !c.resolved).length;
  const overdue = tasks.filter((t) => t.status === "已超时").length;
  const vipTimeout = 1;
  const workload = WORKLOAD_LEDGER.reduce((s, w) => s + w.points, 0);
  const dataQuality = 92;
  const aiReview = 3;

  const metrics = [
    { label: "当前在院患者", value: inpatient, icon: HeartPulse },
    { label: "临床高风险患者", value: highRisk, icon: AlertTriangle, hot: true },
    { label: "未闭环异常", value: openAbnormal, icon: Activity, hot: true },
    { label: "超时临床任务", value: overdue, icon: Workflow, hot: overdue > 0 },
    { label: "VIP服务超时", value: vipTimeout, icon: Crown, hot: true },
    { label: "今日有效工作量", value: `${workload} 分`, icon: TrendingUp },
    { label: "数据完整率", value: `${dataQuality}%`, icon: Database },
    { label: "AI待审核异常", value: aiReview, icon: Bot },
  ];
  return (
    <section className="gov-pulse panel" aria-label="医院脉冲">
      <header className="panel-head-compact">
        <div><span>HOSPITAL PULSE</span><b>医院脉冲</b></div>
        <small>数据每 60 秒同步</small>
      </header>
      <div className="gov-pulse-grid">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`gov-pm ${m.hot ? "hot" : ""}`}>
              <span><Icon size={15} /></span>
              <p><b>{m.value}</b><small>{m.label}</small></p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 人员与绩效：下钻（医院→岗位→员工→患者→任务→证据） ---------- */
type StaffRow = { name: string; group: string; total: number; manual: number; byTable: Record<string, number> };

/** 飞书实时工作量（每个上报人的真实统计，来自 /api/workload） */
function useLiveWorkload() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const reload = () => {
    setState("loading");
    fetch("/api/workload")
      .then((r) => r.json())
      .then((d) => { setRows(d.staff ?? []); setState("ok"); })
      .catch(() => setState("fail"));
  };
  useEffect(reload, []);
  return { rows, state, reload };
}

function LiveWorkloadBoard({ rows, state, onPick }: { rows: StaffRow[]; state: string; onPick: (n: string) => void }) {
  const groups = [
    { key: "医生端", members: DOCTOR_NAMES },
    { key: "护理端", members: NURSES },
    { key: "治疗师端", members: THERAPISTS },
    { key: "管家端", members: BUTLERS },
  ];
  return (
    <div className="gov-live">
      <p className="gov-live-head">
        <Database size={11} />
        飞书实时统计 · 每个上报人的记录数自动聚合
        {state === "loading" && <em>加载中…</em>}
        {state === "fail" && <em>读取失败，稍后自动重试</em>}
      </p>
      <div className="gov-live-grid">
        {groups.map((g) => (
          <div key={g.key} className="gov-live-col">
            <b>{g.key}</b>
            {g.members.map((m) => {
              const r = rows.find((x) => x.name === m);
              const n = r?.total ?? 0;
              return (
                <button key={m} className={n ? "" : "zero"} onClick={() => n && onPick(m)}>
                  {m}<span>{n ? `${n} 条${r?.manual ? ` · 人工${r.manual}` : ""}` : "—"}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffPerformance() {
  const [drill, setDrill] = useState<string | null>(null);
  const [staff, setStaff] = useState<string | null>(null);
  const live = useLiveWorkload();
  const entries = WORKLOAD_LEDGER.filter((w) => (staff ? w.staff === staff : true));
  const byStaff = new Map<string, { points: number; count: number }>();
  for (const w of WORKLOAD_LEDGER) {
    const cur = byStaff.get(w.staff) ?? { points: 0, count: 0 };
    byStaff.set(w.staff, { points: cur.points + w.points, count: cur.count + 1 });
  }

  return (
    <section className="panel gov-staff" aria-label="人员与绩效">
      <header className="panel-head-compact">
        <div><span>WORKLOAD & PERFORMANCE</span><b>人员与绩效</b></div>
        <small>有效工作量 = 基础分 × 难度 × 质量 × 时效 · 多角色按各自标准动作分别计分</small>
      </header>

      <LiveWorkloadBoard rows={live.rows} state={live.state} onPick={(n) => { setStaff(n); setDrill(null); }} />

      {/* 第一层：岗位概览 */}
      <div className="gov-drill-bar">
        <button className={!drill ? "active" : ""} onClick={() => { setDrill(null); setStaff(null); }}>医院</button>
        <ChevronRight size={12} />
        <button className={drill === "nurse" ? "active" : ""} onClick={() => { setDrill("nurse"); setStaff(null); }}>护理岗（{NURSES.length}人）</button>
        <button className={drill === "doctor" ? "active" : ""} onClick={() => { setDrill("doctor"); setStaff(null); }}>医生岗（{DOCTORS.length}人）</button>
      </div>

      {!drill && (
        <div className="gov-staff-grid">
          {[...byStaff.entries()].sort((a, b) => b[1].points - a[1].points).map(([name, v]) => (
            <button key={name} className="gov-staff-cell" onClick={() => { setStaff(name); setDrill(null); }}>
              <b>{name}</b>
              <span>{v.points} 分 · {v.count} 项</span>
            </button>
          ))}
        </div>
      )}

      {drill === "doctor" && (
        <div className="gov-doctor-tiers">
          <div><b>二线 / 审核医生</b><span>{DOCTORS.filter((d) => d.tier === "二线/审核").map((d) => d.name).join(" · ")}</span></div>
          <div><b>一线 / 执行医生</b><span>{DOCTORS.filter((d) => d.tier === "一线/执行").map((d) => d.name).join(" · ")}</span></div>
          <p className="gov-note"><ShieldCheck size={11} />工作量与责任记录「实际执行人」，与登录账号分离；二线审核单独留痕，不可覆盖。</p>
        </div>
      )}

      {drill === "nurse" && (
        <div className="gov-nurse-list">
          {NURSES.map((n) => {
            const v = byStaff.get(n);
            return <button key={n} className={staff === n ? "active" : ""} onClick={() => setStaff(n)}>{n}<span>{v ? `${v.points} 分` : "今日暂无积分"}</span></button>;
          })}
        </div>
      )}

      {/* 员工下钻：每条积分关联患者/任务/标准动作/证据/审核状态 */}
      {staff && (
        <div className="gov-ledger">
          <header><b>{staff} 的工作量明细</b><button onClick={() => setStaff(null)}>收起</button></header>
          {entries.length ? (
            <table className="gov-table">
              <thead><tr><th>患者</th><th>标准动作</th><th>计算</th><th>积分</th><th>证据</th><th>来源</th><th>审核</th></tr></thead>
              <tbody>
                {entries.map((w: WorkloadEntry) => (
                  <tr key={w.id}>
                    <td>{w.patientId}</td>
                    <td>{w.standardAction}</td>
                    <td className="gov-calc">{w.base}×{w.difficulty}×{w.quality}×{w.timeliness}</td>
                    <td><b>{w.points}</b></td>
                    <td>{w.evidence}</td>
                    <td>{w.source}</td>
                    <td>{w.auditStatus === "已审核" ? <CheckCircle2 size={12} /> : "待审核"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="今日暂无工作量记录" note="任务完成后自动记账。" />}
        </div>
      )}
    </section>
  );
}

/* ---------- AI 管理洞察：自然语言解释，不做排名 ---------- */
function ManagementInsightBoard() {
  return (
    <section className="panel gov-insights" aria-label="AI管理洞察">
      <header className="panel-head-compact">
        <div><span>AI MANAGEMENT INSIGHTS</span><b>AI管理洞察</b></div>
        <small>解释原因与瓶颈 · 不输出员工排名</small>
      </header>
      <div className="gov-mi-list">
        {MANAGEMENT_INSIGHTS.map((mi) => (
          <article key={mi.id} className={`gov-mi tone-${mi.tone}`}>
            <header>
              <Lightbulb size={13} />
              <b>{mi.question}</b>
            </header>
            <p>{mi.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- 治理中枢主视图 ---------- */
export function GovernanceView() {
  const ref = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.children ?? [], { autoAlpha: 0, y: 16, duration: .45, stagger: .08, ease: "power3.out" });
  }, { scope: ref });

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="HOSPITAL OPERATIONS & AI GOVERNANCE"
        title="医院运行与AI治理中枢"
        description="管理、运营、信息与 AI 审计统一入口：医院脉冲、人员绩效下钻、AI 管理洞察。信息科与运营人员默认不查看完整患者隐私。"
        action={<span className="gov-badge"><Gauge size={13} />管理信息运营端</span>}
      />
      <div ref={ref}>
        <HospitalPulseBoard />
        <StaffPerformance />
        <ManagementInsightBoard />
      </div>
    </div>
  );
}
