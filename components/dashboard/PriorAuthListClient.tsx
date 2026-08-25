"use client";

import Link from "next/link";
import { format } from "date-fns";
import { FileClock } from "lucide-react";
import type { PriorAuthorization, Patient } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type PriorAuthRow = PriorAuthorization & { patient: Patient };

const STATUS_TONE = {
  SUBMITTED: "neutral",
  UNDER_REVIEW: "amber",
  APPROVED: "green",
  DENIED: "red",
} as const;

export function PriorAuthListClient({ priorAuths }: { priorAuths: PriorAuthRow[] }) {
  return (
    <div className="p-6">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
        <FileClock size={18} /> Prior Authorizations
      </h1>

      {priorAuths.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          No prior authorizations on file. Submit one from a patient&apos;s chart.
        </p>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {priorAuths.map((pa) => (
              <div key={pa.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{pa.serviceDescription}</p>
                  <p className="text-xs text-slate-500">
                    <Link href={`/dashboard/patients/${pa.patientId}`} className="hover:underline">
                      {pa.patient.firstName} {pa.patient.lastName}
                    </Link>{" "}
                    · Submitted {format(pa.submittedAt, "MMM d, yyyy")}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[pa.status]}>{pa.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
