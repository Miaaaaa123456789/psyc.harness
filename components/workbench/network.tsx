"use client";

import { useRef, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Clock3, Database, Workflow } from "lucide-react";
import { departments, type Department } from "@/lib/hospital";
import { useWorkbench } from "@/lib/store";
import { PageHeading, useClientGsap } from "./primitives";

const deptIcons: Record<string, string> = {
  "门诊中心": "opd", "住院病区": "ward", "医疗部": "med", "护理部": "nursing",
  "心理治疗中心": "therapy", "检查与药房": "lab", "健康管理中心": "health", "管家与运营": "ops", "院领导": "leader",
};

function DepartmentDetail({ dept }: { dept: Department }) {
  return (
    <section className="panel dept-detail">
      <header>
        <div><span>DEPARTMENT</span><b>{dept.name}</b></div>
        <span className="dept-load">当前负荷 <b>{dept.load}%</b></span>
      </header>
      <div className="dept-detail-grid">
        <div>
          <small><Bot size={12} />正在使用的机器人</small>
          {dept.robots.length ? dept.robots.map((r) => <p key={r}>{r}</p>) : <p className="muted">无直接部署</p>}
        </div>
        <div>
          <small><Workflow size={12} />已装配 Skill</small>
          {dept.skills.map((s) => <p key={s}>{s}</p>)}
        </div>
        <div>
          <small><Database size={12} />输入数据</small>
          {dept.inputs.map((s) => <p key={s}>{s}</p>)}
        </div>
        <div>
          <small><ArrowRight size={12} />输出任务</small>
          {dept.outputs.map((s) => <p key={s}>{s}</p>)}
        </div>
      </div>
      <div className="dept-waiting">
        <div>
          <small><Clock3 size={12} />等待其他部门的事项</small>
          {dept.waitingOnOthers.length ? dept.waitingOnOthers.map((s) => <p key={s}>{s}</p>) : <p className="muted">无阻塞事项</p>}
        </div>
        <div>
          <small><CheckCircle2 size={12} />本部门未闭环任务</small>
          <p><b className={dept.unclosed > 2 ? "hot" : ""}>{dept.unclosed}</b> 项</p>
        </div>
      </div>
    </section>
  );
}

export function NetworkView() {
  const [focus, setFocus] = useState<string | null>("住院病区");
  const { demoMode } = useWorkbench();
  const netRef = useRef<HTMLDivElement>(null);
  const focused = departments.find((d) => d.name === focus);

  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const packets = netRef.current?.querySelectorAll<HTMLElement>(".flow-packet");
    if (packets?.length) {
      gsap.fromTo(packets, { left: "0%", opacity: 0 }, { left: "100%", opacity: 1, duration: 1.8, stagger: .5, repeat: -1, ease: "power1.inOut" });
    }
  }, { scope: netRef, dependencies: [demoMode] });

  return (
    <div className="view-stack" ref={netRef}>
      <PageHeading
        eyebrow="DEPARTMENT COLLABORATION"
        title="部门协同"
        description="点击部门节点，查看机器人、Skill、输入输出与跨部门等待事项。连线只表示真实的数据或任务传递。"
      />
      <section className="panel network-hub">
        <div className="hub-core">
          <span><Workflow size={18} /></span>
          <div><b>AI医院协同中枢</b><small>统一患者ID · 统一时间戳 · 统一任务中心</small></div>
        </div>
        <div className="hub-rail">
          <span>事件只写一次</span><i className={demoMode ? "flow-packet" : undefined} />
          <span>任务自动路由</span><i className={demoMode ? "flow-packet" : undefined} />
          <span>部门人工确认</span><i className={demoMode ? "flow-packet" : undefined} />
          <span>结果回到患者状态</span>
        </div>
      </section>
      <div className="network-grid">
        {departments.map((dept) => (
          <button
            key={dept.name}
            className={`dept-node panel dept-${deptIcons[dept.name]} ${focus === dept.name ? "is-focused" : ""}`}
            onClick={() => setFocus(focus === dept.name ? null : dept.name)}
          >
            <header>
              <b>{dept.name}</b>
              <span className={`dept-load-bar ${dept.load > 70 ? "hot" : ""}`}><i style={{ width: `${dept.load}%` }} /></span>
            </header>
            <p>{dept.robots.length ? `${dept.robots.length} 个机器人 · ${dept.skills.length} 个Skill` : `${dept.skills.length} 个Skill · 数据只读`}</p>
            <footer>
              <span>负荷 {dept.load}%</span>
              {dept.unclosed > 0 && <em>{dept.unclosed} 项未闭环</em>}
            </footer>
          </button>
        ))}
      </div>
      {focused && <DepartmentDetail dept={focused} />}
    </div>
  );
}
