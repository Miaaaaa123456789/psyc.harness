import { NextResponse } from "next/server";
import { createPatient, listPatients } from "@/lib/server/patients";
import type { PatientOption } from "@/lib/patient";
import { patients as localPatients } from "@/lib/hospital";

export const dynamic = "force-dynamic";

/** 飞书不可用时回落：本地演示患者（无姓名，仅按编号选择） */
function fallback(): PatientOption[] {
  return localPatients.map((p) => ({ id: p.id, name: "", stage: p.stage, risk: "" }));
}

/** 患者列表（填报中心「患者」选择器数据源） */
export async function GET() {
  try {
    const list = await listPatients();
    if (list.length === 0) return NextResponse.json({ ok: true, source: "local", patients: fallback() });
    return NextResponse.json({ ok: true, source: "bitable:api", patients: list });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      source: "local",
      patients: fallback(),
      warning: (e as Error).message,
    });
  }
}

/** 新患者建档：上报人填写的真实姓名在此脱敏（林心雨 → 林X雨）后写入 01 表 */
export async function POST(req: Request) {
  let body: { name?: string; actor?: string } = {};
  try {
    body = (await req.json()) as { name?: string; actor?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "请求体解析失败" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "请填写患者姓名" }, { status: 400 });

  const res = await createPatient(name, body.actor);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  return NextResponse.json({ ok: true, patient: res.patient, masked: res.patient.name });
}
