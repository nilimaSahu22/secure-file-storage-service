import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { PortalVisitsList } from "@/components/portal/PortalVisitsList";

export const dynamic = "force-dynamic";

export default async function PortalVisitsPage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Your visits</h1>
        <p className="text-sm text-slate-500">
          A plain-language summary of each visit and what was prescribed.
        </p>
      </div>
      <PortalVisitsList visits={data.visits} />
    </div>
  );
}
