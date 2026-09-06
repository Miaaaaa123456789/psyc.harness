import {
  Stethoscope, ClipboardCheck, HeartPulse, UserRound, UsersRound, Route, Gauge, Building2,
  MessageSquareText, History, MoonStar, BrainCircuit, type LucideIcon,
} from "lucide-react";

/* ============ 角色 ============ */
export type RoleId = "doctor" | "nurse" | "therapist" | "patient" | "family" | "butler" | "ops" | "leader";

export type Role = {
  id: RoleId;
  name: string;
  note: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "rose" | "cyan" | "violet" | "amber";
  readonly?: boolean;
  inputs: string[];
  outputs: string[];
};

export const roles: Role[] = [
  {
    id: "doctor", name: "医生端", note: "临床决策与复核", icon: Stethoscope, tone: "blue",
    inputs: ["确认横向服药卡", "接受、修改或驳回建议", "补充诊断与关键临床判断", "确认处方、住院、出院等医疗决策"],
    outputs: ["最近24小时变化", "完整患者时间线", "实际服药与医嘱差异", "异常检查与未执行检查", "症状和风险变化", "今天必须由医生决定的事项", "治疗路径比较及不确定性"],
  },
  {
    id: "nurse", name: "护士端", note: "执行确认与现场处置", icon: ClipboardCheck, tone: "green",
    inputs: ["一键报告拒药、自伤、冲突、睡眠异常等重要事件", "确认现场观察", "完成系统生成的巡视任务"],
    outputs: ["今日重点巡视患者", "服药异常", "夜间异常摘要", "需要升级医生评估的事件", "交班重点"],
  },
  {
    id: "therapist", name: "治疗师端", note: "治疗记录与个案概念化", icon: HeartPulse, tone: "rose",
    inputs: ["选择题式治疗进展报告", "会谈主题确认", "风险事件和治疗目标确认"],
    outputs: ["自动会谈摘要", "动态个案概念化", "当前维持因素", "下一次治疗靶点", "治疗进展和跨部门相关事件"],
  },
  {
    id: "patient", name: "患者端", note: "轻交互、理解治疗进程", icon: UserRound, tone: "cyan",
    inputs: ["非强制性日常反馈", "语音、触屏、手环和机器人交互", "治疗偏好和知情确认"],
    outputs: ["当前治疗阶段", "已完成的治疗任务", "治疗航图", "精彩瞬间", "下一步安排", "个体化心理教育和自助任务"],
  },
  {
    id: "family", name: "家属端", note: "家庭支持与关键反馈", icon: UsersRound, tone: "violet",
    inputs: ["关键事件确认", "家庭观察", "治疗偏好", "家庭任务反馈"],
    outputs: ["治疗进度", "医护最近完成的工作", "家庭当前需要配合什么", "出院与复诊安排", "可公开范围内的患者变化"],
  },
  {
    id: "butler", name: "管家端", note: "预约接续与跨部门协调", icon: Route, tone: "amber",
    inputs: ["预约、到诊和联络处理结果", "跨部门协调进度"],
    outputs: ["未到诊患者", "失访风险", "今日待联络名单", "未闭环服务", "跨部门卡点"],
  },
  {
    id: "ops", name: "运营端", note: "流程治理与运行监测", icon: Gauge, tone: "violet",
    inputs: ["异常流程处理", "任务归属和流程配置", "机器人与Skill启停"],
    outputs: ["工作量", "响应时效", "任务闭环率", "机器人有效率", "部门资源负荷", "审计日志"],
  },
  {
    id: "leader", name: "院领导端", note: "只读 · 全院运行态势", icon: Building2, tone: "blue", readonly: true,
    inputs: [],
    outputs: ["医院脉冲", "今日在院与服务人数", "各部门负荷", "人机协作效率", "节约的专业工时", "风险响应时间", "实施进度", "AI Native医院演进路线"],
  },
];

/* ============ 机器人 ============ */
export type RobotStatus = "运行中" | "待命" | "需校准";

export type Robot = {
  id: string;
  name: string;
  short: string;
  dept: string;
  icon: LucideIcon;
  status: RobotStatus;
  physical?: boolean;
  description: string;
  reads: string[];
  outputs: string[];
  handoff: string;
  done: number;
  pending: number;
  accent: "cyan" | "blue" | "violet" | "amber";
  roles: RoleId[];
  escalation: string;
  ownerOfSwitch: string;
  workspace: string;
};

