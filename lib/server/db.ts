import { initialTasks, type HospitalTask, type TaskStatus } from "../hospital";
import { COMM_ALERT_FEEDBACKS, FOLLOWUP_ALERT_RISK, MED_ALERT_RESULTS, PT_ABNORMAL_STATUS, PT_CLINICAL_REASONS, REPORT_KINDS, type ReportKind, type ReportPayload } from "../reports";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import {
  bitableEnabled,
  bitableListTasks,
  bitableApplyAction,
  bitableCreateReport,
  bitableListAudit,
  transport as bitableTransport,
} from "./bitable";

/**
 * 服务端持久层：双驱动。
 *
 * 1. bitable —— 配置 FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_BASE_TOKEN 后自动启用，
 *    任务与审计日志落在飞书多维表格：多人协同、字段级留痕、手机端表单填报。
 * 2. file    —— 默认驱动，JSON 文件存储（data/db.json），单机演示与本地开发够用。
 *
 * 生产替换为 Drizzle + PostgreSQL 时保持本文件导出的函数签名不变即可。
 * 视图消费的静态演示数据（患者/机器人/部门/Skill）仍从 lib/hospital 读取，不走 API。
 */

export type StoredReport = {
  kind: ReportKind;
  recordId: string;
  payload: ReportPayload;
  actor: string;
  createdAt: string;
};

