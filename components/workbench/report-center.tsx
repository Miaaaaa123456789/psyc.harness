"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardPlus, ShieldAlert, Pill, HeartPulse, Route, Send, Zap, MessagesSquare, PhoneCall, PenLine, Siren, ArrowRight, CheckCircle2, RotateCcw, Mic, Info, ChevronDown, type LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWorkbench } from "@/lib/store";
import { patients } from "@/lib/hospital";
import { maskPatientName, type PatientOption } from "@/lib/patient";
import {
  BUTLER_DEPTS, BUTLER_TYPES, COMM_FEEDBACKS, COMM_METHODS, COMM_RELATIONS, COMM_TARGETS, COMM_TOPICS,
  CUSTOM_TYPES, FOLLOWUP_METHODS, FOLLOWUP_RISK_LEVELS,
  MED_ALERT_RESULTS, MED_RESULTS, PT_ABNORMAL_STATUS, PT_CLINICAL_REASONS, PT_DURING_OBS, PT_MODALITIES,
  PT_NONCOMPLETE_REASONS, PT_POST_FEEDBACK, PT_SESSION_STATUS, PT_WILLINGNESS,
  REPORT_KINDS, ROLE_REPORTS, STAFF_GROUPS,
  SAFETY_TYPES, SEVERITY_LEVELS, THERAPY_STATUS, THERAPY_TYPES,
  type ReportKind, type ReportPayload, type StaffGroup,
} from "@/lib/reports";
import { ABNORMAL_TYPES, ABNORMAL_SEVERITY } from "@/lib/copilot";
import { DEFAULT_REPORTER, ROSTER_BY_ROLE } from "@/lib/roster";

const KIND_ICONS: Record<ReportKind, LucideIcon> = {
  safety: ShieldAlert, medication: Pill, therapy: HeartPulse, butler: Route,
  pt: Zap, communication: MessagesSquare, followup: PhoneCall, custom: PenLine,
};

/** 异常类型 → 04 表事件类型映射（保证写入值在飞书 select 选项内） */
const ABNORMAL_TYPE_MAP: Record<string, string> = {
  "自伤/自杀": "自伤行为",
  "冲动/激越": "冲动攻击",
  "拒药": "拒药拒食",
  "漏药": "拒药拒食",
  "跌倒": "跌倒",
  "不良反应": "其他",
  "睡眠异常": "其他",
  "情绪变化": "其他",
  "行为变化": "其他",
  "社会互动变化": "其他",
  "治疗耐受异常": "其他",
  "治疗后异常": "其他",
  "其他异常": "其他",
};

/* ==================== 上报人折叠选择器 ====================
 * 只显示当前角色端的人员；管理端代填时按端分组。
 * 默认收起，点击展开，选中后自动收起，避免长名单占满表单。 */
