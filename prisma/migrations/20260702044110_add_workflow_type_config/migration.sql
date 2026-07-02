-- AlterTable: cast existing enum values to text in-place
ALTER TABLE "Workflow" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- DropEnum
DROP TYPE "WorkflowType";

-- CreateTable
CREATE TABLE "WorkflowTypeConfig" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTypeConfig_slug_key" ON "WorkflowTypeConfig"("slug");

-- Seed built-in workflow type configs
INSERT INTO "WorkflowTypeConfig" ("id", "slug", "label", "description", "systemPrompt", "userPromptTemplate", "isEnabled", "isBuiltIn", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'TEXT_SUMMARIZATION', 'Text Summarization', 'Condense long text into clear, structured summaries.', 'You are an expert summarizer. Produce clear, concise summaries that capture the key points and main ideas. Use bullet points for readability when appropriate.', E'Please summarize the following text:\n\n{{input}}\n\nProvide a structured summary with:\n- A one-sentence overview\n- Key points (bullet list)\n- Any important conclusions or action items', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'PROFESSIONAL_REWRITE', 'Professional Rewrite', 'Polish informal text into professional business language.', 'You are a professional business writing expert. Rewrite text to be clear, polished, and appropriate for professional communication while preserving the original meaning.', E'Please rewrite the following message in a professional tone:\n\n{{input}}\n\nEnsure the rewritten version is:\n- Clear and concise\n- Polite and respectful\n- Appropriate for business communication', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'TASK_BREAKDOWN', 'Task Breakdown', 'Break a project or request into prioritised, actionable tasks.', 'You are a project management expert. Break down requests into actionable, well-defined tasks with clear priorities and dependencies.', E'Break down the following request into actionable tasks:\n\n{{input}}\n\nProvide:\n1. A numbered list of specific tasks\n2. Estimated effort for each (Small/Medium/Large)\n3. Any dependencies between tasks\n4. Suggested order of execution', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'GITHUB_ISSUE_ANALYSIS', 'GitHub Issue Analysis', 'Triage a GitHub issue — severity, affected area, next actions.', 'You are a senior software engineer who excels at triaging GitHub issues. Analyze issues to identify root causes, affected areas, and suggest next actions.', E'Analyze the following GitHub issue and suggest next actions:\n\n{{input}}\n\nProvide:\n- Issue type (bug/feature/improvement/question)\n- Severity assessment (Critical/High/Medium/Low)\n- Affected components or areas\n- Suggested next actions (numbered list)\n- Any clarifying questions that should be asked', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'MEETING_NOTES_EXTRACTION', 'Meeting Notes Extraction', 'Extract decisions, action items, and follow-ups from meeting notes.', 'You are an expert at processing meeting notes and extracting structured, actionable information from them.', E'Extract key information from the following meeting notes or transcript:\n\n{{input}}\n\nProvide:\n- Meeting summary (2-3 sentences)\n- Key decisions made\n- Action items (with owner if mentioned)\n- Open questions or follow-ups\n- Next steps', true, true, NOW(), NOW());
