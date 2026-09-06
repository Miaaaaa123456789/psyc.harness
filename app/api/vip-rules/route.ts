import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { DEFAULT_VIP_RULES } from "@/lib/copilot";

export const dynamic = "force-dynamic";

/**
 * GET /api/vip-rules —— VIP 分层规则（后台可配置）。
 * 配置来源 data/vip-rules.json；读取失败时回落代码内默认值。
 */
export async function GET() {
  try {
    const file = path.join(process.cwd(), "data", "vip-rules.json");
    const raw = await readFile(file, "utf-8");
    const config = JSON.parse(raw) as { rules?: unknown };
    if (Array.isArray(config.rules) && config.rules.length) {
      return NextResponse.json({ rules: config.rules, source: "config" });
    }
  } catch {
    // 配置缺失或损坏：回落默认规则
  }
  return NextResponse.json({ rules: DEFAULT_VIP_RULES, source: "default" });
}
