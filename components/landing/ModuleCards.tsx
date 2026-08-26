import { Users, Workflow, FileLock2, MessagesSquare } from "lucide-react";

const MODULES = [
  {
    icon: Users,
    title: "Patient Profiles",
    description:
      "A unified chart per patient — medications, allergies, vitals, labs, notes, and appointments in one view.",
  },
  {
    icon: Workflow,
    title: "Departmental Workflows",
    description:
      "Configurable intake steps, triage rules, and escalation paths per department, editable by admins.",
  },
  {
    icon: FileLock2,
    title: "Secure File Storage",
    description:
      "Encrypted document upload with automatic versioning and role/department-scoped access.",
  },
  {
    icon: MessagesSquare,
    title: "Agentic Conversations",
    description:
      "Ask questions about a patient's uploaded documents and get answers grounded strictly in what's on file.",
  },
];

export function ModuleCards() {
  return (
    <section id="product" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Everything your care team touches, in one place</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <div key={m.title} className="rounded-xl border border-slate-100 p-6">
            <m.icon className="h-6 w-6 text-blue-600" />
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{m.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{m.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
