import { listRecords, TABLES } from "./bitable";
import { PT_ABNORMAL_STATUS, PT_CLINICAL_REASONS } from "../reports";
import type { PtRecord, PtSummary } from "../pt";

/**
 * 物理治疗层 —— 输入 13_物理治疗执行与沟通，输出执行看板与最近记录。
 *
 * 口径：
 * - 执行状态 = 已完成 视为正常完成；其余（部分完成/取消/拒绝/暂停/未到）为非正常完成。
 * - 非正常完成中，未完成原因为临床类（患者拒绝/不适/临床暂停）的进入团队复核，
 *   设备/排程等运营类原因不进风险模型。
 */

type Row = Record<string, unknown>;
const txt = (r: Row, k: string) => String(r[k] ?? "").trim();

function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16).replace("T", " ");
  }
  return String(v).trim();
}

export async function computePtBoard(limit = 40): Promise<{ records: PtRecord[]; summary: PtSummary; source: string }> {
  const rows = await listRecords(TABLES.pt);

  const records: PtRecord[] = rows.map((r) => {
    const f = r.fields as Row;
    const status = txt(f, "执行状态");
    const reason = txt(f, "未完成原因");
    const abnormal = PT_ABNORMAL_STATUS.includes(status);
    return {
      id: r.record_id,
      code: txt(f, "记录编号"),
      patientId: txt(f, "患者编号"),
      modality: txt(f, "治疗项目"),
      status,
      abnormal,
      clinical: abnormal && PT_CLINICAL_REASONS.includes(reason),
      reason,
      willingness: txt(f, "治疗意愿"),
      during: txt(f, "治疗中观察"),
      feedback: txt(f, "治疗后反馈"),
      adverse: txt(f, "不良反应及处置"),
      planAt: fmtDate(f["计划时间"]),
      reportAt: fmtDate(f["上报时间"]),
      reporter: txt(f, "上报人"),
      executor: txt(f, "执行人"),
      source: txt(f, "数据来源"),
    };
  });

  records.sort((a, b) => (b.reportAt || b.planAt).localeCompare(a.reportAt || a.planAt));

  const tally = (pick: (r: PtRecord) => string) => {
    const map = new Map<string, number>();
    for (const r of records) {
      const k = pick(r);
      if (!k) continue;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  const summary: PtSummary = {
    total: records.length,
    done: records.filter((r) => !r.abnormal).length,
    abnormal: records.filter((r) => r.abnormal).length,
    clinical: records.filter((r) => r.clinical).length,
    byModality: tally((r) => r.modality),
    byStatus: tally((r) => r.status),
    byExecutor: tally((r) => r.executor || r.reporter),
  };

  return { records: records.slice(0, limit), summary, source: "bitable" };
}
