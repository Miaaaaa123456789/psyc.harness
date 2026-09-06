import { NextResponse } from "next/server";
import { driver } from "@/lib/server/db";
import { computePtBoard } from "@/lib/server/pt";

export const dynamic = "force-dynamic";

/**
 * GET /api/pt —— 物理治疗执行看板（13_物理治疗执行与沟通）。
 *
 * 输出：执行汇总（完成/非正常完成/临床类待复核）+ 按项目、状态、执行人分布 + 最近执行记录。
 */
export async function GET() {
  try {
    const { records, summary, source } = await computePtBoard();
    return NextResponse.json({ ok: true, records, summary, source, driver: driver() });
  } catch (err) {
    console.error("[api/pt] 读取失败：", err);
    return NextResponse.json({ ok: false, records: [], summary: null, source: "none", driver: driver() });
  }
}
