"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ClipboardPlus, RefreshCw, Zap } from "lucide-react";
import type { PtRecord, PtSummary } from "@/lib/pt";
import type { ReportKind } from "@/lib/reports";
import { useWorkbench } from "@/lib/store";
import { EmptyState, PageHeading, useClientGsap } from "./primitives";

/**
 * 物理治疗执行：13_物理治疗执行与沟通的执行看板。
 * 关注的不是「排了多少」而是「哪些没做成、为什么没做成」：
 * 临床类原因（患者拒绝/不适/临床暂停）需医生端复核，设备与排程等运营类原因不进风险模型。
 */
export function PtView({ onReport }: { onReport?: (kind: ReportKind, patientId?: string) => void }) {
  const { notify } = useWorkbench();
  const [records, setRecords] = useState<PtRecord[]>([]);
  const [summary, setSummary] = useState<PtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pt", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; records?: PtRecord[]; summary?: PtSummary; source?: string };
      if (data.ok) {
        setRecords(data.records ?? []);
        setSummary(data.summary ?? null);
        setSource(data.source ?? "");
      }
    } catch {
      notify?.("物理治疗记录读取失败，请稍后重试", "warn");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".ptv-row") ?? [], { autoAlpha: 0, y: 10, duration: .35, stagger: .04, ease: "power2.out" });
  }, { scope: ref, dependencies: [records.length] });

  const metrics = [
    { label: "执行总数", value: summary?.total ?? 0, tone: "plain" },
    { label: "正常完成", value: summary?.done ?? 0, tone: "good" },
    { label: "非正常完成", value: summary?.abnormal ?? 0, tone: "warn" },
    { label: "临床类待复核", value: summary?.clinical ?? 0, tone: "hot" },
  ];

  const modalityMax = Math.max(1, ...(summary?.byModality ?? []).map((m) => m.count));
  const statusMax = Math.max(1, ...(summary?.byStatus ?? []).map((m) => m.count));

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="PHYSICAL THERAPY"
        title="物理治疗执行"
        description="按治疗项目与执行状态汇总物理治疗执行情况。非正常完成中属于临床类原因（患者拒绝、不适、临床暂停）的会推送医生端复核；设备与排程等运营类原因不计入风险模型。"
        action={
          <div className="fu-head-actions">
            <button className="fu-refresh" onClick={() => void load()} disabled={loading} aria-label="刷新执行记录">
              <RefreshCw size={13} className={loading ? "rot" : ""} />刷新
            </button>
            {onReport && (
              <button className="primary-action" onClick={() => onReport("pt")}>
                <Zap size={13} />填报执行记录
              </button>
            )}
          </div>
        }
      />

      <section className="ptv-metrics panel" aria-label="物理治疗执行概览">
        {metrics.map((m) => (
          <div key={m.label} className={`ptv-metric tone-${m.tone}`}>
            <b>{m.value}</b>
            <small>{m.label}</small>
          </div>
        ))}
      </section>

      <div className="ptv-dist">
        <section className="panel ptv-dist-card">
          <header className="ptv-dist-head"><Activity size={14} /><b>按治疗项目</b></header>
          <ul className="ptv-bars">
            {(summary?.byModality ?? []).length ? summary!.byModality.map((m) => (
              <li key={m.name}>
                <span className="ptv-bar-label">{m.name}</span>
                <span className="ptv-bar-track"><i style={{ width: `${(m.count / modalityMax) * 100}%` }} /></span>
                <span className="ptv-bar-value">{m.count}</span>
              </li>
            )) : <li className="ptv-empty">暂无执行记录</li>}
          </ul>
        </section>
        <section className="panel ptv-dist-card">
          <header className="ptv-dist-head"><AlertTriangle size={14} /><b>按执行状态</b></header>
          <ul className="ptv-bars">
            {(summary?.byStatus ?? []).length ? summary!.byStatus.map((m) => (
              <li key={m.name}>
                <span className="ptv-bar-label">{m.name}</span>
                <span className="ptv-bar-track"><i style={{ width: `${(m.count / statusMax) * 100}%` }} /></span>
                <span className="ptv-bar-value">{m.count}</span>
              </li>
            )) : <li className="ptv-empty">暂无执行记录</li>}
          </ul>
        </section>
      </div>

      <section className="panel ptv-board" ref={ref}>
        <header className="ptv-board-head">
          <div>
            <span>EXECUTION LOG</span>
            <b>最近执行记录</b>
          </div>
          <em>{source === "bitable" ? "来源：飞书 13_物理治疗执行与沟通" : ""}</em>
        </header>

        {loading && records.length === 0 ? (
          <p className="fu-loading">正在读取执行记录…</p>
        ) : records.length === 0 ? (
          <EmptyState title="暂无物理治疗执行记录" note="通过右上角「填报执行记录」录入后，这里会立刻更新。" />
        ) : (
          <div className="fu-table-wrap">
            <table className="fu-table ptv-table">
              <thead>
                <tr>
                  <th>患者</th>
                  <th>治疗项目</th>
                  <th>执行状态</th>
                  <th>治疗中观察 / 治疗后反馈</th>
                  <th>未完成原因</th>
                  <th>执行人</th>
                  <th>计划时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className={`ptv-row${r.clinical ? " is-clinical" : ""}`}>
                    <td>
                      <b className="fu-name">{r.patientId || "未填写"}</b>
                      <small>{r.code || r.id}</small>
                    </td>
                    <td><span className="ptv-modality">{r.modality || "—"}</span></td>
                    <td>
                      <span className={`ptv-status ${r.abnormal ? "bad" : "ok"}`}>{r.status || "—"}</span>
                      {r.clinical && <em className="ptv-flag">临床类 · 待医生复核</em>}
                    </td>
                    <td>
                      <small>{[r.during, r.feedback].filter(Boolean).join(" / ") || "—"}</small>
                      {r.adverse && <em className="ptv-flag">不良反应：{r.adverse}</em>}
                    </td>
                    <td><small>{r.reason || "—"}</small></td>
                    <td><small>{r.executor || r.reporter || "—"}</small></td>
                    <td><small>{r.planAt || r.reportAt || "—"}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
