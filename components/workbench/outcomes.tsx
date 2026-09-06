"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CalendarCheck2, CheckCircle2, CircleDot, Clock, HeartPulse, PhoneCall, RefreshCw,
} from "lucide-react";
import { OUTCOME_REVIEWS, type OutcomeWindow } from "@/lib/copilot";
import { FU_STATE_LABEL, type FollowupSummary, type FollowupTask } from "@/lib/followups";
import type { ReportKind } from "@/lib/reports";
import { useWorkbench } from "@/lib/store";
import { EmptyState, PageHeading, useClientGsap } from "./primitives";

const WINDOW_META: Record<OutcomeWindow, { icon: typeof Clock; note: string }> = {
  "数小时": { icon: Clock, note: "安全风险与急性异常" },
  "24小时": { icon: Clock, note: "睡眠、不良反应与行为变化" },
  "3-7天": { icon: CalendarCheck2, note: "症状、功能与治疗耐受" },
  "出院后": { icon: HeartPulse, note: "复诊、依从性、复发风险与随访结果" },
};

const STATUS_CLS: Record<string, string> = {
  "待验证": "or-pending", "已达标": "or-pass", "未达标": "or-fail", "部分达标": "or-partial",
};

/** 状态说明：为什么这个患者现在要随访 */
function stateNote(t: FollowupTask): string {
  if (t.state === "overdue") return `已逾期 ${Math.abs(t.days ?? 0)} 天`;
  if (t.state === "today") return "今日到期";
  if (t.state === "never") return t.lastAt ? "尚未排下次随访" : "待首次随访";
  if (t.state === "soon") return `${t.days} 天后到期`;
  return t.days !== null ? `${t.days} 天后到期` : "已排期";
}

/**
 * 随访任务：首屏先回答「谁需要随访」——按逾期 → 今日 → 待排期 → 7 日内排序，
 * 风险等级高与上次未取得联系的患者优先；干预回看（时间窗）作为第二屏辅助。
 */
