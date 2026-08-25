"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import type { Patient } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { getAge, getInitials } from "@/lib/format";

interface PatientListClientProps {
  patients: Patient[];
}

export function PatientListClient({ patients }: PatientListClientProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (p.contactEmail?.toLowerCase().includes(q) ?? false) ||
        p.gender.toLowerCase().includes(q)
      );
    });
  }, [patients, query]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            id="patient-search"
            placeholder="Search patients"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-slate-400">
          <UserRound size={32} />
          <p className="text-sm">No patients match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((patient) => (
            <Link
              key={patient.id}
              href={`/dashboard/patients/${patient.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {getInitials(patient.firstName, patient.lastName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {getAge(patient.dateOfBirth)} yrs · {patient.gender}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
