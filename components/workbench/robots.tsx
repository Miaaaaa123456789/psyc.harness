"use client";

import { useRef, useState } from "react";
import { Bot, CheckCircle2, Database, Fingerprint, LockKeyhole, ShieldCheck, Workflow } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { roles, robots, type Robot, type RoleId } from "@/lib/hospital";
import { useWorkbench } from "@/lib/store";
import { PageHeading, PlusBadge, useClientGsap } from "./primitives";

function RobotStatusDot({ status }: { status: string }) {
  return <span className={`robot-dot ${status === "运行中" ? "online" : status === "需校准" ? "warning" : "idle"}`} />;
}

function RobotCard({ robot, onOpen, index }: { robot: Robot; onOpen: () => void; index: number }) {
  const Icon = robot.icon;
  return (
    <article className={`robot-card panel ${robot.physical ? "has-photo" : ""}`} style={{ animationDelay: `${index * 70}ms` }}>
      <PlusBadge label={`装配 ${robot.name}`} onClick={onOpen} />
      <header>
        {robot.physical
          ? <span className="robot-photo"><img src="/visuals/ui-physical-robot.png" alt="实体陪伴机器人" loading="lazy" /></span>
          : <span className={`robot-icon accent-${robot.accent}`}><Icon size={20} /></span>}
        <div>
          <b>{robot.name}</b>
          <small>{robot.id} · {robot.dept}</small>
        </div>
        <span className="robot-status"><RobotStatusDot status={robot.status} />{robot.status}</span>
      </header>
      <p>{robot.description}</p>
      <div className="robot-io">
        <div><small>读取</small>{robot.reads.slice(0, 3).map((r) => <i key={r}>{r}</i>)}</div>
        <div><small>输出</small>{robot.outputs.slice(0, 3).map((o) => <i key={o}>{o}</i>)}</div>
      </div>
      <footer>
        <span><b>{robot.done}</b>今日完成</span>
        <span><b>{robot.pending}</b>待人工</span>
        <div className="robot-roles">{roles.filter((r) => robot.roles.includes(r.id)).map((r) => <em key={r.id}>{r.name.replace("端", "")}</em>)}</div>
      </footer>
      <button className="robot-open" onClick={onOpen}>配置装配 <Workflow size={13} /></button>
    </article>
  );
}

