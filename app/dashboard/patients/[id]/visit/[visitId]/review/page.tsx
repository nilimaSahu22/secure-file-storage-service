import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getVisitById } from "@/lib/services/visits";
import { VisitReviewClient } from "@/components/chart/VisitReviewClient";

export const dynamic = "force-dynamic";

export default async function VisitReviewPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.type !== "staff") redirect("/login");

  const { id, visitId } = await params;
  const visit = await getVisitById(visitId);
  if (!visit || visit.patientId !== id) notFound();
  if (visit.status === "SIGNED") redirect(`/dashboard/patients/${id}`);
  if (!visit.note || !visit.prescription) notFound();

  return (
    <VisitReviewClient
      patientId={id}
      visitId={visit.id}
      patientName={`${visit.patient.firstName} ${visit.patient.lastName}`}
      allergies={visit.patient.allergies.map((a) => ({ allergen: a.allergen }))}
      note={{
        subjective: visit.note.subjective,
        objective: visit.note.objective,
        assessment: visit.note.assessment,
        plan: visit.note.plan,
      }}
      prescription={{
        items: visit.prescription.items.map((i) => ({
          medicationName: i.medicationName,
          dose: i.dose,
          route: i.route,
          frequency: i.frequency,
          duration: i.duration ?? "",
          instructions: i.instructions ?? "",
        })),
        investigations: visit.prescription.investigations,
        advice: visit.prescription.advice ?? "",
        followUpAt: visit.prescription.followUpAt
          ? visit.prescription.followUpAt.toISOString().slice(0, 10)
          : "",
      }}
    />
  );
}
