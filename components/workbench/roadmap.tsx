"use client";

import { useRef, useState } from "react";
import { ArrowRight, Bot, BrainCircuit, Building2, CheckCircle2, Eye, HeartPulse, Layers3, Network, Sparkles, Stethoscope, UsersRound, Workflow } from "lucide-react";
import { phases } from "@/lib/hospital";
import { PageHeading, useClientGsap } from "./primitives";

function IslandScene({ onOpenNative }: { onOpenNative: () => void }) {
  return (
    <section className="panel island-scene">
      <img src="/visuals/hospital-twin.png" alt="医院服务岛数字孪生" loading="lazy" />
      <div className="island-shade" />
      <div className="island-copy">
        <span>LIVE DIGITAL HOSPITAL</span>
        <h2>一个医院实体<br /><b>一组持续协作的服务岛</b></h2>
        <p>每个角色端都能按权限装配机器人与 Skill，所有工作最终回到同一患者状态。</p>
      </div>
      <div className="island-nodes">
        <div className="island-node"><Stethoscope size={15} /><span><b>门诊岛</b><small>2个机器人</small></span></div>
        <div className="island-node"><Building2 size={15} /><span><b>病区岛</b><small>晚星陪伴</small></span></div>
        <div className="island-node"><HeartPulse size={15} /><span><b>治疗岛</b><small>Copilot 角色端</small></span></div>
        <div className="island-node"><UsersRound size={15} /><span><b>院外岛</b><small>连续随访</small></span></div>
      </div>
      <button className="native-cta" onClick={onOpenNative}>
        <Sparkles size={16} />
        <div><b>进入 AI Native 视界</b><small>患者个案概念化 → 机器人协作网络 → 医院服务岛 → AI原生医院全景</small></div>
        <ArrowRight size={16} />
      </button>
    </section>
  );
}

const phaseIcons = [Bot, Layers3, Eye, Workflow, Network, BrainCircuit];

export function RoadmapView({ onOpenNative }: { onOpenNative: () => void }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".phase-node") ?? [], { autoAlpha: 0, y: 18, duration: .45, stagger: .08, ease: "power2.out" });
    gsap.from(ref.current?.querySelectorAll(".phase-detail-card") ?? [], { autoAlpha: 0, y: 14, duration: .45, ease: "power2.out" });
  }, { scope: ref, dependencies: [active] });

  const phase = phases[active];
  const PhaseIcon = phaseIcons[active];

  return (
    <div className="view-stack" ref={ref}>
      <PageHeading
        eyebrow="DELIVERY ROADMAP"
        title="实施进度与宏图"
        description="六个阶段的医院演进地图：每一步都建立在可验证的实施路线之上。点击阶段查看详情。"
      />
      <section className="panel evolution-map">
        <header className="panel-head-compact">
          <div><span>HOSPITAL EVOLUTION MAP</span><b>从数字员工到 AI Native 医院</b></div>
        </header>
        <nav className="phase-rail" aria-label="演进阶段">
          {phases.map((p, i) => {
            const Icon = phaseIcons[i];
            return (
              <button key={p.title} className={`phase-node ${active === i ? "active" : ""} ${p.progress > 20 ? "reachable" : ""}`} onClick={() => setActive(i)}>
                <span className="phase-icon"><Icon size={16} /></span>
                <div>
                  <small>阶段 {p.index} · {p.subtitle}</small>
                  <b>{p.title.replace(/^阶段\d+ · /, "")}</b>
                </div>
                <em className="phase-progress">{p.progress}%</em>
              </button>
            );
          })}
        </nav>
        <article className="phase-detail-card">
          <header>
            <span className={`phase-detail-icon ${phase.progress > 20 ? "live" : ""}`}><PhaseIcon size={20} /></span>
            <div>
              <small>{phase.title} · {phase.state}</small>
              <h3>{phase.title.replace(/^阶段\d+ · /, "")}</h3>
            </div>
            <span className="phase-state-badge">{phase.state}</span>
          </header>
          <p>{phase.detail}</p>
          <ul>
            {phase.points.map((pt) => <li key={pt}><CheckCircle2 size={13} />{pt}</li>)}
          </ul>
          <footer className="phase-progress-line">
            <span>实施进度</span>
            <div className="progress-track"><i style={{ width: `${phase.progress}%` }} /></div>
            <b>{phase.progress}%</b>
          </footer>
        </article>
      </section>

      <section className="panel acceptance-panel">
        <header className="panel-head-compact"><div><span>ACCEPTANCE</span><b>验收标准：不是看AI多聪明，而是看医院是否更高效</b></div></header>
        <div className="acceptance-grid">
          <p><b>80%+</b><span>核心字段自动获取</span></p>
          <p><b>&lt;15s</b><span>护士异常上报</span></p>
          <p><b>0</b><span>新增强制日报</span></p>
          <p><b>100%</b><span>任务与预测可追溯</span></p>
          <p><b>1条</b><span>真实服务链闭环</span></p>
        </div>
      </section>

      <IslandScene onOpenNative={onOpenNative} />
    </div>
  );
}
