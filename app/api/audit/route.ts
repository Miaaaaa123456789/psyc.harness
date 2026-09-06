import { NextResponse } from "next/server";
import { driver, listAudit } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** GET /api/audit —— 审计日志（03 表，新的在前，默认最近 30 条） */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
  try {
    const entries = await listAudit(limit);
    return NextResponse.json({ entries, driver: driver() });
  } catch (err) {
    console.error("[api/audit] 读取失败：", err);
    return NextResponse.json({ entries: [], driver: driver() });
  }
}
