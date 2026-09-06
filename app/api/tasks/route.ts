import { NextResponse } from "next/server";
import { listTasks, driver } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const tasks = await listTasks();
  return NextResponse.json({ tasks, driver: driver() });
}
