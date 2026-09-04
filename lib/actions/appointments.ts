"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { bookAppointment, rescheduleAppointment, updateAppointmentStatus } from "@/lib/services/appointments";
import { notifyPatient } from "@/lib/services/notifications";

async function notifyPatientOfAppointment(
  appointmentId: string,
  title: string,
  body: (when: string) => string
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientId: true, scheduledAt: true },
  });
  if (!appt) return;
  const when = appt.scheduledAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  await notifyPatient(appt.patientId, {
    category: "appointment",
    title,
    body: body(when),
    linkPath: "/portal/appointments",
  });
}

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
  const when = new Date(input.scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  await notifyPatient(input.patientId, {
    category: "appointment",
    title: "Appointment booked",
    body: `Your care team scheduled a visit for ${when}.`,
    linkPath: "/portal/appointments",
  });
  revalidatePath("/dashboard/appointments");
}

export async function rescheduleAppointmentAction(id: string, scheduledAt: string) {
  await rescheduleAppointment(id, new Date(scheduledAt));
  await notifyPatientOfAppointment(id, "Appointment rescheduled", (when) => `Your visit was moved to ${when}.`);
  revalidatePath("/dashboard/appointments");
}

export async function cancelAppointmentAction(id: string) {
  await updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
  revalidatePath("/dashboard/appointments");
}

export async function confirmAppointmentAction(id: string) {
  await updateAppointmentStatus(id, AppointmentStatus.SCHEDULED);
  await notifyPatientOfAppointment(id, "Appointment confirmed", (when) => `Your visit on ${when} is confirmed.`);

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
  await notifyPatientOfAppointment(
    id,
    "Appointment request declined",
    (when) => `Your requested visit for ${when} couldn't be scheduled. Please pick another time.`
  );
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
