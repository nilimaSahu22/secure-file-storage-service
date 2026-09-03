-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BOUNCED', 'NEEDS_CLEARER_COPY');

-- CreateEnum
CREATE TYPE "FileSource" AS ENUM ('STAFF', 'PATIENT');

-- AlterTable
ALTER TABLE "MedicalFile" ADD COLUMN     "bounceReason" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "documentDate" TIMESTAMP(3),
ADD COLUMN     "source" "FileSource" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "status" "FileStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "validation" JSONB;

-- CreateIndex
CREATE INDEX "MedicalFile_patientId_contentHash_idx" ON "MedicalFile"("patientId", "contentHash");

-- Backfill: existing rows keep working as accepted; tag prior patient uploads.
UPDATE "MedicalFile" SET "source" = 'PATIENT' WHERE "uploadedByPatient" = true;
