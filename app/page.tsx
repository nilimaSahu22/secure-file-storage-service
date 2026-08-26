import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { ModuleCards } from "@/components/landing/ModuleCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ClinicianExample } from "@/components/landing/ClinicianExample";
import { PatientExample } from "@/components/landing/PatientExample";
import { DepartmentPreview } from "@/components/landing/DepartmentPreview";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { LeadForm } from "@/components/landing/LeadForm";
import { getAllWorkflows } from "@/lib/services/workflows";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const workflows = await getAllWorkflows();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Nav />
      <Hero />
      <ModuleCards />
      <HowItWorks />
      <ClinicianExample />
      <PatientExample />
      <DepartmentPreview workflows={workflows} />
      <SecuritySection />

      <section id="demo" className="mx-auto w-full max-w-3xl px-6 py-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Request a demo</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tell us about your practice and we&apos;ll reach out to set up a walkthrough.
          </p>
        </div>
        <LeadForm />
      </section>

      <footer className="mt-auto border-t border-slate-100 py-8">
        <p className="text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Meridian
        </p>
      </footer>
    </div>
  );
}
