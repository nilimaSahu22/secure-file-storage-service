import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { PortalDocuments } from "@/components/portal/PortalDocuments";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  return (
    <PortalDocuments
      patientId={data.id}
      patientName={`${data.firstName} ${data.lastName}`}
      dateOfBirth={format(data.dateOfBirth, "MMM d, yyyy")}
      files={data.files}
    />
  );
}
