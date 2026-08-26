-- CreateEnum
CREATE TYPE "ChatActorType" AS ENUM ('DOCTOR', 'PATIENT');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('RADIOLOGY', 'OPD', 'CARDIOLOGY', 'EMERGENCY');

-- AlterTable: add email/passwordHash as nullable first, backfill, then enforce NOT NULL
-- (existing StaffUser rows predate these columns; real hashed credentials are seeded
-- immediately after this migration runs, so these are transient placeholders)
ALTER TABLE "StaffUser" ADD COLUMN     "email" TEXT,
ADD COLUMN     "passwordHash" TEXT,
DROP COLUMN "department",
ADD COLUMN     "department" "Department";

UPDATE "StaffUser" SET
  "email" = 'placeholder+' || "id" || '@meridian.local',
  "passwordHash" = 'placeholder'
WHERE "email" IS NULL;

ALTER TABLE "StaffUser" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "passwordHash" SET NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "portalEmail" TEXT,
ADD COLUMN     "portalPasswordHash" TEXT;

-- CreateTable
CREATE TABLE "MedicalFile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "uploadedByStaffId" TEXT,
    "uploadedByPatient" BOOLEAN NOT NULL DEFAULT false,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "department" "Department",
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actorType" "ChatActorType" NOT NULL,
    "staffId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citedFileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentWorkflow" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "intakeSteps" JSONB NOT NULL,
    "triageRules" JSONB NOT NULL,
    "escalationPath" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "patientVolumePerDay" TEXT,
    "problemStatement" TEXT NOT NULL,
    "phone" TEXT,
    "consentGiven" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalFile_storageKey_key" ON "MedicalFile"("storageKey");

-- CreateIndex
CREATE INDEX "MedicalFile_patientId_idx" ON "MedicalFile"("patientId");

-- CreateIndex
CREATE INDEX "ChatMessage_patientId_actorType_idx" ON "ChatMessage"("patientId", "actorType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentWorkflow_department_key" ON "DepartmentWorkflow"("department");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_portalEmail_key" ON "Patient"("portalEmail");

-- AddForeignKey
ALTER TABLE "MedicalFile" ADD CONSTRAINT "MedicalFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFile" ADD CONSTRAINT "MedicalFile_uploadedByStaffId_fkey" FOREIGN KEY ("uploadedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
