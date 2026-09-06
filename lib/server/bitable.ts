import { execFile } from "child_process";
import { promisify } from "util";
import type { HospitalTask, TaskStatus } from "../hospital";
import { COMM_ALERT_FEEDBACKS, FOLLOWUP_ALERT_RISK, MED_ALERT_RESULTS, PT_ABNORMAL_STATUS, PT_CLINICAL_REASONS, REPORTERS, REPORT_KINDS, ROLE_REPORTER, type ReportKind, type ReportPayload } from "../reports";
import type { RoleId } from "../hospital";

/**
 * 飞书多维表格（Bitable）适配器 —— 工作台与飞书生态的双向数据通道。
 *
 * 两种传输方式，共用同一套表结构与字段映射：
 *
 * 1. api（生产推荐）
 *    配置 FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_BASE_TOKEN 后自动启用。
 *    服务端直连飞书 Open API，可部署到任意云环境。
 *
 * 2. cli（本机零配置）
 *    配置 LARK_CLI=1 后启用，复用 WorkBuddy 已授权的 lark-cli，
 *    无需 App Secret 即可在本地跑通全链路，适合演示与开发。
 *    注意：仅本机可用，云端部署请改用 api 方式。
 *
 * 两者都未配置时，db.ts 自动回落到 JSON 文件驱动，前端零改动。
 */

const execFileAsync = promisify(execFile);
const OPEN = "https://open.feishu.cn/open-apis";
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN ?? "";
const LARK_CLI_BIN = process.env.LARK_CLI_BIN ?? "lark-cli";

/** 数据表 ID：可用环境变量覆盖，默认指向已建好的统一数据底座 */
export const TABLES = {
  patient: process.env.FEISHU_TABLE_PATIENT ?? "tbl24DY8arF2Fdjj",
  task: process.env.FEISHU_TABLE_TASK ?? "tblzE6IPVzKZlQzt",
  audit: process.env.FEISHU_TABLE_AUDIT ?? "tblGAqFQzUWlKIKa",
  safety: process.env.FEISHU_TABLE_SAFETY ?? "tblzSJTuex52Lz5c",
  medication: process.env.FEISHU_TABLE_MEDICATION ?? "tblaWDuc1igrlrDy",
  therapy: process.env.FEISHU_TABLE_THERAPY ?? "tblkrTh5IjkAv5lG",
  selfReport: process.env.FEISHU_TABLE_SELFREPORT ?? "tbl1ZhhL3BGbfZDC",
  family: process.env.FEISHU_TABLE_FAMILY ?? "tbltl2CQS7iSMA2t",
  butler: process.env.FEISHU_TABLE_BUTLER ?? "tblsVZQ8ad1cAumS",
  ops: process.env.FEISHU_TABLE_OPS ?? "tbln2PS3GeNrohEG",
  leader: process.env.FEISHU_TABLE_LEADER ?? "tbl39deInH0W6NOc",
  robot: process.env.FEISHU_TABLE_ROBOT ?? "tblGWFHPp7amFAKy",
  pt: process.env.FEISHU_TABLE_PT ?? "tblY7D16ObUX1uMx",
  communication: process.env.FEISHU_TABLE_COMM ?? "tbl6gqWx64vQZSVO",
  followup: process.env.FEISHU_TABLE_FOLLOWUP ?? "tbltGo2RStnzrJIT",
  custom: process.env.FEISHU_TABLE_CUSTOM ?? "tbldNWrVNwqD6auZ",
};

/** 数据来源标记：系统演示种子 vs 人工填报。统计与洞察只看「人工填报」 */
export const SOURCE_MANUAL = "人工填报";

const ROLE_REV: Record<string, HospitalTask["ownerRole"]> = {
  医生端: "doctor", 护士端: "nurse", 治疗师端: "therapist", 患者端: "patient",
  家属端: "family", 管家端: "butler", 运营端: "ops", 院领导端: "leader",
};
const ROLE_CN: Record<string, string> = {
  doctor: "医生端", nurse: "护士端", therapist: "治疗师端", patient: "患者端",
  family: "家属端", butler: "管家端", ops: "运营端", leader: "院领导端",
};

