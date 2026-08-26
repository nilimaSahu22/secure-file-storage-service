import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { AiChatPanel } from "@/components/chart/AiChatPanel";

export const dynamic = "force-dynamic";

export default async function PortalChatPage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  return (
    <AiChatPanel
      patientId={data.id}
      patientName={`${data.firstName} ${data.lastName}`}
      initialMessages={data.chatMessages}
      files={data.files}
      variant="page"
    />
  );
}
