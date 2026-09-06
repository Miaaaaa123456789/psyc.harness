import { SCENE_SPEC, type CustomStats, type Insight, type InsightScene, type InsightSeverity } from "../insights";
import { MED_ALERT_RESULTS, PT_ABNORMAL_STATUS, PT_CLINICAL_REASONS } from "../reports";
import { bitableEnabled, listRecords, TABLES } from "./bitable";

/**
 * 洞察计算层 —— 输入飞书业务表原始数据，输出《洞察行动矩阵》定义的洞察卡。
 *
 * 原则（对齐矩阵表）：
 * - 只输出数据能支撑的事实；数据不足时填 uncertainty 并降级，绝不编造。
 * - 没有记录不等于正常（D01）；未接通不等于恶化（D06）；完成点击不等于闭环（H01）。
 * - 每张卡必带人工边界，系统不越界代做临床决策。
 */

type Row = Record<string, unknown>;

const txt = (r: Row, k: string) => String(r[k] ?? "").trim();
/** 单选字段在 listRecords 中已还原为字符串；多选为数组 */
const multi = (r: Row, k: string): string[] => {
  const v = r[k];
  if (Array.isArray(v)) return v.map(String);
  const s = String(v ?? "").trim();
  return s ? [s] : [];
};

function card(
  scene: InsightScene,
  severity: InsightSeverity,
  title: string,
  finding: string,
  evidence: string[],
  action: string,
  uncertainty?: string,
): Insight {
  const spec = SCENE_SPEC[scene];
  return {
    scene, level: spec.level, module: spec.module, question: spec.question,
    title, finding, evidence, action, boundary: spec.boundary,
    uncertainty, severity, roles: spec.roles, owner: spec.owner,
  };
}

/** noData 卡片：数据源不可用时，按矩阵「缺失、混杂与降级」列输出降级提示 */
function noData(scene: InsightScene): Insight {
  const spec = SCENE_SPEC[scene];
  return card(
    scene, "info",
    `${spec.module}：暂无自录数据`,
    "该场景还没有你（或同事）通过填报中心录入的记录，系统演示种子数据不参与统计，因此无法给出洞察。",
    [],
    "通过填报中心录入该场景的记录后再查看；在此之前不做任何推断。",
    "数据源缺失时标记无法判断，不显示安全保证，也不输出具体方案。",
  );
}

/** 只保留「人工填报」来源的记录，排除系统演示种子数据 */
function onlyHuman<T extends Row>(rows: T[]): T[] {
  return rows.filter((r) => txt(r, "数据来源") === "人工填报");
}

function countBy<T extends string>(rows: Row[], key: string, values: T[]): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const v of values) out[v] = 0;
  for (const r of rows) {
    const v = txt(r, key);
    if (v && (values as string[]).includes(v)) out[v as T] += 1;
  }
  return out;
}

/* ==================== 各场景计算 ==================== */

