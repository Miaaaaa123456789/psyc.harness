"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bell, Bot, BrainCircuit, Building2, ChevronRight, ClipboardCheck, ClipboardPlus, Gauge, HeartPulse, Home,
  Layers3, MessageSquareText, Network, Play, Plus, RotateCcw, Route, Search, ShieldCheck, Sparkles,
  WandSparkles, Lightbulb, X, type LucideIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WorkbenchProvider, useWorkbench, patients, type View } from "@/lib/store";
import { demoChain, eventStream, hospitalWideSkills, roleSkills, robots } from "@/lib/hospital";
import { OverviewView } from "@/components/workbench/overview";
import { RobotsView } from "@/components/workbench/robots";
import { SkillsView } from "@/components/workbench/skills";
import { TasksView } from "@/components/workbench/tasks";
import { PatientsView } from "@/components/workbench/patients";
import { NetworkView } from "@/components/workbench/network";
import { OperationsView } from "@/components/workbench/operations";
import { RoadmapView } from "@/components/workbench/roadmap";
import { NativeVision } from "@/components/workbench/native-vision";
import { ReportCenter } from "@/components/workbench/report-center";
import type { ReportKind } from "@/lib/reports";
import { InsightsView } from "@/components/workbench/insights";
import { ProposalsView } from "@/components/workbench/proposals";
import { OutcomesView } from "@/components/workbench/outcomes";
import { FamilyView } from "@/components/workbench/family";
import { GovernanceView } from "@/components/workbench/governance";
import { PtView } from "@/components/workbench/pt";
import { AgentChat } from "@/components/workbench/agent-chat";
import { PORTALS, portalNav, portalOf, DECISION_PROPOSALS, OUTCOME_REVIEWS } from "@/lib/copilot";
import { Mascot, useClientGsap } from "@/components/workbench/primitives";

/* 非门户通用视图（更多菜单内） */
const EXTRA_VIEWS: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "robots", label: "机器人团队", icon: Bot },
  { view: "skills", label: "Skill库", icon: WandSparkles },
  { view: "network", label: "部门协同", icon: Network },
  { view: "operations", label: "运行与审计", icon: Gauge },
  { view: "roadmap", label: "实施进度", icon: Route },
];

const viewLabels: Record<View, string> = {
  overview: "今日总览", robots: "机器人团队", skills: "Skill库", tasks: "任务中心",
  patients: "患者管理", network: "部门协同", insights: "洞察与统计", operations: "运行与审计", roadmap: "实施进度",
  proposals: "待确认方案", outcomes: "随访任务", family: "我的治疗与家庭支持", governance: "治理中枢",
  pt: "物理治疗执行",
};

