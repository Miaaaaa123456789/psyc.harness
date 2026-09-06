import { NextResponse } from "next/server";
import { driver } from "@/lib/server/db";
import { computeFollowupTasks } from "@/lib/server/followups";

export const dynamic = "force-dynamic";

/**
 * GET /api/followups —— 需要随访的患者名单。
 *
 * 口径：15_出院随访记录按患者取最近一次随访，以其「下次随访时间」判定
 * 逾期 / 今日 / 7日内 / 已排期 / 未排期；01 表中已出院但从未随访的患者补为「待首次随访」。
 */
export async function GET() {
  try {
    const { tasks, summary, source } = await computeFollowupTasks();
    return NextResponse.json({ ok: true, tasks, summary, source, driver: driver() });
  } catch (err) {
    console.error("[api/followups] 读取失败：", err);
    return NextResponse.json({ ok: false, tasks: [], summary: null, source: "none", driver: driver() });
  }
}
