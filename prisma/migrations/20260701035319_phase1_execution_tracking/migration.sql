-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK', 'API');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExecutionStatus" ADD VALUE 'PENDING';
ALTER TYPE "ExecutionStatus" ADD VALUE 'QUEUED';
ALTER TYPE "ExecutionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ExecutionStatus" ADD VALUE 'RETRYING';

-- AlterTable
ALTER TABLE "WorkflowExecution" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "estimatedCostUsd" DOUBLE PRECISION,
ADD COLUMN     "inputSnapshot" TEXT,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "totalTokens" INTEGER,
ADD COLUMN     "triggerType" "TriggerType" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "startedAt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "WorkflowExecution_createdAt_idx" ON "WorkflowExecution"("createdAt");
