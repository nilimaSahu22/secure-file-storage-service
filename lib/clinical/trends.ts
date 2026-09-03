// Pure, illustrative trend detection for demo purposes only — thresholds are not
// clinically validated. No DB access, no side effects.

export type TrendDirection = "RISING" | "FALLING" | "FLUCTUATING";
export type TrendSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface TrendPoint {
  date: string; // ISO
  value: number;
}

export interface DetectedTrend {
  metric: string;
  direction: TrendDirection;
  severity: TrendSeverity;
  window: string;
  points: TrendPoint[];
  deterministicSummary: string;
}

export interface TrendInput {
  vitals: { type: string; value: string; recordedAt: Date }[];
  testResults: { testName: string; result: string; recordedAt: Date }[];
}

/** Parses a leading number from free text like "7.2%", "138 mg/dL", "2.0–3.0". */
export function parseLeadingNumber(text: string): number | null {
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

// metric name -> { rise threshold (abs delta across window), unit for the summary }
const RISE_THRESHOLDS: Record<string, { delta: number; unit: string; label: string }> = {
  "Blood Pressure Systolic": { delta: 10, unit: "mmHg", label: "Systolic blood pressure" },
  "Blood Pressure Diastolic": { delta: 8, unit: "mmHg", label: "Diastolic blood pressure" },
  Glucose: { delta: 20, unit: "mg/dL", label: "Glucose" },
  Weight: { delta: 0, unit: "kg", label: "Weight" }, // handled as % below
  HbA1c: { delta: 0.5, unit: "%", label: "HbA1c" },
};

function fuzzyThreshold(metric: string): { delta: number; unit: string; label: string } | null {
  if (RISE_THRESHOLDS[metric]) return RISE_THRESHOLDS[metric];
  const lower = metric.toLowerCase();
  if (lower.includes("hba1c") || lower.includes("a1c")) return RISE_THRESHOLDS.HbA1c;
  if (lower.includes("ldl")) return { delta: 15, unit: "mg/dL", label: metric };
  return null;
}

function analyseSeries(metric: string, series: TrendPoint[]): DetectedTrend | null {
  if (series.length < 3) return null;
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const delta = last - first;

  const cfg = fuzzyThreshold(metric);
  const windowLabel = `${sorted.length} readings`;

  const isWeight = metric.toLowerCase().includes("weight");
  const pctChange = first !== 0 ? (delta / first) * 100 : 0;

  let direction: TrendDirection | null = null;
  let severity: TrendSeverity = "LOW";

  if (isWeight) {
    if (Math.abs(pctChange) >= 5) {
      direction = delta > 0 ? "RISING" : "FALLING";
      severity = Math.abs(pctChange) >= 10 ? "MEDIUM" : "LOW";
    }
  } else if (cfg) {
    if (Math.abs(delta) >= cfg.delta) {
      direction = delta > 0 ? "RISING" : "FALLING";
      severity = Math.abs(delta) >= cfg.delta * 2 ? "MEDIUM" : "LOW";
    }
  }

  if (!direction) {
    // Fluctuation: large spread relative to the mean.
    const mean = sorted.reduce((s, p) => s + p.value, 0) / sorted.length;
    const spread = Math.max(...sorted.map((p) => p.value)) - Math.min(...sorted.map((p) => p.value));
    if (mean !== 0 && spread / Math.abs(mean) > 0.35) {
      direction = "FLUCTUATING";
      severity = "LOW";
    }
  }

  if (!direction) return null;

  const label = cfg?.label ?? metric;
  const unit = cfg?.unit ?? "";
  const summary =
    direction === "FLUCTUATING"
      ? `${label} has been fluctuating across the last ${windowLabel} (${sorted[0].value}${unit} to ${last}${unit}).`
      : `${label} has been ${direction === "RISING" ? "rising" : "falling"} across the last ${windowLabel}: ${sorted[0].value}${unit} on ${sorted[0].date.slice(0, 10)} to ${last}${unit} on ${sorted[sorted.length - 1].date.slice(0, 10)}.`;

  return { metric, direction, severity, window: windowLabel, points: sorted, deterministicSummary: summary };
}

export function detectTrends(input: TrendInput): DetectedTrend[] {
  const byMetric = new Map<string, TrendPoint[]>();

  for (const v of input.vitals) {
    const n = parseLeadingNumber(v.value);
    if (n == null) continue;
    const arr = byMetric.get(v.type) ?? [];
    arr.push({ date: v.recordedAt.toISOString(), value: n });
    byMetric.set(v.type, arr);
  }
  for (const t of input.testResults) {
    const n = parseLeadingNumber(t.result);
    if (n == null) continue;
    const arr = byMetric.get(t.testName) ?? [];
    arr.push({ date: t.recordedAt.toISOString(), value: n });
    byMetric.set(t.testName, arr);
  }

  const trends: DetectedTrend[] = [];
  for (const [metric, points] of byMetric) {
    const trend = analyseSeries(metric, points);
    if (trend) trends.push(trend);
  }
  return trends;
}
