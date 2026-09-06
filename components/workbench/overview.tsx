"use client";

import { useRef } from "react";
import { ArrowRight, Bell, Bot, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardPlus, Fingerprint, HeartPulse, Sparkles, Timer, WalletCards, Workflow } from "lucide-react";
import { useWorkbench } from "@/lib/store";
import { eventStream, robots, type HospitalTask } from "@/lib/hospital";
import { REPORT_KINDS, ROLE_REPORTS, type ReportKind } from "@/lib/reports";
import { IOBlock, PageHeading, RiskBadge, TaskStatusPill, useClientGsap, MascotNote } from "./primitives";

function ActionSummary() {
  const { role, tasks, view } = useWorkbench();
  const waiting = tasks.filter((t) => t.status === "等待人工确认").length;
  const robotDone = robots.reduce((sum, r) => sum + r.done, 0);
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][today.getDay()]}`;
  return (
    <section className="action-summary panel">
      <div className="as-date">
        <CalendarDays size={15} />
        <div>
          <small>{dateStr}</small>
          <b>当前角色 · {role.name}</b>
        </div>
      </div>
      <div className="as-stats">
        <div className="as-stat is-alert">
          <span><Bell size={15} /></span>
          <div><b>你有 {waiting} 项需要确认</b><small>来自机器人团队的待处理事项</small></div>
        </div>
        <div className="as-stat">
          <span><Bot size={15} /></span>
          <div><b>机器人已完成 {robotDone} 项信息工作</b><small>整理、核对、摘要与任务生成</small></div>
        </div>
        <div className="as-stat">
          <span><HeartPulse size={15} /></span>
          <div><b>2 名患者状态发生明显变化</b><small>P-042 · P-018</small></div>
        </div>
      </div>
    </section>
  );
}

function MustHandleCard({ task }: { task: HospitalTask }) {
  const { acceptTask, completeTask, setView } = useWorkbench();
  const openDetail = () => setView("tasks");
  return (
    <article className={`must-card ${task.risk === "高" ? "is-high" : ""}`}>
      <header>
        <span className="must-patient">{task.patient}</span>
        <RiskBadge risk={task.risk} />
        <TaskStatusPill status={task.status} />
      </header>
      <h3>{task.title}</h3>
      <dl>
        <div><dt>机器人来源</dt><dd>{task.source}</dd></div>
        <div><dt>数据依据</dt><dd>{task.evidence}</dd></div>
        <div><dt>责任人</dt><dd>{task.owner}</dd></div>
        <div><dt>剩余时限</dt><dd className={task.risk === "高" ? "hot" : ""}>{task.deadline}</dd></div>
      </dl>
      <footer>
        <button className="btn-accept" onClick={() => acceptTask(task.id)}>接受</button>
        <button className="btn-transfer" onClick={openDetail}>转交</button>
        <button className="btn-complete" onClick={() => completeTask(task.id)}>完成</button>
        <button className="btn-reject" onClick={openDetail}>驳回</button>
      </footer>
    </article>
  );
}


/** 快捷填报入口：按当前角色可填的表单直接打开填报中心，避免演示待办挤占主视野 */
function QuickReport({ onReport }: { onReport: (kind: ReportKind) => void }) {
  const { role } = useWorkbench();
  const kinds = ROLE_REPORTS[role.id] ?? [];
  if (!kinds.length) return null;
  return (
    <section className="quick-report panel">
      <header className="panel-head-compact">
        <div><span>QUICK INPUT</span><b>快捷填报</b></div>
        <small>写入后统计与洞察立即更新</small>
      </header>
      <div className="qr-grid">
        {kinds.map((k) => (
          <button key={k} onClick={() => onReport(k)}>
            <ClipboardPlus size={13} />{REPORT_KINDS[k].label}
          </button>
        ))}
      </div>
    </section>
  );
}

function HospitalPulse() {
  const { tasks, setView } = useWorkbench();
  const waiting = tasks.filter((t) => t.status === "等待人工确认" || t.status === "已接受").length;
  const metrics = [
    { label: "在院患者", value: "86", icon: HeartPulse, note: "C3/C4 共 9 人" },
    { label: "今日门诊", value: "132", icon: Workflow, note: "预约到诊率 91%" },
    { label: "运行中的机器人", value: "3", icon: Bot, note: "1 个需校准" },
    { label: "等待人工任务", value: String(waiting), icon: ClipboardCheck, note: "最高等待 42 分钟", hot: true },
    { label: "平均响应时间", value: "6.4 分钟", icon: Timer, note: "较上周 -18%" },
    { label: "今日节约工时", value: "27.5 h", icon: WalletCards, note: "信息整理与核对" },
  ];
  return (
    <section className="pulse-strip panel">
      <header className="panel-head-compact">
        <div><span>HOSPITAL PULSE</span><b>医院实时脉冲</b></div>
        <button onClick={() => setView("operations")}>运行与审计 <ArrowRight size={13} /></button>
      </header>
      <div className="pulse-grid">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={m.hot ? "pulse-metric hot" : "pulse-metric"}>
              <span><Icon size={16} /></span>
              <p><b>{m.value}</b><small>{m.label}</small></p>
              <em>{m.note}</em>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventFlow() {
  const ref = useRef<HTMLElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".ef-item") ?? [], { autoAlpha: 0, x: -14, duration: .4, stagger: .05, ease: "power2.out" });
  }, { scope: ref });
  return (
    <section ref={ref} className="event-flow panel">
      <header className="panel-head-compact">
        <div><span>LAST 24 HOURS</span><b>最近24小时事件流</b></div>
        <span className="live-tag"><i />LIVE</span>
      </header>
      <ol>
        {eventStream.map((e, i) => (
          <li key={`${e.time}-${i}`} className="ef-item">
            <span className="ef-time">{e.time}</span>
            <i className={`ef-dot tone-${e.tone}`} />
            <div>
              <p>{e.event}</p>
              <small>{e.patient ? `${e.patient} · ` : ""}{e.source}</small>
            </div>
          </li>
        ))}
      </ol>
      <MascotNote text="夜间事件已由晚星机器人陪伴处理，高风险项已生成人工任务。" />
    </section>
  );
}

export function OverviewView({ onReport }: { onReport: (kind: ReportKind) => void }) {
  const { role, tasks, setView } = useWorkbench();
  const waitingCount = tasks.filter((t) => t.status === "等待人工确认").length;
  const waiting = tasks.filter((t) => t.status === "等待人工确认").slice(0, 2);
  const workspaceRef = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(workspaceRef.current?.children ?? [], { autoAlpha: 0, y: 16, duration: .45, stagger: .06, ease: "power3.out" });
  }, { scope: workspaceRef, dependencies: [role.id] });

  return (
    <div ref={workspaceRef} className="view-stack">
      <PageHeading
        eyebrow="AI HOSPITAL / TODAY"
        title="今日总览"
        description="机器人持续处理信息劳动；需要临床判断的节点，正在等待对应人员确认。"
        action={
          <button className="primary-action" onClick={() => setView("tasks")}>
            <ClipboardCheck size={15} />查看全部任务
          </button>
        }
      />

      <ActionSummary />

      <section className="role-io-row">
        <IOBlock icon={Fingerprint} kind="INPUT / 我向系统提供什么" title="需要你完成" items={role.readonly ? ["只读角色 · 无需输入", "全部数据以只读方式呈现"] : role.inputs} tone="in" />
        <IOBlock icon={Sparkles} kind="OUTPUT / 系统返还给我什么" title="你将获得" items={role.outputs} tone="out" />
      </section>

      <QuickReport onReport={onReport} />

      <section className="must-section is-compact">
        <header className="section-head">
          <div><span>MUST HANDLE TODAY</span><h2>今日待确认</h2></div>
          <button className="mu-more" onClick={() => setView("tasks")}>全部 {waitingCount} 项<ArrowRight size={12} /></button>
        </header>
        <div className="must-grid">
          {waiting.length
            ? waiting.map((t) => <MustHandleCard key={t.id} task={t} />)
            : <div className="must-done"><CheckCircle2 size={16} /><div><b>当前没有等待你确认的任务</b><small>机器人持续监测中，有异常会立即提醒。</small></div></div>}
        </div>
      </section>

      <HospitalPulse />
      <EventFlow />
    </div>
  );
}