export const robots: Robot[] = [
  {
    id: "PRE-01", name: "预问诊机器人", short: "预问诊", dept: "门诊中心", icon: MessageSquareText, status: "运行中", accent: "cyan",
    description: "在患者到院前完成主诉、病史与风险相关信息采集，生成可复核的预问诊病历。",
    reads: ["预约信息", "患者对话", "既往就诊记录"],
    outputs: ["结构化主诉", "现病史草稿", "风险初筛", "预问诊病历"],
    handoff: "医生确认预问诊病历后方可进入正式诊疗。",
    done: 8, pending: 2, roles: ["doctor", "butler", "ops"],
    escalation: "发现自伤、伤人风险或严重躯体症状时，立即升级人工并通知当班医生。",
    ownerOfSwitch: "门诊中心负责人 + 运营端",
    workspace: "门诊医生工作站 · 预问诊病历页",
  },
  {
    id: "REVISIT-01", name: "复诊机器人", short: "复诊", dept: "门诊中心 · 健康管理中心", icon: History, status: "运行中", accent: "blue",
    description: "复诊前追踪症状、实际用药、不良反应与社会功能变化，生成纵向病程摘要。",
    reads: ["上次病历", "处方", "检查", "患者复诊对话"],
    outputs: ["症状变化", "实际服药", "不良反应", "社会功能", "复诊摘要"],
    handoff: "医生完成诊疗决策。",
    done: 6, pending: 1, roles: ["doctor", "butler", "ops"],
    escalation: "患者报告新增自杀意念、停药或症状急性加重时，升级医生优先处置。",
    ownerOfSwitch: "健康管理中心负责人 + 运营端",
    workspace: "复诊医生工作站 · 复诊摘要页",
  },
  {
    id: "NIGHTSTAR-01", name: "晚星失眠陪伴机器人", short: "晚星", dept: "住院病区", icon: MoonStar, status: "需校准", accent: "violet", physical: true,
    description: "面向夜间入睡困难与情绪波动的住院患者，提供陪伴对话与 CBT-I 微干预。",
    reads: ["夜间对话", "护理事件", "睡眠与手环数据"],
    outputs: ["夜间陪伴", "CBT-I微干预", "睡眠变化", "风险升级任务"],
    handoff: "护士现场确认，高风险升级医生。",
    done: 3, pending: 2, roles: ["nurse", "doctor", "ops"],
    escalation: "识别自伤言语、严重惊恐发作或连续睡眠碎片化时，直接唤醒值班护士并升级医生。",
    ownerOfSwitch: "护理部负责人 + 运营端",
    workspace: "护士站夜间面板 · 睡眠监测页",
  },
  {
    id: "COPILOT-20", name: "连续个案管理 Copilot 2.0", short: "Copilot 2.0", dept: "医疗部 · 护理部 · 心理治疗中心 · 院外服务", icon: BrainCircuit, status: "运行中", accent: "amber",
    description: "汇总全量院内数据，维护患者时间线与个案概念化，驱动跨部门任务闭环。",
    reads: ["病历", "医嘱", "电子药卡", "检查", "量表", "护理记录", "治疗记录", "机器人事件"],
    outputs: ["患者时间线", "今日变化摘要", "个案概念化", "跨部门任务", "治疗航图", "出院与复诊衔接"],
    handoff: "各责任角色在任务中心确认后生效。",
    done: 14, pending: 4, roles: ["doctor", "nurse", "therapist", "family", "butler", "ops"],
    escalation: "任何风险等级为高的输出，一律等待人工确认，不允许自动执行。",
    ownerOfSwitch: "医疗部负责人 + 运营端",
    workspace: "全部角色工作台 · 今日总览页",
  },
];

/* ============ Skill ============ */
export type SkillCard = {
  name: string;
  reads: string;
  outputs: string;
  toWhom: string;
  placement: string;
  value: string;
  note?: string;
};

export const hospitalWideSkills: SkillCard[] = [
  { name: "患者时间线 Skill", reads: "病历、医嘱、护理、治疗、量表、检查", outputs: "统一纵向时间线", toWhom: "全角色", placement: "首页、查房、交班", value: "不再人工翻阅病程" },
  { name: "今日变化摘要 Skill", reads: "最近24小时新增数据", outputs: "新增、变化、缺失、冲突信息", toWhom: "医生、护士、治疗师", placement: "每日工作台", value: "只看真正发生变化的内容" },
  { name: "服药核对 Skill", reads: "医嘱、eMAR、电子药卡、患者陈述", outputs: "漏服、剂量冲突、记录不一致", toWhom: "医生、护士", placement: "查房、复诊", value: "减少用药信息错误" },
  { name: "检查结果追踪 Skill", reads: "HIS、LIS、检查申请与结果", outputs: "异常、待回报、未执行检查", toWhom: "医生、护士", placement: "查房、复诊前", value: "不再手工逐项查找" },
  { name: "任务生成 Skill", reads: "异常事件、未完成医嘱、机器人结果", outputs: "责任人、时限、处理动作", toWhom: "对应责任人", placement: "任务中心", value: "把发现问题转化为明确待办" },
  { name: "任务闭环 Skill", reads: "接受、驳回、完成和原因", outputs: "闭环状态、超时和责任追踪", toWhom: "运营、临床负责人", placement: "部门协同", value: "防止机器人提示后无人处理" },
];

export type RoleSkills = {
  roleId: RoleId;
  p0: SkillCard[];
  p1: string[];
  p2: string[];
  p3: string[];
};

