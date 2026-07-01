-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('ANTHROPIC', 'OPENAI', 'GEMINI');

-- AlterTable
ALTER TABLE "WorkflowExecution" ADD COLUMN     "provider" "AIProvider" NOT NULL DEFAULT 'ANTHROPIC';
