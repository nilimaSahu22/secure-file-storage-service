-- CreateEnum
CREATE TYPE "FollowUpKind" AS ENUM ('TEST', 'IMAGING', 'APPOINTMENT', 'REFERRAL', 'RESULT_AVAILABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OUTSTANDING', 'COMPLETED', 'DISMISSED');

-- AlterTable
ALTER TABLE "TestResult" ADD COLUMN     "documentDate" TIMESTAMP(3),
ADD COLUMN     "enteredByAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceFileId" TEXT;

-- CreateTable
CREATE TABLE "FollowUpItem" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "kind" "FollowUpKind" NOT NULL,
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "satisfiedByFileId" TEXT,
    "satisfiedByTestResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpItem_patientId_status_idx" ON "FollowUpItem"("patientId", "status");

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "MedicalFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpItem" ADD CONSTRAINT "FollowUpItem_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpItem" ADD CONSTRAINT "FollowUpItem_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
