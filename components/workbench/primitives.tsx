"use client";

import { useEffect, useRef, type DependencyList, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, type LucideIcon } from "lucide-react";

type GsapInstance = typeof import("gsap")["gsap"];

export function useClientGsap(
  setup: (gsap: GsapInstance) => void | (() => void),
  options: { scope: { current: Element | null }; dependencies?: DependencyList },
) {
  const { scope, dependencies = [] } = options;
  useEffect(() => {
    let cancelled = false;
    let context: { revert: () => void } | undefined;
    let dispose: void | (() => void);
    void import("gsap").then(({ gsap }) => {
      if (cancelled || !scope.current) return;
      context = gsap.context(() => { dispose = setup(gsap); }, scope.current);
    });
    return () => {
      cancelled = true;
      if (typeof dispose === "function") dispose();
      context?.revert();
    };
  }, dependencies);
}

export function useReducedMotion() {
  const ref = useRef(false);
  if (typeof window !== "undefined") ref.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return ref.current;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

const statusTone: Record<string, string> = {
  "机器人处理中": "tone-cyan", "等待人工确认": "tone-amber", "已接受": "tone-blue", "已转交": "tone-violet",
  "处理中": "tone-blue", "已完成": "tone-green", "已驳回": "tone-gray", "已超时": "tone-red",
};

export function TaskStatusPill({ status }: { status: string }) {
  return <span className={`task-pill ${statusTone[status] ?? "tone-gray"}`}><i />{status}</span>;
}

export function RiskBadge({ risk }: { risk: "高" | "中" | "低" }) {
  return <span className={`risk-badge risk-${risk}`}>{risk}风险</span>;
}

export function PlusBadge({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="plus-badge" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} title={label}>
      ＋
    </button>
  );
}

/* 金色火焰吉祥物：待机/招手/思考/指路/庆祝 */
export function Mascot({ mode = "idle", size = 44, className = "" }: { mode?: "idle" | "wave" | "think" | "point" | "cheer"; size?: number; className?: string }) {
  return (
    <span className={`mascot mascot-${mode} ${className}`} style={{ width: size, height: size }} role="img" aria-label="金色火焰吉祥物">
      <img src="/visuals/ui-golden-mascot.png" alt="" loading="lazy" />
    </span>
  );
}

/* 灯塔：风险升级 / 人工接管 */
export function LighthouseBeacon({ active = true, label }: { active?: boolean; label?: string }) {
  return (
    <span className={`lighthouse ${active ? "active" : ""}`} role="img" aria-label={label ?? "风险升级灯塔"}>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 8h6l1.5 12h-9L9 8Z" fill="currentColor" opacity=".9" />
        <path d="M9 6h6v2H9zM8 4h8v1.5H8z" fill="currentColor" opacity=".65" />
        <path d="M4 4.5 8 6M20 4.5 16 6M4 9l4-1M20 9l-4-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <i className="sweep s1" /><i className="sweep s2" />
    </span>
  );
}

export function IOBlock({ icon: Icon, kind, title, items, tone }: { icon: LucideIcon; kind: string; title: string; items: string[]; tone: "in" | "out" }) {
  return (
    <article className={`io-block io-${tone}`}>
      <header>
        <span><Icon size={15} /></span>
        <div>
          <small>{kind}</small>
          <b>{title}</b>
        </div>
      </header>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

export function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <div className="empty-state">
      <Mascot mode="think" size={56} />
      <b>{title}</b>
      <p>{note}</p>
    </div>
  );
}

export function FeedbackLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <p className="feedback-line"><Icon size={13} />{text}</p>;
}

export const Guard = ({ children }: { children: ReactNode }) => (
  <div className="human-gate-note">
    <LighthouseBeacon />
    <span>{children}</span>
  </div>
);

export const MascotCheer = ({ text }: { text: string }) => (
  <div className="mascot-cheer"><Mascot mode="cheer" size={40} /><span>{text}</span></div>
);

export const MascotPoint = ({ text }: { text: string }) => (
  <div className="mascot-point"><Mascot mode="point" size={36} /><span>{text}</span></div>
);

export const MascotNote = ({ text }: { text: string }) => (
  <div className="mascot-note"><Mascot mode="wave" size={32} /><span>{text}</span></div>
);

export const RiskCallout = ({ text }: { text: string }) => (
  <div className="risk-callout"><LighthouseBeacon active /><b>风险升级</b><span>{text}</span><AlertTriangle size={14} /></div>
);

export const SuccessCallout = ({ text }: { text: string }) => (
  <div className="success-callout"><CheckCircle2 size={15} /><span>{text}</span></div>
);

export const SparkLine = ({ children }: { children: ReactNode }) => (
  <span className="spark-line"><Sparkles size={12} />{children}</span>
);