export function RobotConfigSheet({ robot, onClose }: { robot: Robot | null; onClose: () => void }) {
  const { notify } = useWorkbench();
  const [selectedRoles, setSelectedRoles] = useState<RoleId[]>([]);
  const [reads, setReads] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [workspace, setWorkspace] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [added, setAdded] = useState(false);

  const reset = () => { setSelectedRoles([]); setReads([]); setOutputs([]); setWorkspace(""); setPreviewing(false); setAdded(false); };
  const close = () => { reset(); onClose(); };

  return (
    <Sheet open={Boolean(robot)} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="work-sheet robot-config-sheet">
        {robot && <ScrollArea className="sheet-scroll">
          <SheetHeader>
            <div className="sheet-avatar accent-violet"><Bot /></div>
            <SheetDescription>ROBOT ASSEMBLY · {robot.id}</SheetDescription>
            <SheetTitle>装配 {robot.name}</SheetTitle>
            <p>装配到角色端前，需要明确数据权限、输出边界与人工升级条件。</p>
          </SheetHeader>
          <div className="sheet-content">
            <section>
              <span>01 · 添加到哪个角色端</span>
              <div className="chip-select-grid">
                {roles.filter((r) => !r.readonly).map((r) => {
                  const on = selectedRoles.includes(r.id);
                  return (
                    <button key={r.id} className={on ? "selected" : ""} onClick={() => setSelectedRoles((list) => on ? list.filter((x) => x !== r.id) : [...list, r.id])}>
                      {on ? <CheckCircle2 size={14} /> : null}{r.name}
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <span>02 · 允许读取哪些数据</span>
              <div className="check-grid">
                {robot.reads.map((item) => {
                  const on = reads.includes(item);
                  return (
                    <button key={item} className={on ? "selected" : ""} onClick={() => setReads((list) => on ? list.filter((x) => x !== item) : [...list, item])}>
                      <i />{item}<em>只读</em>
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <span>03 · 允许输出哪些内容</span>
              <div className="check-grid">
                {robot.outputs.map((item) => {
                  const on = outputs.includes(item);
                  return (
                    <button key={item} className={on ? "selected" : ""} onClick={() => setOutputs((list) => on ? list.filter((x) => x !== item) : [...list, item])}>
                      <i />{item}
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <span>04 · 输出进入哪个工作位置</span>
              <div className="chip-select-grid">
                {[robot.workspace, "今日总览 · 行动摘要", "任务中心 · 待办队列", "患者详情 · 今日状态"].map((w) => (
                  <button key={w} className={workspace === w ? "selected" : ""} onClick={() => setWorkspace(w)}>{w}</button>
                ))}
              </div>
            </section>
            <section>
              <span>05 · 什么情况必须升级人工</span>
              <div className="readonly-note warn"><LockKeyhole size={14} /><p>{robot.escalation}</p></div>
            </section>
            <section>
              <span>06 · 谁拥有启停权限</span>
              <div className="readonly-note"><ShieldCheck size={14} /><p>{robot.ownerOfSwitch}</p></div>
            </section>

            {previewing && !added && (
              <section className="perm-preview">
                <span>权限预览</span>
                <div className="perm-box">
                  <p><b>装配角色：</b>{selectedRoles.length ? selectedRoles.map((id) => roles.find((r) => r.id === id)?.name).join("、") : "未选择"}</p>
                  <p><b>可读数据：</b>{reads.length ? reads.join("、") : "未授权任何数据"}</p>
                  <p><b>可输出：</b>{outputs.length ? outputs.join("、") : "未授权任何输出"}</p>
                  <p><b>输出位置：</b>{workspace || "未指定"}</p>
                  <p><b>人工升级：</b>{robot.escalation}</p>
                  <p><b>启停权限：</b>{robot.ownerOfSwitch}</p>
                </div>
              </section>
            )}

            {added
              ? <div className="add-success"><CheckCircle2 /><span><b>已装配到演示配置</b><small>正式部署仍需管理员审批，全程留痕。</small></span></div>
              : <div className="sheet-actions">
                  {!previewing
                    ? <button className="secondary-action sheet-btn" disabled={!selectedRoles.length || !reads.length} onClick={() => setPreviewing(true)}>预览权限</button>
                    : <button className="primary-action sheet-btn" disabled={!selectedRoles.length || !reads.length} onClick={() => { setAdded(true); notify(`${robot.name} 已装配到 ${selectedRoles.map((id) => roles.find((r) => r.id === id)?.name).join("、")}`); }}>确认装配</button>}
                  <p className="sheet-hint"><Fingerprint size={12} />不允许跳过权限预览直接装配。</p>
                </div>}
          </div>
        </ScrollArea>}
      </SheetContent>
    </Sheet>
  );
}

export function RobotsView() {
  const [configRobot, setConfigRobot] = useState<Robot | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(gridRef.current?.querySelectorAll(".robot-card") ?? [], { autoAlpha: 0, y: 20, duration: .5, stagger: .09, ease: "power3.out" });
  }, { scope: gridRef });
  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="ROBOT WORKFORCE"
        title="机器人团队"
        description="四个已进入真实岗位的机器人。点击卡片右上角＋，配置装配到不同角色端。"
        action={<span className="workforce-summary"><span>4 个机器人</span><i /><span>3 运行中</span><i /><span>1 需校准</span></span>}
      />
      <div ref={gridRef} className="robot-grid">
        {robots.map((robot, i) => <RobotCard key={robot.id} robot={robot} index={i} onOpen={() => setConfigRobot(robot)} />)}
      </div>
      <section className="panel robot-arch">
        <header className="panel-head-compact"><div><span>SHARED MODEL ARCHITECTURE</span><b>低成本技术架构</b></div></header>
        <div className="arch-flow">
          <div className="arch-step"><Database size={15} /><div><b>共享基础模型</b><small>不为每名患者部署独立实例</small></div></div>
          <i>＋</i>
          <div className="arch-step"><Bot size={15} /><div><b>患者结构化状态</b><small>状态参数 · 纵向事件日志</small></div></div>
          <i>＋</i>
          <div className="arch-step"><Workflow size={15} /><div><b>规则引擎与小模型</b><small>常规抽取 · 分类 · 提醒</small></div></div>
          <i>→</i>
          <div className="arch-step human"><Fingerprint size={15} /><div><b>按需推理＋人工确认</b><small>大模型只做摘要与复杂整合</small></div></div>
        </div>
      </section>
      <RobotConfigSheet robot={configRobot} onClose={() => setConfigRobot(null)} />
    </div>
  );
}
