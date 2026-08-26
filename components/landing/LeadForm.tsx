"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const ROLE_OPTIONS = [
  "Physician",
  "Nurse",
  "Practice Administrator",
  "IT / Operations",
  "Other",
];

type Status = "idle" | "submitting" | "success" | "error";

export function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: formData.get("fullName"),
      workEmail: formData.get("workEmail"),
      organizationName: formData.get("organizationName"),
      role: formData.get("role"),
      patientVolumePerDay: formData.get("patientVolumePerDay") || undefined,
      problemStatement: formData.get("problemStatement"),
      phone: formData.get("phone") || undefined,
      consentGiven: formData.get("consentGiven") === "on",
    };

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <h3 className="text-lg font-semibold text-green-900">Thanks — we&apos;ll be in touch</h3>
        <p className="mt-2 text-sm text-green-700">
          Your request has been received. A member of our team will reach out shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input id="fullName" name="fullName" label="Full name" required placeholder="Jordan Lee" />
      <Input id="workEmail" name="workEmail" type="email" label="Work email" required placeholder="you@yourpractice.com" />
      <Input id="organizationName" name="organizationName" label="Organization name" required placeholder="Riverside Family Medicine" />
      <Select id="role" name="role" label="Role" required defaultValue="">
        <option value="" disabled>Select your role</option>
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </Select>
      <Input id="patientVolumePerDay" name="patientVolumePerDay" label="Patient volume per day (optional)" placeholder="e.g. 40–60" />
      <Input id="phone" name="phone" type="tel" label="Phone (optional)" placeholder="(555) 555-0100" />
      <div className="sm:col-span-2">
        <label htmlFor="problemStatement" className="mb-1 block text-sm font-medium text-slate-700">
          What&apos;s the biggest documentation or workflow problem you&apos;re trying to solve?
        </label>
        <textarea
          id="problemStatement"
          name="problemStatement"
          required
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Tell us a bit about your practice and what's slowing your team down..."
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600 sm:col-span-2">
        <input type="checkbox" name="consentGiven" required className="mt-0.5" />
        I agree to be contacted about Meridian by the sales team.
      </label>
      {status === "error" && (
        <p className="text-sm text-red-600 sm:col-span-2">
          Something went wrong submitting your request. Please try again.
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
          {status === "submitting" ? "Submitting…" : "Request a Demo"}
        </Button>
      </div>
    </form>
  );
}