export function OutcomesView({ onReport }: { onReport?: (kind: ReportKind, patientId?: string) => void }) {
  const { setView, notify } = useWorkbench();
  const [tasks, setTasks] = useState<FollowupTask[]>([]);
  const [summary, setSummary] = useState<FollowupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/followups", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; tasks?: FollowupTask[]; summary?: FollowupSummary; source?: string };
      if (data.ok) {
        setTasks(data.tasks ?? []);
        setSummary(data.summary ?? null);
        setSource(data.source ?? "");
      }
    } catch {
      notify?.("随访名单读取失败，请稍后重试", "warn");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".fu-row") ?? [], { autoAlpha: 0, y: 10, duration: .35, stagger: .04, ease: "power2.out" });
  }, { scope: ref, dependencies: [tasks.length] });

  const windows: OutcomeWindow[] = ["数小时", "24小时", "3-7天", "出院后"];
  const metrics = [
    { key: "overdue", label: "已逾期", value: summary?.overdue ?? 0, tone: "hot" },
    { key: "today", label: "今日到期", value: summary?.today ?? 0, tone: "warn" },
    { key: "never", label: "待排期", value: summary?.never ?? 0, tone: "warn" },
    { key: "soon", label: "7日内", value: summary?.soon ?? 0, tone: "cool" },
    { key: "highRisk", label: "高风险", value: summary?.highRisk ?? 0, tone: "hot" },
    { key: "unreached", label: "上次未取得联系", value: summary?.unreached ?? 0, tone: "cool" },
  ];

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="FOLLOW-UP TASKS"
        title="随访任务"
        description="首先报告需要随访的患者：逾期最优先，其次今日到期、待排期与 7 日内；高风险、上次未取得联系的患者置顶。登记后自动回写飞书随访台账。"
        action={
          <div className="fu-head-actions">
            <button className="fu-refresh" onClick={() => void load()} disabled={loading} aria-label="刷新随访名单">
              <RefreshCw size={13} className={loading ? "rot" : ""} />刷新
            </button>
            {onReport && (
              <button className="primary-action" onClick={() => onReport("followup")}>
                <PhoneCall size={13} />登记随访
              </button>
            )}
          </div>
        }
      />

      <section className="fu-metrics panel" aria-label="随访任务概览">
        {metrics.map((m) => (
          <div key={m.key} className={`fu-metric tone-${m.tone}`}>
            <b>{m.value}</b>
            <small>{m.label}</small>
          </div>
        ))}
        <div className="fu-metric tone-plain">
          <b>{summary?.total ?? tasks.length}</b>
          <small>在管随访对象</small>
        </div>
      </section>

      <section className="fu-board panel" ref={ref}>
        <header className="fu-board-head">
          <div>
            <span>FOLLOW-UP ROSTER</span>
            <b>待随访患者名单</b>
          </div>
          <em>{source === "bitable" ? "来源：飞书 15_出院随访记录" : source ? "来源：本地数据" : ""}</em>
        </header>

        {loading && tasks.length === 0 ? (
          <p className="fu-loading">正在读取随访台账…</p>
        ) : tasks.length === 0 ? (
          <EmptyState title="暂无需要随访的患者" note="登记一条出院随访后，这里会按排期自动生成随访任务。" />
        ) : (
          <div className="fu-table-wrap">
            <table className="fu-table">
              <thead>
                <tr>
                  <th>患者</th>
                  <th>下次随访</th>
                  <th>风险</th>
                  <th>上次随访</th>
                  <th>随访方式</th>
                  <th>责任随访</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.key} className={`fu-row fu-state-${t.state}`}>
                    <td>
                      <b className="fu-name">{t.name || "未填写姓名"}</b>
                      <small>{[t.patientId, t.admissionNo ? `住院号 ${t.admissionNo}` : ""].filter(Boolean).join(" · ") || "无编号"}</small>
                      {t.stage && <em className="fu-stage">{t.stage}</em>}
                    </td>
                    <td>
                      <span className={`fu-state fu-state-${t.state}`}>{FU_STATE_LABEL[t.state]}</span>
                      <small>{t.nextAt || "未排期"} · {stateNote(t)}</small>
                      {t.unreached && <em className="fu-flag">上次未取得联系（{t.lastContact}）</em>}
                    </td>
                    <td>
                      {t.risk
                        ? <span className={`fu-risk risk-${t.risk === "待评估" ? "mid" : t.risk}`}>{t.risk === "待评估" ? "待评估" : `${t.risk}风险`}</span>
                        : <span className="fu-risk risk-none">未评估</span>}
                    </td>
                    <td>
                      <small>{t.lastAt || "无随访记录"}</small>
                      {t.lastIssue && <em className="fu-issue">问题：{t.lastIssue}</em>}
                      {t.lastAction && <em className="fu-issue">措施：{t.lastAction}</em>}
                    </td>
                    <td><small>{t.method || "—"}</small></td>
                    <td><small>{t.owner || "未指派"}</small></td>
                    <td>
                      {onReport && (
                        <button className="fu-go" onClick={() => onReport("followup", t.patientId || undefined)}>
                          登记随访
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="or-secondary">
        <header className="or-secondary-head">
          <div>
            <span>OUTCOME VERIFICATION</span>
            <b>干预回看（按时间窗）</b>
          </div>
          <small>验证的不是「做没做」，而是「患者是否真的改善」</small>
        </header>
        <div className="outcomes-wrap">
          {windows.map((win) => {
            const items = OUTCOME_REVIEWS.filter((o) => o.window === win);
            const meta = WINDOW_META[win];
            const Icon = meta.icon;
            return (
              <section key={win} className="or-window panel">
                <header className="or-window-head">
                  <span className="or-window-icon"><Icon size={15} /></span>
                  <div>
                    <b>{win}窗口</b>
                    <small>{meta.note}</small>
                  </div>
                  <em>{items.filter((i) => i.status === "待验证").length} 项待验证</em>
                </header>
                <div className="or-list">
                  {items.length ? items.map((o) => (
                    <article key={o.id} className={`or-card ${STATUS_CLS[o.status] ?? ""}`}>
                      <header>
                        <b className="or-patient">{o.patientId}</b>
                        <span className="or-trigger">{o.trigger}</span>
                        <span className={`or-status ${STATUS_CLS[o.status] ?? ""}`}>
                          {o.status === "已达标" ? <CheckCircle2 size={11} /> : <CircleDot size={11} />}{o.status}
                        </span>
                      </header>
                      <dl>
                        <div><dt>验证指标</dt><dd>{o.metric}</dd></div>
                        <div><dt>达标标准</dt><dd>{o.standard}</dd></div>
                        <div><dt>验证时点</dt><dd className={o.status === "待验证" ? "hot" : ""}>{o.dueAt}</dd></div>
                        {o.result && <div><dt>结果</dt><dd>{o.result}</dd></div>}
                        {o.taskGenerated && <div><dt>关联任务</dt><dd>{o.taskGenerated}</dd></div>}
                      </dl>
                      {o.status === "待验证" && (
                        <footer>
                          <button className="or-go" onClick={() => setView("tasks")}>去完成观察<CheckCircle2 size={11} /></button>
                        </footer>
                      )}
                    </article>
                  )) : <EmptyState title="该时间窗暂无回看任务" note="干预产生后自动排程。" />}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