export type Transport = "api" | "cli" | null;

export function transport(): Transport {
  if (process.env.LARK_CLI === "1") return "cli";
  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET && BASE_TOKEN) return "api";
  return null;
}

export function bitableEnabled(): boolean {
  return transport() !== null;
}

function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ==================== api 传输 ==================== */
let tokenCache: { token: string; expireAt: number } | null = null;

async function tenantToken(): Promise<string> {
  if (tokenCache && tokenCache.expireAt > Date.now() + 60_000) return tokenCache.token;
  const res = await fetch(`${OPEN}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const json = (await res.json()) as { tenant_access_token?: string; expire?: number; msg?: string };
  if (!json.tenant_access_token) throw new Error(`飞书鉴权失败: ${json.msg ?? res.status}`);
  tokenCache = {
    token: json.tenant_access_token,
    expireAt: Date.now() + (json.expire ?? 7200) * 1000,
  };
  return tokenCache.token;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await tenantToken();
  const res = await fetch(`${OPEN}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json()) as { code?: number; msg?: string; data?: T };
  if (json.code !== 0) throw new Error(`飞书接口错误 ${json.code}: ${json.msg}`);
  return json.data as T;
}

/* ==================== cli 传输 ==================== */
async function cli<T>(args: string[]): Promise<T> {
  const { stdout } = await execFileAsync(LARK_CLI_BIN, args, {
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: `${process.env.PATH ?? ""}:/Users/opp/.workbuddy/binaries/node/cli-connector-packages/bin:/Users/opp/.workbuddy/binaries/node/versions/22.22.2-2/bin`,
    },
  });
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  const payload = start >= 0 && end > start ? stdout.slice(start, end + 1) : stdout;
  const json = JSON.parse(payload) as { ok?: boolean; data?: T; error?: { message?: string } };
  if (json.ok === false) throw new Error(`lark-cli 错误: ${json.error?.message ?? "unknown"}`);
  return json.data as T;
}

/* ==================== 统一记录接口 ==================== */
/** lark-cli +record-list 的表格化返回结构 */
type CliListPayload = {
  fields?: string[];
  data?: unknown[][];
  record_id_list?: string[];
  has_more?: boolean;
};

export type BitableRecord = { record_id: string; fields: Record<string, unknown> };

export async function listRecords(tableId: string): Promise<BitableRecord[]> {
  if (transport() === "cli") {
    // lark-cli 返回表格结构：data.data 为行数组，data.fields 为列名，需还原成 {record_id, fields}
    const out: BitableRecord[] = [];
    let offset = 0;
    for (;;) {
      const data = await cli<CliListPayload>([
        "base", "+record-list",
        "--base-token", BASE_TOKEN,
        "--table-id", tableId,
        "--page-size", "200",
        "--offset", String(offset),
        "--format", "json",
      ]);
      const names = data.fields ?? [];
      const rows = data.data ?? [];
      rows.forEach((row, i) => {
        const fields: Record<string, unknown> = {};
        names.forEach((name, j) => {
          const cell = row[j];
          // 单选/多选字段返回数组，单选只取首个值
          fields[name] = Array.isArray(cell) ? (cell.length <= 1 ? cell[0] ?? "" : cell) : cell;
        });
        out.push({ record_id: data.record_id_list?.[i] ?? "", fields });
      });
      if (rows.length < 200 || !data.has_more) break;
      offset += 200;
    }
    return out;
  }

  const out: BitableRecord[] = [];
  let pageToken: string | undefined;
  do {
    const qs = new URLSearchParams({ page_size: "500" });
    if (pageToken) qs.set("page_token", pageToken);
    const data = await api<{ items?: BitableRecord[]; page_token?: string; has_more?: boolean }>(
      `/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records?${qs}`,
    );
    out.push(...(data.items ?? []));
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken);
  return out;
}

