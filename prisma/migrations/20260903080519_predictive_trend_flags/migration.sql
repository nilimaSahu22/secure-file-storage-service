-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('RISING', 'FALLING', 'FLUCTUATING');

-- CreateEnum
CREATE TYPE "TrendFlagStatus" AS ENUM ('ACTIVE', 'DISMISSED');

-- CreateTable
CREATE TABLE "TrendFlag" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "direction" "TrendDirection" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'LOW',
    "window" TEXT NOT NULL,
    "dataPoints" JSONB NOT NULL,
    "deterministicSummary" TEXT NOT NULL,
    "narrative" TEXT,
    "status" "TrendFlagStatus" NOT NULL DEFAULT 'ACTIVE',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendFlag_patientId_status_idx" ON "TrendFlag"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrendFlag_patientId_metric_direction_key" ON "TrendFlag"("patientId", "metric", "direction");

-- AddForeignKey
ALTER TABLE "TrendFlag" ADD CONSTRAINT "TrendFlag_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