export const roleSkills: RoleSkills[] = [
  {
    roleId: "doctor",
    p0: [
      { name: "病历规范化管理 Skill", reads: "门诊、住院与复诊病历", outputs: "标准字段、统一术语、缺失项与时间戳", toWhom: "医生", placement: "病历编辑页", value: "减少书写与核对时间",
        note: "支持一线、二线医生责任分离；实际执行人与系统账号分离；每次修改保留操作人、责任人、时间、版本和修改原因，避免多人共用账号无法追责。" },
      { name: "医嘱一致性检查 Skill", reads: "医嘱、eMAR、电子药卡", outputs: "剂量、频次与记录冲突", toWhom: "医生、护士", placement: "开立医嘱时", value: "减少医嘱执行偏差" },
      { name: "查房摘要 Skill", reads: "医嘱、护理事件、服药与睡眠", outputs: "今日查房必须处理的问题", toWhom: "医生", placement: "查房工作台", value: "查房前不再翻阅病程" },
      { name: "复诊摘要 Skill", reads: "上次病历、处方、检查与随访对话", outputs: "复诊要点与变化摘要", toWhom: "医生", placement: "复诊工作站", value: "复诊准备时间减半" },
      { name: "风险重新评估 Skill", reads: "最近事件、量表与护理观察", outputs: "风险等级变化与依据", toWhom: "医生", placement: "查房与任务中心", value: "风险变化即时可见" },
      { name: "出院条件核对 Skill", reads: "病程、医嘱执行、功能评估与家属反馈", outputs: "出院条件清单与未满足项", toWhom: "医生", placement: "出院准备页", value: "出院评估不再遗漏" },
    ],
    p1: ["疗效趋势识别", "不良反应追踪", "诊疗证据检索", "医嘱执行闭环"],
    p2: ["疗效平台期预测", "短期风险状态变化", "差异性治疗获益估计"],
    p3: ["个体治疗反事实推演", "患者长期世界模型"],
  },
  {
    roleId: "nurse",
    p0: [
      { name: "护理交班摘要 Skill", reads: "本班护理记录、事件与任务", outputs: "交班重点与未完成事项", toWhom: "护士", placement: "交班页", value: "手工交班变为确认" },
      { name: "重大事件快速报告 Skill", reads: "一键上报与现场观察", outputs: "结构化事件与升级路径", toWhom: "护士、护士长", placement: "护理站", value: "上报时间小于15秒" },
      { name: "拒药与漏服识别 Skill", reads: "eMAR、电子药卡、患者陈述", outputs: "拒药、漏服与剂量差异", toWhom: "护士、医生", placement: "发药核对页", value: "用药异常不再遗漏" },
      { name: "夜间状态摘要 Skill", reads: "晚星事件、手环与巡视记录", outputs: "夜间异常摘要", toWhom: "护士、医生", placement: "晨交班页", value: "夜班信息不再口头传递" },
      { name: "重点巡视名单 Skill", reads: "风险等级、昨夜事件与医嘱", outputs: "巡视对象、原因与频次", toWhom: "护士", placement: "巡视工作台", value: "重复巡视改为按需巡视" },
      { name: "未执行医嘱追踪 Skill", reads: "医嘱与执行记录", outputs: "未执行与延迟医嘱清单", toWhom: "护士、医生", placement: "任务中心", value: "医嘱执行不再悬空" },
    ],
    p1: ["睡眠与活动变化", "病区状态日报", "健康教育匹配"],
    p2: ["护理风险趋势预测", "动态巡视等级建议"],
    p3: ["病区运行数字孪生", "自适应护理资源调度"],
  },
  {
    roleId: "therapist",
    p0: [
      { name: "会谈转录摘要 Skill", reads: "会谈语音（脱敏）与笔记", outputs: "自动会谈摘要", toWhom: "治疗师", placement: "治疗记录页", value: "记录时间大幅减少" },
      { name: "选择题式治疗进展报告 Skill", reads: "本次会谈观察", outputs: "结构化进展报告", toWhom: "治疗师", placement: "治疗后", value: "30秒完成进展记录" },
      { name: "个案概念化更新 Skill", reads: "全部院内事件与治疗记录", outputs: "动态个案概念化", toWhom: "治疗师、医生", placement: "个案页", value: "概念化随数据自动更新" },
      { name: "治疗目标追踪 Skill", reads: "治疗计划与进展报告", outputs: "目标完成度与偏移", toWhom: "治疗师", placement: "个案页", value: "目标不再流于形式" },
      { name: "下一次会谈靶点 Skill", reads: "上次记录与近期事件", outputs: "下次会谈靶点建议", toWhom: "治疗师", placement: "今日工作台", value: "会谈准备有据可依" },
      { name: "风险事件升级 Skill", reads: "会谈中的风险信号", outputs: "升级任务与通知", toWhom: "医生、护士", placement: "任务中心", value: "风险即时进入责任链" },
    ],
    p1: ["家庭互动模式整理", "DBT技能追踪", "团体治疗记录"],
    p2: ["治疗反应模式识别", "个体化干预内容推荐"],
    p3: ["心理治疗路径推演", "长期个案机制模型"],
  },
  {
    roleId: "butler",
    p0: [
      { name: "预约提醒 Skill", reads: "预约与到诊记录", outputs: "提醒名单与话术", toWhom: "管家", placement: "管家工作台", value: "提醒不再逐个电话" },
      { name: "未到诊识别 Skill", reads: "预约与实际到诊", outputs: "未到诊患者名单", toWhom: "管家", placement: "管家工作台", value: "未到诊即时发现" },
      { name: "失访追踪 Skill", reads: "复诊计划与联络记录", outputs: "失访风险与追踪任务", toWhom: "管家", placement: "任务中心", value: "连续随访改为异常驱动" },
      { name: "跨部门任务路由 Skill", reads: "医护、患者与机器人任务", outputs: "接收人、时限与状态", toWhom: "对应部门", placement: "部门协同", value: "跨部门不再口头转达" },
      { name: "出院后首次复诊衔接 Skill", reads: "出院记录与复诊计划", outputs: "衔接任务与提醒", toWhom: "管家、医生", placement: "任务中心", value: "出院不断档" },
    ],
    p1: ["复诊优先级排序", "空档期自动补位", "服务路径优化"],
    p2: ["到诊概率预测", "服务需求预测"],
    p3: ["患者服务路径仿真"],
  },
  {
    roleId: "ops",
    p0: [
      { name: "任务闭环审计 Skill", reads: "任务全生命周期日志", outputs: "闭环率、超时与责任追踪", toWhom: "运营、临床负责人", placement: "运行与审计页", value: "提示不再无人处理" },
      { name: "部门工作量统计 Skill", reads: "各部门任务与工时", outputs: "工作量分布与趋势", toWhom: "运营", placement: "运行与审计页", value: "负荷可视可调度" },
      { name: "机器人有效率 Skill", reads: "机器人输出与人工确认结果", outputs: "有效率与接管率", toWhom: "运营", placement: "运行与审计页", value: "用真实结果评价机器人" },
      { name: "响应时效 Skill", reads: "任务生成到处理的时间", outputs: "响应时长分布", toWhom: "运营", placement: "运行与审计页", value: "发现流程卡点" },
      { name: "数据缺失监测 Skill", reads: "各系统字段与时间戳", outputs: "缺失、重复与延迟", toWhom: "运营", placement: "运行与审计页", value: "数据质量持续可视" },
      { name: "权限与版本审计 Skill", reads: "访问记录与Skill版本", outputs: "越权访问与版本变更", toWhom: "运营、院领导", placement: "运行与审计页", value: "治理有据可查" },
    ],
    p1: ["部门工作量比较", "警报负担分析", "资源瓶颈识别"],
    p2: ["床位与人员需求预测", "医院资源动态调度"],
    p3: ["医院运行数字孪生"],
  },
];