export type DB = {
  tasks: HospitalTask[];
  reports: StoredReport[];
  seededAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const cache: { db: DB | null } = { db: null };

function seedDB(): DB {
  return {
    tasks: structuredClone(initialTasks),
    reports: [],
    seededAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function readDB(): DB {
  if (cache.db) return cache.db;
  try {
    if (existsSync(DB_FILE)) {
      const parsed = JSON.parse(readFileSync(DB_FILE, "utf-8")) as DB;
      if (!Array.isArray(parsed.reports)) parsed.reports = [];
      cache.db = parsed;
      return cache.db;
    }
  } catch {
    // 文件损坏时重新播种
  }
  cache.db = seedDB();
  writeDB();
  return cache.db;
}

function writeDB() {
  if (!cache.db) return;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  cache.db.updatedAt = new Date().toISOString();
  writeFileSync(DB_FILE, JSON.stringify(cache.db, null, 2), "utf-8");
}

function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type TaskAction =
  | { type: "accept"; actor: string }
  | { type: "complete"; actor: string }
  | { type: "reject"; actor: string; reason: string }
  | { type: "transfer"; actor: string; dept: string };

const NEXT_STATUS: Record<TaskAction["type"], TaskStatus> = {
  accept: "已接受",
  complete: "已完成",
  reject: "已驳回",
  transfer: "已转交",
};

function actionText(a: TaskAction): string {
  switch (a.type) {
    case "accept": return "接受任务，进入处理队列";
    case "complete": return "确认完成，任务进入审计闭环";
    case "reject": return `驳回：${a.reason}`;
    case "transfer": return `转交至 ${a.dept}`;
  }
}

/** 当前生效的存储驱动，便于排障与运维确认 */
export function driver(): "bitable:cli" | "bitable:api" | "file" {
  const t = bitableTransport();
  if (t === "cli") return "bitable:cli";
  if (t === "api") return "bitable:api";
  return "file";
}

export async function applyTaskAction(
  id: string,
  action: TaskAction,
  roleId?: string | null,
): Promise<HospitalTask | null> {
  const nextStatus = NEXT_STATUS[action.type];
  const text = actionText(action);

  if (bitableEnabled()) {
    const tasks = await bitableListTasks();
    const current = tasks.find((t) => t.id === id) as
      | (HospitalTask & { _recordId?: string })
      | undefined;
    if (!current?._recordId) return null;

    await bitableApplyAction(
      current._recordId,
      action,
      id,
      nextStatus,
      text,
      roleId ?? current.ownerRole,
    );

    const refreshed = await bitableListTasks();
    return refreshed.find((t) => t.id === id) ?? null;
  }

  const db = readDB();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const task = db.tasks[idx];
  const updated: HospitalTask = {
    ...task,
    status: nextStatus,
    owner: action.type === "transfer" ? action.dept : task.owner,
    log: [...task.log, { time: nowLabel(), actor: action.actor, action: text }],
  };
  db.tasks[idx] = updated;
  writeDB();
  return updated;
}

export async function listTasks(): Promise<HospitalTask[]> {
  if (bitableEnabled()) {
    try {
      return await bitableListTasks();
    } catch (err) {
      console.error("[db] 飞书多维表格读取失败，回落本地文件：", err);
    }
  }
  return readDB().tasks;
}

export type ReportResult = { recordId: string; taskId?: string };

/**
 * 统一填报中心的服务端入口：双驱动。
 * bitable：写 04/05/06/09 对应业务表 + 审计，命中规则时联动生成任务；
 * file：存 db.json reports 集合并按同一规则在 tasks 里追加联动任务。
 */
export async function createReport(
  kind: ReportKind,
  payload: ReportPayload,
  actor: string,
  roleId?: string | null,
): Promise<ReportResult> {
  if (bitableEnabled()) {
    return bitableCreateReport(kind, payload, actor, roleId);
  }

  const db = readDB();
  const recordId = `${REPORT_KINDS[kind].idPrefix}-${Date.now()}`;
  db.reports.push({ kind, recordId, payload, actor, createdAt: new Date().toISOString() });

  let taskId: string | undefined;
  const s = (k: string) => String(payload[k] ?? "").trim();
  const needTask =
    (kind === "safety" && s("严重等级") === "高") ||
    (kind === "medication" && MED_ALERT_RESULTS.includes(s("执行结果"))) ||
    (kind === "pt" && PT_ABNORMAL_STATUS.includes(s("执行状态")) && PT_CLINICAL_REASONS.includes(s("未完成原因"))) ||
    (kind === "communication" && COMM_ALERT_FEEDBACKS.includes(s("对象反馈"))) ||
    (kind === "followup" && s("风险等级") === FOLLOWUP_ALERT_RISK);
  if (needTask) {
    taskId = `T-${Date.now()}`;
    const title =
      kind === "safety"
        ? `【安全】${s("事件类型")}待处置 · ${s("患者编号")}`
        : kind === "medication"
          ? `【给药】${s("药品名称")}${s("执行结果")}待复核 · ${s("患者编号")}`
          : kind === "pt"
            ? `【物理治疗】${s("治疗项目")}${s("执行状态")}待复核 · ${s("患者编号")}`
            : kind === "followup"
              ? `【随访】${s("姓名") || s("患者编号")}风险等级高待处置`
              : `【沟通】${s("沟通对象")}${s("对象反馈")}待跟进 · ${s("患者编号")}`;
    db.tasks.unshift({
      id: taskId,
      patient: s("患者编号"),
      title,
      source: REPORT_KINDS[kind].label,
      triggerTime: nowLabel(),
      evidence: `来源 ${recordId}`,
      risk: kind === "safety" ? "高" : "中",
      owner: "医疗部",
      ownerRole: "doctor",
      deadline: "今日 22:00 前",
      status: "等待人工确认",
      log: [{ time: nowLabel(), actor: "系统", action: `由${REPORT_KINDS[kind].label} ${recordId} 联动生成` }],
    });
  }
  writeDB();
  return { recordId, taskId };
}

export type AuditEntry = {
  id: string; time: string; actor: string; role: string;
  actionType: string; action: string; target: string; manual: boolean;
};

/** 审计日志：bitable 读 03 表；file 驱动从任务操作记录与填报集合推导 */
export async function listAudit(limit = 30): Promise<AuditEntry[]> {
  if (bitableEnabled()) {
    try {
      return await bitableListAudit(limit);
    } catch (err) {
      console.error("[db] 飞书审计表读取失败，回落本地推导：", err);
    }
  }
  const db = readDB();
  const fromTasks: AuditEntry[] = db.tasks.flatMap((t) =>
    t.log.map((l, i) => ({
      id: `${t.id}-${i}`,
      time: l.time,
      actor: l.actor,
      role: "",
      actionType: "",
      action: l.action,
      target: t.id,
      manual: true,
    })),
  );
  const fromReports: AuditEntry[] = db.reports.map((r) => ({
    id: r.recordId,
    time: r.createdAt.slice(11, 16),
    actor: r.actor,
    role: "",
    actionType: "人工填报",
    action: `填报${REPORT_KINDS[r.kind].label}：${r.recordId}`,
    target: r.recordId,
    manual: true,
  }));
  return [...fromReports, ...fromTasks].slice(0, limit);
}
