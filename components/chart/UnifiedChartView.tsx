import { format } from "date-fns";
import { AlertTriangle, Phone, Mail, Calendar } from "lucide-react";
import type { Department, StaffUser } from "@prisma/client";
import type { PatientWithChart } from "@/lib/services/patients";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAge, getInitials } from "@/lib/format";
import { ChartActions } from "@/components/chart/ChartActions";
import { ChartShell } from "@/components/chart/ChartShell";
import { MedicationsSection } from "@/components/chart/MedicationsSection";
import { VitalsSection } from "@/components/chart/VitalsSection";
import { NotesSection } from "@/components/chart/NotesSection";
import { FollowUpsSection } from "@/components/chart/FollowUpsSection";
import { TrendFlagsCard } from "@/components/chart/TrendFlagsCard";
import { TestResultsSection } from "@/components/chart/TestResultsSection";
import { TasksSection } from "@/components/chart/TasksSection";
import { PriorAuthSection } from "@/components/chart/PriorAuthSection";
import { ReferralsSection } from "@/components/chart/ReferralsSection";
import { FilesSection } from "@/components/chart/FilesSection";

const severityTone = { LOW: "neutral", MEDIUM: "amber", HIGH: "red" } as const;
const statusTone = {
  REQUESTED: "amber",
  SCHEDULED: "blue",
  COMPLETED: "green",
  CANCELLED: "neutral",
  NO_SHOW: "amber",
} as const;

interface UnifiedChartViewProps {
  patient: PatientWithChart;
  staff: StaffUser[];
  currentStaffDepartment?: Department | null;
}

export function UnifiedChartView({ patient, staff, currentStaffDepartment }: UnifiedChartViewProps) {
  return (
    <div className="p-6 max-[520px]:p-4">
      <ChartShell
        patientId={patient.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
        initialMessages={patient.chatMessages}
        files={patient.files}
      >
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 max-[520px]:p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-sm text-slate-500">
                {getAge(patient.dateOfBirth)} yrs · {patient.gender} · DOB{" "}
                {format(patient.dateOfBirth, "MMM d, yyyy")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {patient.contactPhone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {patient.contactPhone}
                  </span>
                )}
                {patient.contactEmail && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} /> {patient.contactEmail}
                  </span>
                )}
              </div>
              {patient.allergies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <Badge key={a.id} tone="red">
                      <AlertTriangle size={11} className="mr-1 inline" />
                      {a.allergen}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <ChartActions patientId={patient.id} staff={staff} />
        </div>

        {patient.alerts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardTitle className="mb-2 flex items-center gap-1.5 text-amber-900">
              <AlertTriangle size={14} /> Clinical Alerts
            </CardTitle>
            <div className="flex flex-col gap-2">
              {patient.alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-2 text-sm">
                  <Badge tone={severityTone[alert.severity]}>{alert.severity}</Badge>
                  <p className="text-slate-700">{alert.message}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {patient.trendFlags.length > 0 && <TrendFlagsCard flags={patient.trendFlags} />}

        {patient.chartSummaries.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardTitle className="mb-2 flex items-center gap-1.5 text-blue-900">AI Chart Summary</CardTitle>
            <p className="text-sm text-slate-700">{patient.chartSummaries[0].summary}</p>
            <p className="mt-2 text-xs text-slate-400">
              Generated {format(patient.chartSummaries[0].generatedAt, "MMM d, yyyy h:mm a")}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 min-[1201px]:grid-cols-2">
          <MedicationsSection patientId={patient.id} medications={patient.medications} allergies={patient.allergies} />
          <VitalsSection patientId={patient.id} vitals={patient.vitals} />

          <TestResultsSection results={patient.testResults} />

          <Card>
            <CardTitle className="mb-3 flex items-center gap-1.5">
              <Calendar size={14} /> Appointments
            </CardTitle>
            {patient.appointments.length === 0 ? (
              <EmptyState label="No appointments scheduled." />
            ) : (
              <div className="flex flex-col gap-2">
                {patient.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{a.reason ?? "Visit"}</p>
                      <p className="text-xs text-slate-500">with {a.provider.name}</p>
                    </div>
                    <div className="text-right">
                      <Badge tone={statusTone[a.status]}>{a.status.replace("_", " ")}</Badge>
                      <p className="mt-1 text-xs text-slate-400">
                        {format(a.scheduledAt, "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div id="clinical-notes" className="scroll-mt-20">
          <NotesSection patientId={patient.id} notes={patient.notes} staff={staff} />
        </div>

        {patient.followUpItems.length > 0 && <FollowUpsSection items={patient.followUpItems} />}

        <FilesSection
          patientId={patient.id}
          files={patient.files}
          defaultDepartment={currentStaffDepartment}
          canUpload={false}
          documentRequests={patient.documentRequests.map((r) => ({
            id: r.id,
            documentType: r.documentType,
            description: r.description,
            status: r.status as "PENDING" | "FULFILLED" | "CANCELLED",
            dueAt: r.dueAt ? r.dueAt.toISOString() : null,
            requestedBy: r.requestedBy,
          }))}
        />

        <div className="grid grid-cols-1 gap-6 min-[1201px]:grid-cols-2">
          <TasksSection patientId={patient.id} tasks={patient.tasks} staff={staff} />
          <PriorAuthSection patientId={patient.id} priorAuths={patient.priorAuths} />
        </div>

        <ReferralsSection patientId={patient.id} referrals={patient.referrals} staff={staff} />
      </ChartShell>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{label}</p>;
}