/* ============ 任务 ============ */
export type TaskStatus = "机器人处理中" | "等待人工确认" | "已接受" | "已转交" | "处理中" | "已完成" | "已驳回" | "已超时";

export type RiskLevel = "高" | "中" | "低";

export type TaskLogEntry = { time: string; actor: string; action: string };

export type HospitalTask = {
  id: string;
  patient: string;
  title: string;
  source: string;
  triggerTime: string;
  evidence: string;
  risk: RiskLevel;
  owner: string;
  ownerRole: RoleId | null;
  deadline: string;
  status: TaskStatus;
  log: TaskLogEntry[];
  demoStep?: number;
};

export const initialTasks: HospitalTask[] = [
  {
    id: "T-2410", patient: "P-042", title: "现场核查昨夜拒药与情绪波动", source: "晚星失眠陪伴机器人", triggerTime: "07:20",
    evidence: "02:10 睡眠碎片化 ＋ 02:18 HRV下降 ＋ 07:20 确认拒药一次 ＋ 家庭通话后情绪波动", risk: "高",
    owner: "护理部", ownerRole: "nurse", deadline: "30分钟内", status: "等待人工确认",
    log: [
      { time: "02:32", actor: "晚星机器人", action: "识别夜间情绪波动并生成夜间事件" },
      { time: "07:20", actor: "护士 李敏", action: "一键确认一次拒药" },
      { time: "07:21", actor: "任务生成 Skill", action: "创建本任务并分派护理部" },
    ], demoStep: 5,
  },
  {
    id: "T-2411", patient: "P-042", title: "复核服药方案与记录冲突", source: "服药核对 Skill", triggerTime: "08:10",
    evidence: "eMAR 记录已服药，电子药卡显示漏服一次，患者自述昨夜未服", risk: "高",
    owner: "医疗部", ownerRole: "doctor", deadline: "今日 12:00 前", status: "等待人工确认",
    log: [
      { time: "08:05", actor: "Copilot 2.0", action: "更新患者状态与今日摘要" },
      { time: "08:10", actor: "服药核对 Skill", action: "发现记录冲突并创建医生复核任务" },
    ], demoStep: 6,
  },
  {
    id: "T-2412", patient: "P-042", title: "调整今日会谈靶点", source: "Copilot 2.0", triggerTime: "09:00",
    evidence: "家庭通话后情绪波动，连续两次会谈出现主题回避", risk: "中",
    owner: "心理治疗中心", ownerRole: "therapist", deadline: "今日 15:00 前", status: "等待人工确认",
    log: [
      { time: "08:52", actor: "Copilot 2.0", action: "个案概念化更新：家庭话题进入维持因素" },
      { time: "09:00", actor: "任务生成 Skill", action: "创建会谈靶点调整任务" },
    ], demoStep: 7,
  },
  {
    id: "T-2408", patient: "P-018", title: "确认复诊前实际服药方案", source: "复诊机器人", triggerTime: "08:36",
    evidence: "处方记录与患者自述不一致", risk: "中", owner: "门诊中心", ownerRole: "doctor", deadline: "复诊前",
    status: "等待人工确认", log: [{ time: "08:36", actor: "复诊机器人", action: "生成复诊摘要并标记不一致" }],
  },
  {
    id: "T-2406", patient: "P-063", title: "生成门诊预问诊病历", source: "预问诊机器人", triggerTime: "08:20",
    evidence: "主诉、既往史与量表已齐备", risk: "低", owner: "门诊中心", ownerRole: "doctor", deadline: "11:30 前",
    status: "处理中", log: [{ time: "08:20", actor: "预问诊机器人", action: "完成预问诊病历，等待医生确认" }],
  },
  {
    id: "T-2404", patient: "P-051", title: "出院后首次复诊接续", source: "Copilot 2.0", triggerTime: "07:50",
    evidence: "复诊日临近，院外睡眠数据连续缺失 3 天", risk: "中", owner: "健康管理中心", ownerRole: "butler", deadline: "今日 18:00 前",
    status: "处理中", log: [{ time: "07:50", actor: "失访追踪 Skill", action: "识别失访风险并联络管家" }],
  },
  {
    id: "T-2403", patient: "P-009", title: "核对药物不良反应记录", source: "Copilot 2.0", triggerTime: "昨日 22:14",
    evidence: "护理记录出现嗜睡，病程记录尚未同步", risk: "低", owner: "医疗部", ownerRole: "doctor", deadline: "今日 14:00 前",
    status: "已超时", log: [
      { time: "昨日 22:14", actor: "Copilot 2.0", action: "发现记录不同步" },
      { time: "09:00", actor: "任务闭环 Skill", action: "标记超时并通知运营端" },
    ],
  },
  {
    id: "T-2399", patient: "P-034", title: "出院条件核对", source: "出院条件核对 Skill", triggerTime: "昨日 16:40",
    evidence: "功能评估达标，家属陪护安排已确认", risk: "低", owner: "医疗部", ownerRole: "doctor", deadline: "已完成",
    status: "已完成", log: [
      { time: "昨日 16:40", actor: "出院条件核对 Skill", action: "生成核对清单" },
      { time: "昨日 17:05", actor: "医生 周衍", action: "确认全部条件满足" },
      { time: "昨日 17:12", actor: "系统", action: "任务闭环并写入审计" },
    ],
  },
  {
    id: "T-2390", patient: "P-027", title: "补录缺失的肝功能检查", source: "检查结果追踪 Skill", triggerTime: "昨日 09:30",
    evidence: "入院常规检查中肝功能未执行", risk: "低", owner: "检查与药房", ownerRole: null, deadline: "已驳回",
    status: "已驳回", log: [
      { time: "昨日 09:30", actor: "检查结果追踪 Skill", action: "识别未执行检查" },
      { time: "昨日 10:02", actor: "医生 郑言", action: "驳回：外院两周内已有结果，申请互认" },
    ],
  },
];

