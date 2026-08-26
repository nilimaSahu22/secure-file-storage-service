import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertDepartmentAccess, FileAccessDeniedError, getDownloadUrl } from "@/lib/services/files";
import { S3NotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.medicalFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "NotFound" }, { status: 404 });

  if (session.user.type === "patient" && session.user.id !== file.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.user.type === "staff" && session.user.role) {
    try {
      assertDepartmentAccess(
        { id: session.user.id, role: session.user.role, department: session.user.department ?? null },
        file.department
      );
    } catch (err) {
      if (err instanceof FileAccessDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
  }

  try {
    const url = await getDownloadUrl(file.storageKey);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof S3NotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("Download URL generation failed:", err);
    return NextResponse.json({ error: "DownloadFailed" }, { status: 500 });
  }
}
