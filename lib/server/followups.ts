import { listRecords, TABLES } from "./bitable";
import { FU_STATE_WEIGHT, type FollowupSummary, type FollowupState, type FollowupTask } from "../followups";

/**
 * 随访任务层 —— 输入 15_出院随访记录（+ 01_患者主档），输出「需要随访的患者名单」。
 *
 * 设计原则：
 * - 随访任务页首屏必须是「谁要随访」，而不是时间窗指标；指标只是辅助。
 * - 一患者多条随访记录时，只取最近一次（按随访日期），以其「下次随访时间」排期。
 * - 未排期、逾期、联系未取得（未接通等）的患者优先，风险等级高者优先。
 * - 台账里没有随访记录的「已出院」患者，按「待首次随访」列出，不静默漏掉。
 */

type Row = Record<string, unknown>;
const txt = (r: Row, k: string) => String(r[k] ?? "").trim();

/** 未取得联系的联系结果（信息不可得，不等于患者恶化） */
const UNREACHED = ["未接通", "无人接听", "号码错误", "拒绝接听"];

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    // 飞书日期字段可能返回毫秒时间戳
    const d = new Date(v > 1e12 ? v : v * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayDiff = (d: Date, today: Date) =>
  Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);

const RISK_WEIGHT: Record<string, number> = { 高: 0, 待评估: 1, 中: 2, 低: 3 };

export async function computeFollowupTasks(): Promise<{ tasks: FollowupTask[]; summary: FollowupSummary; source: string }> {
  const [fuRows, ptRows] = await Promise.all([
    listRecords(TABLES.followup),
    listRecords(TABLES.patient),
  ]);

  /* 01 患者主档：姓名代号 → 患者编号 / 阶段 / 风险（用于补全随访名单） */
  const roster = new Map<string, { patientId: string; stage: string; risk: string }>();
  const discharged: { patientId: string; name: string; stage: string; risk: string }[] = [];
  for (const r of ptRows) {
    const f = r.fields as Row;
    const pid = txt(f, "患者编号");
    const name = txt(f, "姓名代号");
    const stage = txt(f, "当前阶段");
    const risk = txt(f, "风险等级");
    if (name) roster.set(name, { patientId: pid, stage, risk });
    if (pid && /出院|随访/.test(stage)) discharged.push({ patientId: pid, name, stage, risk });
  }

  const today = new Date();
  const byKey = new Map<string, FollowupTask>();

  for (const r of fuRows) {
    const f = r.fields as Row;
    const admissionNo = txt(f, "住院号");
    const name = txt(f, "姓名");
    const patientId = txt(f, "患者编号");
    const key = patientId || admissionNo || name || r.record_id;
    if (!key) continue;

    const last = parseDate(f["随访日期"]);
    const next = parseDate(f["下次随访时间"]);
    const link = roster.get(name);
    const contact = txt(f, "联系结果");
    const isUnreached = UNREACHED.includes(contact);

    const base: Omit<FollowupTask, "state" | "days" | "nextAt"> = {
      key,
      admissionNo,
      name,
      patientId: patientId || link?.patientId || "",
      stage: link?.stage ?? "",
      risk: txt(f, "风险等级") || link?.risk || "",
      lastAt: last ? ymd(last) : "",
      lastContact: contact,
      lastIssue: txt(f, "存在问题"),
      lastAction: txt(f, "处理措施"),
      method: txt(f, "随访方式"),
      owner: txt(f, "上报人") || txt(f, "护士姓名"),
      unreached: isUnreached,
      source: txt(f, "数据来源"),
    };

    const prev = byKey.get(key);
    /* 同一患者保留最近一次随访记录作为排期依据 */
    if (prev && prev.lastAt && base.lastAt && prev.lastAt > base.lastAt) continue;

    let state: FollowupState = "never";
    let days: number | null = null;
    let nextAt = "";
    if (next) {
      days = dayDiff(next, today);
      nextAt = ymd(next);
      state = days < 0 ? "overdue" : days === 0 ? "today" : days <= 7 ? "soon" : "scheduled";
    }
    byKey.set(key, { ...base, state, days, nextAt });
  }

  /* 已出院但从未纳入随访台账的患者：待首次随访 */
  const seen = new Set<string>();
  for (const t of byKey.values()) {
    if (t.patientId) seen.add(t.patientId);
    if (t.name) seen.add(t.name);
  }
  for (const d of discharged) {
    if (seen.has(d.patientId) || (d.name && seen.has(d.name))) continue;
    byKey.set(`PID-${d.patientId}`, {
      key: `PID-${d.patientId}`,
      admissionNo: "",
      name: d.name,
      patientId: d.patientId,
      stage: d.stage,
      risk: d.risk,
      lastAt: "",
      lastContact: "",
      lastIssue: "",
      lastAction: "",
      nextAt: "",
      days: null,
      state: "never",
      method: "",
      owner: "",
      unreached: false,
      source: "",
    });
  }

  const tasks = [...byKey.values()].sort((a, b) => {
    const s = FU_STATE_WEIGHT[a.state] - FU_STATE_WEIGHT[b.state];
    if (s !== 0) return s;
    const r = (RISK_WEIGHT[a.risk] ?? 9) - (RISK_WEIGHT[b.risk] ?? 9);
    if (r !== 0) return r;
    return (a.days ?? 999) - (b.days ?? 999);
  });

  const summary: FollowupSummary = {
    total: tasks.length,
    overdue: tasks.filter((t) => t.state === "overdue").length,
    today: tasks.filter((t) => t.state === "today").length,
    never: tasks.filter((t) => t.state === "never").length,
    soon: tasks.filter((t) => t.state === "soon").length,
    highRisk: tasks.filter((t) => t.risk === "高").length,
    unreached: tasks.filter((t) => t.unreached).length,
  };

  return { tasks, summary, source: "bitable" };
}
