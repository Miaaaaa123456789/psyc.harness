"use client";

import { useRef, type CSSProperties } from "react";
import {
  AlertTriangle, ArrowRight, Bell, CalendarCheck2, CheckCircle2, ChevronRight, ClipboardCheck,
  ClipboardPlus, Crown, FileSearch, HeartPulse, Layers3, Lightbulb, Network, Siren, Sparkles, Target, TrendingDown, Zap,
} from "lucide-react";
import { useWorkbench } from "@/lib/store";
import { departments, type HospitalTask } from "@/lib/hospital";
import { REPORT_KINDS, ROLE_REPORTS, type ReportKind } from "@/lib/reports";
import {
  COPILOT_INSIGHTS, DECISION_PROPOSALS, OUTCOME_REVIEWS, PATIENT_CHANGES, STRATIFICATIONS,
  VIP_META, portalOf, type AIInsightCard,
} from "@/lib/copilot";
import { PageHeading, RiskBadge, TaskStatusPill, useClientGsap, EmptyState } from "./primitives";

/* ---------- 顶部行动指标：只保留有行动意义的数字 ---------- */
function DecisionMetrics() {
  const { tasks, setView } = useWorkbench();
  const changedPatients = PATIENT_CHANGES.length;
  const waitingProposals = DECISION_PROPOSALS.filter((p) => p.status === "等待医生确认").length;
  const highPriorityOpen = tasks.filter((t) => t.risk === "高" && !["已完成", "已驳回"].includes(t.status)).length;
  const dueOutcomes = OUTCOME_REVIEWS.filter((o) => o.status === "待验证").length;
  const vipTimeout = 1; // P-051 铂金随访权益临近超时

  const metrics: { label: string; value: number; icon: typeof TrendingDown; note: string; hot?: boolean; view: Parameters<typeof setView>[0] }[] = [
    { label: "今日发生重要变化的患者", value: changedPatients, icon: TrendingDown, note: "相对自身基线，可解释", hot: true, view: "patients" },
    { label: "等待医生确认的方案", value: waitingProposals, icon: FileSearch, note: "AI已生成备选行动", hot: true, view: "proposals" },
    { label: "未完成的高优先级任务", value: highPriorityOpen, icon: ClipboardCheck, note: "高风险且未闭环", hot: highPriorityOpen > 0, view: "tasks" },
    { label: "到期未验证的干预", value: dueOutcomes, icon: CalendarCheck2, note: "数小时/24小时/3-7天窗口", view: "outcomes" },
    { label: "VIP服务即将超时", value: vipTimeout, icon: Crown, note: "权益履约预警", view: "patients" },
  ];
  return (
    <section className="dm-strip panel" aria-label="今日行动指标">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <button key={m.label} className={`dm-metric ${m.hot ? "hot" : ""}`} onClick={() => setView(m.view)}>
            <span className="dm-icon"><Icon size={15} /></span>
            <p><b>{m.value}</b><small>{m.label}</small></p>
            <em>{m.note}</em>
          </button>
        );
      })}
    </section>
  );
}

