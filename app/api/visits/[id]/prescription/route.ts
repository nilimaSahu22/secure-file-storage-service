import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/services/files";
import { S3NotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id },
    select: { patientId: true, prescriptionPdfKey: true },
  });
  if (!visit) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  if (session.user.type === "patient" && session.user.id !== visit.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!visit.prescriptionPdfKey) {
    return NextResponse.json({ error: "NotGenerated" }, { status: 404 });
  }

  try {
    const url = await getDownloadUrl(visit.prescriptionPdfKey);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof S3NotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("Prescription download URL failed:", err);
    return NextResponse.json({ error: "DownloadFailed" }, { status: 500 });
  }
}
