import { notFound } from "next/navigation";
import { getPatientBasic } from "@/lib/services/patients";
import { getStaffUsers } from "@/lib/services/staff";
import { StartVisitClient } from "@/components/chart/StartVisitClient";

export const dynamic = "force-dynamic";

export default async function StartVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, staff] = await Promise.all([getPatientBasic(id), getStaffUsers()]);

  if (!patient) {
    notFound();
  }

  return <StartVisitClient patient={patient} staff={staff} />;
}