/* ---------- AI 经营诊断：由仓库内任务与部门数据实时计算 ---------- */
function BusinessDiagnosis() {
  const { tasks, setView } = useWorkbench();
  const terminal = ["已完成", "已驳回"];
  const open = tasks.filter((t) => !terminal.includes(t.status));
  const waiting = open.filter((t) => t.status === "等待人工确认");
  const critical = open.filter((t) => t.risk === "高");
  const overdue = open.filter((t) => t.status === "已超时");
  const completed = tasks.filter((t) => t.status === "已完成").length;
  const closureRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const operatingDepts = departments.filter((d) => d.name !== "院领导");
  const blocked = operatingDepts.filter((d) => d.waitingOnOthers.length > 0);
  const unclosed = operatingDepts.reduce((sum, d) => sum + d.unclosed, 0);
  const loadPeak = [...operatingDepts].sort((a, b) => b.load - a.load)[0];

  const statusBars = [
    { label: "仍在途", value: open.length, total: tasks.length, tone: "danger" },
    { label: "等待人工确认", value: waiting.length, total: tasks.length, tone: "warn" },
    { label: "已完成", value: completed, total: tasks.length, tone: "good" },
  ];

  return (
    <section className="biz-diagnosis panel" aria-label="AI经营诊断">
      <header className="biz-head">
        <div>
          <span className="biz-kicker"><Siren size={13} /> AI BUSINESS DIAGNOSIS</span>
          <h2>经营诊断：当前首要矛盾不是任务少，而是任务进不了闭环</h2>
          <p>基于当前任务池与部门协同数据自动计算；红色仅标记必须立即处理的问题。</p>
        </div>
        <button onClick={() => setView("insights")}>进入诊断中心<ArrowRight size={13} /></button>
      </header>

      <div className="biz-visuals">
        <article className="biz-radar is-critical">
          <div className="biz-risk-ring" style={{ "--score": `${Math.round((open.length / Math.max(tasks.length, 1)) * 100)}%` } as CSSProperties}>
            <strong>{open.length}<small>/{tasks.length}</small></strong><span>任务在途</span>
          </div>
          <div>
            <b><AlertTriangle size={15} />高风险任务卡在人工确认</b>
            <strong>{critical.length} 项</strong>
            <p>P-042 的护理现场核查与医生用药复核尚未确认，安全风险集中在同一患者、同一事件链。</p>
          </div>
        </article>

        <article className="biz-flow-card">
          <header><b>任务漏斗</b><strong className="text-red">闭环率 {closureRate}%</strong></header>
          <div className="biz-bars">
            {statusBars.map((s) => (
              <div key={s.label}>
                <span>{s.label}</span>
                <i><em className={s.tone} style={{ width: `${(s.value / Math.max(s.total, 1)) * 100}%` }} /></i>
                <b>{s.value}</b>
              </div>
            ))}
          </div>
          <small>{overdue.length} 项已超时 · “已收到”不能代替“已解决”</small>
        </article>

        <article className="biz-flow-card">
          <header><b>协作阻塞面</b><strong className="text-red">{blocked.length}/{operatingDepts.length} 部门</strong></header>
          <div className="biz-dept-grid">
            {operatingDepts.map((d) => <span key={d.name} className={d.unclosed >= 3 || d.load > 70 ? "hot" : ""}>{d.name}<b>{d.unclosed}</b></span>)}
          </div>
          <small>共 {unclosed} 个部门未闭环事项 · 峰值负荷 {loadPeak.name} {loadPeak.load}%</small>
        </article>
      </div>

      <div className="biz-calls">
        <details open className="biz-call critical">
          <summary><span>01</span><b>立即止损：先清空 P-042 的两个高风险人工确认点</b><em>今天</em></summary>
          <div><p><strong>判断：</strong>同一患者的拒药、睡眠碎片化、HRV下降和情绪波动同时指向安全事件；护理与医疗两个确认点都未通过，继续等待会放大风险窗口。</p><p><strong>动作：</strong>护理部30分钟内完成现场核查，医疗部12:00前统一 eMAR、药卡与患者自述；临床安全负责人只在复评完成后关闭事件。</p><p><strong>验证：</strong>2项高风险任务由“等待人工确认”转为“已完成”，并留下复评记录。</p></div>
        </details>
        <details className="biz-call warning">
          <summary><span>02</span><b>闭环率只有 {closureRate}%：任务中心正在变成待办仓库</b><em>24小时</em></summary>
          <div><p><strong>判断：</strong>{open.length}项任务仍在途、{waiting.length}项等待确认，说明瓶颈发生在人工接收与结果回写，不在AI发现能力。</p><p><strong>动作：</strong>运营按“高风险→超时→临近截止”重排队列；每项必须同时有主责人、截止时间和复评节点。</p><p><strong>验证：</strong>在途任务降至3项以内，超时清零，完成率提升至50%以上。</p></div>
        </details>
        <details className="biz-call warning">
          <summary><span>03</span><b>{blocked.length}个部门全部在等别人：这是接口问题，不是单点执行问题</b><em>本周</em></summary>
          <div><p><strong>判断：</strong>所有业务部门均记录跨部门等待；{loadPeak.name}负荷最高且未闭环最多，继续平均派单会把瓶颈压向一线。</p><p><strong>动作：</strong>每天固定两次跨部门清障，只处理“等待谁、等什么、最晚何时”；住院病区新任务优先分流或延后非紧急项。</p><p><strong>验证：</strong>有等待部门数由{blocked.length}降至4以内，{loadPeak.name}负荷回落至70%以下。</p></div>
        </details>
      </div>
    </section>
  );
}

/* ---------- 左栏：哪些患者发生了变化 ---------- */
function ChangeCard({ change }: { change: typeof PATIENT_CHANGES[number] }) {
  const strat = STRATIFICATIONS.find((s) => s.patientId === change.patientId);
  return (
    <article className={`change-card ${strat?.risk === "高" ? "is-high" : strat?.risk === "中" ? "is-mid" : ""}`}>
      <header>
        <b className="cc-patient">{change.patientId}</b>
        {strat && <RiskBadge risk={strat.risk} />}
        {strat && strat.vip !== "none" && <span className={`vip-chip ${VIP_META[strat.vip].cls}`}>{VIP_META[strat.vip].label}</span>}
        <small className="cc-updated">{change.updatedAt} 更新</small>
      </header>
      <h4>{change.headline}</h4>
      <dl>
        <div><dt>与自身基线相比</dt><dd>{change.vsBaseline}</dd></div>
        <div><dt>变化持续</dt><dd>{change.duration}</dd></div>
        <div><dt>可能影响</dt><dd>{change.impact}</dd></div>
        <div><dt>数据来源</dt><dd>{change.sources.join(" · ")}</dd></div>
      </dl>
    </article>
  );
}

