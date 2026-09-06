"use client";

import { useMemo, useState } from "react";
import { ClipboardPlus, ShieldAlert, Pill, HeartPulse, Route, Send, Zap, MessagesSquare, PhoneCall, type LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWorkbench } from "@/lib/store";
import { patients } from "@/lib/hospital";
import {
  BUTLER_DEPTS, BUTLER_TYPES, COMM_FEEDBACKS, COMM_METHODS, COMM_RELATIONS, COMM_TARGETS, COMM_TOPICS,
  FOLLOWUP_METHODS, FOLLOWUP_RISK_LEVELS,
  MED_ALERT_RESULTS, MED_RESULTS, PT_ABNORMAL_STATUS, PT_CLINICAL_REASONS, PT_DURING_OBS, PT_MODALITIES,
  PT_NONCOMPLETE_REASONS, PT_POST_FEEDBACK, PT_SESSION_STATUS, PT_WILLINGNESS,
  REPORTERS, REPORT_KINDS, ROLE_REPORTER, ROLE_REPORTS,
  SAFETY_TYPES, SEVERITY_LEVELS, THERAPY_STATUS, THERAPY_TYPES,
  type ReportKind, type ReportPayload,
} from "@/lib/reports";

const KIND_ICONS: Record<ReportKind, LucideIcon> = {
  safety: ShieldAlert, medication: Pill, therapy: HeartPulse, butler: Route,
  pt: Zap, communication: MessagesSquare, followup: PhoneCall,
};

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
  type: "chips" | "text" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  showIf?: (values: Record<string, string>) => boolean;
};

const PATIENT_IDS = patients.map((p) => p.id);

const FORM_DEFS: Record<ReportKind, FieldDef[]> = {
  safety: [
    { key: "患者编号", label: "患者", type: "chips", options: PATIENT_IDS, required: true },
    { key: "事件类型", label: "事件类型", type: "chips", options: SAFETY_TYPES, required: true },
    { key: "严重等级", label: "严重等级", type: "chips", options: SEVERITY_LEVELS, required: true },
    { key: "发生时间", label: "发生时间", type: "text", placeholder: "默认当前时间，如 14:30" },
    { key: "处置措施", label: "现场处置措施", type: "textarea", required: true, placeholder: "已采取的保护性措施、安抚、看护安排…" },
  ],
  medication: [
    { key: "患者编号", label: "患者", type: "chips", options: PATIENT_IDS, required: true },
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
    { key: "患者编号", label: "患者", type: "chips", options: PATIENT_IDS, required: true },
    { key: "治疗类型", label: "治疗类型", type: "chips", options: THERAPY_TYPES, required: true },
    { key: "治疗日期", label: "治疗日期", type: "text", placeholder: "默认今天，格式 2026-09-06" },
    { key: "计划时长", label: "计划时长", type: "text", placeholder: "如 50 分钟" },
    { key: "完成状态", label: "完成状态", type: "chips", options: THERAPY_STATUS, required: true },
    { key: "效果评分", label: "效果评分（1-5）", type: "chips", options: ["1", "2", "3", "4", "5"] },
    { key: "会谈靶点", label: "会谈靶点", type: "text", placeholder: "本次聚焦的靶问题" },
    { key: "干预要点", label: "干预要点", type: "textarea", required: true, placeholder: "主要干预技术与患者反应…" },
  ],
  butler: [
    { key: "患者编号", label: "患者", type: "chips", options: PATIENT_IDS, required: true },
    { key: "服务类型", label: "服务类型", type: "chips", options: BUTLER_TYPES, required: true },
    { key: "协调部门", label: "协调部门", type: "chips", options: BUTLER_DEPTS },
    { key: "承诺完成时间", label: "承诺完成时间", type: "text", required: true, placeholder: "如 今日 18:00 前" },
    { key: "备注", label: "备注", type: "textarea", placeholder: "补充说明…" },
  ],
  pt: [
    { key: "患者编号", label: "患者", type: "chips", options: PATIENT_IDS, required: true },
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
    { key: "执行人", label: "执行人", type: "chips", options: REPORTERS, placeholder: "默认与上报人一致" },
    { key: "备注", label: "备注", type: "textarea", placeholder: "补做 / 改期安排等…" },
  ],
  communication: [
    { key: "患者编号", label: "患者", type: "chips", options: PATIENT_IDS, required: true },
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
  /* 出院随访：按《出院患者随访登记台账》13 列；序号自动生成，护士姓名取上报人 */
  followup: [
    { key: "姓名", label: "患者姓名", type: "text", required: true, placeholder: "出院患者姓名" },
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

export function ReportCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, submitReport } = useWorkbench();
  const kinds = ROLE_REPORTS[role.id] ?? [];
  const defaultReporter = ROLE_REPORTER[role.id] ?? role.name;
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [reporter, setReporter] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const active: ReportKind | null = kind && kinds.includes(kind) ? kind : kinds[0] ?? null;
  const fields = active ? FORM_DEFS[active] : [];
  const reporterValue = reporter || defaultReporter;

  const visibleFields = fields.filter((f) => !f.showIf || f.showIf(values));
  const canSubmit = useMemo(
    () => reporterValue.trim().length > 0 && visibleFields.every((f) => !f.required || values[f.key]?.trim()),
    [visibleFields, values, reporterValue],
  );

  const pick = (k: ReportKind) => { setKind(k); setValues({}); };
  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    if (!active || !canSubmit || submitting) return;
    setSubmitting(true);
    const payload: ReportPayload = { 上报人: reporterValue.trim() };
    for (const f of visibleFields) {
      const v = values[f.key]?.trim();
      if (v) payload[f.key] = f.key === "效果评分" ? Number(v) : v;
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
                {kinds.map((k) => {
                  const Icon = KIND_ICONS[k];
                  return (
                    <button key={k} className={active === k ? "active" : ""} onClick={() => pick(k)}>
                      <Icon size={14} />{REPORT_KINDS[k].label}
                    </button>
                  );
                })}
              </nav>

              {active && (
                <div className="report-form">
                  <p className="report-target">写入位置：{REPORT_KINDS[active].tableLabel}</p>
                  <div className="rf-field">
                    <label>上报人<em>*</em></label>
                    <div className="rf-chips">
                      {REPORTERS.map((name) => (
                        <button
                          key={name}
                          type="button"
                          className={reporterValue === name ? "selected" : ""}
                          onClick={() => setReporter(name)}
                        >{name}</button>
                      ))}
                    </div>
                  </div>
                  {visibleFields.map((f) => (
                    <div key={f.key} className="rf-field">
                      <label>{f.label}{f.required && <em>*</em>}</label>
                      {f.type === "chips" && (
                        <div className="rf-chips">
                          {f.options!.map((opt) => (
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
