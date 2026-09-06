"use client";

/**
 * 医疗 AI Copilot 领域层
 * ------------------------------------------------------------------
 * 核心数据对象是「一次完整的患者决策事件」：
 *   患者变化 → AI解释 → 补充证据 → 医生决策 → 角色任务 → 执行反馈
 *   → 结局验证 → 患者解释 → 管理洞察
 *
 * 本文件提供：
 * 1. 六端角色门户（PORTALS）与视图导航
 * 2. 人员花名册：18 名护士 + 7 名医生（一线/二线责任层级）
 * 3. VIP 分层规则（默认值，后台可通过 /api/vip-rules 覆盖，不硬编码阈值逻辑）
 * 4. 领域类型：患者变化 / AI洞察卡 / 决策方案 / 结局验证 / 责任链 / 工作量账本
 * 5. 演示种子数据（P-042 失眠链路全流程）
 */

import {
  Activity, Bot, BrainCircuit, CalendarCheck2, ChartNoAxesCombined, ClipboardCheck, ClipboardList,
  Crown, FileSearch, Gauge, HandHeart, HeartPulse, Home, LayoutDashboard, Lightbulb, ListChecks,
  Route, ShieldCheck, Stethoscope, Target, TrendingUp, Workflow, type LucideIcon,
} from "lucide-react";
import type { RoleId } from "./hospital";

/* ==================== 视图（在原有基础上扩展） ==================== */
export type View =
  | "overview" | "robots" | "skills" | "tasks" | "patients" | "network"
  | "insights" | "operations" | "roadmap"
  | "proposals" | "outcomes" | "family" | "governance" | "pt";

/* ==================== 1. 六端角色门户 ==================== */
export type PortalId = "doctor" | "nurse" | "therapist" | "butler" | "familyPortal" | "governancePortal";

export type PortalNav = { view: View; label: string; icon: LucideIcon; badge?: "tasks" | "proposals" | "outcomes" };

export type Portal = {
  id: PortalId;
  name: string;
  entry: string;
  note: string;
  /** 该门户覆盖的原角色 id（患者与家属合并；运营与院领导合并） */
  roleIds: RoleId[];
  /** 进入门户时使用的代表角色 */
  defaultRole: RoleId;
  nav: PortalNav[];
};

export const PORTALS: Portal[] = [
  {
    id: "doctor", name: "医生端", entry: "医生端", note: "临床决策与复核", defaultRole: "doctor", roleIds: ["doctor"],
    nav: [
      { view: "overview", label: "今日决策", icon: LayoutDashboard },
      { view: "patients", label: "患者状态", icon: HeartPulse },
      { view: "proposals", label: "待确认方案", icon: ClipboardList, badge: "proposals" },
      { view: "tasks", label: "临床行动", icon: ClipboardCheck, badge: "tasks" },
      { view: "outcomes", label: "结局验证", icon: CalendarCheck2, badge: "outcomes" },
      { view: "insights", label: "临床洞察", icon: Lightbulb },
    ],
  },
  {
    id: "nurse", name: "护士端", entry: "护士端", note: "执行确认与现场处置", defaultRole: "nurse", roleIds: ["nurse"],
    nav: [
      { view: "overview", label: "今日任务", icon: LayoutDashboard },
      { view: "patients", label: "异常患者", icon: HeartPulse },
      { view: "proposals", label: "医生反馈", icon: FileSearch },
      { view: "tasks", label: "护理执行", icon: ClipboardCheck, badge: "tasks" },
      { view: "outcomes", label: "随访任务", icon: CalendarCheck2 },
      { view: "pt", label: "物理治疗协同", icon: Activity },
    ],
  },
  {
    id: "therapist", name: "治疗师端", entry: "治疗师端", note: "心理与物理治疗", defaultRole: "therapist", roleIds: ["therapist"],
    nav: [
      { view: "overview", label: "今日治疗", icon: LayoutDashboard },
      { view: "patients", label: "治疗前风险", icon: ShieldCheck },
      { view: "tasks", label: "执行记录", icon: ClipboardCheck, badge: "tasks" },
      { view: "outcomes", label: "疗效与耐受", icon: TrendingUp },
      { view: "pt", label: "物理治疗执行", icon: Activity },
    ],
  },
  {
    id: "butler", name: "管家服务端", entry: "管家服务端", note: "VIP服务与跨部门协调", defaultRole: "butler", roleIds: ["butler"],
    nav: [
      { view: "overview", label: "今日服务", icon: LayoutDashboard },
      { view: "patients", label: "VIP患者", icon: Crown },
      { view: "tasks", label: "服务任务", icon: ClipboardCheck, badge: "tasks" },
      { view: "outcomes", label: "权益履约", icon: CalendarCheck2 },
      { view: "insights", label: "服务洞察", icon: HandHeart },
    ],
  },
  {
    id: "familyPortal", name: "患者家属端", entry: "我的治疗与家庭支持", note: "患者与家属统一入口", defaultRole: "patient", roleIds: ["patient", "family"],
    nav: [
      { view: "family", label: "治疗航图", icon: Route },
      { view: "family", label: "今日计划", icon: CalendarCheck2 },
      { view: "family", label: "康复进展", icon: TrendingUp },
      { view: "family", label: "VIP权益", icon: Crown },
    ],
  },
  {
    id: "governancePortal", name: "管理信息运营端", entry: "医院运行与AI治理中枢", note: "管理、运营、信息与AI审计", defaultRole: "ops", roleIds: ["ops", "leader"],
    nav: [
      { view: "governance", label: "医院脉冲", icon: Gauge },
      { view: "patients", label: "患者运行", icon: HeartPulse },
      { view: "insights", label: "临床与服务洞察", icon: Lightbulb },
      { view: "operations", label: "AI质量与审计", icon: ShieldCheck },
      { view: "roadmap", label: "实施进度", icon: Route },
    ],
  },
];

