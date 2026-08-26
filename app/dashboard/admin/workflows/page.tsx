import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllWorkflows } from "@/lib/services/workflows";
import { WorkflowEditor } from "@/components/dashboard/WorkflowEditor";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const workflows = await getAllWorkflows();

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Departmental Workflows</h1>
      <p className="mb-6 text-sm text-slate-500">
        Intake steps, triage rules, and escalation paths, per department. Changes take effect
        immediately.
      </p>
      <WorkflowEditor initialWorkflows={workflows} />
    </div>
  );
}
