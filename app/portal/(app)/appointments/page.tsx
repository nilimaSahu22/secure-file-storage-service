import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const statusTone = {
  SCHEDULED: "blue",
  COMPLETED: "green",
  CANCELLED: "neutral",
  NO_SHOW: "amber",
} as const;

export default async function PortalAppointmentsPage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  return (
    <Card>
      <CardTitle className="mb-3">Your appointments</CardTitle>
      {data.appointments.length === 0 ? (
        <p className="text-sm text-slate-400">No appointments on file.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">{a.reason ?? "Visit"}</p>
                <p className="text-xs text-slate-500">with {a.provider.name}</p>
              </div>
              <div className="text-right">
                <Badge tone={statusTone[a.status]}>{a.status.replace("_", " ")}</Badge>
                <p className="mt-1 text-xs text-slate-400">{format(a.scheduledAt, "MMM d, yyyy h:mm a")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