/* ============ 患者 ============ */
export type CareLevel = "C1" | "C2" | "C3" | "C4";

export const careLevels: Record<CareLevel, { name: string; note: string }> = {
  C1: { name: "常规随访", note: "病情稳定，标准周期随访" },
  C2: { name: "加强监测", note: "近期波动，提高监测频次" },
  C3: { name: "多专业协作", note: "复杂病情，医护治疗联合" },
  C4: { name: "高风险人工优先", note: "风险优先，人工决策前置" },
};

export type ServiceConfig = {
  residence: string;
  occupation: string;
  channel: string;
  adherence: string;
  preference: string;
  budget: string;
  familySupport: string;
  payment: string;
  matched: { ward: string; butler: string; doctorTeam: string; therapist: string; followUp: string };
};

export type VoyageStage = "入院评估" | "稳定与安全" | "药物与检查" | "心理治疗" | "功能恢复" | "出院准备" | "院外复诊";

export type Patient = {
  id: string;
  stage: string;
  state: string;
  attention: number;
  care: CareLevel;
  careReason: string;
  service: ServiceConfig;
  events: string[];
  voyage: { stage: VoyageStage; state: "done" | "current" | "todo" }[];
  timeline: { time: string; event: string; source: string }[];
  medications: { name: string; dose: string; freq: string; lastTaken: string; status: "正常" | "漏服" | "拒药" | "待核对" }[];
  checks: { item: string; result: string; state: "正常" | "异常" | "待回报" | "未执行" }[];
  moments: { day: string; title: string; note: string; src: string }[];
  formulation: { label: string; value: string; note: string }[];
};

