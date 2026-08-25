import { getPatients } from "@/lib/services/patients";
import { PatientListClient } from "@/components/dashboard/PatientListClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const patients = await getPatients();
  return <PatientListClient patients={patients} />;
}
