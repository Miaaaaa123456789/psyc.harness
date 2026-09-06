"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Fingerprint, ShieldCheck, WandSparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { hospitalWideSkills, roleSkills, roles, type SkillCard } from "@/lib/hospital";
import { useWorkbench } from "@/lib/store";
import { PageHeading, PlusBadge, useClientGsap } from "./primitives";

function SkillRow({ skill, onAdd }: { skill: SkillCard; onAdd: () => void }) {
  return (
    <article className="skill-card">
      <PlusBadge label={`添加 ${skill.name}`} onClick={onAdd} />
      <header>
        <span className="skill-priority">P0</span>
        <b>{skill.name}</b>
      </header>
      <dl>
        <div><dt>自动读取</dt><dd>{skill.reads}</dd></div>
        <div><dt>输出内容</dt><dd>{skill.outputs}</dd></div>
        <div><dt>输出给谁</dt><dd>{skill.toWhom}</dd></div>
        <div><dt>嵌入位置</dt><dd>{skill.placement}</dd></div>
      </dl>
      <footer><CheckCircle2 size={13} />{skill.value}</footer>
      {skill.note && <p className="skill-note"><ShieldCheck size={12} />{skill.note}</p>}
    </article>
  );
}

function AddSkillSheet({ skill, onClose }: { skill: SkillCard | null; onClose: () => void }) {
  const { notify } = useWorkbench();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const [added, setAdded] = useState(false);
  const reset = () => { setSelectedRole(""); setPreviewing(false); setAdded(false); };
  const close = () => { reset(); onClose(); };
  return (
    <Sheet open={Boolean(skill)} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="work-sheet">
        {skill && <ScrollArea className="sheet-scroll">
          <SheetHeader>
            <div className="sheet-avatar accent-blue"><WandSparkles /></div>
            <SheetDescription>SKILL ASSEMBLY · P0</SheetDescription>
            <SheetTitle>装配 {skill.name}</SheetTitle>
            <p>选择要装配到的角色端，装配前需要确认权限预览。</p>
          </SheetHeader>
          <div className="sheet-content">
            <section>
              <span>装配到角色端</span>
              <div className="chip-select-grid">
                {roles.filter((r) => !r.readonly).map((r) => (
                  <button key={r.id} className={selectedRole === r.name ? "selected" : ""} onClick={() => { setSelectedRole(r.name); setPreviewing(false); }}>
                    {selectedRole === r.name ? <CheckCircle2 size={14} /> : null}{r.name}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <span>Skill 信息</span>
              <div className="perm-box">
                <p><b>自动读取：</b>{skill.reads}</p>
                <p><b>输出内容：</b>{skill.outputs}</p>
                <p><b>输出给谁：</b>{skill.toWhom}</p>
                <p><b>嵌入位置：</b>{skill.placement}</p>
                <p><b>直接价值：</b>{skill.value}</p>
              </div>
            </section>
            {previewing && !added && (
              <section className="perm-preview">
                <span>权限预览</span>
                <div className="perm-box">
                  <p><b>装配角色：</b>{selectedRole || "未选择"}</p>
                  <p><b>可读数据：</b>{skill.reads}</p>
                  <p><b>输出边界：</b>{skill.outputs}</p>
                  <p><b>人工升级：</b>输出涉及风险或需医疗决策时，一律升级人工确认。</p>
                </div>
              </section>
            )}
            {added
              ? <div className="add-success"><CheckCircle2 /><span><b>已加入 {selectedRole} 演示配置</b><small>正式部署需管理员审批。</small></span></div>
              : <div className="sheet-actions">
                  {!previewing
                    ? <button className="secondary-action sheet-btn" disabled={!selectedRole} onClick={() => setPreviewing(true)}>预览权限</button>
                    : <button className="primary-action sheet-btn" disabled={!selectedRole} onClick={() => { setAdded(true); notify(`${skill.name} 已装配到 ${selectedRole}`); }}>确认装配</button>}
                  <p className="sheet-hint"><Fingerprint size={12} />装配前必须完成权限预览。</p>
                </div>}
          </div>
        </ScrollArea>}
      </SheetContent>
    </Sheet>
  );
}

export function SkillsView() {
  const [addSkill, setAddSkill] = useState<SkillCard | null>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const catalog = roleSkills[roleIndex];
  const roleMeta = roles.find((r) => r.id === catalog.roleId)!;

  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(gridRef.current?.querySelectorAll(".skill-card") ?? [], { autoAlpha: 0, y: 16, duration: .42, stagger: .05, ease: "power2.out" });
  }, { scope: gridRef, dependencies: [roleIndex] });

  return (
    <div className="view-stack skills-view">
      <PageHeading
        eyebrow="ROLE-BASED SKILL REGISTRY"
        title="Skill 库"
        description="按角色端组织，内部按 P0—P3 排序：先嵌入现有工作流，再逐级进入跨角色闭环、预测与 AI Native 能力。"
        action={<span className="skill-stats"><b>6</b><span>全院P0</span><i /><b>29</b><span>角色P0</span></span>}
      />

      <section className="panel skill-principle">
        <div className="formula">
          <span>P0 立即嵌入现有工作流</span><i>→</i>
          <span>P1 跨角色任务闭环</span><i>→</i>
          <span>P2 预测与优化</span><i>→</i>
          <span>P3 AI Native 能力</span>
        </div>
      </section>

      <section className="skill-section">
        <header className="section-head">
          <div><span>HOSPITAL-WIDE P0</span><h2>全院公共 Skill</h2></div>
        </header>
        <div ref={gridRef} className="skill-grid">
          {hospitalWideSkills.map((s) => <SkillRow key={s.name} skill={s} onAdd={() => setAddSkill(s)} />)}
        </div>
      </section>

      <nav className="role-skill-tabs" aria-label="按角色浏览 Skill">
        {roleSkills.map((catalog, i) => {
          const meta = roles.find((r) => r.id === catalog.roleId)!;
          const Icon = meta.icon;
          return (
            <button key={catalog.roleId} className={roleIndex === i ? "active" : ""} onClick={() => setRoleIndex(i)}>
              <span className={`accent-${meta.tone}`}><Icon size={14} /></span>
              <b>{meta.name}</b>
              <small>{catalog.p0.length} P0</small>
            </button>
          );
        })}
      </nav>

      <section className="skill-section">
        <header className="section-head">
          <div><span>{roleMeta.name.toUpperCase()} · P0</span><h2>{roleMeta.name}优先建设</h2></div>
          <span className="section-count">{catalog.p0.length} 项</span>
        </header>
        <div className="skill-grid">
          {catalog.p0.map((s) => <SkillRow key={s.name} skill={s} onAdd={() => setAddSkill(s)} />)}
        </div>
        <div className="later-groups">
          {[
            { level: "P1", title: "跨角色任务闭环", items: catalog.p1 },
            { level: "P2", title: "预测与优化", items: catalog.p2 },
            { level: "P3", title: "AI Native 能力", items: catalog.p3 },
          ].map((g) => (
            <article key={g.level} className="later-group">
              <header><b>{g.level}</b><span>{g.title}</span></header>
              <div className="later-chips">
                {g.items.map((item) => (
                  <button key={item} onClick={() => setAddSkill({ name: item, reads: "P0 数据稳定后接入", outputs: "跨角色协作输出", toWhom: "相关角色", placement: "对应工作台", value: "分阶段演进" })}>
                    <WandSparkles size={12} />{item}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <AddSkillSheet skill={addSkill} onClose={() => setAddSkill(null)} />
    </div>
  );
}
