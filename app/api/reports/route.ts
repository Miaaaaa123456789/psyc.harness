import { NextResponse } from "next/server";
import { createReport } from "@/lib/server/db";
import { driver } from "@/lib/server/db";
import { isReportKind, REPORT_KINDS, type ReportPayload } from "@/lib/reports";

export const dynamic = "force-dynamic";

type Body = {
  kind?: unknown;
  payload?: unknown;
  actor?: unknown;
  roleId?: unknown;
};

/**
 * POST /api/reports —— 统一填报中心写入入口。
 * body: { kind: "safety"|"medication"|"therapy"|"butler", payload: {...}, actor?, roleId? }
 * 成功返回 { ok, recordId, taskId?, driver }；taskId 存在说明命中联动规则已生成任务工单。
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  if (!isReportKind(body.kind)) {
    return NextResponse.json(
      { error: `kind 必须是 ${Object.keys(REPORT_KINDS).join(" / ")}` },
      { status: 400 },
    );
  }
  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return NextResponse.json({ error: "payload 必须是字段对象" }, { status: 400 });
  }

  const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim() : "未署名操作者";
  const roleId = typeof body.roleId === "string" ? body.roleId : null;

  try {
    const result = await createReport(body.kind, body.payload as ReportPayload, actor, roleId);
    return NextResponse.json({ ok: true, ...result, driver: driver() });
  } catch (err) {
    console.error("[api/reports] 写入失败：", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "写入失败" },
      { status: 502 },
    );
  }
}
