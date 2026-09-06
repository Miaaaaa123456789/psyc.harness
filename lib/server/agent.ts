import { listRecords, TABLES } from "./bitable";
import { listPatients } from "./patients";
import { computeFollowupTasks } from "./followups";
import { computePtBoard } from "./pt";
import { computeWorkload } from "./workload";
import { maskPatientName, type PatientOption } from "../patient";

/**
 * Copilot Agent 问答引擎
 * ------------------------------------------------------------------
 * 输入：自然语言问题 + 当前角色端
 * 输出：基于飞书业务表（01/04/05/13/15 等）实时数据的回答
 *
 * 隐私铁律：任何患者姓名在离开本模块前必须经过 maskPatientName
 * （林心雨 → 林X雨；已脱敏的 林X雨 再过一遍仍是 林X雨，幂等）。
 * 明文姓名只允许出现在建档入口的一瞬间，展示与回答回流一律脱敏。
 */

export type AgentReply = {
  reply: string;
  /** 命中的意图（前端可用于埋点） */
  intent: string;
  /** 引用的数据表（回答可追溯） */
  sources: string[];
  /** 回答耗时 ms */
  tookMs: number;
  /** 界面操作指令：前端执行后可替角色端完成跳转 */
  action?: { type: "navigate"; view: string; label: string };
};

type Row = Record<string, unknown>;
/** listRecords 返回 {record_id, fields}；统一解包出 fields 供 txt/val 读取 */
const unwrap = (r: Row | { fields: Row }): Row =>
  (r && typeof r === "object" && "fields" in (r as Record<string, unknown>) ? (r as { fields: Row }).fields : r) as Row;
const txt = (r: Row, k: string) => String(r[k] ?? "").trim();
const val = (r: Row, k: string): string => {
  const v = r[k];
  if (Array.isArray(v)) return v.map(String).filter(Boolean).join("/");
  if (v == null) return "";
  return String(v).trim();
};

/** 唯一的姓名出口：一律脱敏。输入可能是整串「P-051 王某」，先剥离编号再脱敏姓名部分 */
function anon(name: string): string {
  const s = String(name ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(.*?)([\u4e00-\u9fa5·Xx]+)$/);
  if (!m) return s;
  const prefix = m[1].trim();
  const namePart = m[2].replace(/·/g, "");
  return prefix ? `${prefix} ${maskPatientName(namePart)}` : maskPatientName(namePart);
}

/* ==================== 意图识别 ==================== */

const INTENTS = [
  { id: "help", re: /^(你好|您好|hi|hello|帮助|你能做什么|你是谁|可以做什么)/i },
  { id: "followup", re: /随访|复诊|出院后/ },
  { id: "pt", re: /物理治疗|治疗执行|经颅磁|tacs|生物反馈|音乐治疗/ },
  { id: "workload", re: /工作量|绩效|排名|统计.*工|谁.*填|上报.*统计/ },
  { id: "safety", re: /安全事件|异常事件|自伤|自杀|跌倒|冲动|外跑|搜危/ },
  { id: "medication", re: /给药|服药|拒服|漏服|吐药|药品|用药/ },
  { id: "patient", re: /P-\d{3}|患者|病情|档案|风险等级/ },
];

function detectIntent(message: string): string {
  for (const it of INTENTS) {
    if (it.re.test(message)) return it.id;
  }
  return "fallback";
}

/* ==================== 各意图回答 ==================== */

function helpAnswer(): string {
  return [
    "我是护理 Copilot 助手，可以实时检索飞书数据底座（患者主档、安全事件、给药、物理治疗、随访台账、工作量）回答你的问题。例如：",
    "",
    "· 查患者：「P-042 最近情况」「林心雨 的档案」（姓名会自动脱敏为 林X雨）",
    "· 随访：「今天要随访哪些患者」「随访逾期名单」",
    "· 物理治疗：「物理治疗执行情况」「哪些治疗需要医生复核」",
    "· 安全：「待处置的安全事件」",
    "· 给药：「最近给药异常记录」",
    "· 绩效：「各端工作量统计」",
    "",
    "所有回答中的患者姓名均已脱敏（林X雨 格式），明文姓名不会出现在任何回答里。",
  ].join("\n");
}