/** 角色归属的门户：患者/家属 → 患者家属端；运营/院领导 → 治理中枢 */
export function portalOf(roleId: RoleId): Portal {
  return PORTALS.find((p) => p.roleIds.includes(roleId)) ?? PORTALS[0];
}

/** 门户内去重后的导航（患者家属端多个入口指向同一视图时合并） */
export function portalNav(p: Portal): { view: View; label: string; icon: LucideIcon }[] {
  const seen = new Set<View>();
  return p.nav.filter((n) => (seen.has(n.view) ? false : (seen.add(n.view), true)));
}

/* ==================== 2. 人员花名册 ====================
 * 真源在 lib/roster.ts（医护治管家各自独立名单），此处 re-export 供前端组件使用。
 * 填报中心按角色端只显示本端人员，管理工作量按人聚合统计。 */
export {
  NURSES, DOCTORS, DOCTOR_NAMES, THERAPISTS, BUTLERS,
  STAFF_GROUPS, ROSTER_BY_ROLE, DEFAULT_REPORTER, ALL_STAFF, staffGroup,
} from "./roster";
export type { DoctorTier, StaffGroup, PortalStaffKey } from "./roster";

/* ==================== 3. VIP 分层规则（默认值；后台可配置） ====================
 * 配置来源 data/vip-rules.json，经 /api/vip-rules 下发；
 * 此处仅作离线兜底，前端不承载阈值判定职责。 */
export type VipTierId = "none" | "gold" | "platinum" | "diamond";

export type VipRule = {
  tier: VipTierId; name: string; points: number; companionDays: number; visits: number; adherence: number;
};

export const DEFAULT_VIP_RULES: VipRule[] = [
  { tier: "gold", name: "黄金VIP", points: 10000, companionDays: 30, visits: 5, adherence: 80 },
  { tier: "platinum", name: "铂金VIP", points: 50000, companionDays: 90, visits: 15, adherence: 90 },
  { tier: "diamond", name: "钻石VIP", points: 100000, companionDays: 180, visits: 30, adherence: 95 },
];

export const VIP_META: Record<VipTierId, { label: string; cls: string }> = {
  none: { label: "普通", cls: "vip-none" },
  gold: { label: "黄金VIP", cls: "vip-gold" },
  platinum: { label: "铂金VIP", cls: "vip-platinum" },
  diamond: { label: "钻石VIP", cls: "vip-diamond" },
};