function ReporterPicker({
  value, options, groups, onChange,
}: {
  value: string;
  options: string[];
  /** 管理端代填时的分组展示；单端时为 null */
  groups: StaffGroup[] | null;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rp-picker${open ? " open" : ""}`}>
      <button
        type="button"
        className="rp-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rp-value">{value || "请选择上报人"}</span>
        <em className="rp-hint">{open ? "收起" : `${options.length} 人可选`}</em>
        <ChevronDown size={14} className="rp-caret" />
      </button>
      {open && (
        <div className="rp-panel">
          {groups
            ? groups.map((g) => (
                <div key={g.key} className="rp-group">
                  <p className="rp-group-head">{g.label}</p>
                  <div className="rp-group-items">
                    {g.members.map((m) => (
                      <button
                        key={m} type="button"
                        className={value === m ? "selected" : ""}
                        onClick={() => { onChange(m); setOpen(false); }}
                      >{m}</button>
                    ))}
                  </div>
                </div>
              ))
            : (
              <div className="rp-group-items">
                {options.map((m) => (
                  <button
                    key={m} type="button"
                    className={value === m ? "selected" : ""}
                    onClick={() => { onChange(m); setOpen(false); }}
                  >{m}</button>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

/* ==================== 患者选择器 ====================
 * 1. 候选来自飞书 01 患者主档，不再是写死的几个编号；
 * 2. 支持按编号 / 姓名搜索；
 * 3. 查无此人时可直接输入姓名建档（服务端脱敏为「林X雨」后写 01 表，再回写选中）。 */
function PatientPicker({
  value, options, onChange, onCreate,
}: {
  value: string;
  options: PatientOption[];
  onChange: (id: string) => void;
  /** 新患者建档；成功返回新建患者，失败返回 null */
  onCreate: (rawName: string) => Promise<PatientOption | null>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = options.find((o) => o.id === value);
  const kw = q.trim();
  const filtered = kw
    ? options.filter((o) => o.id.includes(kw) || o.name.includes(kw))
    : options;
  const exact = options.find((o) => o.name === kw || o.id === kw);
  const canCreate = kw.length >= 2 && !exact;

  const create = async () => {
    if (busy || !canCreate) return;
    setBusy(true);
    const p = await onCreate(kw);
    setBusy(false);
    if (p) { onChange(p.id); setQ(""); setOpen(false); }
  };

  return (
    <div className={`rp-picker pt-picker${open ? " open" : ""}`}>
      <button
        type="button"
        className="rp-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rp-value">
          {value ? `${value}${cur?.name ? ` · ${cur.name}` : ""}` : "请选择患者"}
        </span>
        <em className="rp-hint">{open ? "收起" : `${options.length} 位可选`}</em>
        <ChevronDown size={14} className="rp-caret" />
      </button>
      {open && (
        <div className="rp-panel pt-panel">
          <input
            className="pt-search"
            value={q}
            placeholder="搜索编号或姓名；查无此人可直接输入姓名建档"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canCreate) void create(); } }}
          />
          <div className="pt-list">
            {filtered.map((o) => (
              <button
                key={o.id} type="button"
                className={value === o.id ? "selected" : ""}
                onClick={() => { onChange(o.id); setQ(""); setOpen(false); }}
              >
                <b>{o.id}</b>
                <span>{o.name || "—"}</span>
                <small>{o.stage}</small>
              </button>
            ))}
            {filtered.length === 0 && !canCreate && (
              <p className="pt-empty">没有匹配的患者</p>
            )}
          </div>
          {canCreate && (
            <div className="pt-create">
              <p>
                建档新患者：<b>{kw}</b> → 展示为 <b>{maskPatientName(kw)}</b>
                <small>系统自动生成患者编号，并写入 01 患者主档</small>
              </p>
              <button type="button" disabled={busy} onClick={() => void create()}>
                {busy ? "建档中…" : "建档并选中"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== 异常快速上报（渐进式向导，30 秒完成） ==================== */
type WizardState = {
  patient: string;
  type: string;
  severity: string;
  time: string;
  note: string;
};

const WIZARD_STEPS = ["选择患者", "异常类型", "程度与时间", "补充说明", "确认提交"] as const;

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function AbnormalWizard({
  reporter, patientOptions, onCreatePatient, onDone,
}: {
  reporter: string;
  patientOptions: PatientOption[];
  onCreatePatient: (rawName: string) => Promise<PatientOption | null>;
  onDone: () => void;
}) {
  const { submitReport, notify } = useWorkbench();
  const [step, setStep] = useState(0);
  const [w, setW] = useState<WizardState>({ patient: "", type: "", severity: "", time: nowHM(), note: "" });
  const [submitting, setSubmitting] = useState(false);
  const set = (patch: Partial<WizardState>) => setW((prev) => ({ ...prev, ...patch }));

  const stepReady = [w.patient, w.type, w.severity, true, true][step];
  const severityForTable = w.severity === "需立即处置" ? "高" : w.severity;

  const summaryText = [
    `【异常快速上报】${w.patient} · ${w.type}`,
    `程度：${w.severity}｜发生：${w.time}`,
    w.note ? `补充：${w.note}` : "补充：无",
    `上报人：${reporter}`,
  ].join("\n");

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload: ReportPayload = {
      上报人: reporter,
      患者编号: w.patient,
      事件类型: ABNORMAL_TYPE_MAP[w.type] ?? "其他",
      严重等级: severityForTable,
      发生时间: w.time,
      处置措施: summaryText,
    };
    const ok = await submitReport("safety", payload);
    setSubmitting(false);
    if (ok) {
      notify("异常上报完成：系统将串联该患者近期数据，异常变化会推给医生端", "info");
      onDone();
    }
  };

  return (
    <div className="abn-wizard">
      {/* 步骤条 */}
      <ol className="abn-steps" aria-label="上报进度">
        {WIZARD_STEPS.map((s, i) => (
          <li key={s} className={i === step ? "current" : i < step ? "done" : ""}>
            <i>{i < step ? <CheckCircle2 size={12} /> : i + 1}</i>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      {/* 第一步：选择患者（自动带出风险与VIP分层） */}
      {step === 0 && (
        <div className="abn-step">
          <label>哪位患者出现异常？<em>*</em></label>
          <PatientPicker
            value={w.patient}
            options={patientOptions}
            onChange={(id) => set({ patient: id })}
            onCreate={onCreatePatient}
          />
          <p className="pt-tip">新患者可直接输入姓名建档，系统自动生成编号并脱敏展示（如 林心雨 → {maskPatientName("林心雨")}）。</p>
        </div>
      )}

      {/* 第二步：异常类型 */}
      {step === 1 && (
        <div className="abn-step">
          <label>异常类型<em>*</em></label>
          <div className="rf-chips">
            {ABNORMAL_TYPES.map((t) => (
              <button key={t} type="button" className={w.type === t ? "selected" : ""}
                onClick={() => set({ type: t })}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {/* 第三步：严重程度 + 发生时间 */}
      {step === 2 && (
        <div className="abn-step">
          <label>严重程度<em>*</em></label>
          <div className="rf-chips">
            {ABNORMAL_SEVERITY.map((s) => (
              <button key={s} type="button" className={w.severity === s ? "selected" : ""}
                onClick={() => set({ severity: s })}>{s}</button>
            ))}
          </div>
          <label style={{ marginTop: 12 }}>发生时间</label>
          <input value={w.time} onChange={(e) => set({ time: e.target.value })} placeholder="如 14:30" />
        </div>
      )}

      {/* 第四步：一句话补充（支持语音占位） */}
      {step === 3 && (
        <div className="abn-step">
          <label>一句话补充（选填，语音或文字）</label>
          <div className="abn-voice-row">
            <textarea rows={3} value={w.note} onChange={(e) => set({ note: e.target.value })}
              placeholder="例：患者诉昨晚家人通话后情绪低落，今晨拒绝服药一次…" />
            <button type="button" className="abn-voice" title="语音录入（演示占位）"
              onClick={() => notify("语音录入需在移动端浏览器授权麦克风后使用", "info")}>
              <Mic size={16} />
            </button>
          </div>
          <p className="abn-hint"><Info size={11} /> HIS、护理记录、设备中已有的数据无需重复填写，系统会自动关联。</p>
        </div>
      )}

      {/* 第五步：结构化摘要确认 */}
      {step === 4 && (
        <div className="abn-step">
          <label>请确认以下摘要（系统自动生成）</label>
          <pre className="abn-summary">{summaryText}</pre>
          <p className="abn-impact"><Info size={11} /> 提交后：写入 04 安全事件表 → AI 串联该患者近 3 日数据 → 高严重等级自动生成医生端任务 → 按时间窗安排结局验证。</p>
        </div>
      )}

      {/* 导航 */}
      <footer className="abn-nav">
        {step > 0 && <button className="secondary-action" onClick={() => setStep(step - 1)}><RotateCcw size={12} />上一步</button>}
        {step < 4
          ? <button className="primary-action" disabled={!stepReady} onClick={() => setStep(step + 1)}>下一步<ArrowRight size={12} /></button>
          : <button className="primary-action" disabled={submitting} onClick={submit}>
              <Send size={13} />{submitting ? "提交中…" : "确认并提交"}
            </button>}
      </footer>
    </div>
  );
}

/** 填报命中这些条件时，服务端会自动生成任务工单推给医生端 */
const LINKAGE_HINTS: Partial<Record<ReportKind, string>> = {
  safety: "严重等级选「高」时将自动生成任务，推送医生端确认",
  medication: "执行结果为拒服 / 漏服 / 吐药时将自动生成复核任务",
  pt: "非正常完成且原因为患者拒绝 / 不适 / 临床暂停时，将自动生成任务推医生端复核",
  communication: "对象反馈为明确拒绝 / 情绪激动时，将自动生成任务推医生端跟进",
  followup: "风险等级选「高」时将自动生成任务，推医生端升级处置（高风险须人工闭环）",
};

type FieldDef = {
  key: string;
  label: string;
  type: "chips" | "text" | "textarea" | "patient";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  showIf?: (values: Record<string, string>) => boolean;
};

const PATIENT_IDS = patients.map((p) => p.id);

const FORM_DEFS: Record<ReportKind, FieldDef[]> = {
  safety: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "事件类型", label: "事件类型", type: "chips", options: SAFETY_TYPES, required: true },
    { key: "严重等级", label: "严重等级", type: "chips", options: SEVERITY_LEVELS, required: true },
    { key: "发生时间", label: "发生时间", type: "text", placeholder: "默认当前时间，如 14:30" },
    { key: "处置措施", label: "现场处置措施", type: "textarea", required: true, placeholder: "已采取的保护性措施、安抚、看护安排…" },
  ],
  medication: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "药品名称", label: "药品名称", type: "text", required: true, placeholder: "如 喹硫平" },
    { key: "剂量", label: "剂量", type: "text", required: true, placeholder: "如 200mg" },
    { key: "应服时间", label: "应服时间", type: "text", required: true, placeholder: "如 08:00" },
    { key: "执行结果", label: "执行结果", type: "chips", options: MED_RESULTS, required: true },
    {
      key: "拒服原因", label: "异常原因", type: "textarea",
      showIf: (v) => MED_ALERT_RESULTS.includes(v["执行结果"]),
      required: true, placeholder: "患者陈述或观察到的原因…",
    },
  ],
  therapy: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "治疗类型", label: "治疗类型", type: "chips", options: THERAPY_TYPES, required: true },
    { key: "治疗日期", label: "治疗日期", type: "text", placeholder: "默认今天，格式 2026-09-06" },
    { key: "计划时长", label: "计划时长", type: "text", placeholder: "如 50 分钟" },
    { key: "完成状态", label: "完成状态", type: "chips", options: THERAPY_STATUS, required: true },
    { key: "效果评分", label: "效果评分（1-5）", type: "chips", options: ["1", "2", "3", "4", "5"] },
    { key: "会谈靶点", label: "会谈靶点", type: "text", placeholder: "本次聚焦的靶问题" },
    { key: "干预要点", label: "干预要点", type: "textarea", required: true, placeholder: "主要干预技术与患者反应…" },
  ],
  butler: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "服务类型", label: "服务类型", type: "chips", options: BUTLER_TYPES, required: true },
    { key: "协调部门", label: "协调部门", type: "chips", options: BUTLER_DEPTS },
    { key: "承诺完成时间", label: "承诺完成时间", type: "text", required: true, placeholder: "如 今日 18:00 前" },
    { key: "备注", label: "备注", type: "textarea", placeholder: "补充说明…" },
  ],
  pt: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "治疗项目", label: "治疗项目", type: "chips", options: PT_MODALITIES, required: true },
    { key: "计划时间", label: "计划时间", type: "text", required: true, placeholder: "如 今日 10:00" },
    { key: "执行状态", label: "执行状态", type: "chips", options: PT_SESSION_STATUS, required: true },
    {
      key: "未完成原因", label: "未完成 / 中断原因", type: "chips", options: PT_NONCOMPLETE_REASONS,
      showIf: (v) => PT_ABNORMAL_STATUS.includes(v["执行状态"]), required: true,
    },
    { key: "治疗意愿", label: "患者治疗意愿", type: "chips", options: PT_WILLINGNESS },
    { key: "治疗中观察", label: "治疗中观察与耐受", type: "chips", options: PT_DURING_OBS },
    {
      key: "不良反应及处置", label: "不良反应及处置", type: "textarea",
      showIf: (v) => ["不适", "情绪反应", "中断"].includes(v["治疗中观察"]),
      placeholder: "症状、开始时间、处置与恢复情况…",
    },
    { key: "治疗后反馈", label: "治疗后反馈", type: "chips", options: PT_POST_FEEDBACK },
    /* options 运行时按角色端花名册替换（见下方「执行人」分支），避免静态名单跨端串人 */
    { key: "执行人", label: "执行人", type: "chips", options: [], placeholder: "默认与上报人一致" },
    { key: "备注", label: "备注", type: "textarea", placeholder: "补做 / 改期安排等…" },
  ],
  communication: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "沟通对象", label: "沟通对象", type: "chips", options: COMM_TARGETS, required: true },
    {
      key: "家属关系", label: "家属关系", type: "chips", options: COMM_RELATIONS,
      showIf: (v) => v["沟通对象"] === "家属", required: true,
    },
    { key: "沟通方式", label: "沟通方式", type: "chips", options: COMM_METHODS, required: true },
    { key: "沟通主题", label: "沟通主题", type: "chips", options: COMM_TOPICS, required: true },
    { key: "沟通内容要点", label: "沟通内容要点", type: "textarea", required: true, placeholder: "说明 / 宣教的内容、对方疑问与回应…" },
    { key: "对象反馈", label: "对象反馈", type: "chips", options: COMM_FEEDBACKS, required: true },
    { key: "备注", label: "备注", type: "textarea", placeholder: "后续跟进安排…" },
  ],
  /* 自定义记录：由填写人自由定义记录内容，写入 16 表并参与统计页汇总 */
  custom: [
    { key: "记录类型", label: "记录类型", type: "chips", options: CUSTOM_TYPES, required: true },
    { key: "标题", label: "标题", type: "text", required: true, placeholder: "一句话说明记录了什么" },
    { key: "内容", label: "内容", type: "textarea", required: true, placeholder: "记录的具体内容、过程或结论…" },
    { key: "数值", label: "数值（选填，便于统计）", type: "text", placeholder: "如 3" },
    { key: "单位", label: "单位（选填）", type: "text", placeholder: "如 次 / 人 / 分钟" },
    { key: "标签", label: "标签（选填）", type: "text", placeholder: "多个标签用逗号分隔，便于后续筛选" },
  ],
  /* 出院随访：按《出院患者随访登记台账》13 列；序号自动生成，护士姓名取上报人 */
  followup: [
    { key: "患者编号", label: "患者", type: "patient", required: true },
    { key: "住院号", label: "住院号", type: "text", required: true, placeholder: "如 ZY-2026-042" },
    { key: "出院日期", label: "出院日期", type: "text", required: true, placeholder: "如 2026-09-01" },
    { key: "联系电话", label: "联系电话", type: "text", required: true, placeholder: "优先联系人电话" },
    { key: "随访日期", label: "随访日期", type: "text", placeholder: "默认今天，格式 2026-09-06" },
    { key: "随访方式", label: "随访方式", type: "chips", options: FOLLOWUP_METHODS, required: true },
    { key: "风险等级", label: "风险等级", type: "chips", options: FOLLOWUP_RISK_LEVELS, required: true },
    { key: "存在问题", label: "存在问题", type: "textarea", required: true, placeholder: "服药 / 睡眠 / 情绪 / 自伤自杀线索 / 社会功能等具体问题…" },
    { key: "处理措施", label: "处理措施", type: "textarea", required: true, placeholder: "宣教 / 复诊提醒 / 通知医生 / 加密随访等，及执行结果…" },
    { key: "下次随访时间", label: "下次随访时间", type: "text", required: true, placeholder: "如 2026-09-13（72小时/7天/14天节点）" },
    { key: "备注", label: "备注", type: "textarea", placeholder: "补充说明…" },
  ],
};

export function ReportCenter({
  open,
  onClose,
  initialKind = null,
  initialPatient,
}: {
  open: boolean;
  onClose: () => void;
  /** 外部指定打开时默认选中的表单类型（用于页面内的快捷填报入口） */
  initialKind?: ReportKind | null;
  /** 从随访/治疗名单进入时带出的患者编号，自动预填患者字段 */
  initialPatient?: string | undefined;
}) {
  const { role, submitReport, notify } = useWorkbench();
  const kinds = ROLE_REPORTS[role.id] ?? [];
  /** 本端花名册：切换角色端后自动切换候选名单 */
  const staffOptions = ROSTER_BY_ROLE[role.id] ?? ROSTER_BY_ROLE.nurse;
  const defaultReporter = DEFAULT_REPORTER[role.id] ?? staffOptions[0] ?? role.name;
  /** 管理端可代填，按端分组展示；单端人员时平铺 */
  const staffGroups = role.id === "ops" || role.id === "leader" ? STAFF_GROUPS : null;
  const [kind, setKind] = useState<ReportKind | null>(initialKind);
  const [reporter, setReporter] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  /** 渐进式异常快速上报（护士/治疗师） */
  const quickAbnormal = ["nurse", "therapist"].includes(role.id);
  const [wizardOpen, setWizardOpen] = useState(false);
  /** 患者候选：来自飞书 01 患者主档，打开填报中心时拉取 */
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>(() =>
    patients.map((p) => ({ id: p.id, name: "", stage: p.stage, risk: "" })),
  );

  /** 切换角色端时，上报人回落为当前端默认值（防止跨端串名单） */
  useEffect(() => { setReporter(""); }, [role.id]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/patients")
      .then((r) => r.json())
      .then((d: { patients?: PatientOption[] }) => {
        if (alive && Array.isArray(d.patients) && d.patients.length) setPatientOptions(d.patients);
      })
      .catch(() => { /* 拉取失败时保留本地回落列表 */ });
    return () => { alive = false; };
  }, [open]);

  /** 新患者建档：真实姓名交给服务端脱敏（林心雨 → 林X雨）后写入 01 表 */
  const createPatient = async (rawName: string): Promise<PatientOption | null> => {
    try {
      const r = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rawName, actor: reporterValue }),
      });
      const d = (await r.json()) as { ok?: boolean; patient?: PatientOption; error?: string };
      const created = d.patient;
      if (!d.ok || !created) { notify(d.error ?? "建档失败", "warn"); return null; }
      setPatientOptions((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
      notify(`已建档：${created.id} · ${created.name}`, "info");
      return created;
    } catch {
      notify("建档失败，请检查网络", "warn");
      return null;
    }
  };

  const active: ReportKind | null = wizardOpen ? null : (kind && kinds.includes(kind) ? kind : kinds[0] ?? null);
  const fields = active ? FORM_DEFS[active] : [];
  const reporterValue = reporter || defaultReporter;

  const visibleFields = fields.filter((f) => !f.showIf || f.showIf(values));
  const canSubmit = useMemo(
    () => reporterValue.trim().length > 0 && visibleFields.every((f) => !f.required || values[f.key]?.trim()),
    [visibleFields, values, reporterValue],
  );

  const pick = (k: ReportKind) => { setKind(k); setWizardOpen(false); setValues({}); };

  // 每次从外部打开时，按传入的快捷类型定位到对应表单
  useEffect(() => {
    if (open) {
      setKind(initialKind);
      /* 从随访/治疗名单进入时带出患者，避免重复选择 */
      setValues(initialPatient ? { 患者编号: initialPatient } : {});
      setWizardOpen(false);
    }
  }, [open, initialKind, initialPatient]);
  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    if (!active || !canSubmit || submitting) return;
    setSubmitting(true);
    const payload: ReportPayload = { 上报人: reporterValue.trim() };
    for (const f of visibleFields) {
      const v = values[f.key]?.trim();
      if (v) payload[f.key] = f.key === "效果评分" ? Number(v) : v;
    }
    /* 患者选择器只提交编号，同时带上脱敏姓名（15 出院随访表的「姓名」列用得上） */
    const patientField = visibleFields.find((f) => f.type === "patient");
    if (patientField && values[patientField.key]) {
      const p = patientOptions.find((o) => o.id === values[patientField.key]);
      if (p?.name) payload["姓名"] = p.name;
    }
    const ok = await submitReport(active, payload);
    setSubmitting(false);
    if (ok) { setValues({}); setReporter(""); onClose(); }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="work-sheet">
        <ScrollArea className="sheet-scroll">
          <SheetHeader>
            <div className="sheet-avatar accent-green"><ClipboardPlus /></div>
            <SheetDescription>UNIFIED REPORTING · {role.name}</SheetDescription>
            <SheetTitle>填报中心</SheetTitle>
            <p>填写内容直接写入飞书多维表格对应业务表，并自动留痕审计。</p>
          </SheetHeader>

          {kinds.length === 0 ? (
            <div className="sheet-content">
              <p className="report-empty">当前角色端暂无填报入口。切换到医生 / 护士 / 治疗师 / 管家 / 运营端后即可填报。</p>
            </div>
          ) : (
            <div className="sheet-content">
              <nav className="report-kind-tabs" aria-label="填报类型">
                {quickAbnormal && (
                  <button className={wizardOpen ? "active abn-tab" : "abn-tab"} onClick={() => { setWizardOpen(true); setKind(null); setValues({}); }}>
                    <Siren size={14} />异常快速上报
                  </button>
                )}
                {kinds.map((k) => {
                  const Icon = KIND_ICONS[k];
                  return (
                    <button key={k} className={active === k ? "active" : ""} onClick={() => pick(k)}>
                      <Icon size={14} />{REPORT_KINDS[k].label}
                    </button>
                  );
                })}
              </nav>

              {wizardOpen && (
                <AbnormalWizard
                  reporter={reporterValue}
                  patientOptions={patientOptions}
                  onCreatePatient={createPatient}
                  onDone={() => { setWizardOpen(false); onClose(); }}
                />
              )}

              {active && (
                <div className="report-form">
                  <p className="report-target">写入位置：{REPORT_KINDS[active].tableLabel}</p>
                  <div className="rf-field">
                    <label>上报人<em>*</em><span className="rf-who">{role.name}</span></label>
                    <ReporterPicker
                      value={reporterValue}
                      options={staffOptions}
                      groups={staffGroups}
                      onChange={setReporter}
                    />
                  </div>
                  {visibleFields.map((f) => (
                    <div key={f.key} className="rf-field">
                      <label>{f.label}{f.required && <em>*</em>}</label>
                      {f.type === "patient" && (
                        <PatientPicker
                          value={values[f.key] ?? ""}
                          options={patientOptions}
                          onChange={(id) => set(f.key, id)}
                          onCreate={createPatient}
                        />
                      )}
                      {f.type === "chips" && (
                        <div className="rf-chips">
                          {(f.key === "执行人" ? staffOptions : f.options!).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={values[f.key] === opt ? "selected" : ""}
                              onClick={() => set(f.key, values[f.key] === opt ? "" : opt)}
                            >{opt}</button>
                          ))}
                        </div>
                      )}
                      {f.type === "text" && (
                        <input value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                      )}
                      {f.type === "textarea" && (
                        <textarea rows={3} value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                      )}
                    </div>
                  ))}
                  {LINKAGE_HINTS[active] && <p className="report-linkage-hint">{LINKAGE_HINTS[active]}</p>}
                  <footer className="report-footer">
                    <button className="secondary-action" onClick={onClose}>取消</button>
                    <button className="primary-action" disabled={!canSubmit || submitting} onClick={submit}>
                      <Send size={13} />{submitting ? "写入中…" : "提交填报"}
                    </button>
                  </footer>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
