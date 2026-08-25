import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { resetDemoData } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const env = getEnv();
  const token = request.headers.get("x-admin-reset-token");

  if (token !== env.ADMIN_RESET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetDemoData();
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Reset demo data failed:", err);
    return NextResponse.json({ error: "ResetFailed" }, { status: 500 });
  }
}