/** D01 跨角色状态与安全需要：04 安全事件流 */
function insightD01(safety: Row[]): Insight {
  if (!safety.length) return noData("D01");
  const pending = safety.filter((r) => txt(r, "闭环状态") === "待处置");
  const high = safety.filter((r) => txt(r, "严重等级") === "高");
  const highPending = pending.filter((r) => txt(r, "严重等级") === "高");
  const types = countBy(pending, "事件类型", ["自杀意念", "自伤行为", "冲动攻击", "外跑企图", "跌倒", "搜危物品", "拒药拒食", "其他"]);
  const topTypes = Object.entries(types).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);

  const evidence = [
    `04_安全事件流 共 ${safety.length} 条，其中待处置 ${pending.length} 条、高严重等级 ${high.length} 条`,
    ...highPending.slice(0, 3).map((r) => `${txt(r, "事件编号")}｜${txt(r, "患者编号")}｜${txt(r, "事件类型")}｜发现人 ${txt(r, "发现人")}`),
    ...(topTypes.length ? [`待处置事件类型集中：${topTypes.map(([t, n]) => `${t} ${n} 起`).join("、")}`] : []),
  ];

  if (highPending.length) {
    return card("D01", "high",
      `${highPending.length} 起高严重等级安全事件仍待处置`,
      "高等级安全信号已识别但尚未闭环。按矩阵要求，安全信号走院内即时流程，未闭环前不能视为已控制。",
      evidence,
      `由 ${txt(highPending[0], "发现人") || "发现人"} 与临床安全负责人确认处置方案，明确复评问题、责任人与截止时间；不得自动变更护理等级。`,
    );
  }
  if (pending.length) {
    return card("D01", "medium",
      `${pending.length} 起安全事件待处置（暂无高等级）`,
      "存在未闭环安全事件，当前无高严重等级待处置项。",
      evidence,
      "按常规流程完成处置与复评，并回写闭环状态。",
    );
  }
  return card("D01", "low",
    "安全事件均已闭环",
    "当前安全事件流中没有待处置记录。注意：没有记录不等于患者状态正常，仅表示未记录到新事件。",
    evidence,
    "维持现有观察频率；新发事件按院内流程即时上报。",
    "无事件记录不等于风险不存在，本卡不提供任何安全保证。",
  );
}

/** D02 药物—症状—检查联合复核：05 给药记录 */
function insightD02(med: Row[]): Insight {
  if (!med.length) return noData("D02");
  const abnormal = med.filter((r) => MED_ALERT_RESULTS.includes(txt(r, "执行结果")));
  const needReview = med.filter((r) => r["是否需要复核"] === true || txt(r, "是否需要复核") === "true");
  const results = countBy(med, "执行结果", ["已服", "拒服", "漏服", "延后", "吐药", "暂停"] as ("已服" | "拒服" | "漏服" | "延后" | "吐药" | "暂停")[]);
  const byDrug: Record<string, number> = {};
  for (const r of abnormal) {
    const d = txt(r, "药品名称");
    if (d) byDrug[d] = (byDrug[d] ?? 0) + 1;
  }
  const topDrug = Object.entries(byDrug).sort((a, b) => b[1] - a[1])[0];
  const noReason = abnormal.filter((r) => !txt(r, "拒服原因") || txt(r, "拒服原因") === "—");

  const evidence = [
    `05_给药记录 共 ${med.length} 条，执行结果分布：${Object.entries(results).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join("、")}`,
    ...abnormal.slice(0, 3).map((r) => `${txt(r, "记录编号")}｜${txt(r, "患者编号")}｜${txt(r, "药品名称")} ${txt(r, "剂量")}｜${txt(r, "执行结果")}${txt(r, "拒服原因") && txt(r, "拒服原因") !== "—" ? `（${txt(r, "拒服原因")}）` : ""}`),
    ...(topDrug ? [`异常集中在：${topDrug[0]}（${topDrug[1]} 次）`] : []),
  ];

  if (abnormal.length) {
    return card("D02", noReason.length === abnormal.length ? "medium" : "high",
      `${abnormal.length} 次给药异常，${needReview.length} 条待医生复核`,
      topDrug
        ? `异常集中于 ${topDrug[0]}。需先核对医嘱版本与实际暴露，再做时间关联；相关不等于药物致因。`
        : "存在拒服/漏服/吐药记录，需核对医嘱与实际服用的差异。",
      evidence,
      noReason.length
        ? `先补齐 ${noReason.length} 条缺失的异常原因（${noReason.slice(0, 2).map((r) => txt(r, "记录编号")).join("、")}），再由主管医生复核处理与复评计划。`
        : "由主管医生核对医嘱与实际服用后形成处理与复评计划。",
      noReason.length ? `有 ${noReason.length} 条异常未填写原因，无法判断是药物因素还是其他原因，本卡不生成剂量调整建议。` : undefined,
    );
  }
  return card("D02", "low",
    "近期给药执行无异常",
    "当前给药记录中没有拒服、漏服或吐药。",
    evidence,
    "维持常规给药核对流程。",
  );
}

