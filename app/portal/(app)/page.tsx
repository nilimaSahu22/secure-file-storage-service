import Link from "next/link";
import { redirect } from "next/navigation";
import { format, isFuture } from "date-fns";
import { CalendarClock, Stethoscope } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { Card, CardTitle } from "@/components/ui/Card";
import { FollowUpChecklist } from "@/components/portal/FollowUpChecklist";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const session = await auth();
  if (!session || session.user.type !== "patient") redirect("/portal/login");

  const data = await getPatientPortalData(session.user.id);
  if (!data) redirect("/portal/login");

  const upcoming = data.appointments
    .filter((a) => a.status === "SCHEDULED" && isFuture(a.scheduledAt))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const latestVisit = data.visits[0];
  const latestSummary = latestVisit?.patientSummary?.plainSummary ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome back, {data.firstName}</h1>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s coming up.</p>
      </div>

      <FollowUpChecklist items={data.followUpItems} />

      {latestVisit && latestSummary && (
        <Card>
          <CardTitle className="mb-2 flex items-center gap-1.5">
            <Stethoscope size={14} /> Your latest visit
          </CardTitle>
          <p className="text-xs text-slate-500">
            {format(latestVisit.signedAt ?? latestVisit.startedAt, "MMM d, yyyy")}
          </p>
          <p className="mt-2 line-clamp-3 text-sm text-slate-700">{latestSummary}</p>
          <Link href="/portal/visits" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">
            View all visits
          </Link>
        </Card>
      )}

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
