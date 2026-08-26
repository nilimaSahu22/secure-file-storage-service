import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold text-slate-900">Meridian</span>
        <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <a href="#product" className="hover:text-slate-900">Product</a>
          <a href="#how-it-works" className="hover:text-slate-900">How It Works</a>
          <a href="#security" className="hover:text-slate-900">Security</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign In
          </Link>
          <a href="#demo">
            <Button size="sm">Request a Demo</Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