export const patients: Patient[] = [
  {
    id: "P-042", stage: "住院第 8 天", state: "需要复核", attention: 72, care: "C3",
    careReason: "近期睡眠碎片化＋拒药一次＋家庭应激，医护治疗联合管理",
    service: {
      residence: "本市 · 单程 40 分钟", occupation: "在校大学生", channel: "VIP签约渠道", adherence: "有波动",
      preference: "偏好晚间治疗与家庭参与", budget: "舒适档", familySupport: "母亲为主要支持，父亲参与度低", payment: "商保＋自费",
      matched: { ward: "舒适病房", butler: "专属管家", doctorTeam: "复杂病例团队（副主任医师复核）", therapist: "中级治疗师＋高级督导", followUp: "出院后加强随访" },
    },
    events: ["睡眠碎片化", "拒药一次", "HRV下降", "家庭通话后情绪波动"],
    voyage: [
      { stage: "入院评估", state: "done" }, { stage: "稳定与安全", state: "done" }, { stage: "药物与检查", state: "current" },
      { stage: "心理治疗", state: "done" }, { stage: "功能恢复", state: "todo" }, { stage: "出院准备", state: "todo" }, { stage: "院外复诊", state: "todo" },
    ],
    timeline: [
      { time: "02:10", event: "睡眠碎片化（觉醒 6 次）", source: "手环" },
      { time: "02:18", event: "HRV 下降至基线 -38%", source: "手环" },
      { time: "02:32", event: "识别夜间情绪波动，启动陪伴对话", source: "晚星机器人" },
      { time: "06:40", event: "家庭通话（母亲），通话后情绪波动", source: "病区记录" },
      { time: "07:20", event: "确认拒药一次（晚间喹硫平）", source: "护士 李敏" },
      { time: "08:05", event: "更新患者状态与今日摘要", source: "Copilot 2.0" },
      { time: "08:10", event: "发现服药记录冲突，生成医生复核任务", source: "服药核对 Skill" },
      { time: "09:00", event: "个案概念化更新，建议调整会谈靶点", source: "Copilot 2.0" },
    ],
    medications: [
      { name: "舍曲林", dose: "100mg", freq: "每日晨", lastTaken: "今晨 07:05", status: "正常" },
      { name: "喹硫平", dose: "50mg", freq: "每晚", lastTaken: "昨夜拒服", status: "拒药" },
      { name: "唑吡坦", dose: "5mg", freq: "按需", lastTaken: "昨夜 23:40", status: "待核对" },
    ],
    checks: [
      { item: "血常规", result: "未见异常", state: "正常" },
      { item: "肝功能", result: "待回报", state: "待回报" },
      { item: "心电图", result: "QTc 轻度延长", state: "异常" },
      { item: "睡眠多导图", result: "医嘱已开立未执行", state: "未执行" },
    ],
    moments: [
      { day: "DAY 03", title: "第一次用颜色表达情绪", note: "艺术治疗中主动完成作品并命名情绪", src: "/visuals/patient-moment-art.png" },
      { day: "DAY 05", title: "重新走进阳光里", note: "连续参加病区庭院活动，日间节律恢复", src: "/visuals/patient-moment-walk.png" },
      { day: "DAY 07", title: "第一次谈到真正担心的事", note: "个体会谈中减少回避，识别家庭冲突后的情绪链", src: "/visuals/patient-moment-therapy.png" },
    ],
    formulation: [
      { label: "易感因素", value: "长期睡眠节律紊乱", note: "情绪调节脆弱性" },
      { label: "诱发因素", value: "家庭冲突与学业压力", note: "入院前两周显著加重" },
      { label: "维持因素", value: "夜间反刍与回避", note: "家庭通话后情绪波动加剧此模式" },
      { label: "保护因素", value: "治疗动机与家庭连接", note: "已出现主动表达" },
    ],
  },
  {
    id: "P-018", stage: "复诊第 3 次", state: "用药核对中", attention: 48, care: "C2",
    careReason: "服药记录不一致，需加强用药监测",
    service: {
      residence: "本市", occupation: "固定工作", channel: "普通渠道", adherence: "稳定", preference: "工作日午间复诊",
      budget: "基础档", familySupport: "配偶支持良好", payment: "医保",
      matched: { ward: "门诊随访", butler: "常规管家", doctorTeam: "主治医师主责", therapist: "团体治疗", followUp: "标准周期随访" },
    },
    events: ["处方与自述不一致"],
    voyage: [
      { stage: "入院评估", state: "done" }, { stage: "稳定与安全", state: "done" }, { stage: "药物与检查", state: "current" },
      { stage: "心理治疗", state: "done" }, { stage: "功能恢复", state: "done" }, { stage: "出院准备", state: "done" }, { stage: "院外复诊", state: "current" },
    ],
    timeline: [
      { time: "08:36", event: "复诊摘要标记服药不一致", source: "复诊机器人" },
      { time: "08:37", event: "生成门诊核对任务", source: "任务生成 Skill" },
    ],
    medications: [
      { name: "艾司西酞普兰", dose: "15mg", freq: "每日晨", lastTaken: "今晨（自述）", status: "待核对" },
    ],
    checks: [{ item: "血压", result: "正常", state: "正常" }],
    moments: [],
    formulation: [{ label: "维持因素", value: "工作压力相关失眠", note: "复诊评估中" }],
  },
  {
    id: "P-063", stage: "住院第 22 天", state: "治疗中期", attention: 36, care: "C2",
    careReason: "会谈中出现主题回避，加强治疗监测",
    service: {
      residence: "邻市 · 高铁 1.5 小时", occupation: "时间灵活", channel: "机构签约", adherence: "稳定",
      preference: "周末家庭参与", budget: "舒适档", familySupport: "父母定期探视", payment: "机构结算",
      matched: { ward: "标准病房", butler: "专属管家", doctorTeam: "主治医师主责", therapist: "中级治疗师", followUp: "出院后标准随访" },
    },
    events: ["家庭通话波动", "会谈主题回避"],
    voyage: [
      { stage: "入院评估", state: "done" }, { stage: "稳定与安全", state: "done" }, { stage: "药物与检查", state: "done" },
      { stage: "心理治疗", state: "current" }, { stage: "功能恢复", state: "todo" }, { stage: "出院准备", state: "todo" }, { stage: "院外复诊", state: "todo" },
    ],
    timeline: [{ time: "08:52", event: "识别会谈主题回避模式", source: "Copilot 2.0" }],
    medications: [{ name: "氟西汀", dose: "40mg", freq: "每日晨", lastTaken: "今晨 07:10", status: "正常" }],
    checks: [{ item: "血药浓度", result: "正常范围", state: "正常" }],
    moments: [{ day: "DAY 14", title: "第一次完整参加团体治疗", note: "主动分享应对经验", src: "/visuals/patient-moment-therapy.png" }],
    formulation: [{ label: "维持因素", value: "对病情复发的担忧", note: "治疗中持续关注" }],
  },
  {
    id: "P-051", stage: "出院第 12 天", state: "接续中", attention: 30, care: "C2",
    careReason: "院外数据连续缺失，失访风险升高",
    service: {
      residence: "本市", occupation: "在校", channel: "普通渠道", adherence: "有波动", preference: "线上随访优先",
      budget: "基础档", familySupport: "室友提醒服药", payment: "医保",
      matched: { ward: "已出院", butler: "常规管家", doctorTeam: "主治医师主责", therapist: "自助任务", followUp: "加强院外随访" },
    },
    events: ["复诊临近", "院外数据缺失"],
    voyage: [
      { stage: "入院评估", state: "done" }, { stage: "稳定与安全", state: "done" }, { stage: "药物与检查", state: "done" },
      { stage: "心理治疗", state: "done" }, { stage: "功能恢复", state: "done" }, { stage: "出院准备", state: "done" }, { stage: "院外复诊", state: "current" },
    ],
    timeline: [{ time: "07:50", event: "识别失访风险并生成联络任务", source: "失访追踪 Skill" }],
    medications: [{ name: "度洛西汀", dose: "60mg", freq: "每日", lastTaken: "数据缺失", status: "待核对" }],
    checks: [{ item: "复诊预约", result: "已约本周五", state: "正常" }],
    moments: [],
    formulation: [{ label: "保护因素", value: "规律运动习惯", note: "院外维持" }],
  },
];

/* ============ 部门 ============ */
export type Department = {
  name: string;
  robots: string[];
  skills: string[];
  inputs: string[];
  outputs: string[];
  load: number;
  waitingOnOthers: string[];
  unclosed: number;
};

