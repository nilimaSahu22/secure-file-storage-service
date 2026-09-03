import { NextRequest, NextResponse } from "next/server";
import { FileSource, type Department } from "@prisma/client";
import { auth } from "@/lib/auth";
import {
  confirmUpload,
  stageUpload,
  assertDepartmentAccess,
  FileAccessDeniedError,
  DuplicateFileError,
} from "@/lib/services/files";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const patientId = body?.patientId;
  const storageKey = body?.storageKey;
  const fileName = body?.fileName;
  const mimeType = body?.mimeType;
  const sizeBytes = body?.sizeBytes;
  const category = body?.category;
  const department = body?.department as Department | undefined;

  if (
    typeof patientId !== "string" ||
    typeof storageKey !== "string" ||
    typeof fileName !== "string" ||
    typeof mimeType !== "string" ||
    typeof sizeBytes !== "number" ||
    typeof category !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  if (session.user.type === "patient" && session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (session.user.type === "patient") {
      // Patient uploads are staged as PENDING and then run through the AI intake check.
      const { file } = await stageUpload({
        patientId,
        storageKey,
        fileName,
        mimeType,
        sizeBytes,
        category,
        source: FileSource.PATIENT,
        uploadedByPatient: true,
      });
      await logAudit({
        actorType: "patient",
        actorId: session.user.id,
        actorName: session.user.name ?? "Unknown",
        action: "file.uploaded",
        targetType: "MedicalFile",
        targetId: file.id,
        metadata: { patientId, category, fileName, version: file.version, status: "PENDING" },
      });
      return NextResponse.json({ fileId: file.id, status: file.status }, { status: 201 });
    }

    const file = await confirmUpload({
      patientId,
      storageKey,
      fileName,
      mimeType,
      sizeBytes,
      category,
      department: department ?? null,
      uploadedByStaffId: session.user.id,
      uploadedByPatient: false,
    });

    await logAudit({
      actorType: "staff",
      actorId: session.user.id,
      actorName: session.user.name ?? "Unknown",
      action: "file.uploaded",
      targetType: "MedicalFile",
      targetId: file.id,
      metadata: { patientId, category, fileName, version: file.version },
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateFileError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("File confirm failed:", err);
    return NextResponse.json({ error: "ConfirmFailed" }, { status: 500 });
  }
}