/* ---------- 中栏：AI 洞察卡（固定八段结构） ---------- */
function InsightCard({ insight }: { insight: AIInsightCard }) {
  const strat = STRATIFICATIONS.find((s) => s.patientId === insight.patientId);
  return (
    <article className="insight-card-v2">
      <header>
        <span className="icv-patient">{insight.patientId}</span>
        {strat && <RiskBadge risk={strat.risk} />}
        <span className="icv-model">{insight.model}</span>
        <span className={`icv-conf conf-${insight.confidence}`}>置信度 {insight.confidence}</span>
      </header>
      <h4>{insight.title}</h4>
      <div className="icv-body">
        <section><label>① AI发现</label><p>{insight.finding}</p></section>
        <section><label>② 与基线的变化</label><p>{insight.baselineChange}</p></section>
        <section>
          <label>③ 时间线证据</label>
          <ol className="icv-evidence">
            {insight.evidence.map((e, i) => (
              <li key={i}><time>{e.time}</time><p>{e.event}</p><small>{e.source}</small></li>
            ))}
          </ol>
        </section>
        {insight.conflicts.length > 0 && (
          <section className="icv-conflicts">
            <label>④ 信息冲突</label>
            {insight.conflicts.map((c, i) => (
              <div key={i} className="icv-conflict">
                <p><span className="side">A</span>{c.a}</p>
                <p><span className="side">B</span>{c.b}</p>
                <small><AlertTriangle size={11} />{c.needConfirmBy}</small>
              </div>
            ))}
          </section>
        )}
        {insight.missingEvidence.length > 0 && (
          <section><label>⑤ 缺失的关键证据</label><ul>{insight.missingEvidence.map((m) => <li key={m}>{m}</li>)}</ul></section>
        )}
        <section><label>⑥ 不确定性</label><p>{insight.uncertainty}</p></section>
        <section><label>⑦ 可能影响的治疗计划</label><ul>{insight.impact.map((m) => <li key={m}>{m}</li>)}</ul></section>
        <section>
          <label>⑧ 下一步备选行动</label>
          <ul className="icv-actions">{insight.actions.map((m) => <li key={m}><Zap size={10} />{m}</li>)}</ul>
        </section>
      </div>
    </article>
  );
}

/* ---------- 右栏：我现在需要做什么 ---------- */
function MyTaskCard({ task }: { task: HospitalTask }) {
  const { acceptTask, completeTask, setView } = useWorkbench();
  return (
    <article className={`mytask-card ${task.risk === "高" ? "is-high" : ""}`}>
      <header>
        <small className="mt-kind">{task.ownerRole === "doctor" ? "临床决策" : task.ownerRole === "therapist" ? "治疗任务" : task.ownerRole === "butler" ? "VIP服务" : "护理任务"}</small>
        <b className="mt-patient">{task.patient}</b>
        <RiskBadge risk={task.risk} />
        <TaskStatusPill status={task.status} />
      </header>
      <h4>{task.title}</h4>
      <dl>
        <div><dt>为什么需要处理</dt><dd>{task.evidence}</dd></div>
        <div><dt>责任角色</dt><dd>{task.owner}</dd></div>
        <div><dt>截止时间</dt><dd className={task.risk === "高" ? "hot" : ""}>{task.deadline}</dd></div>
        <div><dt>结局验证</dt><dd><CalendarCheck2 size={11} />{OUTCOME_REVIEWS.find((o) => o.patientId === task.patient && o.status === "待验证")?.dueAt ?? "完成后自动排程"}</dd></div>
      </dl>
      <footer>
        <button className="btn-accept" onClick={() => acceptTask(task.id)}>接受</button>
        <button className="btn-complete" onClick={() => completeTask(task.id)}>完成</button>
        <button className="mt-detail" onClick={() => setView("tasks")}>详情<ArrowRight size={11} /></button>
      </footer>
    </article>
  );
}

