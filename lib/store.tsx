"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initialTasks, patients, type HospitalTask, type Role, type RoleId, type TaskStatus, roles } from "./hospital";
import { REPORT_KINDS, type ReportKind, type ReportPayload } from "./reports";
import type { CustomStats, Insight } from "./insights";

export type View = "overview" | "robots" | "skills" | "tasks" | "patients" | "network" | "insights" | "operations" | "roadmap";

export type AuditEntry = {
  id: string; time: string; actor: string; role: string;
  actionType: string; action: string; target: string; manual: boolean;
};

type Toast = { id: number; message: string; tone: "success" | "info" | "warn" };

type WorkbenchState = {
  view: View;
  setView: (v: View) => void;
  role: Role;
  setRole: (id: RoleId) => void;
  tasks: HospitalTask[];
  acceptTask: (id: string) => void;
  completeTask: (id: string) => void;
  rejectTask: (id: string, reason: string) => void;
  transferTask: (id: string, dept: string) => void;
  submitReport: (kind: ReportKind, payload: ReportPayload) => Promise<boolean>;
  audit: AuditEntry[];
  syncAudit: () => void;
  /* 洞察卡与自定义记录统计（只统计「人工填报」，排除演示种子数据） */
  insights: Insight[];
  customStats: CustomStats | null;
  syncInsights: () => void;
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  demoPlaying: boolean;
  setDemoPlaying: (p: boolean) => void;
  demoStep: number;
  demoAdvance: () => void;
  demoReset: () => void;
  p042Attention: number;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
};

const WorkbenchContext = createContext<WorkbenchState | null>(null);