/** D04 物理治疗耐受与中断解释：13 物理治疗执行与沟通 */
function insightD04(pt: Row[]): Insight {
  if (!pt.length) return noData("D04");
  const abnormal = pt.filter((r) => PT_ABNORMAL_STATUS.includes(txt(r, "执行状态")));
  const clinical = abnormal.filter((r) => PT_CLINICAL_REASONS.includes(txt(r, "未完成原因")));
  const service = abnormal.filter((r) => ["设备", "排程", "其他"].includes(txt(r, "未完成原因")));
  const noReason = abnormal.filter((r) => !txt(r, "未完成原因"));

  const evidence = [
    `13_物理治疗执行与沟通 共 ${pt.length} 条，非正常完成 ${abnormal.length} 条（临床类 ${clinical.length}／服务类 ${service.length}）`,
    ...abnormal.slice(0, 3).map((r) => `${txt(r, "记录编号")}｜${txt(r, "患者编号")}｜${txt(r, "治疗项目")}｜${txt(r, "执行状态")}｜原因：${txt(r, "未完成原因") || "未填写"}｜意愿：${txt(r, "治疗意愿") || "未填写"}`),
  ];

  if (clinical.length) {
    return card("D04", "high",
      `${clinical.length} 次治疗中断为临床原因（患者拒绝/不适/临床暂停）`,
      "中断原因属临床范畴，需区分是身体不适、疑虑还是治疗安排问题；不把设备故障解释成病情变化。",
      evidence,
      `由开嘱医生复核 ${clinical.slice(0, 2).map((r) => txt(r, "患者编号")).filter(Boolean).join("、") || "相关患者"} 的耐受情况与方案；结果回传治疗师与护士。`,
    );
  }
  if (service.length) {
    return card("D04", "medium",
      `${service.length} 次治疗中断为服务原因（设备/排程）`,
      "中断主要来自服务侧而非临床耐受，不应计入患者依从性差。",
      evidence,
      "由医疗服务协调人员安排补做或改期，并追踪设备与排程问题。",
    );
  }
  if (noReason.length) {
    return card("D04", "medium",
      `${noReason.length} 次治疗中断未填写原因`,
      "存在非正常完成记录但缺少原因，无法区分临床与服务因素。",
      evidence,
      `补齐 ${noReason.slice(0, 2).map((r) => txt(r, "记录编号")).join("、")} 的中断原因后再判断归属。`,
      "原因缺失时禁止输出参数相关或疗效相关结论。",
    );
  }
  return card("D04", "low",
    "物理治疗均按计划完成",
    "当前记录中没有非正常完成的治疗。",
    evidence,
    "维持现有执行与观察记录。",
  );
}

/** D06 出院后连续照护：15 出院随访记录 */
function insightD06(followup: Row[]): Insight {
  if (!followup.length) return noData("D06");
  const high = followup.filter((r) => txt(r, "风险等级") === "高");
  const pending = followup.filter((r) => txt(r, "风险等级") === "待评估");
  const methods = countBy(followup, "随访方式", ["医院电话", "官方线上渠道", "其他合规方式"] as ("医院电话" | "官方线上渠道" | "其他合规方式")[]);
  const noNext = followup.filter((r) => !txt(r, "下次随访时间"));

  const evidence = [
    `15_出院随访记录 共 ${followup.length} 条，风险分布：高 ${high.length}／待评估 ${pending.length}`,
    `随访方式：${Object.entries(methods).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join("、")}`,
    ...high.slice(0, 3).map((r) => `${txt(r, "序号")}｜${txt(r, "姓名")}｜${txt(r, "出院日期")} 出院｜问题：${txt(r, "存在问题").slice(0, 40)}`),
  ];

  if (high.length) {
    return card("D06", "high",
      `${high.length} 名出院患者随访风险等级为高`,
      "高风险随访已生成医生端升级处置任务。紧急安全需要按医院流程处理，不能等待常规随访消息。",
      evidence,
      `主管医生与随访责任人（${txt(high[0], "护士姓名") || "责任随访人员"}）确认临床支持方案，并安排合适联系人与渠道。`,
    );
  }
  if (pending.length || noNext.length) {
    return card("D06", "medium",
      `${pending.length} 条待评估、${noNext.length} 条未排下次随访`,
      "存在随访结论未定或后续安排缺失的出院患者。",
      evidence,
      "补齐风险等级结论与下次随访时间，避免连续照护断链。",
      "未接通只表示信息不可得，本卡不据此判定患者风险升高或降低。",
    );
  }
  return card("D06", "low",
    "出院随访均已完成评估并排出下次节点",
    "当前随访记录风险等级明确且已安排下次随访。",
    evidence,
    "按计划执行下一轮随访。",
  );
}

