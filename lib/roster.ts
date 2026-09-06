/**
 * 人员花名册 · 唯一真源
 * ------------------------------------------------------------------
 * 前后端与飞书多维表人员单选字段共用本文件，避免多份名单漂移。
 * 服务端（lib/server/bitable.ts）与客户端（填报中心 / 治理中枢）均从此取数。
 *
 * 设计原则：
 * 1. 每个角色端只显示本端人员，不跨端串名单；
 * 2. 每个人员都归属明确端，写入飞书后可按人聚合统计工作量；
 * 3. 纯数据模块，无 "use client"、无图标依赖，服务端可安全引用。
 */

import type { RoleId } from "./hospital";

/** 护理端 18 人 */
export const NURSES = [
  "李", "彭1", "杨1", "杨2", "邱", "陈", "刘", "沈", "袁",
  "何", "彭2", "杜", "杨3", "丁", "赵", "曾", "吴", "任",
];

export type DoctorTier = "二线/审核" | "一线/执行";

/** 医生端 7 人（含责任层级：二线审核 / 一线执行） */
export const DOCTORS: { name: string; tier: DoctorTier }[] = [
  { name: "孙", tier: "二线/审核" },
  { name: "胡", tier: "二线/审核" },
  { name: "王1", tier: "一线/执行" },
  { name: "王2", tier: "一线/执行" },
  { name: "康", tier: "一线/执行" },
  { name: "赵", tier: "一线/执行" },
  { name: "游", tier: "一线/执行" },
];

export const DOCTOR_NAMES = DOCTORS.map((d) => d.name);

/** 治疗师端 6 人 */
export const THERAPISTS = ["陈", "杨", "蔡", "冯", "王", "赵"];

/** 管家服务端 5 人 */
export const BUTLERS = ["黄", "朱", "章", "邓", "唐"];

/** 患者 / 家属端：本人，不参与院内工作量统计 */
export const SELF_REPORTERS = ["本人"];

export type PortalStaffKey = "doctor" | "nurse" | "therapist" | "butler" | "ops" | "self";

export type StaffGroup = {
  key: PortalStaffKey;
  /** 端名称（中文，与飞书单选选项分组一致） */
  label: string;
  /** 端内人员 */
  members: string[];
};

/** 各端花名册 */
export const STAFF_GROUPS: StaffGroup[] = [
  { key: "doctor", label: "医生端", members: DOCTOR_NAMES },
  { key: "nurse", label: "护理端", members: NURSES },
  { key: "therapist", label: "治疗师端", members: THERAPISTS },
  { key: "butler", label: "管家端", members: BUTLERS },
  { key: "self", label: "患者/家属端", members: SELF_REPORTERS },
];

/**
 * 角色端 → 可用上报人。
 * 管理 / 院领导端需要代填，故展示全院名单（按端分组）。
 */
export const ROSTER_BY_ROLE: Record<RoleId, string[]> = {
  doctor: DOCTOR_NAMES,
  nurse: NURSES,
  therapist: THERAPISTS,
  butler: BUTLERS,
  patient: SELF_REPORTERS,
  family: SELF_REPORTERS,
  ops: [...DOCTOR_NAMES, ...NURSES, ...THERAPISTS, ...BUTLERS],
  leader: [...DOCTOR_NAMES, ...NURSES, ...THERAPISTS, ...BUTLERS],
};

/** 各角色端默认上报人 */
export const DEFAULT_REPORTER: Record<RoleId, string> = {
  doctor: DOCTOR_NAMES[0],
  nurse: NURSES[0],
  therapist: THERAPISTS[0],
  butler: BUTLERS[0],
  patient: SELF_REPORTERS[0],
  family: SELF_REPORTERS[0],
  ops: NURSES[0],
  leader: NURSES[0],
};

/** 全院花名册并集（用于飞书 select 选项与后端合法性校验） */
export const ALL_STAFF: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of STAFF_GROUPS) {
    for (const m of g.members) {
      if (seen.has(m)) continue;
      seen.add(m);
      out.push(m);
    }
  }
  return out;
})();

/** 人名 → 所属端（工作量统计分组用） */
export function staffGroup(name: string): StaffGroup | undefined {
  return STAFF_GROUPS.find((g) => g.members.includes(name));
}