/* ---------- 快捷异常上报（护士/治疗师） ---------- */
function QuickReport({ onReport }: { onReport: (kind: ReportKind) => void }) {
  const { role } = useWorkbench();
  const kinds = ROLE_REPORTS[role.id] ?? [];
  if (!kinds.length) return null;
  return (
    <section className="quick-report panel">
      <header className="panel-head-compact">
        <div><span>QUICK INPUT</span><b>快捷填报</b></div>
        <small>正常情况一键完成 · 异常时才展开补充</small>
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

/* ---------- 主视图：按角色呈现「今日决策/今日任务」 ---------- */
export function OverviewView({ onReport }: { onReport: (kind: ReportKind) => void }) {
  const { role, tasks, setView } = useWorkbench();
  const portal = portalOf(role.id);

  const myTasks = tasks
    .filter((t) => !["已完成", "已驳回"].includes(t.status) && (t.ownerRole === role.id || t.ownerRole === null))
    .slice(0, 4);
  const relevantChanges = PATIENT_CHANGES.slice(0, 3);
  const relevantInsights = COPILOT_INSIGHTS;

  const workspaceRef = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(workspaceRef.current?.children ?? [], { autoAlpha: 0, y: 16, duration: .45, stagger: .06, ease: "power3.out" });
  }, { scope: workspaceRef, dependencies: [role.id] });

  const isDoctor = role.id === "doctor";
  const isGovernance = ["ops", "leader"].includes(role.id);
  const isFamily = ["patient", "family"].includes(role.id);

  const headingByRole: Record<string, { title: string; desc: string }> = {
    doctor: { title: "今日决策", desc: "30 秒内回答：哪些患者变了、哪些方案等确认、缺什么证据、什么到期了、今天必须决定什么。" },
    nurse: { title: "今日任务", desc: "哪些患者出现异常、哪些需要你确认、医生如何处理了你的上报、下一步做什么。" },
    therapist: { title: "今日治疗", desc: "今日治疗安排、治疗前风险提示、疗效与耐受反馈入口。" },
    butler: { title: "今日服务", desc: "VIP 患者服务安排、权益履约进度、超时预警。" },
    ops: { title: "医院运行", desc: "全院运行态势与 AI 治理，进入治理中枢查看完整数据。" },
    leader: { title: "医院运行", desc: "只读视角 · 全院运行态势总览。" },
    patient: { title: "我的治疗", desc: "治疗航图、今日计划与康复进展。" },
    family: { title: "家庭支持", desc: "治疗进度、需要配合的事项与复诊安排。" },
  };
  const heading = headingByRole[role.id] ?? headingByRole.doctor;

  return (
    <div ref={workspaceRef} className="view-stack">
      <PageHeading
        eyebrow={`${portal.name.toUpperCase()} / TODAY`}
        title={heading.title}
        description={heading.desc}
        action={
          isFamily
            ? <button className="primary-action" onClick={() => setView("family")}><HeartPulse size={15} />进入治疗航图</button>
            : isGovernance
              ? <button className="primary-action" onClick={() => setView("governance")}><Layers3 size={15} />进入治理中枢</button>
              : <button className="primary-action" onClick={() => setView("tasks")}><ClipboardCheck size={15} />全部任务</button>
        }
      />

      {!isFamily && <DecisionMetrics />}

      {!isFamily && <BusinessDiagnosis />}

      {isFamily ? (
        <EmptyState title="患者家属端从这里进入" note="点击右上「进入治疗航图」查看经医护确认的治疗变化、康复进展与配合事项。" />
      ) : (
        <section className="decision-grid" aria-label="今日决策三栏">
          {/* 左栏：哪些患者发生了变化 */}
          <div className="dg-col">
            <header className="dg-col-head">
              <HeartPulse size={14} />
              <b>哪些患者发生了变化</b>
              <button onClick={() => setView("patients")}>患者分层<ArrowRight size={11} /></button>
            </header>
            {relevantChanges.length
              ? relevantChanges.map((c) => <ChangeCard key={c.id} change={c} />)
              : <EmptyState title="当前无显著变化" note="AI 持续对比每位患者自身基线。" />}
          </div>

          {/* 中栏：AI 洞察 */}
          <div className="dg-col dg-col-wide">
            <header className="dg-col-head">
              <Lightbulb size={14} />
              <b>AI 洞察</b>
              <button onClick={() => setView("insights")}>全部洞察<ArrowRight size={11} /></button>
            </header>
            {relevantInsights.map((i) => <InsightCard key={i.id} insight={i} />)}
          </div>

          {/* 右栏：我现在需要做什么 */}
          <div className="dg-col">
            <header className="dg-col-head">
              <Target size={14} />
              <b>{isDoctor ? "我现在需要做什么" : "我的任务"}</b>
              <button onClick={() => setView("proposals")}>待确认方案<ArrowRight size={11} /></button>
            </header>
            {myTasks.length
              ? myTasks.map((t) => <MyTaskCard key={t.id} task={t} />)
              : <EmptyState title="暂无待办" note="有异常会第一时间推送到这里。" />}
            <QuickReport onReport={onReport} />
          </div>
        </section>
      )}
    </div>
  );
}