/** D07 数据矛盾与最小补问：跨 05/13/15 找缺失的关键未知 */
function insightD07(med: Row[], pt: Row[], followup: Row[]): Insight {
  const gaps: { id: string; what: string; why: string }[] = [];
  for (const r of med) {
    if (MED_ALERT_RESULTS.includes(txt(r, "执行结果")) && (!txt(r, "拒服原因") || txt(r, "拒服原因") === "—"))
      gaps.push({ id: txt(r, "记录编号"), what: `${txt(r, "患者编号")} ${txt(r, "药品名称")}${txt(r, "执行结果")}的具体原因`, why: "决定是否需要调整给药方案" });
  }
  for (const r of pt) {
    if (PT_ABNORMAL_STATUS.includes(txt(r, "执行状态")) && !txt(r, "未完成原因"))
      gaps.push({ id: txt(r, "记录编号"), what: `${txt(r, "患者编号")} ${txt(r, "治疗项目")}未${txt(r, "执行状态")}的原因`, why: "决定归属临床复核还是服务安排" });
  }
  for (const r of followup) {
    if (txt(r, "风险等级") === "待评估")
      gaps.push({ id: txt(r, "序号"), what: `${txt(r, "姓名")}出院后的风险等级`, why: "决定随访强度与是否升级医生处置" });
  }

  if (!gaps.length) {
    return card("D07", "low",
      "暂无需要优先补齐的关键未知",
      "给药异常、治疗中断与随访待评估项均已填写关键信息。",
      ["05/13/15 三张表的必填原因与结论字段均已完整"],
      "维持现有录入规范。",
    );
  }
  return card("D07", "medium",
    `${gaps.length} 项未知信息最可能改变当前处理`,
    `优先级最高的补问：${gaps[0].what} —— 它直接决定${gaps[0].why}。`,
    gaps.slice(0, 3).map((g) => `${g.id}｜待补：${g.what}｜影响：${g.why}`),
    `推给最可能知道答案的责任人补齐；确认后刷新洞察，不重复追问已回答的信息。`,
  );
}

/** H01 安全处置链条缺口：04 待处置事件 vs 02 任务闭环 */
function insightH01(safety: Row[], tasks: Row[]): Insight {
  if (!safety.length) return noData("H01");
  const pending = safety.filter((r) => txt(r, "闭环状态") === "待处置");
  const openTasks = tasks.filter((r) => txt(r, "任务状态") !== "已完成" && txt(r, "任务状态") !== "已驳回");
  const safetyTasks = openTasks.filter((r) => txt(r, "触发来源").includes("安全"));
  const unassigned = openTasks.filter((r) => !txt(r, "当前处理人"));

  const evidence = [
    `04 表待处置安全事件 ${pending.length} 起；02 任务工单未闭环 ${openTasks.length} 条（其中安全来源 ${safetyTasks.length} 条）`,
    ...openTasks.slice(0, 3).map((r) => `${txt(r, "任务编号")}｜${txt(r, "标题").slice(0, 34)}｜状态 ${txt(r, "任务状态")}｜处理人 ${txt(r, "当前处理人") || "未指派"}`),
    ...(unassigned.length ? [`${unassigned.length} 条任务尚未指派处理人`] : []),
  ];

  if (pending.length || unassigned.length) {
    return card("H01", "high",
      `安全处置链条存在缺口：${pending.length} 起事件待处置、${unassigned.length} 条任务未指派`,
      "按发现→分派→接收→实际处理→复评拼接，当前环节存在未完成节点。收到消息或点击完成不等于临床闭环。",
      evidence,
      "由值班团队分配责任人与备用通道，给未闭环事项设定复评任务；只有临床负责人能确认安全问题已解决。",
    );
  }
  return card("H01", "low",
    "安全处置链条无缺口",
    "安全事件均已闭环，相关任务均已指派处理人。",
    evidence,
    "维持现有分派与复评机制。",
  );
}

