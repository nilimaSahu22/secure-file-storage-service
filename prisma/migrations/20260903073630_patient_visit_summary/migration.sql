-- CreateTable
CREATE TABLE "PatientVisitSummary" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "plainSummary" TEXT NOT NULL,
    "plainPrescription" TEXT NOT NULL,
    "sourceNoteVersion" INTEGER NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientVisitSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientVisitSummary_visitId_key" ON "PatientVisitSummary"("visitId");

-- CreateIndex
CREATE INDEX "PatientVisitSummary_patientId_idx" ON "PatientVisitSummary"("patientId");

-- AddForeignKey
ALTER TABLE "PatientVisitSummary" ADD CONSTRAINT "PatientVisitSummary_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVisitSummary" ADD CONSTRAINT "PatientVisitSummary_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