export const departments: Department[] = [
  { name: "门诊中心", robots: ["预问诊机器人", "复诊机器人"], skills: ["复诊摘要", "医嘱一致性检查"], inputs: ["预约信息", "预问诊对话", "复诊对话"], outputs: ["预问诊病历", "复诊摘要任务"], load: 62, waitingOnOthers: ["等待医疗部确认复核任务"], unclosed: 2 },
  { name: "住院病区", robots: ["晚星失眠陪伴机器人", "连续个案管理 Copilot 2.0"], skills: ["夜间状态摘要", "重点巡视名单", "拒药与漏服识别"], inputs: ["护理记录", "手环数据", "夜间对话"], outputs: ["巡视任务", "拒药事件", "夜间摘要"], load: 78, waitingOnOthers: ["等待医疗部复核 P-042 服药冲突"], unclosed: 3 },
  { name: "医疗部", robots: ["连续个案管理 Copilot 2.0", "复诊机器人"], skills: ["查房摘要", "风险重新评估", "医嘱一致性检查"], inputs: ["病历", "医嘱", "检查结果"], outputs: ["医嘱变更", "复核任务"], load: 71, waitingOnOthers: ["等待检查与药房回报肝功能"], unclosed: 2 },
  { name: "护理部", robots: ["晚星失眠陪伴机器人", "连续个案管理 Copilot 2.0"], skills: ["护理交班摘要", "重大事件快速报告"], inputs: ["一键上报", "巡视记录", "eMAR"], outputs: ["结构化事件", "交班摘要"], load: 66, waitingOnOthers: ["等待住院病区完成现场核查"], unclosed: 2 },
  { name: "心理治疗中心", robots: ["连续个案管理 Copilot 2.0"], skills: ["会谈转录摘要", "个案概念化更新", "下一次会谈靶点"], inputs: ["会谈语音（脱敏）", "选择题报告"], outputs: ["会谈摘要", "靶点调整任务"], load: 54, waitingOnOthers: ["等待 P-042 今日会谈结果"], unclosed: 1 },
  { name: "检查与药房", robots: [], skills: ["检查结果追踪", "数据缺失监测"], inputs: ["检查申请", "处方", "发药记录"], outputs: ["检查结果", "发药核对"], load: 48, waitingOnOthers: ["等待运营端处理 LIS 接口延迟告警"], unclosed: 1 },
  { name: "健康管理中心", robots: ["复诊机器人", "连续个案管理 Copilot 2.0"], skills: ["失访追踪", "出院后首次复诊衔接"], inputs: ["复诊计划", "院外数据"], outputs: ["联络任务", "随访摘要"], load: 44, waitingOnOthers: ["等待 P-051 回复联络"], unclosed: 1 },
  { name: "管家与运营", robots: ["连续个案管理 Copilot 2.0"], skills: ["跨部门任务路由", "任务闭环审计", "响应时效"], inputs: ["任务日志", "服务记录"], outputs: ["路由任务", "审计报告"], load: 52, waitingOnOthers: ["等待各部门处理超时任务"], unclosed: 2 },
  { name: "院领导", robots: [], skills: ["AI医院实施进度", "医护工时节约"], inputs: ["全院运行数据（只读）"], outputs: ["医院脉冲", "演进决策"], load: 0, waitingOnOthers: [], unclosed: 0 },
];

/* ============ 实施进度 ============ */
export type Phase = {
  index: number;
  title: string;
  subtitle: string;
  progress: number;
  state: string;
  detail: string;
  points: string[];
};

export const phases: Phase[] = [
  {
    index: 1, title: "阶段1 · 数字员工", subtitle: "现在", progress: 36, state: "进行中",
    detail: "已有机器人进入真实岗位，完成预问诊、复诊、夜间陪伴和个案管理。",
    points: ["预问诊机器人 · 门诊在岗", "复诊机器人 · 复诊接续", "晚星机器人 · 病区夜间", "Copilot 2.0 · 连续个案"],
  },
  {
    index: 2, title: "阶段2 · 患者数字影子", subtitle: "建设中", progress: 18, state: "建设中",
    detail: "自动汇总病历、医嘱、药卡、检查、护理和治疗记录，建立统一事件时间线。",
    points: ["统一患者 ID", "统一时间戳事件日志", "数据质量监测", "角色权限隔离"],
  },
  {
    index: 3, title: "阶段3 · 静默运行", subtitle: "规划", progress: 6, state: "规划中",
    detail: "系统后台产生风险和病程预测，但暂不影响诊疗，用真实结局检验校准度、漏报、误报和警报负担。",
    points: ["预测不进入工作流", "真实结局回验", "漏报误报统计", "警报负担测量"],
  },
  {
    index: 4, title: "阶段4 · 人机协作", subtitle: "规划", progress: 4, state: "规划中",
    detail: "经过验证的提示进入医生、护士和治疗师工作台，由专业人员确认、修改或驳回。",
    points: ["验证后的提示上线", "确认/修改/驳回留痕", "Human Gate 生效", "人机界面融合"],
  },
  {
    index: 5, title: "阶段5 · 医院服务数字孪生", subtitle: "愿景", progress: 2, state: "预研",
    detail: "系统模拟不同资源配置：是否需要医生、先由护士核查、治疗师介入、数字化干预或紧急流程。目标是优化资源投入，而不是让AI取得医疗权力。",
    points: ["资源配置情景模拟", "护士核查分流", "数字化干预替代", "紧急流程编排"],
  },
  {
    index: 6, title: "阶段6 · AI Native医院", subtitle: "愿景", progress: 1, state: "预研",
    detail: "最终形成机器人协作网络、患者数字影子、医院服务岛、服务运行孪生、医院资源动态调度与个体化治疗随访闭环。",
    points: ["机器人协作网络", "患者数字影子", "服务运行孪生", "资源动态调度", "个体化治疗闭环"],
  },
];

/* ============ 演示事件链 ============ */
export type DemoStep = {
  index: number;
  time: string;
  title: string;
  detail: string;
  source: string;
};

export const demoChain: DemoStep[] = [
  { index: 0, time: "02:10", title: "患者状态更新", detail: "昨夜睡眠碎片化＋HRV下降＋漏服一次药＋家庭通话后情绪波动", source: "手环 · eMAR · 病区记录" },
  { index: 1, time: "02:32", title: "晚星机器人生成夜间事件", detail: "识别夜间情绪波动，完成陪伴对话并记录睡眠变化", source: "晚星失眠陪伴机器人" },
  { index: 2, time: "08:08", title: "服药核对Skill发现记录冲突", detail: "eMAR 与电子药卡记录不一致，患者自述昨夜未服", source: "服药核对 Skill" },
  { index: 3, time: "08:05", title: "Copilot 2.0更新今日摘要", detail: "患者状态与今日变化摘要同步更新", source: "连续个案管理 Copilot 2.0" },
  { index: 4, time: "08:10", title: "向护士生成现场核查任务", detail: "T-2410 现场核查昨夜拒药与情绪波动 → 等待人工确认", source: "任务生成 Skill" },
  { index: 5, time: "08:10", title: "向医生生成服药复核任务", detail: "T-2411 复核服药方案与记录冲突 → 等待人工确认", source: "任务生成 Skill" },
  { index: 6, time: "09:00", title: "向治疗师生成会谈靶点调整", detail: "T-2412 调整今日会谈靶点 → 等待人工确认", source: "任务生成 Skill" },
  { index: 7, time: "09:41", title: "工作人员确认", detail: "护士接受核查任务，医生确认复核，治疗师确认靶点调整", source: "护理部 · 医疗部 · 心理治疗中心" },
  { index: 8, time: "09:48", title: "治疗航图与患者状态同步更新", detail: "P-042 航图进入「药物与检查」阶段复核节点，关注度更新", source: "Copilot 2.0" },
  { index: 9, time: "09:52", title: "任务进入审计闭环", detail: "三项任务全部闭环，操作记录写入运行与审计", source: "任务闭环 Skill" },
];

