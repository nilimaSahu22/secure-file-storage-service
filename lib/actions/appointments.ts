"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus } from "@prisma/client";
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