/* ==================== 4. 领域类型 ==================== */
export type ClinicalRisk = "高" | "中" | "低";
export type VipTier = VipTierId;
export type Stratification = {
  patientId: string;
  risk: ClinicalRisk;
  /** 风险原因（禁止黑箱标签，必须可解释） */
  riskReason: string;
  vip: VipTier;
  vipProgress: { points: number; companionDays: number; visits: number; adherence: number };
  stage: string;
  careNeed: string;
};

/** 患者变化（相对自身基线） */
export type PatientChange = {
  id: string;
  patientId: string;
  headline: string;
  vsBaseline: string;
  duration: string;
  impact: string;
  sources: string[];
  updatedAt: string;
};

/** AI洞察卡固定八段结构 */
export type AIInsightCard = {
  id: string;
  patientId: string;
  title: string;
  model: string;
  confidence: "高" | "中" | "低";
  /** 1 AI发现了什么 */
  finding: string;
  /** 2 与患者自身基线相比发生了什么变化 */
  baselineChange: string;
  /** 3 支撑判断的时间线证据 */
  evidence: { time: string; event: string; source: string }[];
  /** 4 跨角色信息冲突 */
  conflicts: { a: string; b: string; needConfirmBy: string }[];
  /** 5 缺失的关键证据 */
  missingEvidence: string[];
  /** 6 判断的不确定性 */
  uncertainty: string;
  /** 7 可能影响的治疗计划 */
  impact: string[];
  /** 8 下一步备选行动 */
  actions: string[];
};

/** AI备选方案（等待医生确认） */
export type DecisionProposal = {
  id: string;
  patientId: string;
  title: string;
  insightId: string;
  options: { label: string; detail: string; standardAction: string }[];
  /** 需要的补充证据 */
  requiredEvidence: string[];
  deadline: string;
  status: "等待医生确认" | "已确认" | "已驳回";
  /** 责任链：谁发现→谁提出→谁确认→谁执行→谁审核→谁验证 */
  chain: { stage: string; actor: string; note: string }[];
  decidedBy?: string;
  decidedNote?: string;
};

/** 结局验证（自动按时间窗生成） */
export type OutcomeWindow = "数小时" | "24小时" | "3-7天" | "出院后";
export type OutcomeReview = {
  id: string;
  patientId: string;
  trigger: string;
  window: OutcomeWindow;
  dueAt: string;
  metric: string;
  standard: string;
  status: "待验证" | "已达标" | "未达标" | "部分达标";
  result?: string;
  taskGenerated?: string;
};

/** 患者可理解解释（经医生确认后对家属可见） */
export type PatientExplanation = {
  patientId: string;
  planChange: string;
  why: string;
  progress: string;
  nextGoal: string;
  reportSignals: string[];
  visibility: "患者和家属" | "监护人必须可见" | "仅患者";
};

/** 工作量账本：基础分×难度×质量×时效 */
export type WorkloadEntry = {
  id: string;
  staff: string;
  role: string;
  patientId: string;
  standardAction: string;
  base: number; difficulty: number; quality: number; timeliness: number;
  points: number;
  evidence: string;
  auditStatus: "已审核" | "待审核";
  source: string;
  completedAt: string;
};

/** 跨角色冲突（信息冲突识别） */
export type InformationConflict = {
  id: string;
  patientId: string;
  a: { role: string; claim: string; time: string };
  b: { role: string; claim: string; time: string };
  confirmBy: string;
  resolved: boolean;
};

/* ==================== 5. 演示种子数据 ==================== */