function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DEMO_TOTAL = 10;

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("overview");
  const [roleId, setRoleId] = useState<RoleId>("doctor");
  const [tasks, setTasks] = useState<HospitalTask[]>(initialTasks);
  const [demoMode, setDemoModeState] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoStep, setDemoStep] = useState(7);
  const [p042Attention, setP042Attention] = useState(72);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [customStats, setCustomStats] = useState<CustomStats | null>(null);
  const toastId = useRef(0);

  const role = useMemo(() => roles.find((r) => r.id === roleId) ?? roles[0], [roleId]);

  /* ---- 服务端持久化 ----
   * 挂载后从 /api/tasks 拉取持久化任务覆盖本地种子数据；
   * 四个操作先乐观更新本地，再 POST 服务端，失败时回拉并提示。 */
  const syncFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tasks: HospitalTask[] };
      if (Array.isArray(data.tasks) && data.tasks.length) setTasks(data.tasks);
    } catch {
      // 静态导出/离线时保持 Mock 数据，不影响演示
    }
  }, []);

  /* 洞察与自定义记录统计：数据来自 /api/insights，只统计人工填报记录 */
  const syncInsights = useCallback(() => {
    fetch("/api/insights", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { insights?: Insight[]; custom?: CustomStats } | null) => {
        if (data?.insights) setInsights(data.insights);
        if (data?.custom) setCustomStats(data.custom);
      })
      .catch(() => {
        // 离线或静态导出时保持空列表
      });
  }, []);

  useEffect(() => {
    syncFromServer();
    syncInsights();
  }, [syncFromServer, syncInsights]);

  /* ---- 实时洞察：60s 轮询服务端最新数据（页面不可见时暂停，回前台立即拉一次） ----
   * 飞书侧或其他窗口写入的数据，本页无需刷新即可自动呈现。 */
  useEffect(() => {
    const SYNC_INTERVAL = 60_000;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      syncFromServer();
      syncInsights();
    }, SYNC_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") { syncFromServer(); syncInsights(); }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncFromServer, syncInsights]);

  /* 审计日志（03 表）：运行与审计页挂载时拉取，任务操作/填报后刷新 */
  const syncAudit = useCallback(() => {
    fetch("/api/audit?limit=30", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entries?: AuditEntry[] } | null) => {
        if (data?.entries) setAudit(data.entries);
      })
      .catch(() => {
        // 静态导出/离线时保持空数组，视图回落种子数据
      });
  }, []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  const pushAction = useCallback(
    (id: string, body: { type: "accept" | "complete" | "reject" | "transfer"; reason?: string; dept?: string }) => {
      fetch(`/api/tasks/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, actor: role.name, roleId: role.id }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
        })
        .catch(() => {
          notify(`任务 ${id} 同步失败，已回滚到服务端状态`, "warn");
          syncFromServer();
        });
    },
    [role, notify, syncFromServer],
  );

  const patchTask = useCallback((id: string, status: TaskStatus, logEntry?: { actor: string; action: string }) => {
    setTasks((list) => list.map((t) => t.id === id ? {
      ...t, status,
      log: logEntry ? [...t.log, { time: nowLabel(), ...logEntry }] : t.log,
    } : t));
  }, []);

  const acceptTask = useCallback((id: string) => {
    patchTask(id, "已接受", { actor: role.name, action: "接受任务，进入处理队列" });
    pushAction(id, { type: "accept" });
    notify(`任务 ${id} 已接受`);
  }, [patchTask, pushAction, role, notify]);

  const completeTask = useCallback((id: string) => {
    patchTask(id, "已完成", { actor: role.name, action: "确认完成，任务进入审计闭环" });
    pushAction(id, { type: "complete" });
    notify(`任务 ${id} 已完成并写入审计`);
  }, [patchTask, pushAction, role, notify]);

  const rejectTask = useCallback((id: string, reason: string) => {
    patchTask(id, "已驳回", { actor: role.name, action: `驳回：${reason}` });
    pushAction(id, { type: "reject", reason });
    notify(`任务 ${id} 已驳回：${reason}`, "warn");
  }, [patchTask, pushAction, role, notify]);

  const transferTask = useCallback((id: string, dept: string) => {
    setTasks((list) => list.map((t) => t.id === id ? {
      ...t, status: "已转交", owner: dept,
      log: [...t.log, { time: nowLabel(), actor: role.name, action: `转交至 ${dept}` }],
    } : t));
    pushAction(id, { type: "transfer", dept });
    notify(`任务 ${id} 已转交至 ${dept}`, "info");
  }, [pushAction, role, notify]);

  /* ---- 统一填报中心：写业务表（04/05/06/09）+ 审计，命中规则时服务端联动生成任务 ---- */
  const submitReport = useCallback(async (kind: ReportKind, payload: ReportPayload): Promise<boolean> => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload, actor: role.name, roleId: role.id }),
      });
      const data = (await res.json()) as { recordId?: string; taskId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      notify(`${REPORT_KINDS[kind].label}已写入：${data.recordId}`);
      if (data.taskId) {
        notify(`已联动生成任务 ${data.taskId}，推送至医生端确认`, "info");
        syncFromServer();
      }
      syncInsights();
      return true;
    } catch (err) {
      notify(`填报失败：${err instanceof Error ? err.message : "网络错误"}`, "warn");
      return false;
    }
  }, [role, notify, syncFromServer, syncInsights]);

  /* ---- 演示模式（纯前端模拟：进度与状态变更仅存于内存，刷新后回落到服务端持久状态） ---- */
  const setDemoMode = useCallback((on: boolean) => {
    setDemoModeState(on);
    if (on) {
      setDemoPlaying(true);
      notify("演示运行态开启：自动播放 P-042 事件链", "info");
    } else {
      setDemoPlaying(false);
    }
  }, [notify]);

  const demoAdvance = useCallback(() => {
    setDemoStep((step) => {
      const next = Math.min(step + 1, DEMO_TOTAL);
      if (next === 8) {
        setTasks((list) => list.map((t) => ["T-2410", "T-2411", "T-2412"].includes(t.id)
          ? { ...t, status: "已接受" as TaskStatus, log: [...t.log, { time: nowLabel(), actor: "工作人员", action: "接受任务并开始处理" }] } : t));
      }
      if (next === 9) setP042Attention(58);
      if (next === 10) {
        setTasks((list) => list.map((t) => ["T-2410", "T-2411", "T-2412"].includes(t.id)
          ? { ...t, status: "已完成" as TaskStatus, log: [...t.log, { time: nowLabel(), actor: "任务闭环 Skill", action: "任务闭环并写入审计" }] } : t));
        setP042Attention(44);
        setDemoPlaying(false);
        notify("P-042 事件链演示完成：3项任务全部闭环", "success");
      }
      return next;
    });
  }, [notify]);

  const demoReset = useCallback(() => {
    setDemoStep(7);
    setTasks(initialTasks);
    setP042Attention(72);
    setDemoPlaying(demoMode);
    notify("演示进度已重置", "info");
  }, [demoMode, notify]);

  useEffect(() => {
    if (!demoPlaying) return;
    const timer = setInterval(demoAdvance, 3600);
    return () => clearInterval(timer);
  }, [demoPlaying, demoAdvance]);

  const value: WorkbenchState = {
    view, setView, role, setRole: setRoleId,
    tasks, acceptTask, completeTask, rejectTask, transferTask, submitReport,
    audit, syncAudit,
    insights, customStats, syncInsights,
    demoMode, setDemoMode, demoPlaying, setDemoPlaying, demoStep, demoAdvance, demoReset,
    p042Attention, toasts, notify,
  };

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench() {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbench must be used inside WorkbenchProvider");
  return ctx;
}

export { patients };
