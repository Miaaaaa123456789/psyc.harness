/**
 * 患者身份处理（纯工具，前后端共用）
 * ------------------------------------------------------------------
 * 上报人填写真实姓名（如「林心雨」），系统统一按「首字 + X + 末字」脱敏后
 * 入飞书 01 患者主档并在界面展示（林心雨 → 林X雨），避免明文姓名散落到业务表。
 */

/** 姓名脱敏：保留首尾字，中间每个字替换为 X。单字返回 X，两字返回「首字X」 */
export function maskPatientName(raw: string): string {
  const chars = [...String(raw ?? "").trim()].filter((c) => c !== " ");
  if (chars.length === 0) return "";
  if (chars.length === 1) return "X";
  if (chars.length === 2) return `${chars[0]}X`;
  return `${chars[0]}${"X".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/** 患者编号格式：P- + 3 位数字（建档时随机生成，冲突自动换号） */
export function isPatientIdValid(id: string): boolean {
  return /^P-\d{3}$/.test(String(id ?? "").trim());
}

export type PatientOption = {
  /** 患者编号 P-xxx */
  id: string;
  /** 脱敏后的姓名代号，如 林X雨 */
  name: string;
  /** 当前阶段 / 状态描述 */
  stage: string;
  /** 风险等级（可为空） */
  risk: string;
};
