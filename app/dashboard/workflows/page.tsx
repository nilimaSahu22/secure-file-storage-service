import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllWorkflows } from "@/lib/services/workflows";
import { WorkflowViewer } from "@/components/dashboard/WorkflowViewer";

export const dynamic = "force-dynamic";

export default async function WorkflowPlaybookPage() {
  const session = await auth();
  if (!session || session.user.type !== "staff" || !session.user.role) {
    redirect("/login");
  }

  const workflows = await getAllWorkflows();

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Departmental Playbook</h1>
      <p className="mb-6 text-sm text-slate-500">
        Intake steps, triage rules, and escalation paths for each department. Read-only — the
        admin team maintains these.
      </p>
      <WorkflowViewer workflows={workflows} initialDepartment={session.user.department} />
    </div>
  );
}
