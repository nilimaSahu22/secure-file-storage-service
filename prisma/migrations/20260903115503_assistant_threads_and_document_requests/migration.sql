-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AssistantThread" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "focusedPatientId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citedFileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "fulfilledByFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantThread_ownerType_ownerId_archived_idx" ON "AssistantThread"("ownerType", "ownerId", "archived");

-- CreateIndex
CREATE INDEX "AssistantMessage_threadId_idx" ON "AssistantMessage"("threadId");

-- CreateIndex
CREATE INDEX "DocumentRequest_patientId_status_idx" ON "DocumentRequest"("patientId", "status");

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AssistantThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
