"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, CalendarDays } from "lucide-react";
import type { Appointment, Patient, StaffUser } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  bookAppointmentAction,
  rescheduleAppointmentAction,
  cancelAppointmentAction,
  confirmAppointmentAction,
  declineAppointmentAction,
} from "@/lib/actions/appointments";

type AppointmentRow = Appointment & { patient: Patient; provider: StaffUser };

interface AppointmentsClientProps {
  appointments: AppointmentRow[];
  patients: Patient[];
  providers: StaffUser[];
}

const STATUS_TONE = {
  REQUESTED: "amber",
  SCHEDULED: "blue",
  COMPLETED: "green",
  CANCELLED: "neutral",
  NO_SHOW: "amber",
} as const;

// Split a stored instant into the local calendar date ("2026-09-05") and
// wall-clock time ("14:30") shown in the separate Date and Time fields.
function toLocalDateTimeParts(date: Date): { date: string; time: string } {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

// The Date and Time fields carry no timezone. Combine and resolve them to an
// absolute instant here in the browser, where the user's timezone is known, so
// the server stores exactly the wall-clock time that was picked.
function partsToISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function AppointmentsClient({ appointments, patients, providers }: AppointmentsClientProps) {
  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [reason, setReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  async function onBook(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bookAppointmentAction({
        patientId,
        providerId,
        scheduledAt: partsToISO(bookDate, bookTime),
        reason,
      });
      setBookOpen(false);
      setBookDate("");
      setBookTime("");
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  async function onReschedule(e: FormEvent) {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setSubmitting(true);
    try {
      await rescheduleAppointmentAction(
        rescheduleTarget.id,
        partsToISO(rescheduleDate, rescheduleTime)
      );
      setRescheduleTarget(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel(id: string) {
    await cancelAppointmentAction(id);
  }

  async function onConfirm(id: string) {
    await confirmAppointmentAction(id);
  }

  async function onDecline(id: string) {
    await declineAppointmentAction(id);
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <CalendarDays size={18} /> Appointments
        </h1>
        <Button onClick={() => setBookOpen(true)}>
          <Plus size={14} /> New Appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No appointments scheduled.</p>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    <Link href={`/dashboard/patients/${a.patientId}`} className="hover:underline">
                      {a.patient.firstName} {a.patient.lastName}
                    </Link>{" "}
                    <span className="font-normal text-slate-500">with {a.provider.name}</span>
                  </p>
                  <p className="text-xs text-slate-500">{a.reason ?? "Visit"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-slate-700">{format(a.scheduledAt, "MMM d, yyyy")}</p>
                    <p className="text-xs text-slate-400">{format(a.scheduledAt, "h:mm a")}</p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge>
                  {a.status === "REQUESTED" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => onConfirm(a.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDecline(a.id)}>
                        Decline
                      </Button>
                    </div>
                  )}
                  {a.status === "SCHEDULED" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRescheduleTarget(a);
                          const parts = toLocalDateTimeParts(a.scheduledAt);
                          setRescheduleDate(parts.date);
                          setRescheduleTime(parts.time);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onCancel(a.id)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book Appointment">
        <form onSubmit={onBook} className="flex flex-col gap-3">
          <Select id="book-patient" label="Patient" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </Select>
          <Select id="book-provider" label="Provider" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="book-date"
                type="date"
                label="Date"
                required
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                id="book-time"
                type="time"
                label="Time"
                required
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
              />
            </div>
          </div>
          <Input id="book-reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Booking…" : "Book"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} title="Reschedule Appointment">
        <form onSubmit={onReschedule} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="reschedule-date"
                type="date"
                label="New date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                id="reschedule-time"
                type="time"
                label="New time"
                required
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
