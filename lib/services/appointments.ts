import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export function getAppointments() {
  return prisma.appointment.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { patient: true, provider: true },
  });
}

export interface BookAppointmentInput {
  patientId: string;
  providerId: string;
  scheduledAt: Date;
  reason?: string;
}

export function bookAppointment(input: BookAppointmentInput) {
  return prisma.appointment.create({ data: input });
}

export function rescheduleAppointment(id: string, scheduledAt: Date) {
  return prisma.appointment.update({ where: { id }, data: { scheduledAt } });
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return prisma.appointment.update({ where: { id }, data: { status } });
}
