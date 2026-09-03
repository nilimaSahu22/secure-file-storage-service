import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FileStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getAnthropicClient, getDocModel } from "@/lib/ai/client";
import { getObjectBytes, cheapDocumentChecks, finalizeFileDecision } from "@/lib/services/files";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPPORTED = new Set(["application/pdf", "image/png", "image/jpeg"]);

export const documentCheckSchema = z.object({
  documentType: z.enum([
    "lab_report",
    "imaging_report",
    "discharge_summary",
    "prescription",
    "referral",
    "clinical_note",
    "insurance",
    "other_medical",
    "not_medical",
  ]),
  documentDate: z.string().nullable(),
  patientNameOnDocument: z.string().nullable(),
  identityMatch: z.enum(["match", "mismatch", "unclear"]),
  identityRationale: z.string(),
  readable: z.boolean(),
  keyFindings: z.array(z.string()).max(10),
  criticalValues: z.array(z.string()).max(10),
  issues: z.array(z.string()).max(10),
});

export type DocumentCheck = z.infer<typeof documentCheckSchema>;

function buildPrompt(name: string, dob: string) {
  return (
    `You are checking a medical document a patient uploaded to their own record. ` +
    `Account holder: ${name}, date of birth ${dob}. ` +
    `Read the attached document and report: whether it is a medical document and its type; the ` +
    `document's date; the patient name and identifiers visible on it; whether that identity matches ` +
    `the account holder ("match", "mismatch", or "unclear" — use "unclear" when the name is partial or ` +
    `ambiguous, or the scan is too poor to tell); whether the scan is legible; key clinical findings; ` +
    `any critical or abnormal values; and any quality or legibility issues. Do not diagnose. Use only ` +
    `what is visible in the document.`
  );
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.medicalFile.findUnique({
    where: { id },
    include: { patient: { select: { firstName: true, lastName: true, dateOfBirth: true } } },
  });
  if (!file) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  if (session.user.type === "patient" && session.user.id !== file.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accountName = `${file.patient.firstName} ${file.patient.lastName}`;
  const accountDob = file.patient.dateOfBirth.toISOString().slice(0, 10);

  if (!SUPPORTED.has(file.mimeType)) {
    const updated = await finalizeFileDecision(id, {
      status: FileStatus.NEEDS_CLEARER_COPY,
      bounceReason: "We can only review PDF or image files right now. Please upload a PDF or a photo.",
    });
    return NextResponse.json({ status: updated.status, bounceReason: updated.bounceReason });
  }

  let bytes: Buffer;
  try {
    bytes = await getObjectBytes(file.storageKey);
  } catch (err) {
    console.error("Document check: could not read object:", err);
    return NextResponse.json({ error: "ReadFailed" }, { status: 502 });
  }

  const cheap = cheapDocumentChecks(bytes, file.mimeType);
  const base64 = bytes.toString("base64");

  let check: DocumentCheck | null = null;
  try {
    const client = getAnthropicClient();
    const filePart =
      file.mimeType === "application/pdf"
        ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
        : {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: file.mimeType as "image/png" | "image/jpeg",
              data: base64,
            },
          };
    const response = await client.messages.parse({
      model: getDocModel(),
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [filePart, { type: "text", text: buildPrompt(accountName, accountDob) }],
        },
      ],
      output_config: { format: zodOutputFormat(documentCheckSchema) },
    });
    check = response.parsed_output ?? null;
  } catch (err) {
    console.error("Document check AI call failed:", err);
  }

  let status: FileStatus;
  let bounceReason: string | null = null;

  if (!check) {
    status = FileStatus.NEEDS_CLEARER_COPY;
    bounceReason = "We couldn't review this document automatically. Please try uploading it again.";
  } else if (check.identityMatch === "mismatch" || check.documentType === "not_medical") {
    status = FileStatus.BOUNCED;
    bounceReason =
      check.documentType === "not_medical"
        ? "This doesn't look like a medical document, so it hasn't been added to your records."
        : `This document appears to belong to someone else${
            check.patientNameOnDocument ? ` (${check.patientNameOnDocument})` : ""
          }, so it hasn't been shared with your care team.`;
  } else if (check.identityMatch === "unclear" || !check.readable || !cheap.readable) {
    status = FileStatus.NEEDS_CLEARER_COPY;
    bounceReason =
      !check.readable || !cheap.readable
        ? "The scan is hard to read. Please upload a clearer copy."
        : "We couldn't confirm this document is yours. Please upload a copy that clearly shows your name and date of birth.";
  } else {
    status = FileStatus.ACCEPTED;
  }

  const documentDate = check?.documentDate ? new Date(check.documentDate) : null;
  const updated = await finalizeFileDecision(id, {
    status,
    validation: check
      ? { ...check, cheapIssues: cheap.issues }
      : { cheapIssues: cheap.issues, aiUnavailable: true },
    documentDate: documentDate && !Number.isNaN(documentDate.getTime()) ? documentDate : null,
    bounceReason,
  });

  await logAudit({
    actorType: session.user.type === "patient" ? "patient" : "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown",
    action: "file.checked",
    targetType: "MedicalFile",
    targetId: id,
    metadata: {
      decision: status,
      identityMatch: check?.identityMatch ?? "unknown",
      documentType: check?.documentType ?? "unknown",
    },
  });

  return NextResponse.json({ status: updated.status, bounceReason: updated.bounceReason });
}