/* ============ 24小时事件流 ============ */
export const eventStream: { time: string; event: string; source: string; tone: "cyan" | "amber" | "violet" | "green" | "blue" | "rose"; patient?: string }[] = [
  { time: "02:10", event: "睡眠碎片化", source: "手环 · P-042", tone: "amber", patient: "P-042" },
  { time: "02:18", event: "HRV下降", source: "手环 · P-042", tone: "amber", patient: "P-042" },
  { time: "02:32", event: "晚星机器人识别夜间情绪波动", source: "晚星机器人", tone: "violet", patient: "P-042" },
  { time: "03:05", event: "完成CBT-I微干预，入睡", source: "晚星机器人", tone: "violet", patient: "P-042" },
  { time: "06:40", event: "家庭通话后情绪波动", source: "病区记录 · P-042", tone: "rose", patient: "P-042" },
  { time: "07:20", event: "护士确认一次拒药", source: "护士 李敏", tone: "green", patient: "P-042" },
  { time: "07:50", event: "识别失访风险 P-051", source: "失访追踪 Skill", tone: "blue", patient: "P-051" },
  { time: "08:05", event: "Copilot 2.0更新患者状态", source: "Copilot 2.0", tone: "cyan", patient: "P-042" },
  { time: "08:10", event: "系统生成医生复核任务", source: "服药核对 Skill", tone: "blue", patient: "P-042" },
  { time: "08:36", event: "复诊摘要标记用药不一致", source: "复诊机器人", tone: "amber", patient: "P-018" },
  { time: "09:00", event: "治疗师调整今日会谈靶点", source: "Copilot 2.0", tone: "rose", patient: "P-042" },
];

/* ============ 审计 ============ */
export const auditLog: { time: string; actor: string; action: string; target: string }[] = [
  { time: "09:12", actor: "任务闭环 Skill", action: "T-2399 完成闭环", target: "出院条件核对" },
  { time: "08:52", actor: "Copilot 2.0", action: "个案概念化更新（v13）", target: "P-063" },
  { time: "08:37", actor: "任务生成 Skill", action: "T-2408 创建并分派", target: "门诊中心" },
  { time: "08:10", actor: "服药核对 Skill", action: "发现记录冲突", target: "P-042" },
  { time: "07:21", actor: "任务生成 Skill", action: "T-2410 创建并分派", target: "护理部" },
  { time: "07:20", actor: "护士 李敏", action: "一键上报拒药事件", target: "P-042" },
  { time: "06:58", actor: "权限与版本审计", action: "Skill 版本 v2.4.1 发布记录", target: "全院 P0" },
];

export const techLayers = [
  {
    layer: "数据接入层", items: ["HIS", "EMR", "LIS", "eMAR", "量表", "护理", "治疗", "手环", "机器人"],
    note: "第一阶段只读接入",
  },
  {
    layer: "事件与患者状态层", items: ["统一患者ID", "统一时间戳", "事件日志", "数据质量", "权限"],
    note: "数据变化或异常才触发推理",
  },
  {
    layer: "机器人与Skill层", items: ["读取", "整理", "检测", "生成任务", "任务路由"],
    note: "常规抽取用规则与小模型",
  },
  {
    layer: "工作台层", items: ["医生", "护士", "治疗师", "患者", "家属", "管家", "运营", "领导"],
    note: "所有回写先由人工确认",
  },
  {
    layer: "治理层", items: ["权限", "审计", "版本", "人工确认", "停止输出", "隐私保护"],
    note: "输出保存输入版本、模型版本与生成时间",
  },
];

export const costMeasures = [
  "只有数据变化或异常事件触发推理",
  "常规抽取、分类和提醒优先使用规则或小模型",
  "大模型只用于摘要、复杂语义理解和多来源整合",
  "患者模型保存状态参数，不保持持续运行的大模型副本",
  "先使用医院已有服务器和弹性云计算",
  "非实时任务采用夜间批处理",
  "HIS第一阶段只读接入",
  "所有回写操作先由人工确认",
  "图片和历史记录按层级归档",
  "所有模型输出保存输入版本、模型版本和生成时间",
];

export const hisInterfaces = [
  { system: "HIS / EMR", interface: "患者索引只读视图（患者ID、科室、床位）", phase: "P0" },
  { system: "HIS / EMR", interface: "病历文书只读接口（病程、医嘱、护理记录）", phase: "P0" },
  { system: "eMAR", interface: "医嘱与执行记录只读接口", phase: "P0" },
  { system: "LIS", interface: "检验申请与结果回报接口", phase: "P0" },
  { system: "量表系统", interface: "量表结构与评分只读接口", phase: "P0" },
  { system: "手环平台", interface: "睡眠、心率、HRV 事件流推送（WebSocket）", phase: "P1" },
  { system: "治疗记录系统", interface: "治疗计划与会谈记录只读接口", phase: "P1" },
  { system: "统一任务中心", interface: "任务创建/状态回写接口（唯一写入口，需人工确认）", phase: "P1" },
  { system: "审计系统", interface: "操作日志归档与查询接口", phase: "P1" },
];
