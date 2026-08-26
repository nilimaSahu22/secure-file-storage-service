import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAuditLogs } from "@/lib/services/auditLog";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface SearchParams {
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const logs = await getAuditLogs({
    actorName: params.actor,
    action: params.action,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
  });

  return (
    <div className="p-6">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold text-slate-900">
        <ScrollText size={18} /> Audit Log
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Who did what, and when — logins, notes, file uploads, coding suggestions, and prior
        authorization submissions.
      </p>

      <Card className="mb-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <Input id="actor" name="actor" label="Actor" defaultValue={params.actor} placeholder="Name contains…" />
          <Input id="action" name="action" label="Action" defaultValue={params.action} placeholder="e.g. login.success" />
          <Input id="from" name="from" type="date" label="From" defaultValue={params.from} />
          <Input id="to" name="to" type="date" label="To" defaultValue={params.to} />
          <div className="sm:col-span-4">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No audit events match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Target</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50">
                    <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-400">
                      {format(log.createdAt, "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="font-medium text-slate-900">{log.actorName}</span>
                      <span className="ml-1.5 text-xs text-slate-400">({log.actorType})</span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-blue-700">{log.action}</td>
                    <td className="py-2 pr-4 text-xs text-slate-500">
                      {log.targetType ? `${log.targetType}${log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
