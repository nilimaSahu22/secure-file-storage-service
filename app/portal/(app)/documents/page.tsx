import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { FilesSection } from "@/components/chart/FilesSection";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  return <FilesSection patientId={data.id} files={data.files} allowDepartment={false} />;
}
