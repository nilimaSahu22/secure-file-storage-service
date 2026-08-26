import { NextRequest, NextResponse } from "next/server";
import type { Department } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presignUpload, filterFilesForStaff, assertDepartmentAccess, FileAccessDeniedError } from "@/lib/services/files";
import { S3NotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patientId = request.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  if (session.user.type === "patient" && session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const files = await prisma.medicalFile.findMany({
    where: { patientId },
    orderBy: [{ category: "asc" }, { version: "desc" }],
  });

  if (session.user.type === "staff" && session.user.role) {
    const visible = filterFilesForStaff(files, {
      id: session.user.id,
      role: session.user.role,
      department: session.user.department ?? null,
    });
    return NextResponse.json({ files: visible });
  }

  return NextResponse.json({ files });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const fileName = body?.fileName;
  const mimeType = body?.mimeType;
  const sizeBytes = body?.sizeBytes;
  const department = body?.department as Department | undefined;

  if (typeof fileName !== "string" || typeof mimeType !== "string" || typeof sizeBytes !== "number") {
    return NextResponse.json({ error: "fileName, mimeType, sizeBytes are required" }, { status: 400 });
  }

  if (session.user.type === "staff" && session.user.role) {
    try {
      assertDepartmentAccess(
        { id: session.user.id, role: session.user.role, department: session.user.department ?? null },
        department ?? null
      );
    } catch (err) {
      if (err instanceof FileAccessDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
  }

  try {
    const result = await presignUpload({ fileName, mimeType, sizeBytes });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof S3NotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Presign failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