export const STRATIFICATIONS: Stratification[] = [
  {
    patientId: "P-042", risk: "高", vip: "platinum", stage: "药物与检查", careNeed: "C3 多专业协作",
    riskReason: "连续3晚睡眠碎片化＋昨夜拒药一次＋家庭应激后情绪波动，医护治疗联合管理",
    vipProgress: { points: 62000, companionDays: 112, visits: 18, adherence: 91 },
  },
  {
    patientId: "P-018", risk: "中", vip: "gold", stage: "院外复诊", careNeed: "C2 加强监测",
    riskReason: "复诊前处方记录与自述不一致，需核对实际服药方案",
    vipProgress: { points: 14000, companionDays: 41, visits: 6, adherence: 82 },
  },
  {
    patientId: "P-051", risk: "中", vip: "platinum", stage: "院外复诊", careNeed: "C2 加强监测",
    riskReason: "出院后睡眠数据连续缺失3天，存在失访风险",
    vipProgress: { points: 55000, companionDays: 95, visits: 16, adherence: 88 },
  },
  {
    patientId: "P-063", risk: "低", vip: "none", stage: "入院评估", careNeed: "C1 常规随访",
    riskReason: "新入院评估阶段，主诉与既往史齐备，暂无异常信号",
    vipProgress: { points: 0, companionDays: 0, visits: 1, adherence: 100 },
  },
  {
    patientId: "P-009", risk: "低", vip: "gold", stage: "稳定与安全", careNeed: "C1 常规随访",
    riskReason: "病情稳定，护理记录嗜睡待病程同步",
    vipProgress: { points: 12000, companionDays: 35, visits: 7, adherence: 85 },
  },
  {
    patientId: "P-034", risk: "低", vip: "none", stage: "出院准备", careNeed: "C1 常规随访",
    riskReason: "功能评估达标，出院条件已确认",
    vipProgress: { points: 2600, companionDays: 8, visits: 1, adherence: 95 },
  },
  {
    patientId: "P-027", risk: "低", vip: "none", stage: "药物与检查", careNeed: "C2 加强监测",
    riskReason: "肝功能检查外院互认中，无急性风险",
    vipProgress: { points: 800, companionDays: 3, visits: 1, adherence: 90 },
  },
];

export const PATIENT_CHANGES: PatientChange[] = [
  {
    id: "PC-001", patientId: "P-042", headline: "夜间睡眠恶化并出现拒药",
    vsBaseline: "夜醒次数 2→6 次/夜；HRV 低于基线 38%；本周拒药 0→1 次",
    duration: "已持续 3 晚", impact: "影响药物滴定节奏与本周会谈靶点",
    sources: ["手环", "晚星机器人", "护士 沈的护理记录"], updatedAt: "07:20",
  },
  {
    id: "PC-002", patientId: "P-018", headline: "服药自述与处方记录不一致",
    vsBaseline: "自述「已正常服药」，eMAR 显示近3日 2 次推迟",
    duration: "复诊前发现", impact: "影响复诊时的方案调整判断",
    sources: ["复诊机器人", "eMAR"], updatedAt: "08:36",
  },
  {
    id: "PC-003", patientId: "P-051", headline: "院外睡眠数据连续缺失",
    vsBaseline: "手环上传由每日 → 连续 3 天无数据",
    duration: "3 天", impact: "出院后复发风险监测出现盲区",
    sources: ["失访追踪 Skill"], updatedAt: "07:50",
  },
];

