import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface LogAuditInput {
  actorType: "staff" | "patient" | "system";
  actorId?: string | null;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

// Audit logging must never break the action it's recording — failures are
// logged to the server console rather than thrown.
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? undefined,
        actorName: input.actorName,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