/** H02 诊疗路径障碍定位：13 表非完成原因的服务类占比 */
function insightH02(pt: Row[], comm: Row[]): Insight {
  if (!pt.length) return noData("H02");
  const abnormal = pt.filter((r) => PT_ABNORMAL_STATUS.includes(txt(r, "执行状态")));
  const service = abnormal.filter((r) => ["设备", "排程", "其他"].includes(txt(r, "未完成原因")));
  const clinical = abnormal.filter((r) => PT_CLINICAL_REASONS.includes(txt(r, "未完成原因")));
  const negative = comm.filter((r) => ["明确拒绝", "情绪激动"].includes(txt(r, "对象反馈")));

  const evidence = [
    `13 表非正常完成 ${abnormal.length} 条：服务类 ${service.length}／临床类 ${clinical.length}`,
    ...(negative.length ? [`14 沟通记录中 ${negative.length} 条为负向反馈（明确拒绝/情绪激动）`] : []),
    ...service.slice(0, 2).map((r) => `${txt(r, "记录编号")}｜${txt(r, "治疗项目")}｜原因 ${txt(r, "未完成原因")}`),
  ];

  if (service.length >= 2) {
    return card("H02", "medium",
      `服务类障碍 ${service.length} 次，占非正常完成的 ${Math.round((service.length / abnormal.length) * 100)}%`,
      "中断集中来自设备与排程等流程环节，而非患者临床因素。输出为关联与待核实解释，不宣称因果。",
      evidence,
      "针对反复阻塞的治疗时段提出一项可测试改进（如设备检修窗口或排程缓冲），指定负责人并观察患者等待是否下降。",
      "无完整起止事件或原因覆盖率低时本卡不可计算；不做员工或科室排名。",
    );
  }
  if (abnormal.length) {
    return card("H02", "low",
      `非正常完成 ${abnormal.length} 条，暂未见集中性流程障碍`,
      "当前中断以临床原因为主，未呈现明确的流程瓶颈。",
      evidence,
      "继续积累数据，观察是否形成特定时段的重复模式。",
    );
  }
  return card("H02", "info",
    "暂无可识别的路径障碍",
    "物理治疗记录中无非正常完成项。",
    evidence,
    "维持现有路径监控。",
  );
}

/** H06 AI自身效果与安全审计：03 审计日志的人工介入与动作分布 */
function insightH06(audit: Row[]): Insight {
  if (!audit.length) return noData("H06");
  const manual = audit.filter((r) => r["是否人工介入"] === true || txt(r, "是否人工介入") === "true");
  const auto = audit.filter((r) => !(r["是否人工介入"] === true || txt(r, "是否人工介入") === "true"));
  const rejects = audit.filter((r) => txt(r, "动作类型") === "驳回");

  const evidence = [
    `03_操作审计日志 共 ${audit.length} 条：人工介入 ${manual.length} 条（${Math.round((manual.length / audit.length) * 100)}%）、系统生成 ${auto.length} 条`,
    ...(rejects.length ? [`其中驳回 ${rejects.length} 条，驳回原因：${rejects.slice(0, 2).map((r) => txt(r, "驳回原因") || "未填写").join("；")}`] : []),
    `最近动作：${audit.slice(0, 3).map((r) => `${txt(r, "动作类型")}(${txt(r, "操作人") || "系统"})`).join("、")}`,
  ];

  return card("H06", rejects.length ? "medium" : "info",
    `人工介入率 ${Math.round((manual.length / audit.length) * 100)}%，驳回 ${rejects.length} 条`,
    "人工介入比例反映 AI 建议被采纳与修正的情况；驳回记录是识别 AI 出错位置的主要线索。本卡仅为审计口径统计，不代表临床有效性结论。",
    evidence,
    "问题版本按流程降级或暂停，改动后重新验证；用户反馈不直接触发在线自学习。",
    "不以采纳率、使用量或摘要质量代替有效性与患者获益评价。",
  );
}

