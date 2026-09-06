import { NextRequest, NextResponse } from "next/server";
import { applyTaskAction, type TaskAction } from "@/lib/server/db";
import { notifyFeishu } from "@/lib/server/feishu";

export const dynamic = "force-dynamic";

type Body = {
  type: TaskAction["type"];
  actor?: string;
  reason?: string;
  dept?: string;
  /** 操作人所在角色端（doctor/nurse/therapist/…），写入审计日志 */
  roleId?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!["accept", "complete", "reject", "transfer"].includes(body.type)) {
    return NextResponse.json({ error: "unknown action type" }, { status: 400 });
  }
  if (body.type === "reject" && !body.reason) {
    return NextResponse.json({ error: "reject requires reason" }, { status: 400 });
  }
  if (body.type === "transfer" && !body.dept) {
    return NextResponse.json({ error: "transfer requires dept" }, { status: 400 });
  }

  const actor = body.actor?.trim() || "未署名操作者";
  const action = { type: body.type, actor, reason: body.reason, dept: body.dept } as TaskAction;
  const task = await applyTaskAction(id, action, body.roleId ?? null);
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const lastLog = task.log[task.log.length - 1];
  notifyFeishu({ taskId: id, actor, action: lastLog.action, status: task.status });

  return NextResponse.json({ task });
}
