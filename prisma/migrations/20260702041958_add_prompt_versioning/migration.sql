-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "promptVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WorkflowStepExecution" ADD COLUMN     "promptVersion" INTEGER;

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptVersion_stepId_idx" ON "PromptVersion"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_stepId_version_key" ON "PromptVersion"("stepId", "version");

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
