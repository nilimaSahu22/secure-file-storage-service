import { prisma } from "@/lib/prisma";

export function saveChartSummary(patientId: string, summary: string) {
  return prisma.chartSummary.create({ data: { patientId, summary } });
}

export function getLatestChartSummary(patientId: string) {
  return prisma.chartSummary.findFirst({
    where: { patientId },
    orderBy: { generatedAt: "desc" },
  });
}
