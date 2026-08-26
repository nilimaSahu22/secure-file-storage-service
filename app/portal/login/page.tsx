"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { portalLoginAction, type PortalLoginState } from "./actions";

const initialState: PortalLoginState = {};

export default function PortalLoginPage() {
  const [state, formAction, pending] = useActionState(portalLoginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </Link>
        <div className="mb-1 flex items-center gap-2">
          <Heart size={18} className="text-blue-600" />
          <h1 className="text-xl font-semibold text-slate-900">Patient Portal</h1>
        </div>
        <p className="mb-6 text-sm text-slate-500">Sign in to see your appointments and records.</p>
        <form action={formAction} className="flex flex-col gap-4">
          <Input id="email" name="email" type="email" label="Email" required placeholder="you@example.com" />
          <Input id="password" name="password" type="password" label="Password" required placeholder="••••••••" />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Are you a clinician?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Staff sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
