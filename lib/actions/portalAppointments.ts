"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requestAppointment } from "@/lib/services/appointments";
import { notifyStaff } from "@/lib/services/notifications";

export interface RequestAppointmentActionInput {
  providerId: string;
  scheduledAt: string;
  reason?: string;
}

export async function requestAppointmentAction(input: RequestAppointmentActionInput) {
  const session = await auth();
  if (!session || session.user.type !== "patient") {
    throw new Error("Forbidden");
  }

  const appointment = await requestAppointment({
    patientId: session.user.id,
    providerId: input.providerId,
    scheduledAt: new Date(input.scheduledAt),
    reason: input.reason,
  });

  await logAudit({
    actorType: "patient",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown patient",
    action: "appointment.requested",
    targetType: "Appointment",
    targetId: appointment.id,
    metadata: { providerId: input.providerId, scheduledAt: input.scheduledAt },
  });

  await notifyStaff(input.providerId, {
    category: "appointment",
    title: "New appointment request",
    body: `${session.user.name ?? "A patient"} requested a visit${input.reason ? ` — ${input.reason}` : ""}.`,
    linkPath: "/dashboard/appointments",
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/dashboard/appointments");

  return appointment;
}
