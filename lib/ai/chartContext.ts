import { format } from "date-fns";
import type { PatientWithChart } from "@/lib/services/patients";
import { getAge } from "@/lib/format";

export function buildChartContext(patient: PatientWithChart): string {
  const lines: string[] = [];

  lines.push(`Patient: ${patient.firstName} ${patient.lastName}, ${getAge(patient.dateOfBirth)} years old, ${patient.gender}.`);

  if (patient.allergies.length > 0) {
    lines.push(`Allergies: ${patient.allergies.map((a) => `${a.allergen} (${a.reaction ?? "reaction unspecified"})`).join("; ")}.`);
  } else {
    lines.push("Allergies: none documented.");
  }

  if (patient.medications.length > 0) {
    lines.push(
      `Current medications: ${patient.medications
        .map((m) => `${m.name} ${m.dosage} ${m.frequency}`)
        .join("; ")}.`
    );
  }

  if (patient.vitals.length > 0) {
    const recent = patient.vitals.slice(0, 8);
    lines.push(
      `Recent vitals: ${recent
        .map((v) => `${v.type} ${v.value}${v.isAbnormal ? " (abnormal)" : ""} on ${format(v.recordedAt, "MMM d")}`)
        .join("; ")}.`
    );
  }

  if (patient.testResults.length > 0) {
    const recent = patient.testResults.slice(0, 8);
    lines.push(
      `Recent test results: ${recent
        .map((t) => `${t.testName} ${t.result}${t.normalRange ? ` (normal: ${t.normalRange})` : ""}`)
        .join("; ")}.`
    );
  }

  if (patient.notes.length > 0) {
    const recent = patient.notes.slice(0, 5);
    lines.push("Recent clinical notes:");
    for (const note of recent) {
      lines.push(
        `- [${format(note.createdAt, "MMM d, yyyy")}] S: ${note.subjective} O: ${note.objective} A: ${note.assessment} P: ${note.plan}`
      );
    }
  }

  if (patient.alerts.length > 0) {
    lines.push(`Active clinical alerts: ${patient.alerts.map((a) => a.message).join("; ")}.`);
  }

  return lines.join("\n");
}
