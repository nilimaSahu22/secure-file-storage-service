import { Lock, ShieldCheck, KeyRound, ScrollText, FolderLock, BadgeCheck } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Lock,
    title: "Encrypted in transit",
    description: "All traffic between your browser and Meridian is encrypted over TLS.",
  },
  {
    icon: KeyRound,
    title: "Hashed credentials",
    description: "Passwords are hashed with bcrypt and are never stored or logged in plain text.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    description: "Staff, department, and patient-portal boundaries are enforced on every request, not just hidden in the UI.",
  },
  {
    icon: FolderLock,
    title: "Encrypted document storage",
    description: "Uploaded files are stored on AWS S3 with server-side encryption at rest.",
  },
  {
    icon: ScrollText,
    title: "Full audit trail",
    description: "Logins, note edits, file uploads, and coding suggestions are all recorded with who, what, and when.",
  },
  {
    icon: BadgeCheck,
    title: "Grounded, cited AI",
    description: "The AI assistant only answers from documents actually uploaded to a patient's chart — it declines rather than guesses.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Built with real safeguards, not an afterthought</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <c.icon className="h-5 w-5 text-blue-600" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{c.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
