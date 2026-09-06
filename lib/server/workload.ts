import { listRecords, TABLES, SOURCE_MANUAL } from "./bitable";
import { STAFF_GROUPS, type PortalStaffKey } from "../roster";

/**
 * 人员工作量统计（服务端聚合）
 * ------------------------------------------------------------------
 * 每一个上报人都必须能被统计：填报写入飞书业务表时，人名落在各表自己的
 * 人员字段上（发现人 / 确认护士 / 治疗师 / 管家 / 上报人 / 执行人 / 护士姓名 / 记录人）。
 * 本模块扫描这些字段，按人聚合，供治理中枢按岗位下钻与个人绩效核对。
 */

/**
 * 参与工作量统计的业务表及该表承载人名的字段。
 * 04/05/08/13/14/15/16 七张绩效来源表统一以「上报人」为主口径，
 * 同时保留各表原有人员字段（发现人 / 确认护士 / 对接人 / 执行人 / 护士姓名 / 记录人）兜底。
 */
const WORK_TABLES: { table: string; label: string; fields: string[] }[] = [
  { table: TABLES.safety, label: "安全事件", fields: ["上报人", "发现人"] },
  { table: TABLES.medication, label: "给药执行", fields: ["上报人", "确认护士"] },
  { table: TABLES.therapy, label: "心理治疗", fields: ["治疗师"] },
  { table: TABLES.butler, label: "管家工单", fields: ["管家"] },
  { table: TABLES.family, label: "家属沟通", fields: ["上报人", "对接人"] },
  { table: TABLES.pt, label: "物理治疗", fields: ["上报人", "执行人"] },
  { table: TABLES.communication, label: "在院沟通", fields: ["上报人"] },
  { table: TABLES.followup, label: "出院随访", fields: ["上报人", "护士姓名"] },
  { table: TABLES.custom, label: "自定义记录", fields: ["上报人", "记录人"] },
];

export type StaffWorkload = {
  name: string;
  /** 所属端（医生端/护理端/治疗师端/管家端/患者家属端） */
  group: string;
  groupKey: PortalStaffKey;
  /** 记录总条数 */
  total: number;
  /** 其中「人工填报」条数（排除演示种子） */
  manual: number;
  /** 分表明细：{ 安全事件: 3, 给药执行: 12 } */
  byTable: Record<string, number>;
};

/** 单元格可能是字符串（单选）或数组（多选 / cli 返回） */
function cellNames(v: unknown): string[] {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => (x && typeof x === "object" && "text" in x ? String((x as { text: unknown }).text) : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof v === "object" && "text" in (v as Record<string, unknown>)) {
    const t = String((v as { text: unknown }).text).trim();
    return t ? [t] : [];
  }
  const s = String(v).trim();
  return s ? [s] : [];
}

function groupOf(name: string): { label: string; key: PortalStaffKey } {
  const g = STAFF_GROUPS.find((x) => x.members.includes(name));
  return g ? { label: g.label, key: g.key } : { label: "未归类", key: "self" };
}

/**
 * 聚合全院（或指定端）人员工作量。
 * @param onlyGroup 只统计某一端（doctor/nurse/therapist/butler）；不传则全院
 */
export async function computeWorkload(onlyGroup?: PortalStaffKey): Promise<StaffWorkload[]> {
  const acc = new Map<string, StaffWorkload>();

  const bump = (name: string, table: string, manual: boolean) => {
    const meta = groupOf(name);
    if (onlyGroup && meta.key !== onlyGroup && meta.key !== "self") return;
    let row = acc.get(name);
    if (!row) {
      row = { name, group: meta.label, groupKey: meta.key, total: 0, manual: 0, byTable: {} };
      acc.set(name, row);
    }
    row.total += 1;
    if (manual) row.manual += 1;
    row.byTable[table] = (row.byTable[table] ?? 0) + 1;
  };

  await Promise.all(
    WORK_TABLES.map(async ({ table, label, fields }) => {
      let records: Awaited<ReturnType<typeof listRecords>> = [];
      try {
        records = await listRecords(table);
      } catch {
        return; // 单表读取失败不影响整体统计
      }
      for (const r of records) {
        const f = r.fields ?? {};
        const src = f["数据来源"];
        const manual = cellNames(src).includes(SOURCE_MANUAL) || String(src ?? "") === SOURCE_MANUAL;
        /* 同一条记录可能被多个人员字段命中（上报人 + 原字段），人名去重后只计一次 */
        const names = new Set<string>();
        for (const field of fields) {
          for (const n of cellNames(f[field])) names.add(n);
        }
        for (const n of names) bump(n, label, manual);
      }
    }),
  );

  return [...acc.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "zh"));
}

/** 按端汇总（治理中枢顶端概览用） */
export function summarizeByGroup(rows: StaffWorkload[]) {
  const map = new Map<string, { group: string; staff: number; total: number; manual: number }>();
  for (const r of rows) {
    let g = map.get(r.group);
    if (!g) {
      g = { group: r.group, staff: 0, total: 0, manual: 0 };
      map.set(r.group, g);
    }
    g.staff += 1;
    g.total += r.total;
    g.manual += r.manual;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
