import { redirect } from "next/navigation";
import { format, isFuture } from "date-fns";
import { CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { Card, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  const upcoming = data.appointments
    .filter((a) => a.status === "SCHEDULED" && isFuture(a.scheduledAt))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome back, {data.firstName}</h1>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s coming up.</p>
      </div>
      <Card>
        <CardTitle className="mb-3 flex items-center gap-1.5">
          <CalendarClock size={14} /> Upcoming appointments
        </CardTitle>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">No upcoming appointments.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{a.reason ?? "Visit"}</p>
                  <p className="text-xs text-slate-500">with {a.provider.name}</p>
                </div>
                <p className="text-xs text-slate-500">{format(a.scheduledAt, "MMM d, yyyy h:mm a")}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
