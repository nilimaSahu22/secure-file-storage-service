import { Link } from "react-router-dom";
import { ShieldCheck, Share2, UploadCloud, Lock } from "lucide-react";
import { Button } from "../components/ui/Button";

const features = [
  {
    icon: UploadCloud,
    title: "Large file uploads",
    description: "Upload files up to 500MB directly to secure cloud storage, with real-time progress.",
  },
  {
    icon: Lock,
    title: "Private by default",
    description: "Every file starts private and is only accessible to you, protected by authentication.",
  },
  {
    icon: Share2,
    title: "Share with a link",
    description: "Flip any file to public to generate a shareable link, and revoke access any time.",
  },
  {
    icon: ShieldCheck,
    title: "Ownership-based access",
    description: "Every request is checked against file ownership, so your files stay yours.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-gray-900">Filework</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Log in
          </Link>
          <Link to="/register">
            <Button>Sign up</Button>
          </Link>
        </div>
      </nav>

      <header className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
          Secure file storage, built for control
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Upload, organize, and share large files with confidence. Filework keeps everything
          private until you decide otherwise.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/register">
            <Button className="px-6 py-3 text-base">Get started for free</Button>
          </Link>
          <Link to="/login">
            <Button variant="outlined" className="px-6 py-3 text-base">
              Log in
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">No credit card required · Files up to 500MB</p>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-gray-100 p-6">
              <Icon className="h-6 w-6 text-indigo-600" />
              <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <p className="text-center text-sm text-gray-400">© {new Date().getFullYear()} Filework</p>
      </footer>
    </div>
  );
}
