"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to your Meridian account.</p>
        <form action={formAction} className="flex flex-col gap-4">
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
            placeholder="••••••••"
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Register
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          Are you a patient?{" "}
          <Link href="/portal/login" className="font-medium text-blue-600 hover:underline">
            Patient portal
          </Link>
        </p>
      </div>
    </div>
  );
}
