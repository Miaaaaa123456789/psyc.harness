"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ChevronRight, ClipboardList, FileSearch, Link2, ShieldCheck, X } from "lucide-react";
import { COPILOT_INSIGHTS, DECISION_PROPOSALS, INFO_CONFLICTS, type DecisionProposal } from "@/lib/copilot";
import { useWorkbench } from "@/lib/store";
import { EmptyState, PageHeading, RiskBadge, useClientGsap } from "./primitives";

/**
 * 待确认方案：AI 生成的备选行动（问诊/检查/会诊/药物调整）等待医生确认。
 * 医疗建议必须经医生确认，不能直接发送给患者或自动执行。
 * 责任链：谁发现 → 谁提出 → 谁确认 → 谁执行 → 谁审核 → 谁验证。
 */
function ProposalCard({ proposal }: { proposal: DecisionProposal }) {
  const { notify } = useWorkbench();
  const [picked, setPicked] = useState<string | null>(null);
  const [decided, setDecided] = useState(false);
  const insight = COPILOT_INSIGHTS.find((i) => i.id === proposal.insightId);
  const conflicts = INFO_CONFLICTS.filter((c) => c.patientId === proposal.patientId);

  const confirm = () => {
    if (!picked) return;
    setDecided(true);
    notify(`方案已确认（${picked}）：已自动拆解为护士/治疗师任务，并设置完成标准与截止时间`, "success");
    notify("结局验证已排程：数小时 / 24小时 / 3-7天自动回看", "info");
  };
  const reject = () => {
    setDecided(true);
    notify("已驳回该 AI 方案，原因将反馈给模型迭代", "info");
  };

  return (
    <article className={`prop-card ${decided ? "decided" : ""}`}>
      <header>
        <b className="prop-patient">{proposal.patientId}</b>
        <RiskBadge risk="高" />
        <span className="prop-deadline">{proposal.deadline} 截止</span>
        <span className={`prop-status st-${decided ? "done" : "wait"}`}>{decided ? "已处理" : proposal.status}</span>
      </header>
      <h3>{proposal.title}</h3>

      {insight && (
        <div className="prop-source">
          <Link2 size={12} />
          <span>来源洞察：{insight.title}（{insight.model} · 置信度{insight.confidence}）</span>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="prop-conflicts">
          <b><FileSearch size={12} />涉及的信息冲突</b>
          {conflicts.map((c) => (
            <p key={c.id}><span className="side">A</span>{c.a.claim} <b className="vs">vs</b> <span className="side">B</span>{c.b.claim}<small>{c.confirmBy}</small></p>
          ))}
        </div>
      )}

      <div className="prop-options">
        {proposal.options.map((o) => (
          <button key={o.label} type="button"
            className={`prop-option ${picked === o.label ? "picked" : ""}`}
            disabled={decided}
            onClick={() => setPicked(o.label)}>
            <b>{o.label}</b>
            <p>{o.detail}</p>
            <small>确认后标准动作：{o.standardAction}</small>
            {picked === o.label && <CheckCircle2 size={14} className="po-check" />}
          </button>
        ))}
      </div>

      {proposal.requiredEvidence.length > 0 && (
        <p className="prop-evidence"><ShieldCheck size={12} />仍需补充证据：{proposal.requiredEvidence.join(" / ")}</p>
      )}

      {/* 责任链 */}
      <div className="prop-chain" aria-label="责任链">
        <b>责任链</b>
        <ol>
          {proposal.chain.map((c) => (
            <li key={c.stage} className={c.actor === "—" ? "empty" : ""}>
              <em>{c.stage}</em>
              <span>{c.actor}</span>
              <small>{c.note}</small>
            </li>
          ))}
        </ol>
      </div>

      {!decided && (
        <footer className="prop-footer">
          <button className="btn-reject" onClick={reject}><X size={12} />驳回</button>
          <button className="primary-action" disabled={!picked} onClick={confirm}>
            <CheckCircle2 size={13} />确认方案并派发任务
          </button>
        </footer>
      )}
    </article>
  );
}

export function ProposalsView() {
  const ref = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".prop-card") ?? [], { autoAlpha: 0, y: 16, duration: .45, stagger: .08, ease: "power3.out" });
  }, { scope: ref });

  const waiting = DECISION_PROPOSALS.filter((p) => p.status === "等待医生确认");

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="DECISION PROPOSALS"
        title="待确认方案"
        description="AI 生成的备选临床行动（问诊 / 检查 / 会诊 / 药物调整）在此等待医生确认；确认后自动拆解为各角色任务并排程结局验证。医疗建议不会绕过医生直接触达患者。"
      />
      <div ref={ref} className="prop-stack">
        {waiting.length
          ? waiting.map((p) => <ProposalCard key={p.id} proposal={p} />)
          : <EmptyState title="当前没有等待确认的方案" note="AI 洞察触发临床行动建议时会出现在这里。" />}
      </div>
    </div>
  );
}
