import { prisma } from "@/lib/prisma";
import { AlertSeverity, TrendDirection, TrendFlagStatus, type Prisma } from "@prisma/client";
import { detectTrends } from "@/lib/clinical/trends";

const SEVERITY_MAP = {
  LOW: AlertSeverity.LOW,
  MEDIUM: AlertSeverity.MEDIUM,
  HIGH: AlertSeverity.HIGH,
} as const;

/** Recomputes deterministic trend flags for a patient, preserving existing narratives. */
export async function computeTrendFlags(patientId: string) {
  const [vitals, testResults] = await Promise.all([
    prisma.vitalSign.findMany({ where: { patientId }, orderBy: { recordedAt: "asc" } }),
    prisma.testResult.findMany({ where: { patientId }, orderBy: { recordedAt: "asc" } }),
  ]);

  const detected = detectTrends({
    vitals: vitals.map((v) => ({ type: v.type, value: v.value, recordedAt: v.recordedAt })),
    testResults: testResults.map((t) => ({ testName: t.testName, result: t.result, recordedAt: t.recordedAt })),
  });

  for (const trend of detected) {
    const existing = await prisma.trendFlag.findUnique({
      where: {
        patientId_metric_direction: {
          patientId,
          metric: trend.metric,
          direction: trend.direction as TrendDirection,
        },
      },
    });
    const summaryChanged = existing?.deterministicSummary !== trend.deterministicSummary;

    await prisma.trendFlag.upsert({
      where: {
        patientId_metric_direction: {
          patientId,
          metric: trend.metric,
          direction: trend.direction as TrendDirection,
        },
      },
      create: {
        patientId,
        metric: trend.metric,
        direction: trend.direction as TrendDirection,
        severity: SEVERITY_MAP[trend.severity],
        window: trend.window,
        dataPoints: trend.points as unknown as Prisma.InputJsonValue,
        deterministicSummary: trend.deterministicSummary,
        status: TrendFlagStatus.ACTIVE,
      },
      update: {
        severity: SEVERITY_MAP[trend.severity],
        window: trend.window,
        dataPoints: trend.points as unknown as Prisma.InputJsonValue,
        deterministicSummary: trend.deterministicSummary,
        computedAt: new Date(),
        // Only clear a narrative if the underlying numbers changed.
        ...(summaryChanged ? { narrative: null } : {}),
        // Recomputing brings a dismissed flag back only if the numbers moved.
        ...(summaryChanged ? { status: TrendFlagStatus.ACTIVE } : {}),
      },
    });
  }

  const active = await getActiveTrendFlags(patientId);
  return { flags: active, detectedCount: detected.length };
}

export function getActiveTrendFlags(patientId: string) {
  return prisma.trendFlag.findMany({
    where: { patientId, status: TrendFlagStatus.ACTIVE },
    orderBy: { computedAt: "desc" },
  });
}

export function saveTrendNarrative(id: string, narrative: string) {
  return prisma.trendFlag.update({ where: { id }, data: { narrative } });
}

export function dismissTrendFlag(id: string) {
  return prisma.trendFlag.update({ where: { id }, data: { status: TrendFlagStatus.DISMISSED } });
}
