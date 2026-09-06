import { NextResponse } from "next/server";
import { computeWorkload, summarizeByGroup } from "@/lib/server/workload";
import { driver } from "@/lib/server/db";
import type { PortalStaffKey } from "@/lib/roster";

export const dynamic = "force-dynamic";

/**
 * GET /api/workload —— 人员工作量统计（每个上报人一个统计口径）
 *
 * 查询参数：
 *   group=doctor|nurse|therapist|butler  只统计某一端
 *   name=李                               只查某一个人的明细
 *
 * 口径：扫描飞书各业务表的人员字段（发现人/确认护士/治疗师/管家/上报人/
 * 执行人/护士姓名/记录人），按人聚合；manual 只计「人工填报」来源，
 * 演示种子数据不计入个人绩效。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const group = (searchParams.get("group") ?? "") as PortalStaffKey | "";
  const name = searchParams.get("name")?.trim() ?? "";

  try {
    const staff = await computeWorkload(group || undefined);
    const rows = name ? staff.filter((r) => r.name === name) : staff;
    return NextResponse.json({
      staff: rows,
      groups: summarizeByGroup(staff),
      total: rows.reduce((s, r) => s + r.total, 0),
      manual: rows.reduce((s, r) => s + r.manual, 0),
      source: driver(),
    });
  } catch (err) {
    console.error("[api/workload] 统计失败：", err);
    return NextResponse.json({ staff: [], groups: [], total: 0, manual: 0, source: "none" });
  }
}