/** P-042 失眠链路：核心 AI 洞察（验收流程步骤 2-4 的载体） */
export const COPILOT_INSIGHTS: AIInsightCard[] = [
  {
    id: "AI-042-SLEEP", patientId: "P-042",
    title: "睡眠恶化与拒药可能共同指向家庭应激加重",
    model: "Copilot 2.0 · 个案纵向模型 v3.2", confidence: "中",
    finding: "P-042 连续 3 晚睡眠碎片化进行性加重，昨夜出现一次拒药，与 06:40 家庭通话后情绪波动在时间上聚集，可能与家庭应激有关，而非单纯药物不良反应。",
    baselineChange: "相对该患者入院第 1-5 天基线：夜醒 2→6 次/夜，HRV 下降 38%，晨起情绪自评 6→4 分（10 分制）。",
    evidence: [
      { time: "02:10", event: "睡眠碎片化（夜醒 6 次）", source: "手环" },
      { time: "02:18", event: "HRV 降至基线 -38%", source: "手环" },
      { time: "02:32", event: "识别夜间情绪波动，启动陪伴对话", source: "晚星机器人" },
      { time: "06:40", event: "家庭通话（母亲），通话后情绪波动", source: "病区记录" },
      { time: "07:20", event: "确认拒药一次（晚间喹硫平）", source: "护士 沈" },
      { time: "前日 16:00", event: "会谈中两次回避家庭话题", source: "治疗师记录" },
    ],
    conflicts: [
      { a: "患者自述「昨晚已正常服药」", b: "护士 沈记录「07:20 确认拒药一次」", needConfirmBy: "护士端复核实际服药情形" },
      { a: "家属（母亲）反馈「最近睡眠改善」", b: "手环数据显示夜醒 6 次且呈加重趋势", needConfirmBy: "护士端补充家庭观察口径" },
    ],
    missingEvidence: ["近 3 日情绪量表未完成", "家庭通话内容无结构化记录", "喹硫平血药浓度未测"],
    uncertainty: "睡眠数据来自单一手环设备，需护理夜间观察佐证；家庭应激假设置信度中等，尚不能排除药物剂量因素。",
    impact: ["药物滴定节奏（是否暂停加量）", "本周心理治疗会谈靶点", "出院时间线评估", "家属沟通策略"],
    actions: ["补充针对性问诊（家庭事件 + 睡眠主观体验）", "补开简易睡眠量表 + 护理夜间观察 2 晚", "备选：喹硫平血药浓度检查", "备选：联络会诊评估药物调整"],
  },
  {
    id: "AI-018-MED", patientId: "P-018",
    title: "复诊前服药记录与自述冲突需当面核对",
    model: "Copilot 2.0 · 用药核对 v1.8", confidence: "高",
    finding: "P-018 复诊前自述与 eMAR 记录不一致，若不核对，复诊方案调整将建立在错误的依从性判断上。",
    baselineChange: "eMAR 近 3 日 2 次服药推迟（既往基线：按时率 100%）。",
    evidence: [
      { time: "08:36", event: "复诊摘要生成，标记依从性不一致", source: "复诊机器人" },
      { time: "近3日", event: "eMAR 记录 2 次推迟服药", source: "eMAR" },
    ],
    conflicts: [
      { a: "患者自述「按时服药」", b: "eMAR 记录 2 次推迟", needConfirmBy: "医生复诊当面核对" },
    ],
    missingEvidence: ["推迟服药的原因（副作用？遗忘？）"],
    uncertainty: "eMAR 可能有操作延迟记录，冲突置信度高但原因未知。",
    impact: ["复诊时的剂量调整决策", "是否需要用药提醒干预"],
    actions: ["复诊时当面核对实际服药情形", "若为副作用导致，评估减量方案"],
  },
];

/** 待确认方案（医生端核心） */
export const DECISION_PROPOSALS: DecisionProposal[] = [
  {
    id: "DP-001", patientId: "P-042", insightId: "AI-042-SLEEP",
    title: "P-042 睡眠恶化处置：先补充证据，再决定药物调整",
    options: [
      { label: "方案A · 补充证据优先", detail: "补开简易睡眠量表＋护理夜间观察 2 晚＋针对性问诊；暂不调整药物", standardAction: "生成护理观察任务＋问诊任务" },
      { label: "方案B · 检查先行", detail: "加测喹硫平血药浓度，依据结果决定剂量", standardAction: "生成检查任务＋结果追踪" },
      { label: "方案C · 会诊评估", detail: "联络精神科会诊，评估药物调整与家庭干预并行", standardAction: "生成会诊申请＋家属沟通任务" },
    ],
    requiredEvidence: ["近 3 日情绪量表", "家庭通话结构化记录"],
    deadline: "今日 12:00 前", status: "等待医生确认",
    chain: [
      { stage: "发现问题", actor: "护士 沈", note: "一键上报拒药与行为异常" },
      { stage: "提出方案", actor: "Copilot 2.0", note: "串联 3 晚数据生成三套备选方案" },
      { stage: "确认方案", actor: "—", note: "等待医生（一线 王1 / 二线 孙）确认" },
      { stage: "实际执行", actor: "—", note: "确认后自动拆解至护士/治疗师" },
      { stage: "审核", actor: "—", note: "二线医生审核（涉及药物调整时）" },
      { stage: "验证结局", actor: "—", note: "数小时/24小时/3-7天自动回看" },
    ],
  },
  {
    id: "DP-002", patientId: "P-018", insightId: "AI-018-MED",
    title: "P-018 复诊前核对实际服药方案",
    options: [
      { label: "方案A · 复诊当面核对", detail: "复诊时由医生当面核对服药情形并记录", standardAction: "生成复诊准备任务" },
      { label: "方案B · 提前电话核对", detail: "复诊前由护士电话核对并结构化记录", standardAction: "生成电话核对任务" },
    ],
    requiredEvidence: ["推迟服药原因"],
    deadline: "复诊前", status: "等待医生确认",
    chain: [
      { stage: "发现问题", actor: "复诊机器人", note: "摘要生成时标记不一致" },
      { stage: "提出方案", actor: "Copilot 2.0", note: "生成两套核对方案" },
      { stage: "确认方案", actor: "—", note: "等待医生确认" },
    ],
  },
];

