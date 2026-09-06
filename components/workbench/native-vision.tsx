"use client";

import { useRef, useState } from "react";
import { BrainCircuit, Building2, CheckCircle2, ChevronLeft, ChevronRight, HeartPulse, MessageSquareText, History, MoonStar, Sparkles, Stethoscope, UsersRound, X } from "lucide-react";
import { robots } from "@/lib/hospital";
import { patients } from "@/lib/store";
import { LighthouseBeacon, useClientGsap } from "./primitives";

const nativeStages = ["患者个案概念化", "机器人协作网络", "医院服务岛", "AI原生医院全景"];
const islandNames = ["门诊岛", "病区岛", "治疗岛", "院外岛"];
const islandInfo = [
  { name: "门诊岛", note: "预问诊 · 复诊 · 2个机器人" },
  { name: "病区岛", note: "护理 · 用药 · 晚星陪伴" },
  { name: "治疗岛", note: "评估 · 会谈 · Copilot" },
  { name: "院外岛", note: "家庭 · 随访 · 连续服务" },
];

export function NativeVision({ onClose, initialStage = 0 }: { onClose: () => void; initialStage?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(initialStage);
  const [island, setIsland] = useState(0);
  const [moment, setMoment] = useState(0);
  const p042 = patients.find((p) => p.id === "P-042")!;
  const robotIcons = [MessageSquareText, History, MoonStar, BrainCircuit];

  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".native-scene > *") ?? [], { autoAlpha: 0, y: 14, duration: .4, stagger: .05, ease: "power2.out" });
    if (stage === 1) gsap.to(ref.current?.querySelectorAll(".constellation-robot") ?? [], { y: 5, duration: 1.9, repeat: -1, yoyo: true, stagger: .15, ease: "sine.inOut" });
    if (stage === 2) gsap.fromTo(ref.current?.querySelector(".island-photo") ?? [], { scale: 1.01 }, { scale: 1.05, duration: 16, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }, { scope: ref, dependencies: [stage] });

  return (
    <div ref={ref} className="native-portal" role="dialog" aria-modal="true" aria-label="AI Native 视界">
      <header className="native-portal-head">
        <button className="native-back" onClick={onClose}><ChevronLeft size={15} />返回运行工作台</button>
        <div className="native-brand"><Sparkles size={18} /><span><b>AI NATIVE 视界</b><small>PSYCHIATRIC AI HOSPITAL</small></span></div>
        <button className="native-close" onClick={onClose} aria-label="关闭"><X size={16} /></button>
      </header>
      <nav className="native-stage-rail" aria-label="AI Native视界阶段">
        {nativeStages.map((name, i) => (
          <button key={name} className={stage === i ? "active" : stage > i ? "done" : ""} onClick={() => setStage(i)}>
            <i>{String(i + 1).padStart(2, "0")}</i><span>{name}</span>
          </button>
        ))}
      </nav>
      <main className="native-stage-frame">
        {stage === 0 && (
          <section className="native-scene case-scene">
            <div className="scene-kicker">01 / PATIENT CASE FORMULATION</div>
            <div className="case-heading">
              <div><span>演示病例 · P-042 · 住院第 8 天</span><h1>一个患者在院内<br />如何被持续理解</h1></div>
              <div className="case-state"><b>稳定风险 · 恢复功能</b><span>关注度 72</span></div>
            </div>
            <div className="case-dashboard">
              <article className="case-card">
                <header><span><BrainCircuit size={15} /></span><div><small>LIVE CASE FORMULATION</small><b>连续个案概念化</b></div><em>刚刚更新</em></header>
                <div className="formulation-grid">
                  {p042.formulation.map((f) => <p key={f.label}><i>{f.label}</i><span><b>{f.value}</b><small>{f.note}</small></span></p>)}
                </div>
                <div className="case-event"><LighthouseBeacon active /><span><small>今日重要事件</small><b>睡眠碎片化 ＋ 一次拒药</b><p>已触发晚星机器人复核，护理部正在确认；个案概念化与今日任务已同步更新。</p></span></div>
              </article>
              <article className="case-card">
                <header><div><small>VOYAGE MAP</small><b>治疗航图</b></div><span>入院评估 → 院外复诊</span></header>
                <ol className="case-voyage">
                  {["入院评估", "稳定与安全", "药物与检查", "心理治疗", "功能恢复", "出院准备", "院外复诊"].map((s) => {
                    const node = p042.voyage.find((v) => v.stage === s)!;
                    return <li key={s} className={node.state}>{node.state === "done" ? <CheckCircle2 size={13} /> : <i />}<span>{s}</span></li>;
                  })}
                </ol>
              </article>
              <article className="case-card">
                <header><div><small>MOMENTS</small><b>精彩瞬间</b></div><span>{moment + 1} / {p042.moments.length}</span></header>
                <div className="case-moments">
                  {p042.moments.map((m, i) => (
                    <button key={m.day} className={moment === i ? "active" : ""} onClick={() => setMoment(i)}>
                      <img src={m.src} alt={m.title} loading="lazy" />
                      <span><small>{m.day}</small><b>{m.title}</b></span>
                    </button>
                  ))}
                </div>
                <p className="case-moment-note">{p042.moments[moment].note}</p>
              </article>
            </div>
          </section>
        )}

        {stage === 1 && (
          <section className="native-scene constellation-scene">
            <div className="scene-kicker">02 / ROBOT COLLABORATION NETWORK</div>
            <div className="constellation-title">
              <h1>不是四个孤立机器人<br />而是一支围绕患者协作的团队</h1>
              <p>每个机器人读取不同数据源，输出汇入同一患者状态与任务中心。</p>
            </div>
            <div className="constellation-map">
              <svg viewBox="0 0 800 440" aria-hidden="true">
                <path d="M400 220 C265 90 180 100 105 92" />
                <path d="M400 220 C540 85 650 95 708 108" />
                <path d="M400 220 C250 330 170 345 105 360" />
                <path d="M400 220 C555 335 650 338 710 354" />
              </svg>
              <div className="constellation-core"><span><HeartPulse size={19} /></span><b>P-042</b><small>当前状态 · 72</small></div>
              {robots.map((robot, i) => {
                const Icon = robotIcons[i];
                return (
                  <div key={robot.id} className={`constellation-robot r${i + 1}`}>
                    <span><Icon size={15} /></span>
                    <b>{robot.short}</b>
                    <small>{robot.dept.split(" · ")[0]}</small>
                  </div>
                );
              })}
            </div>
            <div className="constellation-note panel">
              <Stethoscope size={14} /><span>人工接点：医生确认 · 护士现场确认 · 治疗师主题确认 —— 机器人只准备信息，不替代专业判断。</span>
            </div>
          </section>
        )}

        {stage === 2 && (
          <section className="native-scene island-scene">
            <img className="island-photo" src="/visuals/hospital-twin.png" alt="医院服务岛" />
            <div className="island-vignette" />
            <div className="scene-kicker">03 / HOSPITAL SERVICE ISLANDS</div>
            <div className="island-stage-copy">
              <h1>医院不是一栋楼<br />而是一组持续协作的服务岛</h1>
              <p>真实科室、机器人、任务与患者状态，在同一张运行地图上联结。</p>
            </div>
            <div className="island-hotspots">
              {islandInfo.map((info, i) => (
                <button key={info.name} className={`island-hotspot ih${i + 1} ${island === i ? "active" : ""}`} onClick={() => setIsland(i)}>
                  <i /><span><b>{info.name}</b><small>{info.note}</small></span>
                </button>
              ))}
            </div>
          </section>
        )}

        {stage === 3 && (
          <section className="native-scene panorama-scene">
            <img src="/visuals/ai-native-ecosystem.png" alt="AI原生医院全景" />
            <div className="panorama-vignette" />
            <div className="panorama-copy">
              <span>04 / THE NORTH STAR</span>
              <h1>AI 原生医院</h1>
              <p>机器人协作网络 · 患者数字影子 · 医院服务岛 · 服务运行孪生 · 资源动态调度 · 个体化治疗与随访闭环。</p>
              <footer><Building2 size={14} /><span>医院授权流程，AI执行流程，专业人员保留权力。终局不是无人医院，而是同样的专家时间安全覆盖更多患者。</span></footer>
            </div>
          </section>
        )}
      </main>
      <div className="native-controls">
        <button disabled={stage === 0} onClick={() => setStage(stage - 1)}><ChevronLeft size={13} />上一幕</button>
        <span>{stage + 1} / 4</span>
        <button disabled={stage === 3} onClick={() => setStage(stage + 1)}>下一幕<ChevronRight size={13} /></button>
      </div>
    </div>
  );
}
