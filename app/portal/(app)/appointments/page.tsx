import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { getStaffUsers } from "@/lib/services/staff";
import { PortalAppointmentsClient } from "@/components/portal/PortalAppointmentsClient";

export const dynamic = "force-dynamic";

export default async function PortalAppointmentsPage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const [data, providers] = await Promise.all([getPatientPortalData(session.user.id), getStaffUsers()]);
  if (!data) redirect("/portal/login");

  return <PortalAppointmentsClient appointments={data.appointments} providers={providers} />;
}
