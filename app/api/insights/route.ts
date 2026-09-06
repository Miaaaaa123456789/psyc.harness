import { NextResponse } from "next/server";
import { driver } from "@/lib/server/db";
import { computeInsights } from "@/lib/server/insights";
import { sortInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights —— 洞察卡与自定义记录统计。
 *
 * 口径：只统计「人工填报」来源的记录，系统演示种子数据一律排除。
 * 洞察结构遵循飞书《洞察行动矩阵》：洞察与证据 / 数据依据 / 建议行动 / 人工边界，
 * 数据不足时带 uncertainty 降级说明，不编造结论。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // scope=stats 只查自定义记录表（快），用于填报提交后即时刷新统计；默认 full 计算全部洞察
  const scope = searchParams.get("scope") === "stats" ? "stats" : "full";
  try {
    const { insights, custom, source } = await computeInsights(scope);
    return NextResponse.json({ insights: sortInsights(insights), custom, source, driver: driver() });
  } catch (err) {
    console.error("[api/insights] 读取失败：", err);
    return NextResponse.json({ insights: [], custom: null, source: "none", driver: driver() });
  }
}
