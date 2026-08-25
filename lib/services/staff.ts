import { prisma } from "@/lib/prisma";

export function getStaffUsers() {
  return prisma.staffUser.findMany({ orderBy: { name: "asc" } });
}

export function getStaffByRole(role: "DOCTOR" | "NURSE" | "ADMIN") {
  return prisma.staffUser.findMany({ where: { role }, orderBy: { name: "asc" } });
}
