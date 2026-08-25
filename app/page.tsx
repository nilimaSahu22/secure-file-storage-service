import Link from "next/link";
import { ShieldCheck, Sparkles, Stethoscope, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: "sparkles",
    title: "AI Chart Summaries",
    description: "Every chart distilled into a 3-4 sentence clinical summary in seconds.",
  },
  {
    icon: "stethoscope",
    title: "Ambient Note Generation",
    description: "Turn a visit transcript into a structured SOAP note automatically.",
  },
  {
    icon: "shield",
    title: "Assistive Coding",
    description: "AI-suggested ICD-10/CPT codes with rationale, ready for provider review.",
  },
  {
    icon: "trending",
    title: "Revenue Cycle Insights",
    description: "See the illustrative time and revenue impact across your practice.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-slate-900">Meridian</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link href="/register">
            <Button size="sm">Register</Button>
          </Link>
        </div>
      </nav>

      <header className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          An EHR that thinks alongside your care team
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Meridian pairs a unified patient chart with AI-assisted charting, coding, and
          revenue insight — so your team spends less time on documentation and more time on
          care.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="md" className="px-6 py-3 text-base">
              Try the demo
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="md" className="px-6 py-3 text-base">
              Log in
            </Button>
          </Link>
        </div>
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This is a product demo. All patients, records, and metrics shown are synthetic
          sample data — no real patient information is used or stored.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-100 p-6">
              <FeatureIcon name={f.icon} />
              <h3 className="mt-4 text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-100 py-8">
        <p className="text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Meridian — demo environment, synthetic data only
        </p>
      </footer>
    </div>
  );
}

function FeatureIcon({ name }: { name: string }) {
  const commonProps = { className: "h-6 w-6 text-blue-600" };
  switch (name) {
    case "sparkles":
      return <Sparkles {...commonProps} />;
    case "stethoscope":
      return <Stethoscope {...commonProps} />;
    case "shield":
      return <ShieldCheck {...commonProps} />;
    case "trending":
      return <TrendingUp {...commonProps} />;
    default:
      return null;
  }
}