/** 从问题里解析目标患者：编号 → 明文/脱敏姓名 */
async function resolvePatient(message: string): Promise<{ patient: PatientOption | null; by: string }> {
  const roster = await listPatients();
  const idMatch = message.match(/P-\d{3}/i);
  if (idMatch) {
    const id = idMatch[0].toUpperCase();
    const hit = roster.find((p) => p.id === id);
    return { patient: hit ?? null, by: id };
  }
  /* 姓名匹配：先直接比对（已脱敏名），再用 X 通配匹配明文输入 */
  for (const p of roster) {
    if (!p.name) continue;
    if (message.includes(p.name)) return { patient: p, by: p.id };
  }
  for (const p of roster) {
    if (!p.name || !p.name.includes("X")) continue;
    const re = new RegExp(p.name.replace(/X/g, "[\\u4e00-\\u9fa5]"));
    if (re.test(message)) return { patient: p, by: p.id };
  }
  /* 明文输入与档案名长度不同但首字一致（如「林心雨」vs「林某」）：
     「某」与「X」都是占位符，因此只要首字相同、且档案名以占位符结尾即可命中 */
  const plain = message.match(/[\u4e00-\u9fa5]{2,4}/g) ?? [];
  for (const p of roster) {
    if (!p.name) continue;
    for (const cand of plain) {
      if (cand[0] !== p.name[0]) continue;
      const lastChar = p.name[p.name.length - 1];
      const placeholderTail = lastChar === "某" || lastChar === "X";
      if (placeholderTail) return { patient: p, by: p.id };
    }
  }
  return { patient: null, by: "" };
}

/** 单患者全景：01 主档 + 04/05/13/15 近期记录（全部脱敏） */
async function patientAnswer(message: string): Promise<{ reply: string; sources: string[] }> {
  const { patient, by } = await resolvePatient(message);
  if (!patient) {
    const roster = await listPatients();
    return {
      reply: [
        `没有找到「${by || "该患者"}」的患者档案。`,
        roster.length
          ? `当前在管患者：${roster.map((p) => `${p.id} ${anon(p.name)}`).join("、")}。`
          : "患者主档为空，可先在填报中心建档。",
        "提示：可以用患者编号（P-xxx）或脱敏姓名提问。",
      ].join("\n"),
      sources: ["01_患者主档"],
    };
  }
  const name = anon(patient.name);
  const [safety, medication, pt, followup] = await Promise.all([
    listRecords(TABLES.safety),
    listRecords(TABLES.medication),
    listRecords(TABLES.pt),
    listRecords(TABLES.followup),
  ]);
  /* listRecords 返回 {record_id, fields}；unwrap 后 txt/val 才能按字段名读取 */
  const sf = safety.map(unwrap);
  const mf = medication.map(unwrap);
  const pf = pt.map(unwrap);
  const ff = followup.map(unwrap);
  const rows = (list: Row[]) => list.filter((r) => txt(r, "患者编号") === patient.id || txt(r, "姓名") === patient.name);

  const lines: string[] = [];
  lines.push(`【${patient.id} · ${name}】当前阶段：${patient.stage}｜风险等级：${patient.risk || "未评估"}`);

  const s = rows(sf).slice(0, 3);
  lines.push("");
  lines.push(`▎安全事件（04 表，最近 ${s.length} 条）`);
  if (s.length) s.forEach((r) => lines.push(`· ${val(r, "发生时间") || "时间未填"} ${txt(r, "事件类型")}｜${txt(r, "严重等级")}｜${txt(r, "闭环状态")}${txt(r, "处置措施") ? `｜${txt(r, "处置措施")}` : ""}`));
  else lines.push("· 暂无记录");

  const m = rows(mf).slice(0, 3);
  lines.push("");
  lines.push(`▎给药记录（05 表，最近 ${m.length} 条）`);
  if (m.length) m.forEach((r) => lines.push(`· ${txt(r, "药品名称") || "未填药品"}｜${txt(r, "执行结果") || "未记录"}${txt(r, "拒服原因") ? `｜原因：${txt(r, "拒服原因")}` : ""}｜确认：${txt(r, "确认护士") || "—"}`));
  else lines.push("· 暂无记录");

  const p = rows(pf).slice(0, 3);
  lines.push("");
  lines.push(`▎物理治疗（13 表，最近 ${p.length} 条）`);
  if (p.length) p.forEach((r) => lines.push(`· ${txt(r, "治疗项目")}｜${txt(r, "执行状态")}${txt(r, "未完成原因") ? `（${txt(r, "未完成原因")}）` : ""}`));
  else lines.push("· 暂无记录");

  const f = rows(ff).slice(0, 2);
  lines.push("");
  lines.push(`▎出院随访（15 表，最近 ${f.length} 条）`);
  if (f.length) f.forEach((r) => lines.push(`· ${txt(r, "随访日期")}｜${txt(r, "风险等级")}｜下次：${txt(r, "下次随访时间") || "未排期"}`));
  else lines.push("· 暂无记录");

  lines.push("");
  lines.push("（以上姓名均已脱敏展示；详细数据以飞书多维表格为准。）");
  return { reply: lines.join("\n"), sources: ["01_患者主档", "04_安全事件流", "05_给药记录", "13_物理治疗执行与沟通", "15_出院随访记录"] };
}

