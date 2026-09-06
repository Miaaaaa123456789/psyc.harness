import { NextResponse } from "next/server";
import { driver } from "@/lib/server/db";
import { askAgent } from "@/lib/server/agent";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent —— Copilot Agent 问答入口。
 *
 * 输入：{ message: string, role?: string }（role 为当前角色端 id，用于答案侧重点微调）
 * 输出：{ ok, reply, intent, sources, tookMs, driver }
 *
 * 隐私：所有患者姓名在回答返回前已统一脱敏（林心雨 → 林X雨），
 * 明文姓名不会出现在任何回答文本中。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string; role?: string };
    const message = String(body.message ?? "").slice(0, 500);
    if (!message.trim()) {
      return NextResponse.json({ ok: false, error: "请输入问题" }, { status: 400 });
    }
    const result = await askAgent(message, body.role);
    return NextResponse.json({ ok: true, ...result, driver: driver() });
  } catch (err) {
    console.error("[api/agent] 处理失败：", err);
    return NextResponse.json({ ok: false, error: "服务异常，请稍后重试" }, { status: 500 });
  }
}
