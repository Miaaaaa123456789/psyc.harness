import type { RoleId } from "./hospital";

/**
 * 业务填报（统一填报中心）的共享定义。
 * 前端表单、API 校验、飞书字段映射三方共用这一份常量，
 * 选项文案与飞书多维表格 select 选项严格一致（写入时单选传 [值]）。
 * 选项依据《护理信息总表与Copilot字段清单》Copilot必需字段表的枚举值。
 */

export type ReportKind = "safety" | "medication" | "therapy" | "butler" | "pt" | "communication" | "followup";

export type ReportPayload = Record<string, string | number | boolean>;

export const REPORT_KINDS: Record<
  ReportKind,
  { label: string; tableLabel: string; idPrefix: string; idField: string }
> = {
  safety: { label: "安全事件上报", tableLabel: "04_安全事件流", idPrefix: "E", idField: "事件编号" },
  medication: { label: "给药执行记录", tableLabel: "05_给药记录", idPrefix: "M", idField: "记录编号" },
  therapy: { label: "治疗与康复记录", tableLabel: "06_治疗与康复记录", idPrefix: "T", idField: "记录编号" },
  butler: { label: "管家服务工单", tableLabel: "09_管家服务工单", idPrefix: "B", idField: "工单编号" },
  pt: { label: "物理治疗参与情况", tableLabel: "13_物理治疗执行与沟通", idPrefix: "PT", idField: "记录编号" },
  communication: { label: "在院沟通记录", tableLabel: "14_沟通记录", idPrefix: "C", idField: "记录编号" },
  followup: { label: "出院随访记录", tableLabel: "15_出院随访记录", idPrefix: "F", idField: "序号" },
};

/** 每个角色端在填报中心可填的表单（患者端/家属端/院领导端暂无） */
export const ROLE_REPORTS: Record<RoleId, ReportKind[]> = {
  doctor: ["safety", "communication", "followup"],
  nurse: ["safety", "medication", "pt", "communication", "followup"],
  therapist: ["safety", "therapy", "pt", "communication", "followup"],
  patient: [],
  family: [],
  butler: ["butler", "safety", "communication", "followup"],
  ops: ["butler", "safety", "communication"],
  leader: [],
};

/** 各角色端「上报人」默认值（演示账号，表单中可改） */
export const ROLE_REPORTER: Partial<Record<RoleId, string>> = {
  doctor: "医生 陈航",
  nurse: "护士 李敏",
  therapist: "治疗师 王岚",
  butler: "管家 周怡",
  ops: "运营 赵启",
};

/* ---- 选项常量（与飞书 select 选项一致） ---- */
export const SAFETY_TYPES = ["自杀意念", "自伤行为", "冲动攻击", "外跑企图", "跌倒", "搜危物品", "拒药拒食", "其他"];
export const SEVERITY_LEVELS = ["低", "中", "高"];
export const MED_RESULTS = ["已服", "拒服", "漏服", "延后", "吐药", "暂停"];
/** 执行结果为这些值时需要填原因 + 触发复核/联动任务 */
export const MED_ALERT_RESULTS = ["拒服", "漏服", "吐药"];
export const THERAPY_TYPES = ["物理治疗", "心理治疗", "工娱治疗", "团体治疗", "家庭治疗", "康复训练"];
export const THERAPY_STATUS = ["已完成", "部分完成", "未完成", "改期"];
export const BUTLER_TYPES = ["预约挂号", "检查陪护", "接送安排", "住宿安排", "费用结算", "跨部门协调", "出院接续"];
export const BUTLER_DEPTS = ["门诊中心", "住院病区", "护理部", "医疗部", "心理治疗中心", "康复治疗中心", "健康管理中心", "院外服务", "运营管理部"];

/* ---- 物理治疗（ui_pt_* 字段清单对齐） ---- */
export const PT_MODALITIES = ["经颅磁", "tACS", "生物反馈", "音乐治疗", "其他"];
export const PT_SESSION_STATUS = ["已完成", "部分完成", "取消", "拒绝", "暂停", "未到"];
/** 非正常完成：必须填原因，且临床类原因触发联动任务 */
export const PT_ABNORMAL_STATUS = ["部分完成", "取消", "拒绝", "暂停", "未到"];
export const PT_NONCOMPLETE_REASONS = ["患者拒绝", "不适", "临床暂停", "设备", "排程", "其他"];
/** 临床类原因（进团队复核，联动任务推医生端）；运营类（设备/排程/其他）不进风险模型 */
export const PT_CLINICAL_REASONS = ["患者拒绝", "不适", "临床暂停"];
export const PT_WILLINGNESS = ["愿意", "犹豫", "拒绝"];
export const PT_DURING_OBS = ["正常", "不适", "情绪反应", "中断"];
export const PT_POST_FEEDBACK = ["恢复正常", "仍不适", "情绪变化", "主观感受"];

/* ---- 沟通情况（family_interaction / ui_pt_communication_record 对齐） ---- */
export const COMM_TARGETS = ["患者", "家属"];
export const COMM_RELATIONS = ["父母", "配偶", "子女", "兄弟姐妹", "其他"];
export const COMM_METHODS = ["床旁", "医院电话", "官方线上渠道", "其他合规方式"];
export const COMM_TOPICS = ["治疗宣教", "服药劝导", "风险告知", "随访关怀", "需求与投诉", "其他"];
export const COMM_FEEDBACKS = ["理解配合", "仍有疑虑", "明确拒绝", "情绪激动"];
/** 反馈为这些值时联动任务推医生端跟进 */
export const COMM_ALERT_FEEDBACKS = ["明确拒绝", "情绪激动"];

/* ---- 出院随访（按《出院患者随访登记台账》13 列结构） ---- */
/** 随访方式（ui_followup_method：禁止个人微信/私人号码） */
export const FOLLOWUP_METHODS = ["医院电话", "官方线上渠道", "其他合规方式"];
/** 随访风险等级（ui_followup_risk_level） */
export const FOLLOWUP_RISK_LEVELS = ["低", "中", "高", "待评估"];
/** 风险等级=高 时联动任务推医生端（高风险不得由 AI 单独关闭，必须人工升级处置） */
export const FOLLOWUP_ALERT_RISK = "高";

export function isReportKind(v: unknown): v is ReportKind {
  return typeof v === "string" && v in REPORT_KINDS;
}