async function followupAnswer(): Promise<{ reply: string; sources: string[] }> {
  const { tasks, summary } = await computeFollowupTasks();
  const lines = [
    `随访任务总览：在管 ${summary.total} 人｜已逾期 ${summary.overdue}｜今日到期 ${summary.today}｜待排期 ${summary.never}｜7 日内 ${summary.soon}｜高风险 ${summary.highRisk}｜上次未取得联系 ${summary.unreached}`,
    "",
    "▎待随访患者名单（按紧迫度排序）",
  ];
  tasks.slice(0, 8).forEach((t) => {
    const state = t.state === "overdue" ? `已逾期 ${Math.abs(t.days ?? 0)} 天` : t.state === "today" ? "今日到期" : t.state === "never" ? "待排期" : `${t.days} 天后到期`;
    /* t.name 可能已含编号前缀（01 表「P-051 王某」），脱敏后避免编号重复 */
    const label = anon(t.name);
    const dup = t.patientId && label.startsWith(t.patientId);
    lines.push(`· ${dup ? label : `${t.patientId || t.admissionNo} ${label}`}｜${state}｜风险 ${t.risk || "未评估"}｜责任随访 ${t.owner || "未指派"}`);
  });
  if (tasks.length > 8) lines.push(`…共 ${tasks.length} 人，完整名单见「随访任务」页。`);
  if (!tasks.length) lines.push("· 暂无需要随访的患者。");
  lines.push("");
  lines.push("提示：未接通只代表信息不可得，不等于患者恶化，需人工确认后再判断。");
  return { reply: lines.join("\n"), sources: ["15_出院随访记录", "01_患者主档"] };
}

async function ptAnswer(): Promise<{ reply: string; sources: string[] }> {
  const { records, summary } = await computePtBoard();
  const lines = [
    `物理治疗执行总览：共 ${summary.total} 条｜正常完成 ${summary.done}｜非正常完成 ${summary.abnormal}｜临床类待复核 ${summary.clinical}`,
    "",
    "▎按治疗项目",
  ];
  summary.byModality.forEach((m) => lines.push(`· ${m.name}：${m.count} 次`));
  lines.push("");
  lines.push("▎需要关注的记录（临床类原因）");
  const clinical = records.filter((r) => r.clinical).slice(0, 5);
  if (clinical.length) clinical.forEach((r) => lines.push(`· ${r.patientId}｜${r.modality}｜${r.status}（${r.reason}）｜执行 ${r.executor || r.reporter || "—"}`));
  else lines.push("· 暂无临床类原因导致的非正常完成。");
  lines.push("");
  lines.push("口径：设备/排程等运营类原因不计入风险模型，临床类（患者拒绝/不适/临床暂停）已推送医生端复核。");
  return { reply: lines.join("\n"), sources: ["13_物理治疗执行与沟通"] };
}

async function workloadAnswer(roleGroup?: string): Promise<{ reply: string; sources: string[] }> {
  const staff = await computeWorkload();
  const groups = new Map<string, typeof staff>();
  for (const s of staff) {
    const list = groups.get(s.group) ?? [];
    list.push(s);
    groups.set(s.group, list);
  }
  const lines = ["▎各端工作量统计（按上报人口径，含全部业务表）"];
  for (const [g, list] of groups) {
    const top = [...list].sort((a, b) => b.total - a.total).slice(0, 5);
    lines.push(`· ${g}：${top.map((s) => `${s.name} ${s.total} 条${s.manual ? `（人工 ${s.manual}）` : ""}`).join("、")}`);
  }
  lines.push("");
  lines.push("绩效看板（护理绩效考核看板）在飞书侧同步更新，含各表 Top10 排行与分布图。");
  return { reply: lines.join("\n"), sources: ["04/05/08/13/14/15/16 业务表"] };
}

