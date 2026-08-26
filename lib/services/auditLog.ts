import { prisma } from "@/lib/prisma";

export interface AuditLogFilters {
  actorName?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export function getAuditLogs(filters: AuditLogFilters = {}) {
  return prisma.auditLog.findMany({
    where: {
      actorName: filters.actorName ? { contains: filters.actorName, mode: "insensitive" } : undefined,
      action: filters.action ? { contains: filters.action, mode: "insensitive" } : undefined,
      createdAt:
        filters.from || filters.to
          ? {
              gte: filters.from,
              lte: filters.to,
            }
          : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
