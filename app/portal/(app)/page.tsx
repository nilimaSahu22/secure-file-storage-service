import Link from "next/link";
import { redirect } from "next/navigation";
import { format, isFuture } from "date-fns";
import { CalendarClock, CheckSquare, Stethoscope } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPatientPortalData } from "@/lib/services/portal";
import { Card, CardTitle } from "@/components/ui/Card";
import { PortalTodoList } from "@/components/portal/PortalTodoList";
import { ResultsReadyCard } from "@/components/portal/ResultsReadyCard";
import { PortalHelpBar } from "@/components/portal/PortalHelpBar";

export const dynamic = "force-dynamic";

interface NextStep {
  title: string;
  context: string;
  href: string;
  cta: string;
}

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

  const resultItems = data.followUpItems.filter((i) => i.kind === "RESULT_AVAILABLE");
  const todoItems = data.followUpItems.filter((i) => i.kind !== "RESULT_AVAILABLE");
  const docRequests = data.documentRequests.map((r) => ({
    id: r.id,
    documentType: r.documentType,
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
  }));

  const resultsSince = resultItems.length
    ? new Date(Math.min(...resultItems.map((i) => i.createdAt.getTime())))
    : null;

  // The one thing the patient should do next.
  const followUpAppt = todoItems.find((i) => i.kind === "APPOINTMENT");
  let nextStep: NextStep | null = null;
  if (data.documentRequests.length > 0) {
    const d = data.documentRequests[0];
    nextStep = {
      title: `Upload your ${d.documentType.toLowerCase()}`,
      context: d.description,
      href: `/portal/documents?type=${encodeURIComponent(d.documentType)}`,
      cta: "Upload now",
    };
  } else if (followUpAppt && upcoming.length === 0) {
    nextStep = {
      title: "Schedule your follow-up visit",
      context: followUpAppt.dueAt
        ? `Your doctor asked you back for a check-up by ${format(followUpAppt.dueAt, "MMMM d, yyyy")}.`
        : "Your doctor asked you to come back for a check-up.",
      href: "/portal/appointments",
      cta: "Schedule now",
    };
  } else if (todoItems.length > 0) {
    const t = todoItems[0];
    nextStep = {
      title: t.description,
      context: t.dueAt ? `Due by ${format(t.dueAt, "MMMM d, yyyy")}.` : "Please take care of this when you can.",
      href: "/portal/appointments",
      cta: "Schedule now",
    };
  } else if (upcoming.length > 0) {
    const a = upcoming[0];
    nextStep = {
      title: "Your next appointment is booked",
      context: `${format(a.scheduledAt, "EEEE, MMMM d")} at ${format(a.scheduledAt, "h:mm a")} with ${a.provider.name}.`,
      href: "/portal/appointments",
      cta: "View details",
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome back, {data.firstName}</h1>
        <p className="text-sm text-slate-500">Here&apos;s what needs your attention.</p>
      </div>

      {nextStep && (
        <Card className="flex flex-col gap-4 border-l-4 border-[#2f66ea] sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#2f66ea]">
            <CalendarClock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Your next step</p>
            <p className="mt-0.5 text-base font-semibold text-slate-900">{nextStep.title}</p>
            <p className="mt-1 text-sm text-slate-600">{nextStep.context}</p>
          </div>
          <Link
            href={nextStep.href}
            className="w-full shrink-0 rounded-lg bg-[#2f66ea] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#2554c7] sm:w-auto"
          >
            {nextStep.cta}
          </Link>
        </Card>
      )}

      {(todoItems.length > 0 || docRequests.length > 0) && (
        <Card>
          <CardTitle className="mb-3 flex items-center gap-1.5">
            <CheckSquare size={14} /> To do
          </CardTitle>
          <PortalTodoList
            items={todoItems.map((t) => ({
              id: t.id,
              label: t.description,
              dueAt: t.dueAt ? t.dueAt.toISOString() : null,
            }))}
            documentRequests={docRequests}
          />
        </Card>
      )}

      {resultItems.length > 0 && (
        <ResultsReadyCard count={resultItems.length} sinceDate={resultsSince ? resultsSince.toISOString() : null} />
      )}

      {latestVisit && latestSummary && (
        <Card>
          <CardTitle className="mb-2 flex items-center gap-1.5">
            <Stethoscope size={14} /> Your latest visit
          </CardTitle>
          <p className="text-xs text-slate-500">
            {format(latestVisit.signedAt ?? latestVisit.startedAt, "MMMM d, yyyy")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{latestSummary}</p>
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
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{a.reason ?? "Visit"}</p>
                  <p className="text-xs text-slate-500">with {a.provider.name}</p>
                </div>
                <p className="shrink-0 text-xs text-slate-500">{format(a.scheduledAt, "EEE, MMM d · h:mm a")}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PortalHelpBar />
    </div>
  );
}