async function safetyAnswer(): Promise<{ reply: string; sources: string[] }> {
  const rows = (await listRecords(TABLES.safety)).map(unwrap);
  const pending = rows.filter((r) => txt(r, "闭环状态") === "待处置");
  const high = rows.filter((r) => txt(r, "严重等级") === "高");
  const lines = [
    `安全事件总览：共 ${rows.length} 条｜待处置 ${pending.length}｜高严重等级 ${high.length}`,
    "",
    "▎待处置事件",
  ];
  const list = (pending.length ? pending : rows).slice(0, 6);
  if (list.length) {
    list.forEach((r, i) => {
      const parts = [txt(r, "患者编号") || "", txt(r, "事件类型"), txt(r, "严重等级"), txt(r, "闭环状态"), txt(r, "上报人") || txt(r, "发现人")].filter(Boolean);
      lines.push(`· ${parts.length ? parts.join("｜") : `（记录 ${i + 1}，关键字段未填写）`}`);
    });
  } else lines.push("· 暂无待处置的安全事件。");
  lines.push("");
  lines.push("原则（D01）：没有记录不等于正常——低上报量本身可能意味着漏报，需要结合查房确认。");
  return { reply: lines.join("\n"), sources: ["04_安全事件流"] };
}

async function medicationAnswer(): Promise<{ reply: string; sources: string[] }> {
  const rows = (await listRecords(TABLES.medication)).map(unwrap);
  const alerts = rows.filter((r) => ["拒服", "漏服", "吐药"].includes(txt(r, "执行结果")));
  const lines = [
    `给药记录总览：共 ${rows.length} 条｜异常（拒服/漏服/吐药）${alerts.length} 条`,
    "",
    "▎异常给药记录",
  ];
  if (alerts.length) alerts.slice(0, 6).forEach((r) => lines.push(`· ${txt(r, "患者编号")}｜${txt(r, "药品名称") || "未填药品"}｜${txt(r, "执行结果")}${txt(r, "拒服原因") ? `（${txt(r, "拒服原因")}）` : ""}｜确认护士 ${txt(r, "确认护士") || "—"}`));
  else lines.push("· 暂无拒服/漏服/吐药记录。");
  lines.push("");
  lines.push("原则（D02）：拒服 + 睡眠恶化等信号需联合复核，单看给药表不足以判断。");
  return { reply: lines.join("\n"), sources: ["05_给药记录"] };
}

/* ==================== 入口 ==================== */

export async function askAgent(message: string, roleGroup?: string): Promise<AgentReply> {
  const started = Date.now();
  const msg = String(message ?? "").trim();
  if (!msg) {
    return { reply: "请输入你的问题。", intent: "empty", sources: [], tookMs: 0 };
  }
  const intent = detectIntent(msg);
  let result: { reply: string; sources: string[] };
  /** 各意图对应的界面操作：前端收到后自动跳转，替角色端省去找页面 */
  const NAV: Record<string, { view: string; label: string } | undefined> = {
    followup: { view: "outcomes", label: "随访任务" },
    pt: { view: "pt", label: "物理治疗执行" },
    safety: { view: "tasks", label: "临床行动" },
    medication: { view: "tasks", label: "临床行动" },
    patient: { view: "patients", label: "患者状态" },
    workload: { view: "governance", label: "治理中枢" },
  };
  const nav = NAV[intent];
  const action = nav ? { type: "navigate" as const, ...nav } : undefined;
  try {
    switch (intent) {
      case "help": result = { reply: helpAnswer(), sources: [] }; break;
      case "followup": result = await followupAnswer(); break;
      case "pt": result = await ptAnswer(); break;
      case "workload": result = await workloadAnswer(roleGroup); break;
      case "safety": result = await safetyAnswer(); break;
      case "medication": result = await medicationAnswer(); break;
      case "patient": result = await patientAnswer(msg); break;
      default:
        result = {
          reply: ["这个问题我暂时没有对应的数据源。我可以回答：患者档案、随访任务、物理治疗、安全事件、给药记录、工作量统计。输入「帮助」查看示例。"].join("\n"),
          sources: [],
        };
    }
  } catch (e) {
    result = {
      reply: `读取飞书数据失败：${(e as Error).message}。请稍后重试，或直接到对应页面查看。`,
      sources: [],
    };
  }
  return { ...result, intent, tookMs: Date.now() - started, action };
}
