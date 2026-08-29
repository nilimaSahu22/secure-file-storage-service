"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { bookAppointment, rescheduleAppointment, updateAppointmentStatus } from "@/lib/services/appointments";

export async function bookAppointmentAction(input: {
  patientId: string;
  providerId: string;
  scheduledAt: string;
  reason?: string;
}) {
  await bookAppointment({
    patientId: input.patientId,
    providerId: input.providerId,
    scheduledAt: new Date(input.scheduledAt),
    reason: input.reason,
  });
  revalidatePath("/dashboard/appointments");
}

export async function rescheduleAppointmentAction(id: string, scheduledAt: string) {
  await rescheduleAppointment(id, new Date(scheduledAt));
  revalidatePath("/dashboard/appointments");
}

export async function cancelAppointmentAction(id: string) {
  await updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
  revalidatePath("/dashboard/appointments");
}

export async function confirmAppointmentAction(id: string) {
  await updateAppointmentStatus(id, AppointmentStatus.SCHEDULED);

  const session = await auth();
  await logAudit({
    actorType: "staff",
    actorId: session?.user.id,
    actorName: session?.user.name ?? "Unknown staff",
    action: "appointment.confirmed",
    targetType: "Appointment",
    targetId: id,
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/portal/appointments");
}

export async function declineAppointmentAction(id: string) {
  await updateAppointmentStatus(id, AppointmentStatus.CANCELLED);

  const session = await auth();
  await logAudit({
    actorType: "staff",
    actorId: session?.user.id,
    actorName: session?.user.name ?? "Unknown staff",
    action: "appointment.declined",
    targetType: "Appointment",
    targetId: id,
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/portal/appointments");
}
