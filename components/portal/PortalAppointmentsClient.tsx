"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import type { Appointment, StaffUser } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { requestAppointmentAction } from "@/lib/actions/portalAppointments";

type AppointmentRow = Appointment & { provider: StaffUser };

interface PortalAppointmentsClientProps {
  appointments: AppointmentRow[];
  providers: StaffUser[];
}

const STATUS_TONE = {
  REQUESTED: "amber",
  SCHEDULED: "blue",
  COMPLETED: "green",
  CANCELLED: "neutral",
  NO_SHOW: "amber",
} as const;

export function PortalAppointmentsClient({ appointments, providers }: PortalAppointmentsClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestAppointmentAction({
        providerId,
        scheduledAt: new Date(`${preferredDate}T${preferredTime}`).toISOString(),
        reason: reason.trim() || undefined,
      });
      setOpen(false);
      setPreferredDate("");
      setPreferredTime("");
      setReason("");
      router.refresh();
    } catch {
      setError("Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>Your appointments</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <CalendarPlus size={14} /> Request Appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-slate-400">No appointments on file.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">{a.reason ?? "Visit"}</p>
                <p className="text-xs text-slate-500">with {a.provider.name}</p>
              </div>
              <div className="text-right">
                <Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge>
                <p className="mt-1 text-xs text-slate-400">{format(a.scheduledAt, "MMM d, yyyy h:mm a")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Request an Appointment">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Select id="request-provider" label="Provider" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="request-date"
                type="date"
                label="Preferred date"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                id="request-time"
                type="time"
                label="Preferred time"
                required
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
          </div>
          <Input
            id="request-reason"
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Follow-up on recent labs"
          />
          <p className="text-xs text-slate-400">
            This sends a request to the care team — it&apos;s not confirmed until staff
            reviews and accepts it.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