function Toasts() {
  const { toasts } = useWorkbench();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast tone-${t.tone}`}>{t.message}</div>)}
    </div>
  );
}

function DemoPlayer() {
  const { demoMode, demoPlaying, setDemoPlaying, demoStep, demoAdvance, demoReset, setDemoMode } = useWorkbench();
  if (!demoMode) return null;
  const step = demoChain[Math.min(demoStep, demoChain.length - 1)];
  return (
    <section className="demo-player panel" aria-label="演示运行态">
      <header>
        <span className="demo-live"><i />演示运行态</span>
        <button className="demo-close" onClick={() => setDemoMode(false)} aria-label="关闭演示模式"><X size={13} /></button>
      </header>
      <p><b>{demoStep >= demoChain.length ? "演示已完成" : `第 ${demoStep + 1} 步 · ${step.time}`}</b>{demoStep >= demoChain.length ? "P-042 事件链已全部闭环" : step.title}</p>
      <small>{demoStep >= demoChain.length ? "可重置后再次播放" : step.detail}</small>
      <div className="demo-progress">
        {demoChain.map((s, i) => <i key={s.index} className={i < demoStep ? "done" : i === demoStep ? "current" : ""} />)}
      </div>
      <footer>
        <button onClick={() => setDemoPlaying(!demoPlaying)}>{demoPlaying ? <><Play size={12} className="rot" />暂停</> : <><Play size={12} />播放</>}</button>
        <button onClick={demoAdvance}>下一步</button>
        <button onClick={demoReset}><RotateCcw size={12} />重置</button>
      </footer>
    </section>
  );
}

function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setView, notify } = useWorkbench();
  const [q, setQ] = useState("");
  const query = q.trim();
  const robotHits = query ? robots.filter((r) => r.name.includes(query) || r.dept.includes(query)) : [];
  const skillHits = query ? [...hospitalWideSkills, ...roleSkills.flatMap((c) => c.p0)].filter((s) => s.name.includes(query)).slice(0, 5) : [];
  const patientHits = query ? patients.filter((p) => p.id.includes(query.toUpperCase())) : [];
  const eventHits = query ? eventStream.filter((e) => e.event.includes(query)).slice(0, 4) : [];
  const total = robotHits.length + skillHits.length + patientHits.length + eventHits.length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && (setQ(""), onClose())}>
      <SheetContent side="top" className="mobile-sheet search-sheet">
        <SheetHeader>
          <SheetDescription>GLOBAL SEARCH</SheetDescription>
          <SheetTitle>全局搜索</SheetTitle>
        </SheetHeader>
        <div className="search-body">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索机器人、Skill、任务、患者（如 P-042）…" />
          {query && total === 0 && <p className="search-empty">没有找到「{query}」相关内容</p>}
          {robotHits.length > 0 && (
            <div><span>机器人</span>{robotHits.map((r) => (
              <button key={r.id} onClick={() => { setView("robots"); onClose(); setQ(""); }}><Bot size={14} /><b>{r.name}</b><small>{r.dept}</small></button>
            ))}</div>
          )}
          {skillHits.length > 0 && (
            <div><span>Skill</span>{skillHits.map((s) => (
              <button key={s.name} onClick={() => { setView("skills"); onClose(); setQ(""); }}><WandSparkles size={14} /><b>{s.name}</b><small>{s.placement}</small></button>
            ))}</div>
          )}
          {patientHits.length > 0 && (
            <div><span>患者</span>{patientHits.map((p) => (
              <button key={p.id} onClick={() => { setView("patients"); onClose(); setQ(""); }}><HeartPulse size={14} /><b>{p.id}</b><small>{p.stage} · {p.state}</small></button>
            ))}</div>
          )}
          {eventHits.length > 0 && (
            <div><span>事件</span>{eventHits.map((e, i) => (
              <button key={i} onClick={() => { setView("overview"); onClose(); setQ(""); }}><MessageSquareText size={14} /><b>{e.event}</b><small>{e.time} · {e.source}</small></button>
            ))}</div>
          )}
          {!query && <p className="search-hint">试试搜索「P-042」「晚星」「服药核对」</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="work-sheet">
        <ScrollArea className="sheet-scroll">
          <SheetHeader>
            <div className="sheet-avatar accent-amber"><Bell /></div>
            <SheetDescription>NOTIFICATIONS</SheetDescription>
            <SheetTitle>消息通知</SheetTitle>
            <p>最近24小时的跨系统变化与任务提醒。</p>
          </SheetHeader>
          <div className="sheet-content">
            <section>
              <span>今日通知</span>
              <ol className="notice-list">
                {eventStream.slice(4).map((e, i) => (
                  <li key={i}><i className={`ef-dot tone-${e.tone}`} /><div><b>{e.event}</b><small>{e.time} · {e.patient ?? e.source} · {e.source}</small></div></li>
                ))}
                <li><i className="ef-dot tone-blue" /><div><b>P-042 三项任务等待人工确认</b><small>任务中心 · 点击处理</small></div></li>
              </ol>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function RolePickerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, setRole } = useWorkbench();
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="mobile-sheet role-picker-sheet">
        <SheetHeader>
          <SheetDescription>ROLE PORTALS</SheetDescription>
          <SheetTitle>切换角色端</SheetTitle>
          <p>演示环境可自由切换；正式环境根据登录账号、岗位、患者关系与数据权限自动进入对应端口。</p>
        </SheetHeader>
        <div className="role-picker-grid">
          {PORTALS.map((p) => {
            const Icon = p.nav[0]?.icon ?? Home;
            const active = p.roleIds.includes(role.id);
            return (
              <button key={p.id} className={active ? "active" : ""} onClick={() => { setRole(p.defaultRole); onClose(); }}>
                <span className={active ? "accent-blue" : "accent-violet"}><Icon size={16} /></span>
                <div><b>{p.entry}</b><small>{p.note}</small></div>
                {active && <em>当前</em>}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileMenuSheet({ open, onClose, onOpenRole }: { open: boolean; onClose: () => void; onOpenRole: () => void }) {
  const { view, setView, role } = useWorkbench();
  const portal = portalOf(role.id);
  const navItems = [...portalNav(portal), ...EXTRA_VIEWS.filter((v) => !portalNav(portal).some((n) => n.view === v.view))];
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="mobile-sheet mobile-menu-sheet">
        <SheetHeader>
          <SheetDescription>{portal.entry.toUpperCase()}</SheetDescription>
          <SheetTitle>更多功能</SheetTitle>
        </SheetHeader>
        <div className="mobile-menu-grid">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => { setView(item.view); onClose(); }}>
                <span><Icon size={17} /></span><b>{item.label}</b>
              </button>
            );
          })}
          <button onClick={() => { onClose(); onOpenRole(); }}>
            <span><Layers3 size={17} /></span><b>切换角色端</b>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WorkbenchShell() {
  const { view, setView, role, tasks, demoMode, setDemoMode } = useWorkbench();
  const [nativeOpen, setNativeOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<ReportKind | null>(null);
  const [reportPatient, setReportPatient] = useState<string | undefined>(undefined);
  /** 打开填报中心：kind 为 null 时由用户自选表单；patientId 用于从随访/治疗名单带出患者 */
  const openReport = (kind: ReportKind | null, patientId?: string) => {
    setReportKind(kind);
    setReportPatient(patientId);
    setReportOpen(true);
  };
  const workspaceRef = useRef<HTMLDivElement>(null);

  const waiting = tasks.filter((t) => t.status === "等待人工确认").length;
  const waitingProposals = DECISION_PROPOSALS.filter((p) => p.status === "等待医生确认").length;
  const dueOutcomes = OUTCOME_REVIEWS.filter((o) => o.status === "待验证").length;
  const RoleIcon = role.icon;

  /* 当前门户导航：六端角色门户（患者+家属合并 / 运营+院领导合并） */
  const portal = portalOf(role.id);
  const portalItems = portalNav(portal);
  const navItems = useMemo(
    () => [...portalItems, ...EXTRA_VIEWS.filter((v) => !portalItems.some((n) => n.view === v.view))],
    [portalItems],
  );

  const go = (v: View) => { setView(v); };

  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(workspaceRef.current?.children ?? [], { autoAlpha: 0, y: 14, duration: .4, stagger: .05, ease: "power2.out" });
  }, { scope: workspaceRef, dependencies: [view] });

  const mobileNav = portalItems.slice(0, 4);
  const isFamily = portal.id === "familyPortal";

  return (
    <main className="work-app">
      <aside className="sidebar">
        <div className="brand">
          <span><BrainCircuit size={18} /></span>
          <div><b>SUPMED</b><small>AI医院运行工作台</small></div>
        </div>
        <div className="hospital-switch">
          <Building2 size={16} />
          <span><b>精神专科医院</b><small>{portal.entry}</small></span>
        </div>
        <nav className="desktop-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => go(item.view)}>
                <Icon size={17} /><span>{item.label}</span>
                {item.view === "tasks" && waiting > 0 && <em className="nav-badge">{waiting}</em>}
                {item.view === "proposals" && waitingProposals > 0 && <em className="nav-badge">{waitingProposals}</em>}
                {item.view === "outcomes" && dueOutcomes > 0 && <em className="nav-badge nav-badge-soft">{dueOutcomes}</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-health">
            <span><i className="dot-online" />系统运行正常</span>
            <small>6项数据源已连接 · 只读</small>
          </div>
          <button className="native-entry-side" onClick={() => setNativeOpen(true)}>
            <Sparkles size={16} /><span>AI Native 视界</span><ChevronRight size={13} />
          </button>
        </div>
      </aside>

      <section className="app-main">
        <header className="topbar">
          <div className="breadcrumb"><span>AI医院工作台</span><ChevronRight size={12} /><b>{viewLabels[view]}</b></div>
          <div className="topbar-actions">
            <button className={`demo-toggle ${demoMode ? "on" : ""}`} role="switch" aria-checked={demoMode} onClick={() => setDemoMode(!demoMode)}>
              <i /><span>演示运行态</span>
            </button>
            <button className="report-entry" onClick={() => setReportOpen(true)}>
              <ClipboardPlus size={13} /><span>{["nurse", "therapist"].includes(role.id) ? "异常上报" : "填报"}</span>
            </button>
            {!isFamily && (
              <button className="search-button" onClick={() => setSearchOpen(true)}>
                <Search size={14} /><span>搜索机器人、Skill、任务</span><kbd>⌘K</kbd>
              </button>
            )}
            <button className="icon-button" aria-label="消息通知" onClick={() => setNoticeOpen(true)}>
              <Bell size={15} />{(waiting + waitingProposals) > 0 && <i className="notice-dot" />}
            </button>
            <button className="native-entry" onClick={() => setNativeOpen(true)}>
              <Sparkles size={13} /><span>AI Native 视界</span>
            </button>
            <button className="role-switch" onClick={() => setRolePickerOpen(true)}>
              <span className={`role-chip-icon accent-${role.tone}`}><RoleIcon size={14} /></span>
              <span className="role-chip-name">{portal.entry}</span>
              <ChevronRight size={12} />
            </button>
            <span className="top-avatar" aria-label="个人头像">Y</span>
          </div>
        </header>

        <div className="floating-island" aria-hidden="true">
          <img src="/visuals/ui-floating-island.png" alt="" loading="lazy" />
        </div>

        <div className="workspace-scroll">
          <div ref={workspaceRef} className="workspace">
            {view === "overview" && (
              <OverviewView onReport={(kind) => openReport(kind)} />
            )}
            {view === "robots" && <RobotsView />}
            {view === "skills" && <SkillsView />}
            {view === "tasks" && <TasksView />}
            {view === "patients" && <PatientsView />}
            {view === "network" && <NetworkView />}
            {view === "insights" && <InsightsView onReport={() => openReport(null)} />}
            {view === "operations" && <OperationsView />}
            {view === "roadmap" && <RoadmapView onOpenNative={() => setNativeOpen(true)} />}
            {view === "proposals" && <ProposalsView />}
            {view === "outcomes" && <OutcomesView onReport={openReport} />}
            {view === "pt" && <PtView onReport={openReport} />}
            {view === "family" && <FamilyView />}
            {view === "governance" && <GovernanceView />}
          </div>
        </div>

        <nav className="mobile-nav" aria-label="手机端主导航">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => go(item.view)}>
                <Icon size={19} /><span>{item.label.replace("管理", "").replace("团队", "").replace("中心", "").slice(0, 4)}</span>
                {item.view === "tasks" && waiting > 0 && <i className="nav-badge">{waiting}</i>}
                {item.view === "proposals" && waitingProposals > 0 && <i className="nav-badge">{waitingProposals}</i>}
              </button>
            );
          })}
          <button className="mobile-more" onClick={() => setMobileMenuOpen(true)}>
            <Layers3 size={19} /><span>更多</span>
          </button>
        </nav>
      </section>

      <DemoPlayer />
      <Toasts />
      <AgentChat />

      {!isFamily && (
        <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
      <NotificationSheet open={noticeOpen} onClose={() => setNoticeOpen(false)} />
      <ReportCenter open={reportOpen} onClose={() => setReportOpen(false)} initialKind={reportKind} initialPatient={reportPatient} />
      <RolePickerSheet open={rolePickerOpen} onClose={() => setRolePickerOpen(false)} />
      <MobileMenuSheet open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onOpenRole={() => setRolePickerOpen(true)} />
      {nativeOpen && <NativeVision onClose={() => setNativeOpen(false)} />}
    </main>
  );
}

export default function HomePage() {
  return (
    <WorkbenchProvider>
      <WorkbenchShell />
    </WorkbenchProvider>
  );
}