/* ==================== 入口 ==================== */

export type InsightsSource = "bitable" | "none";

/** 自定义记录统计：全部来自 16_自定义记录表（用户自录） */
function customStats(rows: Row[]): CustomStats {
  const byTypeMap: Record<string, { count: number; sum: number }> = {};
  const reporters = new Set<string>();
  let valueSum = 0;

  for (const r of rows) {
    const type = txt(r, "记录类型") || "未分类";
    const v = Number(txt(r, "数值"));
    const num = Number.isFinite(v) ? v : 0;
    byTypeMap[type] = byTypeMap[type] ?? { count: 0, sum: 0 };
    byTypeMap[type].count += 1;
    byTypeMap[type].sum += num;
    valueSum += num;
    const who = txt(r, "记录人");
    if (who) reporters.add(who);
  }

  const recent = rows
    .slice(-5)
    .reverse()
    .map((r) => ({
      id: txt(r, "记录编号"),
      type: txt(r, "记录类型") || "未分类",
      title: txt(r, "标题"),
      value: txt(r, "数值") ? `${txt(r, "数值")}${txt(r, "单位") ?? ""}` : "—",
      reporter: txt(r, "记录人"),
      time: txt(r, "记录时间"),
    }));

  return {
    total: rows.length,
    byType: Object.entries(byTypeMap)
      .map(([type, v]) => ({ type, count: v.count, sum: v.sum }))
      .sort((a, b) => b.count - a.count),
    valueSum,
    recent,
    reporters: [...reporters],
  };
}

/**
 * 计算全部洞察卡。
 * 口径：只统计「人工填报」来源的记录，系统演示种子数据一律排除；
 * bitable 不可用时返回全部降级卡。
 */
export async function computeInsights(): Promise<{
  insights: Insight[];
  custom: CustomStats;
  source: InsightsSource;
}> {
  const emptyCustom: CustomStats = { total: 0, byType: [], valueSum: 0, recent: [], reporters: [] };
  if (!bitableEnabled()) {
    const scenes: InsightScene[] = ["D01", "D02", "D04", "D06", "D07", "H01", "H02", "H06"];
    return { insights: scenes.map(noData), custom: emptyCustom, source: "none" };
  }

  const [safety, med, pt, comm, followup, tasks, audit, custom] = await Promise.all([
    listRecords(TABLES.safety),
    listRecords(TABLES.medication),
    listRecords(TABLES.pt),
    listRecords(TABLES.communication),
    listRecords(TABLES.followup),
    listRecords(TABLES.task),
    listRecords(TABLES.audit),
    listRecords(TABLES.custom),
  ]);

  const rows = (recs: { fields: Row }[]) => recs.map((r) => r.fields);
  // 洞察只看自录数据；审计日志（H06）为系统运行留痕，保留全量
  const [hSafety, hMed, hPt, hComm, hFollow, hTasks] = [
    onlyHuman(rows(safety)), onlyHuman(rows(med)), onlyHuman(rows(pt)),
    onlyHuman(rows(comm)), onlyHuman(rows(followup)), onlyHuman(rows(tasks)),
  ];

  const insights: Insight[] = [
    insightD01(hSafety),
    insightD02(hMed),
    insightD04(hPt),
    insightD06(hFollow),
    insightD07(hMed, hPt, hFollow),
    insightH01(hSafety, hTasks),
    insightH02(hPt, hComm),
    insightH06(rows(audit)),
  ];

  return { insights, custom: customStats(rows(custom)), source: "bitable" };
}