/** 结局验证计划 */
export const OUTCOME_REVIEWS: OutcomeReview[] = [
  {
    id: "OR-001", patientId: "P-042", trigger: "拒药与夜间情绪波动处置", window: "数小时",
    dueAt: "今日 14:00", metric: "情绪波动是否平复、无新发安全事件", standard: "护理巡视 1 次确认安全状态",
    status: "待验证", taskGenerated: "T-2410",
  },
  {
    id: "OR-002", patientId: "P-042", trigger: "睡眠干预（环境+陪伴）", window: "24小时",
    dueAt: "明晨 08:00", metric: "夜醒次数较昨夜下降", standard: "手环数据 vs 昨夜基线对比＋护理观察",
    status: "待验证",
  },
  {
    id: "OR-003", patientId: "P-042", trigger: "会谈靶点调整后疗效", window: "3-7天",
    dueAt: "09-12", metric: "PHQ-9 复评＋会谈回避行为减少", standard: "量表复评 + 治疗师记录对比",
    status: "待验证",
  },
  {
    id: "OR-004", patientId: "P-051", trigger: "出院后睡眠监测恢复", window: "出院后",
    dueAt: "09-08", metric: "手环数据上传恢复连续 3 天", standard: "失访追踪 Skill 自动回看",
    status: "待验证", taskGenerated: "T-2404",
  },
  {
    id: "OR-005", patientId: "P-034", trigger: "出院条件确认", window: "出院后",
    dueAt: "已完成", metric: "出院 72 小时随访完成", standard: "随访登记台账闭环",
    status: "已达标", result: "09-04 随访完成，家属陪护到位",
  },
];

/** 患者可理解解释（P-042，经医生确认后对家属端可见） */
export const PATIENT_EXPLANATIONS: PatientExplanation[] = [
  {
    patientId: "P-042",
    planChange: "今天的治疗计划有一处调整：晚间增加一次护理观察，本周心理治疗会更多关注家庭沟通话题。",
    why: "最近几个晚上睡眠质量下降，医疗团队希望通过更细致的观察和沟通来找到原因，而不是直接调整药物。",
    progress: "整体康复仍在正常轨道上：情绪自评已从入院时的 3 分恢复到 4 分，白天活动参与度保持稳定。",
    nextGoal: "未来 3 天目标：夜间连续睡眠 5 小时以上，家庭沟通练习完成 1 次。",
    reportSignals: ["连续 2 晚几乎无法入睡", "出现伤害自己的念头", "拒绝服药连续 2 次", "情绪突然剧烈波动"],
    visibility: "患者和家属",
  },
];

/** 工作量账本（演示治理中枢下钻） */
export const WORKLOAD_LEDGER: WorkloadEntry[] = [
  { id: "W-001", staff: "沈", role: "护士", patientId: "P-042", standardAction: "夜间巡视＋拒药确认", base: 10, difficulty: 1.2, quality: 1.0, timeliness: 1.1, points: 13, evidence: "护理记录 07:20", auditStatus: "已审核", source: "人工填报", completedAt: "07:20" },
  { id: "W-002", staff: "杨1", role: "治疗师", patientId: "P-042", standardAction: "心理治疗（含靶点调整）", base: 20, difficulty: 1.3, quality: 1.0, timeliness: 1.0, points: 26, evidence: "治疗记录＋会谈摘要", auditStatus: "已审核", source: "AI提取+确认", completedAt: "前日 16:00" },
  { id: "W-003", staff: "王1", role: "医生", patientId: "P-042", standardAction: "AI方案确认＋医嘱调整", base: 30, difficulty: 1.5, quality: 1.0, timeliness: 1.0, points: 45, evidence: "医嘱记录", auditStatus: "待审核", source: "系统生成", completedAt: "今日 10:30" },
  { id: "W-004", staff: "李", role: "护士", patientId: "P-042", standardAction: "补充夜间观察（方案A）", base: 10, difficulty: 1.0, quality: 1.0, timeliness: 1.0, points: 10, evidence: "观察记录", auditStatus: "待审核", source: "任务执行", completedAt: "今日 11:00" },
  { id: "W-005", staff: "彭1", role: "管家", patientId: "P-051", standardAction: "VIP随访联络", base: 8, difficulty: 1.0, quality: 1.0, timeliness: 0.9, points: 7, evidence: "联络记录", auditStatus: "已审核", source: "人工填报", completedAt: "09:15" },
];

