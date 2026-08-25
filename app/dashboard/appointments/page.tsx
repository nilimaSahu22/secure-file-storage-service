import { getAppointments } from "@/lib/services/appointments";
import { getPatients } from "@/lib/services/patients";
import { getStaffUsers } from "@/lib/services/staff";
import { AppointmentsClient } from "@/components/dashboard/AppointmentsClient";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const [appointments, patients, staff] = await Promise.all([
    getAppointments(),
    getPatients(),
    getStaffUsers(),
  ]);

  return <AppointmentsClient appointments={appointments} patients={patients} providers={staff} />;
}
