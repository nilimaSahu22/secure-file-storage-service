"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mb-6 text-sm text-slate-500">New staff accounts are created with doctor access.</p>
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            id="name"
            name="name"
            type="text"
            label="Full name"
            required
            placeholder="Dr. Jordan Lee"
          />
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            placeholder="you@example.com"
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            minLength={8}
            placeholder="••••••••"
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