export async function createRecord(tableId: string, fields: Record<string, unknown>) {
  if (transport() === "cli") {
    await cli([
      "base", "+record-batch-create",
      "--base-token", BASE_TOKEN,
      "--table-id", tableId,
      "--json", JSON.stringify({ create_records: [fields] }),
      "--format", "json",
    ]);
    return;
  }
  await api(`/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

export async function updateRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>,
) {
  if (transport() === "cli") {
    await cli([
      "base", "+record-batch-update",
      "--base-token", BASE_TOKEN,
      "--table-id", tableId,
      "--json", JSON.stringify({ update_records: { [recordId]: fields } }),
      "--format", "json",
    ]);
    return;
  }
  await api(
    `/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records/${recordId}`,
    { method: "PUT", body: JSON.stringify({ fields }) },
  );
}

/* ==================== 任务映射 ==================== */
/** 多维表格记录 → 工作台任务模型（审计日志按任务编号关联后内联） */
export async function bitableListTasks(): Promise<HospitalTask[]> {
  const [taskRecs, auditRecs] = await Promise.all([
    listRecords(TABLES.task),
    listRecords(TABLES.audit),
  ]);

  return taskRecs.map((r) => {
    const f = r.fields;
    const id = String(f["任务编号"] ?? "");
    const log = auditRecs
      .filter((a) => String(a.fields["任务编号"] ?? "") === id)
      .map((a) => ({
        time: String(a.fields["时间"] ?? ""),
        actor: String(a.fields["操作人"] ?? ""),
        action: String(a.fields["动作说明"] ?? ""),
      }));

    return {
      id,
      patient: String(f["关联患者"] ?? ""),
      title: String(f["标题"] ?? ""),
      source: String(f["触发来源"] ?? ""),
      triggerTime: String(f["触发时间"] ?? ""),
      evidence: String(f["数据依据"] ?? ""),
      risk: (f["风险等级"] as HospitalTask["risk"]) ?? "低",
      owner: String(f["责任部门"] ?? ""),
      ownerRole: ROLE_REV[String(f["责任端"] ?? "")] ?? null,
      deadline: String(f["截止时间"] ?? ""),
      status: (f["任务状态"] as TaskStatus) ?? "等待人工确认",
      log,
      _recordId: r.record_id,
    } as HospitalTask & { _recordId: string };
  });
}

const ACTION_CN: Record<string, string> = {
  accept: "接受", complete: "完成", reject: "驳回", transfer: "转交",
};

/** 03 审计表 → 工作台审计条目（新的在前） */
export type BitableAuditEntry = {
  id: string; time: string; actor: string; role: string;
  actionType: string; action: string; target: string; manual: boolean;
};

export async function bitableListAudit(limit = 30): Promise<BitableAuditEntry[]> {
  const recs = await listRecords(TABLES.audit);
  return recs
    .map((r) => ({
      id: String(r.fields["日志编号"] ?? ""),
      time: String(r.fields["时间"] ?? ""),
      actor: String(r.fields["操作人"] ?? ""),
      role: String(r.fields["操作角色端"] ?? ""),
      actionType: String(r.fields["动作类型"] ?? ""),
      action: String(r.fields["动作说明"] ?? ""),
      target: String(r.fields["任务编号"] ?? ""),
      manual: Boolean(r.fields["是否人工介入"]),
    }))
    .reverse()
    .slice(0, limit);
}

/** 写回任务状态 + 追加一条审计留痕记录 */
export async function bitableApplyAction(
  recordId: string,
  action: { type: "accept" | "complete" | "reject" | "transfer"; actor: string; reason?: string; dept?: string },
  taskId: string,
  nextStatus: TaskStatus,
  actionText: string,
  roleId?: string | null,
) {
  // 注意：飞书 select 类型单元格必须传数组，单选也只能包含一个元素
  const fields: Record<string, unknown> = {
    任务状态: [nextStatus],
    当前处理人: action.actor,
    更新时间: nowLabel(),
  };
  if (action.type === "transfer" && action.dept) fields["责任部门"] = [action.dept];
  if (action.type === "reject" && action.reason) fields["驳回原因"] = action.reason;

  await updateRecord(TABLES.task, recordId, fields);

  await createRecord(TABLES.audit, {
    日志编号: `L-${Date.now()}`,
    时间: nowLabel(),
    任务编号: taskId,
    操作人: action.actor,
    操作角色端: [ROLE_CN[roleId ?? "ops"] ?? "运营端"],
    动作类型: [ACTION_CN[action.type] ?? action.type],
    驳回原因: action.reason ?? "",
    转交至部门: action.dept ? [action.dept] : "",
    动作说明: actionText,
    是否人工介入: true,
  });
}

/* ==================== 业务填报（统一填报中心） ==================== */

export type ReportResult = { recordId: string; taskId?: string };

const REPORT_TABLE: Record<ReportKind, string> = {
  safety: TABLES.safety,
  medication: TABLES.medication,
  therapy: TABLES.therapy,
  butler: TABLES.butler,
  pt: TABLES.pt,
  communication: TABLES.communication,
  followup: TABLES.followup,
  custom: TABLES.custom,
};

/** 填报表单值 → 飞书表字段（select 传数组，datetime 传毫秒时间戳）。
 *  上报人：表单显式选择值优先；不在花名册内时回落当前登录角色默认责任人。 */
function buildReportFields(kind: ReportKind, p: ReportPayload, actor: string, roleId?: string | null): Record<string, unknown> {
  const id = `${REPORT_KINDS[kind].idPrefix}-${Date.now()}`;
  const s = (k: string) => String(p[k] ?? "").trim();
  const reporter = REPORTERS.includes(s("上报人"))
    ? s("上报人")
    : (roleId ? ROLE_REPORTER[roleId as RoleId] : undefined) ?? REPORTERS[0];
  const executor = REPORTERS.includes(s("执行人")) ? s("执行人") : reporter;
  switch (kind) {
    case "safety": {
      const severity = s("严重等级");
      return {
        事件编号: id,
        事件类型: [s("事件类型")],
        严重等级: [severity],
        患者编号: s("患者编号"),
        发生时间: s("发生时间") || nowLabel(),
        发现人: [reporter],
        发现端: [ROLE_CN[roleId ?? ""] ?? "运营端"],
        处置措施: s("处置措施"),
        闭环状态: ["待处置"],
        是否升级医生: severity === "高",
      };
    }
    case "medication": {
      const result = s("执行结果");
      return {
        记录编号: id,
        患者编号: s("患者编号"),
        药品名称: s("药品名称"),
        剂量: s("剂量"),
        应服时间: s("应服时间"),
        实服时间: result === "已服" ? nowLabel() : "",
        执行结果: [result],
        拒服原因: s("拒服原因"),
        确认护士: [reporter],
        是否需要复核: MED_ALERT_RESULTS.includes(result),
      };
    }
    case "therapy": {
      const day = s("治疗日期");
      const ts = day ? Date.parse(`${day}T00:00:00+08:00`) : Date.now();
      return {
        记录编号: id,
        患者编号: s("患者编号"),
        治疗类型: [s("治疗类型")],
        治疗日期: Number.isNaN(ts) ? Date.now() : ts,
        计划时长: s("计划时长"),
        完成状态: [s("完成状态")],
        效果评分: Number(p["效果评分"]) || 0,
        会谈靶点: s("会谈靶点"),
        干预要点: s("干预要点"),
        治疗师: [reporter],
        进入个案概念化: Boolean(p["进入个案概念化"]),
      };
    }
    case "butler":
      return {
        工单编号: id,
        服务类型: [s("服务类型")],
        患者编号: s("患者编号"),
        协调部门: s("协调部门") ? [s("协调部门")] : "",
        承诺完成时间: s("承诺完成时间"),
        备注: s("备注"),
        管家: [reporter],
        受理时间: nowLabel(),
        工单状态: ["待受理"],
      };
    case "pt": {
      const status = s("执行状态");
      const abnormal = PT_ABNORMAL_STATUS.includes(status);
      return {
        记录编号: id,
        患者编号: s("患者编号"),
        治疗项目: [s("治疗项目")],
        计划时间: s("计划时间"),
        执行状态: [status],
        未完成原因: abnormal && s("未完成原因") ? [s("未完成原因")] : "",
        治疗意愿: s("治疗意愿") ? [s("治疗意愿")] : "",
        治疗中观察: s("治疗中观察") ? [s("治疗中观察")] : "",
        不良反应及处置: s("不良反应及处置"),
        治疗后反馈: s("治疗后反馈") ? [s("治疗后反馈")] : "",
        执行人: [executor],
        上报人: [reporter],
        上报时间: nowLabel(),
        备注: s("备注"),
      };
    }
    case "communication": {
      const target = s("沟通对象");
      return {
        记录编号: id,
        患者编号: s("患者编号"),
        沟通对象: [target],
        家属关系: target === "家属" && s("家属关系") ? [s("家属关系")] : "",
        沟通方式: [s("沟通方式")],
        沟通主题: [s("沟通主题")],
        沟通内容要点: s("沟通内容要点"),
        对象反馈: s("对象反馈") ? [s("对象反馈")] : "",
        上报人: [reporter],
        上报时间: nowLabel(),
        备注: s("备注"),
      };
    }
    /* 出院随访：按《出院患者随访登记台账》13 列结构写 15 表；护士姓名=上报人 */
    case "followup":
      return {
        序号: id,
        姓名: s("姓名") || s("患者编号"),
        住院号: s("住院号"),
        出院日期: s("出院日期"),
        联系电话: s("联系电话"),
        随访日期: s("随访日期") || new Date().toISOString().slice(0, 10),
        随访方式: [s("随访方式")],
        风险等级: [s("风险等级")],
        存在问题: s("存在问题"),
        处理措施: s("处理措施"),
        下次随访时间: s("下次随访时间"),
        护士姓名: [reporter],
        备注: s("备注"),
      };
    /* 自定义记录：由用户自由定义记录内容，统计页只统计这一类与「人工填报」的业务记录 */
    case "custom":
      return {
        记录编号: id,
        记录类型: [s("记录类型") || "其他"],
        标题: s("标题"),
        内容: s("内容"),
        数值: Number(s("数值")) || 0,
        单位: s("单位"),
        记录人: [reporter],
        记录时间: nowLabel(),
        标签: s("标签"),
      };
  }
}

/** 统一在写入字段上标记「人工填报」，用于与系统演示种子数据区分（统计与洞察只看人工填报） */
function reportFields(kind: ReportKind, p: ReportPayload, actor: string, roleId?: string | null): Record<string, unknown> {
  return { ...buildReportFields(kind, p, actor, roleId), 数据来源: [SOURCE_MANUAL] };
}

/** 填报联动规则：高危安全事件 / 异常给药 → 自动生成 02 表任务推给医生端 */
function linkedTaskFields(kind: ReportKind, p: ReportPayload, reportId: string): Record<string, unknown> | null {
  const s = (k: string) => String(p[k] ?? "").trim();
  const base = {
    任务编号: `T-${Date.now()}`,
    触发来源: REPORT_KINDS[kind].label,
    触发时间: nowLabel(),
    关联患者: s("患者编号"),
    责任部门: ["医疗部"],
    责任端: ["医生端"],
    截止时间: "今日 22:00 前",
    任务状态: ["等待人工确认"],
    当前处理人: "",
  };
  if (kind === "safety" && s("严重等级") === "高") {
    return {
      ...base,
      标题: `【安全】${s("事件类型")}待处置 · ${s("患者编号")}`,
      数据依据: `来源 ${reportId}；严重等级：高；现场处置：${s("处置措施") || "见事件记录"}`,
      风险等级: ["高"],
    };
  }
  if (kind === "medication" && MED_ALERT_RESULTS.includes(s("执行结果"))) {
    return {
      ...base,
      标题: `【给药】${s("药品名称")}${s("执行结果")}待复核 · ${s("患者编号")}`,
      数据依据: `来源 ${reportId}；${s("执行结果")}原因：${s("拒服原因") || "未填写"}`,
      风险等级: ["中"],
    };
  }
  // 物理治疗：非正常完成且为临床类原因（患者拒绝/不适/临床暂停）→ 推医生端复核（运营类原因不进风险模型）
  if (kind === "pt" && PT_ABNORMAL_STATUS.includes(s("执行状态")) && PT_CLINICAL_REASONS.includes(s("未完成原因"))) {
    return {
      ...base,
      标题: `【物理治疗】${s("治疗项目")}${s("执行状态")}待复核 · ${s("患者编号")}`,
      数据依据: `来源 ${reportId}；执行状态：${s("执行状态")}；原因：${s("未完成原因")}；治疗意愿：${s("治疗意愿") || "未填"}`,
      风险等级: ["中"],
    };
  }
  // 沟通：对象明确拒绝或情绪激动 → 推医生端跟进
  if (kind === "communication" && COMM_ALERT_FEEDBACKS.includes(s("对象反馈"))) {
    return {
      ...base,
      标题: `【沟通】${s("沟通对象")}${s("对象反馈")}待跟进 · ${s("患者编号")}`,
      数据依据: `来源 ${reportId}；主题：${s("沟通主题")}；反馈：${s("对象反馈")}；要点：${s("沟通内容要点").slice(0, 40)}`,
      风险等级: ["中"],
    };
  }
  // 出院随访：风险等级=高 → 推医生端升级处置（高风险不得由 AI 单独关闭）
  if (kind === "followup" && s("风险等级") === FOLLOWUP_ALERT_RISK) {
    return {
      ...base,
      标题: `【随访】${s("姓名") || s("患者编号")}风险等级高待处置`,
      数据依据: `来源 ${reportId}；随访方式：${s("随访方式")}；存在问题：${s("存在问题") || "见随访记录"}；已采取措施：${s("处理措施") || "未填写"}`,
      风险等级: ["高"],
    };
  }
  return null;
}

/**
 * 写入一条业务填报记录（04/05/06/09 表），追加审计留痕；
 * 命中联动规则时自动创建任务工单并再留一条审计。返回业务编号与联动任务号。
 */
export async function bitableCreateReport(
  kind: ReportKind,
  payload: ReportPayload,
  actor: string,
  roleId?: string | null,
): Promise<ReportResult> {
  const fields = reportFields(kind, payload, actor, roleId);
  const recordId = String(fields[REPORT_KINDS[kind].idField] ?? "");
  await createRecord(REPORT_TABLE[kind], fields);

  const audit = (actionType: string, text: string, manual: boolean, taskId = "") =>
    createRecord(TABLES.audit, {
      日志编号: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      时间: nowLabel(),
      任务编号: taskId || recordId,
      操作人: actor,
      操作角色端: [ROLE_CN[roleId ?? "ops"] ?? "运营端"],
      动作类型: [actionType],
      驳回原因: "",
      转交至部门: "",
      动作说明: text,
      是否人工介入: manual,
    });
  await audit("人工填报", `填报${REPORT_KINDS[kind].label}：${recordId}`, true);

  const taskFields = linkedTaskFields(kind, payload, recordId);
  let taskId: string | undefined;
  if (taskFields) {
    taskId = String(taskFields["任务编号"]);
    await createRecord(TABLES.task, taskFields);
    await audit("系统生成", `联动生成任务 ${taskId}：${taskFields["标题"]}`, false, taskId);
  }
  return { recordId, taskId };
}
