import type { RoleId } from "./hospital";

/**
 * 洞察卡共享定义 —— 规范来自飞书「数据copilot」Base 的《洞察行动矩阵》表（D01-D08 患者层 / H01-H06 医院层）。
 *
 * 每张洞察卡严格包含四段，顺序不可颠倒：
 *   1. finding   —— 洞察与证据（数据算出来的事实，不是推测）
 *   2. evidence  —— 数据依据（可追溯到具体记录编号）
 *   3. action    —— 建议行动（给谁、做什么）
 *   4. boundary  —— 人工边界（系统不做什么）
 * 数据不足时输出 uncertainty（降级说明），绝不编造结论。
 */

export type InsightLevel = "患者" | "医院";
export type InsightSeverity = "high" | "medium" | "low" | "info";

/** 洞察场景 ID，与飞书《洞察行动矩阵》表的场景ID 一一对应 */
export type InsightScene =
  | "D01" | "D02" | "D04" | "D06" | "D07"
  | "H01" | "H02" | "H06";

export type Insight = {
  scene: InsightScene;
  level: InsightLevel;
  /** 洞察模块名 */
  module: string;
  /** 要回答的决策问题 */
  question: string;
  /** 一行结论 */
  title: string;
  /** 洞察与证据 */
  finding: string;
  /** 数据依据（记录编号、统计口径） */
  evidence: string[];
  /** 建议行动 */
  action: string;
  /** 人工边界：系统不会自动做什么 */
  boundary: string;
  /** 数据不足时的降级说明 */
  uncertainty?: string;
  severity: InsightSeverity;
  /** 可见角色端 */
  roles: RoleId[];
  /** 责任角色（来自矩阵表） */
  owner: string;
};

/** 场景规范：模块名、决策问题、行动边界、责任角色 */
export const SCENE_SPEC: Record<InsightScene, {
  module: string;
  question: string;
  boundary: string;
  owner: string;
  level: InsightLevel;
  roles: RoleId[];
}> = {
  D01: {
    module: "跨角色状态与安全需要",
    question: "相对本人基线发生了什么，哪些安全信息仍待确认？",
    boundary: "只提示待复评问题、责任人与截止时间，不自动变更护理等级",
    owner: "临床安全负责人",
    level: "患者",
    roles: ["doctor", "nurse", "therapist", "butler", "ops"],
  },
  D02: {
    module: "药物—症状—检查联合复核",
    question: "症状或不适与药物变更、实际服用及检查时间有什么关系？",
    boundary: "医生审核后形成处理与复评计划，系统不停药、不改剂量、不开检查",
    owner: "主管医生/药师（如设岗）",
    level: "患者",
    roles: ["doctor", "nurse"],
  },
  D04: {
    module: "物理治疗耐受与中断解释",
    question: "未完成是身体不适、疑虑、治疗安排还是设备原因？",
    boundary: "临床不适由医生复核，服务障碍由协调人员安排，不自动推断疗效",
    owner: "执行治疗师/护士+开嘱医生",
    level: "患者",
    roles: ["doctor", "nurse", "therapist"],
  },
  D06: {
    module: "出院后连续照护",
    question: "目前缺的是联系、药物可及、复诊安排还是临床支持？",
    boundary: "未接通只表示信息不可得，不据此判定风险高低；紧急安全走院内流程",
    owner: "责任随访人员/主管医生",
    level: "患者",
    roles: ["doctor", "nurse", "therapist", "butler"],
  },
  D07: {
    module: "数据矛盾与最小补问",
    question: "哪一个未知信息最可能改变当前处理？",
    boundary: "推给最可能知道答案的人；不以多数票或职位裁定真相",
    owner: "相关记录者/临床复核人",
    level: "患者",
    roles: ["doctor", "nurse"],
  },
  H01: {
    module: "安全处置链条缺口",
    question: "已识别的患者安全需要，哪些尚未得到合适响应？",
    boundary: "收到消息或点击完成不等于临床闭环，只有临床负责人能确认安全已解决",
    owner: "临床安全负责人/值班团队",
    level: "医院",
    roles: ["doctor", "ops", "leader"],
  },
  H02: {
    module: "诊疗路径障碍定位",
    question: "哪一段流程反复让患者等待、漏治或重复沟通？",
    boundary: "输出关联与待核实解释，不宣称因果，不做员工排名",
    owner: "医疗服务协调负责人",
    level: "医院",
    roles: ["ops", "leader"],
  },
  H06: {
    module: "AI自身效果与安全审计",
    question: "AI是否比规则/人工汇总更有用，又在哪里出错？",
    boundary: "不以采纳率或使用量代替有效性；用户反馈不直接触发在线自学习",
    owner: "产品+临床安全+数据负责人",
    level: "医院",
    roles: ["ops", "leader"],
  },
};

/** 自定义记录统计（统计页只统计用户自录数据，不含演示种子） */
export type CustomStats = {
  total: number;
  /** 按记录类型分组的条数 */
  byType: { type: string; count: number; sum: number }[];
  /** 数值型记录的合计 */
  valueSum: number;
  /** 最近记录 */
  recent: { id: string; type: string; title: string; value: string; reporter: string; time: string }[];
  /** 参与记录的人数 */
  reporters: string[];
};

export const LEVEL_LABEL: Record<InsightLevel, string> = {
  患者: "患者层",
  医院: "医院层",
};

export const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  high: "需立即处理",
  medium: "待复核",
  low: "关注",
  info: "提示",
};

/** 按角色过滤可见洞察（责任角色映射来自《洞察行动矩阵》表） */
export function insightsForRole(list: Insight[], role: RoleId): Insight[] {
  return list.filter((i) => i.roles.includes(role));
}

/** 严重程度排序：高 → 中 → 低 → 提示；同级按场景 ID */
const SEVERITY_ORDER: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

export function sortInsights(list: Insight[]): Insight[] {
  return [...list].sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.scene.localeCompare(b.scene));
}
