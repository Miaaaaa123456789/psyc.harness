import { listRecords, createRecord, TABLES } from "./bitable";
import { maskPatientName, type PatientOption } from "../patient";

/**
 * 01 患者主档读写
 * ------------------------------------------------------------------
 * 填报中心不再只给固定几个患者编号选：上报人可以直接输入新患者姓名，
 * 服务端脱敏后（林心雨 → 林X雨）自动在 01 表建档并生成患者编号，
 * 之后该患者即可在所有填报表单里被选中，数据统一落到业务表。
 */

/** 单元格可能是字符串 / 数组 / {text} */
function cellText(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return cellText(v[0]);
  if (typeof v === "object" && "text" in (v as Record<string, unknown>)) {
    return String((v as { text: unknown }).text ?? "").trim();
  }
  return String(v).trim();
}

/**
 * 01 表「姓名代号」形如「P-042 林某」或「P-042 林X雨」。
 * 拆出姓名部分；历史数据若已是纯姓名也兼容。
 */
function splitCode(code: string, id: string): string {
  const s = cellText(code);
  if (!s) return "";
  const rest = s.startsWith(id) ? s.slice(id.length).trim() : s;
  return rest || s;
}

/** 读取患者列表（飞书 01 表） */
export async function listPatients(): Promise<PatientOption[]> {
  const rows = await listRecords(TABLES.patient);
  return rows
    .map((r) => {
      const f = r.fields ?? {};
      const id = cellText(f["患者编号"]);
      if (!id) return null;
      return {
        id,
        name: splitCode(f["姓名代号"] as string, id),
        stage: cellText(f["当前阶段"]) || "—",
        risk: cellText(f["风险等级"]),
      } satisfies PatientOption;
    })
    .filter((x): x is PatientOption => x !== null);
}

/** 生成一个当前未占用的患者编号（P-100 ~ P-999） */
function nextPatientId(used: Set<string>): string {
  for (let i = 0; i < 200; i++) {
    const id = `P-${String(Math.floor(Math.random() * 900) + 100)}`;
    if (!used.has(id)) return id;
  }
  return `P-${Date.now().toString().slice(-3)}`;
}

export type CreatePatientResult = { ok: true; patient: PatientOption } | { ok: false; error: string };

/**
 * 新患者建档（写 01 表）
 * @param rawName 上报人填写的真实姓名（服务端脱敏后再入库，不保存明文）
 * @param actor 建档人（上报人），写入责任护士留痕
 */
export async function createPatient(rawName: string, actor?: string): Promise<CreatePatientResult> {
  const name = maskPatientName(rawName);
  if (!name) return { ok: false, error: "请填写患者姓名" };

  let existing: PatientOption[] = [];
  try {
    existing = await listPatients();
  } catch {
    /* 读不到也不阻塞建档，编号冲突概率极低 */
  }
  const id = nextPatientId(new Set(existing.map((p) => p.id)));

  const fields: Record<string, unknown> = {
    患者编号: id,
    姓名代号: `${id} ${name}`,
    当前阶段: "新建档 · 待评估",
    临床状态: "待评估",
    风险等级: "待评估",
    照护强度: "C2",
    服务配置等级: "标准",
    治疗航图阶段: "建立关系",
    关注度: 0,
    是否重点患者: false,
    入院日期: Date.now(),
    责任护士: actor || "待分配",
    责任医生: "待分配",
    责任治疗师: "待分配",
    专属管家: "—",
  };

  try {
    await createRecord(TABLES.patient, fields);
  } catch (e) {
    return { ok: false, error: `建档失败：${(e as Error).message}` };
  }
  return { ok: true, patient: { id, name, stage: "新建档 · 待评估", risk: "待评估" } };
}
