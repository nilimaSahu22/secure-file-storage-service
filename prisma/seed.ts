import { prisma } from "@/lib/prisma";
import { seedDatabase } from "./fixtures";

async function main() {
  await seedDatabase(prisma);
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