/** 跨角色冲突独立清单（洞察中台呈现） */
export const INFO_CONFLICTS: InformationConflict[] = [
  {
    id: "IC-001", patientId: "P-042",
    a: { role: "患者", claim: "昨晚已正常服药", time: "08:02" },
    b: { role: "护士 沈记录", claim: "07:20 确认拒药一次", time: "07:20" },
    confirmBy: "护士端复核实际服药情形", resolved: false,
  },
  {
    id: "IC-002", patientId: "P-042",
    a: { role: "家属（母亲）", claim: "最近睡眠改善", time: "昨日" },
    b: { role: "手环数据", claim: "夜醒 6 次且加重趋势", time: "02:10" },
    confirmBy: "护士端补充家庭观察口径", resolved: false,
  },
  {
    id: "IC-003", patientId: "P-042",
    a: { role: "医生（晨交班）", claim: "情绪稳定", time: "08:00" },
    b: { role: "治疗师记录", claim: "会谈中功能话题回避、情绪负荷上升", time: "前日 16:00" },
    confirmBy: "医生端查看会谈摘要复核", resolved: false,
  },
];

/** 治理中枢 · AI 管理洞察（自然语言解释，非排名） */
export const MANAGEMENT_INSIGHTS: { id: string; question: string; answer: string; tone: "warn" | "info" | "good" }[] = [
  {
    id: "MI-001", question: "夜班护理负荷高的原因",
    answer: "近 7 日夜班巡视任务集中在 2 名护士（沈、袁），主要因为 C3/C4 患者从 6 人增至 9 人，其中 3 人需要每小时巡视。属于复杂患者集中，而非重复低价值任务；建议评估夜间人力配置或调整巡视分级。",
    tone: "warn",
  },
  {
    id: "MI-002", question: "治疗师杨1工作量偏低的原因",
    answer: "核对任务链后：杨1 近 3 日 2 个治疗时段因患者治疗暂停（非本人原因），暂停时段未进入配合度分母也未计工作量，属实际任务减少，不是数据缺失。已有 2 个补录时段待排期。",
    tone: "info",
  },
  {
    id: "MI-003", question: "VIP权益履约风险",
    answer: "铂金患者 P-051 的「出院后专属随访」权益已连续 3 天未按时履约（数据缺失导致无法确认），是当前唯一长期超时项。根因是患者手环数据中断，已转管家联络。",
    tone: "warn",
  },
  {
    id: "MI-004", question: "流程瓶颈定位",
    answer: "患者从「医生确认方案」到「护士开始执行」平均等待 74 分钟，是全院最长节点。主要卡在医嘱系统与任务系统的手工同步，建议接入 HIS 医嘱接口自动化。",
    tone: "info",
  },
  {
    id: "MI-005", question: "高价值工作识别",
    answer: "本周投入人力最多的是「日常巡视」（310 人次），但与患者结局改善关联最弱；「针对性问诊＋结局验证」组合虽仅 28 人次，关联到 5 例方案优化。建议保持巡视分级策略，把人力向验证型任务倾斜。",
    tone: "good",
  },
];

/** 异常快速上报 · 异常类型目录（护士端渐进式向导） */
export const ABNORMAL_TYPES = [
  "自伤/自杀", "冲动/激越", "拒药", "漏药", "不良反应", "睡眠异常", "情绪变化", "行为变化", "社会互动变化", "治疗耐受异常", "治疗后异常", "其他异常",
] as const;

export const ABNORMAL_SEVERITY = ["需立即处置", "高", "中", "低"] as const;
