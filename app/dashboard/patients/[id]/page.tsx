import { notFound } from "next/navigation";
import { getPatientById } from "@/lib/services/patients";
import { getStaffUsers } from "@/lib/services/staff";
import { UnifiedChartView } from "@/components/chart/UnifiedChartView";

export const dynamic = "force-dynamic";

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, staff] = await Promise.all([getPatientById(id), getStaffUsers()]);

  if (!patient) {
    notFound();
  }

  return <UnifiedChartView patient={patient} staff={staff} />;
}
