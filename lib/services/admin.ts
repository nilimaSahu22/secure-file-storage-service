import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/prisma/fixtures";

export function resetDemoData() {
  return seedDatabase(prisma);
}
